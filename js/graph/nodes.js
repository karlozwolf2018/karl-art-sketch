/* ============================================================
   graph/nodes.js — capa DOM de nodos (tarjetas, hubs, núcleo)
   Expone: CYBER.NodeLayer
   ------------------------------------------------------------
   Todo el texto visible pasa por CYBER.I18n, y refreshLabels()
   vuelve a escribir las etiquetas cuando cambia el idioma sin
   repintar los lienzos de las miniaturas.
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function NodeLayer(container, options) {
    this.container = container;
    this.opts = Object.assign({ thumbWidth: 240, thumbHeight: 150 }, options || {});
    this.map = Object.create(null);
    this.element = container;
  }

  /** Fichas de etiquetas traducidas de una obra. */
  function tagsOf(node) {
    const art = node.artwork || {};
    return art.tagLabels && art.tagLabels.length ? art.tagLabels : (node.tags || []);
  }

  function renderTags(container, node, limit) {
    const tags = tagsOf(node);
    const max = limit || 3;
    dom.clear(container);
    tags.slice(0, max).forEach(function (tag) {
      container.appendChild(dom.el('span', { class: 'node__tag', text: tag }));
    });
    if (tags.length > max) {
      container.appendChild(dom.el('span', {
        class: 'node__tag node__tag--more',
        text: '+' + (tags.length - max)
      }));
    }
  }

  /** Crea el DOM de todos los nodos. */
  NodeLayer.prototype.build = function (nodes, handlers) {
    const self = this;
    dom.clear(this.container);
    this.map = Object.create(null);

    const order = { core: 0, hub: 1, art: 2 };
    nodes.slice().sort(function (a, b) { return order[a.type] - order[b.type]; }).forEach(function (node) {
      const el = node.type === 'core'
        ? self.buildCore(node)
        : (node.type === 'hub' ? self.buildHub(node) : self.buildArt(node, handlers));

      el.dataset.id = node.id;
      el.dataset.type = node.type;
      el.style.setProperty('--node-accent', node.color);
      el.style.setProperty('--cat-color', node.color);
      el.style.zIndex = node.type === 'core' ? 5 : (node.type === 'hub' ? 4 : 3);

      self.container.appendChild(el);
      self.map[node.id] = { node: node, el: el };

      if (handlers && handlers.onBind) handlers.onBind(node, el);
    });

    this.updatePositions();
  };

  NodeLayer.prototype.buildArt = function (node, handlers) {
    const self = this;
    const art = node.artwork || {};
    const isHolo = !!art.holographic;
    const canvas = dom.el('canvas', { class: 'node__canvas' });

    const el = dom.el('article', {
      class: 'node node--art' + (isHolo ? ' node--holo' : ''),
      attrs: {
        tabindex: '0',
        role: 'button',
        'aria-label': t('node.openAria', { title: art.title || node.label })
      },
      on: handlers ? {
        dblclick: function (evt) { handlers.onFocus(node, evt); },
        keydown: function (evt) {
          if (evt.key === 'Enter' || evt.key === ' ') {
            evt.preventDefault();
            handlers.onSelect(node, evt);
          }
        }
      } : null
    });

    const fav = dom.el('button', {
      class: 'node__fav',
      text: '★',
      attrs: {
        'aria-label': t('node.favoriteAria'),
        title: t('node.favorite')
      },
      on: handlers ? {
        click: function (evt) {
          evt.stopPropagation();
          handlers.onFavorite(node, evt);
        }
      } : null
    });

    const edit = dom.el('button', {
      class: 'node__fav node__edit',
      html: '✎',
      attrs: {
        'aria-label': t('modal.edit'),
        title: t('modal.edit')
      },
      on: handlers ? {
        click: function (evt) {
          evt.stopPropagation();
          CYBER.bus.emit(CYBER.EVENTS.EDITOR_OPEN_EDIT, { id: node.id });
        }
      } : null
    });

    const tagBox = dom.el('div', { class: 'node__tags' });
    renderTags(tagBox, node, 3);

    const thumbBox = dom.el('div', { class: 'node__thumb' });
    if (isHolo) {
      const holoBadge = dom.el('span', { class: 'node__holo-badge', text: '✦ HOLO' });
      thumbBox.appendChild(holoBadge);
    }

    if (art.imageUrl) {
      const img = dom.el('img', {
        class: 'node__img',
        src: art.imageUrl,
        alt: art.title || node.label,
        loading: 'lazy'
      });
      img.onerror = function () {
        img.remove();
        thumbBox.appendChild(canvas);
        if (CYBER.ArtGen) {
          CYBER.ArtGen.paint(canvas, node.artwork, {
            width: self.opts.thumbWidth,
            height: self.opts.thumbHeight
          });
        }
      };
      thumbBox.appendChild(img);
    } else {
      thumbBox.appendChild(canvas);
      if (node.artwork && CYBER.ArtGen) {
        CYBER.ArtGen.paint(canvas, node.artwork, {
          width: this.opts.thumbWidth,
          height: this.opts.thumbHeight
        });
      }
    }

    /* Formateo de código en la tarjeta: sustituir 'USER - ' por 'Karl Art Bocetos' */
    var rawId = String(art.code || node.id || '');
    var displayCode;
    if (/^user\b[-_\s·]*/i.test(rawId)) {
      var rest = rawId.replace(/^user\b[-_\s·]*/i, '').trim();
      displayCode = rest ? 'Karl Art Bocetos · ' + rest : 'Karl Art Bocetos';
    } else if (rawId.indexOf('USER -') !== -1 || rawId.indexOf('USER·') !== -1 || rawId.indexOf('USER') === 0) {
      displayCode = rawId.replace(/USER\s*[-·_]\s*/gi, 'Karl Art Bocetos · ').replace(/^Karl Art Bocetos · $/i, 'Karl Art Bocetos').replace(/^USER$/i, 'Karl Art Bocetos');
    } else {
      displayCode = rawId;
    }

    const frameChildren = [
      dom.el('header', { class: 'node__head' }, [
        dom.el('span', { class: 'node__dot' }),
        dom.el('span', { class: 'node__id', text: displayCode }),
        dom.el('span', { class: 'node__lead' })
      ]),
      thumbBox,
      dom.el('div', { class: 'node__meta' }, [
        dom.el('h3', { class: 'node__title', text: art.title || node.label }),
        dom.el('p', { class: 'node__tech', text: (art.technique || '') + (art.year ? ' · ' + art.year : '') }),
        tagBox
      ])
    ];

    if (isHolo) {
      const holo = dom.el('div', { class: 'node__holo', attrs: { 'aria-hidden': 'true' } });
      frameChildren.push(holo);
    } else {
      const reflect = dom.el('div', { class: 'node__reflect', attrs: { 'aria-hidden': 'true' } });
      frameChildren.push(reflect);
    }

    el.appendChild(dom.el('div', { class: 'node__frame' }, frameChildren));
    el.appendChild(fav);
    el.appendChild(edit);

    /* Efecto interactivo de inclinación y reflejo de luz (holográfico o especular) */
    el.addEventListener('mousemove', function (evt) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (evt.clientX - rect.left) / rect.width;
      const py = (evt.clientY - rect.top) / rect.height;
      const rx = (py - 0.5) * -18;
      const ry = (px - 0.5) * 18;
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (isHolo) {
        el.style.setProperty('--holo-o', '1');
      } else {
        el.style.setProperty('--reflect-o', '1');
      }
    });

    el.addEventListener('mouseleave', function () {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      if (isHolo) {
        el.style.setProperty('--holo-o', '0');
      } else {
        el.style.setProperty('--reflect-o', '0');
      }
    });

    return el;
  };

  NodeLayer.prototype.buildHub = function (node) {
    const ring = dom.svg('svg', { class: 'hub__ring', viewBox: '0 0 120 120' });
    ring.appendChild(dom.svg('polygon', {
      points: '60,4 108,30 108,90 60,116 12,90 12,30',
      fill: 'none', stroke: 'currentColor', 'stroke-width': '1', 'stroke-dasharray': '6 8'
    }));

    return dom.el('article', {
      class: 'node node--hub',
      attrs: {
        tabindex: '0',
        role: 'button',
        'aria-label': t('node.hubAria', { label: node.label, count: node.count })
      }
    }, [
      dom.el('div', { class: 'hub' }, [
        ring,
        dom.el('span', { class: 'hub__icon', text: node.icon || '◆' }),
        dom.el('span', { class: 'hub__label', text: node.label }),
        dom.el('span', { class: 'hub__count', text: t('node.hubWorks', { count: node.count }) })
      ])
    ]);
  };

  NodeLayer.prototype.buildCore = function (node) {
    return dom.el('article', {
      class: 'node node--core',
      attrs: {
        tabindex: '0',
        role: 'button',
        'aria-label': t('node.coreAria')
      }
    }, [
      dom.el('div', { class: 'core' }, [
        dom.el('span', { class: 'core__label', text: t('node.archive') }),
        dom.el('span', { class: 'core__sub', text: t('node.worksSub', { count: node.count }) })
      ])
    ]);
  };

  /** Vuelca las coordenadas físicas al DOM. */
  NodeLayer.prototype.updatePositions = function () {
    const self = this;
    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      item.el.style.setProperty('--x', Math.round(item.node.x * 10) / 10);
      item.el.style.setProperty('--y', Math.round(item.node.y * 10) / 10);
    });
  };

  /** Reescribe todas las etiquetas visibles (cambio de idioma). */
  NodeLayer.prototype.refreshLabels = function () {
    const self = this;
    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      const el = item.el;
      const node = item.node;

      if (node.type === 'art') {
        const art = node.artwork || {};
        node.label = art.title || node.label;
        const title = el.querySelector('.node__title');
        const tech = el.querySelector('.node__tech');
        const tags = el.querySelector('.node__tags');
        const fav = el.querySelector('.node__fav');

        if (title) title.textContent = art.title || node.label;
        if (tech) tech.textContent = (art.technique || '') + ' · ' + (art.year || '');
        if (tags) renderTags(tags, node, 3);
        if (fav) {
          fav.setAttribute('aria-label', t('node.favoriteAria'));
          fav.setAttribute('title', t('node.favorite'));
        }
        const edit = el.querySelector('.node__edit');
        if (edit) {
          edit.setAttribute('aria-label', t('modal.edit'));
          edit.setAttribute('title', t('modal.edit'));
        }
        el.setAttribute('aria-label', t('node.openAria', { title: art.title || node.label }));
      } else if (node.type === 'hub') {
        const label = el.querySelector('.hub__label');
        const count = el.querySelector('.hub__count');
        if (label) label.textContent = node.label;
        if (count) count.textContent = t('node.hubWorks', { count: node.count });
        el.setAttribute('aria-label', t('node.hubAria', { label: node.label, count: node.count }));
      } else {
        const label = el.querySelector('.core__label');
        const sub = el.querySelector('.core__sub');
        if (label) label.textContent = t('node.archive');
        if (sub) sub.textContent = t('node.worksSub', { count: node.count });
        el.setAttribute('aria-label', t('node.coreAria'));
      }
    });
    return this;
  };

  /**
   * Aplica el estado visual de los nodos.
   */
  NodeLayer.prototype.setState = function (state) {
    const self = this;
    const related = state.relatedIds || [];

    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      const el = item.el;
      const isFiltered = !!(state.filteredIds && !state.filteredIds[id]);
      const isSelected = state.selectedId === id;
      const isRelated = related.indexOf(id) > -1;
      const dim = !!state.focusId && !isSelected && !isRelated;

      el.classList.toggle('is-selected', isSelected);
      el.classList.toggle('is-related', isRelated);
      el.classList.toggle('is-dim', dim);
      el.classList.toggle('is-filtered', isFiltered);
      el.classList.toggle('is-pinned', !!item.node.fixed);
      el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  };

  /** Actualiza las estrellas de favoritos. */
  NodeLayer.prototype.setFavorites = function (isFavorite) {
    const self = this;
    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      const button = item.el.querySelector('.node__fav');
      if (!button) return;
      const on = isFavorite(id);
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  /** Devuelve el nodo visual bajo un elemento (o el propio elemento). */
  NodeLayer.prototype.fromElement = function (element) {
    if (!element || !element.closest) return null;
    const host = element.closest('.node');
    if (!host || !host.dataset.id) return null;
    return this.map[host.dataset.id] || null;
  };

  NodeLayer.prototype.get = function (id) { return this.map[id] || null; };

  /** Efecto de impacto al centrar un nodo. */
  NodeLayer.prototype.pulse = function (id) {
    const item = this.map[id];
    if (!item) return;
    item.el.classList.remove('is-hit');
    void item.el.offsetWidth;
    item.el.classList.add('is-hit');
    window.setTimeout(function () { item.el.classList.remove('is-hit'); }, 520);
  };

  NodeLayer.prototype.destroy = function () {
    dom.clear(this.container);
    this.map = Object.create(null);
  };

  CYBER.NodeLayer = NodeLayer;
})(window.CYBER = window.CYBER || {});
