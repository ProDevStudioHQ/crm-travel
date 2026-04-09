
const Clients = {
    init() {
        // Bulk selection state (per module)
        this._selected = this._selected || { b2b: new Set(), b2c: new Set() };
    },

    _list(type) {
        return (type === 'b2b' ? store.state.b2bClients : store.state.b2cClients).filter(c => c.status !== 'deleted');
    },

    _syncHeaderCheckbox(type) {
        const list = this._list(type);
        const header = document.getElementById(type === 'b2b' ? 'selAllB2B' : 'selAllB2C');
        if (!header) return;
        const sel = this._selected?.[type] || new Set();
        const total = list.length;
        const selected = sel.size;
        header.indeterminate = selected > 0 && selected < total;
        header.checked = total > 0 && selected === total;
        const countEl = document.getElementById(type === 'b2b' ? 'bulkCountB2B' : 'bulkCountB2C');
        if (countEl) countEl.textContent = String(selected);
        const delBtn = document.getElementById(type === 'b2b' ? 'deleteSelB2B' : 'deleteSelB2C');
        if (delBtn) {
            delBtn.disabled = selected === 0;
            delBtn.style.opacity = selected === 0 ? '0.5' : '1';
            delBtn.style.pointerEvents = selected === 0 ? 'none' : 'auto';
        }
    },

    toggleSelect(type, id, checked) {
        this._selected = this._selected || { b2b: new Set(), b2c: new Set() };
        const set = this._selected[type] || new Set();
        if (checked) set.add(String(id));
        else set.delete(String(id));
        this._selected[type] = set;
        this._syncHeaderCheckbox(type);
    },

    toggleSelectAll(type, checked) {
        this._selected = this._selected || { b2b: new Set(), b2c: new Set() };
        const list = this._list(type);
        const set = new Set();
        if (checked) {
            for (const c of list) set.add(String(c.id));
        }
        this._selected[type] = set;
        document.querySelectorAll(`input[data-sel-type="${type}"]`).forEach(cb => {
            cb.checked = checked;
        });
        this._syncHeaderCheckbox(type);
    },

    _restoreCheckboxes(type) {
        const sel = this._selected?.[type] || new Set();
        document.querySelectorAll(`input[data-sel-type="${type}"][data-id]`).forEach(cb => {
            cb.checked = sel.has(String(cb.dataset.id));
        });
        this._syncHeaderCheckbox(type);
    },

    clearSelection(type) {
        if (!this._selected) this._selected = { b2b: new Set(), b2c: new Set() };
        this._selected[type] = new Set();
    },

    deleteSelected(type) {
        const sel = this._selected?.[type] || new Set();
        const ids = Array.from(sel);
        if (!ids.length) return UI.showToast('No rows selected', 'info');
        UI.confirm(
            'Delete selected',
            `You are about to permanently delete <b>${ids.length}</b> record(s). This cannot be undone.`,
            () => {
                store.deleteClientsBulk(type, ids.map(id => String(id)));
                this.clearSelection(type);
                type === 'b2b' ? this.renderB2B() : this.renderB2C();
                UI.showToast('Deleted successfully', 'success');
            },
            'danger'
        );
    },

    deleteAll(type) {
        const total = this._list(type).length;
        if (!total) return UI.showToast('Nothing to delete', 'info');
        UI.confirm(
            'Delete ALL',
            `This will permanently delete <b>ALL (${total})</b> records in this list. This cannot be undone.`,
            () => {
                store.deleteAllClients(type);
                this.clearSelection(type);
                type === 'b2b' ? this.renderB2B() : this.renderB2C();
                UI.showToast('All deleted', 'success');
            },
            'danger'
        );
    },

    // Bulk assign selected to agent
    assignSelected(type) {
        const sel = this._selected?.[type] || new Set();
        const ids = Array.from(sel);
        if (!ids.length) return UI.showToast('No rows selected', 'info');

        const agents = store.state.users?.filter(u => u.role === 'agent' || u.role === 'manager') ||
            [{ id: 1, name: 'Sarah Jenkins' }, { id: 2, name: 'Mike Chen' }, { id: 3, name: 'Lisa Park' }];

        Modal.open({
            title: '<i class="fa-solid fa-user-gear"></i> Assign to Agent',
            width: '400px',
            body: `
                <p style="margin-bottom:15px;">Assign <b>${ids.length}</b> selected record(s) to:</p>
                <div class="select-wrap">
                    <select id="bulkAgentSelect" class="form-control" style="width:100%;">
                        ${agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="Clients._doAssign('${type}')">
                    <i class="fa-solid fa-check"></i> Assign
                </button>
            `
        });
    },

    _doAssign(type) {
        const agentId = document.getElementById('bulkAgentSelect')?.value;
        const sel = this._selected?.[type] || new Set();
        const ids = Array.from(sel);
        const list = type === 'b2b' ? store.state.b2bClients : store.state.b2cClients;

        ids.forEach(id => {
            const item = list.find(c => String(c.id) === String(id));
            if (item) item.assignedTo = agentId;
        });

        Modal.close();
        this.clearSelection(type);
        type === 'b2b' ? this.renderB2B() : this.renderB2C();
        UI.showToast(`${ids.length} record(s) assigned successfully`, 'success');
    },

    // Bulk change status
    changeStatusSelected(type) {
        const sel = this._selected?.[type] || new Set();
        const ids = Array.from(sel);
        if (!ids.length) return UI.showToast('No rows selected', 'info');

        Modal.open({
            title: '<i class="fa-solid fa-toggle-on"></i> Change Status',
            width: '400px',
            body: `
                <p style="margin-bottom:15px;">Change status for <b>${ids.length}</b> selected record(s):</p>
                <div class="select-wrap">
                    <select id="bulkStatusSelect" class="form-control" style="width:100%;">
                        <option value="lead">Lead / Prospect</option>
                        <option value="active">Active / Repeat</option>
                        <option value="archived">Archived</option>
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="Clients._doChangeStatus('${type}')">
                    <i class="fa-solid fa-check"></i> Apply
                </button>
            `
        });
    },

    _doChangeStatus(type) {
        const newStatus = document.getElementById('bulkStatusSelect')?.value;
        const sel = this._selected?.[type] || new Set();
        const ids = Array.from(sel);
        const list = type === 'b2b' ? store.state.b2bClients : store.state.b2cClients;

        ids.forEach(id => {
            const item = list.find(c => String(c.id) === String(id));
            if (item) item.status = newStatus;
        });

        Modal.close();
        this.clearSelection(type);
        type === 'b2b' ? this.renderB2B() : this.renderB2C();
        UI.showToast(`${ids.length} record(s) status updated`, 'success');
    },

    // Bulk export selected
    exportSelected(type) {
        const sel = this._selected?.[type] || new Set();
        const ids = Array.from(sel);
        if (!ids.length) return UI.showToast('No rows selected', 'info');

        const list = type === 'b2b' ? store.state.b2bClients : store.state.b2cClients;
        const selected = list.filter(c => ids.includes(String(c.id)));

        // Generate CSV
        const headers = ['Name', 'Email', 'Phone', 'Country', 'Status'];
        const rows = selected.map(c => [c.name || '', c.email || '', c.phone || '', c.country || '', c.status || '']);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `${type}_selected_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        UI.showToast(`Exported ${selected.length} record(s)`, 'success');
    },

    renderEmptyState(type) {
        const isB2B = type === 'b2b';
        return `
            <div style="padding: 100px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 20px; margin-top: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(var(--primary-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                    <i class="fa-solid ${isB2B ? 'fa-building-shield' : 'fa-user-astronaut'}" style="font-size: 32px; color: var(--primary);"></i>
                </div>
                <h3 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">No ${isB2B ? 'Partners' : 'Leads'} Propulsion Yet</h3>
                <p style="color: var(--text-secondary); font-size: 14px; max-width: 400px; margin: 0 auto 30px; line-height: 1.6;">
                    Your database is currently at zero gravity. Start by manually adding a profile or importing your existing high-value list.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <button class="btn-primary" onclick="Clients.openModal('${type}')">
                        <i class="fa-solid fa-plus"></i> Add ${isB2B ? 'Partner' : 'Lead'}
                    </button>
                    <button class="btn-secondary" onclick="Importer.open('${type}')">
                        <i class="fa-solid fa-file-import"></i> Import CSV
                    </button>
                    <button class="btn-cancel" onclick="handleRoute('${isB2B ? 'mail' : 'whatsapp'}')">
                        <i class="fa-solid fa-plug"></i> Connect Channels
                    </button>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">
                    <i class="fa-solid fa-lightbulb" style="color: var(--warning);"></i> Tip: Import your ${isB2B ? 'B2B' : 'B2C'} list in 1 minute to trigger automation.
                </div>
            </div>
        `;
    },

    renderB2B() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const allClients = state.b2bClients.filter(c => c.status !== 'deleted');

        // Initialize TablePRO state for B2B
        if (!TablePRO._state['b2b']) {
            TablePRO.init('b2b', { defaultSort: 'name', perPage: 25 });
        }

        // Process data through TablePRO (search + filter + sort + paginate)
        const { items: clients, total } = TablePRO.processDataPaginated(allClients, 'b2b');
        const tableState = TablePRO.getState('b2b');

        // Status filter options
        const statusOptions = [
            { value: 'lead', label: 'Lead' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' }
        ];

        // Column definitions for toggle
        const b2bColumns = [
            { key: 'name', label: 'Company Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'country', label: 'Country' },
            { key: 'city', label: 'City' },
            { key: 'status', label: 'Status' }
        ];

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px;">
                <div>
                    <h2 style="font-size: 24px; font-weight:800; letter-spacing:-0.5px; margin-bottom:4px;">B2B Clients <span style="font-weight:400; color:var(--text-muted); font-size:16px;">(Partners)</span></h2>
                    <p style="color:var(--text-secondary); font-size:13px; opacity:0.8;">Executive management for TOs, TAs, and DMCs.</p>
                </div>
                <div class="clients-toolbar">
                    <div class="search-box">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" id="b2bSearchInput" class="form-control" placeholder="Search Partners..." 
                            value="${tableState.searchQuery || ''}"
                            onkeyup="TablePRO.handleSearchInput('b2b', this, 300)">
                    </div>
					<button class="btn-export" onclick="Clients.exportCSV('b2b')" title="Export Partner Data">
						<i class="fa-solid fa-file-export"></i> Export
					</button>
					<button class="btn-import" onclick="Importer.open('b2b')" title="Import partners">
						<i class="fa-solid fa-file-import"></i> Import
					</button>
                    <button class="btn-primary" style="background:var(--primary); border:none;" onclick="Clients.openModal('b2b')">
                        <i class="fa-solid fa-user-plus"></i> Add Partner
                    </button>
                </div>
            </div>

            <div class="filter-bar">
                <span class="filter-bar-label">Filters:</span>
                ${TablePRO.renderFilterDropdown('b2b', 'status', statusOptions, 'All Status')}
                <div class="select-wrap" style="width:auto; min-width:120px; height:36px; display:inline-block;">
                    <select class="form-control filter-dropdown" style="width:100%; height:100%;"
                        onchange="TablePRO.handleFilter('b2b', 'country', this.value)">
                        <option value="">All Countries</option>
                        <option value="USA" ${tableState.filters.country === 'USA' ? 'selected' : ''}>USA</option>
                        <option value="France" ${tableState.filters.country === 'France' ? 'selected' : ''}>France</option>
                        <option value="UK" ${tableState.filters.country === 'UK' ? 'selected' : ''}>UK</option>
                    </select>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                ${TablePRO.renderColumnToggle('b2b', b2bColumns)}
                ${Object.keys(tableState.filters).length > 0 ? `
                    <button class="btn-clear-filters" onclick="TablePRO.clearFilters('b2b'); Clients.renderB2B();">
                        <i class="fa-solid fa-times"></i> Clear Filters
                    </button>
                ` : ''}
                <div style="margin-left:auto; display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-social" onclick="Clients.toggleSelectAll('b2b', true)">
                        <i class="fa-solid fa-check-double"></i> Select All
                    </button>
                    <button class="btn-social" onclick="Clients.assignSelected('b2b')" title="Assign to Agent">
                        <i class="fa-solid fa-user-gear"></i> Assign
                    </button>
                    <button class="btn-social" onclick="Clients.changeStatusSelected('b2b')" title="Change Status">
                        <i class="fa-solid fa-toggle-on"></i> Status
                    </button>
                    <button class="btn-social" onclick="Clients.exportSelected('b2b')" title="Export Selected">
                        <i class="fa-solid fa-download"></i> Export
                    </button>
                    <button id="deleteSelB2B" class="btn-social" style="color:var(--danger);" onclick="Clients.deleteSelected('b2b')">
                        <i class="fa-solid fa-trash-can"></i> Delete (<span id="bulkCountB2B">0</span>)
                    </button>
                    ${state.currentUser.role === 'admin' ? `
                    <button class="btn-social" style="color:var(--danger); border-color:var(--danger-glow);" onclick="Clients.deleteAll('b2b')">
                        <i class="fa-solid fa-trash"></i> Wipe All
                    </button>
                    </button>
                    ` : ''}
                </div>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:40px;">
                                <input id="selAllB2B" type="checkbox" onclick="Clients.toggleSelectAll('b2b', this.checked)" />
                            </th>
                            ${TablePRO.renderSortHeader('b2b', 'name', 'Company Name')}
                            ${TablePRO.renderSortHeader('b2b', 'email', 'Email')}
                            ${TablePRO.renderSortHeader('b2b', 'phone', 'Phone')}
                            ${TablePRO.renderSortHeader('b2b', 'country', 'Country')}
                            <th>City</th>
                            ${TablePRO.renderSortHeader('b2b', 'status', 'Status')}
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clients.map((c, index) => `
                            <tr>
                                <td style="width:40px; text-align:center;">
                                    <input type="checkbox" data-sel-type="b2b" data-id="${c.id}" onchange="Clients.toggleSelect('b2b', ${c.id}, this.checked)" />
                                </td>
                                <td>
                                    <div class="cell-avatar">
                                        <div style="width:40px; height:40px; background:rgba(0,158,247,0.1); border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--primary); font-weight:800; font-size:15px;">
                                            ${(c.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div class="cell-info" onclick="Clients.viewB2BProfile(${c.id})" style="cursor:pointer;">
                                            <h5>${c.name || 'Unnamed Partner'}</h5>
                                        </div>
                                    </div>
                                </td>
                                <td><span style="font-size:13px; color:var(--text-secondary); opacity:0.8;">${c.email || 'N/A'}</span></td>
                                <td><span style="font-size:13px; font-weight:600;">${c.phone || 'N/A'}</span></td>
                                <td><span style="font-size:12px; color:var(--text-muted);">${c.country || 'Global'}</span></td>
                                <td><span style="font-size:12px;">${c.city || '-'}</span></td>
                                <td><span class="status-badge status-${(c.status || 'prospect')}">${(c.status || 'prospect').toUpperCase()}</span></td>
                                <td style="text-align:right;">
                                    <div class="action-btns">
                                        <button class="action-btn-label action-btn-label--send" onclick="GlobalActions.quickSend('client', ${c.id})"><i class="fa-solid fa-paper-plane"></i> Send</button>
                                        <button class="action-btn-label action-btn-label--whatsapp" onclick="GlobalActions.whatsapp('${c.phone || ''}')"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button>
                                        <button class="action-btn-label action-btn-label--edit" onclick="Clients.openModal('b2b', ${c.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                                        <button class="action-btn-label action-btn-label--delete" onclick="Clients.deleteB2B(${c.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${total === 0 ? this.renderEmptyState('b2b') : ''}
                ${total > 0 ? TablePRO.renderPagination('b2b', total) : ''}
            </div>
        `;
        this._restoreCheckboxes('b2b');
    },

    renderB2C() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const allClients = state.b2cClients.filter(c => c.status !== 'deleted');

        // Initialize TablePRO state for B2C
        if (!TablePRO._state['b2c']) {
            TablePRO.init('b2c', { defaultSort: 'name', perPage: 25 });
        }

        // Process data through TablePRO
        const { items: clients, total } = TablePRO.processDataPaginated(allClients, 'b2c');
        const tableState = TablePRO.getState('b2c');

        // Filter options
        const statusOptions = [
            { value: 'lead', label: 'Lead' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' }
        ];
        const sourceOptions = [
            { value: 'Instagram', label: 'Instagram' },
            { value: 'Website', label: 'Website' },
            { value: 'Referral', label: 'Referral' },
            { value: 'Direct', label: 'Direct' }
        ];

        // Column definitions for B2C
        const b2cColumns = [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'country', label: 'Country' },
            { key: 'source', label: 'Source' },
            { key: 'status', label: 'Status' }
        ];

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 20px; font-weight:600; margin-bottom:5px;">B2C Clients (Travelers)</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Direct customer management with timeline & preferences.</p>
                </div>
                <div class="clients-toolbar">
                    <div class="search-box">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" id="b2cSearchInput" class="form-control" placeholder="Search Travelers..."
                            value="${tableState.searchQuery || ''}"
                            onkeyup="TablePRO.handleSearchInput('b2c', this, 300)">
                    </div>
					<button class="btn-export" onclick="Clients.exportCSV('b2c')" title="Export Travelers">
						<i class="fa-solid fa-file-export"></i> Export
					</button>
					<button class="btn-import" onclick="Importer.open('b2c')" title="Import Travelers">
						<i class="fa-solid fa-file-import"></i> Import
					</button>
                    <button class="btn-primary" onclick="Clients.openModal('b2c')">
                        <i class="fa-solid fa-user-plus"></i> Add Traveler
                    </button>
                </div>
            </div>

            <div class="filter-bar">
                <span class="filter-bar-label">Filters:</span>
                ${TablePRO.renderFilterDropdown('b2c', 'status', statusOptions, 'All Status')}
                ${TablePRO.renderFilterDropdown('b2c', 'source', sourceOptions, 'All Sources')}
                ${TablePRO.renderColumnToggle('b2c', b2cColumns)}
                ${Object.keys(tableState.filters).length > 0 ? `
                    <button class="btn-clear-filters" onclick="TablePRO.clearFilters('b2c'); Clients.renderB2C();">
                        <i class="fa-solid fa-times"></i> Clear Filters
                    </button>
                ` : ''}
                <div style="margin-left:auto; display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-social" onclick="Clients.toggleSelectAll('b2c', true)"><i class="fa-solid fa-check-double"></i> Select All</button>
                    <button class="btn-social" onclick="Clients.assignSelected('b2c')" title="Assign to Agent"><i class="fa-solid fa-user-gear"></i> Assign</button>
                    <button class="btn-social" onclick="Clients.changeStatusSelected('b2c')" title="Change Status"><i class="fa-solid fa-toggle-on"></i> Status</button>
                    <button class="btn-social" onclick="Clients.exportSelected('b2c')" title="Export Selected"><i class="fa-solid fa-download"></i> Export</button>
                    <button id="deleteSelB2C" class="btn-social" style="color:var(--danger);" onclick="Clients.deleteSelected('b2c')"><i class="fa-solid fa-trash-can"></i> Delete (<span id="bulkCountB2C">0</span>)</button>
                    ${state.currentUser.role === 'admin' ? `
                        <button class="btn-social" style="color:var(--danger); border-color:var(--danger);" onclick="Clients.deleteAll('b2c')"><i class="fa-solid fa-dumpster-fire"></i> Wipe All</button>
                    ` : ''}
                </div>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:40px;"><input id="selAllB2C" type="checkbox" onclick="Clients.toggleSelectAll('b2c', this.checked)" /></th>
                            ${TablePRO.renderSortHeader('b2c', 'name', 'Full Name')}
                            ${TablePRO.renderSortHeader('b2c', 'email', 'Email')}
                            ${TablePRO.renderSortHeader('b2c', 'phone', 'Phone')}
                            ${TablePRO.renderSortHeader('b2c', 'country', 'Country')}
                            ${TablePRO.renderSortHeader('b2c', 'source', 'Source')}
                            ${TablePRO.renderSortHeader('b2c', 'status', 'Status')}
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clients.map((c, index) => `
                            <tr>
                                <td style="width:40px; text-align:center;">
                                    <input type="checkbox" data-sel-type="b2c" data-id="${c.id}" onchange="Clients.toggleSelect('b2c', ${c.id}, this.checked)" />
                                </td>
                                <td>
                                    <div class="cell-avatar">
                                        <div style="width:35px; height:35px; background:rgba(80,205,137,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--success); font-weight:700;">
                                            ${(c.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div class="cell-info" onclick="Clients.viewB2CProfile(${c.id})" style="cursor:pointer;">
                                            <h5>${c.name || 'Unnamed Client'}</h5>
                                        </div>
                                    </div>
                                </td>
                                <td><span style="font-size:13px; opacity:0.8;">${c.email || 'N/A'}</span></td>
                                <td><span style="font-size:12px; font-weight:600;">${c.phone || 'N/A'}</span></td>
                                <td><span style="font-size:12px;">${c.country || '-'}</span></td>
                                <td><span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-secondary);">${c.source || 'Direct'}</span></td>
                                <td><span class="status-badge status-${(c.status || 'lead')}">${(c.status || 'lead').toUpperCase()}</span></td>
                                <td style="text-align:right;">
                                    <div class="action-btns">
                                        <button class="action-btn-label action-btn-label--send" onclick="GlobalActions.quickSend('client', ${c.id})"><i class="fa-solid fa-paper-plane"></i> Send</button>
                                        <button class="action-btn-label action-btn-label--whatsapp" onclick="GlobalActions.whatsapp('${c.phone || ''}')"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button>
                                        <button class="action-btn-label action-btn-label--edit" onclick="Clients.openModal('b2c', ${c.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                                        <button class="action-btn-label action-btn-label--delete" onclick="Clients.deleteB2C(${c.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${total === 0 ? this.renderEmptyState('b2c') : ''}
                ${total > 0 ? TablePRO.renderPagination('b2c', total) : ''}
            </div>
        `;
        this._restoreCheckboxes('b2c');
    },

    openModal(type, id = null) {
        const client = id ? (type === 'b2b' ? store.state.b2bClients : store.state.b2cClients).find(c => c.id === id) : {};
        const isEdit = !!id;

        Modal.open({
            title: `<i class="fa-solid fa-${type === 'b2b' ? 'building' : 'user'}"></i> ${isEdit ? 'Edit' : 'Add'} ${type === 'b2b' ? 'Partner' : 'Lead'}`,
            width: '700px',
            body: `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <div class="form-group">
                        <label>${type === 'b2b' ? 'Company Name' : 'Full Name'} *</label>
                        <input type="text" id="client_name" class="form-control" value="${client.name || ''}" placeholder="${type === 'b2b' ? 'e.g. Acme Travel' : 'e.g. John Smith'}">
                    </div>
                    <div class="form-group">
                        <label>Email Address *</label>
                        <input type="email" id="client_email" class="form-control" value="${client.email || ''}" placeholder="email@example.com">
                    </div>
                    <div class="form-group">
                        <label>Phone Number (Intl Format)</label>
                        <input type="text" id="client_phone" class="form-control" value="${client.phone || ''}" placeholder="+1234567890">
                    </div>
                    <div class="form-group">
                        <label>Country</label>
                        <input type="text" id="client_country" class="form-control" value="${client.country || ''}" placeholder="e.g. USA">
                    </div>
                    ${type === 'b2b' ? `
                    <div class="form-group">
                        <label>Category</label>
                        <div class="select-wrap">
                            <select id="client_category" class="form-control">
                                <option value="TO" ${client.category === 'TO' ? 'selected' : ''}>Tour Operator</option>
                                <option value="TA" ${client.category === 'TA' ? 'selected' : ''}>Travel Agency</option>
                                <option value="Wholesaler" ${client.category === 'Wholesaler' ? 'selected' : ''}>Wholesaler</option>
                                <option value="DMC" ${client.category === 'DMC' ? 'selected' : ''}>DMC Partner</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                    ` : `
                    <div class="form-group">
                        <label>Lead Source</label>
                        <div class="select-wrap">
                            <select id="client_source" class="form-control">
                                <option value="Instagram" ${client.source === 'Instagram' ? 'selected' : ''}>Instagram</option>
                                <option value="Website" ${client.source === 'Website' ? 'selected' : ''}>Website</option>
                                <option value="Referral" ${client.source === 'Referral' ? 'selected' : ''}>Referral</option>
                                <option value="Direct" ${client.source === 'Direct' ? 'selected' : ''}>Direct</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                    `}
                    <div class="form-group">
                        <label>Pulse Status</label>
                        <div class="select-wrap">
                            <select id="client_status" class="form-control">
                                <option value="lead" ${client.status === 'lead' ? 'selected' : ''}>Lead / Prospect</option>
                                <option value="active" ${client.status === 'active' ? 'selected' : ''}>Active / Repeat</option>
                                <option value="archived" ${client.status === 'archived' ? 'selected' : ''}>Archived</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Tags</label>
                        <input type="text" id="client_tags" class="form-control" value="${(client.tags || []).join(',')}">
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="Clients.save('${type}', ${id})">
                    <i class="fa-solid fa-cloud-arrow-up"></i> ${isEdit ? 'Update Orbit' : 'Add to Database'}
                </button>
            `
        });

        setTimeout(() => {
            const countryList = [
                'USA', 'UK', 'Canada', 'France', 'Germany', 'Morocco', 'Spain',
                'Italy', 'UAE', 'Australia', 'Japan', 'Brazil', 'Mexico', 'India', 'China'
            ].map(c => ({ value: c, label: c }));

            const tagList = [
                'VIP', 'High Budget', 'Family', 'Adventure', 'Luxury', 'Repeat', 'Newsletter', 'Hot Lead'
            ].map(t => ({ value: t, label: t }));

            const countrySelect = initModernSelect('#client_country', {
                searchable: true,
                placeholder: 'Search country...',
                items: countryList
            });
            if (client.country) countrySelect.selectValue(client.country);

            const tagsSelect = initModernSelect('#client_tags', {
                searchable: true,
                multiple: true,
                placeholder: 'Select tags...',
                items: tagList
            });
            if (client.tags) client.tags.forEach(t => tagsSelect.selectValue(t));
        }, 50);
    },

    save(type, id) {
        const name = document.getElementById('client_name').value;
        const email = document.getElementById('client_email').value;
        const phone = document.getElementById('client_phone').value;

        // SOP Rule 8: Data Validation
        if (!name || !email) return UI.showToast('Name and Email are mandatory fields.', 'error');
        if (!email.includes('@')) return UI.showToast('Invalid email format detected.', 'error');

        // Demo Pattern Blocking
        const demoPatterns = ['example@', 'test@', '123456'];
        if (demoPatterns.some(p => email.toLowerCase().includes(p) || phone.includes(p))) {
            return UI.showToast('Propulsion Error: Demo data patterns are blocked in production mode.', 'error');
        }

        const data = {
            id: id || Date.now(),
            name,
            email,
            phone,
            country: document.getElementById('client_country').value,
            tags: document.getElementById('client_tags').value.split(',').filter(Boolean),
            status: document.getElementById('client_status').value,
            joinedDate: id ? null : new Date().toISOString().split('T')[0]
        };

        if (type === 'b2b') {
            data.category = document.getElementById('client_category').value;
            if (id) {
                store.updateClient('b2b', id, data);
            } else {
                store.addClient('b2b', data);
            }
            this.renderB2B();
        } else {
            data.source = document.getElementById('client_source').value;
            if (id) {
                store.updateClient('b2c', id, data);
            } else {
                store.addClient('b2c', data);
            }
            this.renderB2C();
        }

        UI.showToast(`${type === 'b2b' ? 'Partner' : 'Lead'} ${id ? 'updated' : 'added'} successfully.`, 'success');
        Modal.close();
    },

    deleteB2B(id) {
        UI.confirm('Delete Partner', 'Are you sure you want to remove this partner? All linked quotes will be orphaned.', () => {
            store.deleteClientsBulk('b2b', [String(id)]);
            this.renderB2B();
            UI.showToast('Partner removed from orbit.', 'success');
        });
    },

    deleteB2C(id) {
        UI.confirm('Delete Lead', 'Are you sure you want to remove this lead? This action cannot be undone.', () => {
            store.deleteClientsBulk('b2c', [String(id)]);
            this.renderB2C();
            UI.showToast('Lead removed successfully.', 'success');
        });
    },

    viewB2BProfile(id) {
        console.log('Viewing B2B Profile', id);
        UI.showToast('Profile intelligence loading...', 'info');
    },

    viewB2CProfile(id) {
        console.log('Viewing B2C Profile', id);
        UI.showToast('Profile intelligence loading...', 'info');
    },

    // Export V2: Modal with format choice, filters, and column selection
    exportCSV(type) {
        const state = store.state;
        const allData = type === 'b2b' ? state.b2bClients : state.b2cClients;
        const activeData = allData.filter(c => c.status !== 'deleted');

        // Get selected count
        const selectedIds = this._selected?.[type] || new Set();
        const selectedCount = selectedIds.size;

        // Get filtered count (from TablePRO if active)
        const tableState = TablePRO.getState(type);
        let filteredData = activeData;
        if (tableState.searchQuery || Object.keys(tableState.filters).length > 0) {
            filteredData = TablePRO.processData(activeData, type);
        }
        const filteredCount = filteredData.length;

        // Column options
        const columns = [
            { key: 'name', label: 'Name', default: true },
            { key: 'email', label: 'Email', default: true },
            { key: 'phone', label: 'Phone', default: true },
            { key: 'country', label: 'Country', default: true },
            { key: 'city', label: 'City', default: true },
            { key: 'status', label: 'Status', default: true },
            { key: 'company', label: 'Company', default: type === 'b2b' },
            { key: 'segment', label: 'Segment', default: type === 'b2b' },
            { key: 'source', label: 'Source', default: type === 'b2c' },
            { key: 'language', label: 'Language', default: false },
            { key: 'tags', label: 'Tags', default: false },
            { key: 'createdAt', label: 'Created Date', default: false }
        ];

        Modal.open({
            title: `<i class="fa-solid fa-file-export"></i> Export ${type.toUpperCase()} Data`,
            width: '500px',
            body: `
                <div style="display:grid; gap:18px;">
                    <!-- Export Scope -->
                    <div>
                        <label style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:8px; display:block;">
                            <i class="fa-solid fa-filter"></i> Export Scope
                        </label>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <label class="export-option"><input type="radio" name="exportScope" value="all" checked> All records (${activeData.length})</label>
                            ${filteredCount !== activeData.length ? `<label class="export-option"><input type="radio" name="exportScope" value="filtered"> Current filtered view (${filteredCount})</label>` : ''}
                            ${selectedCount > 0 ? `<label class="export-option"><input type="radio" name="exportScope" value="selected"> Selected only (${selectedCount})</label>` : ''}
                        </div>
                    </div>

                    <!-- File Format -->
                    <div>
                        <label style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:8px; display:block;">
                            <i class="fa-solid fa-file"></i> File Format
                        </label>
                        <div style="display:flex; gap:12px;">
                            <label class="export-option" style="flex:1; justify-content:center;">
                                <input type="radio" name="exportFormat" value="csv" checked>
                                <i class="fa-solid fa-file-csv" style="color:var(--success);"></i> CSV
                            </label>
                            <label class="export-option" style="flex:1; justify-content:center;">
                                <input type="radio" name="exportFormat" value="xlsx">
                                <i class="fa-solid fa-file-excel" style="color:#217346;"></i> XLSX
                            </label>
                        </div>
                    </div>

                    <!-- Column Selection -->
                    <div>
                        <label style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:8px; display:block;">
                            <i class="fa-solid fa-table-columns"></i> Columns to Export
                        </label>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
                            ${columns.map(col => `
                                <label class="export-col-item">
                                    <input type="checkbox" name="exportCol" value="${col.key}" ${col.default ? 'checked' : ''}>
                                    <span>${col.label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="Clients._doExport('${type}')">
                    <i class="fa-solid fa-download"></i> Export
                </button>
            `
        });
    },

    _doExport(type) {
        const state = store.state;
        const allData = type === 'b2b' ? state.b2bClients : state.b2cClients;
        const activeData = allData.filter(c => c.status !== 'deleted');

        // Get options
        const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'all';
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
        const selectedCols = Array.from(document.querySelectorAll('input[name="exportCol"]:checked')).map(el => el.value);

        if (selectedCols.length === 0) {
            UI.showToast('Please select at least one column', 'warning');
            return;
        }

        // Determine data to export
        let exportData;
        if (scope === 'selected') {
            const selectedIds = Array.from(this._selected?.[type] || new Set());
            exportData = activeData.filter(c => selectedIds.includes(String(c.id)));
        } else if (scope === 'filtered') {
            exportData = TablePRO.processData(activeData, type);
        } else {
            exportData = activeData;
        }

        if (exportData.length === 0) {
            UI.showToast('No data to export', 'warning');
            return;
        }

        // Generate file
        const date = new Date().toISOString().split('T')[0];
        const filename = `${type}_export_${date}`;

        if (format === 'xlsx') {
            this._exportXLSX(exportData, selectedCols, filename);
        } else {
            this._exportCSVFile(exportData, selectedCols, filename);
        }

        Modal.close();
        UI.showToast(`Exported ${exportData.length} records as ${format.toUpperCase()}`, 'success');
    },

    _exportCSVFile(data, columns, filename) {
        const headers = columns.join(',');
        const rows = data.map(item => {
            return columns.map(col => {
                const val = item[col] || '';
                // Escape quotes and wrap in quotes
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',');
        });

        const csv = [headers, ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    _exportXLSX(data, columns, filename) {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            UI.showToast('XLSX export requires SheetJS library', 'error');
            return;
        }

        // Prepare data for XLSX
        const wsData = [columns]; // Headers
        data.forEach(item => {
            const row = columns.map(col => item[col] || '');
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

window.Clients = Clients;
