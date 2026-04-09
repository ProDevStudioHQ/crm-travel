
const Wizard = {
    currentStep: 1,
    totalSteps: 4,
    config: {},

    init() {
        console.log('Setup Wizard Initialized');
    },

    open() {
        this.currentStep = 1;
        this.config = {
            adminName: store.state.currentUser.name,
            adminEmail: store.state.currentUser.email,
            companyName: store.state.company.name,
            currency: store.state.systemSettings.currency,
            timezone: store.state.systemSettings.timezone
        };
        this.render();
    },

    render() {
        Modal.open({
            title: `<i class="fa-solid fa-rocket"></i> System Propulsion Setup (Step ${this.currentStep}/${this.totalSteps})`,
            width: '600px',
            body: `
                <div id="wizardContent" style="min-height:350px; display:flex; flex-direction:column; justify-content:center;">
                    ${this.renderStep()}
                </div>
            `,
            footer: `
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div style="display:flex; gap:5px;">
                        ${Array.from({ length: this.totalSteps }).map((_, i) => `
                            <div style="width:10px; height:10px; border-radius:50%; background:${this.currentStep > i ? 'var(--primary)' : 'var(--border)'};"></div>
                        `).join('')}
                    </div>
                    <div style="display:flex; gap:10px;">
                        ${this.currentStep > 1 ? `<button class="btn-secondary" onclick="Wizard.prev()">Back</button>` : ''}
                        ${this.currentStep < this.totalSteps ?
                    `<button class="btn-primary" onclick="Wizard.next()">Continue Transmission <i class="fa-solid fa-arrow-right"></i></button>` :
                    `<button class="btn-primary" style="background:var(--success); border-color:var(--success);" onclick="Wizard.finish()">Finalize & Launch <i class="fa-solid fa-check"></i></button>`
                }
                    </div>
                </div>
            `
        });
    },

    renderStep() {
        switch (this.currentStep) {
            case 1: return `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="font-size:18px; font-weight:700;">Admin Identity</h3>
                    <p style="font-size:13px; color:var(--text-muted);">Confirm your credentials for top-level access.</p>
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="wiz_adminName" class="form-control" value="${this.config.adminName}">
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="wiz_adminEmail" class="form-control" value="${this.config.adminEmail}">
                </div>
                <div class="form-group">
                    <label>Admin Password <span style="font-size:10px; opacity:0.6;">(Leave blank to keep current)</span></label>
                    <input type="password" id="wiz_adminPass" class="form-control" placeholder="••••••••">
                </div>
            `;
            case 2: return `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="font-size:18px; font-weight:700;">Company Profile</h3>
                    <p style="font-size:13px; color:var(--text-muted);">Tell us about your organization.</p>
                </div>
                <div class="form-group">
                    <label>Legal Agency Name</label>
                    <input type="text" id="wiz_companyName" class="form-control" value="${this.config.companyName}">
                </div>
                <div class="form-group">
                    <label>Official Address</label>
                    <textarea id="wiz_address" class="form-control" style="height:80px;">${store.state.company.address}</textarea>
                </div>
            `;
            case 3: return `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="font-size:18px; font-weight:700;">Regional Intelligence</h3>
                    <p style="font-size:13px; color:var(--text-muted);">Set your default trade metrics and clock.</p>
                </div>
                <div class="form-group">
                    <label>System Currency</label>
                    <select id="wiz_currency" class="form-control">
                        ${store.state.currencies.map(c => `<option value="${c.code}" ${this.config.currency === c.code ? 'selected' : ''}>${c.name} (${c.code})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Primary Timezone</label>
                    <select id="wiz_timezone" class="form-control">
                        <option value="Europe/Paris" ${this.config.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris (CET)</option>
                        <option value="Africa/Casablanca" ${this.config.timezone === 'Africa/Casablanca' ? 'selected' : ''}>Africa/Casablanca (WET)</option>
                        <option value="America/New_York" ${this.config.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York (EST)</option>
                        <option value="Asia/Dubai" ${this.config.timezone === 'Asia/Dubai' ? 'selected' : ''}>Asia/Dubai (GST)</option>
                    </select>
                </div>
            `;
            case 4: return `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="font-size:18px; font-weight:700;">Infrastructure Check</h3>
                    <p style="font-size:13px; color:var(--text-muted);">You can configure these now or skip to the dashboard.</p>
                </div>
                <div style="display:grid; gap:15px;">
                    <div class="card p-3" style="background:rgba(var(--primary-rgb), 0.05); border:1px solid var(--primary);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; gap:12px; align-items:center;">
                                <i class="fa-solid fa-envelope" style="color:var(--primary);"></i>
                                <div>
                                    <div style="font-weight:700; font-size:13px;">SMTP Configuration</div>
                                    <div style="font-size:11px; opacity:0.7;">Enable automated emails.</div>
                                </div>
                            </div>
                            <button class="btn-cancel" style="padding:4px 12px; font-size:11px;" onclick="Modal.close(); handleRoute('settings');">Configure</button>
                        </div>
                    </div>
                    <div class="card p-3" style="background:rgba(80, 205, 137, 0.05); border:1px solid var(--success);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; gap:12px; align-items:center;">
                                <i class="fa-brands fa-whatsapp" style="color:var(--success);"></i>
                                <div>
                                    <div style="font-weight:700; font-size:13px;">WhatsApp Gateway</div>
                                    <div style="font-size:11px; opacity:0.7;">Connect social marketing.</div>
                                </div>
                            </div>
                            <button class="btn-cancel" style="padding:4px 12px; font-size:11px;" onclick="Modal.close(); handleRoute('whatsapp');">Configure</button>
                        </div>
                    </div>
                    <div style="text-align:center; margin-top:10px; padding:15px; border:1px dashed var(--border); border-radius:10px; opacity:0.6;">
                        <i class="fa-solid fa-circle-info"></i> All data tables start fresh. Configure your settings to begin.
                    </div>
                </div>
            `;
        }
    },

    saveStepData() {
        switch (this.currentStep) {
            case 1:
                this.config.adminName = document.getElementById('wiz_adminName').value;
                this.config.adminEmail = document.getElementById('wiz_adminEmail').value;
                break;
            case 2:
                this.config.companyName = document.getElementById('wiz_companyName').value;
                break;
            case 3:
                this.config.currency = document.getElementById('wiz_currency').value;
                this.config.timezone = document.getElementById('wiz_timezone').value;
                break;
        }
    },

    next() {
        this.saveStepData();
        this.currentStep++;
        this.render();
    },

    prev() {
        this.currentStep--;
        this.render();
    },

    finish() {
        // Apply final changes to store
        store.state.currentUser.name = this.config.adminName;
        store.state.currentUser.email = this.config.adminEmail;
        store.state.company.name = this.config.companyName;
        store.state.systemSettings.currency = this.config.currency;
        store.state.systemSettings.timezone = this.config.timezone;

        // Mark first run as complete and persist
        store.state.systemSettings.maintenance.isFirstRun = false;
        try { localStorage.setItem('pm_crm_setup_complete', 'true'); } catch (_) { }

        store.logAction('SYSTEM', 'SETUP_FINISH', 'ADMIN', 'success', 'Initial system propulsion completed');
        UI.showToast('Propulsion Success: System is now live!', 'success');
        Modal.close();

        // Refresh currently viewed route to apply settings
        handleRoute(window.__currentRoute || 'dashboard');
    }
};

window.Wizard = Wizard;
