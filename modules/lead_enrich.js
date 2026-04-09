// Lead Enrichment Module — Lead Tools Pack V1
// Renders into #mainContent, uses store + server API

const LeadEnrich = {
    _jobs: [],
    _selectedIds: new Set(),
    _pollTimer: null,
    _leads: [],
    _lastJobResults: [],
    _viewMode: 'leads', // leads | jobs | results

    render() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        this._leads = this._getAllLeads();
        content.innerHTML = this._template();
        this._bind();
        this._fetchJobs();
    },

    _getAllLeads() {
        const b2b = (store.state.b2bClients || []).map(c => ({ ...c, _source: 'b2b' }));
        const b2c = (store.state.b2cClients || []).map(c => ({ ...c, _source: 'b2c' }));
        return [...b2b, ...b2c];
    },

    _template() {
        return `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:24px; font-weight:800; letter-spacing:-1px; margin-bottom:5px;">
            <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary); margin-right:8px;"></i>Lead Enrichment
          </h2>
          <p style="color:var(--text-secondary); font-size:13px;">Auto-fill & improve lead quality using rules engine + website scraping.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" id="leEnrichSelected" style="height:38px; padding:0 18px;" disabled>
            <i class="fa-solid fa-wand-sparkles"></i> Enrich Selected
          </button>
          <button class="btn-primary" id="leEnrichAll" style="height:38px; padding:0 18px;">
            <i class="fa-solid fa-rocket"></i> Enrich All
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex; gap:25px; border-bottom:1px solid var(--border); padding:0 10px;">
        ${this._tab('leads', 'fa-solid fa-users', 'Leads')}
        ${this._tab('jobs', 'fa-solid fa-list-check', 'Jobs History')}
      </div>

      <!-- KPI Cards -->
      <div style="display:grid; grid-template-columns: repeat(4,1fr); gap:15px;" id="leKpiRow">
        ${this._kpi('Total Leads', this._leads.length, 'fa-solid fa-database', '99,102,241')}
        ${this._kpi('With Website', this._leads.filter(l => l.website).length, 'fa-solid fa-globe', '0,158,247')}
        ${this._kpi('With Email', this._leads.filter(l => l.email).length, 'fa-solid fa-envelope', '23,198,83')}
        ${this._kpi('Enriched', 0, 'fa-solid fa-check-double', '246,192,0', 'leKpiEnriched')}
      </div>

      <!-- Content Area -->
      <div class="card p-0" style="overflow:hidden; border:1px solid var(--border);">
        <div id="leContent">${this._viewMode === 'leads' ? this._leadsTable() : this._jobsView()}</div>
      </div>
    </div>`;
    },

    _tab(mode, icon, label) {
        const active = this._viewMode === mode;
        return `<button class="le-tab" data-mode="${mode}" style="padding:12px 5px; background:none; border:none; color:${active ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; display:flex; align-items:center; gap:8px;">
      <i class="${icon}"></i> ${label}
      ${active ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px rgba(99,102,241,0.5);"></div>' : ''}
    </button>`;
    },

    _kpi(label, value, icon, rgb, id = '') {
        return `<div class="card p-4" style="background:linear-gradient(135deg, rgba(${rgb},0.08), rgba(${rgb},0.02)); border:1px solid rgba(${rgb},0.12);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <span style="font-size:10px; color:rgba(${rgb},1); text-transform:uppercase; font-weight:800; letter-spacing:1px;">${label}</span>
          <h3 ${id ? `id="${id}"` : ''} style="font-size:24px; font-weight:800; margin-top:8px; letter-spacing:-1px;">${value}</h3>
        </div>
        <div style="width:40px; height:40px; background:rgba(${rgb},0.12); border-radius:10px; display:flex; align-items:center; justify-content:center;">
          <i class="${icon}" style="color:rgba(${rgb},1); font-size:18px;"></i>
        </div>
      </div>
    </div>`;
    },

    _statusChip(status) {
        const colors = { queued: '#6366f1', running: '#f59e0b', done: '#22c55e', failed: '#ef4444', stopped: '#6b7280' };
        const color = colors[status] || '#6b7280';
        return `<span style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; background:${color}18; color:${color}; border:1px solid ${color}30;">
      <span style="width:6px; height:6px; border-radius:50%; background:${color}; ${status === 'running' ? 'animation:pulse 1.5s infinite;' : ''}"></span>
      ${status}
    </span>`;
    },

    _leadsTable() {
        if (!this._leads.length) {
            return `<div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
        <i class="fa-solid fa-inbox" style="font-size:48px; margin-bottom:15px; opacity:0.3;"></i>
        <h3 style="font-weight:700; margin-bottom:8px;">No Leads Found</h3>
        <p style="font-size:13px;">Add B2B/B2C clients first, then come back to enrich them.</p>
      </div>`;
        }

        const rows = this._leads.map((l, i) => {
            const id = l.id || l._id || i;
            const checked = this._selectedIds.has(String(id)) ? 'checked' : '';
            const enrichedAt = l._enrichedAt ? `<span style="font-size:11px; color:var(--text-muted);">${new Date(l._enrichedAt).toLocaleDateString()}</span>` : '<span style="font-size:11px; color:var(--text-muted);">—</span>';
            return `<tr style="border-bottom:1px solid var(--border); transition:background 0.15s;" onmouseenter="this.style.background='rgba(99,102,241,0.03)'" onmouseleave="this.style.background=''">
        <td style="padding:12px 15px;"><input type="checkbox" class="le-check" data-id="${id}" ${checked}></td>
        <td style="padding:12px 10px; font-weight:600; font-size:13px;">${this._esc(l.company || l.companyName || l.name || '—')}</td>
        <td style="padding:12px 10px; font-size:12px; color:var(--primary);">${l.website ? `<a href="${this._esc(l.website)}" target="_blank" style="color:var(--primary); text-decoration:none;">${this._esc(l.website).substring(0, 35)}</a>` : '—'}</td>
        <td style="padding:12px 10px; font-size:12px;">${this._esc(l.country || '—')}</td>
        <td style="padding:12px 10px; font-size:12px;">${this._esc(l.email || '—')}</td>
        <td style="padding:12px 10px; font-size:12px;">${this._esc(l.phone || '—')}</td>
        <td style="padding:12px 10px;">${l._source === 'b2b' ? '<span style="padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; background:rgba(99,102,241,0.1); color:#6366f1;">B2B</span>' : '<span style="padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; background:rgba(236,72,153,0.1); color:#ec4899;">B2C</span>'}</td>
        <td style="padding:12px 10px;">${enrichedAt}</td>
      </tr>`;
        }).join('');

        return `<div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(0,0,0,0.02); border-bottom:2px solid var(--border);">
            <th style="padding:12px 15px; text-align:left; width:40px;"><input type="checkbox" id="leSelectAll"></th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Company</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Website</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Country</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Email</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Phone</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Type</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">Enriched</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    },

    _jobsView() {
        if (!this._jobs.length) {
            return `<div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
        <i class="fa-solid fa-clock-rotate-left" style="font-size:48px; margin-bottom:15px; opacity:0.3;"></i>
        <h3 style="font-weight:700; margin-bottom:8px;">No Jobs Yet</h3>
        <p style="font-size:13px;">Start an enrichment job to see progress here.</p>
      </div>`;
        }

        const rows = this._jobs.map(j => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:12px 15px; font-weight:600;">#${j.id}</td>
        <td style="padding:12px 10px;">${this._statusChip(j.status)}</td>
        <td style="padding:12px 10px; font-size:13px;">${j.mode || '—'}</td>
        <td style="padding:12px 10px; font-size:13px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="flex:1; height:6px; background:rgba(0,0,0,0.1); border-radius:3px; overflow:hidden;">
              <div style="width:${j.total > 0 ? Math.round((j.processed / j.total) * 100) : 0}%; height:100%; background:var(--primary); border-radius:3px; transition:width 0.5s;"></div>
            </div>
            <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${j.processed}/${j.total}</span>
          </div>
        </td>
        <td style="padding:12px 10px; font-size:11px; color:var(--text-muted);">${j.created_at ? new Date(j.created_at).toLocaleString() : '—'}</td>
        <td style="padding:12px 10px;">
          ${j.status === 'running' ? `<button class="btn-secondary le-stop-job" data-id="${j.id}" style="height:28px; padding:0 12px; font-size:11px;"><i class="fa-solid fa-stop"></i> Stop</button>` : ''}
          <button class="btn-secondary le-view-job" data-id="${j.id}" style="height:28px; padding:0 12px; font-size:11px;"><i class="fa-solid fa-eye"></i></button>
        </td>
      </tr>
    `).join('');

        return `<div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(0,0,0,0.02); border-bottom:2px solid var(--border);">
            <th style="padding:12px 15px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">ID</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Status</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Mode</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Progress</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Started</th>
            <th style="padding:12px 10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    },

    _bind() {
        // Tabs
        document.querySelectorAll('.le-tab').forEach(btn => {
            btn.onclick = () => {
                this._viewMode = btn.dataset.mode;
                const c = document.getElementById('leContent');
                if (c) c.innerHTML = this._viewMode === 'leads' ? this._leadsTable() : this._jobsView();
                // Re-render tabs
                document.querySelectorAll('.le-tab').forEach(t => {
                    const isActive = t.dataset.mode === this._viewMode;
                    t.style.color = isActive ? 'var(--primary)' : 'var(--text-muted)';
                    const bar = t.querySelector('div');
                    if (!isActive && bar) bar.remove();
                    if (isActive && !t.querySelector('div')) {
                        const d = document.createElement('div');
                        d.style.cssText = 'position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px rgba(99,102,241,0.5);';
                        t.appendChild(d);
                    }
                });
                this._bindContentEvents();
            };
        });

        // Enrich buttons
        const enrichSelected = document.getElementById('leEnrichSelected');
        const enrichAll = document.getElementById('leEnrichAll');
        if (enrichSelected) enrichSelected.onclick = () => this._startEnrichment('selected');
        if (enrichAll) enrichAll.onclick = () => this._startEnrichment('all');

        this._bindContentEvents();
    },

    _bindContentEvents() {
        // Checkboxes
        document.querySelectorAll('.le-check').forEach(cb => {
            cb.onchange = () => {
                const id = cb.dataset.id;
                if (cb.checked) this._selectedIds.add(id);
                else this._selectedIds.delete(id);
                const btn = document.getElementById('leEnrichSelected');
                if (btn) btn.disabled = this._selectedIds.size === 0;
            };
        });
        const selectAll = document.getElementById('leSelectAll');
        if (selectAll) {
            selectAll.onchange = () => {
                document.querySelectorAll('.le-check').forEach(cb => {
                    cb.checked = selectAll.checked;
                    if (selectAll.checked) this._selectedIds.add(cb.dataset.id);
                    else this._selectedIds.delete(cb.dataset.id);
                });
                const btn = document.getElementById('leEnrichSelected');
                if (btn) btn.disabled = this._selectedIds.size === 0;
            };
        }
        // Stop / View job buttons
        document.querySelectorAll('.le-stop-job').forEach(btn => {
            btn.onclick = () => this._stopJob(btn.dataset.id);
        });
        document.querySelectorAll('.le-view-job').forEach(btn => {
            btn.onclick = () => this._viewJobResults(btn.dataset.id);
        });
    },

    async _fetchJobs() {
        try {
            const resp = await fetch('/api/leads/enrich/jobs');
            const data = await resp.json();
            if (data.ok) {
                this._jobs = data.jobs || [];
                const enriched = this._jobs.filter(j => j.status === 'done').reduce((sum, j) => sum + j.processed, 0);
                const el = document.getElementById('leKpiEnriched');
                if (el) el.textContent = enriched;
                // If any job is running, start polling
                if (this._jobs.some(j => j.status === 'running')) this._startPolling();
            }
        } catch (e) { console.error('Failed to fetch enrichment jobs:', e); }
    },

    _startPolling() {
        if (this._pollTimer) return;
        this._pollTimer = setInterval(async () => {
            await this._fetchJobs();
            if (this._viewMode === 'jobs') {
                const c = document.getElementById('leContent');
                if (c) { c.innerHTML = this._jobsView(); this._bindContentEvents(); }
            }
            // Stop polling if no running jobs
            if (!this._jobs.some(j => j.status === 'running')) {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
            }
        }, 2000);
    },

    async _startEnrichment(mode) {
        let leads;
        if (mode === 'selected') {
            leads = this._leads.filter(l => this._selectedIds.has(String(l.id || l._id)));
            if (!leads.length) { UI.showToast('Select leads first', 'warning'); return; }
        } else {
            leads = this._leads;
            if (!leads.length) { UI.showToast('No leads available', 'warning'); return; }
        }

        try {
            UI.showToast(`Starting enrichment for ${leads.length} leads...`, 'info');
            const resp = await fetch('/api/leads/enrich/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leads, mode })
            });
            const data = await resp.json();
            if (data.ok) {
                UI.showToast(`Job #${data.jobId} started`, 'success');
                this._viewMode = 'jobs';
                await this._fetchJobs();
                const c = document.getElementById('leContent');
                if (c) { c.innerHTML = this._jobsView(); this._bindContentEvents(); }
                this._startPolling();
            } else {
                UI.showToast(data.message || 'Failed to start', 'error');
            }
        } catch (e) {
            UI.showToast('Network error: ' + e.message, 'error');
        }
    },

    async _stopJob(jobId) {
        try {
            const resp = await fetch(`/api/leads/enrich/jobs/${jobId}/stop`, { method: 'POST' });
            const data = await resp.json();
            UI.showToast(data.ok ? 'Stop signal sent' : (data.message || 'Failed'), data.ok ? 'info' : 'error');
            await this._fetchJobs();
            const c = document.getElementById('leContent');
            if (c) { c.innerHTML = this._jobsView(); this._bindContentEvents(); }
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
    },

    async _viewJobResults(jobId) {
        try {
            const resp = await fetch(`/api/leads/enrich/jobs/${jobId}`);
            const data = await resp.json();
            if (!data.ok) { UI.showToast(data.message || 'Failed', 'error'); return; }

            const results = data.results || [];
            const rows = results.map(r => {
                let changes = '—';
                try {
                    const ch = JSON.parse(r.changes_json || '{}');
                    changes = Object.keys(ch).map(k => `<span style="padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(99,102,241,0.1); color:#6366f1; margin-right:4px;">${k}</span>`).join('') || '—';
                } catch (e) { }
                return `<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px; font-size:12px;">${this._esc(r.lead_id || '—')}</td>
          <td style="padding:10px;">${this._statusChip(r.status)}</td>
          <td style="padding:10px; font-size:12px;">${changes}</td>
          <td style="padding:10px; font-size:11px; color:var(--text-muted);">${this._esc(r.error || '')}</td>
        </tr>`;
            }).join('');

            Modal.open({
                title: `<i class="fa-solid fa-flask"></i> Job #${data.job.id} Results`,
                size: 'lg',
                fullscreen: true,
                body: `<div style="overflow:auto; max-height:70vh;">
          <div style="display:flex; gap:15px; margin-bottom:20px;">
            ${this._statusChip(data.job.status)}
            <span style="font-size:13px;">Processed: <b>${data.job.processed}</b>/${data.job.total}</span>
            <span style="font-size:13px; color:var(--danger);">Errors: <b>${data.job.errors}</b></span>
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:rgba(0,0,0,0.02); border-bottom:2px solid var(--border);">
              <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Lead ID</th>
              <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Status</th>
              <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Changes</th>
              <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted);">Error</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="4" style="padding:20px; text-align:center;">No results</td></tr>'}</tbody>
          </table>
        </div>`
            });
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
    },

    _esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
};
