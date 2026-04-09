
const AI = {
    getScore(item) {
        // Mock scoring logic based on item properties
        let score = 70;
        if (item.status === 'blacklisted') score = 5;
        if (item.status === 'repeat') score = 95;
        if (item.category === 'DMC') score += 10;
        return Math.min(Math.max(score, 0), 100);
    },
    getBadge(score) {
        let color = 'var(--text-muted)';
        let icon = 'fa-sparkles';
        if (score >= 80) {
            color = 'var(--success)';
            icon = 'fa-star';
        } else if (score >= 50) {
            color = 'var(--primary)';
            icon = 'fa-bolt';
        }

        return `<span style="font-size:10px; color:${color}; font-weight:700; display:flex; align-items:center; gap:4px;">
            <i class="fa-solid ${icon}"></i> AI Score: ${score}%
        </span>`;
    }
};

window.AI = AI;
