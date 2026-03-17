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
      openOnly: params.get('open') || null,
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
      // openOnly: reject closed bugs
      if (filters.openOnly) {
        const isClosed = CLOSED_STATUS_TYPES.includes(bug.statusType) || bug.status === 'Released';
        if (isClosed) return false;
      }
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
    if (filters.openOnly) params.set('open', filters.openOnly);
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

  // Map a label name to its filter key
  labelToFilterKey(labelName) {
    if (SEVERITY_LABELS.includes(labelName)) return { key: 'severity', value: labelName };
    if (PLATFORM_LABELS.includes(labelName)) return { key: 'platform', value: labelName };
    if (TYPE_LABELS.includes(labelName)) return null;
    if (SOURCE_LABELS.includes(labelName)) return null;
    if (OS_LABELS.includes(labelName)) return null;
    return { key: 'featureArea', value: labelName };
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
      openOnly: 'Open Only',
    };

    const pills = Object.entries(filters)
      .filter(([, v]) => v !== null && v !== '')
      .map(([key, value]) => {
        const display = key === 'openOnly' ? '' : `: ${Theme.escapeHtml(value)}`;
        return `
          <button data-filter-key="${key}"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
            <span class="text-blue-500/60">${labels[key]}</span>${display}
            <svg class="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        `;
      }).join('');

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
      onChange({ status: null, severity: null, platform: null, featureArea: null, assignee: null, dateFrom: null, dateTo: null, closed: null, openOnly: null });
    });
  },

  // Render compact pill-style filter bar
  renderFilterBar(containerId, bugs, filters, onChange) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Extract unique values + counts
    function getOptions(key) {
      const map = {};
      bugs.forEach(b => {
        let val;
        if (key === 'status') val = b.status;
        else if (key === 'severity') val = b.severity;
        else if (key === 'platform') val = b.platform;
        else if (key === 'featureArea') val = b.featureArea;
        else if (key === 'assignee') val = b.assigneeName;
        if (val) map[val] = (map[val] || 0) + 1;
      });
      // Sort: severity/platform use predefined order, others alphabetical
      let keys;
      if (key === 'severity') keys = SEVERITY_LABELS.filter(s => map[s]);
      else if (key === 'platform') keys = PLATFORM_LABELS.filter(p => map[p]);
      else keys = Object.keys(map).sort();
      return keys.map(k => ({ value: k, count: map[k] }));
    }

    const filterDefs = [
      { key: 'status', label: 'Status' },
      { key: 'severity', label: 'Severity' },
      { key: 'platform', label: 'Platform' },
      { key: 'featureArea', label: 'Feature' },
      { key: 'assignee', label: 'Assignee' },
    ];

    const pillsHtml = filterDefs.map(def => {
      const selected = filters[def.key];
      const active = !!selected;
      const displayLabel = active ? Theme.escapeHtml(selected) : def.label;
      const pillClass = active
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600';

      return `
        <div class="relative filter-dropdown">
          <button data-dropdown="${def.key}"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${pillClass}">
            ${displayLabel}
            <svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div class="dropdown-panel absolute top-full left-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 hidden">
            <div class="p-1 max-h-64 overflow-y-auto"></div>
          </div>
        </div>
      `;
    }).join('');

    // Date range pill
    const hasDateFilter = filters.dateFrom || filters.dateTo;
    const dateClass = hasDateFilter
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600';
    const datePillHtml = `
      <div class="relative filter-dropdown">
        <button data-dropdown="dates"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${dateClass}">
          ${hasDateFilter ? 'Date Range' : 'Dates'}
          <svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <div class="dropdown-panel absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 hidden">
          <div class="p-3 space-y-2">
            <div>
              <label class="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">From</label>
              <input type="date" id="filter-dateFrom" value="${filters.dateFrom || ''}"
                     class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
            </div>
            <div>
              <label class="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">To</label>
              <input type="date" id="filter-dateTo" value="${filters.dateTo || ''}"
                     class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
            </div>
          </div>
        </div>
      </div>
    `;

    el.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        ${pillsHtml}
        ${datePillHtml}
      </div>
    `;

    // Populate dropdown option panels
    filterDefs.forEach(def => {
      const options = getOptions(def.key);
      const panel = el.querySelector(`[data-dropdown="${def.key}"]`)
        ?.closest('.filter-dropdown')?.querySelector('.dropdown-panel > div');
      if (!panel) return;

      const allBtn = `<button data-value="" class="w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${!filters[def.key] ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300 hover:bg-slate-800'}">All</button>`;
      const optBtns = options.map(o => {
        const isActive = filters[def.key] === o.value;
        return `<button data-value="${Theme.escapeHtml(o.value)}" class="w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300 hover:bg-slate-800'}">
          <span>${Theme.escapeHtml(o.value)}</span>
          <span class="text-slate-600 font-mono text-[10px]">${o.count}</span>
        </button>`;
      }).join('');

      panel.innerHTML = allBtn + optBtns;

      // Attach click handlers on options
      panel.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = btn.dataset.value || null;
          onChange({ ...filters, [def.key]: val });
        });
      });
    });

    // Toggle dropdowns on pill click
    el.querySelectorAll('[data-dropdown]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.closest('.filter-dropdown');
        const panel = parent.querySelector('.dropdown-panel');
        const isOpen = !panel.classList.contains('hidden');

        // Close all other dropdowns
        el.querySelectorAll('.dropdown-panel').forEach(p => p.classList.add('hidden'));

        if (!isOpen) panel.classList.remove('hidden');
      });
    });

    // Click-outside-to-close
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        el.querySelectorAll('.dropdown-panel').forEach(p => p.classList.add('hidden'));
      }
    });

    // Date change handlers
    ['dateFrom', 'dateTo'].forEach(key => {
      document.getElementById(`filter-${key}`)?.addEventListener('change', (e) => {
        onChange({ ...filters, [key]: e.target.value || null });
      });
    });
  },
};
