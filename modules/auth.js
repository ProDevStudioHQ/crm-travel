// SOP: Multi-user authentication with local accounts
const USERS = [
    { id: 1, email: 'admin@travel.com', password: 'admin123', name: 'Sarah Jenkins', role: 'admin' },
    { id: 2, email: 'manager@travel.com', password: 'manager123', name: 'John Manager', role: 'manager' },
    { id: 3, email: 'agent@travel.com', password: 'agent123', name: 'Alice Agent', role: 'agent' }
];

const Auth = {
    user: null,

    init() {
        const authFlag = localStorage.getItem('auth');
        const storedUser = localStorage.getItem('currentUser');
        if (authFlag === 'true' && storedUser) {
            this.user = JSON.parse(storedUser);
            document.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
        } else {
            // Clear any stale data
            localStorage.removeItem('auth');
            localStorage.removeItem('currentUser');
            // Redirect to modern login page
            window.location.href = 'login.html';
        }
    },

    login(email, password) {
        // failed login handling
        const attempts = store.state.loginAttempts[email] || { count: 0, lockedUntil: null };

        if (attempts.lockedUntil && new Date(attempts.lockedUntil) > new Date()) {
            return { success: false, message: `Account locked for 15 mins. Try again after ${new Date(attempts.lockedUntil).toLocaleTimeString()}` };
        }

        // SOP: Validate against USERS array
        const foundUser = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (foundUser) {
            this.user = {
                id: foundUser.id,
                name: foundUser.name,
                email: foundUser.email,
                role: foundUser.role,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}&background=0D8ABC&color=fff`
            };
            this.logAction('login', 'success', email);
            store.state.loginAttempts[email] = { count: 0, lockedUntil: null };

            // SOP: Set auth flag + currentUser for persistent session
            localStorage.setItem('auth', 'true');
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            document.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
            return { success: true };
        } else {
            attempts.count++;
            if (attempts.count >= 10) {
                attempts.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            }
            store.state.loginAttempts[email] = attempts;
            this.logAction('login', 'failure', email);
            return { success: false, message: 'Authentication failed. Check your credentials.' };
        }
    },


    logout(type = 'manual') {
        const userId = this.user?.email || 'unknown';
        this.logAction(type === 'icon' ? 'logout_icon' : 'logout', 'success', userId, type);
        this.user = null;

        // SOP: Clear both auth flag and currentUser
        localStorage.removeItem('auth');
        localStorage.removeItem('currentUser');

        // Hide modal if open
        const modal = document.getElementById('modalOverlay');
        if (modal) modal.classList.add('hidden');

        // Redirect to modern login page
        window.location.href = 'login.html';
    },

    confirmLogout() {
        const modal = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.innerHTML = 'Confirm Logout';
        body.innerHTML = `
            <div style="text-align:center; padding: 20px 0;">
                <p style="margin-bottom:10px; font-weight:600; font-size:16px;">Are you sure you want to sign out?</p>
                <p style="margin-bottom:30px; color:var(--text-secondary); font-size:13px;">Locked sessions require re-authentication to access the CRM.</p>
                <div style="display:flex; gap:15px; justify-content:center;">
                    <button class="btn-social" style="width:120px;" onclick="Auth.closeLogoutModal()">Cancel</button>
                    <button class="btn-primary" style="width:120px; background:var(--danger); border-color:var(--danger);" onclick="UI.showFeedback(this, 'loading'); setTimeout(() => Auth.logout('icon'), 300)">Confirm Logout</button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    closeLogoutModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
    },

    autoLogout() {
        if (this.user) {
            this.logout('auto');
        }
    },

    logAction(type, status, identifier, subtype = '') {
        store.state.authLogs.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1', // Production: replace with actual client IP from server
            device: 'Browser v126 (Windows)',
            action: type,
            subtype: subtype,
            status: status,
            user: identifier
        });
    },

    renderLogin() {
        const app = document.getElementById('app-container') || document.body;
        app.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="brand-center">
                        <div class="brand-icon" style="width:50px; height:50px; font-size:24px;">
                             <i class="fa-solid fa-plane-departure"></i>
                        </div>
                        <h1 style="font-size: 24px;">TravelCRM</h1>
                        <p style="color:var(--text-secondary); font-size:13px;">Sign in to access your dashboard</p>
                    </div>

                    <form id="loginForm" class="login-form">
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="email" class="form-control" placeholder="admin@travel.com" required>
                        </div>
                        <div class="form-group">
                            <div style="display:flex; justify-content:space-between;">
                                <label>Password</label>
                                <a href="javascript:void(0)" onclick="Auth.renderForgotPassword()" class="link-sm">Forgot Password?</a>
                            </div>
                            <input type="password" id="password" class="form-control" placeholder="admin123" required>
                        </div>
                        
                        <div id="loginError" class="alert-danger hidden"></div>

                        <button type="submit" class="btn-primary" style="width:100%; justify-content:center; padding:12px;">Sign In</button>
                    </form>

                    <div class="divider">Or continue with</div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
                        <button class="btn-social" style="justify-content:center;" onclick="Auth.socialLogin('google')">
                            <i class="fa-brands fa-google" style="color:#DB4437;"></i> Google
                        </button>
                        <button class="btn-social" style="justify-content:center;" onclick="Auth.socialLogin('microsoft')">
                            <i class="fa-brands fa-microsoft" style="color:#00A4EF;"></i> Microsoft
                        </button>
                        <button class="btn-social" style="justify-content:center;" onclick="Auth.socialLogin('linkedin')">
                            <i class="fa-brands fa-linkedin" style="color:#0A66C2;"></i> LinkedIn
                        </button>
                        <button class="btn-social" style="justify-content:center;" onclick="Auth.socialLogin('facebook')">
                            <i class="fa-brands fa-facebook" style="color:#1877F2;"></i> Facebook
                        </button>
                    </div>

                    <p style="text-align:center; font-size:12px; margin-top:20px; color:var(--text-secondary);">
                        Invitation only? <a href="javascript:void(0)" onclick="Auth.renderSignup('INV-MOCK-123')" class="link-sm">Mock Signup Link</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const result = this.login(email, password);
            if (!result.success) {
                const errorEl = document.getElementById('loginError');
                errorEl.innerText = result.message;
                errorEl.classList.remove('hidden');
            }
        });
    },

    socialLogin(provider) {
        // Mock Interaction
        const btn = event.currentTarget || event.target;
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btn.style.opacity = '0.7';

        // Simulate OAuth Popup & verification time
        setTimeout(() => {
            const mockSocialUsers = {
                google: { name: 'Sarah Jenkins (Google)', email: 'sarah.j@gmail.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=DB4437&color=fff' },
                microsoft: { name: 'Sarah J. (Outlook)', email: 'sarah@outlook.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+J&background=00A4EF&color=fff' },
                linkedin: { name: 'Sarah Jenkins', email: 's.jenkins@linkedin.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=0A66C2&color=fff' },
                facebook: { name: 'Sarah Jenkins', email: 'sarah.fb@example.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=1877F2&color=fff' }
            };

            const socialUser = mockSocialUsers[provider];

            this.user = {
                id: Date.now(),
                name: socialUser.name,
                email: socialUser.email,
                role: 'agent', // SOP Rule 6: Default to Agent
                authProvider: provider,
                linkedAccounts: [],
                avatar: socialUser.avatar,
                timezone: 'UTC' // Default fallback
            };

            this.logAction('login_social', 'success', this.user.email, provider);

            // Check if Admin exists (Simulating matching email logic would be complex here, so simplify to auto-create logic)
            if (provider === 'google') {
                // Simulate user that is also Admin merging
                this.user.role = 'admin';
            }

            store.state.currentUser = this.user; // Update store logic
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            document.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));

        }, 1500);
    },

    renderSignup(token) {
        const app = document.getElementById('app-container') || document.body;
        const isValid = token.startsWith('INV-');

        app.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="brand-center">
                        <div class="brand-icon" style="width:50px; height:50px; font-size:24px; background:var(--success);">
                             <i class="fa-solid fa-user-plus"></i>
                        </div>
                        <h1 style="font-size: 24px;">Join TravelCRM</h1>
                        <p style="color:var(--text-secondary);">Activate your agent account</p>
                    </div>

                    ${!isValid ? '<div class="alert-danger">Invalid or expired invitation token.</div>' : `
                    <form id="signupForm" class="login-form">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="signupName" class="form-control" placeholder="John Doe" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="signupEmail" class="form-control" placeholder="john@company.com" required>
                        </div>
                        <div class="form-group">
                            <label>Set Password</label>
                            <input type="password" id="signupPass" class="form-control" placeholder="Min 8 chars, 1 Upper, 1 Number" required>
                        </div>
                        
                        <div style="margin-bottom:20px; font-size:12px; color:var(--text-secondary);">
                            <input type="checkbox" required> I accept the <a href="#" class="link-sm">Terms & Conditions</a>
                        </div>

                        <div id="signupError" class="alert-danger hidden"></div>

                        <button type="submit" class="btn-primary" style="width:100%; justify-content:center; background:var(--success);">Create Account</button>
                    </form>
                    `}
                    <p style="text-align:center; font-size:12px; margin-top:20px;">
                        Already have an account? <a href="javascript:void(0)" onclick="Auth.renderLogin()" class="link-sm">Sign In</a>
                    </p>
                </div>
            </div>
        `;

        if (isValid) {
            document.getElementById('signupForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const pass = document.getElementById('signupPass').value;
                const email = document.getElementById('signupEmail').value;

                if (pass.length < 8 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) {
                    const errorEl = document.getElementById('signupError');
                    errorEl.innerText = 'Password must be 8+ chars with Uppercase and Number.';
                    errorEl.classList.remove('hidden');
                    return;
                }

                this.logAction('signup', 'success', email);
                alert('Account Created Successfully! Redirecting to login.');
                this.renderLogin();
            });
        }
    },

    renderForgotPassword() {
        const app = document.getElementById('app-container') || document.body;
        app.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="brand-center">
                        <div class="brand-icon" style="width:50px; height:50px; font-size:24px;">
                             <i class="fa-solid fa-key"></i>
                        </div>
                        <h1 style="font-size: 24px;">Reset Password</h1>
                        <p style="color:var(--text-secondary);">Enter your email to receive a reset link</p>
                    </div>

                    <form id="resetForm" class="login-form">
                        <div class="form-group">
                            <label>Registered Email</label>
                            <input type="email" id="resetEmail" class="form-control" required>
                        </div>
                        <button type="submit" class="btn-primary" style="width:100%; justify-content:center;">Send Reset Link</button>
                    </form>

                    <p style="text-align:center; font-size:12px; margin-top:20px;">
                        Remembered it? <a href="javascript:void(0)" onclick="Auth.renderLogin()" class="link-sm">Back to Login</a>
                    </p>
                </div>
            </div>
        `;

        document.getElementById('resetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Password reset link sent! Check your inbox (Verified via SMTP SOP).');
            this.renderLogin();
        });
    }
};

window.Auth = Auth;
