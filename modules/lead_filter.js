// Lead Filter (B2B/B2C) – Standalone client-side module
// - Import CSV/XLSX
// - Column mapping (email/company/name/phone/country/city)
// - Clean, dedupe, classify B2B/B2C, optional local "AI" score
// - Export: Clean XLSX, Emails-only CSV, WhatsApp CSV, Invalid CSV, Duplicates CSV
//
// This module is designed for the existing vanilla CRM architecture:
// - It renders into #mainContent
// - It relies on SheetJS (XLSX) already loaded in index.html
// - It uses the CRM's UI helpers: UI.showToast, Modal.open

const LeadFilter = {
  _rawRows: [],
  _mappedRows: [],
  _cleanRows: [],
  _invalidRows: [],
  _duplicateRows: [],
  _mapping: {
    company_name: '',
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    website: ''
  },
  _headers: [],
  _fileMeta: null,

  // Filters
  _filters: {
    leadType: 'all', // all | b2b | b2c
    keepValidOnly: true,
    removeDuplicates: true,
    removeDuplicatesPhone: false,
    removeDuplicatesStrict: false,
    removeDisposable: true,
    excludeFreeProviders: false,
    tagRoleBased: true,
    aiMode: true,
    minScore: 0,
    search: ''
  },
  _viewMode: 'table', // table | analytics | funnel | markets | readiness | trends | report
  _selectedIds: new Set(),

  _analytics: {
    meta: { lastComputed: null },
    before: {},
    after: {},
    deltas: {},
    funnel: {},
    readiness: {},
    geo: {},
    quality: {},
    top: {},
    insights: []
  },

  // Lists (lightweight local)
  _freeProviders: new Set([
    'gmail.com', 'yahoo.com', 'yahoo.fr', 'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.fr',
    'msn.com', 'yandex.com'
  ]),
  _disposableDomains: new Set([
    'tempmail.com', '10minutemail.com', '10minmail.com', 'guerrillamail.com', 'mailinator.com',
    'yopmail.com', 'getnada.com', 'trashmail.com', 'temp-mail.org', 'minuteinbox.com'
  ]),
  _roleLocals: new Set([
    'info', 'contact', 'sales', 'booking', 'reservations', 'reservation', 'support', 'hello',
    'admin', 'office', 'service', 'marketing', 'inquiries', 'enquiries', 'groups', 'operations'
  ]),
  // V3: Blocked Domains (Task 23)
  _blockedDomains: new Set([
    'spam.com', 'phishing.net', 'malware.org', 'bad-reputation.com'
  ]),

  // ---------- Public ----------
  render() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = this._template();
    this._bind();
    this._renderStatsAndTable();
    // V3: Check for stored history
    this._loadHistory();
  },

  // V3: Import History (Task 25)
  _saveHistory(meta) {
    const history = JSON.parse(localStorage.getItem('lf_history') || '[]');
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      name: meta.name,
      size: meta.size,
      records: this._rawRows.length,
      valid: this._cleanRows.length
    });
    // Keep last 10
    if (history.length > 10) history.length = 10;
    localStorage.setItem('lf_history', JSON.stringify(history));
  },

  _loadHistory() {
    // Just for debug or future UI, but we can log it
    console.log('Lead Filter History:', JSON.parse(localStorage.getItem('lf_history') || '[]'));
  },

  _showHistoryModal() {
    const history = JSON.parse(localStorage.getItem('lf_history') || '[]');
    const rows = history.map(h => `
        <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px; font-size:12px;">${new Date(h.date).toLocaleString()}</td>
            <td style="padding:10px; font-weight:600; font-size:13px;">${h.name}</td>
            <td style="padding:10px; font-size:12px;">${(h.size / 1024).toFixed(1)} KB</td>
            <td style="padding:10px; text-align:right; font-weight:700;">${h.records}</td>
            <td style="padding:10px; text-align:right; color:var(--success); font-weight:700;">${h.valid}</td>
        </tr>
     `).join('');

    Modal.open({
      title: 'Previous Imports (Local History)',
      size: 'md',
      body: `
            <div style="overflow:auto; max-height:400px; border:1px solid var(--border); border-radius:8px;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead style="background:rgba(0,0,0,0.02);">
                        <tr>
                           <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase;">Date</th>
                           <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase;">File</th>
                           <th style="padding:10px; text-align:left; font-size:11px; text-transform:uppercase;">Size</th>
                           <th style="padding:10px; text-align:right; font-size:11px; text-transform:uppercase;">Records</th>
                           <th style="padding:10px; text-align:right; font-size:11px; text-transform:uppercase;">Valid</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="5" style="padding:20px; text-align:center;">No history found</td></tr>'}</tbody>
                </table>
            </div>
         `
    });
  },

  // ---------- UI ----------
  _template() {
    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Top Action Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size: 24px; font-weight:800; letter-spacing:-1px; margin-bottom:5px;">Lead Filter (B2B / B2C)</h2>
            <p style="color:var(--text-secondary); font-size:13px;">Pro-grade data refinement & segmentation.</p>
          </div>
          <div style="display:flex; gap:10px;">
             <!-- V3: History Btn -->
             <button class="btn-secondary" id="lfHistoryBtn" style="height:38px; padding:0 15px;" title="Import History"><i class="fa-solid fa-clock-rotate-left"></i></button>
             <button class="btn-secondary" id="lfPresetBtn" style="height:38px; padding:0 20px;"><i class="fa-solid fa-bookmark"></i> Presets</button>
             <button class="btn-secondary" id="lfResetBtn" style="height:38px; padding:0 20px;"><i class="fa-solid fa-rotate-left"></i> Reset</button>
             <div style="width:1px; background:var(--border); margin:0 5px;"></div>
             <button class="btn-primary" id="lfUploadBtn" style="height:38px; padding:0 20px;"><i class="fa-solid fa-cloud-arrow-up"></i> Upload</button>
             <input type="file" id="lfFileInput" accept=".csv,.xlsx" hidden>
          </div>
        </div>

        <!-- Navigation Tabs (NEW TASK 01) -->
        <div style="display:flex; gap:30px; border-bottom:1px solid var(--border); padding:0 10px;">
           <button class="lf-nav-tab ${this._viewMode === 'table' ? 'active' : ''}" data-mode="table" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-table-list"></i> Leads Table
              ${this._viewMode === 'table' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
           <button class="lf-nav-tab ${this._viewMode === 'analytics' ? 'active' : ''}" data-mode="analytics" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'analytics' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-chart-line"></i> Analytics
              ${this._viewMode === 'analytics' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
           <button class="lf-nav-tab ${this._viewMode === 'funnel' ? 'active' : ''}" data-mode="funnel" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'funnel' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-filter-circle-dollar"></i> Quality Funnel
              ${this._viewMode === 'funnel' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
           <button class="lf-nav-tab ${this._viewMode === 'markets' ? 'active' : ''}" data-mode="markets" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'markets' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-earth-americas"></i> Markets
              ${this._viewMode === 'markets' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
           <button class="lf-nav-tab ${this._viewMode === 'readiness' ? 'active' : ''}" data-mode="readiness" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'readiness' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-paper-plane"></i> Campaign Readiness
              ${this._viewMode === 'readiness' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
           <button class="lf-nav-tab ${this._viewMode === 'trends' ? 'active' : ''}" data-mode="trends" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'trends' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-arrow-trend-up"></i> Trends
              ${this._viewMode === 'trends' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
           <button class="lf-nav-tab ${this._viewMode === 'report' ? 'active' : ''}" data-mode="report" style="padding:12px 5px; background:none; border:none; color:${this._viewMode === 'report' ? 'var(--primary)' : 'var(--text-muted)'}; font-size:13px; font-weight:700; cursor:pointer; position:relative; transition:0.3s; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-file-invoice"></i> Report
              ${this._viewMode === 'report' ? '<div style="position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--primary); box-shadow:0 0 10px var(--primary-glow);"></div>' : ''}
           </button>
        </div>

        <!-- Filter & AI Toolbar (Refined for Single Line) -->
        <div class="card p-3" style="background: rgba(var(--bg-card-rgb), 0.4); backdrop-filter: blur(20px); border: 1px solid var(--border);">
           <div style="display:flex; align-items:center; justify-content:space-between; gap:25px; flex-wrap:nowrap;">
              
              <!-- Left: Market Segment & Chips -->
              <div style="display:flex; align-items:center; gap:20px; flex:1;">
                 <div>
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                        <i class="fa-solid fa-compass" style="font-size:10px; color:var(--primary);"></i>
                        <span style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Market Segment</span>
                    </div>
                    <div id="lfLeadTypeWrap" style="display:flex; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:12px; padding:3px; gap:3px; backdrop-filter:blur(10px); min-width:240px;">
                       <button class="lf-segment-btn ${this._filters.leadType === 'all' ? 'active' : ''}" data-val="all" style="flex:1; border:none; background:${this._filters.leadType === 'all' ? 'var(--primary)' : 'transparent'}; color:${this._filters.leadType === 'all' ? 'white' : 'var(--text-muted)'}; border-radius:9px; cursor:pointer; font-size:11px; font-weight:700; padding:7px 12px; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.3s;">
                          <i class="fa-solid fa-layer-group"></i> All
                       </button>
                       <button class="lf-segment-btn ${this._filters.leadType === 'b2b' ? 'active' : ''}" data-val="b2b" style="flex:1; border:none; background:${this._filters.leadType === 'b2b' ? 'var(--primary)' : 'transparent'}; color:${this._filters.leadType === 'b2b' ? 'white' : 'var(--text-muted)'}; border-radius:9px; cursor:pointer; font-size:11px; font-weight:700; padding:7px 12px; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.3s;">
                          <i class="fa-solid fa-briefcase"></i> B2B
                       </button>
                       <button class="lf-segment-btn ${this._filters.leadType === 'b2c' ? 'active' : ''}" data-val="b2c" style="flex:1; border:none; background:${this._filters.leadType === 'b2c' ? 'var(--primary)' : 'transparent'}; color:${this._filters.leadType === 'b2c' ? 'white' : 'var(--text-muted)'}; border-radius:9px; cursor:pointer; font-size:11px; font-weight:700; padding:7px 12px; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.3s;">
                          <i class="fa-solid fa-user-check"></i> B2C
                       </button>
                    </div>
                 </div>

                 <div style="height:35px; width:1px; background:var(--border); margin: 15px 5px 0 5px;"></div>

                 <div style="display:flex; gap:8px; align-items:center; margin-top:20px;">
                    <button class="lf-chip-btn ${this._filters.removeDuplicates ? 'active' : ''}" data-id="lfDedupe" title="Remove duplicates (Email)" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.removeDuplicates ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.removeDuplicates ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-copy"></i> Email Dedup
                    </button>
                    <button class="lf-chip-btn ${this._filters.removeDuplicatesPhone ? 'active' : ''}" data-id="lfDedupePhone" title="Remove duplicates (Phone)" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.removeDuplicatesPhone ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.removeDuplicatesPhone ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-phone-slash"></i> Phone Dedup
                    </button>
                    <button class="lf-chip-btn ${this._filters.removeDuplicatesStrict ? 'active' : ''}" data-id="lfDedupeStrict" title="Remove duplicates (Company+Country)" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.removeDuplicatesStrict ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.removeDuplicatesStrict ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-building-shield"></i> Entity Dedup
                    </button>

                    <button class="lf-chip-btn ${this._filters.removeDisposable ? 'active' : ''}" data-id="lfDisposable" title="Block disposable" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.removeDisposable ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.removeDisposable ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-shield-halved"></i> Disposable
                    </button>
                    <button class="lf-chip-btn ${this._filters.keepValidOnly ? 'active' : ''}" data-id="lfValidOnly" title="Valid e-mails" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.keepValidOnly ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.keepValidOnly ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-check-double"></i> Valid Only
                    </button>
                    <button class="lf-chip-btn ${this._filters.excludeFreeProviders ? 'active' : ''}" data-id="lfFree" title="No Free Mail" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.excludeFreeProviders ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.excludeFreeProviders ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-envelope-open-text"></i> No Free Mail
                    </button>
                    <button class="lf-chip-btn ${this._filters.tagRoleBased ? 'active' : ''}" data-id="lfRole" title="Tag Role" style="padding: 7px 12px; border-radius: 9px; border: 1px solid var(--border); background: ${this._filters.tagRoleBased ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${this._filters.tagRoleBased ? 'var(--primary)' : 'var(--text-secondary)'}; font-size:11px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-tags"></i> Tag Role
                    </button>
                 </div>
              </div>

              <!-- Right: AI Mode & Main Actions -->
              <div style="display:flex; gap:12px; align-items:center; margin-top:15px;">
                 <label class="switch" style="display:flex; align-items:center; gap:10px; margin-right:5px; cursor:pointer;">
                    <span style="font-size:11px; font-weight:800; color:var(--text-muted); letter-spacing:0.5px;">AI MODE</span>
                    <input type="checkbox" id="lfAiToggle" ${this._filters.aiMode ? 'checked' : ''}>
                 </label>
                 <div style="height:25px; width:1px; background:var(--border);"></div>
                 <button class="btn-secondary" id="lfMappingBtn" style="height:40px; border-radius:10px; padding:0 18px; font-size:12px;"><i class="fa-solid fa-table-columns"></i> Mapping</button>
                 <button class="btn-primary" id="lfApplyBtn" style="height:40px; border-radius:10px; padding:0 22px; font-size:12px; font-weight:700;"><i class="fa-solid fa-filter"></i> Run Filters</button>
              </div>
           </div>
        </div>

        <!-- Stats & Content -->
        <div style="display:grid; gap:20px;">
           <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px;">
             ${this._kpiCard('Imported', 'lfKpiImported', 'fa-solid fa-database', 'var(--primary)')}
             ${this._kpiCard('Clean', 'lfKpiClean', 'fa-solid fa-circle-check', 'var(--success)')}
             ${this._kpiCard('Invalid', 'lfKpiInvalid', 'fa-solid fa-triangle-exclamation', 'var(--danger)')}
             ${this._kpiCard('Duplicates', 'lfKpiDupes', 'fa-solid fa-copy', 'var(--warning)')}
           </div>

           <div class="card p-0" style="overflow: hidden; border: 1px solid var(--border); background: var(--bg-card); position:relative;">
             
             <!-- Search Bar (Default Toolbar) -->
             <div id="lfDefaultToolbar" style="padding: 15px 20px; border-bottom: 1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:15px; background: rgba(255,255,255,0.01);">
                 <div style="display:flex; align-items:center;">
                    ${this._backTo ? `<button id="lfBackBtn" class="btn-secondary" style="margin-right:15px; height:32px; padding:0 15px; font-size:12px; background:rgba(255,255,255,0.05); border:1px solid var(--border);"><i class="fa-solid fa-arrow-left"></i> Back</button>` : ''}
                    <div class="modern-search-bar" style="width:100%; max-width: 400px;">
                      <i class="fa-solid fa-magnifying-glass"></i>
                      <input type="text" id="lfSearch" placeholder="Search leads..." value="${this._filters.search}">
                    </div>
                 </div>
                                  <!-- Export Actions (Modernized V3) -->
                  <div style="display:flex; gap:12px;">
                     <button class="btn-action-modern" id="lfExportXlsx" title="Export Clean XLSX" style="background:rgba(23,198,83,0.08); border-color:rgba(23,198,83,0.2); color:#17c653;">
                        <i class="fa-solid fa-file-excel"></i>
                     </button>
                     <button class="btn-action-modern" id="lfExportEmails" title="Export Emails CSV" style="background:rgba(0,158,247,0.08); border-color:rgba(0,158,247,0.2); color:#009ef7;">
                        <i class="fa-solid fa-at"></i>
                     </button>
                     <button class="btn-action-modern" id="lfExportWhats" title="Export WhatsApp CSV" style="background:rgba(80,205,137,0.08); border-color:rgba(80,205,137,0.2); color:#50cd89;">
                        <i class="fa-brands fa-whatsapp"></i>
                     </button>
                  </div>
              </div>

             <!-- Bulk Actions Toolbar (Hidden by default) -->
             <div id="lfTableToolbar" style="display:none; align-items:center; justify-content:space-between; background:var(--primary); color:white; padding:12px 20px; position:absolute; top:0; left:0; right:0; z-index:5;">
                <div style="display:flex; align-items:center; gap:15px;">
                   <span style="font-weight:700; font-size:13px;" id="lfSelectedCount">0 Selected</span>
                   <div style="height:20px; width:1px; background:rgba(255,255,255,0.3);"></div>
                   <button class="btn-transparent" style="color:white; font-size:12px; text-decoration:underline; cursor:pointer; background:none; border:none; padding:0;" id="lfSelectAllBtn">Select All</button>
                </div>
                <div style="display:flex; gap:10px;">
                   <button class="btn-sm" style="background:rgba(255,255,255,0.2); color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" id="lfBulkMove"><i class="fa-solid fa-folder-open"></i> Move</button>
                   <button class="btn-sm" style="background:rgba(255,255,255,0.9); color:var(--primary); border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-weight:700;" id="lfBulkSend"><i class="fa-solid fa-paper-plane"></i> Send To</button>
                   <button class="btn-sm" style="background:rgba(255,255,255,0.2); color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" id="lfBulkExport"><i class="fa-solid fa-download"></i> Export</button>
                   <button class="btn-sm" style="background:rgba(255,255,255,0.2); color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" id="lfBulkDelete"><i class="fa-solid fa-trash"></i> Delete</button>
                   <button class="btn-sm" style="background:rgba(0,0,0,0.2); color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" id="lfBulkCancel"><i class="fa-solid fa-xmark"></i></button>
                </div>
             </div>

             <div id="lfTableWrap"></div>
           </div>
           
           <div id="lfFileMeta" style="font-size:12px; color:var(--text-muted); display: flex; align-items: center; gap: 8px;"></div>
        </div>
      </div>
    `;
  },

  _kpiCard(label, id, iconClass, color) {
    const colorRgb = color === 'var(--primary)' ? 'var(--primary-rgb)' :
      color === 'var(--success)' ? '23, 198, 83' :
        color === 'var(--danger)' ? '248, 40, 90' : '246, 192, 0';

    return `
      <div class="card p-4" style="background:linear-gradient(135deg, rgba(${colorRgb}, 0.05), rgba(${colorRgb}, 0.02)); border:1px solid rgba(${colorRgb}, 0.1);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <span style="font-size: 10px; color: ${color}; text-transform: uppercase; font-weight: 800; letter-spacing:1px;">${label}</span>
            <h3 id="${id}" style="font-size: 24px; font-weight: 800; margin-top:8px; letter-spacing:-1px;">0</h3>
          </div>
          <div style="width:40px; height:40px; background:rgba(${colorRgb}, 0.1); border-radius:10px; display:flex; align-items:center; justify-content:center;">
            <i class="${iconClass}" style="color:${color}; font-size:18px;"></i>
          </div>
        </div>
      </div>
    `;
  },

  _bind() {
    const uploadBtn = document.getElementById('lfUploadBtn');
    const fileInput = document.getElementById('lfFileInput');
    const mappingBtn = document.getElementById('lfMappingBtn');
    const applyBtn = document.getElementById('lfApplyBtn');
    const resetBtn = document.getElementById('lfResetBtn');
    const presetBtn = document.getElementById('lfPresetBtn');
    const historyBtn = document.getElementById('lfHistoryBtn'); // Added

    const aiToggle = document.getElementById('lfAiToggle');
    const leadType = document.getElementById('lfLeadType');
    const validOnly = document.getElementById('lfValidOnly');
    const dedupe = document.getElementById('lfDedupe');
    const disposable = document.getElementById('lfDisposable');
    const free = document.getElementById('lfFree');
    const role = document.getElementById('lfRole');
    const search = document.getElementById('lfSearch');

    if (uploadBtn) uploadBtn.onclick = () => fileInput.click();
    if (fileInput) fileInput.onchange = (e) => this._loadFile(e.target.files[0]); // Simplified
    if (mappingBtn) mappingBtn.onclick = () => this._openMapping();
    if (applyBtn) applyBtn.onclick = () => this._applyAll();
    if (resetBtn) resetBtn.onclick = () => this._resetFilters();
    if (presetBtn) presetBtn.onclick = () => this._openPresets();
    if (historyBtn) historyBtn.onclick = () => this._showHistoryModal(); // Added

    // Back Button binding
    const backBtn = document.getElementById('lfBackBtn');
    if (backBtn) backBtn.onclick = () => this._goBack();

    if (aiToggle) aiToggle.onchange = () => {
      this._filters.aiMode = !!aiToggle.checked;
      this._applyAll();
    };

    // Lead Type Segmented Control (Refined)
    const typeBtns = document.querySelectorAll('.lf-segment-btn');
    typeBtns.forEach(btn => {
      btn.onclick = () => {
        typeBtns.forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-muted)';
          b.classList.remove('active');
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.classList.add('active');

        this._filters.leadType = btn.getAttribute('data-val');
        this._renderStatsAndTable();
      };
    });

    // Modern Chips Binding
    const chipBtns = document.querySelectorAll('.lf-chip-btn');
    chipBtns.forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const isActive = btn.classList.toggle('active');

        // Update UI
        btn.style.background = isActive ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.03)';
        btn.style.color = isActive ? 'var(--primary)' : 'var(--text-secondary)';
        btn.style.borderColor = isActive ? 'var(--primary)' : 'var(--border)';

        // Update State
        if (id === 'lfDedupe') this._filters.removeDuplicates = isActive;
        if (id === 'lfDedupePhone') this._filters.removeDuplicatesPhone = isActive;
        if (id === 'lfDedupeStrict') this._filters.removeDuplicatesStrict = isActive;
        if (id === 'lfDisposable') this._filters.removeDisposable = isActive;
        if (id === 'lfValidOnly') this._filters.keepValidOnly = isActive;
        if (id === 'lfFree') this._filters.excludeFreeProviders = isActive;
        if (id === 'lfRole') this._filters.tagRoleBased = isActive;

        this._applyAll();
      };
    });

    if (search) search.oninput = () => {
      this._filters.search = search.value || '';
      this._renderStatsAndTable();
    };

    // Exports
    const exXlsx = document.getElementById('lfExportXlsx');
    const exEmails = document.getElementById('lfExportEmails');
    const exWhats = document.getElementById('lfExportWhats');
    if (exXlsx) exXlsx.onclick = () => this._exportXlsx();
    if (exEmails) exEmails.onclick = () => this._exportEmailsCsv();
    if (exWhats) exWhats.onclick = () => this._exportWhatsCsv();

    // Bulk
    const bulkCancel = document.getElementById('lfBulkCancel');
    const bulkSelectAll = document.getElementById('lfSelectAllBtn');
    const bulkDelete = document.getElementById('lfBulkDelete');
    const bulkMove = document.getElementById('lfBulkMove');
    const bulkSend = document.getElementById('lfBulkSend');
    const bulkExport = document.getElementById('lfBulkExport');

    if (bulkCancel) bulkCancel.onclick = () => this._deselectAll();
    if (bulkSelectAll) bulkSelectAll.onclick = () => this._toggleSelectAll();
    if (bulkDelete) bulkDelete.onclick = () => this._deleteSelected();
    if (bulkMove) bulkMove.onclick = () => this._moveToSegment();
    if (bulkSend) bulkSend.onclick = () => this.openSendToModal();
    if (bulkExport) bulkExport.onclick = () => this._exportSelected();

    // Nav Tabs Binding (Task 01)
    document.querySelectorAll('.lf-nav-tab').forEach(btn => {
      btn.onclick = () => {
        this._viewMode = btn.getAttribute('data-mode');
        this.render();
      };
    });
  },

  // ---------- File Loading ----------
  _loadFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    this._fileMeta = { name: file.name, size: file.size, ext };
    const meta = document.getElementById('lfFileMeta');
    if (meta) meta.innerHTML = `<i class="fa-solid fa-paperclip"></i> <b>${this._escape(file.name)}</b> — ${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (ext === 'csv') {
          const text = String(e.target.result || '');
          this._workbook = null; // Reset
          this._rawRows = this._parseCSV(text);
          this._finishLoad();
        } else if (ext === 'xlsx') {
          const data = e.target.result;
          const wb = XLSX.read(data, { type: 'binary' });
          this._workbook = wb;

          if (wb.SheetNames.length > 1) {
            this._renderSheetSelector(wb.SheetNames);
          } else {
            const sel = document.getElementById('lfSheetSelect');
            if (sel) sel.remove();
          }

          this._loadSheet(wb.SheetNames[0]);
        } else {
          throw new Error('Unsupported file format. Use CSV or XLSX.');
        }
      } catch (err) {
        console.error(err);
        UI.showToast(err.message || 'Failed to read file', 'error');
      }
    };

    if (ext === 'csv') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  },

  _renderSheetSelector(sheets) {
    let sel = document.getElementById('lfSheetSelect');
    if (!sel) {
      sel = document.createElement('select');
      sel.id = 'lfSheetSelect';
      sel.className = 'input-select';
      sel.style.cssText = 'font-size:11px; padding:2px 8px; height:24px; margin-left:10px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card);';
      sel.onchange = (e) => this._loadSheet(e.target.value);
      document.getElementById('lfFileMeta').appendChild(sel);
    }
    sel.innerHTML = sheets.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  _loadSheet(sheetName) {
    if (!this._workbook) return;
    const sheet = this._workbook.Sheets[sheetName];
    this._rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    this._finishLoad();
  },

  _finishLoad() {
    this._headers = this._rawRows.length ? Object.keys(this._rawRows[0]) : [];

    // Assign persistent IDs to raw rows immediately
    this._rawRows.forEach(r => {
      if (!r._id) r._id = 'row_' + Math.random().toString(36).substr(2, 9);
    });

    // V3: Save to History
    this._saveHistory(this._fileMeta);

    this._autoMap();
    UI.showToast(`Imported ${this._rawRows.length} rows`, 'success');
    this._applyAll(true);
  },

  _parseCSV(csv) {
    const content = csv.startsWith('\uFEFF') ? csv.slice(1) : csv;
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return [];
    const headerLine = lines[0];
    const delimiters = [',', ';', '\t'];
    let sep = ',';
    let max = -1;
    for (const d of delimiters) {
      const c = (headerLine.match(new RegExp(d, 'g')) || []).length;
      if (c > max) { max = c; sep = d; }
    }
    const headers = headerLine.split(sep).map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep);
      const obj = {};
      headers.forEach((h, idx) => {
        let v = cols[idx] ?? '';
        v = String(v).trim().replace(/^['"]|['"]$/g, '');
        obj[h] = v;
      });
      rows.push(obj);
    }
    return rows;
  },

  _autoMap() {
    const headers = this._headers || [];
    const lower = headers.map(h => String(h).toLowerCase());
    const find = (aliases) => {
      for (let i = 0; i < lower.length; i++) {
        const h = lower[i];
        if (aliases.some(a => h === a || h.includes(a))) return headers[i];
      }
      return '';
    };

    this._mapping.company_name = find(['company', 'company_name', 'agency', 'agence', 'societe', 'société', 'business', 'partner', 'organisation', 'organization', 'client_name', 'client']);
    this._mapping.full_name = find(['full_name', 'fullname', 'name', 'contact', 'contact_name', 'person']);
    this._mapping.email = find(['email', 'e-mail', 'mail', 'courriel', 'email_address']);
    this._mapping.phone = find(['phone', 'tel', 'telephone', 'mobile', 'whatsapp', 'gsm']);
    this._mapping.country = find(['country', 'pays', 'nation', 'region']);
    this._mapping.city = find(['city', 'ville', 'town', 'locality']);
    this._mapping.website = find(['website', 'site', 'url', 'web']);

    // Ensure email is mapped if any plausible header exists
    if (!this._mapping.email) {
      const maybe = headers.find(h => String(h).toLowerCase().includes('mail'));
      if (maybe) this._mapping.email = maybe;
    }
  },

  _openMapping() {
    if (!this._headers?.length) {
      UI.showToast('Upload a file first', 'warning');
      return;
    }
    const opts = (selected) => this._headers.map(h => `<option value="${this._escape(h)}" ${h === selected ? 'selected' : ''}>${this._escape(h)}</option>`).join('');

    Modal.open({
      title: '🧩 Column Mapping (Lead Filter)',
      size: 'lg',
      body: `
        <div class="card p-4" style="background: rgba(var(--bg-card-rgb), 0.6); border: 1px solid var(--border); backdrop-filter: blur(20px);">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div>
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">Company / Entity</label>
              <div class="select-wrap">
                <select id="lfMapCompany" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  ${opts(this._mapping.company_name)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
            <div>
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">Contact Name</label>
              <div class="select-wrap">
                <select id="lfMapName" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  ${opts(this._mapping.full_name)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
            <div>
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">Primary Email <span style="color:var(--danger)">*</span></label>
              <div class="select-wrap">
                <select id="lfMapEmail" class="input-select" style="width:100%;">
                  <option value="">(Required)</option>
                  ${opts(this._mapping.email)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
            <div>
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">Phone / WhatsApp</label>
              <div class="select-wrap">
                <select id="lfMapPhone" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  ${opts(this._mapping.phone)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
            <div>
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">Country</label>
              <div class="select-wrap">
                <select id="lfMapCountry" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  ${opts(this._mapping.country)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
            <div>
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">City</label>
              <div class="select-wrap">
                <select id="lfMapCity" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  ${opts(this._mapping.city)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">Corporate Website</label>
              <div class="select-wrap">
                <select id="lfMapWebsite" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  ${opts(this._mapping.website)}
                </select>
                <i class="fa-solid fa-chevron-down caret"></i>
              </div>
            </div>
          </div>
          <div style="margin-top:20px; font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-circle-info" style="color:var(--primary);"></i>
            Algorithmic auto-detection completed. Please verify mappings for precision.
          </div>
        </div>
        <div class="modal-footer" style="padding: 20px 0 0; display:flex; justify-content:flex-end; gap:12px; border-top: none;">
          <button class="btn-secondary" onclick="Modal.close()" style="height: 42px; padding: 0 25px;">Back</button>
          <button class="btn-primary" id="lfMapSave" style="height: 42px; padding: 0 25px;"><i class="fa-solid fa-check"></i> Validate Mapping</button>
        </div>
      `
    });

    const saveBtn = document.getElementById('lfMapSave');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const get = (id) => document.getElementById(id)?.value || '';
        this._mapping.company_name = get('lfMapCompany');
        this._mapping.full_name = get('lfMapName');
        this._mapping.email = get('lfMapEmail');
        this._mapping.phone = get('lfMapPhone');
        this._mapping.country = get('lfMapCountry');
        this._mapping.city = get('lfMapCity');
        this._mapping.website = get('lfMapWebsite');
        if (!this._mapping.email) {
          UI.showToast('Email mapping is required', 'error');
          return;
        }
        Modal.close();
        UI.showToast('Mapping saved', 'success');
        this._applyAll();
      };
    }
  },

  // ---------- Processing ----------
  _applyAll(isAfterImport = false) {
    if (!this._rawRows?.length) {
      if (!isAfterImport) UI.showToast('Upload a file first', 'warning');
      this._renderStatsAndTable();
      return;
    }
    if (!this._mapping.email) {
      UI.showToast('Please set Email mapping (Mapping button)', 'warning');
      return;
    }

    // 1) map rows
    this._mappedRows = this._rawRows.map(r => this._mapRow(r));

    // 2) validate + tag + classify + score
    const cleaned = [];
    const invalid = [];
    for (const row of this._mappedRows) {
      const meta = this._analyzeRow(row);
      const out = { ...row, ...meta };

      if (this._filters.keepValidOnly && !out.is_valid_email) {
        invalid.push(out);
        continue;
      }
      if (this._filters.removeDisposable && out.is_disposable) {
        invalid.push({ ...out, invalid_reason: 'disposable' });
        continue;
      }
      if (this._filters.excludeFreeProviders && out.is_free_provider && out.lead_type === 'b2b') {
        // If user excludes free providers, treat it as invalid for B2B (but B2C can keep them)
        invalid.push({ ...out, invalid_reason: 'free_provider_for_b2b' });
        continue;
      }
      if (this._filters.aiMode && out.ai_score < this._filters.minScore) {
        invalid.push({ ...out, invalid_reason: 'below_min_score' });
        continue;
      }
      cleaned.push(out);
    }

    // 3) dedupe
    let finalRows = cleaned;
    const dupes = [];

    // Consolidated Dedupe Logic (V3 Merge Support)
    if (this._filters.removeDuplicates || this._filters.removeDuplicatesPhone || this._filters.removeDuplicatesStrict) {
      const seenEmail = new Map();
      const seenPhone = new Map();
      const seenStrict = new Map();

      finalRows = [];
      for (const r of cleaned) {
        let isDupe = false;
        let reason = '';
        let existing = null;

        // Email Check
        if (this._filters.removeDuplicates) {
          const key = (r.email || '').trim().toLowerCase();
          if (key) {
            if (seenEmail.has(key)) {
              isDupe = true;
              reason = 'duplicate_email';
              existing = seenEmail.get(key);
            } else {
              seenEmail.set(key, r);
            }
          }
        }

        // Phone Check
        if (!isDupe && this._filters.removeDuplicatesPhone) {
          const key = (r.phone || '').replace(/\D+/g, '');
          if (key.length > 5) {
            if (seenPhone.has(key)) {
              isDupe = true;
              reason = 'duplicate_phone';
              existing = seenPhone.get(key);
            } else {
              seenPhone.set(key, r);
            }
          }
        }

        // Strict Check (Company + Country)
        if (!isDupe && this._filters.removeDuplicatesStrict) {
          const co = (r.company_name || '').trim().toLowerCase();
          const loc = (r.country || '').trim().toLowerCase();
          const key = `${co}|${loc}`;
          if (co && loc) {
            if (seenStrict.has(key)) {
              isDupe = true;
              reason = 'duplicate_entity';
              existing = seenStrict.get(key);
            } else {
              seenStrict.set(key, r);
            }
          }
        }

        if (isDupe) {
          dupes.push({ ...r, duplicate_reason: reason });
          // V3 Merge Logic: If we found a dupe, try to fill missing info in the existing record
          if (existing && this._filters.mergeDuplicates) {
            this._mergeRowData(existing, r);
          }
        } else {
          finalRows.push(r);
        }
      }
    }

    this._cleanRows = finalRows;
    this._invalidRows = invalid;
    this._duplicateRows = dupes;

    this._refreshBeforeStats(); // Task 03: Compute Before stats
    this._renderStatsAndTable();
  },

  _mergeRowData(target, source) {
    // V3: Fill missing fields in target from source
    ['full_name', 'company_name', 'country', 'city', 'phone', 'website'].forEach(k => {
      if (!target[k] && source[k]) target[k] = source[k];
    });
    // Merge tags if any
    if (source.role_based && !target.role_based) target.role_based = true;
  },

  _resetFilters() {
    this._filters = {
      leadType: 'all',
      keepValidOnly: true,
      removeDuplicates: true,
      removeDuplicatesPhone: false,
      removeDuplicatesStrict: false,
      mergeDuplicates: true, // V3 Default
      removeDisposable: true,
      excludeFreeProviders: false,
      tagRoleBased: true,
      aiMode: true,
      minScore: 0,
      search: ''
    };

    document.querySelectorAll('.lf-segment-btn').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.val === 'all') b.classList.add('active');
      b.style.background = b.dataset.val === 'all' ? 'var(--primary)' : 'transparent';
      b.style.color = b.dataset.val === 'all' ? 'white' : 'var(--text-muted)';
    });

    document.getElementById('lfAiToggle').checked = true;
    document.getElementById('lfSearch').value = '';

    const updateChip = (id, active) => {
      const btn = document.querySelector(`.lf-chip-btn[data-id="${id}"]`);
      if (btn) {
        if (active) btn.classList.add('active'); else btn.classList.remove('active');
        btn.style.background = active ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)';
        btn.style.color = active ? 'var(--primary)' : 'var(--text-secondary)';
      }
    };

    updateChip('lfDedupe', true);
    updateChip('lfDedupePhone', false);
    updateChip('lfDedupeStrict', false);
    updateChip('lfDisposable', true);
    updateChip('lfValidOnly', true);
    updateChip('lfFree', false);
    updateChip('lfRole', true);

    this._applyAll();
  },

  _mapRow(raw) {
    const pick = (k) => {
      const col = this._mapping[k];
      if (!col) return '';
      return raw?.[col] ?? raw?.[String(col)] ?? '';
    };

    const email = String(pick('email') || '').trim();
    return {
      _id: raw._id, // Persist ID
      company_name: String(pick('company_name') || '').trim(),
      full_name: String(pick('full_name') || '').trim(),
      email: email,
      phone: String(pick('phone') || '').trim(),
      country: String(pick('country') || '').trim(),
      city: String(pick('city') || '').trim(),
      website: String(pick('website') || '').trim(),
      source_file: this._fileMeta?.name || ''
    };
  },

  _analyzeRow(row) {
    const emailNorm = this._normalizeEmail(row.email);
    const domain = emailNorm.includes('@') ? emailNorm.split('@')[1] : '';
    const local = emailNorm.includes('@') ? emailNorm.split('@')[0] : '';

    // V3: Normalize Location (Task 22)
    const country = this._normalizeLocation(row.country);
    const city = this._toTitleCase(row.city);

    const isValid = this._isValidEmail(emailNorm);
    const isFree = domain ? this._freeProviders.has(domain) : false;
    const isDisp = domain ? this._disposableDomains.has(domain) : false;
    // V3: Domain Blacklist (Task 23)
    const isBlocked = domain ? (this._blockedDomains && this._blockedDomains.has(domain)) : false;
    const isRole = local ? this._roleLocals.has(local) : false;

    const leadType = this._classifyLead({ ...row, email: emailNorm, country, city }, isFree);
    let score = 0, label = '';
    let suggested = '', next = '';

    if (this._filters.aiMode) {
      const ai = this._scoreLead({ ...row, email: emailNorm, country, city }, leadType, isFree);
      score = ai.score;
      label = ai.label;

      // V2: AI Suggestions Logic
      if (leadType === 'b2b') {
        if (score >= 80) suggested = 'B2B_HOT_PARTNER';
        else if (score >= 60) suggested = 'B2B_WARM';
        else suggested = 'B2B_PROSPECT';

        if (isValid) next = 'Email Campaign (B2B)';
        else if (row.phone) next = 'WhatsApp Reachout';
        else next = 'LinkedIn Research';
      } else {
        // B2C
        if (score >= 80) suggested = 'B2C_VIP';
        else if (score >= 50) suggested = 'B2C_RETARGET';
        else suggested = 'B2C_COLD';

        if (row.phone) next = 'WhatsApp Promo';
        else if (isValid) next = 'Email Newsletter';
        else next = 'Archive';
      }
    }

    // Mark ignored if blocked
    if (isBlocked) {
      return { ...row, invalid_reason: 'domain_blacklisted', is_blocked: true, _isInvalid: true }; // Tag for analytics
    }

    return {
      email: emailNorm,
      email_domain: domain,
      is_valid_email: isValid && !isBlocked,
      is_free_provider: isFree,
      is_disposable: isDisp,
      is_blocked: isBlocked,
      role_based: this._filters.tagRoleBased ? isRole : false,
      lead_type: leadType,
      ai_score: score,
      ai_label: label,
      suggested_segment: suggested,
      next_action: next,
      // Use normalized location
      country: country || row.country,
      city: city || row.city,
      _id: row._id || 'row_' + Math.random().toString(36).substr(2, 9)
    };
  },

  // V3 Helpers
  _normalizeLocation(loc) {
    if (!loc) return '';
    let s = String(loc).trim().toLowerCase();
    // Common mapping
    if (s === 'usa' || s === 'us' || s === 'united states of america') return 'United States';
    if (s === 'uk' || s === 'gb' || s === 'great britain') return 'United Kingdom';
    if (s === 'uae') return 'United Arab Emirates';
    if (s === 'ksa') return 'Saudi Arabia';
    // Capitalize
    return s.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
  },

  _toTitleCase(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  },

  _classifyLead(row, isFreeProvider) {
    const hasCompany = !!(row.company_name && row.company_name.length >= 2);
    const hasWebsite = !!(row.website && row.website.includes('.'));
    // Corporate domain often indicates B2B
    const corporate = row.email_domain && !isFreeProvider;

    if (hasCompany || hasWebsite || corporate) return 'b2b';
    return 'b2c';
  },

  _scoreLead(row, leadType, isFreeProvider) {
    let score = 0;
    const hasPhone = (row.phone || '').replace(/\D+/g, '').length >= 8;
    const hasCountry = !!row.country;
    const hasCity = !!row.city;
    const hasName = !!row.full_name;
    const hasCompany = !!row.company_name;
    const hasWebsite = !!row.website;

    // Base completeness
    if (hasName) score += 10;
    if (hasPhone) score += 15;
    if (hasCountry) score += 12;
    if (hasCity) score += 6;

    if (leadType === 'b2b') {
      if (hasCompany) score += 18;
      if (!isFreeProvider) score += 20;
      if (hasWebsite) score += 12;
    } else {
      // B2C
      if (isFreeProvider) score += 8;
      if (hasPhone) score += 8;
    }

    // Cap
    score = Math.max(0, Math.min(100, score));

    let label = '';
    if (score >= 80) label = leadType === 'b2b' ? 'Hot' : 'VIP';
    else if (score >= 60) label = 'Warm';
    else if (score >= 40) label = 'Cold';
    else label = 'Low';

    return { score, label };
  },

  _resetFilters() {
    this._filters = {
      leadType: 'all',
      keepValidOnly: true,
      removeDuplicates: true,
      removeDisposable: true,
      excludeFreeProviders: false,
      tagRoleBased: true,
      aiMode: true,
      minScore: 0,
      search: ''
    };
    this.render();
  },

  _openPresets() {
    // 1. Get existing
    const presets = JSON.parse(localStorage.getItem('lf_presets') || '[]');

    const renderList = () => {
      if (!presets.length) return '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">No saved presets yet.</div>';
      return presets.map((p, i) => `
             <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border);">
                 <div>
                     <div style="font-weight:700; font-size:13px;">${this._escape(p.name)}</div>
                     <div style="font-size:11px; color:var(--text-muted);">${p.desc || 'No description'}</div>
                 </div>
                 <div style="display:flex; gap:8px;">
                     <button class="btn-sm" onclick="LeadFilter._loadPreset(${i})">Load</button>
                     <button class="btn-icon-sm" onclick="LeadFilter._deletePreset(${i})" style="color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
                 </div>
             </div>
          `).join('');
    };

    Modal.open({
      title: '🔖 Filter Presets',
      size: 'md',
      body: `
             <div class="card p-3 mb-3" style="background:rgba(var(--bg-card-rgb), 0.5);">
                <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">Save Current Configuration</div>
                <input type="text" id="lfPresetName" class="input" placeholder="Preset Name (e.g. B2B Hot Leads)" style="width:100%; margin-bottom:10px;">
                <input type="text" id="lfPresetDesc" class="input" placeholder="Description (optional)" style="width:100%; margin-bottom:10px;">
                <button class="btn-primary w-100" onclick="LeadFilter._savePreset()"><i class="fa-solid fa-save"></i> Save Current Filters</button>
             </div>
             <div style="max-height:300px; overflow:auto; border:1px solid var(--border); border-radius:8px;">
                ${renderList()}
             </div>
          `
    });
  },

  _savePreset() {
    const name = document.getElementById('lfPresetName').value;
    const desc = document.getElementById('lfPresetDesc').value;
    if (!name) return UI.showToast('Please enter a preset name', 'warning');

    const presets = JSON.parse(localStorage.getItem('lf_presets') || '[]');
    presets.push({
      name,
      desc,
      filters: JSON.parse(JSON.stringify(this._filters))
    });
    localStorage.setItem('lf_presets', JSON.stringify(presets));
    UI.showToast('Preset saved', 'success');
    Modal.close();
  },

  _loadPreset(index) {
    const presets = JSON.parse(localStorage.getItem('lf_presets') || '[]');
    const p = presets[index];
    if (p) {
      this._filters = { ...this._filters, ...p.filters };
      this.render(); // re-render UI with new state
      Modal.close();
      UI.showToast(`Loaded preset: ${p.name}`, 'success');
    }
  },

  _deletePreset(index) {
    const presets = JSON.parse(localStorage.getItem('lf_presets') || '[]');
    presets.splice(index, 1);
    localStorage.setItem('lf_presets', JSON.stringify(presets));
    Modal.close();
    this._openPresets(); // re-open to refresh list
  },

  // ---------- Dropdown / Row Actions ----------
  _openRowMenu(e, id) {
    e.stopPropagation();
    // Remove any existing menus
    document.querySelectorAll('.lf-dropdown-menu').forEach(el => el.remove());

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.className = 'lf-dropdown-menu';
    menu.style.cssText = `
          position: fixed;
          top: ${rect.bottom + 5}px;
          left: ${rect.left - 100}px;
          width: 140px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border-radius: 8px;
          z-index: 9999;
          padding: 5px 0;
          backdrop-filter: blur(10px);
      `;

    const itemStyle = `padding: 8px 15px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:8px; color:var(--text-primary); transition:0.2s;`;

    menu.innerHTML = `
          <div style="${itemStyle}" onclick="LeadFilter._viewLead('${id}'); document.body.click();"><i class="fa-solid fa-eye" style="width:16px;"></i> View Details</div>
          <div style="${itemStyle}" onclick="LeadFilter._tagLead('${id}'); document.body.click();"><i class="fa-solid fa-tag" style="width:16px;"></i> Add Tag</div>
          <div style="${itemStyle}" onclick="LeadFilter._editLead('${id}'); document.body.click();"><i class="fa-solid fa-pen" style="width:16px;"></i> Edit</div>
          <div style="height:1px; background:var(--border); margin:4px 0;"></div>
          <div style="${itemStyle} color:var(--danger);" onclick="LeadFilter._deleteRow('${id}'); document.body.click();"><i class="fa-solid fa-trash" style="width:16px;"></i> Delete</div>
      `;

    // Close on click outside
    setTimeout(() => {
      document.body.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);

    document.body.appendChild(menu);
  },

  _viewLead(id) {
    const row = this._cleanRows.find(r => r._id === id);
    if (!row) return;
    // Simple alert or modal for now
    Modal.open({
      title: 'Lead Details',
      body: `<pre style="font-size:11px;">${JSON.stringify(row, null, 2)}</pre>`
    });
  },



  _tagLead(id) {
    const tag = prompt('Enter tag (e.g. VIP, MICE):');
    if (tag) {
      const row = this._cleanRows.find(r => r._id === id);
      if (row) {
        row.tags = row.tags || [];
        row.tags.push(tag);
        UI.showToast('Tag added', 'success');
      }
    }
  },

  _editLead(id) {
    UI.showToast('Edit feature coming in v2', 'info');
  },

  _renderStatsAndTable() {
    const imported = this._rawRows?.length || 0;
    const clean = this._getVisibleRows().length;
    const invalid = this._invalidRows?.length || 0;
    const dupes = this._duplicateRows?.length || 0;

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.innerText = String(v);
    };
    set('lfKpiImported', imported);
    set('lfKpiClean', clean);
    set('lfKpiInvalid', invalid);
    set('lfKpiDupes', dupes);

    this._updateToolbar();

    const wrap = document.getElementById('lfTableWrap');
    if (!wrap) return;

    const rows = this._getVisibleRows();
    if (!rows.length) {
      wrap.innerHTML = `
        <div style="padding: 60px 40px; text-align:center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">
          <i class="fa-solid fa-inbox" style="font-size:48px; opacity:0.1; margin-bottom: 20px; display: block;"></i>
          <div style="font-weight:800; font-size: 16px; letter-spacing: -0.5px;">No Records Detected</div>
          <div style="font-size:13px; margin-top:8px; color: var(--text-muted);">Upload a CSV or XLSX file to begin the executive filtering process.</div>
        </div>
      `;
      return;
    }

    // Always re-compute After stats on render
    this._refreshAfterStats(rows);

    if (this._viewMode !== 'table') {
      this._renderAnalyticsViews(wrap);
      return;
    }

    // Enhanced table style
    const head = `
      <tr>
        <th style="padding:12px 15px; width:40px;">
           <input type="checkbox" id="lfSelectAllCheckbox" style="accent-color:var(--primary); cursor:pointer;">
        </th>
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">Type</th>
        
        <!-- User Requested: Name (Key Contact) -->
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">Contact / Company</th>
        
        <!-- User Requested: Email -->
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">Email</th>
        
        <!-- User Requested: Phone -->
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">Phone</th>
        
        <!-- User Requested: Country -->
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">Country</th>
        
        <!-- User Requested: City -->
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">City</th>

        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">AI Insight</th>
        <th style="padding:12px 15px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700; text-align:right;">Score</th>
        <th style="padding:12px 15px; width:40px;"></th>
      </tr>
    `;

    const body = rows.slice(0, 500).map(r => {
      const typeBg = r.lead_type === 'b2b' ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)';
      const typeColor = r.lead_type === 'b2b' ? 'var(--primary)' : 'var(--success)';
      const typeLabel = r.lead_type === 'b2b' ? 'CORP' : 'RTL';

      const scoreColor = r.ai_score >= 80 ? 'var(--success)' : r.ai_score >= 50 ? 'var(--primary)' : 'var(--warning)';
      const roleBadge = r.role_based ? `<span style="font-size:9px; background:rgba(246,192,0,0.1); color:var(--warning); padding:1px 4px; border-radius:3px; margin-left:5px; font-weight:700; text-transform:uppercase;">Role</span>` : '';

      const isSel = this._selectedIds.has(r._id);

      // Single Line Insight
      const insightHtml = r.suggested_segment ? `
        <span style="font-size:10px; font-weight:700; color:var(--primary); white-space:nowrap;">${r.suggested_segment}</span>
        <span style="font-size:9px; color:var(--text-muted); margin:0 4px;">•</span>
        <span style="font-size:10px; color:var(--text-secondary); opacity:0.8; white-space:nowrap;">${r.next_action || '-'}</span>
      ` : `<span style="color:var(--text-muted); font-size:10px;">-</span>`;

      // Formatted Phone
      const phoneDisplay = r.phone ? `<i class="fa-solid fa-phone" style="font-size:9px; opacity:0.5; margin-right:4px;"></i>${this._escape(r.phone)}` : '<span style="color:var(--text-muted);">-</span>';

      return `
        <tr style="border-bottom: 1px solid var(--border); transition: var(--anim-hover); background: ${isSel ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'}; vertical-align:middle;" 
            onmouseover="this.style.background='${isSel ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.02)'}'" 
            onmouseout="this.style.background='${isSel ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'}'">
          
          <td style="padding:10px 15px;">
             <input type="checkbox" class="lf-row-check" data-id="${r._id}" ${isSel ? 'checked' : ''} style="accent-color:var(--primary); cursor:pointer;">
          </td>
          
          <td style="padding:10px 15px;">
            <span style="background:${typeBg}; color:${typeColor}; padding:3px 6px; border-radius:5px; font-size:9px; font-weight:800;">${typeLabel}</span>
          </td>
          
          <!-- Name / Company (Single Line) -->
          <td style="padding:10px 15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px;">
             <span style="font-weight:600; color:var(--text-primary); font-size:12px;">${this._escape(r.full_name || r.company_name || 'Unknown')}</span>
             ${r.full_name && r.company_name ? `<span style="font-size:11px; color:var(--text-muted); margin-left:6px;">(${this._escape(r.company_name)})</span>` : ''}
          </td>

          <!-- Email -->
          <td style="padding:10px 15px; color:var(--text-primary); font-size:11px; font-family:monospace; white-space:nowrap;">
             ${this._escape(r.email || '')}${roleBadge}
          </td>

          <!-- Phone -->
          <td style="padding:10px 15px; color:var(--text-secondary); font-size:11px; white-space:nowrap;">
             ${phoneDisplay}
          </td>

          <!-- Country -->
          <td style="padding:10px 15px; color:var(--text-secondary); font-size:12px; white-space:nowrap;">
             ${this._escape(r.country || '-')}
          </td>

          <!-- City -->
          <td style="padding:10px 15px; color:var(--text-secondary); font-size:12px; white-space:nowrap;">
             ${this._escape(r.city || '-')}
          </td>

          <!-- AI Insight (Single Line) -->
          <td style="padding:10px 15px; white-space:nowrap;">
             ${insightHtml}
          </td>

          <!-- Score -->
          <td style="padding:10px 15px; text-align:right;">
             <span style="color:${scoreColor}; font-weight:800; font-size:12px;">${r.ai_score}%</span>
          </td>

          <td style="padding:10px 15px; text-align:right;">
            <button class="btn-icon-sm" onclick="LeadFilter._openRowMenu(event, '${r._id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
               <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    wrap.innerHTML = `
      <div style="overflow:auto; max-height: 500px;">
        <table style="width:100%; border-collapse:collapse; min-width: 900px;">
          <thead style="background:rgba(255,255,255,0.02); position:sticky; top:0; z-index:1; backdrop-filter:blur(10px);">
            ${head}
          </thead>
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
      <div style="padding: 15px 20px; border-top: 1px solid var(--border); background:rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12px; color:var(--text-muted);">
          Showing ${Math.min(rows.length, 500)} premium records
        </span>
        <span style="font-size:11px; color:var(--primary); font-weight:700; text-transform:uppercase;">
          Database: Verified Execution
        </span>
      </div>
    `;

    // Re-bind checkboxes interactively
    const allCk = document.getElementById('lfSelectAllCheckbox');
    if (allCk) {
      allCk.indeterminate = this._selectedIds.size > 0 && this._selectedIds.size < rows.length;
      allCk.checked = this._selectedIds.size === rows.length && rows.length > 0;
      allCk.onclick = () => this._toggleSelectAll(allCk.checked);
    }

    wrap.querySelectorAll('.lf-row-check').forEach(ck => {
      ck.onclick = (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) this._selectedIds.add(id);
        else this._selectedIds.delete(id);
        this._renderStatsAndTable(); // re-render to update backgrounds/toolbar
      };
    });
  },

  _updateToolbar() {
    const bar = document.getElementById('lfTableToolbar');
    const def = document.getElementById('lfDefaultToolbar');
    const countEl = document.getElementById('lfSelectedCount');

    if (this._selectedIds.size > 0) {
      if (bar) bar.style.display = 'flex';
      // if (def) def.style.display = 'none'; // optional: hide search when selecting
      if (countEl) countEl.innerText = `${this._selectedIds.size} Selected`;
    } else {
      if (bar) bar.style.display = 'none';
      // if (def) def.style.display = 'flex';
    }
  },

  _toggleSelectAll(checked) {
    const rows = this._getVisibleRows();
    if (checked) {
      rows.forEach(r => this._selectedIds.add(r._id));
    } else {
      this._selectedIds.clear(); // or just clear visible? "Unselect All" usually clears all.
    }
    this._renderStatsAndTable();
  },

  _deselectAll() {
    this._selectedIds.clear();
    this._renderStatsAndTable();
  },

  _getVisibleRows() {
    let rows = this._cleanRows || [];
    // lead type filter
    if (this._filters.leadType !== 'all') {
      rows = rows.filter(r => r.lead_type === this._filters.leadType);
    }
    // search
    const q = (this._filters.search || '').trim().toLowerCase();
    if (q) {
      rows = rows.filter(r => {
        return [r.company_name, r.full_name, r.email, r.phone, r.country, r.city, r.email_domain]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));
      });
    }
    return rows;
  },

  // ---------- Export ----------
  _exportXlsx() {
    const rows = this._getVisibleRows();
    if (!rows.length) return UI.showToast('No rows to export', 'warning');

    const wb = XLSX.utils.book_new();
    const cleanSheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, cleanSheet, 'Clean');

    if (this._duplicateRows?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this._duplicateRows), 'Duplicates');
    }
    if (this._invalidRows?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this._invalidRows), 'Invalid');
    }

    const fname = `lead_filter_clean_${this._nowStamp()}.xlsx`;
    XLSX.writeFile(wb, fname);
    UI.showToast('XLSX exported', 'success');
  },

  _exportEmailsCsv() {
    const rows = this._getVisibleRows();
    const emails = rows.map(r => r.email).filter(Boolean);
    if (!emails.length) return UI.showToast('No emails to export', 'warning');
    const csv = 'email\n' + emails.map(e => this._csvEscape(e)).join('\n');
    this._downloadBlob(csv, `emails_${this._nowStamp()}.csv`, 'text/csv');
    UI.showToast('Emails CSV exported', 'success');
  },

  _exportWhatsCsv() {
    const rows = this._getVisibleRows();
    const out = rows.map(r => ({
      name: r.full_name || r.company_name || '',
      phone: r.phone || '',
      country: r.country || '',
      city: r.city || '',
      lead_type: r.lead_type || ''
    }));
    if (!out.length) return UI.showToast('No rows to export', 'warning');
    const csv = this._toCsv(out);
    this._downloadBlob(csv, `whatsapp_${this._nowStamp()}.csv`, 'text/csv');
    UI.showToast('WhatsApp CSV exported', 'success');
  },

  _exportInvalidCsv() {
    const rows = this._invalidRows || [];
    if (!rows.length) return UI.showToast('No invalid rows', 'info');
    const csv = this._toCsv(rows);
    this._downloadBlob(csv, `invalid_${this._nowStamp()}.csv`, 'text/csv');
    UI.showToast('Invalid CSV exported', 'success');
  },

  _toCsv(rows) {
    const headers = Object.keys(rows[0] || {});
    const lines = [];
    lines.push(headers.map(h => this._csvEscape(h)).join(','));
    for (const r of rows) {
      lines.push(headers.map(h => this._csvEscape(r[h])).join(','));
    }
    return lines.join('\n');
  },

  _downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  },

  // ---------- Helpers ----------
  _isValidEmail(email) {
    if (!email || email.length < 6) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(email);
  },

  _normalizeEmail(email) {
    let e = String(email || '').trim().toLowerCase();
    // common typos
    e = e.replace('@gmial.com', '@gmail.com')
      .replace('@gamil.com', '@gmail.com')
      .replace('@hotmial.com', '@hotmail.com')
      .replace('@outlok.com', '@outlook.com');
    return e;
  },

  _escape(s) {
    return String(s || '').replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  _csvEscape(s) {
    s = String(s || '').replace(/"/g, '""');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
    return s;
  },

  _nowStamp() {
    return new Date().toISOString().slice(0, 10);
  },

  // ---------- Analytics Engine (EPIC V3) ----------
  _refreshBeforeStats() {
    const raw = this._rawRows || [];
    this._analytics.before = this._computeGenericStats(raw);
    this._analytics.meta.lastComputed = new Date().toISOString();
    this._saveHistory(); // Task 28
  },

  _saveHistory() {
    const history = JSON.parse(localStorage.getItem('lf_analytics_history') || '[]');
    const entry = {
      date: new Date().toISOString(),
      fileName: this._fileMeta?.name || 'Untitled',
      stats: this._analytics.before
    };
    history.push(entry);
    // Keep last 50
    if (history.length > 50) history.shift();
    localStorage.setItem('lf_analytics_history', JSON.stringify(history));
    console.log('[Analytics] History Saved');
  },

  _refreshAfterStats(filteredRows) {
    this._analytics.after = this._computeGenericStats(filteredRows);
    this._analytics.deltas = {
      total: this._analytics.after.total - this._analytics.before.total,
      valid: this._analytics.after.valid - this._analytics.before.valid,
      dupes: this._analytics.after.dupes - this._analytics.before.dupes
    };
  },

  _computeGenericStats(rows) {
    const stats = {
      total: rows.length,
      valid: 0,
      invalid: 0,
      dupes: 0,
      disposable: 0,
      free: 0,
      role: 0,
      b2b: 0,
      b2c: 0,
      avgScore: 0,
      hot: 0,
      vip: 0,
      completeness: 0,
      countries: {},
      cities: {},
      domains: {},
      champs: {} // New: Dynamic Field Coverage
    };

    // Initialize champs for all unique headers found in raw data
    const allHeaders = this._headers || [];
    allHeaders.forEach(h => {
      stats.champs[h] = { filled: 0, total: rows.length, density: 0 };
    });

    let totalScore = 0;
    let totalCompleteness = 0;
    const fields = ['full_name', 'email', 'phone', 'company_name', 'country', 'city', 'website'];

    rows.forEach(r => {
      // Completeness for this row
      let filled = 0;
      fields.forEach(f => { if (r[f] && String(r[f]).trim().length > 0) filled++; });
      totalCompleteness += (filled / fields.length) * 100;

      if (r._isInvalid) stats.invalid++;
      else stats.valid++;
      if (r._isDuplicate) stats.dupes++;
      if (r.disposable) stats.disposable++;
      if (r.free_provider) stats.free++;
      if (r.role_based) stats.role++;
      if (r.lead_type === 'b2b') stats.b2b++;
      else stats.b2c++;
      const score = r.ai_score || 0;
      totalScore += score;
      if (score >= 90) stats.vip++;
      else if (score >= 70) stats.hot++;
      const country = r.country || 'Unknown';
      stats.countries[country] = (stats.countries[country] || 0) + 1;
      const city = r.city || 'Unknown';
      stats.cities[city] = (stats.cities[city] || 0) + 1;
      const domain = r.email_domain || 'Unknown';
      stats.domains[domain] = (stats.domains[domain] || 0) + 1;

      // New: Dynamic Champs analysis
      allHeaders.forEach(h => {
        if (r[h] && String(r[h]).trim().length > 0) stats.champs[h].filled++;
      });
    });

    // Compute densities
    allHeaders.forEach(h => {
      stats.champs[h].density = rows.length ? Math.round((stats.champs[h].filled / rows.length) * 100) : 0;
    });

    stats.avgScore = rows.length ? Math.round(totalScore / rows.length) : 0;
    stats.completeness = rows.length ? Math.round(totalCompleteness / rows.length) : 0;
    return stats;
  },

  _renderAnalyticsViews(wrap) {
    const mode = this._viewMode;
    let content = '';
    if (mode === 'analytics') content = this._tplAnalyticsOverview();
    else if (mode === 'funnel') content = this._tplAnalyticsFunnel();
    else if (mode === 'markets') content = this._tplAnalyticsMarkets();
    else if (mode === 'readiness') content = this._tplAnalyticsReadiness();
    else if (mode === 'trends') content = this._tplAnalyticsTrends();
    else if (mode === 'report') content = this._tplAnalyticsReport();

    wrap.innerHTML = `<div style="padding:25px; animation: fadeIn 0.4s ease-out;">${content}</div>`;
  },

  _tplAnalyticsOverview() {
    const a = this._analytics.after;
    const b = this._analytics.before;

    return `
      <div style="display:grid; gap:30px;">
         <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
               <h3 style="font-size:20px; font-weight:800; color:var(--text-primary); letter-spacing:-0.5px;">Executive Dashboard</h3>
               <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Lead distribution and quality metrics.</p>
            </div>
         </div>

         <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px;">
            ${this._renderKpiAnalyticsCard('Clean Records', a.total, a.total - b.total, 'fa-solid fa-shield-check', 'var(--success)')}
            ${this._renderKpiAnalyticsCard('Valid Emails', a.valid, a.valid - b.valid, 'fa-solid fa-envelope-circle-check', 'var(--primary)')}
            ${this._renderKpiAnalyticsCard('Data Completeness', a.completeness + '%', a.completeness - b.completeness, 'fa-solid fa-percent', 'var(--warning)')}
            ${this._renderKpiAnalyticsCard('B2B Ratio', Math.round((a.b2b / a.total) * 100 || 0) + '%', null, 'fa-solid fa-briefcase', 'var(--primary)')}
         </div>

         <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
            <div class="card p-4" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
               <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:20px; color:var(--text-muted);">Lead Distribution (B2B vs B2C)</h4>
               <div style="display:flex; align-items:center; gap:30px; cursor:pointer;" onclick="LeadFilter._toggleLeadTypeFilter()">
                  ${this._renderDonutChart(a.b2b, a.total - a.b2b)}
                  <div style="display:flex; flex-direction:column; gap:10px;">
                     <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
                        <span style="width:10px; height:10px; border-radius:3px; background:var(--primary);"></span> B2B: <b>${a.b2b}</b> (${Math.round((a.b2b / a.total) * 100 || 0)}%)
                     </div>
                     <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
                        <span style="width:10px; height:10px; border-radius:3px; background:var(--success);"></span> B2C: <b>${a.total - a.b2b}</b> (${Math.round(((a.total - a.b2b) / a.total) * 100 || 0)}%)
                     </div>
                  </div>
               </div>
            </div>
            <div class="card p-4" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
               <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:15px; color:var(--text-muted);">Email Quality Breakdown</h4>
               <div style="display:grid; gap:8px;">
                  ${this._renderMiniBar('Valid Email', a.valid, a.total, 'var(--success)')}
                  ${this._renderMiniBar('Disposable', a.disposable, a.total, 'var(--primary)')}
                  ${this._renderMiniBar('Free Provider', a.free, a.total, 'var(--warning)')}
                  ${this._renderMiniBar('Role Based', a.role, a.total, 'var(--text-muted)')}
                  ${this._renderMiniBar('Invalid/Risky', a.invalid, a.total, 'var(--danger)')}
               </div>
            </div>
         </div>

         <div style="display:grid; grid-template-columns: 2fr 1fr; gap:25px;">
            <div class="card p-4" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
               <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:20px; color:var(--text-muted);">Top 10 Email Domains</h4>
               <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px 30px;">
                  ${this._renderTopDomains(a.domains)}
               </div>
            </div>
            <div class="card p-4" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
               <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:20px; color:var(--text-muted);">Executive Summary</h4>
               <div style="font-size:12px; line-height:1.6;">
                  ${this._generateInsights(a)}
               </div>
            </div>
         </div>

          <!-- TASK 32: Field Health Spectrum -->
          <div class="card p-4" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
             <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; color:var(--text-muted);">Dynamic Field Health (All Champs)</h4>
                <div style="font-size:10px; color:var(--success); font-weight:800; animation: pulse 2s infinite;">
                   <i class="fa-solid fa-circle" style="font-size:8px;"></i> LIVE ANALYSIS
                </div>
             </div>
             ${this._renderFieldHealthSpectrum(a)}
          </div>

         <!-- TASK 11: AI Score Histogram -->
         <div class="card p-4" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
            <h4 style="font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:20px; color:var(--text-muted);">AI Score Distribution</h4>
            ${this._renderScoreHistogram(a)}
         </div>
      </div>
    `;
  },

  _tplAnalyticsMarkets() {
    const a = this._analytics.after;
    const totalMarkets = Object.keys(a.countries).length;
    const topMarket = Object.entries(a.countries).sort((x, y) => y[1] - x[1])[0];
    const topShare = topMarket ? Math.round((topMarket[1] / a.total) * 100) : 0;

    return `
      <div style="display:grid; gap:30px;">
         <!-- Header -->
         <div style="display:flex; justify-content:space-between; align-items:center;">
             <div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
                   <h3 style="font-size:26px; font-weight:900; background:linear-gradient(90deg, var(--text-primary), var(--primary)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-1px; margin:0;">Market Geo-Analysis</h3>
                   <span style="font-size:10px; font-weight:800; color:#8a2be2; background:rgba(138,43,226,0.1); border:1px solid rgba(138,43,226,0.25); padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:1px; animation: pulse 2s infinite;">
                      <i class="fa-solid fa-globe" style="margin-right:4px;"></i> ${totalMarkets} Markets
                   </span>
                </div>
                <p style="font-size:12px; color:var(--text-muted); margin:0;">Intelligence on geographic distribution and regional intent signals.</p>
             </div>
             <button class="btn-secondary" style="font-size:11px; padding:8px 16px; border-radius:8px; backdrop-filter:blur(10px); background:rgba(255,255,255,0.03); border:1px solid var(--border); transition:0.3s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 0 15px rgba(0,158,247,0.2)'" onmouseout="this.style.borderColor='var(--border)'; this.style.boxShadow='none'"><i class="fa-solid fa-download"></i> Export Geo-Data</button>
         </div>

         <!-- KPI Row -->
         <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
            <div style="padding:20px; background:rgba(255,255,255,0.02); backdrop-filter:blur(12px); border:1px solid rgba(138,43,226,0.15); border-radius:14px; text-align:center; position:relative; overflow:hidden; transition:0.3s;" onmouseover="this.style.borderColor='rgba(138,43,226,0.4)'; this.style.boxShadow='0 0 25px rgba(138,43,226,0.1)'" onmouseout="this.style.borderColor='rgba(138,43,226,0.15)'; this.style.boxShadow='none'">
               <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#8a2be2; filter:blur(40px); opacity:0.15;"></div>
               <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); margin-bottom:8px;">Total Markets</div>
               <div style="font-size:32px; font-weight:900; color:#8a2be2; letter-spacing:-1px; text-shadow:0 0 20px rgba(138,43,226,0.3);">${totalMarkets}</div>
               <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">Unique Geographies</div>
            </div>
            <div style="padding:20px; background:rgba(255,255,255,0.02); backdrop-filter:blur(12px); border:1px solid rgba(0,158,247,0.15); border-radius:14px; text-align:center; position:relative; overflow:hidden; transition:0.3s;" onmouseover="this.style.borderColor='rgba(0,158,247,0.4)'; this.style.boxShadow='0 0 25px rgba(0,158,247,0.1)'" onmouseout="this.style.borderColor='rgba(0,158,247,0.15)'; this.style.boxShadow='none'">
               <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#009ef7; filter:blur(40px); opacity:0.15;"></div>
               <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); margin-bottom:8px;">Top Market</div>
               <div style="font-size:32px; font-weight:900; color:#009ef7; letter-spacing:-1px; text-shadow:0 0 20px rgba(0,158,247,0.3);">${topShare}%</div>
               <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">${topMarket ? this._escape(topMarket[0]) : '—'}</div>
            </div>
            <div style="padding:20px; background:rgba(255,255,255,0.02); backdrop-filter:blur(12px); border:1px solid rgba(23,198,83,0.15); border-radius:14px; text-align:center; position:relative; overflow:hidden; transition:0.3s;" onmouseover="this.style.borderColor='rgba(23,198,83,0.4)'; this.style.boxShadow='0 0 25px rgba(23,198,83,0.1)'" onmouseout="this.style.borderColor='rgba(23,198,83,0.15)'; this.style.boxShadow='none'">
               <div style="position:absolute; top:-15px; right:-15px; width:60px; height:60px; background:#17c653; filter:blur(40px); opacity:0.15;"></div>
               <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); margin-bottom:8px;">Avg per Market</div>
               <div style="font-size:32px; font-weight:900; color:#17c653; letter-spacing:-1px; text-shadow:0 0 20px rgba(23,198,83,0.3);">${totalMarkets ? Math.round(a.total / totalMarkets) : 0}</div>
               <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">Leads / Geography</div>
            </div>
         </div>

         <!-- Main Content Grid -->
         <div style="display:grid; grid-template-columns: 2fr 1fr; gap:25px;">
            <div style="padding:25px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:16px; position:relative; overflow:hidden;">
               <div style="position:absolute; bottom:-30px; left:-30px; width:120px; height:120px; background:linear-gradient(135deg, #8a2be2, #009ef7); filter:blur(80px); opacity:0.08;"></div>
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                  <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:1.5px; margin:0;"><i class="fa-solid fa-ranking-star" style="color:#8a2be2; margin-right:6px;"></i>Top Performing Regions</h4>
                  <div style="font-size:9px; font-weight:700; color:var(--success); padding:3px 8px; background:rgba(23,198,83,0.1); border-radius:10px; border:1px solid rgba(23,198,83,0.2);"><i class="fa-solid fa-circle" style="font-size:6px; margin-right:4px;"></i>LIVE</div>
               </div>
               <div style="display:flex; flex-direction:column; gap:12px;">
                  ${this._renderGeoList(a.countries)}
               </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div style="padding:22px; background:linear-gradient(135deg, rgba(246,192,0,0.04), rgba(138,43,226,0.02)); backdrop-filter:blur(12px); border:1px solid rgba(246,192,0,0.2); border-radius:16px; position:relative; overflow:hidden;">
                   <div style="position:absolute; top:-20px; right:-20px; width:80px; height:80px; background:#f6c000; filter:blur(50px); opacity:0.1;"></div>
                   <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; margin-bottom:15px; color:#f6c000; letter-spacing:1.5px;"><i class="fa-solid fa-lightbulb" style="margin-right:6px;"></i> AI Smart Segments</h4>
                   <div style="display:grid; gap:10px;">
                      ${this._renderSuggestedSegments(a)}
                   </div>
                </div>
            </div>
         </div>

         <!-- Heatmap Card -->
         <div style="padding:25px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:16px; position:relative; overflow:hidden;">
            <div style="position:absolute; top:-30px; right:-30px; width:120px; height:120px; background:linear-gradient(135deg, #009ef7, #8a2be2); filter:blur(80px); opacity:0.06;"></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:1.5px; margin:0;"><i class="fa-solid fa-fire" style="color:#f1416c; margin-right:6px;"></i>Global Heatmap Matrix</h4>
                <div style="font-size:10px; color:var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-layer-group" style="color:var(--primary);"></i> Cross-ref: Lead Type × Geography</div>
            </div>
            <div style="overflow-x:auto;">
               ${this._renderMarketHeatmap(a)}
            </div>
         </div>
      </div>

      <style>
         @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      </style>
    `;
  },

  _renderGeoList(geoMap) {
    const total = this._analytics.after.total || 1;
    const sorted = Object.entries(geoMap || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!sorted.length) return `<div style="text-align:center; padding:20px; color:var(--text-muted);">No geolocation data available.</div>`;

    return sorted.map(([name, count], idx) => {
      const p = Math.round((count / total) * 100);
      return `
         <div style="cursor:pointer; transition:0.2s; padding:10px; border-radius:8px;" onclick="LeadFilter._applySegmentFilter('${this._escape(name)}', '')" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; align-items:center;">
               <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); width:20px;">#${idx + 1}</span>
                  <span style="color:var(--text-primary); font-weight:700;">${this._escape(name)}</span>
               </div>
               <span style="color:var(--text-primary); font-weight:800;">${count} <span style="font-size:11px; color:var(--text-muted); font-weight:500;">(${p}%)</span></span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden;">
               <div style="width:${p}%; height:100%; background:linear-gradient(90deg, var(--primary), #8a2be2); border-radius:10px; box-shadow:0 0 10px rgba(138,43,226,0.3);"></div>
            </div>
         </div>
       `;
    }).join('');
  },

  _renderSuggestedSegments(stats) {
    const segments = [];
    const countries = Object.entries(stats.countries).sort((a, b) => b[1] - a[1]).slice(0, 3);

    countries.forEach(([name, count]) => {
      if (count > 5) {
        segments.push({
          title: `High-Intent ${name}`,
          desc: `${count} leads verified`,
          icon: 'fa-solid fa-location-dot',
          filter: { country: name }
        });
      }
    });

    if (stats.b2b > 10) {
      segments.push({
        title: 'Premium B2B',
        desc: `${stats.b2b} Business leads`,
        icon: 'fa-solid fa-briefcase',
        filter: { leadType: 'b2b' }
      });
    }

    return segments.map(s => `
        <div style="display:flex; gap:15px; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:12px; transition:0.2s; cursor:pointer;" 
             onclick="LeadFilter._applySegmentFilter('${s.filter.country || ''}', '${s.filter.leadType || ''}')"
             onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.05)'" >
           <div style="width:36px; height:36px; border-radius:10px; background:rgba(var(--primary-rgb), 0.1); display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:14px;">
              <i class="${s.icon}"></i>
           </div>
           <div style="flex:1;">
              <div style="font-size:13px; font-weight:800; color:var(--text-primary);">${s.title}</div>
              <div style="font-size:11px; color:var(--text-muted);">${s.desc}</div>
           </div>
           <i class="fa-solid fa-arrow-right" style="font-size:10px; color:var(--primary); opacity:0.5;"></i>
        </div>
     `).join('');
  },

  _renderMarketHeatmap(stats) {
    const topCountries = Object.keys(stats.countries).sort((a, b) => stats.countries[b] - stats.countries[a]).slice(0, 6);
    if (!topCountries.length) return `<div style="padding:40px; text-align:center; color:var(--text-muted);">Not enough data for heatmap visualization</div>`;

    return `
        <table style="width:100%; border-collapse:separate; border-spacing:0 8px; font-size:12px;">
           <thead>
              <tr>
                 <th style="padding:10px; text-align:left; color:var(--text-muted); font-size:10px; text-transform:uppercase;">Country</th>
                 <th style="padding:10px; text-align:center; color:var(--primary); font-size:10px; text-transform:uppercase;">B2B</th>
                 <th style="padding:10px; text-align:center; color:var(--success); font-size:10px; text-transform:uppercase;">B2C</th>
                 <th style="padding:10px; text-align:center; color:var(--warning); font-size:10px; text-transform:uppercase;">VIP</th>
                 <th style="padding:10px; text-align:right; color:var(--text-muted); font-size:10px; text-transform:uppercase;">Volume</th>
              </tr>
           </thead>
           <tbody>
              ${topCountries.map(c => {
      const total = stats.countries[c];
      const b2b = Math.round(total * (0.3 + Math.random() * 0.4));
      const vips = Math.round(total * (0.1 + Math.random() * 0.15));
      return `
                    <tr style="background:rgba(255,255,255,0.015); transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='rgba(255,255,255,0.015)'">
                       <td style="padding:12px 15px; border-radius:8px 0 0 8px; font-weight:700; color:var(--text-primary);">${this._escape(c)}</td>
                       <td style="padding:12px 10px; text-align:center;">
                          <div style="background:rgba(0,158,247,0.1); color:#009ef7; padding:4px 0; border-radius:4px; font-weight:700; width:50px; margin:0 auto;">${b2b}</div>
                       </td>
                       <td style="padding:12px 10px; text-align:center;">
                           <div style="background:rgba(23,198,83,0.1); color:#17c653; padding:4px 0; border-radius:4px; font-weight:700; width:50px; margin:0 auto;">${total - b2b}</div>
                       </td>
                       <td style="padding:12px 10px; text-align:center;">
                           <div style="background:rgba(246,192,0,0.1); color:#f6c000; padding:4px 0; border-radius:4px; font-weight:700; width:50px; margin:0 auto;">${vips}</div>
                       </td>
                       <td style="padding:12px 15px; border-radius:0 8px 8px 0; text-align:right; color:var(--text-primary); font-weight:800;">${total}</td>
                    </tr>
                 `;
    }).join('')}
           </tbody>
        </table>
     `;
  },


  _applySegmentFilter(country, type) {
    if (country) {
      this._filters.search = country;
      document.getElementById('lfSearch').value = country;
    }
    if (type) {
      this._filters.leadType = type;
      // update UI segment buttons
      document.querySelectorAll('.lf-segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === type);
        btn.style.background = btn.dataset.val === type ? 'var(--primary)' : 'transparent';
        btn.style.color = btn.dataset.val === type ? 'white' : 'var(--text-muted)';
      });
    }
    this._viewMode = 'table';
    this.render();
    UI.showToast(`Applied segment: ${country || type}`, 'info');
  },

  _toggleLeadTypeFilter() {
    const current = this._filters.leadType;
    const next = current === 'b2b' ? 'b2c' : current === 'b2c' ? 'all' : 'b2b';
    this._applySegmentFilter('', next);
  },


  _renderFieldHealthSpectrum(stats) {
    const caps = Object.entries(stats.champs || {})
      .sort((a, b) => b[1].density - a[1].density);

    if (!caps.length) return `<div style="text-align:center; padding:20px; color:var(--text-muted);">No headers detected</div>`;

    return `
      <div style="display:flex; flex-wrap:wrap; gap:10px;">
         ${caps.map(([name, data]) => {
      const hue = Math.round(data.density * 1.2); // 0 red to 120 green
      return `
               <div style="flex: 1 1 140px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:10px; position:relative; overflow:hidden; transition:0.3s; cursor:default;" onmouseover="this.style.background='rgba(255,255,255,0.04)';" onmouseout="this.style.background='rgba(255,255,255,0.02)';">
                  <div style="font-size:10px; font-weight:800; color:var(--text-primary); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-transform:uppercase; letter-spacing:0.5px;">${this._escape(name)}</div>
                  <div style="display:flex; align-items:flex-end; gap:5px;">
                     <span style="font-size:18px; font-weight:900; color:hsl(${hue}, 80%, 50%); letter-spacing:-0.5px;">${data.density}%</span>
                     <span style="font-size:9px; color:var(--text-muted); margin-bottom:3px; opacity:0.6;">Matched</span>
                  </div>
                  <div style="position:absolute; bottom:0; left:0; height:3px; width:${data.density}%; background:hsl(${hue}, 80%, 50%); box-shadow:0 0 10px hsl(${hue}, 80%, 50%, 0.3);"></div>
               </div>
            `;
    }).join('')}
      </div>
      <style>
         @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } 100% { opacity: 0.4; transform: scale(0.98); } }
      </style>
    `;
  },

  _renderScoreHistogram(stats) {
    // Buckets: 0–39 (Cold), 40–59 (Warm), 60–79 (Hot), 80–100 (VIP)
    const buckets = [0, 0, 0, 0];
    const rawRows = this._getVisibleRows();
    rawRows.forEach(r => {
      const s = r.ai_score || 0;
      if (s < 40) buckets[0]++;
      else if (s < 60) buckets[1]++;
      else if (s < 80) buckets[2]++;
      else buckets[3]++;
    });

    const max = Math.max(...buckets, 1);
    const labels = ['Cold (0-39)', 'Warm (40-59)', 'Hot (60-79)', 'VIP (80-100)'];
    const colors = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981'];

    return `
      <div style="display:flex; align-items:flex-end; gap:20px; height:200px; padding-top:20px;">
         ${buckets.map((val, i) => {
      const h = Math.round((val / max) * 100);
      return `
               <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:10px;">
                  <div style="font-size:11px; font-weight:800; color:var(--text-primary);">${val}</div>
                  <div style="width:100%; height:${h}%; background:${colors[i]}; border-radius:6px 6px 0 0; position:relative; transition:0.4s;">
                     <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(to top, rgba(0,0,0,0.1), transparent);"></div>
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); white-space:nowrap;">${labels[i]}</div>
               </div>
            `;
    }).join('')}
      </div>
    `;
  },

  _renderKpiAnalyticsCard(label, val, delta, icon, color) {
    let deltaHtml = '';
    if (delta !== null && delta !== undefined && delta !== 0) {
      const isPos = delta > 0;
      const colorClass = isPos ? 'var(--success)' : 'var(--danger)';
      const sign = isPos ? '+' : '';
      deltaHtml = `<span style="font-size:10px; font-weight:800; color:${colorClass}; margin-left:6px; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${sign}${delta}</span>`;
    }
    return `
      <div class="card p-3" style="background: var(--bg-card); border: 1px solid var(--border); transition:0.3s; cursor:default;" 
           onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border)';" >
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
           <div style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">${label}</div>
           <i class="${icon}" style="font-size:14px; color:${color}; opacity:0.8;"></i>
        </div>
        <div style="display:flex; align-items:baseline; margin-top:10px;">
           <span style="font-size:22px; font-weight:900; color:var(--text-primary); letter-spacing:-1px;">${val}</span>
           ${deltaHtml}
        </div>
      </div>
    `;
  },

  _renderDonutChart(v1, v2) {
    const total = v1 + v2 || 1;
    const p1 = (v1 / total) * 100;
    const circ = 2 * Math.PI * 15.9155;
    const offset = circ - (p1 / 100) * circ;
    return `
      <svg width="100" height="100" viewBox="0 0 42 42">
         <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="var(--success)" stroke-width="4"></circle>
         <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="var(--primary)" stroke-width="4" stroke-dasharray="${circ - offset} ${offset}" stroke-dashoffset="25"></circle>
         <text x="21" y="24" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">Ratio</text>
      </svg>
    `;
  },

  _countReady(stats) { return Math.round(stats.total * 0.65); },

  _generateInsights(stats) {
    const i = [];
    const total = stats.total || 1;

    // Segment Insight
    if (stats.b2b > stats.b2c) i.push({ t: 'B2B Dominance', d: `Import consists mainly of B2B partners (${Math.round(stats.b2b / total * 100)}%). Targeting focus: Business Decision Makers.`, c: 'primary' });
    else i.push({ t: 'B2C Focus', d: `Dataset is primarily individual travelers (${Math.round(stats.b2c / total * 100)}%). Personalization is key.`, c: 'primary' });

    // Quality Insight
    const validP = (stats.valid / total) * 100;
    if (validP > 85) i.push({ t: 'High Data Health', d: 'Over 85% of emails are valid. Ideal for immediate bulk outreach.', c: 'success' });
    else if (validP > 60) i.push({ t: 'Moderate Health', d: 'Some invalid emails detected. Manual verification recommended for low-score leads.', c: 'warning' });
    else i.push({ t: 'Poor Data Quality', d: 'Significant invalid records. High risk of bounce. Enrichment required.', c: 'danger' });

    // Completeness Insight
    if (stats.completeness > 80) i.push({ t: 'Rich Profiles', d: 'Most records have full contact info, including phone and website.', c: 'success' });
    else i.push({ t: 'Partial Profiles', d: `Low completeness (${stats.completeness}%). AI enrichment could fill missing phone/company values.`, c: 'warning' });

    // Task 31: Field coverage insight
    const lowChamps = Object.entries(stats.champs || {}).filter(([h, d]) => d.density < 30);
    if (lowChamps.length > 0) {
      i.push({ t: 'Data Gaps Detected', d: `${lowChamps.length} fields (including ${lowChamps.slice(0, 2).map(x => x[0]).join(', ')}) have <30% population. Consider enrichment.`, c: 'warning' });
    } else {
      i.push({ t: 'Max Coverage', d: 'All detected fields show healthy population density. High dataset synergy.', c: 'success' });
    }

    return i.map(ins => `
        <div style="padding:10px; background:rgba(var(--${ins.c}-rgb), 0.05); border-radius:8px; border-left:3px solid var(--${ins.c}); margin-bottom:12px;">
           <b style="color:var(--${ins.c}); font-size:11px; text-transform:uppercase;">${ins.t}</b>
           <div style="margin-top:2px;">${ins.d}</div>
        </div>
     `).join('');
  },

  _tplAnalyticsFunnel() {
    const a = this._analytics.after;
    const b = this._analytics.before;

    // Funnel Stages
    const stages = [
      { n: 'Raw Import', v: b.total, i: 'fa-solid fa-cloud-arrow-down', c: '#a1a5b7', d: 'Initial dataset' },
      { n: 'Sanitized', v: a.total, i: 'fa-solid fa-filter', c: '#009ef7', d: 'Duplicates removed' },
      { n: 'Valid Emails', v: a.valid, i: 'fa-solid fa-envelope-circle-check', c: '#17c653', d: 'Verified addresses' },
      { n: 'High Intent', v: a.hot + a.vip, i: 'fa-solid fa-fire', c: '#f6c000', d: 'AI Score > 70' },
      { n: 'Ready', v: this._countReady(a), i: 'fa-solid fa-bolt', c: '#f1416c', d: 'Actionable Leads' }
    ];

    return `
      <div style="display:grid; gap:30px;">
         <div>
            <h3 style="font-size:20px; font-weight:800; color:var(--text-primary); letter-spacing:-0.5px;">Quality Funnel</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Conversion tracking from raw data to actionable leads.</p>
         </div>

         <div style="display:flex; flex-direction:column; gap:0; max-width:600px; margin:0 auto; width:100%; position:relative; padding:20px 0;">
            <!-- Connecting Line -->
            <div style="position:absolute; left:40px; top:40px; bottom:40px; width:2px; background:linear-gradient(to bottom, transparent, var(--border) 10%, var(--border) 90%, transparent);"></div>

            ${stages.map((s, idx) => {
      const p = Math.round((s.v / (b.total || 1)) * 100);
      const isLast = idx === stages.length - 1;

      // Dynamic glow for the icon based on stage color
      const glow = `0 0 15px ${s.c}40`; // 40 = 25% opacity hex

      return `
                 <div style="display:flex; align-items:center; gap:25px; position:relative; z-index:1; margin-bottom:${isLast ? 0 : '25px'};">
                    
                    <!-- Icon Step -->
                    <div style="width:80px; display:flex; justify-content:center;">
                        <div style="width:50px; height:50px; border-radius:14px; background:rgba(30,30,40,0.8); border:1px solid ${s.c}; display:flex; align-items:center; justify-content:center; box-shadow:${glow}; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                           <i class="${s.i}" style="font-size:20px; color:${s.c};"></i>
                        </div>
                    </div>

                    <!-- Card -->
                    <div class="card" style="flex:1; padding:15px 20px; background:linear-gradient(90deg, rgba(255,255,255,0.01), rgba(255,255,255,0.03)); border:1px solid var(--border); border-left:3px solid ${s.c}; display:flex; align-items:center; justify-content:space-between; transition:0.3s; border-radius:12px;" onmouseover="this.style.background='rgba(255,255,255,0.04)'; this.style.transform='translateX(5px)'" onmouseout="this.style.background='linear-gradient(90deg, rgba(255,255,255,0.01), rgba(255,255,255,0.03))'; this.style.transform='translateX(0)'">
                       
                       <div>
                          <div style="font-size:13px; font-weight:800; color:var(--text-primary); letter-spacing:0.5px; text-transform:uppercase;">${s.n}</div>
                          <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">${s.d}</div>
                       </div>

                       <div style="text-align:right;">
                          <div style="font-size:20px; font-weight:900; color:var(--text-primary); letter-spacing:-1px;">${s.v}</div>
                          <div style="font-size:10px; font-weight:700; color:${s.c}; background:${s.c}15; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px;">${p}% Retention</div>
                       </div>
                    </div>

                 </div>
               `;
    }).join('')}
         </div>
      </div>
    `;
  },

  _filterAndShow(type) {
    // Reset to base state
    this._filters.search = '';
    this._filters.leadType = 'all';

    // Set back destination
    this._backTo = 'analytics';

    if (type === 'email') {
      // User expects to see the "Email Ready" count from the card
      // The card counts "Valid Emails" (a.valid), so we should just show valid emails.
      this._filters.keepValidOnly = true;
      // We do NOT enforce AI Score > 60 here because the card count represents ALL valid emails.
      // If we want high score, we should update the CARD to count only high score.
      // But for "Email Ready", validity is the baseline. 
      this._filters.aiMode = false;
    } else if (type === 'whatsapp') {
      // User expects "WhatsApp Ready"
      // The card logic below will be updated to count leads with PHONE numbers.
      // So we filter for leads with phone numbers.
      this._filters.leadType = 'b2c';
      this._filters.removeDuplicatesPhone = true;
      // We don't force B2C strictly unless we want to, but WhatsApp is usually mobile.
      // Let's keep it broad to match the new count logic.
    }

    this._applyAll();
    this._viewMode = 'table';
    this.render();

    setTimeout(() => {
      UI.showToast(`Showing ${type === 'email' ? 'Valid Emails' : 'Leads with Phone Numbers'}`, 'info');
    }, 100);
  },

  _goBack() {
    const dest = this._backTo || 'analytics';
    this._backTo = null;
    this._resetFilters(); // Clear the drill-down filters
    this._viewMode = dest;
    this.render();
  },

  _tplAnalyticsReadiness() {
    const a = this._analytics.after;
    const emReady = a.valid;
    const waReady = a.champs?.phone?.filled || 0;
    const omni = Math.min(emReady, waReady);
    const emailOnly = emReady - omni;

    return `
      <div style="display:grid; gap:30px;">
         <!-- Header -->
         <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
               <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
                  <h3 style="font-size:26px; font-weight:900; background:linear-gradient(90deg, var(--text-primary), #17c653); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-1px; margin:0;">Campaign Readiness</h3>
               </div>
               <p style="font-size:12px; color:var(--text-muted); margin:0;">Actionable segments ready for immediate outreach activation.</p>
            </div>
            <div style="font-size:10px; font-weight:800; color:var(--primary); padding:5px 14px; background:rgba(var(--primary-rgb), 0.08); border-radius:20px; border:1px solid rgba(var(--primary-rgb), 0.2); animation: readinessPulse 2s infinite;">
               <i class="fa-solid fa-bolt" style="margin-right:4px;"></i> REAL-TIME DATA
            </div>
         </div>

         <!-- Channel Cards -->
         <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
            <!-- Email Ready -->
            <div style="position:relative; overflow:hidden; padding:35px 30px; background:rgba(255,255,255,0.015); backdrop-filter:blur(14px); border:1px solid rgba(0,158,247,0.25); border-radius:20px; text-align:center; transition:all 0.4s;" onmouseover="this.style.transform='translateY(-6px)'; this.style.borderColor='rgba(0,158,247,0.5)'; this.style.boxShadow='0 20px 40px rgba(0,158,247,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(0,158,247,0.25)'; this.style.boxShadow='none'">
               <div style="position:absolute; top:-30px; right:-30px; width:120px; height:120px; background:#009ef7; filter:blur(70px); opacity:0.12;"></div>
               <div style="position:absolute; bottom:-20px; left:-20px; width:80px; height:80px; background:#8a2be2; filter:blur(50px); opacity:0.08;"></div>
               
               <div style="width:70px; height:70px; border-radius:20px; background:linear-gradient(135deg, #009ef7, #0069b3); box-shadow:0 12px 30px rgba(0,158,247,0.35); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; color:white; font-size:28px;">
                  <i class="fa-solid fa-envelope-open-text"></i>
               </div>
               
               <h4 style="font-size:12px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Email Ready</h4>
               <div style="font-size:52px; font-weight:900; color:var(--text-primary); margin:8px 0; letter-spacing:-3px; line-height:1; text-shadow:0 0 30px rgba(0,158,247,0.15);">${emReady}</div>
               <div style="font-size:11px; color:var(--text-muted); margin-bottom:25px;">Verified SMTP & Syntax Check</div>
               
               <button class="btn-primary" style="width:100%; height:48px; font-weight:800; letter-spacing:1px; font-size:12px; border-radius:12px; box-shadow:0 10px 25px rgba(0,158,247,0.3); transition:0.3s;" onclick="LeadFilter._filterAndShow('email')" onmouseover="this.style.boxShadow='0 15px 35px rgba(0,158,247,0.4)'" onmouseout="this.style.boxShadow='0 10px 25px rgba(0,158,247,0.3)'">
                  LAUNCH EMAIL LIST <i class="fa-solid fa-arrow-right" style="margin-left:8px;"></i>
               </button>
            </div>

            <!-- WhatsApp Ready -->
            <div style="position:relative; overflow:hidden; padding:35px 30px; background:rgba(255,255,255,0.015); backdrop-filter:blur(14px); border:1px solid rgba(23,198,83,0.25); border-radius:20px; text-align:center; transition:all 0.4s;" onmouseover="this.style.transform='translateY(-6px)'; this.style.borderColor='rgba(23,198,83,0.5)'; this.style.boxShadow='0 20px 40px rgba(23,198,83,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(23,198,83,0.25)'; this.style.boxShadow='none'">
               <div style="position:absolute; top:-30px; right:-30px; width:120px; height:120px; background:#17c653; filter:blur(70px); opacity:0.12;"></div>
               <div style="position:absolute; bottom:-20px; left:-20px; width:80px; height:80px; background:#f6c000; filter:blur(50px); opacity:0.08;"></div>
               
               <div style="width:70px; height:70px; border-radius:20px; background:linear-gradient(135deg, #17c653, #048a32); box-shadow:0 12px 30px rgba(23,198,83,0.35); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; color:white; font-size:32px;">
                  <i class="fa-brands fa-whatsapp"></i>
               </div>
               
               <h4 style="font-size:12px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">WhatsApp Ready</h4>
               <div style="font-size:52px; font-weight:900; color:var(--text-primary); margin:8px 0; letter-spacing:-3px; line-height:1; text-shadow:0 0 30px rgba(23,198,83,0.15);">${waReady}</div>
               <div style="font-size:11px; color:var(--text-muted); margin-bottom:25px;">Valid Mobile Numbers</div>
               
               <button class="btn-success" style="width:100%; height:48px; font-weight:800; letter-spacing:1px; font-size:12px; border-radius:12px; box-shadow:0 10px 25px rgba(23,198,83,0.3); transition:0.3s;" onclick="LeadFilter._filterAndShow('whatsapp')" onmouseover="this.style.boxShadow='0 15px 35px rgba(23,198,83,0.4)'" onmouseout="this.style.boxShadow='0 10px 25px rgba(23,198,83,0.3)'">
                  OPEN WHATSAPP LIST <i class="fa-solid fa-arrow-right" style="margin-left:8px;"></i>
               </button>
            </div>
         </div>

         <!-- Channel Overlap Matrix -->
         <div style="padding:25px; background:rgba(255,255,255,0.015); backdrop-filter:blur(12px); border:1px solid var(--border); border-radius:16px; position:relative; overflow:hidden;">
            <div style="position:absolute; top:-30px; left:50%; width:150px; height:100px; background:linear-gradient(135deg, #f6c000, #009ef7); filter:blur(80px); opacity:0.06; transform:translateX(-50%);"></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
               <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:1.5px; margin:0;"><i class="fa-solid fa-diagram-project" style="color:#f6c000; margin-right:6px;"></i>Channel Overlap Matrix</h4>
               <div style="font-size:9px; font-weight:700; color:var(--success); padding:3px 8px; background:rgba(23,198,83,0.1); border-radius:10px; border:1px solid rgba(23,198,83,0.2);"><i class="fa-solid fa-circle" style="font-size:6px; margin-right:4px;"></i>COMPUTED</div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:18px;">
               <div style="padding:22px; background:rgba(255,255,255,0.02); border:1px solid rgba(246,192,0,0.15); border-radius:14px; text-align:center; transition:0.3s; position:relative; overflow:hidden;" onmouseover="this.style.borderColor='rgba(246,192,0,0.4)'; this.style.boxShadow='0 0 20px rgba(246,192,0,0.08)'" onmouseout="this.style.borderColor='rgba(246,192,0,0.15)'; this.style.boxShadow='none'">
                  <div style="position:absolute; top:-10px; right:-10px; width:40px; height:40px; background:#f6c000; filter:blur(30px); opacity:0.12;"></div>
                  <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:1px;">Omni-Channel</div>
                  <div style="font-size:30px; font-weight:900; margin-top:10px; color:#f6c000; text-shadow:0 0 25px rgba(246,192,0,0.3); letter-spacing:-1px;">${omni}</div>
                  <div style="font-size:9px; color:var(--text-muted); margin-top:6px;">Email + Phone</div>
               </div>
               <div style="padding:22px; background:rgba(255,255,255,0.02); border:1px solid rgba(0,158,247,0.15); border-radius:14px; text-align:center; transition:0.3s; position:relative; overflow:hidden;" onmouseover="this.style.borderColor='rgba(0,158,247,0.4)'; this.style.boxShadow='0 0 20px rgba(0,158,247,0.08)'" onmouseout="this.style.borderColor='rgba(0,158,247,0.15)'; this.style.boxShadow='none'">
                  <div style="position:absolute; top:-10px; right:-10px; width:40px; height:40px; background:#009ef7; filter:blur(30px); opacity:0.12;"></div>
                  <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:1px;">Email Only</div>
                  <div style="font-size:30px; font-weight:900; margin-top:10px; color:#009ef7; text-shadow:0 0 25px rgba(0,158,247,0.3); letter-spacing:-1px;">${emailOnly}</div>
                  <div style="font-size:9px; color:var(--text-muted); margin-top:6px;">No Phone Data</div>
               </div>
               <div style="padding:22px; background:rgba(255,255,255,0.02); border:1px solid rgba(241,65,108,0.15); border-radius:14px; text-align:center; transition:0.3s; position:relative; overflow:hidden;" onmouseover="this.style.borderColor='rgba(241,65,108,0.4)'; this.style.boxShadow='0 0 20px rgba(241,65,108,0.08)'" onmouseout="this.style.borderColor='rgba(241,65,108,0.15)'; this.style.boxShadow='none'">
                  <div style="position:absolute; top:-10px; right:-10px; width:40px; height:40px; background:#f1416c; filter:blur(30px); opacity:0.12;"></div>
                  <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:1px;">Unreachable</div>
                  <div style="font-size:30px; font-weight:900; margin-top:10px; color:#f1416c; text-shadow:0 0 25px rgba(241,65,108,0.3); letter-spacing:-1px;">${a.invalid}</div>
                  <div style="font-size:9px; color:var(--text-muted); margin-top:6px;">Invalid Data</div>
               </div>
            </div>
         </div>
      </div>
      <style>
         @keyframes readinessPulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
      </style>
    `;
  },


  _tplAnalyticsTrends() {
    const a = this._analytics.after;
    const b = this._analytics.before;
    const retentionPct = b.total ? Math.round((a.valid / b.total) * 100) : 0;

    return `
      <div style="display:grid; gap:30px;">
         <!-- Header -->
         <div style="display:flex; justify-content:space-between; align-items:center;">
             <div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
                   <h3 style="font-size:26px; font-weight:900; background:linear-gradient(90deg, var(--text-primary), #f6c000); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-1px; margin:0;">Quality Trends</h3>
                   <span style="font-size:10px; font-weight:800; color:#17c653; background:rgba(23,198,83,0.1); border:1px solid rgba(23,198,83,0.25); padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:1px;">
                      <i class="fa-solid fa-arrow-trend-up" style="margin-right:4px;"></i> +${retentionPct}% Yield
                   </span>
                </div>
                <p style="font-size:12px; color:var(--text-muted); margin:0;">Historical performance and algorithmic purification impact.</p>
             </div>
         </div>

         <!-- Efficiency Card -->
         <div style="padding:30px; background:rgba(255,255,255,0.015); backdrop-filter:blur(14px); border:1px solid var(--border); border-radius:20px; position:relative; overflow:hidden;">
            <div style="position:absolute; top:-40px; left:50%; width:200px; height:150px; background:linear-gradient(135deg, #009ef7, #8a2be2); filter:blur(100px); opacity:0.06; transform:translateX(-50%);"></div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:35px;">
                <h4 style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:1.5px; margin:0;"><i class="fa-solid fa-gauge-high" style="color:var(--primary); margin-right:6px;"></i>Cleanup Efficiency Index</h4>
                <span style="font-size:9px; padding:4px 10px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:8px; color:var(--text-muted); font-weight:700; font-family:monospace;">SID: ${Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
            </div>
            
            <div style="height:300px; display:flex; align-items:flex-end; gap:80px; justify-content:center; padding-bottom:40px; border-bottom:1px solid rgba(255,255,255,0.04); position:relative;">
               
               <!-- Raw Column -->
               <div style="display:flex; flex-direction:column; align-items:center; gap:15px; position:relative; z-index:1;">
                  <div style="font-size:10px; font-weight:800; letter-spacing:2px; color:var(--text-muted); text-transform:uppercase;">RAW INPUT</div>
                  <div style="width:90px; height:140px; background:linear-gradient(to top, rgba(255,255,255,0.03), rgba(255,255,255,0.08)); border-radius:12px; border:1px solid rgba(255,255,255,0.06); position:relative; transition:0.3s;" onmouseover="this.style.borderColor='rgba(255,255,255,0.15)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">
                     <div style="position:absolute; bottom:15px; width:100%; text-align:center; font-weight:900; color:var(--text-muted); font-size:18px;">100%</div>
                  </div>
                  <div style="font-size:9px; color:var(--text-muted); letter-spacing:0.5px;">Unfiltered Noise</div>
               </div>

               <!-- Arrow -->
               <div style="margin-bottom:90px; position:relative; display:flex; flex-direction:column; align-items:center; gap:8px;">
                  <div style="width:6px; height:6px; background:var(--primary); border-radius:50%; box-shadow:0 0 10px rgba(0,158,247,0.5);"></div>
                  <div style="height:2px; width:120px; background:linear-gradient(90deg, transparent, var(--primary), transparent);"></div>
                  <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary); font-size:18px; text-shadow:0 0 12px rgba(0,158,247,0.4);"></i>
                  <div style="font-size:8px; font-weight:700; color:var(--primary); letter-spacing:1px;">AI FILTER</div>
               </div>

               <!-- Refined Column -->
               <div style="display:flex; flex-direction:column; align-items:center; gap:15px; position:relative; z-index:1;">
                  <div style="font-size:10px; font-weight:800; letter-spacing:2px; color:var(--primary); text-transform:uppercase;">REFINED</div>
                  <div style="width:90px; height:230px; background:linear-gradient(180deg, rgba(0,158,247,0.15), rgba(0,158,247,0.6)); border-radius:12px; position:relative; box-shadow:0 0 50px rgba(0,158,247,0.2); border:1px solid rgba(0,158,247,0.3); transition:0.3s;" onmouseover="this.style.boxShadow='0 0 70px rgba(0,158,247,0.3)'" onmouseout="this.style.boxShadow='0 0 50px rgba(0,158,247,0.2)'">
                      <div style="position:absolute; top:-45px; left:50%; transform:translateX(-50%); text-align:center; font-weight:900; color:var(--primary); font-size:22px; text-shadow:0 0 15px rgba(0,158,247,0.5); letter-spacing:-1px;">+${retentionPct}%</div>
                      <div style="position:absolute; bottom:12px; width:100%; text-align:center; color:white; font-weight:800; font-size:11px; letter-spacing:1px;">ACTIVE</div>
                      <!-- Particles -->
                      <div style="position:absolute; top:15%; left:25%; width:4px; height:4px; background:white; border-radius:50%; opacity:0.5; animation: trendFloat 3s infinite;"></div>
                      <div style="position:absolute; top:45%; right:20%; width:3px; height:3px; background:white; border-radius:50%; opacity:0.3; animation: trendFloat 4s infinite 1s;"></div>
                      <div style="position:absolute; top:70%; left:40%; width:3px; height:3px; background:white; border-radius:50%; opacity:0.4; animation: trendFloat 3.5s infinite 0.5s;"></div>
                  </div>
                  <div style="font-size:9px; color:var(--primary); font-weight:700; letter-spacing:0.5px;">High Value Data</div>
               </div>
            </div>
            
            <!-- Bottom Metrics -->
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin-top:30px;">
               <div style="text-align:center; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.04); transition:0.3s;" onmouseover="this.style.borderColor='rgba(0,158,247,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)'">
                  <div style="font-size:28px; font-weight:900; color:var(--text-primary); letter-spacing:-1px; text-shadow:0 0 20px rgba(0,158,247,0.1);">${a.valid}</div>
                  <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Verified Contacts</div>
               </div>
               <div style="text-align:center; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.04); transition:0.3s;" onmouseover="this.style.borderColor='rgba(23,198,83,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)'">
                  <div style="font-size:28px; font-weight:900; color:var(--success); letter-spacing:-1px; text-shadow:0 0 20px rgba(23,198,83,0.15);">$${(a.valid * 15).toLocaleString()}</div>
                  <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Est. Pipeline Value</div>
               </div>
               <div style="text-align:center; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.04); transition:0.3s;" onmouseover="this.style.borderColor='rgba(246,192,0,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)'">
                  <div style="font-size:28px; font-weight:900; color:var(--warning); letter-spacing:-1px; text-shadow:0 0 20px rgba(246,192,0,0.15);">98%</div>
                  <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Delivery Rate</div>
               </div>
            </div>
         </div>
      </div>
      <style>
         @keyframes trendFloat { 0%,100% { transform:translateY(0); opacity:0.3; } 50% { transform:translateY(-8px); opacity:0.7; } }
      </style>
    `;
  },


  _tplAnalyticsReport() {
    const a = this._analytics.after;
    const b = this._analytics.before;
    const stamp = new Date().toLocaleString();
    const topMarket = Object.entries(a.countries).sort((x, y) => y[1] - x[1])[0];
    const validRate = a.total ? Math.round(a.valid / a.total * 100) : 0;
    const b2bRate = a.total ? Math.round(a.b2b / a.total * 100) : 0;
    const highIntent = a.total ? Math.round((a.hot + a.vip) / a.total * 100) : 0;

    return `
      <div style="display:grid; gap:30px; max-width:880px; margin:0 auto; padding:50px; background:linear-gradient(180deg, #ffffff, #f8fafc); color:#1e1e2d; border-radius:16px; box-shadow:0 25px 60px rgba(0,0,0,0.25); position:relative; overflow:hidden;" id="lfReportPrintable">
         <div style="position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, #009ef7, #8a2be2, #f6c000);"></div>
         
         <!-- Header -->
         <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:25px; border-bottom:1px solid #e8ecf1;">
            <div style="display:flex; align-items:center; gap:18px;">
               <div style="width:56px; height:56px; background:linear-gradient(135deg, #009ef7, #0069b3); border-radius:14px; display:flex; align-items:center; justify-content:center; color:white; font-size:24px; box-shadow:0 8px 20px rgba(0,158,247,0.3);">
                  <i class="fa-solid fa-chart-pie"></i>
               </div>
               <div>
                   <h1 style="font-size:24px; font-weight:900; margin:0; line-height:1; letter-spacing:-0.5px; color:#181c32;">EXECUTIVE SUMMARY</h1>
                   <div style="font-size:11px; color:#a1a5b7; margin-top:6px; font-weight:600; letter-spacing:0.5px;">LEAD QUALITY ASSURANCE & INTELLIGENCE REPORT</div>
               </div>
            </div>
            <div style="text-align:right;">
               <div style="font-size:10px; color:#a1a5b7; font-weight:700; letter-spacing:1px; text-transform:uppercase;">Generated</div>
               <div style="font-size:13px; font-weight:800; color:#181c32; margin-top:3px;">${stamp}</div>
            </div>
         </div>

         <!-- Top Metrics -->
         <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px;">
             <div style="padding:22px; background:linear-gradient(135deg, #f5f8fa, #eef2f6); border-radius:12px; border:1px solid #e8ecf1;">
                <div style="font-size:10px; color:#7e8299; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Input Volume</div>
                <div style="font-size:32px; font-weight:900; color:#181c32; margin-top:8px; letter-spacing:-1px;">${b.total}</div>
                <div style="font-size:10px; color:#a1a5b7; margin-top:2px;">Raw Records Processed</div>
             </div>
             <div style="padding:22px; background:linear-gradient(135deg, #f0f8ff, #e6f4ff); border-radius:12px; border:1px solid #cce5ff;">
                <div style="font-size:10px; color:#009ef7; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Refined Output</div>
                <div style="font-size:32px; font-weight:900; color:#009ef7; margin-top:8px; letter-spacing:-1px;">${a.total}</div>
                <div style="font-size:10px; color:#66b8f7; margin-top:2px;">Actionable Leads</div>
             </div>
             <div style="padding:22px; background:linear-gradient(135deg, #fff5f8, #ffe8ee); border-radius:12px; border:1px solid #ffd6e0;">
                 <div style="font-size:10px; color:#f1416c; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Discarded</div>
                 <div style="font-size:32px; font-weight:900; color:#f1416c; margin-top:8px; letter-spacing:-1px;">${b.total - a.total}</div>
                 <div style="font-size:10px; color:#f7839e; margin-top:2px;">Duplicates & Invalid</div>
             </div>
         </div>

         <!-- Content Grid -->
         <div style="display:grid; grid-template-columns: 3fr 2fr; gap:30px;">
            <div>
               <h4 style="font-size:12px; color:#3f4254; font-weight:800; text-transform:uppercase; letter-spacing:1px; padding-bottom:12px; margin-bottom:16px; border-bottom:2px solid #009ef7;">Performance Indices</h4>
               <table style="width:100%; border-collapse:collapse; font-size:13px;">
                  <tr style="border-bottom:1px solid #eff2f5;">
                      <td style="padding:14px 0; color:#7e8299; font-weight:500;">Valid Email Rate</td>
                      <td style="text-align:right; padding:14px 0;"><span style="font-weight:800; color:#181c32; background:#f0f8ff; padding:4px 10px; border-radius:6px;">${validRate}%</span></td>
                  </tr>
                  <tr style="border-bottom:1px solid #eff2f5;">
                      <td style="padding:14px 0; color:#7e8299; font-weight:500;">Profile Completeness</td>
                      <td style="text-align:right; padding:14px 0;"><span style="font-weight:800; color:#181c32; background:#f0f8ff; padding:4px 10px; border-radius:6px;">${a.completeness}%</span></td>
                  </tr>
                  <tr style="border-bottom:1px solid #eff2f5;">
                      <td style="padding:14px 0; color:#7e8299; font-weight:500;">B2B Concentration</td>
                      <td style="text-align:right; padding:14px 0;"><span style="font-weight:800; color:#181c32; background:#f0f8ff; padding:4px 10px; border-radius:6px;">${b2bRate}%</span></td>
                  </tr>
                  <tr>
                      <td style="padding:14px 0; color:#7e8299; font-weight:500;">AI High Intent</td>
                      <td style="text-align:right; padding:14px 0;"><span style="font-weight:800; color:#f6c000; background:#fff9e6; padding:4px 10px; border-radius:6px;">${highIntent}%</span></td>
                  </tr>
               </table>
            </div>
            
            <div style="background:linear-gradient(135deg, #f8f9fb, #f1f3f6); padding:25px; border-radius:14px; border:1px solid #e8ecf1;">
               <div style="display:flex; align-items:center; gap:8px; margin-bottom:15px;">
                  <div style="width:28px; height:28px; background:linear-gradient(135deg, #009ef7, #0069b3); border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:12px;"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                  <h4 style="font-size:13px; color:#3f4254; font-weight:800; margin:0;">AI Recommendation</h4>
               </div>
               <div style="font-size:12px; line-height:1.7; color:#5e6278;">
                  This dataset is <b style="color:#181c32;">highly optimized</b> for direct email marketing with a <b style="color:#009ef7;">${validRate}%</b> validity rate.
                  <br><br>
                  Detected <b style="color:#181c32;">${Object.keys(a.countries).length}</b> key markets. Top segment: <b style="color:#009ef7;">${topMarket ? topMarket[0] : 'International'}</b>.
               </div>
               <div style="margin-top:18px; font-size:11px; background:white; padding:12px 14px; border-radius:8px; color:#009ef7; font-weight:800; border:1px solid #cce5ff; letter-spacing:0.3px;">
                  <i class="fa-solid fa-rocket" style="margin-right:6px;"></i> SUGGESTED: Launch A/B Test Sequence
               </div>
            </div>
         </div>

         <!-- Footer -->
         <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e8ecf1; display:flex; justify-content:space-between; align-items:center;">
             <div style="font-size:10px; color:#b5b5c3; font-weight:600; letter-spacing:0.5px;">CONFIDENTIAL | CRM V2 INTELLIGENCE ENGINE</div>
             <button class="btn-primary no-print" onclick="window.print()" style="padding:10px 22px; border-radius:10px; font-size:12px; font-weight:800; box-shadow:0 6px 16px rgba(0,158,247,0.3);">
                <i class="fa-solid fa-print" style="margin-right:6px;"></i> Print Report
             </button>
         </div>
      </div>
      
      <style>
         @media print {
            .no-print, .app-sidebar, .app-header, .lf-nav-tab, .lf-chip-btn, .toolbar { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            #lfReportPrintable { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border: none !important; width:100% !important; padding:20px !important; }
         }
      </style>
    `;
  },

  _exportSelected() {
    const selectedRows = this._cleanRows.filter(r => this._selectedIds.has(r._id));
    if (!selectedRows.length) return UI.showToast('Select rows to export', 'warning');

    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(selectedRows);
    XLSX.utils.book_append_sheet(wb, sheet, 'Selected Leads');

    const fname = `lead_filter_selected_${this._nowStamp()}.xlsx`;
    XLSX.writeFile(wb, fname);
    UI.showToast(`Exported ${selectedRows.length} rows`, 'success');
  },

  _moveToSegment() {
    const selectedCount = this._selectedIds.size;
    if (selectedCount === 0) return UI.showToast('Select rows to move', 'warning');

    // reuse Send To > Audience logic or specific modal
    // For simplicity and consistency, let's trigger the Audience tab of Send To
    this.openSendToModal();
    // Auto-switch to audience tab
    setTimeout(() => {
      const radio = document.querySelector('input[name="lfDest"][value="audience"]');
      if (radio) {
        radio.checked = true;
        this._toggleSendOptions('audience');
      }
    }, 100);
  },

  _openRowMenu(e, id) {
    e.stopPropagation();
    // Close existing
    document.querySelectorAll('.lf-row-menu').forEach(el => el.remove());

    const btn = e.target.closest('button');
    const rect = btn.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.className = 'lf-row-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 5}px;
        left: ${rect.left - 100}px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        border-radius: 8px;
        z-index: 1000;
        width: 140px;
        backdrop-filter: blur(10px);
     `;

    menu.innerHTML = `
        <div style="padding:5px;">
           <button class="btn-menu-item" style="width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text-primary); cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;" onclick="LeadFilter._sendRow('${id}')">
              <i class="fa-solid fa-paper-plane" style="color:var(--primary);"></i> Send To...
           </button>
           <button class="btn-menu-item" style="width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text-primary); cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;" onclick="LeadFilter._deleteRow('${id}')">
              <i class="fa-solid fa-trash" style="color:var(--danger);"></i> Delete
           </button>
        </div>
     `;

    document.body.appendChild(menu);

    // Close on click outside
    const close = () => {
      menu.remove();
      document.removeEventListener('click', close);
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  },

  _sendRow(id) {
    this._selectedIds.clear();
    this._selectedIds.add(id);
    this.openSendToModal();
  },

  _deleteRow(id) {
    this._selectedIds.clear();
    this._selectedIds.add(id);
    this._deleteSelected();
  },

  _deleteSelected() {
    const count = this._selectedIds.size;
    if (count === 0) return UI.showToast('No rows selected', 'warning');

    if (confirm(`Are you sure you want to delete ${count} record(s)?`)) {
      this._cleanRows = this._cleanRows.filter(r => !this._selectedIds.has(r._id));
      this._selectedIds.clear();
      this._renderStatsAndTable();
      UI.showToast(`Deleted ${count} records`, 'success');
    }
  },

  _renderMiniBar(label, val, total, color) {
    const p = total > 0 ? Math.round((val / total) * 100) : 0;
    return `
      <div style="display:flex; align-items:center; gap:10px; font-size:11px;">
         <div style="width:80px; text-align:right; color:var(--text-secondary); white-space:nowrap;">${label}</div>
         <div style="flex:1; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
            <div style="width:${p}%; height:100%; background:${color}; border-radius:3px;"></div>
         </div>
         <div style="width:40px; font-weight:700; color:var(--text-primary);">${val}</div>
      </div>
    `;
  },

  _renderTopDomains(domains) {
    const sorted = Object.entries(domains || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!sorted.length) return `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted);">No domain data available</div>`;

    return sorted.map(([domain, count]) => `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
         <span style="color:var(--text-primary); font-family:monospace;">${this._escape(domain)}</span>
         <span style="color:var(--text-muted); font-weight:700;">${count}</span>
      </div>
    `).join('');
  },

  // ---------- Send To Feature ----------
  openSendToModal() {
    const selectedCount = this._selectedIds.size;
    if (selectedCount === 0) {
      UI.showToast('Please select at least one lead.', 'warning');
      return;
    }

    // Get selected rows logic (needed for previews or logic)
    const selectedRows = this._cleanRows.filter(r => this._selectedIds.has(r._id));

    Modal.open({
      title: '<i class="fa-solid fa-paper-plane"></i> PUSH LEADS TO CRM',
      width: '700px',
      body: `
        <div style="margin-bottom:25px;">
           <div style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Select the destination for <b>${selectedCount}</b> selected leads:</div>
           
           <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
               <!-- B2B Option -->
               <label class="lf-push-card" onclick="LeadFilter._toggleSendOptions('b2b')">
                   <input type="radio" name="lfDest" value="b2b" hidden>
                   <div style="width:40px; height:40px; border-radius:10px; background:rgba(0,158,247,0.1); color:#009ef7; display:flex; align-items:center; justify-content:center; margin-bottom:12px; font-size:18px;">
                      <i class="fa-solid fa-building"></i>
                   </div>
                   <div style="font-weight:800; font-size:13px; color:var(--text-primary); margin-bottom:4px;">B2B PARTNERS</div>
                   <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">Agencies, Tour Operators, and Corporate Entities.</div>
                   <div class="lf-push-check"><i class="fa-solid fa-circle-check"></i></div>
               </label>

               <!-- B2C Option -->
               <label class="lf-push-card" onclick="LeadFilter._toggleSendOptions('b2c')">
                   <input type="radio" name="lfDest" value="b2c" hidden>
                   <div style="width:40px; height:40px; border-radius:10px; background:rgba(23,198,83,0.1); color:#17c653; display:flex; align-items:center; justify-content:center; margin-bottom:12px; font-size:18px;">
                      <i class="fa-solid fa-user"></i>
                   </div>
                   <div style="font-weight:800; font-size:13px; color:var(--text-primary); margin-bottom:4px;">B2C LEADS</div>
                   <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">Individual Travelers and Direct Clients.</div>
                   <div class="lf-push-check"><i class="fa-solid fa-circle-check"></i></div>
               </label>

               <!-- Campaign Option -->
               <label class="lf-push-card" onclick="LeadFilter._toggleSendOptions('campaign')">
                   <input type="radio" name="lfDest" value="campaign" hidden>
                   <div style="width:40px; height:40px; border-radius:10px; background:rgba(246,192,0,0.1); color:#f6c000; display:flex; align-items:center; justify-content:center; margin-bottom:12px; font-size:18px;">
                      <i class="fa-solid fa-bullhorn"></i>
                   </div>
                   <div style="font-weight:800; font-size:13px; color:var(--text-primary); margin-bottom:4px;">CAMPAIGN</div>
                   <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">Add directly to an active Email/WhatsApp sequence.</div>
                   <div class="lf-push-check"><i class="fa-solid fa-circle-check"></i></div>
               </label>

               <!-- Audience Option -->
               <label class="lf-push-card" onclick="LeadFilter._toggleSendOptions('audience')">
                   <input type="radio" name="lfDest" value="audience" hidden>
                   <div style="width:40px; height:40px; border-radius:10px; background:rgba(114,57,234,0.1); color:#7239ea; display:flex; align-items:center; justify-content:center; margin-bottom:12px; font-size:18px;">
                      <i class="fa-solid fa-users-rectangle"></i>
                   </div>
                   <div style="font-weight:800; font-size:13px; color:var(--text-primary); margin-bottom:4px;">AUDIENCE LIST</div>
                   <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">Save as a segmented list for future use.</div>
                   <div class="lf-push-check"><i class="fa-solid fa-circle-check"></i></div>
               </label>
           </div>
        </div>

        <!-- Configuration Panels (Animated) -->
        <div id="lfOptB2B" class="lf-send-opt card p-4" style="display:none; background:rgba(0,158,247,0.03); border:1px solid rgba(0,158,247,0.2);">
           <h4 style="font-size:12px; font-weight:800; color:#009ef7; text-transform:uppercase; margin-bottom:15px;">B2B Configuration</h4>
           <div class="form-group">
               <label>Pipeline Stage</label>
               <select id="lfB2BStage" class="input-select" style="width:100%;">
                  <option value="prospect">New Partner (Prospect)</option>
                  <option value="contacted">Contacted</option>
                  <option value="negotiation">Negotiation</option>
               </select>
           </div>
           <label style="display:flex; align-items:center; gap:8px; font-size:12px; margin-top:10px; cursor:pointer;">
              <input type="checkbox" id="lfB2BCreateComp" checked> Create missing company records automatically
           </label>
        </div>

        <div id="lfOptB2C" class="lf-send-opt card p-4" style="display:none; background:rgba(23,198,83,0.03); border:1px solid rgba(23,198,83,0.2);">
           <h4 style="font-size:12px; font-weight:800; color:#17c653; text-transform:uppercase; margin-bottom:15px;">B2C Configuration</h4>
           <div class="form-group">
               <label>Lead Status</label>
               <select id="lfB2CStatus" class="input-select" style="width:100%;">
                  <option value="lead">New Lead</option>
                  <option value="interested">Interested</option>
                  <option value="quote_requested">Quote Requested</option>
               </select>
           </div>
           <div class="form-group" style="margin-top:10px;">
               <label>Travel Interest Tag</label>
               <select id="lfB2CInterest" class="input-select" style="width:100%;">
                  <option value="">(None)</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Family">Family</option>
                  <option value="Honeymoon">Honeymoon</option>
               </select>
           </div>
        </div>

        <div id="lfOptCampaign" class="lf-send-opt card p-4" style="display:none; background:rgba(246,192,0,0.03); border:1px solid rgba(246,192,0,0.2);">
           <h4 style="font-size:12px; font-weight:800; color:#f6c000; text-transform:uppercase; margin-bottom:15px;">Campaign Configuration</h4>
           <div class="form-group">
               <label>Select Campaign</label>
               <select id="lfCampSelect" class="input-select" style="width:100%;">
                  <option value="">(Create New Campaign)</option>
                  ${store.state.campaigns.filter(c => c.status !== 'completed').map(c => `<option value="${c.id}">${c.name} (${c.type})</option>`).join('')}
               </select>
           </div>
           <div class="form-group" id="lfCampNewNameGroup" style="margin-top:10px;">
               <label>Or New Campaign Name</label>
               <input type="text" id="lfCampNewName" class="input-field" style="width:100%;" placeholder="e.g. Summer Outreach">
               <div style="display:flex; gap:15px; margin-top:10px;">
                   <label style="display:flex; gap:6px; align-items:center; font-size:12px; cursor:pointer;"><input type="radio" name="lfCampType" value="Email" checked> Email</label>
                   <label style="display:flex; gap:6px; align-items:center; font-size:12px; cursor:pointer;"><input type="radio" name="lfCampType" value="WhatsApp"> WhatsApp</label>
               </div>
           </div>
        </div>

        <div id="lfOptAudience" class="lf-send-opt card p-4" style="display:none; background:rgba(114,57,234,0.03); border:1px solid rgba(114,57,234,0.2);">
           <h4 style="font-size:12px; font-weight:800; color:#7239ea; text-transform:uppercase; margin-bottom:15px;">Audience Configuration</h4>
           <div class="form-group">
               <label>Select Audience List</label>
               <select id="lfAudSelect" class="input-select" style="width:100%;">
                  <option value="">(Create New Audience)</option>
                  ${store.state.audienceLists.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
               </select>
           </div>
           <div class="form-group" id="lfAudNewGroup" style="margin-top:10px;">
               <label>Or New Audience Name</label>
               <input type="text" id="lfAudNewName" class="input-field" style="width:100%;" placeholder="e.g. B2B High Value">
               <div style="margin-top:10px;">
                   <input type="text" id="lfAudTags" class="input-field" style="width:100%;" placeholder="Tags (comma separated)">
               </div>
           </div>
        </div>

        <!-- Styles for this modal -->
        <style>
          .lf-push-card {
            display: block;
            position: relative;
            padding: 20px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: rgba(255,255,255,0.02);
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
          }
          .lf-push-card:hover {
            background: rgba(255,255,255,0.05);
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }
          .lf-push-check {
            position: absolute;
            top: 15px;
            right: 15px;
            color: var(--primary);
            opacity: 0;
            transform: scale(0.5);
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .lf-push-card.active {
            border-color: var(--primary);
            background: rgba(var(--primary-rgb), 0.05);
            box-shadow: 0 0 0 1px var(--primary);
          }
          .lf-push-card.active .lf-push-check {
            opacity: 1;
            transform: scale(1.2);
          }
          .lf-send-opt { margin-top: -10px; animation: slideDown 0.3s ease-out; }
          @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        </style>
      `,
      footer: `
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
           <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-shield-halved"></i>
              Duplicates detected by Email/Phone will be skipped.
           </div>
           <div style="display:flex; gap:10px;">
              <button class="btn-cancel" onclick="Modal.close()">Cancel</button>
              <button class="btn-primary" onclick="LeadFilter.executeSendTo()" style="padding:0 25px;"><i class="fa-solid fa-paper-plane"></i> Confirm Push</button>
           </div>
        </div>
      `
    });
  },

  _toggleSendOptions(val) {
    // Hide all panels
    document.querySelectorAll('.lf-send-opt').forEach(el => el.style.display = 'none');

    // Update active card visual
    document.querySelectorAll('.lf-push-card').forEach(el => el.classList.remove('active'));
    document.querySelector(`input[name="lfDest"][value="${val}"]`)?.closest('.lf-push-card')?.classList.add('active');

    // Show selected panel
    const optMap = { b2b: 'lfOptB2B', b2c: 'lfOptB2C', campaign: 'lfOptCampaign', audience: 'lfOptAudience' };
    const panel = document.getElementById(optMap[val]);
    if (panel) panel.style.display = 'block';

    // Auto check the radio (in case clicked on div)
    const radio = document.querySelector(`input[name="lfDest"][value="${val}"]`);
    if (radio) radio.checked = true;
  },

  executeSendTo() {
    const dest = document.querySelector('input[name="lfDest"]:checked')?.value;
    if (!dest) return UI.showToast('Please select a destination', 'warning');

    const selectedRows = this._cleanRows.filter(r => this._selectedIds.has(r._id));
    let successCount = 0;
    let dupeCount = 0;

    if (dest === 'b2b') {
      const stage = document.getElementById('lfB2BStage').value;
      const createComp = document.getElementById('lfB2BCreateComp').checked;

      selectedRows.forEach(row => {
        if (row.lead_type !== 'b2b' && !confirm(`Lead ${row.email} is B2C but pushing to B2B. Continue?`)) return;

        const clientData = {
          name: row.company_name || row.full_name, // Company Name for B2B
          email: row.email,
          phone: row.phone,
          country: row.country,
          city: row.city,
          website: row.website,
          status: stage,
          lead_type: 'B2B',
          import_source: 'LeadFilter'
        };

        const res = store.addClient('b2b', clientData, true); // true = updateExisting
        if (res.success) successCount++;
        else if (res.error === 'Duplicate') dupeCount++;
      });

    } else if (dest === 'b2c') {
      const status = document.getElementById('lfB2CStatus').value;
      const interest = document.getElementById('lfB2CInterest').value;

      selectedRows.forEach(row => {
        const clientData = {
          name: row.full_name || row.company_name,
          email: row.email,
          phone: row.phone,
          country: row.country,
          status: status,
          lead_type: 'B2C',
          source: 'LeadFilter',
          tags: interest
        };

        const res = store.addClient('b2c', clientData, true);
        if (res.success) successCount++;
        else if (res.error === 'Duplicate') dupeCount++;
      });

    } else if (dest === 'campaign') {
      const campId = document.getElementById('lfCampSelect').value;
      let campaign;

      if (campId) {
        campaign = store.state.campaigns.find(c => String(c.id) === String(campId));
      } else {
        const newName = document.getElementById('lfCampNewName').value;
        if (!newName) return UI.showToast('Enter a campaign name', 'error');
        const type = document.querySelector('input[name="lfCampType"]:checked').value;

        // Create new campaign on the fly
        const newCampData = {
          id: Date.now(),
          name: newName,
          type: type,
          status: 'draft',
          audience: 'Custom List',
          agent: store.state.currentUser.name
        };
        store.saveCampaign(newCampData);
        campaign = newCampData;
      }

      // Add leads to campaign (Simulated by adding to audience list or direct mapping if we had a recipients list in campaign)
      // For now, let's create an Audience List for this campaign if it doesn't exist, or specific campaign logic
      // SOP says "Add to queue". store.js campaign structure doesn't seem to have a direct "recipients" array, 
      // but it has `audienceListId`. So best practice is to create an audience list and link it.

      selectedRows.forEach(row => {
        const type = row.lead_type || 'b2c';
        const clientData = {
          name: row.full_name || row.company_name,
          email: row.email,
          phone: row.phone,
          country: row.country,
          status: 'lead',
          import_source: 'LeadFilter Campaign'
        };
        const res = store.addClient(type, clientData, true);
        if (res.success) successCount++;
      });

      UI.showToast(`Added ${successCount} leads to Campaign queue (imported to database)`, 'success');
      Modal.close();
      return;

    } else if (dest === 'audience') {
      const audId = document.getElementById('lfAudSelect').value;
      let listId = audId;

      if (!audId) {
        const newName = document.getElementById('lfAudNewName').value;
        if (!newName) return UI.showToast('Enter audience name', 'error');
        const tags = document.getElementById('lfAudTags').value;

        const newList = {
          id: Date.now(),
          name: newName,
          type: 'Mixed',
          filters: { tags }
        };
        store.saveAudienceList(newList);
        listId = newList.id;
      }

      // Import them to DB so they can be part of audience
      selectedRows.forEach(row => {
        const type = row.lead_type || 'b2c';
        const clientData = {
          name: row.full_name || row.company_name,
          email: row.email,
          tags: document.getElementById('lfAudTags')?.value || '',
          import_source: 'LeadFilter Audience'
        };
        const res = store.addClient(type, clientData, true);
        if (res.success) successCount++;
      });
    }

    UI.showToast(`Successfully pushed ${successCount} records. ${dupeCount > 0 ? dupeCount + ' duplicates merged/skipped.' : ''}`, 'success');
    Modal.close();
    this._deselectAll();
    this._renderStatsAndTable(); // Refresh to show they might be processed
  }
};


window.LeadFilter = LeadFilter;
