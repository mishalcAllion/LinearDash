// charts.js -- Pure CSS/JS chart renderers (no external libraries)

const Charts = {

  // ─── Donut Chart (CSS conic-gradient) ─────────────────────────────

  donut(containerId, segments, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const size = options.size || 180;
    const hole = options.hole || 0.6;
    const total = segments.reduce((s, seg) => s + seg.value, 0);

    if (total === 0) {
      el.innerHTML = `<div class="flex flex-col items-center justify-center" style="height:${size}px"><span class="text-slate-600 text-sm">No data</span></div>`;
      return;
    }

    // Build conic-gradient stops
    let gradientStops = [];
    let cumulative = 0;
    segments.forEach(seg => {
      if (seg.value === 0) return;
      const start = (cumulative / total) * 100;
      cumulative += seg.value;
      const end = (cumulative / total) * 100;
      gradientStops.push(`${seg.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    });

    // If only one segment, fill full circle
    if (gradientStops.length === 0) {
      gradientStops.push('#334155 0% 100%');
    }

    const gradient = `conic-gradient(${gradientStops.join(', ')})`;
    const innerSize = size * hole;

    // Legend
    const legend = segments.filter(s => s.value > 0).map(seg => {
      const pct = ((seg.value / total) * 100).toFixed(0);
      const clickAttr = seg.onClick ? `onclick="${seg.onClick}" class="cursor-pointer hover:bg-slate-800/50 rounded transition-colors"` : '';
      return `
        <div ${clickAttr} class="flex items-center gap-2 px-2 py-1 text-xs">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${seg.color}"></span>
          <span class="text-slate-400 flex-1">${seg.label}</span>
          <span class="text-slate-300 font-mono">${seg.value}</span>
          <span class="text-slate-600 font-mono">${pct}%</span>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <div class="relative" style="width:${size}px;height:${size}px;">
          <div class="w-full h-full rounded-full" style="background:${gradient}"></div>
          <div class="absolute rounded-full bg-slate-900 flex flex-col items-center justify-center"
               style="width:${innerSize}px;height:${innerSize}px;top:${(size-innerSize)/2}px;left:${(size-innerSize)/2}px;">
            <span class="text-2xl font-semibold font-mono text-slate-100">${total}</span>
            <span class="text-[10px] text-slate-500 uppercase tracking-wider">${options.centerLabel || 'Total'}</span>
          </div>
        </div>
        <div class="w-full">${legend}</div>
      </div>
    `;
  },

  // ─── Horizontal Bar Chart ─────────────────────────────────────────

  hbar(containerId, items, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (items.length === 0) {
      el.innerHTML = `<div class="text-slate-600 text-sm py-4 text-center">No data</div>`;
      return;
    }

    const maxValue = Math.max(...items.map(i => i.value), 1);
    const showPct = options.showPercentage !== false;
    const total = items.reduce((s, i) => s + i.value, 0);

    const rows = items.map(item => {
      const width = Math.max(2, (item.value / maxValue) * 100);
      const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
      const clickAttr = item.href ? `onclick="window.location.href='${item.href}'"` : '';
      const cursorClass = item.href ? 'cursor-pointer hover:bg-slate-800/30' : '';

      return `
        <div ${clickAttr} class="flex items-center gap-3 py-1.5 px-1 rounded transition-colors ${cursorClass}">
          <div class="w-28 flex-shrink-0 text-xs text-slate-400 truncate" title="${Theme.escapeHtml(item.label)}">${Theme.escapeHtml(item.label)}</div>
          <div class="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width:${width}%;background:${item.color || '#3b82f6'}"></div>
          </div>
          <div class="w-8 text-right text-xs font-mono text-slate-300">${item.value}</div>
          ${showPct ? `<div class="w-10 text-right text-xs font-mono text-slate-600">${pct}%</div>` : ''}
        </div>
      `;
    }).join('');

    el.innerHTML = rows;
  },

  // ─── Stacked Horizontal Bar ───────────────────────────────────────

  stackedBar(containerId, segments, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) {
      el.innerHTML = `<div class="h-6 bg-slate-800 rounded-full"></div>`;
      return;
    }

    const bars = segments.filter(s => s.value > 0).map((seg, i) => {
      const width = ((seg.value / total) * 100).toFixed(2);
      const roundedLeft = i === 0 ? 'rounded-l-full' : '';
      const roundedRight = i === segments.filter(s => s.value > 0).length - 1 ? 'rounded-r-full' : '';
      return `<div class="h-full ${roundedLeft} ${roundedRight} relative group" style="width:${width}%;background:${seg.color}" title="${seg.label}: ${seg.value}">
        <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">${seg.label}: ${seg.value}</div>
      </div>`;
    }).join('');

    el.innerHTML = `<div class="h-${options.height || 6} flex rounded-full overflow-hidden">${bars}</div>`;
  },

  // ─── Sparkline (vertical bar mini-chart) ──────────────────────────

  sparkline(containerId, values, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const height = options.height || 32;
    const color = options.color || '#3b82f6';

    if (!values || values.length === 0) {
      el.innerHTML = `<div style="height:${height}px" class="flex items-end text-slate-700 text-xs">--</div>`;
      return;
    }

    const maxVal = Math.max(...values, 1);
    const barWidth = Math.max(2, Math.min(8, Math.floor(80 / values.length)));
    const gap = 1;

    const bars = values.map((v, i) => {
      const h = Math.max(1, (v / maxVal) * height);
      return `<div style="width:${barWidth}px;height:${h}px;background:${color};margin-left:${i > 0 ? gap : 0}px" class="rounded-t-sm flex-shrink-0"></div>`;
    }).join('');

    el.innerHTML = `<div class="flex items-end" style="height:${height}px">${bars}</div>`;
  },

  // ─── Vertical Bar Chart (for trends) ──────────────────────────────

  vbar(containerId, items, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const height = options.height || 160;

    if (items.length === 0) {
      el.innerHTML = `<div class="text-slate-600 text-sm py-4 text-center" style="height:${height}px">No data</div>`;
      return;
    }

    const maxValue = Math.max(...items.map(i => Math.max(i.value, i.value2 || 0)), 1);
    const barWidth = Math.max(12, Math.min(40, Math.floor((el.offsetWidth || 600) / items.length) - 8));

    const bars = items.map(item => {
      const h1 = Math.max(1, (item.value / maxValue) * (height - 24));
      const h2 = item.value2 !== undefined ? Math.max(1, ((item.value2 || 0) / maxValue) * (height - 24)) : 0;

      return `
        <div class="flex flex-col items-center gap-0.5" style="width:${barWidth + 4}px">
          <div class="flex items-end gap-0.5" style="height:${height - 24}px">
            <div class="rounded-t-sm" style="width:${h2 ? barWidth/2 : barWidth}px;height:${h1}px;background:${item.color || '#3b82f6'}" title="${item.label}: ${item.value}"></div>
            ${h2 ? `<div class="rounded-t-sm" style="width:${barWidth/2}px;height:${h2}px;background:${item.color2 || '#22c55e'}" title="${item.label}: ${item.value2}"></div>` : ''}
          </div>
          <div class="text-[9px] font-mono text-slate-600 truncate w-full text-center">${item.label}</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `<div class="flex items-end justify-center gap-1 overflow-x-auto">${bars}</div>`;
  },

  // ─── Stacked Vertical Bar Chart ─────────────────────────────────
  // Each bar is a stack of colored segments (e.g., severity breakdown per day)

  stackedVbar(containerId, items, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const height = options.height || 160;
    const segmentColors = options.colors || ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    const segmentLabels = options.labels || [];

    if (items.length === 0) {
      el.innerHTML = `<div class="text-slate-600 text-sm py-4 text-center" style="height:${height}px">No data</div>`;
      return;
    }

    // Each item: { label, segments: [v0, v1, v2, v3] }
    const maxTotal = Math.max(...items.map(i => i.segments.reduce((s, v) => s + v, 0)), 1);
    const barWidth = Math.max(16, Math.min(40, Math.floor((el.offsetWidth || 600) / items.length) - 8));

    const bars = items.map(item => {
      const total = item.segments.reduce((s, v) => s + v, 0);
      const segs = item.segments.map((v, i) => {
        if (v === 0) return '';
        const h = Math.max(1, (v / maxTotal) * (height - 24));
        return `<div class="w-full" style="height:${h}px;background:${segmentColors[i]}" title="${segmentLabels[i] || ''}: ${v}"></div>`;
      }).reverse().join('');

      return `
        <div class="flex flex-col items-center" style="width:${barWidth + 4}px">
          <div class="text-[9px] font-mono text-slate-500 mb-0.5">${total}</div>
          <div class="flex flex-col w-full rounded-t-sm overflow-hidden" style="height:${height - 24}px;justify-content:flex-end">
            ${segs}
          </div>
          <div class="text-[9px] font-mono text-slate-600 mt-0.5 truncate w-full text-center">${item.label}</div>
        </div>
      `;
    }).join('');

    // Legend
    const legend = segmentLabels.map((label, i) => `
      <span class="flex items-center gap-1 text-[10px] text-slate-400"><span class="w-2 h-2 rounded-full" style="background:${segmentColors[i]}"></span>${label}</span>
    `).join('');

    el.innerHTML = `
      <div class="flex items-end justify-center gap-1 overflow-x-auto">${bars}</div>
      <div class="flex items-center justify-center gap-4 mt-3">${legend}</div>
    `;
  },
};
