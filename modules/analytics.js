
const Analytics = {
    activeSection: 'global',

    render() {
        const content = document.getElementById('mainContent');
        const user = store.state.currentUser;

        this.canSeeFinance = ['admin', 'ceo', 'manager', 'finance'].includes(user.role);

        const totalClients = store.state.b2bClients.length + store.state.b2cClients.length;
        const totalSales = store.state.sales.length;

        if (totalClients === 0 && totalSales === 0) {
            content.innerHTML = `
                <div class="analytics-container">
                    ${this.renderHeader()}
                    <div style="padding: 120px 20px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border); border-radius: 24px; margin-top: 20px;">
                        <div style="width: 100px; height: 100px; background: rgba(var(--primary-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; position: relative;">
                            <i class="fa-solid fa-chart-line" style="font-size: 40px; color: var(--primary);"></i>
                            <div style="position: absolute; top: -5px; right: -5px; width: 25px; height: 25px; background: var(--warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid var(--card-bg);">
                                <i class="fa-solid fa-bolt" style="color: white; font-size: 10px;"></i>
                            </div>
                        </div>
                        <h3 style="font-size: 26px; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px;">Zero Gravity Intelligence</h3>
                        <p style="color: var(--text-secondary); font-size: 15px; max-width: 500px; margin: 0 auto 40px; line-height: 1.7;">
                            Your data matrix is currently in stasis. Intelligence dashboards require at least one client or booking to generate predictive visualizations and fiscal trends.
                        </p>
                        <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 35px;">
                            <button class="btn-primary" style="padding: 12px 25px;" onclick="handleRoute('b2b')">
                                <i class="fa-solid fa-user-plus"></i> Import Clients
                            </button>
                            <button class="btn-secondary" style="padding: 12px 25px;" onclick="handleRoute('settings')">
                                <i class="fa-solid fa-database"></i> Demo Data
                            </button>
                        </div>
                        <div style="display: flex; justify-content: center; gap: 40px;">
                            <div style="text-align: left;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px;">Metric Latency</div>
                                <div style="font-size: 14px; font-weight: 700;">0.00ms</div>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px;">Trend Status</div>
                                <div style="font-size: 14px; font-weight: 700; color: var(--info);">READY</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="analytics-container">
                ${this.renderHeader()}
                ${this.renderFilters()}

                <div class="analytics-tabs-luxury">
                    <button class="analytics-tab-item ${this.activeSection === 'global' ? 'active' : ''}" onclick="Analytics.switchSection('global')">
                        <i class="fa-solid fa-chart-pie"></i> Global Perspective
                    </button>
                    <button class="analytics-tab-item ${this.activeSection === 'sales' ? 'active' : ''}" onclick="Analytics.switchSection('sales')">
                        <i class="fa-solid fa-bezier-curve"></i> Pipeline Dynamics
                    </button>
                    <button class="analytics-tab-item ${this.activeSection === 'finance' ? 'active' : ''}" onclick="Analytics.switchSection('finance')">
                        <i class="fa-solid fa-vault"></i> Financial Core
                    </button>
                    ${['admin', 'manager'].includes(user.role) ? `
                        <button class="analytics-tab-item ${this.activeSection === 'marketing' ? 'active' : ''}" onclick="Analytics.switchSection('marketing')">
                            <i class="fa-solid fa-bullhorn"></i> Marketing ROI
                        </button>
                        <button class="analytics-tab-item ${this.activeSection === 'operation' ? 'active' : ''}" onclick="Analytics.switchSection('operation')">
                            <i class="fa-solid fa-gears"></i> Operations
                        </button>
                    ` : ''}
                </div>

                <div id="analyticsContent" class="page-transition">
                    ${this.renderActiveSection()}
                </div>
            </div>
        `;
    },

    renderHeader() {
        return `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 35px;">
                <div>
                    <h2 style="font-size: 28px; font-weight:800; letter-spacing:-1px; margin-bottom:8px;">Executive Analytics</h2>
                    <p style="color:var(--text-muted); font-size:14px; font-weight:500;">Travel Sync Intelligence Engine | Real-time Market Data</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <button class="btn-secondary" style="height:44px; border-radius:12px;" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" style="height:44px; border-radius:12px; font-weight:700;" onclick="Analytics.refreshData(this)">
                        <i class="fa-solid fa-arrows-rotate"></i> Synchronize
                    </button>
                </div>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div class="analytics-glass-bar">
                <div class="analytics-filter-group">
                    <span class="analytics-filter-label">Analysis Period</span>
                    <div class="analytics-filter-control">
                        <i class="fa-regular fa-calendar-check" style="color:var(--primary);"></i>
                        <div class="select-wrap">
                            <select onchange="Analytics.updateFilter('date', this.value)">
                                <option value="today">Today</option>
                                <option value="7d" selected>Last 7 Days</option>
                                <option value="14d">Last 14 Days</option>
                                <option value="month">This Month</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                </div>

                <div class="analytics-filter-group">
                    <span class="analytics-filter-label">Market Coverage</span>
                    <div class="analytics-filter-control">
                        <i class="fa-solid fa-earth-americas" style="color:var(--info);"></i>
                        <div class="select-wrap">
                            <select onchange="Analytics.updateFilter('type', this.value)">
                                <option value="all">Global Market</option>
                                <option value="b2b">Corporate B2B</option>
                                <option value="b2c">Direct B2C</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                </div>

                <div class="analytics-filter-group">
                    <span class="analytics-filter-label">Fiscal Currency</span>
                    <div class="analytics-filter-control">
                        <i class="fa-solid fa-wallet" style="color:var(--warning);"></i>
                        <div class="select-wrap">
                            <select onchange="Analytics.updateFilter('currency', this.value)">
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                            <i class="fa-solid fa-chevron-down caret"></i>
                        </div>
                    </div>
                </div>

                <div class="analytics-filter-group" style="margin-left:auto; border:none;">
                    <span class="analytics-filter-label">Predictive Status</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:10px; height:10px; background:var(--success); border-radius:50%; box-shadow: 0 0 10px var(--success);"></span>
                        <span style="font-size:12px; font-weight:700; color:var(--success);">LIVE ENGINE</span>
                    </div>
                </div>
            </div>
        `;
    },

    updateFilter(key, value) {
        UI.showToast(`Syncing intelligence: ${key} = ${value}`, 'info');
        this.render();
    },

    switchSection(section) {
        this.activeSection = section;
        this.render();
    },

    renderActiveSection() {
        switch (this.activeSection) {
            case 'global': return this.renderGlobal();
            case 'sales': return this.renderSales();
            case 'finance': return this.renderFinance();
            case 'marketing': return this.renderMarketing();
            case 'operation': return this.renderOperation();
            default: return this.renderGlobal();
        }
    },

    renderGlobal() {
        setTimeout(() => this.initGlobalCharts(), 150);
        // Calculate confirmed/cancelled for the text display
        const bookings = store.state.bookings || [];
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        const successRate = bookings.length > 0 ? ((confirmed / bookings.length) * 100).toFixed(1) : '0.0';

        return `
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:25px; margin-bottom:35px;">
                ${this.renderKPIs()}
            </div>
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:30px;">
                <div class="analytics-card-luxury">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                        <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px;">Revenue Distribution & Growth</h3>
                        <div style="display:flex; gap:10px;">
                            <span style="font-size:12px; font-weight:600; color:var(--text-muted);"><i class="fa-solid fa-circle" style="color:var(--primary); font-size:8px;"></i> Projected</span>
                            <span style="font-size:12px; font-weight:600; color:var(--text-muted);"><i class="fa-solid fa-circle" style="color:var(--info); font-size:8px;"></i> Actual</span>
                        </div>
                    </div>
                    <div style="height:400px;">
                        <canvas id="revenueTrendChart"></canvas>
                    </div>
                </div>
                <div class="analytics-card-luxury">
                    <h3 style="font-size:18px; font-weight:700; letter-spacing:-0.5px; margin-bottom:30px;">Booking Efficiency</h3>
                    <div style="height:320px; display:flex; align-items:center; justify-content:center; position:relative;">
                        <canvas id="bookingsComparisonChart"></canvas>
                        <div style="position:absolute; text-align:center;">
                            <h4 style="font-size:36px; font-weight:800; margin:0;">${successRate}%</h4>
                            <p style="font-size:12px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Confirmed</p>
                        </div>
                    </div>
                    <div style="margin-top:30px; display:flex; justify-content:space-around;">
                        <div style="text-align:center;">
                            <span style="display:block; font-size:11px; color:var(--text-muted); font-weight:700;">CONFIRMED</span>
                            <strong style="font-size:16px; color:var(--success);">${confirmed}</strong>
                        </div>
                        <div style="text-align:center;">
                            <span style="display:block; font-size:11px; color:var(--text-muted); font-weight:700;">CANCELLED</span>
                            <strong style="font-size:16px; color:var(--danger);">${cancelled}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderKPIs() {
        const state = store.state;
        const totalLeads = state.b2cClients.length + state.b2bClients.length;
        const revenueRaw = state.sales.reduce((acc, s) => acc + (s.revenue || 0), 0);
        const avgTicket = state.sales.length > 0 ? revenueRaw / state.sales.length : 0;

        const displayRevenue = this.canSeeFinance ? store.formatCurrency(revenueRaw, null, { notation: 'compact' }) : '***.**';
        const displayAvg = this.canSeeFinance ? store.formatCurrency(avgTicket, null, { notation: 'compact' }) : '***.**';

        // Calculate trends (mock logic for now as history is limited, but dynamic)
        // In v2, this would compare vs previous period
        const kpis = [
            { label: 'Total Contacts', value: totalLeads, trend: 'Live', icon: 'fa-users-viewfinder', color: 'bg-blue-soft', iconColor: 'var(--primary)' },
            { label: 'Market Revenue', value: displayRevenue, trend: 'Live', icon: 'fa-vault', color: 'bg-green-soft', iconColor: 'var(--success)' },
            { label: 'Market Performance', value: '100%', trend: 'Ready', icon: 'fa-arrow-trend-up', color: 'bg-purple-soft', iconColor: 'var(--info)' },
            { label: 'Average Ticket', value: displayAvg, trend: 'Live', icon: 'fa-ticket-simple', color: 'bg-orange-soft', iconColor: 'var(--warning)' }
        ];

        return kpis.map(k => `
            <div class="analytics-card-luxury">
                <div class="analytics-kpi-header">
                    <div class="analytics-icon-box ${k.color}">
                        <i class="fa-solid ${k.icon}" style="color:${k.iconColor};"></i>
                    </div>
                    <span class="analytics-trend-pill trend-up">
                        ${k.trend} <i class="fa-solid fa-arrow-up"></i>
                    </span>
                </div>
                <div class="analytics-metric-value">${k.value}</div>
                <div class="analytics-metric-label">${k.label}</div>
            </div>
        `).join('');
    },

    renderSales() {
        setTimeout(() => this.initSalesCharts(), 150);
        return `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                <div class="analytics-card-luxury">
                    <h3 style="font-size:18px; font-weight:700; margin-bottom:30px;">B2B Strategic Pipeline</h3>
                    <div style="height:350px;">
                        <canvas id="b2bPipelineChart"></canvas>
                    </div>
                </div>
                <div class="analytics-card-luxury">
                    <h3 style="font-size:18px; font-weight:700; margin-bottom:30px;">B2C Engagement Funnel</h3>
                    <div style="height:350px;">
                        <canvas id="b2cPipelineChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },

    renderFinance() {
        setTimeout(() => this.initFinanceCharts(), 150);

        // Calculate Outstanding
        const invoices = store.state.invoices || [];
        const outstanding = invoices.filter(i => i.status === 'overdue' || i.status === 'sent')
            .reduce((sum, i) => sum + (i.total || 0), 0);
        const displayOutstanding = store.formatCurrency(outstanding);

        // Calculate Average Payment Time (Mock logic based on paid invoices)
        const paidInvoices = invoices.filter(i => i.status === 'paid');
        // If we had payment dates, we'd diff them. For now, 0 or specific logic.
        const avgDays = paidInvoices.length > 0 ? '4.5 Days' : '0 Days';

        return `
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:30px;">
                <div class="analytics-card-luxury">
                    <h3 style="font-size:18px; font-weight:700; margin-bottom:30px;">Revenue Stream Concentration</h3>
                    <div style="height:400px;">
                        <canvas id="serviceRevenueChart"></canvas>
                    </div>
                </div>
                <div class="analytics-card-luxury">
                    <h3 style="font-size:18px; font-weight:700; margin-bottom:30px;">Settlement Status</h3>
                    <div style="height:300px; display:flex; align-items:center; justify-content:center;">
                        <canvas id="financeBreakdownChart"></canvas>
                    </div>
                    <div style="margin-top:40px; border-top:1px solid var(--border); padding-top:20px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <span style="color:var(--text-muted); font-size:13px;">Outstanding Collectibles</span>
                            <strong style="color:var(--danger);">${displayOutstanding}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:var(--text-muted); font-size:13px;">Average Payment Age</span>
                            <strong>${avgDays}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderMarketing() {
        setTimeout(() => this.initMarketingCharts(), 150);

        // Calculate counts
        const leads = store.state.b2cClients.length + store.state.b2bClients.length;
        const emails = store.state.emails ? store.state.emails.length : 0;
        // Mock conversion rate logic
        const bookings = store.state.bookings.length;
        const conversion = leads > 0 ? ((bookings / leads) * 100).toFixed(1) + '%' : '0%';

        return `
            <div class="analytics-card-luxury" style="margin-bottom:30px;">
                <h3 style="font-size:18px; font-weight:700; margin-bottom:30px;">Omnichannel Conversion ROI</h3>
                <div style="height:350px;">
                    <canvas id="marketingROIChart"></canvas>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:25px;">
                <div class="analytics-card-luxury" style="text-align:center;">
                    <i class="fa-brands fa-whatsapp" style="font-size:32px; color:#25D366; margin-bottom:15px; display:block;"></i>
                    <div class="analytics-metric-value">${leads}</div>
                    <div class="analytics-metric-label">Total Leads</div>
                </div>
                <div class="analytics-card-luxury" style="text-align:center;">
                    <i class="fa-solid fa-envelope-open-text" style="font-size:32px; color:var(--primary); margin-bottom:15px; display:block;"></i>
                    <div class="analytics-metric-value">${emails}</div>
                    <div class="analytics-metric-label">Email Outreach</div>
                </div>
                <div class="analytics-card-luxury" style="text-align:center;">
                    <i class="fa-solid fa-laptop-code" style="font-size:32px; color:var(--info); margin-bottom:15px; display:block;"></i>
                    <div class="analytics-metric-value">${conversion}</div>
                    <div class="analytics-metric-label">Conversion Rate</div>
                </div>
            </div>
        `;
    },

    renderOperation() {
        // Mock operational health logic
        const tasks = store.state.tasks || [];
        const completed = tasks.filter(t => t.status === 'completed').length;
        const health = tasks.length > 0 ? ((completed / tasks.length) * 100).toFixed(1) + '%' : '100%';

        return `
            <div class="analytics-card-luxury" style="padding:60px; text-align:center;">
                <h3 style="font-size:24px; font-weight:800; margin-bottom:15px;">Operational Performance Index</h3>
                <p style="color:var(--text-muted); margin-bottom:40px; max-width:600px; margin-left:auto; margin-right:auto;">Aggregated health check of internal agency workflows, task completion velocity, and client engagement SLAs.</p>
                <div style="display:flex; justify-content:center; gap:60px;">
                    <div style="width:180px; height:180px; border-radius:50%; border:12px solid var(--success); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 0 30px var(--success-glow);">
                        <strong style="font-size:32px;">${health}</strong>
                        <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Workflow Health</span>
                    </div>
                    <div style="width:180px; height:180px; border-radius:50%; border:12px solid var(--primary); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 0 30px var(--primary-glow);">
                        <strong style="font-size:32px;">-</strong>
                        <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">SLA Velocity</span>
                    </div>
                </div>
            </div>
        `;
    },

    initGlobalCharts() {
        Chart.defaults.color = 'rgba(255,255,255,0.4)';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.weight = '600';

        // 1. Revenue Calculation
        const sales = store.state.sales || [];
        // Group by Month (Last 6 months)
        const months = [];
        const revenueData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('default', { month: 'short' });
            months.push(monthLabel);

            // Filter sales for this month
            const monthSales = sales.filter(s => {
                const sDate = new Date(s.date);
                return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear();
            }).reduce((sum, s) => sum + (s.revenue || 0), 0);
            revenueData.push(monthSales);
        }

        const ctxRevenue = document.getElementById('revenueTrendChart')?.getContext('2d');
        if (ctxRevenue) {
            new Chart(ctxRevenue, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Actual Revenue',
                            data: revenueData,
                            borderColor: '#009EF7',
                            borderWidth: 4,
                            pointBackgroundColor: '#009EF7',
                            pointBorderColor: '#fff',
                            pointHoverRadius: 8,
                            fill: true,
                            backgroundColor: (context) => {
                                const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
                                gradient.addColorStop(0, 'rgba(0, 158, 247, 0.2)');
                                gradient.addColorStop(1, 'rgba(0, 158, 247, 0)');
                                return gradient;
                            },
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { padding: 10 } },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                            ticks: { callback: (v) => '$' + (v / 1000) + 'k', padding: 10 }
                        }
                    }
                }
            });
        }

        // 2. Booking Stats
        const bookings = store.state.bookings || [];
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        const totalBookings = confirmed + cancelled || 1; // avoid divide by zero for chart

        // If data is empty, show a placeholder balance 100-0 to avoid ugly chart
        const showPlaceholder = bookings.length === 0;
        const chartData = showPlaceholder ? [100, 0] : [confirmed, cancelled];

        const ctxBookings = document.getElementById('bookingsComparisonChart')?.getContext('2d');
        if (ctxBookings) {
            new Chart(ctxBookings, {
                type: 'doughnut',
                data: {
                    labels: ['Confirmed', 'Cancelled'],
                    datasets: [{
                        data: chartData,
                        backgroundColor: ['#17c653', 'rgba(248, 40, 90, 0.1)'],
                        borderColor: '#161623',
                        borderWidth: 8,
                        hoverOffset: 10
                    }]
                },
                options: {
                    cutout: '85%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Update DOM numbers for Booking Chart
        const container = document.getElementById('bookingsComparisonChart')?.parentElement?.parentElement;
        if (container) {
            const successRate = bookings.length > 0 ? ((confirmed / bookings.length) * 100).toFixed(1) : '0';
            container.querySelector('h4').textContent = successRate + '%';
            container.querySelectorAll('strong')[0].textContent = confirmed.toLocaleString();
            container.querySelectorAll('strong')[1].textContent = cancelled.toLocaleString();
        }
    },

    initSalesCharts() {
        const createFunnel = (id, data, labels, color) => {
            const ctx = document.getElementById(id)?.getContext('2d');
            if (ctx) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: color,
                            borderRadius: 12,
                            barThickness: 30
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { display: false }, ticks: { display: false } },
                            y: { grid: { display: false }, ticks: { color: '#fff', font: { weight: '800' } } }
                        }
                    }
                });
            }
        };

        const b2bCounts = [
            store.state.b2bClients.length,
            store.state.b2bClients.filter(c => c.status === 'prospect').length,
            store.state.b2bClients.filter(c => c.status === 'contacted').length,
            store.state.b2bClients.filter(c => c.status === 'negotiation').length,
            store.state.b2bClients.filter(c => c.status === 'active').length
        ];

        const b2cCounts = [
            store.state.b2cClients.length,
            store.state.b2cClients.filter(c => c.status === 'lead').length,
            store.state.b2cClients.filter(c => c.status === 'interested').length,
            store.state.b2cClients.filter(c => c.status === 'quote_requested').length,
            store.state.b2cClients.filter(c => c.status === 'booked').length
        ];

        createFunnel('b2bPipelineChart', b2bCounts, ['Total', 'Prospect', 'Contacted', 'Nagotiating', 'Active'], 'rgba(0, 158, 247, 0.8)');
        createFunnel('b2cPipelineChart', b2cCounts, ['Total', 'New Info', 'Interested', 'Quoting', 'Booked'], 'rgba(114, 57, 234, 0.8)');
    },

    initFinanceCharts() {
        const ctxService = document.getElementById('serviceRevenueChart')?.getContext('2d');
        if (ctxService) {
            // Aggregate by Product/Service Type (Simulated classification by 'type' or title kw)
            const sales = store.state.sales || [];
            const types = {};
            sales.forEach(s => {
                const type = s.type || 'Other';
                if (!types[type]) types[type] = { count: 0, revenue: 0 };
                types[type].count++;
                types[type].revenue += (s.revenue || 0);
            });

            const labels = Object.keys(types).length ? Object.keys(types) : ['No Data'];
            const vols = Object.keys(types).length ? Object.values(types).map(t => t.count) : [0];
            const revs = Object.keys(types).length ? Object.values(types).map(t => t.revenue) : [0];

            new Chart(ctxService, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Volume',
                        data: vols,
                        backgroundColor: '#009EF7',
                        borderRadius: 8
                    }, {
                        label: 'Revenue',
                        data: revs,
                        backgroundColor: '#17c653',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { padding: 25 } } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { display: false } }
                    }
                }
            });
        }

        const ctxFinance = document.getElementById('financeBreakdownChart')?.getContext('2d');
        if (ctxFinance) {
            // Invoices status
            const inv = store.state.invoices || [];
            const paid = inv.filter(i => i.status === 'paid').length;
            const pending = inv.filter(i => i.status === 'draft' || i.status === 'sent').length;
            const overdue = inv.filter(i => i.status === 'overdue').length;

            // Avoid empty chart
            const data = (paid + pending + overdue === 0) ? [1] : [paid, pending, overdue];
            const colors = (paid + pending + overdue === 0) ? ['#333'] : ['#17c653', '#f6c000', '#f8285a'];

            new Chart(ctxFinance, {
                type: 'pie',
                data: {
                    labels: ['Paid', 'Pending', 'Overdue'],
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: '#161623',
                        borderWidth: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
    },

    initMarketingCharts() {
        const ctxROI = document.getElementById('marketingROIChart')?.getContext('2d');
        if (ctxROI) {
            // Mock data for marketing as we don't have a full marketing module yet
            // But we can check campaigns
            const campaigns = store.state.campaigns || [];
            const active = campaigns.filter(c => c.status === 'active').length;
            const completed = campaigns.filter(c => c.status === 'completed').length;
            const draft = campaigns.filter(c => c.status === 'draft').length;

            new Chart(ctxROI, {
                type: 'bar',
                data: {
                    labels: ['Active', 'Completed', 'Draft'],
                    datasets: [{
                        label: 'Campaigns Count',
                        data: [active, completed, draft],
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: '#009EF7',
                        borderWidth: 2,
                        borderRadius: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { padding: 25 } } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { color: 'rgba(255,255,255,0.03)' } }
                    }
                }
            });
        }
    },

    exportData(type) {
        UI.showToast(`Generating high-fidelity intelligence report (${type.toUpperCase()})...`, 'info');
    },

    refreshData(btn) {
        UI.showFeedback(btn, 'loading');
        setTimeout(() => {
            this.render();
            UI.showToast('Global Intelligence Matrix Synced.', 'success');
        }, 800);
    }
};

window.Analytics = Analytics;
