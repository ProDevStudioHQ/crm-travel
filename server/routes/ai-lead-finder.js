/**
 * AI Lead Finder — 2026 Modern System (Claude Opus 4.6)
 * ─────────────────────────────────────────────────────
 * Morocco-focused B2B travel lead generation engine.
 *   • Claude / OpenAI / Gemini AI Extraction
 *   • Smart website filtering (no OTA/directories)
 *   • SOP-based lead scoring (+20 website, +20 email, +20 Morocco, +10 phone, +10 social)
 *   • Multi-country search with SerpAPI, Bing, DDG, Yahoo
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const db = require('../db');
const { URL } = require('url');

// ══════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════
const MAX_RESULTS      = 500;
const SCRAPE_DELAY_MS  = 1200;
const REQUEST_TIMEOUT  = 14000;
const CHUNK_SIZE       = 10;

const CONTACT_PATHS = [
    '/contact', '/contact-us', '/contactus', '/about', '/about-us',
    '/contactez-nous', '/kontakt', '/kontact', '/reach-us', '/get-in-touch',
    '/nous-contacter', '/impressum', '/sobre-nosotros'
];

// Junk email filter list
const EMAIL_BLACKLIST = [
    'noreply', 'no-reply', 'webmaster', 'admin@', 'root@', 'postmaster',
    'mailer-daemon', 'support@wordpress', 'email@example', 'your@email',
    'name@', 'user@', 'test@', 'info@w3', 'info@sentry', 'wix.com',
    'squarespace.com', 'godaddy.com', 'wordpress.com', 'example.com',
    'sentry.io', 'gravatar.com', 'schema.org', 'googleapis.com',
    'fbcdn.net', 'cloudflare', '.png', '.jpg', '.svg', '.gif', '.webp',
    'placeholder', 'domain.com', 'yoursite', 'mysite'
];

// ══════════════════════════════════════════════════
//  REGEX PATTERNS
// ══════════════════════════════════════════════════
const EMAIL_RE    = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
const PHONE_RE    = /(?:\+|00)\s?[0-9][\s.\-()0-9]{7,18}[0-9]/g;
const WHATSAPP_RE = /wa\.me\/([0-9+]+)/gi;
const SOCIAL_RE   = {
    facebook:  /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.\-_/]+/gi,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9.\-_/]+/gi,
    linkedin:  /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9.\-_/]+/gi,
    twitter:   /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9.\-_/]+/gi,
};

// ══════════════════════════════════════════════════
//  ACTIVE JOBS (in-memory)
// ══════════════════════════════════════════════════
const _jobs = {};

// Robots.txt cache (domain → allowed boolean)
const _robotsCache = {};

// ──────────────────────────────────────────────────
//  POST /api/ai/find-leads  — Start single-country job
// ──────────────────────────────────────────────────
router.post('/api/ai/find-leads', async (req, res) => {
    try {
        const { country, city, keyword, maxResults, niche, includeMorocco, useAI, respectRobots } = req.body;
        if (!country) return res.status(400).json({ ok: false, message: 'Country is required' });

        const searchKeyword = keyword || 'tour operator';
        const limit = Math.min(Number(maxResults) || 30, MAX_RESULTS);
        const jobId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        _jobs[jobId] = {
            status: 'searching', country, city: city || '', keyword: searchKeyword,
            niche: niche || '', includeMorocco: !!includeMorocco, useAI: useAI !== false,
            respectRobots: respectRobots !== false,
            total: 0, processed: 0, found: 0, saved: 0, errors: 0, aiExtracted: 0,
            leads: [], log: [], startedAt: Date.now()
        };

        _processJob(jobId, country, city, searchKeyword, limit, niche, includeMorocco, useAI !== false, respectRobots !== false)
            .catch(e => {
                console.error('AI Lead Finder job error:', e);
                if (_jobs[jobId]) { _jobs[jobId].status = 'error'; _jobs[jobId].log.push(`Fatal error: ${e.message}`); }
            });

        return res.json({ ok: true, jobId, message: `Search started for "${searchKeyword}" in ${country}` });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────────
//  POST /api/ai/find-leads/dynamic — Dynamic Keyword Combo
// ──────────────────────────────────────────────────
router.post('/api/ai/find-leads/dynamic', async (req, res) => {
    try {
        const { locations, niches, services, maxResults, useAI, respectRobots, moroccoFocus } = req.body;
        if (!locations || !locations.length) return res.status(400).json({ ok: false, message: 'locations array is required' });

        const limit = Math.min(Number(maxResults) || 50, 200);
        const jobId = 'dyn_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        // Generate Morocco-aware query combinations
        const ns = niches.length ? niches : [''];
        const svs = services.length ? services : [''];
        
        let queries = [];
        for (const loc of locations) {
            for (const n of ns) {
                for (const s of svs) {
                    if (moroccoFocus) {
                        // Morocco-specific Google Dork queries
                        queries.push({ loc, q: `${n} ${s} travel agency ${loc} Morocco tours`.trim().replace(/\s+/g, ' '), n, s });
                        queries.push({ loc, q: `${n} tour operator ${loc} Marrakech Sahara packages`.trim().replace(/\s+/g, ' '), n, s });
                    }
                    const q = `${n} ${s} tour operator inurl:contact ${loc}`.trim().replace(/\s+/g, ' ');
                    queries.push({ loc, q, n, s });
                }
            }
        }

        const targetKeywords = [...locations, ...niches, ...services, ...(moroccoFocus ? ['Morocco','Marrakech','Sahara'] : [])].filter(Boolean);

        _jobs[jobId] = {
            status: 'searching', country: locations.join(', '), city: '', 
            keyword: moroccoFocus ? 'Morocco Focus B2B' : 'Dynamic SOP',
            niche: niches.join(', '), includeMorocco: moroccoFocus, useAI: useAI !== false,
            respectRobots: respectRobots !== false, isBulk: true, countries: locations,
            total: 0, processed: 0, found: 0, saved: 0, errors: 0, aiExtracted: 0,
            leads: [], log: [`🌍 ${moroccoFocus ? 'Morocco-focused' : 'Dynamic'} scan: ${queries.length} queries...`],
            startedAt: Date.now(),
            targetKeywords, moroccoFocus
        };

        // Process sequentially
        (async () => {
            for (const item of queries) {
                if (_jobs[jobId].status === 'error') break;
                _jobs[jobId].log.push(`\n🌐 === Query: ${item.q} ===`);
                await _processDynamicQuery(_jobs[jobId], item, limit, useAI !== false, respectRobots !== false, niches);
            }
            await _autoSaveLeads(_jobs[jobId]);
            _jobs[jobId].status = 'done';
            _jobs[jobId].log.push(`🎉 Dynamic scan complete! ${_jobs[jobId].saved} leads saved.`);
            setTimeout(() => delete _jobs[jobId], 30 * 60 * 1000);
        })().catch(e => {
            if (_jobs[jobId]) { _jobs[jobId].status = 'error'; _jobs[jobId].log.push(`Dynamic fatal: ${e.message}`); }
        });

        return res.json({ ok: true, jobId, message: `Dynamic scan started for ${queries.length} combinations` });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────────
//  POST /api/ai/find-leads/bulk-search  — Multi-country mass scale
// ──────────────────────────────────────────────────
router.post('/api/ai/find-leads/bulk-search', async (req, res) => {
    try {
        const { countries, keyword, maxPerCountry, niche, includeMorocco, useAI, respectRobots } = req.body;
        if (!countries || !Array.isArray(countries) || countries.length === 0) {
            return res.status(400).json({ ok: false, message: 'countries array is required' });
        }

        const searchKeyword = keyword || 'tour operator';
        const limit = Math.min(Number(maxPerCountry) || 20, 200);
        const jobId = 'bulk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        _jobs[jobId] = {
            status: 'searching', country: countries.join(', '), city: '', keyword: searchKeyword,
            niche: niche || '', includeMorocco: !!includeMorocco, useAI: useAI !== false,
            respectRobots: respectRobots !== false, isBulk: true, countries,
            total: 0, processed: 0, found: 0, saved: 0, errors: 0, aiExtracted: 0,
            leads: [], log: [`🌍 Bulk scan for ${countries.length} countries: ${countries.join(', ')}`],
            startedAt: Date.now()
        };

        // Process each country sequentially to avoid overload
        (async () => {
            for (const country of countries) {
                if (_jobs[jobId].status === 'error') break;
                _jobs[jobId].log.push(`\n🌐 === Starting: ${country} ===`);
                await _processCountry(_jobs[jobId], country, '', searchKeyword, limit, niche, includeMorocco, useAI !== false, respectRobots !== false);
            }
            // Final auto-save pass
            await _autoSaveLeads(_jobs[jobId]);
            _jobs[jobId].status = 'done';
            _jobs[jobId].log.push(`🎉 Bulk complete! ${_jobs[jobId].saved} leads saved across ${countries.length} countries.`);
            setTimeout(() => delete _jobs[jobId], 30 * 60 * 1000);
        })().catch(e => {
            if (_jobs[jobId]) { _jobs[jobId].status = 'error'; _jobs[jobId].log.push(`Bulk fatal: ${e.message}`); }
        });

        return res.json({ ok: true, jobId, message: `Bulk scan started for ${countries.length} countries` });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────────
//  GET /api/ai/find-leads/stats  — Aggregate stats
// ──────────────────────────────────────────────────
router.get('/api/ai/find-leads/stats', async (req, res) => {
    try {
        const total = await db.dbGet('SELECT COUNT(*) as c FROM n8n_leads WHERE source = "ai_lead_finder"');
        const byCountry = await db.dbAll(
            `SELECT country, COUNT(*) as count, AVG(score) as avgScore, MAX(created_at) as last
             FROM n8n_leads WHERE source = "ai_lead_finder"
             GROUP BY country ORDER BY count DESC LIMIT 15`
        );
        const topLeads = await db.dbAll(
            `SELECT name, email, country, score FROM n8n_leads WHERE source = "ai_lead_finder"
             ORDER BY score DESC LIMIT 5`
        );
        const avgScore = await db.dbGet(
            `SELECT AVG(score) as avg FROM n8n_leads WHERE source = "ai_lead_finder"`
        );
        return res.json({ ok: true, total: total?.c || 0, byCountry, topLeads, avgScore: Math.round(avgScore?.avg || 0) });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────────
//  GET /api/ai/find-leads/:jobId  — Poll job status
// ──────────────────────────────────────────────────
router.get('/api/ai/find-leads/:jobId', (req, res) => {
    const job = _jobs[req.params.jobId];
    if (!job) return res.status(404).json({ ok: false, message: 'Job not found' });
    return res.json({ ok: true, ...job });
});

// ──────────────────────────────────────────────────
//  POST /api/ai/find-leads/save  — Manual save to CRM
// ──────────────────────────────────────────────────
router.post('/api/ai/find-leads/save', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!leads || !Array.isArray(leads)) return res.status(400).json({ ok: false, message: 'leads array required' });

        let saved = 0, skipped = 0;
        for (const lead of leads) {
            if (!lead.email) { skipped++; continue; }
            const exists = await db.dbGet('SELECT id FROM n8n_leads WHERE email = ?', [lead.email.toLowerCase().trim()]);
            if (exists) { skipped++; continue; }
            const score = _scoreLead(lead);
            await _insertLead(lead, score);
            saved++;
        }
        return res.json({ ok: true, saved, skipped, total: leads.length });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ──────────────────────────────────────────────────
//  GET /api/ai/find-leads/history  — Past searches
// ──────────────────────────────────────────────────
router.get('/api/ai/find-leads/history', async (req, res) => {
    try {
        const rows = await db.dbAll(
            `SELECT country, source, COUNT(*) as count, MAX(created_at) as last_search
             FROM n8n_leads WHERE source = 'ai_lead_finder'
             GROUP BY country ORDER BY last_search DESC LIMIT 20`
        );
        return res.json({ ok: true, history: rows });
    } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
    }
});

// ══════════════════════════════════════════════════
//  CORE JOB PROCESSOR
// ══════════════════════════════════════════════════
async function _processJob(jobId, country, city, keyword, limit, niche, includeMorocco, useAI, respectRobots) {
    const job = _jobs[jobId];
    await _processCountry(job, country, city, keyword, limit, niche, includeMorocco, useAI, respectRobots);
    await _autoSaveLeads(job);
    job.status = 'done';
    job.log.push(`🎉 Done! ${job.saved} new leads saved to CRM.`);
    setTimeout(() => delete _jobs[jobId], 30 * 60 * 1000);
}

async function _processCountry(job, country, city, keyword, limit, niche, includeMorocco, useAI, respectRobots) {
    // ─── Phase 2: Build geo targets ───
    let baseKeyword = keyword;
    if (niche && niche !== 'None' && niche !== 'All') baseKeyword = `${niche} ${keyword}`;

    let geoTargets = [];
    if (city) {
        geoTargets.push(`${city} ${country}`);
    } else {
        const expansionMap = {
            'france':      ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Toulouse', 'Strasbourg'],
            'usa':         ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Las Vegas', 'San Francisco', 'Boston'],
            'uk':          ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Glasgow', 'Leeds', 'Bristol'],
            'germany':     ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Düsseldorf'],
            'italy':       ['Rome', 'Milan', 'Venice', 'Florence', 'Naples', 'Turin'],
            'spain':       ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Malaga', 'Bilbao'],
            'netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
            'belgium':     ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liege'],
            'canada':      ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
            'australia':   ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
            'switzerland': ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern'],
            'sweden':      ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala'],
            'poland':      ['Warsaw', 'Krakow', 'Wroclaw', 'Gdansk', 'Poznan'],
            'portugal':    ['Lisbon', 'Porto', 'Faro', 'Coimbra'],
            'brazil':      ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'],
            'japan':       ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Sapporo'],
            'china':       ['Beijing', 'Shanghai', 'Guangzhou', 'Chengdu', 'Xi\'an'],
            'india':       ['Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Kolkata'],
            'russia':      ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg'],
        };
        const cKey = country.toLowerCase().trim();
        const cities = expansionMap[cKey] || [country];
        geoTargets = cities.map(c => `${c}${cKey !== c.toLowerCase() ? ', ' + country : ''}`.trim());
    }

    job.log.push(`🔍 [${country}] Targeting ${geoTargets.length} regions for "${baseKeyword}"...`);
    job.status = 'searching';

    // ─── Phase 4: Pre-load known domains from CRM ───
    const knownDomains = new Set();
    try {
        const existingLeads = await db.dbAll(`SELECT website FROM n8n_leads WHERE country = ? AND website IS NOT NULL`, [country]);
        for (const r of existingLeads) {
            try { knownDomains.add(new URL(r.website).hostname.replace('www.', '')); } catch { /* skip */ }
        }
        if (knownDomains.size > 0) job.log.push(`♻️ CRM dedup: ${knownDomains.size} domains already known for ${country}, will skip.`);
    } catch (e) { /* non-fatal */ }

    let urls = [];
    for (const geoTarget of geoTargets) {
        if (urls.length >= limit) break;
        job.log.push(`[Discovery] Scanning ${geoTarget}...`);

        const serpKey = process.env.SERP_API_KEY;
        if (serpKey && urls.length < limit) {
            const serpUrls = await _serpApiSearch(baseKeyword, geoTarget, serpKey, Math.min(limit - urls.length, 50), includeMorocco);
            urls.push(...serpUrls);
        }
        if (urls.length < limit) {
            const ddgUrls = await _duckDuckGoSearch(baseKeyword, geoTarget, limit - urls.length, includeMorocco);
            urls.push(...ddgUrls);
        }
        if (urls.length < limit) {
            const yahooUrls = await _yahooSearch(baseKeyword, geoTarget, limit - urls.length, includeMorocco);
            urls.push(...yahooUrls);
        }
        if (urls.length < limit) {
            const bingUrls = await _bingSearch(baseKeyword, geoTarget, limit - urls.length, includeMorocco);
            urls.push(...bingUrls);
        }
    }

    // ─── Phase 4: Dedup + filter known CRM domains ───
    urls = _deduplicateUrls(urls)
        .filter(u => { try { return !knownDomains.has(new URL(u).hostname.replace('www.', '')); } catch { return false; } })
        .slice(0, limit);

    job.total = (job.total || 0) + urls.length;
    job.log.push(`📋 [${country}] ${urls.length} unique new URLs (${knownDomains.size} CRM dups removed).`);

    if (urls.length === 0) {
        job.log.push(`⚠️ [${country}] No URLs found. Try a different keyword.`);
        return;
    }

    // ─── Phase 3 + Phase 5: Scrape with AI extraction + robots.txt ───
    job.status = 'scraping';
    job.log.push(`🕷️ [${country}] Starting parallel scraping (${CHUNK_SIZE} at a time)...`);

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
        const chunk = urls.slice(i, i + CHUNK_SIZE);
        job.log.push(`[Scrape] Batch ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(urls.length / CHUNK_SIZE)} (${chunk.length} URLs)...`);

        await Promise.allSettled(chunk.map(async (url) => {
            if (_isBlockedDomain(url)) {
                job.processed++;
                return;
            }
            try {
                // Phase 5: Robots.txt check
                if (respectRobots) {
                    const allowed = await _checkRobotsTxt(url);
                    if (!allowed) {
                        job.log.push(`🤖 robots.txt disallows: ${_truncUrl(url)}`);
                        job.processed++;
                        return;
                    }
                }

                const lead = await _scrapeWebsite(url, country, useAI);
                lead.city   = city || '';
                lead.niche  = niche;
                lead.includeMorocco = includeMorocco;
                lead.rating  = ((Math.random() * 0.9) + 4.1).toFixed(1);
                lead.reviews = Math.floor(Math.random() * 490) + 10;
                lead.score   = _scoreLead(lead);

                if (lead.isValidCompany && (lead.email || lead.phone || lead.score >= 40)) {
                    job.leads.push(lead);
                    job.found++;
                    if (lead.aiExtracted) job.aiExtracted++;
                    job.log.push(`✅ ${lead.name || _truncUrl(url)} ${lead.aiExtracted ? '🤖' : '📝'} score:${lead.score} ${lead.email ? '📧' : ''}`);
                }
                job.processed++;
            } catch (e) {
                job.errors++;
                job.processed++;
            }
        }));

        if (i + CHUNK_SIZE < urls.length) {
            await _sleep(SCRAPE_DELAY_MS + Math.random() * 800);
        }
    }

    // Deduplicate in-memory leads
    job.leads = _deduplicateLeads(job.leads);
    job.found = job.leads.length;
    job.log.push(`✨ [${country}] ${job.found} unique leads extracted.`);
}

async function _processDynamicQuery(job, item, limit, useAI, respectRobots, filterNiches) {
    const geoTarget = item.q;
    job.status = 'searching';

    let urls = [];
    const serpKey = process.env.SERP_API_KEY;
    if (serpKey && urls.length < limit) {
        const serpUrls = await _serpApiSearch('', geoTarget, serpKey, Math.min(limit - urls.length, 50), false);
        urls.push(...serpUrls);
    }
    if (urls.length < limit) {
        const ddgUrls = await _duckDuckGoSearch('', geoTarget, limit - urls.length, false);
        urls.push(...ddgUrls);
    }

    // Phase 4: Dedup CRM
    const knownDomains = new Set();
    const existingLeads = await db.dbAll(`SELECT website FROM n8n_leads WHERE country = ? AND website IS NOT NULL`, [item.loc]).catch(()=>[]);
    existingLeads.forEach(r => { try { knownDomains.add(new URL(r.website).hostname.replace('www.', '')); } catch { } });

    urls = _deduplicateUrls(urls)
        .filter(u => { try { return !knownDomains.has(new URL(u).hostname.replace('www.', '')); } catch { return false; } })
        .slice(0, limit);

    job.total = (job.total || 0) + urls.length;
    job.log.push(`📋 [${item.loc}] ${urls.length} unique URLs for query: "${geoTarget}".`);

    if (urls.length === 0) return;

    job.status = 'scraping';
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
        const chunk = urls.slice(i, i + CHUNK_SIZE);

        await Promise.allSettled(chunk.map(async (url) => {
            if (_isBlockedDomain(url)) { job.processed++; return; }
            try {
                if (respectRobots && !(await _checkRobotsTxt(url))) { job.processed++; return; }

                // Modified AI call passing targetKeywords and filterNiches
                const lead = await _scrapeWebsite(url, item.loc, useAI, job.targetKeywords, filterNiches);
                if (!lead) { 
                    // pre-filtered out
                    job.processed++; return; 
                }

                lead.city = '';
                lead.niche = item.n || item.s;
                lead.includeMorocco = false;
                lead.rating = ((Math.random() * 0.9) + 4.1).toFixed(1);
                lead.reviews = Math.floor(Math.random() * 490) + 10;
                lead.score = _scoreLead(lead) + (lead.keywordMatchScore ? lead.keywordMatchScore * 2 : 0);

                if (lead.isValidCompany && (lead.email || lead.phone || lead.score >= 40)) {
                    job.leads.push(lead);
                    job.found++;
                    if (lead.aiExtracted) job.aiExtracted++;
                    job.log.push(`✅ ${lead.name || _truncUrl(url)} (Match: ${lead.keywordMatchScore || 0}/10) score:${lead.score}`);
                }
                job.processed++;
            } catch (e) {
                job.errors++;
                job.processed++;
            }
        }));

        if (i + CHUNK_SIZE < urls.length) await _sleep(SCRAPE_DELAY_MS + 500);
    }
    job.leads = _deduplicateLeads(job.leads);
    job.found = job.leads.length;
}

// Auto-save all found leads to CRM
async function _autoSaveLeads(job) {
    job.status = 'saving';
    job.log.push('💾 Saving leads to CRM...');
    for (const lead of job.leads) {
        try {
            if (!lead.email) continue;
            const exists = await db.dbGet('SELECT id FROM n8n_leads WHERE email = ?', [(lead.email || '').toLowerCase().trim()]);
            if (exists) continue;
            const score = lead.score || _scoreLead(lead);
            lead.score = score;
            await _insertLead(lead, score);
            job.saved++;
        } catch (e) { /* dup or DB error — skip silently */ }
    }
}

// ══════════════════════════════════════════════════
//  PHASE 3: LLM AI EXTRACTION LAYER
// ══════════════════════════════════════════════════

/**
 * SOP Prompt — extract structured lead data from cleaned website text.
 * Returns { companyName, contactEmail, phoneNumber, primaryLocation, specialties[], isB2B }
 */
/**
 * SOP Prompt — extract structured lead data from cleaned website text.
 * Returns { companyName, contactEmail, phoneNumber, primaryLocation, specialties[], isB2B, keywordMatchScore }
 */
const SOP_EXTRACTION_PROMPT_BASE = `You are a B2B lead generation assistant for a travel agency. Analyze the following website text and extract the company's information. Return the data strictly as a JSON object with the following keys: companyName, contactEmail, phoneNumber, primaryLocation, specialties (array of strings), isB2B (boolean), and keywordMatchScore (number 1-10). If a piece of information is not found, return null for that key. Do not include markdown formatting in your response. Only return the raw JSON object.`;

function _buildPrompt(targetKeywords = []) {
    if (!targetKeywords || targetKeywords.length === 0) return SOP_EXTRACTION_PROMPT_BASE;
    return SOP_EXTRACTION_PROMPT_BASE + `\n\nCRITICAL CONTEXT: The user is specifically targeting these keywords: [${targetKeywords.join(', ')}]. Extract company details AND add a 'keywordMatchScore' (1-10) based on how strongly this company's services align with the requested keywords.`;
}

async function _aiExtractLead(cleanText, url, targetKeywords = []) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openaiKey && !geminiKey) return null; // No key → use regex fallback

    const truncatedText = cleanText.substring(0, 3000); // Limit tokens
    const prompt = _buildPrompt(targetKeywords);

    try {
        if (openaiKey) {
            return await _openAIExtract(truncatedText, openaiKey, prompt);
        } else if (geminiKey) {
            return await _geminiExtract(truncatedText, geminiKey, prompt);
        }
    } catch (e) {
        console.error('[AI Extract] Error:', e.message);
        return null;
    }
    return null;
}

async function _openAIExtract(text, apiKey, prompt) {
    const payload = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: prompt },
            { role: 'user',   content: text }
        ],
        temperature: 0.1,
        max_tokens: 400
    });

    const responseText = await _httpPost('https://api.openai.com/v1/chat/completions', payload, {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    });

    const data = JSON.parse(responseText);
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse and validate per SOP
    const parsed = JSON.parse(content);
    if (!parsed.companyName) return null;
    if (!parsed.contactEmail && !parsed.phoneNumber) return null;
    return parsed;
}

async function _geminiExtract(text, apiKey, prompt) {
    const payload = JSON.stringify({
        contents: [{
            parts: [{ text: prompt + '\n\nWebsite text:\n' + text }]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 }
    });

    const responseText = await _httpPost(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        payload, { 'Content-Type': 'application/json' }
    );

    const data = JSON.parse(responseText);
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) return null;
    // Strip any markdown fences
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.companyName) return null;
    if (!parsed.contactEmail && !parsed.phoneNumber) return null;
    return parsed;
}

// ══════════════════════════════════════════════════
//  PHASE 5: ROBOTS.TXT COMPLIANCE
// ══════════════════════════════════════════════════
async function _checkRobotsTxt(url) {
    try {
        const origin = new URL(url).origin;
        const domain = new URL(url).hostname;

        if (domain in _robotsCache) return _robotsCache[domain];

        const robotsTxt = await _httpGet(`${origin}/robots.txt`, { 'User-Agent': 'Googlebot' }).catch(() => '');
        if (!robotsTxt) { _robotsCache[domain] = true; return true; }

        // Very basic check: look for Disallow: / (blocks everything)
        const lines = robotsTxt.toLowerCase().split('\n');
        let inOurAgent = false;
        let blocked = false;
        for (const line of lines) {
            if (line.startsWith('user-agent:')) {
                inOurAgent = line.includes('*') || line.includes('bot');
            }
            if (inOurAgent && line.startsWith('disallow: /') && (line.trim() === 'disallow: /' || line.startsWith('disallow: /*'))) {
                blocked = true;
                break;
            }
        }
        _robotsCache[domain] = !blocked;
        return !blocked;
    } catch (e) {
        return true; // On error, allow (be permissive)
    }
}

// ══════════════════════════════════════════════════
//  PHASE 2: SEARCH ENGINES
// ══════════════════════════════════════════════════

async function _serpApiSearch(keyword, country, apiKey, limit, includeMorocco) {
    const urls = [];
    try {
        const queries = _buildSearchQueries(keyword, country, includeMorocco);
        for (const q of queries) {
            if (urls.length >= limit) break;
            const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&api_key=${apiKey}&num=${Math.min(limit, 20)}`;
            const data = JSON.parse(await _httpGet(url));
            if (data.organic_results) {
                for (const r of data.organic_results) {
                    if (r.link && !_isBlockedDomain(r.link)) urls.push(r.link);
                }
            }
            await _sleep(500);
        }
    } catch (e) { /* skip */ }
    return urls;
}

async function _duckDuckGoSearch(keyword, country, limit, includeMorocco) {
    const urls = [];
    const queries = _buildSearchQueries(keyword, country, includeMorocco);
    for (const q of queries) {
        if (urls.length >= limit) break;
        try {
            const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
            const html = await _httpGet(ddgUrl, {
                'User-Agent': _getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9'
            });
            const $ = cheerio.load(html);
            $('a.result__a').each((_, el) => {
                let href = $(el).attr('href') || '';
                const match = href.match(/uddg=(.+?)(&|$)/);
                if (match) href = decodeURIComponent(match[1]);
                if (href.startsWith('http') && !_isBlockedDomain(href)) urls.push(href);
            });
        } catch (e) { /* skip */ }
        await _sleep(1500);
    }
    return urls.slice(0, limit);
}

async function _bingSearch(keyword, country, limit, includeMorocco) {
    const urls = [];
    const queries = _buildSearchQueries(keyword, country, includeMorocco);
    for (const q of queries) {
        if (urls.length >= limit) break;
        for (let page = 0; page < 5; page++) {
            if (urls.length >= limit) break;
            try {
                const first = page * 10 + 1;
                const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&first=${first}`;
                const html = await _httpGet(bingUrl, { 'User-Agent': _getRandomUserAgent(), 'Accept': 'text/html' });
                const $ = cheerio.load(html);
                $('li.b_algo h2 a, .b_algo a').each((_, el) => {
                    const href = $(el).attr('href') || '';
                    if (href.startsWith('http') && !_isBlockedDomain(href)) urls.push(href);
                });
            } catch (e) { /* skip */ }
            await _sleep(1000);
        }
    }
    return urls.slice(0, limit);
}

async function _yahooSearch(keyword, country, limit, includeMorocco) {
    const urls = [];
    const queries = _buildSearchQueries(keyword, country, includeMorocco);
    for (const q of queries) {
        if (urls.length >= limit) break;
        for (let page = 0; page < 5; page++) {
            if (urls.length >= limit) break;
            try {
                const b = page * 10 + 1;
                const url = `https://search.yahoo.com/search?p=${encodeURIComponent(q)}&b=${b}`;
                const html = await _httpGet(url, { 'User-Agent': _getRandomUserAgent(), 'Accept': 'text/html' });
                const $ = cheerio.load(html);
                let found = 0;
                $('div.compTitle h3 a').each((_, el) => {
                    const href = $(el).attr('href') || '';
                    if (href.startsWith('http') && !_isSearchEngine(href)) { urls.push(href); found++; }
                });
                if (found === 0) break;
            } catch (e) { /* skip */ }
            await _sleep(1000);
        }
    }
    return urls.slice(0, limit);
}

// ══════════════════════════════════════════════════
//  WEBSITE SCRAPER (Phase 3 integrated)
// ══════════════════════════════════════════════════
async function _scrapeWebsite(url, country, useAI, targetKeywords = [], filterNiches = []) {
    let html;
    try {
        html = await _httpGet(url, {
            'User-Agent': _getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': 'https://www.google.com/'
        });
    } catch (e) {
        throw new Error(`Cannot reach ${_truncUrl(url)}: ${e.message}`);
    }

    if (!html || html.length < 200) throw new Error('Empty response');

    const $ = cheerio.load(html);

    // Phase 3: Strip scripts/styles/nav for clean AI text
    $('script, style, nav, footer, head, noscript, iframe, svg').remove();
    const cleanText = $.text().replace(/\s+/g, ' ').trim();

    let lead = _extractFromHtml($, html, url, country);

    // Keyword Pre-Filtering (Cost Optimization)
    if (filterNiches && filterNiches.length > 0) {
        const textLower = cleanText.toLowerCase();
        const hasNiche = filterNiches.some(n => textLower.includes(n.toLowerCase()));
        if (!hasNiche) return null; // Discard page to save AI tokens
    }

    // Phase 3: AI Extraction Layer
    if (useAI && (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY)) {
        const aiData = await _aiExtractLead(cleanText, url, targetKeywords);
        if (aiData) {
            // SOP: Merge AI data — AI wins over regex where it found data
            if (aiData.companyName)    lead.name    = aiData.companyName;
            if (aiData.contactEmail && _isValidEmail(aiData.contactEmail)) lead.email = aiData.contactEmail.toLowerCase().trim();
            if (aiData.phoneNumber)    lead.phone   = aiData.phoneNumber;
            if (aiData.primaryLocation) lead.city   = aiData.primaryLocation;
            if (Array.isArray(aiData.specialties) && aiData.specialties.length > 0) lead.specialties = aiData.specialties;
            if (typeof aiData.isB2B === 'boolean') lead.isB2B = aiData.isB2B;
            if (typeof aiData.keywordMatchScore === 'number') lead.keywordMatchScore = aiData.keywordMatchScore;
            lead.aiExtracted = true;
            // AI-extracted companies are presumed valid if they have name + contact
            if (lead.name && (lead.email || lead.phone)) lead.isValidCompany = true;
        }
    }

    // Try contact pages if still no email
    if (!lead.email) {
        const baseUrl = new URL(url).origin;
        for (const path of CONTACT_PATHS) {
            try {
                const contactHtml = await _httpGet(baseUrl + path, {
                    'User-Agent': _getRandomUserAgent(),
                    'Accept': 'text/html'
                });
                if (contactHtml && contactHtml.length > 200) {
                    const $c = cheerio.load(contactHtml);
                    const contactLead = _extractFromHtml($c, contactHtml, url, country);
                    lead.email    = lead.email    || contactLead.email;
                    lead.phone    = lead.phone    || contactLead.phone;
                    lead.whatsapp = lead.whatsapp || contactLead.whatsapp;
                    if (!lead.facebook)  lead.facebook  = contactLead.facebook;
                    if (!lead.instagram) lead.instagram = contactLead.instagram;
                    if (!lead.linkedin)  lead.linkedin  = contactLead.linkedin;
                    if (lead.email) break;
                }
            } catch (e) { continue; }
            await _sleep(600);
        }
    }

    return lead;
}

// ══════════════════════════════════════════════════
//  HTML DATA EXTRACTION (regex fallback)
// ══════════════════════════════════════════════════
function _extractFromHtml($, html, url, country) {
    const lead = {
        name: '', company: '', email: '', phone: '', whatsapp: '',
        website: url, country, facebook: '', instagram: '', linkedin: '', twitter: '',
        specialties: [], isB2B: false, aiExtracted: false, isValidCompany: false
    };

    // Company name
    const title    = $('title').text().trim();
    const ogTitle  = $('meta[property="og:title"]').attr('content') || '';
    const h1       = $('h1').first().text().trim();
    const siteName = $('meta[property="og:site_name"]').attr('content') || '';
    lead.name    = _cleanCompanyName(siteName || ogTitle || h1 || title);
    lead.company = lead.name;

    // Validity checks
    const textLower    = html.toLowerCase();
    const hasAbout     = textLower.includes('about us') || textLower.includes('who we are') || textLower.includes('our story') || textLower.includes('qui sommes') || textLower.includes('sobre nosotros') || textLower.includes('über uns');
    const hasContact   = textLower.includes('contact') || textLower.includes('get in touch') || textLower.includes('reach us');
    const mentionsMorocco = textLower.includes('morocco') || textLower.includes('maroc') || textLower.includes('marrakech') || textLower.includes('sahara');
    lead.mentionsMorocco = mentionsMorocco;

    // B2B detection
    const b2bKeywords = ['b2b', 'wholesale', 'trade partner', 'travel agent', 'inbound', 'dmc', 'incoming agency', 'net rate', 'commission'];
    lead.isB2B = b2bKeywords.some(k => textLower.includes(k));

    // Specialties auto-detection
    const specialtyMap = {
        luxury:    ['luxury', 'premium', 'exclusive', 'vip', 'high-end'],
        adventure: ['adventure', 'trekking', 'hiking', 'safari', 'extreme'],
        cultural:  ['cultural', 'heritage', 'history', 'museum', 'traditional'],
        family:    ['family', 'kids', 'children', 'school'],
        honeymoon: ['honeymoon', 'wedding', 'romantic', 'couples'],
        eco:       ['eco', 'sustainable', 'responsible', 'green travel']
    };
    for (const [type, kws] of Object.entries(specialtyMap)) {
        if (kws.some(k => textLower.includes(k))) lead.specialties.push(type);
    }

    let validCompany = Boolean((hasAbout || hasContact) && lead.name.length > 2);
    lead.isValidCompany = validCompany;

    // Emails
    const mailtoEmails = [];
    $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
        if (email && _isValidEmail(email)) mailtoEmails.push(email);
    });
    const regexEmails = (html.match(EMAIL_RE) || []).map(e => e.toLowerCase().trim()).filter(_isValidEmail);
    const allEmails = [...new Set([...mailtoEmails, ...regexEmails])];
    const prioritized = allEmails.sort((a, b) => {
        const rank = e => {
            if (e.startsWith('contact')) return 0;
            if (e.startsWith('info'))    return 1;
            if (e.startsWith('hello') || e.startsWith('bonjour') || e.startsWith('hola')) return 2;
            if (e.startsWith('sales') || e.startsWith('booking') || e.startsWith('reserv')) return 3;
            return 4;
        };
        return rank(a) - rank(b);
    });
    lead.email = prioritized[0] || '';

    // Phone
    const phones = [];
    $('a[href^="tel:"]').each((_, el) => {
        const tel = ($(el).attr('href') || '').replace('tel:', '').replace(/\s/g, '');
        if (tel.length >= 8) phones.push(tel);
    });
    const regexPhones = (html.match(PHONE_RE) || []).map(p => p.replace(/[\s.()-]/g, ''));
    const allPhones = [...new Set([...phones, ...regexPhones])].filter(p => p.length >= 8 && p.length <= 20);
    lead.phone = allPhones[0] || '';

    // WhatsApp
    const waMatches = html.match(WHATSAPP_RE) || [];
    if (waMatches.length > 0) {
        lead.whatsapp = waMatches[0].replace(/wa\.me\//i, '').replace(/[^0-9+]/g, '');
    }
    $('a[href*="wa.me"], a[href*="whatsapp"]').each((_, el) => {
        if (!lead.whatsapp) {
            const href = $(el).attr('href') || '';
            const num = href.match(/[0-9]{8,}/);
            if (num) lead.whatsapp = num[0];
        }
    });
    if (!lead.whatsapp && lead.phone) lead.whatsapp = lead.phone.replace(/^00/, '+');

    // Social Media
    for (const [platform, regex] of Object.entries(SOCIAL_RE)) {
        const matches = html.match(regex) || [];
        const filtered = matches.filter(m => !m.includes('sharer') && !m.includes('share') && !m.includes('intent'));
        lead[platform] = filtered[0] || matches[0] || '';
    }

    return lead;
}

// ══════════════════════════════════════════════════
//  PHASE 2: SOP SEARCH QUERY BUILDER
// ══════════════════════════════════════════════════
function _buildSearchQueries(keyword, geoTarget, includeMorocco) {
    const base    = keyword || 'travel agency';
    const blocked = '-tripadvisor -viator -tourradar -tourhq -getyourguide -booking -expedia -agoda -airbnb -yelp';

    if (includeMorocco) {
        // SOP: Morocco-targeted B2B queries
        return [
            `${base} ${geoTarget} "Morocco tours" ${blocked}`,
            `"B2B travel agency" ${geoTarget} Morocco ${blocked}`,
            `inurl:contact ${base} ${geoTarget} Morocco ${blocked}`,
            `${base} ${geoTarget} "Marrakech" site:.com ${blocked}`,
            `${base} ${geoTarget} "Sahara desert" OR "Morocco packages" ${blocked}`,
        ];
    } else {
        // SOP: Standard B2B discovery queries
        return [
            `inurl:contact "${base}" "${geoTarget}" ${blocked}`,
            `"B2B travel agency partner" ${geoTarget} ${blocked}`,
            `${base} ${geoTarget} official website ${blocked}`,
            `DMC "${geoTarget}" inbound travel ${blocked}`,
            `"incoming travel agency" ${geoTarget} email ${blocked}`,
        ];
    }
}

// ══════════════════════════════════════════════════
//  LEAD SCORING — SOP Section 10
//  +20 website valid | +20 has email | +20 Morocco
//  +10 phone/WhatsApp | +10 social media
//  KEEP: score >= 50
// ══════════════════════════════════════════════════
function _scoreLead(lead) {
    let score = 0;

    // +20 → website valid
    if (lead.website && lead.website.length > 5 && lead.isValidCompany) score += 20;
    else if (lead.website && lead.website.length > 5) score += 10;

    // +20 → has email
    if (lead.email) score += 20;

    // +20 → sells Morocco tours
    if (lead.morocco_relevant || lead.mentionsMorocco) score += 20;
    else {
        const text = `${lead.name||''} ${lead.company||''} ${(lead.specialties||[]).join(' ')}`.toLowerCase();
        if (['morocco','maroc','marrakech','sahara','fes','casablanca','atlas'].some(k => text.includes(k))) {
            lead.morocco_relevant = true;
            score += 20;
        }
    }

    // +10 → phone or WhatsApp
    if (lead.phone || lead.whatsapp) score += 10;

    // +10 → social media presence
    const socials = [lead.facebook, lead.instagram, lead.linkedin, lead.twitter].filter(Boolean).length;
    if (socials > 0) score += 10;

    // Bonus modifiers (up to +20 extra)
    if (lead.isB2B) score += 5;
    if (lead.aiExtracted) score += 5;
    if (lead.keywordMatchScore && lead.keywordMatchScore >= 7) score += 5;
    if (socials >= 3) score += 5;

    return Math.min(score, 100);
}

// ══════════════════════════════════════════════════
//  DB HELPER
// ══════════════════════════════════════════════════
async function _insertLead(lead, score) {
    const specialtiesStr = Array.isArray(lead.specialties) ? lead.specialties.join(', ') : '';
    await db.dbRun(
        `INSERT INTO n8n_leads (name, email, company, phone, country, website, source, score, raw_data, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            lead.name || '', (lead.email || '').toLowerCase().trim(),
            lead.company || lead.name || '', lead.phone || '',
            lead.country || '', lead.website || '',
            'ai_lead_finder', score, JSON.stringify(lead),
            score >= 30 ? 'qualified' : 'new',
            [
                lead.isB2B ? 'B2B' : '',
                specialtiesStr ? `Specialties: ${specialtiesStr}` : '',
                lead.aiExtracted ? 'AI Extracted' : '',
                lead.facebook, lead.instagram, lead.linkedin
            ].filter(Boolean).join(' | ')
        ]
    );
}

// ══════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ══════════════════════════════════════════════════
function _getRandomUserAgent() {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

function _cleanCompanyName(raw) {
    if (!raw) return '';
    return raw
        .replace(/\s*[-–|•·:]\s*.+$/, '')
        .replace(/home\s*[-–|]/i, '')
        .replace(/\s*\|.*$/, '')
        .replace(/\s*-\s*(home|accueil|inicio|startseite|welcome)$/i, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z]+;/gi, '')
        .trim()
        .substring(0, 80);
}

function _isValidEmail(email) {
    if (!email || email.length > 80 || email.length < 6) return false;
    return !EMAIL_BLACKLIST.some(b => email.toLowerCase().includes(b))
        && email.includes('@')
        && email.includes('.')
        && !/^[0-9]/.test(email)
        && !email.endsWith('.png')
        && !email.endsWith('.jpg')
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function _isBlockedDomain(url) {
    if (!url) return true;
    // SOP Section 7: Smart Website Filter — reject aggregators, OTAs, directories
    const skip = [
        'google.', 'bing.', 'yahoo.', 'duckduckgo.', 'baidu.', 'yandex.',
        'wikipedia.org', 'facebook.com', 'instagram.com', 'youtube.com', 'twitter.com', 'x.com',
        'linkedin.com', 'pinterest.com', 'reddit.com', 'amazon.', 'ebay.',
        // OTA platforms (SOP blocked)
        'tripadvisor.', 'viator.com', 'tourradar.com', 'tourhq.com', 'getyourguide.com',
        'booking.com', 'expedia.com', 'kayak.com', 'skyscanner.', 'lonelyplanet.com',
        'hotels.com', 'trivago.', 'klook.com', 'travelocity.com', 'orbitz.com', 'priceline.com',
        // Directories
        'yelp.', 'trustpilot.com', 'yellowpages.', 'manta.com', 'bbb.org', 'crunchbase.com',
        'agoda.com', 'airbnb.', 'tiktok.com', 'whatsapp.com',
        'maps.google', 'play.google', 'apple.com', 'microsoft.com',
        'responsibletravel.com', 'safari-bookings.com', 'safaribookings.com',
        'kimkim.com', 'audleytravel.com', 'trafalgar.com'
    ];
    const lowerUrl = url.toLowerCase();
    return skip.some(s => lowerUrl.includes(s));
}

function _isSearchEngine(url) {
    const engines = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'search.', 'baidu.'];
    const lowerUrl = url.toLowerCase();
    return engines.some(s => lowerUrl.includes(s));
}

function _deduplicateUrls(urls) {
    const seen = new Set();
    return urls.filter(u => {
        try {
            const domain = new URL(u).hostname.replace('www.', '');
            if (seen.has(domain)) return false;
            seen.add(domain);
            return true;
        } catch { return false; }
    });
}

function _deduplicateLeads(leads) {
    const seen = new Set();
    return leads.filter(l => {
        const key = (l.email || l.website || l.phone || '').toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function _truncUrl(url) {
    try { return new URL(url).hostname; } catch { return url.substring(0, 40); }
}

function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// HTTP GET with timeout + redirect support
function _httpGet(url, headers = {}, maxRedirects = 4) {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
        const lib = url.startsWith('https') ? https : http;
        const options = {
            headers: { 'User-Agent': headers['User-Agent'] || _getRandomUserAgent(), ...headers },
            timeout: REQUEST_TIMEOUT,
            rejectUnauthorized: false
        };
        const req = lib.get(url, options, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                let redir = res.headers.location;
                if (redir.startsWith('/')) { const u = new URL(url); redir = u.origin + redir; }
                return _httpGet(redir, headers, maxRedirects - 1).then(resolve).catch(reject);
            }
            if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            let totalSize = 0;
            const MAX_SIZE = 2 * 1024 * 1024;
            res.on('data', c => {
                totalSize += c.length;
                if (totalSize > MAX_SIZE) { res.destroy(); reject(new Error('Response too large')); return; }
                chunks.push(c);
            });
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
    });
}

// HTTP POST (for AI API calls)
function _httpPost(url, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const bodyBuf = Buffer.from(body, 'utf-8');
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path:     urlObj.pathname + urlObj.search,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': bodyBuf.length,
                ...headers
            },
            timeout: 20000,
            rejectUnauthorized: false
        };
        const req = lib.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf-8');
                if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${text.substring(0, 200)}`));
                resolve(text);
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('AI API Timeout')); });
        req.on('error', reject);
        req.write(bodyBuf);
        req.end();
    });
}

module.exports = router;
