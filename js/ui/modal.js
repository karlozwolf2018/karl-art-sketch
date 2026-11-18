/* ============================================================
   ui/modal.js — ficha detallada de una obra
   Expone: CYBER.Modal
   ------------------------------------------------------------
   Toda la ficha se traduce con CYBER.I18n y puede volver a
   pintarse en otro idioma con reopen().
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function Modal(rootId) {
    this.root = document.getElementById(rootId || 'modal-root');
    this.handlers = {};
    this.art = null;
    this.list = [];
    this.lastFocus = null;
    this.open = false;
    this.lastGalleryWheelAt = 0;
  }

  Modal.prototype.init = function (handlers) {
    this.handlers = handlers || {};
    const self = this;

    if (!this.root) return this;

    function isArtworkImageActive() {
      return self.open && !!(self.root && self.root.querySelector('.viewer__view--image.is-active'));
    }

    function activateAntiCapture() {
      if (isArtworkImageActive()) {
        const m = self.root.querySelector('.modal');
        if (m) m.classList.add('is-anti-capture');
      }
    }

    function deactivateAntiCapture() {
      const m = self.root && self.root.querySelector('.modal');
      if (m) m.classList.remove('is-anti-capture');
    }
    this.deactivateAntiCapture = deactivateAntiCapture;

    window.addEventListener('blur', activateAntiCapture, true);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) activateAntiCapture();
    }, true);

    /* Recuperación del foco solo cuando el usuario regresa a la ventana */
    window.addEventListener('focus', function () {
      setTimeout(function () {
        if (document.hasFocus()) deactivateAntiCapture();
      }, 200);
    }, true);

    function checkScreenCapture(evt) {
      const code = evt.code || '';
      const key = (evt.key || '').toLowerCase();

      if (isArtworkImageActive()) {
        const printScreen = evt.key === 'PrintScreen' || code === 'PrintScreen' || evt.keyCode === 44;
        const ctrlShiftS = (evt.ctrlKey || evt.metaKey) && evt.shiftKey && (key === 's' || code === 'KeyS');
        const windowsShiftS = (evt.metaKey || evt.key === 'OS' || evt.key === 'Meta') &&
          evt.shiftKey && (key === 's' || code === 'KeyS');

        if (printScreen || ctrlShiftS || windowsShiftS) {
          activateAntiCapture();
          evt.preventDefault();
          evt.stopPropagation();
          return;
        }

        /* Mantener las restricciones previas solo mientras se muestra la obra. */
        if ((evt.ctrlKey || evt.metaKey) && (key === 's' || key === 'p' || key === 'u')) {
          evt.preventDefault();
          evt.stopPropagation();
          return;
        }
        if (evt.key === 'F12' || ((evt.ctrlKey || evt.metaKey) && evt.shiftKey && (key === 'i' || key === 'c' || key === 'j'))) {
          evt.preventDefault();
          evt.stopPropagation();
          return;
        }
      }

      if (self.open && evt.type === 'keydown') {
        if (evt.key === 'Escape') { evt.preventDefault(); self.close(); }
        else if (evt.key === 'ArrowRight') { evt.preventDefault(); self.step(1); }
        else if (evt.key === 'ArrowLeft') { evt.preventDefault(); self.step(-1); }
      }
    }

    window.addEventListener('keydown', checkScreenCapture, true);
    window.addEventListener('keyup', checkScreenCapture, true);

    return this;
  };

  Modal.prototype.setList = function (list) {
    this.list = list || [];
    return this;
  };

  Modal.prototype.relatedFor = function (art) {
    if (this.handlers.getRelated) return this.handlers.getRelated(art) || [];
    return [];
  };

  Modal.prototype.galleryFor = function (art) {
    const gallery = String((art && art.gallery) || '').trim();
    if (!gallery) return [];
    const items = this.handlers.getGalleryItems
      ? this.handlers.getGalleryItems(art)
      : this.list;
    return (items || []).filter(function (item) {
      return String((item && item.gallery) || '').trim() === gallery;
    });
  };

  Modal.prototype.indexOf = function (art) {
    return (this.list || []).findIndex(function (item) { return item.id === art.id; });
  };

  /* ------------------------------------------------------------
     Helpers de color y aislamiento de tonos en la paleta
     ------------------------------------------------------------ */
  function hexToRgb(hex) {
    if (!hex) return null;
    let clean = String(hex).replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(function (c) { return c + c; }).join('');
    }
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255
    };
  }

  function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = h * 60;
    }
    return { h: h, s: s, l: l };
  }

  function getColorToneName(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    if (hsl.s < 0.14) {
      if (hsl.l < 0.16) return 'Grafito / Negro';
      if (hsl.l < 0.38) return 'Gris oscuro';
      if (hsl.l < 0.65) return 'Gris';
      if (hsl.l < 0.88) return 'Gris perla';
      return 'Blanco / Luz';
    }
    const h = hsl.h;
    if (h >= 345 || h < 15) return 'Rojo';
    if (h >= 15 && h < 45) return 'Naranja / Ámbar';
    if (h >= 45 && h < 68) return 'Amarillo / Dorado';
    if (h >= 68 && h < 165) return 'Verde';
    if (h >= 165 && h < 205) return 'Azul cian';
    if (h >= 205 && h < 260) return 'Azul';
    if (h >= 260 && h < 315) return 'Violeta';
    return 'Magenta';
  }

  function updateSvgToneFilter(hex) {
    let svg = document.getElementById('viewer-tone-svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'viewer-tone-svg');
      svg.setAttribute('style', 'position:absolute; width:0; height:0; pointer-events:none; overflow:hidden;');
      svg.setAttribute('aria-hidden', 'true');
      document.body.appendChild(svg);
    }

    const rgb = hexToRgb(hex) || { r: 0.5, g: 0.5, b: 0.5 };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    let rValues, gValues, bValues;

    if (hsl.s < 0.14) {
      // Tono gris / grafito / acromático
      const r = rgb.r, g = rgb.g, b = rgb.b;
      const shadowR = (r * 0.08).toFixed(3);
      const shadowG = (g * 0.08).toFixed(3);
      const shadowB = (b * 0.08).toFixed(3);
      const midLowR = (r * 0.48).toFixed(3);
      const midLowG = (g * 0.48).toFixed(3);
      const midLowB = (b * 0.48).toFixed(3);
      const midR = r.toFixed(3);
      const midG = g.toFixed(3);
      const midB = b.toFixed(3);
      const midHighR = (r + (1 - r) * 0.52).toFixed(3);
      const midHighG = (g + (1 - g) * 0.52).toFixed(3);
      const midHighB = (b + (1 - b) * 0.52).toFixed(3);
      const hiR = '1.0';
      const hiG = '1.0';
      const hiB = '1.0';

      rValues = `${shadowR} ${midLowR} ${midR} ${midHighR} ${hiR}`;
      gValues = `${shadowG} ${midLowG} ${midG} ${midHighG} ${hiG}`;
      bValues = `${shadowB} ${midLowB} ${midB} ${midHighB} ${hiB}`;
    } else {
      // Tono cromático (azul, cian, rojo, etc.)
      const r = rgb.r, g = rgb.g, b = rgb.b;
      const shadowR = (r * 0.06).toFixed(3);
      const shadowG = (g * 0.08).toFixed(3);
      const shadowB = (b * 0.16).toFixed(3);
      const midLowR = (r * 0.42).toFixed(3);
      const midLowG = (g * 0.45).toFixed(3);
      const midLowB = (b * 0.55).toFixed(3);
      const midR = r.toFixed(3);
      const midG = g.toFixed(3);
      const midB = b.toFixed(3);
      const midHighR = (r + (1 - r) * 0.45).toFixed(3);
      const midHighG = (g + (1 - g) * 0.45).toFixed(3);
      const midHighB = (b + (1 - b) * 0.45).toFixed(3);
      const hiR = (r + (1 - r) * 0.92).toFixed(3);
      const hiG = (g + (1 - g) * 0.92).toFixed(3);
      const hiB = (b + (1 - b) * 0.92).toFixed(3);

      rValues = `${shadowR} ${midLowR} ${midR} ${midHighR} ${hiR}`;
      gValues = `${shadowG} ${midLowG} ${midG} ${midHighG} ${hiG}`;
      bValues = `${shadowB} ${midLowB} ${midB} ${midHighB} ${hiB}`;
    }

    svg.innerHTML = `
      <defs>
        <filter id="viewer-tone-filter" color-interpolation-filters="sRGB" x="-5%" y="-5%" width="110%" height="110%">
          <feColorMatrix type="matrix" values="
            0.2126 0.7152 0.0722 0 0
            0.2126 0.7152 0.0722 0 0
            0.2126 0.7152 0.0722 0 0
            0      0      0      1 0" result="lum" />
          <feComponentTransfer in="lum" result="toned">
            <feFuncR type="table" tableValues="${rValues}" />
            <feFuncG type="table" tableValues="${gValues}" />
            <feFuncB type="table" tableValues="${bValues}" />
          </feComponentTransfer>
          <feComponentTransfer in="toned">
            <feFuncR type="linear" slope="1.06" intercept="-0.03" />
            <feFuncG type="linear" slope="1.06" intercept="-0.03" />
            <feFuncB type="linear" slope="1.06" intercept="-0.03" />
          </feComponentTransfer>
        </filter>
      </defs>
    `;
  }

  /* ------------------------------------------------------------
     Construcción de la ficha
     ------------------------------------------------------------ */

  Modal.prototype.build = function (art) {
    const self = this;
    const related = this.relatedFor(art);
    const galleryArts = this.galleryFor(art);
    const galleryIndex = galleryArts.findIndex(function (item) { return item.id === art.id; });
    const nextGalleryArts = [];
    if (galleryIndex > -1) {
      for (let offset = 1; offset < galleryArts.length && nextGalleryArts.length < 2; offset++) {
        nextGalleryArts.push(galleryArts[(galleryIndex + offset) % galleryArts.length]);
      }
    }
    const total = (this.list || []).length || 1;
    const position = this.indexOf(art) + 1;
    const matData = CYBER.parseMaterials ? CYBER.parseMaterials(art) : {
      paper: art.paper || '—',
      measures: art.size || '—',
      grammage: art.grammage || '—',
      brand: art.brand || '—',
      category: art.categoryLabel || art.category || '—'
    };

    const canvas = dom.el('canvas', { class: 'viewer__canvas' });
    const isFav = CYBER.Favorites.has(art.id);

    const metaCells = [
      { label: t('modal.meta.technique'), value: art.technique, hot: true },
      { label: t('modal.meta.size'), value: matData.measures !== '—' ? matData.measures : (art.size && art.size !== '—' ? art.size : 'Sin especificar') },
      { label: t('modal.meta.year'), value: art.year },
      { label: t('modal.meta.status'), value: art.statusLabel, hot: art.available }
    ];

    const tagLabels = art.tagLabels && art.tagLabels.length ? art.tagLabels : art.tags;

    let selectTab = null;
    let openMaterialsAdmin = null;
    let applyToneFilter = null;
    let resetToneFilter = null;

    const favButton = dom.el('button', {
      class: 'viewer__tool-btn viewer__tool-btn--fav' + (isFav ? ' is-on' : ''),
      attrs: {
        type: 'button',
        'data-action': 'fav',
        title: isFav ? t('modal.inFavorites') : t('modal.favorite'),
        'aria-label': isFav ? t('modal.inFavorites') : t('modal.favorite')
      }
    }, [
      dom.el('span', {
        class: 'viewer__tool-icon',
        html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
      }),
      dom.el('span', {
        class: 'viewer__tool-label',
        text: isFav ? t('modal.inFavorites') : t('modal.favorite')
      })
    ]);

    const modal = dom.el('div', {
      class: 'modal',
      style: { '--cat-color': art.color },
      attrs: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'modal-title',
        'aria-describedby': 'modal-desc',
        'aria-label': t('node.openAria', { title: art.title })
      }
    }, [
      art.imageUrl ? dom.el('div', { class: 'modal__texture', attrs: { 'aria-hidden': 'true' } }, [
        dom.el('img', { src: art.imageUrl, alt: '', loading: 'lazy' })
      ]) : null,
      dom.el('header', { class: 'modal__head' }, [
        dom.el('span', { class: 'modal__index', text: art.icon + ' ' + art.categoryShort }),
        dom.el('div', { class: 'modal__titles' }, [
          dom.el('h2', {
            class: 'modal__title glitch',
            id: 'modal-title',
            text: art.title,
            attrs: { 'data-text': art.title }
          }),
          dom.el('div', { class: 'modal__sub' }, [
            dom.el('span', { class: 'modal__sub-badge', text: art.statusLabel || '' }),
            dom.el('span', { class: 'modal__sub-badge', text: String(art.year) }),
            dom.el('span', { class: 'modal__sub-badge', text: art.categoryLabel }),
            art.holographic ? dom.el('span', { class: 'modal__sub-badge modal__sub-badge--holo', text: '✦ HOLO' }) : null
          ].filter(Boolean))
        ]),
        dom.el('button', {
          class: 'modal__close',
          html: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
          attrs: { 'aria-label': t('modal.closeAria'), 'data-close': 'true' }
        })
      ]),


      dom.el('div', { class: 'modal__body' }, [
        /* ---------- visor ---------- */
        (function () {
          const stage = dom.el('div', { class: 'viewer__stage' });

            /* Vista 1: Imagen de la obra */
            const viewImage = dom.el('div', { class: 'viewer__view viewer__view--image is-active' });
            if (art.imageUrl) {
              const img = dom.el('img', {
                class: 'viewer__img',
                src: art.imageUrl,
                alt: art.title
              });
              function fitImageFrame() {
                if (img.naturalWidth && img.naturalHeight) {
                  stage.style.setProperty('--viewer-image-ratio', String(img.naturalWidth / img.naturalHeight));
                }
              }
              img.addEventListener('load', fitImageFrame, { once: true });
              if (img.complete) fitImageFrame();
              img.onerror = function () {
                img.remove();
                viewImage.insertBefore(canvas, viewImage.firstChild);
                CYBER.ArtGen.paint(canvas, art, { width: 900, height: 560 });
              };
              viewImage.appendChild(img);
            } else {
              viewImage.appendChild(canvas);
              CYBER.ArtGen.paint(canvas, art, { width: 900, height: 560 });
            }

            /* Vista 2: Materiales utilizados (Diseño de etiquetas y desglose técnico) */
            const viewMaterials = dom.el('div', { class: 'viewer__view viewer__view--materials' });

            function buildMaterialsTagsBoard(art) {
              const board = dom.el('div', { class: 'viewer__materials-board' });

              function createTag(text, type, icon, tooltip) {
                if (!text || text === '—') return null;
                const tag = dom.el('span', {
                  class: 'mat-tag mat-tag--' + (type || 'default'),
                  attrs: tooltip ? { title: tooltip } : {}
                });
                if (icon) {
                  tag.appendChild(dom.el('span', { class: 'mat-tag__icon', html: icon }));
                }
                tag.appendChild(dom.el('span', { class: 'mat-tag__text', text: String(text) }));
                return tag;
              }

              function createSection(title, iconHtml, tags, collapsible) {
                const validTags = (tags || []).filter(Boolean);
                if (!validTags.length) return null;
                const sectionId = 'materials-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const content = dom.el('div', {
                  class: 'mat-section__content',
                  attrs: { id: sectionId + '-content', 'aria-hidden': 'false' }
                }, [dom.el('div', { class: 'mat-section__inner' }, [
                  dom.el('div', { class: 'mat-section__tags' }, validTags)
                ])]);
                const headerChildren = [
                  dom.el('span', { class: 'mat-section__icon', html: iconHtml }),
                  dom.el('span', { class: 'mat-section__title', text: title }),
                  dom.el('span', { class: 'mat-section__count', text: validTags.length })
                ];
                const section = dom.el('section', {
                  class: 'mat-section' + (collapsible ? ' mat-section--collapsible' : '')
                });

                if (collapsible) {
                  const toggle = dom.el('button', {
                    class: 'mat-section__toggle',
                    html: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 8 11 13 6"/></svg>',
                    attrs: {
                      type: 'button',
                      'aria-expanded': 'true',
                      'aria-controls': sectionId + '-content',
                      'aria-label': 'Colapsar ' + title
                    }
                  });
                  toggle.addEventListener('click', function () {
                    const expanded = toggle.getAttribute('aria-expanded') === 'true';
                    toggle.setAttribute('aria-expanded', String(!expanded));
                    toggle.setAttribute('aria-label', (expanded ? 'Expandir ' : 'Colapsar ') + title);
                    content.setAttribute('aria-hidden', String(expanded));
                    if (expanded) content.setAttribute('inert', '');
                    else content.removeAttribute('inert');
                    section.classList.toggle('is-collapsed', expanded);
                  });
                  headerChildren.push(toggle);
                }

                section.appendChild(dom.el('div', { class: 'mat-section__header' }, headerChildren));
                section.appendChild(content);
                return section;
              }

              // 1. Hero / Encabezado
              const hero = dom.el('div', { class: 'mat-board__hero' }, [
                dom.el('div', {
                  class: 'mat-board__badge',
                  html: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> <span>FICHA TÉCNICA · MATERIALES UTILIZADOS</span>'
                }),
                dom.el('h3', { class: 'mat-board__title', text: 'ESPECIFICACIONES DE MATERIALES & SOPORTE' }),
                dom.el('p', { class: 'mat-board__desc', text: 'Desglose detallado y clasificado de soportes, pigmentos, instrumentos, técnicas y valores cromáticos.' })
              ]);
              board.appendChild(hero);

              // 2. Soporte & Superficie
              const supportTags = [];
              const paperVal = matData.paper !== '—' ? matData.paper : (art.support || 'Sin especificar');
              if (paperVal) supportTags.push(createTag('Papel: ' + paperVal, 'cyan', '📄', 'Tipo de papel o soporte base'));
              if (matData.grammage && matData.grammage !== '—') supportTags.push(createTag('Gramaje: ' + matData.grammage, 'violet', '⚖️', 'Densidad del papel'));
              if (matData.brand && matData.brand !== '—') supportTags.push(createTag('Marca: ' + matData.brand, 'amber', '🏷️', 'Fabricante del papel'));

              const lowerSupport = (paperVal || '').toLowerCase();
              let texture = 'Grano Fino Natural';
              if (lowerSupport.includes('bristol') || lowerSupport.includes('satinado') || lowerSupport.includes('liso')) {
                texture = 'Superficie Lisa Satinada';
              } else if (lowerSupport.includes('arches') || lowerSupport.includes('acuarela') || lowerSupport.includes('torcon')) {
                texture = 'Prensado en Frío (Texturado)';
              } else if (lowerSupport.includes('kraft')) {
                texture = 'Superficie Kraft Reciclada';
              }
              supportTags.push(createTag(texture, 'teal', '✨', 'Textura superficial'));

              const supportSec = createSection(
                'Soporte & Superficie',
                '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
                supportTags,
                true
              );
              if (supportSec) board.appendChild(supportSec);

              // 3. Herramientas & Medios (Extracción inteligente de etiquetas)
              const toolTags = [];
              const addedSet = new Set();

              if (art.technique && art.technique !== '—') {
                toolTags.push(createTag('Técnica: ' + art.technique, 'cyan', '✏️', 'Técnica principal'));
                addedSet.add(art.technique.toLowerCase());
              }
              if (matData.category && matData.category !== '—') {
                toolTags.push(createTag('Categoría: ' + matData.category, 'amber', '🏷️', 'Categoría de arte'));
                addedSet.add(matData.category.toLowerCase());
              }

              // Extraer items individuales declarados en art.materials
              if (art.materials && art.materials !== '—') {
                const rawItems = String(art.materials).split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
                rawItems.forEach(function (item) {
                  const itemLower = item.toLowerCase();
                  if (addedSet.has(itemLower)) return;
                  if (paperVal && itemLower === paperVal.toLowerCase()) return;
                  if (matData.grammage && itemLower === matData.grammage.toLowerCase()) return;
                  if (matData.brand && itemLower === matData.brand.toLowerCase()) return;

                  let tagType = 'default';
                  let tagIcon = '•';
                  let tagTooltip = 'Material utilizado';

                  if (/^(?:2h|3h|4h|5h|6h|7h|8h|9h|h|hb|f|b|2b|3b|4b|5b|6b|7b|8b|9b|10b|12b)$/i.test(item) || itemLower.includes('grafito') || itemLower.includes('lápiz') || itemLower.includes('lapiz')) {
                    tagType = 'graphite';
                    tagIcon = '✏️';
                    tagTooltip = 'Graduación de lápiz de grafito';
                  } else if (itemLower.includes('carboncillo') || itemLower.includes('carbón') || itemLower.includes('vid') || itemLower.includes('charcoal')) {
                    tagType = 'charcoal';
                    tagIcon = '🪵';
                    tagTooltip = 'Pigmento carbón vegetal';
                  } else if (itemLower.includes('tinta') || itemLower.includes('ink') || itemLower.includes('estilógrafo') || itemLower.includes('estilografo') || /^(?:005|01|02|03|05|07|08|1|2|3|4|6|8)$/.test(item)) {
                    tagType = 'ink';
                    tagIcon = '✒️';
                    tagTooltip = 'Tinta pigmentada o estilógrafo';
                  } else if (itemLower.includes('marcador') || itemLower.includes('marker') || itemLower.includes('gray') || itemLower.includes('blender') || itemLower.includes('copic')) {
                    tagType = 'marker';
                    tagIcon = '🖍️';
                    tagTooltip = 'Marcador de precisión / base alcohol';
                  } else if (itemLower.includes('difumino') || itemLower.includes('stump')) {
                    tagType = 'emerald';
                    tagIcon = '🌫️';
                    tagTooltip = 'Difumino para degradados suaves';
                  } else if (itemLower.includes('goma') || itemLower.includes('borrador') || itemLower.includes('tiza') || itemLower.includes('blanco') || itemLower.includes('eraser')) {
                    tagType = 'slate';
                    tagIcon = '⚪';
                    tagTooltip = 'Herramienta de borrado o luces';
                  } else if (itemLower.includes('bolígrafo') || itemLower.includes('boligrafo') || itemLower.includes('ballpoint') || itemLower.includes('azul') || itemLower.includes('rojo') || itemLower.includes('negro')) {
                    tagType = 'blue';
                    tagIcon = '🖊️';
                    tagTooltip = 'Bolígrafo / Tinta al aceite';
                  } else if (itemLower.includes('óleo') || itemLower.includes('oleo') || itemLower.includes('acrílico') || itemLower.includes('acrilico') || itemLower.includes('acuarela') || itemLower.includes('gouache')) {
                    tagType = 'purple';
                    tagIcon = '🎨';
                    tagTooltip = 'Medio pictórico húmedo';
                  } else {
                    tagType = 'teal';
                    tagIcon = '✨';
                    tagTooltip = 'Herramienta artística';
                  }

                  toolTags.push(createTag(item, tagType, tagIcon, tagTooltip));
                  addedSet.add(itemLower);
                });
              }

              // Mapeo contextual según texto técnico general
              const rawTech = ((art.technique || '') + ' ' + (art.materials || '')).toLowerCase();
              if ((rawTech.includes('2h') || rawTech.includes('4h') || rawTech.includes('6h')) && !addedSet.has('h-set')) {
                toolTags.push(createTag('Lápices H (Estructura y trazo guía)', 'emerald', '•', 'Graduación dura para boceto previo'));
                addedSet.add('h-set');
              }
              if ((rawTech.includes('hb') || rawTech.includes('2b')) && !addedSet.has('mid-set')) {
                toolTags.push(createTag('Lápices HB/2B (Volumen y medios tonos)', 'blue', '•', 'Graduación media versátil'));
                addedSet.add('mid-set');
              }
              if ((rawTech.includes('4b') || rawTech.includes('6b') || rawTech.includes('8b')) && !addedSet.has('soft-set')) {
                toolTags.push(createTag('Lápices 4B/6B/8B (Negros profundos)', 'graphite', '•', 'Graduación blanda para contraste puro'));
                addedSet.add('soft-set');
              }
              if ((rawTech.includes('difumino') || rawTech.includes('stump')) && !addedSet.has('difumino-tag')) {
                toolTags.push(createTag('Difumino de papel compactado', 'emerald', '🌫️', 'Herramienta para transiciones tonales'));
                addedSet.add('difumino-tag');
              }
              if ((rawTech.includes('tinta') || rawTech.includes('ink')) && !addedSet.has('ink-tag')) {
                toolTags.push(createTag('Tinta pigmentada indeleble', 'ink', '✒️', 'Medio de línea impermeable'));
                addedSet.add('ink-tag');
              }
              if ((rawTech.includes('plumilla') || rawTech.includes('nib')) && !addedSet.has('nib-tag')) {
                toolTags.push(createTag('Plumilla de inmersión / acero', 'slate', '🖋️', 'Instrumento de línea modulada'));
                addedSet.add('nib-tag');
              }
              if ((rawTech.includes('carboncillo') || rawTech.includes('charcoal')) && !addedSet.has('char-tag')) {
                toolTags.push(createTag('Carboncillo vegetal prensado', 'charcoal', '🪵', 'Pigmento carbón puro'));
                toolTags.push(createTag('Goma maleable (Borrado por absorción)', 'slate', '⚪', 'Luces y corrección'));
                addedSet.add('char-tag');
              }

              const toolsSec = createSection(
                'Herramientas & Medios',
                '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
                toolTags,
                true
              );
              if (toolsSec) board.appendChild(toolsSec);

              // 4. Proceso & Ejecución
              const procTags = [];
              if (art.minutes) {
                const hrs = Math.floor(art.minutes / 60);
                const mins = art.minutes % 60;
                const timeStr = (hrs > 0 ? hrs + 'h ' : '') + (mins > 0 ? mins + 'm' : '') + ' (' + art.minutes + ' min)';
                procTags.push(createTag('Sesión: ' + timeStr, 'amber', '⏱️', 'Tiempo de ejecución dedicado'));
              }
              if (art.year) {
                procTags.push(createTag('Año: ' + art.year, 'slate', '🗓️', 'Año de creación'));
              }
              if (art.holographic) {
                procTags.push(createTag('✦ Edición Holográfica', 'holo', '✦', 'Tratamiento holográfico activado'));
              } else {
                procTags.push(createTag('Acabado Tradicional Mate', 'slate', '🛡️', 'Tratamiento estándar'));
              }
              if (art.status) {
                const statusLabel = art.statusLabel || (art.status.charAt(0).toUpperCase() + art.status.slice(1));
                procTags.push(createTag('Estado: ' + statusLabel, art.status === 'disponible' ? 'emerald' : 'slate', '●', 'Disponibilidad de la obra'));
              }
              if (art.seed) {
                procTags.push(createTag('Seed: #' + art.seed, 'mono', '⚡', 'Semilla algorítmica de renderizado'));
              }

              const procSec = createSection(
                'Proceso & Características',
                '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
                procTags,
                true
              );
              if (procSec) board.appendChild(procSec);

              // 5. Paleta de Valores Tonales (Swatches interactivos)
              if (art.palette && art.palette.length) {
                const paletteTags = art.palette.map(function (hex) {
                  const btn = dom.el('button', {
                    class: 'mat-tag mat-tag--swatch',
                    attrs: {
                      type: 'button',
                      title: 'Clic para copiar valor ' + hex,
                      'aria-label': 'Copiar color ' + hex
                    }
                  }, [
                    dom.el('span', { class: 'mat-tag__swatch-circle', style: { backgroundColor: hex } }),
                    dom.el('span', { class: 'mat-tag__text', text: hex.toUpperCase() })
                  ]);
                  btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(hex);
                      CYBER.bus.emit(CYBER.EVENTS.TOAST, { type: 'ok', text: 'Color ' + hex + ' copiado al portapapeles' });
                    }
                  });
                  return btn;
                });

                const palSec = createSection(
                  'Valores Tonales & Paleta',
                  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
                  paletteTags
                );
                if (palSec) board.appendChild(palSec);
              }

              // 6. Etiquetas Conceptuales
              if (art.tags && art.tags.length) {
                const conceptTags = art.tags.map(function (tag) {
                  return createTag('#' + tag, 'pill', null, 'Descriptor: ' + tag);
                });

                const tagsSec = createSection(
                  'Etiquetas & Descriptores',
                  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
                  conceptTags
                );
                if (tagsSec) board.appendChild(tagsSec);
              }

              return board;
            }

            viewMaterials.appendChild(buildMaterialsTagsBoard(art));


            /* Pestañas de Vista: IMAGEN y MATERIALES */
            const tabImage = dom.el('button', {
              class: 'viewer__tab viewer__tab-btn is-active',
              attrs: {
                type: 'button',
                role: 'tab',
                'aria-selected': 'true',
                'aria-label': 'Pestaña Imagen',
                'data-tab': 'image',
                title: 'Ver imagen de la obra'
              }
            }, [
              dom.el('span', {
                class: 'viewer__tab-icon',
                html: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
              }),
              dom.el('span', { class: 'viewer__tab-label', text: 'IMAGEN' })
            ]);

            const tabMaterials = dom.el('button', {
              class: 'viewer__tab viewer__tab-btn',
              attrs: {
                type: 'button',
                role: 'tab',
                'aria-selected': 'false',
                'aria-label': 'Pestaña Materiales',
                'data-tab': 'materials',
                title: 'Ver especificaciones y etiquetas de materiales'
              }
            }, [
              dom.el('span', {
                class: 'viewer__tab-icon',
                html: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
              }),
              dom.el('span', { class: 'viewer__tab-label', text: 'MATERIALES' }),
              dom.el('span', { class: 'viewer__tab-pill', text: 'Ficha' })
            ]);

            const tabsNav = dom.el('nav', {
              class: 'viewer__tabs-nav',
              attrs: { role: 'tablist', 'aria-label': 'Pestañas de visualización' }
            }, [tabImage, tabMaterials]);

            const tabsBar = dom.el('div', { class: 'viewer__tabs-bar' }, [tabsNav]);

            selectTab = function (which) {
              if (which === 'materials') {
                self.deactivateAntiCapture();
                stage.classList.add('viewer__stage--materials');
                tabMaterials.classList.add('is-active');
                tabMaterials.setAttribute('aria-selected', 'true');
                tabImage.classList.remove('is-active');
                tabImage.setAttribute('aria-selected', 'false');
                viewMaterials.classList.add('is-active');
                viewImage.classList.remove('is-active');
                shield.style.display = 'none';
                stage.style.borderTopLeftRadius = 'var(--radius, 10px)';
              } else {
                self.deactivateAntiCapture();
                stage.classList.remove('viewer__stage--materials');
                tabImage.classList.add('is-active');
                tabImage.setAttribute('aria-selected', 'true');
                tabMaterials.classList.remove('is-active');
                tabMaterials.setAttribute('aria-selected', 'false');
                viewImage.classList.add('is-active');
                viewMaterials.classList.remove('is-active');
                shield.style.display = 'block';
                stage.style.borderTopLeftRadius = '0';
              }
            };

            openMaterialsAdmin = function () {
              selectTab('materials');
            };

            tabImage.addEventListener('click', function (e) {
              e.stopPropagation();
              selectTab('image');
            });
            tabMaterials.addEventListener('click', function (e) {
              e.stopPropagation();
              selectTab('materials');
            });

            tabsNav.addEventListener('keydown', function (e) {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                tabMaterials.focus();
                selectTab('materials');
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                tabImage.focus();
                selectTab('image');
              }
            });

            /* ---- Manejador de aislamiento tonal según la paleta de colores ---- */
            let currentToneHex = null;
            let toneIndicatorEl = null;

            resetToneFilter = function () {
              currentToneHex = null;
              stage.classList.remove('is-toned');
              const img = stage.querySelector('.viewer__img');
              const cvs = stage.querySelector('.viewer__canvas') || stage.querySelector('canvas');
              if (img) img.style.filter = '';
              if (cvs) cvs.style.filter = '';

              const allSw = modal ? modal.querySelectorAll('.palette__sw') : [];
              allSw.forEach(function (sw) {
                sw.classList.remove('is-active');
                sw.removeAttribute('aria-pressed');
              });

              if (toneIndicatorEl && toneIndicatorEl.parentNode) {
                toneIndicatorEl.remove();
              }
              toneIndicatorEl = null;
            };

            applyToneFilter = function (hex, targetSwatch) {
              if (currentToneHex === hex) {
                resetToneFilter();
                bus.emit(CYBER.EVENTS.TOAST, {
                  type: 'info',
                  text: t('modal.toneRestored') || 'Restaurados colores originales de la obra.'
                });
                return;
              }

              currentToneHex = hex;
              if (selectTab) {
                selectTab('image');
              }

              const allSw = modal ? modal.querySelectorAll('.palette__sw') : [];
              allSw.forEach(function (sw) {
                if (sw === targetSwatch || sw.dataset.hex === hex) {
                  sw.classList.add('is-active');
                  sw.setAttribute('aria-pressed', 'true');
                } else {
                  sw.classList.remove('is-active');
                  sw.removeAttribute('aria-pressed');
                }
              });

              updateSvgToneFilter(hex);

              stage.classList.add('is-toned');
              const img = stage.querySelector('.viewer__img');
              const cvs = stage.querySelector('.viewer__canvas') || stage.querySelector('canvas');
              if (img) img.style.filter = 'url(#viewer-tone-filter)';
              if (cvs) cvs.style.filter = 'url(#viewer-tone-filter)';

              const toneName = getColorToneName(hex);
              if (!toneIndicatorEl) {
                toneIndicatorEl = dom.el('div', { class: 'viewer__tone-badge' });
                stage.appendChild(toneIndicatorEl);
              }
              dom.clear(toneIndicatorEl);
              toneIndicatorEl.appendChild(dom.el('span', {
                class: 'viewer__tone-dot',
                style: { background: hex }
              }));
              toneIndicatorEl.appendChild(dom.el('span', {
                class: 'viewer__tone-text',
                html: `Tonos: <strong>${toneName}</strong> (${hex})`
              }));
              const resetBtn = dom.el('button', {
                class: 'viewer__tone-reset',
                attrs: {
                  type: 'button',
                  title: 'Restaurar colores originales (o haz clic en el color de nuevo)',
                  'aria-label': 'Restaurar colores originales'
                },
                html: '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Restaurar</span>'
              });
              resetBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                resetToneFilter();
                bus.emit(CYBER.EVENTS.TOAST, {
                  type: 'info',
                  text: t('modal.toneRestored') || 'Restaurados colores originales de la obra.'
                });
              });
              toneIndicatorEl.appendChild(resetBtn);

              self.copyText(hex);
              if (targetSwatch) {
                targetSwatch.classList.add('is-copied');
                window.setTimeout(function () { targetSwatch.classList.remove('is-copied'); }, 1200);
              }

              bus.emit(CYBER.EVENTS.TOAST, {
                type: 'ok',
                text: `👁 Mostrando tonos de ${toneName} (${hex}) · Clic para restaurar.`
              });
            };

            self.activeResetToneFilter = resetToneFilter;

            /* Escudo invisible protector sobre la imagen contra clic derecho y arrastre */
            const shield = dom.el('div', {
              class: 'viewer__security-shield',
              attrs: { title: 'Obra protegida contra descargas' }
            });
            shield.addEventListener('contextmenu', function (e) {
              e.preventDefault();
              e.stopPropagation();
              bus.emit(CYBER.EVENTS.TOAST, {
                type: 'warn',
                text: '🔒 Obra protegida por derechos de autor · Clic derecho deshabilitado.'
              });
            });

            /* Cortina protectora anti-captura negra pura (sin textos) */
            const antiCapture = dom.el('div', { class: 'viewer__anti-capture' });
            antiCapture.addEventListener('click', function (e) {
              e.stopPropagation();
              self.deactivateAntiCapture();
            });

            viewImage.appendChild(shield);
            viewImage.appendChild(antiCapture);
            stage.appendChild(viewImage);
            stage.appendChild(viewMaterials);

            const viewerTools = dom.el('div', { class: 'viewer__tools' }, [
            dom.el('div', { class: 'viewer__tools-left' }, [
              favButton,
              dom.el('button', {
                class: 'viewer__tool-btn viewer__tool-btn--graph',
                attrs: {
                  type: 'button',
                  'data-action': 'graph',
                  title: t('modal.showInGraph'),
                  'aria-label': t('modal.showInGraph')
                }
              }, [
                dom.el('span', {
                  class: 'viewer__tool-icon',
                  html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/><line x1="15.5" y1="6" x2="8.5" y2="6"/></svg>'
                }),
                dom.el('span', { class: 'viewer__tool-label', text: t('modal.showInGraph') })
              ]),
              dom.el('button', {
                class: 'viewer__tool-btn viewer__tool-btn--prev',
                attrs: {
                  type: 'button',
                  'data-action': 'prev',
                  title: t('modal.prev'),
                  'aria-label': t('modal.prev')
                }
              }, [
                dom.el('span', {
                  class: 'viewer__tool-icon',
                  html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>'
                }),
                dom.el('span', { class: 'viewer__tool-label', text: t('modal.prev') })
              ]),
              dom.el('button', {
                class: 'viewer__tool-btn viewer__tool-btn--next',
                attrs: {
                  type: 'button',
                  'data-action': 'next',
                  title: t('modal.next'),
                  'aria-label': t('modal.next')
                }
              }, [
                dom.el('span', {
                  class: 'viewer__tool-icon',
                  html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>'
                }),
                dom.el('span', { class: 'viewer__tool-label', text: t('modal.next') })
              ])
            ]),
            dom.el('div', { class: 'viewer__tools-right' }, [
              dom.el('button', {
                class: 'viewer__tool-btn viewer__tool-btn--edit',
                attrs: {
                  type: 'button',
                  'data-action': 'edit',
                  title: t('modal.edit') || 'Editar',
                  'aria-label': t('modal.edit') || 'Editar'
                }
              }, [
                dom.el('span', {
                  class: 'viewer__tool-icon',
                  html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
                }),
                dom.el('span', { class: 'viewer__tool-label', text: t('modal.edit') || 'EDITAR' })
              ]),
              dom.el('button', {
                class: 'viewer__tool-btn viewer__tool-btn--delete',
                attrs: {
                  type: 'button',
                  'data-action': 'delete',
                  title: t('modal.delete') || 'Eliminar',
                  'aria-label': t('modal.delete') || 'Eliminar'
                }
              }, [
                dom.el('span', {
                  class: 'viewer__tool-icon',
                  html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>'
                }),
                dom.el('span', { class: 'viewer__tool-label', text: t('modal.delete') || 'ELIMINAR' })
              ])
            ])
          ]);

          return dom.el('div', { class: 'viewer' }, [
            tabsBar,
            stage,
            viewerTools
          ]);
          })(),

        /* ---------- metadatos ---------- */
        dom.el('div', { class: 'meta' }, [
          /* 1. Card de MATERIALES */
          (function () {
            const card = dom.el('div', { class: 'meta__materials-card' });
            const viewTagsBtn = dom.el('button', {
              class: 'meta__materials-admin-edit',
              type: 'button',
              html: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> <span>Ver Ficha</span>',
              attrs: { title: 'Ver desglose completo de etiquetas de materiales' }
            });
            viewTagsBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (openMaterialsAdmin) openMaterialsAdmin();
            });

            const header = dom.el('div', { class: 'meta__materials-header' }, [
              dom.el('span', { class: 'meta__materials-title', text: 'MATERIALES' }),
              viewTagsBtn
            ]);

            const chipsWrap = dom.el('div', { class: 'meta__materials-chips' });

            function addChip(icon, label, value, type) {
              if (!value || value === '—') return;
              const chip = dom.el('span', {
                class: 'meta__mat-chip meta__mat-chip--' + (type || 'default'),
                attrs: { title: label + ': ' + value }
              }, [
                dom.el('span', { class: 'meta__mat-chip-icon', html: icon }),
                dom.el('span', { class: 'meta__mat-chip-label', text: label + ': ' }),
                dom.el('strong', { class: 'meta__mat-chip-val', text: value })
              ]);
              chipsWrap.appendChild(chip);
            }

            addChip('📄', 'Papel', matData.paper !== '—' ? matData.paper : 'Sin especificar', 'cyan');
            addChip('⚖️', 'Gramaje', matData.grammage, 'violet');
            addChip('🏷️', 'Marca', matData.brand, 'amber');
            addChip('🎨', 'Categoría', matData.category, 'teal');

            // Etiquetas de medios/instrumentos específicos
            if (art.materials && art.materials !== '—') {
              const rawItems = String(art.materials).split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
              rawItems.forEach(function (item) {
                const itemLower = item.toLowerCase();
                if (itemLower === (matData.paper || '').toLowerCase() ||
                    itemLower === (matData.grammage || '').toLowerCase() ||
                    itemLower === (matData.brand || '').toLowerCase()) {
                  return;
                }
                const chip = dom.el('span', {
                  class: 'meta__mat-chip meta__mat-chip--item',
                  attrs: { title: 'Material: ' + item },
                  text: item
                });
                chipsWrap.appendChild(chip);
              });
            }

            card.appendChild(header);
            card.appendChild(chipsWrap);
            return card;
          })(),

          /* 2. Técnicas y ficha (debajo de materiales) */
          dom.el('dl', { class: 'meta__grid' }, metaCells.map(function (cell) {
            return dom.el('div', { class: 'meta__cell' }, [
              dom.el('dt', { text: cell.label }),
              dom.el('dd', { class: cell.hot ? 'hot' : '', text: String(cell.value) })
            ]);
          })),

          /* 3. Información de imagen (debajo de técnicas) */
          (function () {
            const infoBlock = dom.el('div', { class: 'meta__block meta__imginfo' });
            infoBlock.appendChild(dom.el('h3', { text: t('modal.imageInfo') }));

            const rawUrl = art.imageUrl || '';
            const filename = rawUrl
              ? (rawUrl.split('/').pop().split('?')[0] || t('modal.imgInfoGenerated'))
              : t('modal.imgInfoGenerated');

            const grid = dom.el('dl', { class: 'meta__img-grid' });

            function addRow(label, value) {
              const row = dom.el('div', { class: 'meta__img-row' });
              row.appendChild(dom.el('dt', { text: label }));
              const dd = dom.el('dd', { text: value });
              row.appendChild(dd);
              grid.appendChild(row);
              return dd;
            }

            addRow(t('modal.imgInfoName'), filename);
            const kbDd = addRow(t('modal.imgInfoSize'), '—');
            const dimDd = addRow(t('modal.imgInfoDimensions'), '—');

            infoBlock.appendChild(grid);

            if (rawUrl) {
              fetch(rawUrl, { method: 'HEAD', cache: 'force-cache' })
                .then(function (res) {
                  const cl = res.headers.get('content-length');
                  if (cl) kbDd.textContent = (Math.round(parseInt(cl, 10) / 102.4) / 10) + ' KB';
                })
                .catch(function () {});

              const probe = new Image();
              probe.onload = function () {
                dimDd.textContent = probe.naturalWidth + ' × ' + probe.naturalHeight + ' px';
                if (kbDd.textContent === '—') {
                  try {
                    const c = document.createElement('canvas');
                    c.width = probe.naturalWidth; c.height = probe.naturalHeight;
                    c.getContext('2d').drawImage(probe, 0, 0);
                    const dataUrl = c.toDataURL('image/png');
                    const bytes = Math.round(atob(dataUrl.split(',')[1]).length);
                    kbDd.textContent = (Math.round(bytes / 102.4) / 10) + ' KB';
                  } catch (e) {}
                }
              };
              probe.src = rawUrl;
            } else {
              dimDd.textContent = '900 × 560 px';
            }

            return infoBlock;
          })(),

          art.story ? dom.el('div', { class: 'meta__block meta__story' }, [
            dom.el('h3', { text: t('modal.story') }),
            dom.el('p', { class: 'meta__text meta__text--quote', text: art.story })
          ]) : null,

          dom.el('div', { class: 'meta__strip' }, [
            dom.el('div', { class: 'meta__block meta__palette-block' }, [
              dom.el('h3', { text: t('modal.palette') || 'PALETA DE COLORES' }),
              dom.el('div', { class: 'palette' }, art.palette.map(function (hex) {
                const toneName = getColorToneName(hex);
                return dom.el('button', {
                  class: 'palette__sw',
                  style: { background: hex },
                  dataset: { hex: hex },
                  attrs: {
                    'aria-label': `Filtrar tonos ${toneName} (${hex}) · Clic para aplicar`,
                    'data-action': 'swatch',
                    title: `Ver imagen en tonos de ${toneName} (${hex})`
                  }
                });
              })),
              (function () {
                function fitThumbnails(strip) {
                  const cards = Array.prototype.slice.call(strip.children);
                  if (!cards.length || !strip.clientWidth) return;
                  const ratios = cards.map(function (card) { return parseFloat(card.dataset.ratio) || 1; });
                  const gap = parseFloat(window.getComputedStyle(strip).columnGap) || 0;
                  const availableWidth = strip.clientWidth - gap * (cards.length - 1);
                  const maxHeight = Math.min(window.innerHeight * 0.22, 180);
                  const fitHeight = Math.min(maxHeight, availableWidth / ratios.reduce(function (sum, ratio) {
                    return sum + ratio;
                  }, 0));
                  const height = fitHeight * 1.1749125;
                  if (height > 0) {
                    strip.style.setProperty('--meta-thumbnail-height', height + 'px');
                  }
                }

                function thumbnail(other) {
                  const figure = dom.el('button', {
                    class: 'meta__thumbnail',
                    dataset: { ratio: '1' },
                    attrs: {
                      type: 'button',
                      'data-action': 'gallery-art',
                      'data-id': other.id,
                      'aria-label': 'Abrir ' + other.title + ' de ' + art.gallery,
                      title: other.title
                    }
                  });
                  if (other.imageUrl) {
                    const img = dom.el('img', { src: other.imageUrl, alt: other.title, loading: 'lazy' });
                    img.addEventListener('load', function () {
                      if (img.naturalWidth && img.naturalHeight) {
                        const ratio = img.naturalWidth / img.naturalHeight;
                        figure.dataset.ratio = String(ratio);
                        figure.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
                        if (figure.parentElement) fitThumbnails(figure.parentElement);
                      }
                    }, { once: true });
                    img.addEventListener('error', function () {
                      dom.clear(figure);
                      figure.appendChild(dom.el('span', {
                        class: 'meta__thumbnail-placeholder',
                        text: 'Imagen no disponible'
                      }));
                      figure.appendChild(dom.el('span', { class: 'meta__thumbnail-caption', text: other.title }));
                    }, { once: true });
                    figure.appendChild(img);
                  } else {
                    figure.appendChild(dom.el('span', {
                      class: 'meta__thumbnail-placeholder',
                      text: 'Obra generada'
                    }));
                  }
                  figure.appendChild(dom.el('span', { class: 'meta__thumbnail-caption', text: other.title }));
                  return figure;
                }

                const strip = dom.el('div', { class: 'meta__thumbnails' }, nextGalleryArts.map(thumbnail));
                strip.addEventListener('wheel', function (evt) {
                  const direction = evt.deltaY || evt.deltaX;
                  if (!direction || galleryArts.length < 2) return;
                  evt.preventDefault();
                  const now = Date.now();
                  if (now - self.lastGalleryWheelAt < 260) return;
                  self.lastGalleryWheelAt = now;
                  const currentIndex = galleryArts.findIndex(function (item) { return item.id === art.id; });
                  if (currentIndex < 0) return;
                  const nextIndex = (currentIndex + (direction > 0 ? 1 : -1) + galleryArts.length) % galleryArts.length;
                  self.openArtwork(galleryArts[nextIndex], { swap: true, list: galleryArts });
                }, { passive: false });
                window.requestAnimationFrame(function () { fitThumbnails(strip); });
                return strip;
              })()
            ]),

            dom.el('div', { class: 'meta__block meta__tags-block' }, [
              dom.el('div', { class: 'tagrow' }, art.tags.map(function (tag, index) {
                return dom.el('button', {
                  class: 'tag',
                  text: tagLabels[index] || tag,
                  attrs: { 'data-action': 'tag', 'data-tag': tag }
                });
              }))
            ])
          ]),

          related.length ? dom.el('div', { class: 'meta__block meta__related-block' }, [
            dom.el('h3', { text: t('modal.related', { count: related.length }) }),
            dom.el('div', { class: 'related' }, related.map(function (other) {
              const thumb = dom.el('canvas');
              const card = dom.el('button', {
                class: 'related__card',
                style: { '--cat-color': other.color },
                attrs: { 'data-action': 'related', 'data-id': other.id, title: other.title }
              }, [
                dom.el('span', { class: 'related__thumb' }, [thumb]),
                dom.el('span', { class: 'related__cat', text: other.categoryShort }),
                dom.el('span', { class: 'related__title', text: other.title })
              ]);
              CYBER.ArtGen.paint(thumb, other, { width: 120, height: 75 });
              return card;
            }))
          ]) : null
        ])
      ]),

      dom.el('footer', { class: 'modal__foot' }, [
        dom.el('span', { class: 'modal__counter', text: t('modal.counter', { position: position, total: total }) }),
        dom.el('span', { class: 'spacer' })
      ])
    ]);

    /* delegación de acciones */
    dom.on(modal, 'click', '[data-action]', function (evt, target) {
      const action = target.dataset.action;
      if (action === 'fav') self.toggleFavorite(art, target);
      else if (action === 'copy') self.copySheet(art);
      else if (action === 'download') self.downloadPNG(art);
      else if (action === 'graph') self.openInGraph(art);
      else if (action === 'edit') self.editArtwork(art);
      else if (action === 'delete') self.deleteArtwork(art);
      else if (action === 'swatch') {
        if (applyToneFilter) {
          applyToneFilter(target.dataset.hex, target);
        } else {
          self.copyText(target.dataset.hex, t('modal.toast.colorCopied', { hex: target.dataset.hex }));
          target.classList.add('is-copied');
          window.setTimeout(function () { target.classList.remove('is-copied'); }, 1200);
        }
      }
      else if (action === 'related') self.openById(target.dataset.id);
      else if (action === 'gallery-art') {
        const selected = galleryArts.find(function (item) { return item.id === target.dataset.id; });
        if (selected) self.openArtwork(selected, { swap: true, list: galleryArts });
      }
      else if (action === 'tag') self.filterByTag(target.dataset.tag);
      else if (action === 'prev') self.step(-1);
      else if (action === 'next') self.step(1);
    });

    dom.on(modal, 'click', '[data-close]', function () { self.close(); });

    return modal;
  };

  /* ------------------------------------------------------------
     Apertura / cierre
     ------------------------------------------------------------ */

  Modal.prototype.openArtwork = function (art, options) {
    if (!this.root || !art) return this;
    const opts = options || {};

    if (this.activeResetToneFilter) {
      try { this.activeResetToneFilter(); } catch (e) {}
      this.activeResetToneFilter = null;
    }

    if (opts.list) this.list = opts.list;
    this.lastFocus = document.activeElement;

    const modal = this.build(art);
    this.art = art;

    dom.clear(this.root);
    this.root.appendChild(dom.el('div', { class: 'modal__backdrop', attrs: { 'data-close': 'true' } }));
    this.root.appendChild(modal);
    modal.offsetWidth;

    if (opts.swap) {
      modal.classList.add('is-swapping');
      window.setTimeout(function () { modal.classList.remove('is-swapping'); }, 340);
    }

    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-open');
    this.open = true;

    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    bus.emit(CYBER.EVENTS.ARTWORK_OPEN, { id: art.id, artwork: art, origin: opts.origin || 'modal' });
    return this;
  };

  /** Repinta la ficha abierta (cambio de idioma). */
  Modal.prototype.reopen = function () {
    if (!this.open || !this.art) return this;
    return this.openArtwork(this.art, { swap: true });
  };

  Modal.prototype.openById = function (id) {
    const art = (this.list || []).find(function (item) { return item.id === id; });
    if (!art) return this;
    return this.openArtwork(art, { swap: true });
  };

  Modal.prototype.close = function () {
    if (!this.open || !this.root) return this;
    const id = this.art ? this.art.id : null;

    if (this.activeResetToneFilter) {
      try { this.activeResetToneFilter(); } catch (e) {}
      this.activeResetToneFilter = null;
    }

    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-modal-open');
    this.open = false;

    const self = this;
    window.setTimeout(function () {
      if (!self.open) dom.clear(self.root);
    }, 320);

    if (this.lastFocus && this.lastFocus.focus) {
      try { this.lastFocus.focus({ preventScroll: true }); } catch (err) { /* ignorado */ }
    }

    bus.emit(CYBER.EVENTS.ARTWORK_CLOSE, { id: id });
    return this;
  };

  /** Navega a la obra anterior o siguiente de la lista visible. */
  Modal.prototype.step = function (delta) {
    if (!this.open || !this.list || !this.list.length) return this;
    const index = this.indexOf(this.art);
    // Si no se encuentra el artículo actual, usar el primer elemento
    const currentIndex = index < 0 ? 0 : index;
    // Calcular el siguiente índice de forma segura
    let nextIndex = (currentIndex + delta + this.list.length) % this.list.length;
    // Asegurar que el índice es válido
    if (nextIndex < 0 || nextIndex >= this.list.length) {
      nextIndex = delta > 0 ? 0 : this.list.length - 1;
    }
    const nextArt = this.list[nextIndex];
    if (!nextArt) return this;
    return this.openArtwork(nextArt, { swap: true });
  };

  /* ------------------------------------------------------------
     Acciones
     ------------------------------------------------------------ */

  Modal.prototype.toggleFavorite = function (art, button) {
    const on = CYBER.Favorites.toggle(art.id);
    if (button) {
      button.classList.toggle('is-on', on);
      const span = button.querySelector('.viewer__tool-label') || button.querySelector('span');
      if (span) span.textContent = on ? t('modal.inFavorites') : t('modal.favorite');
      button.setAttribute('title', on ? t('modal.inFavorites') : t('modal.favorite'));
      button.setAttribute('aria-label', on ? t('modal.inFavorites') : t('modal.favorite'));
    }
    bus.emit(CYBER.EVENTS.TOAST, {
      type: on ? 'info' : 'warn',
      text: t(on ? 'toasts.favAdded' : 'toasts.favRemoved', { title: dom.escape(art.title) })
    });
  };

  Modal.prototype.sheetText = function (art) {
    const tagLabels = art.tagLabels && art.tagLabels.length ? art.tagLabels : art.tags;
    return [
      'KARL SKETCH - ' + art.title,
      t('modal.sheet.code') + ': ' + art.code + '  ·  ' + t('modal.sheet.technique') + ': ' + art.technique,
      t('modal.sheet.materials') + ': ' + (art.materials || '—') + '  ·  ' + t('modal.sheet.size') + ': ' + art.size
        + '  ·  ' + t('modal.sheet.year') + ': ' + art.year,
      t('modal.sheet.status') + ': ' + art.statusLabel,
      t('modal.sheet.tags') + ': ' + tagLabels.join(', '),
      '',
      art.description || ''
    ].join('\n');
  };

  Modal.prototype.copyText = function (value, message) {
    const notify = function (ok) {
      bus.emit(CYBER.EVENTS.TOAST, {
        type: ok ? 'ok' : 'warn',
        text: ok ? message : t('modal.toast.copyFail')
      });
    };

    function fallbackCopy(text) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        notify(ok);
      } catch (err) {
        notify(false);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(
        function () { notify(true); },
        function () { fallbackCopy(value); }
      );
    } else {
      fallbackCopy(value);
    }
  };

  Modal.prototype.copySheet = function () {
    bus.emit(CYBER.EVENTS.TOAST, {
      type: 'warn',
      text: '🔒 Copia deshabilitada · Obra protegida por derechos de autor.'
    });
  };

  Modal.prototype.downloadPNG = function () {
    bus.emit(CYBER.EVENTS.TOAST, {
      type: 'warn',
      text: '🔒 Descarga bloqueada · Obra protegida por derechos de autor.'
    });
  };

  Modal.prototype.openInGraph = function (art) {
    this.close();
    if (this.handlers.onOpenInGraph) this.handlers.onOpenInGraph(art);
  };

  /** Abre el editor con esta obra (cierra la ficha). */
  Modal.prototype.editArtwork = function (art) {
    this.close();
    bus.emit(CYBER.EVENTS.EDITOR_OPEN_EDIT, { id: art.id });
  };

  /** Pide confirmación y elimina la obra. */
  Modal.prototype.deleteArtwork = function (art) {
    this.close();
    bus.emit(CYBER.EVENTS.ARTWORK_DELETE, { id: art.id });
  };

  Modal.prototype.filterByTag = function (tag) {
    this.close();
    bus.emit(CYBER.EVENTS.TOAST, {
      type: 'info',
      text: t('modal.toast.filteringTag', { tag: dom.escape(CYBER.DataService.tagLabel(tag)) })
    });
    if (this.handlers.onFilterTag) this.handlers.onFilterTag(tag);
  };

  CYBER.Modal = Modal;
})(window.CYBER = window.CYBER || {});
