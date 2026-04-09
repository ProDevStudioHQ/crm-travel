
const EmailLogs = {
    init() {
        console.log('Email Logs Module Initialized');
    },

    render() {
        const content = document.getElementById('mainContent');
        const logs = store.state.emailLogs || [];
        const campaigns = store.state.campaigns || [];

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 20px; font-weight:600; margin-bottom:5px;">Transmission Intelligence & Logs</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Real-time monitoring of all outbound communications and campaign performance.</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="EmailLogs.render()">
                        <i class="fa-solid fa-rotate"></i> Refresh Metrics
                    </button>
                </div>
            </div>

            <!-- Campaign Performance Overviews -->
            <h3 style="font-size:14px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; font-weight:700;">Active Funnel Analytics</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap:20px; margin-bottom:30px;">
                ${campaigns.slice(0, 3).map(c => this.renderCampaignMiniCard(c)).join('')}
            </div>

            <div class="card p-0" style="overflow:hidden;">
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="font-size:14px; font-weight:700;">Global Transmission Log</h4>
                    <div style="display:flex; gap:10px;">
                        <input type="text" class="form-control" placeholder="Search by recipient or subject..." style="width:250px; height:34px; font-size:12px;" onkeyup="EmailLogs.filterLogs(this.value)">
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Recipient Target</th>
                                <th>Asset Template</th>
                                <th>Subject Manifest</th>
                                <th>Transmission Type</th>
                                <th>Pulse Status</th>
                            </tr>
                        </thead>
                        <tbody id="emailLogsTableBody">
                            ${logs.length ? logs.map(l => this.renderLogEntry(l)).join('') : '<tr><td colspan="6" style="text-align:center; padding:30px; opacity:0.5;">No transmission history recorded.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderCampaignMiniCard(c) {
        const stats = c.stats;
        const openRate = stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0;
        const clickRate = stats.sent > 0 ? ((stats.clicks / stats.sent) * 100).toFixed(1) : 0;

        return `
            <div class="card p-4" style="border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                    <div>
                        <h4 style="font-size:14px; font-weight:700;">${c.name}</h4>
                        <span style="font-size:10px; color:var(--text-muted);">${c.type} • ${c.date}</span>
                    </div>
                    <span class="status-badge status-${c.status}">${c.status.toUpperCase()}</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:15px;">
                    <div style="text-align:center;">
                        <div style="font-size:16px; font-weight:700; color:var(--text-primary);">${stats.sent}</div>
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase;">Sent</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:16px; font-weight:700; color:var(--primary);">${openRate}%</div>
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase;">Open</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:16px; font-weight:700; color:var(--success);">${clickRate}%</div>
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase;">Click</div>
                    </div>
                </div>
                <!-- Mini Progress -->
                <div style="height:4px; background:var(--bg-body); border-radius:10px; overflow:hidden;">
                    <div style="width:${openRate}%; height:100%; background:var(--primary);"></div>
                </div>
            </div>
        `;
    },

    renderLogEntry(l) {
        return `
            <tr>
                <td style="font-size:11px; color:var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</td>
                <td style="font-weight:700; color:var(--text-primary);">${l.recipient}</td>
                <td><span style="font-size:11px; font-weight:600; color:var(--primary);">${l.template || 'N/A'}</span></td>
                <td style="font-size:12px; font-style:italic;">"${l.subject}"</td>
                <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-secondary);">${l.type}</span></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-circle-check" style="color:var(--success); font-size:10px;"></i>
                        <span style="font-size:11px; font-weight:700; color:var(--success); text-transform:uppercase;">DISPATCHED</span>
                    </div>
                </td>
            </tr>
        `;
    },

    filterLogs(val) {
        const query = val.toLowerCase();
        const rows = document.querySelectorAll('#emailLogsTableBody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    },

    exportLogs() {
        UI.showToast('Compiling high-resolution report...', 'info');
        setTimeout(() => {
            UI.showToast('Log Export Successful (Demo).', 'success');
        }, 1500);
    }
};

window.EmailLogs = EmailLogs;
