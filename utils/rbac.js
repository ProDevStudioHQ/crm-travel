/**
 * RBAC V2 - Role-Based Access Control Utility
 * Centralized permission management for Admin/Manager/Agent roles
 */

const RBAC = {
    // Permission matrix: action -> allowed roles
    _permissions: {
        // Client management
        'clients.view': ['admin', 'manager', 'agent', 'sales-agent'],
        'clients.create': ['admin', 'manager', 'agent'],
        'clients.edit': ['admin', 'manager', 'agent'],
        'clients.delete': ['admin', 'manager'],
        'clients.bulk_delete': ['admin', 'manager'],
        'clients.wipe_all': ['admin'],
        'clients.import': ['admin', 'manager'],
        'clients.export': ['admin', 'manager', 'agent'],
        'clients.assign': ['admin', 'manager'],

        // Leads management
        'leads.view': ['admin', 'manager', 'agent', 'sales-agent'],
        'leads.create': ['admin', 'manager', 'agent'],
        'leads.edit': ['admin', 'manager', 'agent'],
        'leads.delete': ['admin', 'manager'],
        'leads.convert': ['admin', 'manager', 'agent'],

        // Quotes/Proposals
        'quotes.view': ['admin', 'manager', 'agent', 'sales-agent'],
        'quotes.create': ['admin', 'manager', 'agent'],
        'quotes.edit': ['admin', 'manager', 'agent'],
        'quotes.delete': ['admin', 'manager'],
        'quotes.send': ['admin', 'manager', 'agent'],

        // Bookings
        'bookings.view': ['admin', 'manager', 'agent', 'sales-agent'],
        'bookings.create': ['admin', 'manager', 'agent'],
        'bookings.edit': ['admin', 'manager'],
        'bookings.cancel': ['admin', 'manager'],

        // Campaigns
        'campaigns.view': ['admin', 'manager', 'marketing'],
        'campaigns.create': ['admin', 'manager', 'marketing'],
        'campaigns.edit': ['admin', 'manager', 'marketing'],
        'campaigns.delete': ['admin', 'manager'],
        'campaigns.send': ['admin', 'manager'],

        // Settings
        'settings.view': ['admin', 'manager'],
        'settings.edit': ['admin'],
        'settings.smtp': ['admin'],
        'settings.users': ['admin'],

        // Reports/Dashboard
        'dashboard.view': ['admin', 'manager', 'agent', 'sales-agent', 'marketing'],
        'reports.view': ['admin', 'manager'],
        'reports.export': ['admin', 'manager'],

        // Audit
        'audit.view': ['admin'],
        'audit.export': ['admin']
    },

    // Role hierarchy (higher = more permissions)
    _roleHierarchy: {
        'admin': 100,
        'manager': 75,
        'agent': 50,
        'sales-agent': 40,
        'marketing': 30,
        'viewer': 10
    },

    /**
     * Check if current user has permission
     * @param {string} action - Action to check (e.g., 'clients.delete')
     * @returns {boolean}
     */
    can(action) {
        const user = store.state?.currentUser;
        if (!user || !user.role) return false;

        const allowedRoles = this._permissions[action];
        if (!allowedRoles) {
            console.warn(`[RBAC] Unknown permission: ${action}`);
            return false;
        }

        return allowedRoles.includes(user.role);
    },

    /**
     * Check if current user has ANY of the specified roles
     * @param {string[]} roles - Array of role names
     * @returns {boolean}
     */
    hasRole(...roles) {
        const user = store.state?.currentUser;
        if (!user || !user.role) return false;
        return roles.includes(user.role);
    },

    /**
     * Check if current user's role is at least the specified level
     * @param {string} minRole - Minimum role required
     * @returns {boolean}
     */
    isAtLeast(minRole) {
        const user = store.state?.currentUser;
        if (!user || !user.role) return false;

        const userLevel = this._roleHierarchy[user.role] || 0;
        const minLevel = this._roleHierarchy[minRole] || 0;

        return userLevel >= minLevel;
    },

    /**
     * Get current user's role
     * @returns {string|null}
     */
    getRole() {
        return store.state?.currentUser?.role || null;
    },

    /**
     * Check permission and show toast if denied
     * @param {string} action - Action to check
     * @param {boolean} showToast - Whether to show denial toast
     * @returns {boolean}
     */
    require(action, showToast = true) {
        if (this.can(action)) return true;

        if (showToast && window.UI) {
            UI.showToast('Access Denied: You do not have permission for this action.', 'error');
        }
        return false;
    },

    /**
     * Render element only if user has permission
     * @param {string} action - Action to check
     * @param {string} html - HTML to render if allowed
     * @returns {string}
     */
    renderIf(action, html) {
        return this.can(action) ? html : '';
    },

    /**
     * Get role display name
     * @param {string} role - Role key
     * @returns {string}
     */
    getRoleName(role) {
        const names = {
            'admin': 'Administrator',
            'manager': 'Manager',
            'agent': 'Agent',
            'sales-agent': 'Sales Agent',
            'marketing': 'Marketing',
            'viewer': 'Viewer'
        };
        return names[role] || role;
    },

    /**
     * Get role badge HTML
     * @param {string} role - Role key
     * @returns {string}
     */
    getRoleBadge(role) {
        const colors = {
            'admin': 'var(--danger)',
            'manager': 'var(--primary)',
            'agent': 'var(--success)',
            'sales-agent': 'var(--warning)',
            'marketing': 'var(--info)',
            'viewer': 'var(--text-muted)'
        };
        const color = colors[role] || 'var(--text-muted)';
        return `<span class="role-badge" style="background:${color}20; color:${color}; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600;">${this.getRoleName(role)}</span>`;
    }
};

// Expose globally
window.RBAC = RBAC;
