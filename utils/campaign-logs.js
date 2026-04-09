/**
 * Campaign Logs V2 - Per-recipient tracking for campaigns
 * Stores sending status, opens, clicks for each recipient
 */

const CampaignLogs = {
    STORAGE_KEY: 'pm_crm_campaign_logs',
    MAX_LOGS: 5000,

    /**
     * Log a campaign send to a recipient
     */
    logSend(campaignId, recipientEmail, recipientName, status = 'sent') {
        const entry = {
            id: `${campaignId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            campaignId,
            recipientEmail,
            recipientName,
            status, // sent, delivered, bounced, failed
            sentAt: new Date().toISOString(),
            openedAt: null,
            clickedAt: null,
            repliedAt: null,
            unsubscribedAt: null
        };

        this._addLog(entry);
        return entry;
    },

    /**
     * Update log status (opened, clicked, etc.)
     */
    updateStatus(logId, field, timestamp = null) {
        const logs = this.getAll();
        const log = logs.find(l => l.id === logId);
        if (log) {
            log[field] = timestamp || new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        }
    },

    /**
     * Mark as opened
     */
    markOpened(logId) {
        this.updateStatus(logId, 'openedAt');
    },

    /**
     * Mark as clicked
     */
    markClicked(logId) {
        this.updateStatus(logId, 'clickedAt');
    },

    /**
     * Get all logs
     */
    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    },

    /**
     * Get logs for a specific campaign
     */
    getByCampaign(campaignId) {
        return this.getAll().filter(l => l.campaignId === campaignId);
    },

    /**
     * Get campaign stats summary
     */
    getStats(campaignId) {
        const logs = this.getByCampaign(campaignId);
        return {
            sent: logs.length,
            delivered: logs.filter(l => l.status === 'delivered' || l.status === 'sent').length,
            bounced: logs.filter(l => l.status === 'bounced').length,
            failed: logs.filter(l => l.status === 'failed').length,
            opened: logs.filter(l => l.openedAt).length,
            clicked: logs.filter(l => l.clickedAt).length,
            replied: logs.filter(l => l.repliedAt).length,
            unsubscribed: logs.filter(l => l.unsubscribedAt).length,
            openRate: logs.length > 0 ? Math.round((logs.filter(l => l.openedAt).length / logs.length) * 100) : 0,
            clickRate: logs.length > 0 ? Math.round((logs.filter(l => l.clickedAt).length / logs.length) * 100) : 0
        };
    },

    /**
     * Add log entry
     */
    _addLog(entry) {
        const logs = this.getAll();
        logs.unshift(entry);

        if (logs.length > this.MAX_LOGS) {
            logs.length = this.MAX_LOGS;
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    },

    /**
     * Render recipient logs in a modal
     */
    showLogs(campaignId) {
        const logs = this.getByCampaign(campaignId);
        const campaign = store.state.campaigns?.find(c => c.id === campaignId) || { name: 'Campaign' };

        Modal.open({
            title: `<i class="fa-solid fa-list-check"></i> Recipient Logs: ${campaign.name}`,
            width: '700px',
            body: `
                <div style="max-height:400px; overflow-y:auto;">
                    ${logs.length === 0 ? '<div style="text-align:center; padding:40px; color:var(--text-muted);">No recipient logs yet</div>' : ''}
                    <table class="data-table" style="font-size:11px;">
                        <thead>
                            <tr>
                                <th>Recipient</th>
                                <th>Status</th>
                                <th>Sent</th>
                                <th>Opened</th>
                                <th>Clicked</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td>
                                        <div style="font-weight:600;">${log.recipientName || 'Unknown'}</div>
                                        <div style="font-size:10px; color:var(--text-muted);">${log.recipientEmail}</div>
                                    </td>
                                    <td><span class="status-badge status-${log.status}">${log.status.toUpperCase()}</span></td>
                                    <td style="font-size:10px;">${log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}</td>
                                    <td style="font-size:10px; color:${log.openedAt ? 'var(--success)' : 'var(--text-muted)'};">
                                        ${log.openedAt ? new Date(log.openedAt).toLocaleString() : '-'}
                                    </td>
                                    <td style="font-size:10px; color:${log.clickedAt ? 'var(--primary)' : 'var(--text-muted)'};">
                                        ${log.clickedAt ? new Date(log.clickedAt).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `,
            footer: `
                <button class="btn-export" onclick="CampaignLogs.exportLogs('${campaignId}')"><i class="fa-solid fa-download"></i> Export</button>
                <button class="btn-primary" onclick="Modal.close()">Close</button>
            `
        });
    },

    /**
     * Export logs as CSV
     */
    exportLogs(campaignId) {
        const logs = this.getByCampaign(campaignId);
        const headers = ['Email', 'Name', 'Status', 'Sent At', 'Opened At', 'Clicked At'];
        const rows = logs.map(l => [
            l.recipientEmail,
            l.recipientName,
            l.status,
            l.sentAt,
            l.openedAt || '',
            l.clickedAt || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign_${campaignId}_logs.csv`;
        a.click();
        URL.revokeObjectURL(url);

        UI.showToast('Logs exported', 'success');
    }
};

// Expose globally
window.CampaignLogs = CampaignLogs;
