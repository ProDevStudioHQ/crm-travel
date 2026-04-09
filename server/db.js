const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const adapter = require('./lib/db-adapter');
const { initPostgresSchema } = require('./lib/db-schema-pg');

let db;

// Initialize database
async function initDb() {
  const dbPath = path.join(__dirname, '../data/database.sqlite');

  if (process.env.DB_TYPE === 'postgres') {
    console.log('[DB] Initializing PostgreSQL...');
    await adapter.init();
    await initPostgresSchema(adapter);
  } else {
    console.log('[DB] Initializing SQLite...');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[DB] SQLite Error:', err.message);
        process.exit(1);
      }
      console.log('[DB] SQLite connected to', dbPath);
    });

    adapter.setSqliteDb(db);

    // Create tables
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Settings table
        db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        `);

        // Email queue
        db.run(`
          CREATE TABLE IF NOT EXISTS email_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            to_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT,
            status TEXT DEFAULT 'pending',
            tries INTEGER DEFAULT 0,
            campaign_id INTEGER,
            scheduled_at TEXT,
            sent_at TEXT,
            error TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // FIX: Ensure error and updated_at columns exist (migrations from old schema)
        // Use setTimeout to avoid blocking table creation
        setTimeout(() => {
          db.run(`ALTER TABLE email_queue ADD COLUMN error TEXT`, (err) => {
            if (err) console.log('[DB Migration] error column:', err.message);
          });
          db.run(`ALTER TABLE email_queue ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`, (err) => {
            if (err) console.log('[DB Migration] updated_at column:', err.message);
          });
          // Create indexes for faster queries (after columns exist)
          db.run(`CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status)`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at)`);
        }, 500);

        // Enrichment jobs
        db.run(`
          CREATE TABLE IF NOT EXISTS enrichment_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT DEFAULT 'pending',
            total INTEGER DEFAULT 0,
            processed INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            mode TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Enrichment results
        db.run(`
          CREATE TABLE IF NOT EXISTS enrichment_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            lead_id INTEGER,
            status TEXT,
            changes_json TEXT,
            error TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Lead duplicates
        db.run(`
          CREATE TABLE IF NOT EXISTS lead_duplicates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id_a INTEGER NOT NULL,
            lead_id_b INTEGER NOT NULL,
            rule TEXT,
            score REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Email verifications
        db.run(`
          CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER,
            email TEXT NOT NULL,
            status TEXT,
            reason TEXT,
            checked_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Audit logs
        db.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            old_value TEXT,
            new_value TEXT,
            ip TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Import jobs
        db.run(`
          CREATE TABLE IF NOT EXISTS import_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module TEXT NOT NULL,
            uploaded_by INTEGER,
            status TEXT DEFAULT 'pending',
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT
          )
        `);

        // Campaigns
        db.run(`
          CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            channel TEXT,
            target TEXT,
            status TEXT DEFAULT 'draft',
            sent_at TEXT,
            subject TEXT,
            from_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Campaign recipients
        db.run(`
          CREATE TABLE IF NOT EXISTS campaign_recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            contact_id INTEGER,
            message_id TEXT,
            delivered_at TEXT,
            bounced_at TEXT,
            bounce_type TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Campaign events
        db.run(`
          CREATE TABLE IF NOT EXISTS campaign_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            recipient_id INTEGER,
            type TEXT NOT NULL,
            event_at TEXT DEFAULT CURRENT_TIMESTAMP,
            meta TEXT
          )
        `);

        // Campaign aggregates
        db.run(`
          CREATE TABLE IF NOT EXISTS campaign_aggregates (
            campaign_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            sent INTEGER DEFAULT 0,
            delivered INTEGER DEFAULT 0,
            bounces INTEGER DEFAULT 0,
            opens INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            unsubs INTEGER DEFAULT 0,
            complaints INTEGER DEFAULT 0,
            leads INTEGER DEFAULT 0,
            bookings INTEGER DEFAULT 0,
            revenue REAL DEFAULT 0,
            PRIMARY KEY (campaign_id, date)
          )
        `);

        // Unsubscribes
        db.run(`
          CREATE TABLE IF NOT EXISTS unsubscribes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            unsubscribed_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // n8n leads
        db.run(`
          CREATE TABLE IF NOT EXISTS n8n_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            company TEXT,
            phone TEXT,
            country TEXT,
            website TEXT,
            source TEXT,
            score INTEGER,
            status TEXT,
            notes TEXT,
            raw_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // n8n events
        db.run(`
          CREATE TABLE IF NOT EXISTS n8n_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER,
            event_type TEXT NOT NULL,
            campaign_id INTEGER,
            meta TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('[DB] Schema creation error:', err);
            reject(err);
          } else {
            console.log('[DB] SQLite schema initialized');
            resolve();
          }
        });
      });
    });
  }
}

// Database helper functions using the adapter
async function getSetting(key) {
  const row = await adapter.get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : null;
}

async function saveSetting(key, value) {
  const existing = await getSetting(key);
  if (existing) {
    await adapter.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
  } else {
    await adapter.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

async function addToQueue(toEmail, subject, body, campaignId = null) {
  const result = await adapter.run(
    'INSERT INTO email_queue (to_email, subject, body, campaign_id) VALUES (?, ?, ?, ?)',
    [toEmail, subject, body, campaignId]
  );
  return result.lastID;
}

async function getPendingEmails(limit = 50) {
  // FIX: Handle 3 cases:
  // 1. Pending emails (not yet sent)
  // 2. Scheduled emails (scheduled_at <= now)
  // 3. Stuck 'sending' emails older than 5 minutes (worker crash recovery)
  
  const now = new Date().toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  return await adapter.all(`
    SELECT * FROM email_queue 
    WHERE 
      (status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= ?))
      OR (status = 'sending' AND created_at < ?)
    ORDER BY created_at ASC
    LIMIT ?
  `, [now, fiveMinutesAgo, limit]);
}

async function updateEmailStatus(emailId, status, sentAt = null, error = null) {
  // FIX: Properly track retries by incrementing 'tries' field
  // Also track error message and last attempt timestamp
  let query;
  let params;
  
  if (status === 'sent') {
    query = 'UPDATE email_queue SET status = ?, sent_at = ?, tries = tries + 1 WHERE id = ?';
    params = [status, sentAt || new Date().toISOString(), emailId];
  } else if (status === 'pending' && error) {
    // Retrying: increment tries and store error
    query = 'UPDATE email_queue SET status = ?, tries = tries + 1, error = ? WHERE id = ?';
    params = [status, error, emailId];
  } else if (status === 'failed') {
    // Final failure: mark as failed with error
    query = 'UPDATE email_queue SET status = ?, tries = tries + 1, error = ?, sent_at = ? WHERE id = ?';
    params = [status, error || null, new Date().toISOString(), emailId];
  } else {
    // Other status (sending, pending, etc.)
    query = 'UPDATE email_queue SET status = ?, updated_at = ? WHERE id = ?';
    params = [status, new Date().toISOString(), emailId];
  }
  
  await adapter.run(query, params);
}

async function getPendingCount() {
  const row = await adapter.get(
    'SELECT COUNT(*) as count FROM email_queue WHERE status = ?',
    ['pending']
  );
  return row ? row.count : 0;
}

async function isUnsubscribed(email) {
  const row = await adapter.get(
    'SELECT id FROM unsubscribes WHERE email = ?',
    [email]
  );
  return !!row;
}

async function logCampaignEvent(campaignId, recipientId, type, meta = null) {
  await adapter.run(
    'INSERT INTO campaign_events (campaign_id, recipient_id, type, meta) VALUES (?, ?, ?, ?)',
    [campaignId, recipientId, type, JSON.stringify(meta)]
  );
}

async function initCampaignAnalytics(campaignId, date) {
  const row = await adapter.get(
    'SELECT id FROM campaign_aggregates WHERE campaign_id = ? AND date = ?',
    [campaignId, date]
  );
  if (!row) {
    await adapter.run(
      'INSERT INTO campaign_aggregates (campaign_id, date) VALUES (?, ?)',
      [campaignId, date]
    );
  }
}

async function logAudit(userId, action, entityType, entityId, oldValue = null, newValue = null, ip = null) {
  await adapter.run(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, action, entityType, entityId, oldValue, newValue, ip]
  );
}

async function createImportJob(module, uploadedBy) {
  const result = await adapter.run(
    'INSERT INTO import_jobs (module, uploaded_by) VALUES (?, ?)',
    [module, uploadedBy]
  );
  return result.lastID;
}

// Generic database functions
async function dbRun(sql, params = []) {
  return await adapter.run(sql, params);
}

async function dbAll(sql, params = []) {
  return await adapter.all(sql, params);
}

async function dbGet(sql, params = []) {
  return await adapter.get(sql, params);
}

async function dbTransaction(callback) {
  return await adapter.transaction(callback);
}

module.exports = {
  initDb,
  getSetting,
  saveSetting,
  addToQueue,
  getPendingEmails,
  updateEmailStatus,
  getPendingCount,
  isUnsubscribed,
  logCampaignEvent,
  initCampaignAnalytics,
  logAudit,
  createImportJob,
  dbRun,
  dbAll,
  dbGet,
  dbTransaction,
  adapter
};
