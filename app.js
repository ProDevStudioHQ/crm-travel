
// Basic App State and Navigation

// Store the full App HTML structure in memory to restore it after login
const appTemplate = document.body.innerHTML;


const UI = {
    showFeedback(element, type, duration = 1500) {
        const icon = element.querySelector('i');
        if (!icon) return;

        const originalClass = icon.className;
        const originalColor = icon.style.color;
        const parent = element;
        parent.style.pointerEvents = 'none';

        if (type === 'loading') {
            icon.className = 'fa-solid fa-spinner fa-spin';
        } else if (type === 'success') {
            icon.className = 'fa-solid fa-check';
            icon.style.color = 'var(--success)';
            setTimeout(() => {
                icon.className = originalClass;
                icon.style.color = originalColor;
                parent.style.pointerEvents = 'auto';
            }, duration);
        } else if (type === 'error') {
            icon.className = 'fa-solid fa-xmark';
            icon.style.color = 'var(--danger)';
            setTimeout(() => {
                icon.className = originalClass;
                icon.style.color = originalColor;
                parent.style.pointerEvents = 'auto';
            }, duration);
        }
    },

    confirm(title, message, onConfirm, type = 'primary') {
        const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';
        Modal.open({
            title: `⚠️ ${title}`,
            body: `
                <div style="text-align:center; padding:10px 0;">
                    <p style="font-size:14px; color:var(--text-primary); line-height:1.5;">${message}</p>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="${btnClass}" id="confirmActionBtn">Confirm</button>
            `
        });

        const btn = document.getElementById('confirmActionBtn');
        if (btn) {
            btn.onclick = () => {
                Modal.close();
                onConfirm();
            };
        }
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    navigateTo(route) {
        handleRoute(route);
    },

    toggleNotifications() {
        // Simple Alert for now, but should ideally be a dropdown
        // Let's use a Modal as a temporary "Center"
        const list = store.state.notifications;
        const html = list.length ? list.map(n => `
            <div style="padding:15px; border-bottom:1px solid var(--border); ${n.read ? 'opacity:0.6;' : 'background:var(--bg-hover);'}">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:var(--primary); font-size:13px;">${n.title}</strong>
                    <small style="color:var(--text-muted);">${new Date(n.time).toLocaleTimeString()}</small>
                </div>
                <div style="font-size:12px; margin-top:5px; color:var(--text-primary);">${n.message}</div>
            </div>
        `).join('') : '<div style="padding:20px; text-align:center;">No notifications</div>';

        Modal.open({
            title: '🔔 Notifications',
            body: `<div style="max-height:400px; overflow-y:auto;">${html}</div>`,
            footer: '<button class="btn-primary" onclick="store.markNotificationsRead(); Modal.close(); UI.showToast(\'All marked as read\', \'success\')">Mark all read</button>'
        });
    }
};

// Expose to inline onclick handlers (top-level const/let are not window properties)
window.UI = UI;

const Modal = {
    open(options) {
        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        const modalContainer = overlay.querySelector('.modal');

        if (!overlay || !title || !body) return;

        title.innerHTML = options.title || 'Notification';
        body.innerHTML = options.body || '';

        // Reset Styles
        modalContainer.style.width = '';
        modalContainer.style.maxWidth = '';

        // Apply Size/Width
        if (options.width) {
            modalContainer.style.width = options.width;
            modalContainer.style.maxWidth = '95vw';
        } else if (options.size) {
            const sizes = {
                'sm': '400px',
                'md': '600px',
                'lg': '900px',
                'xl': '1200px',
                'full': '98vw'
            };
            modalContainer.style.width = sizes[options.size] || '600px';
            if (options.size === 'full') modalContainer.style.maxWidth = '98vw';
        }

        if (options.footer) {
            let footerDiv = body.querySelector('.modal-footer');
            if (!footerDiv) {
                footerDiv = document.createElement('div');
                footerDiv.className = 'modal-footer';
                body.appendChild(footerDiv);
            }
            footerDiv.innerHTML = options.footer;
            footerDiv.style.display = 'flex';
        } else {
            // Remove footer if not present to avoid empty spacing
            const existingFooter = body.querySelector('.modal-footer');
            if (existingFooter) existingFooter.remove();
        }

        overlay.classList.remove('hidden');
    },

    close() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.add('hidden');
    }
};

// Expose Modal for inline onclick
window.Modal = Modal;

// ---------------- Date Range (Topbar) ----------------
// Makes the "Oct 1 - Oct 31, 2026" button functional.
// Persisted in localStorage so the user's filter survives refresh.
const DateRange = {
    key: 'pm_crm_dateRange_v1',

    init() {
        const btn = document.getElementById('dateRangeBtn');
        if (!btn) return;

        // Restore saved range (if any)
        const saved = this._load();
        if (saved) {
            store.state.ui = store.state.ui || {};
            store.state.ui.dateRange = saved;
        }
        this.updateLabel();

        // If nothing saved, set a safe default (so the label is not stuck on a hardcoded date)
        if (!saved) {
            store.state.ui = store.state.ui || {};
            store.state.ui.dateRange = { mode: 'all', start: '', end: '', label: 'All time' };
            this._save(store.state.ui.dateRange);
            this.updateLabel();
        }

        btn.addEventListener('click', () => this.open());
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open();
            }
        });
    },

    open() {
        const current = (store.state.ui && store.state.ui.dateRange) ? store.state.ui.dateRange : null;
        const start = current?.start || '';
        const end = current?.end || '';
        const isAll = current?.mode === 'all';

        const preset = (label, s, e) => `
            <button class="btn-social" style="justify-content:center;" data-start="${s}" data-end="${e}">${label}</button>
        `;

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const isoToday = `${yyyy}-${mm}-${dd}`;
        const firstMonth = `${yyyy}-${mm}-01`;
        const lastMonth = new Date(yyyy, today.getMonth() + 1, 0);
        const isoLastMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastMonth.getDate()).padStart(2, '0')}`;

        const last7 = new Date(today); last7.setDate(today.getDate() - 6);
        const isoLast7 = `${last7.getFullYear()}-${String(last7.getMonth() + 1).padStart(2, '0')}-${String(last7.getDate()).padStart(2, '0')}`;

        const last14 = new Date(today); last14.setDate(today.getDate() - 13);
        const isoLast14 = `${last14.getFullYear()}-${String(last14.getMonth() + 1).padStart(2, '0')}-${String(last14.getDate()).padStart(2, '0')}`;

        Modal.open({
            title: '📅 Date Range',
            body: `
                <div style="display:grid; gap:14px;">
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        ${preset('Today', isoToday, isoToday)}
                        ${preset('Last 7 days', isoLast7, isoToday)}
                        ${preset('Last 14 days', isoLast14, isoToday)}
                        ${preset('This month', firstMonth, isoLastMonth)}
                        ${preset('All time', '', '')}
                    </div>

                    <div class="card" style="padding:14px;">
                        <div style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px;">
                            <div>
                                <label style="font-size:12px; color:var(--text-muted);">Start</label>
                                <input id="drStart" type="date" value="${start}" style="width:100%; margin-top:6px; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary);" ${isAll ? 'disabled' : ''} />
                            </div>
                            <div>
                                <label style="font-size:12px; color:var(--text-muted);">End</label>
                                <input id="drEnd" type="date" value="${end}" style="width:100%; margin-top:6px; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary);" ${isAll ? 'disabled' : ''} />
                            </div>
                        </div>
                        <div style="margin-top:12px; display:flex; align-items:center; gap:10px; color:var(--text-secondary);">
                            <input id="drAll" type="checkbox" ${isAll ? 'checked' : ''} />
                            <label for="drAll" style="font-size:12px; cursor:pointer;">All time (disable date filter)</label>
                        </div>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:10px;">
                            Tip: this filter only updates the UI label today, and you can use it later to filter KPIs/charts.
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
                <button class="btn-primary" id="drApplyBtn"><i class="fa-solid fa-check"></i> Apply</button>
            `
        });

        // Wire presets
        const overlay = document.getElementById('modalOverlay');
        const startEl = document.getElementById('drStart');
        const endEl = document.getElementById('drEnd');
        const allEl = document.getElementById('drAll');
        const applyBtn = document.getElementById('drApplyBtn');

        if (overlay) {
            overlay.querySelectorAll('button.btn-social[data-start]').forEach(b => {
                b.addEventListener('click', () => {
                    const s = b.getAttribute('data-start') || '';
                    const e = b.getAttribute('data-end') || '';
                    const all = (!s && !e);
                    if (allEl) allEl.checked = all;
                    if (startEl) { startEl.value = s; startEl.disabled = all; }
                    if (endEl) { endEl.value = e; endEl.disabled = all; }
                });
            });
        }

        if (allEl) {
            allEl.addEventListener('change', () => {
                const all = !!allEl.checked;
                if (startEl) startEl.disabled = all;
                if (endEl) endEl.disabled = all;
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const all = !!(allEl && allEl.checked);
                const s = startEl ? startEl.value : '';
                const e = endEl ? endEl.value : '';

                if (!all) {
                    if (!s || !e) {
                        UI.showToast('Please select a valid start and end date.', 'error');
                        return;
                    }
                    if (new Date(s) > new Date(e)) {
                        UI.showToast('Start date must be before end date.', 'error');
                        return;
                    }
                }

                this.setRange(all ? null : { start: s, end: e });
                Modal.close();
                UI.showToast('Date range updated', 'success');

                // SOP: Re-render current page when dateRange changes
                const pageTitle = (document.getElementById('pageTitle')?.innerText || '').toLowerCase();
                if (pageTitle.includes('dashboard')) {
                    try { Dashboard.render(); } catch (_) { }
                } else if (pageTitle.includes('analytics')) {
                    try { Analytics.render(); } catch (_) { }
                } else if (pageTitle.includes('booking')) {
                    try { Bookings.render(); } catch (_) { }
                } else if (pageTitle.includes('quote') || pageTitle.includes('proposal')) {
                    try { Quotes.render(); } catch (_) { }
                }
            });
        }
    },

    setRange(rangeOrNull) {
        store.state.ui = store.state.ui || {};
        if (!rangeOrNull) {
            store.state.ui.dateRange = { mode: 'all', start: '', end: '', label: 'All time' };
        } else {
            const label = this._labelFromISO(rangeOrNull.start, rangeOrNull.end);
            store.state.ui.dateRange = { mode: 'range', start: rangeOrNull.start, end: rangeOrNull.end, label };
        }

        this._save(store.state.ui.dateRange);
        this.updateLabel();
    },

    updateLabel() {
        const labelEl = document.getElementById('dateRangeLabel');
        const current = store.state.ui && store.state.ui.dateRange ? store.state.ui.dateRange : null;
        if (!labelEl || !current) return;
        labelEl.textContent = current.label || 'All time';
    },

    _labelFromISO(startISO, endISO) {
        const s = new Date(startISO + 'T00:00:00');
        const e = new Date(endISO + 'T00:00:00');
        const m = (d) => d.toLocaleString('en-US', { month: 'short' });
        const day = (d) => d.getDate();
        const y = (d) => d.getFullYear();

        if (y(s) === y(e) && s.getMonth() === e.getMonth()) {
            return `${m(s)} ${day(s)} - ${m(e)} ${day(e)}, ${y(e)}`;
        }
        return `${m(s)} ${day(s)}, ${y(s)} - ${m(e)} ${day(e)}, ${y(e)}`;
    },

    _save(obj) {
        try { localStorage.setItem(this.key, JSON.stringify(obj)); } catch (_) { }
    },

    _load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || typeof obj !== 'object') return null;
            return obj;
        } catch (_) {
            return null;
        }
    }
};

// Persist and apply the default currency used across the app
const CurrencyManager = {
    key: 'pm_crm_currency_v1',

    init() {
        try {
            const saved = localStorage.getItem(this.key);
            if (saved && store.state && store.state.systemSettings) {
                store.state.systemSettings.currency = saved;
            }
        } catch (e) {
            // ignore
        }
    },

    set(code) {
        const c = (code || '').trim() || 'USD';
        if (store.state && store.state.systemSettings) {
            store.state.systemSettings.currency = c;
        }
        try { localStorage.setItem(this.key, c); } catch (e) { /* ignore */ }
        // Refresh current route so KPIs/totals immediately reflect the new currency
        if (typeof window.__currentRoute === 'string') {
            handleRoute(window.__currentRoute);
        }
    }
};

// Persist and apply the default language used across the app
const LanguageManager = {
    key: 'pm_crm_language_v1',

    init() {
        try {
            const saved = localStorage.getItem(this.key);
            if (saved && store.state && store.state.systemSettings) {
                store.state.systemSettings.language = saved;
                // Keep user preference aligned when present
                if (store.state.currentUser) store.state.currentUser.language = saved;
            }
        } catch (e) {
            // ignore
        }
    },

    set(codeOrLabel) {
        const v = (codeOrLabel || '').trim() || 'English';
        if (store.state && store.state.systemSettings) {
            store.state.systemSettings.language = v;
        }
        if (store.state && store.state.currentUser) {
            store.state.currentUser.language = v;
            try { localStorage.setItem('currentUser', JSON.stringify(store.state.currentUser)); } catch (_) { }
        }
        try { localStorage.setItem(this.key, v); } catch (e) { /* ignore */ }
        // Soft refresh current route so UI can react later (i18n hook)
        if (typeof window.__currentRoute === 'string') {
            handleRoute(window.__currentRoute);
        }
    }
};

// Expose globally for inline onclick handlers
window.Importer = Importer;
window.DateRange = DateRange;
window.CurrencyManager = CurrencyManager;

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.applySaved();
    document.addEventListener('auth:success', (e) => {
        const user = e.detail;
        renderAppLayout(user);
    });

    Auth.init();
});

function renderAppLayout(user) {
    store.state.currentUser = user;
    if (document.querySelector('.login-container')) {
        document.body.innerHTML = appTemplate;
    }
    initAppLogic(user);
}

function initAppLogic(user) {
    const avatar = document.querySelector('.avatar');
    const name = document.querySelector('.user-info h4');
    const role = document.querySelector('.user-info p');
    if (avatar) avatar.src = user.avatar;
    if (name) name.innerText = user.name;
    if (role) role.innerText = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    Quotes.init();
    try { Clients.init(); } catch (_) { }
    try { Invoices.init(); } catch (_) { }
    try { Campaigns.init(); } catch (_) { }
    try { Settings.init(); } catch (_) { }

    try { Wizard.init(); } catch (_) { }
    try { Mail.init(); } catch (_) { }
    try { TemplateManager.init(); } catch (_) { }
    try { Automation.init(); } catch (_) { }
    try { EmailLogs.init(); } catch (_) { }
    try { Catalogue.init(); } catch (_) { }
    try { Bookings.init(); } catch (_) { }
    try { Audiences.init(); } catch (_) { }
    // Load persisted system currency
    CurrencyManager.init();
    // Load persisted system language
    LanguageManager.init();
    // Make topbar date range selector interactive
    DateRange.init();
    // Bind importer once the app shell is present
    Importer.init();

    // Default Route
    handleRoute('b2b');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            handleRoute(target);
        });
    });

    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            store.state.ui = store.state.ui || {};
            store.state.ui.globalSearch = val;

            // Re-render the current route
            if (window.__currentRoute) {
                // Determine if we need to use TablePRO search
                if (window.__currentRoute === 'b2b' || window.__currentRoute === 'b2c') {
                    if (window.TablePRO) TablePRO.setSearch(window.__currentRoute, val);
                }
                handleRoute(window.__currentRoute);
            }
        });
    }
}


function handleRoute(route) {
    try {
        // Track current route for quick re-rendering (e.g., when currency changes)
        window.__currentRoute = route;
        const title = document.getElementById('pageTitle');
        const content = document.getElementById('mainContent');

        if (!content) return;

        // SOP Rule 4: System Welcome / Wizard
        if (store.state.systemSettings.maintenance && store.state.systemSettings.maintenance.isFirstRun) {
            setTimeout(() => Wizard.open(), 1000);
        }

        // SOP Rule 12: Inactivity Detection
        // SOP Section 7: Page Transition (Fade + Vertical Shift)
        content.classList.remove('page-transition');
        void content.offsetWidth; // Force reflow for animation restart
        content.classList.add('page-transition');

        // Show loading state while rendering
        content.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:200px;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px; color:var(--primary);"></i></div>';

        // Simple routing mapping
        if (route === 'b2b') {
            title.innerText = 'B2B Clients';
            Clients.renderB2B();
        } else if (route === 'b2c') {
            title.innerText = 'B2C Clients';
            Clients.renderB2C();
        } else if (route === 'sales') {
            title.innerText = 'Sales Dashboard';
            Sales.render();
        } else if (route === 'metrics') {
            title.innerText = 'System Metrics';
            Analytics.render();
        } else if (route === 'dashboard') {
            title.innerText = 'Executive Dashboard';
            Dashboard.render();
        } else if (route === 'quotes') {
            title.innerText = 'Quotes & Proposals';
            Quotes.render();
        } else if (route === 'bookings') {
            title.innerText = 'Travel Bookings';
            Bookings.render();
        } else if (route === 'campaigns') {
            title.innerText = 'Marketing Campaigns';
            Campaigns.render();
        } else if (route === 'audiences') {
            title.innerText = 'Audience Lists';
            Audiences.render();
        } else if (route === 'whatsapp') {
            title.innerText = 'WhatsApp Communication';
            WhatsApp.render();
        } else if (route === 'mail') {
            title.innerText = 'Mail Workspace';
            Mail.render();

        } else if (route === 'templates') {
            title.innerText = 'Email Templates';
            TemplateManager.render();
        } else if (route === 'automation') {
            title.innerText = 'Email Automation';
            Automation.render();
        } else if (route === 'email_logs') {
            title.innerText = 'Email Tracking Logs';
            EmailLogs.render();
        } else if (route === 'lead_filter') {
            title.innerText = 'Lead Filter (B2B/B2C)';
            if (window.LeadFilter && typeof LeadFilter.render === 'function') {
                LeadFilter.render();
            } else {
                content.innerHTML = `<div style="text-align:center; padding: 50px; color: var(--text-secondary);">
                    <h2>Lead Filter</h2>
                    <p>Module not loaded. Please hard reload the app.</p>
                </div>`;
            }

        } else if (route === 'lead_enrich') {
            title.innerText = 'Lead Enrichment';
            LeadEnrich.render();
        } else if (route === 'lead_duplicates') {
            title.innerText = 'Duplicate Cleaner';
            LeadDuplicates.render();
        } else if (route === 'lead_verify') {
            title.innerText = 'Email Verify';
            LeadVerify.render();
        } else if (route === 'ai_lead_finder') {
            title.innerText = 'AI Lead Finder';
            AILeadFinder.init().then(() => AILeadFinder.render());
        } else if (route === 'n8n_hub') {
            title.innerText = 'n8n Automation Hub';
            N8nHub.init().then(() => N8nHub.render());
        } else if (route === 'settings') {
            title.innerText = 'System Settings';
            Settings.render();
        } else if (route === 'analytics') {
            title.innerText = 'Business Analytics';
            Analytics.render();
        } else if (route === 'invoices') {
            title.innerText = 'Financial Invoices';
            Invoices.render();
        } else if (route === 'catalogues') {
            title.innerText = 'Catalogue Management';
            Catalogue.renderList();
        } else if (route === 'catalogue_import') {
            title.innerText = 'Import HTML Catalogue';
            Catalogue.renderImport();
        } else if (route === 'catalogue_new') {
            title.innerText = 'New Catalogue';
            Catalogue.renderBuilder();
        } else if (route.startsWith('catalogue_edit_')) {
            title.innerText = 'Edit Catalogue';
            Catalogue.renderBuilder(route.replace('catalogue_edit_', ''));
        } else if (route.startsWith('catalogue_preview_')) {
            title.innerText = 'Catalogue Preview';
            Catalogue.renderPreview(route.replace('catalogue_preview_', ''));
        } else {
            const displayRoute = route ? route.charAt(0).toUpperCase() + route.slice(1) : 'Unknown';
            title.innerText = displayRoute;
            content.innerHTML = `<div style="text-align:center; padding: 50px; color: var(--text-secondary);">
                <h2>${displayRoute} Module</h2>
                <p>Coming soon...</p>
            </div>`;
        }
    } catch (err) {
        console.error('Critical Render Error:', err);
        const content = document.getElementById('mainContent');
        if (content) {
            content.innerHTML = `
                <div style="padding:40px; text-align:center; background:rgba(248,40,90,0.05); border:1px dashed var(--danger); border-radius:12px; margin:20px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:40px; color:var(--danger); margin-bottom:15px;"></i>
                    <h3 style="color:var(--danger)">Module Rendering Failure</h3>
                    <p style="margin:10px 0; color:var(--text-primary)">An unexpected error occurred while loading the <b>${route}</b> module.</p>
                    <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; font-family:monospace; font-size:12px; text-align:left; color:var(--danger); overflow:auto; max-height:200px; margin-top:20px;">
                        <b>[${err.name}]</b>: ${err.message}<br><br>
                        <small style="opacity:0.7;">${err.stack?.split('\n')[1] || ''}</small>
                    </div>
                    <button class="btn-primary" onclick="handleRoute('dashboard')" style="margin-top:20px; background:var(--primary);">Return to Dashboard</button>
                    <button class="btn-social" onclick="location.reload()" style="margin-top:20px; margin-left:10px;">Hard Reload App</button>
                </div>
            `;
        }
        if (window.UI && UI.showToast) UI.showToast('Render crash: ' + err.message, 'danger');
    }
}

// Global Error Catcher (SOP Rule 15)
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('Core App Global Error Tracker:', msg, url, lineNo, columnNo, error);
    if (window.UI && typeof UI.showToast === 'function') {
        UI.showToast(`System Runtime Error: ${msg}`, 'danger');
    }
    return false;
};

// Inactivity Monitoring (SOP Rule 4)
let idleTimer;
function resetIdleTimer() {
    clearTimeout(idleTimer);
    const timeoutMins = store.state.systemSettings.security.sessionTimeout || 30;
    idleTimer = setTimeout(() => {
        Auth.autoLogout();
    }, timeoutMins * 60 * 1000);
}

// Global listeners for activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, true);
});

const ThemeManager = {
    key: 'pm_crm_theme_v1',
    applySaved() {
        try {
            const saved = localStorage.getItem(this.key);
            if (saved === 'dark' || saved === 'light') {
                document.body.setAttribute('data-theme', saved);
            }
        } catch (_) { }
    },
    toggle() {
        const body = document.body;
        const current = body.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', next);
        try { localStorage.setItem(this.key, next); } catch (_) { }
    }
};

function toggleTheme() { ThemeManager.toggle(); }

// -- Global Actions SOP --
const GlobalActions = {
    quickSend(type, id) {
        let recipient = '';
        let subject = '';
        let body = '';

        if (type === 'quote') {
            const quote = store.state.quotes.find(q => String(q.id) === String(id));
            if (quote) {
                recipient = quote.clientEmail || '';
                subject = `Proposal: ${quote.travelers} to ${quote.destination}`;
                body = `Hello,\n\nPlease find attached the proposal for your trip to ${quote.destination}.\n\nBest regards,`;
            }
        } else if (type === 'booking') {
            const booking = store.state.bookings.find(b => String(b.id) === String(id));
            if (booking) {
                recipient = booking.email || '';
                subject = `Booking Confirmation: ${booking.destination}`;
                body = `Hello,\n\nWe are pleased to confirm your booking for ${booking.destination}.\n\nBooking Reference: ${booking.id}\n\nBest regards,`;
            }
        } else if (type === 'client') {
            const client = (store.state.b2bClients.find(c => String(c.id) === String(id)) ||
                store.state.b2cClients.find(c => String(c.id) === String(id)));
            if (client) {
                recipient = client.email || '';
                subject = `Executive Update from TravelCRM`;
                body = `Hello ${client.name || ''},\n\nI hope this email finds you well.\n\nBest regards,`;
            }
        }

        // Logic to open mail composer (Mail module must be available)
        if (window.Mail && typeof Mail.openCompose === 'function') {
            Mail.openCompose({ recipient, subject, body });
        } else {
            UI.showToast(`Transmitting to ${recipient}...`, 'info');
            // Fallback: simple mailto if Mail module isn't loaded
            window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
    },

    whatsapp(phone) {
        if (!phone) return UI.showToast('No phone number provided', 'error');
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
};

window.GlobalActions = GlobalActions;

// Global link handler for mailto links (bypasses component sandboxes)
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.href.startsWith('mailto:')) {
        e.preventDefault();
        window.top.location.href = link.href;
    }
});
