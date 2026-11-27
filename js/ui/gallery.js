/* ============================================================
   ui/gallery.js — rejilla de obras con filtros y orden
   Expone: CYBER.Gallery
   ------------------------------------------------------------
   Las tarjetas se construyen una sola vez (los lienzos
   procedurales no se repintan); al cambiar de idioma solo se
   reescriben los textos con refreshLabels().
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  const SORTS = ['recent', 'oldest', 'hours', 'title', 'category'];
  const COLLECTIONS = [
    'GALERÍA I',
    'GALERÍA II',
    'GALERÍA III',
    'GALERÍA IV',
    'GALERÍA V',
    'GALERÍA VI',
    'SIN GALERÍA'
  ];

  function belongsToGallery(art, gallery) {
    if (gallery === 'SIN GALERÍA') return !String(art.gallery || '').trim();
    return art.gallery === gallery;
  }

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function Gallery(viewSelector, gridSelector) {
    this.view = dom.qs(viewSelector);
    this.grid = dom.qs(gridSelector);
    this.head = null;
    this.collections = null;
    this.backButton = null;
    this.sortSelect = null;
    this.countLabel = null;
    this.totalLabel = null;
    this.sort = 'recent';
    this.artworks = [];
    this.selectedGallery = '';
    this.cards = Object.create(null);
    this.lastFilters = {};
  }

  Gallery.prototype.init = function () {
    const self = this;

    this.collections = dom.el('div', { class: 'gallery__collections' }, [
      dom.el('h1', { class: 'gallery__collections-title', text: 'GALERÍAS' }),
      dom.el('div', { class: 'gallery__collection-list' }, COLLECTIONS.map(function (name) {
        return dom.el('button', {
          class: 'gallery__collection',
          type: 'button',
          attrs: { 'data-gallery': name }
        }, [
          dom.el('span', { class: 'gallery__collection-cover', attrs: { 'aria-hidden': 'true' } }),
          dom.el('span', { class: 'gallery__collection-name', text: name }),
          dom.el('span', { class: 'gallery__collection-count', text: '0' })
        ]);
      }))
    ]);
    this.view.insertBefore(this.collections, this.grid);

    this.visibleLabel = dom.el('span', { class: 'gallery__label', text: t('gallery.visible') });
    this.countLabel = dom.el('b', { text: '0' });
    this.totalLabel = dom.el('span', { text: '0' });
    this.orderLabel = dom.el('label', { text: t('gallery.order'), attrs: { for: 'gallery-sort' } });
    this.backButton = dom.el('button', {
      class: 'gallery__back',
      type: 'button',
      text: '‹ GALERÍAS',
      attrs: { 'aria-label': 'Volver a la lista de galerías' },
      on: {
        click: function () {
          self.selectedGallery = '';
          self.updateCollectionView();
          self.resort();
        }
      }
    });

    this.sortSelect = dom.el('select', {
      id: 'gallery-sort',
      attrs: { 'aria-label': t('gallery.order') },
      on: {
        change: function (evt) {
          self.sort = evt.target.value;
          self.resort();
        }
      }
    }, SORTS.map(function (key) {
      return dom.el('option', { value: key, text: t('gallery.sort.' + key) });
    }));
    this.sortSelect.value = this.sort;

    this.head = dom.el('div', { class: 'gallery__head' }, [
      this.backButton,
      this.visibleLabel,
      dom.el('span', { class: 'gallery__counter' }, [this.countLabel, document.createTextNode(' / '), this.totalLabel]),
      dom.el('span', { class: 'gallery__sort' }, [this.orderLabel, this.sortSelect])
    ]);

    this.view.insertBefore(this.head, this.grid);
    this.updateCollectionView();

    dom.on(this.collections, 'click', '.gallery__collection', function (evt, button) {
      self.selectedGallery = button.dataset.gallery;
      self.updateCollectionView();
      self.resort();
      self.applyFilters(self.lastFilters);
    });

    /* delegación: abrir ficha y favoritos */
    dom.on(this.grid, 'click', '.card', function (evt, card) {
      const id = card.dataset.id;
      if (evt.target.closest('.card__fav')) {
        const on = CYBER.Favorites.toggle(id);
        self.refreshFavorites();
        const art = self.artworks.find(function (a) { return a.id === id; });
        bus.emit(CYBER.EVENTS.TOAST, {
          type: on ? 'info' : 'warn',
          text: t(on ? 'toasts.favAdded' : 'toasts.favRemoved', {
            title: dom.escape(art ? art.title : id)
          })
        });
        return;
      }
      bus.emit(CYBER.EVENTS.ARTWORK_REQUEST, { id: id, origin: 'gallery' });
    });

    /* navegación con teclado dentro de la rejilla */
    dom.on(this.grid, 'keydown', '.card', function (evt, card) {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        bus.emit(CYBER.EVENTS.ARTWORK_REQUEST, { id: card.dataset.id, origin: 'gallery' });
      }
    });

    return this;
  };

  Gallery.prototype.sortList = function (list) {
    const sorted = list.slice();
    const locale = CYBER.I18n ? CYBER.I18n.locale() : 'es';
    switch (this.sort) {
      case 'oldest': sorted.sort(function (a, b) { return a.year - b.year; }); break;
      case 'title': sorted.sort(function (a, b) { return a.title.localeCompare(b.title, locale); }); break;
      case 'category': sorted.sort(function (a, b) {
        return a.categoryLabel.localeCompare(b.categoryLabel, locale) || b.year - a.year;
      }); break;
      default: sorted.sort(function (a, b) { return b.year - a.year || b.index - a.index; });
    }
    return sorted;
  };

  Gallery.prototype.buildCard = function (art, index) {
    const self = this;
    const canvas = dom.el('canvas', { class: 'card__canvas' });
    const titleEl = dom.el('h3', { class: 'card__title', text: art.title });
    const techEl = dom.el('p', { class: 'card__tech', text: art.technique });
    
    /* ── Etiquetas debajo del título con íconos y tooltips ── */
    const labelsEl = dom.el('div', { class: 'card__labels' });
    
    /* Estado de disponibilidad - ícono con tooltip */
    const statusLabel = art.available ? 'disponible' : (art.status || 'archivado');
    const statusIcon = dom.el('span', {
      class: 'card__label-icon card__label-' + statusLabel,
      'data-label': art.statusLabel,
      attrs: { 'aria-label': art.statusLabel }
    });
    labelsEl.appendChild(statusIcon);
    
    /* Categoría - ícono con tooltip */
    const categoryIcon = dom.el('span', {
      class: 'card__label-icon card__label-category',
      'data-label': art.categoryLabel || art.categoryShort,
      'data-category-icon': art.icon,
      attrs: { 'aria-label': art.categoryLabel || art.categoryShort }
    });
    labelsEl.appendChild(categoryIcon);
    
    /* Tag "HOLO" solo como tooltip, no visualmente */
    if (art.holographic) {
      const holoIcon = dom.el('span', {
        class: 'card__label-icon',
        'data-label': 'Holográfico',
        attrs: { 'aria-label': 'Holográfico' }
      });
      holoIcon.style.background = 'rgba(0, 234, 255, 0.15)';
      holoIcon.style.borderColor = 'rgba(0, 234, 255, 0.45)';
      holoIcon.style.color = '#00eaff';
      labelsEl.appendChild(holoIcon);
    }
    
    const tagsEl = dom.el('div', { class: 'card__tags tagrow' });

    /* ── paleta de colores: barra debajo de la imagen (8 colores, oscuro→claro) ── */
    const palette = (art.palette || []).slice(0, 8);
    const paletteSwatches = palette.map(function (col) {
      const swatch = dom.el('span', {
        class: 'card__swatch',
        style: { background: col, flex: '1' },
        attrs: {
          title: col,
          'aria-label': col,
          'data-color': col
        }
      });
      /* tooltip del valor hex al hacer hover */
      swatch.addEventListener('click', function (e) { e.stopPropagation(); });
      return swatch;
    });
    const paletteBarEl = dom.el('div', { class: 'card__palette-bar' + (palette.length ? '' : ' is-hidden') }, paletteSwatches);

    /* puntos pequeños en el footer (mantiene indicador visual compacto) */
    const paletteDots = dom.el('span', { class: 'card__palette' }, palette.slice(0, 5).map(function (col) {
      return dom.el('span', { class: 'card__palette-dot', style: { background: col } });
    }));

    const footEl = dom.el('div', { class: 'card__foot' }, [
      dom.el('span', { class: 'card__year', text: art.year }),
      dom.el('span', { class: 'dot', text: '·' }),
      paletteDots,
      dom.el('span', { class: 'spacer' }),
      dom.el('b', { class: 'card__cat', text: art.icon + ' ' + art.categoryShort })
    ]);
    const favEl = dom.el('button', {
      class: 'card__fav' + (CYBER.Favorites.has(art.id) ? ' is-on' : ''),
      text: '★',
      attrs: { 'aria-label': t('gallery.favoriteAria'), title: t('gallery.favoriteAria') }
    });
    const mediaBox = dom.el('div', { class: 'card__media' });
    const mediaChildren = [];
    if (art.imageUrl) {
      const img = dom.el('img', {
        class: 'card__img',
        src: art.imageUrl,
        alt: art.title,
        loading: 'lazy'
      });
      img.onerror = function () {
        img.remove();
        mediaBox.insertBefore(canvas, mediaBox.firstChild);
        CYBER.ArtGen.paint(canvas, art, { width: 420, height: 262 });
      };
      mediaChildren.push(img);
    } else {
      mediaChildren.push(canvas);
      CYBER.ArtGen.paint(canvas, art, { width: 420, height: 262 });
    }
    const isHolo = !!art.holographic;
    
    /* badgeEl y statusEl ya no se usan directamente - las etiquetas están en labelsEl */
    
    /* favEl ya está definido arriba (línea 234) */
    
    /* Reconstruir mediaChildren con el contenido original + favEl */
    const finalMedia = mediaChildren.concat([favEl]);
    
    finalMedia.forEach(function (child) { mediaBox.appendChild(child); });

    const cardChildren = [
      mediaBox,
      paletteBarEl,
      dom.el('div', { class: 'card__info' }, [
        titleEl,
        techEl,
        labelsEl,  /* ── Etiquetas debajo del título ── */
        tagsEl,    /* ── Tags de la obra ── */
        footEl
      ])
    ];

    const card = dom.el('article', {
      class: 'card' + (isHolo ? ' card--holo' : ''),
      dataset: { id: art.id, category: art.category },
      style: { '--cat-color': art.color, animationDelay: Math.min(index * 32, 480) + 'ms' },
      attrs: {
        tabindex: '0',
        role: 'button',
        'aria-label': t('gallery.openAria', { title: art.title })
      }
    }, cardChildren);

    /* Efecto holográfico o especular (elemento hijo que aplica el gradiente) */
    if (isHolo) {
      const holo = dom.el('div', { class: 'card__holo', attrs: { 'aria-hidden': 'true' } });
      card.appendChild(holo);
    } else {
      const reflect = dom.el('div', { class: 'card__reflect', attrs: { 'aria-hidden': 'true' } });
      card.appendChild(reflect);
    }

    /* Efecto interactivo de inclinación y reflejo de luz (holográfico o especular) */
    card.addEventListener('pointermove', function (evt) {
      if (evt.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (evt.clientX - rect.left) / rect.width;
      const py = (evt.clientY - rect.top) / rect.height;
      const rx = (py - 0.5) * -16;
      const ry = (px - 0.5) * 16;
      const parallaxX = (0.5 - px) * 12;
      const parallaxY = (0.5 - py) * 12;
      card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      card.style.setProperty('--parallax-x', parallaxX.toFixed(2) + 'px');
      card.style.setProperty('--parallax-y', parallaxY.toFixed(2) + 'px');
      if (isHolo) {
        card.style.setProperty('--holo-o', '1');
      } else {
        card.style.setProperty('--reflect-o', '1');
      }
    });

    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--parallax-x', '0px');
      card.style.setProperty('--parallax-y', '0px');
      if (isHolo) {
        card.style.setProperty('--holo-o', '0');
      } else {
        card.style.setProperty('--reflect-o', '0');
      }
    });

    this.renderTags(tagsEl, art);

    this.cards[art.id] = {
      el: card, art: art, canvas: canvas, title: titleEl, tech: techEl,
      labels: labelsEl, tags: tagsEl, foot: footEl, fav: favEl,
      paletteBar: paletteBarEl
    };
    return card;
  };

  /** Reconstruye TODAS las tarjetas (tras crear/editar/borrar obras). */
  Gallery.prototype.rebuild = function (artworks) {
    this.artworks = artworks || this.artworks;
    dom.clear(this.grid);
    this.cards = Object.create(null);
    const self = this;
    this.artworks.forEach(function (art, index) {
      self.grid.appendChild(self.buildCard(art, index));
    });
    this.updateCollectionView();
    this.resort();
    if (this.totalLabel) this.totalLabel.textContent = this.selectedGallery
      ? this.artworks.filter(function (art) { return belongsToGallery(art, this.selectedGallery); }, this).length
      : this.artworks.length;
    return this;
  };

  /** Etiquetas visibles de una obra (traducidas). */
  Gallery.prototype.renderTags = function (container, art) {
    const labels = art.tagLabels && art.tagLabels.length ? art.tagLabels : art.tags;
    dom.clear(container);
    labels.slice(0, 4).forEach(function (tag) {
      container.appendChild(dom.el('span', { class: 'tag', text: tag }));
    });
  };

  Gallery.prototype.render = function (artworks) {
    this.artworks = artworks || this.artworks;
    const self = this;

    if (Object.keys(this.cards).length !== this.artworks.length) {
      dom.clear(this.grid);
      this.cards = Object.create(null);
      this.artworks.forEach(function (art, index) {
        self.grid.appendChild(self.buildCard(art, index));
      });
    }

    this.updateCollectionView();
    this.resort();
    if (this.totalLabel) this.totalLabel.textContent = this.selectedGallery
      ? this.artworks.filter(function (art) { return belongsToGallery(art, this.selectedGallery); }, this).length
      : this.artworks.length;
    return this;
  };

  Gallery.prototype.updateCollectionView = function () {
    const selected = this.selectedGallery;
    const counts = Object.create(null);
    COLLECTIONS.forEach(function (name) { counts[name] = 0; });
    this.artworks.forEach(function (art) {
      COLLECTIONS.forEach(function (name) {
        if (belongsToGallery(art, name)) counts[name] += 1;
      });
    });

    Array.prototype.forEach.call(this.collections.querySelectorAll('.gallery__collection'), function (button) {
      const count = counts[button.dataset.gallery] || 0;
      const coverArt = this.artworks.find(function (art) { return belongsToGallery(art, button.dataset.gallery); });
      button.setAttribute('aria-label', button.dataset.gallery + ', ' + count + ' obras');
      button.querySelector('.gallery__collection-count').textContent = count;
      this.renderCollectionCover(button, coverArt);
    }, this);

    this.collections.hidden = !!selected;
    this.grid.hidden = !selected;
    this.head.hidden = !selected;
    this.backButton.hidden = !selected;
    this.visibleLabel.textContent = selected || t('gallery.visible');
  };

  Gallery.prototype.renderCollectionCover = function (button, art) {
    const cover = button.querySelector('.gallery__collection-cover');
    const imageUrl = art ? (art.imageUrl || '') : '';
    const coverId = art ? art.id : '';
    if (cover.dataset.artId === coverId && cover.dataset.imageUrl === imageUrl) {
      const existingImage = cover.querySelector('.gallery__collection-img');
      if (existingImage) existingImage.alt = art ? art.title : '';
      return;
    }

    cover.dataset.artId = coverId;
    cover.dataset.imageUrl = imageUrl;
    dom.clear(cover);
    if (!art) return;

    function renderGeneratedCover() {
      if (cover.dataset.artId !== coverId || cover.dataset.imageUrl !== imageUrl) return;
      dom.clear(cover);
      const canvas = dom.el('canvas', { class: 'gallery__collection-canvas' });
      cover.appendChild(canvas);
      CYBER.ArtGen.paint(canvas, art, { width: 480, height: 300 });
    }

    if (!imageUrl) {
      renderGeneratedCover();
      return;
    }

    const img = dom.el('img', {
      class: 'gallery__collection-img',
      src: imageUrl,
      alt: art.title,
      loading: 'lazy'
    });
    img.onerror = renderGeneratedCover;
    cover.appendChild(img);
  };

  /** Reordena las tarjetas ya construidas según el criterio activo. */
  Gallery.prototype.resort = function () {
    const self = this;
    const list = this.selectedGallery
      ? this.sortList(this.artworks.filter(function (art) { return belongsToGallery(art, self.selectedGallery); }))
      : [];
    const fragment = document.createDocumentFragment();

    const empty = this.grid.querySelector('.gallery__empty');
    if (empty) empty.remove();

    Object.keys(this.cards).forEach(function (id) {
      const item = self.cards[id];
      if (item.el.parentNode === self.grid) self.grid.removeChild(item.el);
    });

    list.forEach(function (art) {
      const item = self.cards[art.id];
      if (item) fragment.appendChild(item.el);
    });
    this.grid.appendChild(fragment);

    if (this.selectedGallery && !list.length) this.buildEmptyState();
    if (this.countLabel) this.countLabel.textContent = list.length;
    if (this.totalLabel) this.totalLabel.textContent = list.length;
    return this;
  };

  Gallery.prototype.buildEmptyState = function () {
    let empty = this.grid.querySelector('.gallery__empty');
    const isClean = !this.artworks || this.artworks.length === 0;
    const titleKey = isClean ? 'gallery.emptyArchiveTitle' : 'gallery.emptyTitle';
    const textKey = isClean ? 'gallery.emptyArchiveText' : 'gallery.emptyText';
    const hintKey = isClean ? 'gallery.emptyArchiveHint' : 'gallery.emptyHint';

    if (!empty) {
      const children = [
        dom.el('strong'),
        dom.el('span', { class: 'empty__text' }),
        dom.el('span', { class: 'empty__hint' })
      ];
      if (isClean) {
        children.push(dom.el('button', {
          class: 'btn btn--tiny btn--magenta',
          style: { marginTop: '14px', pointerEvents: 'auto' },
          text: t('ui.graph.emptyArchiveBtn'),
          on: { click: function () { CYBER.bus.emit(CYBER.EVENTS.EDITOR_OPEN_NEW); } }
        }));
      }
      empty = dom.el('div', { class: 'gallery__empty' }, children);
      this.grid.appendChild(empty);
    }
    const strong = empty.querySelector('strong');
    const text = empty.querySelector('.empty__text');
    const hint = empty.querySelector('.empty__hint');
    if (strong) strong.textContent = t(titleKey);
    if (text) text.textContent = t(textKey);
    if (hint) hint.textContent = t(hintKey);
    return empty;
  };

  /** Atenúa o esconde tarjetas según los filtros activos. */
  Gallery.prototype.applyFilters = function (filters) {
    this.lastFilters = filters || this.lastFilters || {};
    const self = this;
    const f = this.lastFilters;
    const query = String(f.query || '').trim().toLowerCase();

    this.query = query;
    let visibleCount = 0;

    Object.keys(this.cards).forEach(function (id) {
      const item = self.cards[id];
      const art = item.art;
      
      // FILTRO DE GALERÍA: Obligatorio si hay una seleccionada
      const inSelectedGallery = !self.selectedGallery || belongsToGallery(art, self.selectedGallery);
      
      const okCategory = !(f.categories || []).length || f.categories.indexOf(art.category) > -1;
      const okTags = !(f.tags || []).length || f.tags.every(function (tag) {
        return art.tags.indexOf(tag.toLowerCase()) > -1;
      });
      const okFav = !f.onlyFavorites || CYBER.Favorites.has(art.id);
      const okAvailable = !f.onlyAvailable || art.available;
      const okQuery = !query || art.searchText.indexOf(query) > -1;
      
      // Combinación de todos los filtros
      const ok = inSelectedGallery && okCategory && okTags && okFav && okAvailable && okQuery;

      item.el.classList.toggle('is-hidden', !ok);
      if (ok) visibleCount += 1;
    });

    this.countLabel.textContent = visibleCount;
    this.updateEmptyState(visibleCount === 0);
    return visibleCount;
  };
      if (item.title) item.title.innerHTML = dom.highlight(art.title, query);
      if (ok) visible += 1;
    });

    if (this.countLabel) this.countLabel.textContent = visible;
    return visible;
  };

  /** Reaplica el idioma a la cabecera, las tarjetas y el estado vacío. */
  Gallery.prototype.refreshLabels = function () {
    const self = this;

    if (this.visibleLabel) this.visibleLabel.textContent = this.selectedGallery || t('gallery.visible');
    if (this.orderLabel) this.orderLabel.textContent = t('gallery.order');
    if (this.sortSelect) {
      this.sortSelect.setAttribute('aria-label', t('gallery.order'));
      Array.prototype.forEach.call(this.sortSelect.options, function (option) {
        option.textContent = t('gallery.sort.' + option.value);
      });
    }

    Object.keys(this.cards).forEach(function (id) {
      const item = self.cards[id];
      const art = item.art;
      if (item.title) item.title.textContent = art.title;
      if (item.tech) item.tech.textContent = art.technique;
      
      /* ── Actualizar etiquetas con íconos (state y categoría) ── */
      if (item.labels) {
        // Limpiar etiquetas existentes
        dom.clear(item.labels);
        
        // Estado de disponibilidad
        const statusLabel = art.available ? 'disponible' : (art.status || 'archivado');
        const statusIcon = dom.el('span', {
          class: 'card__label-icon card__label-' + statusLabel,
          'data-label': art.statusLabel,
          attrs: { 'aria-label': art.statusLabel }
        });
        item.labels.appendChild(statusIcon);
        
        // Categoría
        const categoryIcon = dom.el('span', {
          class: 'card__label-icon card__label-category',
          'data-label': art.categoryLabel || art.categoryShort,
          'data-category-icon': art.icon,
          attrs: { 'aria-label': art.categoryLabel || art.categoryShort }
        });
        item.labels.appendChild(categoryIcon);
        
        // Holográfico
        if (art.holographic) {
          const holoIcon = dom.el('span', {
            class: 'card__label-icon',
            'data-label': 'Holográfico',
            attrs: { 'aria-label': 'Holográfico' }
          });
          holoIcon.style.background = 'rgba(0, 234, 255, 0.15)';
          holoIcon.style.borderColor = 'rgba(0, 234, 255, 0.45)';
          holoIcon.style.color = '#00eaff';
          item.labels.appendChild(holoIcon);
        }
      }
      
      if (item.tags) self.renderTags(item.tags, art);
      if (item.fav) {
        item.fav.setAttribute('aria-label', t('gallery.favoriteAria'));
        item.fav.setAttribute('title', t('gallery.favoriteAria'));
      }
      if (item.edit) {
        item.edit.setAttribute('aria-label', t('modal.edit'));
        item.edit.setAttribute('title', t('modal.edit'));
      }
      if (item.del) {
        item.del.setAttribute('aria-label', t('modal.delete'));
        item.del.setAttribute('title', t('modal.delete'));
      }
      if (item.foot) {
        const year = item.foot.querySelector('.card__year');
        const time = item.foot.querySelector('.card__time');
        const cat = item.foot.querySelector('.card__cat');
        if (year) year.textContent = art.year;
        if (cat) cat.textContent = art.icon + ' ' + art.categoryShort;
      }
      item.el.setAttribute('aria-label', t('gallery.openAria', { title: art.title }));
    });

    if (this.grid.querySelector('.gallery__empty')) this.buildEmptyState();
    this.applyFilters(this.lastFilters);
    return this;
  };

  Gallery.prototype.refreshFavorites = function () {
    const self = this;
    Object.keys(this.cards).forEach(function (id) {
      const item = self.cards[id];
      if (item.fav) item.fav.classList.toggle('is-on', CYBER.Favorites.has(id));
    });
  };

  Gallery.prototype.focusArtwork = function (id) {
    const item = this.cards[id];
    if (!item) return;
    item.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    item.el.classList.add('is-hit');
    window.setTimeout(function () { item.el.classList.remove('is-hit'); }, 600);
  };

  CYBER.Gallery = Gallery;
  CYBER.Gallery.SORTS = SORTS;
})(window.CYBER = window.CYBER || {});
