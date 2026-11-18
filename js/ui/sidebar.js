/* ============================================================
   ui/sidebar.js — panel de filtros y telemetría
   Expone: CYBER.Sidebar
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  /** Traducción con respaldo si el motor i18n no estuviera. */
  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  /** Etiqueta legible del origen de datos. */
  function sourceLabel(source) {
    if (source === 'json') return t('ui.source.json');
    if (source === 'embed') return t('ui.source.embed');
    if (source === 'mixto') return t('ui.source.mixed');
    return t('ui.source.loading');
  }

  function Sidebar() {
    this.el = {
      categories: document.getElementById('filter-categories'),
      tags: document.getElementById('filter-techniques'),
      fav: document.getElementById('filter-fav'),
      available: document.getElementById('filter-available'),
      gallery: document.getElementById('filter-gallery'),
      physics: document.getElementById('filter-physics'),
      clear: document.getElementById('btn-clear-filters'),
      favCount: document.getElementById('fav-count'),
      total: document.getElementById('ro-total'),
      visible: document.getElementById('ro-visible'),
      hours: document.getElementById('ro-hours'),
      nodes: document.getElementById('ro-nodes'),
      edges: document.getElementById('ro-edges'),
      source: document.getElementById('ro-source')
    };

    this.filters = {
      categories: [],
      tags: [],
      query: '',
      onlyFavorites: false,
      onlyAvailable: false,
      gallery: ''
    };

    this.categories = [];
    this.categoryCounts = Object.create(null);
  }

  /** Lista de técnicas (se reconstruye al cambiar de idioma). */
  Sidebar.prototype.buildCategories = function () {
    const self = this;
    dom.clear(this.el.categories);

    this.categories.forEach(function (cat) {
      const item = dom.el('button', {
        class: 'catitem',
        dataset: { category: cat.id },
        style: { '--cat-color': cat.color },
        attrs: { 'aria-pressed': 'false', title: cat.description },
        on: { click: function () { self.toggleCategory(cat.id); } }
      }, [
        dom.el('span', { class: 'catitem__swatch' }),
        dom.el('span', { class: 'catitem__label', text: cat.label }),
        dom.el('span', { class: 'catitem__count', text: self.categoryCounts[cat.id] || 0 })
      ]);
      self.el.categories.appendChild(item);
    });

    this.refreshUI();
    return this;
  };

  /** Nube de etiquetas (clave interna + etiqueta traducida). */
  Sidebar.prototype.buildTags = function (data) {
    const self = this;
    dom.clear(this.el.tags);

    CYBER.DataService.tagCloud(data.artworks).forEach(function (entry) {
      const chip = dom.el('button', {
        class: 'tag',
        dataset: { tag: entry.tag },
        text: entry.label + ' ' + entry.count,
        attrs: { 'aria-pressed': 'false', title: '#' + entry.label },
        on: { click: function () { self.toggleTag(entry.tag); } }
      });
      self.el.tags.appendChild(chip);
    });

    this.refreshUI();
    return this;
  };

  /** Reaplica el idioma a técnicas, etiquetas y telemetría. */
  Sidebar.prototype.refreshLabels = function () {
    if (!this.data) return this;
    this.buildCategories();
    this.buildTags(this.data);
    if (this.el.source) this.el.source.textContent = sourceLabel(this.data.source);
    if (this.data.artworks) {
      this.el.hours.textContent = CYBER.Fmt.number(CYBER.DataService.totalHours(this.data.artworks)) + ' h';
    }
    return this;
  };

  Sidebar.prototype.init = function (data) {
    const self = this;
    this.data = data;
    this.categories = data.categories;
    this.categoryCounts = CYBER.DataService.countByCategory(data.artworks, data.categories);

    this.buildCategories();
    this.buildGallery();
    this.buildTags(data);

    /* interruptores: se conectan UNA sola vez (init puede rellamarse al
       reconstruir el archivo tras crear/editar/borrar obras) */
    if (!this._bound) {
      this._bound = true;

      if (this.el.fav) {
        this.el.fav.addEventListener('change', function (evt) {
          self.filters.onlyFavorites = evt.target.checked;
          self.emit();
        });
      }
      if (this.el.available) {
        this.el.available.addEventListener('change', function (evt) {
          self.filters.onlyAvailable = evt.target.checked;
          self.emit();
        });
      }
      if (this.el.gallery) {
        this.el.gallery.addEventListener('change', function () {
          self.filters.gallery = self.el.gallery.value;
          self.emit();
        });
      }
      if (this.el.clear) {
        this.el.clear.addEventListener('click', function () { self.clear(); });
      }

      bus.on(CYBER.EVENTS.FAVORITES_CHANGED, function () {
        self.updateFavorites();
        if (self.filters.onlyFavorites) self.emit();
      });
    }

    /* datos de telemetría fijos */
    this.el.total.textContent = data.artworks.length;
    this.el.hours.textContent = CYBER.Fmt.number(CYBER.DataService.totalHours(data.artworks)) + ' h';
    this.el.source.textContent = sourceLabel(data.source);
    this.updateFavorites();

    return this;
  };

  /** Refleja el estado de los filtros en la interfaz. */
  Sidebar.prototype.refreshUI = function () {
    const self = this;

    dom.qsa('.catitem', this.el.categories).forEach(function (item) {
      const id = item.dataset.category;
      const active = self.filters.categories.indexOf(id) > -1;
      item.classList.toggle('is-active', active);
      item.classList.toggle('is-off', self.filters.categories.length > 0 && !active);
      item.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    dom.qsa('.tag', this.el.tags).forEach(function (chip) {
      const active = self.filters.tags.indexOf(chip.dataset.tag) > -1;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  Sidebar.prototype.toggleCategory = function (id) {
    const list = this.filters.categories;
    const idx = list.indexOf(id);
    if (idx > -1) list.splice(idx, 1);
    else list.push(id);
    this.emit();
  };

  Sidebar.prototype.toggleTag = function (tag) {
    const list = this.filters.tags;
    const idx = list.indexOf(tag);
    if (idx > -1) list.splice(idx, 1);
    else list.push(tag);
    this.emit();
  };

  Sidebar.prototype.setQuery = function (query) {
    if (this.filters.query === query) return;
    this.filters.query = query;
    this.emit();
  };

  Sidebar.prototype.clear = function (silent) {
    this.filters.categories = [];
    this.filters.tags = [];
    this.filters.query = '';
    this.filters.onlyFavorites = false;
    this.filters.onlyAvailable = false;
    this.filters.gallery = '';
    if (this.el.fav) this.el.fav.checked = false;
    if (this.el.available) this.el.available.checked = false;
    if (this.el.gallery) this.el.gallery.selectedIndex = 0;
    this.refreshUI();
    bus.emit(CYBER.EVENTS.FILTERS_CHANGED, { filters: this.snapshot(), cleared: true });
    if (!silent) {
      bus.emit(CYBER.EVENTS.TOAST, { type: 'ok', text: t('toasts.filtersReset') });
    }
    return this.filters;
  };
  
  /** Construye el selector de galerías. */
  Sidebar.prototype.buildGallery = function () {
    const self = this;
    dom.clear(this.el.gallery);
    // Build gallery options from artworks data (unique galleries)
    const galleries = new Set();
    if (this.data && this.data.artworks) {
      this.data.artworks.forEach(function (art) {
        if (art.gallery && art.gallery.trim()) {
          galleries.add(art.gallery);
        }
      });
    }
    const galleryList = Array.from(galleries).sort();
    galleryList.forEach(function (gal) {
      const opt = dom.el('option', { value: gal, text: gal });
      self.el.gallery.appendChild(opt);
    });
    // Set initial value
    self.el.gallery.value = self.filters.gallery || '';
    self.refreshUI();
    return this;
  };

  Sidebar.prototype.snapshot = function () {
    return {
      categories: this.filters.categories.slice(),
      tags: this.filters.tags.slice(),
      query: this.filters.query,
      onlyFavorites: this.filters.onlyFavorites,
      onlyAvailable: this.filters.onlyAvailable,
      gallery: this.filters.gallery
    };
  };

  Sidebar.prototype.emit = function () {
    this.refreshUI();
    bus.emit(CYBER.EVENTS.FILTERS_CHANGED, { filters: this.snapshot(), cleared: false });
  };

  Sidebar.prototype.updateFavorites = function () {
    if (this.el.favCount) this.el.favCount.textContent = CYBER.Favorites.count();
  };

  /** Actualiza los indicadores numéricos del panel y del pie. */
  Sidebar.prototype.updateStats = function (stats) {
    if (!stats) return;
    if (stats.visible !== undefined && this.el.visible) {
      this.el.visible.textContent = stats.visible;
      this.el.visible.classList.toggle('is-hot', stats.visible === 0);
    }
    if (stats.nodes !== undefined && this.el.nodes) this.el.nodes.textContent = stats.nodes;
    if (stats.edges !== undefined && this.el.edges) this.el.edges.textContent = stats.edges;
  };

  Sidebar.prototype.isPhysicsOn = function () {
    return this.el.physics ? this.el.physics.checked : true;
  };

  Sidebar.prototype.setPhysicsSwitch = function (on) {
    if (this.el.physics) this.el.physics.checked = !!on;
  };

  Sidebar.prototype.onPhysicsChange = function (handler) {
    if (!this.el.physics) return;
    this.el.physics.addEventListener('change', function (evt) { handler(evt.target.checked); });
  };

  CYBER.Sidebar = Sidebar;
})(window.CYBER = window.CYBER || {});
