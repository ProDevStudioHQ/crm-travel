/**
 * Audit Log V2 - Action Journal (who/what/when)
 * Tracks all user actions for accountability and debugging
 */

const AuditLog = {
    // Storage key
    STORAGE_KEY: 'pm_crm_audit_log',
    MAX_ENTRIES: 500, // Keep last 500 entries

    /**
     * Log an action
     * @param {string} module - Module name (e.g., 'clients', 'quotes')
     * @param {string} action - Action type (e.g., 'create', 'delete', 'update')
     * @param {string} target - Target description (e.g., 'Client #123')
     * @param {object} details - Additional details
     */
    log(module, action, target, details = {}) {
        const user = store.state?.currentUser || {};

        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            userId: user.id || 'unknown',
            userName: user.name || 'Unknown User',
            userRole: user.role || 'unknown',
            module: module,
            action: action,
            target: target,
            details: details,
            ip: 'local' // In a real app, this would come from the server
        };

        this._addEntry(entry);
        console.log(`[Audit] ${user.name || 'User'} ${action} ${target}`);

        return entry;
    },

    /**
     * Add entry to storage
     */
    _addEntry(entry) {
        const entries = this.getAll();
        entries.unshift(entry); // Add to beginning

        // Trim to max entries
        if (entries.length > this.MAX_ENTRIES) {
            entries.length = this.MAX_ENTRIES;
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
        } catch (e) {
            console.warn('[Audit] Storage full, clearing old entries');
            entries.length = 100;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
        }
    },

    /**
     * Get all audit entries
     * @returns {Array}
     */
    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Get entries filtered by criteria
     * @param {object} filters - Filter object
     * @returns {Array}
     */
    filter({ module, action, userId, startDate, endDate, limit = 100 } = {}) {
        let entries = this.getAll();

        if (module) {
            entries = entries.filter(e => e.module === module);
        }
        if (action) {
            entries = entries.filter(e => e.action === action);
        }
        if (userId) {
            entries = entries.filter(e => e.userId === userId);
        }
        if (startDate) {
            const start = new Date(startDate);
            entries = entries.filter(e => new Date(e.timestamp) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            entries = entries.filter(e => new Date(e.timestamp) <= end);
        }

        return entries.slice(0, limit);
    },

    /**
     * Clear all audit entries (admin only)
     */
    clear() {
        if (!RBAC.can('audit.view')) {
            UI.showToast('Access Denied', 'error');
            return false;
        }
        localStorage.removeItem(this.STORAGE_KEY);
        return true;
    },

    /**
     * Export audit log as CSV
     */
    exportCSV() {
        if (!RBAC.can('audit.export')) {
            UI.showToast('Access Denied', 'error');
            return;
        }

        const entries = this.getAll();
        const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Target', 'Details'];
        const rows = entries.map(e => [
            e.timestamp,
            e.userName,
            e.userRole,
            e.module,
            e.action,
            e.target,
            JSON.stringify(e.details)
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        UI.showToast('Audit log exported', 'success');
    },

    /**
     * Render audit log viewer (for settings/admin page)
     */
    renderViewer() {
        if (!RBAC.can('audit.view')) {
            return '<div class="alert alert-warning">Access Denied: Admin only.</div>';
        }

        const entries = this.filter({ limit: 50 });

        return `
            <div class="audit-log-container">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0;"><i class="fa-solid fa-clipboard-list"></i> Audit Log</h4>
                    <button class="btn-export" onclick="AuditLog.exportCSV()">
                        <i class="fa-solid fa-download"></i> Export
                    </button>
                </div>
                <div class="audit-log-list" style="max-height:400px; overflow-y:auto;">
                    ${entries.length === 0 ? '<div style="text-align:center; padding:30px; color:var(--text-muted);">No audit entries yet</div>' : ''}
                    ${entries.map(e => `
                        <div class="audit-entry" style="display:flex; gap:12px; padding:10px; border-bottom:1px solid var(--border); font-size:12px;">
                            <div style="color:var(--text-muted); min-width:140px;">${new Date(e.timestamp).toLocaleString()}</div>
                            <div style="min-width:100px;">${RBAC.getRoleBadge(e.userRole)}</div>
                            <div style="min-width:80px; font-weight:600;">${e.userName}</div>
                            <div style="flex:1;">
                                <span class="audit-action" style="background:var(--primary)20; color:var(--primary); padding:2px 6px; border-radius:4px; font-size:10px; text-transform:uppercase;">${e.action}</span>
                                <span style="margin-left:8px;">${e.target}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Shorthand methods for common actions
    logCreate(module, target, details) {
        return this.log(module, 'CREATE', target, details);
    },
    logUpdate(module, target, details) {
        return this.log(module, 'UPDATE', target, details);
    },
    logDelete(module, target, details) {
        return this.log(module, 'DELETE', target, details);
    },
    logView(module, target, details) {
        return this.log(module, 'VIEW', target, details);
    },
    logExport(module, target, details) {
        return this.log(module, 'EXPORT', target, details);
    },
    logImport(module, target, details) {
        return this.log(module, 'IMPORT', target, details);
    },
    logLogin(userName) {
        return this.log('auth', 'LOGIN', userName);
    },
    logLogout(userName) {
        return this.log('auth', 'LOGOUT', userName);
    }
};

// Expose globally
window.AuditLog = AuditLog;
