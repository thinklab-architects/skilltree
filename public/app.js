const tracksEl = document.getElementById('tracks');
const trackFiltersEl = document.getElementById('trackFilters');
const statusFiltersEl = document.getElementById('statusFilters');
const heroMetricsEl = document.getElementById('heroMetrics');
const miniListEl = document.getElementById('miniList');
const searchInput = document.getElementById('searchInput');
const adminPanel = document.getElementById('adminPanel');
const adminToggle = document.getElementById('adminToggle');
const adminLoginForm = document.getElementById('adminLogin');
const tokenInput = document.getElementById('tokenInput');
const tokenStatus = document.getElementById('tokenStatus');
const moduleSelect = document.getElementById('moduleSelect');
const moduleForm = document.getElementById('moduleForm');
const moduleMessage = document.getElementById('moduleMessage');
const moduleTitle = document.getElementById('moduleTitle');
const moduleTrack = document.getElementById('moduleTrack');
const moduleSummary = document.getElementById('moduleSummary');
const moduleStatusEl = document.getElementById('moduleStatus');
const moduleLevel = document.getElementById('moduleLevel');
const moduleDuration = document.getElementById('moduleDuration');
const moduleTags = document.getElementById('moduleTags');
const moduleHighlight = document.getElementById('moduleHighlight');
const moduleOwner = document.getElementById('moduleOwner');
const linkFields = document.getElementById('linkFields');
const addLinkBtn = document.getElementById('addLink');
const deleteModuleBtn = document.getElementById('deleteModule');
const resetModuleBtn = document.getElementById('resetModule');
const trackForm = document.getElementById('trackForm');
const trackTitle = document.getElementById('trackTitle');
const trackDescription = document.getElementById('trackDescription');
const trackFocus = document.getElementById('trackFocus');
const trackLead = document.getElementById('trackLead');
const trackColor = document.getElementById('trackColor');
const trackMessage = document.getElementById('trackMessage');
const trailMapSvg = document.getElementById('trailMapSvg');
const treeNodes = document.getElementById('treeNodes');
const nodeDrawer = document.getElementById('nodeDrawer');
const drawerClose = document.getElementById('drawerClose');
const drawerTrack = document.getElementById('drawerTrack');
const drawerTitle = document.getElementById('drawerTitle');
const drawerStatus = document.getElementById('drawerStatus');
const drawerSummary = document.getElementById('drawerSummary');
const drawerMeta = document.getElementById('drawerMeta');
const drawerTags = document.getElementById('drawerTags');
const drawerLinks = document.getElementById('drawerLinks');
const listViewBtn = document.getElementById('listViewBtn');
const adminLoginPage = document.getElementById('adminLoginPage');
const adminLoginClose = document.getElementById('adminLoginClose');

const staticMode = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
const dataUrl = staticMode ? 'data/trails.json' : '/api/trails';

const state = {
  data: { tracks: [], tutorials: [] },
  filters: { status: 'all', search: '', track: 'all' },
  adminToken: sessionStorage.getItem('adminToken') || '',
  selectedModuleId: null
};

const statusLabels = {
  ready: 'Ready',
  'in-review': 'In review',
  draft: 'Draft'
};

const statusClasses = {
  ready: 'status-ready',
  'in-review': 'status-in-review',
  draft: 'status-draft'
};

const statusColors = {
  ready: '#4ade80',
  'in-review': '#fbbf24',
  draft: '#a5b4fc',
  default: '#8ea8c4'
};

async function loadData() {
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    state.data = data;
    renderFilters();
    renderTracks();
    renderMetrics();
    fillAdminSelects();
    renderMap();
  } catch (err) {
    console.error('Failed to load trails data', err);
    tracksEl.innerHTML = '<p class="hint">Unable to load data. If you are on GitHub Pages, ensure data/trails.json is present.</p>';
  }
}

function renderFilters() {
  if (!trackFiltersEl) return;
  trackFiltersEl.innerHTML = '';
  const allBtn = createChip('All tracks', 'all', state.filters.track === 'all');
  trackFiltersEl.appendChild(allBtn);
  state.data.tracks.forEach(track => {
    const btn = createChip(track.title, track.id, state.filters.track === track.id);
    btn.style.borderColor = track.color;
    btn.style.color = track.color;
    trackFiltersEl.appendChild(btn);
  });
}

function createChip(label, value, active) {
  const btn = document.createElement('button');
  btn.className = `chip${active ? ' active' : ''}`;
  btn.dataset.value = value;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    state.filters.track = value;
    renderFilters();
    renderTracks();
    renderMap();
  });
  return btn;
}

function renderMetrics() {
  if (!heroMetricsEl || !miniListEl) return;
  const { tutorials } = state.data;
  const ready = tutorials.filter(t => t.status === 'ready').length;
  const review = tutorials.filter(t => t.status === 'in-review').length;
  const draft = tutorials.filter(t => t.status === 'draft').length;
  heroMetricsEl.innerHTML = `
    <div class="metric"><div class="label">Tutorials</div><div class="value">${tutorials.length}</div></div>
    <div class="metric"><div class="label">Ready</div><div class="value">${ready}</div></div>
    <div class="metric"><div class="label">In review</div><div class="value">${review}</div></div>
    <div class="metric"><div class="label">Draft</div><div class="value">${draft}</div></div>
  `;
  const featured = [...tutorials]
    .sort((a, b) => statusScore(a.status) - statusScore(b.status))
    .slice(0, 4);
  miniListEl.innerHTML = featured.map(item => `
    <li class="mini-item">
      <div>
        <div class="title">${item.title}</div>
        <div class="tag">${statusLabels[item.status] || item.status} &middot; ${item.duration || 'time tbd'}</div>
      </div>
      <span class="status-dot ${statusClasses[item.status] || ''}">${statusLabels[item.status] || item.status}</span>
    </li>
  `).join('');
}

function renderTracks() {
  if (!tracksEl) return;
  const filtered = applyFilters();
  tracksEl.innerHTML = '';
  state.data.tracks.forEach(track => {
    const tutorials = filtered.filter(t => t.trackId === track.id);
    const card = document.createElement('article');
    card.className = 'track-card';
    card.innerHTML = `
      <div class="track-header">
        <div>
          <p class="eyebrow">${track.focus || 'Practice focus'}</p>
          <h3>${track.title}</h3>
        </div>
        <div class="pill-sm" style="border-color:${track.color}; color:${track.color};">Lead · ${track.lead || 'TBD'}</div>
      </div>
      <p class="trail-summary">${track.description || ''}</p>
      <ul class="trail-list">
        ${tutorials.map(t => renderTutorial(t, track)).join('')}
      </ul>
    `;
    tracksEl.appendChild(card);
  });
}

function renderMap() {
  if (!trailMapSvg || !treeNodes) return;
  const tracks = state.data.tracks;
  const tutorials = state.data.tutorials;
  if (!tracks.length) {
    trailMapSvg.innerHTML = '';
    treeNodes.innerHTML = '<p class="hint">No data.</p>';
    return;
  }
  const stage = document.getElementById('mapSection');
  const width = stage ? stage.clientWidth : treeNodes.clientWidth || 960;
  const height = Math.max(stage ? stage.clientHeight : 520, 520);
  treeNodes.style.height = `${height}px`;
  trailMapSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  trailMapSvg.innerHTML = '';
  treeNodes.innerHTML = '';
  const matches = new Set(applyFilters().map(item => item.id));
  const columnSpacing = width / (tracks.length + 1);
  const connectors = [];
  tracks.forEach((track, index) => {
    const modules = tutorials.filter(t => t.trackId === track.id);
    const spacing = modules.length ? height / (modules.length + 1) : height / 2;
    modules.forEach((module, idx) => {
      const x = columnSpacing * (index + 1);
      const y = spacing * (idx + 1);
      if (idx < modules.length - 1) {
        const nextY = spacing * (idx + 2);
        connectors.push({ x1: x, y1: y, x2: x, y2: nextY, color: track.color, bend: idx % 2 === 0 ? 1 : -1 });
      }
      createNode(module, track, x, y, matches.has(module.id));
    });
  });
  const ns = 'http://www.w3.org/2000/svg';
  connectors.forEach(conn => {
    const path = document.createElementNS(ns, 'path');
    const controlOffset = 90;
    const controlX = conn.x1 + controlOffset * (conn.bend || 1);
    const middleY = (conn.y1 + conn.y2) / 2;
    const d = `M ${conn.x1} ${conn.y1} C ${controlX} ${middleY}, ${controlX} ${middleY}, ${conn.x2} ${conn.y2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', conn.color || 'rgba(255,255,255,0.25)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.35');
    trailMapSvg.appendChild(path);
  });
}

function createNode(module, track, x, y, isMatch) {
  const node = document.createElement('button');
  node.className = 'tree-node';
  if (!isMatch) node.classList.add('dimmed');
  if (state.selectedModuleId === module.id) node.classList.add('active');
  node.style.left = `${x - 80}px`;
  node.style.top = `${y - 32}px`;
  node.innerHTML = `<strong>${module.title}</strong><span>${track.title}</span>`;
  node.addEventListener('click', () => openDrawer(module.id));
  treeNodes.appendChild(node);
}

function renderTutorial(tutorial, track) {
  const statusClass = statusClasses[tutorial.status] || '';
  const link = tutorial.links && tutorial.links[0];
  const tags = (tutorial.tags || []).slice(0, 4);
  return `
    <li class="trail-item" style="border-color:${track.color}33;">
      <div class="trail-body">
        <div class="trail-title">${tutorial.title}</div>
        <div class="trail-summary">${tutorial.summary || ''}</div>
        <div class="tag-row">
          <span class="pill-sm status-dot ${statusClass}">${statusLabels[tutorial.status] || tutorial.status}</span>
          ${tutorial.level ? `<span class="pill-sm">${tutorial.level}</span>` : ''}
          ${tutorial.duration ? `<span class="pill-sm">${tutorial.duration}</span>` : ''}
          ${tutorial.owner ? `<span class="pill-sm">Owner · ${tutorial.owner}</span>` : ''}
        </div>
        ${tutorial.highlight ? `<p class="hint">${tutorial.highlight}</p>` : ''}
        ${tags.length ? `<div class="tag-row">${tags.map(tag => `<span class="pill-sm">#${tag}</span>`).join('')}</div>` : ''}
      </div>
      <div class="trail-body" style="align-items:flex-end; gap:8px;">
        <span class="status-dot ${statusClass}">${statusLabels[tutorial.status] || tutorial.status}</span>
        ${link ? `<a class="resource-link" href="${link.url}" target="_blank" rel="noreferrer">Open ${link.label}</a>` : ''}
      </div>
    </li>
  `;
}

function openDrawer(moduleId) {
  const module = state.data.tutorials.find(t => t.id === moduleId);
  if (!module || !nodeDrawer) return;
  const track = state.data.tracks.find(t => t.id === module.trackId) || {};
  state.selectedModuleId = moduleId;
  drawerTrack.textContent = track.title || 'Practice module';
  drawerTitle.textContent = module.title || '';
  drawerStatus.textContent = `${statusLabels[module.status] || module.status || 'draft'} · ${module.duration || 'time tbd'}`;
  drawerSummary.textContent = module.summary || 'No summary yet.';
  const metaParts = [];
  if (module.owner) metaParts.push(`<span class="pill-sm">Owner · ${module.owner}</span>`);
  if (module.level) metaParts.push(`<span class="pill-sm">${module.level}</span>`);
  if (module.highlight) metaParts.push(`<span class="pill-sm">${module.highlight}</span>`);
  drawerMeta.innerHTML = metaParts.join('');
  drawerTags.innerHTML = (module.tags || []).map(tag => `<span class="pill-sm">#${tag}</span>`).join('');
  drawerLinks.innerHTML = (module.links || []).map(link => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label || 'Open resource'}</a>`).join('');
  nodeDrawer.classList.add('open');
  renderMap();
}

function closeDrawer() {
  if (!nodeDrawer) return;
  nodeDrawer.classList.remove('open');
  state.selectedModuleId = null;
  renderMap();
}

function applyFilters() {
  const term = state.filters.search.toLowerCase();
  return state.data.tutorials.filter(t => {
    const statusOk = state.filters.status === 'all' ? true : t.status === state.filters.status;
    const trackOk = state.filters.track === 'all' ? true : t.trackId === state.filters.track;
    const text = `${t.title} ${t.summary} ${(t.tags || []).join(' ')} ${t.owner || ''}`.toLowerCase();
    const searchOk = !term || text.includes(term);
    return statusOk && trackOk && searchOk;
  });
}

function statusScore(status) {
  switch (status) {
    case 'ready': return 0;
    case 'in-review': return 1;
    case 'draft': return 2;
    default: return 3;
  }
}

function setupStatusFilters() {
  if (!statusFiltersEl) return;
  statusFiltersEl.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters.status = btn.dataset.status;
      statusFiltersEl.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('active', chip === btn);
      });
      renderTracks();
      renderMap();
    });
  });
}

function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener('input', e => {
    state.filters.search = e.target.value;
    renderTracks();
    renderMap();
  });
}

function setupCTA() {
  if (listViewBtn) {
    listViewBtn.addEventListener('click', () => {
      document.querySelector('.filters')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function setupAdmin() {
  if (!tokenInput || !tokenStatus) return;
  tokenInput.value = state.adminToken;
  updateTokenStatus();
  hideAdminPanel();
  if (!staticMode && state.adminToken) {
    showAdminPanel();
  }
  if (adminToggle) {
    adminToggle.addEventListener('click', () => openAdminLogin(true));
  }
  if (adminLoginClose) {
    adminLoginClose.addEventListener('click', () => closeAdminLogin());
  }
  if (staticMode) {
    lockAdminUI();
    return;
  }
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', handleAdminLogin);
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const submitted = tokenInput.value.trim();
  if (!submitted) {
    updateTokenStatus('Please enter your ADMIN_TOKEN.');
    return;
  }
  state.adminToken = submitted;
  sessionStorage.setItem('adminToken', state.adminToken);
  updateTokenStatus('Token saved. Unlocking editor...');
  closeAdminLogin();
  showAdminPanel();
}

function updateTokenStatus(message) {
  if (!tokenStatus) return;
  tokenStatus.textContent = message
    ? message
    : (state.adminToken ? 'Token ready. Close this dialog to edit.' : 'Enter your ADMIN_TOKEN to unlock editing.');
}

function openAdminLogin(focusInput = false) {
  if (!adminLoginPage) return;
  adminLoginPage.classList.add('open');
  adminLoginPage.setAttribute('aria-hidden', 'false');
  if (focusInput && tokenInput && !tokenInput.disabled) {
    setTimeout(() => tokenInput.focus(), 200);
  }
}

function closeAdminLogin() {
  if (!adminLoginPage) return;
  adminLoginPage.classList.remove('open');
  adminLoginPage.setAttribute('aria-hidden', 'true');
}

function showAdminPanel() {
  if (!adminPanel) return;
  adminPanel.classList.remove('hidden');
  setTimeout(() => adminPanel.scrollIntoView({ behavior: 'smooth' }), 150);
}

function hideAdminPanel() {
  if (!adminPanel) return;
  adminPanel.classList.add('hidden');
}

function lockAdminUI() {
  hideAdminPanel();
  updateTokenStatus('Admin editing is disabled on this static build. Clone the repo and run the server to edit.');
  if (tokenInput) tokenInput.disabled = true;
  if (adminLoginForm) {
    const submitBtn = adminLoginForm.querySelector('button');
    if (submitBtn) submitBtn.disabled = true;
  }
}

function setupModuleSelect() {
  if (!moduleSelect) return;
  moduleSelect.addEventListener('change', e => {
    const id = e.target.value;
    if (id === 'new') {
      resetModuleForm();
    } else {
      hydrateModuleForm(id);
    }
  });
}

function fillAdminSelects() {
  if (!moduleTrack || !moduleSelect) return;
  moduleTrack.innerHTML = state.data.tracks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  const options = ['<option value="new">New module</option>']
    .concat(state.data.tutorials.map(t => `<option value="${t.id}">${t.title}</option>`));
  moduleSelect.innerHTML = options.join('');
}

function resetModuleForm() {
  if (!moduleSelect) return;
  moduleSelect.value = 'new';
  moduleTitle.value = '';
  moduleSummary.value = '';
  moduleStatusEl.value = 'draft';
  moduleLevel.value = '';
  moduleDuration.value = '';
  moduleTags.value = '';
  moduleHighlight.value = '';
  moduleOwner.value = '';
  moduleTrack.selectedIndex = 0;
  renderLinkFields([]);
  moduleMessage.textContent = 'Editing new module.';
}

function hydrateModuleForm(moduleId) {
  const module = state.data.tutorials.find(t => t.id === moduleId);
  if (!module) {
    resetModuleForm();
    return;
  }
  moduleTitle.value = module.title || '';
  moduleSummary.value = module.summary || '';
  moduleStatusEl.value = module.status || 'draft';
  moduleLevel.value = module.level || '';
  moduleDuration.value = module.duration || '';
  moduleTags.value = (module.tags || []).join(', ');
  moduleHighlight.value = module.highlight || '';
  moduleOwner.value = module.owner || '';
  moduleTrack.value = module.trackId || state.data.tracks[0]?.id || '';
  renderLinkFields(module.links || []);
  moduleMessage.textContent = `Editing ${module.title}`;
}

function renderLinkFields(links) {
  if (!linkFields) return;
  linkFields.innerHTML = '';
  const list = links.length ? links : [{ label: '', url: '' }];
  list.forEach(link => addLinkField(link));
}

function addLinkField(link = { label: '', url: '' }) {
  const row = document.createElement('div');
  row.className = 'link-fields';
  row.innerHTML = `
    <input placeholder="Label" value="${link.label || ''}" class="link-label">
    <input placeholder="https://..." value="${link.url || ''}" class="link-url">
    <button type="button" class="remove">Remove</button>
  `;
  row.querySelector('.remove').addEventListener('click', () => row.remove());
  linkFields.appendChild(row);
}

function collectLinks() {
  return [...linkFields.querySelectorAll('.link-fields')]
    .map(row => {
      const label = row.querySelector('.link-label').value.trim();
      const url = row.querySelector('.link-url').value.trim();
      return label || url ? { label, url } : null;
    })
    .filter(Boolean);
}

async function saveModule(e) {
  e.preventDefault();
  if (!state.adminToken) {
    moduleMessage.textContent = 'Add an admin token before saving.';
    return;
  }
  const id = moduleSelect.value;
  const payload = {
    title: moduleTitle.value.trim(),
    trackId: moduleTrack.value,
    summary: moduleSummary.value.trim(),
    status: moduleStatusEl.value,
    level: moduleLevel.value.trim(),
    duration: moduleDuration.value.trim(),
    tags: moduleTags.value.split(',').map(t => t.trim()).filter(Boolean),
    links: collectLinks(),
    highlight: moduleHighlight.value.trim(),
    owner: moduleOwner.value.trim()
  };
  const isNew = id === 'new';
  const url = isNew ? '/api/tutorials' : `/api/tutorials/${id}`;
  const method = isNew ? 'POST' : 'PUT';
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': state.adminToken
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    moduleMessage.textContent = `Save failed: ${res.status}`;
    return;
  }
  moduleMessage.textContent = 'Saved.';
  await loadData();
  if (isNew) {
    resetModuleForm();
  } else {
    moduleSelect.value = id;
    hydrateModuleForm(id);
  }
}

async function deleteModule() {
  const id = moduleSelect.value;
  if (id === 'new') {
    moduleMessage.textContent = 'Pick a module to delete.';
    return;
  }
  if (!state.adminToken) {
    moduleMessage.textContent = 'Add an admin token before deleting.';
    return;
  }
  const res = await fetch(`/api/tutorials/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': state.adminToken }
  });
  if (!res.ok) {
    moduleMessage.textContent = `Delete failed: ${res.status}`;
    return;
  }
  moduleMessage.textContent = 'Deleted.';
  await loadData();
  resetModuleForm();
}

async function saveTrack(e) {
  e.preventDefault();
  if (!state.adminToken) {
    trackMessage.textContent = 'Add an admin token before saving.';
    return;
  }
  const payload = {
    title: trackTitle.value.trim(),
    description: trackDescription.value.trim(),
    focus: trackFocus.value.trim(),
    lead: trackLead.value.trim(),
    color: trackColor.value
  };
  const res = await fetch('/api/tracks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': state.adminToken
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    trackMessage.textContent = `Save failed: ${res.status}`;
    return;
  }
  trackMessage.textContent = 'Track added.';
  trackForm.reset();
  trackColor.value = '#4bffaa';
  await loadData();
}

function setupAdminForms() {
  if (staticMode) return;
  moduleForm.addEventListener('submit', saveModule);
  deleteModuleBtn.addEventListener('click', deleteModule);
  resetModuleBtn.addEventListener('click', resetModuleForm);
  addLinkBtn.addEventListener('click', () => addLinkField());
  trackForm.addEventListener('submit', saveTrack);
}

function init() {
  setupStatusFilters();
  setupSearch();
  setupAdmin();
  setupModuleSelect();
  setupAdminForms();
  setupCTA();
  resetModuleForm();
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (nodeDrawer) nodeDrawer.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
  loadData();
}

window.addEventListener('resize', () => renderMap());
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nodeDrawer?.classList.contains('open')) {
    closeDrawer();
  }
});
init();
