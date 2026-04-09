
const Audiences = {
    _selected: new Set(),

    init() {
        this._selected = new Set();
    },

    _syncHeaderCheckbox() {
        const header = document.getElementById('selAllAudiences');
        if (!header) return;
        const total = store.state.audienceLists.length;
        const selected = this._selected.size;
        header.indeterminate = selected > 0 && selected < total;
        header.checked = total > 0 && selected === total;

        const countEl = document.getElementById('bulkCountAudiences');
        if (countEl) countEl.textContent = String(selected);

        const delBtn = document.getElementById('deleteSelAudiences');
        if (delBtn) {
            delBtn.disabled = selected === 0;
            delBtn.style.opacity = selected === 0 ? '0.5' : '1';
        }
    },

    toggleSelect(id, checked) {
        if (checked) this._selected.add(String(id));
        else this._selected.delete(String(id));
        this._syncHeaderCheckbox();
    },

    toggleSelectAll(checked) {
        this._selected = new Set();
        if (checked) {
            store.state.audienceLists.forEach(l => this._selected.add(String(l.id)));
        }
        document.querySelectorAll('input[data-sel-type="audience"]').forEach(cb => {
            cb.checked = checked;
        });
        this._syncHeaderCheckbox();
    },

    deleteSelected() {
        if (this._selected.size === 0) return;
        UI.confirm('Delete Selected', `Delete ${this._selected.size} audience list(s)?`, () => {
            this._selected.forEach(id => store.deleteAudienceList(id));
            this._selected.clear();
            this.render();
            UI.showToast('Audience lists deleted.', 'success');
        });
    },

    render() {
        const content = document.getElementById('mainContent');
        let lists = store.state.audienceLists;

        // Apply Global Search
        const searchTerm = (store.state.ui && store.state.ui.globalSearch) || '';
        if (searchTerm) {
            lists = lists.filter(l => {
                return (
                    (l.name && String(l.name).toLowerCase().includes(searchTerm)) ||
                    (l.type && String(l.type).toLowerCase().includes(searchTerm))
                );
            });
        }

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h2 style="font-size:22px; font-weight:800; letter-spacing:-1px; margin-bottom:5px;">
                        <i class="fa-solid fa-users-rectangle" style="color:var(--primary);"></i> Audience Lists
                    </h2>
                    <p style="color:var(--text-muted); font-size:13px;">Manage segmented contact lists for targeted campaigns</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="Audiences.deleteSelected()" id="deleteSelAudiences" disabled style="opacity:0.5;">
                        <i class="fa-solid fa-trash"></i> Delete (<span id="bulkCountAudiences">0</span>)
                    </button>
                    <button class="btn-primary" onclick="Audiences.importModal()">
                        <i class="fa-solid fa-file-import"></i> Import CSV/XLSX
                    </button>
                    <button class="btn-primary" onclick="Audiences.openModal()">
                        <i class="fa-solid fa-plus"></i> New Audience
                    </button>
                </div>
            </div>

            ${lists.length === 0 ? this.renderEmptyState() : `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:40px;"><input id="selAllAudiences" type="checkbox" onclick="Audiences.toggleSelectAll(this.checked)" /></th>
                                <th>Audience Name</th>
                                <th>Type</th>
                                <th>Filters</th>
                                <th>Contacts</th>
                                <th>Created</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lists.map(list => {
            const contactCount = store.getAudienceContacts(list.id).length;
            const filterStr = Object.entries(list.filters || {})
                .filter(([k, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ') || 'All';
            return `
                                    <tr>
                                        <td><input type="checkbox" data-sel-type="audience" data-id="${list.id}" onchange="Audiences.toggleSelect(${list.id}, this.checked)" /></td>
                                        <td>
                                            <div class="cell-info" style="cursor:pointer;" onclick="Audiences.viewContacts(${list.id})">
                                                <h5 style="font-weight:700;">${list.name}</h5>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="status-badge ${list.type === 'B2B' ? 'status-confirmed' : 'status-pending'}">
                                                ${list.type}
                                            </span>
                                        </td>
                                        <td style="font-size:12px; color:var(--text-secondary);">${filterStr}</td>
                                        <td>
                                            <span style="font-weight:700; color:var(--primary);">${contactCount}</span>
                                            <span style="font-size:11px; color:var(--text-muted);"> contacts</span>
                                        </td>
                                        <td style="font-size:12px; color:var(--text-muted);">${list.createdAt}</td>
                                        <td style="text-align:right;">\r
                                            <div class="action-btns">\r
                                                <button class="action-btn-label action-btn-label--view" onclick="Audiences.viewContacts(${list.id})"><i class="fa-solid fa-eye"></i> View</button>
                                                <button class="action-btn-label action-btn-label--send" onclick="Audiences.exportCSV(${list.id})"><i class="fa-solid fa-file-export"></i> Export</button>
                                                <button class="action-btn-label action-btn-label--edit" onclick="Audiences.openModal(${list.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                                                <button class="action-btn-label action-btn-label--delete" onclick="Audiences.delete(${list.id})"><i class="fa-solid fa-trash"></i> Delete</button>\r
                                            </div>\r
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        `;
    },

    renderEmptyState() {
        return `
            <div style="text-align:center; padding:60px 20px;">
                <div style="width:80px; height:80px; background:rgba(var(--primary-rgb), 0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                    <i class="fa-solid fa-users-rectangle" style="font-size:32px; color:var(--primary);"></i>
                </div>
                <h3 style="font-size:18px; font-weight:700; margin-bottom:10px;">No Audience Lists Yet</h3>
                <p style="color:var(--text-muted); font-size:13px; margin-bottom:25px;">
                    Create segmented lists to target specific groups in your email campaigns.
                </p>
                <button class="btn-primary" onclick="Audiences.openModal()">
                    <i class="fa-solid fa-plus"></i> Create Your First Audience
                </button>
            </div>
        `;
    },

    importModal() {
        Modal.open({
            title: `<i class="fa-solid fa-file-import"></i> Import Contacts to Audience`,
            width: '600px',
            body: `
                <div style="display:grid; gap:20px;">
                    <div class="form-group">
                        <label>Audience Name *</label>
                        <input type="text" id="import_aud_name" class="form-control" placeholder="e.g. Imported Leads 2026">
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <div class="select-wrap">
                            <select id="import_aud_type" class="form-control">
                                <option value="B2B">B2B Partners</option>
                                <option value="B2C">B2C Travelers</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                    
                    <div class="import-upload-zone" id="audDropZone" style="border: 2px dashed var(--border); padding: 30px; text-align: center; border-radius: 12px; cursor: pointer; transition: all 0.3s ease;">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 30px; color: var(--text-muted); margin-bottom: 10px;"></i>
                        <p style="color: var(--text-secondary); margin-bottom: 5px;">Click to upload or drag & drop</p>
                        <span style="font-size: 11px; opacity: 0.6;">Supports .csv and .xlsx</span>
                        <input type="file" id="audFileInput" accept=".csv, .xlsx" style="display: none;">
                    </div>
                    
                    <div id="audImportStatus" style="font-size:12px; color:var(--text-muted); display:none; padding:10px; background:var(--bg-hover); border-radius:8px;"></div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" id="audImportBtn" disabled onclick="Audiences.processImport()"><i class="fa-solid fa-check"></i> Process & Create</button>
            `
        });

        const dropZone = document.getElementById('audDropZone');
        const fileInput = document.getElementById('audFileInput');

        dropZone.onclick = () => fileInput.click();

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
        };

        dropZone.ondragleave = () => {
            dropZone.style.borderColor = 'var(--border)';
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) Audiences._handleImportFile(file);
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) Audiences._handleImportFile(file);
        };
    },

    _handleImportFile(file) {
        const reader = new FileReader();
        const ext = file.name.split('.').pop().toLowerCase();
        const statusEl = document.getElementById('audImportStatus');
        const importBtn = document.getElementById('audImportBtn');

        statusEl.style.display = 'block';
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reading file...';

        reader.onload = (e) => {
            const data = e.target.result;
            try {
                let json;
                if (ext === 'csv') {
                    if (!Importer._parseCSV) throw new Error('Importer module not loaded');
                    json = Importer._parseCSV(data);
                } else if (ext === 'xlsx') {
                    if (typeof XLSX === 'undefined') throw new Error('XLSX library not loaded');
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                } else {
                    throw new Error('Invalid file format');
                }

                if (!json || json.length === 0) throw new Error('File is empty');

                // Use Importer's map
                const rawHeaders = Object.keys(json[0] || {});
                const map = Importer._autoMap(rawHeaders);

                this._importData = json;
                this._importMap = map;

                statusEl.innerHTML = `<i class="fa-solid fa-file-circle-check" style="color:var(--success);"></i> Loaded ${json.length} rows (${Object.keys(map).length} columns auto-mapped)`;
                importBtn.disabled = false;
            } catch (err) {
                statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> ${err.message}`;
                importBtn.disabled = true;
            }
        };

        if (ext === 'csv') reader.readAsText(file);
        else reader.readAsBinaryString(file);
    },

    processImport() {
        const name = document.getElementById('import_aud_name').value.trim();
        const typeEl = document.getElementById('import_aud_type');
        const type = typeEl ? typeEl.value : 'B2C';

        if (!name) return UI.showToast('Audience name is required', 'warning');
        if (!this._importData) return UI.showToast('Please upload a file first', 'warning');

        const map = this._importMap;
        const mappedData = this._importData.map(item => ({
            name: (item[map.name] || item[map.company] || '').trim(),
            email: (item[map.email] || '').toLowerCase().trim(),
            phone: map.phone ? item[map.phone]?.toString().replace(/[^0-9+]/g, '') : '',
            country: item[map.country] || 'N/A',
            city: item[map.city] || '',
            company: map.company ? (item[map.company] || '').trim() : '',
            segment: map.segment ? (item[map.segment] || '').trim() : '',
            website: map.website ? (item[map.website] || '').trim() : '',
            language: map.language ? (item[map.language] || '').toUpperCase().trim() : '',
            tags: map.tags ? (item[map.tags] || '').trim() : '',
            import_source: 'Audience Import: ' + name
        })).filter(item => item.email.includes('@') || (type === 'B2B' && item.name));

        if (mappedData.length === 0) return UI.showToast('No valid rows found to import', 'error');

        let successCount = 0;
        const contactIds = [];

        // Import into store
        mappedData.forEach(client => {
            const res = store.addClient(type.toLowerCase(), client, true);
            if (res.success && res.id) {
                successCount++;
                contactIds.push(String(res.id));
            }
        });

        if (contactIds.length > 0) {
            // Create Audience with explicit contactIds
            const audData = {
                id: Date.now(),
                name,
                type,
                filters: {},
                contactIds
            };
            store.saveAudienceList(audData);
            UI.showToast(`Audience "${name}" created with ${contactIds.length} imported contacts.`, 'success');
            Modal.close();
            this.render();
        } else {
            UI.showToast('Failed to import contacts or all were duplicates.', 'error');
        }
    },

    openModal(id = null) {
        const list = id ? store.state.audienceLists.find(l => String(l.id) === String(id)) : {};
        const isEdit = !!id;

        // Get unique values for dropdowns
        const countries = [...new Set([
            ...store.state.b2bClients.map(c => c.country),
            ...store.state.b2cClients.map(c => c.country)
        ].filter(Boolean))];

        const segments = [...new Set(store.state.b2bClients.map(c => c.segment).filter(Boolean))];
        const languages = [...new Set(store.state.b2cClients.map(c => c.language).filter(Boolean))];

        Modal.open({
            title: `<i class="fa-solid fa-users-rectangle"></i> ${isEdit ? 'Edit' : 'New'} Audience List`,
            width: '600px',
            body: `
                    <div style="display:grid; gap:20px;">
                    <div class="form-group">
                        <label>Audience Name *</label>
                        <input type="text" id="aud_name" class="form-control" value="${list.name || ''}" placeholder="e.g. B2B - Tour Operators - UK">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Type *</label>
                            <div class="select-wrap">
                                <select id="aud_type" class="form-control">
                                    <option value="B2B" ${list.type === 'B2B' ? 'selected' : ''}>B2B Partners</option>
                                    <option value="B2C" ${list.type === 'B2C' ? 'selected' : ''}>B2C Travelers</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Country Filter</label>
                            <div class="select-wrap">
                                <select id="aud_country" class="form-control">
                                    <option value="">All Countries</option>
                                    ${countries.map(c => `<option value="${c}" ${list.filters?.country === c ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Segment Filter (B2B)</label>
                            <div class="select-wrap">
                                <select id="aud_segment" class="form-control">
                                    <option value="">All Segments</option>
                                    <option value="Tour Operator" ${list.filters?.segment === 'Tour Operator' ? 'selected' : ''}>Tour Operator</option>
                                    <option value="Travel Agency" ${list.filters?.segment === 'Travel Agency' ? 'selected' : ''}>Travel Agency</option>
                                    <option value="DMC" ${list.filters?.segment === 'DMC' ? 'selected' : ''}>DMC</option>
                                    <option value="MICE" ${list.filters?.segment === 'MICE' ? 'selected' : ''}>MICE</option>
                                    ${segments.filter(s => !['Tour Operator', 'Travel Agency', 'DMC', 'MICE'].includes(s)).map(s =>
                `<option value="${s}" ${list.filters?.segment === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Language Filter (B2C)</label>
                            <div class="select-wrap">
                                <select id="aud_language" class="form-control">
                                    <option value="">All Languages</option>
                                    <option value="EN" ${list.filters?.language === 'EN' ? 'selected' : ''}>English</option>
                                    <option value="FR" ${list.filters?.language === 'FR' ? 'selected' : ''}>French</option>
                                    <option value="ES" ${list.filters?.language === 'ES' ? 'selected' : ''}>Spanish</option>
                                    <option value="DE" ${list.filters?.language === 'DE' ? 'selected' : ''}>German</option>
                                    <option value="AR" ${list.filters?.language === 'AR' ? 'selected' : ''}>Arabic</option>
                                    ${languages.filter(l => !['EN', 'FR', 'ES', 'DE', 'AR'].includes(l)).map(l =>
                `<option value="${l}" ${list.filters?.language === l ? 'selected' : ''}>${l}</option>`
            ).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Tags Filter</label>
                        <input type="text" id="aud_tags" class="form-control" value="${list.filters?.tags || ''}" placeholder="e.g. Luxury, Family, Desert (comma separated)">
                    </div>

                    <div id="aud_preview" style="padding:15px; background:rgba(var(--primary-rgb), 0.03); border-radius:10px; border:1px solid rgba(var(--primary-rgb), 0.1);">
                        <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; margin-bottom:8px;">Preview</div>
                        <div id="aud_preview_count" style="font-size:24px; font-weight:800;">--</div>
                        <div style="font-size:12px; color:var(--text-muted);">contacts match these filters</div>
                    </div>
                </div>
    `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-secondary" onclick="Audiences.previewCount()"><i class="fa-solid fa-eye"></i> Preview</button>
                <button class="btn-primary" onclick="Audiences.save('${id}')">${isEdit ? 'Update List' : 'Create List'}</button>
`
        });

        // Auto-preview on open
        setTimeout(() => this.previewCount(), 100);
    },

    previewCount() {
        const type = document.getElementById('aud_type')?.value || 'B2B';
        const country = document.getElementById('aud_country')?.value || '';
        const segment = document.getElementById('aud_segment')?.value || '';
        const language = document.getElementById('aud_language')?.value || '';
        const tags = document.getElementById('aud_tags')?.value || '';

        const filters = {};
        if (country) filters.country = country;
        if (segment) filters.segment = segment;
        if (language) filters.language = language;
        if (tags) filters.tags = tags;

        // Temporarily create a filter object to count
        const tempList = { type, filters };
        const source = type === 'B2B' ? store.state.b2bClients : store.state.b2cClients;

        const count = source.filter(c => {
            let match = true;
            if (filters.country && c.country) {
                match = match && c.country.toLowerCase().includes(filters.country.toLowerCase());
            }
            if (filters.segment && c.segment) {
                match = match && c.segment.toLowerCase().includes(filters.segment.toLowerCase());
            }
            if (filters.language && c.language) {
                match = match && c.language.toLowerCase() === filters.language.toLowerCase();
            }
            if (filters.tags && c.tags) {
                const filterTags = filters.tags.split(',').map(t => t.trim().toLowerCase());
                const clientTags = Array.isArray(c.tags) ? c.tags : (c.tags || '').split(',').map(t => t.trim().toLowerCase());
                match = match && filterTags.some(t => clientTags.some(ct => ct.includes(t)));
            }
            if (store.state.emailBlacklist.includes(c.email?.toLowerCase())) {
                return false;
            }
            return match;
        }).length;

        const previewEl = document.getElementById('aud_preview_count');
        if (previewEl) {
            previewEl.textContent = count;
            previewEl.style.color = count > 0 ? 'var(--success)' : 'var(--warning)';
        }
    },

    save(id) {
        const name = document.getElementById('aud_name').value;
        const type = document.getElementById('aud_type').value;

        if (!name) return UI.showToast('Audience name is required', 'error');

        const filters = {};
        const country = document.getElementById('aud_country').value;
        const segment = document.getElementById('aud_segment').value;
        const language = document.getElementById('aud_language').value;
        const tags = document.getElementById('aud_tags').value;

        if (country) filters.country = country;
        if (segment) filters.segment = segment;
        if (language) filters.language = language;
        if (tags) filters.tags = tags;

        const data = {
            id: id && id !== 'null' ? id : Date.now(),
            name,
            type,
            filters,
            contactIds: id && id !== 'null' ? (store.state.audienceLists.find(l => String(l.id) === String(id))?.contactIds || []) : []
        };

        store.saveAudienceList(data);
        UI.showToast(`Audience list ${id && id !== 'null' ? 'updated' : 'created'} successfully`, 'success');
        Modal.close();
        this.render();
    },


    delete(id) {
        UI.confirm('Delete Audience', 'Are you sure you want to delete this audience list?', () => {
            store.deleteAudienceList(id);
            this.render();
            UI.showToast('Audience list deleted.', 'success');
        });
    },

    exportCSV(id) {
        UI.showToast(`Exporting Audience #${id} to CSV...`, 'info');
    },

    viewContacts(id) {
        const list = store.state.audienceLists.find(l => String(l.id) === String(id));
        if (!list) return UI.showToast('Audience not found', 'error');

        const contacts = store.getAudienceContacts(id);

        Modal.open({
            title: `<i class="fa-solid fa-users"></i> ${list.name}`,
            width: '800px',
            body: `
                <div style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span class="status-badge ${list.type === 'B2B' ? 'status-confirmed' : 'status-pending'}">${list.type}</span>
                        <span style="font-size:13px; color:var(--text-muted); margin-left:10px;">${contacts.length} contacts</span>
                    </div>
                    <div style="font-size:12px; color:var(--text-muted);">
                        Blacklisted emails are automatically excluded
                    </div>
                </div>

    ${contacts.length > 0 ? `
                    <div style="max-height:400px; overflow-y:auto; border:1px solid var(--border); border-radius:10px;">
                        <table class="data-table" style="font-size:12px;">
                            <thead style="position:sticky; top:0; background:var(--bg-card); z-index:10;">
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Country</th>
                                    ${list.type === 'B2B' ? '<th>Segment</th>' : '<th>Language</th>'}
                                </tr>
                            </thead>
                            <tbody>
                                ${contacts.slice(0, 100).map(c => `
                                    <tr>
                                        <td style="font-weight:600;">${c.name || c.company || '-'}</td>
                                        <td>${c.email || '-'}</td>
                                        <td>${c.country || '-'}</td>
                                        ${list.type === 'B2B' ? `<td>${c.segment || '-'}</td>` : `<td>${c.language || '-'}</td>`}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${contacts.length > 100 ? `<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:12px;">Showing first 100 of ${contacts.length} contacts</div>` : ''}
                ` : `
                    <div style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fa-solid fa-user-slash" style="font-size:32px; margin-bottom:10px; opacity:0.5;"></i>
                        <p>No contacts match these filters</p>
                    </div>
                `}
`,
            footer: `
        <button class="btn-cancel" onclick="Modal.close()">Close</button>
        <button class="btn-primary" onclick="Modal.close(); handleRoute('campaigns')">
            <i class="fa-solid fa-bullhorn"></i> Create Campaign
        </button>
`
        });
    }
};

window.Audiences = Audiences;
