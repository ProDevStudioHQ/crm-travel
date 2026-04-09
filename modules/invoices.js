
const Invoices = {
    _selected: new Set(),

    init() {
        console.log('Invoices Module Initialized');
        this._selected = new Set();
    },

    _syncHeaderCheckbox() {
        const headerCb = document.getElementById('selectAllInvoices');
        if (!headerCb) return;
        const totalRows = store.state.invoices.length;
        const selectedRows = this._selected.size;
        headerCb.checked = totalRows > 0 && selectedRows === totalRows;
        headerCb.indeterminate = selectedRows > 0 && selectedRows < totalRows;

        const bulkBtn = document.getElementById('deleteSelInvoices');
        const bulkCount = document.getElementById('bulkCountInvoices');
        if (bulkBtn && bulkCount) {
            bulkCount.innerText = selectedRows;
            bulkBtn.style.display = selectedRows > 0 ? 'flex' : 'none';
        }
    },

    toggleSelect(id, checked) {
        id = String(id);
        if (checked) this._selected.add(id);
        else this._selected.delete(id);
        this._syncHeaderCheckbox();
    },

    toggleSelectAll(checked) {
        const items = store.state.invoices;
        if (checked) {
            items.forEach(i => this._selected.add(String(i.id)));
        } else {
            this._selected.clear();
        }
        document.querySelectorAll('input[data-sel-type="invoices"]').forEach(cb => cb.checked = checked);
        this._syncHeaderCheckbox();
    },

    _restoreCheckboxes() {
        document.querySelectorAll('input[data-sel-type="invoices"][data-id]').forEach(cb => {
            cb.checked = this._selected.has(String(cb.dataset.id));
        });
        this._syncHeaderCheckbox();
    },

    clearSelection() {
        this._selected.clear();
        this._syncHeaderCheckbox();
    },

    deleteSelected() {
        const ids = Array.from(this._selected);
        if (!ids.length) return UI.showToast('No items selected', 'info');
        UI.confirm(
            'Delete selected invoices',
            `You are about to permanently delete <b>${ids.length}</b> invoice(s). This cannot be undone.`,
            () => {
                store.deleteInvoicesBulk(ids);
                this.clearSelection();
                this.render();
                UI.showToast('Invoices deleted successfully', 'success');
            },
            'danger'
        );
    },

    deleteAll() {
        UI.confirm(
            'WIPE ENTIRE INVOICE RECORD',
            'SOP CAUTION: You are about to clear the ENTIRE invoice history. This is a critical action.',
            () => {
                store.deleteAllInvoices();
                this.clearSelection();
                this.render();
                UI.showToast('Invoice history wiped successfully', 'warning');
            },
            'danger'
        );
    },

    renderEmptyState() {
        return `
            <div style="padding: 100px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 20px; margin-top: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(var(--primary-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                    <i class="fa-solid fa-file-invoice" style="font-size: 32px; color: var(--primary);"></i>
                </div>
                <h3 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">Accounting Records Empty</h3>
                <p style="color: var(--text-secondary); font-size: 14px; max-width: 400px; margin: 0 auto 30px; line-height: 1.6;">
                    No financial transmissions have been recorded. Invoices are generated automatically from confirmed bookings or manually for custom fees.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <button class="btn-primary" onclick="handleRoute('bookings')">
                        <i class="fa-solid fa-suitcase-rolling"></i> View Bookings
                    </button>
                    <button class="btn-secondary" onclick="Invoices.openModal()">
                        <i class="fa-solid fa-plus"></i> Manual Invoice
                    </button>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">
                    <i class="fa-solid fa-shield-check" style="color: var(--success);"></i> Compliance: All invoices follow the global standard for tax transparency.
                </div>
            </div>
        `;
    },

    render() {
        const content = document.getElementById('mainContent');
        let invoices = store.state.invoices;
        const currency = store.state.systemSettings.currency || 'USD';

        // Apply Global Search
        const searchTerm = (store.state.ui && store.state.ui.globalSearch) || '';
        if (searchTerm) {
            invoices = invoices.filter(inv => {
                return (
                    (inv.id && String(inv.id).toLowerCase().includes(searchTerm)) ||
                    (inv.clientName && String(inv.clientName).toLowerCase().includes(searchTerm)) ||
                    (inv.status && String(inv.status).toLowerCase().includes(searchTerm)) ||
                    (inv.bookingId && String(inv.bookingId).toLowerCase().includes(searchTerm))
                );
            });
        }

        // Helper to format currency consistently with compact notation for KPIs
        const formatKpi = (val) => store.formatCurrency(val, currency, { notation: 'compact' });

        const totalReceived = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const pendingBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
        const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;

        content.innerHTML = `
            <div class="module-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <div>
                    <h2 style="font-size: 24px; font-weight:800; letter-spacing:-1px; margin-bottom:8px;">Financial Ledger: Invoices</h2>
                    <p style="color:var(--text-secondary); font-size:14px; font-weight:500;">Direct credit control and payment reconciliation tracking.</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="Invoices.openModal()">
                        <i class="fa-solid fa-plus"></i> New Invoice
                    </button>
                </div>
            </div>

            <!-- Invoice KPIs -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:30px;">
                <div class="card p-4">
                    <div style="font-size:11px; font-weight:800; color:var(--success); text-transform:uppercase; margin-bottom:10px;">Total Collected</div>
                    <div style="font-size:24px; font-weight:800;">${formatKpi(totalReceived)}</div>
                </div>
                <div class="card p-4">
                    <div style="font-size:11px; font-weight:800; color:var(--danger); text-transform:uppercase; margin-bottom:10px;">Outstanding Balance</div>
                    <div style="font-size:24px; font-weight:800;">${formatKpi(pendingBalance)}</div>
                </div>
                <div class="card p-4">
                    <div style="font-size:11px; font-weight:800; color:var(--warning); text-transform:uppercase; margin-bottom:10px;">Overdue Notices</div>
                    <div style="font-size:24px; font-weight:800;">${overdueCount}</div>
                </div>
            </div>

            <div class="card" style="padding:20px; margin-bottom:25px; display:flex; gap:15px; align-items:center; background:rgba(255,255,255,0.01);">
                <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Global Operations:</div>
                <div style="margin-left:auto; display:flex; gap:8px;">
                     <button class="btn-social" onclick="Invoices.toggleSelectAll(true)"><i class="fa-solid fa-check-double"></i> Select All</button>
                     <button id="deleteSelInvoices" class="btn-social" style="color:var(--danger); display:none;" onclick="Invoices.deleteSelected()"><i class="fa-solid fa-trash-can"></i> Bulk Delete (<span id="bulkCountInvoices">0</span>)</button>
                     ${store.state.currentUser.role === 'admin' ? `<button class="btn-social" style="color:var(--danger); border-color:var(--danger);" onclick="Invoices.deleteAll()"><i class="fa-solid fa-dumpster-fire"></i> Wipe History</button>` : ''}
                </div>
            </div>

            <div class="card" style="padding:0; overflow:hidden; background:rgba(255,255,255,0.01);">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:40px;"><input id="selectAllInvoices" type="checkbox" onclick="Invoices.toggleSelectAll(this.checked)" /></th>
                                <th>Invoice ID</th>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Amount</th>
                                <th>Balance</th>
                                <th>Date / Due</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoices.map((inv, index) => `
                                <tr>
                                    <td style="width:40px; text-align:center;"><input type="checkbox" data-sel-type="invoices" data-id="${inv.id}" onchange="Invoices.toggleSelect('${inv.id}', this.checked)" /></td>
                                    <td><span style="font-weight:700; font-family:'JetBrains Mono', monospace;">${inv.id}</span></td>
                                    <td>
                                        <div style="font-weight:600;">${inv.clientName}</div>
                                        <div style="font-size:10px; color:var(--text-muted);">${inv.bookingId ? `REF: ${inv.bookingId}` : 'Direct Service'}</div>
                                    </td>
                                    <td><span class="status-badge status-${inv.status}">${inv.status.toUpperCase()}</span></td>
                                    <td><span style="font-weight:700; color:var(--primary);">${store.formatCurrency(inv.totalAmount)}</span></td>
                                    <td><span style="font-weight:700; color:${inv.balance > 0 ? 'var(--danger)' : 'var(--success)'};">${store.formatCurrency(inv.balance)}</span></td>
                                    <td>
                                        <div style="font-size:11px;">${inv.date}</div>
                                        <div style="font-size:10px; color:var(--text-muted);">Due: ${inv.dueDate}</div>
                                    </td>
                                    <td style="text-align:right;">
                                        <button class="btn-icon" onclick="Invoices.viewDetail('${inv.id}')"><i class="fa-solid fa-eye"></i></button>
                                        <button class="btn-icon" onclick="Invoices.print('${inv.id}')"><i class="fa-solid fa-print"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${invoices.length === 0 ? this.renderEmptyState() : ''}
                </div>
            </div>
        `;
        this._restoreCheckboxes();
    },

    viewDetail(id) {
        const inv = store.state.invoices.find(i => String(i.id) === String(id));
        if (!inv) return UI.showToast('Invoice not found', 'error');

        Modal.open({
            title: `Invoice #${inv.id} - Details`,
            size: 'lg',
            body: `
                <div style="display:flex; justify-content:space-between; margin-bottom:30px; border-bottom:1px solid var(--border); padding-bottom:20px;">
                    <div>
                        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">BILL TO</div>
                        <h3 style="margin:0; font-size:18px;">${inv.clientName}</h3>
                        <div style="color:var(--text-secondary); font-size:13px; margin-top:5px;">${inv.clientEmail || 'No email on record'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">STATUS</div>
                        <span class="status-badge status-${inv.status}" style="font-size:12px;">${inv.status.toUpperCase()}</span>
                        <div style="margin-top:10px; font-size:13px; color:var(--text-secondary);">Issued: ${inv.date}</div>
                        <div style="font-size:13px; color:var(--text-secondary);">Due: ${inv.dueDate}</div>
                    </div>
                </div>

                <div class="table-container" style="margin-bottom:30px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align:right;">Qty</th>
                                <th style="text-align:right;">Rate</th>
                                <th style="text-align:right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(inv.items || [{ desc: 'Consultation Service', qty: 1, rate: inv.totalAmount }]).map(item => `
                                <tr>
                                    <td>${item.desc}</td>
                                    <td style="text-align:right;">${item.qty}</td>
                                    <td style="text-align:right;">${store.formatCurrency(item.rate)}</td>
                                    <td style="text-align:right; font-weight:700;">${store.formatCurrency(item.qty * item.rate)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="text-align:right; padding:15px; font-weight:700;">Total Amount</td>
                                <td style="text-align:right; padding:15px; font-size:16px; font-weight:800; color:var(--primary);">${store.formatCurrency(inv.totalAmount)}</td>
                            </tr>
                             <tr>
                                <td colspan="3" style="text-align:right; padding:10px 15px; font-weight:700;">Paid to Date</td>
                                <td style="text-align:right; padding:10px 15px; color:var(--success); font-weight:700;">${store.formatCurrency(inv.paidAmount || 0)}</td>
                            </tr>
                             <tr>
                                <td colspan="3" style="text-align:right; padding:10px 15px; font-weight:700;">Balance Due</td>
                                <td style="text-align:right; padding:10px 15px; color:var(--danger); font-weight:800;">${store.formatCurrency(inv.balance)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:12px; border:1px dashed var(--border);">
                    <h5 style="margin:0 0 10px 0; font-size:13px; color:var(--text-muted); text-transform:uppercase;">Notes</h5>
                    <p style="margin:0; font-size:13px; line-height:1.6;">${inv.notes || 'No additional notes provided.'}</p>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Close</button>
                <button class="btn-secondary" onclick="Invoices.print('${inv.id}')"><i class="fa-solid fa-print"></i> Print</button>
                <button class="btn-primary" onclick="UI.showToast('Payment link sent to ${inv.clientName}', 'success')"><i class="fa-regular fa-paper-plane"></i> Resend Invoice</button>
            `
        });
    },

    openModal(id = null) {
        const inv = id ? store.state.invoices.find(i => String(i.id) === String(id)) : {
            clientName: '',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 12096e5).toISOString().split('T')[0], // +14 days
            items: [{ desc: 'Professional Services', qty: 1, rate: 0 }],
            status: 'draft'
        };

        Modal.open({
            title: id ? `Edit Invoice #${id}` : 'Create New Invoice',
            size: 'lg',
            body: `
                <div class="form-group">
                    <label>Client Name</label>
                    <input type="text" class="form-control" value="${inv.clientName}" placeholder="Search client...">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div class="form-group">
                        <label>Issue Date</label>
                        <input type="date" class="form-control" value="${inv.date}">
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" class="form-control" value="${inv.dueDate}">
                    </div>
                </div>
                
                <h4 style="font-size:13px; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:5px;">Line Items</h4>
                <div id="invoiceItemsList">
                     ${inv.items.map((item, idx) => `
                        <div style="display:grid; grid-template-columns: 3fr 1fr 1.5fr 30px; gap:10px; margin-bottom:10px;">
                             <input type="text" class="form-control" value="${item.desc}" placeholder="Description">
                             <input type="number" class="form-control" value="${item.qty}" placeholder="Qty">
                             <input type="number" class="form-control" value="${item.rate}" placeholder="Rate">
                             <button class="icon-btn" style="color:var(--danger);" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
                        </div>
                     `).join('')}
                </div>
                <button class="btn-secondary" style="width:100%; border-style:dashed;" onclick="UI.showToast('Row added (visual only)', 'info')">+ Add Line Item</button>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="UI.showToast('Invoice saved (Simulation)', 'success'); Modal.close(); Invoices.render();">Save Invoice</button>
            `
        });
    },

    print(id) {
        // Simulating a print view by opening a new window or triggering browser print
        const inv = store.state.invoices.find(i => String(i.id) === String(id));
        if (!inv) return;

        UI.showToast('Preparing print layout...', 'info');
        setTimeout(() => {
            // In a real app, this would open a printable URL or generate a PDFBlob
            // For this simulation, we'll just alert the action
            window.print();
        }, 800);
    }
};

window.Invoices = Invoices;
