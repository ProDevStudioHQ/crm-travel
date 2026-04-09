
const Importer = {
    _lastData: null,
    _type: 'b2c', // default

    init() {
        // Any initialization logic if needed
    },

    open(type = 'b2c') {
        const user = store.state.currentUser;
        // SOP Rule 12: Permissions & security
        if (['sales-agent'].includes(user.role)) {
            UI.showToast('Access Denied: You do not have permission to import contacts.', 'error');
            return;
        }

        if (user.role === 'marketing') {
            UI.showToast('View only mode: Marketing can view instructions but not trigger imports.', 'info');
        }

        this._type = type;

        Modal.open({
            title: `📥 Import Contacts (${type.toUpperCase()})`,
            size: 'lg',
            body: `
                <div class="importer-container" style="display:grid; gap:20px;">
                    <div class="import-instructions alert alert-info" style="background: rgba(0, 158, 247, 0.05); padding: 15px; border-radius: 10px; border: 1px solid var(--primary);">
                        <h4 style="font-size: 14px; margin-bottom: 8px;"><i class="fa-solid fa-circle-info"></i> Instructions (v2026)</h4>
                        <ul style="font-size: 12px; line-height: 1.6; margin-left: 20px; list-style: disc;">
                            <li>Upload <b>CSV</b> or <b>XLSX</b> files.</li>
                            <li><b>Auto-Detection</b>: Delimiters and column names are mapped automatically.</li>
                            <li>Required: <b>Name, Email, Phone, Country</b>.</li>
                            <li>Phones will be normalized to international format (Rule 9).</li>
                        </ul>
                    </div>

                    <div class="import-upload-zone" id="dropZone" style="border: 2px dashed var(--border); padding: 40px; text-align: center; border-radius: 16px; cursor: pointer; transition: all 0.3s ease;">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 40px; color: var(--text-muted); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary); margin-bottom: 5px;">Click to upload or drag & drop</p>
                        <span style="font-size: 11px; opacity: 0.6;">Maximum file size: 5MB</span>
                        <input type="file" id="fileInput" accept=".csv, .xlsx" style="display: none;">
                    </div>

                    <div id="previewArea" class="hidden" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: 12px;">
                        <!-- Preview table will be injected here -->
                    </div>

                    <div id="duplicateOptions" class="hidden" style="display: flex; gap: 15px; align-items: center; padding: 10px; background: rgba(246, 192, 0, 0.05); border-radius: 8px; border: 1px solid var(--warning);">
                         <span style="font-size: 13px; font-weight: 600;"><i class="fa-solid fa-copy"></i> Duplicates:</span>
                         <div style="display: flex; gap: 10px;">
                             <label style="font-size: 12px;"><input type="radio" name="dupeRule" value="skip" checked> Skip</label>
                             <label style="font-size: 12px;"><input type="radio" name="dupeRule" value="update"> Update Existing</label>
                         </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" id="importConfirmBtn" disabled><i class="fa-solid fa-check"></i> Process File</button>
            `
        });

        this._setupEvents();
    },

    _setupEvents() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

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
            if (file) this._handleFile(file);
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this._handleFile(file);
        };
    },

    _handleFile(file) {
        const reader = new FileReader();
        const ext = file.name.split('.').pop().toLowerCase();

        reader.onload = (e) => {
            const data = e.target.result;
            try {
                let json;
                if (ext === 'csv') {
                    json = this._parseCSV(data);
                    this._processData(json);
                } else if (ext === 'xlsx') {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    this._xlsxWorkbook = workbook;

                    // V2: Multi-sheet selection
                    if (workbook.SheetNames.length > 1) {
                        this._showSheetSelector(workbook.SheetNames);
                        return; // Wait for user selection
                    }

                    // Single sheet - process directly
                    const sheetName = workbook.SheetNames[0];
                    json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    this._processData(json);
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (err) {
                UI.showToast(`❌ ${err.message}`, 'error');
            }
        };

        if (ext === 'csv') reader.readAsText(file);
        else reader.readAsBinaryString(file);
    },

    // V2: Show sheet selector for multi-sheet XLSX files
    _showSheetSelector(sheetNames) {
        const dropZone = document.getElementById('dropZone');
        dropZone.innerHTML = `
            <div style="text-align:left; padding:10px;">
                <div style="font-size:13px; font-weight:700; margin-bottom:12px;">
                    <i class="fa-solid fa-layer-group"></i> This workbook contains ${sheetNames.length} sheets
                </div>
                <p style="font-size:12px; color:var(--text-secondary); margin-bottom:15px;">
                    Select which sheet to import:
                </p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${sheetNames.map((name, idx) => `
                        <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg-hover); border-radius:8px; cursor:pointer; transition:all 0.15s ease;"
                            onmouseover="this.style.background='var(--bg-card)'" 
                            onmouseout="this.style.background='var(--bg-hover)'">
                            <input type="radio" name="sheetSelect" value="${name}" ${idx === 0 ? 'checked' : ''}>
                            <span style="font-size:13px; font-weight:500;">${name}</span>
                        </label>
                    `).join('')}
                </div>
                <button class="btn-primary" style="margin-top:15px; width:100%;" onclick="Importer._selectSheet()">
                    <i class="fa-solid fa-check"></i> Import Selected Sheet
                </button>
            </div>
        `;
    },

    _selectSheet() {
        const selected = document.querySelector('input[name="sheetSelect"]:checked');
        if (!selected || !this._xlsxWorkbook) {
            UI.showToast('Please select a sheet', 'warning');
            return;
        }

        const sheetName = selected.value;
        const json = XLSX.utils.sheet_to_json(this._xlsxWorkbook.Sheets[sheetName]);
        UI.showToast(`Loading sheet: ${sheetName}`, 'info');
        this._processData(json);
    },

    _parseCSV(csv) {
        // Strip BOM if present
        const content = csv.startsWith('\uFEFF') ? csv.slice(1) : csv;

        // Normalize line endings and split
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        // Intelligent Delimiter Detection
        const headerLine = lines[0];
        const delimiters = [',', ';', '\t'];
        let separator = ',';
        let maxCount = -1;

        delimiters.forEach(d => {
            const count = (headerLine.match(new RegExp(d, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                separator = d;
            }
        });

        const headers = headerLine.split(separator).map(h => h.trim().toLowerCase());
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].split(separator);
            const obj = {};

            headers.forEach((header, index) => {
                let val = currentLine[index] || '';
                // Remove quotes if present
                val = val.trim().replace(/^["']|["']$/g, '');
                obj[header] = val;
            });
            result.push(obj);
        }
        return result;
    },

    _autoMap(headers) {
        const mapping = {
            name: ['name', 'company', 'company name', 'client', 'client name', 'partner', 'partner name', 'traveler', 'traveler name', 'nom', 'full name', 'fullname', 'raison sociale', 'full_name'],
            email: ['email', 'e-mail', 'mail', 'courriel', 'email address', 'contact email', 'e-mail address', 'email_address'],
            phone: ['phone', 'tel', 'telephone', 'mobile', 'gsm', 'phone number', 'phone_number', 'cell', 'cellphone', 'mobile phone', 'phone1', 'whatsapp', 'tel.'],
            country: ['country', 'pays', 'nation', 'nationality', 'location', 'region', 'pays/région'],
            city: ['city', 'ville', 'town', 'locality', 'lieu'],
            // SOP B2B Fields
            company: ['company', 'company_name', 'company name', 'société', 'entreprise', 'agency', 'agency name', 'partner'],
            segment: ['segment', 'type', 'category', 'client type', 'client_type', 'business type', 'tour operator', 'dmc', 'travel agency'],
            website: ['website', 'site', 'url', 'web', 'site web', 'website_url'],
            // SOP B2C Fields
            language: ['language', 'langue', 'lang', 'preferred language', 'idioma'],
            // Common
            tags: ['tags', 'labels', 'interests', 'keywords', 'categories', 'étiquettes']
        };

        const result = {};
        headers.forEach(h => {
            const cleanHeader = h.trim().toLowerCase();
            for (const [key, aliases] of Object.entries(mapping)) {
                // Check for exact match or if header contains the alias
                if (aliases.includes(cleanHeader) || aliases.some(a => cleanHeader === a)) {
                    if (!result[key]) result[key] = h;
                }
            }
        });

        // Second pass: partial matches if not found
        headers.forEach(h => {
            const cleanHeader = h.trim().toLowerCase();
            for (const [key, aliases] of Object.entries(mapping)) {
                if (!result[key] && aliases.some(a => cleanHeader.includes(a))) {
                    result[key] = h;
                }
            }
        });

        return result;
    },

    _processData(data) {
        if (!data || data.length === 0) {
            UI.showToast('❌ The file contains no data rows.', 'warning');
            return;
        }

        // V2: Store raw data and headers for column mapping
        this._rawData = data;
        this._rawHeaders = Object.keys(data[0] || {});

        const map = this._autoMap(this._rawHeaders);
        console.log('[Importer] Detected Map:', map);

        // V2: Build initial column map from auto-detected mappings
        this._columnMap = {};
        Object.entries(map).forEach(([targetField, sourceCol]) => {
            this._columnMap[sourceCol] = targetField;
        });

        // Rule 9: Validation, Normalization & Smart Mapping
        this._lastData = data.map(item => {
            const mappedItem = {
                name: (item[map.name] || item[map.company] || '').trim(),
                email: (item[map.email] || '').toLowerCase().trim(),
                phone: map.phone ? item[map.phone]?.toString().replace(/[^0-9+]/g, '') : '',
                country: item[map.country] || 'N/A',
                city: item[map.city] || '',
                // SOP B2B Fields
                company: map.company ? (item[map.company] || '').trim() : '',
                segment: map.segment ? (item[map.segment] || '').trim() : '',
                website: map.website ? (item[map.website] || '').trim() : '',
                // SOP B2C Fields
                language: map.language ? (item[map.language] || '').toUpperCase().trim() : '',
                // Common
                tags: map.tags ? (item[map.tags] || '').trim() : ''
            };

            // Relaxed validation: Email is enough for B2C, Name/Company is enough for B2B
            return {
                ...mappedItem,
                _valid: !!(mappedItem.email.includes('@') || (Importer._type === 'b2b' && mappedItem.name))
            };
        });

        console.log('[Importer] Processed Data Sample:', this._lastData[0]);

        const mappedCount = Object.keys(map).length;
        UI.showToast(`🔍 ${mappedCount} columns auto-mapped. You can adjust mapping below.`, 'success');
        this._renderPreview();
    },

    _renderPreview() {
        const previewArea = document.getElementById('previewArea');
        const importConfirmBtn = document.getElementById('importConfirmBtn');
        const dupeOptions = document.getElementById('duplicateOptions');
        const dropZone = document.getElementById('dropZone');

        // Get raw headers from first data item
        const rawHeaders = this._rawHeaders || Object.keys(this._lastData[0] || {});

        dropZone.classList.add('hidden');
        previewArea.classList.remove('hidden');
        dupeOptions.classList.remove('hidden');
        importConfirmBtn.disabled = false;

        // V2: Detect duplicates
        const existingClients = this._type === 'b2b' ? store.state.b2bClients : store.state.b2cClients;
        const existingEmails = new Set(existingClients.map(c => (c.email || '').toLowerCase()));

        let duplicateCount = 0;
        this._lastData.forEach(row => {
            row._isDupe = existingEmails.has((row.email || '').toLowerCase());
            if (row._isDupe && row._valid) duplicateCount++;
        });

        // V2: Preview limited to 20 rows
        const previewData = this._lastData.slice(0, 20);
        const totalRows = this._lastData.length;
        const validCount = this._lastData.filter(d => d._valid).length;
        const invalidCount = totalRows - validCount;

        // V2: Column mapping UI
        const targetFields = [
            { key: '', label: '-- Skip --' },
            { key: 'name', label: 'Name *' },
            { key: 'email', label: 'Email *' },
            { key: 'phone', label: 'Phone' },
            { key: 'country', label: 'Country' },
            { key: 'city', label: 'City' },
            { key: 'company', label: 'Company' },
            { key: 'segment', label: 'Segment/Type' },
            { key: 'website', label: 'Website' },
            { key: 'language', label: 'Language' },
            { key: 'tags', label: 'Tags' },
            { key: 'source', label: 'Source' }
        ];

        let mappingHtml = `
            <div class="import-mapping-section" style="margin-bottom:15px; padding:12px; background:var(--bg-hover); border-radius:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-secondary);">
                        <i class="fa-solid fa-table-columns"></i> Column Mapping
                    </span>
                    <button class="btn-text" onclick="Importer._autoMapUI()" style="font-size:11px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Detect
                    </button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px;">
        `;

        rawHeaders.forEach((header, idx) => {
            const currentMapping = this._columnMap?.[header] || '';
            mappingHtml += `
                <div class="mapping-item" style="display:flex; gap:6px; align-items:center;">
                    <span style="font-size:11px; font-weight:600; min-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${header}">${header}</span>
                    <div class="select-wrap" style="flex:1;">
                        <select class="form-control" style="height:28px; font-size:11px;" 
                            onchange="Importer._updateMapping('${header}', this.value)">
                            ${targetFields.map(f => `<option value="${f.key}" ${currentMapping === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}
                        </select>
                        <i class="fa-solid fa-chevron-down caret"></i>
                    </div>
                </div>
            `;
        });

        mappingHtml += `</div></div>`;

        // Stats bar
        let statsHtml = `
            <div style="display:flex; gap:15px; padding:10px 12px; background:var(--bg-card); border-bottom:1px solid var(--border); font-size:11px;">
                <span><i class="fa-solid fa-list"></i> Total: <b>${totalRows}</b></span>
                <span style="color:var(--success);"><i class="fa-solid fa-check-circle"></i> Valid: <b>${validCount}</b></span>
                <span style="color:var(--danger);"><i class="fa-solid fa-times-circle"></i> Invalid: <b>${invalidCount}</b></span>
                <span style="color:var(--warning);"><i class="fa-solid fa-copy"></i> Duplicates: <b>${duplicateCount}</b></span>
                ${totalRows > 20 ? `<span style="color:var(--text-muted);"><i class="fa-solid fa-eye"></i> Showing first 20 rows</span>` : ''}
            </div>
        `;

        let tableHtml = `
            <table class="data-table" style="font-size: 11px; width: 100%;">
                <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 10;">
                    <tr>
                        <th style="width: 50px;">Status</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Country</th>
                        <th>City</th>
                    </tr>
                </thead>
                <tbody>
        `;

        previewData.forEach(row => {
            const dupeStyle = row._isDupe ? 'border-left:3px solid var(--warning);' : '';
            tableHtml += `
                <tr style="opacity: ${row._valid ? '1' : '0.5'}; background: ${row._valid ? (row._isDupe ? 'rgba(246, 192, 0, 0.08)' : 'transparent') : 'rgba(248, 40, 90, 0.05)'}; ${dupeStyle}">
                    <td style="text-align: center;">
                        ${row._valid
                    ? (row._isDupe
                        ? '<i class="fa-solid fa-copy" style="color: var(--warning);" title="Duplicate email"></i>'
                        : '<i class="fa-solid fa-check-circle" style="color: var(--success);"></i>')
                    : '<i class="fa-solid fa-times-circle" style="color: var(--danger);" title="Missing required info"></i>'}
                    </td>
                    <td style="font-weight: 700;">${row.name || '-'}</td>
                    <td>${row.email || '-'}</td>
                    <td>${row.phone || '-'}</td>
                    <td>${row.country || '-'}</td>
                    <td style="opacity: 0.8;">${row.city || '-'}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';

        previewArea.innerHTML = mappingHtml + statsHtml + tableHtml;

        importConfirmBtn.onclick = () => this._performImport();
    },

    // V2: Update column mapping
    _updateMapping(sourceCol, targetField) {
        if (!this._columnMap) this._columnMap = {};
        if (targetField) {
            this._columnMap[sourceCol] = targetField;
        } else {
            delete this._columnMap[sourceCol];
        }
        // Re-process with new mapping
        this._reprocessWithMapping();
    },

    _reprocessWithMapping() {
        if (!this._rawData || !this._columnMap) return;

        // Build reverse map (targetField -> sourceCol)
        const reverseMap = {};
        Object.entries(this._columnMap).forEach(([src, target]) => {
            if (target) reverseMap[target] = src;
        });

        // Re-map data
        this._lastData = this._rawData.map(item => {
            const mappedItem = {
                name: (item[reverseMap.name] || item[reverseMap.company] || '').trim(),
                email: (item[reverseMap.email] || '').toLowerCase().trim(),
                phone: reverseMap.phone ? item[reverseMap.phone]?.toString().replace(/[^0-9+]/g, '') : '',
                country: item[reverseMap.country] || 'N/A',
                city: item[reverseMap.city] || '',
                company: reverseMap.company ? (item[reverseMap.company] || '').trim() : '',
                segment: reverseMap.segment ? (item[reverseMap.segment] || '').trim() : '',
                website: reverseMap.website ? (item[reverseMap.website] || '').trim() : '',
                language: reverseMap.language ? (item[reverseMap.language] || '').toUpperCase().trim() : '',
                tags: reverseMap.tags ? (item[reverseMap.tags] || '').trim() : '',
                source: reverseMap.source ? (item[reverseMap.source] || '').trim() : ''
            };

            return {
                ...mappedItem,
                _valid: !!(mappedItem.email.includes('@') || (Importer._type === 'b2b' && mappedItem.name))
            };
        });

        this._renderPreview();
    },

    _autoMapUI() {
        if (!this._rawHeaders) return;
        const map = this._autoMap(this._rawHeaders);
        this._columnMap = {};

        // Convert auto-map result to columnMap format
        Object.entries(map).forEach(([targetField, sourceCol]) => {
            this._columnMap[sourceCol] = targetField;
        });

        this._reprocessWithMapping();
        UI.showToast('Columns auto-detected!', 'success');
    },

    _performImport() {
        const dupeRule = document.querySelector('input[name="dupeRule"]:checked').value;
        const validData = this._lastData.filter(d => d._valid);

        let imported = 0;
        let total = validData.length;
        let skipped = 0;
        let updated = 0;

        validData.forEach(item => {
            const res = store.addClient(this._type, item, dupeRule === 'update');
            if (res.success) {
                if (res.isUpdate) updated++;
                else imported++;
            } else {
                skipped++;
            }
        });

        UI.showToast(`✔ Import successful: ${imported} new, ${updated} updated, ${skipped} skipped.`, 'success');
        Modal.close();

        // Refresh views
        if (this._type === 'b2b') Clients.renderB2B();
        else Clients.renderB2C();

        store.logAction('IMPORT', 'BULK', this._type.toUpperCase(), 'success', `Bulk import: ${total} records processed.`);
    }
};

window.Importer = Importer;
