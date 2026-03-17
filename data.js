// data.js -- Linear GraphQL client, caching, bug normalization, KPI computation

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const API_KEY_STORAGE = 'linear-bug-dash-api-key';
const CACHE_KEY_PREFIX = 'linear-bug-dash-cache-';
const TREND_STORAGE = 'linear-bug-dash-trends';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── API Key Management ───────────────────────────────────────────────

function getApiKey() { return localStorage.getItem(API_KEY_STORAGE); }
function hasApiKey() { return !!getApiKey(); }
function setApiKey(key) { localStorage.setItem(API_KEY_STORAGE, key); }
function clearApiKey() { localStorage.removeItem(API_KEY_STORAGE); }

// ─── Cache Layer ──────────────────────────────────────────────────────

function getCacheTTL() {
  const custom = localStorage.getItem('linear-bug-dash-cache-ttl');
  return custom ? parseInt(custom, 10) * 60 * 1000 : DEFAULT_CACHE_TTL;
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > getCacheTTL()) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Cache write failed (localStorage full?):', e);
  }
}

function clearAllCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_KEY_PREFIX)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

function getLastRefreshTime() {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + 'all-bugs');
    if (!raw) return null;
    return JSON.parse(raw).timestamp;
  } catch { return null; }
}

// ─── GraphQL Executor ─────────────────────────────────────────────────

async function linearQuery(query, variables = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key configured');

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401) throw new Error('Invalid API key');
  if (response.status === 429) throw new Error('Rate limited -- please wait a moment');
  if (!response.ok) throw new Error(`Linear API error: ${response.status}`);

  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data;
}

// ─── Test Connection ──────────────────────────────────────────────────

async function testConnection() {
  const data = await linearQuery(`query { viewer { id name email } organization { name urlKey } }`);
  return {
    user: data.viewer.name,
    email: data.viewer.email,
    org: data.organization.name,
    orgKey: data.organization.urlKey,
  };
}

// ─── GraphQL Queries ──────────────────────────────────────────────────

const FETCH_BUGS_QUERY = `
  query FetchBugs($after: String) {
    issues(
      filter: {
        labels: { name: { eq: "Bug" } }
      }
      first: 100
      after: $after
      orderBy: createdAt
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        description
        priority
        priorityLabel
        createdAt
        updatedAt
        completedAt
        canceledAt
        url
        state {
          name
          type
          color
        }
        assignee {
          id
          name
          displayName
          avatarUrl
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        cycle {
          id
          name
          number
        }
        project {
          id
          name
        }
        parent {
          id
          identifier
        }
      }
    }
  }
`;

// ─── Label Parsing ────────────────────────────────────────────────────
// Labels sourced from Linear workspace (maestroinc), grouped by parent:
//   Severity:       S0-Critical, S1-Major, S2-Moderate, S3-Minor
//   Team:           Mobile App, Command Center, Points
//   Mobile Feature: Flight Search
//   Mobile OS:      Android, iOS
//   Type:           Bug, Feature, feature-request, HotFix, Improvement, New Issue
//   Source:         UAT Feedback

const SEVERITY_LABELS = ['S0-Critical', 'S1-Major', 'S2-Moderate', 'S3-Minor'];
const PLATFORM_LABELS = ['Mobile App', 'Command Center', 'Points'];
const OS_LABELS = ['Android', 'iOS'];
const TYPE_LABELS = ['Bug', 'Feature', 'feature-request', 'HotFix', 'Improvement', 'New Issue'];
const SOURCE_LABELS = ['UAT Feedback'];

// All "infrastructure" labels -- anything NOT in this list is treated as a feature area
const KNOWN_NON_FEATURE_LABELS = [
  ...SEVERITY_LABELS, ...PLATFORM_LABELS, ...OS_LABELS, ...TYPE_LABELS, ...SOURCE_LABELS,
];

function parseBugLabels(issue) {
  const labels = issue.labels.nodes.map(l => l.name);

  // Feature area = any label that isn't a known infrastructure label
  const featureLabels = labels.filter(l => !KNOWN_NON_FEATURE_LABELS.includes(l));

  return {
    severity: labels.find(l => SEVERITY_LABELS.includes(l)) || null,
    platform: labels.find(l => PLATFORM_LABELS.includes(l)) || 'Unknown',
    featureArea: featureLabels.length > 0 ? featureLabels[0] : 'Uncategorized',
    os: labels.find(l => OS_LABELS.includes(l)) || null,
    source: labels.includes('UAT Feedback') ? 'UAT' : null,
    allLabels: labels,
  };
}

// ─── Bug Normalization ────────────────────────────────────────────────

function normalizeBug(issue) {
  const labels = parseBugLabels(issue);
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description || '',
    status: issue.state.name,
    statusType: issue.state.type,
    statusColor: issue.state.color,
    severity: labels.severity,
    platform: labels.platform,
    featureArea: labels.featureArea,
    source: labels.source,
    allLabels: labels.allLabels,
    assigneeId: issue.assignee?.id || null,
    assigneeName: issue.assignee?.displayName || issue.assignee?.name || 'Unassigned',
    assigneeAvatar: issue.assignee?.avatarUrl || null,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    completedAt: issue.completedAt,
    canceledAt: issue.canceledAt,
    url: issue.url,
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    cycleName: issue.cycle?.name || null,
    cycleNumber: issue.cycle?.number || null,
    projectName: issue.project?.name || null,
    parentIdentifier: issue.parent?.identifier || null,
    ageDays: Theme.daysSince(issue.createdAt),
  };
}

// ─── Paginated Fetch ──────────────────────────────────────────────────

async function fetchAllBugs() {
  // Check cache first
  const cached = getCache('all-bugs');
  if (cached) return cached;

  let allBugs = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data = await linearQuery(FETCH_BUGS_QUERY, { after: cursor });
    const issues = data.issues;
    allBugs.push(...issues.nodes.map(normalizeBug));
    hasNextPage = issues.pageInfo.hasNextPage;
    cursor = issues.pageInfo.endCursor;
  }

  // Cache the result
  setCache('all-bugs', allBugs);
  return allBugs;
}

// ─── KPI Computation ──────────────────────────────────────────────────

const CLOSED_STATUS_TYPES = ['completed', 'canceled'];

function isClosedStatus(bug) {
  return CLOSED_STATUS_TYPES.includes(bug.statusType) || bug.status === 'Released';
}

function groupBy(arr, key) {
  const groups = {};
  arr.forEach(item => {
    const val = item[key] || 'Unknown';
    if (!groups[val]) groups[val] = [];
    groups[val].push(item);
  });
  return groups;
}

function computeKPIs(bugs) {
  // Only count parent tickets (exclude sub-issues to avoid double-counting)
  const parents = bugs.filter(b => !b.parentIdentifier);
  const openBugs = parents.filter(b => !isClosedStatus(b));
  const closedBugs = parents.filter(b => isClosedStatus(b));

  const totalAgeOpen = openBugs.reduce((sum, b) => sum + b.ageDays, 0);

  return {
    total: parents.length,
    totalOpen: openBugs.length,
    totalClosed: closedBugs.length,
    addedRecent: parents.filter(b => b.status === 'New Issue' && Theme.isLast24Hours(b.createdAt)).length,
    closedThisWeek: closedBugs.filter(b => Theme.isThisWeek(b.completedAt || b.canceledAt)).length,
    avgAgeDays: openBugs.length > 0 ? Math.round(totalAgeOpen / openBugs.length) : 0,

    byStatus: groupBy(parents, 'status'),
    bySeverity: groupBy(parents, 'severity'),
    byPlatform: groupBy(parents, 'platform'),
    byFeatureArea: groupBy(parents, 'featureArea'),
    byAssignee: groupBy(parents, 'assigneeName'),

    openByStatus: groupBy(openBugs, 'status'),
    openBySeverity: groupBy(openBugs, 'severity'),
    openByPlatform: groupBy(openBugs, 'platform'),
    openByFeatureArea: groupBy(openBugs, 'featureArea'),
    openByAssignee: groupBy(openBugs, 'assigneeName'),
  };
}

// ─── Trend Snapshots ──────────────────────────────────────────────────

function saveTrendSnapshot(kpis) {
  try {
    const trends = getTrendData();
    const today = new Date().toISOString().slice(0, 10);

    // Update or add today's snapshot
    const existing = trends.findIndex(t => t.date === today);
    const snapshot = {
      date: today,
      totalOpen: kpis.totalOpen,
      totalClosed: kpis.totalClosed,
      addedToday: kpis.addedRecent,
      bySeverity: {
        'S0-Critical': (kpis.openBySeverity['S0-Critical'] || []).length,
        'S1-Major': (kpis.openBySeverity['S1-Major'] || []).length,
        'S2-Moderate': (kpis.openBySeverity['S2-Moderate'] || []).length,
        'S3-Minor': (kpis.openBySeverity['S3-Minor'] || []).length,
      },
    };

    if (existing >= 0) {
      trends[existing] = snapshot;
    } else {
      trends.push(snapshot);
    }

    // Keep last 90 days max
    const cutoff = trends.length > 90 ? trends.length - 90 : 0;
    localStorage.setItem(TREND_STORAGE, JSON.stringify(trends.slice(cutoff)));
  } catch (e) {
    console.warn('Trend snapshot save failed:', e);
  }
}

function getTrendData() {
  try {
    const raw = localStorage.getItem(TREND_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Main Refresh ─────────────────────────────────────────────────────

async function refreshData(forceRefresh = false) {
  if (forceRefresh) clearAllCache();

  const bugs = await fetchAllBugs();
  const kpis = computeKPIs(bugs);

  window.BUGS = bugs;
  window.KPIS = kpis;

  saveTrendSnapshot(kpis);

  return { bugs, kpis };
}

// ─── Filtered KPIs (for platform-specific dashboards) ─────────────────

function computeFilteredKPIs(bugs, filters = {}) {
  let filtered = [...bugs];
  if (filters.platform) filtered = filtered.filter(b => b.platform === filters.platform);
  if (filters.featureArea) filtered = filtered.filter(b => b.featureArea === filters.featureArea);
  const kpis = computeKPIs(filtered);
  kpis.flightBugs = filtered.filter(b => !b.parentIdentifier && b.featureArea === 'Flight Search');
  kpis.flightBugsOpen = kpis.flightBugs.filter(b => !isClosedStatus(b));
  return kpis;
}

// ─── Sprint / Cycle Data ──────────────────────────────────────────────

const FETCH_ACTIVE_CYCLE_QUERY = `
  query FetchActiveCycle {
    cycles(filter: { isActive: { eq: true } }, first: 5, orderBy: createdAt) {
      nodes {
        id
        name
        number
        startsAt
        endsAt
      }
    }
  }
`;

const FETCH_CYCLE_ISSUES_QUERY = `
  query FetchCycleIssues($cycleId: String, $after: String) {
    issues(
      filter: { cycle: { id: { eq: $cycleId } } }
      first: 100
      after: $after
      orderBy: updatedAt
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        identifier
        title
        priority
        priorityLabel
        createdAt
        updatedAt
        completedAt
        canceledAt
        url
        estimate
        state { name type color }
        assignee { id name displayName avatarUrl }
        labels { nodes { id name color } }
        parent { id identifier }
      }
    }
  }
`;

async function fetchActiveCycle() {
  const cached = getCache('active-cycle');
  if (cached) return cached;

  const data = await linearQuery(FETCH_ACTIVE_CYCLE_QUERY);
  const cycles = data.cycles.nodes;
  if (cycles.length === 0) return null;

  // Pick the first active cycle
  const cycle = cycles[0];
  setCache('active-cycle', cycle);
  return cycle;
}

function normalizeSprintIssue(issue) {
  const labels = issue.labels.nodes.map(l => l.name);
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.state.name,
    statusType: issue.state.type,
    statusColor: issue.state.color,
    assigneeName: issue.assignee?.displayName || issue.assignee?.name || 'Unassigned',
    assigneeAvatar: issue.assignee?.avatarUrl || null,
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    estimate: issue.estimate || 0,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    completedAt: issue.completedAt,
    canceledAt: issue.canceledAt,
    url: issue.url,
    parentIdentifier: issue.parent?.identifier || null,
    allLabels: labels,
    isBug: labels.includes('Bug'),
  };
}

async function fetchCycleIssues(cycleId) {
  const cacheKey = 'cycle-' + cycleId;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  let allIssues = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data = await linearQuery(FETCH_CYCLE_ISSUES_QUERY, { cycleId, after: cursor });
    const issues = data.issues;
    allIssues.push(...issues.nodes.map(normalizeSprintIssue));
    hasNextPage = issues.pageInfo.hasNextPage;
    cursor = issues.pageInfo.endCursor;
  }

  setCache(cacheKey, allIssues);
  return allIssues;
}

// Kanban column grouping
const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog', statuses: ['New Issue', 'Backlog', 'Triage', 'Grooming'] },
  { id: 'ready', label: 'Ready for Dev', statuses: ['Ready for Design', 'Ready for Development'] },
  { id: 'in-dev', label: 'In Development', statuses: ['In Development', 'Code Review', 'PR Review'] },
  { id: 'dev-done', label: 'Dev Complete', statuses: ['Development Complete'] },
  { id: 'qa', label: 'QA', statuses: ['Ready for QA', 'QA In Progress'] },
  { id: 'uat', label: 'UAT', statuses: ['Ready for UAT', 'UAT In Progress', 'Ready for Production'] },
  { id: 'done', label: 'Done', statuses: ['Released', 'Done'] },
];

const BLOCKED_STATUSES = ['On Hold', 'Blocked', 'Cannot Reproduce', 'Reopen'];

function computeSprintKPIs(issues) {
  const parents = issues.filter(i => !i.parentIdentifier);
  const total = parents.length;
  const done = parents.filter(i => ['Released', 'Done'].includes(i.status) || i.statusType === 'completed').length;
  const inProgress = parents.filter(i => i.statusType === 'started').length;
  const blocked = parents.filter(i => BLOCKED_STATUSES.includes(i.status)).length;
  const totalEstimate = parents.reduce((s, i) => s + i.estimate, 0);
  const doneEstimate = parents.filter(i => ['Released', 'Done'].includes(i.status) || i.statusType === 'completed').reduce((s, i) => s + i.estimate, 0);

  return {
    total, done, inProgress, blocked,
    completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
    totalEstimate, doneEstimate,
    pointsPct: totalEstimate > 0 ? Math.round((doneEstimate / totalEstimate) * 100) : 0,
    byAssignee: groupBy(parents, 'assigneeName'),
  };
}
