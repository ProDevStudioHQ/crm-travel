/**
 * Session Manager V2 - Session expiration and auto logout
 */

const SessionManager = {
    // Default session timeout (30 minutes)
    TIMEOUT_MS: 30 * 60 * 1000,
    WARNING_BEFORE_MS: 2 * 60 * 1000, // 2 minutes warning

    _timer: null,
    _warningTimer: null,
    _lastActivity: null,
    _warningShown: false,

    /**
     * Initialize session manager
     */
    init() {
        this._lastActivity = Date.now();
        this._setupActivityListeners();
        this._startTimer();

        // Check if session already expired on page load
        this._checkStoredSession();

        console.log('[SessionManager] Initialized with 30min timeout');
    },

    /**
     * Check stored session validity
     */
    _checkStoredSession() {
        const loginTime = localStorage.getItem('pm_crm_login_time');
        if (loginTime) {
            const elapsed = Date.now() - parseInt(loginTime, 10);
            if (elapsed > this.TIMEOUT_MS) {
                this.logout('Session expired. Please log in again.');
            }
        }
    },

    /**
     * Setup user activity listeners
     */
    _setupActivityListeners() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => this._onActivity(), { passive: true });
        });
    },

    /**
     * Handle user activity
     */
    _onActivity() {
        this._lastActivity = Date.now();

        // Dismiss warning if shown
        if (this._warningShown) {
            this._warningShown = false;
            this._dismissWarning();
        }

        // Reset timers
        this._startTimer();
    },

    /**
     * Start/reset session timers
     */
    _startTimer() {
        clearTimeout(this._timer);
        clearTimeout(this._warningTimer);

        // Warning timer
        this._warningTimer = setTimeout(() => {
            this._showWarning();
        }, this.TIMEOUT_MS - this.WARNING_BEFORE_MS);

        // Logout timer
        this._timer = setTimeout(() => {
            this.logout('Session expired due to inactivity.');
        }, this.TIMEOUT_MS);
    },

    /**
     * Show session expiration warning
     */
    _showWarning() {
        if (this._warningShown) return;
        this._warningShown = true;

        // Create warning toast
        const warningEl = document.createElement('div');
        warningEl.id = 'session-warning';
        warningEl.className = 'session-warning-toast';
        warningEl.innerHTML = `
            <div class="session-warning-content">
                <i class="fa-solid fa-clock" style="color:var(--warning); font-size:24px;"></i>
                <div>
                    <div style="font-weight:700; margin-bottom:4px;">Session Expiring Soon</div>
                    <div style="font-size:12px; opacity:0.8;">You will be logged out in 2 minutes due to inactivity.</div>
                </div>
                <button class="btn-primary btn-sm" onclick="SessionManager.extend()">Stay Logged In</button>
            </div>
        `;
        document.body.appendChild(warningEl);

        // Animate in
        setTimeout(() => warningEl.classList.add('visible'), 10);
    },

    /**
     * Dismiss warning
     */
    _dismissWarning() {
        const warningEl = document.getElementById('session-warning');
        if (warningEl) {
            warningEl.classList.remove('visible');
            setTimeout(() => warningEl.remove(), 300);
        }
    },

    /**
     * Extend session
     */
    extend() {
        this._lastActivity = Date.now();
        localStorage.setItem('pm_crm_login_time', Date.now().toString());
        this._warningShown = false;
        this._dismissWarning();
        this._startTimer();

        if (window.UI) {
            UI.showToast('Session extended', 'success');
        }
    },

    /**
     * Logout user
     */
    logout(message = 'You have been logged out.') {
        clearTimeout(this._timer);
        clearTimeout(this._warningTimer);

        // Clear session data
        localStorage.removeItem('pm_crm_user_id');
        localStorage.removeItem('pm_crm_user_role');
        localStorage.removeItem('pm_crm_user_name');
        localStorage.removeItem('pm_crm_token');
        localStorage.removeItem('pm_crm_login_time');

        // Show message and redirect
        if (window.UI) {
            UI.showToast(message, 'warning');
        }

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    },

    /**
     * Record login time
     */
    recordLogin() {
        localStorage.setItem('pm_crm_login_time', Date.now().toString());
    },

    /**
     * Get remaining session time in minutes
     */
    getRemainingTime() {
        const elapsed = Date.now() - this._lastActivity;
        const remaining = this.TIMEOUT_MS - elapsed;
        return Math.max(0, Math.ceil(remaining / 60000));
    }
};

// Expose globally
window.SessionManager = SessionManager;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init if user is logged in
    if (localStorage.getItem('pm_crm_user_id')) {
        SessionManager.init();
    }
});
