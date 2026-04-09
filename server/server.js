console.log("APP STARTING...");
// ---------------- GLOBAL PROCESS OVERRIDES ----------------
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load .env file from project root (parent of /server)
const path = require('path');
try { require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); } catch (_) { /* dotenv optional */ }

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const db = require('./db');
const { startWorker, processQueue } = require('./worker');
const { buildTransport, sendEmail, renderTemplate } = require('./lib/mailer');

const app = express();

// ---------------- Initialization: Data Directories ----------------
const dataDirs = [
  path.join(__dirname, '..', 'data', 'crm', 'uploads'),
  path.join(__dirname, '..', 'data', 'crm', 'imports', 'raw'),
  path.join(__dirname, '..', 'data', 'crm', 'imports', 'processed'),
  path.join(__dirname, '..', 'data', 'crm', 'imports', 'logs'),
  path.join(__dirname, '..', 'data', 'crm', 'exports'),
  path.join(__dirname, '..', 'data', 'crm', 'backups', 'db'),
  path.join(__dirname, '..', 'data', 'crm', 'backups', 'files')
];

dataDirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

// ---------------- Security / Ops ----------------
const API_KEY = process.env.CRM_API_KEY || '';
const ALLOWED_ORIGINS = (process.env.CRM_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin || ALLOWED_ORIGINS.length === 0) return cb(null, true);
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: false
}));

app.use(express.json({ limit: '2mb' }));

app.use('/api', (req, res, next) => {
  if (!API_KEY) return next();
  const k = req.header('x-api-key') || '';
  if (k && k === API_KEY) return next();
  return res.status(401).json({ ok: false, message: 'Unauthorized (missing/invalid x-api-key).' });
});

// ---------------- Static (Client) ----------------
const clientDir = path.join(__dirname, '..');
app.use(express.static(clientDir));

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// n8n Integration Routes
const n8nRoutes = require('./routes/n8n');
app.use(n8nRoutes);

// AI Lead Finder Routes
const aiLeadFinderRoutes = require('./routes/ai-lead-finder');
app.use(aiLeadFinderRoutes);

// ---------------- Email Settings (DB) ----------------

// GET /api/settings/email
app.get('/api/settings/email', async (req, res) => {
  try {
    const smtp = await db.getSetting('smtp') || {};
    const imap = await db.getSetting('imap') || {};
    return res.json({ ok: true, smtp, imap });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/settings/email
app.post('/api/settings/email', async (req, res) => {
  try {
    const { smtp, imap } = req.body;
    if (smtp && smtp.host) await db.saveSetting('smtp', smtp);
    if (imap && imap.host) await db.saveSetting('imap', imap);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------------- IMAP Inbox Sync ----------------
const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;

app.get('/api/mail/inbox/sync', async (req, res) => {
  try {
    const imapConfig = await db.getSetting('imap');
    if (!imapConfig || !imapConfig.host || !imapConfig.username || !imapConfig.password) {
      return res.status(400).json({ ok: false, message: 'IMAP not configured or missing credentials in DB.' });
    }

    const config = {
      imap: {
        user: imapConfig.username,
        password: imapConfig.password,
        host: imapConfig.host,
        port: parseInt(imapConfig.port) || 993,
        tls: imapConfig.encryption !== 'None',
        tlsOptions: { rejectUnauthorized: false }, // Prevent self-signed cert blocking
        authTimeout: 10000
      }
    };

    const connection = await imaps.connect(config);
    const box = await connection.openBox('INBOX');

    const seqFrom = Math.max(1, box.messages.total - 29);
    const searchCriteria = [`${seqFrom}:*`];

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true,
      struct: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const parsedEmails = [];

    for (const item of messages) {
      const all = item.parts.find(p => p.which === '');
      const id = item.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";

      const parsed = await simpleParser(idHeader + all.body);

      parsedEmails.push({
        id: 100000000 + id, // Stable numeric ID for deduplication
        subject: parsed.subject || '(No Subject)',
        from: parsed.from?.text || 'Unknown Sender',
        snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : 'No content preview...',
        body: parsed.html || parsed.textAsHtml || parsed.text || '',
        date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
        folder: 'inbox',
        read: false,
        labels: [],
        avatar: 'fa-user'
      });
    }

    connection.end();

    return res.json({ ok: true, count: parsedEmails.length, emails: parsedEmails });
  } catch (e) {
    console.error('IMAP Sync Error:', e);
    return res.status(500).json({ ok: false, message: e.message });
  }
});

app.get('/api/mail/sent/sync', async (req, res) => {
  try {
    const imapConfig = await db.getSetting('imap');
    if (!imapConfig || !imapConfig.host || !imapConfig.username || !imapConfig.password) {
      return res.status(400).json({ ok: false, message: 'IMAP not configured or missing credentials in DB.' });
    }

    const config = {
      imap: {
        user: imapConfig.username,
        password: imapConfig.password,
        host: imapConfig.host,
        port: parseInt(imapConfig.port) || 993,
        tls: imapConfig.encryption !== 'None',
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      }
    };

    const connection = await imaps.connect(config);
    const boxes = await connection.getBoxes();

    // Recursive search for Sent mail folder via attribute \Sent
    function findBoxByAttrib(boxesObj, attrib, prefix = '') {
      for (const key in boxesObj) {
        const box = boxesObj[key];
        const fullName = prefix + key;
        if (box.attribs && box.attribs.some(a => a.toLowerCase() === attrib.toLowerCase())) return fullName;
        if (box.children) {
          const found = findBoxByAttrib(box.children, attrib, fullName + box.delimiter);
          if (found) return found;
        }
      }
      return null;
    }

    let sentBoxName = findBoxByAttrib(boxes, '\\sent');

    // Fallback if \Sent attribute is missing
    if (!sentBoxName) {
      const fallbackNames = ['Sent', 'Sent Items', 'Sent Messages', '[Gmail]/Sent Mail'];
      function findBoxByName(boxesObj, prefix = '') {
        for (const key in boxesObj) {
          const box = boxesObj[key];
          const fullName = prefix + key;
          if (fallbackNames.some(f => f.toLowerCase() === fullName.toLowerCase())) return fullName;
          if (box.children) {
            const found = findBoxByName(box.children, fullName + box.delimiter);
            if (found) return found;
          }
        }
        return null;
      }
      sentBoxName = findBoxByName(boxes);
    }

    if (!sentBoxName) {
      connection.end();
      return res.status(404).json({ ok: false, message: 'Could not dynamically locate the Sent mailbox.' });
    }

    const box = await connection.openBox(sentBoxName);

    const seqFrom = Math.max(1, box.messages.total - 29); // Fetch last 30
    const searchCriteria = [`${seqFrom}:*`];

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true,
      struct: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const parsedEmails = [];

    for (const item of messages) {
      const all = item.parts.find(p => p.which === '');
      const id = item.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";

      const parsed = await simpleParser(idHeader + all.body);

      parsedEmails.push({
        id: 200000000 + id, // Stable numeric ID for deduplication
        subject: parsed.subject || '(No Subject)',
        from: parsed.from?.text || 'Me', // Assuming Sent Mail is from the user
        recipient: parsed.to?.text || 'Unknown',
        snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : 'No content preview...',
        body: parsed.html || parsed.textAsHtml || parsed.text || '',
        date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
        folder: 'sent',
        read: true, // Sent emails are naturally read
        labels: [],
        status: 'sent', // Display correctly in history
        avatar: 'fa-paper-plane'
      });
    }

    connection.end();

    return res.json({ ok: true, count: parsedEmails.length, emails: parsedEmails, mappedBox: sentBoxName });
  } catch (e) {
    console.error('IMAP Sent Sync Error:', e);
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// ---------------- Security Settings (DB) ----------------

// GET /api/settings/security
app.get('/api/settings/security', async (req, res) => {
  try {
    const security = await db.getSetting('security');
    return res.json({ ok: true, security: security || {} });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/settings/security
app.post('/api/settings/security', async (req, res) => {
  try {
    const config = req.body;
    if (!config) {
      return res.status(400).json({ ok: false, message: 'Invalid configuration' });
    }
    await db.saveSetting('security', config);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});


// ---------------- SMTP Utils ----------------
// buildTransport is now imported from ./lib/mailer.js (single source of truth)

// ---------------- Sending Endpoints ----------------

app.post('/api/smtp/test', async (req, res) => {
  try {
    let { smtp, testRecipient } = req.body || {};

    // Fallback to DB settings if not provided in body
    if (!smtp || !smtp.host) {
      smtp = await db.getSetting('smtp');
    }

    if (!smtp || !smtp.host || !smtp.username || !smtp.password) {
      return res.status(400).json({ ok: false, message: 'Missing SMTP fields (host, username, password).' });
    }
    const transporter = buildTransport(smtp);

    // 1) Verify connection/auth
    await transporter.verify();

    // 2) Send test message
    const to = String(testRecipient || smtp.testRecipient || smtp.username || '').trim();
    if (to) {
      const fromName = smtp.fromName || 'PM Travel Agency';
      const useAuthAsFrom = smtp.useAuthAsFrom !== false;
      const fromEmail = useAuthAsFrom ? smtp.username : (smtp.fromEmail || smtp.username);
      const replyTo = smtp.replyTo || fromEmail;

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: 'SMTP Test - PM Travel CRM',
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5">
                <h3>SMTP Test Successful ✅</h3>
                <p>This message confirms your SMTP settings can <b>send</b> emails.</p>
                <p><b>Host:</b> ${smtp.host}<br/>
                   <b>Port:</b> ${smtp.port || 587}<br/>
                   <b>Encryption:</b> ${smtp.encryption || 'TLS'}</p>
              </div>`,
        replyTo,
        envelope: { from: fromEmail, to }
      });
    }

    return res.json({ ok: true, message: 'Connection Verified & Test Email Sent' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: e.message || 'SMTP test failed' });
  }
});
// Basic in-memory rate limiting for batch sending
const rate = new Map(); // ip -> { count, resetAt }
function allowBatch(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;      // 1 minute window
  const maxPerWindow = 10;         // 10 batch calls per minute per IP
  const entry = rate.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  rate.set(ip, entry);
  return entry.count <= maxPerWindow;
}

// renderTemplate is now imported from ./lib/mailer.js

app.post('/api/smtp/send-batch', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if (!allowBatch(ip)) {
      return res.status(429).json({ ok: false, message: 'Rate limit exceeded. Try again in a minute.' });
    }

    const { smtp, campaign, template, recipients } = req.body || {};

    console.log('--- DEBUG START: /api/smtp/send-batch ---');
    console.log('Campaign:', campaign ? campaign.name : 'N/A');
    console.log('Recipients Count:', recipients ? recipients.length : 0);
    if (recipients && recipients.length > 0) {
      console.log('Sample Recipients:', recipients.slice(0, 3));
    } else {
      console.error('ERROR: No recipients provided!');
    }

    if (!smtp || !smtp.host || !smtp.username || !smtp.password) {
      console.error('ERROR: Missing SMTP config');
      return res.status(400).json({ ok: false, message: 'Missing SMTP fields (host, username, password).' });
    }
    if (!template || !template.subject || !template.body) {
      return res.status(400).json({ ok: false, message: 'Missing template (subject/body).' });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ ok: false, message: 'Recipients list is empty.' });
    }

    const transporter = buildTransport(smtp);

    const fromName = smtp.fromName || 'PM Travel Agency';
    const useAuthAsFrom = smtp.useAuthAsFrom !== false;
    const fromEmail = useAuthAsFrom ? smtp.username : (smtp.fromEmail || smtp.username);
    const replyTo = smtp.replyTo || fromEmail;
    const charset = smtp.charset || 'UTF-8';

    const results = [];
    let sent = 0;
    let failed = 0;

    // Throttle to be safer for SMTP servers
    const MAX = 1500;
    const list = recipients.slice(0, MAX);

    for (const to of list) {
      try {
        const vars = {
          FULL_NAME: '',
          EMAIL: to,
          WEBSITE_URL: 'https://pm-travelagency.com',
          CAMPAIGN_NAME: campaign?.name || 'Campaign'
        };
        const subject = renderTemplate(template.subject, vars);
        const html = renderTemplate(template.body, vars);

        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          html,
          replyTo,
          envelope: { from: fromEmail, to }
          // Removed manual Content-Type header to let Nodemailer handle MIME boundaries
        });

        console.log(`SMTP Batch: Sent to ${to} | MessageID: ${info.messageId}`);
        sent++;
        results.push({ to, ok: true, id: info.messageId });
      } catch (e) {
        console.error(`SMTP Batch Error (${to}):`, e.message);
        failed++;
        results.push({ to, ok: false, error: e.message });
      }
    }

    return res.json({ ok: true, sent, failed, results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: e.message || 'Send failed' });
  }
});
app.post('/api/campaigns/send', async (req, res) => {
  try {
    const { campaign, template, recipients, batchSize, batchIntervalHours } = req.body || {};

    if (!recipients || !recipients.length) {
      return res.status(400).json({ ok: false, message: 'No recipients provided.' });
    }

    try {
      await db.initCampaignAnalytics(campaign, recipients);
    } catch (err) {
      console.error("Failed to initialize campaign analytics:", err);
    }

    if (batchSize && batchIntervalHours) {
      let queuedCount = 0;
      let delayMs = 0;
      const intervalMs = batchIntervalHours * 60 * 60 * 1000;
      const now = Date.now();

      // Slice into chunks
      for (let i = 0; i < recipients.length; i += batchSize) {
        const chunk = recipients.slice(i, i + batchSize);
        const scheduledAt = delayMs === 0 ? null : new Date(now + delayMs).toISOString();

        const result = await db.addToQueue(
          chunk,
          template.subject,
          template.body,
          campaign.id,
          scheduledAt
        );
        queuedCount += result.queued;
        delayMs += intervalMs;
      }

      return res.json({
        ok: true,
        queued: queuedCount,
        message: `Queued ${queuedCount} emails in batches of ${batchSize}.`
      });
    } else {
      const result = await db.addToQueue(
        recipients,
        template.subject,
        template.body,
        campaign.id,
        null
      );

      // Immediately trigger email processing
      setTimeout(() => {
        processQueue().catch(err => {
          console.error('Error in auto-process after campaign send:', err);
        });
      }, 500);

      return res.json({
        ok: true,
        queued: result.queued,
        message: `Queued ${result.queued} emails for background delivery. Processing started…`
      });
    }

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: e.message || 'Queueing failed' });
  }
});
// ---------------- Manual Worker Trigger ----------------

app.post('/api/worker/process', async (req, res) => {
  try {
    // Manually trigger one cycle of processQueue
    await processQueue();
    const remaining = await db.getPendingCount();
    return res.json({
      ok: true,
      remaining,
      message: `Batch processed. ${remaining} emails remaining in queue.`
    });
  } catch (e) {
    console.error('Manual Worker Error:', e);
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// ---- Campaign Analytics Data Routes ----

app.get('/api/campaigns/analytics', async (req, res) => {
  try {
    const campaigns = await db.dbAll(`SELECT id FROM campaigns`);
    const allClicks = await db.dbAll(`SELECT campaign_id, recipient_id, meta FROM campaign_events WHERE type = 'click'`);
    const analytics = {};
    for (const c of campaigns) {
      const stats = await db.dbGet(`
                SELECT 
                    COUNT(DISTINCT r.id) as sent,
                    SUM(CASE WHEN e.type = 'delivered' THEN 1 ELSE 0 END) as delivered,
                    SUM(CASE WHEN e.type = 'open' THEN 1 ELSE 0 END) as unique_opens,
                    SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END) as unique_clicks,
                    SUM(CASE WHEN e.type = 'bounce' THEN 1 ELSE 0 END) as total_bounces,
                    SUM(CASE WHEN e.type = 'unsub' THEN 1 ELSE 0 END) as unsubs
                FROM campaign_recipients r
                LEFT JOIN (
                    SELECT recipient_id, type FROM campaign_events
                    GROUP BY recipient_id, type 
                ) e ON r.id = e.recipient_id
                WHERE r.campaign_id = ?
            `, [c.id]);

      const campClicks = allClicks.filter(e => String(e.campaign_id).replace('.0', '') === String(c.id));
      const urlMap = {};
      for (const row of campClicks) {
        try {
          const meta = JSON.parse(row.meta);
          const url = meta.url;
          if (url) {
            if (!urlMap[url]) urlMap[url] = { unique: new Set(), total: 0 };
            urlMap[url].unique.add(row.recipient_id);
            urlMap[url].total++;
          }
        } catch (e) { }
      }

      stats.top_links = Object.keys(urlMap).map(url => ({
        url,
        unique: urlMap[url].unique.size,
        total: urlMap[url].total
      })).sort((a, b) => b.unique - a.unique);

      analytics[c.id] = stats;
    }
    res.json({ ok: true, data: analytics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

app.get('/api/campaigns/analytics/:id', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const stats = await db.dbGet(`
            SELECT 
                COUNT(DISTINCT r.id) as sent,
                SUM(CASE WHEN e.type = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN e.type = 'open' THEN 1 ELSE 0 END) as unique_opens,
                SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END) as unique_clicks,
                SUM(CASE WHEN e.type = 'bounce' THEN 1 ELSE 0 END) as total_bounces,
                SUM(CASE WHEN e.type = 'unsub' THEN 1 ELSE 0 END) as unsubs
            FROM campaign_recipients r
            LEFT JOIN (
                SELECT recipient_id, type FROM campaign_events
                GROUP BY recipient_id, type 
            ) e ON r.id = e.recipient_id
            WHERE r.campaign_id = ?
        `, [campaignId]);

    const allClicks = await db.dbAll(`SELECT campaign_id, recipient_id, meta FROM campaign_events WHERE type = 'click'`);
    const campClicks = allClicks.filter(e => String(e.campaign_id).replace('.0', '') === String(campaignId));

    const urlMap = {};
    for (const row of campClicks) {
      try {
        const meta = JSON.parse(row.meta);
        const url = meta.url;
        if (url) {
          if (!urlMap[url]) urlMap[url] = { unique: new Set(), total: 0 };
          urlMap[url].unique.add(row.recipient_id);
          urlMap[url].total++;
        }
      } catch (e) { }
    }

    stats.top_links = Object.keys(urlMap).map(url => ({
      url,
      unique: urlMap[url].unique.size,
      total: urlMap[url].total
    })).sort((a, b) => b.unique - a.unique);

    res.json({ ok: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// ---- Email Analytics Tracking Routes ----

app.get('/t/open/:token.png', async (req, res) => {
  try {
    const token = req.params.token;
    if (token) {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [campaignId, email] = decoded.split('|');
      if (campaignId && email) {
        await db.logCampaignEvent(campaignId, email, 'open', {
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });
      }
    }
  } catch (e) {
    console.error('Open tracking error:', e);
  }

  // Return a 1x1 transparent GIF
  const buf = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif');
  res.send(buf);
});

app.get('/t/click/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const targetUrl = req.query.url; // Target URL passed in query string for simplicity

    if (token && targetUrl) {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [campaignId, email] = decoded.split('|');
      if (campaignId && email) {
        await db.logCampaignEvent(campaignId, email, 'click', {
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          url: targetUrl
        });
      }

      // Browsers often block 302 redirects to mailto: or tel:
      if (targetUrl.startsWith('mailto:') || targetUrl.startsWith('tel:')) {
        return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                  <meta http-equiv="refresh" content="0; url=${targetUrl}">
                  <style>
                      html, body { background: #f8f9fa; font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                      .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; }
                  </style>
              </head>
              <body>
                  <div class="card">
                      <h2 style="margin-top:0; color: #333;">Launching application...</h2>
                      <p style="color: #666; margin-bottom: 20px;">If nothing happens, please <a href="${targetUrl}" style="color: #009ef7; font-weight: bold;">click here</a>.</p>
                      <button onclick="window.history.back()" style="padding: 10px 20px; background: #eee; border: none; border-radius: 8px; cursor: pointer;">Return to CRM</button>
                  </div>
                  <script>
                    // 1. Force the external protocol
                    window.location.href = "${targetUrl}";
                    
                    // 2. Safely attempt to return the user to their previous screen
                    setTimeout(() => {
                        try {
                            if (window.history.length > 1) {
                                window.history.back();
                            } else {
                                window.close();
                            }
                        } catch (err) {}
                    }, 800);
                  </script>
              </body>
              </html>
          `);
      }

      return res.redirect(targetUrl);
    }
    res.status(400).send('Invalid link');
  } catch (e) {
    console.error('Click tracking error:', e);
    res.status(500).send('Error');
  }
});

app.post('/webhooks/email/events', async (req, res) => {
  // Placeholder for ESP webhooks (SendGrid, Mailgun, etc.)
  console.log('Received email webhook event:', req.body);

  // Simulating mapping ESP events (delivered, bounce, etc.) to db.logCampaignEvent
  // Example payload: { type: 'delivered', email: '...', campaign_id: '...' }
  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const evt of events) {
    if (evt.campaign_id && evt.email && evt.type) {
      try {
        await db.logCampaignEvent(evt.campaign_id, evt.email, evt.type, {
          ip: evt.ip || req.ip,
          reason: evt.reason || ''
        });
      } catch (err) {
        console.error("Failed to log webhook event:", err);
      }
    }
  }
  res.json({ ok: true });
});

// ---- Lead Tools Pack V1 Routes ----
app.use(require('./routes/leads_enrich'));
app.use(require('./routes/leads_duplicates'));
app.use(require('./routes/leads_verify'));

// ---------------- BACKUP & RECOVERY (SOP) ----------------
app.get('/api/backup/download', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
    const filename = `${timestamp}__full__crm.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename = "${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    // 1. Add database backup
    const dbPath = path.resolve(__dirname, '..', 'data', 'database.sqlite');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'db_backup.sqlite' });
    }

    // 2. Add files and directories
    const rootDataDir = path.join(__dirname, '..', 'data', 'crm');
    const foldersToInclude = [
      'uploads',
      'imports/raw',
      'imports/logs',
      'imports/processed',
      'exports'
    ];

    foldersToInclude.forEach(folder => {
      const folderPath = path.join(rootDataDir, ...folder.split('/'));
      if (fs.existsSync(folderPath)) {
        archive.directory(folderPath, folder);
      }
    });

    // 3. Append manifest JSON
    const manifest = {
      backup_id: `bck_${Date.now()} `,
      created_at: new Date().toISOString(),
      crm_version: '1.0110',
      database_type: 'sqlite3',
      record_counts: {
        note: "Core CRM entities reside in client local storage. Metrics reflect server-side data logs."
      }
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: 'backup_manifest.json' });

    await archive.finalize();
  } catch (e) {
    console.error('Backup generation error:', e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, message: 'Failed to generate backup' });
    }
  }
});

// ---- Queue Status Endpoint ----
app.get('/api/queue/status', async (req, res) => {
  try {
    const pending = await db.getPendingCount();
    const stats = await db.dbGet(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='sending' THEN 1 ELSE 0 END) as sending,
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
      FROM email_queue
    `);
    return res.json({ ok: true, ...stats });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// ---- Unsubscribe Endpoint ----
app.get('/unsubscribe', async (req, res) => {
  const email = req.query.email || '';
  // Log the unsubscribe event (can be extended to block future sends)
  if (email) {
    try {
      await db.dbRun(`INSERT OR IGNORE INTO unsubscribes (email, unsubscribed_at) VALUES (?, datetime('now'))`, [email]);
    } catch (_) { /* table may not exist yet, that's ok */ }
    console.log(`Unsubscribe: ${email}`);
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Unsubscribed</title>
    <style>
      body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
      .card { background: #fff; padding: 48px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); text-align: center; max-width: 460px; }
      h2 { color: #333; margin-top: 0; }
      p { color: #666; line-height: 1.6; }
    </style>
    </head>
    <body>
      <div class="card">
        <h2>You've been unsubscribed</h2>
        <p>The email <strong>${email}</strong> has been removed from our mailing list. You will no longer receive marketing emails from us.</p>
      </div>
    </body>
    </html>
  `);
});

// ===== DATABASE MANAGEMENT ROUTES =====

// GET /api/settings/db-status
app.get('/api/settings/db-status', (req, res) => {
  const { adapter } = require('./db');
  const currentDb = process.env.DB_TYPE || 'sqlite';

  const status = {
    ok: true,
    currentDb: currentDb,
    isHealthy: false,
    stats: {}
  };

  if (currentDb === 'postgres') {
    status.stats = {
      type: 'postgres',
      host: process.env.PG_HOST || 'db',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'crm_db',
      poolSize: 10
    };
  } else {
    status.stats = {
      type: 'sqlite',
      filePath: 'data/database.sqlite'
    };
  }

  adapter.health().then(health => {
    status.isHealthy = health.healthy;
    res.json(status);
  }).catch(err => {
    status.isHealthy = false;
    res.json(status);
  });
});

// POST /api/settings/db-test-connection
app.post('/api/settings/db-test-connection', async (req, res) => {
  const { pgHost, pgPort, pgDatabase, pgUser, pgPassword, pgSslMode } = req.body;

  if (!pgHost || !pgDatabase || !pgUser) {
    return res.json({ ok: false, message: 'Host, Database, and User are required' });
  }

  try {
    const { Pool } = require('pg');
    const testPool = new Pool({
      host: pgHost,
      port: pgPort || 5432,
      database: pgDatabase,
      user: pgUser,
      password: pgPassword || '',
      ssl: pgSslMode === 'require' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });

    await testPool.query('SELECT NOW()');
    await testPool.end();

    res.json({ ok: true, message: 'PostgreSQL connection successful' });
  } catch (err) {
    res.json({ ok: false, message: `Connection error: ${err.message}` });
  }
});

// POST /api/settings/db-migrate
app.post('/api/settings/db-migrate', async (req, res) => {
  try {
    const { adapter } = require('./db');
    const { migrateSqliteToPostgres } = require('./lib/migrate-sqlite-to-pg');

    const sqliteDbPath = path.join(__dirname, '../data/database.sqlite');

    if (!fs.existsSync(sqliteDbPath)) {
      return res.json({ ok: false, message: 'SQLite database not found' });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Start migration in background and stream progress
    (async () => {
      try {
        // Initialize PostgreSQL if not already done
        if (process.env.DB_TYPE !== 'postgres') {
          await adapter.init();
          const { initPostgresSchema } = require('./lib/db-schema-pg');
          await initPostgresSchema(adapter);
        }

        res.write(JSON.stringify({ status: 'Initializing migration...', message: 'Starting SQLite to PostgreSQL data migration' }) + '\n');

        const report = await migrateSqliteToPostgres(sqliteDbPath, adapter);

        // Stream table migration results
        for (const [table, stats] of Object.entries(report.tables)) {
          const msg = `${table}: ${stats.sourceCount} → ${stats.targetCount} rows`;
          res.write(JSON.stringify({ status: 'migrating', message: msg, table, sourceCount: stats.sourceCount, targetCount: stats.targetCount, errors: stats.errors }) + '\n');
        }

        res.write(JSON.stringify({
          status: 'complete',
          message: `Migration complete in ${report.duration_ms}ms`,
          success: report.success,
          duration_ms: report.duration_ms,
          tables: report.tables
        }) + '\n');

        res.end();
      } catch (err) {
        res.write(JSON.stringify({ status: 'error', message: `Migration error: ${err.message}` }) + '\n');
        res.end();
      }
    })();
  } catch (err) {
    res.json({ ok: false, message: `Migration error: ${err.message}` });
  }
});

// POST /api/settings/db-switch
app.post('/api/settings/db-switch', async (req, res) => {
  try {
    // Update environment variable in .env file
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/DB_TYPE=.*/g, 'DB_TYPE=postgres');
    } else {
      envContent = 'DB_TYPE=postgres\n';
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    process.env.DB_TYPE = 'postgres';

    res.json({
      ok: true,
      message: 'Database switched to PostgreSQL. Application will restart...'
    });

    // Restart application after 2 seconds
    setTimeout(() => {
      console.log('[DB Switch] Restarting application with PostgreSQL...');
      process.exit(0);
    }, 2000);
  } catch (err) {
    res.json({ ok: false, message: `Switch error: ${err.message}` });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Initialize database
    await db.initDb();

    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
      // Start background email worker (processes queue every 15 seconds)
      startWorker(15000);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
