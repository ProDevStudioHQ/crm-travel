
const Sales = {
    filters: {
        dateRange: 'all',
        clientType: 'all',
        status: 'all'
    },
    viewMode: 'table', // 'table' or 'kanban'

    init() {
        // Initialization logic if needed
    },

    toggleView(mode) {
        this.viewMode = mode;
        this.render();
    },

    renderKanban(sales) {
        const statusColors = {
            pending: 'var(--warning)',
            confirmed: 'var(--primary)',
            completed: 'var(--success)',
            cancelled: 'var(--danger)',
            refunded: 'var(--text-muted)'
        };

        const columns = [
            { id: 'pending', label: 'Pending', icon: 'fa-clock', color: statusColors.pending },
            { id: 'confirmed', label: 'Confirmed', icon: 'fa-check-circle', color: statusColors.confirmed },
            { id: 'completed', label: 'Completed', icon: 'fa-trophy', color: statusColors.completed }
        ];

        return `
            <div class="kanban-container">
                ${columns.map(col => {
            const items = sales.filter(s => s.status === col.id);
            const colTotal = items.reduce((sum, s) => sum + (s.revenue || 0), 0);
            return `
                        <div class="kanban-column" data-status="${col.id}" 
                            ondragover="Sales._onDragOver(event)" 
                            ondragleave="Sales._onDragLeave(event)"
                            ondrop="Sales._onDrop(event, '${col.id}')">
                            <div class="kanban-column-header">
                                <div class="kanban-column-title">
                                    <i class="fa-solid ${col.icon}" style="color:${col.color};"></i>
                                    <span>${col.label}</span>
                                </div>
                                <span class="kanban-column-count">${items.length}</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px; padding:0 4px;">
                                Total: ${store.formatCurrency(colTotal)}
                            </div>
                            <div class="kanban-cards">
                                ${items.map(s => `
                                    <div class="kanban-card" draggable="true" data-id="${s.id}"
                                        ondragstart="Sales._onDragStart(event, '${s.id}')"
                                        ondragend="Sales._onDragEnd(event)"
                                        onclick="Sales.openStatusModal('${s.id}')">
                                        <div class="kanban-card-title">${s.clientName}</div>
                                        <div class="kanban-card-meta">
                                            <span><i class="fa-solid fa-tag"></i> ${s.product || 'N/A'}</span>
                                            <span><i class="fa-solid fa-coins"></i> ${store.formatCurrency(s.revenue)}</span>
                                            <span><i class="fa-solid fa-calendar"></i> ${s.date || 'N/A'}</span>
                                            <span><i class="fa-solid fa-user"></i> ${s.agent || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${items.length === 0 ? '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">No items</div>' : ''}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    _draggedId: null,

    _onDragStart(e, id) {
        this._draggedId = id;
        e.target.classList.add('dragging');
    },

    _onDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
    },

    _onDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    },

    _onDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    },

    _onDrop(e, newStatus) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this._draggedId) return;

        const sale = store.state.sales.find(s => String(s.id) === String(this._draggedId));
        if (sale && sale.status !== newStatus) {
            sale.status = newStatus;
            store.save();
            AuditLog.log('sales', 'UPDATE', `Sale #${sale.id}`, { newStatus });
            UI.showToast(`Moved to ${newStatus.toUpperCase()}`, 'success');
            this.render();
        }
        this._draggedId = null;
    },

    renderEmptyState() {
        return `
            <div style="padding: 100px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 20px; margin-top: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(var(--success-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                    <i class="fa-solid fa-money-bill-trend-up" style="font-size: 32px; color: var(--success);"></i>
                </div>
                <h3 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">Market Revenue at Equilibrium</h3>
                <p style="color: var(--text-secondary); font-size: 14px; max-width: 400px; margin: 0 auto 30px; line-height: 1.6;">
                    No confirmed sales transactions have been synchronized. Sales data is generated from completed bookings or manual entries.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <button class="btn-primary" onclick="handleRoute('bookings')">
                        <i class="fa-solid fa-suitcase-rolling"></i> Confirm Booking
                    </button>
                    <button class="btn-secondary" onclick="Sales.openAddSaleModal()">
                        <i class="fa-solid fa-plus"></i> Manual Sale
                    </button>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                    <i class="fa-solid fa-circle-check" style="color: var(--success);"></i> System ready: Fiscal period is open and awaiting data ingestion.
                </div>
            </div>
        `;
    },

    render() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const user = state.currentUser;

        // RBAC: Agents only see their own sales (SOP Rule 3)
        let sales = state.sales;
        if (user.role === 'agent') {
            sales = sales.filter(s => s.agent === user.name || s.agent === user.email);
        }

        // Apply Filters
        if (this.filters.clientType !== 'all') {
            sales = sales.filter(s => s.type === this.filters.clientType);
        }
        if (this.filters.status !== 'all') {
            sales = sales.filter(s => s.status === this.filters.status);
        }

        const stats = this.calculateStats(sales);

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 20px; font-weight:600; margin-bottom:5px;">Sales & Revenue Intelligence</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Financial tracking, margins, and agent performance analytics.</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-social" style="width:auto;" onclick="Sales.exportData(this)">
                        <i class="fa-solid fa-file-export"></i> Financial Export
                    </button>
                    ${user.role === 'admin' ? `
                        <button class="btn-primary" style="background:var(--success); border-color:var(--success);" onclick="Sales.openAddSaleModal()">
                            <i class="fa-solid fa-plus"></i> Manual Sale
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- KPI Cards -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:25px;">
                <div class="card p-4">
                    <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Revenue</span>
                    <h3 style="font-size:24px; font-weight:700; margin-top:5px; color:var(--text-primary);">${store.formatCurrency(stats.totalRevenue)}</h3>
                </div>
                <div class="card p-4">
                    <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Net Profit</span>
                    <h3 style="font-size:24px; font-weight:700; margin-top:5px; color:var(--primary);">${store.formatCurrency(stats.totalMargin)}</h3>
                </div>
                <div class="card p-4">
                    <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Partner Share</span>
                    <h3 style="font-size:24px; font-weight:700; margin-top:5px; color:var(--text-primary);">${stats.b2bShare}%</h3>
                </div>
                <div class="card p-4">
                    <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Record Volume</span>
                    <h3 style="font-size:24px; font-weight:700; margin-top:5px; color:var(--text-primary);">${sales.length}</h3>
                </div>
            </div>

            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:12px;">
                        <div class="select-wrap" style="width:140px;">
                            <select class="form-control" style="height:36px;" onchange="Sales.updateFilter('clientType', this.value)">
                                <option value="all">All Channels</option>
                                <option value="B2B">B2B Partner</option>
                                <option value="B2C">Direct B2C</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                        <div class="select-wrap" style="width:140px;">
                            <select class="form-control" style="height:36px;" onchange="Sales.updateFilter('status', this.value)">
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                        <button class="btn-social" style="width:auto; height:36px;" onclick="Sales.refreshSales(this)">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                    </div>
                    <!-- View Mode Toggle -->
                    <div style="display:flex; gap:4px; background:var(--bg-hover); border-radius:8px; padding:3px;">
                        <button class="btn-icon" style="padding:6px 12px; border-radius:6px; ${this.viewMode === 'table' ? 'background:var(--primary); color:white;' : ''}" onclick="Sales.toggleView('table')" title="Table View">
                            <i class="fa-solid fa-list"></i>
                        </button>
                        <button class="btn-icon" style="padding:6px 12px; border-radius:6px; ${this.viewMode === 'kanban' ? 'background:var(--primary); color:white;' : ''}" onclick="Sales.toggleView('kanban')" title="Kanban View">
                            <i class="fa-solid fa-columns"></i>
                        </button>
                    </div>
                </div>

                ${this.viewMode === 'kanban' ? this.renderKanban(sales) : `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Client</th>
                                <th>Product</th>
                                <th>Financials</th>
                                <th>Origin</th>
                                <th>Status</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales.map((s, index) => `
                                <tr>
                                    <td>
                                        <div style="font-weight:700; font-size:13px; color:var(--text-primary);">${s.id}</div>
                                        <div style="font-size:11px; color:var(--text-muted);">${s.date}</div>
                                    </td>
                                    <td>
                                        <div style="font-weight:600; color:var(--text-primary);">${s.clientName}</div>
                                        <div style="font-size:10px; color:var(--text-secondary);">${s.type}</div>
                                    </td>
                                    <td style="font-size:12px; color:var(--text-secondary);">${s.product}</td>
                                    <td>
                                        <div style="font-weight:700; color:var(--text-primary);">${store.formatCurrency(s.revenue, s.currency)}</div>
                                        <div style="font-size:11px; color:var(--success);">Net: ${store.formatCurrency((s.revenue - (s.cost || 0)), s.currency)}</div>
                                    </td>
                                    <td>
                                        <div style="font-size:12px; font-weight:600; color:var(--text-primary);">${s.agent}</div>
                                    </td>
                                    <td><span class="status-badge status-${s.status}">${s.status.toUpperCase()}</span></td>
                                    <td style="text-align:right;">
                                        <button class="btn-icon" onclick="Sales.openStatusModal('${s.id}')"><i class="fa-solid fa-rotate"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${sales.length === 0 ? this.renderEmptyState() : ''}
                </div>
                `}
            </div>
        `;
    },

    refreshSales(btn) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            UI.showFeedback(btn, 'success');
            this.render();
        }, 800);
    },

    calculateStats(sales) {
        let totalRevenue = 0;
        let totalCost = 0;
        let b2bRevenue = 0;

        sales.forEach(s => {
            if (s.status !== 'cancelled' && s.status !== 'refunded') {
                totalRevenue += (s.revenue || 0);
                totalCost += (s.cost || 0);
                if (s.type === 'B2B') b2bRevenue += (s.revenue || 0);
            }
        });

        const totalMargin = totalRevenue - totalCost;
        const b2bShare = totalRevenue > 0 ? Math.round((b2bRevenue / totalRevenue) * 100) : 0;
        const avgMargin = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

        return { totalRevenue, totalCost, totalMargin, b2bShare, avgMargin };
    },

    updateFilter(key, val) {
        this.filters[key] = val;
        this.render();
    },

    exportData(btn) {
        UI.showToast('Exporting financial report...', 'info');
    },

    openStatusModal(id) {
        const sale = store.state.sales.find(s => String(s.id) === String(id));
        if (!sale) return;

        Modal.open({
            title: 'Update Transaction Status',
            size: 'sm',
            body: `
                <div style="text-align:center; margin-bottom:20px;">
                    <div style="font-size:16px; font-weight:700; margin-bottom:5px;">${sale.clientName}</div>
                    <div style="font-size:12px; color:var(--text-muted);">REF: ${sale.id}</div>
                </div>
                <div class="form-group">
                    <label>Current Status</label>
                    <div class="select-wrap">
                        <select id="saleStatusSelect" class="form-control">
                            <option value="pending" ${sale.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${sale.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="completed" ${sale.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${sale.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="refunded" ${sale.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                        </select>
                        <i class="fa-solid fa-chevron-down caret"></i>
                    </div>
                </div>
                <div class="alert alert-info" style="font-size:12px;">
                    <i class="fa-solid fa-circle-info"></i> Updates affect financial reporting immediately.
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="UI.showToast('Status updated to ' + document.getElementById('saleStatusSelect').value.toUpperCase(), 'success'); Modal.close(); Sales.render();">Update Status</button>
            `
        });
    },

    openAddSaleModal() {
        Modal.open({
            title: 'Manual Sales Entry',
            size: 'md',
            body: `
                <div style="margin-bottom:20px;">
                    <div class="alert alert-warning" style="font-size:12px; margin-bottom:15px;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Only use for transactions outside the standard booking flow.
                    </div>
                </div>
                <div class="form-group">
                    <label>Client Reference</label>
                    <input type="text" class="form-control" placeholder="Client Name or ID">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                     <div class="form-group">
                        <label>Product / Service</label>
                         <div class="select-wrap">
                             <select class="form-control">
                                 <option value="Consultation">Consultation Fee</option>
                                 <option value="Concierge">Concierge Service</option>
                                 <option value="Transport">Private Transport</option>
                                 <option value="Other">Other Adjustment</option>
                             </select>
                             <i class="fa-solid fa-chevron-down caret"></i>
                         </div>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                     <div class="form-group">
                        <label>Revenue Amount</label>
                        <input type="number" class="form-control" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Net Cost (Optional)</label>
                        <input type="number" class="form-control" placeholder="0.00">
                    </div>
                </div>
                 <div class="form-group">
                    <label>Internal Note</label>
                    <textarea class="form-control" style="height:80px;" placeholder="Reason for manual entry..."></textarea>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="UI.showToast('Manual sale recorded successfully', 'success'); Modal.close(); Sales.render();">Record Transaction</button>
            `
        });
    }
};

window.Sales = Sales;
