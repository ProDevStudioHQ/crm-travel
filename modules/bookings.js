
const Bookings = {
    init() {
        this._selected = this._selected || new Set();
    },

    _syncHeaderCheckbox() {
        const header = document.getElementById('selAllBookings');
        if (!header) return;
        const total = store.state.bookings.length;
        const selected = (this._selected && this._selected.size) || 0;
        header.indeterminate = selected > 0 && selected < total;
        header.checked = total > 0 && selected === total;

        const countEl = document.getElementById('bulkCountBookings');
        if (countEl) countEl.textContent = String(selected);

        const delBtn = document.getElementById('deleteSelBookings');
        if (delBtn) {
            delBtn.disabled = selected === 0;
            delBtn.style.opacity = selected === 0 ? '0.5' : '1';
        }
    },

    toggleSelect(id, checked) {
        this._selected = this._selected || new Set();
        if (checked) this._selected.add(String(id));
        else this._selected.delete(String(id));
        this._syncHeaderCheckbox();
    },

    toggleSelectAll(checked) {
        this._selected = new Set();
        const bookings = store.state.bookings;
        if (checked) {
            bookings.forEach(b => this._selected.add(String(b.id)));
        }
        document.querySelectorAll('input[data-sel-type="booking"]').forEach(cb => {
            cb.checked = checked;
        });
        this._syncHeaderCheckbox();
    },

    _restoreCheckboxes() {
        const sel = this._selected || new Set();
        document.querySelectorAll('input[data-sel-type="booking"][data-id]').forEach(cb => {
            cb.checked = sel.has(String(cb.dataset.id));
        });
        this._syncHeaderCheckbox();
    },

    clearSelection() {
        this._selected = new Set();
        this._syncHeaderCheckbox();
    },

    deleteSelected() {
        const ids = Array.from(this._selected);
        if (!ids.length) return UI.showToast('No bookings selected', 'info');
        UI.confirm('Delete Selected', `Permanently delete <b>${ids.length}</b> bookings?`, () => {
            store.deleteBookingsBulk(ids);
            this.clearSelection();
            this.render();
            UI.showToast('Deleted successfully', 'success');
        }, 'danger');
    },

    deleteAll() {
        const total = store.state.bookings.length;
        if (!total) return UI.showToast('No bookings to delete', 'info');
        UI.confirm('Delete ALL', `Permanently delete <b>ALL (${total})</b> bookings? This cannot be undone.`, () => {
            store.deleteAllBookings();
            this.clearSelection();
            this.render();
            UI.showToast('All bookings deleted', 'success');
        }, 'danger');
    },

    delete(id) {
        UI.confirm('Delete Booking', 'Are you sure you want to delete this booking?', () => {
            store.deleteBooking(id);
            this.render();
            UI.showToast('Booking deleted successfully', 'success');
        }, 'danger');
    },

    renderEmptyState() {
        return `
            <div style="padding: 100px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 20px; margin-top: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(var(--primary-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                    <i class="fa-solid fa-suitcase-rolling" style="font-size: 32px; color: var(--primary);"></i>
                </div>
                <h3 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">No Active Expeditions</h3>
                <p style="color: var(--text-secondary); font-size: 14px; max-width: 400px; margin: 0 auto 30px; line-height: 1.6;">
                    Your operations calendar is currently clear. Convert an existing quote or manually register a new trip booking.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <button class="btn-primary" onclick="handleRoute('quotes')">
                        <i class="fa-solid fa-file-invoice-dollar"></i> From Quote
                    </button>
                    <button class="btn-secondary" onclick="Bookings.openModal()">
                        <i class="fa-solid fa-plus"></i> Manual Booking
                    </button>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                    <i class="fa-solid fa-shield-halved" style="color: var(--success);"></i> System check: All supplier confirmations are logged and secured.
                </div>
            </div>
        `;
    },

    render() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const user = state.currentUser;

        // RBAC: Agents only see their own bookings (SOP Rule 3)
        let bookings = state.bookings;
        if (user.role === 'agent') {
            bookings = bookings.filter(b => b.agent === user.name || b.agent === user.email);
        }

        // Apply Global Search
        const searchTerm = (state.ui && state.ui.globalSearch) || '';
        if (searchTerm) {
            bookings = bookings.filter(b => {
                return (
                    (b.id && String(b.id).toLowerCase().includes(searchTerm)) ||
                    (b.clientName && String(b.clientName).toLowerCase().includes(searchTerm)) ||
                    (b.title && String(b.title).toLowerCase().includes(searchTerm)) ||
                    (b.destination && String(b.destination).toLowerCase().includes(searchTerm)) ||
                    (b.status && String(b.status).toLowerCase().includes(searchTerm))
                );
            });
        }

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 20px; font-weight:600; margin-bottom:5px;">Bookings & Operations</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Track traveler details, payments, and supplier confirmations.</p>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button class="btn-social" onclick="Bookings.toggleSelectAll(true)" title="Select all bookings">
                        <i class="fa-solid fa-check-double"></i> Select All
                    </button>
                    ${user.role === 'admin' ? `
                        <button class="btn-social" style="color:var(--danger); border-color:rgba(248,40,90,0.3);" onclick="Bookings.deleteAll()">
                            <i class="fa-solid fa-trash"></i> Wipe All
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="Bookings.openModal()">
                        <i class="fa-solid fa-plus"></i> New Booking
                    </button>
                </div>
            </div>

            <div class="card" style="padding:0; overflow:hidden; background:rgba(255,255,255,0.01);">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:40px;">
                                    <input id="selAllBookings" type="checkbox" onclick="Bookings.toggleSelectAll(this.checked)" />
                                </th>
                                <th>Booking ID</th>
                                <th>Client</th>
                                <th>Trip Details</th>
                                <th>Status</th>
                                <th>Financials</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map((b, index) => `
                                <tr>
                                    <td style="width:40px; text-align:center;">
                                        <input type="checkbox" data-sel-type="booking" data-id="${b.id}" onchange="Bookings.toggleSelect('${b.id}', this.checked)" />
                                    </td>
                                    <td>
                                        <div style="font-weight:700; font-family:'JetBrains Mono', monospace;">${b.id}</div>
                                        <div style="font-size:10px; opacity:0.6;">REF: ${b.quoteId || 'Direct'}</div>
                                    </td>
                                    <td>
                                        <div style="font-weight:600;">${b.clientName}</div>
                                        <div style="font-size:10px; color:var(--text-muted);">${b.type} Client</div>
                                    </td>
                                    <td>
                                        <div style="font-size:13px; font-weight:500;">${b.title}</div>
                                        <div style="font-size:11px; color:var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${b.dates}</div>
                                    </td>
                                    <td><span class="status-badge status-${b.status}">${b.status.toUpperCase()}</span></td>
                                    <td>
                                        <span style="font-weight:700; color:var(--primary);">${store.formatCurrency(b.totalAmount)}</span>
                                    </td>
                                    <td style="text-align:right;">
                                        <div class="action-btns">
                                            <button class="action-btn-label action-btn-label--send" onclick="GlobalActions.quickSend('booking', '${b.id}')"><i class="fa-solid fa-paper-plane"></i> Send</button>
                                            <button class="action-btn-label action-btn-label--view" onclick="Bookings.viewDetail('${b.id}')"><i class="fa-solid fa-eye"></i> View</button>
                                            <button class="action-btn-label action-btn-label--edit" onclick="Bookings.openModal('${b.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                            <button class="action-btn-label action-btn-label--delete" onclick="Bookings.delete('${b.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${bookings.length === 0 ? this.renderEmptyState() : ''}
                </div>
            </div>
        `;
        this._restoreCheckboxes();
    },

    viewDetail(id) {
        const booking = store.state.bookings.find(b => String(b.id) === String(id));
        if (!booking) return UI.showToast('Booking not found', 'error');

        const statusColors = {
            confirmed: 'var(--success)',
            pending: 'var(--warning)',
            cancelled: 'var(--danger)',
            completed: 'var(--info)'
        };

        Modal.open({
            title: `<i class="fa-solid fa-plane"></i> Booking: ${booking.id}`,
            width: '700px',
            body: `
                <div class="booking-detail-view">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:25px;">
                        <div class="card p-4" style="background:rgba(var(--primary-rgb), 0.03); border:1px solid rgba(var(--primary-rgb), 0.1);">
                            <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; margin-bottom:10px;">Client Information</div>
                            <div style="font-size:16px; font-weight:700;">${booking.clientName}</div>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">${booking.type} Client</div>
                            ${booking.clientEmail ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:8px;"><i class="fa-regular fa-envelope"></i> ${booking.clientEmail}</div>` : ''}
                            ${booking.clientPhone ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:4px;"><i class="fa-solid fa-phone"></i> ${booking.clientPhone}</div>` : ''}
                        </div>
                        <div class="card p-4">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Booking Status</div>
                            <span class="status-badge status-${booking.status}" style="font-size:14px; padding:8px 16px;">${booking.status.toUpperCase()}</span>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:12px;">
                                <i class="fa-regular fa-calendar"></i> Created: ${booking.createdAt || 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div class="card p-4" style="margin-bottom:20px;">
                        <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:15px;">Trip Details</div>
                        <h3 style="font-size:18px; font-weight:700; margin-bottom:10px;">${booking.title}</h3>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px; margin-top:15px;">
                            <div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Travel Dates</div>
                                <div style="font-size:14px; font-weight:600; margin-top:5px;"><i class="fa-regular fa-calendar"></i> ${booking.dates}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Travelers</div>
                                <div style="font-size:14px; font-weight:600; margin-top:5px;"><i class="fa-solid fa-users"></i> ${booking.travelers || 1}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Destination</div>
                                <div style="font-size:14px; font-weight:600; margin-top:5px;"><i class="fa-solid fa-location-dot"></i> ${booking.destination || 'TBD'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card p-4" style="background:rgba(var(--success-rgb), 0.02); border:1px solid rgba(var(--success-rgb), 0.1);">
                        <div style="font-size:11px; font-weight:800; color:var(--success); text-transform:uppercase; margin-bottom:15px;">Financial Summary</div>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Total Amount</div>
                                <div style="font-size:20px; font-weight:800; color:var(--primary);">${store.formatCurrency(booking.totalAmount)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Paid</div>
                                <div style="font-size:20px; font-weight:800; color:var(--success);">${store.formatCurrency(booking.paidAmount || 0)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Balance Due</div>
                                <div style="font-size:20px; font-weight:800; color:var(--danger);">${store.formatCurrency((booking.totalAmount || 0) - (booking.paidAmount || 0))}</div>
                            </div>
                        </div>
                    </div>

                    ${booking.notes ? `
                        <div class="card p-4" style="margin-top:20px;">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Notes</div>
                            <p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${booking.notes}</p>
                        </div>
                    ` : ''}
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Close</button>
                <button class="btn-secondary" onclick="Modal.close(); Bookings.openModal('${booking.id}')"><i class="fa-solid fa-pen"></i> Edit Booking</button>
            `
        });
    },

    openModal(id = null) {
        const booking = id ? store.state.bookings.find(b => String(b.id) === String(id)) : {};
        const isEdit = !!id;

        // Get client options
        const b2bClients = store.state.b2bClients || [];
        const b2cClients = store.state.b2cClients || [];
        const allClients = [
            ...b2bClients.map(c => ({ id: c.id, name: c.company || c.name, type: 'B2B' })),
            ...b2cClients.map(c => ({ id: c.id, name: c.name, type: 'B2C' }))
        ];

        Modal.open({
            title: `<i class="fa-solid fa-plane"></i> ${isEdit ? 'Edit' : 'New'} Booking`,
            width: '650px',
            body: `
                <div style="display:grid; gap:20px;">
                    <div class="form-group">
                        <label>Booking Title *</label>
                        <input type="text" id="booking_title" class="form-control" value="${booking.title || ''}" placeholder="e.g. Morocco Adventure Package">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Client *</label>
                            <div class="select-wrap">
                                <select id="booking_client" class="form-control">
                                    <option value="">Select a client...</option>
                                    ${allClients.map(c => `
                                        <option value="${c.id}|${c.name}|${c.type}" ${booking.clientName === c.name ? 'selected' : ''}>${c.name} (${c.type})</option>
                                    `).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <div class="select-wrap">
                                <select id="booking_status" class="form-control">
                                    <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Travel Dates *</label>
                            <input type="text" id="booking_dates" class="form-control" value="${booking.dates || ''}" placeholder="e.g. Dec 15 - Dec 22, 2026">
                        </div>
                        <div class="form-group">
                            <label>Destination</label>
                            <input type="text" id="booking_destination" class="form-control" value="${booking.destination || ''}" placeholder="e.g. Marrakech, Morocco">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Travelers</label>
                            <input type="number" id="booking_travelers" class="form-control" value="${booking.travelers || 1}" min="1">
                        </div>
                        <div class="form-group">
                            <label>Total Amount *</label>
                            <input type="number" id="booking_total" class="form-control" value="${booking.totalAmount || ''}" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Paid Amount</label>
                            <input type="number" id="booking_paid" class="form-control" value="${booking.paidAmount || 0}" placeholder="0.00" step="0.01">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Quote Reference (optional)</label>
                        <input type="text" id="booking_quote" class="form-control" value="${booking.quoteId || ''}" placeholder="e.g. QT-2026-001">
                    </div>

                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="booking_notes" class="form-control" rows="3" placeholder="Special requests, dietary requirements, etc.">${booking.notes || ''}</textarea>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="Bookings.save('${id}')">${isEdit ? 'Update Booking' : 'Create Booking'}</button>
            `
        });
    },

    save(id) {
        const title = document.getElementById('booking_title').value;
        const clientRaw = document.getElementById('booking_client').value;
        const dates = document.getElementById('booking_dates').value;
        const totalAmount = parseFloat(document.getElementById('booking_total').value);

        if (!title) return UI.showToast('Booking title is required', 'error');
        if (!clientRaw) return UI.showToast('Please select a client', 'error');
        if (!dates) return UI.showToast('Travel dates are required', 'error');
        if (isNaN(totalAmount) || totalAmount <= 0) return UI.showToast('Valid total amount is required', 'error');

        const [clientId, clientName, clientType] = clientRaw.split('|');

        const data = {
            id: id && id !== 'null' ? id : 'BK-' + Date.now(),
            title,
            clientId,
            clientName,
            type: clientType,
            dates,
            destination: document.getElementById('booking_destination').value || '',
            travelers: parseInt(document.getElementById('booking_travelers').value) || 1,
            totalAmount,
            paidAmount: parseFloat(document.getElementById('booking_paid').value) || 0,
            quoteId: document.getElementById('booking_quote').value || '',
            notes: document.getElementById('booking_notes').value || '',
            status: document.getElementById('booking_status').value,
            createdAt: id && id !== 'null' ? (store.state.bookings.find(b => String(b.id) === String(id))?.createdAt || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
            agent: store.state.currentUser.name
        };

        store.saveBooking(data);
        UI.showToast(`Booking ${id && id !== 'null' ? 'updated' : 'created'} successfully`, 'success');
        Modal.close();
        this.render();
    }
};

window.Bookings = Bookings;
