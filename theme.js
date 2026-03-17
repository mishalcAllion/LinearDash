// theme.js -- Tailwind config + utility functions for Bug Dashboard

tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        }
      }
    }
  }
};

const Theme = {
  // Severity colors (labels from Linear: Severity parent group)
  severityColor(severity) {
    const map = {
      'S0-Critical': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500', hex: '#ef4444', ring: 'ring-red-500/20' },
      'S1-Major':    { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500', hex: '#f97316', ring: 'ring-orange-500/20' },
      'S2-Moderate': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', hex: '#f59e0b', ring: 'ring-amber-500/20' },
      'S3-Minor':    { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-500', hex: '#22c55e', ring: 'ring-green-500/20' },
    };
    return map[severity] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', hex: '#64748b', ring: 'ring-slate-500/20' };
  },

  // Status colors (all 24 statuses from Linear MAE team)
  statusColor(status) {
    const map = {
      // Backlog type
      'New Issue':              { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500', hex: '#6366f1' },
      // Unstarted type
      'Backlog':                { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', hex: '#64748b' },
      'Triage':                 { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500', hex: '#a855f7' },
      'Ready for Design':       { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-500', hex: '#ec4899' },
      'Ready for Development':  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500', hex: '#3b82f6' },
      'Grooming':               { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-500', hex: '#d946ef' },
      // Started type
      'In Development':         { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500', hex: '#06b6d4' },
      'Code Review':            { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-500', hex: '#0ea5e9' },
      'PR Review':              { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-400', hex: '#38bdf8' },
      'Development Complete':   { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-500', hex: '#14b8a6' },
      'Ready for QA':           { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500', hex: '#eab308' },
      'QA In Progress':         { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/30', dot: 'bg-lime-500', hex: '#84cc16' },
      'Ready for UAT':          { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', hex: '#10b981' },
      'UAT In Progress':        { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400', hex: '#34d399' },
      'Ready for Production':   { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/30', dot: 'bg-green-400', hex: '#4ade80' },
      'Reopen':                 { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500', hex: '#f97316' },
      // Completed type
      'Released':               { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-500', hex: '#22c55e' },
      'Done':                   { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-600', hex: '#16a34a' },
      // Canceled type
      'Duplicate':              { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/30', dot: 'bg-stone-500', hex: '#78716c' },
      'Canceled':               { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500', hex: '#ef4444' },
      // Blocked/hold
      'On Hold':                { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500', hex: '#f43f5e' },
      'Blocked':                { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-400', hex: '#f87171' },
      'Cannot Reproduce':       { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', dot: 'bg-zinc-500', hex: '#71717a' },
    };
    return map[status] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', hex: '#64748b' };
  },

  // Platform colors (labels from Linear: Team parent group)
  platformColor(platform) {
    const map = {
      'Mobile App':       { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500', hex: '#06b6d4' },
      'Command Center':   { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-500', hex: '#8b5cf6' },
      'Points':           { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', hex: '#f59e0b' },
    };
    return map[platform] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', hex: '#64748b' };
  },

  // Badge HTML generators
  severityBadge(severity) {
    if (!severity) return '<span class="text-slate-600 text-xs">--</span>';
    const c = this.severityColor(severity);
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border ${c.bg} ${c.text} ${c.border}"><span class="w-1.5 h-1.5 rounded-full ${c.dot}"></span>${severity}</span>`;
  },

  statusBadge(status) {
    if (!status) return '';
    const c = this.statusColor(status);
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${c.bg} ${c.text} ${c.border}"><span class="w-1.5 h-1.5 rounded-full ${c.dot}"></span>${status}</span>`;
  },

  platformBadge(platform) {
    if (!platform || platform === 'Unknown') return '<span class="text-slate-600 text-xs">--</span>';
    const c = this.platformColor(platform);
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${c.bg} ${c.text} ${c.border}">${platform}</span>`;
  },

  // Generic label badge using Linear's hex color
  labelBadge(name, hexColor) {
    if (!name) return '';
    const hex = hexColor || '#64748b';
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border" style="color:${hex};background:${hex}15;border-color:${hex}40"><span class="w-1.5 h-1.5 rounded-full" style="background:${hex}"></span>${this.escapeHtml(name)}</span>`;
  },

  // Date formatting
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },

  relativeTime(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return this.formatDate(dateStr);
  },

  daysSince(dateStr) {
    if (!dateStr) return 0;
    const now = new Date();
    const d = new Date(dateStr);
    return Math.floor((now - d) / 86400000);
  },

  isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  },

  isLast24Hours(dateStr) {
    if (!dateStr) return false;
    return (new Date() - new Date(dateStr)) < 24 * 60 * 60 * 1000;
  },

  isThisWeek(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo && d <= now;
  },

  // Escape HTML
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Truncate text
  truncate(str, len = 60) {
    if (!str || str.length <= len) return str || '';
    return str.substring(0, len) + '...';
  }
};
