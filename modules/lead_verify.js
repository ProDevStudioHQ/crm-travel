// Email Verify Module — Lead Tools Pack V1
const LeadVerify = {
    _results: [],
    _verifying: false,
    _mode: 'paste', // paste | leads

    render() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        content.innerHTML = this._template();
        this._bind();
        this._fetchResults();
    },

    _getAllLeads() {
        const b2b = (store.state.b2bClients || []).map(c => ({ ...c, _source: 'b2b' }));
        const b2c = (store.state.b2cClients || []).map(c => ({ ...c, _source: 'b2c' }));
        return [...b2b, ...b2c].filter(l => l.email);
    },

    _template() {
        return `<div style="display:flex; flex-direction:column; gap:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:24px; font-weight:800; letter-spacing:-1px; margin-bottom:5px;">
            <i class="fa-solid fa-envelope-circle-check" style="color:#22c55e; margin-right:8px;"></i>Email Verify
          </h2>
          <p style="color:var(--text-secondary); font-size:13px;">Validate emails with syntax, DNS & MX checks.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" id="evExport" style="height:38px; padding:0 18px;"><i class="fa-solid fa-download"></i> Export Invalid</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:15px;" id="evKpiRow">
        ${this._kpi('Checked', '—', 'fa-solid fa-envelope-open-text', '99,102,241', 'evKpiChecked')}
        ${this._kpi('Valid', '—', 'fa-solid fa-circle-check', '34,197,94', 'evKpiValid')}
        ${this._kpi('Invalid', '—', 'fa-solid fa-circle-xmark', '239,68,68', 'evKpiInvalid')}
        ${this._kpi('Risky', '—', 'fa-solid fa-triangle-exclamation', '245,158,11', 'evKpiRisky')}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="card p-4" style="border:1px solid var(--border);">
          <h4 style="font-size:13px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-paste" style="color:var(--primary); margin-right:6px;"></i>Paste Emails</h4>
          <textarea id="evPasteArea" rows="6" placeholder="Enter emails, one per line..." style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-card); color:var(--text-primary); font-size:13px; font-family:monospace; resize:vertical;"></textarea>
          <button class="btn-primary" id="evVerifyPaste" style="margin-top:12px; height:38px; padding:0 22px; width:100%;"><i class="fa-solid fa-check-double"></i> Verify Pasted Emails</button>
        </div>
        <div class="card p-4" style="border:1px solid var(--border);">
          <h4 style="font-size:13px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-users" style="color:#f59e0b; margin-right:6px;"></i>Verify from Leads (${this._getAllLeads().length})</h4>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Verify all emails from your B2B/B2C clients that have an email address.</p>
          <div style="max-height:140px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; padding:8px; margin-bottom:12px;">
            ${this._getAllLeads().slice(0, 20).map(l => `<div style="font-size:11px; padding:3px 0; color:var(--text-secondary);"><i class="fa-regular fa-envelope" style="margin-right:4px;"></i>${this._e(l.email)}</div>`).join('')}
            ${this._getAllLeads().length > 20 ? `<div style="font-size:11px; color:var(--text-muted); padding:5px 0;">... and ${this._getAllLeads().length - 20} more</div>` : ''}
            ${!this._getAllLeads().length ? '<div style="font-size:11px; color:var(--text-muted); padding:10px; text-align:center;">No leads with emails found</div>' : ''}
          </div>
          <button class="btn-primary" id="evVerifyLeads" style="height:38px; padding:0 22px; width:100%; background:#f59e0b; border-color:#f59e0b;" ${!this._getAllLeads().length ? 'disabled' : ''}>
            <i class="fa-solid fa-rocket"></i> Verify All Lead Emails
          </button>
        </div>
      </div>
      <div class="card p-0" style="overflow:hidden; border:1px solid var(--border);">
        <div style="padding:15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.02);">
          <h4 style="font-size:13px; font-weight:800; color:var(--text-muted);"><i class="fa-solid fa-list-check" style="margin-right:6px;"></i>Verification Results</h4>
          <div style="display:flex; gap:8px;">
            <button class="ev-filter-btn" data-status="" style="padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:rgba(99,102,241,0.1);color:var(--primary);font-size:11px;font-weight:700;cursor:pointer;">All</button>
            <button class="ev-filter-btn" data-status="valid" style="padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:11px;font-weight:700;cursor:pointer;">Valid</button>
            <button class="ev-filter-btn" data-status="invalid" style="padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:11px;font-weight:700;cursor:pointer;">Invalid</button>
            <button class="ev-filter-btn" data-status="risky" style="padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:11px;font-weight:700;cursor:pointer;">Risky</button>
          </div>
        </div>
        <div id="evResults">${this._emptyState()}</div>
      </div>
    </div>`;
    },

    _kpi(label, value, icon, rgb, id) {
        return `<div class="card p-4" style="background:linear-gradient(135deg,rgba(${rgb},0.08),rgba(${rgb},0.02));border:1px solid rgba(${rgb},0.12);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><span style="font-size:10px;color:rgba(${rgb},1);text-transform:uppercase;font-weight:800;letter-spacing:1px;">${label}</span>
        <h3 ${id ? `id="${id}"` : ''} style="font-size:24px;font-weight:800;margin-top:8px;letter-spacing:-1px;">${value}</h3></div>
        <div style="width:40px;height:40px;background:rgba(${rgb},0.12);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <i class="${icon}" style="color:rgba(${rgb},1);font-size:18px;"></i></div>
      </div></div>`;
    },

    _statusChip(status) {
        const m = { valid: { bg: '#22c55e', icon: 'check-circle' }, invalid: { bg: '#ef4444', icon: 'circle-xmark' }, risky: { bg: '#f59e0b', icon: 'triangle-exclamation' }, unknown: { bg: '#6b7280', icon: 'question' } };
        const c = m[status] || m.unknown;
        return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${c.bg}18;color:${c.bg};border:1px solid ${c.bg}30;"><i class="fa-solid fa-${c.icon}" style="font-size:9px;"></i>${status}</span>`;
    },

    _emptyState() {
        return `<div style="text-align:center;padding:50px 20px;color:var(--text-secondary);">
      <i class="fa-solid fa-inbox" style="font-size:40px;margin-bottom:12px;opacity:0.3;"></i>
      <p style="font-size:13px;">No verification results yet. Paste emails or verify from leads above.</p></div>`;
    },

    _bind() {
        const vp = document.getElementById('evVerifyPaste');
        const vl = document.getElementById('evVerifyLeads');
        const ex = document.getElementById('evExport');
        if (vp) vp.onclick = () => this._verifyPasted();
        if (vl) vl.onclick = () => this._verifyLeads();
        if (ex) ex.onclick = () => this._exportInvalid();
        document.querySelectorAll('.ev-filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.ev-filter-btn').forEach(b => { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; });
                btn.style.background = 'rgba(99,102,241,0.1)'; btn.style.color = 'var(--primary)';
                this._renderResults(btn.dataset.status || null);
            };
        });
    },

    async _verifyPasted() {
        const ta = document.getElementById('evPasteArea');
        if (!ta || !ta.value.trim()) { UI.showToast('Paste some emails first', 'warning'); return; }
        const emails = ta.value.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
        if (!emails.length) { UI.showToast('No valid emails found', 'warning'); return; }
        await this._doVerify({ emails });
    },

    async _verifyLeads() {
        const leads = this._getAllLeads();
        if (!leads.length) { UI.showToast('No leads with emails', 'warning'); return; }
        const leadIds = leads.map(l => ({ id: l.id || l._id, email: l.email }));
        await this._doVerify({ leadIds });
    },

    async _doVerify(body) {
        this._verifying = true;
        const btns = document.querySelectorAll('#evVerifyPaste, #evVerifyLeads');
        btns.forEach(b => { if (b) { b.disabled = true; b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...'; } });
        try {
            const r = await fetch('/api/leads/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const d = await r.json();
            if (d.ok) {
                this._results = d.results || [];
                this._updateKpis(d.summary);
                this._renderResults();
                UI.showToast(`Verified ${d.summary.total}: ${d.summary.valid} valid, ${d.summary.invalid} invalid, ${d.summary.risky} risky`, 'success');
            } else UI.showToast(d.message || 'Failed', 'error');
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
        finally {
            this._verifying = false;
            const vp = document.getElementById('evVerifyPaste');
            const vl = document.getElementById('evVerifyLeads');
            if (vp) { vp.disabled = false; vp.innerHTML = '<i class="fa-solid fa-check-double"></i> Verify Pasted Emails'; }
            if (vl) { vl.disabled = false; vl.innerHTML = '<i class="fa-solid fa-rocket"></i> Verify All Lead Emails'; }
        }
    },

    _updateKpis(summary) {
        if (!summary) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('evKpiChecked', summary.total);
        set('evKpiValid', summary.valid);
        set('evKpiInvalid', summary.invalid);
        set('evKpiRisky', summary.risky);
    },

    _renderResults(filterStatus) {
        const c = document.getElementById('evResults'); if (!c) return;
        let data = this._results;
        if (filterStatus) data = data.filter(r => r.status === filterStatus);
        if (!data.length) { c.innerHTML = this._emptyState(); return; }
        const rows = data.map(r => `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:10px 15px;font-size:13px;font-family:monospace;">${this._e(r.email)}</td>
      <td style="padding:10px;">${this._statusChip(r.status)}</td>
      <td style="padding:10px;font-size:12px;color:var(--text-muted);">${this._e(r.reason || '—')}</td>
      <td style="padding:10px;font-size:11px;color:var(--text-muted);">${r.checked_at ? new Date(r.checked_at).toLocaleString() : '—'}</td>
    </tr>`).join('');
        c.innerHTML = `<div style="overflow-x:auto;max-height:400px;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(0,0,0,0.02);border-bottom:2px solid var(--border);">
      <th style="padding:10px 15px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Email</th>
      <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Status</th>
      <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Reason</th>
      <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Checked</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
    },

    async _fetchResults() {
        try {
            const r = await fetch('/api/leads/verify/results');
            const d = await r.json();
            if (d.ok && d.results.length) {
                this._results = d.results;
                const summary = {
                    total: d.results.length,
                    valid: d.results.filter(r => r.status === 'valid').length,
                    invalid: d.results.filter(r => r.status === 'invalid').length,
                    risky: d.results.filter(r => r.status === 'risky').length
                };
                this._updateKpis(summary);
                this._renderResults();
            }
        } catch (e) { console.error(e); }
    },

    _exportInvalid() {
        const invalid = this._results.filter(r => r.status === 'invalid' || r.status === 'risky');
        if (!invalid.length) { UI.showToast('No invalid emails to export', 'warning'); return; }
        let csv = 'email,status,reason,checked_at\n';
        invalid.forEach(r => { csv += `"${r.email}","${r.status}","${r.reason || ''}","${r.checked_at || ''}"\n`; });
        const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'invalid_emails.csv'; a.click(); URL.revokeObjectURL(url);
        UI.showToast('Exported invalid emails', 'success');
    },

    _e(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};
