/* ============================================================
   graph/graph.js — orquestador del lienzo de nodos
   Expone: CYBER.Graph
   ------------------------------------------------------------
   Responsabilidades:
     · física (layout) + pintado de nodos y aristas
     · cámara (paneo, zoom, encuadre) y minimapa
     · interacción (arrastrar, seleccionar, resaltar relaciones)
     · aplicación de filtros sobre el grafo
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const M = CYBER.M;
  const bus = CYBER.bus;

  /** Atajo de traducción (con respaldo si el motor i18n no está). */
  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function Graph(refs) {
    this.refs = {
      stage: dom.qs(refs.stage),
      world: dom.qs(refs.world),
      edges: dom.qs(refs.edges),
      nodes: dom.qs(refs.nodes),
      minimap: dom.qs(refs.minimap),
      tooltip: dom.qs(refs.tooltip),
      legend: dom.qs(refs.legend)
    };

    this.model = null;
    this.camera = new CYBER.Camera({ minZoom: 0.26, maxZoom: 2.6 });
    this.layout = null;
    this.edgeLayer = new CYBER.EdgeLayer(this.refs.edges, { packets: true });
    this.nodeLayer = new CYBER.NodeLayer(this.refs.nodes, { thumbWidth: 208, thumbHeight: 130 });

    this.nodesById = Object.create(null);
    this.physics = true;
    this.dirty = true;
    this.visibleIds = null;
    this.focusId = null;
    this.selectedId = null;
    this.relatedIds = [];
    this.raf = null;
    this.fps = 0;
    this.frames = 0;
    this.lastFpsAt = 0;
    this.lastMinimapAt = 0;
    this.pointers = new Map();
    this.gesture = null;
    this.cleanup = [];
  }

  /* ------------------------------------------------------------
     Construcción
     ------------------------------------------------------------ */

  Graph.prototype.setData = function (data) {
    this.data = data;
    this.model = CYBER.GraphModel.build(data.artworks, data.categories, data.config);

    this.nodesById = Object.create(null);
    this.model.nodes.forEach(function (node) { this.nodesById[node.id] = node; }, this);

    const graphCfg = data.config.graph || {};
    this.camera.minZoom = graphCfg.minZoom || 0.26;
    this.camera.maxZoom = graphCfg.maxZoom || 2.6;

    this.layout = CYBER.Layout.create(this.model.nodes, this.model.edges, data.config);
    this.layout.place();

    this.edgeLayer.opts.packets = graphCfg.packets !== false;
    this.edgeLayer.setEdges(this.model.edges, this.model.nodes);

    const self = this;
    this.nodeLayer.build(this.model.nodes, {
      onSelect: function (node) { self.select(node.id, { fromUser: true }); },
      onFocus: function (node) { self.focusNode(node.id); },
      onFavorite: function (node) { self.toggleFavorite(node); },
      onBind: function (node, el) { self.bindNode(node, el); }
    });

    this.nodeLayer.setFavorites(function (id) { return CYBER.Favorites.has(id); });
    this.buildLegend();
    this.fit(true);
    return this.model;
  };

  /** Añade interacción a hubs y núcleo (las obras ya la traen en su nodo). */
  Graph.prototype.bindNode = function (node, el) {
    if (node.type === 'art') return;
    const self = this;

    el.addEventListener('click', function () {
      if (self.suppressClick) return;
      self.select(node.id, { fromUser: true });
    });

    el.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        self.select(node.id, { fromUser: true });
      }
    });

    el.addEventListener('dblclick', function () { self.focusNode(node.id); });
  };

  Graph.prototype.buildLegend = function () {
    /* la leyenda se replica en el lienzo (esquina) y en la vista INFO */
    const targets = [this.refs.legend, document.getElementById('about-legend')].filter(Boolean);
    if (!targets.length) return;

    const rows = [
      { text: t('ui.legend.core'), swatch: 'hex', color: '#00eaff' },
      { text: t('ui.legend.hub'), swatch: 'hex', color: '#a15cff' },
      { text: t('ui.legend.art'), swatch: 'card', color: '#ff2e97' },
      { text: t('ui.legend.catEdge'), line: true },
      { text: t('ui.legend.tagEdge'), line: true, dash: true }
    ];

    targets.forEach(function (legend) {
      dom.clear(legend);
      rows.forEach(function (row) {
        const left = row.line
          ? dom.el('span', { class: 'legend__line' + (row.dash ? ' legend__line--dash' : '') })
          : dom.el('span', {
            class: 'legend__swatch legend__swatch--' + (row.swatch === 'card' ? 'card' : 'hex'),
            style: { '--cat-color': row.color }
          });
        legend.appendChild(dom.el('div', { class: 'legend__row' }, [left, dom.el('span', { text: row.text })]));
      });
    });
  };

  /* ------------------------------------------------------------
     Ciclo de dibujo
     ------------------------------------------------------------ */

  Graph.prototype.start = function () {
    if (this.raf) return;
    const self = this;

    function frame(now) {
      const moved = self.physics ? self.layout.tick() : false;
      if (moved) {
        self.nodeLayer.updatePositions();
        self.dirty = true;
      }

      if (self.dirty) {
        self.edgeLayer.render(self.nodesById, now);
        self.dirty = false;
      }

      if (now - self.lastMinimapAt > 110) {
        self.drawMinimap();
        self.lastMinimapAt = now;
      }

      self.frames += 1;
      if (now - self.lastFpsAt > 1000) {
        self.fps = Math.round(self.frames * 1000 / (now - self.lastFpsAt));
        self.frames = 0;
        self.lastFpsAt = now;
        bus.emit(CYBER.EVENTS.GRAPH_STATS, {
          fps: self.fps,
          zoom: self.camera.k,
          energy: self.physics ? self.layout.energy() : 0
        });
      }

      self.raf = requestAnimationFrame(frame);
    }

    this.lastFpsAt = performance.now();
    this.raf = requestAnimationFrame(frame);
  };

  Graph.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  Graph.prototype.applyCamera = function (animate) {
    this.camera.applyTo(this.refs.world, animate === undefined ? 520 : animate);
    bus.emit(CYBER.EVENTS.ZOOM_CHANGED, { zoom: this.camera.k });
  };

  /* ------------------------------------------------------------
     Interacción
     ------------------------------------------------------------ */

  Graph.prototype.bindEvents = function () {
    const self = this;
    const stage = this.refs.stage;
    if (!stage) return;

    function screenPoint(evt) {
      const rect = stage.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }

    this.screenPoint = screenPoint;
    this.viewSize = function () {
      const rect = stage.getBoundingClientRect();
      return { w: rect.width, h: rect.height };
    };

    /* ---------- punteros: arrastre, paneo y pinza ---------- */
    stage.addEventListener('pointerdown', function (evt) {
      if (evt.button !== 0 && evt.pointerType === 'mouse') return;
      stage.setPointerCapture && (function () {
        try { stage.setPointerCapture(evt.pointerId); } catch (err) { /* puntero ya liberado */ }
      })();
      self.pointers.set(evt.pointerId, screenPoint(evt));

      if (self.pointers.size === 2) {
        const points = Array.from(self.pointers.values());
        self.gesture = {
          type: 'pinch',
          startDist: Math.max(1, M.dist(points[0].x, points[0].y, points[1].x, points[1].y)),
          startZoom: self.camera.k,
          mid: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
          startCam: { x: self.camera.x, y: self.camera.y }
        };
        return;
      }

      if (self.pointers.size > 2) return;

      const hit = self.nodeLayer.fromElement(evt.target);
      const point = screenPoint(evt);
      const world = self.camera.toWorld(point.x, point.y);

      stage.classList.add('has-interacted');
      self.suppressClick = false;

      if (hit && !evt.target.closest('.node__fav')) {
        /* arrastre de nodo */
        self.gesture = {
          type: 'node',
          id: hit.node.id,
          node: hit.node,
          offset: { x: world.x - hit.node.x, y: world.y - hit.node.y },
          start: point,
          moved: 0
        };
        self.layout.pin(hit.node.id, hit.node.x, hit.node.y);
        stage.classList.add('is-dragging-node');
      } else {
        self.gesture = {
          type: 'pan',
          start: point,
          camStart: { x: self.camera.x, y: self.camera.y },
          moved: 0,
          /* pulsar la estrella de favorito no debe deseleccionar el grafo */
          onFav: !!(evt.target.closest && evt.target.closest('.node__fav'))
        };
        stage.classList.add('is-panning');
      }
    });

    stage.addEventListener('pointermove', function (evt) {
      if (!self.pointers.has(evt.pointerId)) {
        self.handleHover(evt, screenPoint(evt));
        return;
      }
      self.pointers.set(evt.pointerId, screenPoint(evt));
      const gesture = self.gesture;
      if (!gesture) return;

      if (gesture.type === 'pinch' && self.pointers.size >= 2) {
        const points = Array.from(self.pointers.values());
        const dist = Math.max(1, M.dist(points[0].x, points[0].y, points[1].x, points[1].y));
        const factor = dist / gesture.startDist;
        const zoom = M.clamp(gesture.startZoom * factor, self.camera.minZoom, self.camera.maxZoom);
        const ratio = zoom / gesture.startZoom;
        self.camera.k = zoom;
        self.camera.x = gesture.mid.x - (gesture.mid.x - gesture.startCam.x) * ratio;
        self.camera.y = gesture.mid.y - (gesture.mid.y - gesture.startCam.y) * ratio;
        self.applyCamera(0);
        return;
      }

      const point = screenPoint(evt);
      if (gesture.type === 'pan') {
        gesture.moved += M.dist(point.x, point.y, gesture.start.x, gesture.start.y);
        self.camera.animate = false;
        self.camera.x = gesture.camStart.x + (point.x - gesture.start.x);
        self.camera.y = gesture.camStart.y + (point.y - gesture.start.y);
        gesture.start = point;
        gesture.camStart = { x: self.camera.x, y: self.camera.y };
        self.applyCamera(0);
      } else if (gesture.type === 'node') {
        const world = self.camera.toWorld(point.x, point.y);
        const x = world.x - gesture.offset.x;
        const y = world.y - gesture.offset.y;
        gesture.moved += M.dist(point.x, point.y, gesture.start.x, gesture.start.y);
        gesture.start = point;
        self.layout.pin(gesture.id, x, y);
        self.nodeLayer.updatePositions();
        self.dirty = true;
      }
    });

    function endPointer(evt) {
      const gesture = self.gesture;
      self.pointers.delete(evt.pointerId);

      if (gesture && gesture.type === 'node' && evt.pointerId !== undefined) {
        self.layout.unpin(gesture.id);
        self.nodeLayer.setState(self.stateOf());
        if (gesture.moved < 6) {
          /* fue un clic, no un arrastre */
          self.suppressClick = true;
          self.select(gesture.id, { fromUser: true });
          window.setTimeout(function () { self.suppressClick = false; }, 60);
        }
      } else if (gesture && gesture.type === 'pan' && gesture.moved < 6 && !gesture.onFav) {
        /* clic en el vacío: deselecciona */
        self.select(null);
      }

      self.gesture = null;
      stage.classList.remove('is-panning');
      stage.classList.remove('is-dragging-node');
    }

    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('pointerleave', function (evt) {
      if (!self.gesture) self.hideTooltip();
      endPointer(evt);
    });

    /* ---------- zoom con rueda ---------- */
    stage.addEventListener('wheel', function (evt) {
      evt.preventDefault();
      const point = screenPoint(evt);
      const factor = Math.exp(-evt.deltaY * (evt.deltaMode === 1 ? 0.05 : 0.0016));
      self.camera.zoomAt(point, factor, false);
      self.applyCamera(0);
      stage.classList.add('has-interacted');
    }, { passive: false });

    /* ---------- doble clic en el vacío: reencuadrar ---------- */
    stage.addEventListener('dblclick', function (evt) {
      if (!self.nodeLayer.fromElement(evt.target)) self.fit();
    });

    /* ---------- minimapa navegable ---------- */
    const minimap = this.refs.minimap;
    if (minimap) {
      minimap.parentElement.addEventListener('click', function (evt) {
        const canvas = minimap;
        const rect = canvas.getBoundingClientRect();
        const mx = (evt.clientX - rect.left) / rect.width;
        const my = (evt.clientY - rect.top) / rect.height;
        const bounds = self.minimapBounds || { minX: -600, minY: -600, maxX: 600, maxY: 600 };
        const worldX = M.lerp(bounds.minX, bounds.maxX, mx);
        const worldY = M.lerp(bounds.minY, bounds.maxY, my);
        const size = self.viewSize();
        self.camera.centerOn(worldX, worldY, size.w, size.h, null, true);
        self.applyCamera(520);
      });
    }

    /* ---------- reencuadre al cambiar el tamaño ---------- */
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(dom.debounce(function () {
        self.tooltipRect = null;
        self.drawMinimap();
      }, 160));
      observer.observe(stage);
      this.cleanup.push(function () { observer.disconnect(); });
    } else {
      const onResize = dom.debounce(function () { self.drawMinimap(); }, 180);
      window.addEventListener('resize', onResize);
      this.cleanup.push(function () { window.removeEventListener('resize', onResize); });
    }

    return this;
  };

  /* ------------------------------------------------------------
     Tooltip
     ------------------------------------------------------------ */

  Graph.prototype.handleHover = function (evt, point) {
    const hit = this.nodeLayer.fromElement(evt.target);
    if (!hit || this.gesture) {
      this.hideTooltip();
      if (this.hoveredId) {
        this.hoveredId = null;
        bus.emit(CYBER.EVENTS.NODE_HOVER, { node: null });
      }
      return;
    }

    if (this.hoveredId !== hit.node.id) {
      this.hoveredId = hit.node.id;
      bus.emit(CYBER.EVENTS.NODE_HOVER, { node: hit.node });
    }
    this.showTooltip(hit.node, point);
  };

  Graph.prototype.showTooltip = function (node, point) {
    const tooltip = this.refs.tooltip;
    if (!tooltip) return;

    const art = node.artwork;
    const kind = art ? art.code : (node.type === 'hub' ? t('node.technique') : t('node.core'));
    let html = '<b>' + dom.escape(node.icon + ' ' + kind) + '</b>';
    html += '<span>' + dom.escape(node.label) + '</span>';

    if (art) {
      html += '<em>' + dom.escape(art.technique) + ' · ' + dom.escape(String(art.year)) + ' · ' + dom.escape(art.size) + '</em>';
      const labels = (art.tagLabels && art.tagLabels.length ? art.tagLabels : art.tags).slice(0, 5);
      html += '<em>' + labels.map(function (tag) { return '#' + tag; }).join(' ') + '</em>';
    } else if (node.type === 'hub') {
      html += '<em>' + t('node.hubTip', { count: node.count }) + '</em>';
    } else {
      html += '<em>' + t('node.worksSub', { count: node.count }) + '</em>';
    }

    tooltip.innerHTML = html;
    tooltip.style.setProperty('--cat-color', node.color);
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');

    const stage = this.refs.stage.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let x = point.x + 18;
    let y = point.y + 16;
    if (x + width > stage.width - 10) x = point.x - width - 18;
    if (y + height > stage.height - 10) y = point.y - height - 16;
    tooltip.style.left = Math.max(6, x) + 'px';
    tooltip.style.top = Math.max(6, y) + 'px';
  };

  Graph.prototype.hideTooltip = function () {
    const tooltip = this.refs.tooltip;
    if (!tooltip) return;
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  };

  /* ------------------------------------------------------------
     Estado y selección
     ------------------------------------------------------------ */

  Graph.prototype.stateOf = function () {
    return {
      selectedId: this.selectedId,
      focusId: this.focusId,
      relatedIds: this.relatedIds,
      filteredIds: this.visibleIds
    };
  };

  Graph.prototype.refreshState = function () {
    const state = this.stateOf();
    this.nodeLayer.setState(state);
    this.edgeLayer.setState(state);
  };

  Graph.prototype.select = function (id, options) {
    const opts = options || {};
    this.selectedId = id || null;
    this.focusId = id || null;
    this.relatedIds = id ? CYBER.GraphModel.relatedOf(this.model, id, 1) : [];

    this.refreshState();

    if (id) {
      const edgeIds = CYBER.GraphModel.edgesOf(this.model, id).map(function (edge) { return edge.id; });
      this.edgeLayer.setPackets(edgeIds);
      this.edgeLayer.render(this.nodesById, performance.now());
    } else {
      this.edgeLayer.setPackets([]);
    }

    if (opts.fromUser) this.nodeLayer.pulse(id);
    bus.emit(CYBER.EVENTS.NODE_SELECT, {
      id: id,
      node: id ? this.nodesById[id] : null,
      related: this.relatedIds.slice(),
      fromUser: !!opts.fromUser
    });
    return this;
  };

  Graph.prototype.toggleFavorite = function (node) {
    if (node.type !== 'art') return;
    const on = CYBER.Favorites.toggle(node.id);
    this.nodeLayer.setFavorites(function (id) { return CYBER.Favorites.has(id); });
    bus.emit(CYBER.EVENTS.TOAST, {
      type: on ? 'info' : 'warn',
      text: t(on ? 'toasts.favAdded' : 'toasts.favRemoved', { title: dom.escape(node.label) })
    });
  };

  /** Centra la cámara en un nodo concreto. */
  Graph.prototype.focusNode = function (id, zoom) {
    const node = this.nodesById[id];
    if (!node) return;
    const size = this.viewSize ? this.viewSize() : { w: 1200, h: 800 };
    this.select(id, { fromUser: true });
    this.camera.centerOn(node.x, node.y, size.w, size.h, zoom || Math.max(0.75, Math.min(1.15, this.camera.k)), true);
    this.applyCamera(560);
    this.nodeLayer.pulse(id);
  };

  /* ------------------------------------------------------------
     Cámara
     ------------------------------------------------------------ */

  Graph.prototype.zoomBy = function (factor) {
    const size = this.viewSize ? this.viewSize() : { w: 1200, h: 800 };
    this.camera.zoomAt({ x: size.w / 2, y: size.h / 2 }, factor, true);
    this.applyCamera(220);
  };

  Graph.prototype.fit = function (immediate) {
    const size = this.viewSize ? this.viewSize() : { w: 1200, h: 800 };
    const nodes = this.model.nodes.filter(function (node) {
      return !this.visibleIds || this.visibleIds[node.id];
    }, this);
    this.camera.fit(nodes.length ? nodes : this.model.nodes, size.w, size.h, 150);
    this.camera.animate = !immediate;
    this.applyCamera(immediate ? 0 : 520);
    return this;
  };

  Graph.prototype.resetView = function () {
    this.layout.place();
    this.layout.reheat(1.2);
    this.nodeLayer.updatePositions();
    this.dirty = true;
    this.select(null);
    this.fit();
    bus.emit(CYBER.EVENTS.LAYOUT_RESET, {});
  };

  Graph.prototype.shuffle = function () {
    this.layout.shuffle();
    this.layout.reheat(1.4);
    this.nodeLayer.updatePositions();
    this.dirty = true;
    this.fit();
  };

  Graph.prototype.setPhysics = function (enabled) {
    this.physics = !!enabled;
    if (this.physics) this.layout.reheat(0.7);
    return this.physics;
  };

  /* ------------------------------------------------------------
     Filtros
     ------------------------------------------------------------ */

  /**
   * Aplica los filtros activos y devuelve el número de obras visibles.
   * @param {{categories:string[], tags:string[], query:string,
   *          onlyFavorites:boolean, onlyAvailable:boolean}} filters
   */
  Graph.prototype.applyFilters = function (filters) {
    const self = this;
    const cfg = this.data.config.ui || {};
    const query = String(filters.query || '').trim().toLowerCase();
    const categories = filters.categories || [];
    const tags = (filters.tags || []).map(function (t) { return t.toLowerCase(); });

    const visible = Object.create(null);
    let count = 0;
    let hubVisible = Object.create(null);

    this.model.nodes.forEach(function (node) {
      if (node.type === 'art') {
        const art = node.artwork;
        const okCategory = !categories.length || categories.indexOf(art.category) > -1;
        const okTags = !tags.length || tags.every(function (tag) { return art.tags.indexOf(tag) > -1; });
        const okFav = !filters.onlyFavorites || CYBER.Favorites.has(art.id);
        const okAvailable = !filters.onlyAvailable || art.available;
        const okQuery = !query || art.searchText.indexOf(query) > -1;
        const okGallery = !filters.gallery || art.gallery === filters.gallery;
        const ok = okCategory && okTags && okFav && okAvailable && okQuery && okGallery;

        visible[node.id] = ok;
        if (ok) {
          count += 1;
          hubVisible[node.category] = true;
        }
      } else if (node.type === 'hub') {
        visible[node.id] = false;
      } else {
        visible[node.id] = false;
      }
    });

    /* hubs y núcleo se muestran según lo que quede visible */
    Object.keys(hubVisible).forEach(function (categoryId) {
      visible[CYBER.GraphModel.hubId(categoryId)] = true;
    });
    visible[this.model.coreId] = count > 0;

    /* añade los nodos visibles por arrastre de relaciones seleccionadas */
    this.visibleIds = visible;
    this.nodeLayer.setState({ filteredIds: visible, selectedId: this.selectedId, focusId: this.focusId, relatedIds: this.relatedIds });
    this.edgeLayer.applyVisibility(visible);
    this.toggleEmptyState(count === 0);

    /* reacomoda la constelación con lo que queda */
    this.layout.reheat(0.45);
    this.dirty = true;
    this.visibleCount = count;

    if (this.selectedId && !visible[this.selectedId]) this.select(null);

    bus.emit(CYBER.EVENTS.GRAPH_STATS, { visible: count, zoom: this.camera.k, fps: this.fps });
    return count;
  };

  Graph.prototype.toggleEmptyState = function (show) {
    let empty = this.refs.stage.querySelector('.graph__empty');
    const isClean = !this.data || !this.data.artworks || this.data.artworks.length === 0;
    const titleKey = isClean ? 'ui.graph.emptyArchiveTitle' : 'ui.graph.emptyTitle';
    const textKey = isClean ? 'ui.graph.emptyArchiveText' : 'ui.graph.emptyText';
    const hintKey = isClean ? 'ui.graph.emptyArchiveHint' : 'ui.graph.emptyHint';

    if (show && !empty) {
      const children = [
        dom.el('strong', { text: t(titleKey) }),
        dom.el('span', { text: t(textKey) }),
        dom.el('span', { text: t(hintKey) })
      ];
      if (isClean) {
        children.push(dom.el('button', {
          class: 'btn btn--tiny btn--magenta',
          style: { marginTop: '14px', pointerEvents: 'auto' },
          text: t('ui.graph.emptyArchiveBtn'),
          on: { click: function () { CYBER.bus.emit(CYBER.EVENTS.EDITOR_OPEN_NEW); } }
        }));
      }
      empty = dom.el('div', { class: 'graph__empty' }, children);
      this.refs.stage.appendChild(empty);
    } else if (!show && empty) {
      empty.remove();
    } else if (show && empty) {
      /* ya existe: refresca el texto por si cambió el idioma */
      const parts = empty.children;
      if (parts[0]) parts[0].textContent = t(titleKey);
      if (parts[1]) parts[1].textContent = t(textKey);
      if (parts[2]) parts[2].textContent = t(hintKey);
    }
  };

  /**
   * Reaplica el idioma a todo lo que dibuja el grafo: etiquetas de los
   * nodos, leyenda, tooltip y estado vacío. No repinta las miniaturas.
   */
  Graph.prototype.refreshLabels = function () {
    const byId = Object.create(null);

    (this.data.categories || []).forEach(function (cat) { byId[cat.id] = cat; });

    this.model.nodes.forEach(function (node) {
      if (node.type === 'hub' && byId[node.category]) {
        node.label = byId[node.category].label;
        node.sublabel = byId[node.category].description;
      }
      if (node.type === 'art' && node.artwork) {
        node.label = node.artwork.title;
        node.sublabel = node.artwork.technique;
      }
    });

    this.nodeLayer.refreshLabels();
    this.buildLegend();
    this.hideTooltip();
    this.dirty = true;

    if (this.refs.stage.querySelector('.graph__empty')) this.toggleEmptyState(true);
    return this;
  };

  /** Nodos de obra visibles en formato ligero (para exportar). */
  Graph.prototype.visibleArtworks = function () {
    const self = this;
    return this.data.artworks.filter(function (art) {
      return !self.visibleIds || self.visibleIds[art.id];
    });
  };

  /* ------------------------------------------------------------
     Minimapa
     ------------------------------------------------------------ */

  Graph.prototype.drawMinimap = function () {
    const canvas = this.refs.minimap;
    if (!canvas || !this.model) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 200;
    const cssH = canvas.clientHeight || 140;
    if (canvas.width !== Math.round(cssW * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    /* límites con margen */
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.model.nodes.forEach(function (node) {
      minX = Math.min(minX, node.x - node.radius);
      minY = Math.min(minY, node.y - node.radius);
      maxX = Math.max(maxX, node.x + node.radius);
      maxY = Math.max(maxY, node.y + node.radius);
    });
    const pad = 90;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    this.minimapBounds = { minX: minX, minY: minY, maxX: maxX, maxY: maxY };

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min(cssW / spanX, cssH / spanY);
    const offsetX = (cssW - spanX * scale) / 2;
    const offsetY = (cssH - spanY * scale) / 2;

    function toMap(x, y) {
      return { x: offsetX + (x - minX) * scale, y: offsetY + (y - minY) * scale };
    }

    /* aristas */
    ctx.strokeStyle = 'rgba(0,234,255,.22)';
    ctx.lineWidth = 0.6;
    this.model.edges.forEach(function (edge) {
      const a = this.nodesById[edge.source];
      const b = this.nodesById[edge.target];
      if (!a || !b) return;
      if (this.visibleIds && !(this.visibleIds[a.id] && this.visibleIds[b.id])) return;
      const pa = toMap(a.x, a.y);
      const pb = toMap(b.x, b.y);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }, this);

    /* nodos */
    this.model.nodes.forEach(function (node) {
      if (this.visibleIds && !this.visibleIds[node.id]) return;
      const p = toMap(node.x, node.y);
      const r = node.type === 'core' ? 4 : (node.type === 'hub' ? 3 : 2);
      ctx.fillStyle = node.color;
      ctx.globalAlpha = this.selectedId === node.id ? 1 : 0.72;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, M.TAU);
      ctx.fill();
    }, this);
    ctx.globalAlpha = 1;

    /* rectángulo del viewport */
    const size = this.viewSize ? this.viewSize() : { w: 1200, h: 800 };
    const view = this.camera.viewportRect(size.w, size.h);
    const p1 = toMap(view.x, view.y);
    const p2 = toMap(view.x + view.w, view.y + view.h);
    ctx.strokeStyle = 'rgba(255,46,151,.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p1.x, p1.y, Math.max(3, p2.x - p1.x), Math.max(3, p2.y - p1.y));
  };

  Graph.prototype.destroy = function () {
    this.stop();
    this.cleanup.forEach(function (fn) { fn(); });
    this.cleanup = [];
    this.nodeLayer.destroy();
  };

  CYBER.Graph = Graph;
})(window.CYBER = window.CYBER || {});
