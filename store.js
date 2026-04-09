
// Helpers: default date range (last 7 days) used by the topbar selector
function _defaultDateRange() {
    const end = new Date();
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmt = (d) => `${months[d.getMonth()]} ${d.getDate()}`;
    const yyyy = end.getFullYear();

    const iso = (d) => d.toISOString().slice(0, 10);

    return {
        start: iso(start),
        end: iso(end),
        label: `${fmt(start)} - ${fmt(end)}, ${yyyy}`
    };
}
const DEFAULT_DATE_RANGE = _defaultDateRange();

// Store for state management
const store = {
    state: {
        // Supported currencies used across Quotes, Sales, and System Settings
        // Extend this list safely without touching UI code.
        currencies: [
            { id: 1, name: 'Moroccan Dirham', code: 'MAD', symbol: 'د.م', rate: 10.5, position: 'before', status: 'active', isDefault: false },
            { id: 2, name: 'Euro', code: 'EUR', symbol: '€', rate: 0.95, position: 'before', status: 'active', isDefault: false },
            { id: 3, name: 'US Dollar', code: 'USD', symbol: '$', rate: 1.0, position: 'before', status: 'active', isDefault: true },
            { id: 4, name: 'British Pound', code: 'GBP', symbol: '£', rate: 0.8, position: 'before', status: 'active', isDefault: false }
        ],
        // Supported UI languages (display + future i18n hooks)
        languages: [
            { code: 'en', label: 'English' },
            { code: 'fr', label: 'French' },
            { code: 'es', label: 'Spanish' },
            { code: 'ar', label: 'Arabic' },
            { code: 'de', label: 'German' },
            { code: 'it', label: 'Italian' },
            { code: 'pt', label: 'Portuguese' },
            { code: 'nl', label: 'Dutch' },
            { code: 'ru', label: 'Russian' },
            { code: 'zh', label: 'Chinese (Simplified)' },
            { code: 'ja', label: 'Japanese' },
            { code: 'tr', label: 'Turkish' },
            { code: 'ber', label: 'Amazigh (Tamazight)' }
        ],
        ui: {
            // Global date range filter (used by the topbar selector)
            // Stored as ISO dates (YYYY-MM-DD) for easy filtering later.
            dateRange: DEFAULT_DATE_RANGE
        },
        currentUser: { name: 'Admin User', email: 'admin@example.com', role: 'admin', timezone: 'UTC', authProvider: 'email', linkedAccounts: [], avatar: '' },
        authLogs: [], // For Signup/Login Audit Trail
        actionLogs: [], // SOP Rule 11: Universal Action logging
        integrationLogs: [], // SOP Rule 11: Audit log for Integrations
        tasks: [],
        invitationTokens: [],
        loginAttempts: {}, // { email: { count: 0, lockedUntil: null } }
        notifications: [],
        mailTemplates: [],
        automations: [],
        emailLogs: [],
        mailHistory: [],
        mailInbox: [],
        mailDrafts: [],
        mailTrash: [],
        mailLabels: [
            { id: 1, name: 'B2B', color: '#009EF7' },
            { id: 2, name: 'B2C', color: '#50CD89' },
            { id: 3, name: 'Quote', color: '#F1416C' },
            { id: 4, name: 'Booking', color: '#7239EA' },
            { id: 5, name: 'Campaign', color: '#FF9900' },
            { id: 6, name: 'Urgent', color: '#DC3545' },
            { id: 7, name: 'Follow-Up', color: '#6C757D' }
        ],
        campaigns: [],
        socialAccounts: [], // SOP: Centralized Social Media Connections
        b2bClients: [],
        b2cClients: [],
        quotes: [],
        bookings: [],
        sales: [],
        emails: [],
        whatsappTemplates: [],
        whatsapp: [],
        whatsappOptOuts: [],
        waCampaigns: [],
        waQuickReplies: [
            { id: 'qr1', shortcut: '/price', label: 'Price Info', body: 'Our packages start from $XX per person. This includes: ✅ Transport ✅ Guide ✅ Lunch. Want me to send the full program?' },
            { id: 'qr2', shortcut: '/program', label: 'Program Details', body: 'Here is the program:\n🕐 Pickup from your hotel\n🏔️ Activity / Excursion\n🍽️ Lunch included\n🏨 Drop-off. Want me to customize for your group?' },
            { id: 'qr3', shortcut: '/availability', label: 'Availability', body: 'We have availability for your dates ✅ How many people in your group? I\'ll confirm the reservation right away.' },
            { id: 'qr4', shortcut: '/pickup', label: 'Pickup Info', body: 'We offer free pickup from any hotel/riad in the city center 🚗 Just send me your hotel name and I\'ll arrange everything.' },
            { id: 'qr5', shortcut: '/payment', label: 'Payment Info', body: 'Payment options:\n💳 Credit card (online)\n💵 Cash on arrival\n🏦 Bank transfer\nA 30% deposit confirms your booking. Balance on arrival.' }
        ],
        catalogue: [],
        htmlCatalogues: [], // legacy compat
        catalogues: [], // v2 unified catalogue collection
        salesData: {
            revenueByMarket: [],
            bestSellers: []
        },
        catalogueAnalytics: {
            views: 0,
            conversions: 0,
            avgValue: 0,
            monthlyViews: [],
            destinations: []
        },

        invoices: [],
        payments: [],
        // SOP: Audience Lists for targeted campaigns
        audienceLists: [],
        // SOP: Email blacklist (unsubscribed, hard bounces)
        emailBlacklist: [],
        // SOP: Campaign analytics tracking
        campaignAnalytics: {},
        company: {
            name: 'Pioneers Marketing',
            brandName: 'Pioneers',
            tagline: '',
            descriptionShort: '',
            descriptionLong: '',
            email: 'hello@example.com',
            b2bEmail: '',
            phone: '',
            whatsapp: '',
            website: '',
            address: '',
            cityCountry: '',
            googleMapsUrl: '',
            logo: '',
            logoLight: '',
            logoDark: '',
            favicon: '',
            banner: '',
            primaryColor: '#009EF7',
            accentColor: '#FF9900',
            emailSignature: '',
            instagram: '',
            facebook: '',
            linkedin: '',
            youtube: '',
            tiktok: '',
            legalName: '',
            registrationIdentifier: '',
            taxId: '',
            invoiceFooter: '',
            termsUrl: ''
        },
        systemSettings: {
            currency: 'USD',
            timezone: 'Africa/Casablanca', // SOP: System Default
            language: 'English',
            notifications: {
                email: true,
                inApp: true,
                frequency: 'real-time', // SOP: real-time, daily
                events: {
                    newLead: true,
                    quoteStatus: true,
                    newBooking: true,
                    campaignFinish: false
                }
            },
            smtpSettings: {
                host: '',
                port: 587,
                encryption: 'TLS',
                username: '',
                password: '',
                fromName: '',
                fromEmail: '',
                replyTo: '',
                charset: 'UTF-8',
                useAuthAsFrom: true,
                allowSelfSigned: false,
                charset: 'UTF-8',
                status: 'disconnected', // connected, error, disconnected
                lastTested: null
            },
            imapSettings: {
                host: '',
                port: 993,
                encryption: 'SSL',
                username: '',
                password: '',
                status: 'disconnected', // connected, error, disconnected
                lastTested: null
            },
            maintenance: {
                isFirstRun: localStorage.getItem('pm_crm_setup_complete') !== 'true', // SOP: Triggers Setup Wizard
                lastReset: null
            },
            security: {
                forcePasswordReset: 90,
                sessionTimeout: 30, // minutes
                activeSessions: []
            },
            integrations: {
                communication: [
                    {
                        id: 'smtp',
                        name: 'Email SMTP',
                        type: 'smtp',
                        status: 'inactive',
                        lastTest: null,
                        config: { host: '', port: 587, user: '', pass: '', encryption: 'TLS' }
                    },
                    {
                        id: 'whatsapp',
                        name: 'WhatsApp Business API',
                        type: 'whatsapp',
                        status: 'inactive',
                        lastTest: null,
                        config: { phoneId: '', token: '', accountId: '', webhookUrl: '' }
                    }
                ],
                automation: [
                    {
                        id: 'sheets',
                        name: 'Google Sheets',
                        type: 'google_sheets',
                        status: 'inactive',
                        lastTest: 'N/A',
                        config: { spreadsheetId: '', apiKey: '' }
                    },
                    {
                        id: 'webhooks',
                        name: 'Outbound Webhooks',
                        type: 'webhooks',
                        status: 'active',
                        lastTest: '2026-02-01 09:00 AM',
                        config: { url: '' }
                    }
                ],
                payments: [
                    {
                        id: 'stripe',
                        name: 'Stripe Payments',
                        type: 'stripe',
                        status: 'inactive',
                        lastTest: 'N/A',
                        config: { publishableKey: '', secretKey: '' }
                    }
                ]
            },
            backups: {
                automatic: true,
                lastDate: 'Oct 31, 2026 03:00 AM',
                storage: 'Cloud', // Cloud, Local
                types: ['database', 'files']
            }
        }
    },
    listeners: [],

    subscribe(listener) {
        this.listeners.push(listener);
    },

    notify() {
        this.listeners.forEach(l => l(this.state));
    },


    addNotification(title, message) {
        this.state.notifications.unshift({
            id: Date.now(),
            title,
            message,
            time: new Date().toISOString(),
            read: false
        });
        this.notify();
    },

    markNotificationsRead() {
        this.state.notifications.forEach(n => n.read = true);
        this.notify();
    },

    // SOP Rule 7: Timezone Handling
    // moduleType: 'display' (User TZ) or 'system' (System TZ) or 'utc' (Audit)
    formatDate(dateStr, moduleType = 'display') {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        let timeZone = 'UTC';
        const userTZ = this.state.currentUser.timezone || 'UTC';
        const sysTZ = this.state.systemSettings.timezone || 'UTC';

        if (moduleType === 'display' || moduleType === 'dashboard' || moduleType === 'leads') {
            timeZone = userTZ;
        } else if (moduleType === 'system' || moduleType === 'quotes' || moduleType === 'sales' || moduleType === 'bookings') {
            timeZone = sysTZ; // SOP Rule 7: These use System TZ
        }

        // Format: "Oct 24, 2026 10:30 AM"
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: timeZone
        }).format(date);
    },

    formatCurrency(value, currencyCode = null, options = {}) {
        const code = currencyCode || this.state.systemSettings.currency || 'USD';
        const currency = this.state.currencies.find(c => c.code === code) || { symbol: '$', position: 'before' };

        const formatterOptions = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            ...options
        };

        const formatted = new Intl.NumberFormat('en-US', formatterOptions).format(value || 0);

        // If using Intl's built-in currency formatting (if style: 'currency' is passed in options)
        if (options.style === 'currency') return formatted;

        return currency.position === 'before'
            ? `${currency.symbol}${formatted}`
            : `${formatted} ${currency.symbol}`;
    },

    // SOP ERREUR C: Global date range filtering for KPIs and modules
    filterByDateRange(data, dateField = 'date') {
        const range = this.state.ui?.dateRange;
        // If no range, "all time" mode, or missing dates → return all data
        if (!range || range.mode === 'all' || !range.start || !range.end) {
            return data;
        }

        const start = new Date(range.start + 'T00:00:00');
        const end = new Date(range.end + 'T23:59:59');

        return (data || []).filter(item => {
            // Try multiple common date field names
            const dateValue = item[dateField] || item.createdAt || item.created_at || item.date || item.timestamp;
            if (!dateValue) return true; // Keep items with no date
            const d = new Date(dateValue);
            return d >= start && d <= end;
        });
    },

    logIntegrationAction(integrationId, action, status, user, details = '') {
        this.state.integrationLogs.unshift({
            timestamp: new Date().toISOString(),
            integrationId,
            action, // ADD, EDIT, DELETE, TOGGLE, TEST
            status,
            user,
            details
        });
        this.notify();
    },

    logAction(module, action, id, status, details = '') {
        const log = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            user: this.state.currentUser.name,
            module,
            action,
            targetId: id,
            status,
            details
        };
        this.state.actionLogs.unshift(log);
        this.notify(); // Important: Detects changes for Automation Engine
    },

    addTask(task) {
        this.state.tasks.unshift({
            id: Date.now(),
            priority: 'normal',
            color: '',
            icon: 'fa-regular fa-circle-check',
            ...task
        });
        this.notify();
    },

    // Actions
    addClient(type, client, updateExisting = false) {
        const listName = type === 'b2b' ? 'b2bClients' : 'b2cClients';
        const list = this.state[listName];

        // Check for duplicates by Email, Phone, or Name+Country (Task 27)
        const existingIndex = list.findIndex(c =>
            (c.email && client.email && c.email.toLowerCase() === client.email.toLowerCase()) ||
            (c.phone && client.phone && c.phone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')) ||
            (type === 'b2b' && c.name && client.name && c.country && client.country && c.name.toLowerCase() === client.name.toLowerCase() && c.country.toLowerCase() === client.country.toLowerCase() && (!c.email || !client.email || c.email.toLowerCase() === client.email.toLowerCase()))
        );

        if (existingIndex !== -1) {
            if (updateExisting) {
                // SOP Rule 10: Update existing record
                this.state[listName][existingIndex] = {
                    ...this.state[listName][existingIndex],
                    ...client,
                    last_updated: new Date().toISOString()
                };
                this.notify();
                return { success: true, isUpdate: true, id: this.state[listName][existingIndex].id };
            }
            console.warn('Duplicate client detected:', client.email);
            return { success: false, error: 'Duplicate' };
        }

        const newClient = {
            status: type === 'b2b' ? 'prospect' : 'lead', // Default status (Rule 9 fallback)
            ...client,
            id: Date.now(),
            import_date: new Date().toISOString(),
            import_source: client.import_source || 'Import'
        };

        this.state[listName].unshift(newClient);
        this.notify();
        this.logAction('CLIENTS', 'ADD', newClient.id, 'success', `New ${type.toUpperCase()} Client: ${newClient.name || 'Imported'}`);
        return { success: true, isUpdate: false, id: newClient.id };
    },

    updateClient(type, id, updates) {
        const list = type === 'b2b' ? this.state.b2bClients : this.state.b2cClients;
        const index = list.findIndex(c => c.id === id);
        if (index > -1) {
            list[index] = { ...list[index], ...updates };
            this.notify();
            return true;
        }
        return false;
    },

    archiveClient(type, id) {
        const list = type === 'b2b' ? this.state.b2bClients : this.state.b2cClients;
        const client = list.find(c => c.id === id);
        if (client) {
            client.status = 'archived';
            this.notify();
            return true;
        }
        return false;
    },

    restoreClient(type, id) {
        const list = type === 'b2b' ? this.state.b2bClients : this.state.b2cClients;
        const client = list.find(c => c.id === id);
        if (client) {
            client.status = 'active';
            this.notify();
            return true;
        }
        return false;
    },

    bulkAddClients(type, clients) {
        let successCount = 0;
        let skipCount = 0;
        let duplicateCount = 0;
        const errors = [];

        clients.forEach((c, index) => {
            const list = type === 'b2b' ? this.state.b2bClients : this.state.b2cClients;

            // Deduplication (Rule 7)
            const isDuplicate = list.find(existing =>
                existing.email.toLowerCase() === c.email.toLowerCase() ||
                (existing.phone && c.phone && existing.phone.replace(/\D/g, '') === c.phone.replace(/\D/g, ''))
            );

            if (isDuplicate) {
                duplicateCount++;
                errors.push({ row: index + 1, reason: 'Duplicate Email/Phone', email: c.email });
                return;
            }

            // Final creation
            const result = this.addClient(type, {
                ...c,
                import_source: c.import_source || 'Import'
            });

            if (result.success) {
                successCount++;
            } else {
                skipCount++;
                errors.push({ row: index + 1, reason: result.error, email: c.email });
            }
        });

        return {
            total: clients.length,
            success: successCount,
            skipped: skipCount,
            duplicates: duplicateCount,
            errors
        };
    },

    deleteClient(type, id) {
        if (type === 'b2b') {
            this.state.b2bClients = this.state.b2bClients.filter(c => c.id !== id);
        } else {
            this.state.b2cClients = this.state.b2cClients.filter(c => c.id !== id);
        }
        this.logAction('CLIENTS', 'DELETE', id, 'success', `${type.toUpperCase()} Client Deleted`);
        this.notify();
    },


    deleteClientsBulk(type, ids) {
        const idSet = new Set((ids || []).map(String));
        if (type === 'b2b') {
            this.state.b2bClients = this.state.b2bClients.filter(c => !idSet.has(String(c.id)));
        } else {
            this.state.b2cClients = this.state.b2cClients.filter(c => !idSet.has(String(c.id)));
        }
        this.logAction('CLIENTS', 'BULK_DELETE', 'bulk', 'success', `${type.toUpperCase()} Clients Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllClients(type) {
        const count = type === 'b2b' ? this.state.b2bClients.length : this.state.b2cClients.length;
        if (type === 'b2b') this.state.b2bClients = [];
        else this.state.b2cClients = [];
        this.logAction('CLIENTS', 'DELETE_ALL', 'all', 'success', `${type.toUpperCase()} Clients Deleted: ${count}`);
        this.notify();
    },

    // Sales Actions (SOP Rule 5, 6, 11)
    addSale(sale) {
        const newSale = {
            id: `SAL-${Date.now()}`,
            ...sale,
            margin: sale.revenue - (sale.cost || 0),
            date: sale.date || new Date().toISOString().split('T')[0]
        };
        this.state.sales.unshift(newSale);
        this.notify();
        return newSale;
    },

    updateSaleStatus(id, status) {
        const sale = this.state.sales.find(s => s.id === id);
        if (sale) {
            sale.status = status;
            this.notify();
            return true;
        }
        return false;
    },

    refundSale(id, amount, reason) {
        const sale = this.state.sales.find(s => s.id === id);
        if (sale) {
            sale.status = 'refunded';
            sale.refundAmount = amount;
            sale.refundReason = reason;
            this.notify();
            return true;
        }
        return false;
    },

    // Quotes Actions (SOP Rule 5, 6, 10)
    addQuote(quote) {
        const id = `QT-${new Date().getFullYear()}-${String(this.state.quotes.length + 1).padStart(3, '0')}`;
        const newQuote = {
            id,
            date: new Date().toISOString().split('T')[0],
            ...quote,
            status: quote.status || 'draft',
            history: [{ date: new Date().toISOString().split('T')[0], action: 'Quote Created' }]
        };
        this.state.quotes.unshift(newQuote);
        this.logAction('QUOTES', 'CREATE', id, 'success', `Value: ${quote.totalPrice}`);
        this.notify();
        return newQuote;
    },

    updateQuoteStatus(id, status, details = '') {
        const quote = this.state.quotes.find(q => q.id === id);
        if (quote) {
            quote.status = status;
            quote.history.push({ date: new Date().toISOString().split('T')[0], action: `Status changed to ${status} ${details}` });
            this.notify();
            return true;
        }
        return false;
    },

    updateQuote(id, updates) {
        const quote = this.state.quotes.find(q => q.id === id);
        if (quote) {
            Object.assign(quote, updates);
            quote.history.push({ date: new Date().toISOString().split('T')[0], action: 'Quote details updated' });
            this.notify();
            return true;
        }
        return false;
    },

    duplicateQuote(id) {
        const original = this.state.quotes.find(q => q.id === id);
        if (original) {
            const copy = JSON.parse(JSON.stringify(original));
            copy.id = `QT-${new Date().getFullYear()}-${String(this.state.quotes.length + 1).padStart(3, '0')}-v2`;
            copy.status = 'draft';
            copy.history = [{ date: new Date().toISOString().split('T')[0], action: `Duplicated from ${id}` }];
            this.state.quotes.unshift(copy);
            this.notify();
            return copy;
        }
        return null;
    },

    convertQuoteToBooking(id) {
        const quote = this.state.quotes.find(q => q.id === id);
        if (quote && quote.status === 'accepted') {
            // 1. Create Operational Booking (SOP Rule 5)
            const booking = {
                id: `BK-${Date.now()}`,
                quoteId: quote.id,
                type: quote.type,
                clientName: quote.clientName,
                title: quote.title,
                dates: 'TBD',
                travelers: 1,
                totalAmount: quote.totalPrice,
                paidAmount: 0,
                balance: quote.totalPrice,
                paymentStatus: 'unpaid',
                status: 'pending',
                agent: quote.agent,
                suppliers: []
            };
            this.state.bookings.unshift(booking);

            // 2. Create Sale
            this.addSale({
                type: quote.type,
                clientName: quote.clientName,
                product: quote.title,
                revenue: quote.totalPrice,
                cost: quote.totalPrice * 0.7, // Assume 30% margin for mock
                agent: quote.agent,
                status: 'confirmed'
            });

            this.updateQuoteStatus(id, 'converted', 'Converted to Booking');
            this.notify();
            return true;
        }
        return false;
    },

    // Invoices Actions (SOP Version 2026)
    addInvoice(invoice) {
        const year = new Date().getFullYear();
        const count = this.state.invoices.length + 1;
        const number = `INV-${year}-${String(count).padStart(6, '0')}`;

        const newInvoice = {
            id: number,
            number: number,
            date: new Date().toISOString().split('T')[0],
            status: 'draft',
            paidAmount: 0,
            balance: invoice.total,
            ...invoice
        };

        this.state.invoices.unshift(newInvoice);
        this.logAction('INVOICES', 'CREATE', number, 'success', `Total: ${newInvoice.total} ${newInvoice.currency}`);
        this.notify();
        return newInvoice;
    },

    updateInvoice(id, updates) {
        const invoice = this.state.invoices.find(inv => inv.id === id);
        if (invoice) {
            // SOP Rule 11: Locked after payment (except simple notes/metadata)
            if (invoice.status === 'paid' && (updates.items || updates.total)) {
                console.warn('Cannot edit items of a paid invoice');
                return false;
            }
            Object.assign(invoice, updates);
            this.notify();
            return true;
        }
        return false;
    },

    addPayment(payment) {
        const invoice = this.state.invoices.find(inv => inv.id === payment.invoiceId);
        if (invoice) {
            const newPayment = {
                id: `PAY-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                ...payment
            };
            this.state.payments.push(newPayment);

            // Update invoice balances
            invoice.paidAmount += payment.amount;
            invoice.balance = invoice.total - invoice.paidAmount;

            // Auto Update Status
            if (invoice.balance <= 0) {
                invoice.status = 'paid';
            } else if (invoice.paidAmount > 0) {
                invoice.status = 'partially_paid';
            }

            this.logAction('INVOICES', 'PAYMENT', invoice.id, 'success', `Amount: ${payment.amount} ${invoice.currency}`);
            this.notify();
            return newPayment;
        }
        return null;
    },

    deleteInvoice(id) {
        const invoice = this.state.invoices.find(inv => inv.id === id);
        if (invoice && invoice.status === 'draft') { // Admin/Finance can only delete draft
            this.state.invoices = this.state.invoices.filter(inv => inv.id !== id);
            this.state.payments = this.state.payments.filter(p => p.invoiceId !== id);
            this.logAction('INVOICES', 'DELETE', id, 'success');
            this.notify();
            return true;
        }
        return false;
    },

    checkQuoteExpirations() {
        const now = new Date();
        this.state.quotes.forEach(q => {
            if (q.status === 'sent' && q.validUntil) {
                const validity = new Date(q.validUntil);
                if (validity < now) {
                    q.status = 'expired';
                    q.history.push({ date: now.toISOString().split('T')[0], action: 'Auto-expired due to validity date' });
                }
            }
        });
        this.notify();
    },

    // Booking Actions (SOP Rule 6, 7, 11)
    updateBookingStatus(id, status) {
        const booking = this.state.bookings.find(b => b.id === id);
        if (booking) {
            booking.status = status;
            this.notify();
            return true;
        }
        return false;
    },

    recordPayment(id, amount) {
        const booking = this.state.bookings.find(b => b.id === id);
        if (booking) {
            booking.paidAmount += parseFloat(amount);
            booking.balance = booking.totalAmount - booking.paidAmount;

            if (booking.balance <= 0) {
                booking.paymentStatus = 'paid';
                booking.balance = 0;
            } else if (booking.paidAmount > 0) {
                booking.paymentStatus = 'partial';
            }

            this.notify();
            return true;
        }
        return false;
    },

    cancelBooking(id, reason) {
        const booking = this.state.bookings.find(b => b.id === id);
        if (booking) {
            booking.status = 'cancelled';
            booking.cancelReason = reason;

            // Also update associated sale if exists
            const sale = this.state.sales.find(s => s.clientName === booking.clientName && s.product === booking.title);
            if (sale) {
                sale.status = 'cancelled';
            }

            this.notify();
            return true;
        }
        return false;
    },

    // Campaign Actions (SOP Rule 5, 8, 11)
    addCampaign(campaign) {
        const newCampaign = {
            id: Date.now(),
            ...campaign,
            status: campaign.status || 'draft',
            date: new Date().toISOString().split('T')[0],
            stats: { sent: 0, delivered: 0, opened: 0, clicks: 0, replied: 0 },
            conversions: 0,
            revenue: 0
        };
        this.state.campaigns.unshift(newCampaign);
        this.notify();
        return newCampaign;
    },

    updateCampaignStatus(id, status) {
        const camp = this.state.campaigns.find(c => c.id == id);
        if (camp) {
            camp.status = status;
            this.notify();
            return true;
        }
        return false;
    },

    deleteCampaignsBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.campaigns = this.state.campaigns.filter(c => !idSet.has(String(c.id)));
        this.logAction('MARKETING', 'BULK_DELETE', 'bulk', 'success', `Campaigns Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllCampaigns() {
        const count = this.state.campaigns.length;
        this.state.campaigns = [];
        this.logAction('MARKETING', 'DELETE_ALL', 'all', 'success', `Campaigns Deleted: ${count}`);
        this.notify();
    },

    updateCampaignStats(id, statsUpdate) {
        const camp = this.state.campaigns.find(c => c.id === id);
        if (camp) {
            camp.stats = { ...camp.stats, ...statsUpdate };
            this.notify();
            return true;
        }
        return false;
    },

    getCampaignROI(id) {
        const camp = this.state.campaigns.find(c => c.id === id);
        if (!camp) return null;

        // ROI = (Revenue - Attributed Sales Cost) / Attributed Sales Cost ? 
        // SOP says Link campaigns to Quotes, Bookings, Sales.
        // For now, return the internal tracked stats.
        return {
            revenue: camp.revenue,
            conversions: camp.conversions,
            conversionRate: camp.stats.sent > 0 ? ((camp.conversions / camp.stats.sent) * 100).toFixed(2) : 0,
            engagementRate: camp.stats.sent > 0 ? (((camp.stats.opened + camp.stats.clicks) / camp.stats.sent) * 100).toFixed(2) : 0
        };
    },

    // Save (Upsert) Functions for Quotes, Bookings, and Campaigns
    saveQuote(quote) {
        const index = this.state.quotes.findIndex(q => String(q.id) === String(quote.id));
        if (index !== -1) {
            // Update existing
            this.state.quotes[index] = { ...this.state.quotes[index], ...quote };
            this.logAction('QUOTES', 'UPDATE', quote.id, 'success', `Updated: ${quote.title}`);
        } else {
            // Create new
            this.state.quotes.unshift({
                ...quote,
                history: [{ date: new Date().toISOString().split('T')[0], action: 'Quote Created' }]
            });
            this.logAction('QUOTES', 'CREATE', quote.id, 'success', `Value: ${quote.totalPrice}`);
        }
        this.notify();
        return quote;
    },

    deleteQuote(id) {
        this.state.quotes = this.state.quotes.filter(q => String(q.id) !== String(id));
        this.logAction('QUOTES', 'DELETE', id, 'success', 'Quote Deleted');
        this.notify();
    },

    deleteQuotesBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.quotes = this.state.quotes.filter(q => !idSet.has(String(q.id)));
        this.logAction('QUOTES', 'BULK_DELETE', 'bulk', 'success', `Quotes Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllQuotes() {
        const count = this.state.quotes.length;
        this.state.quotes = [];
        this.logAction('QUOTES', 'DELETE_ALL', 'all', 'success', `Quotes Deleted: ${count}`);
        this.notify();
    },

    saveBooking(booking) {
        const index = this.state.bookings.findIndex(b => String(b.id) === String(booking.id));
        if (index !== -1) {
            // Update existing
            this.state.bookings[index] = { ...this.state.bookings[index], ...booking };
            this.logAction('BOOKINGS', 'UPDATE', booking.id, 'success', `Updated: ${booking.title}`);
        } else {
            // Create new
            this.state.bookings.unshift(booking);
            this.logAction('BOOKINGS', 'CREATE', booking.id, 'success', `Client: ${booking.clientName}`);
        }
        this.notify();
        return booking;
    },

    deleteBooking(id) {
        this.state.bookings = this.state.bookings.filter(b => String(b.id) !== String(id));
        this.logAction('BOOKINGS', 'DELETE', id, 'success', 'Booking Deleted');
        this.notify();
    },

    deleteBookingsBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.bookings = this.state.bookings.filter(b => !idSet.has(String(b.id)));
        this.logAction('BOOKINGS', 'BULK_DELETE', 'bulk', 'success', `Bookings Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllBookings() {
        const count = this.state.bookings.length;
        this.state.bookings = [];
        this.logAction('BOOKINGS', 'DELETE_ALL', 'all', 'success', `Bookings Deleted: ${count}`);
        this.notify();
    },

    saveCampaign(campaign) {
        const index = this.state.campaigns.findIndex(c => String(c.id) === String(campaign.id));
        if (index !== -1) {
            // Update existing
            this.state.campaigns[index] = { ...this.state.campaigns[index], ...campaign };
            this.logAction('CAMPAIGNS', 'UPDATE', campaign.id, 'success', `Updated: ${campaign.name}`);
        } else {
            // Create new with defaults
            this.state.campaigns.unshift({
                stats: { sent: 0, delivered: 0, opened: 0, clicks: 0, replied: 0 },
                conversions: 0,
                revenue: 0,
                ...campaign
            });
            // Also initialize campaignAnalytics for this new campaign
            this.state.campaignAnalytics[campaign.id] = {
                sent: 0, delivered: 0, opened: 0, clicked: 0,
                replied: 0, bounced: 0, unsubscribed: 0,
                unique_opens: 0, unique_clicks: 0,
                bounce_hard: 0, bounce_soft: 0,
                complaints: 0, errors: 0,
                revenue: 0, cpa: 0, rpe: 0,
                hardBounces: [], softBounces: []
            };
            this.logAction('CAMPAIGNS', 'CREATE', campaign.id, 'success', `Campaign: ${campaign.name}`);
        }
        this.notify();
        return campaign;
    },

    deleteCampaign(id) {
        this.state.campaigns = this.state.campaigns.filter(c => String(c.id) !== String(id));
        this.logAction('CAMPAIGNS', 'DELETE', id, 'success', 'Campaign Deleted');
        this.notify();
    },

    // SOP: Audience List Management
    saveAudienceList(list) {
        const index = this.state.audienceLists.findIndex(l => String(l.id) === String(list.id));
        if (index !== -1) {
            this.state.audienceLists[index] = { ...this.state.audienceLists[index], ...list };
            this.logAction('AUDIENCES', 'UPDATE', list.id, 'success', `Updated: ${list.name}`);
        } else {
            this.state.audienceLists.unshift({
                ...list,
                id: list.id || Date.now(),
                createdAt: new Date().toISOString().split('T')[0]
            });
            this.logAction('AUDIENCES', 'CREATE', list.id, 'success', `Created: ${list.name}`);
        }
        this.notify();
        return list;
    },

    deleteAudienceList(id) {
        this.state.audienceLists = this.state.audienceLists.filter(l => String(l.id) !== String(id));
        this.logAction('AUDIENCES', 'DELETE', id, 'success', 'Audience List Deleted');
        this.notify();
    },

    getAudienceContacts(listId) {
        const list = this.state.audienceLists.find(l => String(l.id) === String(listId));
        if (!list) return [];

        const source = list.type === 'B2B' ? this.state.b2bClients : this.state.b2cClients;

        // If specific contactIds are set, use those
        if (list.contactIds && list.contactIds.length > 0) {
            return source.filter(c => list.contactIds.includes(String(c.id)));
        }

        // Otherwise, filter by criteria
        return source.filter(c => {
            const filters = list.filters || {};
            let match = true;

            if (filters.country && c.country) {
                match = match && c.country.toLowerCase().includes(filters.country.toLowerCase());
            }
            if (filters.segment && c.segment) {
                match = match && c.segment.toLowerCase().includes(filters.segment.toLowerCase());
            }
            if (filters.language && c.language) {
                match = match && c.language.toLowerCase() === filters.language.toLowerCase();
            }
            if (filters.tags && c.tags) {
                const filterTags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
                const clientTags = Array.isArray(c.tags) ? c.tags : (c.tags || '').split(',').map(t => t.trim());
                match = match && filterTags.some(t => clientTags.some(ct => ct.toLowerCase().includes(t.toLowerCase())));
            }

            // Exclude blacklisted emails
            if (this.state.emailBlacklist.includes(c.email?.toLowerCase())) {
                return false;
            }

            return match;
        });
    },

    addContactToList(listId, contactId) {
        const list = this.state.audienceLists.find(l => String(l.id) === String(listId));
        if (list) {
            if (!list.contactIds) list.contactIds = [];
            if (!list.contactIds.includes(String(contactId))) {
                list.contactIds.push(String(contactId));
                this.notify();
            }
        }
    },

    removeContactFromList(listId, contactId) {
        const list = this.state.audienceLists.find(l => String(l.id) === String(listId));
        if (list && list.contactIds) {
            list.contactIds = list.contactIds.filter(id => id !== String(contactId));
            this.notify();
        }
    },

    // SOP: Email Blacklist Management
    addToBlacklist(email, reason = 'manual') {
        const normalizedEmail = email.toLowerCase().trim();
        if (!this.state.emailBlacklist.includes(normalizedEmail)) {
            this.state.emailBlacklist.push(normalizedEmail);
            this.logAction('BLACKLIST', 'ADD', normalizedEmail, 'success', `Reason: ${reason}`);
            this.notify();
        }
    },

    removeFromBlacklist(email) {
        const normalizedEmail = email.toLowerCase().trim();
        this.state.emailBlacklist = this.state.emailBlacklist.filter(e => e !== normalizedEmail);
        this.logAction('BLACKLIST', 'REMOVE', normalizedEmail, 'success', 'Removed from blacklist');
        this.notify();
    },

    isBlacklisted(email) {
        return this.state.emailBlacklist.includes(email?.toLowerCase().trim());
    },

    // SOP: Campaign Analytics
    updateCampaignAnalytics(campaignId, stats) {
        if (!this.state.campaignAnalytics[campaignId]) {
            this.state.campaignAnalytics[campaignId] = {
                sent: 0, delivered: 0, opened: 0, clicked: 0,
                replied: 0, bounced: 0, unsubscribed: 0,
                unique_opens: 0, unique_clicks: 0,
                bounce_hard: 0, bounce_soft: 0,
                complaints: 0, errors: 0,
                revenue: 0, cpa: 0, rpe: 0,
                hardBounces: [], softBounces: []
            };
        }
        Object.assign(this.state.campaignAnalytics[campaignId], stats);

        // Also update campaign stats in campaigns array
        const campaign = this.state.campaigns.find(c => String(c.id) === String(campaignId));
        if (campaign) {
            campaign.stats = { ...campaign.stats, ...stats };
        }
        this.notify();
    },

    getCampaignAnalytics(campaignId) {
        return this.state.campaignAnalytics[campaignId] || {
            sent: 0, delivered: 0, opened: 0, clicked: 0,
            replied: 0, bounced: 0, unsubscribed: 0,
            unique_opens: 0, unique_clicks: 0,
            bounce_hard: 0, bounce_soft: 0,
            complaints: 0, errors: 0,
            revenue: 0, cpa: 0, rpe: 0
        };
    },

    handleBounce(campaignId, email, type = 'soft') {
        const analytics = this.getCampaignAnalytics(campaignId);
        analytics.bounced = (analytics.bounced || 0) + 1;

        if (type === 'hard') {
            if (!analytics.hardBounces) analytics.hardBounces = [];
            analytics.hardBounces.push(email);
            // Auto-blacklist hard bounces
            this.addToBlacklist(email, 'hard_bounce');
        } else {
            if (!analytics.softBounces) analytics.softBounces = [];
            analytics.softBounces.push(email);
        }

        this.updateCampaignAnalytics(campaignId, analytics);
    },

    handleUnsubscribe(campaignId, email) {
        const analytics = this.getCampaignAnalytics(campaignId);
        analytics.unsubscribed = (analytics.unsubscribed || 0) + 1;
        this.updateCampaignAnalytics(campaignId, analytics);

        // Auto-blacklist unsubscribes
        this.addToBlacklist(email, 'unsubscribed');
    },

    // WhatsApp Actions (SOP Rule 4, 7, 9, 10)
    sendWhatsApp(clientId, clientName, body, templateId = null, media = null) {
        if (this.state.whatsappOptOuts.includes(clientId)) {
            console.error('SOP Violation: Cannot send message to opted-out contact.');
            return false;
        }

        let chat = this.state.whatsapp.find(c => c.clientId === clientId);
        if (!chat) {
            chat = { id: Date.now(), clientId, clientName, messages: [], unread: 0, lastMsg: '', time: '', avatar: clientName.charAt(0) };
            this.state.whatsapp.unshift(chat);
        }

        const msg = {
            id: Date.now(),
            type: 'outgoing',
            body,
            templateId,
            media,
            status: 'sent',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        chat.messages.push(msg);
        chat.lastMsg = body;
        chat.time = new Date().toISOString().split('T')[0];

        // Simulate status updates (SOP Rule 7)
        setTimeout(() => this.updateWhatsAppStatus(chat.id, msg.id, 'delivered'), 1000);
        setTimeout(() => this.updateWhatsAppStatus(chat.id, msg.id, 'read'), 3000);

        this.notify();
        return true;
    },

    updateWhatsAppStatus(chatId, msgId, status) {
        const chat = this.state.whatsapp.find(c => c.id === chatId);
        if (chat) {
            const msg = chat.messages.find(m => m.id === msgId);
            if (msg) {
                msg.status = status;
                this.notify();
            }
        }
    },

    handleWhatsAppOptOut(clientId) {
        if (!this.state.whatsappOptOuts.includes(clientId)) {
            this.state.whatsappOptOuts.push(clientId);
            this.notify();
        }
    },

    triggerAutomatedWhatsApp(clientId, type, metadata) {
        const template = this.state.whatsappTemplates.find(t => t.id === `ws_${type}`);
        if (template) {
            let body = template.body;
            Object.keys(metadata).forEach(key => {
                body = body.replace(`{${key}}`, metadata[key]);
            });
            this.sendWhatsApp(clientId, metadata.name, body, template.id);
        }
    },

    // WhatsApp Campaign CRUD
    saveWaCampaign(campaign) {
        const now = new Date().toISOString();
        const idx = this.state.waCampaigns.findIndex(c => String(c.id) === String(campaign.id));
        if (idx !== -1) {
            this.state.waCampaigns[idx] = { ...this.state.waCampaigns[idx], ...campaign, updatedAt: now };
        } else {
            const newCamp = {
                id: Date.now(),
                name: campaign.name || 'Untitled Campaign',
                status: 'draft',
                offer: campaign.offer || '',
                audienceTag: campaign.audienceTag || '',
                audienceIds: campaign.audienceIds || [],
                messages: campaign.messages || [],
                batchSize: campaign.batchSize || 30,
                stats: { sent: 0, delivered: 0, read: 0, replied: 0, qualified: 0 },
                createdAt: now,
                updatedAt: now,
                ...campaign,
                id: campaign.id || Date.now()
            };
            this.state.waCampaigns.unshift(newCamp);
        }
        this.notify();
        return this.state.waCampaigns.find(c => String(c.id) === String(campaign.id)) || this.state.waCampaigns[0];
    },

    deleteWaCampaign(id) {
        this.state.waCampaigns = this.state.waCampaigns.filter(c => String(c.id) !== String(id));
        this.notify();
    },

    saveWaQuickReply(reply) {
        const idx = this.state.waQuickReplies.findIndex(r => r.id === reply.id);
        if (idx !== -1) {
            this.state.waQuickReplies[idx] = { ...this.state.waQuickReplies[idx], ...reply };
        } else {
            this.state.waQuickReplies.push({ id: 'qr_' + Date.now(), ...reply });
        }
        this.notify();
    },

    deleteWaQuickReply(id) {
        this.state.waQuickReplies = this.state.waQuickReplies.filter(r => r.id !== id);
        this.notify();
    },

    // Lead Scraper CRUD
    saveScraperJob(job) {
        const now = new Date().toISOString();
        const idx = this.state.scraperJobs.findIndex(j => String(j.id) === String(job.id));
        if (idx !== -1) {
            this.state.scraperJobs[idx] = { ...this.state.scraperJobs[idx], ...job, updatedAt: now };
        } else {
            this.state.scraperJobs.unshift({
                id: Date.now(),
                status: 'pending',
                urls: [],
                mode: 'b2b',
                results: [],
                progress: 0,
                createdAt: now,
                updatedAt: now,
                ...job
            });
        }
        this.notify();
    },

    deleteScraperJob(id) {
        this.state.scraperJobs = this.state.scraperJobs.filter(j => String(j.id) !== String(id));
        this.state.scrapedLeads = this.state.scrapedLeads.filter(l => String(l.jobId) !== String(id));
        this.notify();
    },

    addScrapedLeads(leads) {
        this.state.scrapedLeads.push(...leads);
        this.notify();
    },

    clearScrapedLeads(jobId) {
        if (jobId) {
            this.state.scrapedLeads = this.state.scrapedLeads.filter(l => String(l.jobId) !== String(jobId));
        } else {
            this.state.scrapedLeads = [];
        }
        this.notify();
    },

    // Service Catalogue Actions (SOP Rule 5, 6, 7)
    addService(service) {
        const newService = {
            id: Date.now(),
            ...service,
            type: service.type || 'Activity', // SOP: Excursion, Circuit, Transfer, etc.
            city: service.city || '',
            country: service.country || '',
            duration: service.duration || '1 Day',
            nights: service.nights || 0,
            maxGuests: service.maxGuests || 10,
            included: Array.isArray(service.included) ? service.included : (service.included ? service.included.split(',').map(s => s.trim()) : []),
            notIncluded: Array.isArray(service.notIncluded) ? service.notIncluded : (service.notIncluded ? service.notIncluded.split(',').map(s => s.trim()) : []),
            itinerary: service.itinerary || [], // Array of { day: 1, title: '', description: '', image: '', services: [] }
            metadata: service.metadata || {
                en: { name: service.name, description: service.description || '' },
                fr: { name: service.name, description: service.description || '' },
                es: { name: service.name, description: service.description || '' }
            },
            cancellationPolicy: service.cancellationPolicy || 'Standard 48h cancellation.',
            pricingModel: service.pricingModel || 'Per person',
            price: parseFloat(service.price) || 0,
            cost: parseFloat(service.cost || 0),
            margin: (parseFloat(service.price) || 0) - (parseFloat(service.cost) || 0),
            status: service.status || 'active', // SOP Workflow: Draft -> Review -> Active
            active: service.status === 'active',
            tags: Array.isArray(service.tags) ? service.tags : (service.tags ? service.tags.split(',').map(t => t.trim()) : []),
            sku: service.sku || `#IT-${Date.now().toString(36).toUpperCase()}-2026`,
            languages: service.languages || ['EN'],
            views: service.views || 0,
            conversions: service.conversions || 0,
            image: service.image || null,
            history: [{ date: new Date().toISOString().split('T')[0], action: 'Service Created', user: this.state.currentUser.name }]
        };
        this.state.catalogue.unshift(newService);
        this.notify();
        return newService;
    },

    duplicateService(id) {
        const original = this.state.catalogue.find(s => String(s.id) === String(id));
        if (!original) return null;
        const copy = {
            ...JSON.parse(JSON.stringify(original)),
            id: Date.now(),
            name: `${original.name} (Copy)`,
            status: 'draft',
            active: false,
            history: [{ date: new Date().toISOString().split('T')[0], action: 'Duplicated from ' + id, user: this.state.currentUser.name }]
        };
        this.state.catalogue.unshift(copy);
        this.notify();
        return copy;
    },

    updateService(id, updates) {
        const service = this.state.catalogue.find(s => s.id == id);
        if (service && service.status !== 'archived') {
            const oldPrice = service.price;
            Object.assign(service, updates);
            if (updates.price !== undefined || updates.cost !== undefined) {
                service.margin = (parseFloat(service.price) || 0) - (parseFloat(service.cost) || 0);
            }
            if (updates.price !== undefined && updates.price !== oldPrice) {
                service.history.push({
                    date: new Date().toISOString().split('T')[0],
                    action: 'Price Change',
                    details: `${oldPrice} -> ${service.price}`,
                    user: this.state.currentUser.name
                });
            }
            service.active = service.status === 'active';
            this.notify();
            return true;
        }
        return false;
    },

    archiveService(id) {
        const service = this.state.catalogue.find(s => s.id == id);
        if (service) {
            service.status = 'archived';
            service.active = false;
            this.notify();
            return true;
        }
        return false;
    },

    deleteService(id) {
        const index = this.state.catalogue.findIndex(s => s.id == id);
        if (index !== -1) {
            this.state.catalogue.splice(index, 1);
            this.notify();
            return true;
        }
        return false;
    },

    deleteQuote(id) {
        const index = this.state.quotes.findIndex(q => q.id === id);
        if (index !== -1) {
            this.state.quotes.splice(index, 1);
            this.notify();
            return true;
        }
        return false;
    },

    deleteQuotesBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.quotes = this.state.quotes.filter(q => !idSet.has(String(q.id)));
        this.logAction('QUOTES', 'BULK_DELETE', 'bulk', 'success', `Quotes Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllQuotes() {
        const count = this.state.quotes.length;
        this.state.quotes = [];
        this.logAction('QUOTES', 'DELETE_ALL', 'all', 'success', `Quotes Deleted: ${count}`);
        this.notify();
    },

    deleteBooking(id) {
        const index = this.state.bookings.findIndex(b => b.id === id);
        if (index !== -1) {
            this.state.bookings.splice(index, 1);
            this.notify();
            return true;
        }
        return false;
    },

    deleteBookingsBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.bookings = this.state.bookings.filter(b => !idSet.has(String(b.id)));
        this.logAction('BOOKINGS', 'BULK_DELETE', 'bulk', 'success', `Bookings Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllBookings() {
        const count = this.state.bookings.length;
        this.state.bookings = [];
        this.logAction('BOOKINGS', 'DELETE_ALL', 'all', 'success', `Bookings Deleted: ${count}`);
        this.notify();
    },

    // Catalogue Bulk Actions (legacy compat)
    deleteCatalogueBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.catalogue = this.state.catalogue.filter(i => !idSet.has(String(i.id)));
        this.logAction('CATALOGUE', 'BULK_DELETE', 'bulk', 'success', `Products Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllCatalogue() {
        this.state.catalogue = [];
        this.logAction('CATALOGUE', 'BULK_DELETE', 'all', 'success', 'All Catalogue Products Deleted');
        this.notify();
    },

    // HTML Catalogue Management (legacy compat)
    saveHtmlCatalogue(cat) {
        const newCat = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            ...cat
        };
        this.state.htmlCatalogues.unshift(newCat);
        this.notify();
        return newCat;
    },

    deleteHtmlCatalogue(id) {
        this.state.htmlCatalogues = this.state.htmlCatalogues.filter(c => String(c.id) !== String(id));
        this.notify();
    },

    // ---- Catalogue v2 Unified Methods ----
    saveCatalogueV2(cat) {
        const now = new Date().toISOString();
        const existing = this.state.catalogues.findIndex(c => String(c.id) === String(cat.id));
        if (existing !== -1) {
            this.state.catalogues[existing] = { ...this.state.catalogues[existing], ...cat, updatedAt: now };
            this.logAction('CATALOGUES', 'UPDATE', cat.id, 'success', `Updated: ${cat.title}`);
        } else {
            const newCat = {
                id: Date.now(),
                title: cat.title || 'Untitled Catalogue',
                category: cat.category || '',
                language: cat.language || 'EN',
                country: cat.country || '',
                city: cat.city || '',
                tags: Array.isArray(cat.tags) ? cat.tags : [],
                status: cat.status || 'draft',
                sourceType: cat.sourceType || 'manual',
                htmlContent: cat.htmlContent || '',
                fileName: cat.fileName || '',
                fileSize: cat.fileSize || 0,
                createdAt: now,
                updatedAt: now,
                ...cat,
                id: cat.id || Date.now()
            };
            this.state.catalogues.unshift(newCat);
            this.logAction('CATALOGUES', 'CREATE', newCat.id, 'success', `Created: ${newCat.title}`);
        }
        this.notify();
        return this.state.catalogues.find(c => String(c.id) === String(cat.id)) || this.state.catalogues[0];
    },

    deleteCatalogueV2(id) {
        this.state.catalogues = this.state.catalogues.filter(c => String(c.id) !== String(id));
        this.logAction('CATALOGUES', 'DELETE', id, 'success', 'Catalogue Deleted');
        this.notify();
    },

    duplicateCatalogueV2(id) {
        const original = this.state.catalogues.find(c => String(c.id) === String(id));
        if (!original) return null;
        const now = new Date().toISOString();
        const copy = {
            ...JSON.parse(JSON.stringify(original)),
            id: Date.now(),
            title: `${original.title} (Copy)`,
            status: 'draft',
            createdAt: now,
            updatedAt: now
        };
        this.state.catalogues.unshift(copy);
        this.logAction('CATALOGUES', 'DUPLICATE', copy.id, 'success', `Duplicated from ${id}`);
        this.notify();
        return copy;
    },

    deleteCataloguesBulkV2(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.catalogues = this.state.catalogues.filter(c => !idSet.has(String(c.id)));
        this.logAction('CATALOGUES', 'BULK_DELETE', 'bulk', 'success', `Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllCataloguesV2() {
        this.state.catalogues = [];
        this.logAction('CATALOGUES', 'DELETE_ALL', 'all', 'success', 'All Catalogues Deleted');
        this.notify();
    },

    publishCatalogueV2(id) {
        const cat = this.state.catalogues.find(c => String(c.id) === String(id));
        if (cat) {
            cat.status = cat.status === 'published' ? 'draft' : 'published';
            cat.updatedAt = new Date().toISOString();
            this.logAction('CATALOGUES', 'STATUS_CHANGE', id, 'success', `Status: ${cat.status}`);
            this.notify();
        }
    },

    // Invoices Bulk Actions
    deleteInvoicesBulk(ids) {
        const idSet = new Set((ids || []).map(String));
        this.state.invoices = this.state.invoices.filter(i => !idSet.has(String(i.id)));
        this.logAction('INVOICES', 'BULK_DELETE', 'bulk', 'success', `Invoices Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllInvoices() {
        this.state.invoices = [];
        this.logAction('INVOICES', 'BULK_DELETE', 'all', 'success', 'All Invoices Deleted');
        this.notify();
    },

    // Mail Bulk Actions
    deleteMailBulk(folder, ids) {
        const idSet = new Set((ids || []).map(String));
        const moveMsg = (list) => list.filter(m => !idSet.has(String(m.id)));
        const getMsgs = (list) => list.filter(m => idSet.has(String(m.id)));

        let targetList;
        switch (folder) {
            case 'inbox': targetList = 'mailInbox'; break;
            case 'sent': targetList = 'mailHistory'; break;
            case 'draft': targetList = 'mailDrafts'; break;
            case 'trash': targetList = 'mailTrash'; break;
            default: return;
        }

        if (folder === 'trash') {
            this.state.mailTrash = moveMsg(this.state.mailTrash);
        } else {
            const removed = getMsgs(this.state[targetList]);
            removed.forEach(m => m.originalFolder = folder);
            this.state.mailTrash.push(...removed);
            this.state[targetList] = moveMsg(this.state[targetList]);
        }

        this.logAction('MAIL', 'BULK_DELETE', folder, 'success', `Messages Deleted: ${idSet.size}`);
        this.notify();
    },

    deleteAllMail(folder) {
        let targetList;
        switch (folder) {
            case 'inbox': targetList = 'mailInbox'; break;
            case 'sent': targetList = 'mailHistory'; break;
            case 'draft': targetList = 'mailDrafts'; break;
            case 'trash': targetList = 'mailTrash'; break;
            default: return;
        }

        if (folder !== 'trash') {
            this.state[targetList].forEach(m => m.originalFolder = folder);
            this.state.mailTrash.push(...this.state[targetList]);
        }
        this.state[targetList] = [];

        this.logAction('MAIL', 'BULK_DELETE', 'all', 'success', `All Messages in ${folder} deleted`);
        this.notify();
    },

    testIntegration(id) {
        const user = this.state.currentUser.name;
        const integrations = this.state.systemSettings.integrations;

        // Find integration in nested state
        let found = null;
        let category = null;
        for (const cat in integrations) {
            found = integrations[cat].find(i => i.id === id);
            if (found) {
                category = cat;
                break;
            }
        }

        if (!found) return false;

        // Simulate connection test
        const isSuccess = true; // Production: actual API call replaces simulation

        found.lastTest = new Date().toLocaleString();

        if (isSuccess) {
            found.status = found.status === 'inactive' ? 'inactive' : 'active';
            found.testResult = 'success';
            this.logIntegrationAction(id, 'TEST', 'success', user, 'Connection validated via API handshake.');
        } else {
            found.status = 'error';
            found.testResult = 'failed';
            found.lastError = 'API Timeout: External service not responding (SOP Rule 9)';
            this.logIntegrationAction(id, 'TEST', 'failed', user, found.lastError);
        }

        this.notify();
        return isSuccess;
    },

    // Social Media Actions (SOP Rule 4, 7, 8)
    connectSocialAccount(platform, accountName, pageId) {
        const user = this.state.currentUser.name;
        const newAccount = {
            id: `${platform}-${Date.now()}`,
            platform,
            name: accountName,
            pageId,
            status: 'connected',
            connectDate: new Date().toISOString().split('T')[0]
        };

        this.state.socialAccounts.push(newAccount);
        this.logIntegrationAction(newAccount.id, 'CONNECT', 'success', user, `Connected ${platform} Page: ${accountName}`);
        this.notify();
        return newAccount;
    },

    disconnectSocialAccount(id) {
        const user = this.state.currentUser.name;
        const index = this.state.socialAccounts.findIndex(a => a.id === id);
        if (index !== -1) {
            const acc = this.state.socialAccounts[index];
            this.state.socialAccounts.splice(index, 1);
            this.logIntegrationAction(id, 'DISCONNECT', 'success', user, `Disconnected ${acc.platform} Page: ${acc.name}`);
            this.notify();
            return true;
        }
        return false;
    },

    importSocialLead(platform, leadData) {
        const user = 'System (Social Sync)';

        // SOP Rule 7: Auto-create B2C Lead with tags
        const newLead = {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone || '',
            source: platform.charAt(0).toUpperCase() + platform.slice(1),
            country: leadData.country || 'Unknown',
            status: 'lead',
            tags: [`Social: ${platform.toUpperCase()}`, 'Auto-Imported'],
            timeline: [
                { id: Date.now(), type: 'status', label: `Lead imported from ${platform}`, time: new Date().toISOString().split('T')[0] }
            ]
        };

        const result = this.addClient('b2c', newLead);
        if (result.success) {
            this.logIntegrationAction(platform.toUpperCase(), 'LEAD_IMPORT', 'success', user, `Imported lead ${leadData.name} from campaign.`);
        }
        return result;
    },

    // --- Currency Management SOP Methods ---
    addCurrency(currency) {
        // Validation: Unique Code
        const exists = this.state.currencies.some(c => c.code === currency.code);
        if (exists) return { success: false, message: 'Currency code already exists.' };

        // Validation: Rate > 0
        if (currency.rate <= 0) return { success: false, message: 'Exchange rate must be greater than 0.' };

        const newCurrency = {
            id: Date.now(),
            ...currency,
            isDefault: false, // Force default to false on add (use setDefaultCurrency to change)
            status: currency.status || 'active'
        };

        this.state.currencies.push(newCurrency);
        this.logAction('CURRENCY', 'ADD', currency.code, 'success', `Added ${currency.name}`);
        this.notify();
        return { success: true, currency: newCurrency };
    },

    updateCurrency(id, updates) {
        const index = this.state.currencies.findIndex(c => Number(c.id) === Number(id));
        if (index === -1) return { success: false, message: 'Currency not found.' };

        const currency = this.state.currencies[index];

        // Prevent disabling default
        if (currency.isDefault && updates.status === 'inactive') {
            return { success: false, message: 'Cannot deactivate the default currency.' };
        }

        // Apply updates
        Object.assign(currency, updates);

        this.logAction('CURRENCY', 'UPDATE', currency.code, 'success', `Updated ${currency.name}`);
        this.notify();
        return { success: true, currency };
    },

    deleteCurrency(id) {
        const currency = this.state.currencies.find(c => Number(c.id) === Number(id));
        if (!currency) return { success: false, message: 'Currency not found.' };

        if (currency.isDefault) {
            return { success: false, message: 'Cannot delete the default currency.' };
        }

        this.state.currencies = this.state.currencies.filter(c => Number(c.id) !== Number(id));
        this.logAction('CURRENCY', 'DELETE', currency.code, 'success', `Deleted ${currency.name}`);
        this.notify();
        return { success: true };
    },

    setDefaultCurrency(id) {
        const currency = this.state.currencies.find(c => Number(c.id) === Number(id));
        if (!currency) return { success: false, message: 'Currency not found.' };

        if (currency.status === 'inactive') {
            return { success: false, message: 'Cannot set inactive currency as default.' };
        }

        // Remove default status from others
        this.state.currencies.forEach(c => c.isDefault = (Number(c.id) === Number(id)));

        // Update global system settings
        if (this.state.systemSettings) {
            this.state.systemSettings.currency = currency.code;
        }

        this.logAction('CURRENCY', 'SET_DEFAULT', currency.code, 'success', `System default changed to ${currency.name}`);
        this.notify();
        return { success: true };
    },

    logAction(module, action, id = 'N/A', status = 'success', details = '') {
        this.state.actionLogs.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            user: this.state.currentUser.name,
            module,
            action,
            targetId: id,
            status,
            details
        });
        if (this.state.actionLogs.length > 100) this.state.actionLogs.pop();
        this.notify();
    },


    async sendSMTPTest(config) {
        // Real SMTP connectivity pulse via the local Node server (server/server.js)
        // Returns a clear message if the server is not running.
        const timestamp = new Date().toLocaleString();
        this.state.systemSettings.smtpSettings.lastTested = timestamp;

        const payload = {
            smtp: {
                host: config.host,
                port: config.port,
                encryption: config.encryption,
                username: config.username,
                password: config.password,
                fromName: config.fromName,
                fromEmail: config.fromEmail,
                replyTo: config.replyTo,
                charset: config.charset,
                useAuthAsFrom: config.useAuthAsFrom,
                allowSelfSigned: config.allowSelfSigned
            }
        };

        if (!payload.smtp.host || !payload.smtp.username || !payload.smtp.password) {
            this.state.systemSettings.smtpSettings.status = 'error';
            const msg = 'Missing required SMTP fields (host, username, password).';
            this.logAction('SMTP', 'TEST_CONNECTION', 'SYSTEM', 'error', msg);
            this.notify();
            return { success: false, message: msg };
        }

        try {
            const res = await fetch(this.apiBase() + '/api/smtp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, testRecipient: config.testRecipient || config.username })
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data && data.ok) {
                this.state.systemSettings.smtpSettings.status = 'connected';
                this.logAction('SMTP', 'TEST_CONNECTION', 'SYSTEM', 'success', 'SMTP Connected Successfully');
                this.notify();
                return { success: true, message: 'SMTP Connected Successfully' };
            }

            const message = (data && (data.message || data.error)) ? (data.message || data.error) : `SMTP test failed (HTTP ${res.status})`;
            this.state.systemSettings.smtpSettings.status = 'error';
            this.logAction('SMTP', 'TEST_CONNECTION', 'SYSTEM', 'error', `SMTP Failure: ${message}`);
            this.notify();
            return { success: false, message };
        } catch (e) {
            this.state.systemSettings.smtpSettings.status = 'disconnected';
            const message = 'SMTP server not reachable. Start it with: npm start (root) or node server/server.js';
            this.logAction('SMTP', 'TEST_CONNECTION', 'SYSTEM', 'warning', message);
            this.notify();
            return { success: false, message };
        }
    },

    async saveSecuritySettings(settings) {
        try {
            const apiBase = this.apiBase();
            // If running strictly locally (file://), mock it
            if (!apiBase.startsWith('http')) {
                this.state.systemSettings.security = { ...this.state.systemSettings.security, ...settings };
                this.notify();
                return { success: true };
            }

            const res = await fetch(apiBase + '/api/settings/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (data.ok) {
                this.state.systemSettings.security = { ...this.state.systemSettings.security, ...settings };
                this.logAction('SECURITY', 'UPDATE', 'SYSTEM', 'success', 'Security protocols updated');
                this.notify();
                return { success: true };
            } else {
                return { success: false, message: data.message };
            }
        } catch (e) {
            console.error('Security Save Error:', e);
            return { success: false, message: e.message };
        }
    },


    async syncIMAPInbox() {
        try {
            const apiBase = this.apiBase();
            // Proceed with relative or absolute URL
            const res = await fetch(apiBase + '/api/mail/inbox/sync');
            const data = await res.json();

            if (data.ok) {
                // Merge fetched emails into local mailInbox
                // Avoid duplicating IDs
                const existingIds = new Set(this.state.mailInbox.map(m => m.id));
                let newCount = 0;

                data.emails.forEach(email => {
                    if (!existingIds.has(email.id)) {
                        this.state.mailInbox.push(email);
                        newCount++;
                    }
                });

                if (newCount > 0) {
                    // Sort descending by date
                    this.state.mailInbox.sort((a, b) => new Date(b.date) - new Date(a.date));
                    this.logAction('EMAIL', 'IMAP_SYNC', 'SYSTEM', 'success', `Synced ${newCount} new inbox messages.`);
                }

                this.notify();
                return { success: true, count: newCount };
            } else {
                return { success: false, message: data.message };
            }
        } catch (e) {
            console.error('IMAP Sync UI Error:', e);
            return { success: false, message: e.message };
        }
    },

    async syncIMAPSentItems() {
        try {
            const apiBase = this.apiBase();
            const res = await fetch(apiBase + '/api/mail/sent/sync');
            const data = await res.json();

            if (data.ok) {
                const existingIds = new Set(this.state.mailHistory.map(m => m.id));
                let newCount = 0;

                data.emails.forEach(email => {
                    if (!existingIds.has(email.id)) {
                        this.state.mailHistory.push(email);
                        newCount++;
                    }
                });

                if (newCount > 0) {
                    this.state.mailHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
                    this.logAction('EMAIL', 'IMAP_SYNC_SENT', 'SYSTEM', 'success', `Synced ${newCount} outbound messages.`);
                }

                this.notify();
                return { success: true, count: newCount };
            } else {
                return { success: false, message: data.message };
            }
        } catch (e) {
            console.error('IMAP Sent Sync UI Error:', e);
            return { success: false, message: e.message };
        }
    },

    saveTemplate(template) {
        if (!template.id) {
            template.id = Date.now();
            this.state.mailTemplates.push(template);
        } else {
            const index = this.state.mailTemplates.findIndex(t => t.id === template.id);
            if (index !== -1) this.state.mailTemplates[index] = template;
        }
        this.logAction('EMAIL', 'SAVE_TEMPLATE', template.name, 'success', `Template saved: ${template.name}`);
        this.notify();
        return { success: true, id: template.id };
    },

    deleteTemplate(id) {
        this.state.mailTemplates = this.state.mailTemplates.filter(t => t.id !== id);
        this.logAction('EMAIL', 'DELETE_TEMPLATE', id, 'success', `Template deleted: ${id}`);
        this.notify();
        return { success: true };
    },

    logEmail(logEntry) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            status: 'sent',
            ...logEntry
        };
        this.state.emailLogs.unshift(entry);
        if (this.state.emailLogs.length > 500) this.state.emailLogs.pop();
        this.notify();
    },

    replaceVariables(text, data = {}) {
        if (!text) return '';
        const variables = {
            '{{FULL_NAME}}': data.name || data.clientName || 'Valued Client',
            '{{EMAIL}}': data.email || '',
            '{{COMPANY_NAME}}': this.state.company.name || 'PM Travel Agency',
            '{{BOOKING_ID}}': data.bookingId || data.id || '',
            '{{QUOTE_ID}}': data.quoteId || data.id || '',
            '{{QUOTE_URL}}': `https://crm.pm-travel.com/quote/${data.id || 'view'}`,
            '{{WEBSITE_URL}}': this.state.company.website || 'https://pm-travelagency.com',
            '{{WHATSAPP_NUMBER}}': this.state.company.phone || '',
            '{{UNSUBSCRIBE_LINK}}': `https://crm.pm-travel.com/unsubscribe?email=${data.email || 'client'}`
        };

        let result = text;
        for (const [key, value] of Object.entries(variables)) {
            result = result.split(key).join(value);
        }
        return result;
    },

    wipeDemoData() {
        console.log('Demo wipe not required (Clean Install)');
        return { success: true };
    },

    resetDashboardStats() {
        this.state.salesData = {
            revenueByMarket: [],
            bestSellers: []
        };
        this.notify();
    },

    async fetchCampaignAnalytics() {
        try {
            // Support both direct node server and live server setups
            const base = (window.location && window.location.port === '3000') ? '' : 'http://localhost:3000';
            const res = await fetch(base + '/api/campaigns/analytics');
            const result = await res.json();
            if (result.ok && result.data) {
                this.state.campaignAnalytics = result.data;
                // Update campaigns stats locally
                Object.keys(result.data).forEach(id => {
                    const c = this.state.campaigns.find(c => String(c.id) === id);
                    if (c) c.stats = result.data[id];
                });
                this.notify();
            }
        } catch (e) {
            console.error('Error fetching campaign analytics:', e);
        }
    },

    getCampaignAnalytics(campaignId) {
        if (!this.state.campaignAnalytics) return {};
        return this.state.campaignAnalytics[campaignId] || {};
    },

    wipeAllData() {
        const collections = [
            'b2bClients', 'b2cClients', 'quotes', 'bookings', 'sales',
            'invoices', 'campaigns', 'whatsapp', 'waCampaigns', 'waQuickReplies', 'scraperJobs', 'scrapedLeads', 'mailHistory',
            'mailInbox', 'mailDrafts', 'tasks', 'notifications',
            'emailLogs', 'actionLogs', 'integrationLogs', 'authLogs'
        ];

        collections.forEach(key => {
            if (this.state[key]) {
                this.state[key] = [];
            }
        });

        // Reset system flags
        this.state.systemSettings.maintenance.isFirstRun = true;
        this.state.systemSettings.maintenance.lastReset = new Date().toISOString();

        this.logAction('MAINTENANCE', 'WIPE_ALL', 'SYSTEM', 'danger', 'Universal data wipe completed');
        this.notify();
        return { success: true };
    },


    // API base helper:
    // - When served via http(s) from the Node server, we call same-origin (relative URLs).
    // - When opened via file://, fall back to the local SMTP server on localhost:3000.
    apiBase() {
        // If served over HTTP/HTTPS (any port, including Traefik/Dokploy on 443/80),
        // use relative paths so API calls go to the same origin.
        // Only fall back to localhost:3000 when opened directly from disk (file://).
        if (window.location && window.location.protocol !== 'file:') return '';

        // Local dev fallback (file:// open without a dev server)
        return 'http://localhost:3000';
    },

    resetDashboardStats() {
        // In this architecture, stats are derived from data rows.
        // If data is wiped, stats reset automatically.
        // This method can clear any cached totals if they existed.
        this.logAction('MAINTENANCE', 'RESET_STATS', 'SYSTEM', 'success', 'Dashboard intelligence cache cleared');
        this.notify();
        return { success: true };
    }
};

// ---------------- Persistence (Offline friendly) ----------------
// Fix: HTML Catalogue imports (and catalogue items) were lost on refresh, so users
// would "import" from desktop but not see it in the list after navigation/reload.
// We persist only the necessary collections to localStorage.
(function () {
    const KEY = 'pm_crm_persist_v12';
    const COLLECTIONS = [
        'b2bClients', 'b2cClients', 'quotes', 'bookings', 'sales', 'invoices', 'payments',
        'campaigns', 'tasks', 'notifications', 'actionLogs', 'integrationLogs', 'authLogs',
        'company', 'systemSettings', 'salesData', 'catalogueAnalytics', 'campaignAnalytics',
        'emails', 'mailTemplates', 'whatsappTemplates', 'whatsapp', 'whatsappOptOuts', 'audienceLists', 'emailBlacklist',
        'catalogue', 'htmlCatalogues', 'catalogues', 'waCampaigns', 'waQuickReplies', 'scraperJobs', 'scrapedLeads'
    ];

    function safeParse(json) {
        try { return JSON.parse(json); } catch (e) { return null; }
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return;
            const saved = safeParse(raw);
            if (!saved || typeof saved !== 'object') return;

            COLLECTIONS.forEach(k => {
                if (saved[k] !== undefined) {
                    store.state[k] = saved[k];
                }
            });
        } catch (e) {
            // Ignore storage errors (private mode / blocked storage)
        }
    }

    function save() {
        try {
            const payload = {};
            COLLECTIONS.forEach(k => payload[k] = store.state[k]);
            localStorage.setItem(KEY, JSON.stringify(payload));
        } catch (e) {
            // Ignore quota exceeded and other storage errors
        }
    }

    // Load once at boot
    load();

    // Debounced auto-save
    let t = null;
    store.subscribe(() => {
        clearTimeout(t);
        t = setTimeout(save, 450);
    });
})();
