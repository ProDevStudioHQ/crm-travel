const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ── DB lives in /app/data/ (the named Docker volume) ──────────────
// ⚠️  NEVER store the DB inside /app/server/ — that directory is part
//     of the Docker image layer. On rebuild the volume overlay can
//     hide new server code, causing 502s and stale-code bugs.
const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Settings table for storing SMTP config
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Email Queue table
        db.run(`CREATE TABLE IF NOT EXISTS email_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            to_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            html TEXT,
            status TEXT DEFAULT 'pending', -- pending, sent, failed
            tries INTEGER DEFAULT 0,
            last_error TEXT,
            campaign_id TEXT,
            scheduled_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME
        )`);

        // ---- Lead Tools Pack V1 ----

        // Enrichment Jobs
        db.run(`CREATE TABLE IF NOT EXISTS enrichment_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'queued',
            total INTEGER DEFAULT 0,
            processed INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            mode TEXT,
            notes TEXT
        )`);

        // Enrichment Results (per-lead)
        db.run(`CREATE TABLE IF NOT EXISTS enrichment_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            lead_id TEXT,
            status TEXT DEFAULT 'pending',
            changes_json TEXT,
            error TEXT,
            FOREIGN KEY (job_id) REFERENCES enrichment_jobs(id)
        )`);

        // Duplicate Pairs
        db.run(`CREATE TABLE IF NOT EXISTS lead_duplicates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id_a TEXT,
            lead_id_b TEXT,
            rule TEXT,
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Email Verifications
        db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id TEXT,
            email TEXT,
            status TEXT DEFAULT 'unknown',
            reason TEXT,
            checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Audit Logs (Backup SOP)
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            old_value TEXT,
            new_value TEXT,
            ip TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Import Jobs (Backup SOP)
        db.run(`CREATE TABLE IF NOT EXISTS import_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module TEXT NOT NULL,
            uploaded_by TEXT,
            status TEXT DEFAULT 'processing',
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // --- Email Analytics ---
        db.run(`CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            name TEXT,
            channel TEXT,
            target TEXT,
            status TEXT,
            sent_at DATETIME,
            subject TEXT,
            from_name TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS campaign_recipients (
            id TEXT PRIMARY KEY,
            campaign_id TEXT,
            email TEXT,
            contact_id TEXT,
            message_id TEXT,
            delivered_at DATETIME,
            bounced_at DATETIME,
            bounce_type TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS campaign_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT,
            recipient_id TEXT,
            type TEXT, 
            event_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            meta TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
            FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS campaign_aggregates (
            campaign_id TEXT,
            date TEXT,
            sent INTEGER DEFAULT 0,
            delivered INTEGER DEFAULT 0,
            hard_bounce INTEGER DEFAULT 0,
            soft_bounce INTEGER DEFAULT 0,
            unique_opens INTEGER DEFAULT 0,
            unique_clicks INTEGER DEFAULT 0,
            unsubs INTEGER DEFAULT 0,
            complaints INTEGER DEFAULT 0,
            leads INTEGER DEFAULT 0,
            bookings INTEGER DEFAULT 0,
            revenue REAL DEFAULT 0,
            PRIMARY KEY (campaign_id, date)
        )`);
        // Unsubscribes table (email compliance)
        db.run(`CREATE TABLE IF NOT EXISTS unsubscribes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        // n8n Leads table (scraped/imported leads from n8n workflows)
        db.run(`CREATE TABLE IF NOT EXISTS n8n_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT '',
            email TEXT NOT NULL UNIQUE,
            company TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            country TEXT DEFAULT '',
            website TEXT DEFAULT '',
            source TEXT DEFAULT 'manual',
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'new',
            notes TEXT DEFAULT '',
            raw_data TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // n8n Events log (webhook events, campaign events, etc.)
        db.run(`CREATE TABLE IF NOT EXISTS n8n_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER,
            event_type TEXT NOT NULL,
            campaign_id TEXT,
            meta TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('Database tables initialized.');
    });
}

// Helper methods (promisified)

function getSetting(key) {
    return new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
            if (err) reject(err);
            else resolve(row ? JSON.parse(row.value) : null);
        });
    });
}

function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        const valStr = JSON.stringify(value);
        db.run(`INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [key, valStr],
            function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function addToQueue(emails, subject, html, campaignId, scheduledAt) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO email_queue (to_email, subject, html, campaign_id, scheduled_at) VALUES (?, ?, ?, ?, ?)`);

        let completed = 0;
        let errors = 0;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            emails.forEach(email => {
                stmt.run(email, subject, html, campaignId, scheduledAt, (err) => {
                    if (err) errors++;
                });
                completed++;
            });

            db.run("COMMIT", (err) => {
                stmt.finalize();
                if (err) reject(err);
                else resolve({ queued: completed, errors });
            });
        });
    });
}

function getPendingEmails(limit = 10) {
    return new Promise((resolve, reject) => {
        // Get emails that are pending and either not scheduled or scheduled for now/past
        // AND not failed too many times (max 3 tries)
        const now = new Date().toISOString();
        db.all(`SELECT * FROM email_queue 
                WHERE status = 'pending' 
                AND (scheduled_at IS NULL OR scheduled_at <= ?)
                AND tries < 3
                ORDER BY created_at ASC 
                LIMIT ?`,
            [now, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
    });
}

function getPendingCount() {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();
        db.get(`SELECT COUNT(*) as count FROM email_queue 
                WHERE status = 'pending' 
                AND (scheduled_at IS NULL OR scheduled_at <= ?)
                AND tries < 3`,
            [now], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
    });
}

function updateEmailStatus(id, status, error = null) {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();
        let sql, params;

        if (status === 'sent') {
            sql = `UPDATE email_queue SET status = ?, sent_at = ? WHERE id = ?`;
            params = [status, now, id];
        } else if (status === 'sending') {
            // Mark as sending without incrementing tries
            sql = `UPDATE email_queue SET status = ? WHERE id = ?`;
            params = [status, id];
        } else if (status === 'pending') {
            // Re-queue: set back to pending with error logged, increment tries
            sql = `UPDATE email_queue SET status = ?, last_error = ?, tries = tries + 1 WHERE id = ?`;
            params = [status, error, id];
        } else {
            // failed or other
            sql = `UPDATE email_queue SET status = ?, last_error = ?, tries = tries + 1 WHERE id = ?`;
            params = [status, error, id];
        }

        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function initCampaignAnalytics(campaign, recipients) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Insert campaign
            const campStmt = db.prepare(`INSERT OR REPLACE INTO campaigns (id, name, channel, target, status, sent_at, subject, from_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            campStmt.run(String(campaign.id), campaign.name || 'Untitled', campaign.type || 'Email', campaign.audience || 'B2C', 'sending', new Date().toISOString(), campaign.subject || '', campaign.from_name || '');
            campStmt.finalize();

            // Insert recipients
            const recStmt = db.prepare(`INSERT OR IGNORE INTO campaign_recipients (id, campaign_id, email) VALUES (?, ?, ?)`);
            recipients.forEach(r => {
                // Generate a unique ID for the recipient (e.g. campaignId + email)
                const recId = `${campaign.id}_${r}`;
                recStmt.run(recId, String(campaign.id), r);
            });
            recStmt.finalize();

            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    });
}

function logCampaignEvent(campaignId, recipientEmail, type, meta = {}) {
    return new Promise((resolve, reject) => {
        const recipientId = `${campaignId}_${recipientEmail}`;
        const metaStr = JSON.stringify(meta);

        const stmt = db.prepare(`INSERT INTO campaign_events (campaign_id, recipient_id, type, meta) VALUES (?, ?, ?, ?)`);
        stmt.run(String(campaignId), recipientId, type, metaStr, function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
        stmt.finalize();
    });
}

// ==== Backup & Audit Helpers ====
function logAudit(userId, action, entityType, entityId, oldValue, newValue, ip = '') {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
            userId || 'system',
            action,
            entityType,
            entityId,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            ip,
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
        stmt.finalize();
    });
}

function createImportJob(module, uploadedBy) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO import_jobs (module, uploaded_by) VALUES (?, ?)`);
        stmt.run(module, uploadedBy || 'system', function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
        stmt.finalize();
    });
}

// Check if an email has been unsubscribed
function isUnsubscribed(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM unsubscribes WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
        });
    });
}

module.exports = {
    db,
    getSetting,
    saveSetting,
    addToQueue,
    getPendingEmails,
    updateEmailStatus,
    getPendingCount,
    isUnsubscribed,
    initCampaignAnalytics,
    logCampaignEvent,
    logAudit,
    createImportJob,
    // Generic helpers for Lead Tools
    dbRun(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },
    dbAll(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    },
    dbGet(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }
};
