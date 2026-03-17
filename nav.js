// nav.js -- Left sidebar navigation for Bug Dashboard

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`, href: 'index.html' },
  { id: 'bugs', label: 'All Bugs', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`, href: 'bugs.html' },
  { id: 'trends', label: 'Trends', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>`, href: 'trends.html' },
  { id: 'mobile', label: 'Mobile App', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`, href: 'mobile.html' },
];

function initNav() {
  const root = document.getElementById('nav-root');
  if (!root) return;

  const currentPage = window.CURRENT_PAGE || 'dashboard';
  const lastRefresh = getLastRefreshTime();
  const openCount = window.KPIS?.totalOpen ?? '--';

  const navHtml = `
    <aside id="sidebar" class="fixed left-0 top-0 h-full w-[260px] bg-slate-900 border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 -translate-x-full">
      <!-- Header -->
      <div class="p-5 border-b border-slate-800">
        <h1 class="text-slate-100 font-semibold text-base">Bug Dashboard</h1>
        <p class="text-slate-500 text-xs mt-0.5 font-mono">Linear KPI Tracker</p>
      </div>

      <!-- Nav Links -->
      <nav class="flex-1 py-3 overflow-y-auto">
        ${NAV_ITEMS.map(item => {
          if (item.id === 'separator') {
            return `<div class="mx-5 my-2 border-t border-slate-800/80"></div>`;
          }
          const active = currentPage === item.id;
          return `
            <a href="${item.href}"
               class="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${active
                 ? 'text-slate-100 bg-slate-800/50 border-l-2 border-blue-400'
                 : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-l-2 border-transparent'}">
              ${item.icon}
              <span>${item.label}</span>
            </a>
          `;
        }).join('')}
      </nav>

      <!-- Quick Stats -->
      <div class="p-4 border-t border-slate-800 space-y-2">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="text-slate-500">Open Bugs</div>
          <div class="text-slate-300 font-mono text-right">${openCount}</div>
          <div class="text-slate-500">Last Refresh</div>
          <div class="text-slate-300 font-mono text-right">${lastRefresh ? Theme.relativeTime(new Date(lastRefresh).toISOString()) : 'Never'}</div>
        </div>
        <div class="flex items-center gap-1.5 text-xs mt-2">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          <span class="text-green-400">Connected (read-only)</span>
        </div>
      </div>
    </aside>

    <!-- Mobile hamburger -->
    <button id="nav-toggle" class="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>

    <!-- Mobile overlay -->
    <div id="nav-overlay" class="lg:hidden fixed inset-0 bg-black/50 z-40 hidden"></div>
  `;

  root.innerHTML = navHtml;

  // Mobile toggle
  const toggle = document.getElementById('nav-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('nav-overlay');

  if (toggle && sidebar && overlay) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      overlay.classList.toggle('hidden');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    });
  }
}

function updateNavStats() {
  // Call after data refresh to update sidebar stats
  initNav();
}

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', initNav);
