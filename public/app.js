document.addEventListener('DOMContentLoaded', () => {
  const isAdminMode = new URL(window.location).searchParams.get('mode') === 'admin';

  // Element cache
  const elements = {
    mapView: document.getElementById('mapView'),
    backstageView: document.getElementById('backstageView'),
    tracksEl: document.getElementById('tracks'),
    trackFiltersEl: document.getElementById('trackFilters'),
    trackFiltersEl: document.getElementById('trackFilters'),
    // statusFiltersEl removed
    searchInput: document.getElementById('searchInput'),
    nodeSidebar: document.getElementById('nodeSidebar'),
    closeSidebar: document.getElementById('closeSidebar'),
    sidebarContent: document.getElementById('sidebarContent'),
    sidebarHeaderContent: document.getElementById('sidebarHeaderContent'),

    searchInput: document.getElementById('searchInput'),
    adminToggle: document.getElementById('adminToggle'),
    adminLoginPage: document.getElementById('adminLoginPage'),
    adminLoginClose: document.getElementById('adminLoginClose'),
    adminLoginForm: document.getElementById('adminLogin'),
    tokenInput: document.getElementById('tokenInput'),
    tokenStatus: document.getElementById('tokenStatus'),
    moduleForm: document.getElementById('moduleForm'),
    moduleSelect: document.getElementById('moduleSelect'),
    moduleMessage: document.getElementById('moduleMessage'),
    moduleTitle: document.getElementById('moduleTitle'),
    moduleTrack: document.getElementById('moduleTrack'),
    moduleSummary: document.getElementById('moduleSummary'),
    moduleStatusEl: document.getElementById('moduleStatus'),
    moduleLevel: document.getElementById('moduleLevel'),
    moduleDuration: document.getElementById('moduleDuration'),
    moduleTags: document.getElementById('moduleTags'),
    moduleHighlight: document.getElementById('moduleHighlight'),
    moduleOwner: document.getElementById('moduleOwner'),
    linkFields: document.getElementById('linkFields'),
    addLinkBtn: document.getElementById('addLink'),
    deleteModuleBtn: document.getElementById('deleteModule'),
    resetModuleBtn: document.getElementById('resetModule'),
    trackForm: document.getElementById('trackForm'),
    trackTitle: document.getElementById('trackTitle'),
    trackDescription: document.getElementById('trackDescription'),
    trackFocus: document.getElementById('trackFocus'),
    trackLead: document.getElementById('trackLead'),
    trackColor: document.getElementById('trackColor'),
    trackMessage: document.getElementById('trackMessage'),
    treeViewport: document.getElementById('treeViewport'),
    treeLines: document.getElementById('treeLines'),
    treeNodes: document.getElementById('treeNodes'),
    backToTreeBtn: document.getElementById('backToTree'),
  };

  const dataUrl = window.location.protocol === 'file:' || window.location.hostname.includes('github.io')
    ? 'data/trails.json'
    : '/api/trails';

  const state = {
    data: { tracks: [], tutorials: [] },
    data: { tracks: [], tutorials: [] },
    filters: { search: '', track: 'all' },
    adminToken: isAdminMode ? '1234' : null, // Pre-authorize if in admin mode
  };

  const panState = { x: 0, y: 0, scale: 1, isDragging: false, startX: 0, startY: 0 };

  async function loadData() {
    try {
      const res = await fetch(dataUrl);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      state.data = await res.json();

      if (isAdminMode) {
        fillAdminSelects();
      } else {
        renderFilters();

        renderTree();
      }
    } catch (err) {
      console.error('Failed to load trails data', err);
      if (elements.tracksEl) {
        elements.tracksEl.innerHTML = '<p class="hint">Unable to load data. Ensure data/trails.json exists or the API server is running.</p>';
      }
    }
  }

  function renderFilters() {
    if (!elements.trackFiltersEl) return;
    elements.trackFiltersEl.innerHTML = '';
    const allBtn = createChip('All tracks', 'all', state.filters.track === 'all');
    elements.trackFiltersEl.appendChild(allBtn);
    state.data.tracks.forEach(track => {
      const btn = createChip(track.title, track.id, state.filters.track === track.id);
      btn.style.borderColor = track.color;
      btn.style.color = track.color;
      elements.trackFiltersEl.appendChild(btn);
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
      renderTree();
    });
    return btn;
  }



  function renderTree() {
    if (!elements.treeViewport || !elements.treeLines || !elements.treeNodes) return;
    const tracks = state.data.tracks;
    const tutorials = state.data.tutorials;
    const filteredSet = new Set(applyFilters().map(t => t.id));

    const width = 2000;
    const height = 2000;

    elements.treeLines.setAttribute('viewBox', `0 0 ${width} ${height}`);
    elements.treeLines.setAttribute('width', width);
    elements.treeLines.setAttribute('height', height);
    elements.treeNodes.style.width = `${width}px`;
    elements.treeNodes.style.height = `${height}px`;
    elements.treeLines.innerHTML = '';
    elements.treeNodes.innerHTML = '';

    const center = { x: width / 2, y: height / 2 };

    // Center initial view
    if (panState.x === 0 && panState.y === 0) {
      const viewportW = elements.treeViewport.clientWidth || window.innerWidth;
      const viewportH = elements.treeViewport.clientHeight || window.innerHeight;
      panState.x = (viewportW - width) / 2;
      panState.y = (viewportH - height) / 2;
    }

    createNodeElement({ id: 'root', title: 'THINKLAB SKILLTREE', subtitle: 'Start here', x: center.x, y: center.y }, null, true, true);

    const connectors = [];
    const angleStep = (Math.PI * 2) / Math.max(tracks.length, 1);
    const radiusStart = 160;
    const radiusStep = 140;

    tracks.forEach((track, idx) => {
      const modules = tutorials.filter(t => t.trackId === track.id);
      const angle = angleStep * idx - Math.PI / 2;
      if (!modules.length) return;

      modules.forEach((module, modIdx) => {
        const radius = radiusStart + radiusStep * (modIdx + 1);
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;
        createNodeElement({ id: module.id, title: module.title, x, y }, track, false, filteredSet.has(module.id));

        const prevRadius = modIdx === 0 ? 0 : radiusStart + radiusStep * modIdx;
        const prevX = modIdx === 0 ? center.x : center.x + Math.cos(angle) * prevRadius;
        const prevY = modIdx === 0 ? center.y : center.y + Math.sin(angle) * prevRadius;
        connectors.push({ x1: prevX, y1: prevY, x2: x, y2: y, color: track.color || '#ffb347' });
      });
    });

    drawConnectors(connectors);
    applyPan();
  }

  function createNodeElement(entry, track, isRoot = false, visible = true) {
    const node = document.createElement('div'); // Use div instead of button for non-interactive nodes
    node.className = 'tree-node';
    if (isRoot) node.classList.add('root-node');
    if (!visible) node.classList.add('dimmed');

    node.style.left = `${entry.x}px`;
    node.style.top = `${entry.y}px`;
    node.innerHTML = `<strong>${entry.title}</strong><span>${isRoot ? entry.subtitle : (track?.title || '')}</span>`;

    if (!isRoot && visible) {
      node.addEventListener('click', (e) => {
        console.log('Node clicked:', entry.id);
        e.stopPropagation();
        showSidebar(entry.id);
      });
    }

    elements.treeNodes.appendChild(node);
  }

  function drawConnectors(connectors) {
    const ns = 'http://www.w3.org/2000/svg';
    connectors.forEach(conn => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', conn.color || 'rgba(0,0,0,0.2)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('opacity', '0.35');
      elements.treeLines.appendChild(path);
    });
  }

  function applyFilters() {
    const term = state.filters.search.toLowerCase();
    return state.data.tutorials.filter(t => {
      // Status filter removed
      const trackOk = state.filters.track === 'all' || t.trackId === state.filters.track;
      const text = `${t.title} ${t.summary} ${(t.tags || []).join(' ')} ${t.owner || ''}`.toLowerCase();
      const searchOk = !term || text.includes(term);
      return trackOk && searchOk;
    });
  }

  function statusClass(status) {
    return status === 'ready' ? 'status-ready' : status === 'in-review' ? 'status-in-review' : 'status-draft';
  }

  function scoreStatus(status) {
    return status === 'ready' ? 0 : status === 'in-review' ? 1 : 'draft' ? 2 : 3;
  }

  function setupPan() {
    if (!elements.treeViewport) return;
    const viewport = elements.treeViewport;

    // Pan
    viewport.addEventListener('pointerdown', e => {
      if (e.target.closest('.tree-node')) return;
      panState.isDragging = true;
      panState.startX = e.clientX - panState.x;
      panState.startY = e.clientY - panState.y;
      viewport.setPointerCapture(e.pointerId);
      viewport.style.cursor = 'grabbing';
    });

    viewport.addEventListener('pointermove', e => {
      if (!panState.isDragging) return;
      panState.x = e.clientX - panState.startX;
      panState.y = e.clientY - panState.startY;
      applyPan();
    });

    const endPan = e => {
      panState.isDragging = false;
      viewport.style.cursor = 'grab';
      try { viewport.releasePointerCapture(e.pointerId); } catch { }
    };

    viewport.addEventListener('pointerup', endPan);
    viewport.addEventListener('pointerleave', endPan);

    // Zoom
    viewport.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const newScale = Math.min(Math.max(0.2, panState.scale - e.deltaY * zoomSpeed), 3);

      // Zoom towards mouse pointer
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleRatio = newScale / panState.scale;

      panState.x = mouseX - (mouseX - panState.x) * scaleRatio;
      panState.y = mouseY - (mouseY - panState.y) * scaleRatio;
      panState.scale = newScale;

      applyPan();
    }, { passive: false });
  }

  function applyPan() {
    const transform = `translate(${panState.x}px, ${panState.y}px) scale(${panState.scale})`;
    if (elements.treeLines) elements.treeLines.style.transform = transform;
    if (elements.treeNodes) elements.treeNodes.style.transform = transform;
    // Keep lines stroke width consistent visually
    if (elements.treeLines) elements.treeLines.style.strokeWidth = `${2 / panState.scale}px`;
  }

  function showSidebar(id) {
    console.log('showSidebar called with:', id);
    const item = state.data.tutorials.find(t => t.id === id);
    if (!item) {
      console.error('Item not found for id:', id);
      return;
    }

    const linksHtml = (item.links || []).map(l =>
      `<a href="${l.url}" target="_blank" class="resource-link">🔗 ${l.label || 'Link'}</a>`
    ).join('');

    elements.sidebarHeaderContent.innerHTML = `
      <p class="eyebrow">${item.level || 'Tutorial'}</p>
      <h2>${item.title}</h2>
    `;

    elements.sidebarContent.innerHTML = `
      <p class="lede">${item.summary || ''}</p>
      <div class="tag-row" style="margin: 16px 0;">
        ${(item.tags || []).map(t => `<span class="pill-sm">${t}</span>`).join('')}
        <span class="pill-sm">${item.duration || 'Self-paced'}</span>
      </div>
      <div style="margin-top: 20px;">
        ${linksHtml}
      </div>
      ${item.highlight ? `<div style="margin-top: 20px; padding: 12px; background: #fffdf8; border: 1px solid #eee; border-radius: 8px;"><p><strong>Highlight:</strong> ${item.highlight}</p></div>` : ''}
    `;

    elements.nodeSidebar.classList.add('open');
    elements.nodeSidebar.setAttribute('aria-hidden', 'false');
  }

  elements.closeSidebar?.addEventListener('click', () => {
    elements.nodeSidebar.classList.remove('open');
    elements.nodeSidebar.setAttribute('aria-hidden', 'true');
  });

  // Close sidebar when clicking on map background
  elements.treeViewport?.addEventListener('click', (e) => {
    if (e.target === elements.treeViewport || e.target.id === 'treeLines') {
      elements.nodeSidebar.classList.remove('open');
      elements.nodeSidebar.setAttribute('aria-hidden', 'true');
    }
  });

  // --- Admin Logic ---
  function setupAdminLogin() {
    elements.adminToggle?.addEventListener('click', () => {
      elements.adminLoginPage?.classList.add('open');
      elements.adminLoginPage?.setAttribute('aria-hidden', 'false');
      setTimeout(() => elements.tokenInput?.focus(), 150);
    });
    elements.adminLoginClose?.addEventListener('click', () => {
      elements.adminLoginPage?.classList.remove('open');
      elements.adminLoginPage?.setAttribute('aria-hidden', 'true');
    });
    elements.adminLoginForm?.addEventListener('submit', e => {
      e.preventDefault();
      if (elements.tokenInput.value.trim() === '1234') {
        window.open('?mode=admin', '_blank');
        elements.adminLoginClose.click();
      } else {
        elements.tokenStatus.textContent = 'Incorrect password.';
      }
    });
  }

  function fillAdminSelects() {
    if (!elements.moduleTrack || !elements.moduleSelect) return;
    elements.moduleTrack.innerHTML = state.data.tracks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
    const options = ['<option value="new">New module</option>']
      .concat(state.data.tutorials.map(t => `<option value="${t.id}">${t.title}</option>`));
    elements.moduleSelect.innerHTML = options.join('');
  }

  function resetModuleForm() {
    elements.moduleSelect.value = 'new';
    elements.moduleForm.reset();
    renderLinkFields([]);
    elements.moduleMessage.textContent = 'Editing new module.';
  }

  function hydrateModuleForm(moduleId) {
    const module = state.data.tutorials.find(t => t.id === moduleId);
    if (!module) return resetModuleForm();

    elements.moduleTitle.value = module.title || '';
    elements.moduleSummary.value = module.summary || '';
    elements.moduleStatusEl.value = module.status || 'draft';
    elements.moduleLevel.value = module.level || '';
    elements.moduleDuration.value = module.duration || '';
    elements.moduleTags.value = (module.tags || []).join(', ');
    elements.moduleHighlight.value = module.highlight || '';
    elements.moduleOwner.value = module.owner || '';
    elements.moduleTrack.value = module.trackId || state.data.tracks[0]?.id || '';
    renderLinkFields(module.links || []);
    elements.moduleMessage.textContent = `Editing ${module.title}`;
  }

  function renderLinkFields(links) {
    elements.linkFields.innerHTML = '';
    (links?.length ? links : [{ label: '', url: '' }]).forEach(link => addLinkField(link));
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
    elements.linkFields.appendChild(row);
  }

  function collectLinks() {
    return [...elements.linkFields.querySelectorAll('.link-fields')]
      .map(row => ({
        label: row.querySelector('.link-label').value.trim(),
        url: row.querySelector('.link-url').value.trim(),
      }))
      .filter(link => link.label || link.url);
  }

  async function saveModule(e) {
    e.preventDefault();
    if (state.adminToken !== '1234') return;

    const id = elements.moduleSelect.value;
    const payload = {
      title: elements.moduleTitle.value.trim(),
      trackId: elements.moduleTrack.value,
      summary: elements.moduleSummary.value.trim(),
      status: elements.moduleStatusEl.value,
      level: elements.moduleLevel.value.trim(),
      duration: elements.moduleDuration.value.trim(),
      tags: elements.moduleTags.value.split(',').map(t => t.trim()).filter(Boolean),
      links: collectLinks(),
      highlight: elements.moduleHighlight.value.trim(),
      owner: elements.moduleOwner.value.trim(),
    };

    const isNew = id === 'new';
    const url = isNew ? '/api/tutorials' : `/api/tutorials/${id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-token': state.adminToken },
      body: JSON.stringify(payload)
    });

    elements.moduleMessage.textContent = res.ok ? 'Saved.' : `Save failed: ${res.status}`;
    if (res.ok) {
      await loadData();
      isNew ? resetModuleForm() : hydrateModuleForm(id);
    }
  }

  async function deleteModule() {
    const id = elements.moduleSelect.value;
    if (id === 'new' || state.adminToken !== '1234') return;

    const res = await fetch(`/api/tutorials/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': state.adminToken }
    });

    elements.moduleMessage.textContent = res.ok ? 'Deleted.' : `Delete failed: ${res.status}`;
    if (res.ok) {
      await loadData();
      resetModuleForm();
    }
  }

  async function saveTrack(e) {
    e.preventDefault();
    if (state.adminToken !== '1234') return;

    const payload = {
      title: elements.trackTitle.value.trim(),
      description: elements.trackDescription.value.trim(),
      focus: elements.trackFocus.value.trim(),
      lead: elements.trackLead.value.trim(),
      color: elements.trackColor.value,
    };

    const res = await fetch('/api/tracks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': state.adminToken },
      body: JSON.stringify(payload)
    });

    elements.trackMessage.textContent = res.ok ? 'Track added.' : `Save failed: ${res.status}`;
    if (res.ok) {
      elements.trackForm.reset();
      elements.trackColor.value = '#ff7a18';
      await loadData();
    }
  }

  // --- Initialization ---
  function init() {
    if (isAdminMode) {
      // Admin Mode: show backstage, hide map
      elements.mapView?.classList.add('hidden');
      elements.backstageView?.classList.remove('hidden');
      document.body.classList.add('admin-mode');
      elements.backToTreeBtn?.classList.add('hidden'); // Hide back button

      // Setup admin forms
      elements.moduleForm?.addEventListener('submit', saveModule);
      elements.deleteModuleBtn?.addEventListener('click', deleteModule);
      elements.resetModuleBtn?.addEventListener('click', resetModuleForm);
      elements.addLinkBtn?.addEventListener('click', () => addLinkField());
      elements.trackForm?.addEventListener('submit', saveTrack);
      elements.moduleSelect?.addEventListener('change', e => e.target.value === 'new' ? resetModuleForm() : hydrateModuleForm(e.target.value));
      addLinkField();

    } else {
      // Viewer Mode: show map, hide backstage
      elements.mapView?.classList.remove('hidden');
      elements.backstageView?.classList.add('hidden');
      document.body.classList.remove('admin-mode');

      // Setup viewer interactions
      // Status filters removed
      /*
      elements.statusFiltersEl?.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          state.filters.status = chip.dataset.status;
          elements.statusFiltersEl.querySelectorAll('.chip').forEach(btn => btn.classList.toggle('active', btn === chip));
          renderTree();
        });
      });
      */
      elements.searchInput?.addEventListener('input', e => {
        state.filters.search = e.target.value;
        renderTree();
      });
      setupPan();
      setupAdminLogin();
      window.addEventListener('resize', renderTree);

      // Test Sidebar Button
      document.getElementById('testSidebar')?.addEventListener('click', () => {
        console.log('Test Sidebar clicked');
        // Use first tutorial id or a mock one
        const firstId = state.data.tutorials[0]?.id;
        if (firstId) {
          showSidebar(firstId);
        } else {
          console.warn('No tutorials loaded to test sidebar');
        }
      });
    }
    loadData();
  }

  init();
});