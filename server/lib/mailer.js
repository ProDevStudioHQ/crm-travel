/**
 * Centralized Mailer Module
 * ─────────────────────────
 * Single source of truth for SMTP transport creation and email sending.
 *
 * Hostinger SMTP:
 *   host: smtp.hostinger.com
 *   port: 465
 *   secure: true (SSL)
 *   auth: full email address + password
 */

const nodemailer = require('nodemailer');

// ── Transport Builder ──────────────────────────────────────────────
function buildTransport(smtp) {
    const port = Number(smtp.port || 465);
    const enc = String(smtp.encryption || 'SSL').toUpperCase();

    // Port 465 = Implicit SSL  → secure: true
    // Port 587 = STARTTLS      → secure: false
    const secure = port === 465;
    const requireTLS = !secure && (enc === 'TLS' || enc === 'STARTTLS');
    const allowSelfSigned = smtp.allowSelfSigned !== undefined
        ? !!smtp.allowSelfSigned
        : true;

    return nodemailer.createTransport({
        host: smtp.host,
        port,
        secure,
        auth: {
            user: smtp.username,
            pass: smtp.password
        },
        requireTLS,
        tls: {
            rejectUnauthorized: !allowSelfSigned,
            servername: smtp.host
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000
    });
}

// ── Pooled Transport Builder (for worker) ──────────────────────────
function buildPooledTransport(smtp) {
    const port = Number(smtp.port || 465);
    const enc = String(smtp.encryption || 'SSL').toUpperCase();
    const secure = port === 465;
    const requireTLS = !secure && (enc === 'TLS' || enc === 'STARTTLS');
    const allowSelfSigned = smtp.allowSelfSigned !== undefined
        ? !!smtp.allowSelfSigned
        : true;

    return nodemailer.createTransport({
        host: smtp.host,
        port,
        secure,
        auth: {
            user: smtp.username,
            pass: smtp.password
        },
        requireTLS,
        tls: {
            rejectUnauthorized: !allowSelfSigned,
            servername: smtp.host
        },
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
        rateDelta: 3000,  // 3 seconds between messages
        rateLimit: 1,     // 1 message per rateDelta
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000
    });
}

// ── HTML to Plain Text ─────────────────────────────────────────────
function htmlToPlainText(html) {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ── Classify SMTP Errors ───────────────────────────────────────────
function classifyError(err) {
    const msg = (err.message || '').toLowerCase();
    const code = err.responseCode || 0;

    if (code === 535 || msg.includes('authentication')) {
        return { type: 'auth', retryable: false, description: 'Authentication failed (535)' };
    }
    if (code === 550 || msg.includes('mailbox not found') || msg.includes('user unknown')) {
        return { type: 'bounce_hard', retryable: false, description: 'Recipient mailbox not found (550)' };
    }
    if (code === 452 || msg.includes('mailbox full') || msg.includes('over quota')) {
        return { type: 'bounce_soft', retryable: true, description: 'Recipient mailbox full (452)' };
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return { type: 'timeout', retryable: true, description: 'Connection timed out' };
    }
    if (msg.includes('econnrefused') || msg.includes('connection refused')) {
        return { type: 'connection', retryable: true, description: 'Connection refused' };
    }
    if (msg.includes('greylist')) {
        return { type: 'greylist', retryable: true, description: 'Greylisted – retry later' };
    }
    if (code >= 400 && code < 500) {
        return { type: 'temp_fail', retryable: true, description: `Temporary failure (${code})` };
    }
    if (code >= 500) {
        return { type: 'perm_fail', retryable: false, description: `Permanent failure (${code})` };
    }
    return { type: 'unknown', retryable: true, description: err.message || 'Unknown error' };
}

// ── Send Single Email (with retry) ─────────────────────────────────
async function sendEmail(transporter, mailOptions, maxRetries = 3) {
    // Always add a plain-text version if only HTML is provided
    if (mailOptions.html && !mailOptions.text) {
        mailOptions.text = htmlToPlainText(mailOptions.html);
    }

    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            return { ok: true, messageId: info.messageId, attempt };
        } catch (err) {
            lastError = err;
            const classified = classifyError(err);
            console.error(`Mailer: Attempt ${attempt}/${maxRetries} failed for ${mailOptions.to}: [${classified.type}] ${classified.description}`);

            if (!classified.retryable || attempt === maxRetries) {
                return {
                    ok: false,
                    error: classified.description,
                    errorType: classified.type,
                    attempt,
                    retryable: classified.retryable
                };
            }

            // Exponential back-off: 2s, 4s, 8s …
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // Should not reach here, but just in case
    return { ok: false, error: lastError?.message || 'Unknown error', attempt: maxRetries, retryable: false };
}

// ── Template variable renderer ─────────────────────────────────────
function renderTemplate(str, vars) {
    return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) => {
        const key = String(k || '').toUpperCase();
        return vars[key] != null ? String(vars[key]) : '';
    });
}

module.exports = {
    buildTransport,
    buildPooledTransport,
    htmlToPlainText,
    classifyError,
    sendEmail,
    renderTemplate
};
