// Lead Duplicates Routes — Lead Tools Pack V1
const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet } = require('../db');

// ---- Duplicate Detection Logic ----

// Dice coefficient for fuzzy string matching
function diceCoefficient(a, b) {
    if (!a || !b) return 0;
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigrams = new Map();
    for (let i = 0; i < a.length - 1; i++) {
        const bi = a.substring(i, i + 2);
        bigrams.set(bi, (bigrams.get(bi) || 0) + 1);
    }

    let matches = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const bi = b.substring(i, i + 2);
        const count = bigrams.get(bi) || 0;
        if (count > 0) {
            matches++;
            bigrams.set(bi, count - 1);
        }
    }

    return (2 * matches) / (a.length - 1 + b.length - 1);
}

// Extract domain from email
function domainFromEmail(email) {
    if (!email || !email.includes('@')) return '';
    return email.split('@')[1].toLowerCase().trim();
}

// Extract domain from website URL
function domainFromUrl(url) {
    if (!url) return '';
    try {
        const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
        return hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) { return ''; }
}

// Find duplicate pairs among leads
function findDuplicates(leads) {
    const pairs = [];
    const seen = new Set(); // Avoid A↔B and B↔A

    for (let i = 0; i < leads.length; i++) {
        for (let j = i + 1; j < leads.length; j++) {
            const a = leads[i];
            const b = leads[j];
            const aId = a.id || a._id || i.toString();
            const bId = b.id || b._id || j.toString();
            const pairKey = [aId, bId].sort().join('|');
            if (seen.has(pairKey)) continue;

            let bestRule = null;
            let bestScore = 0;

            // 1) Email exact match
            const aEmail = (a.email || '').toLowerCase().trim();
            const bEmail = (b.email || '').toLowerCase().trim();
            if (aEmail && bEmail && aEmail === bEmail) {
                bestRule = 'email';
                bestScore = 100;
            }

            // 2) Phone exact match
            if (!bestRule) {
                const aPhone = (a.phone || '').replace(/\D/g, '');
                const bPhone = (b.phone || '').replace(/\D/g, '');
                if (aPhone && bPhone && aPhone.length >= 8 && aPhone === bPhone) {
                    bestRule = 'phone';
                    bestScore = 95;
                }
            }

            // 3) Domain exact match
            if (!bestRule) {
                const aDomain = domainFromEmail(a.email) || domainFromUrl(a.website);
                const bDomain = domainFromEmail(b.email) || domainFromUrl(b.website);
                if (aDomain && bDomain && aDomain === bDomain) {
                    bestRule = 'domain';
                    bestScore = 85;
                }
            }

            // 4) Company name fuzzy
            if (!bestRule) {
                const aName = (a.company || a.companyName || a.name || '').trim();
                const bName = (b.company || b.companyName || b.name || '').trim();
                if (aName && bName) {
                    const score = diceCoefficient(aName, bName);
                    if (score >= 0.65) {
                        bestRule = 'name';
                        bestScore = Math.round(70 + score * 20); // 70-90
                    }
                }
            }

            if (bestRule && bestScore >= 65) {
                seen.add(pairKey);
                pairs.push({
                    lead_id_a: aId,
                    lead_id_b: bId,
                    lead_a: a,
                    lead_b: b,
                    rule: bestRule,
                    score: bestScore
                });
            }
        }
    }

    return pairs;
}

// ---- Endpoints ----

// POST /api/leads/duplicates/scan
router.post('/api/leads/duplicates/scan', async (req, res) => {
    try {
        const { leads } = req.body || {};
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ ok: false, message: 'No leads provided.' });
        }

        // Clear previous open duplicates
        await dbRun(`DELETE FROM lead_duplicates WHERE status = 'open'`);

        const pairs = findDuplicates(leads);

        // Store in DB
        for (const p of pairs) {
            await dbRun(
                `INSERT INTO lead_duplicates (lead_id_a, lead_id_b, rule, score, status) VALUES (?, ?, ?, ?, 'open')`,
                [p.lead_id_a, p.lead_id_b, p.rule, p.score]
            );
        }

        return res.json({ ok: true, count: pairs.length, pairs });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/leads/duplicates
router.get('/api/leads/duplicates', async (req, res) => {
    try {
        const status = req.query.status || 'open';
        const rows = await dbAll(
            `SELECT * FROM lead_duplicates WHERE status = ? ORDER BY score DESC, created_at DESC LIMIT 200`,
            [status]
        );
        return res.json({ ok: true, duplicates: rows });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/leads/duplicates/merge
router.post('/api/leads/duplicates/merge', async (req, res) => {
    try {
        const { pairId, masterId, mergeId } = req.body || {};
        if (!pairId) {
            return res.status(400).json({ ok: false, message: 'pairId required' });
        }

        // Mark as merged
        await dbRun(`UPDATE lead_duplicates SET status='merged' WHERE id=?`, [pairId]);

        return res.json({ ok: true, masterId, mergeId, message: 'Marked as merged. Frontend will handle data merge.' });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/leads/duplicates/ignore
router.post('/api/leads/duplicates/ignore', async (req, res) => {
    try {
        const { pairId } = req.body || {};
        if (!pairId) {
            return res.status(400).json({ ok: false, message: 'pairId required' });
        }

        await dbRun(`UPDATE lead_duplicates SET status='ignored' WHERE id=?`, [pairId]);

        return res.json({ ok: true, message: 'Pair ignored' });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

module.exports = router;
