
const Settings = {
    activeTab: 'account',

    async init() {
        try {
            // Fetch SMTP
            const res = await fetch(store.apiBase() + '/api/settings/email');
            const data = await res.json();
            if (data.ok && data.smtp) {
                store.state.systemSettings.smtpSettings = {
                    ...store.state.systemSettings.smtpSettings,
                    ...data.smtp
                };
            }

            // Fetch Security
            const resSec = await fetch(store.apiBase() + '/api/settings/security');
            const dataSec = await resSec.json();
            if (dataSec.ok && dataSec.security) {
                store.state.systemSettings.security = {
                    ...store.state.systemSettings.security,
                    ...dataSec.security
                };
                console.log('Settings: Configuration loaded from server.');
            }
        } catch (e) {
            console.error('Settings: Failed to load config', e);
        }
    },

    updateLanguage(value) {
        const v = (value || '').trim() || 'English';
        if (window.LanguageManager && typeof window.LanguageManager.set === 'function') {
            window.LanguageManager.set(v);
        } else {
            store.state.systemSettings.language = v;
            store.state.currentUser.language = v;
            try { localStorage.setItem('currentUser', JSON.stringify(store.state.currentUser)); } catch (_) { }
            try { localStorage.setItem('pm_crm_language_v1', v); } catch (_) { }
        }
        UI.showToast(`Language set to ${v}`, 'success');
    },

    updateCurrency(code) {
        const c = (code || '').trim() || 'USD';
        // Persist through CurrencyManager when available, otherwise set directly.
        if (window.CurrencyManager && typeof window.CurrencyManager.set === 'function') {
            window.CurrencyManager.set(c);
        } else {
            store.state.systemSettings.currency = c;
        }
        UI.showToast(`Default currency set to ${c}`, 'success');
    },

    render() {
        const content = document.getElementById('mainContent');
        const user = store.state.currentUser || {};

        content.innerHTML = `
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 35px; animate-fade-in;">
                 <div>
                    <h2 class="page-title" style="font-size: 26px; font-weight:800; letter-spacing:-1px; margin-bottom:8px;">System Intelligence</h2>
                    <p style="color:var(--text-secondary); font-size:14px; font-weight:500;">Configure your executive workspace and business infrastructure.</p>
                </div>
                 <div style="display:flex; gap:12px;">
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="Settings.saveGlobalChanges(this)">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Sync Environment
                    </button>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 280px 1fr; gap:35px;" class="page-transition">
                <!-- Executive Settings Sidebar -->
                <div class="card" style="padding:15px; background:rgba(255,255,255,0.02); height:fit-content; position:sticky; top:20px;">
                    <div class="nav-section" style="padding: 10px 15px 15px; opacity:0.6;">Workspace Configuration</div>
                    <div class="left-nav">
                        <div class="nav-item ${this.activeTab === 'account' ? 'active' : ''}" onclick="Settings.switchTab('account')">
                            <div class="nav-left"><i class="fa-solid fa-user-shield nav-icon"></i> User Profile</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'company' ? 'active' : ''}" onclick="Settings.switchTab('company')">
                            <div class="nav-left"><i class="fa-solid fa-building nav-icon"></i> Company Info</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'team' ? 'active' : ''}" onclick="Settings.switchTab('team')">
                            <div class="nav-left"><i class="fa-solid fa-users-gear nav-icon"></i> Team Management</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'currency' ? 'active' : ''}" onclick="Settings.switchTab('currency')">
                            <div class="nav-left"><i class="fa-solid fa-coins nav-icon"></i> Currencies</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'notifications' ? 'active' : ''}" onclick="Settings.switchTab('notifications')">
                            <div class="nav-left"><i class="fa-solid fa-bell nav-icon"></i> Alert Protocols</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'email' ? 'active' : ''}" onclick="Settings.switchTab('email')">
                            <div class="nav-left"><i class="fa-solid fa-envelope nav-icon"></i> Email (SMTP)</div>
                        </div>
                        <div class="nav-section" style="padding: 25px 15px 15px; opacity:0.6;">Management</div>
                        <div class="nav-item ${this.activeTab === 'security' ? 'active' : ''}" onclick="Settings.switchTab('security')">
                            <div class="nav-left"><i class="fa-solid fa-shield-halved nav-icon"></i> Data Security</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'integrations' ? 'active' : ''}" onclick="Settings.switchTab('integrations')">
                            <div class="nav-left"><i class="fa-solid fa-plug nav-icon"></i> App Ecosystem</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'maintenance' ? 'active' : ''}" onclick="Settings.switchTab('maintenance')">
                            <div class="nav-left"><i class="fa-solid fa-screwdriver-wrench nav-icon"></i> Maintenance</div>
                        </div>
                        <div class="nav-item ${this.activeTab === 'backup' ? 'active' : ''}" onclick="Settings.switchTab('backup')">
                            <div class="nav-left"><i class="fa-solid fa-database nav-icon"></i> Redundancy</div>
                        </div>
                    </div>
                </div>

                <!-- Settings Content Area -->
                <div class="card" style="padding:40px; min-height:600px; background:rgba(255,255,255,0.01);">
                    <div id="settingsContent" class="animate-fade-in">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;
    },

    saveGlobalChanges(btn) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            store.logAction('SETTINGS', 'SAVE_GLOBAL', 'SYSTEM', 'success', 'All system changes saved successfully');
            UI.showFeedback(btn, 'success');
        }, 1000);
    },

    toggleLinkedAccount(provider, enabled) {
        // Mock linking logic
        if (!store.state.currentUser.linkedAccounts) store.state.currentUser.linkedAccounts = [];

        if (enabled) {
            store.state.currentUser.linkedAccounts.push(provider);
            store.logAction('SETTINGS', 'LINK_ACCOUNT', provider, 'success', `Linked ${provider} account`);
        } else {
            // SOP Rule 8: Prevent unlink if it's the only method (simplified check)
            if (store.state.currentUser.authProvider === provider && store.state.currentUser.linkedAccounts.length <= 1) {
                alert('Cannot unlink your only sign-in method.');
                this.render(); // Revert toggle
                return;
            }
            store.state.currentUser.linkedAccounts = store.state.currentUser.linkedAccounts.filter(p => p !== provider);
            store.logAction('SETTINGS', 'UNLINK_ACCOUNT', provider, 'success', `Unlinked ${provider} account`);
        }

        // Persist
        localStorage.setItem('currentUser', JSON.stringify(store.state.currentUser));
        this.render();
    },

    switchTab(tab) {
        const user = store.state.currentUser || {};
        const isAdmin = user.role === 'admin';
        const isManager = user.role === 'manager';

        // Role-based access control for certain tabs
        if ((tab === 'team' || tab === 'security' || tab === 'backup' || tab === 'currency' || tab === 'company') && !isAdmin && !isManager) {
            alert('MANAGEMENT ONLY: This section requires executive privileges.');
            return;
        }

        if (tab === 'integrations' && !isAdmin && !isManager) {
            alert('MANAGEMENT ONLY: This section is restricted to Managers and Admins.');
            return;
        }

        if (tab === 'email' && !isAdmin && !isManager) {
            alert('MANAGEMENT ONLY: SMTP Configuration requires executive clearance.');
            return;
        }

        this.activeTab = tab;
        this.render();
    },

    uploadAvatar(btn) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                const base64 = event.target.result;
                store.state.currentUser.avatar = base64;

                // Save immediately
                localStorage.setItem('currentUser', JSON.stringify(store.state.currentUser));
                store.logAction('ACCOUNT', 'UPDATE_AVATAR', 'SYSTEM', 'success', 'Identity photo synchronized');
                store.notify();
                UI.showToast('Identity Photo Updated!', 'success');
            };
            reader.readAsDataURL(file);
        };
        input.click();
    },

    renderActiveTab() {
        const user = store.state.currentUser || {};
        const company = store.state.company;
        const sys = store.state.systemSettings;

        switch (this.activeTab) {
            case 'company':
                return this.renderCompanyTab();
            case 'currency':
                return this.renderCurrencyTab();
            case 'email':
                return this.renderEmailTab();
            case 'maintenance':
                return this.renderMaintenanceTab();
            case 'security':
                return this.renderSecurityTab();
            case 'account':
                return `
                    <div class="section-header" style="margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                        <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Account Intel</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Manage your personal identity and security parameters.</p>
                    </div>

                    <div class="analytics-card-luxury" style="display:flex; align-items:center; gap:30px; margin-bottom:40px; padding:30px;">
                        <div style="position:relative;">
                            <img src="${user.avatar || 'https://ui-avatars.com/api/?name=User'}" style="width:100px; height:100px; border-radius:18px; border:2px solid var(--border-bright); object-fit:cover;">
                            <div style="position:absolute; bottom:-5px; right:-5px; background:var(--success); width:20px; height:20px; border-radius:50%; border:3px solid var(--bg-card); box-shadow:0 0 10px var(--success-glow);"></div>
                        </div>
                        <div>
                            <button class="btn-secondary" style="height:40px; font-size:12px; margin-bottom:8px;" onclick="Settings.uploadAvatar(this)">
                                <i class="fa-solid fa-camera"></i> Update Identity Photo
                            </button>
                            <p style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px;">SOP Identity Verification Active</p>
                        </div>
                    </div>

                    <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:25px;">
                        <div class="form-group"><label>Operational Name</label><input type="text" class="form-control" value="${user.name || ''}"></div>
                        <div class="form-group"><label>Communication Email</label><input type="email" class="form-control" value="${user.email || ''}"></div>
                    </div>

                    <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:40px;">
                        <div class="form-group">
                            <label>Designation</label>
                            <div class="form-control" style="background:rgba(255,255,255,0.02) !important; color:var(--primary); font-weight:800; opacity:0.8;">
                                <i class="fa-solid fa-crown" style="margin-right:10px;"></i> ${user.role?.toUpperCase() || 'EXECUTIVE'}
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Environment Language</label>
                            <div class="select-wrap">
                                <select class="form-control input-select" onchange="Settings.updateLanguage(this.value); UI.showFeedback(this, 'success')">
                                    ${(store.state.languages || [
                        { code: 'en', label: 'English' },
                        { code: 'fr', label: 'French' },
                        { code: 'es', label: 'Spanish' },
                        { code: 'ar', label: 'Arabic' }
                    ]).map(l => `
                                        <option value="${l.label}" ${((store.state.currentUser?.language || sys.language) === l.label ? 'selected' : '')}>${l.label}</option>
                                    `).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>

                    <div class="section-header" style="margin:40px 0 20px; opacity:0.6;">
                        <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Security & Linked Assets</h4>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:40px;">
                        ${['google', 'microsoft', 'linkedin', 'facebook'].map(provider => {
                        const isLinked = user.linkedAccounts && user.linkedAccounts.includes(provider);
                        const icons = { google: 'fa-google', microsoft: 'fa-microsoft', linkedin: 'fa-linkedin', facebook: 'fa-facebook' };
                        const colors = { google: '#DB4437', microsoft: '#00A4EF', linkedin: '#0A66C2', facebook: '#1877F2' };
                        return `
                                <div class="analytics-card-luxury" style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:rgba(255,255,255,0.01);">
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <i class="fa-brands ${icons[provider]}" style="color:${colors[provider]}; font-size:20px;"></i>
                                        <span style="font-size:14px; font-weight:700; text-transform:capitalize;">${provider} Intelligence</span>
                                    </div>
                                    <label class="switch" style="transform: scale(0.8);">
                                        <input type="checkbox" ${isLinked ? 'checked' : ''} onchange="Settings.toggleLinkedAccount('${provider}', this.checked)">
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            `;
                    }).join('')}
                    </div>

                    <button class="btn-secondary" style="width:100%; border-color:var(--danger); color:var(--danger); background:rgba(248,40,90,0.02);" onclick="Auth.confirmLogout()">
                        <i class="fa-solid fa-right-from-bracket"></i> Terminate Executive Session
                    </button>
                `;
            case 'company':
                return `
                    <div class="section-header" style="margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                        <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Corporate Identity</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Define your official brand assets and legal business configuration.</p>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:25px;">
                        <div class="form-group"><label>Established Legal Name</label><input type="text" class="form-control" value="${company.name}"></div>
                        <div class="form-group"><label>Digital Domain</label><input type="text" class="form-control" value="${company.website}"></div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:25px;">
                        <div class="form-group"><label>Primary Corporate Email</label><input type="email" class="form-control" value="${company.email}"></div>
                        <div class="form-group"><label>HQ Communications</label><input type="text" class="form-control" value="${company.phone}"></div>
                    </div>
                    <div class="form-group" style="margin-bottom:40px;"><label>Registered HQ Address</label><input type="text" class="form-control" value="${company.address}"></div>
                    
                    <div class="analytics-card-luxury" style="margin-bottom:40px; border-style:dashed;">
                        <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; color:var(--primary);">System Chronometry</h4>
                         <div class="form-group">
                            <label>Default Temporal Node (GMT)</label>
                            <div class="select-wrap">
                                <select class="form-control input-select" onchange="store.state.systemSettings.timezone = this.value; UI.showFeedback(this, 'success')" ${user.role !== 'admin' ? 'disabled' : ''}>
                                    <option value="UTC" ${sys.timezone === 'UTC' ? 'selected' : ''}>UTC — Universal Intelligence</option>
                                    <option value="Africa/Casablanca" ${sys.timezone === 'Africa/Casablanca' ? 'selected' : ''}>Africa/Casablanca (GMT+1)</option>
                                    <option value="Europe/Paris" ${sys.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris (CET)</option>
                                    <option value="Europe/London" ${sys.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London (GMT)</option>
                                    <option value="America/New_York" ${sys.timezone === 'America/New_York' ? 'selected' : ''}>America/New York (EST)</option>
                                    <option value="Asia/Dubai" ${sys.timezone === 'Asia/Dubai' ? 'selected' : ''}>Asia/Dubai (GST)</option>
                                    <option value="Asia/Singapore" ${sys.timezone === 'Asia/Singapore' ? 'selected' : ''}>Asia/Singapore (SGT)</option>
                                    <option value="Australia/Sydney" ${sys.timezone === 'Australia/Sydney' ? 'selected' : ''}>Australia/Sydney (AEDT)</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                            <p style="font-size:11px; color:var(--text-muted); margin-top:8px;">* This temporal node governs all automated triggers and financial reporting cycles.</p>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:30px;">
                        <div class="analytics-card-luxury" style="text-align:center; padding:30px;">
                            <img src="${company.logo}" style="height:50px; margin-bottom:15px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1));">
                            <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">Primary Brand Asset</p>
                        </div>
                        <div class="analytics-card-luxury" style="text-align:center; padding:30px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer;" onclick="UI.showToast('Asset ingestion ready...', 'info')">
                             <i class="fa-solid fa-upload" style="font-size:24px; color:var(--primary); opacity:0.6; margin-bottom:10px;"></i>
                             <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">Ingest Favicon (SVG)</p>
                        </div>
                    </div>
                `;
            case 'notifications':
                return `
                    <div class="section-header" style="margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                        <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Alert Protocols</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Configure real-time intelligence nodes and communication triggers.</p>
                    </div>

                    <div class="analytics-card-luxury" style="margin-bottom:30px; padding:25px;">
                        <div class="form-group">
                            <label>Notification Pulse</label>
                            <div class="select-wrap">
                                <select class="form-control input-select" onchange="store.state.systemSettings.notifications.frequency = this.value; UI.showFeedback(this, 'success')">
                                    <option value="real-time" ${sys.notifications.frequency === 'real-time' ? 'selected' : ''}>Real-time (Instant Feed & Secure Email)</option>
                                    <option value="daily" ${sys.notifications.frequency === 'daily' ? 'selected' : ''}>Executive Summary (24h Aggregate)</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>

                    <div class="section-header" style="margin:40px 0 20px; opacity:0.6;">
                        <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Event Intelligence Triggers</h4>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${[
                        { key: 'newLead', label: 'New Lead Ingestion', icon: 'fa-user-plus', color: 'var(--primary)' },
                        { key: 'quoteStatus', label: 'Quote Lifecycle Updates', icon: 'fa-file-invoice-dollar', color: 'var(--info)' },
                        { key: 'newBooking', label: 'Booking Confirmation Events', icon: 'fa-calendar-check', color: 'var(--success)' },
                        { key: 'campaignFinish', label: 'Campaign Intelligence Delivery', icon: 'fa-bullhorn', color: 'var(--warning)' }
                    ].map(event => `
                            <div class="analytics-card-luxury" style="display:flex; justify-content:space-between; align-items:center; padding:18px 25px; background:rgba(255,255,255,0.01);">
                                 <div style="display:flex; align-items:center; gap:15px;">
                                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; color:${event.color};">
                                        <i class="fa-solid ${event.icon}"></i>
                                    </div>
                                    <span style="font-size:14px; font-weight:600;">${event.label}</span>
                                 </div>
                                 <label class="switch" style="transform: scale(0.85);">
                                    <input type="checkbox" ${sys.notifications.events[event.key] ? 'checked' : ''} onchange="UI.showFeedback(this, 'success')">
                                    <span class="slider round"></span>
                                 </label>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'security':
                return this.renderSecurityTab();
            case 'team':
                const users = [
                    { name: 'Sarah Jenkins', email: 'admin@travel.com', role: 'admin', lastLogin: 'Active Now' },
                    { name: 'Michael Chen', email: 'm.chen@travel.com', role: 'manager', lastLogin: '2 hours ago' },
                    { name: 'Jessica Alba', email: 'alba@travel.com', role: 'agent', lastLogin: 'Yesterday' }
                ];
                const invites = store.state.invitationTokens || [];

                return `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:35px;">
                        <div class="section-header">
                            <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Human Resources Intel</h3>
                            <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Manage regional operatives, access hierarchies, and unit invitations.</p>
                        </div>
                        <button class="btn-primary" onclick="Settings.openInviteModal()">
                            <i class="fa-solid fa-user-plus"></i> Recruit Member
                        </button>
                    </div>

                    <div class="section-header" style="margin-bottom:20px; opacity:0.6;">
                        <h4 style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px;">Active Operatives</h4>
                    </div>
                    <div class="card" style="padding:0; overflow:hidden; border:1px solid var(--border); background:rgba(255,255,255,0.01); margin-bottom:40px;">
                        <table class="data-table">
                            <thead style="background:rgba(255,255,255,0.02);"><tr><th>Operative</th><th>Security Clearance</th><th>Last Pulse</th><th style="text-align:right;">Protocol</th></tr></thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:15px;">
                                                <img src="https://ui-avatars.com/api/?name=${u.name.replace(' ', '+')}&background=0D8ABC&color=fff" style="width:36px; height:36px; border-radius:12px;" alt="${u.name}">
                                                <div>
                                                    <div style="font-weight:700; font-size:14px;">${u.name}</div>
                                                    <div style="font-size:11px; opacity:0.6;">${u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="select-wrap">
                                                <select class="form-control" style="font-size:12px; height:36px; width:120px;" onchange="Settings.changeUserRole('${u.email}', this.value)">
                                                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Clearance Level 3 (Admin)</option>
                                                    <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Clearance Level 2 (Manager)</option>
                                                    <option value="agent" ${u.role === 'agent' ? 'selected' : ''}>Clearance Level 1 (Agent)</option>
                                                </select>
                                                <i class="fa-solid fa-chevron-down caret"></i>
                                            </div>
                                        </td>
                                        <td><span style="font-size:12px; font-weight:600;">${u.lastLogin}</span></td>
                                        <td style="text-align:right;">
                                            <button class="action-menu-btn" style="color:var(--danger);" onclick="Settings.removeUser(this, '${u.email}')" ${u.role === 'admin' ? 'disabled' : ''}>
                                                <i class="fa-solid fa-user-minus"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section-header" style="margin-bottom:20px; opacity:0.6;">
                        <h4 style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px;">Pending Neutral Invitations</h4>
                    </div>
                    <div class="card" style="padding:0; overflow:hidden; border:1px solid var(--border); background:rgba(255,255,255,0.01);">
                        <table class="data-table">
                            <thead style="background:rgba(255,255,255,0.02);"><tr><th>Secure Link</th><th>Designated Role</th><th>Expiry Node</th><th style="text-align:right;">Action</th></tr></thead>
                            <tbody>
                                ${invites.map(inv => `
                                    <tr>
                                        <td><div style="font-weight:700;">${inv.email}</div></td>
                                        <td><span class="badge" style="background:var(--bg-card); border:1px solid var(--border);">${inv.role.toUpperCase()}</span></td>
                                        <td style="opacity:0.6;">${inv.expires}</td>
                                        <td style="text-align:right;">
                                            <button class="btn-secondary" style="font-size:10px; height:28px;" onclick="Settings.revokeInvite(this, '${inv.token}')">Revoke Token</button>
                                        </td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center; padding:30px; opacity:0.5;">No pending invitations discovered.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                `;
            case 'integrations':
                const isManager = user.role === 'admin' || user.role === 'manager';
                const integrations = store.state.systemSettings.integrations;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                        <div>
                            <h3 style="font-size:18px; margin-bottom:5px;">
                                <i class="fa-solid fa-plug" style="margin-right:10px; color:var(--primary);"></i> App Integrations:
                            </h3>
                            <p style="color:var(--text-secondary); font-size:12px;">Manage internal and external application integrations that extend CRM functionality.</p>
                        </div>
                        ${user.role === 'admin' ? `
                            <button class="btn-primary" onclick="Settings.openAddIntegrationModal()" title="Register new third-party app" aria-label="Add integration">
                                <i class="fa-solid fa-plus"></i> Add New App Integration
                            </button>
                        ` : ''}
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:30px;">
                        ${this.renderSocialMediaSection(user.role)}
                        ${this.renderIntegrationCategory('Communication Apps (Email, WhatsApp)', integrations.communication, user.role)}
                        ${this.renderIntegrationCategory('Automation Apps (n8n, Zapier, Make)', integrations.automation, user.role)}
                        ${this.renderIntegrationCategory('Data Apps (Google Sheets, APIs)', integrations.automation, user.role)} 
                        ${this.renderIntegrationCategory('Payment & Finance Apps', integrations.payments, user.role)}
                    </div>

                    ${isManager ? `
                        <h5 style="font-size:14px; margin-top:40px; margin-bottom:15px; color:var(--primary);">Integration Tracking & Security (SOP Rule 9 & 11)</h5>
                        <div class="card" style="padding:0; overflow:hidden; border:1px solid var(--border); background:rgba(0,0,0,0.2);">
                            <table class="data-table" style="font-size:10px; border:none;">
                                <thead style="background:var(--bg-hover);"><tr><th>Time</th><th>Source</th><th>Description</th><th>Status</th><th>By User</th></tr></thead>
                                <tbody>
                                    ${store.state.integrationLogs.slice(0, 8).map(log => `
                                        <tr>
                                            <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                                            <td style="font-weight:600;">${log.integrationId.toUpperCase()}</td>
                                            <td>${log.details || log.action}</td>
                                            <td><span class="badge" style="background:${log.status === 'success' ? 'var(--success)' : 'var(--danger)'}; color:white; font-size:8px;">${log.status.toUpperCase()}</span></td>
                                            <td>${log.user}</td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px; opacity:0.5;">No audit logs discovered for integrations.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <div style="margin-top:30px; padding:15px; background:rgba(var(--primary-rgb), 0.05); border-left:4px solid var(--primary); border-radius:4px;">
                        <p style="font-size:11px; color:var(--text-primary); line-height:1.4;">
                            <i class="fa-solid fa-shield-halved" style="margin-right:5px;"></i>
                            <b>Security Reminder:</b> API keys are encrypted at rest and never displayed in plain text (SOP Rule 6). Only Admins can modify connection parameters.
                        </p>
                    </div>
                `;
            case 'backup':
                return `
                    <div class="section-header" style="margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                        <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Data Redundancy</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Manage high-availability backups and system state recovery protocols.</p>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:30px;">
                        <div class="form-group">
                            <label>Secure Storage Node</label>
                            <div class="select-wrap">
                                <select class="form-control input-select" onchange="Settings.toggleBackupStorage(this.value)">
                                    <option value="Cloud" ${sys.backups.storage === 'Cloud' ? 'selected' : ''}>Encrypted Executive Cloud Storage</option>
                                    <option value="Local" ${sys.backups.storage === 'Local' ? 'selected' : ''}>Regional HQ Physical Storage</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Artifact Inclusion</label>
                            <div style="display:flex; gap:20px; margin-top:12px;">
                                <label style="font-size:13px; font-weight:600; cursor:pointer;"><input type="checkbox" checked disabled style="margin-right:8px;"> Core Database</label>
                                <label style="font-size:13px; font-weight:600; cursor:pointer;"><input type="checkbox" ${sys.backups.types.includes('files') ? 'checked' : ''} onchange="UI.showFeedback(this, 'success')" style="margin-right:8px;"> High-Fidelity Assets</label>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:40px;">
                        <button class="btn-primary" onclick="Settings.triggerFullBackup(this)">
                            <i class="fa-solid fa-cloud-arrow-down"></i> Download Full Backup (ZIP)
                        </button>
                        <button class="btn-secondary" onclick="Settings.openRestoreModal()">
                            <i class="fa-solid fa-clock-rotate-left"></i> Restore Point Discovery
                        </button>
                    </div>

                    <div class="analytics-card-luxury" style="padding:25px; background:rgba(255,255,255,0.01);">
                         <h5 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; color:var(--text-muted);">Autonomous Sync Status</h5>
                         <p style="font-size:14px; font-weight:600;">Last successful synchronization to ${sys.backups.storage.toUpperCase()}: <span style="color:var(--primary);">${sys.backups.lastDate}</span></p>
                    </div>
                `;
        }
    },

    renderIntegrationCategory(title, list, userRole) {
        if (!list || list.length === 0) return '';
        const isAdmin = userRole === 'admin';

        return `
            <div class="integration-category">
                <div class="section-header" style="margin-bottom:20px; opacity:0.6;">
                    <h4 style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; display:flex; align-items:center; gap:15px;">
                        ${title} <div style="flex:1; height:1px; background:var(--border);"></div>
                    </h4>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
                    ${list.map(int => `
                        <div class="analytics-card-luxury" style="padding:25px; background:rgba(255,255,255,0.01);">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
                                <div style="display:flex; gap:15px; align-items:center;">
                                    <div style="width:48px; height:48px; border-radius:12px; background:rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--primary); border:1px solid var(--border);">
                                        <i class="fa-solid ${this.getIntegrationIcon(int.type)}"></i>
                                    </div>
                                    <div>
                                        <h5 style="font-size:15px; font-weight:700; margin-bottom:2px;">${int.name}</h5>
                                        <div style="display:flex; gap:8px; align-items:center;">
                                            <span style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${int.type}</span>
                                            <span style="width:3px; height:3px; border-radius:50%; background:var(--text-muted);"></span>
                                            <span style="font-size:10px; color:var(--primary); font-weight:800;">${int.authMethod || 'PROTOCOL'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <div class="badge" style="background:${int.status === 'active' ? 'var(--bg-green-soft)' : 'var(--bg-hover)'}; color:${int.status === 'active' ? 'var(--success)' : 'var(--text-muted)'}; margin-bottom:5px;">${int.status.toUpperCase()}</div>
                                    <div style="font-size:10px; opacity:0.6; font-weight:600;">Pulse: ${int.lastTest}</div>
                                </div>
                            </div>

                            ${int.description ? `<p style="font-size:11px; color:var(--text-secondary); margin-bottom:15px; line-height:1.4;">${int.description}</p>` : ''}

                             <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:15px; border-top:1px solid var(--border);">
                                <div style="display:flex; gap:10px;">
                                    ${isAdmin ? `
                                        <button class="action-btn-label action-btn-label--edit" style="width:auto; padding:5px 12px; font-size:11px;" onclick="Settings.openEditIntegrationModal('${int.id}')" title="Modify connection settings" aria-label="Configure ${int.name}">Configure</button>
                                        <button class="action-btn-label action-btn-label--view" style="width:auto; padding:5px 12px; font-size:11px;" onclick="Settings.testIntegration('${int.id}', this)" title="Verify credentials & connectivity" aria-label="Test connection for ${int.name}">Test</button>
                                    ` : `
                                        <button class="btn-social" style="width:auto; padding:5px 12px; font-size:11px; opacity:0.5; cursor:not-allowed;" disabled>Manager View-Only</button>
                                    `}
                                </div>
                                ${isAdmin ? `
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        ${int.testResult === 'failed' ? '<span style="color:var(--danger); font-size:10px; font-weight:600;">TEST FAILED</span>' : ''}
                                        <label class="switch" style="transform: scale(0.8);" title="${int.testResult !== 'success' ? 'SOP Rule 6: Test required before activation' : 'Toggle integration'}">
                                            <input type="checkbox" ${int.status === 'active' ? 'checked' : ''} ${int.testResult !== 'success' && int.status !== 'active' ? 'disabled' : ''} onchange="Settings.toggleIntegration('${int.id}', this.checked)" aria-label="Enable/Disable ${int.name}">
                                            <span class="slider round" style="${int.testResult !== 'success' && int.status !== 'active' ? 'opacity:0.5; cursor:not-allowed;' : ''}"></span>
                                        </label>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    getIntegrationIcon(type) {
        const icons = {
            'smtp': 'fa-envelope',
            'whatsapp': 'fa-brands fa-whatsapp',
            'google_sheets': 'fa-table-cells',
            'webhooks': 'fa-link',
            'stripe': 'fa-credit-card'
        };
        return icons[type] || 'fa-plug';
    },

    testIntegration(id, btn) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const success = store.testIntegration(id);
            UI.showFeedback(btn, success ? 'success' : 'error');
            if (!success) {
                store.logAction('SETTINGS', 'TEST_INTEGRATION', id, 'error', 'SOP Rule 6 Violation: Connection test failed.');
            } else {
                store.logAction('SETTINGS', 'TEST_INTEGRATION', id, 'success', 'Connectivity validated.');
            }
            this.render();
        }, 1200);
    },

    toggleIntegration(id, enabled) {
        const user = store.state.currentUser.name;
        const integrations = store.state.systemSettings.integrations;

        let found = null;
        for (const cat in integrations) {
            found = integrations[cat].find(i => i.id === id);
            if (found) break;
        }

        if (found) {
            if (found.status === 'error' && enabled) {
                alert('SOP Rule 7: Cannot enable an integration with a failing connection test.');
                event.target.checked = false;
                return;
            }

            found.status = enabled ? 'active' : 'inactive';
            store.logAction('SETTINGS', 'TOGGLE_INTEGRATION', id, 'success', `Integration ${enabled ? 'Enabled' : 'Disabled'}`);
            this.render();
        }
    },

    openAddIntegrationModal() {
        Modal.open({
            title: '🔗 Core System Integration (SOP Rule 4)',
            body: `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div class="form-group">
                            <label>App Category (SOP Rule 3)</label>
                            <div class="select-wrap">
                                <select class="form-control" id="intCategory" onchange="Settings.updateIntegrationFields(this.value)">
                                    <option value="communication">Communication App</option>
                                    <option value="automation">Automation App</option>
                                    <option value="data">Data App</option>
                                    <option value="payments">Financial App</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Authentication Method (SOP 5)</label>
                            <div class="select-wrap">
                                <select class="form-control" id="intAuthMethod">
                                    <option value="API KEY">API Key / Token</option>
                                    <option value="OAUTH2">OAuth 2.0</option>
                                    <option value="BEARER">Bearer Token</option>
                                    <option value="WEBHOOK_SECRET">Webhook Secret</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>App Name</label>
                        <input type="text" class="form-control" id="intName" placeholder="e.g. SendGrid CRM Connect">
                    </div>

                    <div class="form-group">
                        <label>App Description (SOP Rule 4)</label>
                        <textarea class="form-control" id="intDescription" rows="2" placeholder="Describe the purpose of this integration..."></textarea>
                    </div>
                    
                    <div id="dynamicIntFields">
                        <div class="form-group" style="margin-bottom:15px;">
                            <label>API Key / Secret Token (SOP Rule 6: Encrypted)</label>
                            <input type="password" class="form-control" id="intKey" placeholder="********************">
                        </div>
                    </div>

                    <div style="padding:15px; background:rgba(var(--primary-rgb), 0.05); border-radius:6px; font-size:11px; line-height:1.4;">
                        <i class="fa-solid fa-circle-info" style="color:var(--primary); margin-right:5px;"></i> 
                        <b>SOP Rule 7:</b> New apps are <b>Inactive</b> by default. Activation is blocked until authentication is validated via <b>Test Connection</b>.
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()" title="Discard changes" aria-label="Cancel registration">Cancel</button>
                <button class="btn-primary" onclick="Settings.saveNewIntegration(this)" title="Confirm registration" aria-label="Save integration">Register Integration</button>
            `
        });
    },

    updateIntegrationFields(category) {
        const container = document.getElementById('dynamicIntFields');
        let html = '';

        if (category === 'communication') {
            html += `
                <div style="display:grid; grid-template-columns: 3fr 1fr; gap:10px; margin-bottom:15px;">
                    <div class="form-group"><label>SMTP Host / API URL</label><input type="text" class="form-control" placeholder="smtp.env.com"></div>
                    <div class="form-group"><label>Port</label><input type="number" class="form-control" placeholder="587"></div>
                </div>
            `;
        } else if (category === 'automation' || category === 'data') {
            html += `<div class="form-group" style="margin-bottom:15px;"><label>Endpoint / Callback URL (SOP Rule 4)</label><input type="url" class="form-control" placeholder="https://..."></div>`;
        }

        html += `
            <div class="form-group"><label>Access Token / API Key (Encrypted)</label><input type="password" class="form-control" id="intKey" placeholder="********************"></div>
        `;

        container.innerHTML = html;
    },

    saveNewIntegration(btn) {
        const name = document.getElementById('intName').value;
        const description = document.getElementById('intDescription').value;
        const category = document.getElementById('intCategory').value;
        const authMethod = document.getElementById('intAuthMethod').value;

        if (!name) {
            UI.showFeedback(btn, 'error');
            return alert('App Name is required.');
        }

        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const newInt = {
                id: name.toLowerCase().replace(/\s+/g, '-'),
                name: name,
                description: description,
                authMethod: authMethod,
                type: category === 'communication' ? 'smtp' : 'generic',
                status: 'inactive',
                lastTest: 'Pending',
                config: {}
            };

            if (!store.state.systemSettings.integrations[category]) {
                store.state.systemSettings.integrations[category] = [];
            }

            store.state.systemSettings.integrations[category].push(newInt);
            store.logAction('SETTINGS', 'ADD_INTEGRATION', newInt.id, 'success', `New App: ${name} registered.`);

            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                Modal.close();
                this.render();
            }, 600);
        }, 800);
    },

    terminateSessions(btn) {
        UI.confirm('Terminate Others', 'Are you sure you want to logout all other devices? This will invalidate all active tokens except the current one.', () => {
            UI.showFeedback(btn, 'loading');
            setTimeout(() => {
                store.state.systemSettings.security.activeSessions = [store.state.systemSettings.security.activeSessions[0]];
                store.logAction('SETTINGS', 'TERMINATE_SESSIONS', 'SYSTEM', 'success', 'All other sessions terminated (SOP Rule 5)');
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 500);
            }, 800);
        }, 'danger');
    },

    revokeSession(btn, ip) {
        UI.confirm('Kill Session', `Immediately revoke access for IP: <b>${ip}</b>? User will be kicked to login.`, () => {
            UI.showFeedback(btn, 'loading');
            setTimeout(() => {
                store.state.systemSettings.security.activeSessions = store.state.systemSettings.security.activeSessions.filter(s => s.ip !== ip);
                store.logAction('SETTINGS', 'REVOKE_SESSION', ip, 'success', 'Session revoked by admin');
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 500);
            }, 600);
        }, 'danger');
    },

    changeUserRole(email, newRole) {
        UI.confirm('Access Change', `SOP Security Policy: Elevate/Restrict <b>${email}</b> to <b>${newRole.toUpperCase()}</b> level?`, () => {
            store.logAction('SETTINGS', 'ROLE_CHANGE', email, 'success', `Changed role to ${newRole}`);
            this.render();
        });
    },

    removeUser(btn, email) {
        UI.confirm('Remove Member', `Disable access for <b>${email}</b>? This is recoverable but stops all current work.`, () => {
            UI.showFeedback(btn, 'loading');
            setTimeout(() => {
                store.logAction('SETTINGS', 'REMOVE_USER', email, 'success', 'User access disabled');
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 600);
            }, 800);
        }, 'danger');
    },

    revokeInvite(btn, token) {
        UI.confirm('Revoke Invite', 'Cancel this invitation link immediately?', () => {
            UI.showFeedback(btn, 'loading');
            setTimeout(() => {
                store.state.invitationTokens = store.state.invitationTokens.filter(inv => inv.token !== token);
                store.logAction('SETTINGS', 'REVOKE_INVITE', token, 'success', 'Invitation revoked');
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 500);
            }, 600);
        });
    },

    performBackup(btn) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            store.logAction('SETTINGS', 'BACKUP_MANUAL', 'SYSTEM', 'success', 'Manual database snapshot created');
            UI.showFeedback(btn, 'success');
        }, 1500);
    },

    openInviteModal() {
        Modal.open({
            title: 'Invite New Team Member',
            body: `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="inviteEmail" class="form-control" placeholder="colleague@globaltravel.com">
                    </div>
                    <div class="form-group">
                        <label>Assigned Role (SOP Rule 3)</label>
                        <select class="form-control" id="inviteRole">
                            <option value="agent">Agent (Basic Access)</option>
                            <option value="manager">Manager (Intermediate + View Integrations)</option>
                            <option value="admin">Administrator (Full Control)</option>
                        </select>
                    </div>
                    <div style="padding:15px; background:rgba(var(--primary-rgb), 0.05); border-radius:6px; font-size:11px; line-height:1.4;">
                        <i class="fa-solid fa-shield-check" style="color:var(--primary); margin-right:5px;"></i>
                        Invitation links are single-use and valid for 48 hours. Member must verify identity via corporate email.
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()" title="Cancel operation" aria-label="Cancel invite">Cancel</button>
                <button class="btn-primary" onclick="Settings.sendInvitation(this)" title="Send secure link" aria-label="Confirm invitation">Send Invitation</button>
            `
        });
    },

    sendInvitation(btn) {
        const email = document.getElementById('inviteEmail').value;
        const role = document.getElementById('inviteRole').value;

        if (!email) {
            UI.showFeedback(btn, 'error');
            return alert('Email is required.');
        }

        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const token = `INV-${role.toUpperCase()}-${Date.now()}`;
            store.state.invitationTokens.push({
                token,
                email,
                role,
                expires: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

            store.logAction('SETTINGS', 'INVITE_MEMBER', email, 'success', `Sent ${role} invitation`);
            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                Modal.close();
                this.render();
            }, 600);
        }, 800);
    },

    renderSocialMediaSection(userRole) {
        const isAdmin = userRole === 'admin';
        const accounts = store.state.socialAccounts || [];

        return `
            <div class="integration-category">
                <h4 style="font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; display:flex; align-items:center; gap:10px;">
                    Social Media Channels (SOP Section 4) <span style="flex:1; height:1px; background:var(--border);"></span>
                </h4>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                    ${accounts.map(acc => this.renderSocialAccountCard(acc, isAdmin)).join('')}
                    
                    ${isAdmin ? `
                        <div class="card" style="padding:20px; border:1px dashed var(--border); background:rgba(255,255,255,0.02); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; cursor:pointer; min-height:140px; transition:all 0.3s;" onclick="Settings.openConnectSocialModal()" title="Link social business page" aria-label="Connect new social account">
                            <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-hover); display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--text-secondary);">
                                <i class="fa-solid fa-plus"></i>
                            </div>
                            <div style="text-align:center;">
                                <h5 style="font-size:13px; font-weight:600;">Connect Social Network</h5>
                                <p style="font-size:10px; color:var(--text-muted);">OAuth 2.0 Secure Sync</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderSocialAccountCard(acc, isAdmin) {
        const platformIcons = { facebook: 'fa-brands fa-facebook', instagram: 'fa-brands fa-instagram', tiktok: 'fa-brands fa-tiktok', linkedin: 'fa-brands fa-linkedin' };
        const platformColors = { facebook: '#1877F2', instagram: '#E4405F', tiktok: '#000000', linkedin: '#0A66C2' };

        return `
            <div class="card" style="padding:20px; border:1px solid var(--border); background:rgba(255,255,255,0.01);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                    <div style="display:flex; gap:12px; align-items:center;">
                        <div style="width:40px; height:40px; border-radius:8px; background:${platformColors[acc.platform]}15; display:flex; align-items:center; justify-content:center; font-size:20px; color:${platformColors[acc.platform]};">
                            <i class="${platformIcons[acc.platform]}"></i>
                        </div>
                        <div>
                            <h5 style="font-size:14px; font-weight:700;">${acc.name}</h5>
                            <span style="font-size:9px; color:var(--text-muted);">Connected as: ${acc.platform.toUpperCase()} Business Page</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; padding-top:15px; border-top:1px solid var(--border);">
                    <button class="btn-social" style="width:auto; padding:5px 12px; font-size:11px;" onclick="Settings.simulateLeadSync(this, '${acc.platform}', '${acc.name}')" title="Fetch latest social leads" aria-label="Sync ${acc.name}"><i class="fa-solid fa-rotate"></i> Sync Leads</button>
                    ${isAdmin ? `
                        <button class="btn-social" style="width:auto; padding:5px 12px; font-size:11px; color:var(--danger); border-color:var(--danger)30;" onclick="Settings.disconnectSocialAccount(this, '${acc.id}')" title="Remove social link" aria-label="Disconnect ${acc.name}">Disconnect</button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    openConnectSocialModal() {
        Modal.open({
            title: '🌐 Connect Social Network (OAuth 2.0)',
            body: `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <button class="btn-social" style="padding:15px; flex-direction:column; gap:10px; height:auto;" onclick="Settings.startSocialAuth('facebook')">
                            <i class="fa-brands fa-facebook" style="font-size:24px; color:#1877F2;"></i><span>Facebook</span>
                        </button>
                        <button class="btn-social" style="padding:15px; flex-direction:column; gap:10px; height:auto;" onclick="Settings.startSocialAuth('instagram')">
                            <i class="fa-brands fa-instagram" style="font-size:24px; color:#E4405F;"></i><span>Instagram</span>
                        </button>
                    </div>
                </div>
            `,
            footer: `<button class="btn-social" onclick="Modal.close()">Cancel</button>`
        });
    },

    startSocialAuth(platform) {
        UI.showToast(`Redirecting to ${platform.toUpperCase()} OAuth...`, 'info');
        setTimeout(() => {
            Modal.open({
                title: `Authorized: Select ${platform} Page`,
                body: `<div class="card" style="padding:12px; border:1px solid var(--border); cursor:pointer;" onclick="Settings.finishSocialConnect('${platform}', 'Global Travel Official')"><b>Global Travel Official</b></div>`,
                footer: `<button class="btn-social" onclick="Modal.close()">Cancel</button>`
            });
        }, 1000);
    },

    finishSocialConnect(platform, name) {
        store.connectSocialAccount(platform, name, `PAGE-${Date.now().toString(36).toUpperCase()}`);
        store.logAction('SETTINGS', 'SOCIAL_CONNECT', platform.toUpperCase(), 'success', `Connected ${name}`);
        Modal.close();
        this.render();
    },

    disconnectSocialAccount(btn, id) {
        UI.confirm('Disconnect Social', 'SOP Rule 8: disconnecting will stop all sync immediately. Historical data is preserved.', () => {
            UI.showFeedback(btn, 'loading');
            setTimeout(() => {
                store.disconnectSocialAccount(id);
                store.logAction('SETTINGS', 'SOCIAL_DISCONNECT', id, 'success', 'Social account unlinked');
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 500);
            }, 600);
        }, 'warning');
    },

    simulateLeadSync(btn, platform, pageName) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            store.logAction('SETTINGS', 'SOCIAL_SYNC', platform.toUpperCase(), 'success', `Synced leads from ${pageName}`);
            UI.showFeedback(btn, 'success');
            setTimeout(() => this.render(), 500);
        }, 1500);
    },

    openRestoreModal() {
        Modal.open({
            title: 'System Recovery & Restore Point',
            size: 'md',
            body: `
                <div style="text-align:center; margin-bottom:20px;">
                    <div style="font-size:40px; color:var(--success); margin-bottom:10px;"><i class="fa-solid fa-shield-halved"></i></div>
                    <h3 style="font-size:18px; font-weight:700;">Select Recovery Point</h3>
                    <p style="color:var(--text-muted); font-size:13px; max-width:400px; margin:0 auto;">Restoring will revert all database changes to the selected timestamp. This action is logged and irreversible.</p>
                </div>

                <div class="list-group" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                    <div class="card" style="padding:15px; border:1px solid var(--success); background:rgba(23, 198, 83, 0.05); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                        <div>
                            <div style="font-weight:700; color:var(--text-primary);">Auto-Backup: Midnight Sync</div>
                            <div style="font-size:11px; color:var(--success);">Safe State • Today, 00:00 AM</div>
                        </div>
                        <button class="btn-primary" style="font-size:11px; height:30px;" onclick="UI.showToast('Restoring system...', 'info'); setTimeout(()=>window.location.reload(), 2000);">Restore</button>
                    </div>
                    <div class="card" style="padding:15px; border:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                         <div>
                            <div style="font-weight:700; color:var(--text-primary);">Pre-Update Snapshot</div>
                            <div style="font-size:11px; color:var(--text-muted);">Yesterday, 14:30 PM</div>
                        </div>
                        <button class="btn-secondary" style="font-size:11px; height:30px;" onclick="UI.showToast('Restoring system...', 'info'); setTimeout(()=>window.location.reload(), 2000);">Restore</button>
                    </div>
                     <div class="card" style="padding:15px; border:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                         <div>
                            <div style="font-weight:700; color:var(--text-primary);">Weekly Maintenance</div>
                            <div style="font-size:11px; color:var(--text-muted);">Feb 01, 00:00 AM</div>
                        </div>
                        <button class="btn-secondary" style="font-size:11px; height:30px;" onclick="UI.showToast('Restoring system...', 'info'); setTimeout(()=>window.location.reload(), 2000);">Restore</button>
                    </div>
                </div>

                <div class="alert alert-danger" style="font-size:12px;">
                    <i class="fa-solid fa-triangle-exclamation"></i> <strong>Warning:</strong> Current session data will be lost.
                </div>
            `,
            footer: `<button class="btn-cancel" onclick="Modal.close()">Cancel</button>`
        });
    },

    openEditIntegrationModal(id) {
        // Find integration by ID or fallback to simulated data
        const account = store.state.socialAccounts.find(a => a.id === id) || { name: 'Service Integration', platform: 'API' };

        Modal.open({
            title: `Configure ${account.platform.toUpperCase()} Connection`,
            size: 'md',
            body: `
                <div class="form-group">
                    <label>Integration Name</label>
                    <input type="text" class="form-control" value="${account.name}">
                </div>
                <div class="form-group">
                    <label>API Key / Client ID</label>
                    <div style="display:flex; gap:10px;">
                         <input type="password" class="form-control" value="************************" disabled>
                         <button class="btn-secondary" onclick="UI.showToast('Key regenerated successfully', 'success')">Rotate Key</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Webhook URL (Callback)</label>
                    <input type="text" class="form-control" value="https://api.crm.io/hooks/v1/callbacks/${account.id || 'new'}" readonly>
                </div>
                
                <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:700; font-size:13px;">Active Sync</div>
                            <div style="font-size:11px; color:var(--text-muted);">Pause data ingestion without removing credentials.</div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" checked>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Close</button>
                <button class="btn-primary" onclick="UI.showToast('Configuration updated', 'success'); Modal.close();">Save Changes</button>
            `
        });
    },

    // --- Currency Management SOP Implementation ---
    renderCompanyTab() {
        const c = store.state.company;
        const user = store.state.currentUser || {};
        const isAdmin = user.role === 'admin';

        // Helper to bind inputs
        window._updateCompany = (field, val) => {
            store.state.company[field] = val;
            store.notify(); // silent background save via store.js debouncer
        };

        window._uploadBrandAsset = (field, btn) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = event => {
                    store.state.company[field] = event.target.result;
                    store.logAction('SETTINGS', 'UPDATE_BRAND', 'SYSTEM', 'success', `Updated ${field}`);
                    store.notify();
                    UI.showToast(`Brand asset (${field}) synchronized`, 'success');
                    Settings.render();
                };
                reader.readAsDataURL(file);
            };
            input.click();
        };

        return `
            <div class="section-header" style="margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Company Intelligence</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Single source of truth for your brand identity and public assets.</p>
                </div>
            </div>

            <!-- Business Identity -->
            <div class="analytics-card-luxury" style="padding:25px; margin-bottom:25px;">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--primary); margin-bottom:20px;">
                    <i class="fa-solid fa-fingerprint" style="margin-right:8px;"></i> Business Identity
                </h4>
                <div class="form-grid" style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:20px;">
                    <div class="form-group">
                        <label>Legal Company Name</label>
                        <input type="text" class="form-control" value="${c.name || ''}" oninput="_updateCompany('name', this.value)" ${!isAdmin ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Short Brand Name</label>
                        <input type="text" class="form-control" value="${c.brandName || ''}" oninput="_updateCompany('brandName', this.value)">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                    <label>Tagline / Slogan</label>
                    <input type="text" class="form-control" value="${c.tagline || ''}" oninput="_updateCompany('tagline', this.value)">
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                    <label>Short Description (160 Chars)</label>
                    <textarea class="form-control" rows="2" oninput="_updateCompany('descriptionShort', this.value)">${c.descriptionShort || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Long Description (About Us)</label>
                    <textarea class="form-control" rows="4" oninput="_updateCompany('descriptionLong', this.value)">${c.descriptionLong || ''}</textarea>
                </div>
            </div>

            <!-- Contact & Location -->
            <div class="analytics-card-luxury" style="padding:25px; margin-bottom:25px;">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--success); margin-bottom:20px;">
                    <i class="fa-solid fa-address-book" style="margin-right:8px;"></i> Contact & Location
                </h4>
                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div class="form-group">
                        <label>Main Email <span style="opacity:0.5;font-weight:normal;">(Customer Facing)</span></label>
                        <input type="email" class="form-control" value="${c.email || ''}" oninput="_updateCompany('email', this.value)">
                    </div>
                    <div class="form-group">
                        <label>B2B Email <span style="opacity:0.5;font-weight:normal;">(Partnerships)</span></label>
                        <input type="email" class="form-control" value="${c.b2bEmail || ''}" oninput="_updateCompany('b2bEmail', this.value)">
                    </div>
                </div>
                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="text" class="form-control" value="${c.phone || ''}" oninput="_updateCompany('phone', this.value)" placeholder="+1 234 567 8900">
                    </div>
                    <div class="form-group">
                        <label>WhatsApp</label>
                        <input type="text" class="form-control" value="${c.whatsapp || ''}" oninput="_updateCompany('whatsapp', this.value)" placeholder="+1 234 567 8900">
                    </div>
                    <div class="form-group">
                        <label>Website URL</label>
                        <input type="text" class="form-control" value="${c.website || ''}" oninput="_updateCompany('website', this.value)" placeholder="https://...">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                    <label>Physical Address</label>
                    <input type="text" class="form-control" value="${c.address || ''}" oninput="_updateCompany('address', this.value)">
                </div>
                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 2fr; gap:20px;">
                    <div class="form-group">
                        <label>City & Country</label>
                        <input type="text" class="form-control" value="${c.cityCountry || ''}" oninput="_updateCompany('cityCountry', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Google Maps Link</label>
                        <input type="text" class="form-control" value="${c.googleMapsUrl || ''}" oninput="_updateCompany('googleMapsUrl', this.value)" placeholder="https://maps.app.goo.gl/...">
                    </div>
                </div>
            </div>

            <!-- Branding -->
            <div class="analytics-card-luxury" style="padding:25px; margin-bottom:25px;">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--warning); margin-bottom:20px;">
                    <i class="fa-solid fa-paint-roller" style="margin-right:8px;"></i> Digital Branding
                </h4>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin-bottom:30px;">
                    <!-- Light Logo -->
                    <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:12px; padding:20px; text-align:center;">
                        <img src="${c.logoLight || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100\\\' height=\\\'100\\\'><rect width=\\\'100\\\' height=\\\'100\\\' fill=\\\'none\\\'/></svg>'" style="max-width:100%; height:80px; object-fit:contain; margin-bottom:15px; border-radius:8px; background:var(--bg-panel);">
                        <button class="btn-secondary" style="width:100%; font-size:11px;" onclick="_uploadBrandAsset('logoLight', this)"><i class="fa-solid fa-upload"></i> Light Logo</button>
                    </div>
                    <!-- Dark Logo -->
                    <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:12px; padding:20px; text-align:center;">
                        <img src="${c.logoDark || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100\\\' height=\\\'100\\\'><rect width=\\\'100\\\' height=\\\'100\\\' fill=\\\'none\\\'/></svg>'" style="max-width:100%; height:80px; object-fit:contain; margin-bottom:15px; border-radius:8px; background:#fff;">
                        <button class="btn-secondary" style="width:100%; font-size:11px;" onclick="_uploadBrandAsset('logoDark', this)"><i class="fa-solid fa-upload"></i> Dark Logo</button>
                    </div>
                    <!-- Favicon -->
                    <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:12px; padding:20px; text-align:center;">
                        <img src="${c.favicon || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'100\\\' height=\\\'100\\\'><rect width=\\\'100\\\' height=\\\'100\\\' fill=\\\'none\\\'/></svg>'" style="width:80px; height:80px; object-fit:contain; margin-bottom:15px; border-radius:8px; background:var(--bg-panel);">
                        <button class="btn-secondary" style="width:100%; font-size:11px;" onclick="_uploadBrandAsset('favicon', this)"><i class="fa-solid fa-upload"></i> Favicon</button>
                    </div>
                </div>

                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <div class="form-group" style="position:relative;">
                        <label>Primary Brand Color</label>
                        <input type="color" class="form-control" style="height:45px; padding:4px;" value="${c.primaryColor || '#009EF7'}" oninput="_updateCompany('primaryColor', this.value)">
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label>Accent Brand Color</label>
                        <input type="color" class="form-control" style="height:45px; padding:4px;" value="${c.accentColor || '#FF9900'}" oninput="_updateCompany('accentColor', this.value)">
                    </div>
                </div>
            </div>

            <!-- Social Networks -->
            <div class="analytics-card-luxury" style="padding:25px; margin-bottom:25px;">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#E1306C; margin-bottom:20px;">
                    <i class="fa-solid fa-share-nodes" style="margin-right:8px;"></i> Social Intelligence
                </h4>
                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <div class="form-group"><label><i class="fa-brands fa-instagram" style="margin-right:5px; color:#E1306C;"></i> Instagram URL</label><input type="text" class="form-control" value="${c.instagram || ''}" oninput="_updateCompany('instagram', this.value)"></div>
                    <div class="form-group"><label><i class="fa-brands fa-facebook" style="margin-right:5px; color:#1877F2;"></i> Facebook URL</label><input type="text" class="form-control" value="${c.facebook || ''}" oninput="_updateCompany('facebook', this.value)"></div>
                    <div class="form-group"><label><i class="fa-brands fa-linkedin" style="margin-right:5px; color:#0A66C2;"></i> LinkedIn URL</label><input type="text" class="form-control" value="${c.linkedin || ''}" oninput="_updateCompany('linkedin', this.value)"></div>
                    <div class="form-group"><label><i class="fa-brands fa-youtube" style="margin-right:5px; color:#FF0000;"></i> YouTube URL</label><input type="text" class="form-control" value="${c.youtube || ''}" oninput="_updateCompany('youtube', this.value)"></div>
                    <div class="form-group"><label><i class="fa-brands fa-tiktok" style="margin-right:5px; color:#fff;"></i> TikTok URL</label><input type="text" class="form-control" value="${c.tiktok || ''}" oninput="_updateCompany('tiktok', this.value)"></div>
                </div>
            </div>

            <!-- Legal & Billing (Admin Only) -->
            ${isAdmin ? `
            <div class="analytics-card-luxury" style="padding:25px; margin-bottom:40px; border:1px solid rgba(241, 65, 108, 0.3);">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--danger); margin-bottom:20px;">
                    <i class="fa-solid fa-scale-balanced" style="margin-right:8px;"></i> Legal & Billing Overrides
                </h4>
                <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div class="form-group">
                        <label>Business Registration Identifier</label>
                        <input type="text" class="form-control" value="${c.registrationIdentifier || ''}" oninput="_updateCompany('registrationIdentifier', this.value)" placeholder="RC / ICE / Company Number">
                    </div>
                    <div class="form-group">
                        <label>Tax / VAT ID</label>
                        <input type="text" class="form-control" value="${c.taxId || ''}" oninput="_updateCompany('taxId', this.value)" placeholder="Tax Identifier">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                    <label>Invoice Default Footer Text</label>
                    <textarea class="form-control" rows="2" oninput="_updateCompany('invoiceFooter', this.value)">${c.invoiceFooter || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Terms & Conditions Master URL</label>
                    <input type="text" class="form-control" value="${c.termsUrl || ''}" oninput="_updateCompany('termsUrl', this.value)">
                </div>
            </div>
            ` : ''}
        `;
    },

    renderCurrencyTab() {
        const currencies = store.state.currencies || [];
        const baseCur = store.state.systemSettings?.currency || 'USD';

        return `
            <div class="section-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                <div>
                    <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Currency Management</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Define system-wide monetary standards and exchange rates.</p>
                </div>
                <button class="btn-primary" style="height:40px; font-size:13px;" onclick="Settings.openCurrencyModal()">
                    <i class="fa-solid fa-plus"></i> Add Currency
                </button>
            </div>

            <div class="table-container animate-fade-in" style="margin-top:0;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Currency Name</th>
                            <th>Code</th>
                            <th>Symbol</th>
                            <th>Exchange Rate</th>
                            <th>Position</th>
                            <th>Status</th>
                            <th>Default</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currencies.map(c => `
                            <tr>
                                <td style="font-weight:700; color:var(--text-primary);">
                                    ${c.name}
                                </td>
                                <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-secondary);">${c.code}</span></td>
                                <td style="font-family:serif; font-size:16px;">${c.symbol}</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="font-weight:700;">${c.rate}</span>
                                        <i class="fa-solid fa-circle-info" style="font-size:12px; opacity:0.4;" title="1 ${baseCur} = ${c.rate} ${c.code}"></i>
                                    </div>
                                </td>
                                <td><span style="text-transform:capitalize; font-size:12px; opacity:0.8;">${c.position}</span></td>
                                <td>
                                    <span class="status-badge ${c.status === 'active' ? 'status-active' : 'status-danger'}">
                                        ${c.status}
                                    </span>
                                </td>
                                <td>
                                    ${c.isDefault ?
                `<span class="status-badge" style="background:var(--primary-glow); color:var(--primary); border-color:rgba(0,158,247,0.3);">
                                            <i class="fa-solid fa-star" style="font-size:10px;"></i> Default
                                         </span>` :
                `<button class="btn-secondary" style="height:28px; font-size:10px; padding:0 8px;" onclick="Settings.setCurrencyDefault(${c.id})">Set Default</button>`}
                                </td>
                                <td style="text-align:right;">
                                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                                        <button class="action-menu-btn" title="Edit" onclick="Settings.openCurrencyModal(${c.id})">
                                            <i class="fa-solid fa-pen-to-square"></i>
                                        </button>
                                        <button class="action-menu-btn ${c.isDefault ? 'disabled' : ''}" 
                                                title="${c.isDefault ? 'Cannot delete default' : 'Delete'}" 
                                                onclick="${c.isDefault ? '' : `Settings.deleteCurrency(${c.id})`}"
                                                style="${c.isDefault ? 'opacity:0.3; cursor:not-allowed;' : ''}">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="analytics-card-luxury" style="margin-top:30px; padding:20px; border-style:dashed; opacity:0.8;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <i class="fa-solid fa-circle-nodes" style="font-size:24px; color:var(--primary);"></i>
                    <div>
                        <h4 style="font-size:14px; font-weight:700; margin-bottom:4px;">Multi-Currency Logic</h4>
                        <p style="font-size:12px; color:var(--text-muted);">Internal values are always stored in <strong>${baseCur}</strong>. Conversions are applied dynamically during rendering for B2B/B2C frontends.</p>
                    </div>
                </div>
            </div>
        `;
    },

    openCurrencyModal(id = null) {
        const currencies = store.state.currencies || [];
        const baseCur = store.state.systemSettings?.currency || 'USD';
        const currency = id ? currencies.find(c => Number(c.id) === Number(id)) : {
            name: '', code: '', symbol: '', rate: 1.0, position: 'before', status: 'active'
        };

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal-overlay';
        modalDiv.id = 'currencyModal';
        modalDiv.innerHTML = `
            <div class="modal" style="width:500px;">
                <div class="modal-header">
                    <h3 class="modal-title">${id ? 'Edit' : 'Add'} Currency</h3>
                    <button class="modal-close" onclick="document.getElementById('currencyModal').remove()">&times;</button>
                </div>
                <div class="modal-body" style="padding:30px;">
                    <form id="currencyForm">
                        <div class="form-group" style="margin-bottom:20px;">
                            <label>Currency Name</label>
                            <input type="text" name="name" class="form-control" value="${currency.name}" placeholder="e.g. Euro" required>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                            <div class="form-group">
                                <label>ISO Code</label>
                                <input type="text" name="code" class="form-control" value="${currency.code}" placeholder="e.g. EUR" required maxlength="3" ${id ? 'readonly style="opacity:0.6;"' : ''}>
                            </div>
                            <div class="form-group">
                                <label>Symbol</label>
                                <input type="text" name="symbol" class="form-control" value="${currency.symbol}" placeholder="e.g. €" required>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                            <div class="form-group">
                                <label>Exchange Rate</label>
                                <input type="number" name="rate" class="form-control" value="${currency.rate}" step="0.0001" min="0.0001" required>
                                <p style="font-size:10px; color:var(--text-muted); margin-top:5px;">Base: 1 ${baseCur}</p>
                            </div>
                            <div class="form-group">
                                <label>Symbol Position</label>
                                <select name="position" class="form-control input-select">
                                    <option value="before" ${currency.position === 'before' ? 'selected' : ''}>Before Amount</option>
                                    <option value="after" ${currency.position === 'after' ? 'selected' : ''}>After Amount</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>System Status</label>
                            <select name="status" class="form-control input-select">
                                <option value="active" ${currency.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${currency.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div style="margin-top:30px; display:flex; gap:12px; justify-content:flex-end;">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('currencyModal').remove()">Cancel</button>
                            <button type="submit" class="btn-primary">Confirm Protocol</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        document.getElementById('currencyForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                code: formData.get('code').toUpperCase(),
                symbol: formData.get('symbol'),
                rate: parseFloat(formData.get('rate')),
                position: formData.get('position'),
                status: formData.get('status')
            };

            const result = id ? store.updateCurrency(id, data) : store.addCurrency(data);

            if (result.success) {
                UI.showToast(id ? 'Currency updated' : 'Currency added', 'success');
                modalDiv.remove();
                this.render();
            } else {
                alert(result.message);
            }
        };
    },

    setCurrencyDefault(id) {
        if (confirm('Critical Action: You are changing the system base currency. Financial reports and analytics will be recalculated. Proceed?')) {
            const result = store.setDefaultCurrency(id);
            if (result.success) {
                UI.showToast('System base currency updated', 'success');
                this.render();
            } else {
                alert(result.message);
            }
        }
    },

    deleteCurrency(id) {
        if (confirm('Security Protocol: Deleted currencies cannot be recovered. Are you sure?')) {
            const result = store.deleteCurrency(id);
            if (result.success) {
                UI.showToast('Currency purged from system', 'success');
                this.render();
            } else {
                alert(result.message);
            }
        }
    },

    // --- Email (SMTP & IMAP) Configuration SOP ---
    renderEmailTab() {
        const smtp = store.state.systemSettings.smtpSettings || {};
        const imap = store.state.systemSettings.imapSettings || {};

        const smtpStatusColor = smtp.status === 'connected' ? 'var(--success)' : (smtp.status === 'error' ? 'var(--danger)' : 'var(--text-muted)');
        const smtpStatusIcon = smtp.status === 'connected' ? 'fa-circle-check' : (smtp.status === 'error' ? 'fa-circle-xmark' : 'fa-circle-dot');

        const imapStatusColor = imap.status === 'connected' ? 'var(--success)' : (imap.status === 'error' ? 'var(--danger)' : 'var(--text-muted)');
        const imapStatusIcon = imap.status === 'connected' ? 'fa-circle-check' : (imap.status === 'error' ? 'fa-circle-xmark' : 'fa-circle-dot');

        return `
            <div class="section-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                <div>
                    <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Email Workspace Configuration</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Configure SMTP for outbound campaigns and IMAP for inbound inbox synchronization.</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
                    <div style="display:flex; align-items:center; gap:10px; padding:6px 15px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:30px;">
                        <span style="font-size:10px; color:var(--text-muted);">SMTP Outbound:</span>
                        <i class="fa-solid ${smtpStatusIcon}" style="color:${smtpStatusColor}; font-size:12px;"></i>
                        <span style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:${smtpStatusColor};">${smtp.status === 'connected' ? 'Connected' : (smtp.status === 'error' ? 'Error' : 'Disconnected')}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; padding:6px 15px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:30px;">
                        <span style="font-size:10px; color:var(--text-muted);">IMAP Inbound:</span>
                        <i class="fa-solid ${imapStatusIcon}" style="color:${imapStatusColor}; font-size:12px;"></i>
                        <span style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:${imapStatusColor};">${imap.status === 'connected' ? 'Connected' : (imap.status === 'error' ? 'Error' : 'Disconnected')}</span>
                    </div>
                </div>
            </div>

            <div class="analytics-card-luxury" style="margin-bottom:35px; border-style:dashed;">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; color:var(--primary);">QuickSelect Presets</h4>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                    <button class="btn-secondary" style="height:auto; padding:15px; flex-direction:column; gap:8px;" onclick="Settings.applyEmailPreset('gmail')">
                        <i class="fa-brands fa-google" style="color:#DB4437; font-size:20px;"></i>
                        <span style="font-size:12px; font-weight:700;">Gmail / Workspace</span>
                    </button>
                    <button class="btn-secondary" style="height:auto; padding:15px; flex-direction:column; gap:8px;" onclick="Settings.applyEmailPreset('outlook')">
                        <i class="fa-brands fa-microsoft" style="color:#00A4EF; font-size:20px;"></i>
                        <span style="font-size:12px; font-weight:700;">Outlook / 365</span>
                    </button>
                    <button class="btn-secondary" style="height:auto; padding:15px; flex-direction:column; gap:8px;" onclick="Settings.applyEmailPreset('cpanel')">
                        <i class="fa-solid fa-server" style="color:var(--primary); font-size:20px;"></i>
                        <span style="font-size:12px; font-weight:700;">Hosting (cPanel)</span>
                    </button>
                </div>
            </div>

            <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; color:var(--text-primary); border-bottom:1px solid var(--border); padding-bottom:5px;">SMTP (Sending) Parameters</h4>

            <div id="smtpForm" class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:35px;">
                <div class="form-group">
                    <label>SMTP Host <span style="color:var(--danger);">*</span></label>
                    <input type="text" id="smtp_host" class="form-control" value="${smtp.host || ''}" placeholder="e.g. smtp.gmail.com">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div class="form-group">
                        <label>SMTP Port <span style="color:var(--danger);">*</span></label>
                        <input type="number" id="smtp_port" class="form-control" value="${smtp.port || 587}" placeholder="465 or 587">
                    </div>
                    <div class="form-group">
                        <label>Encryption <span style="color:var(--danger);">*</span></label>
                        <select id="smtp_encryption" class="form-control input-select">
                            <option value="SSL" ${smtp.encryption === 'SSL' ? 'selected' : ''}>SSL</option>
                            <option value="TLS" ${smtp.encryption === 'TLS' ? 'selected' : ''}>TLS / STARTTLS (Recommended)</option>
                            <option value="STARTTLS" ${smtp.encryption === 'STARTTLS' ? 'selected' : ''}>STARTTLS</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>From Name <span style="color:var(--danger);">*</span></label>
                    <input type="text" id="smtp_fromName" class="form-control" value="${smtp.fromName || ''}" placeholder="e.g. PM Travel Agency">
                </div>
                <div class="form-group">
                    <label>From Email <span style="color:var(--danger);">*</span></label>
                    <input type="email" id="smtp_fromEmail" class="form-control" value="${smtp.fromEmail || ''}" placeholder="e.g. booking@pm-travelagency.com">
                </div>

                <div class="form-group">
                    <label>Reply-To Email</label>
                    <input type="email" id="smtp_replyTo" class="form-control" value="${smtp.replyTo || ''}" placeholder="Optional alternate reply address">
                </div>
                <div class="form-group">
                    <label>Charset</label>
                    <input type="text" id="smtp_charset" class="form-control" value="${smtp.charset || 'UTF-8'}" placeholder="UTF-8 (default)">
                </div>

                <div class="form-group" style="display:flex; gap:14px; align-items:center; padding:10px 0;">
                    <label style="margin:0; display:flex; gap:10px; align-items:center; cursor:pointer;">
                        <input type="checkbox" id="smtp_useAuthAsFrom" ${smtp.useAuthAsFrom !== false ? 'checked' : ''}>
                        <span>Use authenticated mailbox as FROM (best for cPanel)</span>
                    </label>
                </div>
                <div class="form-group" style="display:flex; gap:14px; align-items:center; padding:10px 0;">
                    <label style="margin:0; display:flex; gap:10px; align-items:center; cursor:pointer;">
                        <input type="checkbox" id="smtp_allowSelfSigned" ${smtp.allowSelfSigned ? 'checked' : ''}>
                        <span>Allow self-signed TLS certificate (only if needed)</span>
                    </label>
                </div>
            </div>

            <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; color:var(--text-primary); border-bottom:1px solid var(--border); padding-bottom:5px;">IMAP (Inbound) Parameters</h4>

            <div id="imapForm" class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:35px;">
                <div class="form-group">
                    <label>IMAP Host <span style="color:var(--danger);">*</span></label>
                    <input type="text" id="imap_host" class="form-control" value="${imap.host || ''}" placeholder="e.g. imap.gmail.com">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div class="form-group">
                        <label>IMAP Port <span style="color:var(--danger);">*</span></label>
                        <input type="number" id="imap_port" class="form-control" value="${imap.port || 993}" placeholder="993">
                    </div>
                    <div class="form-group">
                        <label>Encryption <span style="color:var(--danger);">*</span></label>
                        <select id="imap_encryption" class="form-control input-select">
                            <option value="SSL" ${imap.encryption === 'SSL' ? 'selected' : ''}>SSL / TLS</option>
                            <option value="None" ${imap.encryption === 'None' ? 'selected' : ''}>Unencrypted (Not Rec.)</option>
                        </select>
                    </div>
                </div>
            </div>

            <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; color:var(--text-primary); border-bottom:1px solid var(--border); padding-bottom:5px;">Global Credentials</h4>

            <div class="form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:35px;">
                <div class="form-group">
                    <label>Account Username <span style="color:var(--danger);">*</span></label>
                    <input type="text" id="email_username" class="form-control" value="${smtp.username || ''}" placeholder="Full email address">
                </div>
                <div class="form-group">
                    <label>Account Password <span style="color:var(--danger);">*</span></label>
                    <div style="position:relative;">
                        <input type="password" id="email_password" class="form-control" value="${smtp.password || ''}" placeholder="App Password">
                        <i class="fa-solid fa-eye-slash" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); opacity:0.3; cursor:not-allowed;" title="SOP Rule 5: Credential Masking Mandatory"></i>
                    </div>
                </div>
                <div style="grid-column: 1 / -1; font-size: 11px; color: var(--text-muted); margin-top: -15px;">
                    * The system assumes the same Account Credentials are used for both SMTP and IMAP connections (standard for Gmail/Office365).
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:40px; padding-top:25px; border-top:1px solid var(--border);">
                <div>
                    <p style="font-size:11px; color:var(--text-muted);">Last Sync Test: <b style="color:var(--text-primary);">${smtp.lastTested || 'Never'}</b></p>
                </div>
                <div style="display:flex; gap:15px;">
                    <button class="btn-secondary" style="border-style:dashed;" onclick="Settings.testEmailConfig(this)">
                        <i class="fa-solid fa-paper-plane"></i> Test Connectivity
                    </button>
                    <button class="btn-primary" onclick="Settings.saveEmailConfig(this)">
                        <i class="fa-solid fa-floppy-disk"></i> Save Configuration
                    </button>
                </div>
            </div>

            <div style="margin-top:40px; padding:20px; background:rgba(var(--primary-rgb), 0.03); border-radius:8px; border-left:4px solid var(--primary);">
                <h5 style="font-size:13px; font-weight:700; margin-bottom:10px; display:flex; align-items:center; gap:10px;">
                    <i class="fa-solid fa-shield-halved"></i> SOP Security & Protection Rules
                </h5>
                <ul style="font-size:11px; color:var(--text-secondary); line-height:1.8; padding-left:20px;">
                    <li><b>Rule 5:</b> Never use personal passwords. Always generate an <b>App Password</b> via your provider settings. </li>
                    <li><b>Rule 10:</b> Outbound rate is currently capped at <b>300 emails/hour</b> to protect domain reputation.</li>
                    <li><b>Rule 11:</b> Primary SMTP is used for all transactional intelligence (Invoices, Quotes).</li>
                </ul>
            </div>
        `;
    },

    applyEmailPreset(preset) {
        const presets = {
            gmail: { smtp_host: 'smtp.gmail.com', smtp_port: 465, smtp_encryption: 'SSL', imap_host: 'imap.gmail.com', imap_port: 993, imap_encryption: 'SSL' },
            outlook: { smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_encryption: 'TLS', imap_host: 'outlook.office365.com', imap_port: 993, imap_encryption: 'SSL' },
            cpanel: { smtp_host: 'mail.yourdomain.com', smtp_port: 465, smtp_encryption: 'SSL', imap_host: 'mail.yourdomain.com', imap_port: 993, imap_encryption: 'SSL' }
        };

        const config = presets[preset];
        if (config) {
            document.getElementById('smtp_host').value = config.smtp_host;
            document.getElementById('smtp_port').value = config.smtp_port;
            document.getElementById('smtp_encryption').value = config.smtp_encryption;
            document.getElementById('imap_host').value = config.imap_host;
            document.getElementById('imap_port').value = config.imap_port;
            document.getElementById('imap_encryption').value = config.imap_encryption;
            UI.showToast(`Applied ${preset.toUpperCase()} Preset`, 'info');
        }
    },

    testEmailConfig(btn) {
        const config = {
            host: document.getElementById('smtp_host').value,
            port: document.getElementById('smtp_port').value,
            encryption: document.getElementById('smtp_encryption').value,
            username: document.getElementById('email_username').value,
            password: document.getElementById('email_password').value,
            testRecipient: store.state.currentUser?.email || document.getElementById('email_username').value,
            useAuthAsFrom: (document.getElementById('smtp_useAuthAsFrom') ? document.getElementById('smtp_useAuthAsFrom').checked : true),
            allowSelfSigned: (document.getElementById('smtp_allowSelfSigned') ? document.getElementById('smtp_allowSelfSigned').checked : false)
        };

        if (!config.host || !config.username || !config.password) {
            return alert('Host, Username and Password are mandatory for the connectivity pulse.');
        }

        UI.showFeedback(btn, 'loading');

        setTimeout(async () => {
            const result = await store.sendSMTPTest(config);
            UI.showFeedback(btn, result.success ? 'success' : 'error');

            if (result.success) {
                UI.showToast(result.message, 'success');
            } else {
                alert(`SMTP ERROR: ${result.message}\n\nTip: start the local server (server/server.js) then try again.`);
            }
            this.render();
        }, 700);
    },

    async saveEmailConfig(btn) {
        const smtpConfig = {
            host: document.getElementById('smtp_host').value,
            port: document.getElementById('smtp_port').value,
            encryption: document.getElementById('smtp_encryption').value,
            username: document.getElementById('email_username').value,
            password: document.getElementById('email_password').value,
            fromName: document.getElementById('smtp_fromName').value,
            fromEmail: document.getElementById('smtp_fromEmail').value,
            replyTo: document.getElementById('smtp_replyTo').value,
            charset: document.getElementById('smtp_charset').value,
            useAuthAsFrom: (document.getElementById('smtp_useAuthAsFrom') ? document.getElementById('smtp_useAuthAsFrom').checked : true),
            allowSelfSigned: (document.getElementById('smtp_allowSelfSigned') ? document.getElementById('smtp_allowSelfSigned').checked : false)
        };

        const imapConfig = {
            host: document.getElementById('imap_host').value,
            port: document.getElementById('imap_port').value,
            encryption: document.getElementById('imap_encryption').value,
            username: document.getElementById('email_username').value,
            password: document.getElementById('email_password').value
        };

        UI.showFeedback(btn, 'loading');

        try {
            // Persist to Server DB
            const response = await fetch(store.apiBase() + '/api/settings/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smtp: smtpConfig, imap: imapConfig })
            });

            const result = await response.json();
            if (!result.ok) throw new Error(result.message || 'Failed to save to server');

            // Update Local State
            store.state.systemSettings.smtpSettings = {
                ...store.state.systemSettings.smtpSettings,
                ...smtpConfig
            };
            store.state.systemSettings.imapSettings = {
                ...store.state.systemSettings.imapSettings,
                ...imapConfig
            };

            store.logAction('EMAIL', 'UPDATE_CONFIG', 'SYSTEM', 'success', 'Email Configuration updated successfully');
            UI.showFeedback(btn, 'success');
            UI.showToast('Configuration Saved & Secured to Database', 'success');
            this.render();

        } catch (err) {
            console.error(err);
            UI.showFeedback(btn, 'error');
            UI.showToast(`Save Failed: ${err.message}`, 'error');
        }
    },
    renderMaintenanceTab() {
        return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                <div>
                    <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Environment Maintenance</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Securely manage data resets and system propulsion states.</p>
                </div>
                <div style="font-size:11px; color:var(--text-muted);">Last Propelled: ${store.state.systemSettings.maintenance.lastReset || 'Initial Session'}</div>
            </div>

            <div style="display:grid; gap:25px;">
                <!-- Delete Demo Data -->


                <!-- Reset Stats -->
                <div class="card p-4" style="border:1px solid var(--border); background:rgba(255,255,255,0.01);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="font-size:15px; font-weight:700; margin-bottom:5px;">Clear Analytics Cache</h4>
                            <p style="font-size:12px; color:var(--text-muted);">Recalculate dashboard KPIs and revenue projections from raw transmission logs.</p>
                        </div>
                        <button class="btn-secondary" onclick="Settings.resetStats(this)">Reset Metrics</button>
                    </div>
                </div>

                <!-- Delete All Data -->
                <div class="card p-4" style="border:1px solid var(--danger); background:rgba(220, 53, 69, 0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="font-size:15px; font-weight:700; margin-bottom:5px; color:var(--danger);">Universal Hard Reset</h4>
                            <p style="font-size:12px; color:var(--text-muted);">Wipe ALL entity records and revert to the First-Run Setup Wizard. configuration will be lost.</p>
                        </div>
                        <button class="btn-primary" style="background:var(--danger); border-color:var(--danger);" onclick="Settings.confirmHardReset()">Nuclear Wipe</button>
                    </div>
                </div>
            </div>
        `;
    },

    confirmDemoWipe() {
        const confirmText = 'DELETE DEMO';
        const input = prompt(`WARNING: This will remove all sample/demo records.\nType "${confirmText}" to authorize the purge:`);

        if (input === confirmText) {
            UI.showToast('Purging demo assets...', 'info');
            setTimeout(() => {
                store.wipeDemoData();
                UI.showToast('Demo Environment Purged', 'success');
                this.render();
            }, 1000);
        } else if (input !== null) {
            UI.showToast('Authorization Mismatch', 'error');
        }
    },

    confirmHardReset() {
        const confirmText = 'DELETE ALL';
        const input = prompt(`CRITICAL DANGER: This wipes EVERY client, quote, and campaign.\nYou will be redirected to the Setup Wizard.\nType "${confirmText}" to execute:`);

        if (input === confirmText) {
            UI.showToast('Executing universal wipe...', 'danger');
            setTimeout(() => {
                store.wipeAllData();
                try { localStorage.removeItem('pm_crm_setup_complete'); } catch (_) { }
                UI.showToast('System Reset Successful', 'success');
                window.location.reload(); // Refresh to trigger Wizard
            }, 1500);
        } else if (input !== null) {
            UI.showToast('Reset Aborted', 'info');
        }
    },

    resetStats(btn) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            store.resetDashboardStats();
            UI.showFeedback(btn, 'success');
            UI.showToast('Intelligence Cache Cleared', 'success');
        }, 800);
    },

    saveSecurity(btn) {
        const rotation = document.getElementById('secRotation').value;
        const timeout = document.getElementById('secTimeout').value;

        UI.showFeedback(btn, 'loading');

        const settings = {
            forcePasswordReset: parseInt(rotation) || 90,
            sessionTimeout: parseInt(timeout) || 30
        };

        store.saveSecuritySettings(settings).then(res => {
            if (res.success) {
                UI.showFeedback(btn, 'success');
                UI.showToast('Security protocols updated', 'success');
            } else {
                UI.showFeedback(btn, 'error');
                UI.showToast(res.message || 'Save failed', 'error');
            }
        });
    },

    async saveEmailSettings(btn) {
        UI.showFeedback(btn, 'loading');

        const smtp = {
            host: document.getElementById('smtp_host').value.trim(),
            port: parseInt(document.getElementById('smtp_port').value) || 587,
            encryption: document.getElementById('smtp_encryption').value,
            fromName: document.getElementById('smtp_fromName').value.trim(),
            fromEmail: document.getElementById('smtp_fromEmail').value.trim(),
            replyTo: document.getElementById('smtp_replyTo').value.trim(),
            charset: document.getElementById('smtp_charset').value.trim() || 'UTF-8',
            useAuthAsFrom: document.getElementById('smtp_useAuthAsFrom').checked,
            allowSelfSigned: document.getElementById('smtp_allowSelfSigned').checked,
            username: document.getElementById('email_username').value.trim(),
            password: document.getElementById('email_password').value.trim(),
            status: 'connected'
        };

        const imap = {
            host: document.getElementById('imap_host').value.trim(),
            port: parseInt(document.getElementById('imap_port').value) || 993,
            encryption: document.getElementById('imap_encryption').value,
            username: document.getElementById('email_username').value.trim(),
            password: document.getElementById('email_password').value.trim(),
            status: 'connected'
        };

        if (!smtp.host || !smtp.fromEmail || !smtp.username || !smtp.password) {
            alert('Host, From Email, Username, and Password are required.');
            UI.showFeedback(btn, 'error');
            return;
        }

        try {
            const res = await fetch(store.apiBase() + '/api/settings/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smtp, imap })
            });
            const data = await res.json();

            if (data.ok) {
                store.state.systemSettings.smtpSettings = smtp;
                store.state.systemSettings.imapSettings = imap;
                store.notify();
                store.logAction('SETTINGS', 'UPDATE_EMAIL', 'SYSTEM', 'success', 'SMTP & IMAP configuration updated');
                UI.showToast('Email Configuration Saved!', 'success');
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 1500);
            } else {
                throw new Error(data.message || 'Server error');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to save email settings: ' + e.message);
            UI.showFeedback(btn, 'error');
            smtp.status = 'error';
            imap.status = 'error';
        }
    },

    renderSecurityTab() {
        const user = store.state.currentUser || {};
        const sys = store.state.systemSettings;
        const isAdminSecurity = user.role === 'admin';

        return `
            <div class="section-header" style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:15px;">
                <div>
                    <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Data Fortification</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Monitor system access integrity and enforce security protocols.</p>
                </div>
                <button class="btn-primary" onclick="Settings.saveSecurity(this)" ${!isAdminSecurity ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    <i class="fa-solid fa-lock"></i> Save Protocols
                </button>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:30px;">
                <div class="form-group">
                    <label>Password Rotation Cycle (Days)</label>
                    <input type="number" id="secRotation" class="form-control" value="${sys.security.forcePasswordReset}" ${!isAdminSecurity ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label>Auto-Session Termination (Minutes)</label>
                    <input type="number" id="secTimeout" class="form-control" value="${sys.security.sessionTimeout}" ${!isAdminSecurity ? 'disabled' : ''}>
                </div>
            </div>

            <div class="analytics-card-luxury" style="padding:25px; background:rgba(var(--primary-rgb), 0.03); border-color:rgba(var(--primary-rgb), 0.2); margin-bottom:40px;">
                <h4 style="font-size:13px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:15px;">SOP Security Directive</h4>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px;">
                    <div style="font-size:11px; display:flex; gap:10px; align-items:center;">
                        <i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Multi-Factor (MFA) Recommended
                    </div>
                    <div style="font-size:11px; display:flex; gap:10px; align-items:center;">
                        <i class="fa-solid fa-circle-check" style="color:var(--success);"></i> High-Entropy Passwords
                    </div>
                    <div style="font-size:11px; display:flex; gap:10px; align-items:center;">
                        <i class="fa-solid fa-circle-check" style="color:var(--success);"></i> IP Whitelisting Active
                    </div>
                </div>
            </div>

            <div class="section-header" style="margin-bottom:20px;">
                <h4 style="font-size:14px; font-weight:700;">Active Environment Sessions</h4>
            </div>
            <div class="card" style="padding:0; overflow:hidden; border:1px solid var(--border); background:transparent; margin-bottom:40px;">
                <table class="data-table" style="font-size:12px;">
                    <thead style="background:rgba(255,255,255,0.02);"><tr><th>Originating IP</th><th>Workstation Artifact</th><th>Last Pulse</th><th style="text-align:right;">Protocol</th></tr></thead>
                    <tbody>
                        ${(sys.security.activeSessions || []).map(s => `
                            <tr>
                                <td><div style="font-weight:700;">${s.ip}</div><div style="font-size:10px; opacity:0.6;">${s.location}</div></td>
                                <td><i class="fa-solid fa-laptop" style="margin-right:8px; opacity:0.5;"></i> ${s.device}</td>
                                <td>${s.time}</td>
                                <td style="text-align:right;">
                                    <button class="action-menu-btn" style="color:var(--danger);" onclick="Settings.revokeSession(this, '${s.ip}')" ${!isAdminSecurity ? 'disabled' : ''}>
                                        <i class="fa-solid fa-ban"></i> Revoke
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section-header" style="margin-bottom:20px;">
                <h4 style="font-size:14px; font-weight:700; color:var(--primary);">System Intelligence Logs</h4>
            </div>
            <div class="card" style="padding:0; overflow:hidden; border:1px solid var(--border); background:rgba(0,0,0,0.2);">
                <table class="data-table" style="font-size:11px;">
                    <thead style="background:rgba(255,255,255,0.02);"><tr><th>Temporal Node</th><th>Entity</th><th>Action Protocol</th><th>Status</th><th>Node IP</th></tr></thead>
                    <tbody>
                        ${store.state.authLogs.slice(0, 10).map(log => `
                            <tr>
                                <td style="opacity:0.6;">${new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td style="font-weight:700;">${log.user}</td>
                                <td style="font-weight:600; font-family:var(--font-mono); font-size:10px;">${log.action.toUpperCase()}</td>
                                <td><span class="badge" style="background:${log.status === 'success' ? 'var(--bg-green-soft)' : 'var(--bg-red-soft)'}; color:${log.status === 'success' ? 'var(--success)' : 'var(--danger)'}; border:1px solid currentColor;">${log.status.toUpperCase()}</span></td>
                                <td><div style="font-size:9px; opacity:0.7;">${log.ip}</div><div style="font-size:9px; opacity:0.5;">${log.device}</div></td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:30px; opacity:0.5;">No audit logs discovered.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    triggerFullBackup(btn) {
        UI.showFeedback(btn, 'loading');
        store.logAction('SETTINGS', 'BACKUP_TRIGGERED', 'SYSTEM', 'success', 'Admin initiated full system backup (ZIP)');

        // Trigger download directly via browser
        window.location.href = store.apiBase() + '/api/backup/download';

        setTimeout(() => {
            UI.showFeedback(btn, 'success');
        }, 1500);
    }
};

window.Settings = Settings;
