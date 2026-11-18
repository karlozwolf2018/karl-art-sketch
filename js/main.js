/* ============================================================
   main.js — arranque y cableado de todos los módulos
   Expone: CYBER.app
   ------------------------------------------------------------
   También es el coordinador de idioma: al cambiar entre es/en
   vuelve a localizar los datos y refresca todas las vistas.
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;
  const E = CYBER.EVENTS;

  /** Traducción con respaldo. */
  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  const app = {
    graph: null,
    sidebar: null,
    toolbar: null,
    gallery: null,
    search: null,
    modal: null,
    editor: null,
    themeSwitch: null,
    data: null,
    baseRaw: null,
    prefs: null,
    visibleArts: null
  };

  CYBER.app = app;

  /* ------------------------------------------------------------
     Utilidades internas
     ------------------------------------------------------------ */

  function savePrefs(patch) {
    app.prefs = Object.assign({}, app.prefs, patch);
    CYBER.Prefs.write(app.prefs);
  }

  function setStatus(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }



  /** Etiqueta legible del origen de datos. */
  function sourceLabel(source) {
    if (source === 'json') return t('ui.source.json');
    if (source === 'embed') return t('ui.source.embed');
    if (source === 'mixto') return t('ui.source.mixed');
    return t('ui.source.loading');
  }

  function ensurePanelBackdrop() {
    let backdrop = document.querySelector('.panel-backdrop');
    if (backdrop) return backdrop;
    backdrop = dom.el('div', { class: 'panel-backdrop' });
    backdrop.addEventListener('click', function () { setSidebarOpen(false); });
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function setSidebarOpen(open) {
    document.body.classList.toggle('is-panel-open', open);
    const burger = document.getElementById('btn-sidebar');
    const backdrop = ensurePanelBackdrop();
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    backdrop.classList.toggle('is-open', open && window.innerWidth <= 860);
  }

  /* ------------------------------------------------------------
     Idioma
     ------------------------------------------------------------ */

  function setLocale(locale) {
    const next = CYBER.I18n.set(locale);
    savePrefs({ locale: next });
    return next;
  }

  /** Vuelve a localizar datos y refresca todas las vistas visibles. */
  function refreshLocale() {
    if (!app.data) return;

    CYBER.DataService.localize(app.data, CYBER.I18n.locale());

    const site = app.data.config.site;
    document.title = site.name + ' · ' + app.data.config.tagline;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', app.data.config.description || site.description || '');

    if (app.sidebar) app.sidebar.refreshLabels();
    if (app.graph) app.graph.refreshLabels();
    if (app.gallery) {
      app.gallery.render(app.data.artworks);
      app.gallery.refreshLabels();
    }
    if (app.modal && app.modal.open) app.modal.reopen();

    setStatus('status-source', sourceLabel(app.data.source));
    applyFilters();
    if (app.search) app.search.setCount(app.graph ? app.graph.visibleCount : 0, app.data.artworks.length);
  }

  /* ------------------------------------------------------------
     Datos del usuario (crear / editar / eliminar obras)
     ------------------------------------------------------------ */

  /** Reconstruye todo el archivo aplicando las obras del usuario. */
  function applyUserData() {
    if (!app.baseRaw) return;
    const fresh = CYBER.DataService.rebuild(app.baseRaw, CYBER.UserData.read());
    app.data = fresh;

    /* grafo desde cero (modelo, nodos y aristas) */
    app.graph.setData(fresh);
    app.graph.refreshLabels();

    /* panel, rejilla y fichas */
    app.sidebar.init(fresh);
    app.gallery.rebuild(fresh.artworks);
    app.modal.setList(fresh.artworks);
    app.editor.setCategories(fresh.categories);

    /* estado visible */
    applyFilters();
    setStatus('status-source', sourceLabel(fresh.source));
    setStatus('status-nodes', app.graph.model.stats.nodes);
    setStatus('status-edges', app.graph.model.stats.edges);

    CYBER.store.patch({ artworks: fresh.artworks, categories: fresh.categories });
    return fresh;
  }

  /* ------------------------------------------------------------
     Vistas
     ------------------------------------------------------------ */

  function setView(view, options) {
    const opts = options || {};
    const target = ['graph', 'gallery', 'about'].indexOf(view) > -1 ? view : 'graph';

    const mainEl = document.getElementById('main');
    if (mainEl) mainEl.dataset.view = target;

    ['graph', 'gallery', 'about'].forEach(function (name) {
      const section = document.getElementById('view-' + name);
      if (section) section.classList.toggle('is-active', name === target);
    });

    if (app.toolbar) app.toolbar.setView(target);
    CYBER.store.set('view', target);
    savePrefs({ view: target });

    if (target === 'gallery' && app.gallery) {
      app.gallery.resort();
      app.gallery.applyFilters(currentFilters());
    }
    if (target === 'graph' && app.graph && !opts.silent) {
      app.graph.layout.reheat(0.25);
    }

    bus.emit(E.VIEW_CHANGED, { view: target });
    return target;
  }

  /* ------------------------------------------------------------
     Filtros
     ------------------------------------------------------------ */

  function currentFilters() {
    return app.sidebar
      ? app.sidebar.snapshot()
      : { categories: [], tags: [], query: '', onlyFavorites: false, onlyAvailable: false };
  }

  function applyFilters() {
    const filters = currentFilters();
    const total = app.data.artworks.length;

    const visibleCount = app.graph.applyFilters(filters);
    const visibleList = app.graph.visibleArtworks();
    app.visibleArts = function () { return visibleList; };

    if (app.gallery) app.gallery.applyFilters(filters);
    if (app.search) app.search.setCount(visibleCount, total);
    if (app.sidebar) app.sidebar.updateStats({ visible: visibleCount });
    if (app.modal) app.modal.setList(visibleList);

    setStatus('status-nodes', app.graph.model.stats.nodes);
    setStatus('status-edges', app.graph.model.stats.edges);
    setStatus('ro-visible', visibleCount);

    return visibleCount;
  }

  /* ------------------------------------------------------------
     Instrumentos globales
     ------------------------------------------------------------ */

  function startClock() {
    function tick() { setStatus('status-clock', CYBER.Fmt.clock()); }
    tick();
    window.setInterval(tick, 1000);
  }

  function bindBus() {
    bus.on(E.LOCALE_CHANGED, function (payload) {
      /* el propio motor i18n ya aplicó el DOM estático; aquí se refrescan
         los datos y las vistas construidas por JavaScript */
      if (payload && payload.locale === CYBER.I18n.locale()) refreshLocale();
    });

    bus.on(E.FILTERS_CHANGED, function (payload) {
      if (payload && payload.filters) CYBER.store.set('filters', payload.filters);
      applyFilters();
    });

    bus.on(E.GRAPH_STATS, function (payload) {
      if (!payload) return;
      if (payload.fps) setStatus('status-fps', payload.fps + ' fps');
      if (payload.zoom) {
        setStatus('status-zoom', CYBER.Fmt.percent(payload.zoom));
        if (app.toolbar) app.toolbar.setZoom(payload.zoom);
      }
    });

    bus.on(E.ZOOM_CHANGED, function (payload) {
      if (!payload) return;
      setStatus('status-zoom', CYBER.Fmt.percent(payload.zoom));
      if (app.toolbar) app.toolbar.setZoom(payload.zoom);
    });

    bus.on(E.FAVORITES_CHANGED, function () {
      if (app.gallery) app.gallery.refreshFavorites();
      if (app.graph) {
        app.graph.nodeLayer.setFavorites(function (id) { return CYBER.Favorites.has(id); });
      }
      if (app.sidebar) app.sidebar.updateFavorites();
      applyFilters();
    });

    bus.on(E.NODE_SELECT, function (payload) {
      if (!payload || !payload.node) return;
      const node = payload.node;
      if (node.type === 'art') {
        setStatus('status-source', node.artwork.code + ' · ' + node.artwork.categoryShort.toUpperCase());
      } else if (node.type === 'hub') {
        setStatus('status-source', t('selection.category', { label: node.label.toUpperCase() }));
      } else {
        setStatus('status-source', t('selection.core'));
      }
    });

    bus.on(E.ARTWORK_REQUEST, function (payload) {
      if (!payload || !app.modal) return;
      const art = app.data.artworks.find(function (item) { return item.id === payload.id; });
      if (art) {
        app.modal.openArtwork(art, {
          list: app.visibleArts ? app.visibleArts() : app.data.artworks,
          origin: payload.origin || 'gallery'
        });
      }
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', function (evt) {
      const tag = (evt.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || evt.target.isContentEditable;
      /* Bloquear Ctrl+Shift+S (Guardar como) y combinaciones similares */
      if (evt.ctrlKey && evt.shiftKey && evt.key.toLowerCase() === 's') {
        evt.preventDefault();
        bus.emit(E.TOAST, { type: 'warn', text: 'Guardado deshabilitado · Esta acción está bloqueada en modo visualización.' });
        return;
      }
      if (evt.metaKey || evt.ctrlKey || evt.altKey) return;

      if (evt.key === '/' && !typing) {
        evt.preventDefault();
        app.search.focus();
        return;
      }
      if (typing) return;
      if (app.modal && app.modal.open) return; /* el modal gestiona sus teclas */

      switch (evt.key.toLowerCase()) {
        case 'g': setView('gallery'); break;
        case 'i': setView('about'); break;
        case 'n': setView('graph'); break;

        case 'd':
          if (app.themeSwitch) app.themeSwitch.toggle();
          break;
        case 'f': app.graph.fit(); app.toolbar.flash('fit'); break;
        case 'r': app.graph.shuffle(); app.toolbar.flash('layout'); break;
        case 'c': app.graph.focusNode(app.graph.model.coreId, 0.9); app.toolbar.flash('core'); break;
        case 'p': togglePhysics(); break;
        case 't': toggleCrt(); break;
        case '+':
        case '=': app.graph.zoomBy(1.2); break;
        case '-': app.graph.zoomBy(1 / 1.2); break;
        case '0': app.graph.resetView(); break;
        case 'escape':
          if (document.body.classList.contains('is-panel-open')) setSidebarOpen(false);
          else app.sidebar.clear();
          break;
        default: return;
      }
    });
  }

  function bindProtection() {
    /* Deshabilitar menú contextual (clic derecho) en obras, visor y miniaturas */
    document.addEventListener('contextmenu', function (evt) {
      if (evt.target.closest('.viewer, .viewer__stage, .card__media, .modal, .node__thumb, .related__thumb')) {
        evt.preventDefault();
        evt.stopPropagation();
        bus.emit(E.TOAST, {
          type: 'warn',
          text: '🔒 Clic derecho deshabilitado · Obra protegida por derechos de autor.'
        });
      }
    }, true);

    /* Deshabilitar arrastre de imágenes y lienzos */
    document.addEventListener('dragstart', function (evt) {
      if (evt.target.closest('img, canvas, .viewer, .card__media')) {
        evt.preventDefault();
      }
    }, true);
  }

  function togglePhysics(force) {
    const next = force === undefined ? !app.graph.physics : !!force;
    app.graph.setPhysics(next);
    app.toolbar.setPhysics(next);
    app.sidebar.setPhysicsSwitch(next);
    savePrefs({ physics: next });
    bus.emit(E.TOAST, { type: next ? 'info' : 'warn', text: t(next ? 'toasts.physicsOn' : 'toasts.physicsOff') });
    return next;
  }

  function toggleCrt(force) {
    const next = force === undefined ? document.documentElement.dataset.crt !== 'on' : !!force;
    app.toolbar.setCrt(next);
    CYBER.store.set('crt', next);
    savePrefs({ crt: next });
    return next;
  }

  /* ------------------------------------------------------------
     Exportar el grafo visible
     ------------------------------------------------------------ */

  function exportJSON() {
    if (CYBER.Admin && !CYBER.Admin.check()) {
      CYBER.Admin.require(function () { exportJSON(); });
      return;
    }
    const visible = app.graph.visibleArtworks();
    const payload = {
      exportedAt: new Date().toISOString(),
      locale: CYBER.I18n.locale(),
      site: app.data.config.site.name,
      filters: currentFilters(),
      total: visible.length,
      artworks: visible
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neon-sketch-' + Date.now() + '.json';
    link.click();
    URL.revokeObjectURL(url);
    bus.emit(E.TOAST, { type: 'ok', text: t('toasts.exported', { count: visible.length }) });
  }

  /* ------------------------------------------------------------
     Respaldo y restauración del archivo de usuario
     ------------------------------------------------------------ */

  /**
   * Guarda un JSON mediante showSaveFilePicker() si está disponible
   * (Chrome/Edge — abre el diálogo nativo "Guardar como…").
   * En otros navegadores usa el método clásico de descarga.
   */
  async function saveJsonFile(jsonString, suggestedName) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [{
            description: 'Archivo JSON',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return true; /* éxito con diálogo */
      } catch (err) {
        if (err.name === 'AbortError') return false; /* usuario canceló */
        console.warn('[backup] showSaveFilePicker falló, usando fallback:', err);
      }
    }
    /* Fallback: descarga automática a la carpeta de Descargas */
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function backupData() {
    if (CYBER.Admin && !CYBER.Admin.check()) {
      CYBER.Admin.require(function () { backupData(); });
      return;
    }
    const userData = CYBER.UserData.read();
    const prefs    = CYBER.Prefs.read();
    const payload  = {
      _type: 'neon-sketch-backup',
      _version: '1',
      exportedAt: new Date().toISOString(),
      artworksCount: (userData.created || []).length,
      prefs: prefs,
      userData: userData
    };
    const count = (userData.created || []).length;
    saveJsonFile(
      JSON.stringify(payload, null, 2),
      'neon-sketch-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    ).then(function (saved) {
      if (saved) {
        bus.emit(E.TOAST, {
          type: 'ok',
          text: '✓ Respaldo guardado · ' + count + ' obras exportadas'
        });
      }
    });
  }

  function restoreData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed._type !== 'neon-sketch-backup') {
          bus.emit(E.TOAST, { type: 'warn', text: '⚠ El archivo no es un respaldo válido de Karl Art Sketch' });
          return;
        }
        /* restaurar prefs y UserData */
        if (parsed.prefs)    CYBER.Prefs.write(parsed.prefs);
        if (parsed.userData) CYBER.UserData.write(parsed.userData);

        const count = (parsed.userData && parsed.userData.artworks)
          ? parsed.userData.artworks.length : 0;

        bus.emit(E.TOAST, { type: 'ok', text: '✓ Restauración completada · ' + count + ' obras cargadas' });

        /* recargar el estado de la app */
        setTimeout(function () { applyUserData(); }, 300);
      } catch (err) {
        bus.emit(E.TOAST, { type: 'warn', text: '⚠ Error al leer el respaldo: ' + err.message });
      }
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------
     Exportar / Importar catálogo de obras (formato artworks.json)
     ------------------------------------------------------------ */

  function exportCatalog() {
    if (CYBER.Admin && !CYBER.Admin.check()) {
      CYBER.Admin.require(function () { exportCatalog(); });
      return;
    }
    if (!app.data) return;
    /* Exporta TODAS las obras en el mismo formato que data/artworks.json */
    const payload = { artworks: app.data.artworks };
    const count   = app.data.artworks.length;
    saveJsonFile(
      JSON.stringify(payload, null, 2),
      'artworks-' + new Date().toISOString().slice(0, 10) + '.json'
    ).then(function (saved) {
      if (saved) {
        bus.emit(E.TOAST, {
          type: 'ok',
          text: '✓ Catálogo exportado · ' + count + ' obras'
        });
      }
    });
  }

  function importCatalog(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);

        /* Acepta tanto { artworks: [...] } como un array directo */
        const list = Array.isArray(parsed)
          ? parsed
          : (Array.isArray(parsed.artworks) ? parsed.artworks : null);

        if (!list) {
          bus.emit(E.TOAST, { type: 'warn', text: '⚠ Formato no reconocido: se esperaba { artworks: [...] }' });
          return;
        }

        /* Reemplaza el catálogo de usuario con las obras del archivo importado.
           Se ponen todas como "created" para que sean editables/eliminables. */
        const userData = CYBER.UserData.read();
        userData.created  = list;
        userData.updated  = {};
        userData.deleted  = [];
        CYBER.UserData.write(userData);

        bus.emit(E.TOAST, {
          type: 'ok',
          text: '✓ Catálogo importado · ' + list.length + ' obras cargadas'
        });

        setTimeout(function () { applyUserData(); }, 300);
      } catch (err) {
        bus.emit(E.TOAST, { type: 'warn', text: '⚠ Error al leer el catálogo: ' + err.message });
      }
    };
    reader.readAsText(file);
  }

  function initBackupMenu() {
    const trigger    = document.getElementById('btn-backup');
    const dropdown   = document.getElementById('backup-dropdown');
    const btnBackup  = document.getElementById('btn-do-backup');
    const btnRestore = document.getElementById('btn-do-restore');
    const fileInput  = document.getElementById('restore-file-input');

    const btnExportCatalog = document.getElementById('btn-export-catalog');
    const btnImportCatalog = document.getElementById('btn-import-catalog');
    const catalogInput     = document.getElementById('catalog-file-input');

    if (!trigger || !dropdown) return;

    function openMenu()  {
      dropdown.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      dropdown.removeAttribute('aria-hidden');
    }
    function closeMenu() {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      dropdown.setAttribute('aria-hidden', 'true');
    }
    function toggleMenu() {
      dropdown.classList.contains('is-open') ? closeMenu() : openMenu();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (CYBER.Admin && !CYBER.Admin.check()) {
        CYBER.Admin.require(function () { toggleMenu(); });
      } else {
        toggleMenu();
      }
    });

    document.addEventListener('click', function (e) {
      if (!document.getElementById('backup-menu-wrap').contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    btnBackup.addEventListener('click', function () {
      closeMenu();
      backupData();
    });

    btnRestore.addEventListener('click', function () {
      closeMenu();
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) restoreData(fileInput.files[0]);
    });

    /* ── Catálogo ── */
    if (btnExportCatalog) {
      btnExportCatalog.addEventListener('click', function () {
        closeMenu();
        exportCatalog();
      });
    }

    if (btnImportCatalog && catalogInput) {
      btnImportCatalog.addEventListener('click', function () {
        closeMenu();
        catalogInput.value = '';
        catalogInput.click();
      });
      catalogInput.addEventListener('change', function () {
        if (catalogInput.files && catalogInput.files[0]) importCatalog(catalogInput.files[0]);
      });
    }
  }


  /* ------------------------------------------------------------
     Relacionadas (para el modal)
     ------------------------------------------------------------ */

  function getRelated(art) {
    if (!app.graph || !app.graph.model) return [];
    const model = app.graph.model;
    const weights = Object.create(null);

    (model.neighbors[art.id] || []).forEach(function (link) {
      const node = model.byId[link.id];
      if (!node || node.type !== 'art') return;
      weights[link.id] = (weights[link.id] || 0) + (link.edge.weight || 1) + (link.edge.type === 'tag' ? 2 : 0);
    });

    return Object.keys(weights)
      .sort(function (a, b) { return weights[b] - weights[a]; })
      .slice(0, 6)
      .map(function (id) { return model.byId[id].artwork; });
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */

  function boot() {
    app.prefs = CYBER.Prefs.read();

    /* Garantizar que el tema por defecto sea CLARO */
    if (!app.prefs.themeDefaultLight) {
      app.prefs.theme = 'light';
      app.prefs.themeDefaultLight = true;
      savePrefs({ theme: 'light', themeDefaultLight: true });
    }

    /* idioma guardado, aplicado ANTES de cargar datos */
    CYBER.I18n.init(app.prefs.locale || 'es');

    /* tema guardado, aplicado lo antes posible (la intro también se tematiza) */
    document.documentElement.dataset.theme = app.prefs.theme || 'light';

    /* --- notificaciones y textos --- */
    CYBER.Toast.init();
    CYBER.I18n.applyDom();

    /* --- arranque instantáneo sin esperas artificiales --- */
    const bootConfig = CYBER.FallbackData.config;
    const loaderLines = CYBER.I18n.locale() === 'en'
      ? (bootConfig.ui.bootLines_en || bootConfig.ui.bootLines)
      : bootConfig.ui.bootLines;

    const loader = CYBER.Loader.run({ lines: loaderLines, stepDelay: 0, minDuration: 0 });
    document.body.classList.remove('is-booting');

    CYBER.store.patch({ loading: true });

    /* --- carga de datos --- */
    CYBER.DataService.load().then(function (data) {
      app.baseRaw = data.raw || {
        config: CYBER.FallbackData.config,
        categories: CYBER.FallbackData.categories,
        artworks: CYBER.FallbackData.artworks,
        tags: CYBER.FallbackData.tags
      };
      const loadedSource = data.source;
      const loadedWarnings = data.warnings;
      const userData = CYBER.UserData.read();
      if (CYBER.UserData.count(userData)) {
        data = CYBER.DataService.rebuild(app.baseRaw, userData);
        data.source = loadedSource;
        data.warnings = loadedWarnings;
      }
      app.data = data;
      CYBER.store.patch({
        config: data.config,
        categories: data.categories,
        artworks: data.artworks,
        source: data.source,
        loading: false
      });

      /* cabecera y documentos según la configuración y el idioma */
      const site = data.config.site;
      document.title = site.name + ' · ' + data.config.tagline;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', data.config.description || site.description || '');

      const brand = document.querySelector('.brand__name');
      if (brand) brand.setAttribute('data-text', brand.textContent);

      /* enlaces de demostración alimentados desde data/config.json */
      const links = data.config.links || {};
      dom.qsa('[data-fake-link]').forEach(function (anchor) {
        const target = links[anchor.dataset.fakeLink];
        if (!target) return;
        anchor.href = target;
        if (anchor.dataset.fakeLink === 'email') {
          anchor.textContent = target.replace(/^mailto:/i, '');
        }
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      });

      /* --- grafo --- */
      const graph = new CYBER.Graph({
        stage: '#graph',
        world: '#graph-world',
        edges: '#graph-edges',
        nodes: '#graph-nodes',
        minimap: '#minimap-canvas',
        tooltip: '#graph-tooltip',
        legend: '#graph-legend'
      });
      app.graph = graph;
      graph.setData(data);
      graph.bindEvents();
      graph.start();
      graph.setPhysics(app.prefs.physics !== false);
      graph.fit(true);

      /* --- panel de filtros --- */
      app.sidebar = new CYBER.Sidebar();
      app.sidebar.init(data);
      app.sidebar.onPhysicsChange(function (on) {
        graph.setPhysics(on);
        app.toolbar.setPhysics(on);
        savePrefs({ physics: on });
      });
      app.sidebar.setPhysicsSwitch(app.prefs.physics !== false);
      app.sidebar.updateStats({
        nodes: graph.model.stats.nodes,
        edges: graph.model.stats.edges,
        visible: data.artworks.length
      });
      setStatus('status-nodes', graph.model.stats.nodes);
      setStatus('status-edges', graph.model.stats.edges);
      setStatus('status-source', sourceLabel(data.source));

      /* --- galería --- */
      app.gallery = new CYBER.Gallery('#view-gallery', '#gallery');
      app.gallery.init();
      app.gallery.render(data.artworks);

      /* --- buscador --- */
      app.search = new CYBER.Search();
      app.search.init({
        onChange: function (query) { app.sidebar.setQuery(query); },
        onSubmit: function (query) {
          const trimmed = query.trim();
          if (!trimmed) return;
          const list = app.visibleArts ? app.visibleArts() : data.artworks;
          if (!list.length) {
            bus.emit(E.TOAST, { type: 'warn', text: t('toasts.noMatches', { query: dom.escape(trimmed) }) });
            return;
          }
          if (app.graph) app.graph.focusNode(list[0].id, 1.05);
          bus.emit(E.TOAST, {
            type: 'ok',
            text: t('toasts.matches', { count: list.length, title: dom.escape(list[0].title) })
          });
        },
        onClear: function () { app.sidebar.setQuery(''); }
      });

      /* --- modal --- */
      app.modal = new CYBER.Modal('modal-root');
      app.modal.init({
        getRelated: getRelated,
        getGalleryItems: function (art) {
          const gallery = String((art && art.gallery) || '').trim();
          const artworks = app.data ? app.data.artworks : data.artworks;
          return gallery ? artworks.filter(function (item) {
            return String((item && item.gallery) || '').trim() === gallery;
          }) : [];
        },
        list: data.artworks,
        onOpenInGraph: function (art) {
          setView('graph');
          app.graph.focusNode(art.id, 1.1);
        },
        onFilterTag: function (tag) {
          setView('graph');
          if (app.sidebar.filters.tags.indexOf(tag) === -1) app.sidebar.toggleTag(tag);
          else app.sidebar.emit();
        }
      });

      /* --- barra de herramientas --- */
      app.toolbar = new CYBER.Toolbar();
      app.toolbar.init({
        onZoom: function (factor) { graph.zoomBy(factor); },
        onFit: function () { graph.fit(); },
        onLayout: function () {
          graph.shuffle();
          bus.emit(E.TOAST, { type: 'info', text: t('toasts.layoutNew') });
        },
        onCore: function () { graph.focusNode(graph.model.coreId, 0.9); },
        onPhysics: function (on) {
          graph.setPhysics(on);
          app.sidebar.setPhysicsSwitch(on);
          savePrefs({ physics: on });
        },
        onCrt: function (on) {
          CYBER.store.set('crt', on);
          savePrefs({ crt: on });
        },
        onExport: exportJSON,
        onView: setView,
        onSidebar: function (open) { setSidebarOpen(open); }
      });

      /* --- conmutador de tema claro / oscuro --- */
      app.themeSwitch = new CYBER.ThemeSwitch('btn-theme');
      app.themeSwitch.init({
        onChange: function (theme) { savePrefs({ theme: theme }); }
      });
      app.themeSwitch.set(app.prefs.theme || 'light');

      /* --- editor de obras (crear / editar / eliminar) --- */
      app.editor = new CYBER.Editor('editor-root');
      app.editor.setCategories(data.categories);
      app.editor.init({
        findArtwork: function (id) {
          return app.data.artworks.find(function (art) { return art.id === id; });
        },
        onSave: function (raw, wasEdit) {
          if (wasEdit) CYBER.UserData.update(raw.id, raw);
          else CYBER.UserData.add(raw);
          applyUserData();
          bus.emit(E.TOAST, {
            type: 'ok',
            text: t(wasEdit ? 'editor.updated' : 'editor.created', { title: dom.escape(raw.title) })
          });
          if (wasEdit && app.modal) {
            bus.emit(E.ARTWORK_REQUEST, { id: raw.id, origin: 'editor' });
          }
        },
        onDelete: function (id) {
          const art = app.data.artworks.find(function (a) { return a.id === id; });
          const title = art ? art.title : id;
          CYBER.UserData.remove(id);
          applyUserData();
          bus.emit(E.TOAST, { type: 'warn', text: t('editor.deleted', { title: dom.escape(title) }) });
        }
      });

      /* preferencias de interfaz */
      app.toolbar.setCrt(app.prefs.crt !== false);
      app.toolbar.setPhysics(app.prefs.physics !== false);
      app.toolbar.setZoom(graph.camera.k);
      setSidebarOpen(window.innerWidth > 860);

      /* --- eventos --- */
      bindBus();
      bindKeyboard();
      bindProtection();
      startClock();
      initBackupMenu();

      /* inicializar modo administrador */
      if (CYBER.Admin) {
        CYBER.Admin.init(data.config);
      }
      const adminBadge = document.getElementById('btn-admin-badge');
      if (adminBadge && CYBER.Admin) {
        adminBadge.addEventListener('click', function () {
          CYBER.Admin.toggleOrPrompt();
        });
      }

      /* primer filtrado (deja todo visible) */
      applyFilters();
      setView(app.prefs.view || 'graph', { silent: true });

      /* reencuadre final cuando el layout se ha asentado */
      window.setTimeout(function () { graph.fit(); }, 900);

      return loader;
    }).then(function () {
      /* --- fin del arranque --- */
      bus.emit(E.TOAST, {
        type: 'ok',
        text: t('toasts.ready', {
          works: app.data.artworks.length,
          edges: app.graph.model.stats.edges
        })
      });

      if (app.data.warnings && app.data.warnings.length) {
        bus.emit(E.TOAST, { type: 'warn', text: t('toasts.embed') });
      }
    }).catch(function (err) {
      console.error('[app] fallo crítico en el arranque', err);
      const root = document.getElementById('toast-root');
      if (root) {
        root.appendChild(dom.el('div', { class: 'toast toast--error' }, [
          dom.el('span', { class: 'toast__icon', text: '×' }),
          dom.el('span', {
            class: 'toast__text',
            html: t('toasts.error', { message: dom.escape(err.message) })
          })
        ]));
      }
      document.body.classList.remove('is-booting');
      const loaderEl = document.getElementById('loader');
      if (loaderEl) loaderEl.classList.add('is-done');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.CYBER = window.CYBER || {});
