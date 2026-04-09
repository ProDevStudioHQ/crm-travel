
const Mail = {
    activeFolder: 'inbox',
    selectedMessage: null,
    activeLabel: null,
    searchTerm: '',
    _selected: new Set(),

    init() {
        console.log('Mail Module Initialized');
        this._selected = new Set();
    },

    _syncHeaderCheckbox() {
        const headerCb = document.getElementById('selectAllMail');
        if (!headerCb) return;
        const totalRows = document.querySelectorAll('input[data-sel-type="mail"][data-id]').length;
        const selectedRows = this._selected.size;
        headerCb.checked = totalRows > 0 && selectedRows === totalRows;
        headerCb.indeterminate = selectedRows > 0 && selectedRows < totalRows;

        const bulkActions = document.getElementById('mailBulkActions');
        const bulkCount = document.getElementById('bulkCountMail');
        if (bulkActions && bulkCount) {
            bulkCount.innerText = selectedRows;
            bulkActions.style.display = selectedRows > 0 ? 'flex' : 'none';
        }
    },

    toggleSelect(id, checked) {
        id = String(id);
        if (checked) this._selected.add(id);
        else this._selected.delete(id);
        this._syncHeaderCheckbox();
    },

    toggleSelectAll(checked) {
        const list = this._getActiveList();
        if (checked) {
            list.forEach(m => this._selected.add(String(m.id)));
        } else {
            this._selected.clear();
        }
        document.querySelectorAll('input[data-sel-type="mail"]').forEach(cb => cb.checked = checked);
        this._syncHeaderCheckbox();
    },

    _getActiveList() {
        const state = store.state;
        if (this.activeLabel) {
            const allEmails = [...state.mailInbox, ...state.mailHistory, ...state.mailDrafts, ...state.mailTrash];
            return allEmails.filter(m => m.labels && m.labels.includes(this.activeLabel));
        }
        switch (this.activeFolder) {
            case 'inbox': return state.mailInbox;
            case 'sent': return state.mailHistory;
            case 'draft': return state.mailDrafts;
            case 'trash': return state.mailTrash;
            case 'campaigns': return state.campaigns;
            default: return [];
        }
    },

    _restoreCheckboxes() {
        document.querySelectorAll('input[data-sel-type="mail"][data-id]').forEach(cb => {
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
        if (!ids.length) return;

        const actionText = this.activeFolder === 'trash' ? 'permanently delete' : 'move to trash';
        UI.confirm(
            'Bulk Delete Messages',
            `Are you sure you want to ${actionText} <b>${ids.length}</b> selected message(s)?`,
            () => {
                store.deleteMailBulk(this.activeFolder, ids);
                this.clearSelection();
                this.render();
                UI.showToast(`Messages ${this.activeFolder === 'trash' ? 'purged' : 'moved to trash'}`, 'success');
            },
            'danger'
        );
    },

    deleteAll() {
        const actionText = this.activeFolder === 'trash' ? 'permanently delete ALL' : 'move ALL to trash';
        UI.confirm(
            'WIPE FOLDER',
            `SOP CAUTION: You are about to ${actionText} messages in the current folder. This action may be irreversible.`,
            () => {
                store.deleteAllMail(this.activeFolder);
                this.clearSelection();
                this.render();
                UI.showToast('Folder cleared', 'warning');
            },
            'danger'
        );
    },

    render() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        let list = [];

        // Determine list based on folder or label filter
        if (this.activeLabel) {
            const allEmails = [...state.mailInbox, ...state.mailHistory, ...state.mailDrafts, ...state.mailTrash];
            list = allEmails.filter(m => m.labels && m.labels.includes(this.activeLabel));
        } else {
            switch (this.activeFolder) {
                case 'inbox': list = state.mailInbox; break;
                case 'sent': list = state.mailHistory; break;
                case 'draft': list = state.mailDrafts; break;
                case 'trash': list = state.mailTrash; break;
                case 'campaigns': list = state.campaigns; break;
            }
        }

        // Apply Search Filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            list = list.filter(m =>
                (m.subject && m.subject.toLowerCase().includes(term)) ||
                (m.sender && m.sender.toLowerCase().includes(term)) ||
                (m.recipient && m.recipient.toLowerCase().includes(term)) ||
                (m.body && m.body.toLowerCase().includes(term)) ||
                (m.preview && m.preview.toLowerCase().includes(term))
            );
        }

        content.innerHTML = `
            <div style="display:grid; grid-template-columns: 240px 1fr; gap:20px; height: calc(100vh - 120px);">
                <!-- Mail Sidebar -->
                <div class="sidebar-wrapper" style="display:flex; flex-direction:column; gap:20px; overflow-y:auto; padding-right:5px;">
                    <div class="card" style="padding:15px; display:flex; flex-direction:column; gap:10px;">
                        <button class="btn-primary" style="width:100%; margin-bottom:10px; justify-content:center; padding:12px;" onclick="Mail.openComposeModal()" title="Start a new professional email" aria-label="Compose new mail">
                            <i class="fa-solid fa-plus"></i> Compose Mail
                        </button>
                        <button class="btn-secondary" style="width:100%; margin-bottom:15px; justify-content:center; padding:12px;" onclick="TemplateManager.openEditor()" title="Create a new email template">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                        </button>
                        
                        <div class="nav-menu">
                            <div class="nav-item ${(!this.activeLabel && this.activeFolder === 'inbox') ? 'active' : ''}" onclick="Mail.switchFolder('inbox')" title="Incoming Communications" aria-label="Go to inbox">
                                <div class="nav-left">
                                    <i class="fa-solid fa-inbox nav-icon" style="color:var(--primary);"></i> Inbox
                                </div>
                                ${state.mailInbox.filter(m => !m.read).length ? `<span class="badge" style="background:var(--primary); font-size:9px; margin-left:auto;">${state.mailInbox.filter(m => !m.read).length}</span>` : ''}
                            </div>
                            <div class="nav-item ${(!this.activeLabel && this.activeFolder === 'sent') ? 'active' : ''}" onclick="Mail.switchFolder('sent')" title="Sent History" aria-label="Go to sent messages">
                                <div class="nav-left">
                                    <i class="fa-regular fa-paper-plane nav-icon" style="color:var(--success);"></i> Sent
                                </div>
                            </div>
                            <div class="nav-item ${(!this.activeLabel && this.activeFolder === 'draft') ? 'active' : ''}" onclick="Mail.switchFolder('draft')" title="Unfinished Messages" aria-label="Go to drafts">
                                <div class="nav-left">
                                    <i class="fa-regular fa-file nav-icon" style="color:var(--warning);"></i> Drafts
                                </div>
                            </div>
                            <div class="nav-item ${(!this.activeLabel && this.activeFolder === 'trash') ? 'active' : ''}" onclick="Mail.switchFolder('trash')" title="Recently Deleted" aria-label="Go to trash">
                                <div class="nav-left">
                                    <i class="fa-regular fa-trash-can nav-icon" style="color:var(--danger);"></i> Trash
                                </div>
                            </div>
                            <div class="nav-item ${(!this.activeLabel && this.activeFolder === 'campaigns') ? 'active' : ''}" onclick="Mail.switchFolder('campaigns')" title="Email Marketing Campaigns" aria-label="Go to campaigns">
                                <div class="nav-left">
                                    <i class="fa-solid fa-bullhorn nav-icon" style="color:#8E44AD;"></i> Campaigns
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Labels Sidebar -->
                    <div class="card" style="padding:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 5px;">
                            <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Labels</span>
                            <button class="icon-btn" style="width:24px; height:24px; font-size:12px;" onclick="Mail.openLabelsManager()" title="Manage Communication Labels" aria-label="Label settings">
                                <i class="fa-solid fa-gear"></i>
                            </button>
                        </div>
                        <div class="nav-menu">
                            ${state.mailLabels.map(l => `
                                <div class="nav-item ${this.activeLabel === l.id ? 'active' : ''}" onclick="Mail.filterByLabel(${l.id})" title="Filter by ${l.name}" aria-label="Filter ${l.name}">
                                    <div class="nav-left">
                                        <div style="width:10px; height:10px; border-radius:50%; background:${l.color}; margin-right:12px;"></div>
                                        <span>${l.name}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div style="margin-top:auto; padding:15px; background:rgba(0,158,247,0.05); border-radius:8px; font-size:11px; border:1px solid rgba(0,158,247,0.1);">
                        <div style="font-weight:700; color:var(--primary); margin-bottom:5px;">SMTP STATUS</div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:8px; height:8px; border-radius:50%; background:var(--success);"></div>
                            <span style="color:var(--text-secondary);">Connected: globaltravel.smtp</span>
                        </div>
                    </div>
                </div>

                <!-- Main Display Area -->
                <div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
                    ${this.selectedMessage ? this.renderMessageView() : `
                        ${this.renderFolderHeader()}
                        <div style="flex:1; overflow-y:auto;">
                            ${this.renderFolderContent(list)}
                        </div>
                    `}
                </div>
            </div>
        `;
        if (!this.selectedMessage) {
            this._restoreCheckboxes();
        }
    },

    renderFolderHeader() {
        let title = this.activeFolder.charAt(0).toUpperCase() + this.activeFolder.slice(1);
        if (this.activeLabel) {
            const label = store.state.mailLabels.find(l => l.id === this.activeLabel);
            title = `Label: ${label ? label.name : 'Unknown'}`;
        }

        return `
            <div style="padding:15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                <div style="display:flex; align-items:center; gap:20px;">
                    <h3 style="font-size:16px;">${title}</h3>
                    <div id="mailBulkActions" style="display:none; gap:10px; align-items:center; padding-left:20px; border-left:1px solid var(--border);">
                        <span style="font-size:12px; color:var(--text-muted);"><b id="bulkCountMail">0</b> selected</span>
                        <button class="action-menu-btn btn-danger" onclick="Mail.deleteSelected()" title="Delete selected messages"><i class="fa-solid fa-trash-can"></i></button>
                        <button class="action-menu-btn" style="color:var(--text-muted);" onclick="Mail.deleteAll()" title="Wipe entire folder"><i class="fa-solid fa-bomb"></i></button>
                    </div>
                </div>
                <div style="display:flex; gap:10px;">
                    <div class="search-box" style="width:250px;">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" placeholder="Search mail..." class="form-control" style="padding-left:35px;" value="${this.searchTerm}" onkeyup="Mail.handleSearch(this.value)">
                    </div>
                    <button class="btn-social" style="width:auto;" onclick="Mail.refreshFolder(this)" title="Refresh folder content" aria-label="Refresh list">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                </div>
            </div>
        `;
    },

    async refreshFolder(btn) {
        UI.showFeedback(btn, 'loading');

        if (this.activeFolder === 'inbox') {
            const res = await store.syncIMAPInbox();
            if (res.success && res.count > 0) {
                UI.showToast(`Synced ${res.count} new emails via IMAP`, 'success');
            } else if (!res.success) {
                UI.showToast(`IMAP Sync Error: ${res.message}`, 'error');
            }
        } else if (this.activeFolder === 'sent') {
            const res = await store.syncIMAPSentItems();
            if (res.success && res.count > 0) {
                UI.showToast(`Synced ${res.count} sent items via IMAP`, 'success');
            } else if (!res.success) {
                UI.showToast(`IMAP Sync Error: ${res.message}`, 'error');
            }
        } else {
            // Mock delay for other folders
            await new Promise(r => setTimeout(r, 800));
        }

        store.logAction('MAIL', 'REFRESH', this.activeFolder, 'success', 'Folder refreshed');
        UI.showFeedback(btn, 'success');
        this.render();
    },

    handleSearch(val) {
        this.searchTerm = val;
        this.render();
        // Maintain focus on input after render
        setTimeout(() => {
            const input = document.querySelector('.search-box input');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 0);
    },

    renderFolderContent(list) {
        if (this.activeFolder === 'campaigns' && !this.activeLabel) {
            return `
                <table class="data-table">
                    <thead><tr><th>Campaign Name</th><th>Recipients</th><th>Sent</th><th>Opened</th><th>Clicks</th><th>Status</th></tr></thead>
                    <tbody>
                        ${list.map((c, index) => `
                            <tr class="${index < 7 ? 'stagger-item' : ''}" style="${index < 7 ? `animation-delay: ${index * 40}ms` : ''}">
                                <td style="font-weight:600;">${c.name}</td>
                                <td>${c.recipients}</td>
                                <td>${c.sent}</td>
                                <td style="color:var(--success);">${c.opened} (${Math.round(c.opened / c.sent * 100)}%)</td>
                                <td style="color:var(--primary);">${c.clicks}</td>
                                <td><span class="badge" style="background:var(--success); color:white;">${c.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        if (list.length === 0) {
            return `<div style="text-align:center; padding:100px; color:var(--text-secondary); opacity:0.5;">
                <i class="fa-solid fa-folder-open" style="font-size:40px; margin-bottom:15px; display:block;"></i>
                No messages found.
            </div>`;
        }

        return `
            <table class="data-table">
                <thead><tr>
                    <th style="width:40px; text-align:center;">
                        <input type="checkbox" id="selectAllMail" onchange="Mail.toggleSelectAll(this.checked)" style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary);">
                    </th>
                    <th>${this.activeFolder === 'inbox' ? 'Sender' : 'Recipient'} / Subject</th>
                    <th style="width:120px;">Labels</th>
                    ${this.activeFolder === 'sent' ? '<th>Status</th>' : ''}
                    <th>Date</th>
                    <th style="text-align:right;">Actions</th>
                </tr></thead>
                <tbody>
                    ${list.map((m, index) => `
                        <tr class="${index < 7 ? 'stagger-item' : ''}" style="${index < 7 ? `animation-delay: ${index * 50}ms` : ''}; cursor:pointer; background:${(m.read === false) ? 'rgba(0,158,247,0.03)' : ''};" onclick="Mail.viewMessage(${m.id})">
                            <td style="text-align:center;" onclick="event.stopPropagation()">
                                <input type="checkbox" data-id="${m.id}" data-sel-type="mail" onchange="Mail.toggleSelect('${m.id}', this.checked)" style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary);">
                            </td>
                            <td>
                                <div style="font-weight:${(m.read === false) ? '700' : '400'}; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:300px;">${m.sender || m.recipient}</div>
                                <div style="font-size:11px; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:300px;">${m.subject || '(No Subject)'}</div>
                            </td>
                            <td>
                                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                                    ${this.renderMessageLabels(m)}
                                </div>
                            </td>
                            ${this.activeFolder === 'sent' ? `<td><span class="badge" style="background:${this.getStatusColor(m.status)}; color:white; font-size:9px;">${m.status.toUpperCase()}</span></td>` : ''}
                            <td style="font-size:12px; color:var(--text-muted);">${m.time}</td>
                            <td style="text-align:right;">
                                <div style="display:flex; gap:8px; justify-content:flex-end;">
                                    <button class="action-menu-btn" title="Edit Labels" aria-label="Label ${m.id}" onclick="event.stopPropagation(); Mail.openLabelPicker(${m.id})">
                                        <i class="fa-solid fa-tag"></i>
                                    </button>
                                    ${this.activeFolder === 'draft' ? `
                                        <button class="action-menu-btn btn-primary" title="Resume Draft" aria-label="Edit draft ${m.id}" onclick="event.stopPropagation(); Mail.editDraft(${m.id})">
                                            <i class="fa-solid fa-pen-to-square"></i>
                                        </button>
                                    ` : ''}
                                    ${this.activeFolder === 'trash' ? `
                                        <button class="action-menu-btn" style="color:var(--success);" title="Restore to Inbox" aria-label="Restore ${m.id}" onclick="event.stopPropagation(); Mail.restoreMessage(this, ${m.id})">
                                            <i class="fa-solid fa-rotate-left"></i>
                                        </button>
                                    ` : ''}
                                    <button class="action-menu-btn btn-danger" title="${this.activeFolder === 'trash' ? 'Permanently Delete' : 'Move to Trash'}" aria-label="Delete ${m.id}" onclick="event.stopPropagation(); Mail.deleteMessage(this, ${m.id})">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderMessageLabels(m) {
        if (!m.labels || m.labels.length === 0) return '';
        const visibleLabels = m.labels.slice(0, 2);
        const more = m.labels.length - 2;

        let html = visibleLabels.map(lid => {
            const l = store.state.mailLabels.find(lbl => lbl.id === lid);
            if (!l) return '';
            return `<span class="badge" style="background:${l.color}; color:white; font-size:8px; padding:2px 5px;">${l.name}</span>`;
        }).join('');

        if (more > 0) {
            html += `<span class="badge" style="background:var(--bg-hover); color:var(--text-secondary); font-size:8px;">+${more}</span>`;
        }
        return html;
    },

    renderMessageView() {
        const m = this.selectedMessage;

        return `
            <div style="display:flex; flex-direction:column; height:100%;">
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                    <button class="btn-social" style="width:auto;" onclick="Mail.closeMessage()" title="Return to list" aria-label="Back to folder"><i class="fa-solid fa-arrow-left"></i> Back</button>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="display:flex; gap:5px; margin-right:15px;">
                            ${this.renderMessageLabels(m)}
                        </div>
                        <button class="btn-social" style="color:var(--primary);" onclick="Mail.openLabelPicker(${m.id})" title="Adjust email tags" aria-label="Manage labels"><i class="fa-solid fa-tag"></i> Labels</button>
                        ${this.activeFolder === 'sent' && m.status === 'failed' ? `<button class="btn-primary" style="background:var(--primary);" onclick="Mail.resendMessage(${m.id})">Resend</button>` : ''}
                        <button class="action-menu-btn btn-danger" onclick="Mail.deleteMessage(this, ${m.id})" title="Delete this conversation" aria-label="Delete message"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
                <div style="padding:30px; overflow-y:auto; flex:1;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <div>
                            <h2 style="font-size:20px; margin-bottom:10px; font-weight:700;">${m.subject || '(No Subject)'}</h2>
                            <p style="font-size:13px; color:var(--text-secondary); line-height:1.5;">
                                <span style="color:var(--text-muted);">From:</span> <b>${m.sender || 'You'}</b> <br>
                                <span style="color:var(--text-muted);">To:</span> <b>${m.recipient || 'Me'}</b>
                            </p>
                        </div>
                        <div style="text-align:right; font-size:12px; color:var(--text-muted);">
                            ${m.time}
                        </div>
                    </div>
                    <div style="padding:25px; background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:10px; line-height:1.7; min-height:200px; white-space:pre-wrap; font-size:14px;">${m.body || m.preview || ''}</div>
                    
                    ${(this.activeFolder === 'inbox' || this.activeLabel) ? `
                    <div style="margin-top:30px; display:flex; gap:12px;">
                    <div style="margin-top:30px; display:flex; gap:12px;">
                        <button class="btn-primary" onclick="Mail.replyMessage(${m.id})" title="Start a reply thread" aria-label="Reply to sender"><i class="fa-solid fa-reply"></i> Reply</button>
                        <button class="btn-social" style="width:auto;" onclick="Mail.forwardMessage(${m.id})" title="Forward to another recipient" aria-label="Forward message"><i class="fa-solid fa-share"></i> Forward</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    getStatusColor(status) {
        switch (status) {
            case 'sent': return 'var(--primary)';
            case 'delivered': return 'var(--success)';
            case 'opened': return '#8E44AD';
            case 'failed': return 'var(--danger)';
            default: return 'var(--text-muted)';
        }
    },

    switchFolder(folder) {
        this.activeFolder = folder;
        this.activeLabel = null;
        this.selectedMessage = null;
        this.clearSelection();
        this.render();
    },

    filterByLabel(lid) {
        this.activeLabel = lid;
        this.activeFolder = 'label_filter';
        this.selectedMessage = null;
        this.render();
    },

    viewMessage(id) {
        const allEmails = [...store.state.mailInbox, ...store.state.mailHistory, ...store.state.mailDrafts, ...store.state.mailTrash];
        const msg = allEmails.find(m => m.id === id);

        if (msg) {
            this.selectedMessage = msg;
            if (store.state.mailInbox.includes(msg)) msg.read = true;
            this.render();
        }
    },

    closeMessage() {
        this.selectedMessage = null;
        this.render();
    },

    openLabelPicker(mid) {
        const allEmails = [...store.state.mailInbox, ...store.state.mailHistory, ...store.state.mailDrafts, ...store.state.mailTrash];
        const msg = allEmails.find(m => m.id === mid);
        if (!msg) return;

        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        overlay.classList.remove('hidden');
        title.innerHTML = 'Apply Labels (Tags)';

        body.innerHTML = `
            <div style="margin-bottom:20px;">
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:15px;">Organize communications by selecting appropriate labels.</p>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    ${store.state.mailLabels.map(l => `
                        <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--border); border-radius:8px; cursor:pointer; transition:all 0.2s; background:${msg.labels?.includes(l.id) ? 'rgba(0,158,247,0.08)' : 'transparent'}">
                            <input type="checkbox" value="${l.id}" ${msg.labels?.includes(l.id) ? 'checked' : ''} onchange="this.parentElement.style.background = this.checked ? 'rgba(0,158,247,0.08)' : 'transparent'" style="width:16px; height:16px;">
                            <div style="width:12px; height:12px; border-radius:50%; background:${l.color}; shadow:0 0 5px ${l.color}50;"></div>
                            <span style="font-size:13px; font-weight:600;">${l.name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px;">
                <button class="btn-social" onclick="Clients.closeModal()" title="Cancel changes" aria-label="Cancel">Cancel</button>
                <button class="btn-primary" onclick="Mail.saveMsgLabels(this, ${mid})" title="Apply selected tags" aria-label="Confirm labels">Apply Labels</button>
            </div>
        `;
    },

    saveMsgLabels(btn, mid) {
        const allEmails = [...store.state.mailInbox, ...store.state.mailHistory, ...store.state.mailDrafts, ...store.state.mailTrash];
        const msg = allEmails.find(m => m.id === mid);
        if (!msg) return;

        const checkboxes = document.querySelectorAll('#modalBody input[type="checkbox"]:checked');
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            msg.labels = Array.from(checkboxes).map(cb => parseInt(cb.value));
            store.logAction('MAIL', 'LABEL_APPLY', mid, 'success', `Applied ${msg.labels.length} labels`);
            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                Clients.closeModal();
                this.render();
            }, 500);
        }, 600);
    },

    openLabelsManager() {
        const user = store.state.currentUser;
        if (user.role !== 'admin' && user.role !== 'manager') {
            alert('Access Denied: Only Admins/Managers can manage labels (SOP Rule 9).');
            return;
        }

        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        overlay.classList.remove('hidden');
        title.innerHTML = 'Email Label Management';

        body.innerHTML = `
            <div style="margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid var(--border);">
                <h4 style="font-size:14px; margin-bottom:12px; font-weight:700;">Create Professional Label</h4>
                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <input type="text" id="newLabelName" class="form-control" placeholder="e.g. Urgent Inquiry" maxlength="30">
                    </div>
                    <input type="color" id="newLabelColor" value="#009EF7" style="width:40px; padding:0; height:38px; border:none; cursor:pointer; background:none;">
                    <button class="btn-primary" onclick="Mail.createLabel(this)" style="width:auto;" title="Add new category" aria-label="Create label"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>

            <div style="max-height:300px; overflow-y:auto; padding-right:5px;">
                <h4 style="font-size:12px; margin-bottom:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Global Labels</h4>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${store.state.mailLabels.map(l => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid var(--border); border-radius:10px; background:rgba(255,255,255,0.01);">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:14px; height:14px; border-radius:50%; background:${l.color};"></div>
                                <span style="font-weight:700; font-size:13px;">${l.name}</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="action-menu-btn" title="Rename Category" aria-label="Edit ${l.name}" onclick="Mail.editLabelPrompt(${l.id})"><i class="fa-solid fa-pen"></i></button>
                                <button class="action-menu-btn btn-danger" title="Purge Category" aria-label="Delete ${l.name}" onclick="Mail.deleteLabel(this, ${l.id})"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    createLabel(btn) {
        const nameInput = document.getElementById('newLabelName');
        const colorInput = document.getElementById('newLabelColor');
        const name = nameInput.value.trim();

        if (!name) { UI.showFeedback(btn, 'error'); return; }
        if (store.state.mailLabels.some(l => l.name.toLowerCase() === name.toLowerCase())) {
            alert('Label name must be unique.');
            UI.showFeedback(btn, 'error');
            return;
        }

        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const newLabel = { id: Date.now(), name: name, color: colorInput.value };
            store.state.mailLabels.push(newLabel);
            store.logAction('MAIL', 'LABEL_CREATE', name, 'success', 'New communication label added');
            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                this.openLabelsManager();
                this.render();
            }, 500);
        }, 600);
    },

    editLabelPrompt(lid) {
        const label = store.state.mailLabels.find(l => l.id === lid);

        // Using UI.confirm-like template for rename to avoid native prompt
        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.innerHTML = 'Rename Label';
        body.innerHTML = `
            <div style="margin-bottom:20px;">
                <label style="font-size:12px; color:var(--text-muted); margin-bottom:8px; display:block;">Label Name</label>
                <input type="text" id="renameLabelInput" class="form-control" value="${label.name}" maxlength="30">
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px;">
                <button class="btn-social" onclick="Mail.openLabelsManager()">Cancel</button>
                <button class="btn-primary" onclick="Mail.saveLabelRename(this, ${lid})">Save Changes</button>
            </div>
        `;
    },

    saveLabelRename(btn, lid) {
        const label = store.state.mailLabels.find(l => l.id === lid);
        const name = document.getElementById('renameLabelInput').value.trim();
        if (!name) return;

        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const oldName = label.name;
            label.name = name;
            store.logAction('MAIL', 'LABEL_RENAME', lid, 'success', `Renamed ${oldName} to ${name}`);
            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                this.openLabelsManager();
                this.render();
            }, 500);
        }, 600);
    },

    deleteLabel(btn, lid) {
        const label = store.state.mailLabels.find(l => l.id === lid);
        UI.confirm('Delete Label', `Permanently remove category <b>${label.name}</b>? It will be detached from all messages.`, () => {
            store.state.mailLabels = store.state.mailLabels.filter(l => l.id !== lid);
            const allEmails = [...store.state.mailInbox, ...store.state.mailHistory, ...store.state.mailDrafts, ...store.state.mailTrash];
            allEmails.forEach(m => { if (m.labels) m.labels = m.labels.filter(id => id !== lid); });
            store.logAction('MAIL', 'LABEL_DELETE', lid, 'success', `Deleted label: ${label.name}`);
            if (this.activeLabel === lid) this.activeLabel = null;
            this.openLabelsManager();
            this.render();
        }, 'danger');
    },

    deleteMessage(btn, id) {
        if (this.activeFolder === 'trash') {
            UI.confirm('Purge Message', 'Permanently delete this message from the server? This is IRREVERSIBLE.', () => {
                UI.showFeedback(btn, 'loading');
                setTimeout(() => {
                    store.state.mailTrash = store.state.mailTrash.filter(m => m.id !== id);
                    store.logAction('MAIL', 'PURGE', id, 'success', 'Message permanently deleted');
                    this.selectedMessage = null;
                    this.render();
                }, 800);
            }, 'danger');
            return;
        }

        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            let list;
            if (store.state.mailInbox.find(m => m.id === id)) list = store.state.mailInbox;
            else if (store.state.mailHistory.find(m => m.id === id)) list = store.state.mailHistory;
            else if (store.state.mailDrafts.find(m => m.id === id)) list = store.state.mailDrafts;

            const msgIndex = list?.findIndex(m => m.id === id);
            if (msgIndex > -1) {
                const msg = list.splice(msgIndex, 1)[0];
                msg.originalFolder = this.activeFolder === 'label_filter' ? 'inbox' : this.activeFolder;
                store.state.mailTrash.push(msg);
                store.logAction('MAIL', 'DELETE_SOFT', id, 'success', 'Moved to trash');
                UI.showFeedback(btn, 'success');
                setTimeout(() => {
                    this.selectedMessage = null;
                    this.render();
                }, 500);
            }
        }, 600);
    },

    restoreMessage(btn, id) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const trash = store.state.mailTrash;
            const msgIndex = trash.findIndex(m => m.id === id);
            if (msgIndex > -1) {
                const msg = trash.splice(msgIndex, 1)[0];
                const targetFolder = msg.originalFolder || 'inbox';
                if (targetFolder === 'inbox') store.state.mailInbox.push(msg);
                else if (targetFolder === 'sent') store.state.mailHistory.push(msg);
                else if (targetFolder === 'draft') store.state.mailDrafts.push(msg);

                store.logAction('MAIL', 'RESTORE', id, 'success', `Restored to ${targetFolder}`);
                UI.showFeedback(btn, 'success');
                setTimeout(() => this.render(), 500);
            }
        }, 600);
    },

    editDraft(id) {
        const draft = store.state.mailDrafts.find(d => d.id === id);
        if (draft) this.openComposeModal(draft);
    },

    openComposeModal(editData = null) {
        const templates = store.state.mailTemplates || [];
        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        overlay.classList.remove('hidden');
        title.innerHTML = editData ? 'Edit Email Draft' : 'Compose Professional Email';
        body.innerHTML = `
            <form id="composeMailForm" onsubmit="Mail.handleSend(event, ${editData ? editData.id : 'null'})">
                <div style="display:grid; grid-template-columns: 1fr 200px; gap:20px; margin-bottom:20px;">
                    <div class="form-group">
                        <label>To (Recipient Email) <span style="color:var(--danger)">*</span></label>
                        <input type="email" class="form-control" name="recipient" required placeholder="client@example.com" value="${editData?.recipient || ''}" title="Enter valid email adress">
                    </div>
                    <div class="form-group">
                        <label>Select Template</label>
                        <div class="select-wrap">
                            <select class="form-control input-select" onchange="Mail.loadTemplate(this.value)" title="Auto-populate from library">
                                <option value="">No Template</option>
                                ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom:20px;">
                    <label>Subject (SOP Compliance) <span style="color:var(--danger)">*</span></label>
                    <input type="text" class="form-control" name="subject" required maxlength="150" placeholder="e.g. Booking Confirmation - #REF123" value="${editData?.subject || ''}" title="Professional subject line required">
                </div>

                <div class="form-group" style="margin-bottom:20px;">
                    <label>Message Content <span style="color:var(--danger)">*</span></label>
                    <textarea class="form-control" name="body" style="height:200px; resize:none;" required placeholder="Dear Client...">${editData?.body || ''}</textarea>
                </div>

                <div style="padding:15px; border:1px dashed var(--border); border-radius:10px; margin-bottom:25px; background:rgba(255,255,255,0.01);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-paperclip"></i> Max Size: 10 MB (PDF/JPG/PNG)</span>
                        <input type="file" id="mailAttach" style="font-size:11px; cursor:pointer;" aria-label="Attach clinical files">
                    </div>
                </div>

                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button type="button" class="btn-social" style="width:auto;" onclick="Mail.saveAsDraft(event, ${editData ? editData.id : 'null'})" title="Keep as draft" aria-label="Save draft">Save Draft</button>
                    <button type="button" class="btn-cancel" onclick="Clients.closeModal()" title="Abandon message" aria-label="Discard">Discard</button>
                    <button type="submit" class="btn-primary" style="padding:0 35px;" title="Review and dispatch email" aria-label="Send email"><i class="fa-regular fa-paper-plane"></i> Send Securely</button>
                </div>
            </form>
        `;
    },

    saveAsDraft(e, existingId) {
        const btn = e.currentTarget;
        const form = document.getElementById('composeMailForm');
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const draft = {
                id: existingId || Date.now(),
                recipient: form.recipient.value,
                subject: form.subject.value,
                body: form.body.value,
                time: new Date().toLocaleString(),
                labels: []
            };

            if (existingId) {
                const idx = store.state.mailDrafts.findIndex(d => d.id === existingId);
                store.state.mailDrafts[idx] = draft;
            } else {
                store.state.mailDrafts.unshift(draft);
            }

            store.logAction('MAIL', 'DRAFT_SAVE', draft.id, 'success', 'Saved email draft');
            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                Clients.closeModal();
                this.render();
            }, 500);
        }, 600);
    },

    handleSend(e, existingDraftId) {
        e.preventDefault();
        const btn = e.submitter;
        const form = e.target;
        const file = document.getElementById('mailAttach').files[0];
        if (file && file.size > 10 * 1024 * 1024) { alert('ERROR: Attachment too large (Max 10MB).'); return; }

        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            const newMail = {
                id: Date.now(),
                type: 'single',
                recipient: form.recipient.value,
                subject: form.subject.value,
                body: form.body.value,
                status: 'sent',
                time: new Date().toLocaleString(),
                labels: []
            };

            store.state.mailHistory.unshift(newMail);
            if (existingDraftId) store.state.mailDrafts = store.state.mailDrafts.filter(d => d.id !== existingDraftId);

            store.logAction('MAIL', 'SEND', newMail.id, 'success', `To: ${newMail.recipient}`);
            UI.showFeedback(btn, 'success');
            setTimeout(() => {
                Clients.closeModal();
                this.render();
            }, 600);
        }, 1800);
    },

    replyMessage(id) {
        const m = this.selectedMessage;
        if (!m) return;

        const replyBody = `\n\n\n--------------------------------\nOn ${m.time}, ${m.sender || 'You'} wrote:\n\n${m.body || m.preview}`;
        const draft = {
            id: null, // New draft
            recipient: m.sender === 'You' ? m.recipient : m.sender,
            subject: m.subject.startsWith('Re:') ? m.subject : `Re: ${m.subject}`,
            body: replyBody
        };
        this.openComposeModal(draft);
    },

    forwardMessage(id) {
        const m = this.selectedMessage;
        if (!m) return;

        const fwdBody = `\n\n\n--------------------------------\nExample Forwarded Message\nFrom: ${m.sender}\nDate: ${m.time}\nSubject: ${m.subject}\n\n${m.body || m.preview}`;
        const draft = {
            id: null,
            recipient: '',
            subject: m.subject.startsWith('Fwd:') ? m.subject : `Fwd: ${m.subject}`,
            body: fwdBody
        };
        this.openComposeModal(draft);
    },

    loadTemplate(id) {
        if (!id) return;
        const template = store.state.mailTemplates.find(t => t.id == id);
        if (template) {
            const form = document.getElementById('composeMailForm');
            if (form) {
                // Determine name to use for fallback
                const user = store.state.currentUser;
                // Simple replace for {name}
                let body = template.body.replace('{name}', 'Client');

                form.subject.value = template.subject;
                form.body.value = body;
            }
        }
    },

    resendMessage(id) {
        // Logic to resend implies taking a failed sent message and trying again.
        // For simulation, we'll find it, update status to sent, and move to top.
        const msg = store.state.mailHistory.find(m => m.id === id);
        if (msg) {
            if (confirm('Resend this message?')) {
                msg.status = 'sent';
                msg.time = new Date().toLocaleString();
                // Move to top
                store.state.mailHistory = store.state.mailHistory.filter(m => m.id !== id);
                store.state.mailHistory.unshift(msg);

                store.logAction('MAIL', 'RESEND', id, 'success', 'Message resent');
                UI.showToast('Message resent successfully', 'success');
                this.render();
            }
        }
    }
};

window.Mail = Mail;
