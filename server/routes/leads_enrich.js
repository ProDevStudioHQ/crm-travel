// Lead Enrichment Routes — Lead Tools Pack V1
const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet } = require('../db');

// ---- Enrichment Rules Engine ----

// Phone prefix → country
const PHONE_PREFIX_MAP = {
    '+1': 'United States', '+7': 'Russia', '+20': 'Egypt', '+27': 'South Africa',
    '+30': 'Greece', '+31': 'Netherlands', '+32': 'Belgium', '+33': 'France',
    '+34': 'Spain', '+36': 'Hungary', '+39': 'Italy', '+40': 'Romania',
    '+41': 'Switzerland', '+43': 'Austria', '+44': 'United Kingdom', '+45': 'Denmark',
    '+46': 'Sweden', '+47': 'Norway', '+48': 'Poland', '+49': 'Germany',
    '+51': 'Peru', '+52': 'Mexico', '+53': 'Cuba', '+54': 'Argentina',
    '+55': 'Brazil', '+56': 'Chile', '+57': 'Colombia', '+58': 'Venezuela',
    '+60': 'Malaysia', '+61': 'Australia', '+62': 'Indonesia', '+63': 'Philippines',
    '+64': 'New Zealand', '+65': 'Singapore', '+66': 'Thailand',
    '+81': 'Japan', '+82': 'South Korea', '+84': 'Vietnam', '+86': 'China',
    '+90': 'Turkey', '+91': 'India', '+92': 'Pakistan', '+93': 'Afghanistan',
    '+94': 'Sri Lanka', '+95': 'Myanmar',
    '+212': 'Morocco', '+213': 'Algeria', '+216': 'Tunisia', '+218': 'Libya',
    '+220': 'Gambia', '+221': 'Senegal', '+222': 'Mauritania',
    '+233': 'Ghana', '+234': 'Nigeria', '+237': 'Cameroon',
    '+249': 'Sudan', '+250': 'Rwanda', '+251': 'Ethiopia', '+254': 'Kenya',
    '+255': 'Tanzania', '+256': 'Uganda', '+260': 'Zambia',
    '+351': 'Portugal', '+352': 'Luxembourg', '+353': 'Ireland', '+354': 'Iceland',
    '+355': 'Albania', '+356': 'Malta', '+357': 'Cyprus', '+358': 'Finland',
    '+370': 'Lithuania', '+371': 'Latvia', '+372': 'Estonia',
    '+380': 'Ukraine', '+381': 'Serbia', '+385': 'Croatia', '+386': 'Slovenia',
    '+420': 'Czech Republic', '+421': 'Slovakia',
    '+852': 'Hong Kong', '+853': 'Macau', '+855': 'Cambodia', '+856': 'Laos',
    '+880': 'Bangladesh', '+886': 'Taiwan',
    '+960': 'Maldives', '+961': 'Lebanon', '+962': 'Jordan', '+963': 'Syria',
    '+964': 'Iraq', '+965': 'Kuwait', '+966': 'Saudi Arabia', '+967': 'Yemen',
    '+968': 'Oman', '+970': 'Palestine', '+971': 'UAE', '+972': 'Israel',
    '+973': 'Bahrain', '+974': 'Qatar', '+975': 'Bhutan',
    '+992': 'Tajikistan', '+993': 'Turkmenistan', '+994': 'Azerbaijan',
    '+995': 'Georgia', '+996': 'Kyrgyzstan', '+998': 'Uzbekistan'
};

// TLD → country
const TLD_COUNTRY_MAP = {
    '.fr': 'France', '.es': 'Spain', '.de': 'Germany', '.uk': 'United Kingdom',
    '.co.uk': 'United Kingdom', '.it': 'Italy', '.pt': 'Portugal', '.nl': 'Netherlands',
    '.be': 'Belgium', '.ch': 'Switzerland', '.at': 'Austria', '.se': 'Sweden',
    '.no': 'Norway', '.dk': 'Denmark', '.fi': 'Finland', '.pl': 'Poland',
    '.cz': 'Czech Republic', '.sk': 'Slovakia', '.hu': 'Hungary', '.ro': 'Romania',
    '.bg': 'Bulgaria', '.hr': 'Croatia', '.gr': 'Greece', '.tr': 'Turkey',
    '.ru': 'Russia', '.ua': 'Ukraine', '.ma': 'Morocco', '.tn': 'Tunisia',
    '.dz': 'Algeria', '.eg': 'Egypt', '.za': 'South Africa', '.ke': 'Kenya',
    '.ng': 'Nigeria', '.br': 'Brazil', '.mx': 'Mexico', '.ar': 'Argentina',
    '.co': 'Colombia', '.cl': 'Chile', '.pe': 'Peru', '.au': 'Australia',
    '.nz': 'New Zealand', '.jp': 'Japan', '.cn': 'China', '.kr': 'South Korea',
    '.in': 'India', '.th': 'Thailand', '.sg': 'Singapore', '.my': 'Malaysia',
    '.id': 'Indonesia', '.ph': 'Philippines', '.vn': 'Vietnam',
    '.ae': 'UAE', '.sa': 'Saudi Arabia', '.qa': 'Qatar', '.kw': 'Kuwait',
    '.om': 'Oman', '.bh': 'Bahrain', '.jo': 'Jordan', '.lb': 'Lebanon',
    '.ca': 'Canada', '.us': 'United States', '.ie': 'Ireland', '.is': 'Iceland'
};

// Lead type keywords
const LEAD_TYPE_KEYWORDS = {
    'Tour Operator': ['tour operator', 'tours', 'voyagiste', 'operador turístico', 'reiseveranstalter'],
    'Travel Agency': ['travel agency', 'agence de voyage', 'agencia de viajes', 'reisebüro', 'travel agent'],
    'DMC': ['dmc', 'destination management', 'receptive', 'incoming', 'ground handler'],
    'Hotel': ['hotel', 'hôtel', 'resort', 'lodge', 'accommodation', 'hébergement'],
    'Riad': ['riad', 'riyad', 'dar', 'maison d\'hôte', 'guesthouse'],
    'OTA': ['online travel', 'ota', 'booking platform', 'travel marketplace']
};

function normalizeWebsite(url) {
    if (!url) return '';
    url = url.trim().toLowerCase();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    // Remove trailing slash
    return url.replace(/\/+$/, '');
}

function normalizePhone(phone) {
    if (!phone) return '';
    // Remove all non-digit and non-plus chars, keep leading +
    let cleaned = phone.trim();
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/[^\d]/g, '');
    return (hasPlus ? '+' : '') + cleaned;
}

function guessCountryFromPhone(phone) {
    if (!phone || !phone.startsWith('+')) return null;
    // Try longest prefix first (3-digit, 2-digit, 1-digit)
    for (let len = 4; len >= 2; len--) {
        const prefix = phone.substring(0, len);
        if (PHONE_PREFIX_MAP[prefix]) return PHONE_PREFIX_MAP[prefix];
    }
    return null;
}

function guessCountryFromDomain(website) {
    if (!website) return null;
    try {
        const hostname = new URL(website).hostname;
        // Check longer TLDs first (e.g. .co.uk before .uk)
        const sorted = Object.keys(TLD_COUNTRY_MAP).sort((a, b) => b.length - a.length);
        for (const tld of sorted) {
            if (hostname.endsWith(tld)) return TLD_COUNTRY_MAP[tld];
        }
    } catch (e) { /* invalid URL */ }
    return null;
}

function detectLeadType(text) {
    if (!text) return 'Other';
    const lower = text.toLowerCase();
    for (const [type, keywords] of Object.entries(LEAD_TYPE_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw)) return type;
        }
    }
    return 'Other';
}

function extractEmails(html) {
    if (!html) return [];
    const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const found = html.match(re) || [];
    // Dedupe and filter common false positives
    const unique = [...new Set(found.map(e => e.toLowerCase()))];
    return unique.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif'));
}

function extractPhones(html) {
    if (!html) return [];
    const re = /(?:\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g;
    const found = html.match(re) || [];
    return [...new Set(found.map(p => p.trim()).filter(p => p.replace(/\D/g, '').length >= 8))];
}

function extractSocials(html) {
    const socials = {};
    const patterns = {
        facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._\-]+/gi,
        instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._\-]+/gi,
        linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._\-]+/gi,
        twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9._\-]+/gi
    };
    for (const [name, re] of Object.entries(patterns)) {
        const match = html.match(re);
        if (match && match.length > 0) socials[name] = match[0];
    }
    return socials;
}

// Best-effort website fetch (server-side)
async function fetchWebsite(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelCRM/1.0)' }
        });
        clearTimeout(timeout);
        if (!resp.ok) return null;
        const text = await resp.text();
        // Limit to first 200KB to avoid memory issues
        return text.substring(0, 200000);
    } catch (e) {
        return null;
    }
}

// Enrich a single lead object
async function enrichLead(lead) {
    const changes = {};
    const original = { ...lead };

    // 1) Normalize website
    if (lead.website) {
        const norm = normalizeWebsite(lead.website);
        if (norm !== lead.website) {
            changes.website = { from: lead.website, to: norm };
            lead.website = norm;
        }
    }

    // 2) Normalize phone
    if (lead.phone) {
        const norm = normalizePhone(lead.phone);
        if (norm !== lead.phone) {
            changes.phone = { from: lead.phone, to: norm };
            lead.phone = norm;
        }
    }

    // 3) Country guess
    if (!lead.country) {
        const fromPhone = guessCountryFromPhone(lead.phone);
        const fromDomain = guessCountryFromDomain(lead.website);
        const country = fromPhone || fromDomain;
        if (country) {
            changes.country = { from: '', to: country };
            lead.country = country;
        }
    }

    // 4) Website scraping (best effort)
    let pageText = '';
    if (lead.website) {
        const html = await fetchWebsite(lead.website);
        if (html) {
            pageText = html;
            // Extract emails if lead has none
            if (!lead.email) {
                const emails = extractEmails(html);
                if (emails.length > 0) {
                    changes.email = { from: '', to: emails[0] };
                    lead.email = emails[0];
                }
            }
            // Extract phones if lead has none
            if (!lead.phone) {
                const phones = extractPhones(html);
                if (phones.length > 0) {
                    changes.phone_extracted = { from: '', to: phones[0] };
                    lead.phone = phones[0];
                }
            }
            // Extract social links
            const socials = extractSocials(html);
            if (Object.keys(socials).length > 0) {
                changes.socials = { from: null, to: socials };
                lead.socials = socials;
            }
        }
    }

    // 5) Lead type detection
    const typeSource = pageText || `${lead.company || ''} ${lead.name || ''} ${lead.notes || ''}`;
    const detectedType = detectLeadType(typeSource);
    if (detectedType !== 'Other' && !lead.leadType) {
        changes.leadType = { from: lead.leadType || '', to: detectedType };
        lead.leadType = detectedType;
    }

    return { lead, changes, hasChanges: Object.keys(changes).length > 0 };
}

// ---- In-memory job tracking for stop support ----
const activeJobs = new Map(); // jobId → { stopped: false }

// ---- Endpoints ----

// POST /api/leads/enrich/start
router.post('/api/leads/enrich/start', async (req, res) => {
    try {
        const { leads, mode } = req.body || {};
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ ok: false, message: 'No leads provided.' });
        }

        // Create job
        const { lastID: jobId } = await dbRun(
            `INSERT INTO enrichment_jobs (status, total, mode) VALUES ('running', ?, ?)`,
            [leads.length, mode || 'selected']
        );

        // Track job in memory
        activeJobs.set(jobId, { stopped: false });

        // Process asynchronously
        (async () => {
            let processed = 0;
            let errors = 0;

            for (const lead of leads) {
                // Check if stopped
                const job = activeJobs.get(jobId);
                if (!job || job.stopped) {
                    await dbRun(`UPDATE enrichment_jobs SET status='stopped', processed=?, errors=? WHERE id=?`,
                        [processed, errors, jobId]);
                    activeJobs.delete(jobId);
                    return;
                }

                try {
                    const result = await enrichLead({ ...lead });
                    await dbRun(
                        `INSERT INTO enrichment_results (job_id, lead_id, status, changes_json) VALUES (?, ?, 'done', ?)`,
                        [jobId, lead.id || lead._id || '', JSON.stringify(result.changes)]
                    );
                    processed++;
                } catch (e) {
                    await dbRun(
                        `INSERT INTO enrichment_results (job_id, lead_id, status, error) VALUES (?, ?, 'failed', ?)`,
                        [jobId, lead.id || lead._id || '', e.message]
                    );
                    errors++;
                    processed++;
                }

                // Update progress
                await dbRun(`UPDATE enrichment_jobs SET processed=?, errors=? WHERE id=?`,
                    [processed, errors, jobId]);
            }

            // Mark done
            await dbRun(`UPDATE enrichment_jobs SET status='done', processed=?, errors=? WHERE id=?`,
                [processed, errors, jobId]);
            activeJobs.delete(jobId);
        })();

        return res.json({ ok: true, jobId });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/leads/enrich/jobs
router.get('/api/leads/enrich/jobs', async (req, res) => {
    try {
        const jobs = await dbAll('SELECT * FROM enrichment_jobs ORDER BY created_at DESC LIMIT 50');
        return res.json({ ok: true, jobs });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// GET /api/leads/enrich/jobs/:id
router.get('/api/leads/enrich/jobs/:id', async (req, res) => {
    try {
        const job = await dbGet('SELECT * FROM enrichment_jobs WHERE id = ?', [req.params.id]);
        if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
        const results = await dbAll('SELECT * FROM enrichment_results WHERE job_id = ?', [req.params.id]);
        return res.json({ ok: true, job, results });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// POST /api/leads/enrich/jobs/:id/stop
router.post('/api/leads/enrich/jobs/:id/stop', async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const mem = activeJobs.get(jobId);
        if (mem) {
            mem.stopped = true;
            return res.json({ ok: true, message: 'Stop signal sent' });
        }
        // If not in memory, try to mark in DB
        await dbRun(`UPDATE enrichment_jobs SET status='stopped' WHERE id=? AND status='running'`, [jobId]);
        return res.json({ ok: true, message: 'Job stopped' });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

module.exports = router;
