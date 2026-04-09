
const Dashboard = {
    render() {
        const content = document.getElementById('mainContent');
        const state = store.state;
        const user = state.currentUser;

        const totalClients = state.b2bClients.length + state.b2cClients.length;
        const totalBookings = state.bookings.length;

        if (totalClients === 0 && totalBookings === 0) {
            content.innerHTML = `
                <div style="padding: 60px 20px; text-align: center; max-width: 900px; margin: 0 auto;">
                    <div class="card p-5" style="border: 1px solid var(--border); background: var(--bg-card); border-radius: 32px; box-shadow: var(--shadow-xl);">
                        <div style="width: 120px; height: 120px; background: rgba(var(--primary-rgb), 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 40px; position: relative;">
                            <i class="fa-solid fa-rocket" style="font-size: 50px; color: var(--primary); animation: float 3s ease-in-out infinite;"></i>
                            <div style="position: absolute; top: 0; right: 0; width: 35px; height: 35px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid var(--card-bg);">
                                <i class="fa-solid fa-check" style="color: white; font-size: 14px;"></i>
                            </div>
                        </div>
                        <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -1.5px; margin-bottom: 15px;">Welcome to Your Travel Command Center</h2>
                        <p style="color: var(--text-secondary); font-size: 16px; margin-bottom: 45px; line-height: 1.8; max-width: 600px; margin-left: auto; margin-right: auto;">
                            Your workspace is pre-configured and ready for launch. To begin generating analytics and tracking revenue, you can import your existing client base.
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr; gap: 25px; margin-bottom: 50px; max-width: 400px; margin-left: auto; margin-right: auto;">
                            <div class="card p-4" style="background: rgba(var(--primary-rgb), 0.02); border: 1px solid rgba(var(--primary-rgb), 0.1); cursor: pointer; transition: 0.3s;" onclick="handleRoute('b2b')">
                                <i class="fa-solid fa-user-plus" style="font-size: 24px; color: var(--primary); margin-bottom: 15px;"></i>
                                <h4 style="font-weight: 700; margin-bottom: 8px;">Import B2B Partners</h4>
                                <p style="font-size: 13px; color: var(--text-muted);">Sync your agency network via CSV or API.</p>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: center; gap: 40px; padding-top: 30px; border-top: 1px solid var(--border);">
                            <div style="text-align: left;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">System Health</div>
                                <div style="font-size: 14px; font-weight: 700; color: var(--success);">OPTIMIZED</div>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Cloud Sync</div>
                                <div style="font-size: 14px; font-weight: 700; color: var(--info);">READY</div>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Security Tier</div>
                                <div style="font-size: 14px; font-weight: 700; color: var(--warning);">GRAND PREMIUM</div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                        100% { transform: translateY(0px); }
                    }
                </style>
            `;
            return;
        }

        // Real Dashboard Logic here (KPIs, Charts, etc.)
        // SOP ERREUR C: Filter data by global dateRange
        const filteredBookings = store.filterByDateRange(state.bookings, 'createdAt');
        const filteredQuotes = store.filterByDateRange(state.quotes, 'createdAt');
        const filteredCampaigns = store.filterByDateRange(state.campaigns, 'date');

        // Calculate metrics from filtered data
        const totalQuotes = filteredQuotes.length;
        const totalCampaigns = filteredCampaigns.length;
        const totalInvoices = store.filterByDateRange(state.invoices || [], 'date').length;

        // Revenue calculations (filtered)
        const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const paidRevenue = filteredBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const pendingRevenue = totalRevenue - paidRevenue;

        // Pipeline value (quotes that are draft or sent)
        const pipelineValue = filteredQuotes
            .filter(q => q.status === 'draft' || q.status === 'sent')
            .reduce((sum, q) => sum + (q.totalPrice || 0), 0);

        // Conversion rate (accepted quotes / total quotes)
        const acceptedQuotes = filteredQuotes.filter(q => q.status === 'accepted').length;
        const conversionRate = totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : 0;

        // Status breakdowns (filtered)
        const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed').length;
        const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
        const completedBookings = filteredBookings.filter(b => b.status === 'completed').length;

        // Recent activity (combine recent items from different sources)
        const recentActivity = [
            ...state.bookings.slice(-3).map(b => ({
                type: 'booking',
                icon: 'fa-solid fa-plane',
                color: 'var(--primary)',
                title: `Booking: ${b.title || b.id}`,
                subtitle: b.clientName,
                date: b.createdAt,
                status: b.status
            })),
            ...state.quotes.slice(-3).map(q => ({
                type: 'quote',
                icon: 'fa-solid fa-file-invoice-dollar',
                color: 'var(--info)',
                title: `Quote: ${q.title || q.id}`,
                subtitle: q.clientName,
                date: q.createdAt,
                status: q.status
            })),
            ...(state.b2bClients.slice(-2).map(c => ({
                type: 'client',
                icon: 'fa-regular fa-building',
                color: 'var(--success)',
                title: `New B2B: ${c.company || c.name}`,
                subtitle: c.email,
                date: c.createdAt,
                status: 'new'
            }))),
            ...(state.b2cClients.slice(-2).map(c => ({
                type: 'client',
                icon: 'fa-regular fa-user',
                color: 'var(--warning)',
                title: `New B2C: ${c.name}`,
                subtitle: c.email,
                date: c.createdAt,
                status: 'new'
            })))
        ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 6);

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 24px; font-weight:800; letter-spacing:-1px; margin-bottom:5px;">Executive Overview</h2>
                    <p style="color:var(--text-secondary); font-size:13px;">Welcome back, ${user.name}. Here's your business at a glance.</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="TemplateManager.openEditor()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Forge New Template
                    </button>
                    <button class="btn-primary" onclick="handleRoute('quotes')">
                        <i class="fa-solid fa-plus"></i> New Quote
                    </button>
                </div>
            </div>

            <!-- Primary KPI Row -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px;">
                <div class="card p-4" style="background:linear-gradient(135deg, rgba(var(--primary-rgb), 0.05), rgba(var(--primary-rgb), 0.02)); border:1px solid rgba(var(--primary-rgb), 0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span style="font-size: 11px; color: var(--primary); text-transform: uppercase; font-weight: 800; letter-spacing:1px;">Total Revenue</span>
                            <h3 style="font-size: 28px; font-weight: 800; margin-top:8px; letter-spacing:-1px;">${store.formatCurrency(totalRevenue)}</h3>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">
                                <span style="color:var(--success);"><i class="fa-solid fa-arrow-up"></i> ${store.formatCurrency(paidRevenue)}</span> collected
                            </div>
                        </div>
                        <div style="width:45px; height:45px; background:rgba(var(--primary-rgb), 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                            <i class="fa-solid fa-chart-line" style="color:var(--primary); font-size:20px;"></i>
                        </div>
                    </div>
                </div>

                <div class="card p-4" style="background:linear-gradient(135deg, rgba(var(--success-rgb), 0.05), rgba(var(--success-rgb), 0.02)); border:1px solid rgba(var(--success-rgb), 0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span style="font-size: 11px; color: var(--success); text-transform: uppercase; font-weight: 800; letter-spacing:1px;">Pipeline Value</span>
                            <h3 style="font-size: 28px; font-weight: 800; margin-top:8px; letter-spacing:-1px;">${store.formatCurrency(pipelineValue)}</h3>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">
                                ${state.quotes.filter(q => q.status === 'draft' || q.status === 'sent').length} active proposals
                            </div>
                        </div>
                        <div style="width:45px; height:45px; background:rgba(var(--success-rgb), 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                            <i class="fa-solid fa-funnel-dollar" style="color:var(--success); font-size:20px;"></i>
                        </div>
                    </div>
                </div>

                <div class="card p-4">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 800; letter-spacing:1px;">Conversion Rate</span>
                            <h3 style="font-size: 28px; font-weight: 800; margin-top:8px; letter-spacing:-1px;">${conversionRate}%</h3>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">
                                ${acceptedQuotes} of ${totalQuotes} quotes won
                            </div>
                        </div>
                        <div style="width:45px; height:45px; background:rgba(var(--info-rgb), 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                            <i class="fa-solid fa-bullseye" style="color:var(--info); font-size:20px;"></i>
                        </div>
                    </div>
                </div>

                <div class="card p-4" style="background:linear-gradient(135deg, rgba(var(--warning-rgb), 0.05), rgba(var(--warning-rgb), 0.02)); border:1px solid rgba(var(--warning-rgb), 0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span style="font-size: 11px; color: var(--warning); text-transform: uppercase; font-weight: 800; letter-spacing:1px;">Pending Balance</span>
                            <h3 style="font-size: 28px; font-weight: 800; margin-top:8px; letter-spacing:-1px;">${store.formatCurrency(pendingRevenue)}</h3>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">
                                awaiting payment
                            </div>
                        </div>
                        <div style="width:45px; height:45px; background:rgba(var(--warning-rgb), 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                            <i class="fa-solid fa-clock" style="color:var(--warning); font-size:20px;"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Secondary Stats Row -->
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px;">
                <div class="card p-3" style="text-align:center; cursor:pointer;" onclick="handleRoute('b2b')">
                    <div style="font-size:24px; font-weight:800; color:var(--primary);">${state.b2bClients.length}</div>
                    <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">B2B Partners</div>
                </div>
                <div class="card p-3" style="text-align:center; cursor:pointer;" onclick="handleRoute('b2c')">
                    <div style="font-size:24px; font-weight:800; color:var(--success);">${state.b2cClients.length}</div>
                    <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">B2C Travelers</div>
                </div>
                <div class="card p-3" style="text-align:center; cursor:pointer;" onclick="handleRoute('bookings')">
                    <div style="font-size:24px; font-weight:800; color:var(--info);">${totalBookings}</div>
                    <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Bookings</div>
                </div>
                <div class="card p-3" style="text-align:center; cursor:pointer;" onclick="handleRoute('quotes')">
                    <div style="font-size:24px; font-weight:800; color:var(--warning);">${totalQuotes}</div>
                    <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Proposals</div>
                </div>
                <div class="card p-3" style="text-align:center; cursor:pointer;" onclick="handleRoute('campaigns')">
                    <div style="font-size:24px; font-weight:800; color:var(--danger);">${totalCampaigns}</div>
                    <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Campaigns</div>
                </div>
            </div>

            <!-- Main Content Grid -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 25px;">
                <!-- Left Column: Booking Pipeline & Quick Actions -->
                <div>
                    <!-- Booking Pipeline -->
                    <div class="card p-4" style="margin-bottom:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">Booking Pipeline</h4>
                            <button class="btn-social" onclick="handleRoute('bookings')">View All <i class="fa-solid fa-arrow-right"></i></button>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px;">
                            <div style="text-align:center; padding:20px; background:rgba(var(--warning-rgb), 0.05); border-radius:12px; border:1px solid rgba(var(--warning-rgb), 0.1);">
                                <div style="font-size:32px; font-weight:800; color:var(--warning);">${pendingBookings}</div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-top:5px;">Pending</div>
                            </div>
                            <div style="text-align:center; padding:20px; background:rgba(var(--success-rgb), 0.05); border-radius:12px; border:1px solid rgba(var(--success-rgb), 0.1);">
                                <div style="font-size:32px; font-weight:800; color:var(--success);">${confirmedBookings}</div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-top:5px;">Confirmed</div>
                            </div>
                            <div style="text-align:center; padding:20px; background:rgba(var(--info-rgb), 0.05); border-radius:12px; border:1px solid rgba(var(--info-rgb), 0.1);">
                                <div style="font-size:32px; font-weight:800; color:var(--info);">${completedBookings}</div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-top:5px;">Completed</div>
                            </div>
                            <div style="text-align:center; padding:20px; background:rgba(var(--danger-rgb), 0.05); border-radius:12px; border:1px solid rgba(var(--danger-rgb), 0.1);">
                                <div style="font-size:32px; font-weight:800; color:var(--danger);">${filteredBookings.filter(b => b.status === 'cancelled').length}</div>
                                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-top:5px;">Cancelled</div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="card p-4">
                        <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:20px;">Quick Actions</h4>
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px;">
                            <div class="card p-3" style="text-align:center; cursor:pointer; transition:0.2s; border:1px solid var(--border);" onclick="Clients.openModal('B2B')" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                                <i class="fa-solid fa-building" style="font-size:24px; color:var(--primary); margin-bottom:10px;"></i>
                                <div style="font-size:12px; font-weight:600;">Add B2B</div>
                            </div>
                            <div class="card p-3" style="text-align:center; cursor:pointer; transition:0.2s; border:1px solid var(--border);" onclick="Clients.openModal('B2C')" onmouseover="this.style.borderColor='var(--success)'" onmouseout="this.style.borderColor='var(--border)'">
                                <i class="fa-solid fa-user-plus" style="font-size:24px; color:var(--success); margin-bottom:10px;"></i>
                                <div style="font-size:12px; font-weight:600;">Add B2C</div>
                            </div>
                            <div class="card p-3" style="text-align:center; cursor:pointer; transition:0.2s; border:1px solid var(--border);" onclick="Quotes.openModal()" onmouseover="this.style.borderColor='var(--info)'" onmouseout="this.style.borderColor='var(--border)'">
                                <i class="fa-solid fa-file-invoice-dollar" style="font-size:24px; color:var(--info); margin-bottom:10px;"></i>
                                <div style="font-size:12px; font-weight:600;">New Quote</div>
                            </div>
                            <div class="card p-3" style="text-align:center; cursor:pointer; transition:0.2s; border:1px solid var(--border);" onclick="Bookings.openModal()" onmouseover="this.style.borderColor='var(--warning)'" onmouseout="this.style.borderColor='var(--border)'">
                                <i class="fa-solid fa-plane" style="font-size:24px; color:var(--warning); margin-bottom:10px;"></i>
                                <div style="font-size:12px; font-weight:600;">New Booking</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Recent Activity -->
                <div class="card p-4">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">Recent Activity</h4>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${recentActivity.length > 0 ? recentActivity.map(item => `
                            <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(0,0,0,0.02); border-radius:10px; border:1px solid var(--border);">
                                <div style="width:40px; height:40px; background:rgba(0,0,0,0.03); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="${item.icon}" style="color:${item.color}; font-size:16px;"></i>
                                </div>
                                <div style="flex:1; min-width:0;">
                                    <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</div>
                                    <div style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.subtitle || 'N/A'}</div>
                                </div>
                                <span class="status-badge status-${item.status}" style="font-size:9px; padding:4px 8px;">${item.status?.toUpperCase() || 'NEW'}</span>
                            </div>
                        `).join('') : `
                            <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                                <i class="fa-solid fa-inbox" style="font-size:32px; margin-bottom:10px; opacity:0.5;"></i>
                                <p style="font-size:13px;">No recent activity</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
};

window.Dashboard = Dashboard;
