// filters.js -- Filter state management, URL params, and filter UI rendering

const Filters = {

  // Read filters from URL search params
  fromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
      status: params.get('status') || null,
      severity: params.get('severity') || null,
      platform: params.get('platform') || null,
      featureArea: params.get('feature') || null,
      assignee: params.get('assignee') || null,
      dateFrom: params.get('from') || null,
      dateTo: params.get('to') || null,
      closed: params.get('closed') || null,
    };
  },

  // Read sort preference from URL
  sortFromURL() {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    if (sort === 'age') return { key: 'ageDays', dir: 'desc' };
    return null;
  },

  // Apply filters to bug array (AND logic)
  apply(bugs, filters) {
    return bugs.filter(bug => {
      // closed=week: show only closed bugs from the last 7 days
      if (filters.closed === 'week') {
        const isClosed = CLOSED_STATUS_TYPES.includes(bug.statusType) || bug.status === 'Released';
        if (!isClosed) return false;
        const closedDate = bug.completedAt || bug.canceledAt;
        if (!closedDate || !Theme.isThisWeek(closedDate)) return false;
      }
      if (filters.status && bug.status !== filters.status) return false;
      if (filters.severity && bug.severity !== filters.severity) return false;
      if (filters.platform && bug.platform !== filters.platform) return false;
      if (filters.featureArea && bug.featureArea !== filters.featureArea) return false;
      if (filters.assignee && bug.assigneeName !== filters.assignee) return false;
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        const created = new Date(bug.createdAt);
        if (created < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        const created = new Date(bug.createdAt);
        if (created > to) return false;
      }
      return true;
    });
  },

  // Build URL with filter params
  toURL(baseHref, filters) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.featureArea) params.set('feature', filters.featureArea);
    if (filters.assignee) params.set('assignee', filters.assignee);
    if (filters.dateFrom) params.set('from', filters.dateFrom);
    if (filters.dateTo) params.set('to', filters.dateTo);
    if (filters.closed) params.set('closed', filters.closed);
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  },

  // Check if any filters are active
  hasActive(filters) {
    return Object.values(filters).some(v => v !== null && v !== '');
  },

  // Count active filters
  activeCount(filters) {
    return Object.values(filters).filter(v => v !== null && v !== '').length;
  },

  // Render removable filter pills
  renderActiveFilters(containerId, filters, onChange) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!this.hasActive(filters)) {
      el.innerHTML = '';
      return;
    }

    const labels = {
      status: 'Status',
      severity: 'Severity',
      platform: 'Platform',
      featureArea: 'Feature Area',
      assignee: 'Assignee',
      dateFrom: 'From',
      dateTo: 'To',
      closed: 'Closed',
    };

    const pills = Object.entries(filters)
      .filter(([, v]) => v !== null && v !== '')
      .map(([key, value]) => `
        <button data-filter-key="${key}"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
          <span class="text-blue-500/60">${labels[key]}:</span>
          ${Theme.escapeHtml(value)}
          <svg class="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      `).join('');

    el.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        ${pills}
        <button id="clear-all-filters" class="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1">Clear all</button>
      </div>
    `;

    // Attach remove handlers
    el.querySelectorAll('[data-filter-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.filterKey;
        const updated = { ...filters, [key]: null };
        onChange(updated);
      });
    });

    document.getElementById('clear-all-filters')?.addEventListener('click', () => {
      onChange({ status: null, severity: null, platform: null, featureArea: null, assignee: null, dateFrom: null, dateTo: null, closed: null });
    });
  },

  // Render filter bar with dropdowns
  renderFilterBar(containerId, bugs, filters, onChange) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Extract unique values from bug data
    const statuses = [...new Set(bugs.map(b => b.status))].sort();
    const severities = SEVERITY_LABELS.filter(s => bugs.some(b => b.severity === s));
    const platforms = PLATFORM_LABELS.filter(p => bugs.some(b => b.platform === p));
    const featureAreas = [...new Set(bugs.map(b => b.featureArea))].filter(f => f !== 'Uncategorized').sort();
    if (bugs.some(b => b.featureArea === 'Uncategorized')) featureAreas.push('Uncategorized');
    const assignees = [...new Set(bugs.map(b => b.assigneeName))].sort();

    function selectHtml(id, label, options, selected) {
      const opts = options.map(o => {
        const count = bugs.filter(b => {
          if (id === 'status') return b.status === o;
          if (id === 'severity') return b.severity === o;
          if (id === 'platform') return b.platform === o;
          if (id === 'featureArea') return b.featureArea === o;
          if (id === 'assignee') return b.assigneeName === o;
          return false;
        }).length;
        return `<option value="${Theme.escapeHtml(o)}" ${selected === o ? 'selected' : ''}>${Theme.escapeHtml(o)} (${count})</option>`;
      }).join('');

      return `
        <div>
          <label class="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">${label}</label>
          <select id="filter-${id}" class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 w-full min-w-[130px]">
            <option value="">All</option>
            ${opts}
          </select>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="flex flex-wrap items-end gap-3">
        ${selectHtml('status', 'Status', statuses, filters.status)}
        ${selectHtml('severity', 'Severity', severities, filters.severity)}
        ${selectHtml('platform', 'Platform', platforms, filters.platform)}
        ${selectHtml('featureArea', 'Feature Area', featureAreas, filters.featureArea)}
        ${selectHtml('assignee', 'Assignee', assignees, filters.assignee)}
        <div>
          <label class="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">From</label>
          <input type="date" id="filter-dateFrom" value="${filters.dateFrom || ''}"
                 class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">To</label>
          <input type="date" id="filter-dateTo" value="${filters.dateTo || ''}"
                 class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
        </div>
      </div>
    `;

    // Attach change handlers
    ['status', 'severity', 'platform', 'featureArea', 'assignee'].forEach(key => {
      document.getElementById(`filter-${key}`)?.addEventListener('change', (e) => {
        onChange({ ...filters, [key]: e.target.value || null });
      });
    });
    ['dateFrom', 'dateTo'].forEach(key => {
      document.getElementById(`filter-${key}`)?.addEventListener('change', (e) => {
        onChange({ ...filters, [key]: e.target.value || null });
      });
    });
  },
};
