/**
 * Email Queue Worker
 * ──────────────────
 * Background service that processes the email_queue table.
 *
 * Features:
 *  - Picks pending (+ scheduled) emails in small batches
 *  - Sends via the shared mailer module (with built-in retry)
 *  - Enforces 2–5 s delay between sends (anti-spam)
 *  - Re-queues soft failures, marks hard failures as 'failed'
 *  - Injects open-tracking pixel + click-tracking links
 *  - Appends compliance footer with unsubscribe link
 *  - Logs campaign events (delivered / bounce)
 *  - Verifies SMTP connection before each batch
 */

const db = require('./db');
const { buildPooledTransport, sendEmail, classifyError } = require('./lib/mailer');

let isRunning = false;
let transporter = null;
let lastSmtpConfig = null;

// ── Helpers ────────────────────────────────────────────────────────
function randomDelay(minMs = 2000, maxMs = 5000) {
    return new Promise(r => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

// ── Tracking Injection ─────────────────────────────────────────────
function injectTracking(html, email, smtp) {
    if (!html || !email.campaign_id) return html;

    let finalHtml = html;
    const baseUrl = smtp.domain || smtp.trackingDomain || 'https://www.pm-travelagency.com';
    const tokenStr = `${email.campaign_id}|${email.to_email}`;
    const token = Buffer.from(tokenStr).toString('base64');

    // ── Rewrite links for click-tracking ──
    finalHtml = finalHtml.replace(/<a([^>]+)href="([^"]+)"([^>]*)>/gi, (match, p1, p2, p3) => {
        if (p2.startsWith('#') || p2.startsWith('mailto:') || p2.startsWith('tel:')) return match;

        const ignoredDomains = [
            'pm-travelagency.com',
            'pm-travelagency.cloud'
        ];
        if (ignoredDomains.some(d => p2.toLowerCase().includes(d))) {
            // Still add UTM params but skip click-tracking wrapper
            let targetUrl = p2;
            try {
                if (targetUrl.startsWith('http')) {
                    const urlObj = new URL(targetUrl);
                    if (!urlObj.searchParams.has('utm_source')) {
                        urlObj.searchParams.set('utm_source', 'email');
                        urlObj.searchParams.set('utm_medium', 'campaign');
                        urlObj.searchParams.set('utm_campaign', `campaign_${email.campaign_id}`);
                    }
                    targetUrl = urlObj.toString();
                }
            } catch (_) { }
            return `<a${p1}href="${targetUrl}"${p3}>`;
        }

        // Add UTMs + wrap in tracking redirect
        let targetUrl = p2;
        try {
            if (targetUrl.startsWith('http')) {
                const urlObj = new URL(targetUrl);
                if (!urlObj.searchParams.has('utm_source')) {
                    urlObj.searchParams.set('utm_source', 'email');
                    urlObj.searchParams.set('utm_medium', 'campaign');
                    urlObj.searchParams.set('utm_campaign', `campaign_${email.campaign_id}`);
                }
                targetUrl = urlObj.toString();
            }
        } catch (_) { }

        const trackingUrl = `${baseUrl}/t/click/${token}?url=${encodeURIComponent(targetUrl)}`;
        return `<a${p1}href="${trackingUrl}"${p3}>`;
    });

    // ── Compliance footer ──
    const footerHtml = `
        <div style="margin-top:40px; padding-top:20px; border-top:1px solid #eee; font-size:11px; color:#999; text-align:center; font-family:Arial,Helvetica,sans-serif; max-width:600px; margin-left:auto; margin-right:auto;">
            You're receiving this because you opted in or partnered with us.<br>
            <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email.to_email)}" style="color:#666; text-decoration:underline;">Unsubscribe anytime</a>
        </div>
    `;

    // ── Open-tracking pixel ──
    const pixelHtml = `<img src="${baseUrl}/t/open/${token}.png" width="1" height="1" border="0" alt="" style="display:none;" />`;

    if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${footerHtml}\n${pixelHtml}\n</body>`);
    } else {
        finalHtml += `\n${footerHtml}\n${pixelHtml}`;
    }

    return finalHtml;
}

// ── Core Queue Processor ───────────────────────────────────────────
async function processQueue() {
    if (isRunning) return;
    isRunning = true;

    try {
        // 1. Fetch pending batch
        const batchSize = 25;
        const emails = await db.getPendingEmails(batchSize);
        if (emails.length === 0) {
            isRunning = false;
            return;
        }

        console.log(`Worker: ${emails.length} emails queued for delivery.`);

        // 2. Load SMTP config
        const smtp = await db.getSetting('smtp');
        if (!smtp || !smtp.host || !smtp.username || !smtp.password) {
            console.error('Worker: No valid SMTP config found. Waiting…');
            isRunning = false;
            return;
        }

        // 3. (Re)build transporter if SMTP config changed
        const configStr = JSON.stringify(smtp);
        if (configStr !== lastSmtpConfig || !transporter) {
            console.log('Worker: (Re)building SMTP transporter…');
            if (transporter) {
                try { transporter.close(); } catch (_) { }
            }
            transporter = buildPooledTransport(smtp);

            try {
                await transporter.verify();
                lastSmtpConfig = configStr;
                console.log('Worker: SMTP connection verified ✔');
            } catch (err) {
                console.error('Worker: SMTP verify failed →', err.message);
                transporter = null;
                isRunning = false;
                return;
            }
        }

        // 4. Process each email
        const fromName = smtp.fromName || 'PM Travel Agency';
        const useAuthAsFrom = smtp.useAuthAsFrom !== false;
        const fromEmail = useAuthAsFrom ? smtp.username : (smtp.fromEmail || smtp.username);
        const replyTo = smtp.replyTo || fromEmail;

        let sentCount = 0;
        let failCount = 0;

        for (const email of emails) {
            // Mark as 'sending'
            await db.updateEmailStatus(email.id, 'sending');

            // Inject tracking + compliance
            // FIX: Use 'body' field (not 'html') from email_queue table
            const finalHtml = injectTracking(email.body || '', email, smtp);

            const mailOptions = {
                from: `"${fromName}" <${fromEmail}>`,
                to: email.to_email,
                subject: email.subject,
                html: finalHtml,
                replyTo,
                envelope: { from: fromEmail, to: email.to_email },
                headers: {
                    'X-Mailer': 'PM-Travel-CRM/1.0',
                    'List-Unsubscribe': `<${smtp.domain || 'https://www.pm-travelagency.com'}/unsubscribe?email=${encodeURIComponent(email.to_email)}>`
                }
            };

            // Send with built-in retry (3 attempts, exponential back-off)
            const result = await sendEmail(transporter, mailOptions, 3);

            if (result.ok) {
                await db.updateEmailStatus(email.id, 'sent');
                sentCount++;
                console.log(`Worker: ✔ Sent → ${email.to_email} (MessageID: ${result.messageId})`);

                if (email.campaign_id) {
                    await db.logCampaignEvent(email.campaign_id, email.to_email, 'delivered', {
                        messageId: result.messageId,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // Determine if permanently failed
                const tries = (email.tries || 0) + 1;
                if (!result.retryable || tries >= 3) {
                    // FIX: Pass error message to track why it failed
                    await db.updateEmailStatus(email.id, 'failed', null, result.error);
                    failCount++;
                    console.error(`Worker: ✘ Permanently failed → ${email.to_email}: ${result.error} (tries: ${tries})`);

                    if (email.campaign_id) {
                        const evtType = result.errorType === 'bounce_hard' ? 'bounce' : 'bounce';
                        await db.logCampaignEvent(email.campaign_id, email.to_email, evtType, {
                            reason: result.error,
                            errorType: result.errorType
                        });
                    }
                } else {
                    // Re-queue for next cycle with error tracking
                    // FIX: Pass error so we can debug what's happening on retries
                    await db.updateEmailStatus(email.id, 'pending', null, result.error);
                    console.warn(`Worker: ⟳ Will retry → ${email.to_email} (attempt ${tries}/3, error: ${result.error})`);
                }
            }

            // ── Anti-spam throttle: 2–5 second random delay ──
            await randomDelay(2000, 5000);
        }

        console.log(`Worker: Batch complete → ${sentCount} sent, ${failCount} failed.`);

    } catch (err) {
        console.error('Worker: Unhandled error →', err);
    } finally {
        isRunning = false;
    }
}

// ── Start Background Loop ──────────────────────────────────────────
function startWorker(intervalMs = 15000) {
    console.log('Worker: Background email service started (interval: ' + (intervalMs / 1000) + 's).');
    // Run immediately, then on interval
    processQueue();
    setInterval(processQueue, intervalMs);
}

module.exports = { startWorker, processQueue };
