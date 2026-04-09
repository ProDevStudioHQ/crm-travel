
const Campaigns = {
    filters: {
        channel: 'all',
        category: 'all',
        status: 'all'
    },
    async init() {
        this._selected = this._selected || new Set();
        await store.fetchCampaignAnalytics();
        this._startLivePolling();
    },

    async refreshAnalytics() {
        const btn = document.getElementById('btnRefreshAnalytics');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:5px;"></i> Refreshing...';
        await store.fetchCampaignAnalytics();
        this.render();
        // Update modal if open
        const modalWrap = document.getElementById('modalWrap');
        if (window.currentViewStatsId && modalWrap && modalWrap.classList.contains('active')) {
            this.viewStats(window.currentViewStatsId, true);
        }
        if (btn) btn.innerHTML = '<i class="fa-solid fa-arrows-rotate" style="margin-right:5px;"></i> Refresh';
        UI.showToast('Analytics refreshed', 'success');
    },

    _pollingTimer: null,

    _startLivePolling() {
        if (this._pollingTimer) clearInterval(this._pollingTimer);
        this._pollingTimer = setInterval(async () => {
            // Only poll if campaigns view is active (check if table header exists)
            const selAll = document.getElementById('selAllCampaigns');
            if (selAll) {
                await store.fetchCampaignAnalytics();
                this.render(); // Re-render main table

                // Update modal if open
                const modalWrap = document.getElementById('modalWrap');
                if (window.currentViewStatsId && modalWrap && modalWrap.classList.contains('active')) {
                    this.viewStats(window.currentViewStatsId, true);
                } else {
                    window.currentViewStatsId = null; // Clear out state if modal is manually closed
                }
            } else {
                this._stopLivePolling(); // User navigated away
            }
        }, 15000); // Poll every 15s per SOP
    },

    _stopLivePolling() {
        if (this._pollingTimer) {
            clearInterval(this._pollingTimer);
            this._pollingTimer = null;
        }
    },

    _syncHeaderCheckbox() {
        const header = document.getElementById('selAllCampaigns');
        if (!header) return;
        const total = store.state.campaigns.length;
        const selected = (this._selected && this._selected.size) || 0;
        header.indeterminate = selected > 0 && selected < total;
        header.checked = total > 0 && selected === total;

        const countEl = document.getElementById('bulkCountCampaigns');
        if (countEl) countEl.textContent = String(selected);

        const delBtn = document.getElementById('deleteSelCampaigns');
        if (delBtn) {
            delBtn.disabled = selected === 0;
            delBtn.style.opacity = selected === 0 ? '0.5' : '1';
        }
    },

    toggleSelect(id, checked) {
        this._selected = this._selected || new Set();
        if (checked) this._selected.add(String(id));
        else this._selected.delete(String(id));
        this._syncHeaderCheckbox();
    },

    toggleSelectAll(checked) {
        this._selected = new Set();
        const campaigns = store.state.campaigns;
        if (checked) {
            campaigns.forEach(c => this._selected.add(String(c.id)));
        }
        document.querySelectorAll('input[data-sel-type="campaign"]').forEach(cb => {
            cb.checked = checked;
        });
        this._syncHeaderCheckbox();
    },

    _restoreCheckboxes() {
        const sel = this._selected || new Set();
        document.querySelectorAll('input[data-sel-type="campaign"][data-id]').forEach(cb => {
            cb.checked = sel.has(String(cb.dataset.id));
        });
        this._syncHeaderCheckbox();
    },

    clearSelection() {
        this._selected = new Set();
        this._syncHeaderCheckbox();
    },

    deleteSelected() {
        const ids = Array.from(this._selected);
        if (!ids.length) return UI.showToast('No campaigns selected', 'info');
        UI.confirm('Delete Selected', `Permanently delete <b>${ids.length}</b> campaigns?`, () => {
            store.deleteCampaignsBulk(ids);
            this.clearSelection();
            this.render();
            UI.showToast('Deleted successfully', 'success');
        }, 'danger');
    },

    deleteAll() {
        const total = store.state.campaigns.length;
        if (!total) return UI.showToast('No campaigns to delete', 'info');
        UI.confirm('Delete ALL', `Permanently delete <b>ALL (${total})</b> campaigns? This cannot be undone.`, () => {
            store.deleteAllCampaigns();
            this.clearSelection();
            this.render();
            UI.showToast('All campaigns deleted', 'success');
        }, 'danger');
    },

    renderEmptyState() {
        return `
            <div style="padding: 80px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 20px; margin-top: 20px;">
                <div style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(0,158,247,0.1), rgba(138,43,226,0.1)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; border: 1px solid rgba(0,158,247,0.1);">
                    <i class="fa-solid fa-rocket" style="font-size: 28px; background: linear-gradient(135deg, #009ef7, #8a2be2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 8px;">No Campaigns Yet</h3>
                <p style="color: var(--text-secondary); font-size: 13px; max-width: 400px; margin: 0 auto 25px; line-height: 1.6;">
                    Marketing campaigns are the engine of your agency. Create your first campaign to start driving engagement and revenue.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
                    <button class="btn-primary" onclick="Campaigns.openModal()" style="border-radius:12px; padding:0 22px; height:42px; font-weight:800; box-shadow:0 8px 20px rgba(0,158,247,0.3);">
                        <i class="fa-solid fa-plus" style="margin-right:5px;"></i> Launch Campaign
                    </button>
                    <button class="btn-secondary" onclick="handleRoute('whatsapp')" style="border-radius:12px; padding:0 18px; height:42px; font-weight:700;">
                        <i class="fa-brands fa-whatsapp" style="margin-right:5px;"></i> WhatsApp Blast
                    </button>
                    <button class="btn-cancel" onclick="handleRoute('templates')" style="border-radius:12px; padding:0 18px; height:42px; font-weight:700;">
                        <i class="fa-solid fa-layer-group" style="margin-right:5px;"></i> Templates
                    </button>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                    <i class="fa-solid fa-certificate" style="color: var(--success); margin-right:4px;"></i> Automated follow-ups increase conversion by 45%.
                </div>
            </div>
        `;
    },

    render() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const user = state.currentUser;

        let campaigns = state.campaigns;

        // RBAC: Agents only see their own campaigns (SOP Rule 3)
        if (user.role === 'agent') {
            campaigns = campaigns.filter(c => c.agent === user.name || c.agent === user.email);
        }

        // Apply UI Filters
        if (this.filters.channel !== 'all') {
            campaigns = campaigns.filter(c => c.type === this.filters.channel);
        }
        if (this.filters.category !== 'all') {
            campaigns = campaigns.filter(c => c.category === this.filters.category);
        }
        if (this.filters.status !== 'all') {
            campaigns = campaigns.filter(c => c.status === this.filters.status);
        }

        // Apply Global Search
        const searchTerm = (state.ui && state.ui.globalSearch) || '';
        if (searchTerm) {
            campaigns = campaigns.filter(c => {
                return (
                    (c.id && String(c.id).toLowerCase().includes(searchTerm)) ||
                    (c.title && String(c.title).toLowerCase().includes(searchTerm)) ||
                    (c.type && String(c.type).toLowerCase().includes(searchTerm)) ||
                    (c.status && String(c.status).toLowerCase().includes(searchTerm)) ||
                    (c.category && String(c.category).toLowerCase().includes(searchTerm))
                );
            });
        }

        let tSent = 0, tDelivered = 0, tBounced = 0, tClicks = 0, tUnsubs = 0;
        campaigns.forEach(c => {
            const s = c.stats || {};
            tSent += s.sent || 0;
            tDelivered += s.delivered || 0;
            tBounced += s.total_bounces || 0;
            tClicks += s.unique_clicks || 0;
            tUnsubs += s.unsubs || 0;
        });
        const ctr = tDelivered > 0 ? ((tClicks / tDelivered) * 100).toFixed(1) : 0;
        const bRate = tSent > 0 ? ((tBounced / tSent) * 100).toFixed(1) : 0;
        const uRate = tDelivered > 0 ? ((tUnsubs / tDelivered) * 100).toFixed(1) : 0;

        content.innerHTML = `
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:35px;">
                <div>
                    <div style="display:flex; align-items:center; gap:14px; margin-bottom:8px;">
                       <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #009ef7, #8a2be2); display:flex; align-items:center; justify-content:center; color:white; font-size:20px; box-shadow:0 8px 24px rgba(0,158,247,0.3);">
                          <i class="fa-solid fa-rocket"></i>
                       </div>
                       <div>
                          <h2 style="font-size:26px; font-weight:900; letter-spacing:-1px; margin:0; background:linear-gradient(90deg, var(--text-primary), #009ef7); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Campaign Command</h2>
                          <p style="color:var(--text-muted); font-size:12px; margin:3px 0 0; font-weight:500;">Strategize & execute multi-channel marketing waves</p>
                       </div>
                    </div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="handleRoute('automation')" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:700;">
                        <i class="fa-solid fa-bolt" style="margin-right:5px;"></i> Flow Logic
                    </button>
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:700;">
                        <i class="fa-solid fa-wand-magic-sparkles" style="margin-right:5px;"></i> Templates
                    </button>
                    <button class="btn-secondary" onclick="Campaigns.refreshAnalytics()" id="btnRefreshAnalytics" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:700;">
                        <i class="fa-solid fa-arrows-rotate" style="margin-right:5px;"></i> Refresh
                    </button>
                    <button class="btn-primary" onclick="Campaigns.processPendingQueue()" id="btnProcessQueue" style="border-radius:12px; padding:0 18px; height:40px; font-size:12px; font-weight:800; background:linear-gradient(135deg, #17c653, #0dbf47); border:none; box-shadow:0 8px 20px rgba(23,198,83,0.3);">
                        <i class="fa-solid fa-play" style="margin-right:5px;"></i> Process Send Queue
                    </button>
                    <button class="btn-primary" onclick="Campaigns.openModal()" style="border-radius:12px; padding:0 22px; height:40px; font-size:12px; font-weight:800; box-shadow:0 8px 20px rgba(0,158,247,0.3);">
                        <i class="fa-solid fa-plus" style="margin-right:5px;"></i> New Campaign
                    </button>
                </div>
            </div>

            <!-- KPI Ribbon -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:18px; margin-bottom:30px;">
                <div style="padding:22px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border-radius:18px; border:1px solid rgba(0,158,247,0.15); position:relative; overflow:hidden; transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(0,158,247,0.35)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='rgba(0,158,247,0.15)'; this.style.transform='translateY(0)'">
                    <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#009ef7; filter:blur(40px); opacity:0.12;"></div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                       <div style="width:32px; height:32px; border-radius:10px; background:rgba(0,158,247,0.1); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-paper-plane" style="font-size:13px; color:#009ef7;"></i></div>
                       <span style="font-size:10px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1.5px;">Delivered</span>
                    </div>
                    <div style="font-size:28px; font-weight:900; letter-spacing:-1px; color:var(--text-primary); text-shadow:0 0 20px rgba(0,158,247,0.08);">${tDelivered.toLocaleString()}</div>
                    <div style="font-size:10px; color:var(--text-muted); margin-top:6px; font-weight:600;">Sent - Bounced</div>
                </div>
                <div style="padding:22px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border-radius:18px; border:1px solid rgba(23,198,83,0.15); position:relative; overflow:hidden; transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(23,198,83,0.35)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='rgba(23,198,83,0.15)'; this.style.transform='translateY(0)'">
                    <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#17c653; filter:blur(40px); opacity:0.12;"></div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                       <div style="width:32px; height:32px; border-radius:10px; background:rgba(23,198,83,0.1); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-hand-pointer" style="font-size:13px; color:#17c653;"></i></div>
                       <span style="font-size:10px; font-weight:800; color:var(--success); text-transform:uppercase; letter-spacing:1.5px;">Clicks + CTR</span>
                    </div>
                    <div style="font-size:28px; font-weight:900; letter-spacing:-1px; color:var(--text-primary); text-shadow:0 0 20px rgba(23,198,83,0.08);">${tClicks.toLocaleString()} <span style="font-size:14px; font-weight:700; color:var(--success); margin-left:8px;">${ctr}%</span></div>
                    <div style="font-size:10px; color:var(--text-muted); margin-top:6px; font-weight:600;">Unique Clicks / Delivered</div>
                </div>
                <div style="padding:22px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border-radius:18px; border:1px solid rgba(246,192,0,0.15); position:relative; overflow:hidden; transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(246,192,0,0.35)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='rgba(246,192,0,0.15)'; this.style.transform='translateY(0)'">
                    <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#f6c000; filter:blur(40px); opacity:0.12;"></div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                       <div style="width:32px; height:32px; border-radius:10px; background:rgba(246,192,0,0.1); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-reply" style="font-size:13px; color:#f6c000;"></i></div>
                       <span style="font-size:10px; font-weight:800; color:var(--warning); text-transform:uppercase; letter-spacing:1.5px;">Bounces</span>
                    </div>
                    <div style="font-size:28px; font-weight:900; letter-spacing:-1px; color:var(--text-primary); text-shadow:0 0 20px rgba(246,192,0,0.08);">${tBounced.toLocaleString()} <span style="font-size:14px; font-weight:700; color:var(--warning); margin-left:8px;">${bRate}%</span></div>
                    <div style="font-size:10px; color:var(--text-muted); margin-top:6px; font-weight:600;">Hard + Soft Bounces</div>
                </div>
                <div style="padding:22px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border-radius:18px; border:1px solid rgba(241,65,108,0.15); position:relative; overflow:hidden; transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(241,65,108,0.35)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='rgba(241,65,108,0.15)'; this.style.transform='translateY(0)'">
                    <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#f1416c; filter:blur(40px); opacity:0.12;"></div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                       <div style="width:32px; height:32px; border-radius:10px; background:rgba(241,65,108,0.1); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-user-minus" style="font-size:13px; color:#f1416c;"></i></div>
                       <span style="font-size:10px; font-weight:800; color:var(--danger); text-transform:uppercase; letter-spacing:1.5px;">Unsubs + Spam</span>
                    </div>
                    <div style="font-size:28px; font-weight:900; letter-spacing:-1px; color:var(--text-primary); text-shadow:0 0 20px rgba(241,65,108,0.08);">${tUnsubs.toLocaleString()} <span style="font-size:14px; font-weight:700; color:var(--danger); margin-left:8px;">${uRate}%</span></div>
                    <div style="font-size:10px; color:var(--text-muted); margin-top:6px; font-weight:600;">Unsub Rate = Unsubs / Delivered</div>
                </div>
            </div>

            <!-- Filter Bar -->
            <div style="padding:16px 20px; margin-bottom:22px; display:flex; gap:14px; align-items:center; background:rgba(255,255,255,0.015); backdrop-filter:blur(10px); border:1px solid var(--border); border-radius:14px;">
                <div style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px;"><i class="fa-solid fa-sliders" style="margin-right:5px; color:var(--primary);"></i>Filters</div>
                <div class="select-wrap" style="width:150px;">
                    <select class="form-control" style="height:38px !important; border-radius:10px; font-size:12px;" onchange="Campaigns.setFilter('channel', this.value)">
                        <option value="all" ${this.filters.channel === 'all' ? 'selected' : ''}>All Channels</option>
                        <option value="Email" ${this.filters.channel === 'Email' ? 'selected' : ''}>Email</option>
                        <option value="WhatsApp" ${this.filters.channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                <div class="select-wrap" style="width:150px;">
                    <select class="form-control" style="height:38px !important; border-radius:10px; font-size:12px;" onchange="Campaigns.setFilter('status', this.value)">
                        <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>All Statuses</option>
                        <option value="running" ${this.filters.status === 'running' ? 'selected' : ''}>Running</option>
                        <option value="completed" ${this.filters.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="scheduled" ${this.filters.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                
                <div style="margin-left:auto; display:flex; gap:8px;">
                     <button class="btn-social" onclick="Campaigns.toggleSelectAll(true)" style="border-radius:10px; font-size:11px; font-weight:700;"><i class="fa-solid fa-check-double" style="margin-right:4px;"></i> Select All</button>
                     <button id="deleteSelCampaigns" class="btn-social" style="color:var(--danger); border-radius:10px; font-size:11px; font-weight:700;" onclick="Campaigns.deleteSelected()" disabled><i class="fa-solid fa-trash-can" style="margin-right:4px;"></i> Delete (<span id="bulkCountCampaigns">0</span>)</button>
                     ${state.currentUser.role === 'admin' ? `<button class="btn-social" style="color:var(--danger); border-color:rgba(241,65,108,0.3); border-radius:10px; font-size:11px; font-weight:700;" onclick="Campaigns.deleteAll()"><i class="fa-solid fa-dumpster-fire" style="margin-right:4px;"></i> Wipe All</button>` : ''}
                </div>
            </div>

            <!-- Data Table -->
            <div style="border-radius:16px; overflow:hidden; border:1px solid var(--border); background:rgba(255,255,255,0.01);">
                <table class="data-table" style="margin:0;">
                    <thead>
                        <tr>
                            <th style="width:40px;"><input id="selAllCampaigns" type="checkbox" onclick="Campaigns.toggleSelectAll(this.checked)" /></th>
                            <th>Campaign</th>
                            <th>Status</th>
                            <th>Sent</th>
                            <th>Delivered</th>
                            <th>Clicks</th>
                            <th>Unsubs</th>
                            <th>Performance</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaigns.map((c, index) => {
            const s = c.stats || {};
            const sent = s.sent || 0;
            const delivered = s.delivered || 0;
            const clicks = s.unique_clicks || 0;
            const bounces = s.total_bounces || 0;
            const unsubs = s.unsubs || 0;
            const cRate = delivered > 0 ? Math.round((clicks / delivered) * 100) : 0;
            const isEmail = c.type === 'Email';

            return `
                            <tr style="transition:background 0.2s;" onmouseover="this.style.background='rgba(0,158,247,0.02)'" onmouseout="this.style.background='transparent'">
                                <td style="width:40px; text-align:center;"><input type="checkbox" data-sel-type="campaign" data-id="${c.id}" onchange="Campaigns.toggleSelect(${c.id}, this.checked)" /></td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, ${isEmail ? 'rgba(0,158,247,0.1), rgba(0,158,247,0.03)' : 'rgba(23,198,83,0.1), rgba(23,198,83,0.03)'}); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                            <i class="${isEmail ? 'fa-solid fa-envelope' : 'fa-brands fa-whatsapp'}" style="font-size:14px; color:${isEmail ? '#009ef7' : '#17c653'};"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight:700; font-size:13px; color:var(--text-primary); line-height:1.2;">${c.name}</div>
                                            <div style="font-size:10px; color:var(--text-muted); margin-top:2px; font-weight:500;">${c.type} • ${c.audience === 'B2B_B2C' ? 'B2B & B2C' : c.audience}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="status-badge status-${c.status}" style="font-size:10px; font-weight:800; letter-spacing:0.5px;">${c.status.toUpperCase()}</span></td>
                                <td><span style="font-weight:700; color:var(--text-primary);">${sent}</span></td>
                                <td><span style="font-weight:700; color:var(--success);">${delivered}</span></td>
                                <td><span style="font-weight:700; color:var(--info);">${clicks}</span></td>
                                <td><span style="font-weight:700; color:var(--danger);">${unsubs}</span></td>
                                <td>
                                    <div style="display:flex; flex-direction:column; gap:2px; font-size:10px;">
                                        <div style="display:flex; justify-content:space-between; width:120px;">
                                            <span style="color:var(--text-muted);">Delivered:</span> <span style="font-weight:700; color:var(--success);">${delivered}</span>
                                        </div>
                                        <div style="display:flex; justify-content:space-between; width:120px;">
                                            <span style="color:var(--text-muted);">Clicks:</span> <span><span style="font-weight:700; color:var(--primary);">${clicks}</span> <span style="font-size:9px; color:var(--text-muted);">(${cRate}%)</span></span>
                                        </div>
                                        <div style="display:flex; justify-content:space-between; width:120px;">
                                            <span style="color:var(--text-muted);">Bounces:</span> <span style="font-weight:700; color:var(--warning);">${bounces}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style="text-align:right;">
                                    <div class="action-btns" style="gap:6px;">
                                        <button class="action-btn-label action-btn-label--view" onclick="Campaigns.viewStats(${c.id})" style="border-radius:8px; font-size:11px;"><i class="fa-solid fa-chart-line"></i> Stats</button>
                                        <button class="action-btn-label action-btn-label--edit" onclick="Campaigns.openModal(${c.id})" style="border-radius:8px; font-size:11px;"><i class="fa-solid fa-pen"></i> Edit</button>
                                        <button class="action-btn-label action-btn-label--delete" onclick="Campaigns.delete(${c.id})" style="border-radius:8px; font-size:11px;"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
                ${campaigns.length === 0 ? this.renderEmptyState() : ''}
            </div>
        `;
        this._restoreCheckboxes();
    },

    setFilter(key, val) {
        this.filters[key] = val;
        this.render();
    },

    openModal(id = null) {
        const campaign = id ? store.state.campaigns.find(c => String(c.id) === String(id)) : {};
        const isEdit = !!id;

        const audiences = store.state.audienceLists || [];
        const templates = store.state.mailTemplates || [];

        // Escape HTML content for safe embedding in textarea
        const escBody = (campaign.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Add custom animation styles to document head if not exists
        if (!document.getElementById('campaign_modal_styles')) {
            const style = document.createElement('style');
            style.id = 'campaign_modal_styles';
            style.innerHTML = `
                .camp-input { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); background: rgba(255,255,255,0.03) !important; color: var(--text-primary) !important; border: 1px solid rgba(255,255,255,0.08) !important; }
                .camp-input:focus { background: rgba(0,158,247,0.05) !important; border-color: rgba(0,158,247,0.4) !important; box-shadow: 0 0 0 3px rgba(0,158,247,0.1) !important; }
                .camp-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
                .camp-panel { background: rgba(255,255,255,0.015); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 20px; }
                .camp-action-btn { transition: all 0.2s; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: var(--text-secondary); }
                .camp-action-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: var(--text-primary); transform: translateY(-1px); }
                .camp-toolbar { background: linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(20,20,25,0.4) 100%); backdrop-filter: blur(10px); border-radius: 12px 12px 0 0; }
                
                /* Custom scrollbar for editor */
                #camp_html_editor::-webkit-scrollbar { width: 8px; }
                #camp_html_editor::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                #camp_html_editor::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                #camp_html_editor::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `;
            document.head.appendChild(style);
        }

        Modal.open({
            title: `<div style="display:flex;align-items:center;gap:12px;">
                <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#009ef7,#8a2be2);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,158,247,0.3);">
                    <i class="fa-solid fa-rocket" style="color:#fff;font-size:16px;"></i>
                </div>
                <div>
                    <div style="font-weight:900;font-size:18px;letter-spacing:-0.5px;background:linear-gradient(90deg,#fff,#aaa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${isEdit ? 'Refine Configuration' : 'Campaign Studio'}</div>
                    <div style="font-size:11px;color:var(--text-muted);font-weight:500;">Configure, design, and deploy your marketing wave</div>
                </div>
                ${isEdit ? `<div style="font-size:10px;color:var(--text-muted);font-family:monospace;background:rgba(255,255,255,0.03);padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);margin-left:auto;">ID: ${id}</div>` : ''}
            </div>`,
            size: 'full',
            body: `
                <div style="display:grid;grid-template-columns:340px 1fr 400px;gap:20px;height:calc(100vh - 180px);min-height:600px;padding:10px 0;">

                    <!-- ═══════ LEFT PANEL: Config ═══════ -->
                    <div class="camp-panel" style="overflow-y:auto;scrollbar-width:thin;display:flex;flex-direction:column;gap:20px;">
                        <!-- Status Badge Area -->
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);display:flex;align-items:center;gap:6px;">
                                <i class="fa-solid fa-sliders"></i> Parameters
                            </div>
                            ${isEdit ? `<span class="status-badge status-${campaign.status}" style="font-size:10px;padding:3px 8px;">${campaign.status.toUpperCase()}</span>` : ''}
                        </div>

                        <!-- Title -->
                        <div class="form-group" style="margin:0;">
                            <label class="camp-label"><i class="fa-solid fa-tag"></i> Campaign Name</label>
                            <input type="text" id="camp_name" class="form-control camp-input" value="${campaign.name || ''}" placeholder="e.g. Summer 2026 Engagement" style="height:44px !important;border-radius:12px;font-size:13px;font-weight:600;">
                        </div>

                        <!-- Core Settings Grid -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;background:rgba(0,0,0,0.2);border-radius:16px;border:1px solid rgba(255,255,255,0.03);">
                            <div class="form-group" style="margin:0;">
                                <label class="camp-label"><i class="fa-solid fa-tower-broadcast"></i> Channel</label>
                                <div class="select-wrap">
                                    <select id="camp_type" class="form-control camp-input" style="height:40px !important;border-radius:10px;font-size:12px;">
                                        <option value="Email" ${campaign.type === 'Email' ? 'selected' : ''}>📧 Email</option>
                                        <option value="WhatsApp" ${campaign.type === 'WhatsApp' ? 'selected' : ''}>📱 WhatsApp</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down caret"></i>
                                </div>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="camp-label"><i class="fa-solid fa-layer-group"></i> Category</label>
                                <div class="select-wrap">
                                    <select id="camp_cat" class="form-control camp-input" style="height:40px !important;border-radius:10px;font-size:12px;">
                                        <option value="Promotional" ${campaign.category === 'Promotional' ? 'selected' : ''}>🚀 Promo</option>
                                        <option value="Newsletter" ${campaign.category === 'Newsletter' ? 'selected' : ''}>📰 News</option>
                                        <option value="Partnership" ${campaign.category === 'Partnership' ? 'selected' : ''}>🤝 Partner</option>
                                        <option value="Automation" ${campaign.category === 'Automation' ? 'selected' : ''}>⚡ Auto</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down caret"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Target Audience -->
                        <div class="form-group" style="margin:0;">
                            <label class="camp-label"><i class="fa-solid fa-users-viewfinder"></i> Target Database</label>
                            <div style="display:flex;gap:8px;">
                                <div class="select-wrap" style="flex:1;">
                                    <select id="camp_audience" class="form-control camp-input" style="height:44px !important;border-radius:12px;font-size:13px;" onchange="Campaigns._onAudienceChange(this.value)">
                                        <optgroup label="System Leads">
                                            <option value="B2B" ${campaign.audience === 'B2B' ? 'selected' : ''}>All B2B Partners</option>
                                            <option value="B2C" ${campaign.audience === 'B2C' ? 'selected' : ''}>All B2C Travelers</option>
                                            <option value="B2B_B2C" ${campaign.audience === 'B2B_B2C' ? 'selected' : ''}>All Contacts (B2B+B2C)</option>
                                        </optgroup>
                                        ${audiences.length > 0 ? `
                                            <optgroup label="Audience Lists">
                                                ${audiences.map(a => `<option value="list:${a.id}" ${campaign.audienceListId === String(a.id) ? 'selected' : ''}>${a.name} (${store.getAudienceContacts(a.id).length})</option>`).join('')}
                                            </optgroup>
                                        ` : ''}
                                        <optgroup label="External List">
                                            <option value="Custom" ${campaign.audience === 'Custom' ? 'selected' : ''}>Import Custom List (TXT/CSV)</option>
                                        </optgroup>
                                    </select>
                                    <i class="fa-solid fa-chevron-down caret"></i>
                                </div>
                                <button class="btn-icon camp-action-btn" onclick="event.preventDefault();Campaigns._openAudiencePicker();" title="Import from Audience" style="width:44px;height:44px;min-width:44px;border-radius:12px;">
                                    <i class="fa-solid fa-users" style="font-size:13px;"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Audience Import Info -->
                        <div id="camp_audience_info" style="display:${campaign.audienceListId ? 'block' : 'none'}; padding:16px; background:linear-gradient(135deg, rgba(0,158,247,0.05), rgba(23,198,83,0.05)); border-radius:16px; border:1px solid rgba(0,158,247,0.15);">
                            <div style="display:flex; align-items:center; justify-content:space-between;">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="width:36px;height:36px;border-radius:10px;background:rgba(0,158,247,0.12);display:flex;align-items:center;justify-content:center;">
                                        <i class="fa-solid fa-envelope-circle-check" style="font-size:15px;color:#009ef7;"></i>
                                    </div>
                                    <div>
                                        <div id="camp_aud_import_name" style="font-size:12px;font-weight:700;color:var(--text-primary);">${campaign.audienceListId ? (audiences.find(a => String(a.id) === String(campaign.audienceListId))?.name || 'Selected Audience') : ''}</div>
                                        <div id="camp_aud_import_count" style="font-size:11px;color:var(--text-secondary);">${campaign.audienceListId ? store.getAudienceContacts(campaign.audienceListId).length + ' emails will be imported' : ''}</div>
                                    </div>
                                </div>
                                <button type="button" onclick="Campaigns._clearAudienceImport()" style="background:none;border:1px solid rgba(241,65,108,0.2);color:var(--danger);width:30px;height:30px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all 0.2s;" onmouseover="this.style.background='rgba(241,65,108,0.1)'" onmouseout="this.style.background='none'" title="Clear audience selection">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Import UI -->
                        <div id="camp_custom_file_wrap" style="display:${campaign.audience === 'Custom' ? 'block' : 'none'}; padding:16px; background:linear-gradient(135deg, rgba(138,43,226,0.05), rgba(0,158,247,0.05)); border-radius:16px; border:1px solid rgba(138,43,226,0.15);">
                            <label class="camp-label" style="color:#8a2be2;"><i class="fa-solid fa-file-csv"></i> Upload Contact List</label>
                            <div style="position:relative;margin-top:8px;">
                                <input type="file" id="camp_custom_file" accept=".txt,.csv" class="form-control camp-input" style="height:40px !important;font-size:12px;border-radius:10px;padding:8px 12px;color:rgba(255,255,255,0.7) !important;" onchange="Campaigns._handleCustomFile(this)">
                            </div>
                            <div id="camp_custom_count" style="font-size:11px; color:var(--text-secondary); margin-top:10px; display:flex; align-items:center; gap:6px;"></div>
                        </div>

                        <!-- Batch Settings -->
                        <div style="padding:16px;background:rgba(23,198,83,0.03);border-radius:16px;border:1px solid rgba(23,198,83,0.15);">
                            <div class="camp-label" style="color:#17c653;margin-bottom:12px;"><i class="fa-solid fa-clock-rotate-left"></i> Delivery Pacing</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div class="form-group" style="margin:0;">
                                    <label style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;display:block;">Batch Limit</label>
                                    <input type="number" id="camp_batch_size" class="form-control camp-input" value="${campaign.batchSize || ''}" placeholder="Total emails" style="height:38px !important;font-size:12px;border-radius:10px;" min="1">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;display:block;">Interval (Hrs)</label>
                                    <input type="number" id="camp_batch_interval" class="form-control camp-input" value="${campaign.batchIntervalHours || ''}" placeholder="e.g. 2" style="height:38px !important;font-size:12px;border-radius:10px;" min="1" step="0.5">
                                </div>
                            </div>
                            <div style="font-size:10px;color:rgba(23,198,83,0.8);margin-top:10px;font-weight:600;"><i class="fa-solid fa-shield-halved"></i> Protects domain reputation for large lists</div>
                        </div>

                        <!-- Metadata -->
                        <div class="form-group" style="margin:0;">
                            <label class="camp-label"><i class="fa-solid fa-heading"></i> Subject Line</label>
                            <input type="text" id="camp_subject" class="form-control camp-input" value="${campaign.subject || ''}" placeholder="Incredible offers inside..." style="height:44px !important;font-size:13px;border-radius:12px;border-color:rgba(0,158,247,0.3) !important;">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="camp-label"><i class="fa-solid fa-eye-low-vision"></i> Preheader Text</label>
                            <input type="text" id="camp_preheader" class="form-control camp-input" value="${campaign.preheader || ''}" placeholder="Short preview text visible in inbox" style="height:40px !important;font-size:12px;border-radius:10px;">
                        </div>

                        <!-- Logistics -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;background:rgba(0,0,0,0.2);border-radius:16px;border:1px solid rgba(255,255,255,0.03);">
                            <div class="form-group" style="margin:0;">
                                <label class="camp-label"><i class="fa-solid fa-flag"></i> State</label>
                                <div class="select-wrap">
                                    <select id="camp_status" class="form-control camp-input" style="height:40px !important;border-radius:10px;font-size:12px;">
                                        <option value="draft" ${campaign.status === 'draft' ? 'selected' : ''}>Draft</option>
                                        <option value="scheduled" ${campaign.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                                        <option value="sent" ${campaign.status === 'sent' ? 'selected' : ''}>Deployed</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down caret"></i>
                                </div>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="camp-label"><i class="fa-solid fa-calendar-days"></i> Launch Time</label>
                                <input type="datetime-local" id="camp_schedule" class="form-control camp-input" value="${campaign.scheduledAt || ''}" style="height:40px !important;font-size:11px;border-radius:10px;padding:0 8px !important;">
                            </div>
                        </div>
                    </div>

                    <!-- ═══════ CENTER: Code Editor ═══════ -->
                    <div style="display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;background:#0d0d12;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
                        
                        <!-- Toolbar -->
                        <div class="camp-toolbar" style="padding:12px 16px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid rgba(255,255,255,0.05);">
                            
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                                    <i class="fa-solid fa-code" style="color:#009ef7;"></i> Markup Architecture
                                </div>
                                <div style="display:flex;gap:4px;">
                                    <div class="select-wrap" style="width:160px;">
                                        <select id="camp_template" class="form-control camp-input" onchange="Campaigns._loadTemplate()" style="height:32px !important;border-radius:8px;font-size:11px;padding-left:10px !important;">
                                            <option value="">-- Load Asset --</option>
                                            ${templates.map(t => `<option value="${t.id}" ${campaign.templateId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                                        </select>
                                        <i class="fa-solid fa-chevron-down caret" style="right:10px;"></i>
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div style="display:flex;gap:6px;">
                                    <button type="button" onclick="Campaigns._insertVar('{{FULL_NAME}}')" class="camp-action-btn" style="font-size:9px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer;">{{NAME}}</button>
                                    <button type="button" onclick="Campaigns._insertVar('{{COMPANY_NAME}}')" class="camp-action-btn" style="font-size:9px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer;">{{COMPANY}}</button>
                                    <button type="button" onclick="Campaigns._insertVar('{{COUNTRY}}')" class="camp-action-btn" style="font-size:9px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer;">{{COUNTRY}}</button>
                                    <button type="button" onclick="Campaigns._insertVar('{{EMAIL}}')" class="camp-action-btn" style="font-size:9px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer;">{{EMAIL}}</button>
                                </div>
                                
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <span id="camp_char_count" style="font-size:9px;color:rgba(255,255,255,0.4);font-family:monospace;margin-right:10px;">0B</span>
                                    
                                    <input type="file" id="camp_import_html" accept=".html,.htm" style="display:none;" onchange="Campaigns._importHtml(this)">
                                    <button type="button" onclick="document.getElementById('camp_import_html').click()" class="camp-action-btn" style="font-size:9px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                        <i class="fa-solid fa-file-import"></i> Upload HTML
                                    </button>
                                    
                                    <button type="button" onclick="Campaigns._clearEditor()" class="camp-action-btn" style="font-size:9px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:6px;color:var(--danger);border-color:rgba(241,65,108,0.3);">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Editor -->
                        <textarea id="camp_html_editor" oninput="Campaigns._updatePreview();Campaigns._updateCharCount()" onpaste="setTimeout(()=>{Campaigns._updatePreview();Campaigns._updateCharCount()},50)" onkeyup="Campaigns._updatePreview();Campaigns._updateCharCount()" spellcheck="false" placeholder="<!-- Initialize syntax -->" style="flex:1;width:100%;resize:none;font-family:'Fira Code','Cascadia Code','Consolas',monospace;font-size:13px;line-height:1.7;padding:20px;background:transparent;color:#e2e8f0;border:none;outline:none;tab-size:2;white-space:pre-wrap;overflow-y:auto;">${escBody}</textarea>
                    </div>

                    <!-- ═══════ RIGHT: Preview ═══════ -->
                    <div style="display:flex;flex-direction:column;gap:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px;">
                            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#17c653;display:flex;align-items:center;gap:8px;">
                                <i class="fa-solid fa-mobile-button"></i> Render Engine
                            </div>
                            <div style="display:flex;gap:6px;background:var(--bg-card);padding:4px;border-radius:10px;border:1px solid var(--border);">
                                <button type="button" onclick="Campaigns._setPreviewMode('desktop')" id="camp_prev_desktop" style="width:32px;height:32px;border-radius:8px;border:none;background:rgba(0,158,247,0.15);color:#009ef7;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;" title="Desktop View">
                                    <i class="fa-solid fa-desktop"></i>
                                </button>
                                <button type="button" onclick="Campaigns._setPreviewMode('mobile')" id="camp_prev_mobile" style="width:32px;height:32px;border-radius:8px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;" title="Mobile View">
                                    <i class="fa-solid fa-mobile-screen-button"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Simulated Client -->
                        <div style="flex:1;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
                            <!-- Header -->
                            <div style="padding:16px 20px;background:#f5f7f9;border-bottom:1px solid #e1e5eb;">
                                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                                    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#009ef7,#8a2be2);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,158,247,0.2);">
                                        <i class="fa-solid fa-paper-plane" style="color:#fff;font-size:14px;"></i>
                                    </div>
                                    <div>
                                        <div style="font-size:13px;font-weight:800;color:#1a1d20;" id="camp_prev_from">PM Travel Agency</div>
                                        <div style="font-size:11px;color:#6b7280;">to user@client.com</div>
                                    </div>
                                </div>
                                <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.3;margin-bottom:4px;" id="camp_prev_subject">Subject definition pending...</div>
                                <div style="font-size:12px;color:#6b7280;line-height:1.4;" id="camp_prev_preheader">Configure preheader...</div>
                            </div>
                            <!-- Body -->
                            <div id="camp_preview_wrap" style="flex:1;overflow:hidden;position:relative;background:#f9fafb;">
                                <iframe id="camp_preview_frame" style="width:100%;height:100%;border:none;background:transparent;" sandbox="allow-same-origin"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div style="font-size:11px;color:rgba(255,255,255,0.4);display:flex;align-items:center;gap:8px;">
                        <i class="fa-solid fa-circle-check" style="color:var(--success);"></i> System ready for broadcast
                    </div>
                    <div style="display:flex;gap:12px;">
                        <button class="camp-action-btn" onclick="Modal.close()" style="height:44px;font-size:13px;border-radius:12px;padding:0 24px;font-weight:700;">Cancel</button>
                        
                        <button onclick="Campaigns.sendTest('${id}')" style="height:44px;font-size:13px;padding:0 24px;border-radius:12px;font-weight:700;background:rgba(0,158,247,0.1);color:#009ef7;border:1px solid rgba(0,158,247,0.3);cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(0,158,247,0.2)'" onmouseout="this.style.background='rgba(0,158,247,0.1)'">
                            <i class="fa-solid fa-flask" style="margin-right:6px;"></i> Send Proof
                        </button>
                        
                        <button onclick="Campaigns.save('${id}', false)" style="height:44px;font-size:13px;padding:0 24px;border-radius:12px;font-weight:700;background:rgba(255,255,255,0.05);color:var(--text-primary);border:1px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                            <i class="fa-solid fa-box-archive" style="margin-right:6px;"></i> Save Draft
                        </button>
                        
                        <button onclick="Campaigns.save('${id}', true)" style="height:44px;font-size:14px;padding:0 32px;border-radius:12px;font-weight:800;background:linear-gradient(135deg,#17c653,#0dbf47);color:#fff;border:none;box-shadow:0 8px 24px rgba(23,198,83,0.3);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:8px;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 32px rgba(23,198,83,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 24px rgba(23,198,83,0.3)'">
                            <i class="fa-solid fa-bolt"></i> ENGAGE SEQUENCE
                        </button>
                    </div>
                </div>
            `
        });

        // Initialize preview after modal is rendered
        setTimeout(() => {
            this._updatePreview();
            this._updateCharCount();
            // Live-bind subject/preheader inputs to preview header
            const subEl = document.getElementById('camp_subject');
            const preEl = document.getElementById('camp_preheader');
            if (subEl) subEl.addEventListener('input', () => {
                const el = document.getElementById('camp_prev_subject');
                if (el) el.textContent = subEl.value || 'Subject preview...';
            });
            if (preEl) preEl.addEventListener('input', () => {
                const el = document.getElementById('camp_prev_preheader');
                if (el) el.textContent = preEl.value || 'Preheader preview...';
            });
            // Set initial values
            if (subEl && subEl.value) {
                const el = document.getElementById('camp_prev_subject');
                if (el) el.textContent = subEl.value;
            }
            if (preEl && preEl.value) {
                const el = document.getElementById('camp_prev_preheader');
                if (el) el.textContent = preEl.value;
            }
        }, 100);
    },

    // ── Editor Helper Methods ──

    _updatePreview() {
        const editor = document.getElementById('camp_html_editor');
        const frame = document.getElementById('camp_preview_frame');
        if (!editor || !frame) return;
        const html = editor.value || '<div style="padding:40px;text-align:center;color:#aaa;font-family:Arial;"><i>Start typing HTML to see a live preview...</i></div>';
        frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;word-wrap:break-word;}img{max-width:100%;height:auto;}a{color:#009ef7;}table{border-collapse:collapse;}td,th{padding:8px;}</style></head><body>${html}</body></html>`;
    },

    _updateCharCount() {
        const editor = document.getElementById('camp_html_editor');
        const counter = document.getElementById('camp_char_count');
        if (editor && counter) {
            const bytes = new Blob([editor.value]).size;
            let display = `${bytes}B`;
            if (bytes > 1024) display = `${(bytes / 1024).toFixed(1)}KB`;
            counter.textContent = display;
        }
    },

    _insertVar(variable) {
        const editor = document.getElementById('camp_html_editor');
        if (!editor) return;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        editor.value = text.substring(0, start) + variable + text.substring(end);
        editor.focus();
        const newPos = start + variable.length;
        editor.setSelectionRange(newPos, newPos);
        this._updatePreview();
        this._updateCharCount();
    },

    _loadTemplate() {
        const select = document.getElementById('camp_template');
        if (!select || !select.value) return;
        const template = (store.state.mailTemplates || []).find(t => String(t.id) === String(select.value));
        if (!template) return;
        const editor = document.getElementById('camp_html_editor');
        const subjectEl = document.getElementById('camp_subject');
        if (editor) {
            editor.value = template.body || '';
            this._updatePreview();
            this._updateCharCount();
        }
        if (subjectEl && template.subject) {
            subjectEl.value = template.subject;
            const prevSub = document.getElementById('camp_prev_subject');
            if (prevSub) prevSub.textContent = template.subject;
        }
        UI.showToast(`Template "${template.name}" loaded`, 'success');
    },

    _importHtml(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const editor = document.getElementById('camp_html_editor');
            if (editor) {
                editor.value = e.target.result;
                this._updatePreview();
                this._updateCharCount();
            }
            UI.showToast('HTML file imported successfully', 'success');
        };
        reader.readAsText(file);
        input.value = '';
    },

    _handleCustomFile(input) {
        const file = input.files[0];
        if (!file) {
            this._importedEmails = [];
            document.getElementById('camp_custom_count').textContent = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result || '';
            const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const matches = text.match(regex) || [];
            const unique = [...new Set(matches)];
            this._importedEmails = unique;
            const countEl = document.getElementById('camp_custom_count');
            if (countEl) countEl.innerHTML = `Found <b style="color:var(--primary)">${unique.length}</b> unique emails.`;
        };
        reader.readAsText(file);
    },

    _onAudienceChange(value) {
        const customWrap = document.getElementById('camp_custom_file_wrap');
        const audInfo = document.getElementById('camp_audience_info');
        if (customWrap) customWrap.style.display = value === 'Custom' ? 'block' : 'none';

        if (value.startsWith('list:')) {
            const listId = value.split(':')[1];
            const list = (store.state.audienceLists || []).find(l => String(l.id) === listId);
            const contacts = store.getAudienceContacts(listId);
            if (audInfo) {
                audInfo.style.display = 'block';
                const nameEl = document.getElementById('camp_aud_import_name');
                const countEl = document.getElementById('camp_aud_import_count');
                if (nameEl) nameEl.textContent = list ? list.name : 'Selected Audience';
                if (countEl) countEl.textContent = contacts.length + ' emails will be imported';
            }
        } else {
            if (audInfo) audInfo.style.display = 'none';
        }
    },

    _clearAudienceImport() {
        const select = document.getElementById('camp_audience');
        if (select) select.value = 'B2B_B2C';
        const audInfo = document.getElementById('camp_audience_info');
        if (audInfo) audInfo.style.display = 'none';
    },

    _openAudiencePicker() {
        const audiences = store.state.audienceLists || [];
        if (audiences.length === 0) {
            UI.showToast('No audience lists found. Create one first in the Audiences section.', 'warning');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'audiencePickerOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);z-index:10001;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

        const content = `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:24px;width:580px;max-height:80vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.5);animation:slideUp 0.3s ease;">
                <div style="padding:24px 28px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#009ef7,#8a2be2);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,158,247,0.3);">
                            <i class="fa-solid fa-users" style="color:#fff;font-size:17px;"></i>
                        </div>
                        <div>
                            <div style="font-weight:900;font-size:17px;letter-spacing:-0.5px;color:var(--text-primary);">Import from Audience</div>
                            <div style="font-size:11px;color:var(--text-muted);font-weight:500;">Select an audience list to pull emails into this campaign</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('audiencePickerOverlay').remove()" style="background:rgba(255,255,255,0.05);border:1px solid var(--border);width:36px;height:36px;border-radius:10px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='var(--text-primary)'" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='var(--text-muted)'">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div style="padding:20px 28px;overflow-y:auto;max-height:calc(80vh - 100px);display:flex;flex-direction:column;gap:10px;">
                    ${audiences.map(a => {
            const contacts = store.getAudienceContacts(a.id);
            const emailCount = contacts.filter(c => c.email).length;
            return `
                        <div onclick="Campaigns._selectAudienceForImport('${a.id}')" style="padding:18px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;cursor:pointer;transition:all 0.25s ease;display:flex;align-items:center;gap:16px;" onmouseover="this.style.borderColor='rgba(0,158,247,0.35)';this.style.background='rgba(0,158,247,0.04)';this.style.transform='translateX(4px)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)';this.style.background='rgba(255,255,255,0.02)';this.style.transform='translateX(0)'">
                            <div style="width:44px;height:44px;border-radius:12px;background:${a.type === 'B2B' ? 'rgba(0,158,247,0.1)' : 'rgba(138,43,226,0.1)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <i class="fa-solid ${a.type === 'B2B' ? 'fa-building' : 'fa-user'}" style="font-size:16px;color:${a.type === 'B2B' ? '#009ef7' : '#8a2be2'};"></i>
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.name}</div>
                                <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:12px;">
                                    <span><i class="fa-solid fa-tag" style="margin-right:4px;opacity:0.5;"></i>${a.type}</span>
                                    <span><i class="fa-solid fa-envelope" style="margin-right:4px;opacity:0.5;"></i>${emailCount} emails</span>
                                    <span><i class="fa-solid fa-users" style="margin-right:4px;opacity:0.5;"></i>${contacts.length} contacts</span>
                                </div>
                            </div>
                            <div style="flex-shrink:0;width:32px;height:32px;border-radius:8px;background:rgba(23,198,83,0.1);display:flex;align-items:center;justify-content:center;">
                                <i class="fa-solid fa-arrow-right" style="font-size:12px;color:#17c653;"></i>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;

        overlay.innerHTML = content;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    _selectAudienceForImport(listId) {
        const list = (store.state.audienceLists || []).find(l => String(l.id) === String(listId));
        const contacts = store.getAudienceContacts(listId);

        // Set the dropdown value
        const select = document.getElementById('camp_audience');
        if (select) {
            select.value = 'list:' + listId;
        }

        // Show the audience info panel
        const audInfo = document.getElementById('camp_audience_info');
        if (audInfo) {
            audInfo.style.display = 'block';
            const nameEl = document.getElementById('camp_aud_import_name');
            const countEl = document.getElementById('camp_aud_import_count');
            if (nameEl) nameEl.textContent = list ? list.name : 'Selected Audience';
            if (countEl) countEl.textContent = contacts.filter(c => c.email).length + ' emails will be imported';
        }

        // Hide custom file wrap
        const customWrap = document.getElementById('camp_custom_file_wrap');
        if (customWrap) customWrap.style.display = 'none';

        // Close the overlay
        const overlay = document.getElementById('audiencePickerOverlay');
        if (overlay) overlay.remove();

        UI.showToast(`Audience "${list ? list.name : 'Unknown'}" selected — ${contacts.filter(c => c.email).length} emails loaded`, 'success');
    },

    _clearEditor() {
        const editor = document.getElementById('camp_html_editor');
        if (editor) {
            editor.value = '';
            this._updatePreview();
            this._updateCharCount();
        }
    },

    _insertSnippet() {
        const editor = document.getElementById('camp_html_editor');
        if (!editor) return;
        const snippet = `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#009ef7,#8a2be2);padding:30px 24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">Your Agency Name</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Professional Travel Solutions</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 24px;background:#ffffff;border-left:1px solid #eee;border-right:1px solid #eee;">
    <h2 style="color:#333;font-size:20px;margin:0 0 16px;">Hello {{FULL_NAME}},</h2>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">
      We have an exciting offer waiting for you. Check out our latest travel packages and exclusive deals.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="#" style="display:inline-block;background:linear-gradient(135deg,#009ef7,#0077cc);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;">Explore Packages →</a>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6;">
      If you have any questions, feel free to reply to this email.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f8f9fa;padding:20px 24px;border-radius:0 0 12px 12px;text-align:center;border:1px solid #eee;border-top:none;">
    <p style="color:#aaa;font-size:11px;margin:0;">© 2026 Your Agency. All rights reserved.</p>
    <p style="margin:8px 0 0;"><a href="#" style="color:#999;font-size:10px;text-decoration:underline;">Unsubscribe</a></p>
  </div>
</div>`;
        editor.value = snippet;
        this._updatePreview();
        this._updateCharCount();
        UI.showToast('Starter template inserted', 'success');
    },

    _setPreviewMode(mode) {
        const wrap = document.getElementById('camp_preview_wrap');
        const deskBtn = document.getElementById('camp_prev_desktop');
        const mobBtn = document.getElementById('camp_prev_mobile');
        if (!wrap) return;
        if (mode === 'mobile') {
            wrap.style.maxWidth = '375px';
            wrap.style.margin = '0 auto';
            wrap.style.borderLeft = '1px solid #e1e5eb';
            wrap.style.borderRight = '1px solid #e1e5eb';
            if (mobBtn) { mobBtn.style.background = 'rgba(0,158,247,0.15)'; mobBtn.style.color = '#009ef7'; }
            if (deskBtn) { deskBtn.style.background = 'transparent'; deskBtn.style.color = 'var(--text-muted)'; }
        } else {
            wrap.style.maxWidth = '';
            wrap.style.margin = '';
            wrap.style.borderLeft = '';
            wrap.style.borderRight = '';
            if (deskBtn) { deskBtn.style.background = 'rgba(0,158,247,0.15)'; deskBtn.style.color = '#009ef7'; }
            if (mobBtn) { mobBtn.style.background = 'transparent'; mobBtn.style.color = 'var(--text-muted)'; }
        }
    },

    save(id, launch = false) {
        const name = document.getElementById('camp_name').value;
        const subject = document.getElementById('camp_subject').value;

        if (!name) return UI.showToast('Campaign title is required.', 'error');
        if (!subject) return UI.showToast('Email subject is required.', 'error');

        const audienceRaw = document.getElementById('camp_audience').value;
        let audience = audienceRaw;
        let audienceListId = null;

        if (audienceRaw.startsWith('list:')) {
            audienceListId = audienceRaw.split(':')[1];
            const list = store.state.audienceLists.find(l => String(l.id) === audienceListId);
            audience = list ? list.type : 'B2B';
        }

        const existing = id && id !== 'null' ? store.state.campaigns.find(c => String(c.id) === String(id)) : null;

        // Read from new HTML editor if present, fallback to old textarea for backwards compat
        const htmlEditor = document.getElementById('camp_html_editor');
        const oldBody = document.getElementById('camp_body');
        const body = htmlEditor ? htmlEditor.value : (oldBody ? oldBody.value : '');

        const batchSize = parseInt(document.getElementById('camp_batch_size').value, 10) || null;
        const batchIntervalHours = parseFloat(document.getElementById('camp_batch_interval').value) || null;

        const data = {
            id: id && id !== 'null' ? id : Date.now(),
            name,
            type: document.getElementById('camp_type').value,
            category: document.getElementById('camp_cat').value,
            audience,
            audienceListId,
            importedEmails: this._importedEmails || existing?.importedEmails || [],
            batchSize,
            batchIntervalHours,
            subject,
            preheader: document.getElementById('camp_preheader').value || '',
            templateId: document.getElementById('camp_template').value || '',
            body,
            status: document.getElementById('camp_status').value,
            scheduledAt: document.getElementById('camp_schedule').value || '',
            date: existing?.date || new Date().toISOString().split('T')[0],
            stats: existing?.stats || { sent: 0, delivered: 0, opened: 0, clicks: 0, replied: 0 },
            conversions: existing?.conversions || 0,
            revenue: existing?.revenue || 0,
            agent: store.state.currentUser?.name || 'System'
        };

        store.saveCampaign(data);
        UI.showToast(`Campaign ${id && id !== 'null' ? 'updated' : 'created'} ${launch ? 'and preparing to launch' : 'successfully'}.`, 'success');
        Modal.close();
        this.render();

        if (launch && data.id) {
            setTimeout(() => this.sendNow(data.id), 500);
        }
    },

    async sendTest(id) {
        // Gather current form data
        const subject = document.getElementById('camp_subject')?.value || 'Test Campaign';
        const body = document.getElementById('camp_body')?.value || '<p>This is a test email.</p>';

        // Get test email from user
        const testEmail = prompt('Enter test email address:', store.state.currentUser?.email || '');
        if (!testEmail) return;

        const smtp = store.state.systemSettings?.smtpSettings;
        if (!smtp || !smtp.host) {
            return UI.showToast('SMTP not configured. Go to Settings → Email SMTP.', 'error');
        }

        UI.showToast('Sending test email...', 'info');

        try {
            const response = await fetch(store.apiBase() + '/api/smtp/send-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp: {
                        host: smtp.host,
                        port: smtp.port || 587,
                        username: smtp.username,
                        password: smtp.password,
                        encryption: smtp.encryption || 'TLS',
                        fromName: smtp.fromName || 'PM Travel Agency',
                        fromEmail: smtp.fromEmail || smtp.username,
                        replyTo: smtp.replyTo || smtp.fromEmail,
                        charset: smtp.charset || 'UTF-8',
                        useAuthAsFrom: smtp.useAuthAsFrom !== false,
                        allowSelfSigned: !!smtp.allowSelfSigned
                    },
                    template: { subject, body },
                    campaign: { name: 'Test' },
                    recipients: [testEmail]
                })
            });

            const result = await response.json();
            if (result.ok && result.sent > 0) {
                UI.showToast(`✓ Test email sent to ${testEmail}`, 'success');
            } else {
                UI.showToast(`Failed: ${result.message || 'Unknown error'}`, 'error');
            }
        } catch (err) {
            UI.showToast(`Error: ${err.message}. Is the SMTP server running?`, 'error');
        }
    },

    async sendNow(id) {
        const campaign = store.state.campaigns.find(c => String(c.id) === String(id));
        if (!campaign) return UI.showToast('Campaign not found', 'error');

        // Get recipients
        let recipients = [];
        if (campaign.audienceListId) {
            recipients = store.getAudienceContacts(campaign.audienceListId).map(c => c.email).filter(Boolean);
        } else if (campaign.audience === 'B2B') {
            recipients = store.state.b2bClients.map(c => c.email).filter(Boolean);
        } else if (campaign.audience === 'B2C') {
            recipients = store.state.b2cClients.map(c => c.email).filter(Boolean);
        } else if (campaign.audience === 'B2B_B2C') {
            const b2b = store.state.b2bClients.map(c => c.email).filter(Boolean);
            const b2c = store.state.b2cClients.map(c => c.email).filter(Boolean);
            // Combine and dedup
            recipients = [...new Set([...b2b, ...b2c])];
        } else if (campaign.audience === 'Custom') {
            recipients = campaign.importedEmails || [];
        }

        // DIAGNOSTICS
        const b2bCount = store.state.b2bClients.length;
        const b2cCount = store.state.b2cClients.length;
        console.log(`DIAGNOSTICS: B2B=${b2bCount}, B2C=${b2cCount}, Selected=${recipients.length}`);

        if (recipients.length === 0) {
            let errorMsg = 'No recipients found.';
            if (campaign.audience !== 'Custom') {
                if (b2bCount === 0 && b2cCount === 0) {
                    errorMsg += '\n\nYOUR CLIENT LISTS ARE EMPTY.\nPlease go to B2B or B2C Clients and add people first.';
                } else {
                    errorMsg += '\n\nClients exist but were filtered out (blacklist?).';
                }
            } else {
                errorMsg += '\n\nPlease import a valid CSV/TXT file with emails.';
            }
            alert(errorMsg);
            return UI.showToast(errorMsg, 'error');
        }

        // Filter out blacklisted
        recipients = recipients.filter(e => !store.isBlacklisted(e));

        // DEBUG: Check for the specific test email the user is complaining about
        const problematicEmail = 'b2bpmtravelagency@gmail.com';
        if (recipients.includes(problematicEmail)) {
            const inB2B = store.state.b2bClients.some(c => c.email === problematicEmail);
            const inB2C = store.state.b2cClients.some(c => c.email === problematicEmail);
            let msg = `DEBUG: Found ${problematicEmail} in your list!`;
            if (inB2B) msg += `\nIt is in B2B Clients. Please delete it there.`;
            if (inB2C) msg += `\nIt is in B2C Clients. Please delete it there.`;
            alert(msg);
        }

        if (recipients.length === 0) {
            return UI.showToast('No valid recipients found.', 'error');
        }

        let confirmMsg = `
            <div style="text-align:left;">
                <p>Ready to launch campaign <b>${campaign.name}</b>?</p>
                <ul style="background:rgba(0,0,0,0.1); padding:10px 20px; border-radius:5px; margin:10px 0; font-size:13px;">
                    <li><b>Audience:</b> ${campaign.audience === 'B2B_B2C' ? 'B2B & B2C' : campaign.audience}</li>
                    <li><b>Recipient Count:</b> ${recipients.length}</li>
        `;
        if (campaign.batchSize && campaign.batchIntervalHours) {
            confirmMsg += `<li><b>Batch Configuration:</b> ${campaign.batchSize} per ${campaign.batchIntervalHours}h</li>`;
        }
        confirmMsg += `
                </ul>
                <div style="margin:15px 0; padding:12px; background:rgba(100,150,255,0.1); border-left:3px solid var(--info); border-radius:4px;">
                    <div style="font-size:12px; margin-bottom:8px; font-weight:600;">Send Mode:</div>
                    <label style="display:flex; align-items:center; margin:8px 0; cursor:pointer; font-size:12px;">
                        <input type="radio" name="sendMode" value="direct" style="margin-right:8px;">
                        <span><b>Direct Send</b> - Sends immediately (real-time, up to ${recipients.length} emails)</span>
                    </label>
                    <label style="display:flex; align-items:center; margin:8px 0; cursor:pointer; font-size:12px;">
                        <input type="radio" name="sendMode" value="queue" checked style="margin-right:8px;">
                        <span><b>Queue & Process</b> - Queues emails, background worker processes every 15s</span>
                    </label>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:5px;">Target Sample:</div>
                <div style="background:#000; color:#0f0; padding:10px; font-family:monospace; font-size:11px; border-radius:4px; max-height:80px; overflow-y:auto;">
                    ${recipients.slice(0, 5).join('<br>')}
                    ${recipients.length > 5 ? `<br>...and ${recipients.length - 5} more` : ''}
                </div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:10px;">Please confirm to proceed.</p>
            </div>
        `;

        UI.confirm('Launch Campaign', confirmMsg, async () => {
            const smtp = store.state.systemSettings?.smtpSettings;
            if (!smtp || !smtp.host) {
                return UI.showToast('SMTP not configured.', 'error');
            }

            // Get selected send mode from radio button
            const sendMode = document.querySelector('input[name="sendMode"]:checked')?.value || 'queue';
            const endpoint = sendMode === 'direct' 
                ? '/api/campaigns/send-direct' 
                : '/api/campaigns/send';

            if (sendMode === 'direct') {
                UI.showToast(`Sending ${recipients.length} emails directly (real-time)...`, 'info');
            } else {
                if (campaign.batchSize && campaign.batchIntervalHours) {
                    UI.showToast(`Queuing ${recipients.length} recipients in batches...`, 'info');
                } else {
                    UI.showToast(`Queuing ${recipients.length} emails...`, 'info');
                }
            }

            try {
                if (sendMode === 'direct') {
                    // Direct send with streaming response
                    const response = await fetch(store.apiBase() + endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            template: {
                                subject: campaign.subject,
                                body: campaign.body
                            },
                            campaign: { name: campaign.name, id: campaign.id },
                            recipients
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Send failed');
                    }

                    // Handle streaming NDJSON response
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let sent = 0, failed = 0, total = recipients.length;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n').filter(l => l.trim());

                        for (const line of lines) {
                            try {
                                const event = JSON.parse(line);
                                if (event.status === 'sent') {
                                    sent++;
                                    console.log(`✓ Sent to ${event.email}`);
                                } else if (event.status === 'failed') {
                                    failed++;
                                    console.warn(`✗ Failed to ${event.email}: ${event.error}`);
                                } else if (event.status === 'complete') {
                                    console.log(`Direct send complete: ${event.sent} sent, ${event.failed} failed`);
                                }
                            } catch (e) { }
                        }
                    }

                    UI.showToast(`✓ Direct send complete: ${sent} sent, ${failed} failed`, 'success');
                } else {
                    // Queue mode (existing flow)
                    const response = await fetch(store.apiBase() + endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            template: {
                                subject: campaign.subject,
                                body: campaign.body
                            },
                            campaign: { name: campaign.name, id: campaign.id },
                            recipients,
                            batchSize: campaign.batchSize,
                            batchIntervalHours: campaign.batchIntervalHours
                        })
                    });

                    const result = await response.json();
                    if (!result.ok) throw new Error(result.message);

                    UI.showToast(`✓ ${result.message}`, 'success');
                    const toDemo = result.queued || recipients.length;
                    if (toDemo > 0) {
                        setTimeout(() => this.startLiveSimulation(campaign.id, toDemo), 2000);
                    }
                }

                // Update campaign status
                campaign.status = 'sent';
                campaign.sentAt = new Date().toISOString();
                store.saveCampaign(campaign);
                this.render();

            } catch (err) {
                UI.showToast(`Error: ${err.message}`, 'error');
            }
        });
    },

    startLiveSimulation(id, maxSent) {
        if (!maxSent || maxSent <= 0) return;

        // Initial setup
        let currentDelivered = maxSent;
        let currentOpened = 0;
        let currentClicked = 0;
        let currentBounced = 0;
        let currentUnsub = 0;
        let currentConversions = 0;

        let ticks = 0;
        const maxTicks = 15;

        // Add a "Live" badge to the UI if possible
        const addBadgeInterval = setInterval(() => {
            const titleEl = document.querySelector('.modal-title');
            if (titleEl && window.currentViewStatsId === id && !titleEl.innerHTML.includes('Live')) {
                titleEl.innerHTML += ' <span style="background:var(--danger);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:8px;animation:pulse 1.5s infinite;">LIVE</span>';
            }
        }, 500);

        const interval = setInterval(() => {
            ticks++;
            if (ticks > maxTicks) {
                clearInterval(interval);
                clearInterval(addBadgeInterval);
                const titleEl = document.querySelector('.modal-title');
                if (titleEl && window.currentViewStatsId === id) {
                    titleEl.innerHTML = titleEl.innerHTML.replace(/<span.*?LIVE<\/span>/, '');
                }
                return;
            }

            // Simulate engagement
            const newOpens = Math.floor(Math.random() * (currentDelivered * 0.15) + 1);
            currentOpened = Math.min(currentDelivered, currentOpened + newOpens);

            const newClicks = Math.floor(Math.random() * (currentOpened * 0.25) + 1);
            currentClicked = Math.min(currentOpened, currentClicked + newClicks);

            if (Math.random() > 0.6) currentUnsub += 1;
            if (Math.random() > 0.7 && currentBounced < maxSent * 0.05) currentBounced += 1;
            if (Math.random() > 0.5 && currentClicked > 0) currentConversions += 1;

            // Advanced SOP Metrics Simulation
            const unique_opens = Math.floor(currentOpened * 0.85); // Assume 15% are repeat/Apple Mail proxy
            const unique_clicks = Math.floor(currentClicked * 0.9);
            const bounce_hard = Math.floor(currentBounced * 0.4); // 40% hard bounces
            const bounce_soft = currentBounced - bounce_hard;
            const complaints = Math.random() > 0.9 ? 1 : 0;
            const errors = Math.random() > 0.95 ? 1 : 0;

            const revenue = currentConversions * (Math.floor(Math.random() * 500) + 500);
            const cpa = currentConversions > 0 ? (maxSent * 0.01) / currentConversions : 0; // Fake cost basis
            const rpe = maxSent > 0 ? revenue / maxSent : 0;

            store.updateCampaignAnalytics(id, {
                opened: currentOpened,
                clicked: currentClicked,
                bounced: currentBounced,
                unsubscribed: currentUnsub,
                unique_opens,
                unique_clicks,
                bounce_hard,
                bounce_soft,
                complaints,
                errors,
                revenue,
                cpa,
                rpe
            });

            const campaign = store.state.campaigns.find(c => String(c.id) === String(id));
            if (campaign) {
                campaign.conversions = currentConversions;
                campaign.revenue = revenue;
            }

            // Re-render modal if it's currently open for THIS campaign
            if (window.currentViewStatsId === String(id)) {
                this.viewStats(id, true);
            }
            this.render(); // Update main table

        }, 2000);
    },

    delete(id) {
        UI.confirm('Delete Campaign', 'Are you sure you want to delete this campaign and its analytics?', () => {
            store.deleteCampaign(id);
            this.render();
            UI.showToast('Campaign deleted.', 'success');
        });
    },

    viewStats(id, isUpdate = false) {
        const campaign = store.state.campaigns.find(c => String(c.id) === String(id));
        if (!campaign) return UI.showToast('Campaign not found', 'error');

        // Track open modal
        window.currentViewStatsId = String(id);

        const stats = campaign.stats || {};
        const analytics = store.getCampaignAnalytics(id);

        const sent = stats.sent || analytics.sent || 0;
        const delivered = stats.delivered || analytics.delivered || 0;
        const opened = stats.opened || analytics.unique_opens || 0;
        const clicked = stats.unique_clicks || analytics.unique_clicks || 0;
        const bounced = stats.total_bounces || analytics.total_bounces || 0;
        const unsubscribed = stats.unsubs || analytics.unsubs || 0;

        const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0;
        const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0;
        const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0;
        const isEmail = campaign.type === 'Email';

        // Check if modal is already open and just update contents without full reopen jump
        const modalWrap = document.getElementById('modalWrap');
        if (isUpdate && modalWrap && modalWrap.classList.contains('active')) {
            const bodyEl = document.getElementById('modalBody');
            if (bodyEl) {
                bodyEl.innerHTML = this._getStatsHtml(campaign, sent, delivered, opened, clicked, bounced, unsubscribed, openRate, clickRate, bounceRate, isEmail);
                return;
            }
        }

        Modal.open({
            title: `<i class="fa-solid fa-chart-line" style="color:#009ef7; margin-right:8px;"></i> Campaign Analytics`,
            width: '720px',
            body: this._getStatsHtml(campaign, sent, delivered, opened, clicked, bounced, unsubscribed, openRate, clickRate, bounceRate, isEmail),
            footer: `
                <button class="btn-cancel" onclick="window.currentViewStatsId = null; Modal.close()" style="border-radius:10px;">Close</button>
                <div style="display:flex; gap:8px;">
                    <button class="btn-secondary" onclick="window.currentViewStatsId = null; Modal.close(); Campaigns.openModal('${id}')" style="border-radius:10px; font-weight:700;"><i class="fa-solid fa-pen" style="margin-right:5px;"></i> Edit</button>
                    ${campaign.status !== 'sent' ? `<button class="btn-primary" onclick="window.currentViewStatsId = null; Modal.close(); Campaigns.sendNow('${id}')" style="border-radius:10px; font-weight:700; box-shadow:0 6px 16px rgba(0,158,247,0.3);"><i class="fa-solid fa-paper-plane" style="margin-right:5px;"></i> Send Now</button>` : ''}
                </div>
            `
        });
    },

    _getStatsHtml(campaign, sent, delivered, opened, clicked, bounced, unsubscribed, openRate, clickRate, bounceRate, isEmail) {
        const stats = store.getCampaignAnalytics(campaign.id);

        // Detailed metrics
        const bounceHard = stats.bounce_hard || 0;
        const bounceSoft = stats.bounce_soft || 0;
        const complaints = stats.complaints || 0;
        const uniqueOpens = stats.unique_opens || opened;
        const uniqueClicks = stats.unique_clicks || clicked;
        const errors = stats.errors || 0;

        const conversions = campaign.conversions || 0;
        const revenue = stats.revenue || campaign.revenue || 0;
        const ctor = uniqueOpens > 0 ? ((uniqueClicks / uniqueOpens) * 100).toFixed(1) : 0;
        const complainRate = delivered > 0 ? ((complaints / delivered) * 100).toFixed(1) : 0;
        const unsubRate = delivered > 0 ? ((unsubscribed / delivered) * 100).toFixed(1) : 0;

        window.currentStatsTab = window.currentStatsTab || 'overview';
        const getActiveTab = () => window.currentStatsTab;

        // Helper to generate tabs
        const navItem = (id, icon, label) => `
            <div onclick="window.currentStatsTab='${id}'; document.getElementById('statsContent').innerHTML=Campaigns._getStatsTabContent('${campaign.id}', '${id}'); document.querySelectorAll('.stats-tab').forEach(el=>el.classList.remove('active')); this.classList.add('active');" 
                 class="stats-tab ${getActiveTab() === id ? 'active' : ''}" 
                 style="padding:10px 16px; cursor:pointer; border-radius:8px; font-weight:700; font-size:12px; display:flex; align-items:center; gap:8px; transition:all 0.2s;">
                <i class="${icon}"></i> ${label}
            </div>
        `;

        window.currentStatsData = { campaign, sent, delivered, opened, clicked, bounced, unsubscribed, openRate, clickRate, bounceRate, isEmail, stats, bounceHard, bounceSoft, complaints, uniqueOpens, uniqueClicks, errors, conversions, revenue, ctor, complainRate, unsubRate };

        return `
            <style>
                .stats-tab { color: var(--text-muted); background: transparent; }
                .stats-tab:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
                .stats-tab.active { background: rgba(0,158,247,0.1); color: #009ef7; }
                
                .stats-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .stats-section-title {
                    font-size: 13px; font-weight: 800; color: var(--primary);
                    text-transform: uppercase; letter-spacing: 1px;
                    margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
                }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; }
                .stat-box { text-align: left; padding: 12px; background: rgba(0,0,0,0.1); border-radius: 8px; }
                .stat-val { font-size: 20px; font-weight: 800; margin-bottom: 4px; color: var(--text-primary); }
                .stat-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
            </style>

            <!-- Campaign Header Info -->
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
                <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, ${isEmail ? 'rgba(0,158,247,0.15), rgba(0,158,247,0.05)' : 'rgba(23,198,83,0.15), rgba(23,198,83,0.05)'}); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="${isEmail ? 'fa-solid fa-envelope' : 'fa-brands fa-whatsapp'}" style="font-size:18px; color:${isEmail ? '#009ef7' : '#17c653'};"></i>
                </div>
                <div style="flex:1;">
                    <h3 style="font-size:18px; font-weight:800; margin:0; letter-spacing:-0.5px;">${campaign.name}</h3>
                    <div style="display:flex; gap:10px; margin-top:5px; font-size:11px; color:var(--text-muted); font-weight:500;">
                        <span style="font-weight:700; padding:2px 8px; border-radius:6px; background:${isEmail ? 'rgba(0,158,247,0.08)' : 'rgba(23,198,83,0.08)'}; color:${isEmail ? '#009ef7' : '#17c653'};">${campaign.type}</span>
                        <span class="status-badge status-${campaign.status}" style="font-size:10px;">${campaign.status.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div style="display:flex; gap:5px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px; overflow-x:auto;">
                ${navItem('overview', 'fa-solid fa-chart-pie', 'Overview')}
                ${navItem('deliverability', 'fa-solid fa-paper-plane', 'Deliverability')}
                ${navItem('links', 'fa-solid fa-link', 'Links')}
            </div>

            <!-- Tab Content Area -->
            <div id="statsContent">
                ${this._getStatsTabContent(campaign.id, getActiveTab())}
            </div>
        `;
    },

    _getStatsTabContent(campaignId, tab) {
        const d = window.currentStatsData;
        if (!d) return '';

        if (tab === 'overview') {
            const aiAlerts = [];
            // SOP AI Rules
            if (d.bounceRate > 5) {
                aiAlerts.push({ text: "High Bounce Rate > 5%. List quality problem detected. Consider cleaning your email list to avoid permanent blacklisting.", type: "danger", icon: "fa-triangle-exclamation" });
            }
            if (d.complainRate > 0.1) {
                aiAlerts.push({ text: "Spam Complaint Rate > 0.1%. Stop campaign immediately to protect sender reputation.", type: "danger", icon: "fa-ban" });
            }
            if (d.clickRate < 1 && d.delivered > 200) {
                aiAlerts.push({ text: "CTR < 1% after 200+ delivered. CTA or offer is weak. Consider revising your content for better engagement.", type: "warning", icon: "fa-lightbulb" });
            }
            if (d.bounceHard > 10) {
                aiAlerts.push({ text: "Spike in hard bounces detected (potential Outlook/Gmail block). Check SPF/DKIM or content issues.", type: "warning", icon: "fa-envelope-circle-check" });
            }

            if (aiAlerts.length === 0 && d.delivered > 0) {
                aiAlerts.push({ text: "Campaign is performing well. Deliverability and engagement are within expected ranges.", type: "success", icon: "fa-check-circle" });
            }

            const aiHtml = aiAlerts.map(a => `
                <div style="margin-bottom:12px; padding:12px 15px; background:var(--bg-card); border-left:3px solid var(--${a.type}); border-radius:6px; font-size:12px; display:flex; gap:12px; align-items:flex-start; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <i class="fa-solid ${a.icon}" style="color:var(--${a.type}); margin-top:2px; font-size:14px;"></i>
                    <div style="color:var(--text-primary); font-weight:500; line-height:1.4;">${a.text}</div>
                </div>
            `).join('');

            return `
                <div class="stats-section">
                    <div class="stats-section-title"><i class="fa-solid fa-chart-pie"></i> Performance Overview</div>
                    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="stat-box"><div class="stat-val" style="color:#009ef7;">${d.delivered}</div><div class="stat-lbl">Delivered</div></div>
                        <div class="stat-box"><div class="stat-val" style="color:#17c653;">${d.uniqueClicks} <span style="font-size:12px; color:var(--text-muted);">(${d.clickRate}%)</span></div><div class="stat-lbl">Unique Clicks / CTR</div></div>
                        <div class="stat-box"><div class="stat-val" style="color:var(--danger);">${d.unsubscribed} <span style="font-size:12px; color:var(--text-muted);">(${d.unsubRate}%)</span></div><div class="stat-lbl">Unsubscribes / Rate</div></div>
                    </div>
                </div>
                <div class="stats-section">
                    <div class="stats-section-title"><i class="fa-solid fa-robot" style="color:#009ef7"></i> Real-Time AI Agent Insights</div>
                    ${aiHtml || '<div style="font-size:12px; color:var(--text-muted); font-style:italic;">No insights generated yet. Waiting for more data to analyze.</div>'}
                </div>
            `;
        }

        if (tab === 'deliverability') {
            return `
                <div class="stats-section">
                    <div class="stats-section-title"><i class="fa-solid fa-paper-plane"></i> Delivery Metrics</div>
                    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="stat-box"><div class="stat-val">${d.sent}</div><div class="stat-lbl">Processed</div></div>
                        <div class="stat-box"><div class="stat-val" style="color:#17c653;">${d.delivered} <span style="font-size:12px; color:var(--text-muted);">(${((d.delivered / d.sent) * 100 || 0).toFixed(1)}%)</span></div><div class="stat-lbl">Delivered</div></div>
                        <div class="stat-box"><div class="stat-val" style="color:var(--warning);">${d.bounced} <span style="font-size:12px; color:var(--text-muted);">(${d.bounceRate}%)</span></div><div class="stat-lbl">Total Bounces</div></div>
                        <div class="stat-box"><div class="stat-val" style="color:var(--danger);">${d.complaints} <span style="font-size:12px; color:var(--text-muted);">(${d.complainRate}%)</span></div><div class="stat-lbl">Spam Complaints</div></div>
                    </div>
                </div>
                <div class="stats-section">
                    <div class="stats-section-title"><i class="fa-solid fa-bug"></i> Bounce Diagnostics</div>
                    <div style="display:flex; gap:20px;">
                        <div style="flex:1;">
                            <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Bounce Types</div>
                            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                                <span style="font-size:13px; font-weight:600;">Hard Bounces (Invalid)</span><span style="font-family:monospace; font-size:14px; font-weight:700; color:var(--danger);">${d.bounceHard}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; padding:8px 0;">
                                <span style="font-size:13px; font-weight:600;">Soft Bounces (Temp)</span><span style="font-family:monospace; font-size:14px; font-weight:700; color:var(--warning);">${d.bounceSoft}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (tab === 'links') {
            const topLinks = d.stats.top_links || [];
            let rowsHtml = '';

            if (topLinks.length === 0) {
                rowsHtml = `<tr><td colspan="3" style="padding:15px; text-align:center; color:var(--text-muted); font-style:italic;">No link clicks recorded yet.</td></tr>`;
            } else {
                rowsHtml = topLinks.map(link => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding:10px; font-family:monospace; color:var(--primary); word-break:break-all;"><a href="${link.url}" target="_blank" style="color:var(--primary); text-decoration:none;">${link.url}</a></td>
                        <td style="padding:10px; text-align:right; font-weight:700; color:var(--success);">${link.unique}</td>
                        <td style="padding:10px; text-align:right;">${link.total}</td>
                    </tr>
                `).join('');
            }

            return `
                <div class="stats-section">
                    <div class="stats-section-title"><i class="fa-solid fa-link"></i> Click Tracking</div>
                    <div style="border: 1px solid var(--border); border-radius:8px; overflow:hidden;">
                        <table class="data-table" style="font-size:12px; margin:0; width:100%; border-collapse:collapse;">
                            <thead style="background: rgba(0,0,0,0.2);">
                                <tr>
                                    <th style="padding:10px; text-align:left;">Link URL</th>
                                    <th style="padding:10px; text-align:right; width:120px;">Unique Clicks</th>
                                    <th style="padding:10px; text-align:right; width:120px;">Total Clicks</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        return '';
    },

    delete(id) {
        UI.confirm('Delete Campaign', 'Are you sure you want to delete this campaign? This action cannot be undone.', () => {
            store.deleteCampaign(id);
            this.render();
            UI.showToast('Campaign deleted successfully', 'success');
        }, 'danger');
    },

    async processPendingQueue() {
        const btn = document.getElementById('btnProcessQueue');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:5px;"></i> Processing...';
        btn.disabled = true;

        try {
            const response = await fetch(store.apiBase() + '/api/worker/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.ok) {
                const remainingMsg = result.remaining > 0 ? ` (${result.remaining} left)` : '';
                UI.showToast(result.message || 'Queue processing complete', 'success');
                // Refresh analytics to show progress
                await store.fetchCampaignAnalytics();
                this.render();

                // If there were many emails, the user might want to know there are more
                if (result.remaining > 0) {
                    const btnNow = document.getElementById('btnProcessQueue');
                    if (btnNow) btnNow.innerHTML = `<i class="fa-solid fa-play" style="margin-right:5px;"></i> Process Next 50 (${result.remaining} left)`;
                }
            } else {
                UI.showToast('Error processing queue: ' + result.message, 'error');
            }
        } catch (err) {
            UI.showToast('Failed to trigger worker: ' + err.message, 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
};

window.Campaigns = Campaigns;

