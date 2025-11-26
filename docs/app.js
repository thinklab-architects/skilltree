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
const treeViewport = document.getElementById('treeViewport');
const treeLines = document.getElementById('treeLines');
const treeNodes = document.getElementById('treeNodes');
const listViewBtn = document.getElementById('listViewBtn');
const nodeDrawer = document.getElementById('nodeDrawer');
const drawerClose = document.getElementById('drawerClose');
const drawerTrack = document.getElementById('drawerTrack');
const drawerTitle = document.getElementById('drawerTitle');
const drawerStatus = document.getElementById('drawerStatus');
const drawerSummary = document.getElementById('drawerSummary');
const drawerMeta = document.getElementById('drawerMeta');
const drawerTags = document.getElementById('drawerTags');
const drawerLinks = document.getElementById('drawerLinks');
const adminLoginPage = document.getElementById('adminLoginPage');
const adminLoginClose = document.getElementById('adminLoginClose');

const dataUrl = window.location.protocol === 'file:' || window.location.hostname.includes('github.io')
  ? 'data/trails.json'
  : '/api/trails';

const state = {
  data: { tracks: [], tutorials: [] },
  filters: { status: 'all', search: '', track: 'all' },
  adminToken: null,
  selectedModuleId: null
};

const panState = {
  x: 0,
  y: 0,
  originX: 0,
  originY: 0,
  startX: 0,
  startY: 0,
  active: false
};

const statusLabels = {
  ready: 'Ready',
  'in-review': 'In review',
  draft: 'Draft'
};

async function loadData() {
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    state.data = await res.json();
    renderFilters();
    renderTracks();
    renderMetrics();
    fillAdminSelects();
    renderTree();
  } catch (err) {
    console.error('Failed to load trails data', err);
    if (tracksEl) {
      tracksEl.innerHTML = '<p class="hint">Unable to load data. Ensure data/trails.json exists.</p>';
    }
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
    renderTree();
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
    .sort((a, b) => scoreStatus(a.status) - scoreStatus(b.status))
    .slice(0, 4);
  miniListEl.innerHTML = featured.map(item => `
    <li class="mini-item">
      <div>
        <div class="title">${item.title}</div>
        <div class="tag">${statusLabels[item.status] || item.status} · ${item.duration || 'time tbd'}</div>
      </div>
      <span class="status-dot ${statusClass(item.status)}">${statusLabels[item.status] || item.status}</span>
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

function renderTutorial(tutorial, track) {
  const status = statusLabels[tutorial.status] || tutorial.status;
  const link = tutorial.links && tutorial.links[0];
  const tags = (tutorial.tags || []).slice(0, 4);
  return `
    <li class="trail-item">
      <div class="trail-body">
        <div class="trail-title">${tutorial.title}</div>
        <div class="trail-summary">${tutorial.summary || ''}</div>
        <div class="tag-row">
          <span class="pill-sm status-dot ${statusClass(tutorial.status)}">${status}</span>
          ${tutorial.level ? `<span class="pill-sm">${tutorial.level}</span>` : ''}
          ${tutorial.duration ? `<span class="pill-sm">${tutorial.duration}</span>` : ''}
          ${tutorial.owner ? `<span class="pill-sm">Owner · ${tutorial.owner}</span>` : ''}
        </div>
        ${tutorial.highlight ? `<p class="hint">${tutorial.highlight}</p>` : ''}
        ${tags.length ? `<div class="tag-row">${tags.map(tag => `<span class="pill-sm">#${tag}</span>`).join('')}</div>` : ''}
      </div>
      <div class="trail-body" style="align-items:flex-end; gap:8px;">
        <span class="status-dot ${statusClass(tutorial.status)}">${status}</span>
        ${link ? `<a class="resource-link" href="${link.url}" target="_blank" rel="noreferrer">Open ${link.label}</a>` : ''}
      </div>
    </li>
  `;
}

function renderTree() {
  if (!treeViewport || !treeLines || !treeNodes) return;
  const tracks = state.data.tracks;
  const tutorials = state.data.tutorials;
  const filteredSet = new Set(applyFilters().map(t => t.id));
  const columnSpacing = 220;
  const verticalSpacing = 150;
  const viewportWidth = treeViewport.clientWidth || 960;
  const viewportHeight = treeViewport.clientHeight || 600;
  const width = Math.max((tracks.length + 2) * columnSpacing, viewportWidth);
  const maxPerTrack = Math.max(...tracks.map(track => tutorials.filter(t => t.trackId === track.id).length), 1);
  const height = Math.max((maxPerTrack + 3) * verticalSpacing, viewportHeight);
  treeLines.setAttribute('viewBox', `0 0 ${width} ${height}`);
  treeLines.setAttribute('width', width);
  treeLines.setAttribute('height', height);
  treeNodes.style.width = `${width}px`;
  treeNodes.style.height = `${height}px`;
  treeLines.innerHTML = '';
  treeNodes.innerHTML = '';

  const root = { id: 'root', title: 'Skill Trails', subtitle: 'Start here', x: width / 2, y: 70 };
  createNodeElement(root, null, true, true);

  const connectors = [];
  tracks.forEach((track, idx) => {
    const modules = tutorials.filter(t => t.trackId === track.id);
    const columnX = columnSpacing + idx * columnSpacing;
    if (!modules.length) {
      connectors.push({
        x1: root.x,
        y1: root.y + 20,
        x2: columnX,
        y2: root.y + 140,
        color: track.color || '#ffb347',
        bend: idx % 2 === 0 ? 1 : -1
      });
      return;
    }
    modules.forEach((module, modIdx) => {
      const y = 160 + modIdx * verticalSpacing;
      if (modIdx === 0) {
        connectors.push({
          x1: root.x,
          y1: root.y + 20,
          x2: columnX,
          y2: y - 40,
          color: track.color || '#ffb347',
          bend: idx % 2 === 0 ? 1 : -1
        });
      } else {
        const prevY = 160 + (modIdx - 1) * verticalSpacing;
        connectors.push({
          x1: columnX,
          y1: prevY + 30,
          x2: columnX,
          y2: y - 30,
          color: track.color || '#ffb347',
          bend: modIdx % 2 === 0 ? 1 : -1
        });
      }
      const match = filteredSet.has(module.id);
      createNodeElement({
        id: module.id,
        title: module.title,
        subtitle: track.title,
        x: columnX,
        y
      }, track, false, match);
    });
  });

  drawConnectors(connectors);
  applyPan();
}

function createNodeElement(entry, track, isRoot = false, visible = true) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'tree-node';
  if (isRoot) node.classList.add('root-node');
  if (!visible && !isRoot) node.classList.add('dimmed');
  if (!isRoot && state.selectedModuleId === entry.id) node.classList.add('active');
  node.style.left = `${entry.x - 95}px`;
  node.style.top = `${entry.y - 26}px`;
  node.innerHTML = isRoot
    ? `<strong>${entry.title}</strong><span>${entry.subtitle}</span>`
    : `<strong>${entry.title}</strong><span>${track?.title || ''}</span>`;
  if (!isRoot) {
    node.addEventListener('click', () => openDrawer(entry.id));
  } else {
    node.disabled = true;
  }
  treeNodes.appendChild(node);
}

function drawConnectors(connectors) {
  const ns = 'http://www.w3.org/2000/svg';
  connectors.forEach(conn => {
    const path = document.createElementNS(ns, 'path');
    const bend = conn.bend || 1;
    const controlX = conn.x1 + 120 * bend;
    const midY = (conn.y1 + conn.y2) / 2;
    const d = `M ${conn.x1} ${conn.y1} C ${controlX} ${midY}, ${controlX} ${midY}, ${conn.x2} ${conn.y2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', conn.color || 'rgba(0,0,0,0.2)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.35');
    treeLines.appendChild(path);
  });
}

function openDrawer(moduleId) {
  const module = state.data.tutorials.find(t => t.id === moduleId);
  if (!module || !nodeDrawer) return;
  const track = state.data.tracks.find(t => t.id === module.trackId);
  state.selectedModuleId = moduleId;
  drawerTrack.textContent = track?.title || 'Practice module';
  drawerTitle.textContent = module.title || '';
  drawerStatus.textContent = `${statusLabels[module.status] || module.status || 'Draft'} · ${module.duration || 'time tbd'}`;
  drawerSummary.textContent = module.summary || 'No summary yet.';
  const metaItems = [];
  if (module.owner) metaItems.push(`<span class="pill-sm">Owner · ${module.owner}</span>`);
  if (module.level) metaItems.push(`<span class="pill-sm">${module.level}</span>`);
  if (module.highlight) metaItems.push(`<span class="pill-sm">${module.highlight}</span>`);
  drawerMeta.innerHTML = metaItems.join('');
  drawerTags.innerHTML = (module.tags || []).map(tag => `<span class="pill-sm">#${tag}</span>`).join('');
  drawerLinks.innerHTML = (module.links || []).map(link => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label || 'View resource'}</a>`).join('');
  nodeDrawer.classList.add('open');
  renderTree();
}

function closeDrawer() {
  if (!nodeDrawer) return;
  nodeDrawer.classList.remove('open');
  state.selectedModuleId = null;
  renderTree();
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

function statusClass(status) {
  return status === 'ready' ? 'status-ready' : status === 'in-review' ? 'status-in-review' : 'status-draft';
}

function scoreStatus(status) {
  switch (status) {
    case 'ready': return 0;
    case 'in-review': return 1;
    case 'draft': return 2;
    default: return 3;
  }
}

function setupStatusFilters() {
  if (!statusFiltersEl) return;
  statusFiltersEl.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.filters.status = chip.dataset.status;
      statusFiltersEl.querySelectorAll('.chip').forEach(btn => btn.classList.toggle('active', btn === chip));
      renderTracks();
      renderTree();
    });
  });
}

function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener('input', e => {
    state.filters.search = e.target.value;
    renderTracks();
    renderTree();
  });
}

function setupListButton() {
  if (!listViewBtn) return;
  listViewBtn.addEventListener('click', () => {
    document.querySelector('.filters')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function setupPan() {
  if (!treeViewport) return;
  treeViewport.addEventListener('pointerdown', e => {
    if (e.target.closest('.tree-node')) return;
    panState.active = true;
    panState.startX = e.clientX;
    panState.startY = e.clientY;
    treeViewport.setPointerCapture(e.pointerId);
  });
  treeViewport.addEventListener('pointermove', e => {
    if (!panState.active) return;
    const dx = e.clientX - panState.startX;
    const dy = e.clientY - panState.startY;
    panState.x = panState.originX + dx;
    panState.y = panState.originY + dy;
    applyPan();
  });
  const endPan = e => {
    if (!panState.active) return;
    panState.active = false;
    panState.originX = panState.x;
    panState.originY = panState.y;
    try {
      treeViewport.releasePointerCapture(e.pointerId);
    } catch {}
  };
  treeViewport.addEventListener('pointerup', endPan);
  treeViewport.addEventListener('pointerleave', endPan);
}

function applyPan() {
  const transform = `translate(${panState.x}px, ${panState.y}px)`;
  if (treeLines) treeLines.style.transform = transform;
  if (treeNodes) treeNodes.style.transform = transform;
}

function setupAdmin() {
  updateTokenStatus();
  hideAdminPanel();
  adminToggle?.addEventListener('click', () => openAdminLogin(true));
  adminLoginClose?.addEventListener('click', () => closeAdminLogin());
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
}

function handleAdminLogin(e) {
  e.preventDefault();
  const submitted = tokenInput.value.trim();
  if (submitted !== '1234') {
    updateTokenStatus('Incorrect password. Hint: 1234');
    return;
  }
  state.adminToken = submitted;
  updateTokenStatus('Editing unlocked.');
  closeAdminLogin();
  showAdminPanel();
}

function updateTokenStatus(message) {
  if (tokenStatus) {
    tokenStatus.textContent = message || 'Enter 1234 to unlock editing.';
  }
}

function openAdminLogin(focusInput = false) {
  adminLoginPage?.classList.add('open');
  adminLoginPage?.setAttribute('aria-hidden', 'false');
  if (focusInput) {
    setTimeout(() => tokenInput?.focus(), 150);
  }
}

function closeAdminLogin() {
  adminLoginPage?.classList.remove('open');
  adminLoginPage?.setAttribute('aria-hidden', 'true');
}

function showAdminPanel() {
  adminPanel?.classList.remove('hidden');
  adminPanel?.scrollIntoView({ behavior: 'smooth' });
}

function hideAdminPanel() {
  adminPanel?.classList.add('hidden');
}

function setupModuleSelect() {
  if (!moduleSelect) return;
  moduleSelect.addEventListener('change', e => {
    e.target.value === 'new' ? resetModuleForm() : hydrateModuleForm(e.target.value);
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
  if (state.adminToken !== '1234') {
    moduleMessage.textContent = 'Enter the password (1234) before saving.';
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
    headers: { 'Content-Type': 'application/json', 'x-admin-token': state.adminToken },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    moduleMessage.textContent = `Save failed: ${res.status}`;
    return;
  }
  moduleMessage.textContent = 'Saved.';
  await loadData();
  if (isNew) resetModuleForm(); else hydrateModuleForm(id);
}

async function deleteModule() {
  const id = moduleSelect.value;
  if (id === 'new') {
    moduleMessage.textContent = 'Pick a module to delete.';
    return;
  }
  if (state.adminToken !== '1234') {
    moduleMessage.textContent = 'Enter the password (1234) before deleting.';
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
  if (state.adminToken !== '1234') {
    trackMessage.textContent = 'Enter the password (1234) before saving.';
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
    headers: { 'Content-Type': 'application/json', 'x-admin-token': state.adminToken },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    trackMessage.textContent = `Save failed: ${res.status}`;
    return;
  }
  trackMessage.textContent = 'Track added.';
  trackForm.reset();
  trackColor.value = '#ff7a18';
  await loadData();
}

function setupAdminForms() {
  moduleForm?.addEventListener('submit', saveModule);
  deleteModuleBtn?.addEventListener('click', deleteModule);
  resetModuleBtn?.addEventListener('click', resetModuleForm);
  addLinkBtn?.addEventListener('click', () => addLinkField());
  trackForm?.addEventListener('submit', saveTrack);
}

function init() {
  setupStatusFilters();
  setupSearch();
  setupListButton();
  setupPan();
  setupAdmin();
  setupModuleSelect();
  setupAdminForms();
  addLinkField();
  drawerClose?.addEventListener('click', closeDrawer);
  nodeDrawer?.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nodeDrawer?.classList.contains('open')) closeDrawer();
  });
  loadData();
}

window.addEventListener('resize', () => renderTree());
init();
