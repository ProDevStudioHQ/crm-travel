
// ============================================================
//  Catalogue v2 Module — Unified Catalogue Management
//  Import HTML (drag & drop) + Manual Builder + Grid/List view
// ============================================================

const Catalogue = {
    // --- State ---
    _selected: new Set(),
    _searchTimeout: null,
    _filters: {
        search: '',
        status: 'all',
        language: 'all',
        sourceType: 'all',
        category: 'all'
    },
    _viewMode: 'grid', // 'grid' or 'list'
    _pendingFile: null,
    _builderImages: [], // Stores base64 images for the builder
    _pendingContent: null,
    _autoSaveTimer: null,

    // --- Init ---
    init() {
        console.log('Catalogue v2 Module Initialized');
    },

    // ================================================================
    //  UTILITY: Sanitize HTML (strip <script>, on* events, javascript:)
    // ================================================================
    _sanitizeHtml(html) {
        if (!html) return { clean: '', scriptsRemoved: 0 };
        let scriptsRemoved = 0;
        // Remove <script> tags and their content
        let clean = html.replace(/<script[\s\S]*?<\/script>/gi, () => { scriptsRemoved++; return ''; });
        // Remove on* event handlers
        clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
        // Remove javascript: URLs
        clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
        return { clean, scriptsRemoved };
    },

    // Escape HTML for srcdoc attribute
    _escapeSrcdoc(html) {
        return html
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/\r?\n/g, '&#10;');
    },

    // Extract <title> from HTML content
    _extractTitle(html) {
        const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return match ? match[1].trim() : '';
    },

    // Extract first <img src="..."> from HTML content
    _extractFirstImage(html) {
        if (!html) return null;
        const match = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
        return match ? match[1] : null;
    },

    // Format date nicely
    _fmtDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    // Format file size
    _fmtSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    },

    // ================================================================
    //  SELECTION HELPERS
    // ================================================================
    _syncCheckbox() {
        const headerCb = document.getElementById('catSelectAll');
        if (!headerCb) return;
        const total = document.querySelectorAll('.cat-row-check').length;
        headerCb.checked = total > 0 && this._selected.size === total;
        headerCb.indeterminate = this._selected.size > 0 && this._selected.size < total;
    },

    toggleSelect(id, checked) {
        if (checked) this._selected.add(String(id));
        else this._selected.delete(String(id));
        this._syncCheckbox();
        this._updateBulkBar();
    },

    toggleSelectAll(checked) {
        const items = store.state.catalogues;
        if (checked) items.forEach(i => this._selected.add(String(i.id)));
        else this._selected.clear();
        document.querySelectorAll('.cat-row-check').forEach(cb => cb.checked = checked);
        this._syncCheckbox();
        this._updateBulkBar();
    },

    _updateBulkBar() {
        const bar = document.getElementById('catBulkBar');
        if (bar) {
            bar.style.display = this._selected.size > 0 ? 'flex' : 'none';
            const cnt = document.getElementById('catBulkCount');
            if (cnt) cnt.textContent = this._selected.size;
        }
    },

    // ================================================================
    //  1. LIST PAGE
    // ================================================================
    renderList() {
        const content = document.getElementById('mainContent');
        if (!content) return;

        let items = [...store.state.catalogues];

        // Apply filters
        if (this._filters.status !== 'all') items = items.filter(i => i.status === this._filters.status);
        if (this._filters.language !== 'all') items = items.filter(i => i.language === this._filters.language);
        if (this._filters.sourceType !== 'all') items = items.filter(i => i.sourceType === this._filters.sourceType);
        if (this._filters.category !== 'all') items = items.filter(i => i.category === this._filters.category);
        if (this._filters.search) {
            const q = this._filters.search.toLowerCase();
            items = items.filter(i =>
                (i.title || '').toLowerCase().includes(q) ||
                (i.city || '').toLowerCase().includes(q) ||
                (i.country || '').toLowerCase().includes(q) ||
                (i.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        // Sort newest first
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        const total = store.state.catalogues.length;
        const published = store.state.catalogues.filter(c => c.status === 'published').length;
        const drafts = store.state.catalogues.filter(c => c.status === 'draft').length;
        const imports = store.state.catalogues.filter(c => c.sourceType === 'import_html').length;

        content.innerHTML = `
            <div class="cat-page stagger-in">
                <!-- KPI Bar -->
                <div class="cat-kpi-bar">
                    <div class="cat-kpi-card">
                        <div class="cat-kpi-icon" style="background:rgba(0,158,247,0.1); color:#009EF7;"><i class="fa-solid fa-book-open"></i></div>
                        <div class="cat-kpi-info">
                            <span class="cat-kpi-value">${total}</span>
                            <span class="cat-kpi-label">Total Catalogues</span>
                        </div>
                    </div>
                    <div class="cat-kpi-card">
                        <div class="cat-kpi-icon" style="background:rgba(80,205,137,0.1); color:#50CD89;"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="cat-kpi-info">
                            <span class="cat-kpi-value">${published}</span>
                            <span class="cat-kpi-label">Published</span>
                        </div>
                    </div>
                    <div class="cat-kpi-card">
                        <div class="cat-kpi-icon" style="background:rgba(255,199,0,0.1); color:#FFC700;"><i class="fa-solid fa-pen-ruler"></i></div>
                        <div class="cat-kpi-info">
                            <span class="cat-kpi-value">${drafts}</span>
                            <span class="cat-kpi-label">Drafts</span>
                        </div>
                    </div>
                    <div class="cat-kpi-card">
                        <div class="cat-kpi-icon" style="background:rgba(114,57,234,0.1); color:#7239EA;"><i class="fa-solid fa-file-import"></i></div>
                        <div class="cat-kpi-info">
                            <span class="cat-kpi-value">${imports}</span>
                            <span class="cat-kpi-label">HTML Imports</span>
                        </div>
                    </div>
                </div>

                <!-- Filter Bar -->
                <div class="cat-filter-bar">
                    <div class="cat-search-wrap">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" id="catSearch" placeholder="Search by title, city, tag..."
                            value="${this._filters.search}"
                            oninput="Catalogue._onSearch(this.value)">
                    </div>
                    <div class="cat-filter-group" style="display:flex; gap:10px;">
                        <div class="select-wrap" style="width:130px;">
                            <select class="form-control" style="height:38px; font-size:12px; font-weight:600; padding:0 30px 0 15px;" onchange="Catalogue._setFilter('status', this.value)" id="catFilterStatus">
                                <option value="all" ${this._filters.status === 'all' ? 'selected' : ''}>All Status</option>
                                <option value="draft" ${this._filters.status === 'draft' ? 'selected' : ''}>Draft</option>
                                <option value="published" ${this._filters.status === 'published' ? 'selected' : ''}>Published</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                        <div class="select-wrap" style="width:140px;">
                            <select class="form-control" style="height:38px; font-size:12px; font-weight:600; padding:0 30px 0 15px;" onchange="Catalogue._setFilter('language', this.value)">
                                <option value="all" ${this._filters.language === 'all' ? 'selected' : ''}>All Languages</option>
                                <option value="EN" ${this._filters.language === 'EN' ? 'selected' : ''}>English</option>
                                <option value="FR" ${this._filters.language === 'FR' ? 'selected' : ''}>French</option>
                                <option value="ES" ${this._filters.language === 'ES' ? 'selected' : ''}>Spanish</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                        <div class="select-wrap" style="width:130px;">
                            <select class="form-control" style="height:38px; font-size:12px; font-weight:600; padding:0 30px 0 15px;" onchange="Catalogue._setFilter('sourceType', this.value)">
                                <option value="all" ${this._filters.sourceType === 'all' ? 'selected' : ''}>All Sources</option>
                                <option value="manual" ${this._filters.sourceType === 'manual' ? 'selected' : ''}>Manual</option>
                                <option value="import_html" ${this._filters.sourceType === 'import_html' ? 'selected' : ''}>HTML Import</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                    <div class="cat-view-toggles">
                        <button class="cat-action-btn ${this._viewMode === 'grid' ? 'active' : ''}" onclick="Catalogue._setView('grid')" title="Grid View">
                            <i class="fa-solid fa-grip-vertical"></i>
                        </button>
                        <button class="cat-action-btn ${this._viewMode === 'list' ? 'active' : ''}" onclick="Catalogue._setView('list')" title="List View">
                            <i class="fa-solid fa-list-ul"></i>
                        </button>
                        <div class="cat-divider"></div>
                        <button class="btn-primary cat-header-btn" onclick="handleRoute('catalogue_new')">
                            <i class="fa-solid fa-plus"></i> New
                        </button>
                        <button class="btn-social cat-header-btn" onclick="handleRoute('catalogue_import')">
                            <i class="fa-solid fa-file-import"></i> Import
                        </button>
                    </div>
                </div>

                <!-- Bulk Actions Bar -->
                <div class="cat-bulk-bar" id="catBulkBar" style="display:none;">
                    <span><strong id="catBulkCount">0</strong> selected</span>
                    <button class="btn-social" onclick="Catalogue._bulkPublish()"><i class="fa-solid fa-check-circle"></i> Publish</button>
                    <button class="btn-social" style="color:var(--danger); border-color:var(--danger);" onclick="Catalogue._bulkDelete()"><i class="fa-solid fa-trash-can"></i> Delete</button>
                    <button class="btn-social" onclick="Catalogue._selected.clear(); Catalogue.renderList();"><i class="fa-solid fa-xmark"></i> Cancel</button>
                </div>

                <!-- Content -->
                ${items.length === 0 ? this._renderEmptyState() :
                this._viewMode === 'grid' ? this._renderGrid(items) : this._renderListView(items)
            }
            </div>
        `;

        // Restore checkbox state
        document.querySelectorAll('.cat-row-check').forEach(cb => {
            cb.checked = this._selected.has(cb.dataset.id);
        });
        this._updateBulkBar();
    },

    _renderEmptyState() {
        return `
            <div class="cat-empty-state">
                <div class="cat-empty-icon">
                    <i class="fa-solid fa-book-open"></i>
                </div>
                <h3>No Catalogues Yet</h3>
                <p>Create your first catalogue manually or import an HTML file from your desktop.</p>
                <div class="cat-empty-actions">
                    <button class="btn-primary" onclick="handleRoute('catalogue_new')">
                        <i class="fa-solid fa-plus"></i> Create Catalogue
                    </button>
                    <button class="btn-social" onclick="handleRoute('catalogue_import')">
                        <i class="fa-solid fa-file-import"></i> Import HTML
                    </button>
                </div>
            </div>
        `;
    },

    _renderGrid(items) {
        return `
            <div class="cat-grid">
                ${items.map((item, idx) => `
                    <div class="cat-card stagger-item" style="animation-delay:${idx * 40}ms;">
                        <div class="cat-card-header">
                            <label class="cat-card-check" onclick="event.stopPropagation()">
                                <input type="checkbox" class="cat-row-check" data-id="${item.id}"
                                    onchange="Catalogue.toggleSelect('${item.id}', this.checked)">
                            </label>
                            <div class="cat-card-badges">
                                <span class="cat-badge cat-badge-${item.status}">${item.status === 'published' ? 'Published' : 'Draft'}</span>
                                <span class="cat-badge cat-badge-source-${item.sourceType}">${item.sourceType === 'import_html' ? 'Import' : 'Manual'}</span>
                                ${item.language ? `<span class="cat-badge cat-badge-lang">${item.language}</span>` : ''}
                            </div>
                        </div>
                        <div class="cat-card-body" onclick="handleRoute('catalogue_preview_${item.id}')">
                            ${(() => {
                const coverSrc = (item.images && item.images.length > 0) ? item.images[0].data : this._extractFirstImage(item.htmlContent);
                return coverSrc ? `
                                    <div class="cat-card-cover">
                                        <img src="${coverSrc}" alt="${(item.title || 'Cover').replace(/"/g, '&quot;')}">
                                    </div>
                                ` : `
                                    <div class="cat-card-icon-wrap">
                                        <i class="fa-solid ${item.sourceType === 'import_html' ? 'fa-file-code' : 'fa-file-lines'}"></i>
                                    </div>
                                `;
            })()}
                            <h3 class="cat-card-title">${item.title || 'Untitled'}</h3>
                            <div class="cat-card-meta">
                                ${item.city || item.country ? `<span><i class="fa-solid fa-location-dot"></i> ${[item.city, item.country].filter(Boolean).join(', ')}</span>` : ''}
                                ${item.category ? `<span><i class="fa-solid fa-tag"></i> ${item.category}</span>` : ''}
                            </div>
                            ${(item.tags && item.tags.length) ? `
                                <div class="cat-card-tags">
                                    ${item.tags.slice(0, 3).map(t => `<span class="cat-tag">${t}</span>`).join('')}
                                    ${item.tags.length > 3 ? `<span class="cat-tag">+${item.tags.length - 3}</span>` : ''}
                                </div>
                            ` : ''}
                            <div class="cat-card-date">
                                <i class="fa-regular fa-clock"></i> ${this._fmtDate(item.updatedAt || item.createdAt)}
                            </div>
                        </div>
                        <div class="cat-card-actions">
                            <button title="Preview" onclick="event.stopPropagation(); handleRoute('catalogue_preview_${item.id}')"><i class="fa-solid fa-eye"></i></button>
                            <button title="Edit" onclick="event.stopPropagation(); handleRoute('catalogue_edit_${item.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button title="Duplicate" onclick="event.stopPropagation(); Catalogue._duplicate('${item.id}')"><i class="fa-solid fa-copy"></i></button>
                            <button title="Delete" onclick="event.stopPropagation(); Catalogue._delete('${item.id}')" class="cat-action-danger"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                `).join('')
            }
            </div >
    `;
    },

    _renderListView(items) {
        return `
    < div class="card p-0 overflow-hidden" style = "border-radius:16px; border:1px solid var(--border);" >
        <table class="data-table cat-list-table">
            <thead>
                <tr>
                    <th style="width:40px; padding-left:20px;">
                        <input type="checkbox" id="catSelectAll" onchange="Catalogue.toggleSelectAll(this.checked)">
                    </th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Language</th>
                    <th>Category</th>
                    <th>Updated</th>
                    <th style="text-align:right; padding-right:20px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                            <tr>
                                <td style="padding-left:20px;">
                                    <input type="checkbox" class="cat-row-check" data-id="${item.id}"
                                        onchange="Catalogue.toggleSelect('${item.id}', this.checked)">
                                </td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        ${(() => {
                const thumbSrc = (item.images && item.images.length > 0) ? item.images[0].data : this._extractFirstImage(item.htmlContent);
                return thumbSrc ? `
                                                <div class="cat-list-icon" style="overflow:hidden;">
                                                    <img src="${thumbSrc}" alt="" style="width:100%;height:100%;object-fit:cover;">
                                                </div>
                                            ` : `
                                                <div class="cat-list-icon ${item.sourceType === 'import_html' ? 'import' : 'manual'}">
                                                    <i class="fa-solid ${item.sourceType === 'import_html' ? 'fa-file-code' : 'fa-file-lines'}"></i>
                                                </div>
                                            `;
            })()}
                                        <div>
                                            <div style="font-weight:700;">${item.title || 'Untitled'}</div>
                                            <div style="font-size:11px; color:var(--text-muted);">
                                                ${[item.city, item.country].filter(Boolean).join(', ') || '—'}
                                                ${(item.tags && item.tags.length) ? ` • ${item.tags.slice(0, 2).join(', ')}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="cat-badge cat-badge-${item.status}">${item.status === 'published' ? 'Published' : 'Draft'}</span></td>
                                <td><span class="cat-badge cat-badge-source-${item.sourceType}">${item.sourceType === 'import_html' ? 'Import' : 'Manual'}</span></td>
                                <td><span class="cat-badge cat-badge-lang">${item.language || '—'}</span></td>
                                <td style="color:var(--text-secondary);">${item.category || '—'}</td>
                                <td style="color:var(--text-muted); font-size:12px;">${this._fmtDate(item.updatedAt)}</td>
                                <td style="text-align:right; padding-right:20px;">
                                    <div class="cat-list-actions">
                                        <button title="Preview" onclick="handleRoute('catalogue_preview_${item.id}')"><i class="fa-solid fa-eye"></i></button>
                                        <button title="Edit" onclick="handleRoute('catalogue_edit_${item.id}')"><i class="fa-solid fa-pen"></i></button>
                                        <button title="Duplicate" onclick="Catalogue._duplicate('${item.id}')"><i class="fa-solid fa-copy"></i></button>
                                        <button title="Delete" onclick="Catalogue._delete('${item.id}')" class="cat-action-danger"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </td>
                            </tr >
    `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // --- Filters ---
    _onSearch(val) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this._filters.search = val;
            this.renderList();
        }, 300);
    },

    _setFilter(key, val) {
        this._filters[key] = val;
        this.renderList();
    },

    _setView(mode) {
        this._viewMode = mode;
        this.renderList();
    },

    // --- Actions ---
    _delete(id) {
        const cat = store.state.catalogues.find(c => String(c.id) === String(id));
        UI.confirm(
            'Delete Catalogue',
            `Are you sure you want to delete <b>${cat ? cat.title : 'this catalogue'}</b>? This cannot be undone.`,
            () => {
                store.deleteCatalogueV2(id);
                this._selected.delete(String(id));
                this.renderList();
                UI.showToast('Catalogue deleted successfully', 'success');
            },
            'danger'
        );
    },

    _duplicate(id) {
        const copy = store.duplicateCatalogueV2(id);
        if (copy) {
            this.renderList();
            UI.showToast(`Catalogue duplicated: "${copy.title}"`, 'success');
        }
    },

    _bulkDelete() {
        const count = this._selected.size;
        UI.confirm('Delete Selected', `Delete <b>${count}</b> catalogue(s)? This cannot be undone.`, () => {
            store.deleteCataloguesBulkV2(Array.from(this._selected));
            this._selected.clear();
            this.renderList();
            UI.showToast(`${count} catalogue(s) deleted`, 'success');
        }, 'danger');
    },

    _bulkPublish() {
        this._selected.forEach(id => {
            const cat = store.state.catalogues.find(c => String(c.id) === String(id));
            if (cat && cat.status !== 'published') {
                cat.status = 'published';
                cat.updatedAt = new Date().toISOString();
            }
        });
        store.notify();
        this._selected.clear();
        this.renderList();
        UI.showToast('Selected catalogues published', 'success');
    },

    // ================================================================
    //  2. IMPORT HTML PAGE (Drag and Drop)
    // ================================================================
    renderImport() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        this._pendingFile = null;
        this._pendingContent = null;

        content.innerHTML = `
            <div class="cat-page cat-import-page stagger-in">
                <div class="cat-import-header">
                    <button class="btn-social" onclick="handleRoute('catalogues')" style="margin-right:15px;">
                        <i class="fa-solid fa-arrow-left"></i> Back
                    </button>
                    <div>
                        <h2 class="cat-page-title">Import HTML Catalogue</h2>
                        <p class="cat-page-desc">Drag and drop your .html file from the desktop. Preview and import in one click.</p>
                    </div>
                </div>

                <div class="cat-import-grid">
                    <!-- Dropzone -->
                    <div class="cat-import-left">
                        <div class="cat-dropzone" id="catDropzone"
                            ondragover="event.preventDefault(); this.classList.add('cat-dropzone-active');"
                            ondragleave="this.classList.remove('cat-dropzone-active');"
                            ondrop="event.preventDefault(); this.classList.remove('cat-dropzone-active'); Catalogue._handleDrop(event);"
                            onclick="document.getElementById('catFileInput').click();">
                            <div class="cat-dropzone-inner" id="catDropzoneInner">
                                <div class="cat-dropzone-icon">
                                    <i class="fa-solid fa-cloud-arrow-up"></i>
                                </div>
                                <h3>Drop HTML file here</h3>
                                <p>or click to browse from your computer</p>
                                <span class="cat-dropzone-hint">Accepts .html files only • Max 10 MB</span>
                            </div>
                        </div>
                        <input type="file" id="catFileInput" accept=".html,.htm" style="display:none"
                            onchange="Catalogue._handleFileSelect(this)">

                        <!-- File Info (hidden until file selected) -->
                        <div class="cat-file-info" id="catFileInfo" style="display:none;">
                            <div class="cat-file-icon"><i class="fa-solid fa-file-code"></i></div>
                            <div class="cat-file-details">
                                <strong id="catFileName">—</strong>
                                <span id="catFileMeta">—</span>
                            </div>
                            <button class="btn-social" onclick="Catalogue._clearFile()" title="Remove file">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Metadata Form -->
                    <div class="cat-import-right">
                        <div class="cat-form-card">
                            <h3><i class="fa-solid fa-circle-info"></i> Catalogue Details</h3>
                            <div class="form-group" style="margin-bottom:20px;">
                                <label class="cat-label">Title <span style="color:var(--danger);">*</span></label>
                                <input type="text" id="catImportTitle" class="cat-input" placeholder="e.g. Summer Collection 2026">
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                                <div class="form-group">
                                    <label class="cat-label">Language</label>
                                    <div class="select-wrap">
                                        <select id="catImportLang" class="cat-input form-control">
                                            <option value="EN">English</option>
                                            <option value="FR">French</option>
                                            <option value="ES">Spanish</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down caret"></i>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="cat-label">Category</label>
                                    <input type="text" id="catImportCategory" class="cat-input" placeholder="e.g. Luxury, Desert">
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:25px;">
                                <div class="form-group">
                                    <label class="cat-label">Country</label>
                                    <input type="text" id="catImportCountry" class="cat-input" placeholder="e.g. Morocco">
                                </div>
                                <div class="form-group">
                                    <label class="cat-label">City</label>
                                    <input type="text" id="catImportCity" class="cat-input" placeholder="e.g. Marrakech">
                                </div>
                            </div>

                            <button class="btn-primary cat-import-btn" id="catImportBtn" onclick="Catalogue._doImport()" disabled>
                                <i class="fa-solid fa-file-import"></i> Import & Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    _handleDrop(event) {
        const files = event.dataTransfer.files;
        if (files.length > 0) this._processFile(files[0]);
    },

    _handleFileSelect(input) {
        if (input.files.length > 0) this._processFile(input.files[0]);
    },

    _processFile(file) {
        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.html') && !ext.endsWith('.htm')) {
            UI.showToast('Only .html files are supported', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            UI.showToast('File too large. Max 10 MB.', 'error');
            return;
        }

        this._pendingFile = file;

        // Read file content
        const reader = new FileReader();
        reader.onerror = () => UI.showToast('Failed to read file', 'error');
        reader.onload = () => {
            this._pendingContent = reader.result;

            // Extract title from HTML if available
            const titleField = document.getElementById('catImportTitle');
            if (titleField && !titleField.value) {
                const extracted = this._extractTitle(this._pendingContent);
                if (extracted) titleField.value = extracted;
                else titleField.value = file.name.replace(/\.(html|htm)$/i, '');
            }

            // Enable import button
            const btn = document.getElementById('catImportBtn');
            if (btn) btn.disabled = false;

            // Update dropzone visual
            const inner = document.getElementById('catDropzoneInner');
            if (inner) {
                inner.innerHTML = `
                    <div class="cat-dropzone-icon" style="color:var(--success);"><i class="fa-solid fa-circle-check"></i></div>
                    <h3 style="color:var(--success);">File Ready</h3>
                    <p>${file.name}</p>
                `;
            }

            // Show file info
            const info = document.getElementById('catFileInfo');
            if (info) info.style.display = 'flex';
            const nameEl = document.getElementById('catFileName');
            if (nameEl) nameEl.textContent = file.name;
            const metaEl = document.getElementById('catFileMeta');
            if (metaEl) metaEl.textContent = `${this._fmtSize(file.size)} • HTML`;
        };
        reader.readAsText(file);
    },

    _clearFile() {
        this._pendingFile = null;
        this._pendingContent = null;
        this.renderImport();
    },

    _doImport() {
        const title = (document.getElementById('catImportTitle')?.value || '').trim();
        if (!title) return UI.showToast('Please enter a catalogue title', 'warning');
        if (!this._pendingContent) return UI.showToast('Please select an HTML file', 'warning');

        const lang = document.getElementById('catImportLang')?.value || 'EN';
        const category = document.getElementById('catImportCategory')?.value || '';
        const country = document.getElementById('catImportCountry')?.value || '';
        const city = document.getElementById('catImportCity')?.value || '';

        // Sanitize HTML
        const { clean, scriptsRemoved } = this._sanitizeHtml(this._pendingContent);

        const saved = store.saveCatalogueV2({
            title,
            language: lang,
            category,
            country,
            city,
            tags: [],
            status: 'draft',
            sourceType: 'import_html',
            htmlContent: clean,
            fileName: this._pendingFile ? this._pendingFile.name : '',
            fileSize: this._pendingFile ? this._pendingFile.size : 0
        });

        let msg = 'Catalogue imported successfully! ✅';
        if (scriptsRemoved > 0) msg += ` (${scriptsRemoved} script(s) removed for safety)`;
        UI.showToast(msg, 'success');

        // Navigate to list — user sees new item instantly
        this._pendingFile = null;
        this._pendingContent = null;
        handleRoute('catalogues');
    },

    // ================================================================
    //  3. MANUAL BUILDER (New / Edit)
    // ================================================================
    renderBuilder(id = null) {
        const content = document.getElementById('mainContent');
        if (!content) return;

        let item = null;
        if (id) {
            item = store.state.catalogues.find(c => String(c.id) === String(id));
        }

        const isEdit = !!item;
        const title = item?.title || '';
        const category = item?.category || '';
        const language = item?.language || 'EN';
        const country = item?.country || '';
        const city = item?.city || '';
        const tags = item?.tags || [];
        const status = item?.status || 'draft';
        const htmlContent = item?.htmlContent || '';

        content.innerHTML = `
            <div class="cat-page cat-builder-page stagger-in">
                <div class="cat-builder-header">
                    <button class="btn-social" onclick="handleRoute('catalogues')" style="margin-right:15px;">
                        <i class="fa-solid fa-arrow-left"></i> Back
                    </button>
                    <div style="flex:1;">
                        <h2 class="cat-page-title">${isEdit ? 'Edit Catalogue' : 'Create New Catalogue'}</h2>
                        <p class="cat-page-desc">${isEdit ? 'Modify your catalogue content and metadata.' : 'Build a rich HTML catalogue with sections, text, and media.'}</p>
                    </div>
                    <div class="cat-builder-status-toggle">
                        <span style="font-size:12px; font-weight:700; color:var(--text-muted);">Status:</span>
                        <button class="cat-status-btn ${status === 'draft' ? 'active' : ''}" onclick="document.getElementById('catBuilderStatus').value='draft'; document.querySelectorAll('.cat-status-btn').forEach(b => b.classList.remove('active')); this.classList.add('active');">
                            <i class="fa-solid fa-pen-ruler"></i> Draft
                        </button>
                        <button class="cat-status-btn ${status === 'published' ? 'active' : ''}" onclick="document.getElementById('catBuilderStatus').value='published'; document.querySelectorAll('.cat-status-btn').forEach(b => b.classList.remove('active')); this.classList.add('active');">
                            <i class="fa-solid fa-circle-check"></i> Published
                        </button>
                        <input type="hidden" id="catBuilderStatus" value="${status}">
                    </div>
                </div>

                <div class="cat-builder-grid">
                    <!-- Main Form -->
                    <div class="cat-builder-main">
                        <div class="cat-form-card">
                            <h3><i class="fa-solid fa-circle-info"></i> General Information</h3>
                            <div class="form-group" style="margin-bottom:20px;">
                                <label class="cat-label">Title <span style="color:var(--danger);">*</span></label>
                                <input type="text" id="catBuilderTitle" class="cat-input" value="${title}" placeholder="Your catalogue title...">
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:15px; margin-bottom:20px;">
                                <div class="form-group">
                                    <label class="cat-label">Category</label>
                                    <input type="text" id="catBuilderCategory" class="cat-input" value="${category}" placeholder="e.g. Luxury Tour">
                                </div>
                                <div class="form-group">
                                    <label class="cat-label">Language</label>
                                    <div class="select-wrap">
                                        <select id="catBuilderLang" class="cat-input form-control">
                                            <option value="EN" ${language === 'EN' ? 'selected' : ''}>English</option>
                                            <option value="FR" ${language === 'FR' ? 'selected' : ''}>French</option>
                                            <option value="ES" ${language === 'ES' ? 'selected' : ''}>Spanish</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down caret"></i>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="cat-label">Country</label>
                                    <input type="text" id="catBuilderCountry" class="cat-input" value="${country}" placeholder="e.g. Morocco">
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom:25px;">
                                <label class="cat-label">City</label>
                                <input type="text" id="catBuilderCity" class="cat-input" value="${city}" placeholder="e.g. Marrakech">
                            </div>
                            <div class="form-group" style="margin-bottom:25px;">
                                <label class="cat-label">Tags</label>
                                <div class="cat-tags-wrap" id="catTagsWrap">
                                    ${tags.map(t => `<span class="cat-tag-editable">${t} <i class="fa-solid fa-xmark" onclick="Catalogue._removeTag(this, '${t.replace(/'/g, "\\'")}')" ></i></span>`).join('')}
                                    <input type="text" class="cat-tag-input" id="catTagInput" placeholder="Add tag + Enter"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault(); Catalogue._addTag();}">
                                </div>
                            </div>
                        </div>

                        <!-- HTML Content Editor -->
                        <div class="cat-form-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                <h3><i class="fa-solid fa-code"></i> HTML Content</h3>
                                <div style="display:flex; gap:10px;">
                                    <button class="btn-social" style="font-size:11px;" onclick="Catalogue._insertSection('hero')">
                                        <i class="fa-solid fa-heading"></i> Hero
                                    </button>
                                    <button class="btn-social" style="font-size:11px;" onclick="Catalogue._insertSection('text')">
                                        <i class="fa-solid fa-paragraph"></i> Text
                                    </button>
                                    <button class="btn-social" style="font-size:11px;" onclick="Catalogue._insertSection('cta')">
                                        <i class="fa-solid fa-bullhorn"></i> CTA
                                    </button>
                                    <button class="btn-social" style="font-size:11px;" onclick="Catalogue._insertSection('image')">
                                        <i class="fa-solid fa-image"></i> Image
                                    </button>
                                </div>
                            </div>
                            <textarea id="catBuilderHtml" class="cat-html-editor" placeholder="Write or paste your HTML content here..."
                                spellcheck="false">${htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                            <div class="cat-editor-hint">
                                <i class="fa-solid fa-circle-info"></i> Paste raw HTML or use the section buttons above to insert pre-built blocks. Scripts will be stripped for safety.
                            </div>
                        </div>

                        <!-- Image Gallery -->
                        <div class="cat-form-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                <h3><i class="fa-solid fa-images"></i> Images</h3>
                                <button class="btn-social" style="font-size:11px;" onclick="document.getElementById('catImageFileInput').click()">
                                    <i class="fa-solid fa-folder-open"></i> Browse
                                </button>
                                <input type="file" id="catImageFileInput" accept="image/*" multiple style="display:none" onchange="Catalogue._handleImageFiles(this.files)">
                            </div>
                            <div class="cat-img-dropzone" id="catImgDropzone"
                                ondragover="event.preventDefault(); this.classList.add('cat-dropzone-active');"
                                ondragleave="this.classList.remove('cat-dropzone-active');"
                                ondrop="event.preventDefault(); this.classList.remove('cat-dropzone-active'); Catalogue._handleImageFiles(event.dataTransfer.files);">
                                <div class="cat-img-dropzone-inner">
                                    <i class="fa-solid fa-cloud-arrow-up"></i>
                                    <p>Drag images here or <strong>Browse</strong></p>
                                    <span class="cat-dropzone-hint">JPG, PNG, GIF, WEBP, SVG — max 5 MB each</span>
                                </div>
                            </div>
                            <div class="cat-img-gallery" id="catImgGallery"></div>
                        </div>
                    </div>

                    <!-- Right Sidebar -->
                    <div class="cat-builder-sidebar">
                        <div class="cat-form-card">
                            <h3><i class="fa-solid fa-floppy-disk"></i> Actions</h3>
                            <button class="btn-primary" style="width:100%; height:50px; border-radius:14px; font-weight:800; margin-bottom:12px;"
                                onclick="Catalogue._saveBuilder('${id || ''}')">
                                <i class="fa-solid fa-check"></i> ${isEdit ? 'Save Changes' : 'Create Catalogue'}
                            </button>
                            ${isEdit ? `
                                <button class="btn-social" style="width:100%; margin-bottom:10px;" onclick="handleRoute('catalogue_preview_${id}')">
                                    <i class="fa-solid fa-eye"></i> Preview
                                </button>
                                <button class="btn-social" style="width:100%; margin-bottom:10px;" onclick="Catalogue._downloadHtml('${id}')">
                                    <i class="fa-solid fa-download"></i> Download HTML
                                </button>
                            ` : ''}
                            <button class="btn-social" style="width:100%;" onclick="handleRoute('catalogues')">
                                <i class="fa-solid fa-xmark"></i> Cancel
                            </button>
                        </div>

                        ${isEdit ? `
                        <div class="cat-form-card">
                            <h3><i class="fa-solid fa-circle-info"></i> Details</h3>
                            <div class="cat-detail-row">
                                <span>Created</span>
                                <strong>${this._fmtDate(item.createdAt)}</strong>
                            </div>
                            <div class="cat-detail-row">
                                <span>Updated</span>
                                <strong>${this._fmtDate(item.updatedAt)}</strong>
                            </div>
                            <div class="cat-detail-row">
                                <span>Source</span>
                                <strong>${item.sourceType === 'import_html' ? 'HTML Import' : 'Manual'}</strong>
                            </div>
                            ${item.fileName ? `
                            <div class="cat-detail-row">
                                <span>File</span>
                                <strong>${item.fileName}</strong>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        // Load existing images
        this._builderImages = item?.images || [];
        this._renderImageGallery();
    },

    _addTag() {
        const input = document.getElementById('catTagInput');
        if (!input) return;
        const tag = input.value.trim();
        if (!tag) return;
        input.value = '';
        const wrap = document.getElementById('catTagsWrap');
        if (!wrap) return;
        const span = document.createElement('span');
        span.className = 'cat-tag-editable';
        span.innerHTML = `${tag} <i class="fa-solid fa-xmark" onclick="Catalogue._removeTag(this, '${tag.replace(/'/g, "\\'")}')" ></i>`;
        wrap.insertBefore(span, input);
    },

    _removeTag(icon, tag) {
        icon.parentElement.remove();
        // Optionally remove from a temporary array if tags were stored there
    },

    _insertSection(type) {
        const editor = document.getElementById('catBuilderHtml');
        if (!editor) return;
        let snippet = '';
        switch (type) {
            case 'hero':
                snippet = `\n<!-- HERO SECTION -->\n<div style="text-align:center; padding:60px 20px; background:linear-gradient(135deg, #0a1628, #1a2a4a); color:white; border-radius:16px; margin-bottom:30px;">\n  <h1 style="font-size:42px; font-weight:800; margin-bottom:10px;">Your Title Here</h1>\n  <p style="font-size:18px; opacity:0.8;">A stunning subtitle for your catalogue</p>\n</div>\n`;
                break;
            case 'text':
                snippet = `\n<!-- TEXT BLOCK -->\n<div style="padding:30px; margin-bottom:20px;">\n  <h2 style="font-size:24px; font-weight:700; margin-bottom:15px;">Section Title</h2>\n  <p style="font-size:16px; line-height:1.8; color:#555;">Your description text goes here. Add details about your offering, itinerary, or special features.</p>\n</div>\n`;
                break;
            case 'cta':
                snippet = `\n<!-- CTA SECTION -->\n<div style="text-align:center; padding:40px; background:#f8f9fa; border-radius:16px; margin-bottom:20px;">\n  <h3 style="font-size:22px; font-weight:700; margin-bottom:15px;">Ready to Book?</h3>\n  <p style="margin-bottom:20px; color:#666;">Contact us for more details and pricing.</p>\n  <a href="mailto:info@example.com" style="display:inline-block; padding:14px 30px; background:#009EF7; color:white; border-radius:10px; text-decoration:none; font-weight:700;">Contact Us</a>\n</div>\n`;
                break;
            case 'image':
                snippet = `\n<!-- IMAGE BLOCK -->\n<div style="text-align:center; margin-bottom:20px;">\n  <img src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80" alt="Image" style="width:100%; max-width:800px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">\n  <p style="font-size:13px; color:#999; margin-top:10px;">Image caption here</p>\n</div>\n`;
                break;
        }
        editor.value += snippet;
        editor.scrollTop = editor.scrollHeight;
        UI.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} section added`, 'info');
    },

    _handleImageFiles(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                UI.showToast(`File "${file.name}" is not an image.`, 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5 MB limit
                UI.showToast(`Image "${file.name}" is too large (max 5 MB).`, 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this._builderImages.push({
                    id: Date.now() + Math.random().toString(36).substring(2, 9), // Simple unique ID
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target.result // Base64 string
                });
                this._renderImageGallery();
                UI.showToast(`Image "${file.name}" added.`, 'success');
            };
            reader.onerror = () => UI.showToast(`Failed to read image "${file.name}".`, 'error');
            reader.readAsDataURL(file);
        });
    },

    _renderImageGallery() {
        const gallery = document.getElementById('catImgGallery');
        if (!gallery) return;

        if (this._builderImages.length === 0) {
            gallery.innerHTML = ''; // Clear gallery if no images
            return;
        }

        gallery.innerHTML = this._builderImages.map(img => `
            <div class="cat-img-thumbnail">
                <img src="${img.data}" alt="${img.name}" title="${img.name}">
                <div class="cat-img-actions">
                    <button onclick="Catalogue._insertImageIntoEditor('${img.data.replace(/'/g, "\\'")}')" title="Insert into HTML">
                        <i class="fa-solid fa-code"></i>
                    </button>
                    <button onclick="Catalogue._removeImage('${img.id}')" title="Remove image">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    _insertImageIntoEditor(base64Data) {
        const editor = document.getElementById('catBuilderHtml');
        if (!editor) return;

        const snippet = `\n<!-- INSERTED IMAGE -->\n<div style="text-align:center; margin-bottom:20px;">\n  <img src="${base64Data}" alt="Uploaded Image" style="width:100%; max-width:800px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">\n  <p style="font-size:13px; color:#999; margin-top:10px;">Image caption here</p>\n</div>\n`;
        editor.value += snippet;
        editor.scrollTop = editor.scrollHeight;
        UI.showToast('Image HTML inserted into editor.', 'info');
    },

    _removeImage(id) {
        this._builderImages = this._builderImages.filter(img => img.id !== id);
        this._renderImageGallery();
        UI.showToast('Image removed from gallery.', 'info');
    },

    _saveBuilder(existingId) {
        const title = (document.getElementById('catBuilderTitle')?.value || '').trim();
        if (!title) return UI.showToast('Title is required', 'warning');

        const rawHtml = document.getElementById('catBuilderHtml')?.value || '';
        const { clean } = this._sanitizeHtml(rawHtml);

        // Collect tags from the DOM
        const tags = [];
        document.querySelectorAll('.cat-tag-editable').forEach(el => {
            const text = el.textContent.replace(/\s*×?\s*$/, '').trim();
            if (text) tags.push(text);
        });

        const data = {
            title,
            category: document.getElementById('catBuilderCategory')?.value || '',
            language: document.getElementById('catBuilderLang')?.value || 'EN',
            country: document.getElementById('catBuilderCountry')?.value || '',
            city: document.getElementById('catBuilderCity')?.value || '',
            tags,
            status: document.getElementById('catBuilderStatus')?.value || 'draft',
            sourceType: 'manual',
            htmlContent: clean
        };

        if (existingId) {
            data.id = existingId;
            // Preserve sourceType from original
            const orig = store.state.catalogues.find(c => String(c.id) === String(existingId));
            if (orig) data.sourceType = orig.sourceType;
        }

        store.saveCatalogueV2(data);
        UI.showToast(existingId ? 'Catalogue updated ✅' : 'Catalogue created ✅', 'success');
        handleRoute('catalogues');
    },

    _downloadHtml(id) {
        const cat = store.state.catalogues.find(c => String(c.id) === String(id));
        if (!cat || !cat.htmlContent) return UI.showToast('No HTML content to download', 'info');
        const blob = new Blob([cat.htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (cat.title || 'catalogue').replace(/[^a-zA-Z0-9]/g, '_') + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        UI.showToast('HTML file downloaded', 'success');
    },

    // ================================================================
    //  4. PREVIEW PAGE (Sandboxed Iframe)
    // ================================================================
    renderPreview(id) {
        const content = document.getElementById('mainContent');
        if (!content) return;

        const cat = store.state.catalogues.find(c => String(c.id) === String(id));
        if (!cat) {
            content.innerHTML = `
                <div style="padding:80px; text-align:center; color:var(--text-secondary);">
                    <i class="fa-solid fa-circle-exclamation" style="font-size:48px; margin-bottom:20px; opacity:0.3;"></i>
                    <h3>Catalogue Not Found</h3>
                    <p>This catalogue may have been deleted.</p>
                    <button class="btn-primary" style="margin-top:20px;" onclick="handleRoute('catalogues')">Back to List</button>
                </div>
            `;
            return;
        }

        const hasHtml = cat.htmlContent && cat.htmlContent.trim().length > 0;
        const { clean, scriptsRemoved } = this._sanitizeHtml(cat.htmlContent || '');

        content.innerHTML = `
            <div class="cat-page cat-preview-page stagger-in">
                <!-- Header -->
                <div class="cat-preview-header">
                    <div class="cat-preview-header-left">
                        <button class="btn-social" onclick="handleRoute('catalogues')" style="margin-right:15px;">
                            <i class="fa-solid fa-arrow-left"></i> Back
                        </button>
                        <div>
                            <h2 class="cat-page-title">${cat.title}</h2>
                            <div class="cat-preview-meta">
                                <span class="cat-badge cat-badge-${cat.status}">${cat.status === 'published' ? 'Published' : 'Draft'}</span>
                                <span class="cat-badge cat-badge-source-${cat.sourceType}">${cat.sourceType === 'import_html' ? 'Import' : 'Manual'}</span>
                                ${cat.language ? `<span class="cat-badge cat-badge-lang">${cat.language}</span>` : ''}
                                <span style="color:var(--text-muted); font-size:12px;">
                                    <i class="fa-regular fa-clock"></i> ${this._fmtDate(cat.updatedAt || cat.createdAt)}
                                </span>
                                ${cat.fileName ? `<span style="color:var(--text-muted); font-size:12px;"><i class="fa-solid fa-file"></i> ${cat.fileName} (${this._fmtSize(cat.fileSize)})</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="cat-preview-actions">
                        <button class="btn-social" onclick="handleRoute('catalogue_edit_${cat.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn-social" onclick="Catalogue._duplicate('${cat.id}'); handleRoute('catalogues');"><i class="fa-solid fa-copy"></i> Duplicate</button>
                        <button class="btn-social" onclick="Catalogue._downloadHtml('${cat.id}')"><i class="fa-solid fa-download"></i> Download</button>
                        <button class="btn-social" onclick="Catalogue._togglePublish('${cat.id}')">
                            <i class="fa-solid ${cat.status === 'published' ? 'fa-eye-slash' : 'fa-check-circle'}"></i>
                            ${cat.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button class="btn-social cat-action-danger" onclick="Catalogue._delete('${cat.id}')"><i class="fa-solid fa-trash-can"></i> Delete</button>
                    </div>
                </div>

                <!-- Script Warning -->
                ${scriptsRemoved > 0 ? `
                    <div class="cat-warning-bar">
                        <i class="fa-solid fa-shield-halved"></i>
                        <strong>Security:</strong> ${scriptsRemoved} script tag(s) were removed from this HTML for safety. The preview below is script-free.
                    </div>
                ` : ''}

                <!-- Preview Frame -->
                <div class="cat-preview-frame">
                    ${hasHtml ? `
                        <iframe id="catPreviewIframe" sandbox="allow-same-origin"
                            style="width:100%; min-height:600px; border:0; border-radius:0 0 16px 16px;"></iframe>
                    ` : `
                        <div class="cat-preview-empty">
                            <i class="fa-solid fa-file-circle-question"></i>
                            <h3>No HTML Content</h3>
                            <p>This catalogue has no HTML content yet. Click Edit to add content.</p>
                            <button class="btn-primary" onclick="handleRoute('catalogue_edit_${cat.id}')">
                                <i class="fa-solid fa-pen"></i> Add Content
                            </button>
                        </div>
                    `}
                </div>

                <!-- Tags -->
                ${(cat.tags && cat.tags.length) ? `
                    <div class="cat-preview-tags">
                        <span style="font-size:12px; font-weight:700; color:var(--text-muted); margin-right:10px;">Tags:</span>
                        ${cat.tags.map(t => `<span class="cat-tag">${t}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Write HTML content into iframe programmatically (avoids srcdoc escaping issues)
        if (hasHtml) {
            const iframe = document.getElementById('catPreviewIframe');
            if (iframe) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(clean);
                    doc.close();
                    // Auto-resize iframe to fit content
                    iframe.onload = () => {
                        try { iframe.style.height = doc.body.scrollHeight + 'px'; } catch (e) { }
                    };
                    // Also try immediate resize after a short delay
                    setTimeout(() => {
                        try { iframe.style.height = doc.body.scrollHeight + 'px'; } catch (e) { }
                    }, 300);
                } catch (e) {
                    console.warn('Could not write to preview iframe:', e);
                }
            }
        }
    },

    _togglePublish(id) {
        store.publishCatalogueV2(id);
        const cat = store.state.catalogues.find(c => String(c.id) === String(id));
        UI.showToast(cat ? `Catalogue ${cat.status === 'published' ? 'published ✅' : 'set to draft'}` : 'Updated', 'success');
        this.renderPreview(id);
    },

    // ================================================================
    //  LEGACY COMPAT: keep old render() working for existing route
    // ================================================================
    render() {
        this.renderList();
    }
};

window.Catalogue = Catalogue;
