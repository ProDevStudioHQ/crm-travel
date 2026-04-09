// Email Verification Routes — Lead Tools Pack V1
const express = require('express');
const router = express.Router();
const dns = require('dns');
const { dbRun, dbAll } = require('../db');

// ---- Verification Logic ----

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
    'tempmail.com', '10minutemail.com', '10minmail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'getnada.com', 'trashmail.com',
    'temp-mail.org', 'minuteinbox.com', 'throwaway.email', 'guerrillamail.info',
    'grr.la', 'dispostable.com', 'maildrop.cc', 'mailnesia.com',
    'sharklasers.com', 'guerrillamailblock.com', 'tempail.com',
    'fakeinbox.com', 'mailcatch.com', 'tempr.email', 'burnermail.io',
    'temp-mail.io', 'mohmal.com', 'guerrillamail.net', 'mytemp.email'
]);

// Syntax check
function checkSyntax(email) {
    if (!email || typeof email !== 'string') return { valid: false, reason: 'empty' };
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(email.trim())) return { valid: false, reason: 'bad_syntax' };
    return { valid: true };
}

// Extract domain
function getDomain(email) {
    return email.split('@')[1].toLowerCase().trim();
}

// Check if disposable
function isDisposable(domain) {
    return DISPOSABLE_DOMAINS.has(domain);
}

// DNS MX lookup (promisified, with timeout)
function checkMX(domain) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ hasMX: null, reason: 'timeout' }), 5000);
        dns.resolveMx(domain, (err, addresses) => {
            clearTimeout(timer);
            if (err) {
                if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
                    resolve({ hasMX: false, reason: 'no_mx' });
                } else {
                    resolve({ hasMX: null, reason: 'dns_error' });
                }
            } else {
                resolve({ hasMX: addresses && addresses.length > 0, reason: addresses && addresses.length > 0 ? 'mx_ok' : 'no_mx' });
            }
        });
    });
}

// Full verification for one email
async function verifyEmail(email) {
    const trimmed = (email || '').trim().toLowerCase();

    // 1) Syntax
    const syntax = checkSyntax(trimmed);
    if (!syntax.valid) {
        return { email: trimmed, status: 'invalid', reason: syntax.reason };
    }

    const domain = getDomain(trimmed);

    // 2) Disposable
    if (isDisposable(domain)) {
        return { email: trimmed, status: 'risky', reason: 'disposable' };
    }

    // 3) MX check
    const mx = await checkMX(domain);
    if (mx.hasMX === false) {
        return { email: trimmed, status: 'invalid', reason: 'no_mx' };
    }
    if (mx.hasMX === null) {
        return { email: trimmed, status: 'unknown', reason: mx.reason };
    }

    // 4) Valid
    return { email: trimmed, status: 'valid', reason: 'syntax_mx_ok' };
}

// ---- Endpoints ----

// POST /api/leads/verify
router.post('/api/leads/verify', async (req, res) => {
    try {
        const { emails, leadIds } = req.body || {};
        const emailList = [];

        // Collect emails from direct list
        if (Array.isArray(emails)) {
            emails.forEach(e => {
                if (typeof e === 'string' && e.trim()) {
                    emailList.push({ email: e.trim(), leadId: null });
                }
            });
        }

        // Collect emails from lead objects (leadIds contains lead objects with email + id)
        if (Array.isArray(leadIds)) {
            leadIds.forEach(l => {
                if (l && l.email) {
                    emailList.push({ email: l.email.trim(), leadId: l.id || l._id || null });
                }
            });
        }

        if (emailList.length === 0) {
            return res.status(400).json({ ok: false, message: 'No emails to verify.' });
        }

        // Cap at 500 per request
        const batch = emailList.slice(0, 500);
        const results = [];

        for (const item of batch) {
            const result = await verifyEmail(item.email);
            result.lead_id = item.leadId;
            result.checked_at = new Date().toISOString();

            // Persist
            await dbRun(
                `INSERT INTO email_verifications (lead_id, email, status, reason, checked_at) VALUES (?, ?, ?, ?, ?)`,
                [result.lead_id, result.email, result.status, result.reason, result.checked_at]
            );

            results.push(result);
        }

        const summary = {
            total: results.length,
            valid: results.filter(r => r.status === 'valid').length,
            risky: results.filter(r => r.status === 'risky').length,
            invalid: results.filter(r => r.status === 'invalid').length,
            unknown: results.filter(r => r.status === 'unknown').length
        };

        return res.json({ ok: true, results, summary });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/leads/verify/results
router.get('/api/leads/verify/results', async (req, res) => {
    try {
        const status = req.query.status;
        let sql = 'SELECT * FROM email_verifications ORDER BY checked_at DESC LIMIT 500';
        let params = [];
        if (status) {
            sql = 'SELECT * FROM email_verifications WHERE status = ? ORDER BY checked_at DESC LIMIT 500';
            params = [status];
        }
        const rows = await dbAll(sql, params);
        return res.json({ ok: true, results: rows });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

module.exports = router;
