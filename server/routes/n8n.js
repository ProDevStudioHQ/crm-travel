/**
 * n8n Integration Routes
 * ──────────────────────
 * Webhook endpoints for receiving data FROM n8n workflows
 * and API endpoints for n8n to pull data FROM the CRM.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// ──────────────────────────────────────────────
// INBOUND: n8n → CRM
// ──────────────────────────────────────────────

// POST /api/n8n/leads — Receive scraped leads from n8n
router.post('/api/n8n/leads', async (req, res) => {
    try {
        const leads = Array.isArray(req.body) ? req.body : [req.body];
        let imported = 0;
        let skipped = 0;

        for (const lead of leads) {
            if (!lead.email) { skipped++; continue; }

            // Check for duplicate
            const exists = await db.dbGet(
                'SELECT id FROM n8n_leads WHERE email = ?',
                [lead.email.toLowerCase().trim()]
            );
            if (exists) { skipped++; continue; }

            // Calculate lead score
            const score = calculateLeadScore(lead);

            await db.dbRun(
                `INSERT INTO n8n_leads (name, email, company, phone, country, website, source, score, raw_data, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lead.name || '',
                    lead.email.toLowerCase().trim(),
                    lead.company || '',
                    lead.phone || '',
                    lead.country || '',
                    lead.website || '',
                    lead.source || 'n8n_scraper',
                    score,
                    JSON.stringify(lead),
                    score >= 30 ? 'qualified' : 'new'
                ]
            );
            imported++;
        }

        console.log(`n8n Leads: ${imported} imported, ${skipped} skipped`);
        return res.json({ ok: true, imported, skipped, total: leads.length });
    } catch (e) {
        console.error('n8n Leads Error:', e);
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/n8n/update — Update lead status from n8n
router.post('/api/n8n/update', async (req, res) => {
    try {
        const { email, status, notes, campaign_id, event } = req.body;
        if (!email) return res.status(400).json({ ok: false, message: 'Email required' });

        const lead = await db.dbGet('SELECT id FROM n8n_leads WHERE email = ?', [email.toLowerCase()]);
        if (!lead) return res.status(404).json({ ok: false, message: 'Lead not found' });

        const updates = [];
        const params = [];

        if (status) { updates.push('status = ?'); params.push(status); }
        if (notes) { updates.push('notes = ?'); params.push(notes); }
        if (event) {
            // Log the event
            await db.dbRun(
                'INSERT INTO n8n_events (lead_id, event_type, campaign_id, meta) VALUES (?, ?, ?, ?)',
                [lead.id, event, campaign_id || null, JSON.stringify(req.body)]
            );
        }

        if (updates.length > 0) {
            updates.push('updated_at = datetime("now")');
            params.push(lead.id);
            await db.dbRun(`UPDATE n8n_leads SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/n8n/webhook — Generic webhook receiver
router.post('/api/n8n/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;
        console.log(`n8n Webhook [${type}]:`, JSON.stringify(data).substring(0, 200));

        await db.dbRun(
            'INSERT INTO n8n_events (event_type, meta) VALUES (?, ?)',
            [type || 'webhook', JSON.stringify(req.body)]
        );

        return res.json({ ok: true, received: true });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────
// OUTBOUND: CRM → n8n
// ──────────────────────────────────────────────

// GET /api/n8n/leads — Fetch leads for n8n to process
router.get('/api/n8n/leads', async (req, res) => {
    try {
        const { status, min_score, limit, source } = req.query;
        let sql = 'SELECT * FROM n8n_leads WHERE 1=1';
        const params = [];

        if (status) { sql += ' AND status = ?'; params.push(status); }
        if (min_score) { sql += ' AND score >= ?'; params.push(Number(min_score)); }
        if (source) { sql += ' AND source = ?'; params.push(source); }
        sql += ' ORDER BY created_at DESC';
        if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }

        const leads = await db.dbAll(sql, params);
        return res.json({ ok: true, count: leads.length, leads });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/n8n/leads/qualified — Get only send-ready leads (score > 30)
router.get('/api/n8n/leads/qualified', async (req, res) => {
    try {
        const leads = await db.dbAll(
            `SELECT * FROM n8n_leads WHERE score >= 30 AND status IN ('qualified', 'new') ORDER BY score DESC`
        );
        return res.json({ ok: true, count: leads.length, leads });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/n8n/stats — Dashboard stats for n8n hub
router.get('/api/n8n/stats', async (req, res) => {
    try {
        const stats = await db.dbGet(`
            SELECT
                COUNT(*) as total_leads,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
                SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                AVG(score) as avg_score,
                SUM(CASE WHEN score >= 30 THEN 1 ELSE 0 END) as qualified_count,
                SUM(CASE WHEN source = 'google_maps' THEN 1 ELSE 0 END) as from_google_maps,
                SUM(CASE WHEN source = 'linkedin' THEN 1 ELSE 0 END) as from_linkedin,
                SUM(CASE WHEN source = 'directory' THEN 1 ELSE 0 END) as from_directory,
                SUM(CASE WHEN source = 'competitor' THEN 1 ELSE 0 END) as from_competitor,
                SUM(CASE WHEN source = 'lead_magnet' THEN 1 ELSE 0 END) as from_lead_magnet
            FROM n8n_leads
        `);

        const recentEvents = await db.dbAll(
            'SELECT * FROM n8n_events ORDER BY created_at DESC LIMIT 20'
        );

        const queueStats = await db.dbGet(`
            SELECT
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as queue_pending,
                SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as queue_sent,
                SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as queue_failed
            FROM email_queue
        `);

        return res.json({ ok: true, ...stats, ...queueStats, recentEvents });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/n8n/leads/:id/score — Recalculate a lead's score
router.post('/api/n8n/leads/:id/score', async (req, res) => {
    try {
        const lead = await db.dbGet('SELECT * FROM n8n_leads WHERE id = ?', [req.params.id]);
        if (!lead) return res.status(404).json({ ok: false, message: 'Lead not found' });

        const data = JSON.parse(lead.raw_data || '{}');
        Object.assign(data, lead);
        const score = calculateLeadScore(data);

        await db.dbRun('UPDATE n8n_leads SET score = ?, status = ? WHERE id = ?', [
            score,
            score >= 30 ? 'qualified' : lead.status,
            lead.id
        ]);

        return res.json({ ok: true, score });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// DELETE /api/n8n/leads/:id — Delete a lead
router.delete('/api/n8n/leads/:id', async (req, res) => {
    try {
        await db.dbRun('DELETE FROM n8n_leads WHERE id = ?', [req.params.id]);
        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/n8n/leads/bulk-status — Bulk status update
router.post('/api/n8n/leads/bulk-status', async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!ids || !status) return res.status(400).json({ ok: false, message: 'ids and status required' });

        const placeholders = ids.map(() => '?').join(',');
        await db.dbRun(
            `UPDATE n8n_leads SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
            [status, ...ids]
        );

        return res.json({ ok: true, updated: ids.length });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/n8n/leads/export-to-queue — Push qualified leads to email queue
router.post('/api/n8n/leads/export-to-queue', async (req, res) => {
    try {
        const { subject, html, ids, min_score } = req.body;
        if (!subject || !html) return res.status(400).json({ ok: false, message: 'subject and html required' });

        let leads;
        if (ids && ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            leads = await db.dbAll(`SELECT * FROM n8n_leads WHERE id IN (${placeholders})`, ids);
        } else {
            leads = await db.dbAll(
                'SELECT * FROM n8n_leads WHERE score >= ? AND status IN ("qualified", "new")',
                [min_score || 30]
            );
        }

        const emails = leads.map(l => l.email).filter(Boolean);
        if (emails.length === 0) return res.json({ ok: true, queued: 0, message: 'No qualifying leads' });

        // Check unsubscribes
        const unsubs = await db.dbAll(
            `SELECT email FROM unsubscribes WHERE email IN (${emails.map(() => '?').join(',')})`,
            emails
        );
        const unsubSet = new Set(unsubs.map(u => u.email));
        const validEmails = emails.filter(e => !unsubSet.has(e));

        const result = await db.addToQueue(validEmails, subject, html, null, null);

        // Mark leads as contacted
        for (const lead of leads) {
            if (validEmails.includes(lead.email)) {
                await db.dbRun(
                    `UPDATE n8n_leads SET status = 'contacted', updated_at = datetime('now') WHERE id = ?`,
                    [lead.id]
                );
            }
        }

        return res.json({ ok: true, queued: result.queued, filtered: emails.length - validEmails.length });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────
// LEAD SCORING
// ──────────────────────────────────────────────

function calculateLeadScore(lead) {
    let score = 0;

    // +10 for having a company name
    if (lead.company && lead.company.trim().length > 2) score += 10;

    // +10 for having a phone number
    if (lead.phone && lead.phone.trim().length > 5) score += 10;

    // +20 for business email (not free provider)
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'protonmail.com', 'icloud.com'];
    if (lead.email) {
        const domain = lead.email.split('@')[1] || '';
        if (domain && !freeProviders.includes(domain.toLowerCase())) {
            score += 20;
        }
    }

    // +5 for having a website
    if (lead.website && lead.website.trim().length > 5) score += 5;

    // +5 for having a country
    if (lead.country && lead.country.trim().length > 1) score += 5;

    // +5 for having a full name
    if (lead.name && lead.name.trim().includes(' ')) score += 5;

    // +10 for travel-related keywords in company/website
    const travelKeywords = ['travel', 'tour', 'agency', 'dmc', 'incoming', 'voyage', 'tourism', 'holiday', 'booking'];
    const companyLower = (lead.company || '').toLowerCase();
    const websiteLower = (lead.website || '').toLowerCase();
    if (travelKeywords.some(k => companyLower.includes(k) || websiteLower.includes(k))) {
        score += 10;
    }

    return Math.min(score, 100);
}

module.exports = router;
