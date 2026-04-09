/**
 * TablePRO - Advanced Table Management Utility
 * Features: Sorting, Filtering, Search (debounce), Pagination, Column customization
 */

const TablePRO = {
    // State storage per table
    _state: {},

    // Initialize table state
    init(tableId, options = {}) {
        this._state[tableId] = {
            sortKey: options.defaultSort || null,
            sortDir: 'asc',
            filters: {},
            searchQuery: '',
            page: 1,
            perPage: options.perPage || 25,
            columns: options.columns || [],
            hiddenColumns: this._loadColumnPrefs(tableId) || []
        };
        return this._state[tableId];
    },

    // Get or create state
    getState(tableId) {
        if (!this._state[tableId]) {
            this.init(tableId);
        }
        return this._state[tableId];
    },

    // ===================
    // SORTING
    // ===================
    sort(tableId, key) {
        const state = this.getState(tableId);
        if (state.sortKey === key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortKey = key;
            state.sortDir = 'asc';
        }
        return state;
    },

    sortData(data, tableId) {
        const state = this.getState(tableId);
        if (!state.sortKey) return data;

        return [...data].sort((a, b) => {
            let valA = a[state.sortKey];
            let valB = b[state.sortKey];

            // Handle null/undefined
            if (valA == null) valA = '';
            if (valB == null) valB = '';

            // Numeric check
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
                return state.sortDir === 'asc' ? numA - numB : numB - numA;
            }

            // Date check
            const dateA = new Date(valA);
            const dateB = new Date(valB);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime()) && String(valA).includes('-')) {
                return state.sortDir === 'asc' ? dateA - dateB : dateB - dateA;
            }

            // String sort
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (state.sortDir === 'asc') {
                return strA.localeCompare(strB);
            }
            return strB.localeCompare(strA);
        });
    },

    // Render sortable header
    renderSortHeader(tableId, key, label) {
        const state = this.getState(tableId);
        const isActive = state.sortKey === key;
        const icon = isActive
            ? (state.sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down')
            : 'fa-sort';
        const activeClass = isActive ? 'sort-active' : '';

        return `<th class="sortable-header ${activeClass}" style="position:relative;" onclick="TablePRO.handleSort('${tableId}', '${key}')">
            <span>${label}</span>
            <i class="fa-solid ${icon}" style="margin-left:6px; opacity:${isActive ? '1' : '0.3'}; font-size:11px;"></i>
            <div class="resizer" style="
                position: absolute;
                right: 0;
                top: 0;
                width: 5px;
                height: 100%;
                cursor: col-resize;
                z-index: 10;
                background: transparent;
            " onclick="event.stopPropagation()" onmousedown="TablePRO.initResize(event, this)"></div>
        </th>`;
    },

    handleSort(tableId, key) {
        if (key !== null && key !== undefined) {
            this.sort(tableId, key);
        }
        // Trigger re-render based on tableId
        if (tableId === 'b2b' && window.Clients) Clients.renderB2B();
        else if (tableId === 'b2c' && window.Clients) Clients.renderB2C();
        else if (tableId === 'bookings' && window.Bookings) Bookings.render();
        else if (tableId === 'quotes' && window.Quotes) Quotes.render();
        else if (tableId === 'leads' && window.Leads) Leads.render();
    },

    // ===================
    // FILTERING
    // ===================
    setFilter(tableId, key, value) {
        const state = this.getState(tableId);
        if (value === '' || value === null || value === undefined) {
            delete state.filters[key];
        } else {
            state.filters[key] = value;
        }
        state.page = 1; // Reset to first page
        return state;
    },

    clearFilters(tableId) {
        const state = this.getState(tableId);
        state.filters = {};
        state.page = 1;
        return state;
    },

    filterData(data, tableId) {
        const state = this.getState(tableId);
        const filters = state.filters;

        if (Object.keys(filters).length === 0) return data;

        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                const itemValue = item[key];
                if (itemValue == null) return false;
                return String(itemValue).toLowerCase() === String(value).toLowerCase();
            });
        });
    },

    // Render filter dropdown
    renderFilterDropdown(tableId, key, options, label) {
        const state = this.getState(tableId);
        const currentValue = state.filters[key] || '';

        return `<div class="select-wrap" style="width:auto; display:inline-block;"><select class="form-control filter-dropdown" 
            onchange="TablePRO.handleFilter('${tableId}', '${key}', this.value)"
            style="width:auto; min-width:120px; height:36px;">
            <option value="">${label || 'All'}</option>
            ${options.map(opt => `<option value="${opt.value}" ${currentValue === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select><i class="fa-solid fa-chevron-down caret"></i></div>`;
    },

    handleFilter(tableId, key, value) {
        this.setFilter(tableId, key, value);
        this.handleSort(tableId, null); // This triggers re-render
    },

    // ===================
    // SEARCH (with debounce)
    // ===================
    _searchTimers: {},

    setSearch(tableId, query, fields = ['name', 'email', 'phone', 'company']) {
        const state = this.getState(tableId);
        state.searchQuery = query;
        state.searchFields = fields;
        state.page = 1;
        return state;
    },

    searchData(data, tableId) {
        const state = this.getState(tableId);
        const query = (state.searchQuery || '').toLowerCase().trim();

        if (!query) return data;

        const fields = state.searchFields || ['name', 'email', 'phone', 'company'];

        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (value == null) return false;
                return String(value).toLowerCase().includes(query);
            });
        });
    },

    // Debounced search input handler
    handleSearchInput(tableId, inputEl, delay = 300) {
        clearTimeout(this._searchTimers[tableId]);
        this._searchTimers[tableId] = setTimeout(() => {
            this.setSearch(tableId, inputEl.value);
            this.handleSort(tableId, null); // Triggers re-render
        }, delay);
    },

    // ===================
    // PAGINATION
    // ===================
    setPage(tableId, page) {
        const state = this.getState(tableId);
        state.page = Math.max(1, page);
        return state;
    },

    setPerPage(tableId, perPage) {
        const state = this.getState(tableId);
        state.perPage = perPage;
        state.page = 1;
        return state;
    },

    paginateData(data, tableId) {
        const state = this.getState(tableId);
        const start = (state.page - 1) * state.perPage;
        const end = start + state.perPage;
        return data.slice(start, end);
    },

    getTotalPages(data, tableId) {
        const state = this.getState(tableId);
        return Math.ceil(data.length / state.perPage);
    },

    // Render pagination controls
    renderPagination(tableId, totalItems) {
        const state = this.getState(tableId);
        const totalPages = Math.ceil(totalItems / state.perPage);
        const currentPage = state.page;

        if (totalPages <= 1) return '';

        let pages = '';
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            const active = i === currentPage ? 'active' : '';
            pages += `<button class="pagination-btn ${active}" onclick="TablePRO.handlePage('${tableId}', ${i})">${i}</button>`;
        }
        if (totalPages > 5) {
            pages += `<span style="padding:0 8px;">...</span>`;
            pages += `<button class="pagination-btn" onclick="TablePRO.handlePage('${tableId}', ${totalPages})">${totalPages}</button>`;
        }

        return `
        <div class="pagination-controls" style="display:flex; align-items:center; gap:10px; justify-content:space-between; margin-top:15px;">
            <div style="font-size:12px; color:var(--text-muted);">
                Showing ${(currentPage - 1) * state.perPage + 1}-${Math.min(currentPage * state.perPage, totalItems)} of ${totalItems}
            </div>
            <div style="display:flex; gap:5px;">
                <button class="pagination-btn" onclick="TablePRO.handlePage('${tableId}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                ${pages}
                <button class="pagination-btn" onclick="TablePRO.handlePage('${tableId}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <span style="font-size:12px; color:var(--text-muted);">Rows per page:</span>
            <div class="select-wrap" style="width:80px; display:inline-block;">
            <select class="form-control" style="height:32px;" onchange="TablePRO.handlePerPage('${tableId}', this.value)">
                <option value="10" ${state.perPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${state.perPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${state.perPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${state.perPage === 100 ? 'selected' : ''}>100</option>
            </select><i class="fa-solid fa-chevron-down caret"></i></div>
        </div>`;
    },

    handlePage(tableId, page) {
        this.setPage(tableId, page);
        this.handleSort(tableId, null);
    },

    handlePerPage(tableId, perPage) {
        this.setPerPage(tableId, parseInt(perPage, 10));
        this.handleSort(tableId, null);
    },

    // ===================
    // COLUMN PREFERENCES
    // ===================
    _loadColumnPrefs(tableId) {
        try {
            const saved = localStorage.getItem(`table_columns_${tableId}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    _saveColumnPrefs(tableId) {
        const state = this.getState(tableId);
        try {
            localStorage.setItem(`table_columns_${tableId}`, JSON.stringify(state.hiddenColumns));
        } catch (e) { }
    },

    toggleColumn(tableId, columnKey) {
        const state = this.getState(tableId);
        const idx = state.hiddenColumns.indexOf(columnKey);
        if (idx === -1) {
            state.hiddenColumns.push(columnKey);
        } else {
            state.hiddenColumns.splice(idx, 1);
        }
        this._saveColumnPrefs(tableId);
        return state;
    },

    isColumnVisible(tableId, columnKey) {
        const state = this.getState(tableId);
        return !state.hiddenColumns.includes(columnKey);
    },

    // Render column toggle button + dropdown
    renderColumnToggle(tableId, columns) {
        const state = this.getState(tableId);
        // Store columns for reset functionality
        if (!state.availableColumns) state.availableColumns = columns;

        return `
        <div class="column-toggle-wrapper" style="position:relative;">
            <button class="btn-social" onclick="TablePRO._toggleColumnsMenu('${tableId}')" title="Customize Columns">
                <i class="fa-solid fa-table-columns"></i> Columns
            </button>
            <div id="columns-menu-${tableId}" class="columns-dropdown" style="display:none;">
                <div class="columns-dropdown-header">
                    <span>Show/Hide Columns</span>
                    <button class="btn-text" onclick="TablePRO.resetColumns('${tableId}')">
                        <i class="fa-solid fa-rotate-left"></i> Reset
                    </button>
                </div>
                <div class="columns-dropdown-body">
                    ${columns.map(col => `
                        <label class="column-toggle-item">
                            <input type="checkbox" 
                                ${this.isColumnVisible(tableId, col.key) ? 'checked' : ''} 
                                onchange="TablePRO.handleColumnToggle('${tableId}', '${col.key}')">
                            <span>${col.label}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    _toggleColumnsMenu(tableId) {
        const menu = document.getElementById(`columns-menu-${tableId}`);
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        // Close on outside click
        document.addEventListener('click', function closeMenu(e) {
            if (!e.target.closest('.column-toggle-wrapper')) {
                const menu = document.getElementById(`columns-menu-${tableId}`);
                if (menu) menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        });
    },

    handleColumnToggle(tableId, columnKey) {
        this.toggleColumn(tableId, columnKey);
        // Re-render table
        this.handleSort(tableId, null);
    },

    resetColumns(tableId) {
        const state = this.getState(tableId);
        state.hiddenColumns = [];
        this._saveColumnPrefs(tableId);
        this.handleSort(tableId, null);
    },

    // ===================
    // COMBINED PROCESSING
    // ===================
    processData(data, tableId) {
        let result = [...data];
        result = this.searchData(result, tableId);
        result = this.filterData(result, tableId);
        result = this.sortData(result, tableId);
        return result;
    },

    // Process with pagination (returns { items, total })
    processDataPaginated(data, tableId) {
        const processed = this.processData(data, tableId);
        const total = processed.length;
        const items = this.paginateData(processed, tableId);
        return { items, total };
    },

    // ===================
    // COLUMN RESIZING
    // ===================
    initResize(e, resizer) {
        let th = resizer.parentElement;
        TablePRO._currentResizerInfo = {
            th: th,
            startX: e.clientX,
            startWidth: th.offsetWidth
        };

        // Prevent generic sorting click
        e.stopPropagation();
        e.preventDefault();

        // Add styling class to body so cursor stays as resize while dragging
        document.body.style.cursor = 'col-resize';

        // Attach global events
        document.addEventListener('mousemove', TablePRO._handleMouseMove);
        document.addEventListener('mouseup', TablePRO._handleMouseUp);
    },

    _handleMouseMove(e) {
        if (!TablePRO._currentResizerInfo) return;
        const { th, startX, startWidth } = TablePRO._currentResizerInfo;
        const diff = e.clientX - startX;
        const newWidth = Math.max(startWidth + diff, 50); // Miinimum 50px width
        th.style.width = newWidth + 'px';
        th.style.minWidth = newWidth + 'px';
        th.style.maxWidth = newWidth + 'px';
    },

    _handleMouseUp(e) {
        document.removeEventListener('mousemove', TablePRO._handleMouseMove);
        document.removeEventListener('mouseup', TablePRO._handleMouseUp);
        document.body.style.cursor = 'default';
        TablePRO._currentResizerInfo = null;
    }
};

// Expose globally
window.TablePRO = TablePRO;
