
const Automation = {
    init() {
        console.log('Automation Module Initialized');
        // Subscribe to store updates to trigger rules
        store.subscribe(this.processStoreUpdate.bind(this));
    },

    lastLogId: null,

    processStoreUpdate(state) {
        if (!state.actionLogs || state.actionLogs.length === 0) return;
        const latestLog = state.actionLogs[0];

        // Prevent duplicate processing
        if (latestLog.id === this.lastLogId) return;
        this.lastLogId = latestLog.id;

        this.checkRules(latestLog);
    },

    checkRules(log) {
        const rules = store.state.automations || [];
        const activeRules = rules.filter(r => r.active);

        // Map log module/action to trigger strings
        const triggerMap = {
            'CLIENTS:ADD': 'newLead',
            'BOOKINGS:CREATE': 'newBooking',
            'QUOTES:CREATE': 'newQuote',
            'INVOICES:CREATE': 'newInvoice'
        };

        const currentTrigger = `${log.module}:${log.action}`;
        const triggerKey = triggerMap[currentTrigger];

        if (!triggerKey) return;

        activeRules.forEach(rule => {
            if (rule.trigger === triggerKey) {
                this.executeRule(rule, log);
            }
        });
    },

    executeRule(rule, log) {
        console.log(`Executing Automation Rule: ${rule.name}`);

        // SOP: Check delay (simulation for now)
        if (rule.delay > 0) {
            console.log(`Delaying execution by ${rule.delay} minutes...`);
        }

        const template = store.state.mailTemplates.find(t => t.id == rule.templateId);
        if (!template) return console.error('Automation Error: Template not found');

        // Log the automated email
        store.logEmail({
            recipient: log.details || 'System Trigger',
            subject: template.subject,
            template: template.name,
            type: 'Automated',
            trigger: rule.name
        });

        UI.showToast(`Automation Triggered: ${rule.name}`, 'info');
    },

    render() {
        const content = document.getElementById('mainContent');
        const automations = store.state.automations || [];

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 20px; font-weight:600; margin-bottom:5px;">Workflow Automation Engine</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Define event-driven intelligence to streamline your B2B/B2C operations.</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="Automation.openRuleEditor()">
                        <i class="fa-solid fa-plus"></i> Create Logic Rule
                    </button>
                </div>
            </div>

            <div class="card p-0" style="overflow:hidden;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Rule Identity</th>
                                <th>Trigger Event</th>
                                <th>Action (Template)</th>
                                <th>Delay Execution</th>
                                <th>Safety Status</th>
                                <th style="text-align:right;">Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${automations.map(r => this.renderRuleRow(r)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="analytics-card-luxury" style="margin-top:30px; border-style:dashed;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <i class="fa-solid fa-bolt-lightning" style="font-size:24px; color:var(--primary);"></i>
                    <div>
                        <h4 style="font-size:14px; font-weight:700; margin-bottom:4px;">Automation Logic Flow</h4>
                        <p style="font-size:12px; color:var(--text-muted);">Rules follow the <b>Trigger → Condition → Action</b> protocol. Automated emails are logged in the <b>Reports</b> module for compliance (SOP 7).</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderRuleRow(r) {
        const template = store.state.mailTemplates.find(t => t.id == r.templateId);
        const triggerLabels = {
            newLead: 'New Client/Lead Created',
            newBooking: 'Travel Booking Confirmed',
            newQuote: 'Proposal Generated',
            newInvoice: 'Financial Invoice Issued'
        };

        return `
            <tr>
                <td style="font-weight:700; color:var(--text-primary);">${r.name}</td>
                <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-secondary);"><i class="fa-solid fa-bolt"></i> ${triggerLabels[r.trigger] || r.trigger}</span></td>
                <td>
                    <div style="font-size:12px; font-weight:600;">${template ? template.name : 'Unknown Asset'}</div>
                    <div style="font-size:10px; color:var(--text-muted);">SEND EMAIL</div>
                </td>
                <td>${r.delay === 0 ? 'Immediate' : `${r.delay} Minutes`}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" ${r.active ? 'checked' : ''} onchange="Automation.toggleStatus(${r.id}, this.checked)">
                        <span style="font-size:11px; font-weight:700; color:${r.active ? 'var(--success)' : 'var(--text-muted)'};">${r.active ? 'ARMED' : 'INACTIVE'}</span>
                    </div>
                </td>
                <td style="text-align:right;">
                    <div style="display:flex; gap:8px; justify-content:flex-end;">
                        <button class="action-menu-btn" onclick="Automation.openRuleEditor(${r.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-menu-btn btn-danger" onclick="Automation.confirmDelete(${r.id})"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
    },

    openRuleEditor(id = null) {
        const rules = store.state.automations || [];
        const templates = store.state.mailTemplates || [];
        const rule = id ? { ...rules.find(r => r.id === id) } : {
            name: '', trigger: 'newLead', delay: 0, templateId: templates[0]?.id, active: true
        };

        Modal.open({
            title: id ? 'Modify Workflow Rule' : 'Architect New Automation',
            body: `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div class="form-group">
                        <label>Rule Name (Internal Identity)</label>
                        <input type="text" id="rule_name" class="form-control" value="${rule.name}" placeholder="e.g. B2C Welcome Flow">
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Event Trigger (SOP 6)</label>
                            <div class="select-wrap">
                                <select id="rule_trigger" class="form-control">
                                    <option value="newLead" ${rule.trigger === 'newLead' ? 'selected' : ''}>New Lead Created</option>
                                    <option value="newBooking" ${rule.trigger === 'newBooking' ? 'selected' : ''}>Booking Confirmed</option>
                                    <option value="newQuote" ${rule.trigger === 'newQuote' ? 'selected' : ''}>Quote Generated</option>
                                    <option value="newInvoice" ${rule.trigger === 'newInvoice' ? 'selected' : ''}>Invoice Issued</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Asset to Deploy (Template)</label>
                            <div class="select-wrap">
                                <select id="rule_template" class="form-control">
                                    ${templates.map(t => `<option value="${t.id}" ${rule.templateId == t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Execution Delay (Minutes)</label>
                        <input type="number" id="rule_delay" class="form-control" value="${rule.delay}" min="0">
                        <p style="font-size:10px; color:var(--text-muted); margin-top:5px;">Set to 0 for immediate transmission.</p>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Discard</button>
                <button class="btn-primary" onclick="Automation.save(${id})">Save Workflow Rule</button>
            `
        });
    },

    save(id) {
        const data = {
            id: id || Date.now(),
            name: document.getElementById('rule_name').value,
            trigger: document.getElementById('rule_trigger').value,
            templateId: document.getElementById('rule_template').value,
            delay: parseInt(document.getElementById('rule_delay').value) || 0,
            active: true
        };

        if (!data.name) return UI.showToast('Logic Identity is required.', 'error');

        if (!id) {
            store.state.automations.push(data);
        } else {
            const idx = store.state.automations.findIndex(r => r.id === id);
            if (idx !== -1) store.state.automations[idx] = data;
        }

        store.logAction('AUTOMATION', 'SAVE_RULE', data.name, 'success', 'Workflow adjusted');
        UI.showToast('Workflow synchronized.', 'success');
        Modal.close();
        this.render();
    },

    toggleStatus(id, active) {
        const idx = store.state.automations.findIndex(r => r.id === id);
        if (idx !== -1) {
            store.state.automations[idx].active = active;
            store.logAction('AUTOMATION', 'TOGGLE_STATUS', id, 'success', `Rule ${active ? 'Armed' : 'Disarmed'}`);
            UI.showToast(`Rule ${active ? 'Armed' : 'Disarmed'}`, 'info');
            this.render();
        }
    },

    confirmDelete(id) {
        UI.confirm('Decommission Workflow', 'Are you sure you want to terminate this automation logic?', () => {
            store.state.automations = store.state.automations.filter(r => r.id !== id);
            UI.showToast('Rule terminated.', 'success');
            this.render();
        }, 'danger');
    }
};

window.Automation = Automation;
