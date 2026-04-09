
const Quotes = {
    currencyOptions(selected) {
        const list = store.state.currencies || [];
        return list
            .filter(c => c.status === 'active')
            .map(c => `
                <option value="${c.code}" ${selected === c.code ? 'selected' : ''}>${c.code} (${c.symbol}) — ${c.name}</option>
            `).join('');
    },

    init() {
        // Run expiry check on load (SOP Rule 9)
        store.checkQuoteExpirations();
        this._selected = this._selected || new Set();
    },

    _syncHeaderCheckbox() {
        const header = document.getElementById('selAllQuotes');
        if (!header) return;
        const total = store.state.quotes.length;
        const selected = this._selected.size;
        header.indeterminate = selected > 0 && selected < total;
        header.checked = total > 0 && selected === total;

        const countEl = document.getElementById('bulkCountQuotes');
        if (countEl) countEl.textContent = String(selected);

        const delBtn = document.getElementById('deleteSelQuotes');
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
        const quotes = store.state.quotes;
        if (checked) {
            quotes.forEach(q => this._selected.add(String(q.id)));
        }
        document.querySelectorAll('input[data-sel-type="quote"]').forEach(cb => {
            cb.checked = checked;
        });
        this._syncHeaderCheckbox();
    },

    _restoreCheckboxes() {
        const sel = this._selected || new Set();
        document.querySelectorAll('input[data-sel-type="quote"][data-id]').forEach(cb => {
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
        if (!ids.length) return UI.showToast('No quotes selected', 'info');
        UI.confirm('Delete Selected', `Permanently delete <b>${ids.length}</b> quotes?`, () => {
            store.deleteQuotesBulk(ids);
            this.clearSelection();
            this.render();
            UI.showToast('Deleted successfully', 'success');
        }, 'danger');
    },

    deleteAll() {
        const total = store.state.quotes.length;
        if (!total) return UI.showToast('No quotes to delete', 'info');
        UI.confirm('Delete ALL', `Permanently delete <b>ALL (${total})</b> quotes? This cannot be undone.`, () => {
            store.deleteAllQuotes();
            this.clearSelection();
            this.render();
            UI.showToast('All quotes deleted', 'success');
        }, 'danger');
    },

    delete(id) {
        UI.confirm('Delete Quote', 'Are you sure you want to delete this quote?', () => {
            store.deleteQuote(id);
            this.render();
            UI.showToast('Quote deleted successfully', 'success');
        }, 'danger');
    },

    renderEmptyState() {
        return `
            <div style="padding: 100px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 20px; margin-top: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(var(--primary-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                    <i class="fa-solid fa-file-invoice-dollar" style="font-size: 32px; color: var(--primary);"></i>
                </div>
                <h3 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">Zero Financial Projections</h3>
                <p style="color: var(--text-secondary); font-size: 14px; max-width: 400px; margin: 0 auto 30px; line-height: 1.6;">
                    Generate your first premium travel proposal. Quotes are the bridge between browsing and booking.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <button class="btn-primary" onclick="Quotes.openModal()">
                        <i class="fa-solid fa-plus"></i> New Proposal
                    </button>
                    <button class="btn-secondary" onclick="handleRoute('b2b')">
                        <i class="fa-solid fa-users"></i> Select Client
                    </button>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">
                    <i class="fa-solid fa-clock-rotate-left" style="color: var(--info);"></i> Did you know? Proposals sent within 1 hour have 3x higher win rates.
                </div>
            </div>
        `;
    },

    render() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const user = state.currentUser;

        let quotes = state.quotes;

        // RBAC: Agents only see/manage their own quotes (SOP Rule 3)
        if (user.role === 'agent') {
            quotes = quotes.filter(q => q.agent === user.name || q.agent === user.email);
        }

        // Apply Global Search
        const searchTerm = (state.ui && state.ui.globalSearch) || '';
        if (searchTerm) {
            quotes = quotes.filter(q => {
                return (
                    (q.id && String(q.id).toLowerCase().includes(searchTerm)) ||
                    (q.clientName && String(q.clientName).toLowerCase().includes(searchTerm)) ||
                    (q.title && String(q.title).toLowerCase().includes(searchTerm)) ||
                    (q.status && String(q.status).toLowerCase().includes(searchTerm))
                );
            });
        }

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 30px;">
                <div>
                    <h2 style="font-size: 24px; font-weight:800; letter-spacing:-1px; margin-bottom:8px;">Financial Intelligence: Quotes</h2>
                    <p style="color:var(--text-secondary); font-size:14px; font-weight:500;">Draft, manage, and track high-ticket travel proposals.</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="Quotes.openModal()">
                        <i class="fa-solid fa-plus"></i> Initialize Quote
                    </button>
                </div>
            </div>

            <div class="card" style="padding:20px; margin-bottom:25px; display:flex; gap:15px; align-items:center; background:rgba(255,255,255,0.01);">
                <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Global Operations:</div>
                <div style="margin-left:auto; display:flex; gap:8px;">
                     <button class="btn-social" onclick="Quotes.toggleSelectAll(true)"><i class="fa-solid fa-check-double"></i> Select All</button>
                     <button id="deleteSelQuotes" class="btn-social" style="color:var(--danger);" onclick="Quotes.deleteSelected()" disabled><i class="fa-solid fa-trash-can"></i> Bulk Delete (<span id="bulkCountQuotes">0</span>)</button>
                     ${state.currentUser.role === 'admin' ? `<button class="btn-social" style="color:var(--danger); border-color:var(--danger);" onclick="Quotes.deleteAll()"><i class="fa-solid fa-dumpster-fire"></i> Wipe Registry</button>` : ''}
                </div>
            </div>

            <div class="card" style="padding:0; overflow:hidden; background:rgba(255,255,255,0.01);">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:40px;"><input id="selAllQuotes" type="checkbox" onclick="Quotes.toggleSelectAll(this.checked)" /></th>
                                <th>Quote ID</th>
                                <th>Client</th>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Value</th>
                                <th>Validity</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${quotes.map((q, index) => `
                                <tr>
                                    <td style="width:40px; text-align:center;"><input type="checkbox" data-sel-type="quote" data-id="${q.id}" onchange="Quotes.toggleSelect('${q.id}', this.checked)" /></td>
                                    <td><span style="font-weight:700; font-family:'JetBrains Mono', monospace;">${q.id}</span></td>
                                    <td>
                                        <div style="font-weight:600;">${q.clientName || 'Unnamed'}</div>
                                        <div style="font-size:10px; color:var(--text-muted);">${q.type}</div>
                                    </td>
                                    <td>${q.title || 'Standard Trip'}</td>
                                    <td><span class="status-badge status-${q.status}">${q.status.toUpperCase()}</span></td>
                                    <td><span style="font-weight:700; color:var(--primary);">${store.formatCurrency(q.totalPrice, q.currency)}</span></td>
                                    <td><span style="font-size:12px; color:${new Date(q.validUntil) < new Date() ? 'var(--danger)' : 'var(--text-muted)'};">${q.validUntil}</span></td>
                                        <td style="text-align:right;">
                                            <div class="action-btns">
                                                <button class="action-btn-label action-btn-label--send" onclick="GlobalActions.quickSend('quote', '${q.id}')"><i class="fa-solid fa-paper-plane"></i> Send</button>
                                                <button class="action-btn-label action-btn-label--view" onclick="Quotes.viewDetail('${q.id}')"><i class="fa-solid fa-eye"></i> View</button>
                                                <button class="action-btn-label action-btn-label--edit" onclick="Quotes.openModal('${q.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                                <button class="action-btn-label action-btn-label--delete" onclick="Quotes.delete('${q.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                                            </div>
                                        </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${quotes.length === 0 ? this.renderEmptyState() : ''}
                </div>
            </div>
        `;
        this._restoreCheckboxes();
    },

    viewDetail(id) {
        const quote = store.state.quotes.find(q => String(q.id) === String(id));
        if (!quote) return UI.showToast('Quote not found', 'error');

        const statusColors = {
            draft: 'var(--text-muted)',
            sent: 'var(--info)',
            accepted: 'var(--success)',
            expired: 'var(--danger)',
            rejected: 'var(--danger)'
        };

        const lineItems = quote.items || [];
        const itemsHtml = lineItems.length ? `
            <table style="width:100%; border-collapse:collapse; margin-top:15px;">
                <thead>
                    <tr style="background:rgba(0,0,0,0.03);">
                        <th style="text-align:left; padding:10px; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Description</th>
                        <th style="text-align:center; padding:10px; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Qty</th>
                        <th style="text-align:right; padding:10px; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Unit Price</th>
                        <th style="text-align:right; padding:10px; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItems.map(item => `
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:12px 10px; font-size:13px;">${item.description}</td>
                            <td style="padding:12px 10px; text-align:center; font-size:13px;">${item.quantity}</td>
                            <td style="padding:12px 10px; text-align:right; font-size:13px;">${store.formatCurrency(item.unitPrice, quote.currency)}</td>
                            <td style="padding:12px 10px; text-align:right; font-size:13px; font-weight:600;">${store.formatCurrency(item.quantity * item.unitPrice, quote.currency)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color:var(--text-muted); font-style:italic;">No line items specified</p>';

        Modal.open({
            title: `<i class="fa-solid fa-file-invoice-dollar"></i> Quote: ${quote.id}`,
            width: '750px',
            body: `
                <div class="quote-detail-view">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:25px;">
                        <div class="card p-4" style="background:rgba(var(--primary-rgb), 0.03); border:1px solid rgba(var(--primary-rgb), 0.1);">
                            <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; margin-bottom:10px;">Client</div>
                            <div style="font-size:16px; font-weight:700;">${quote.clientName || 'Unnamed'}</div>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">${quote.type} Client</div>
                            ${quote.clientEmail ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:8px;"><i class="fa-regular fa-envelope"></i> ${quote.clientEmail}</div>` : ''}
                        </div>
                        <div class="card p-4">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Quote Status</div>
                            <span class="status-badge status-${quote.status}" style="font-size:14px; padding:8px 16px;">${quote.status.toUpperCase()}</span>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:12px;">
                                <i class="fa-regular fa-calendar"></i> Valid Until: <span style="color:${new Date(quote.validUntil) < new Date() ? 'var(--danger)' : 'var(--text-primary)'}; font-weight:600;">${quote.validUntil}</span>
                            </div>
                        </div>
                    </div>

                    <div class="card p-4" style="margin-bottom:20px;">
                        <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:15px;">Proposal Details</div>
                        <h3 style="font-size:18px; font-weight:700; margin-bottom:10px;">${quote.title || 'Travel Proposal'}</h3>
                        ${quote.description ? `<p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${quote.description}</p>` : ''}
                        
                        <div style="margin-top:20px;">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Line Items</div>
                            ${itemsHtml}
                        </div>
                    </div>

                    <div class="card p-4" style="background:rgba(var(--success-rgb), 0.02); border:1px solid rgba(var(--success-rgb), 0.1);">
                        <div style="font-size:11px; font-weight:800; color:var(--success); text-transform:uppercase; margin-bottom:15px;">Financial Summary</div>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Subtotal</div>
                                <div style="font-size:18px; font-weight:700;">${store.formatCurrency(quote.subtotal || quote.totalPrice, quote.currency)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Tax/Fees</div>
                                <div style="font-size:18px; font-weight:700;">${store.formatCurrency(quote.tax || 0, quote.currency)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Total</div>
                                <div style="font-size:24px; font-weight:800; color:var(--primary);">${store.formatCurrency(quote.totalPrice, quote.currency)}</div>
                            </div>
                        </div>
                    </div>

                    ${quote.notes ? `
                        <div class="card p-4" style="margin-top:20px;">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Notes</div>
                            <p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${quote.notes}</p>
                        </div>
                    ` : ''}
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Close</button>
                <button class="btn-secondary" onclick="Modal.close(); Quotes.openModal('${quote.id}')"><i class="fa-solid fa-pen"></i> Edit Quote</button>
                ${quote.status === 'draft' || quote.status === 'sent' ? `<button class="btn-primary" onclick="Quotes.convertToBooking('${quote.id}')"><i class="fa-solid fa-plane"></i> Convert to Booking</button>` : ''}
            `
        });
    },

    openModal(id = null) {
        const quote = id ? store.state.quotes.find(q => String(q.id) === String(id)) : {};
        const isEdit = !!id;

        // Get client options
        const b2bClients = store.state.b2bClients || [];
        const b2cClients = store.state.b2cClients || [];
        const allClients = [
            ...b2bClients.map(c => ({ id: c.id, name: c.company || c.name, type: 'B2B', email: c.email })),
            ...b2cClients.map(c => ({ id: c.id, name: c.name, type: 'B2C', email: c.email }))
        ];

        // Default validity: 14 days from now
        const defaultValidity = new Date();
        defaultValidity.setDate(defaultValidity.getDate() + 14);
        const defaultValidityStr = defaultValidity.toISOString().split('T')[0];

        Modal.open({
            title: `<i class="fa-solid fa-file-invoice-dollar"></i> ${isEdit ? 'Edit' : 'New'} Quote`,
            width: '700px',
            body: `
                <div style="display:grid; gap:20px;">
                    <div class="form-group">
                        <label>Proposal Title *</label>
                        <input type="text" id="quote_title" class="form-control" value="${quote.title || ''}" placeholder="e.g. Premium Morocco Adventure">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Client *</label>
                            <div class="select-wrap">
                                <select id="quote_client" class="form-control">
                                    <option value="">Select a client...</option>
                                    ${allClients.map(c => `
                                        <option value="${c.id}|${c.name}|${c.type}|${c.email || ''}" ${quote.clientName === c.name ? 'selected' : ''}>${c.name} (${c.type})</option>
                                    `).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <div class="select-wrap">
                                <select id="quote_status" class="form-control">
                                    <option value="draft" ${quote.status === 'draft' ? 'selected' : ''}>Draft</option>
                                    <option value="sent" ${quote.status === 'sent' ? 'selected' : ''}>Sent</option>
                                    <option value="accepted" ${quote.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                                    <option value="rejected" ${quote.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                                    <option value="expired" ${quote.status === 'expired' ? 'selected' : ''}>Expired</option>
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">
                        <div class="form-group">
                            <label>Currency</label>
                            <div class="select-wrap">
                                <select id="quote_currency" class="form-control">
                                    ${this.currencyOptions(quote.currency || store.state.systemSettings.currency)}
                                </select>
                                <i class="fa-solid fa-chevron-down caret"></i>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Total Price *</label>
                            <input type="number" id="quote_price" class="form-control" value="${quote.totalPrice || ''}" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Valid Until *</label>
                            <input type="date" id="quote_validity" class="form-control" value="${quote.validUntil || defaultValidityStr}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="quote_description" class="form-control" rows="3" placeholder="Describe the travel package, inclusions, and highlights...">${quote.description || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Internal Notes</label>
                        <textarea id="quote_notes" class="form-control" rows="2" placeholder="Notes for internal reference (not shown to client)">${quote.notes || ''}</textarea>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="Quotes.save('${id}')">${isEdit ? 'Update Quote' : 'Create Quote'}</button>
            `
        });
    },

    save(id) {
        const title = document.getElementById('quote_title').value;
        const clientRaw = document.getElementById('quote_client').value;
        const totalPrice = parseFloat(document.getElementById('quote_price').value);
        const validUntil = document.getElementById('quote_validity').value;

        if (!title) return UI.showToast('Proposal title is required', 'error');
        if (!clientRaw) return UI.showToast('Please select a client', 'error');
        if (isNaN(totalPrice) || totalPrice <= 0) return UI.showToast('Valid total price is required', 'error');
        if (!validUntil) return UI.showToast('Validity date is required', 'error');

        const [clientId, clientName, clientType, clientEmail] = clientRaw.split('|');

        const data = {
            id: id && id !== 'null' ? id : 'QT-' + Date.now(),
            title,
            clientId,
            clientName,
            clientEmail: clientEmail || '',
            type: clientType,
            currency: document.getElementById('quote_currency').value,
            totalPrice,
            subtotal: totalPrice,
            tax: 0,
            validUntil,
            description: document.getElementById('quote_description').value || '',
            notes: document.getElementById('quote_notes').value || '',
            status: document.getElementById('quote_status').value,
            items: id && id !== 'null' ? (store.state.quotes.find(q => String(q.id) === String(id))?.items || []) : [],
            createdAt: id && id !== 'null' ? (store.state.quotes.find(q => String(q.id) === String(id))?.createdAt || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
            agent: store.state.currentUser.name
        };

        store.saveQuote(data);
        UI.showToast(`Quote ${id && id !== 'null' ? 'updated' : 'created'} successfully`, 'success');
        Modal.close();
        this.render();
    },

    convertToBooking(id) {
        const quote = store.state.quotes.find(q => String(q.id) === String(id));
        if (!quote) return UI.showToast('Quote not found', 'error');

        UI.confirm('Convert to Booking', `Create a new booking from quote <b>${quote.id}</b>?`, () => {
            const booking = {
                id: 'BK-' + Date.now(),
                title: quote.title,
                clientId: quote.clientId,
                clientName: quote.clientName,
                clientEmail: quote.clientEmail,
                type: quote.type,
                dates: 'TBD',
                destination: '',
                travelers: 1,
                totalAmount: quote.totalPrice,
                paidAmount: 0,
                quoteId: quote.id,
                notes: quote.description || '',
                status: 'pending',
                createdAt: new Date().toISOString().split('T')[0],
                agent: store.state.currentUser.name
            };

            store.saveBooking(booking);

            // Update quote status to accepted
            quote.status = 'accepted';
            store.saveQuote(quote);

            Modal.close();
            UI.showToast('Booking created from quote!', 'success');
            handleRoute('bookings');
        });
    }
};

window.Quotes = Quotes;
