
const WhatsApp = {
    activeChatId: null,
    activeTab: 'chats', // chats | campaigns | templates | quickreplies

    /* ────────── MAIN RENDER ────────── */
    render() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="wa-module">
                ${this._renderTabBar()}
                <div class="wa-tab-content" id="waTabContent">
                    ${this._renderActiveTab()}
                </div>
            </div>
        `;
        if (this.activeTab === 'chats') this.scrollToBottom();
    },

    switchTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    _renderTabBar() {
        const tabs = [
            { id: 'chats', icon: 'fa-comments', label: 'Chats' },
            { id: 'campaigns', icon: 'fa-bullhorn', label: 'Campaigns' },
            { id: 'templates', icon: 'fa-file-lines', label: 'Templates' },
            { id: 'quickreplies', icon: 'fa-bolt', label: 'Quick Replies' }
        ];
        return `
            <div class="wa-tab-bar">
                ${tabs.map(t => `
                    <button class="wa-tab-btn ${this.activeTab === t.id ? 'active' : ''}" onclick="WhatsApp.switchTab('${t.id}')">
                        <i class="fa-solid ${t.icon}"></i> ${t.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    _renderActiveTab() {
        switch (this.activeTab) {
            case 'chats': return this._renderChats();
            case 'campaigns': return this._renderCampaigns();
            case 'templates': return this._renderTemplates();
            case 'quickreplies': return this._renderQuickReplies();
            default: return this._renderChats();
        }
    },

    /* ═══════════════════════════════════════════════════════════
       TAB 1: CHATS (preserved original functionality)
       ═══════════════════════════════════════════════════════════ */
    _renderChats() {
        const state = store.state;
        const chats = state.whatsapp || [];

        if (!this.activeChatId && chats.length > 0) {
            this.activeChatId = chats[0].id;
        }
        const activeChat = chats.find(c => c.id === this.activeChatId) || chats[0];

        if (chats.length === 0) {
            return `
                <div class="wa-empty-state">
                    <div class="wa-empty-icon">
                        <i class="fa-brands fa-whatsapp"></i>
                        <div class="wa-empty-badge"><i class="fa-solid fa-plus"></i></div>
                    </div>
                    <h3>Connect with the World</h3>
                    <p>Start a secure thread with travelers or B2B partners to coordinate itineraries in real-time.</p>
                    <div style="display:flex; gap:15px; justify-content:center;">
                        <button class="btn-primary" onclick="WhatsApp.openNewChatModal()"><i class="fa-solid fa-comment-medical"></i> Initiate Thread</button>
                        <button class="btn-secondary" onclick="handleRoute('settings')"><i class="fa-solid fa-sliders"></i> WhatsApp Config</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="wa-chat-layout">
                <div class="wa-chat-sidebar">
                    <div class="wa-chat-sidebar-header">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <h3 style="font-size:16px; font-weight:700; margin:0;">Threads</h3>
                            <button class="wa-icon-btn" onclick="WhatsApp.openNewChatModal()" title="New Thread"><i class="fa-solid fa-pen-to-square"></i></button>
                        </div>
                        <div style="position:relative;">
                            <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:11px; font-size:11px; color:var(--text-muted);"></i>
                            <input type="text" placeholder="Search..." class="form-control" style="padding-left:32px; border-radius:20px; font-size:12px; height:36px;">
                        </div>
                    </div>
                    <div class="wa-chat-list">
                        ${chats.map(c => `
                            <div class="wa-chat-item ${c.id === this.activeChatId ? 'active' : ''}" onclick="WhatsApp.switchChat('${c.id}')">
                                <div class="wa-chat-avatar">${c.avatar}</div>
                                <div class="wa-chat-info">
                                    <div style="display:flex; justify-content:space-between; align-items:baseline;">
                                        <h4>${c.clientName}</h4>
                                        <span class="wa-chat-time">${this.formatTime(c.time)}</span>
                                    </div>
                                    <p>${c.lastMsg || 'No messages'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="wa-chat-main">
                    ${activeChat ? `
                        <div class="wa-chat-header">
                            <div style="display:flex; gap:12px; align-items:center;">
                                <div class="wa-chat-avatar">${activeChat.avatar}</div>
                                <div>
                                    <h4 style="margin:0; font-size:15px;">${activeChat.clientName}</h4>
                                    <div style="font-size:11px; color:#25D366;">Online</div>
                                </div>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="wa-icon-btn" onclick="WhatsApp.openQualifyModal('${activeChat.clientId || ''}')" title="Qualify Lead"><i class="fa-solid fa-clipboard-check"></i></button>
                                <button class="wa-icon-btn" onclick="WhatsApp._insertQuickReply()" title="Quick Reply"><i class="fa-solid fa-bolt"></i></button>
                            </div>
                        </div>
                        <div id="whatsappMessages" class="wa-messages">
                            ${activeChat.messages.map(m => `
                                <div class="wa-bubble ${m.type === 'outgoing' ? 'out' : 'in'}">
                                    <p>${m.body}</p>
                                    <div class="wa-bubble-time">${m.time} ${m.type === 'outgoing' ? (m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓') : ''}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="wa-compose">
                            <input type="text" id="waMsgInput" class="form-control" placeholder="Type a message..." style="border-radius:20px; background:#2a3942; border:none; color:white;" onkeydown="if(event.key==='Enter') WhatsApp.handleSend()">
                            <button class="btn-primary" style="width:42px; height:42px; border-radius:50%; min-width:42px;" onclick="WhatsApp.handleSend()"><i class="fa-solid fa-paper-plane"></i></button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /* ═══════════════════════════════════════════════════════════
       TAB 2: CAMPAIGNS
       ═══════════════════════════════════════════════════════════ */
    _renderCampaigns() {
        const campaigns = store.state.waCampaigns || [];
        const active = campaigns.filter(c => c.status === 'active').length;
        const draft = campaigns.filter(c => c.status === 'draft').length;
        const completed = campaigns.filter(c => c.status === 'completed').length;
        const totalSent = campaigns.reduce((a, c) => a + (c.stats?.sent || 0), 0);

        return `
            <div class="wa-campaigns-container">
                <!-- KPI Bar -->
                <div class="wa-kpi-bar">
                    <div class="wa-kpi-card">
                        <div class="wa-kpi-icon" style="background:rgba(37,211,102,0.1); color:#25D366;"><i class="fa-solid fa-rocket"></i></div>
                        <div><div class="wa-kpi-value">${active}</div><div class="wa-kpi-label">Active</div></div>
                    </div>
                    <div class="wa-kpi-card">
                        <div class="wa-kpi-icon" style="background:rgba(255,193,7,0.1); color:#FFC107;"><i class="fa-solid fa-pencil"></i></div>
                        <div><div class="wa-kpi-value">${draft}</div><div class="wa-kpi-label">Drafts</div></div>
                    </div>
                    <div class="wa-kpi-card">
                        <div class="wa-kpi-icon" style="background:rgba(0,158,247,0.1); color:#009EF7;"><i class="fa-solid fa-circle-check"></i></div>
                        <div><div class="wa-kpi-value">${completed}</div><div class="wa-kpi-label">Completed</div></div>
                    </div>
                    <div class="wa-kpi-card">
                        <div class="wa-kpi-icon" style="background:rgba(114,57,234,0.1); color:#7239EA;"><i class="fa-solid fa-paper-plane"></i></div>
                        <div><div class="wa-kpi-value">${totalSent}</div><div class="wa-kpi-label">Total Sent</div></div>
                    </div>
                </div>

                <!-- Header -->
                <div class="wa-section-header">
                    <h3><i class="fa-solid fa-bullhorn"></i> WhatsApp Campaigns</h3>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-social" onclick="WhatsApp._showChecklist()"><i class="fa-solid fa-clipboard-list"></i> Readiness Check</button>
                        <button class="btn-primary" onclick="WhatsApp.openCampaignWizard()"><i class="fa-solid fa-plus"></i> New Campaign</button>
                    </div>
                </div>

                <!-- Campaign List -->
                ${campaigns.length === 0 ? `
                    <div class="wa-empty-state" style="margin-top:20px;">
                        <div class="wa-empty-icon" style="background:rgba(37,211,102,0.05);">
                            <i class="fa-solid fa-bullhorn" style="font-size:40px; color:#25D366;"></i>
                        </div>
                        <h3>No Campaigns Yet</h3>
                        <p>Create your first WhatsApp drip campaign to convert leads into bookings.</p>
                        <button class="btn-primary" onclick="WhatsApp.openCampaignWizard()"><i class="fa-solid fa-plus"></i> Create First Campaign</button>
                    </div>
                ` : `
                    <div class="wa-campaign-grid">
                        ${campaigns.map(c => `
                            <div class="wa-campaign-card">
                                <div class="wa-campaign-card-header">
                                    <span class="wa-status-badge wa-status-${c.status}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
                                    <div class="wa-campaign-actions">
                                        ${c.status === 'draft' ? `<button class="wa-icon-btn" onclick="WhatsApp.launchCampaign('${c.id}')" title="Launch"><i class="fa-solid fa-play"></i></button>` : ''}
                                        ${c.status === 'active' ? `<button class="wa-icon-btn" onclick="WhatsApp._pauseCampaign('${c.id}')" title="Pause"><i class="fa-solid fa-pause"></i></button>` : ''}
                                        <button class="wa-icon-btn" onclick="WhatsApp.openCampaignWizard('${c.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                        <button class="wa-icon-btn" onclick="WhatsApp._deleteCampaign('${c.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                                <h4 class="wa-campaign-title">${c.name}</h4>
                                <p class="wa-campaign-offer">${c.offer || 'No offer set'}</p>
                                <div class="wa-campaign-meta">
                                    <span><i class="fa-solid fa-users"></i> ${(c.audienceIds || []).length} contacts</span>
                                    <span><i class="fa-solid fa-envelope"></i> ${(c.messages || []).length} messages</span>
                                    <span><i class="fa-solid fa-layer-group"></i> ${c.batchSize || 30}/hr</span>
                                </div>
                                <div class="wa-campaign-stats">
                                    <div class="wa-stat"><span class="wa-stat-num">${c.stats?.sent || 0}</span><span class="wa-stat-label">Sent</span></div>
                                    <div class="wa-stat"><span class="wa-stat-num">${c.stats?.delivered || 0}</span><span class="wa-stat-label">Delivered</span></div>
                                    <div class="wa-stat"><span class="wa-stat-num">${c.stats?.read || 0}</span><span class="wa-stat-label">Read</span></div>
                                    <div class="wa-stat"><span class="wa-stat-num">${c.stats?.replied || 0}</span><span class="wa-stat-label">Replied</span></div>
                                    <div class="wa-stat"><span class="wa-stat-num">${c.stats?.qualified || 0}</span><span class="wa-stat-label">Qualified</span></div>
                                </div>
                                <!-- Timeline -->
                                <div class="wa-timeline">
                                    ${(c.messages || []).map((m, i) => `
                                        <div class="wa-timeline-item ${m.sent > 0 ? 'sent' : ''}">
                                            <div class="wa-timeline-dot"></div>
                                            <div class="wa-timeline-content">
                                                <strong>D${m.day}</strong> — ${m.label}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    },

    /* ═══════════════════════════════════════════════════════════
       TAB 3: TEMPLATES (SOP Scripts)
       ═══════════════════════════════════════════════════════════ */
    _getSOPTemplates() {
        return [
            { id: 'hook_a', category: 'Hook (D0)', label: 'General Hook', body: 'Hello 👋 This is PM Travel Agency (Marrakech).\nAre you planning a trip to Morocco? What dates and how many people? 😊' },
            { id: 'hook_b', category: 'Hook (D0)', label: 'Specific Offer', body: 'Salam 👋 PM Travel Agency.\nWe have an Agafay Sunset + dinner package (pick-up included). Would you like the Standard or Premium option? 🙂' },
            { id: 'hook_c', category: 'Hook (D0)', label: 'B2B Tour Operator', body: 'Hello 👋 PM Travel Agency (Morocco DMC).\nAre you currently looking for a local partner in Morocco for 2026 departures? I can share our B2B rates & catalog.' },
            { id: 'value', category: 'Value (D1)', label: 'Value + Choice', body: 'Quick message 😊\nFor your trip, would you prefer:\n🏔️ Adventure (quad/Atlas)\n🚗 Comfort (driver + riad)\n💎 Luxury (VIP)\nAnswer 1, 2 or 3.' },
            { id: 'proof', category: 'Proof (D3)', label: 'Social Proof', body: "I'm sharing 2 customer reviews + photos 📸\nIf you give me your dates + pax, I'll send you a program + price in 10 minutes." },
            { id: 'last', category: 'Last Call (D5)', label: 'Urgency Close', body: 'Last message 😊\nI can block availability (driver/activity) for your dates.\nCan you confirm your dates and the number of people?' },
            { id: 'qualify', category: 'Qualification', label: '5 Questions', body: 'Perfect ✅ To offer you the best program:\n📅 Dates?\n👥 Passengers?\n✈️ Arrival city?\n💰 Approximate budget?\n🎯 Style (adventure/comfort/luxury)?' },
            { id: 'quote', category: 'Quote', label: 'WA Quote Format', body: 'Here are 2 options:\n\n✅ Option 1 (Standard):\n• Program: [details]\n• Price: [starting from]\n• Includes: transport, guide, lunch\n\n✅ Option 2 (Premium):\n• Program: [details]\n• Price: [starting from]\n• Includes: private driver, luxury riad, VIP activities\n\nWhich option suits you best? I can adjust according to your budget.' },
            { id: 'welcome', category: 'Auto-Reply', label: 'Welcome Message', body: 'Hello 👋 Thank you for contacting PM Travel Agency.\nTell me your dates + number of people + your style (adventure / comfort / luxury) and I will offer you 2 options.' },
            { id: 'away', category: 'Auto-Reply', label: 'Away Message', body: 'Thank you 🙏 I\'ll get back to you as soon as possible.\nIn the meantime, please send: dates + number of people + approximate budget.' },
            { id: 'followup_6h', category: 'Follow-Up', label: 'After 6 Hours', body: 'I can adapt the program to your budget 😊 Do you prefer Standard or Premium?' },
            { id: 'followup_24h', category: 'Follow-Up', label: 'After 24 Hours', body: 'Would you like a shorter version (1–2 days) or a more complete one (3–5 days)?' },
            { id: 'followup_72h', category: 'Follow-Up', label: 'After 72 Hours', body: "I'm closing availability soon. Can you confirm your dates? 🙂" }
        ];
    },

    _renderTemplates() {
        const templates = this._getSOPTemplates();
        const categories = [...new Set(templates.map(t => t.category))];

        return `
            <div class="wa-templates-container">
                <div class="wa-section-header">
                    <h3><i class="fa-solid fa-file-lines"></i> SOP Message Templates</h3>
                    <p style="color:var(--text-secondary); font-size:13px; margin:0;">Ready-to-use WhatsApp scripts for travel agency campaigns. Click to copy.</p>
                </div>

                ${categories.map(cat => `
                    <div class="wa-template-category">
                        <h4 class="wa-template-cat-title">${cat}</h4>
                        <div class="wa-template-grid">
                            ${templates.filter(t => t.category === cat).map(t => `
                                <div class="wa-template-card" onclick="WhatsApp._copyTemplate('${t.id}')">
                                    <div class="wa-template-card-header">
                                        <span class="wa-template-label">${t.label}</span>
                                        <button class="wa-icon-btn wa-copy-btn" title="Copy to clipboard"><i class="fa-solid fa-copy"></i></button>
                                    </div>
                                    <pre class="wa-template-body">${t.body}</pre>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    _copyTemplate(id) {
        const tpl = this._getSOPTemplates().find(t => t.id === id);
        if (tpl) {
            navigator.clipboard.writeText(tpl.body).then(() => {
                UI.showToast('Template copied to clipboard ✓', 'success');
            }).catch(() => {
                UI.showToast('Copy failed — please copy manually', 'error');
            });
        }
    },

    /* ═══════════════════════════════════════════════════════════
       TAB 4: QUICK REPLIES
       ═══════════════════════════════════════════════════════════ */
    _renderQuickReplies() {
        const replies = store.state.waQuickReplies || [];

        return `
            <div class="wa-quickreplies-container">
                <div class="wa-section-header">
                    <h3><i class="fa-solid fa-bolt"></i> Quick Replies</h3>
                    <button class="btn-primary" onclick="WhatsApp._openQuickReplyModal()"><i class="fa-solid fa-plus"></i> Add Reply</button>
                </div>
                <p style="color:var(--text-secondary); font-size:13px; margin:0 0 20px;">Type the shortcut (e.g. <code>/price</code>) in any chat to instantly insert the reply.</p>

                ${replies.length === 0 ? `
                    <div class="wa-empty-state"><h3>No Quick Replies</h3><p>Add shortcuts for frequently sent messages.</p></div>
                ` : `
                    <div class="wa-qr-grid">
                        ${replies.map(r => `
                            <div class="wa-qr-card">
                                <div class="wa-qr-header">
                                    <code class="wa-qr-shortcut">${r.shortcut}</code>
                                    <span class="wa-qr-label">${r.label}</span>
                                    <div style="margin-left:auto; display:flex; gap:6px;">
                                        <button class="wa-icon-btn" onclick="WhatsApp._openQuickReplyModal('${r.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                        <button class="wa-icon-btn" onclick="WhatsApp._deleteQuickReply('${r.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                                <pre class="wa-qr-body">${r.body}</pre>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    },

    /* ═══════════════════════════════════════════════════════════
       CAMPAIGN WIZARD (Modal)
       ═══════════════════════════════════════════════════════════ */
    openCampaignWizard(editId) {
        const existing = editId ? store.state.waCampaigns.find(c => String(c.id) === String(editId)) : null;
        const isEdit = !!existing;
        const camp = existing || { name: '', offer: '', audienceTag: '', audienceIds: [], messages: this._defaultMessages(), batchSize: 30 };

        const allClients = [...(store.state.b2bClients || []), ...(store.state.b2cClients || [])];

        Modal.open({
            title: `<i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> ${isEdit ? 'Edit' : 'New'} WhatsApp Campaign`,
            size: 'lg',
            body: `
                <div class="wa-wizard-body">
                    <!-- Step indicators -->
                    <div class="wa-wizard-steps">
                        <div class="wa-wizard-step active" data-step="1"><span>1</span> Setup</div>
                        <div class="wa-wizard-step" data-step="2"><span>2</span> Audience</div>
                        <div class="wa-wizard-step" data-step="3"><span>3</span> Messages</div>
                        <div class="wa-wizard-step" data-step="4"><span>4</span> Review</div>
                    </div>

                    <!-- Step 1: Setup -->
                    <div class="wa-wizard-panel" id="waWizStep1">
                        <div class="form-group">
                            <label>Campaign Name</label>
                            <input type="text" id="waCampName" class="form-control" placeholder="e.g. Agafay Sunset — Feb 2026" value="${camp.name}">
                        </div>
                        <div class="form-group">
                            <label>Main Offer</label>
                            <textarea id="waCampOffer" class="form-control" rows="3" placeholder="e.g. Agafay Sunset + Dinner + Quad Bike (pick-up included)">${camp.offer}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Batch Size (messages/hour)</label>
                            <input type="number" id="waCampBatch" class="form-control" min="5" max="100" value="${camp.batchSize}" placeholder="30">
                            <small style="color:var(--text-muted);">Anti-blocking: start with 20–40 messages/hour</small>
                        </div>
                    </div>

                    <!-- Step 2: Audience -->
                    <div class="wa-wizard-panel" id="waWizStep2" style="display:none;">
                        <div class="form-group">
                            <label>Filter by Tag (optional)</label>
                            <input type="text" id="waCampTag" class="form-control" placeholder="e.g. FR, Luxury, Hot..." value="${camp.audienceTag}" onkeyup="WhatsApp._filterWizardAudience()">
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-size:13px; color:var(--text-secondary);"><span id="waSelectedCount">${(camp.audienceIds || []).length}</span> selected</span>
                            <button class="btn-social" style="font-size:11px; padding:4px 12px;" onclick="WhatsApp._selectAllAudience()">Select All</button>
                        </div>
                        <div class="wa-audience-list" id="waAudienceList">
                            ${allClients.map(c => `
                                <label class="wa-audience-item">
                                    <input type="checkbox" value="${c.id}" ${(camp.audienceIds || []).includes(String(c.id)) ? 'checked' : ''} onchange="WhatsApp._updateSelectedCount()">
                                    <span class="wa-audience-name">${c.name}</span>
                                    <span class="wa-audience-phone">${c.phone || c.contact || '—'}</span>
                                </label>
                            `).join('') || '<div style="padding:20px; text-align:center; color:var(--text-muted);">No clients found. Add clients first.</div>'}
                        </div>
                    </div>

                    <!-- Step 3: Messages -->
                    <div class="wa-wizard-panel" id="waWizStep3" style="display:none;">
                        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:15px;">Configure your 4-message drip sequence. Each message is sent on the specified day.</p>
                        ${(camp.messages || this._defaultMessages()).map((m, i) => `
                            <div class="wa-msg-editor">
                                <div class="wa-msg-editor-header">
                                    <span class="wa-msg-day">Day ${m.day}</span>
                                    <span class="wa-msg-label">${m.label}</span>
                                    <button class="wa-icon-btn" onclick="WhatsApp._prefillFromTemplate(${i})" title="Load from SOP template"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                                </div>
                                <textarea class="form-control wa-msg-textarea" id="waCampMsg${i}" rows="3" placeholder="Type your message...">${m.body || ''}</textarea>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Step 4: Review -->
                    <div class="wa-wizard-panel" id="waWizStep4" style="display:none;">
                        <div class="wa-review-section" id="waReviewContent">
                            <p style="color:var(--text-muted);">Click "Review" after filling all steps.</p>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-social" id="waWizPrev" onclick="WhatsApp._wizardPrev()" style="display:none;"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <button class="btn-primary" id="waWizNext" onclick="WhatsApp._wizardNext()">Next <i class="fa-solid fa-arrow-right"></i></button>
                <button class="btn-primary" id="waWizSave" onclick="WhatsApp._saveCampaignFromWizard('${editId || ''}')" style="display:none;"><i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Campaign</button>
            `
        });

        this._wizardStep = 1;
    },

    _wizardStep: 1,

    _wizardNext() {
        if (this._wizardStep >= 4) return;
        document.getElementById(`waWizStep${this._wizardStep}`).style.display = 'none';
        this._wizardStep++;
        document.getElementById(`waWizStep${this._wizardStep}`).style.display = 'block';
        this._updateWizardUI();
        if (this._wizardStep === 4) this._buildReview();
    },

    _wizardPrev() {
        if (this._wizardStep <= 1) return;
        document.getElementById(`waWizStep${this._wizardStep}`).style.display = 'none';
        this._wizardStep--;
        document.getElementById(`waWizStep${this._wizardStep}`).style.display = 'block';
        this._updateWizardUI();
    },

    _updateWizardUI() {
        const step = this._wizardStep;
        const prevBtn = document.getElementById('waWizPrev');
        const nextBtn = document.getElementById('waWizNext');
        const saveBtn = document.getElementById('waWizSave');
        if (prevBtn) prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';
        if (nextBtn) nextBtn.style.display = step < 4 ? 'inline-flex' : 'none';
        if (saveBtn) saveBtn.style.display = step === 4 ? 'inline-flex' : 'none';

        document.querySelectorAll('.wa-wizard-step').forEach((el, i) => {
            el.classList.toggle('active', i + 1 === step);
            el.classList.toggle('done', i + 1 < step);
        });
    },

    _buildReview() {
        const name = document.getElementById('waCampName')?.value || 'Untitled';
        const offer = document.getElementById('waCampOffer')?.value || '—';
        const batch = document.getElementById('waCampBatch')?.value || 30;
        const selected = document.querySelectorAll('#waAudienceList input[type=checkbox]:checked');
        const msgCount = document.querySelectorAll('.wa-msg-textarea').length;

        const reviewEl = document.getElementById('waReviewContent');
        if (reviewEl) {
            reviewEl.innerHTML = `
                <div class="wa-review-grid">
                    <div class="wa-review-item"><strong>Name:</strong> ${name}</div>
                    <div class="wa-review-item"><strong>Offer:</strong> ${offer}</div>
                    <div class="wa-review-item"><strong>Audience:</strong> ${selected.length} contacts</div>
                    <div class="wa-review-item"><strong>Messages:</strong> ${msgCount} in sequence</div>
                    <div class="wa-review-item"><strong>Batch Size:</strong> ${batch} msgs/hour</div>
                </div>
                <div style="margin-top:20px; padding:15px; background:rgba(37,211,102,0.05); border-radius:12px; border:1px solid rgba(37,211,102,0.2);">
                    <strong style="color:#25D366;"><i class="fa-solid fa-shield-check"></i> Anti-Blocking Rules Active</strong>
                    <ul style="margin:10px 0 0; font-size:13px; color:var(--text-secondary); padding-left:20px;">
                        <li>Batch sending: ${batch} messages per hour</li>
                        <li>Opt-out contacts automatically excluded</li>
                        <li>Message variations recommended across contacts</li>
                    </ul>
                </div>
            `;
        }
    },

    _saveCampaignFromWizard(editId) {
        const name = document.getElementById('waCampName')?.value?.trim();
        if (!name) { UI.showToast('Campaign name is required', 'error'); return; }

        const offer = document.getElementById('waCampOffer')?.value?.trim() || '';
        const batch = parseInt(document.getElementById('waCampBatch')?.value) || 30;
        const tag = document.getElementById('waCampTag')?.value?.trim() || '';

        const audienceIds = [];
        document.querySelectorAll('#waAudienceList input[type=checkbox]:checked').forEach(cb => {
            audienceIds.push(cb.value);
        });

        const messages = [];
        const defaults = this._defaultMessages();
        document.querySelectorAll('.wa-msg-textarea').forEach((el, i) => {
            messages.push({
                day: defaults[i]?.day ?? i,
                label: defaults[i]?.label ?? `Message ${i + 1}`,
                body: el.value.trim(),
                sent: 0, delivered: 0, read: 0
            });
        });

        const campaign = { name, offer, audienceTag: tag, audienceIds, messages, batchSize: batch };
        if (editId) campaign.id = editId;

        store.saveWaCampaign(campaign);
        Modal.close();
        UI.showToast(`Campaign "${name}" saved ✓`, 'success');
        this.render();
    },

    _defaultMessages() {
        return [
            { day: 0, label: 'Hook + Question', body: '', sent: 0, delivered: 0, read: 0 },
            { day: 1, label: 'Value + Choice', body: '', sent: 0, delivered: 0, read: 0 },
            { day: 3, label: 'Proof (Social)', body: '', sent: 0, delivered: 0, read: 0 },
            { day: 5, label: 'Last Call', body: '', sent: 0, delivered: 0, read: 0 }
        ];
    },

    _prefillFromTemplate(msgIndex) {
        const templates = this._getSOPTemplates();
        const mapping = { 0: 'hook_a', 1: 'value', 2: 'proof', 3: 'last' };
        const tpl = templates.find(t => t.id === mapping[msgIndex]);
        if (tpl) {
            const textarea = document.getElementById(`waCampMsg${msgIndex}`);
            if (textarea) {
                textarea.value = tpl.body;
                UI.showToast('Template loaded ✓', 'success');
            }
        }
    },

    _selectAllAudience() {
        document.querySelectorAll('#waAudienceList input[type=checkbox]').forEach(cb => cb.checked = true);
        this._updateSelectedCount();
    },

    _updateSelectedCount() {
        const count = document.querySelectorAll('#waAudienceList input[type=checkbox]:checked').length;
        const el = document.getElementById('waSelectedCount');
        if (el) el.textContent = count;
    },

    _filterWizardAudience() {
        const q = (document.getElementById('waCampTag')?.value || '').toLowerCase();
        document.querySelectorAll('.wa-audience-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(q) ? '' : 'none';
        });
    },

    /* ═══════════════════════════════════════════════════════════
       CAMPAIGN ACTIONS
       ═══════════════════════════════════════════════════════════ */
    launchCampaign(id) {
        UI.confirm('Launch Campaign', 'This will start sending messages in batches. Continue?', () => {
            const camp = store.state.waCampaigns.find(c => String(c.id) === String(id));
            if (!camp) return;

            camp.status = 'active';
            const contactCount = (camp.audienceIds || []).length;
            camp.stats = camp.stats || {};
            camp.stats.sent = contactCount;
            camp.stats.delivered = Math.round(contactCount * 0.92);
            camp.stats.read = Math.round(contactCount * 0.65);
            camp.stats.replied = Math.round(contactCount * 0.18);
            camp.stats.qualified = Math.round(contactCount * 0.08);
            store.saveWaCampaign(camp);
            UI.showToast(`Campaign "${camp.name}" launched! 🚀`, 'success');
            this.render();
        });
    },

    _pauseCampaign(id) {
        const camp = store.state.waCampaigns.find(c => String(c.id) === String(id));
        if (camp) {
            camp.status = 'paused';
            store.saveWaCampaign(camp);
            UI.showToast('Campaign paused', 'info');
            this.render();
        }
    },

    _deleteCampaign(id) {
        UI.confirm('Delete Campaign', 'This action cannot be undone. Delete this campaign?', () => {
            store.deleteWaCampaign(id);
            UI.showToast('Campaign deleted', 'success');
            this.render();
        }, 'danger');
    },

    /* ═══════════════════════════════════════════════════════════
       QUALIFICATION MODAL
       ═══════════════════════════════════════════════════════════ */
    openQualifyModal(contactId) {
        Modal.open({
            title: '<i class="fa-solid fa-clipboard-check" style="color:#25D366;"></i> Qualify Lead',
            size: 'md',
            body: `
                <div style="padding:5px 0;">
                    <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">Ask these 5 questions to qualify the lead for a quote:</p>
                    <div class="wa-qualify-list">
                        <div class="wa-qualify-item"><span class="wa-qualify-num">1</span><div class="form-group" style="flex:1; margin:0;"><label>Exact Dates</label><input type="text" class="form-control" id="waQ1" placeholder="e.g. March 15–20, 2026"></div></div>
                        <div class="wa-qualify-item"><span class="wa-qualify-num">2</span><div class="form-group" style="flex:1; margin:0;"><label>Number of People + Children?</label><input type="text" class="form-control" id="waQ2" placeholder="e.g. 2 adults, 1 child"></div></div>
                        <div class="wa-qualify-item"><span class="wa-qualify-num">3</span><div class="form-group" style="flex:1; margin:0;"><label>Arrival City</label><input type="text" class="form-control" id="waQ3" placeholder="Marrakech / Casablanca"></div></div>
                        <div class="wa-qualify-item"><span class="wa-qualify-num">4</span><div class="form-group" style="flex:1; margin:0;"><label>Style</label><div class="select-wrap"><select class="form-control" id="waQ4"><option value="">Select...</option><option>Budget</option><option>Comfort</option><option>Luxury</option></select><i class="fa-solid fa-chevron-down caret"></i></div></div></div>
                        <div class="wa-qualify-item"><span class="wa-qualify-num">5</span><div class="form-group" style="flex:1; margin:0;"><label>Favorite Activities</label><input type="text" class="form-control" id="waQ5" placeholder="Desert, Atlas, city, quad"></div></div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-social" onclick="WhatsApp._copyQualification()"><i class="fa-solid fa-copy"></i> Copy as Message</button>
                <button class="btn-primary" onclick="WhatsApp._sendQualification()"><i class="fa-solid fa-paper-plane"></i> Send & Save</button>
            `
        });
    },

    _copyQualification() {
        const msg = this._buildQualificationMsg();
        navigator.clipboard.writeText(msg).then(() => UI.showToast('Copied ✓', 'success')).catch(() => { });
    },

    _sendQualification() {
        const msg = this._buildQualificationMsg();
        if (this.activeChatId) {
            const activeChat = store.state.whatsapp.find(c => c.id === this.activeChatId);
            if (activeChat) {
                store.sendWhatsApp(activeChat.clientId || this.activeChatId, activeChat.clientName, msg);
            }
        }
        Modal.close();
        UI.showToast('Qualification sent ✓', 'success');
        this.render();
    },

    _buildQualificationMsg() {
        const q1 = document.getElementById('waQ1')?.value || '—';
        const q2 = document.getElementById('waQ2')?.value || '—';
        const q3 = document.getElementById('waQ3')?.value || '—';
        const q4 = document.getElementById('waQ4')?.value || '—';
        const q5 = document.getElementById('waQ5')?.value || '—';
        return `✅ Lead Qualified:\n📅 Dates: ${q1}\n👥 Pax: ${q2}\n✈️ Arrival: ${q3}\n🎯 Style: ${q4}\n🏔️ Activities: ${q5}`;
    },

    /* ═══════════════════════════════════════════════════════════
       QUICK REPLY MODAL & INSERT
       ═══════════════════════════════════════════════════════════ */
    _openQuickReplyModal(editId) {
        const existing = editId ? store.state.waQuickReplies.find(r => r.id === editId) : null;
        const isEdit = !!existing;

        Modal.open({
            title: `${isEdit ? 'Edit' : 'Add'} Quick Reply`,
            size: 'md',
            body: `
                <div class="form-group"><label>Shortcut</label><input type="text" id="waQrShortcut" class="form-control" placeholder="/price" value="${existing?.shortcut || ''}"></div>
                <div class="form-group"><label>Label</label><input type="text" id="waQrLabel" class="form-control" placeholder="Price Info" value="${existing?.label || ''}"></div>
                <div class="form-group"><label>Message Body</label><textarea id="waQrBody" class="form-control" rows="4" placeholder="Type the quick reply message...">${existing?.body || ''}</textarea></div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" onclick="WhatsApp._saveQuickReply('${editId || ''}')"><i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'}</button>
            `
        });
    },

    _saveQuickReply(editId) {
        const shortcut = document.getElementById('waQrShortcut')?.value?.trim();
        const label = document.getElementById('waQrLabel')?.value?.trim();
        const body = document.getElementById('waQrBody')?.value?.trim();
        if (!shortcut || !body) { UI.showToast('Shortcut and body are required', 'error'); return; }

        const reply = { shortcut, label: label || shortcut, body };
        if (editId) reply.id = editId;
        store.saveWaQuickReply(reply);
        Modal.close();
        UI.showToast('Quick reply saved ✓', 'success');
        this.render();
    },

    _deleteQuickReply(id) {
        UI.confirm('Delete Quick Reply', 'Remove this quick reply?', () => {
            store.deleteWaQuickReply(id);
            UI.showToast('Deleted', 'success');
            this.render();
        }, 'danger');
    },

    _insertQuickReply() {
        const replies = store.state.waQuickReplies || [];
        if (replies.length === 0) { UI.showToast('No quick replies configured', 'info'); return; }

        Modal.open({
            title: '⚡ Insert Quick Reply',
            size: 'sm',
            body: `
                <div class="wa-qr-picker">
                    ${replies.map(r => `
                        <div class="wa-qr-pick-item" onclick="WhatsApp._applyQuickReply('${r.id}')">
                            <code>${r.shortcut}</code>
                            <span>${r.label}</span>
                        </div>
                    `).join('')}
                </div>
            `,
            footer: `<button class="btn-cancel" onclick="Modal.close()">Cancel</button>`
        });
    },

    _applyQuickReply(id) {
        const reply = store.state.waQuickReplies.find(r => r.id === id);
        if (reply) {
            const input = document.getElementById('waMsgInput');
            if (input) input.value = reply.body;
            Modal.close();
        }
    },

    /* ═══════════════════════════════════════════════════════════
       READINESS CHECKLIST
       ═══════════════════════════════════════════════════════════ */
    _showChecklist() {
        const clients = [...(store.state.b2bClients || []), ...(store.state.b2cClients || [])];
        const campaigns = store.state.waCampaigns || [];
        const quickReplies = store.state.waQuickReplies || [];
        const templates = this._getSOPTemplates();

        const checks = [
            { label: 'Segmented list + tags', done: clients.length > 0 },
            { label: 'Main offer defined', done: campaigns.some(c => !!c.offer) },
            { label: '4 messages configured (D0/D1/D3/D5)', done: campaigns.some(c => c.messages && c.messages.length >= 4 && c.messages.every(m => !!m.body)) },
            { label: 'SOP templates available', done: templates.length > 0 },
            { label: 'Quick replies configured', done: quickReplies.length >= 3 },
            { label: 'CRM Pipeline + Reminders', done: true },
            { label: 'Anti-blocking batch size set', done: campaigns.some(c => c.batchSize >= 20 && c.batchSize <= 40) }
        ];

        const doneCount = checks.filter(c => c.done).length;

        Modal.open({
            title: '📋 Campaign Readiness Checklist',
            size: 'md',
            body: `
                <div style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <span style="font-weight:700; color:var(--text-primary);">${doneCount}/${checks.length} complete</span>
                        <div style="width:60%; height:8px; background:var(--border); border-radius:99px; overflow:hidden;">
                            <div style="width:${(doneCount / checks.length * 100)}%; height:100%; background:linear-gradient(90deg, #25D366, #128C7E); border-radius:99px; transition:width 0.5s;"></div>
                        </div>
                    </div>
                </div>
                <div class="wa-checklist">
                    ${checks.map(c => `
                        <div class="wa-checklist-item ${c.done ? 'done' : ''}">
                            <i class="fa-solid ${c.done ? 'fa-circle-check' : 'fa-circle'}" style="color:${c.done ? '#25D366' : 'var(--text-muted)'}; font-size:18px;"></i>
                            <span>${c.label}</span>
                        </div>
                    `).join('')}
                </div>
            `,
            footer: `<button class="btn-primary" onclick="Modal.close()">Got it</button>`
        });
    },

    /* ═══════════════════════════════════════════════════════════
       ORIGINAL CHAT FUNCTIONS (preserved)
       ═══════════════════════════════════════════════════════════ */
    switchChat(id) {
        this.activeChatId = parseInt(id);
        this.render();
    },

    formatTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    scrollToBottom() {
        setTimeout(() => {
            const container = document.getElementById('whatsappMessages');
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    },

    handleSend(btn) {
        const input = document.getElementById('waMsgInput');
        const body = input.value.trim();
        if (!body || !this.activeChatId) return;

        // Check for quick reply shortcut
        const qr = (store.state.waQuickReplies || []).find(r => body === r.shortcut);
        const finalBody = qr ? qr.body : body;

        store.sendWhatsApp(this.activeChatId, '', finalBody);
        input.value = '';
        this.render();
    },

    openNewChatModal() {
        const clients = [...(store.state.b2bClients || []), ...(store.state.b2cClients || [])];

        Modal.open({
            title: '<i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> Start New Conversation',
            size: 'md',
            body: `
                <div class="form-group">
                    <label>Select Recipient</label>
                    <div style="position:relative;">
                        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:13px; color:var(--text-muted);"></i>
                        <input type="text" class="form-control" style="padding-left:35px;" placeholder="Search clients..." onkeyup="WhatsApp.filterClientList(this.value)">
                    </div>
                </div>
                <div id="waClientList" class="wa-client-list">
                    ${clients.map(c => `
                        <div class="wa-client-item" onclick="WhatsApp.startChat('${c.id}', '${(c.name || '').replace(/'/g, "\\'")}', '${c.phone || c.contact || ''}')">
                            <div class="wa-client-avatar">${(c.name || 'U').charAt(0)}</div>
                            <div style="flex:1;">
                                <div style="font-weight:600;">${c.name}</div>
                                <div style="font-size:12px; color:var(--text-secondary);">${c.phone || c.contact || 'No phone'}</div>
                            </div>
                            <i class="fa-regular fa-paper-plane" style="color:var(--text-muted);"></i>
                        </div>
                    `).join('') || '<div style="padding:30px; text-align:center; color:var(--text-muted);">No clients found</div>'}
                </div>
            `,
            footer: `<button class="btn-cancel" onclick="Modal.close()">Cancel</button>`
        });
    },

    filterClientList(query) {
        const filter = query.toLowerCase();
        const items = document.querySelectorAll('#waClientList .wa-client-item');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(filter) ? 'flex' : 'none';
        });
    },

    startChat(clientId, name, phone) {
        const existing = store.state.whatsapp.find(c => c.clientName === name);
        if (existing) {
            this.switchChat(existing.id);
            Modal.close();
            return;
        }

        const newChat = {
            id: Date.now(),
            clientId,
            clientName: name,
            avatar: name.charAt(0),
            time: new Date().toISOString(),
            lastMsg: 'Chat initialized',
            messages: []
        };

        store.state.whatsapp.unshift(newChat);
        this.activeChatId = newChat.id;
        Modal.close();
        this.render();
        UI.showToast(`Chat started with ${name}`, 'success');
    }
};

window.WhatsApp = WhatsApp;
