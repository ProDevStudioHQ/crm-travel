// Lead Duplicates Module — Lead Tools Pack V1
const LeadDuplicates = {
    _duplicates: [],
    _scanning: false,

    render() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        content.innerHTML = this._template();
        this._bind();
        this._fetchDuplicates();
    },

    _getAllLeads() {
        const b2b = (store.state.b2bClients || []).map(c => ({ ...c, _source: 'b2b' }));
        const b2c = (store.state.b2cClients || []).map(c => ({ ...c, _source: 'b2c' }));
        return [...b2b, ...b2c];
    },

    _template() {
        const total = this._getAllLeads().length;
        return `<div style="display:flex; flex-direction:column; gap:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:24px; font-weight:800; letter-spacing:-1px; margin-bottom:5px;">
            <i class="fa-solid fa-clone" style="color:#f59e0b; margin-right:8px;"></i>Duplicate Cleaner
          </h2>
          <p style="color:var(--text-secondary); font-size:13px;">Detect, review, and merge duplicate leads.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" id="ldExportDupes" style="height:38px; padding:0 18px;"><i class="fa-solid fa-download"></i> Export</button>
          <button class="btn-primary" id="ldScanBtn" style="height:38px; padding:0 22px;"><i class="fa-solid fa-magnifying-glass-chart"></i> Scan</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:15px;">
        ${this._kpi('Total Leads', total, 'fa-solid fa-users', '99,102,241')}
        ${this._kpi('Pairs Found', '—', 'fa-solid fa-clone', '245,158,11', 'ldKpiPairs')}
        ${this._kpi('Merged', '—', 'fa-solid fa-code-merge', '34,197,94', 'ldKpiMerged')}
        ${this._kpi('Ignored', '—', 'fa-solid fa-eye-slash', '107,114,128', 'ldKpiIgnored')}
      </div>
      <div class="card p-3" style="display:flex; gap:20px; align-items:center; flex-wrap:wrap; border:1px solid var(--border);">
        <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Match Rules:</span>
        <span style="font-size:12px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:4px;"></span>Email 100%</span>
        <span style="font-size:12px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:4px;"></span>Phone 95%</span>
        <span style="font-size:12px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;margin-right:4px;"></span>Domain 85%</span>
        <span style="font-size:12px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#8b5cf6;margin-right:4px;"></span>Name 70-90%</span>
      </div>
      <div class="card p-0" style="overflow:hidden; border:1px solid var(--border);"><div id="ldContent">
        <div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
          <i class="fa-solid fa-magnifying-glass-chart" style="font-size:48px; margin-bottom:15px; opacity:0.3;"></i>
          <h3 style="font-weight:700; margin-bottom:8px;">Click "Scan" to Start</h3>
          <p style="font-size:13px;">We'll analyze all leads for potential duplicates.</p>
        </div>
      </div></div>
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

    _ruleChip(rule) {
        const m = { email: '#ef4444', phone: '#f59e0b', domain: '#3b82f6', name: '#8b5cf6' };
        const c = m[rule] || '#6b7280';
        return `<span style="padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${c}18;color:${c};border:1px solid ${c}30;">${rule}</span>`;
    },

    _scoreBar(s) {
        const c = s >= 90 ? '#ef4444' : s >= 80 ? '#f59e0b' : '#8b5cf6';
        return `<div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;max-width:80px;height:6px;background:rgba(0,0,0,0.1);border-radius:3px;overflow:hidden;"><div style="width:${s}%;height:100%;background:${c};border-radius:3px;"></div></div><span style="font-size:12px;font-weight:700;color:${c};">${s}%</span></div>`;
    },

    _bind() {
        const s = document.getElementById('ldScanBtn');
        const e = document.getElementById('ldExportDupes');
        if (s) s.onclick = () => this._scan();
        if (e) e.onclick = () => this._exportCsv();
    },

    _bindContent() {
        document.querySelectorAll('.ld-merge-btn').forEach(b => { b.onclick = () => this._openMerge(b.dataset.id, b.dataset.a, b.dataset.b); });
        document.querySelectorAll('.ld-ignore-btn').forEach(b => { b.onclick = () => this._ignore(b.dataset.id); });
        document.querySelectorAll('.ld-compare-btn').forEach(b => { b.onclick = () => this._openCompare(b.dataset.a, b.dataset.b); });
    },

    async _fetchDuplicates() {
        try {
            const r = await fetch('/api/leads/duplicates?status=open');
            const d = await r.json();
            if (d.ok) { this._duplicates = d.duplicates || []; this._renderList(); }
        } catch (e) { console.error(e); }
    },

    async _scan() {
        const leads = this._getAllLeads();
        if (!leads.length) { UI.showToast('No leads to scan', 'warning'); return; }
        const btn = document.getElementById('ldScanBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning...'; }
        try {
            const r = await fetch('/api/leads/duplicates/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads }) });
            const d = await r.json();
            if (d.ok) { UI.showToast(`Found ${d.count} pair(s)`, d.count > 0 ? 'warning' : 'success'); await this._fetchDuplicates(); }
            else UI.showToast(d.message || 'Failed', 'error');
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart"></i> Scan'; } }
    },

    _renderList() {
        const c = document.getElementById('ldContent'); if (!c) return;
        const el = document.getElementById('ldKpiPairs'); if (el) el.textContent = this._duplicates.length;
        if (!this._duplicates.length) {
            c.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);"><i class="fa-solid fa-check-circle" style="font-size:48px;margin-bottom:15px;color:var(--success);opacity:0.5;"></i><h3 style="font-weight:700;margin-bottom:8px;">No Duplicates</h3><p style="font-size:13px;">Click "Scan" to check.</p></div>`;
            return;
        }
        const leads = this._getAllLeads();
        const f = id => leads.find(l => String(l.id || l._id) === String(id)) || {};
        const rows = this._duplicates.map(d => {
            const a = f(d.lead_id_a), b = f(d.lead_id_b);
            return `<tr style="border-bottom:1px solid var(--border);" onmouseenter="this.style.background='rgba(245,158,11,0.03)'" onmouseleave="this.style.background=''">
        <td style="padding:12px 15px;"><div style="font-weight:600;font-size:13px;">${this._e(a.company || a.companyName || a.name || '—')}</div><div style="font-size:11px;color:var(--text-muted);">${this._e(a.email || '—')}</div></td>
        <td style="padding:12px 10px;text-align:center;"><i class="fa-solid fa-arrows-left-right" style="color:var(--text-muted);"></i></td>
        <td style="padding:12px 10px;"><div style="font-weight:600;font-size:13px;">${this._e(b.company || b.companyName || b.name || '—')}</div><div style="font-size:11px;color:var(--text-muted);">${this._e(b.email || '—')}</div></td>
        <td style="padding:12px 10px;">${this._ruleChip(d.rule)}</td>
        <td style="padding:12px 10px;">${this._scoreBar(d.score)}</td>
        <td style="padding:12px 10px;"><div style="display:flex;gap:6px;">
          <button class="btn-secondary ld-compare-btn" data-a="${d.lead_id_a}" data-b="${d.lead_id_b}" style="height:28px;padding:0 10px;font-size:11px;" title="Compare"><i class="fa-solid fa-columns"></i></button>
          <button class="btn-primary ld-merge-btn" data-id="${d.id}" data-a="${d.lead_id_a}" data-b="${d.lead_id_b}" style="height:28px;padding:0 10px;font-size:11px;" title="Merge"><i class="fa-solid fa-code-merge"></i></button>
          <button class="btn-secondary ld-ignore-btn" data-id="${d.id}" style="height:28px;padding:0 10px;font-size:11px;" title="Ignore"><i class="fa-solid fa-eye-slash"></i></button>
        </div></td>
      </tr>`;
        }).join('');
        c.innerHTML = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(0,0,0,0.02);border-bottom:2px solid var(--border);">
      <th style="padding:12px 15px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Lead A</th><th style="width:40px;"></th>
      <th style="padding:12px 10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Lead B</th>
      <th style="padding:12px 10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Rule</th>
      <th style="padding:12px 10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Score</th>
      <th style="padding:12px 10px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:800;color:var(--text-muted);">Actions</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
        this._bindContent();
    },

    _openCompare(aId, bId) {
        const leads = this._getAllLeads();
        const a = leads.find(l => String(l.id || l._id) === String(aId)) || {};
        const b = leads.find(l => String(l.id || l._id) === String(bId)) || {};
        const fields = ['company', 'companyName', 'name', 'email', 'phone', 'website', 'country', 'city', 'notes'];
        const rows = fields.map(f => {
            const av = a[f] || '', bv = b[f] || '', match = av && bv && av.toLowerCase() === bv.toLowerCase();
            return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:10px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">${f}</td>
        <td style="padding:10px;font-size:13px;${match ? 'background:rgba(34,197,94,0.05);' : ''}">${this._e(av || '—')}</td>
        <td style="padding:10px;font-size:13px;${match ? 'background:rgba(34,197,94,0.05);' : ''}">${this._e(bv || '—')}</td>
        <td style="padding:10px;">${match ? '<i class="fa-solid fa-check" style="color:var(--success);"></i>' : (av && bv ? '<i class="fa-solid fa-exclamation-triangle" style="color:#f59e0b;"></i>' : '')}</td></tr>`;
        }).join('');
        Modal.open({
            title: '<i class="fa-solid fa-columns"></i> Compare Leads', size: 'lg',
            body: `<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(0,0,0,0.02);border-bottom:2px solid var(--border);">
        <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted);">Field</th>
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--primary);">Lead A</th>
        <th style="padding:10px;text-align:left;font-size:11px;color:#f59e0b;">Lead B</th>
        <th style="padding:10px;width:40px;"></th></tr></thead><tbody>${rows}</tbody></table>`
        });
    },

    _openMerge(pairId, aId, bId) {
        const leads = this._getAllLeads();
        const a = leads.find(l => String(l.id || l._id) === String(aId)) || {};
        const b = leads.find(l => String(l.id || l._id) === String(bId)) || {};
        Modal.open({
            title: '<i class="fa-solid fa-code-merge"></i> Merge', size: 'md',
            body: `<div style="padding:10px 0;"><p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Choose the <b>master</b> record to keep.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
          <button class="card p-4 ld-merge-pick" data-master="${aId}" data-merge="${bId}" data-pair="${pairId}" style="cursor:pointer;text-align:left;border:2px solid var(--border);transition:0.2s;" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
            <div style="font-size:11px;font-weight:800;color:var(--primary);text-transform:uppercase;margin-bottom:8px;">Lead A</div>
            <div style="font-weight:600;">${this._e(a.company || a.name || '—')}</div><div style="font-size:12px;color:var(--text-muted);">${this._e(a.email || '—')}</div>
          </button>
          <button class="card p-4 ld-merge-pick" data-master="${bId}" data-merge="${aId}" data-pair="${pairId}" style="cursor:pointer;text-align:left;border:2px solid var(--border);transition:0.2s;" onmouseenter="this.style.borderColor='#f59e0b'" onmouseleave="this.style.borderColor='var(--border)'">
            <div style="font-size:11px;font-weight:800;color:#f59e0b;text-transform:uppercase;margin-bottom:8px;">Lead B</div>
            <div style="font-weight:600;">${this._e(b.company || b.name || '—')}</div><div style="font-size:12px;color:var(--text-muted);">${this._e(b.email || '—')}</div>
          </button>
        </div></div>` });
        setTimeout(() => {
            document.querySelectorAll('.ld-merge-pick').forEach(btn => {
                btn.onclick = () => this._doMerge(btn.dataset.pair, btn.dataset.master, btn.dataset.merge);
            });
        }, 100);
    },

    async _doMerge(pairId, masterId, mergeId) {
        try {
            const r = await fetch('/api/leads/duplicates/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairId: +pairId, masterId, mergeId }) });
            const d = await r.json();
            if (d.ok) {
                const all = this._getAllLeads();
                const master = all.find(l => String(l.id || l._id) === String(masterId));
                const merge = all.find(l => String(l.id || l._id) === String(mergeId));
                if (master && merge) {
                    ['email', 'phone', 'website', 'country', 'city', 'notes', 'company', 'companyName', 'name'].forEach(f => { if (!master[f] && merge[f]) master[f] = merge[f]; });
                    const st = master._source === 'b2b' ? 'b2bClients' : 'b2cClients';
                    const idx = store.state[st].findIndex(c => String(c.id || c._id) === String(masterId));
                    if (idx >= 0) store.state[st][idx] = master;
                    store.notify();
                }
                Modal.close(); UI.showToast('Merged', 'success');
                this._duplicates = this._duplicates.filter(x => x.id !== +pairId);
                this._renderList();
            } else UI.showToast(d.message || 'Failed', 'error');
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
    },

    async _ignore(pairId) {
        try {
            const r = await fetch('/api/leads/duplicates/ignore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairId: +pairId }) });
            const d = await r.json();
            if (d.ok) { UI.showToast('Ignored', 'info'); this._duplicates = this._duplicates.filter(x => x.id !== +pairId); this._renderList(); }
        } catch (e) { UI.showToast('Error: ' + e.message, 'error'); }
    },

    _exportCsv() {
        if (!this._duplicates.length) { UI.showToast('No duplicates', 'warning'); return; }
        const leads = this._getAllLeads();
        const f = id => leads.find(l => String(l.id || l._id) === String(id)) || {};
        let csv = 'Lead A,Email A,Lead B,Email B,Rule,Score\n';
        this._duplicates.forEach(d => {
            const a = f(d.lead_id_a), b = f(d.lead_id_b);
            csv += `"${(a.company || a.name || '').replace(/"/g, '""')}","${a.email || ''}","${(b.company || b.name || '').replace(/"/g, '""')}","${b.email || ''}","${d.rule}","${d.score}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'duplicates_report.csv'; a.click(); URL.revokeObjectURL(url);
        UI.showToast('Exported', 'success');
    },

    _e(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};
