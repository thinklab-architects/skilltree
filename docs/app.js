const tracksEl = document.getElementById('tracks');
const trackFiltersEl = document.getElementById('trackFilters');
const statusFiltersEl = document.getElementById('statusFilters');
const heroMetricsEl = document.getElementById('heroMetrics');
const miniListEl = document.getElementById('miniList');
const searchInput = document.getElementById('searchInput');
const adminPanel = document.getElementById('adminPanel');
const adminToggle = document.getElementById('adminToggle');
const adminLogin = document.getElementById('adminLogin');
const tokenInput = document.getElementById('tokenInput');
const tokenStatus = document.getElementById('tokenStatus');
const moduleSelect = document.getElementById('moduleSelect');
const moduleForm = document.getElementById('moduleForm');
const moduleMessage = document.getElementById('moduleMessage');
const moduleTitle = document.getElementById('moduleTitle');
const moduleTrack = document.getElementById('moduleTrack');
const moduleSummary = document.getElementById('moduleSummary');
const moduleStatus = document.getElementById('moduleStatus');
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
const ctaExplore = document.getElementById('ctaExplore');
const ctaAdd = document.getElementById('ctaAdd');
const trailMapSvg = document.getElementById('trailMapSvg');
const adminLoginPage = document.getElementById('adminLoginPage');
const adminLoginClose = document.getElementById('adminLoginClose');

const staticMode = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
const dataUrl = staticMode ? 'data/trails.json' : '/api/trails';

const state = {
  data: { tracks: [], tutorials: [] },
  filters: { status: 'all', search: '', track: 'all' },
  adminToken: sessionStorage.getItem('adminToken') || ''
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
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
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
  });
  return btn;
}

function renderMetrics() {
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

  const featured = [...tutorials].sort((a, b) => statusScore(a.status) - statusScore(b.status)).slice(0, 4);
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
  if (!trailMapSvg) return;
  const tracks = state.data.tracks;
  const tutorials = state.data.tutorials;
  if (!tracks.length) {
    trailMapSvg.innerHTML = '<text x="10" y="20" class="map-node-label">No map data.</text>';
    return;
  }

  const ns = 'http://www.w3.org/2000/svg';
  const width = Math.max(trailMapSvg.clientWidth, 640);
  const modulesPerTrack = tracks.map(track => tutorials.filter(t => t.trackId === track.id).length);
  const maxItems = Math.max(...modulesPerTrack, 1);
  const height = Math.max(260, maxItems * 90);
  trailMapSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  trailMapSvg.style.height = `${Math.min(420, height)}px`;
  trailMapSvg.innerHTML = '';

  const spacingX = width / (tracks.length + 1);

  tracks.forEach((track, index) => {
    const trackModules = tutorials
      .filter(module => module.trackId === track.id)
      .sort((a, b) => statusScore(a.status) - statusScore(b.status));

    const columnX = spacingX * (index + 1);
    const label = document.createElementNS(ns, 'text');
    label.textContent = track.title;
    label.setAttribute('x', columnX);
    label.setAttribute('y', 24);
    label.setAttribute('text-anchor', 'middle');
    label.classList.add('map-track-label');
    trailMapSvg.appendChild(label);

    if (trackModules.length > 1) {
      const points = trackModules.map((_, idx) => {
        const cy = height * ((idx + 1) / (trackModules.length + 1));
        return `${columnX},${cy}`;
      });
      const path = document.createElementNS(ns, 'polyline');
      path.setAttribute('points', points.join(' '));
      path.setAttribute('stroke', track.color || '#fff');
      path.setAttribute('class', 'map-connector');
      trailMapSvg.appendChild(path);
    }

    const count = Math.max(trackModules.length, 1);
    const gap = height / (count + 1);
    trackModules.forEach((module, modIndex) => {
      const cy = gap * (modIndex + 1);
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', columnX);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', 10);
      circle.setAttribute('fill', statusColors[module.status] || statusColors.default);
      circle.setAttribute('stroke', track.color || 'rgba(255,255,255,0.5)');
      circle.setAttribute('stroke-width', '2');
      circle.classList.add('map-node');
      const title = document.createElementNS(ns, 'title');
      title.textContent = `${module.title} • ${statusLabels[module.status] || module.status}`;
      circle.appendChild(title);
      trailMapSvg.appendChild(circle);

      const text = document.createElementNS(ns, 'text');
      text.textContent = module.title;
      text.setAttribute('x', columnX + 16);
      text.setAttribute('y', cy + 4);
      text.setAttribute('text-anchor', 'start');
      text.classList.add('map-node-label');
      trailMapSvg.appendChild(text);
    });
  });
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

function setStatusFilter(value) {
  state.filters.status = value;
  statusFiltersEl.querySelectorAll('.chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === value);
  });
  renderTracks();
}

function setupStatusFilters() {
  statusFiltersEl.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      setStatusFilter(btn.dataset.status);
    });
  });
}

function setupSearch() {
  searchInput.addEventListener('input', e => {
    state.filters.search = e.target.value;
    renderTracks();
  });
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
  if (ctaAdd) {
    ctaAdd.addEventListener('click', () => openAdminLogin(true));
  }
  if (adminLoginClose) {
    adminLoginClose.addEventListener('click', () => closeAdminLogin());
  }

  if (staticMode) {
    lockAdminUI();
    return;
  }

  if (adminLogin) {
    adminLogin.addEventListener('submit', handleAdminLogin);
  }
}

function scrollToAdmin() {
  if (!adminPanel) return;
  adminPanel.scrollIntoView({ behavior: 'smooth' });
}

function fillAdminSelects() {
  moduleTrack.innerHTML = state.data.tracks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');

  const options = ['<option value="new">New module</option>']
    .concat(state.data.tutorials.map(t => `<option value="${t.id}">${t.title}</option>`));
  moduleSelect.innerHTML = options.join('');
}

function resetModuleForm() {
  moduleSelect.value = 'new';
  moduleTitle.value = '';
  moduleSummary.value = '';
  moduleStatus.value = 'draft';
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
  moduleStatus.value = module.status || 'draft';
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
  if (!links.length) links = [{ label: '', url: '' }];
  links.forEach(link => addLinkField(link));
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
    status: moduleStatus.value,
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

function collectLinks() {
  return [...linkFields.querySelectorAll('.link-fields')].map(row => {
    const label = row.querySelector('.link-label').value.trim();
    const url = row.querySelector('.link-url').value.trim();
    return label || url ? { label, url } : null;
  }).filter(Boolean);
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

function setupModuleSelect() {
  moduleSelect.addEventListener('change', e => {
    const id = e.target.value;
    if (id === 'new') {
      resetModuleForm();
    } else {
      hydrateModuleForm(id);
    }
  });
}

function setupAdminForms() {
  if (staticMode) return;
  moduleForm.addEventListener('submit', saveModule);
  deleteModuleBtn.addEventListener('click', deleteModule);
  resetModuleBtn.addEventListener('click', resetModuleForm);
  addLinkBtn.addEventListener('click', () => addLinkField());
  trackForm.addEventListener('submit', saveTrack);
}

function setupCTA() {
  ctaExplore.addEventListener('click', () => {
    document.getElementById('tracks').scrollIntoView({ behavior: 'smooth' });
  });
}

function init() {
  setupStatusFilters();
  setupSearch();
  setupAdmin();
  setupModuleSelect();
  setupAdminForms();
  setupCTA();
  resetModuleForm();
  loadData();
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
  if (message) {
    tokenStatus.textContent = message;
    return;
  }
  tokenStatus.textContent = state.adminToken
    ? 'Token ready. Close this dialog to edit.'
    : 'Enter your ADMIN_TOKEN to unlock editing.';
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
  setTimeout(() => scrollToAdmin(), 150);
}

function hideAdminPanel() {
  if (!adminPanel) return;
  adminPanel.classList.add('hidden');
}

function lockAdminUI() {
  hideAdminPanel();
  updateTokenStatus('Admin editing is disabled on this static build. Clone the repo and run the server to edit.');
  if (tokenInput) tokenInput.disabled = true;
  if (adminLogin) {
    const submitBtn = adminLogin.querySelector('button');
    if (submitBtn) submitBtn.disabled = true;
  }
}

window.addEventListener('resize', () => renderMap());

init();

