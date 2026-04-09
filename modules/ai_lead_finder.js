/**
 * AI Lead Finder — 2026 Modern System (Claude Opus 4.6)
 * ─────────────────────────────────────────────────────
 * Morocco-focused B2B travel lead generation engine.
 * Clean minimalist UI with desert gradient glassmorphism.
 */

const AILeadFinder = {
    _jobId: null,
    _results: [],
    _streaming: false,
    _history: [],
    _selected: new Set(),
    _savedIds: new Set(),
    _assistantVisible: false,
    _moroccoFocus: true,
    _selectedCountry: '',
    _selectedNiche: 'All',
    _filterScore: 0,

    async init() {
        try {
            const h = await fetch('/api/ai/find-leads/history').then(r => r.json());
            this._history = h.history || [];
        } catch (e) { this._history = []; }
    },

    render() {
        const c = document.getElementById('mainContent');
        c.innerHTML = `
            ${this._renderHeader()}
            ${this._renderSearchPanel()}
            ${this._renderStatsRow()}
            ${this._renderProgressArea()}
            ${this._renderResults()}
            <div style="position:fixed; bottom:30px; right:30px; z-index:99;">
                <button class="btn-primary" style="width:60px; height:60px; border-radius:30px; box-shadow:0 10px 25px rgba(194,120,50,0.4); background:linear-gradient(135deg,#c27832,#e8a04a); display:flex; align-items:center; justify-content:center; font-size:22px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="AILeadFinder.toggleAssistant()" title="AI Suggestions">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                </button>
            </div>
            ${this._renderAssistant()}
        `;
    },

    // ════════════════════════════════════════════════
    //  GLOBAL STYLES (2026 Desert/Travel Aesthetic)
    // ════════════════════════════════════════════════
    _injectStyles() {
        if (document.getElementById('ai_2026_styles')) return;
        const style = document.createElement('style');
        style.id = 'ai_2026_styles';
        style.innerHTML = `
            #mainContent {
                background: linear-gradient(180deg, #0f0f14 0%, #1a1510 100%) !important;
                color: #fafaf5 !important;
                font-family: 'Inter', 'Space Grotesk', sans-serif !important;
                min-height: 100vh;
                position: relative;
            }
            .glass-card {
                background: rgba(255,255,255,0.03);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.06);
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                border-radius: 20px;
            }
            .orb-desert { position:absolute; top:-120px; right:-80px; width:500px; height:500px; background:radial-gradient(circle, rgba(194,120,50,0.12) 0%, transparent 70%); filter:blur(80px); z-index:0; pointer-events:none; }
            .orb-sand   { position:absolute; bottom:-100px; left:-80px; width:450px; height:450px; background:radial-gradient(circle, rgba(232,160,74,0.08) 0%, transparent 70%); filter:blur(80px); z-index:0; pointer-events:none; }
            .neo-btn {
                background: rgba(255,255,255,0.04); color: #fff; border: 1px solid rgba(255,255,255,0.08);
                transition: all 0.2s ease; border-radius: 12px; cursor: pointer; display: inline-flex; align-items:center; gap:8px; font-size:13px; padding:8px 14px;
            }
            .neo-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); transform: translateY(-1px); }
            .btn-desert {
                background: linear-gradient(135deg, #c27832, #e8a04a); color: #fff; border: none;
                box-shadow: 0 4px 20px rgba(194,120,50,0.3); transition: all 0.2s ease; border-radius: 14px; cursor: pointer; display: inline-flex; align-items:center; gap:8px; font-weight:700;
            }
            .btn-desert:hover { box-shadow: 0 6px 30px rgba(194,120,50,0.5); transform: translateY(-1px); }
            .morocco-badge { background:rgba(0,100,0,0.15); border:1px solid rgba(0,100,0,0.3); color:#4ade80; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px; }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
            @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        `;
        document.head.appendChild(style);
    },

    // ════════════════════════════════════════════════
    //  HEADER
    // ════════════════════════════════════════════════
    _renderHeader() {
        this._injectStyles();
        return `
        <div class="orb-desert"></div><div class="orb-sand"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; position:relative; z-index:1;">
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg,#c27832,#e8a04a); display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; box-shadow:0 8px 24px rgba(194,120,50,0.3);">
                    <i class="fa-solid fa-compass"></i>
                </div>
                <div>
                    <h2 style="font-size:24px; font-weight:800; letter-spacing:-0.5px; margin:0; color:#fff;">AI Lead Finder</h2>
                    <p style="color:rgba(255,255,255,0.45); font-size:12px; margin:2px 0 0; font-weight:500;">Morocco B2B Travel • Powered by Claude AI</p>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="AILeadFinder.exportCSV()" class="neo-btn"><i class="fa-solid fa-download"></i> CSV</button>
            </div>
        </div>`;
    },

    // ════════════════════════════════════════════════
    //  SEARCH PANEL
    // ════════════════════════════════════════════════
    _renderSearchPanel() {
        const countries = ['USA','UK','France','Germany','Spain','Italy','Netherlands','Canada','Australia','Switzerland','Japan','Thailand','Brazil','Turkey','Egypt','India','Portugal','Greece','Mexico','Morocco'];
        const niches = ['All','Luxury','Adventure','Cultural','Eco','Honeymoon','B2B','Family'];
        return `
        <div class="glass-card" style="padding:28px; margin-bottom:24px; position:relative; z-index:1;">
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:14px; align-items:end;">
                <div>
                    <label style="font-size:11px; font-weight:700; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; display:block;">🌍 Country</label>
                    <select id="ai_country" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:12px; padding:12px 14px; font-size:14px; font-weight:600; outline:none; appearance:none;">
                        <option value="" style="color:#000">Select country...</option>
                        ${countries.map(c => `<option value="${c}" style="color:#000" ${this._selectedCountry === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:11px; font-weight:700; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; display:block;">🎯 Niche</label>
                    <select id="ai_niche" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:12px; padding:12px 14px; font-size:14px; font-weight:600; outline:none; appearance:none;">
                        ${niches.map(n => `<option value="${n}" style="color:#000" ${this._selectedNiche === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:11px; font-weight:700; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; display:block;">🔢 Max Results</label>
                    <select id="ai_max" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:12px; padding:12px 14px; font-size:14px; font-weight:600; outline:none; appearance:none;">
                        <option value="20" style="color:#000">20</option>
                        <option value="50" style="color:#000" selected>50</option>
                        <option value="100" style="color:#000">100</option>
                    </select>
                </div>
                <button class="btn-desert" id="ai_search_btn" onclick="AILeadFinder.startSearch()" style="padding:12px 28px; font-size:15px; height:48px;">
                    <i class="fa-solid fa-bolt"></i> Search
                </button>
            </div>

            <div style="display:flex; align-items:center; gap:16px; margin-top:18px; flex-wrap:wrap;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.7);">
                    <input type="checkbox" id="ai_morocco_focus" ${this._moroccoFocus ? 'checked' : ''} onchange="AILeadFinder._moroccoFocus=this.checked" style="accent-color:#c27832; width:16px; height:16px;">
                    <span>🇲🇦 Morocco Focus</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.7);">
                    <input type="checkbox" id="ai_use_llm" checked style="accent-color:#c27832; width:16px; height:16px;">
                    <span>🧠 AI Engine</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.7);">
                    <input type="checkbox" id="ai_respect_robots" checked style="accent-color:#c27832; width:16px; height:16px;">
                    <span>🛡️ Robots.txt</span>
                </label>
                <div style="flex:1;"></div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${countries.slice(0, 8).map(c => `<button onclick="document.getElementById('ai_country').value='${c}'" class="neo-btn" style="padding:5px 10px; font-size:11px;">${c}</button>`).join('')}
                </div>
            </div>

            ${this._history.length > 0 ? `
            <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); display:flex; flex-wrap:wrap; gap:6px;">
                <span style="font-size:10px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; line-height:28px;">Recent:</span>
                ${this._history.slice(0, 6).map(h => `<button onclick="document.getElementById('ai_country').value='${h.country}'; AILeadFinder.startSearch()" class="neo-btn" style="padding:4px 10px; font-size:10px;">${h.country} <span style="color:#e8a04a;">(${h.count})</span></button>`).join('')}
            </div>` : ''}
        </div>`;
    },

    // ════════════════════════════════════════════════
    //  STATS ROW
    // ════════════════════════════════════════════════
    _renderStatsRow() {
        setTimeout(async () => {
            const el = document.getElementById('ai_stats_area');
            if (!el) return;
            try {
                const res = await fetch('/api/ai/find-leads/stats');
                const s = await res.json();
                if (s.ok) {
                    el.innerHTML = `
                    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px;">
                        <div class="glass-card" style="padding:18px; display:flex; align-items:center; gap:16px;">
                            <div style="width:44px;height:44px;border-radius:12px;background:rgba(194,120,50,0.12);color:#e8a04a;display:flex;align-items:center;justify-content:center;font-size:20px;"><i class="fa-solid fa-users"></i></div>
                            <div><div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total Leads</div><div style="font-size:24px;font-weight:800;color:#fff;">${s.total}</div></div>
                        </div>
                        <div class="glass-card" style="padding:18px; display:flex; align-items:center; gap:16px;">
                            <div style="width:44px;height:44px;border-radius:12px;background:rgba(245,158,11,0.12);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:20px;"><i class="fa-solid fa-star"></i></div>
                            <div><div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:1px;">Avg Score</div><div style="font-size:24px;font-weight:800;color:#fff;">${s.avgScore}</div></div>
                        </div>
                        <div class="glass-card" style="padding:18px; display:flex; align-items:center; gap:16px;">
                            <div style="width:44px;height:44px;border-radius:12px;background:rgba(74,222,128,0.12);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:20px;"><i class="fa-solid fa-globe"></i></div>
                            <div><div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:1px;">Top Market</div><div style="font-size:18px;font-weight:800;color:#fff;">${s.byCountry[0] ? s.byCountry[0].country : '--'}</div></div>
                        </div>
                    </div>`;
                }
            } catch(e) {}
        }, 100);
        return `<div id="ai_stats_area"></div>`;
    },

    // ════════════════════════════════════════════════
    //  PROGRESS
    // ════════════════════════════════════════════════
    _renderProgressArea() {
        if (!this._jobId) return '<div id="ai_progress" style="display:none;"></div>';
        return `<div id="ai_progress"></div>`;
    },

    _updateProgress(data) {
        const el = document.getElementById('ai_progress');
        if (!el) return;
        const pct = data.total > 0 ? Math.round((data.processed / data.total) * 100) : 0;
        const logs = (data.log || []).slice(-6);
        el.innerHTML = `
        <div class="glass-card" style="padding:20px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-size:13px; font-weight:700; color:#e8a04a;"><i class="fa-solid fa-satellite-dish fa-spin" style="margin-right:6px;"></i>${data.status === 'done' ? 'Complete' : data.status}</span>
                <span style="font-size:12px; color:rgba(255,255,255,0.5);">${data.processed}/${data.total} • ${data.found} found • ${pct}%</span>
            </div>
            <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:linear-gradient(90deg,#c27832,#e8a04a); border-radius:2px; transition:width 0.3s;"></div>
            </div>
            <div style="margin-top:12px; font-size:11px; color:rgba(255,255,255,0.4); max-height:120px; overflow-y:auto; font-family:monospace;">
                ${logs.map(l => `<div style="padding:2px 0;">${l}</div>`).join('')}
            </div>
        </div>`;
    },

    // ════════════════════════════════════════════════
    //  RESULTS GRID
    // ════════════════════════════════════════════════
    _renderResults() {
        if (this._results.length === 0) return '<div id="ai_results"></div>';
        const filtered = this._filterScore > 0 ? this._results.filter(l => (l.score || 0) >= this._filterScore) : this._results;
        return `
        <div id="ai_results">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; position:relative; z-index:1;">
                <h3 style="margin:0; font-size:16px; font-weight:800; color:#fff;">
                    <i class="fa-solid fa-list" style="color:#e8a04a; margin-right:8px;"></i>${filtered.length} Leads Found
                </h3>
                <div style="display:flex; gap:8px;">
                    <button class="neo-btn" onclick="AILeadFinder.selectAll()" style="font-size:11px;"><i class="fa-solid fa-check-double"></i> Select All</button>
                    <button class="btn-desert" onclick="AILeadFinder.saveSelectedToCRM()" style="padding:8px 16px; font-size:12px;"><i class="fa-solid fa-floppy-disk"></i> Save to CRM</button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:16px; position:relative; z-index:1;">
                ${filtered.map((l, i) => this._renderLeadCard(l, i)).join('')}
            </div>
        </div>`;
    },

    _renderLeadCard(l, i) {
        const isSaved = this._savedIds.has(i);
        const scoreColor = l.score >= 80 ? '#4ade80' : l.score >= 50 ? '#e8a04a' : '#ef4444';
        return `
        <div class="glass-card" style="padding:20px; animation:fadeUp 0.3s ease ${i * 0.04}s both; position:relative; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 40px rgba(0,0,0,0.3)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:15px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l.name || 'Unknown Company'}</div>
                    <div style="font-size:12px; color:rgba(255,255,255,0.4); margin-top:2px;">${l.country || ''}</div>
                </div>
                <div style="min-width:48px; height:48px; border-radius:14px; background:rgba(255,255,255,0.04); border:2px solid ${scoreColor}; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                    <span style="font-size:16px; font-weight:900; color:${scoreColor}; line-height:1;">${l.score || 0}</span>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px; font-size:13px;">
                ${l.email ? `<div style="display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-envelope" style="color:#e8a04a; width:14px;"></i><a href="mailto:${l.email}" style="color:rgba(255,255,255,0.8); text-decoration:none;">${l.email}</a></div>` : ''}
                ${l.phone ? `<div style="display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-phone" style="color:#4ade80; width:14px;"></i><span style="color:rgba(255,255,255,0.7);">${l.phone}</span></div>` : ''}
                ${l.whatsapp ? `<div style="display:flex; align-items:center; gap:8px;"><i class="fa-brands fa-whatsapp" style="color:#25d366; width:14px;"></i><a href="https://wa.me/${l.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" style="color:#25d366; text-decoration:none;">${l.whatsapp}</a></div>` : ''}
                ${l.website ? `<div style="display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-globe" style="color:rgba(255,255,255,0.3); width:14px;"></i><a href="${l.website}" target="_blank" style="color:rgba(255,255,255,0.5); text-decoration:none; font-size:12px;">${this._shortUrl(l.website)}</a></div>` : ''}
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:16px;">
                ${l.morocco_relevant ? '<span class="morocco-badge">🇲🇦 Morocco</span>' : ''}
                ${l.aiExtracted ? '<span style="background:rgba(194,120,50,0.15); border:1px solid rgba(194,120,50,0.3); color:#e8a04a; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;">🤖 AI</span>' : ''}
                ${l.isB2B ? '<span style="background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); color:#4ade80; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;">B2B</span>' : ''}
                ${l.niche && l.niche !== 'All' ? `<span style="background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.6); font-size:10px; font-weight:600; padding:3px 8px; border-radius:6px;">${l.niche}</span>` : ''}
                ${(l.specialties || []).slice(0,2).map(s => `<span style="background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.5); font-size:10px; padding:3px 8px; border-radius:6px;">${s}</span>`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.04); margin:0 -20px -20px; padding:12px 20px; background:rgba(0,0,0,0.15); border-radius:0 0 20px 20px;">
                <div style="display:flex; gap:8px;">
                    ${l.facebook ? `<a href="${l.facebook}" target="_blank" style="color:#1877f2; font-size:14px;"><i class="fa-brands fa-facebook"></i></a>` : ''}
                    ${l.instagram ? `<a href="${l.instagram}" target="_blank" style="color:#e4405f; font-size:14px;"><i class="fa-brands fa-instagram"></i></a>` : ''}
                    ${l.linkedin ? `<a href="${l.linkedin}" target="_blank" style="color:#0077b5; font-size:14px;"><i class="fa-brands fa-linkedin"></i></a>` : ''}
                </div>
                <div style="display:flex; gap:6px;">
                    ${isSaved ? '<span style="padding:5px 12px; border-radius:8px; background:rgba(74,222,128,0.12); color:#4ade80; font-size:11px; font-weight:700;">IN CRM ✓</span>' :
                    `${l.whatsapp ? `<button class="neo-btn" onclick="window.open('https://wa.me/${(l.whatsapp||'').replace(/[^0-9]/g,'')}','_blank')" style="padding:5px 10px; font-size:11px; color:#25d366;"><i class="fa-brands fa-whatsapp"></i></button>` : ''}
                     ${l.email ? `<button class="neo-btn" onclick="AILeadFinder.sendEmail(${i})" style="padding:5px 10px; font-size:11px;"><i class="fa-solid fa-paper-plane"></i></button>` : ''}
                     <button class="neo-btn" onclick="AILeadFinder.viewLead(${i})" style="padding:5px 10px; font-size:11px;"><i class="fa-solid fa-expand"></i></button>`}
                </div>
            </div>
        </div>`;
    },

    // ════════════════════════════════════════════════
    //  ACTIONS
    // ════════════════════════════════════════════════
    async startSearch() {
        const country = document.getElementById('ai_country')?.value;
        const niche = document.getElementById('ai_niche')?.value || 'All';
        const maxResults = document.getElementById('ai_max')?.value || '50';
        const useAI = document.getElementById('ai_use_llm')?.checked !== false;
        const respectRobots = document.getElementById('ai_respect_robots')?.checked !== false;
        const moroccoFocus = document.getElementById('ai_morocco_focus')?.checked || false;

        if (!country) return UI.showToast('Please select a country to begin.', 'error');

        this._selectedCountry = country;
        this._selectedNiche = niche;
        this._results = [];
        this._selected.clear();
        this._savedIds.clear();
        this._streaming = true;

        const btn = document.getElementById('ai_search_btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-satellite-dish fa-spin"></i> Scanning...'; }

        try {
            const res = await fetch('/api/ai/find-leads/dynamic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locations: [country],
                    niches: niche !== 'All' ? [niche] : [],
                    services: [],
                    maxResults: Number(maxResults),
                    useAI,
                    respectRobots,
                    moroccoFocus
                })
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.message);

            this._jobId = json.jobId;
            this.render();
            this._pollJob(json.jobId);
        } catch (e) {
            UI.showToast('Error: ' + e.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Search'; }
        }
    },

    _pollJob(jobId) {
        const poll = async () => {
            try {
                const res = await fetch(`/api/ai/find-leads/${jobId}`);
                const data = await res.json();
                if (!data.ok) return;
                this._updateProgress(data);
                if (data.leads && data.leads.length > 0) {
                    this._results = data.leads;
                    const el = document.getElementById('ai_results');
                    if (el) el.innerHTML = this._renderResults().replace(/<div id="ai_results">/, '').replace(/<\/div>$/, '');
                }
                if (data.status === 'done' || data.status === 'error') {
                    this._streaming = false;
                    this._results = data.leads || [];
                    this.render();
                    const btn = document.getElementById('ai_search_btn');
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Search'; }
                    if (data.status === 'done') UI.showToast(`✨ Found ${data.found} leads, ${data.saved} auto-saved to CRM!`, 'success');
                    this.init();
                    return;
                }
            } catch (e) { /* keep polling */ }
            if (this._streaming) setTimeout(poll, 1500);
        };
        poll();
    },

    // ════════════════════════════════════════════════
    //  SELECTION & CRM
    // ════════════════════════════════════════════════
    toggleItem(idx, checked) { if (checked) this._selected.add(idx); else this._selected.delete(idx); },
    toggleAll(checked) { this._selected = new Set(); if (checked) this._results.forEach((_, i) => this._selected.add(i)); },
    selectAll() { this._results.forEach((_, i) => this._selected.add(i)); },

    async saveSelectedToCRM() {
        const indices = this._selected.size > 0 ? Array.from(this._selected) : this._results.map((_, i) => i);
        const leads = indices.map(i => this._results[i]).filter(Boolean).filter(l => l.email);
        if (leads.length === 0) return UI.showToast('No leads with emails to save', 'error');
        try {
            const res = await fetch('/api/ai/find-leads/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads }) });
            const json = await res.json();
            if (!json.ok) throw new Error(json.message);
            indices.forEach(i => this._savedIds.add(i));
            this.render();
            UI.showToast(`${json.saved} leads saved ✓ (${json.skipped} duplicates skipped)`, 'success');
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
    },

    viewLead(idx) {
        const l = this._results[idx];
        if (!l) return;
        Modal.open({
            title: `<i class="fa-solid fa-building" style="color:#e8a04a; margin-right:8px;"></i>${l.name || 'Lead Details'}`,
            size: 'md',
            body: `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    ${this._infoField('Company', l.name || l.company)}
                    ${this._infoField('Email', l.email ? `<a href="mailto:${l.email}" style="color:#e8a04a;">${l.email}</a>` : '—')}
                    ${this._infoField('Phone', l.phone || '—')}
                    ${this._infoField('WhatsApp', l.whatsapp ? `<a href="https://wa.me/${l.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" style="color:#25d366;">${l.whatsapp}</a>` : '—')}
                    ${this._infoField('Website', l.website ? `<a href="${l.website}" target="_blank" style="color:#06b6d4;">${l.website}</a>` : '—')}
                    ${this._infoField('Country', l.country || '—')}
                    ${this._infoField('Niche', l.niche || '—')}
                    ${this._infoField('Morocco', l.morocco_relevant ? '🇲🇦 YES' : 'No')}
                    ${this._infoField('Score', `<span style="color:${l.score >= 80 ? '#4ade80' : '#e8a04a'}; font-weight:800;">${l.score}/100</span>`)}
                </div>`,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Close</button>
                ${l.whatsapp ? `<button class="btn-social" onclick="window.open('https://wa.me/${(l.whatsapp||'').replace(/[^0-9]/g,'')}','_blank')" style="color:#25d366; border-color:rgba(37,211,102,0.3); border-radius:12px;"><i class="fa-brands fa-whatsapp" style="margin-right:5px;"></i>WhatsApp</button>` : ''}
                ${l.email ? `<button class="btn-primary" onclick="AILeadFinder.sendEmail(${idx}); Modal.close();" style="background:linear-gradient(135deg,#c27832,#e8a04a); border-radius:12px;"><i class="fa-solid fa-envelope" style="margin-right:5px;"></i>Send Email</button>` : ''}
            `
        });
    },

    sendEmail(idx) {
        const l = this._results[idx];
        if (!l || !l.email) return;
        if (typeof Mail !== 'undefined' && Mail.quickCompose) {
            Mail.quickCompose(l.email, 'Partnership Inquiry — PM Travel Agency', `Dear ${l.name || 'Partner'},\n\nI'm reaching out from PM Travel Agency, a DMC in Marrakech, Morocco.\n\nWe'd love to explore a partnership.\n\nBest regards,\nPM Travel Agency`);
        } else {
            window.open(`mailto:${l.email}?subject=Partnership Inquiry&body=Dear ${encodeURIComponent(l.name || 'Partner')},%0A%0AI'm reaching out from PM Travel Agency.%0A%0ABest regards,%0APM Travel Agency`);
        }
    },

    exportCSV() {
        if (!this._results.length) return UI.showToast('No results to export', 'error');
        const headers = ['Company','Email','Phone','WhatsApp','Website','Country','Niche','Morocco','Score'];
        const rows = this._results.map(l => [
            `"${(l.name || '').replace(/"/g, '""')}"`, l.email || '', l.phone || '', l.whatsapp || '',
            l.website || '', l.country || '', l.niche || '', l.morocco_relevant ? 'YES' : 'NO', l.score || 0
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `leads_${this._selectedCountry || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
        UI.showToast('CSV exported ✓', 'success');
    },

    _infoField(label, value) {
        return `<div class="form-group"><label>${label}</label><div class="form-control" style="height:auto; padding:10px; font-size:13px;">${value}</div></div>`;
    },
    _shortUrl(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return url.substring(0, 30); } },

    // ════════════════════════════════════════════════
    //  AI ASSISTANT DRAWER
    // ════════════════════════════════════════════════
    toggleAssistant() { this._assistantVisible = !this._assistantVisible; this.render(); },

    _renderAssistant() {
        if (!this._assistantVisible) return '';
        let content = '';
        if (this._results.length === 0) {
            content = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:30px;"><i class="fa-solid fa-compass" style="font-size:48px; color:rgba(255,255,255,0.1); margin-bottom:16px;"></i><p style="color:rgba(255,255,255,0.4); font-size:13px;">Run a search first to get AI-powered suggestions and outreach templates.</p></div>`;
        } else {
            const topLeads = [...this._results].sort((a,b) => (b.score||0) - (a.score||0)).slice(0, 3);
            const moroccoLeads = this._results.filter(l => l.morocco_relevant).length;
            content = `
            <div style="padding:20px; font-size:13px;">
                <div style="background:rgba(194,120,50,0.08); border:1px solid rgba(194,120,50,0.2); border-radius:14px; padding:16px; margin-bottom:16px;">
                    <h4 style="margin:0 0 8px; color:#e8a04a; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px;"><i class="fa-solid fa-fire"></i> Top 3 Leads</h4>
                    ${topLeads.map(l => `<div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:10px; margin-top:6px;"><div style="font-weight:700; color:#fff;">${l.name} <span style="color:#e8a04a; font-size:11px;">${l.score}pts</span></div><div style="font-size:11px; color:rgba(255,255,255,0.4);">${l.email || 'No email'}</div></div>`).join('')}
                </div>
                <div style="background:rgba(0,100,0,0.06); border:1px solid rgba(74,222,128,0.15); border-radius:14px; padding:16px; margin-bottom:16px;">
                    <h4 style="margin:0 0 4px; color:#4ade80; font-size:12px; font-weight:800;"><i class="fa-solid fa-chart-pie"></i> Morocco Relevance</h4>
                    <p style="color:rgba(255,255,255,0.5); margin:0; font-size:12px;">${moroccoLeads} of ${this._results.length} leads sell Morocco tours (${Math.round(moroccoLeads/this._results.length*100)}%)</p>
                </div>
                <div style="background:rgba(194,120,50,0.04); border:1px solid rgba(194,120,50,0.1); border-radius:14px; padding:16px;">
                    <h4 style="margin:0 0 8px; color:#e8a04a; font-size:12px; font-weight:800;"><i class="fa-solid fa-pen-nib"></i> Outreach Template</h4>
                    <textarea readonly style="width:100%; height:140px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px; font-size:12px; color:rgba(255,255,255,0.7); resize:none; font-family:inherit;">Subject: B2B Partnership — Morocco Tours\n\nHi {{FirstName}},\n\nI discovered {{CompanyName}} and wanted to reach out about our exclusive B2B rates for Morocco packages.\n\nWe're a DMC in Marrakech offering Sahara, Atlas, and Imperial Cities tours.\n\nWould you be open to a quick call?\n\nBest,\nPM Travel Agency</textarea>
                </div>
            </div>`;
        }
        return `
        <div style="position:fixed; top:0; right:0; width:380px; height:100vh; background:rgba(15,15,20,0.95); backdrop-filter:blur(20px); border-left:1px solid rgba(255,255,255,0.05); z-index:100; box-shadow:-10px 0 40px rgba(0,0,0,0.5); display:flex; flex-direction:column;">
            <div style="padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between; background:linear-gradient(90deg, rgba(194,120,50,0.1), transparent);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#c27832,#e8a04a); display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px;"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                    <div><h3 style="margin:0; font-size:15px; font-weight:800; color:#fff;">AI Assistant</h3><div style="font-size:11px; color:#4ade80; font-weight:700;"><span style="display:inline-block; width:6px; height:6px; background:#4ade80; border-radius:50%; margin-right:4px; box-shadow:0 0 6px #4ade80;"></span>Claude Online</div></div>
                </div>
                <button onclick="AILeadFinder.toggleAssistant()" style="background:transparent; border:none; color:rgba(255,255,255,0.4); font-size:18px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="flex:1; overflow-y:auto;">${content}</div>
        </div>`;
    }
};

window.AILeadFinder = AILeadFinder;
