/**
 * n8n Automation Hub — Frontend Module
 * ─────────────────────────────────────
 * Lead management, scraper controls, workflow triggers,
 * and analytics dashboard for n8n integration.
 */

const N8nHub = {
    _leads: [],
    _stats: null,
    _filter: { status: 'all', source: 'all', search: '' },
    _selected: new Set(),
    _n8nUrl: '',

    async init() {
        this._n8nUrl = localStorage.getItem('n8n_url') || '';
        await this.fetchData();
    },

    async fetchData() {
        try {
            const [leadsRes, statsRes] = await Promise.all([
                fetch('/api/n8n/leads').then(r => r.json()),
                fetch('/api/n8n/stats').then(r => r.json())
            ]);
            this._leads = leadsRes.leads || [];
            this._stats = statsRes || {};
        } catch (e) {
            console.error('N8nHub fetch error:', e);
            this._leads = [];
            this._stats = {};
        }
    },

    render() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            ${this._renderHeader()}
            ${this._renderKPIs()}
            ${this._renderTabs()}
        `;
    },

    // ════════════════════════════════════════════════
    //  HEADER
    // ════════════════════════════════════════════════
    _renderHeader() {
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <div>
                    <div style="display:flex; align-items:center; gap:14px; margin-bottom:8px;">
                        <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #ff6d00, #ff9100); display:flex; align-items:center; justify-content:center; color:white; font-size:20px; box-shadow:0 8px 24px rgba(255,109,0,0.3);">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div>
                            <h2 style="font-size:26px; font-weight:900; letter-spacing:-1px; margin:0; background:linear-gradient(90deg, var(--text-primary), #ff6d00); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">n8n Automation Hub</h2>
                            <p style="color:var(--text-muted); font-size:12px; margin:3px 0 0; font-weight:500;">Lead scraping, scoring & multi-channel outreach engine</p>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="N8nHub.openSettings()" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:700;">
                        <i class="fa-solid fa-gear" style="margin-right:5px;"></i> n8n Config
                    </button>
                    <button class="btn-secondary" onclick="N8nHub.openN8nDashboard()" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:700;">
                        <i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:5px;"></i> Open n8n
                    </button>
                    <button class="btn-secondary" onclick="N8nHub.triggerScraper()" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:700; background:linear-gradient(135deg, rgba(23,198,83,0.1), rgba(23,198,83,0.05)); color:#17c653; border-color:rgba(23,198,83,0.3);">
                        <i class="fa-solid fa-spider" style="margin-right:5px;"></i> Run Scraper
                    </button>
                    <button class="btn-primary" onclick="N8nHub.openAddLead()" style="border-radius:12px; padding:0 22px; height:40px; font-size:12px; font-weight:800; box-shadow:0 8px 20px rgba(255,109,0,0.3); background:linear-gradient(135deg, #ff6d00, #ff9100);">
                        <i class="fa-solid fa-plus" style="margin-right:5px;"></i> Add Lead
                    </button>
                </div>
            </div>
        `;
    },

    // ════════════════════════════════════════════════
    //  KPI RIBBON
    // ════════════════════════════════════════════════
    _renderKPIs() {
        const s = this._stats || {};
        const kpis = [
            { label: 'Total Leads', value: s.total_leads || 0, icon: 'fa-users', color: '#009ef7', sub: 'All sources' },
            { label: 'Qualified', value: s.qualified || 0, icon: 'fa-star', color: '#ff6d00', sub: `Score ≥ 30 (avg: ${Math.round(s.avg_score || 0)})` },
            { label: 'Contacted', value: s.contacted || 0, icon: 'fa-paper-plane', color: '#17c653', sub: 'Emails sent' },
            { label: 'Converted', value: s.converted || 0, icon: 'fa-trophy', color: '#8a2be2', sub: `${s.total_leads > 0 ? Math.round((s.converted || 0) / s.total_leads * 100) : 0}% rate` }
        ];

        return `
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:18px; margin-bottom:28px;">
                ${kpis.map(k => `
                    <div style="padding:22px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border-radius:18px; border:1px solid ${k.color}22; position:relative; overflow:hidden; transition:all 0.3s;" onmouseover="this.style.borderColor='${k.color}55'; this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='${k.color}22'; this.style.transform='translateY(0)'">
                        <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:${k.color}; filter:blur(40px); opacity:0.12;"></div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                            <div style="width:32px; height:32px; border-radius:10px; background:${k.color}18; display:flex; align-items:center; justify-content:center;"><i class="fa-solid ${k.icon}" style="font-size:13px; color:${k.color};"></i></div>
                            <span style="font-size:10px; font-weight:800; color:${k.color}; text-transform:uppercase; letter-spacing:1.5px;">${k.label}</span>
                        </div>
                        <div style="font-size:28px; font-weight:900; letter-spacing:-1px; color:var(--text-primary);">${(k.value || 0).toLocaleString()}</div>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:6px; font-weight:600;">${k.sub}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Source Breakdown -->
            <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; margin-bottom:25px;">
                ${[
                    { label: 'Google Maps', val: s.from_google_maps || 0, icon: 'fa-map-location-dot', color: '#ea4335' },
                    { label: 'LinkedIn', val: s.from_linkedin || 0, icon: 'fa-linkedin', color: '#0077b5', brand: true },
                    { label: 'Directories', val: s.from_directory || 0, icon: 'fa-folder-open', color: '#f6c000' },
                    { label: 'Competitors', val: s.from_competitor || 0, icon: 'fa-crosshairs', color: '#f1416c' },
                    { label: 'Lead Magnet', val: s.from_lead_magnet || 0, icon: 'fa-magnet', color: '#8a2be2' }
                ].map(s => `
                    <div style="padding:14px; background:rgba(255,255,255,0.01); border-radius:14px; border:1px solid var(--border); text-align:center; transition:all 0.2s;" onmouseover="this.style.borderColor='${s.color}44'" onmouseout="this.style.borderColor='var(--border)'">
                        <i class="${s.brand ? 'fa-brands' : 'fa-solid'} ${s.icon}" style="font-size:16px; color:${s.color}; margin-bottom:6px; display:block;"></i>
                        <div style="font-size:16px; font-weight:800; color:var(--text-primary);">${s.val}</div>
                        <div style="font-size:9px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:2px;">${s.label}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ════════════════════════════════════════════════
    //  LEADS TABLE
    // ════════════════════════════════════════════════
    _renderTabs() {
        let leads = [...this._leads];

        // Apply filters
        if (this._filter.status !== 'all') leads = leads.filter(l => l.status === this._filter.status);
        if (this._filter.source !== 'all') leads = leads.filter(l => l.source === this._filter.source);
        if (this._filter.search) {
            const q = this._filter.search.toLowerCase();
            leads = leads.filter(l =>
                (l.name || '').toLowerCase().includes(q) ||
                (l.email || '').toLowerCase().includes(q) ||
                (l.company || '').toLowerCase().includes(q)
            );
        }

        return `
            <!-- Filter Bar -->
            <div style="padding:16px 20px; margin-bottom:22px; display:flex; gap:14px; align-items:center; background:rgba(255,255,255,0.015); backdrop-filter:blur(10px); border:1px solid var(--border); border-radius:14px;">
                <div style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px;"><i class="fa-solid fa-sliders" style="margin-right:5px; color:#ff6d00;"></i>Filters</div>
                <div class="select-wrap" style="width:140px;">
                    <select class="form-control" style="height:38px !important; border-radius:10px; font-size:12px;" onchange="N8nHub.setFilter('status', this.value)">
                        <option value="all" ${this._filter.status === 'all' ? 'selected' : ''}>All Status</option>
                        <option value="new" ${this._filter.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="qualified" ${this._filter.status === 'qualified' ? 'selected' : ''}>Qualified</option>
                        <option value="contacted" ${this._filter.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="converted" ${this._filter.status === 'converted' ? 'selected' : ''}>Converted</option>
                        <option value="rejected" ${this._filter.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                <div class="select-wrap" style="width:150px;">
                    <select class="form-control" style="height:38px !important; border-radius:10px; font-size:12px;" onchange="N8nHub.setFilter('source', this.value)">
                        <option value="all" ${this._filter.source === 'all' ? 'selected' : ''}>All Sources</option>
                        <option value="google_maps" ${this._filter.source === 'google_maps' ? 'selected' : ''}>Google Maps</option>
                        <option value="linkedin" ${this._filter.source === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                        <option value="directory" ${this._filter.source === 'directory' ? 'selected' : ''}>Directory</option>
                        <option value="competitor" ${this._filter.source === 'competitor' ? 'selected' : ''}>Competitor</option>
                        <option value="lead_magnet" ${this._filter.source === 'lead_magnet' ? 'selected' : ''}>Lead Magnet</option>
                        <option value="manual" ${this._filter.source === 'manual' ? 'selected' : ''}>Manual</option>
                        <option value="n8n_scraper" ${this._filter.source === 'n8n_scraper' ? 'selected' : ''}>n8n Scraper</option>
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                <div style="position:relative; flex:1;">
                    <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:11px; font-size:11px; color:var(--text-muted);"></i>
                    <input type="text" class="form-control" placeholder="Search leads..." value="${this._filter.search}" oninput="N8nHub.setFilter('search', this.value)" style="padding-left:32px; height:38px !important; border-radius:10px; font-size:12px;">
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-social" onclick="N8nHub.exportQualified()" style="border-radius:10px; font-size:11px; font-weight:700; color:#17c653; border-color:rgba(23,198,83,0.3);"><i class="fa-solid fa-paper-plane" style="margin-right:4px;"></i>Send to Queue</button>
                    <button class="btn-social" onclick="N8nHub.refreshData()" style="border-radius:10px; font-size:11px; font-weight:700;"><i class="fa-solid fa-arrows-rotate" style="margin-right:4px;"></i>Refresh</button>
                </div>
            </div>

            <!-- Data Table -->
            <div style="border-radius:16px; overflow:hidden; border:1px solid var(--border); background:rgba(255,255,255,0.01);">
                <table class="data-table" style="margin:0;">
                    <thead>
                        <tr>
                            <th style="width:40px;"><input type="checkbox" onchange="N8nHub.toggleSelectAll(this.checked)" /></th>
                            <th>Lead</th>
                            <th>Company</th>
                            <th>Source</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Added</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leads.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding:60px 20px; color:var(--text-muted);"><i class="fa-solid fa-robot" style="font-size:28px; display:block; margin-bottom:14px; opacity:0.3;"></i>No leads yet. Run a scraper workflow or add leads manually.</td></tr>` : ''}
                        ${leads.map(l => this._renderLeadRow(l)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Legend -->
            <div style="margin-top:20px; padding:16px 20px; background:rgba(255,109,0,0.03); border:1px dashed rgba(255,109,0,0.2); border-radius:14px;">
                <div style="display:flex; gap:16px; align-items:center; font-size:11px; color:var(--text-muted);">
                    <span><i class="fa-solid fa-star" style="color:#ff6d00; margin-right:4px;"></i> <b>Score ≥ 30</b> = Qualified for outreach</span>
                    <span>|</span>
                    <span><b>+10</b> Company</span>
                    <span><b>+10</b> Phone</span>
                    <span><b>+20</b> Business email</span>
                    <span><b>+5</b> Website</span>
                    <span><b>+5</b> Country</span>
                    <span><b>+10</b> Travel keyword</span>
                </div>
            </div>
        `;
    },

    _renderLeadRow(l) {
        const scoreColor = l.score >= 50 ? '#17c653' : l.score >= 30 ? '#ff6d00' : '#f1416c';
        const statusColors = {
            'new': '#009ef7', 'qualified': '#ff6d00', 'contacted': '#17c653',
            'converted': '#8a2be2', 'rejected': '#f1416c'
        };
        const sourceIcons = {
            'google_maps': 'fa-map-location-dot', 'linkedin': 'fa-linkedin',
            'directory': 'fa-folder-open', 'competitor': 'fa-crosshairs',
            'lead_magnet': 'fa-magnet', 'manual': 'fa-hand', 'n8n_scraper': 'fa-robot'
        };
        const sourceColors = {
            'google_maps': '#ea4335', 'linkedin': '#0077b5', 'directory': '#f6c000',
            'competitor': '#f1416c', 'lead_magnet': '#8a2be2', 'manual': '#6b7280', 'n8n_scraper': '#ff6d00'
        };
        const isBrand = l.source === 'linkedin';
        const ago = this._timeAgo(l.created_at);

        return `
            <tr style="transition:background 0.2s;" onmouseover="this.style.background='rgba(255,109,0,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="width:40px; text-align:center;"><input type="checkbox" data-id="${l.id}" onchange="N8nHub.toggleSelect(${l.id}, this.checked)" ${this._selected.has(l.id) ? 'checked' : ''} /></td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, ${scoreColor}22, ${scoreColor}08); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:11px; font-weight:800; color:${scoreColor};">
                            ${(l.name || 'N')[0].toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:700; font-size:13px; color:var(--text-primary); line-height:1.2;">${l.name || '—'}</div>
                            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${l.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size:12px; font-weight:600; color:var(--text-primary);">${l.company || '—'}</div>
                    ${l.country ? `<div style="font-size:10px; color:var(--text-muted);">${l.country}</div>` : ''}
                </td>
                <td><span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:8px; background:${sourceColors[l.source] || '#6b7280'}12; color:${sourceColors[l.source] || '#6b7280'}; font-size:10px; font-weight:700;"><i class="${isBrand ? 'fa-brands' : 'fa-solid'} ${sourceIcons[l.source] || 'fa-globe'}"></i> ${(l.source || 'unknown').replace(/_/g, ' ')}</span></td>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <div style="width:36px; height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
                            <div style="width:${Math.min(l.score, 100)}%; height:100%; background:${scoreColor}; border-radius:3px;"></div>
                        </div>
                        <span style="font-size:12px; font-weight:800; color:${scoreColor};">${l.score}</span>
                    </div>
                </td>
                <td><span class="status-badge" style="background:${statusColors[l.status] || '#6b7280'}18; color:${statusColors[l.status] || '#6b7280'}; font-size:10px; font-weight:800; letter-spacing:0.5px; padding:4px 10px; border-radius:8px;">${(l.status || 'new').toUpperCase()}</span></td>
                <td style="font-size:11px; color:var(--text-muted);">${ago}</td>
                <td style="text-align:right;">
                    <div class="action-btns" style="gap:6px;">
                        <button class="action-btn-label action-btn-label--view" onclick="N8nHub.viewLead(${l.id})" style="border-radius:8px; font-size:11px;"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn-label action-btn-label--edit" onclick="N8nHub.editLead(${l.id})" style="border-radius:8px; font-size:11px;"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn-label action-btn-label--delete" onclick="N8nHub.deleteLead(${l.id})" style="border-radius:8px; font-size:11px;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    },

    // ════════════════════════════════════════════════
    //  ACTIONS
    // ════════════════════════════════════════════════

    setFilter(key, value) {
        this._filter[key] = value;
        this.render();
    },

    toggleSelect(id, checked) {
        if (checked) this._selected.add(id);
        else this._selected.delete(id);
    },

    toggleSelectAll(checked) {
        this._selected = new Set();
        if (checked) this._leads.forEach(l => this._selected.add(l.id));
        document.querySelectorAll('input[data-id]').forEach(cb => cb.checked = checked);
    },

    async refreshData() {
        UI.showToast('Refreshing...', 'info');
        await this.fetchData();
        this.render();
        UI.showToast('Data refreshed ✓', 'success');
    },

    viewLead(id) {
        const l = this._leads.find(x => x.id === id);
        if (!l) return;

        Modal.open({
            title: `<div style="display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-user" style="color:#ff6d00;"></i> Lead Details</div>`,
            size: 'md',
            body: `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group"><label>Name</label><div class="form-control" style="height:auto; padding:10px;">${l.name || '—'}</div></div>
                    <div class="form-group"><label>Email</label><div class="form-control" style="height:auto; padding:10px;">${l.email}</div></div>
                    <div class="form-group"><label>Company</label><div class="form-control" style="height:auto; padding:10px;">${l.company || '—'}</div></div>
                    <div class="form-group"><label>Phone</label><div class="form-control" style="height:auto; padding:10px;">${l.phone || '—'}</div></div>
                    <div class="form-group"><label>Country</label><div class="form-control" style="height:auto; padding:10px;">${l.country || '—'}</div></div>
                    <div class="form-group"><label>Website</label><div class="form-control" style="height:auto; padding:10px;">${l.website ? `<a href="${l.website}" target="_blank" style="color:#009ef7;">${l.website}</a>` : '—'}</div></div>
                    <div class="form-group"><label>Source</label><div class="form-control" style="height:auto; padding:10px;">${l.source}</div></div>
                    <div class="form-group"><label>Score</label><div class="form-control" style="height:auto; padding:10px; font-weight:800; font-size:18px; color:${l.score >= 30 ? '#17c653' : '#f1416c'};">${l.score}/100</div></div>
                </div>
                ${l.notes ? `<div class="form-group" style="margin-top:16px;"><label>Notes</label><div class="form-control" style="height:auto; padding:10px; min-height:60px;">${l.notes}</div></div>` : ''}
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Close</button>
                <button class="btn-primary" onclick="N8nHub.editLead(${l.id}); Modal.close();" style="background:linear-gradient(135deg, #ff6d00, #ff9100);"><i class="fa-solid fa-pen" style="margin-right:5px;"></i> Edit</button>
            `
        });
    },

    editLead(id) {
        const l = this._leads.find(x => x.id === id) || {};
        const isNew = !id;

        Modal.open({
            title: `<i class="fa-solid ${isNew ? 'fa-plus' : 'fa-pen'}" style="color:#ff6d00; margin-right:8px;"></i> ${isNew ? 'Add Lead' : 'Edit Lead'}`,
            size: 'md',
            body: `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group"><label>Name</label><input type="text" id="n8n_name" class="form-control" value="${l.name || ''}" placeholder="Full Name"></div>
                    <div class="form-group"><label>Email *</label><input type="email" id="n8n_email" class="form-control" value="${l.email || ''}" placeholder="email@example.com"></div>
                    <div class="form-group"><label>Company</label><input type="text" id="n8n_company" class="form-control" value="${l.company || ''}" placeholder="Company name"></div>
                    <div class="form-group"><label>Phone</label><input type="text" id="n8n_phone" class="form-control" value="${l.phone || ''}" placeholder="+1234567890"></div>
                    <div class="form-group"><label>Country</label><input type="text" id="n8n_country" class="form-control" value="${l.country || ''}" placeholder="Country"></div>
                    <div class="form-group"><label>Website</label><input type="text" id="n8n_website" class="form-control" value="${l.website || ''}" placeholder="https://..."></div>
                    <div class="form-group">
                        <label>Source</label>
                        <div class="select-wrap">
                            <select id="n8n_source" class="form-control">
                                <option value="manual" ${l.source === 'manual' ? 'selected' : ''}>Manual</option>
                                <option value="google_maps" ${l.source === 'google_maps' ? 'selected' : ''}>Google Maps</option>
                                <option value="linkedin" ${l.source === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                                <option value="directory" ${l.source === 'directory' ? 'selected' : ''}>Directory</option>
                                <option value="competitor" ${l.source === 'competitor' ? 'selected' : ''}>Competitor</option>
                                <option value="lead_magnet" ${l.source === 'lead_magnet' ? 'selected' : ''}>Lead Magnet</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <div class="select-wrap">
                            <select id="n8n_status" class="form-control">
                                <option value="new" ${l.status === 'new' ? 'selected' : ''}>New</option>
                                <option value="qualified" ${l.status === 'qualified' ? 'selected' : ''}>Qualified</option>
                                <option value="contacted" ${l.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                                <option value="converted" ${l.status === 'converted' ? 'selected' : ''}>Converted</option>
                                <option value="rejected" ${l.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                </div>
                <div class="form-group" style="margin-top:16px;"><label>Notes</label><textarea id="n8n_notes" class="form-control" rows="3" placeholder="Optional notes...">${l.notes || ''}</textarea></div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="N8nHub.saveLead(${id || 'null'})" style="background:linear-gradient(135deg, #ff6d00, #ff9100);"><i class="fa-solid fa-check" style="margin-right:5px;"></i> ${isNew ? 'Add' : 'Save'}</button>
            `
        });
    },

    openAddLead() {
        this.editLead(null);
    },

    async saveLead(id) {
        const data = {
            name: document.getElementById('n8n_name')?.value?.trim() || '',
            email: document.getElementById('n8n_email')?.value?.trim() || '',
            company: document.getElementById('n8n_company')?.value?.trim() || '',
            phone: document.getElementById('n8n_phone')?.value?.trim() || '',
            country: document.getElementById('n8n_country')?.value?.trim() || '',
            website: document.getElementById('n8n_website')?.value?.trim() || '',
            source: document.getElementById('n8n_source')?.value || 'manual',
            status: document.getElementById('n8n_status')?.value || 'new',
            notes: document.getElementById('n8n_notes')?.value?.trim() || ''
        };

        if (!data.email) return UI.showToast('Email is required', 'error');

        try {
            const res = await fetch('/api/n8n/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!json.ok && json.message) throw new Error(json.message);
            Modal.close();
            UI.showToast(id ? 'Lead updated ✓' : 'Lead added ✓', 'success');
            await this.fetchData();
            this.render();
        } catch (e) {
            UI.showToast('Error: ' + e.message, 'error');
        }
    },

    deleteLead(id) {
        UI.confirm('Delete Lead', 'Permanently delete this lead?', async () => {
            try {
                await fetch(`/api/n8n/leads/${id}`, { method: 'DELETE' });
                UI.showToast('Lead deleted', 'success');
                await this.fetchData();
                this.render();
            } catch (e) {
                UI.showToast('Error: ' + e.message, 'error');
            }
        }, 'danger');
    },

    async exportQualified() {
        const ids = this._selected.size > 0 ? Array.from(this._selected) : null;

        Modal.open({
            title: '<i class="fa-solid fa-paper-plane" style="color:#17c653; margin-right:8px;"></i> Send to Email Queue',
            size: 'md',
            body: `
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">
                    ${ids ? `Send campaign to <b>${ids.length}</b> selected lead(s).` : 'Send campaign to all <b>qualified leads</b> (score ≥ 30).'}
                </p>
                <div class="form-group"><label>Subject Line</label><input type="text" id="n8n_exp_subject" class="form-control" placeholder="e.g. Exclusive Morocco DMC Partnership"></div>
                <div class="form-group"><label>HTML Body</label><textarea id="n8n_exp_html" class="form-control" rows="6" placeholder="<h1>Hello {{name}}</h1>..."></textarea></div>
                <div style="padding:12px; background:rgba(23,198,83,0.05); border-radius:10px; border:1px solid rgba(23,198,83,0.2); margin-top:12px;">
                    <div style="font-size:11px; color:#17c653; font-weight:700;"><i class="fa-solid fa-shield-halved" style="margin-right:5px;"></i> Anti-spam: 2–5s delay • max 100/day • unsubscribe included</div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="N8nHub._doExport()" style="background:linear-gradient(135deg, #17c653, #0dbf47);"><i class="fa-solid fa-bolt" style="margin-right:5px;"></i> Queue Emails</button>
            `
        });
    },

    async _doExport() {
        const subject = document.getElementById('n8n_exp_subject')?.value?.trim();
        const html = document.getElementById('n8n_exp_html')?.value?.trim();
        if (!subject || !html) return UI.showToast('Subject and body are required', 'error');

        const ids = this._selected.size > 0 ? Array.from(this._selected) : undefined;

        try {
            const res = await fetch('/api/n8n/leads/export-to-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, html, ids, min_score: 30 })
            });
            const json = await res.json();
            Modal.close();
            UI.showToast(`${json.queued} emails queued ✓ (${json.filtered || 0} filtered)`, 'success');
            await this.fetchData();
            this.render();
        } catch (e) {
            UI.showToast('Error: ' + e.message, 'error');
        }
    },

    // ════════════════════════════════════════════════
    //  SCRAPER TRIGGER
    // ════════════════════════════════════════════════

    triggerScraper() {
        const url = this._n8nUrl || localStorage.getItem('n8n_url') || '';

        Modal.open({
            title: '<i class="fa-solid fa-spider" style="color:#ff6d00; margin-right:8px;"></i> Trigger n8n Scraper',
            size: 'md',
            body: `
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">Send a keyword to your n8n lead scraper workflow.</p>
                <div class="form-group">
                    <label>n8n Webhook URL</label>
                    <input type="text" id="n8n_scraper_url" class="form-control" placeholder="https://your-n8n.domain/webhook/lead-scraper" value="${url ? url + '/webhook/lead-scraper' : ''}">
                </div>
                <div class="form-group">
                    <label>Search Keywords</label>
                    <input type="text" id="n8n_scraper_keyword" class="form-control" placeholder="tour operator morocco, DMC marrakech">
                </div>
                <div class="form-group">
                    <label>Source Type</label>
                    <div class="select-wrap">
                        <select id="n8n_scraper_source" class="form-control">
                            <option value="google_maps">Google Maps</option>
                            <option value="directory">Travel Directory</option>
                            <option value="competitor">Competitor Website</option>
                        </select>
                        <i class="fa-solid fa-chevron-down caret"></i>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="N8nHub._fireScraper()" style="background:linear-gradient(135deg, #ff6d00, #ff9100);"><i class="fa-solid fa-play" style="margin-right:5px;"></i> Run Workflow</button>
            `
        });
    },

    async _fireScraper() {
        const url = document.getElementById('n8n_scraper_url')?.value?.trim();
        const keyword = document.getElementById('n8n_scraper_keyword')?.value?.trim();
        const source = document.getElementById('n8n_scraper_source')?.value;

        if (!url) return UI.showToast('Webhook URL required', 'error');
        if (!keyword) return UI.showToast('Keywords required', 'error');

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, source, callback: window.location.origin + '/api/n8n/leads' })
            });
            if (res.ok) {
                UI.showToast('Scraper workflow triggered ✓', 'success');
            } else {
                UI.showToast('Webhook returned ' + res.status, 'error');
            }
            Modal.close();
        } catch (e) {
            UI.showToast('Failed to reach n8n: ' + e.message, 'error');
        }
    },

    // ════════════════════════════════════════════════
    //  SETTINGS
    // ════════════════════════════════════════════════

    openSettings() {
        const url = localStorage.getItem('n8n_url') || '';

        Modal.open({
            title: '<i class="fa-solid fa-gear" style="color:#ff6d00; margin-right:8px;"></i> n8n Configuration',
            size: 'md',
            body: `
                <div class="form-group">
                    <label>n8n Instance URL</label>
                    <input type="text" id="n8n_config_url" class="form-control" value="${url}" placeholder="https://n8n.your-domain.com">
                    <small style="color:var(--text-muted); font-size:11px; margin-top:6px; display:block;">Your self-hosted n8n URL (Dokploy VPS). Used to trigger workflows and open the dashboard.</small>
                </div>
                <div style="margin-top:20px; padding:16px; background:rgba(255,255,255,0.015); border:1px solid var(--border); border-radius:14px;">
                    <h4 style="font-size:12px; font-weight:800; margin-bottom:12px; color:var(--text-primary);">Webhook Endpoints (for n8n HTTP Request nodes)</h4>
                    <div style="font-size:11px; color:var(--text-secondary); line-height:2;">
                        <div><code style="padding:2px 8px; background:rgba(255,255,255,0.05); border-radius:6px;">POST ${window.location.origin}/api/n8n/leads</code> — Receive scraped leads</div>
                        <div><code style="padding:2px 8px; background:rgba(255,255,255,0.05); border-radius:6px;">POST ${window.location.origin}/api/n8n/update</code> — Update lead status</div>
                        <div><code style="padding:2px 8px; background:rgba(255,255,255,0.05); border-radius:6px;">GET  ${window.location.origin}/api/n8n/leads/qualified</code> — Fetch qualified leads</div>
                        <div><code style="padding:2px 8px; background:rgba(255,255,255,0.05); border-radius:6px;">GET  ${window.location.origin}/api/n8n/stats</code> — Dashboard stats</div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="N8nHub._saveSettings()" style="background:linear-gradient(135deg, #ff6d00, #ff9100);"><i class="fa-solid fa-check" style="margin-right:5px;"></i> Save</button>
            `
        });
    },

    _saveSettings() {
        const url = document.getElementById('n8n_config_url')?.value?.trim() || '';
        localStorage.setItem('n8n_url', url);
        this._n8nUrl = url;
        Modal.close();
        UI.showToast('n8n config saved ✓', 'success');
    },

    openN8nDashboard() {
        const url = this._n8nUrl || localStorage.getItem('n8n_url');
        if (!url) return this.openSettings();
        window.open(url, '_blank');
    },

    // ════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════

    _timeAgo(dateStr) {
        if (!dateStr) return '—';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    }
};

window.N8nHub = N8nHub;
