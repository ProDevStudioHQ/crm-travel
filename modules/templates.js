
const TemplateManager = {
    activeCategory: 'all',
    editingTemplate: null,

    init() {
        console.log('Template Manager Initialized');
    },

    render() {
        const content = document.getElementById('mainContent');
        const templates = this._getFilteredTemplates();

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 20px; font-weight:600; margin-bottom:5px;">Email Template Vault</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Manage responsive brand-compliant communication templates.</p>
                </div>
                <button class="btn-primary" onclick="TemplateManager.openEditor()">
                    <i class="fa-solid fa-plus"></i> Design New Template
                </button>
            </div>

            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px;">
                        ${['all', 'Transactional', 'Marketing', 'System'].map(cat => `
                            <button class="btn-social" style="width:auto; border-color:${this.activeCategory === cat ? 'var(--primary)' : 'var(--border)'}; color:${this.activeCategory === cat ? 'var(--primary)' : 'var(--text-muted)'};" onclick="TemplateManager.switchCategory('${cat}')">
                                ${cat === 'all' ? 'All Assets' : cat}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px; padding:25px;">
                    ${templates.map(t => this.renderTemplateCard(t)).join('')}
                    ${templates.length === 0 ? '<div style="grid-column: 1/-1; text-align:center; padding:50px; opacity:0.5;">No templates discovered in this category.</div>' : ''}
                </div>
            </div>
        `;
    },

    renderTemplateCard(t) {
        return `
            <div class="card p-4" style="border:1px solid var(--border); position:relative; overflow:hidden;">
                <div style="position:absolute; top:12px; right:12px; display:flex; gap:5px;">
                    <button class="action-menu-btn" onclick="TemplateManager.openEditor(${t.id})" title="Edit Template"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-menu-btn btn-danger" onclick="TemplateManager.confirmDelete(${t.id})" title="Delete Template"><i class="fa-solid fa-trash-can"></i></button>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(var(--primary-rgb), 0.1); display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:18px;">
                        <i class="fa-solid ${t.category === 'Marketing' ? 'fa-bullhorn' : 'fa-file-invoice'}"></i>
                    </div>
                    <div>
                        <h4 style="font-size:14px; font-weight:700;">${t.name}</h4>
                        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:700;">${t.category}</span>
                    </div>
                </div>
                <div style="margin-bottom:15px;">
                    <p style="font-size:12px; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Subject:</p>
                    <p style="font-size:11px; color:var(--text-primary); font-style:italic;">"${t.subject}"</p>
                </div>
                <button class="btn-secondary" style="width:100%; height:32px; font-size:11px;" onclick="TemplateManager.previewTemplate(${t.id})">
                    <i class="fa-solid fa-eye"></i> Visual Preview
                </button>
            </div>
        `;
    },

    _getFilteredTemplates() {
        const all = store.state.mailTemplates || [];
        if (this.activeCategory === 'all') return all;
        return all.filter(t => t.category === this.activeCategory);
    },

    switchCategory(cat) {
        this.activeCategory = cat;
        this.render();
    },

    openEditor(id = null) {
        const templates = store.state.mailTemplates || [];
        this.editingTemplate = id ? { ...templates.find(t => t.id === id) } : {
            name: '', category: 'Marketing', subject: '', body: ''
        };

        Modal.open({
            title: id ? '<i class="fa-solid fa-pen-nib"></i> Refine Email Asset' : '<i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template',
            width: '850px',
            body: `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Template Reference Name</label>
                            <input type="text" id="tpl_name" class="form-control" value="${this.editingTemplate.name}" placeholder="e.g. Booking Confirmation 2026">
                        </div>
                        <div class="form-group">
                            <label>Category (SOP 4)</label>
                            <div class="select-wrap">
                                <select id="tpl_category" class="form-control">
                                    <option value="Transactional" ${this.editingTemplate.category === 'Transactional' ? 'selected' : ''}>Transactional</option>
                                    <option value="Marketing" ${this.editingTemplate.category === 'Marketing' ? 'selected' : ''}>Marketing</option>
                                    <option value="System" ${this.editingTemplate.category === 'System' ? 'selected' : ''}>System / Staff</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email Subject Line (Smart Variables Supported)</label>
                        <input type="text" id="tpl_subject" class="form-control" value="${this.editingTemplate.subject}" placeholder="e.g. Your adventure awaits, {{FULL_NAME}}!">
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 280px; gap:20px;">
                        <div class="form-group">
                            <label>HTML Content <span style="font-size:10px; color:var(--text-muted); font-weight:normal;">(Responsive Tags Allowed)</span></label>
                            <textarea id="tpl_body" class="form-control" style="height:350px; font-family:var(--font-mono); font-size:12px; line-height:1.5;">${this.editingTemplate.body}</textarea>
                        </div>
                        <div class="card p-3" style="background:var(--bg-hover); font-size:11px;">
                            <h5 style="text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; color:var(--primary);">Smart Markers</h5>
                            <p style="margin-bottom:15px; opacity:0.7;">Click to insert at cursor:</p>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                ${['{{FULL_NAME}}', '{{BOOKING_ID}}', '{{QUOTE_ID}}', '{{WEBSITE_URL}}', '{{INVOICE_URL}}'].map(v => `
                                    <button class="btn-secondary" style="height:28px; justify-content:flex-start; padding:0 10px;" onclick="TemplateManager.insertVariable('${v}')">${v}</button>
                                `).join('')}
                            </div>
                            <div style="margin-top:20px; padding:10px; border:1px dashed var(--border); border-radius:5px; opacity:0.8;">
                                <i class="fa-solid fa-circle-info"></i> Variable replacement is verified during the pre-dispatch cycle.
                            </div>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <div>
                        <input type="file" id="tpl_import_file" accept=".html,.htm,.txt" style="display:none;" onchange="TemplateManager.handleImport(this)">
                        <button class="btn-import" onclick="document.getElementById('tpl_import_file').click()">
                            <i class="fa-solid fa-file-import"></i> Import HTML
                        </button>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-cancel" onclick="Modal.close()">Discard</button>
                        <button class="btn-secondary" onclick="TemplateManager.previewDraft()"><i class="fa-solid fa-eye"></i> Quick Preview</button>
                        <button class="btn-primary" onclick="TemplateManager.save()">Activate Template</button>
                    </div>
                </div>
            `
        });
    },

    handleImport(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            document.getElementById('tpl_body').value = content;
            UI.showToast('HTML content imported successfully.', 'success');
        };
        reader.readAsText(file);
    },

    insertVariable(v) {
        const area = document.getElementById('tpl_body');
        const start = area.selectionStart;
        const end = area.selectionEnd;
        const text = area.value;
        area.value = text.substring(0, start) + v + text.substring(end);
        area.focus();
        area.setSelectionRange(start + v.length, start + v.length);
    },

    previewTemplate(id) {
        const t = store.state.mailTemplates.find(x => x.id === id);
        this.showPreview(t);
    },

    previewDraft() {
        const draft = {
            name: 'Draft Preview',
            subject: document.getElementById('tpl_subject').value,
            body: document.getElementById('tpl_body').value
        };
        this.showPreview(draft);
    },

    showPreview(t) {
        const dummyData = { name: 'Dr. Sarah Jenkins', id: 'BK-SAMPLE-77', quoteId: 'QT-ALPHA-1' };
        let renderedSubject = store.replaceVariables(t.subject || '', dummyData);
        let renderedBody = store.replaceVariables(t.body || '', dummyData);

        // Auto-link plain text emails for preview accuracy (simulate Gmail/Outlook behavior)
        renderedBody = renderedBody.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)(?![^<]*>|[^<>]*<\/a>)/gi, '<a href="mailto:$1" style="color:#009ef7; text-decoration:underline;">$1</a>');

        Modal.open({
            title: `<i class="fa-solid fa-vial"></i> SOP Quality Assurance Preview`,
            width: '600px',
            body: `
                <div style="background:#f8f9fa; border-radius:10px; border:1px solid #ddd; overflow:hidden;">
                    <div style="padding:15px; background:#fff; border-bottom:1px solid #eee;">
                        <div style="font-size:11px; color:#666; margin-bottom:5px;"><b>To:</b> sarah.jenkins@executive.com</div>
                        <div style="font-size:13px; color:#333; font-weight:700;"><b>Subject:</b> ${renderedSubject}</div>
                    </div>
                    <div style="padding:30px; background:#fff; min-height:300px; color:#333; line-height:1.6; font-family: sans-serif;">
                        ${renderedBody}
                    </div>
                    <div style="padding:15px; background:#f4f4f4; border-top:1px solid #eee; font-size:10px; color:#999; text-align:center;">
                        © PM Travel Agency 2026. All rights reserved.
                    </div>
                </div>
            `,
            footer: `<button class="btn-primary" onclick="Modal.close()">Return to Workshop</button>`
        });
    },

    save() {
        const template = {
            id: this.editingTemplate.id,
            name: document.getElementById('tpl_name').value,
            category: document.getElementById('tpl_category').value,
            subject: document.getElementById('tpl_subject').value,
            body: document.getElementById('tpl_body').value
        };

        if (!template.name || !template.subject || !template.body) {
            return UI.showToast('Please fulfill all mandatory asset parameters.', 'error');
        }

        const result = store.saveTemplate(template);
        if (result.success) {
            UI.showToast('Template synchronized successfully.', 'success');
            Modal.close();
            this.render();
        }
    },

    confirmDelete(id) {
        UI.confirm('Decommission Asset', 'Are you sure you want to permanently delete this communication template? This cannot be undone.', () => {
            store.deleteTemplate(id);
            UI.showToast('Asset decommissioned.', 'success');
            this.render();
        }, 'danger');
    }
};

window.TemplateManager = TemplateManager;
