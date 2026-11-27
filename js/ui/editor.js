/* ============================================================
   ui/editor.js — crear, editar y eliminar obras
   Expone: CYBER.Editor
   ------------------------------------------------------------
   Los cambios se guardan en localStorage (CYBER.UserData) y se
   superponen al dataset base; no se reescriben los data/*.json.
   Incluye un diálogo de confirmación reutilizable (Editor.confirm).
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  const RENDER_BY_CATEGORY = {
    grafito: 'graphite',
    carboncillo: 'charcoal',
    boligrafo: 'ink',
    lapices: 'graphite',
    estilografos: 'ink',
    marcadores: 'marker',
    mixta: 'mixed',
    digital: 'digital'
  };


  /**
   * Presets de MATERIALES por categoría.
   * Al seleccionar una categoría en el editor, el campo "Materiales utilizados"
   * muestra automáticamente los chips correspondientes a esa categoría.
   */
  /* Tonalidades de color compartidas entre COLORES, BOLÍGRAFO y MARCADORES */
  var COLOR_SHADES = {
    'NEGRO':    ['Negro carbón', 'Negro humo', 'Negro intenso'],
    'BLANCO':   ['Blanco titanio', 'Blanco puro', 'Blanco cálido'],
    'ROJO':     ['Rojo carmesí', 'Rojo ladrillo', 'Rojo coral'],
    'VERDE':    ['Verde menta', 'Verde oliva', 'Verde esmeralda'],
    'AZUL':     ['Azul celeste', 'Azul marino', 'Azul cian'],
    'ROSA':     ['Rosa pastel', 'Rosa chicle', 'Rosa palo'],
    'AMARILLO': ['Amarillo limón', 'Amarillo mostaza', 'Amarillo dorado'],
    'CAFE':     ['Café claro', 'Café oscuro', 'Café caramelo'],
    'NARANJA':  ['Naranja pastel', 'Naranja quemado', 'Naranja mandarina'],
    'MAGENTA':  ['Lavanda', 'Púrpura', 'Fucsia'],
    'MORADO':   ['Lavanda', 'Púrpura', 'Fucsia']
  };

  var COLOR_NODES = ['NEGRO', 'BLANCO', 'ROJO', 'VERDE', 'AZUL', 'ROSA', 'AMARILLO', 'CAFE', 'NARANJA', 'MAGENTA'];

  /**
   * Presets jerárquicos de MATERIALES por categoría.
   * Cada categoría tiene una lista de "tipos de material" (nodos principales).
   * Cada tipo puede tener sub-nodos (grados, colores, tonalidades).
   * Formato: { label, icon, subnodes: string[]|null, shades: object|null }
   */
  const CATEGORY_MATERIALS_PRESETS = {
    grafito: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES }
    ],
    lapices: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES }
    ],
    carboncillo: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES }
    ],
    boligrafo: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES }
    ],
    estilografos: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES }
    ],
    marcadores: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES }
    ],
    mixta: [
      { label: 'LÁPIZ',        icon: '✏️', subnodes: ['2H','H','HB','B','2B','4B','6B','8B','10B','12B'], shades: null },
      { label: 'CARBONCILLO',  icon: '🖤', subnodes: ['2-4 mm','3-6 mm','5-7 mm','7-9 mm','10-12 mm','12-14 mm'], shades: null },
      { label: 'COLORES',      icon: '🎨', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'BOLÍGRAFO',    icon: '🖊️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ESTILÓGRAFO',  icon: '🖋️', subnodes: ['NEGRO','AZUL','ROJO'], shades: null },
      { label: 'MARCADORES',   icon: '🖌️', subnodes: COLOR_NODES, shades: COLOR_SHADES },
      { label: 'ACRÍLICO',     icon: '🎭', subnodes: null, shades: null },
      { label: 'ACUARELA',     icon: '💧', subnodes: null, shades: null },
      { label: 'ÓLEO',         icon: '🎨', subnodes: null, shades: null }
    ],
    digital: [
      { label: 'Procreate',      icon: '📱', subnodes: null, shades: null },
      { label: 'Clip Studio',    icon: '💻', subnodes: null, shades: null },
      { label: 'Photoshop',      icon: '🖥️', subnodes: null, shades: null },
      { label: 'Krita',          icon: '🖥️', subnodes: null, shades: null },
      { label: 'Blender',        icon: '🖥️', subnodes: null, shades: null },
      { label: 'iPad Pro',       icon: '📱', subnodes: null, shades: null },
      { label: 'Apple Pencil',   icon: '✏️', subnodes: null, shades: null }
    ]
  };

  /**
   * Sub-presets de propiedades del papel para la categoría bolígrafo.
   */
  const PAPEL_PRESETS = {
    medidas: ['A5 · 14.8×21 cm', 'B5 · 17.8×25.4 cm', 'A4 · 21×29.7 cm'],
    gramaje: ['160 g/m²', '180 g/m²'],
    marca:   ['CANSON Serie XL', 'STRATHMORE']
  };

  const PAPER_TYPES = [
    'Canson XL Bristol A4 (210 x 297 mm) 160 g/m',
    'Canson XL Mix Media (178 x 254 mm) 160 g',
    'Facia Opalina (216 x 279 mm) 225g',
    'Genérico A5 (148 x 210 mm) 160g',
    'Genérico B5 (176 x 250 mm) 160g'
  ];

  const STATUS_KEYS = ['disponible', 'reservado', 'vendido', 'archivo', 'exposicion'];

  /** Extrae colores dominantes de una imagen cargada. */
  function extractPaletteFromImage(img, count) {
    count = count || 4;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return ['#05070c', '#00eaff', '#ff2e97', '#ffffff'];
      ctx.drawImage(img, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      const samples = [];
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;
        samples.push({ r: r, g: g, b: b, lum: r * 0.299 + g * 0.587 + b * 0.114 });
      }
      if (!samples.length) return ['#05070c', '#00eaff', '#ff2e97', '#ffffff'];
      samples.sort(function (p1, p2) { return p1.lum - p2.lum; });
      const picked = [];
      const step = Math.floor(samples.length / count);
      for (let k = 0; k < count; k += 1) {
        const idx = Math.min(samples.length - 1, Math.floor(k * step + step / 2));
        const s = samples[idx];
        const hex = '#' + ((1 << 24) + (s.r << 16) + (s.g << 8) + s.b).toString(16).slice(1);
        if (picked.indexOf(hex) === -1) picked.push(hex);
      }
      return picked.length ? picked : ['#05070c', '#00eaff', '#ff2e97', '#ffffff'];
    } catch (err) {
      return ['#05070c', '#00eaff', '#ff2e97', '#ffffff'];
    }
  }

  function Editor(rootId) {
    this.root = document.getElementById(rootId || 'editor-root');
    this.handlers = {};
    this.categories = [];
    this.id = null;
    this.art = null;
    this.open = false;
    this.armed = false;
  }

  /** Convierte una obra normalizada en su forma raw editable. */
  Editor.rawFromArtwork = function (art) {
    const es = art.l10n.es;
    const en = art.l10n.en;
    const parsed = CYBER.parseMaterials ? CYBER.parseMaterials(art) : {};
    return {
      id: art.id,
      imageUrl: art.imageUrl || '',
      materialsImageUrl: art.materialsImageUrl || art.materialsImage || '',
      materialsImage: art.materialsImageUrl || art.materialsImage || '',
      gallery: art.gallery || '',
      holographic: !!art.holographic,
      title: es.title,
      category: art.category,
      technique: es.technique,
      materials: es.materials,
      paper: art.paper || (parsed.paper !== '—' ? parsed.paper : ''),
      grammage: art.grammage || (parsed.grammage !== '—' ? parsed.grammage : ''),
      brand: art.brand || (parsed.brand !== '—' ? parsed.brand : ''),
      year: art.year,
      size: art.size,
      status: art.status,
      seed: art.seed,
      render: art.render,
      featured: art.featured,
      palette: art.palette.slice(),
      tags: art.tags.slice(),
      description: es.description,
      story: es.story,
      en: {
        title: en.title,
        technique: en.technique,
        materials: en.materials,
        description: en.description,
        story: en.story
      }
    };
  };

  Editor.prototype.init = function (handlers) {
    this.handlers = handlers || {};
    const self = this;
    if (!this.root) return this;

    document.addEventListener('keydown', function (evt) {
      if (!self.open) return;
      if (evt.key === 'Escape') { evt.preventDefault(); self.close(); }
    });

    /* botón "añadir obra" de la barra superior */
    const addButton = document.getElementById('btn-add-work');
    if (addButton) {
      addButton.addEventListener('click', function () {
        if (CYBER.Admin) {
          CYBER.Admin.require(function () { self.openNew(); });
        } else {
          self.openNew();
        }
      });
    }

    /* eventos de creación, edición y borrado protegidos por modo admin */
    bus.on(CYBER.EVENTS.EDITOR_OPEN_NEW, function () {
      if (CYBER.Admin) {
        CYBER.Admin.require(function () { self.openNew(); });
      } else {
        self.openNew();
      }
    });
    bus.on(CYBER.EVENTS.EDITOR_OPEN_EDIT, function (payload) {
      if (CYBER.Admin) {
        CYBER.Admin.require(function () {
          if (payload && payload.id) self.openEditById(payload.id);
        });
      } else {
        if (payload && payload.id) self.openEditById(payload.id);
      }
    });
    bus.on(CYBER.EVENTS.ARTWORK_DELETE, function (payload) {
      if (CYBER.Admin) {
        CYBER.Admin.require(function () {
          if (payload && payload.id) self.confirmDelete(payload.id);
        });
      } else {
        if (payload && payload.id) self.confirmDelete(payload.id);
      }
    });

    return this;
  };

  Editor.prototype.setCategories = function (categories) {
    this.categories = categories || [];
  };

  Editor.prototype.currentLocale = function () {
    return CYBER.I18n ? CYBER.I18n.locale() : 'es';
  };

  /* ------------------------------------------------------------
     Apertura
     ------------------------------------------------------------ */

  Editor.prototype.openNew = function () {
    this.id = null;
    this.art = null;
    this.currentImageUrl = '';
    this.render();
    return this;
  };

  Editor.prototype.openEdit = function (raw) {
    this.id = raw.id;
    this.art = raw;
    this.currentImageUrl = raw.imageUrl || '';
    this.render();
    return this;
  };

  Editor.prototype.openEditById = function (id) {
    const art = this.handlers.findArtwork ? this.handlers.findArtwork(id) : null;
    if (!art) {
      bus.emit(CYBER.EVENTS.TOAST, { type: 'warn', text: t('editor.titleRequired') });
      return this;
    }
    return this.openEdit(Editor.rawFromArtwork(art));
  };

  Editor.prototype.close = function () {
    if (!this.root) return this;
    this.open = false;
    this.armed = false;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { dom.clear(this.root); }.bind(this), 260);
    return this;
  };

  /* ------------------------------------------------------------
     Construcción del formulario
     ------------------------------------------------------------ */

  Editor.prototype.render = function () {
    const self = this;
    const raw = this.art || { en: {} };
    const isEdit = !!this.id;
    this.currentImageUrl = raw.imageUrl || '';

    this.open = true;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');

    dom.clear(this.root);

    function field(label, control, hint) {
      const children = [dom.el('label', { class: 'field__label', text: label })];
      if (control) children.push(control);
      if (hint) children.push(dom.el('span', { class: 'field__hint', text: hint }));
      return dom.el('div', { class: 'field' }, children);
    }

    function input(name, value, type, placeholder) {
      return dom.el('input', {
        name: name,
        value: value || '',
        type: type || 'text',
        placeholder: placeholder || '',
        spellcheck: 'false'
      });
    }

    function textarea(name, value, rows) {
      return dom.el('textarea', { name: name, rows: rows || 3 }, [String(value || '')]);
    }

    const urlInp = dom.el('input', {
      name: 'imageUrl',
      type: 'url',
      placeholder: 'https://live.staticflickr.com/... · https://i.imgur.com/... · cualquier URL directa',
      value: this.currentImageUrl || '',
      spellcheck: 'false'
    });
    const filePreview = dom.el('img', {
      class: 'editor__img-preview',
      style: { maxWidth: '140px', maxHeight: '100px', objectFit: 'contain' }
    });
    const previewInfo = dom.el('div', { class: 'editor__img-preview-info' });
    const previewBox = dom.el('div', {
      class: 'editor__img-preview-box',
      style: { display: this.currentImageUrl ? 'flex' : 'none' }
    }, [
      filePreview,
      previewInfo
    ]);

    function renderPreviewInfo(status, details, infoEl, tag) {
      infoEl = infoEl || previewInfo;
      dom.clear(infoEl);
      if (status === 'loading') {
        infoEl.appendChild(dom.el('div', {
          class: 'editor__img-meta-loading',
          text: '⟳ Analizando imagen...'
        }));
        return;
      }
      if (status === 'error') {
        infoEl.appendChild(dom.el('div', {
          class: 'editor__img-meta-error',
          text: '⚠ No se pudo cargar la imagen desde este enlace.'
        }));
        return;
      }
      if (status === 'loaded' && details) {
        const badgeLabel = tag === 'MAT' ? 'MAT · INFO' : 'IMG · INFO';
        const header = dom.el('div', { class: 'editor__img-meta-head' }, [
          dom.el('span', { class: 'editor__img-badge', text: badgeLabel }),
          dom.el('span', { class: 'editor__img-status-ok', text: '● Enlace activo' })
        ]);
        const list = dom.el('div', { class: 'editor__img-meta-list' }, [
          dom.el('div', { class: 'editor__img-meta-row' }, [
            dom.el('span', { class: 'editor__img-meta-key', text: 'Dimensiones:' }),
            dom.el('span', { class: 'editor__img-meta-val', text: details.dimensions })
          ]),
          dom.el('div', { class: 'editor__img-meta-row' }, [
            dom.el('span', { class: 'editor__img-meta-key', text: 'Proporción:' }),
            dom.el('span', { class: 'editor__img-meta-val', text: details.aspectRatio })
          ]),
          dom.el('div', { class: 'editor__img-meta-row' }, [
            dom.el('span', { class: 'editor__img-meta-key', text: 'Servidor:' }),
            dom.el('span', { class: 'editor__img-meta-val editor__img-meta-val--mono', text: details.host })
          ]),
          dom.el('div', { class: 'editor__img-meta-row' }, [
            dom.el('span', { class: 'editor__img-meta-key', text: 'Archivo:' }),
            dom.el('span', { class: 'editor__img-meta-val editor__img-meta-val--mono', text: details.filename })
          ])
        ]);
        infoEl.appendChild(header);
        infoEl.appendChild(list);
      }
    }

    function buildImgOnload(imgEl, infoEl) {
      return function () {
        const w = imgEl.naturalWidth || 0;
        const h = imgEl.naturalHeight || 0;
        let ratioText = '—';
        if (w && h) {
          const r = w / h;
          if (Math.abs(r - 1) < 0.05) ratioText = '1:1 (Cuadrada)';
          else if (Math.abs(r - 16 / 9) < 0.1) ratioText = '16:9 (Horizontal)';
          else if (Math.abs(r - 4 / 3) < 0.1) ratioText = '4:3 (Horizontal)';
          else if (Math.abs(r - 3 / 2) < 0.1) ratioText = '3:2 (Horizontal)';
          else if (Math.abs(r - 9 / 16) < 0.1) ratioText = '9:16 (Vertical)';
          else if (Math.abs(r - 3 / 4) < 0.1) ratioText = '3:4 (Vertical)';
          else if (Math.abs(r - 2 / 3) < 0.1) ratioText = '2:3 (Vertical)';
          else if (r > 1) ratioText = 'Horizontal (' + r.toFixed(2) + ':1)';
          else ratioText = 'Vertical (1:' + (1 / r).toFixed(2) + ')';
        }
        let host = '—';
        let filename = '—';
        try {
          const parsed = new URL(imgEl.src);
          host = parsed.hostname || '—';
          const segments = parsed.pathname.split('/').filter(Boolean);
          filename = segments.pop() || 'imagen';
          if (filename.length > 25) {
            filename = filename.slice(0, 12) + '…' + filename.slice(-10);
          }
        } catch (e) {
          host = 'externo';
          filename = (imgEl.src.split('/').pop() || 'imagen').split('?')[0];
        }
        renderPreviewInfo('loaded', {
          dimensions: (w && h) ? (w + ' × ' + h + ' px') : 'Cargada',
          aspectRatio: ratioText,
          host: host,
          filename: filename
        }, infoEl);
      };
    }

    filePreview.onload = function () {
      filePreview.style.display = 'block';
      buildImgOnload(filePreview, previewInfo)();
    };
    filePreview.onerror = function () {
      filePreview.style.display = 'none';
      renderPreviewInfo('error', null, previewInfo);
    };

    if (this.currentImageUrl) {
      renderPreviewInfo('loading', null, previewInfo);
      filePreview.src = this.currentImageUrl;
    }

    urlInp.addEventListener('input', updateUrl);
    urlInp.addEventListener('change', updateUrl);
    urlInp.addEventListener('blur', updateUrl);
    urlInp.addEventListener('keyup', updateUrl);
    urlInp.addEventListener('paste', function () {
      setTimeout(updateUrl, 30);
    });
    function updateUrl() {
      const val = (urlInp.value || '').trim();
      self.currentImageUrl = val;
      if (val) {
        previewBox.style.display = 'flex';
        renderPreviewInfo('loading', null, previewInfo);
        filePreview.src = val;
      } else {
        filePreview.src = '';
        previewBox.style.display = 'none';
        dom.clear(previewInfo);
      }
    }

    function select(name, options, current) {
      return dom.el('select', { name: name }, options.map(function (opt) {
        return dom.el('option', {
          value: opt.value,
          text: opt.label,
          selected: opt.value === current
        });
      }));
    }

    const categorySelect = select('category',
      this.categories.map(function (cat) { return { value: cat.id, label: cat.label }; }),
      raw.category || (this.categories[0] && this.categories[0].id));

    const statusSelect = select('status',
      STATUS_KEYS.map(function (key) { return { value: key, label: t('status.' + key) }; }),
      raw.status || 'archivo');

    const gallerySelect = select('gallery',
      [
        { value: '', label: 'Selecciona una galería' },
        { value: 'GALERÍA I', label: 'GALERÍA I' },
        { value: 'GALERÍA II', label: 'GALERÍA II' },
        { value: 'GALERÍA III', label: 'GALERÍA III' },
        { value: 'GALERÍA IV', label: 'GALERÍA IV' },
        { value: 'GALERÍA V', label: 'GALERÍA V' },
        { value: 'GALERÍA VI', label: 'GALERÍA VI' }
      ],
      raw.gallery || '');

    const paperTypeSelect = select('paperType',
      [{ value: '', label: 'Selecciona un tipo de papel' }].concat(
        PAPER_TYPES.map(function (label) { return { value: label, label: label }; })
      ),
      raw.paper || '');

    const head = dom.el('header', { class: 'editor__head' }, [
      dom.el('span', { class: 'editor__index', text: isEdit ? CYBER.Fmt.code(raw.id) : '+' }),
      dom.el('h2', { class: 'editor__title', text: t(isEdit ? 'editor.titleEdit' : 'editor.titleNew') }),
      dom.el('button', {
        class: 'editor__close',
        html: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        attrs: { 'aria-label': t('editor.closeAria'), 'data-close': 'true' }
      })
    ]);

    /* -------- Selector de etiquetas reutilizable (tag-picker) -------- */
    const TECH_PRESETS = t('editor.techniquesPreset') || [
      'Puntillismo','Rayado','Superposición','Achurado',
      'Esfumado','Trama','Garabateo','Difumado',
      'Escalonado','Esgrafiado','Circulismo'
    ];
    /* MAT_PRESETS ahora es dinámico por categoría (CATEGORY_MATERIALS_PRESETS) */

    /**
     * Genera un picker de etiquetas con presets de un clic + input libre.
     * @param {string}   hiddenName  - name del <input type="hidden">
     * @param {string}   currentValue - valor actual (CSV)
     * @param {string[]} presets     - lista de etiquetas predefinidas
     * @param {string}   placeholder - texto de ayuda del input libre
     */
    function makeTagPicker(hiddenName, currentValue, presets, placeholder) {
      presets = presets || [];
      /* current puede ser string separado por comas */
      const allSelected = String(currentValue || '').split(/[,;]+/).map(function(s){return s.trim();}).filter(Boolean);

      /* separamos presets activos vs. etiquetas personalizadas */
      const presetLower = presets.map(function(p){ return p.toLowerCase(); });
      const customTags = allSelected.filter(function(s){
        return presetLower.indexOf(s.toLowerCase()) === -1;
      });

      const hiddenInp = dom.el('input', { name: hiddenName, type: 'hidden', value: allSelected.join(', ') });

      /* sincroniza el hidden input leyendo chips activos + custom tags */
      function syncHidden() {
        const presetActive = Array.from(presetsRow.querySelectorAll('.tech-chip.is-on'))
          .map(function(c){ return c.dataset.label || c.textContent.trim(); });
        const customActive = Array.from(customRow.querySelectorAll('.tech-chip--custom'))
          .map(function(c){ return c.dataset.label; });
        hiddenInp.value = presetActive.concat(customActive).join(', ');
      }

      /* ---- fila de presets ---- */
      const presetsRow = dom.el('div', { class: 'tech-picker tech-picker--presets' });

      presets.forEach(function(label) {
        const isActive = allSelected.some(function(s){ return s.toLowerCase() === label.toLowerCase(); });
        const chip = dom.el('button', {
          type: 'button',
          class: 'tech-chip' + (isActive ? ' is-on' : ''),
          text: label,
          attrs: { 'data-label': label }
        });
        chip.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          chip.classList.toggle('is-on');
          syncHidden();
        });
        presetsRow.appendChild(chip);
      });

      /* ---- fila de etiquetas personalizadas ---- */
      const customRow = dom.el('div', { class: 'tech-picker__custom' });

      function addCustomChip(label) {
        label = label.trim();
        if (!label) return;
        /* evitar duplicados (preset o custom ya existente) */
        const existing = Array.from(customRow.querySelectorAll('.tech-chip--custom'))
          .map(function(c){ return c.dataset.label.toLowerCase(); });
        if (existing.indexOf(label.toLowerCase()) !== -1) return;
        if (presetLower.indexOf(label.toLowerCase()) !== -1) {
          /* activar el preset correspondiente en lugar de duplicarlo */
          Array.from(presetsRow.querySelectorAll('.tech-chip')).forEach(function(c) {
            if (c.textContent.trim().toLowerCase() === label.toLowerCase()) {
              c.classList.add('is-on');
            }
          });
          syncHidden();
          return;
        }

        const chip = dom.el('span', {
          class: 'tech-chip tech-chip--custom',
          attrs: { 'data-label': label }
        });
        chip.textContent = label;
        const del = dom.el('button', {
          type: 'button',
          class: 'tech-chip__del',
          text: '×',
          attrs: { 'aria-label': 'Eliminar ' + label, title: 'Eliminar' }
        });
        del.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          customRow.removeChild(chip);
          syncHidden();
        });
        chip.appendChild(del);
        customRow.appendChild(chip);
        syncHidden();
      }

      /* restaurar custom tags previos */
      customTags.forEach(addCustomChip);

      /* ---- input de escritura libre ---- */
      const freeInp = dom.el('input', {
        type: 'text',
        class: 'tech-picker__input',
        placeholder: placeholder || 'Añadir… (Enter o coma)',
        spellcheck: 'false'
      });

      freeInp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = freeInp.value.replace(/,/g, '').trim();
          if (val) { addCustomChip(val); freeInp.value = ''; }
        } else if (e.key === 'Backspace' && !freeInp.value) {
          /* borrar el último custom chip con Backspace */
          const chips = customRow.querySelectorAll('.tech-chip--custom');
          if (chips.length) customRow.removeChild(chips[chips.length - 1]);
          syncHidden();
        }
      });

      freeInp.addEventListener('blur', function() {
        const val = freeInp.value.replace(/,/g, '').trim();
        if (val) { addCustomChip(val); freeInp.value = ''; }
      });

      /* pegar varios separados por coma */
      freeInp.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        text.split(/[,;\n]+/).forEach(function(part) {
          const v = part.trim();
          if (v) addCustomChip(v);
        });
        freeInp.value = '';
      });

      const customWrap = dom.el('div', { class: 'tech-picker__custom-wrap' }, [customRow, freeInp]);

      /* ocultar presetsRow si no hay presets */
      if (!presets.length) presetsRow.style.display = 'none';

      const wrapper = dom.el('div', { class: 'tech-picker__wrap' }, [presetsRow, customWrap, hiddenInp]);
      return wrapper;
    }

    /* alias cómodos */
    function makeTechPicker(hiddenName, currentValue) {
      return makeTagPicker(
        hiddenName, currentValue,
        TECH_PRESETS,
        t('editor.techniqueFreeHint') || 'Escribir técnica propia… (Enter o coma para añadir)'
      );
    }
    /**
     * Genera la UI estructurada de dos columnas para cualquier categoría:
     *   Columna 1: chips del material según la categoría (tag-picker libre)
     *   Columna 2: Medidas de papel / Gramaje / Marca
     * El hidden input «materials» se sincroniza con todos los sub-selectores.
     * @param {string} hiddenName
     * @param {string} currentValue - valor actual (CSV)
     * @param {string} categoryId  - categoría activa
     */
    function makeStructuredMaterialsPicker(hiddenName, currentValue, categoryId) {
      /* Parsear valor actual (CSV) para marcar activos */
      const active = String(currentValue || '').split(/[,;]+/).map(function(s){return s.trim();}).filter(Boolean);

      /* ---- hidden inputs ---- */
      const hiddenInp = dom.el('input', { name: hiddenName, type: 'hidden', value: active.join(', ') });
      const paperInp = dom.el('input', { name: 'paper', type: 'hidden', value: raw.paper || '' });
      const grammageInp = dom.el('input', { name: 'grammage', type: 'hidden', value: raw.grammage || '' });
      const brandInp = dom.el('input', { name: 'brand', type: 'hidden', value: raw.brand || '' });

      /* Sincroniza el hidden leyendo todos los chips activos del picker */
      function syncAll() {
        const vals = Array.from(wrap.querySelectorAll('.tech-chip.is-on, .tech-chip--custom'))
          .map(function(c){ return c.dataset.label || c.textContent.replace('×','').trim(); })
          .filter(Boolean);
        hiddenInp.value = vals.join(', ');
      }

      /* ---- helper: fila de chips radio-like para sub-grupos de papel ---- */
      function makeSubGroup(presets, section) {
        const row = dom.el('div', { class: 'mat-picker__chips' });
        presets.forEach(function(label) {
          let isOn = false;
          if (section === 'medidas') {
            isOn = (raw.paper && raw.paper.toLowerCase() === label.toLowerCase()) || active.some(function(a){ return a.toLowerCase() === label.toLowerCase(); });
            if (isOn && !paperInp.value) paperInp.value = label;
          } else if (section === 'gramaje') {
            isOn = (raw.grammage && raw.grammage.toLowerCase() === label.toLowerCase()) || active.some(function(a){ return a.toLowerCase() === label.toLowerCase(); });
            if (isOn && !grammageInp.value) grammageInp.value = label;
          } else if (section === 'marca') {
            isOn = (raw.brand && raw.brand.toLowerCase() === label.toLowerCase()) || active.some(function(a){ return a.toLowerCase() === label.toLowerCase(); });
            if (isOn && !brandInp.value) brandInp.value = label;
          }

          const chip = dom.el('button', {
            type: 'button',
            class: 'tech-chip' + (isOn ? ' is-on' : ''),
            text: label,
            attrs: { 'data-label': label, 'data-section': section }
          });
          chip.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const willBeOn = !chip.classList.contains('is-on');
            /* radio-like dentro del mismo sub-grupo */
            Array.from(row.querySelectorAll('.tech-chip')).forEach(function(c){
              c.classList.remove('is-on');
            });
            if (willBeOn) chip.classList.add('is-on');

            const selected = willBeOn ? label : '';
            if (section === 'medidas') paperInp.value = selected;
            else if (section === 'gramaje') grammageInp.value = selected;
            else if (section === 'marca') brandInp.value = selected;

            syncAll();
          });
          row.appendChild(chip);
        });
        return row;
      }

      /* ---- Columna izquierda: material según categoría (tag-picker libre) ---- */
      const catPresets = CATEGORY_MATERIALS_PRESETS[categoryId] || [];
      const catLabel = categoryId
        ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1))
        : 'Material';
      const matPicker = makeTagPicker(
        '__mat_tmp', currentValue,
        catPresets,
        t('editor.materialFreeHint') || 'Otro material… (Enter o coma)'
      );
      /* Escuchar cambios para sincronizar el hidden maestro */
      matPicker.addEventListener('click', function(){ window.setTimeout(syncAll, 50); });
      matPicker.addEventListener('keydown', function(){ window.setTimeout(syncAll, 50); });

      const colLeft = dom.el('div', { class: 'mat-picker__col' }, [
        dom.el('p', { class: 'mat-picker__col-title', text: catLabel }),
        matPicker
      ]);

      /* ---- Columna derecha: propiedades del papel ---- */
      const colRight = dom.el('div', { class: 'mat-picker__col mat-picker__col--paper' }, [
        dom.el('p', { class: 'mat-picker__col-title', text: 'Medidas de papel' }),
        makeSubGroup(PAPEL_PRESETS.medidas, 'medidas'),
        dom.el('p', { class: 'mat-picker__sub-title', text: 'Gramaje' }),
        makeSubGroup(PAPEL_PRESETS.gramaje, 'gramaje'),
        dom.el('p', { class: 'mat-picker__sub-title', text: 'Marca' }),
        makeSubGroup(PAPEL_PRESETS.marca, 'marca')
      ]);

      const wrap = dom.el('div', { class: 'mat-picker__two-col' }, [
        colLeft,
        colRight,
        hiddenInp,
        paperInp,
        grammageInp,
        brandInp
      ]);
      return wrap;
    }

    /**
     * Construye un selector jerárquico de materiales.
     * Nivel 1: Tipos de material (LÁPIZ, CARBONCILLO, COLORES, etc.)
     * Nivel 2: Sub-nodos (grados de dureza, colores, etc.)
     * Nivel 3 (opcional): Tonalidades de cada color
     *
     * @param {string} hiddenName  - name del hidden input del formulario
     * @param {Array}  matDefs     - array de { label, icon, subnodes, shades }
     * @param {Array}  preSelected - array de strings ya seleccionados
     */
    function buildHierarchicalMaterialPicker(hiddenName, matDefs, preSelected) {
      preSelected = preSelected || [];
      var selectedItems = preSelected.slice(); // copia mutable

      /* Hidden input para el formulario */
      var hiddenInp = document.createElement('input');
      hiddenInp.type = 'hidden';
      hiddenInp.name = hiddenName;
      hiddenInp.value = selectedItems.join(', ');

      function syncHidden() {
        hiddenInp.value = selectedItems.join(', ');
      }

      function toggleSelected(label) {
        var idx = selectedItems.map(function(s){ return s.toLowerCase(); }).indexOf(label.toLowerCase());
        if (idx === -1) {
          selectedItems.push(label);
        } else {
          selectedItems.splice(idx, 1);
        }
        syncHidden();
        updateAllVisuals();
      }

      function isSelected(label) {
        return selectedItems.some(function(s){ return s.toLowerCase() === label.toLowerCase(); });
      }

      /* Contenedor raíz */
      var root = document.createElement('div');
      root.className = 'hmp-root';

      /* Resumen de seleccionados */
      var summaryEl = document.createElement('div');
      summaryEl.className = 'hmp-summary';

      /* Nivel 1: chips de tipos de material */
      var level1 = document.createElement('div');
      level1.className = 'hmp-level1';

      /* Contenedor de sub-nodos (nivel 2) */
      var level2Container = document.createElement('div');
      level2Container.className = 'hmp-level2-container';
      level2Container.style.display = 'none';

      /* Nivel 3: tonalidades */
      var level3Container = document.createElement('div');
      level3Container.className = 'hmp-level3-container';
      level3Container.style.display = 'none';

      var activeMatDef = null; /* matDef actualmente expandido */
      var activeSubnode = null; /* subnode actualmente expandido */

      function updateSummary() {
        summaryEl.innerHTML = '';
        if (!selectedItems.length) {
          summaryEl.innerHTML = '<span class="hmp-summary-empty">Ningún material seleccionado</span>';
          return;
        }
        selectedItems.forEach(function(item) {
          var tag = document.createElement('span');
          tag.className = 'hmp-summary-tag';
          tag.textContent = item;
          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'hmp-summary-del';
          del.textContent = '×';
          del.title = 'Quitar ' + item;
          del.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var i = selectedItems.map(function(s){ return s.toLowerCase(); }).indexOf(item.toLowerCase());
            if (i !== -1) selectedItems.splice(i, 1);
            syncHidden();
            updateAllVisuals();
          });
          tag.appendChild(del);
          summaryEl.appendChild(tag);
        });
      }

      function updateAllVisuals() {
        updateSummary();

        /* Actualizar badges y estado en Nivel 1 */
        matDefs.forEach(function(md) {
          var chip = level1.querySelector('.hmp-node-chip[data-label="' + md.label + '"]');
          if (!chip) return;
          var count = 0;
          if (isSelected(md.label)) count++;
          if (md.subnodes) {
            md.subnodes.forEach(function(sub) {
              if (isSelected(sub)) count++;
              if (md.shades && md.shades[sub]) {
                md.shades[sub].forEach(function(sh) {
                  if (isSelected(sh)) count++;
                });
              }
            });
          }
          var badge = chip.querySelector('.hmp-node-badge');
          if (count > 0) {
            chip.classList.add('is-on');
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'hmp-node-badge';
              chip.appendChild(badge);
            }
            badge.textContent = count;
          } else {
            chip.classList.remove('is-on');
            if (badge) badge.remove();
          }
        });

        /* Actualizar Nivel 2 */
        level2Container.querySelectorAll('.hmp-subnode-chip').forEach(function(sc) {
          var label = sc.dataset.label;
          if (!label) return;
          var hasShades = activeMatDef && activeMatDef.shades && activeMatDef.shades[label];
          var anySelected = isSelected(label);
          if (hasShades && activeMatDef.shades[label]) {
            anySelected = anySelected || activeMatDef.shades[label].some(function(sh){ return isSelected(sh); });
          }
          if (anySelected) sc.classList.add('is-on');
          else sc.classList.remove('is-on');
        });

        /* Actualizar Nivel 3 */
        level3Container.querySelectorAll('.hmp-shade-chip').forEach(function(shc) {
          var label = shc.dataset.label;
          if (isSelected(label)) shc.classList.add('is-on');
          else shc.classList.remove('is-on');
        });
      }

      matDefs.forEach(function(matDef) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'hmp-node-chip';
        chip.dataset.label = matDef.label;
        chip.title = matDef.label;

        var iconEl = document.createElement('span');
        iconEl.className = 'hmp-node-icon';
        iconEl.textContent = matDef.icon || '◈';

        var labelEl = document.createElement('span');
        labelEl.className = 'hmp-node-label';
        labelEl.textContent = matDef.label;

        chip.appendChild(iconEl);
        chip.appendChild(labelEl);

        chip.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          /* Si no tiene sub-nodos, simplemente toggle selección */
          if (!matDef.subnodes || !matDef.subnodes.length) {
            toggleSelected(matDef.label);
            level2Container.style.display = 'none';
            level3Container.style.display = 'none';
            activeMatDef = null;
            level1.querySelectorAll('.hmp-node-chip').forEach(function(c) {
              if (c !== chip) c.classList.remove('is-expanded');
            });
            return;
          }

          /* Mostrar/ocultar sub-nodos */
          var isExpanded = chip.classList.contains('is-expanded');

          level1.querySelectorAll('.hmp-node-chip').forEach(function(c) {
            c.classList.remove('is-expanded');
          });
          level2Container.innerHTML = '';
          level2Container.style.display = 'none';
          level3Container.style.display = 'none';

          if (!isExpanded) {
            chip.classList.add('is-expanded');
            activeMatDef = matDef;

            /* Construir encabezado del nivel 2 */
            var l2header = document.createElement('div');
            l2header.className = 'hmp-level2-header';
            l2header.innerHTML = '<span class="hmp-level2-icon">' + (matDef.icon || '◈') + '</span>' +
              '<span class="hmp-level2-title">' + matDef.label + '</span>' +
              '<span class="hmp-level2-hint">Selecciona los nodos necesarios</span>';
            level2Container.appendChild(l2header);

            /* Construir chips de sub-nodos (nivel 2) */
            var l2chips = document.createElement('div');
            l2chips.className = 'hmp-level2-chips';

            matDef.subnodes.forEach(function(subLabel) {
              var subChip = document.createElement('button');
              subChip.type = 'button';
              subChip.className = 'hmp-subnode-chip';
              subChip.dataset.label = subLabel;
              subChip.textContent = subLabel;

              var hasShades = matDef.shades && matDef.shades[subLabel] && matDef.shades[subLabel].length > 0;

              if (hasShades) {
                subChip.classList.add('has-shades');
                var arrowEl = document.createElement('span');
                arrowEl.className = 'hmp-shade-arrow';
                arrowEl.textContent = '▸';
                subChip.appendChild(arrowEl);
              }

              subChip.addEventListener('click', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();

                if (hasShades) {
                  /* Desplegar tonalidades (Nivel 3) */
                  var isSubExpanded = subChip.classList.contains('is-expanded');

                  l2chips.querySelectorAll('.hmp-subnode-chip').forEach(function(c) {
                    c.classList.remove('is-expanded');
                  });
                  level3Container.innerHTML = '';
                  level3Container.style.display = 'none';

                  if (!isSubExpanded) {
                    subChip.classList.add('is-expanded');
                    activeSubnode = subLabel;

                    /* Encabezado nivel 3 */
                    var l3header = document.createElement('div');
                    l3header.className = 'hmp-level3-header';
                    l3header.innerHTML = '<span class="hmp-level3-back">◂ ' + matDef.label + '</span>' +
                      '<span class="hmp-level3-title">' + subLabel + ' · Tonalidades</span>';
                    level3Container.appendChild(l3header);

                    /* Chips de tonalidades */
                    var l3chips = document.createElement('div');
                    l3chips.className = 'hmp-level3-chips';

                    /* Opción 1: Color base mismo */
                    var baseChip = document.createElement('button');
                    baseChip.type = 'button';
                    baseChip.className = 'hmp-shade-chip';
                    baseChip.dataset.label = subLabel;
                    baseChip.textContent = subLabel + ' (Base)';
                    if (isSelected(subLabel)) baseChip.classList.add('is-on');
                    baseChip.addEventListener('click', function(eShade) {
                      eShade.preventDefault();
                      eShade.stopPropagation();
                      toggleSelected(subLabel);
                    });
                    l3chips.appendChild(baseChip);

                    /* Opciones 2, 3, 4: Las 3 tonalidades */
                    matDef.shades[subLabel].forEach(function(shade) {
                      var shadeChip = document.createElement('button');
                      shadeChip.type = 'button';
                      shadeChip.className = 'hmp-shade-chip';
                      shadeChip.dataset.label = shade;
                      shadeChip.textContent = shade;
                      if (isSelected(shade)) shadeChip.classList.add('is-on');

                      shadeChip.addEventListener('click', function(eShade) {
                        eShade.preventDefault();
                        eShade.stopPropagation();
                        toggleSelected(shade);
                      });
                      l3chips.appendChild(shadeChip);
                    });
                    level3Container.appendChild(l3chips);
                    level3Container.style.display = 'block';
                  }
                } else {
                  /* Sin tonalidades: toggle directo */
                  toggleSelected(subLabel);
                  level3Container.innerHTML = '';
                  level3Container.style.display = 'none';
                }
              });

              l2chips.appendChild(subChip);
            });

            level2Container.appendChild(l2chips);
            level2Container.style.display = 'block';
            updateAllVisuals();
          }
        });

        level1.appendChild(chip);
      });

      /* Fila para agregar material personalizado */
      var customRow = document.createElement('div');
      customRow.className = 'hmp-custom-row';

      var customInp = document.createElement('input');
      customInp.type = 'text';
      customInp.className = 'hmp-custom-input';
      customInp.placeholder = 'Otro material personalizado… (Enter o botón)';

      var customBtn = document.createElement('button');
      customBtn.type = 'button';
      customBtn.className = 'hmp-custom-btn';
      customBtn.textContent = '+ Agregar';

      function addCustom() {
        var val = (customInp.value || '').trim();
        if (val) {
          if (!isSelected(val)) {
            selectedItems.push(val);
            syncHidden();
            updateAllVisuals();
          }
          customInp.value = '';
        }
      }

      customBtn.addEventListener('click', function(e) {
        e.preventDefault();
        addCustom();
      });

      customInp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustom();
        }
      });

      customRow.appendChild(customInp);
      customRow.appendChild(customBtn);

      root.appendChild(hiddenInp);
      root.appendChild(level1);
      root.appendChild(level2Container);
      root.appendChild(level3Container);
      root.appendChild(summaryEl);
      root.appendChild(customRow);

      updateAllVisuals();

      return root;
    }

    const techEs = makeTechPicker('technique', raw.technique || '');

    const descEs = textarea('description', raw.description || '');

    const initialPalette = (raw.palette && raw.palette.length)
      ? raw.palette.slice()
      : ['#05070c', '#00eaff', '#ff2e97', '#ffffff'];

    let currentColors = initialPalette.map(function (c) {
      let h = String(c || '').trim();
      if (!h.startsWith('#') && /^[0-9a-f]{3,8}$/i.test(h)) h = '#' + h;
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) {
        if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
        return h.toLowerCase();
      }
      return '#00eaff';
    });

    const paletteInput = input('palette', currentColors.join(', '));
    paletteInput.placeholder = t('editor.paletteHexText');
    const swatchesContainer = dom.el('div', { class: 'editor__swatches' });
    const presetsContainer = dom.el('div', { class: 'editor__presets' });

    const PRESETS = {
      neon: { label: 'Cyan Neon', colors: ['#05070c', '#00eaff', '#0077ff', '#e8f3ff'] },
      matrix: { label: 'Matrix', colors: ['#040804', '#00ff66', '#00551a', '#b3ffcc'] },
      synthwave: { label: 'Synthwave', colors: ['#0e0517', '#ff2e97', '#00eaff', '#ffe600'] },
      solar: { label: 'Solar', colors: ['#0c0804', '#ff8a3d', '#ffc247', '#fff1d6'] },
      void: { label: 'Void', colors: ['#08090d', '#5d6a7d', '#b9c6d6', '#ffffff'] }
    };

    function renderSwatches() {
      dom.clear(swatchesContainer);
      currentColors.forEach(function (hex, i) {
        const item = dom.el('div', { class: 'editor__swatch-item' });
        const picker = dom.el('input', {
          type: 'color',
          class: 'editor__color-picker',
          value: hex.length === 7 ? hex : '#00eaff',
          title: hex
        });
        const hexLabel = dom.el('span', { class: 'editor__swatch-hex', text: hex });
        picker.addEventListener('input', function (e) {
          currentColors[i] = e.target.value.toLowerCase();
          hexLabel.textContent = currentColors[i];
          paletteInput.value = currentColors.join(', ');
        });

        item.appendChild(picker);
        item.appendChild(hexLabel);

        if (currentColors.length > 1) {
          const delBtn = dom.el('button', {
            type: 'button',
            class: 'editor__swatch-del',
            text: '×',
            title: 'Eliminar'
          });
          delBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            currentColors.splice(i, 1);
            syncPaletteUI();
          });
          item.appendChild(delBtn);
        }
        swatchesContainer.appendChild(item);
      });

      const addBtn = dom.el('button', {
        type: 'button',
        class: 'btn btn--ghost editor__swatch-add',
        text: t('editor.addColor')
      });
      addBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        currentColors.push('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        syncPaletteUI();
      });
      swatchesContainer.appendChild(addBtn);
    }

    function syncPaletteUI() {
      paletteInput.value = currentColors.join(', ');
      renderSwatches();
    }

    paletteInput.addEventListener('change', function () {
      const parsed = paletteInput.value.split(/[,;\s]+/).map(function (s) {
        let h = s.trim();
        if (!h) return null;
        if (!h.startsWith('#') && /^[0-9a-f]{3,8}$/i.test(h)) h = '#' + h;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) {
          if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
          return h.toLowerCase();
        }
        return null;
      }).filter(Boolean);
      if (parsed.length) {
        currentColors = parsed;
        syncPaletteUI();
      }
    });

    presetsContainer.appendChild(dom.el('span', { class: 'editor__presets-label', text: t('editor.presets') }));
    Object.keys(PRESETS).forEach(function (key) {
      const p = PRESETS[key];
      const pBtn = dom.el('button', {
        type: 'button',
        class: 'editor__preset-btn',
        text: p.label
      });
      pBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        currentColors = p.colors.slice();
        syncPaletteUI();
      });
      presetsContainer.appendChild(pBtn);
    });

    const extractBtn = dom.el('button', {
      type: 'button',
      class: 'editor__preset-btn editor__preset-btn--extract',
      text: t('editor.extractPalette')
    });
    extractBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const imgUrl = (urlInp && urlInp.value.trim()) || self.currentImageUrl || (filePreview && filePreview.src);
      if (!imgUrl) {
        bus.emit(CYBER.EVENTS.TOAST, { type: 'warn', text: t('editor.noImageForPalette') });
        return;
      }
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.onload = function () {
        const extracted = extractPaletteFromImage(tempImg, 4);
        if (extracted && extracted.length) {
          currentColors = extracted;
          syncPaletteUI();
          bus.emit(CYBER.EVENTS.TOAST, { type: 'ok', text: t('editor.paletteExtracted') });
        }
      };
      tempImg.onerror = function () {
        bus.emit(CYBER.EVENTS.TOAST, { type: 'warn', text: t('editor.noImageForPalette') });
      };
      tempImg.src = imgUrl;
    });
    presetsContainer.appendChild(extractBtn);

    renderSwatches();

    const paletteBox = dom.el('div', { class: 'editor__palette-box' }, [
      swatchesContainer,
      presetsContainer,
      paletteInput
    ]);

    const holoInp = dom.el('input', {
      name: 'holographic',
      type: 'checkbox'
    });
    if (raw.holographic) {
      holoInp.checked = true;
    }
    const holoSwitch = dom.el('label', { class: 'switch switch--editor-holo' }, [
      holoInp,
      dom.el('span', { class: 'switch__track' }, [dom.el('span', { class: 'switch__knob' })]),
      dom.el('span', { class: 'switch__label' }, [
        dom.el('span', { class: 'holo-text-gradient', text: 'Efecto Holográfico' })
      ])
    ]);

    const body = dom.el('div', { class: 'editor__body' }, [
      /* ---- Bloque superior: 2 columnas (Izquierda: Título + Imagen · Derecha: metadatos) ---- */
      dom.el('div', { class: 'editor__split' }, [
        /* Columna izquierda */
        dom.el('div', { class: 'editor__split-col editor__split-col--left' }, [
          field(t('editor.title') || 'Título de la obra', input('title', raw.title || '')),
          field(t('editor.image') || 'Imagen de la obra', dom.el('div', { class: 'editor__image-box' }, [
            dom.el('div', { class: 'editor__image-controls' }, [urlInp]),
            previewBox,
            field('GALERÍA', gallerySelect)
          ]), 'Enlace URL directo a la imagen principal de la obra')
        ]),
        /* Columna derecha */
        dom.el('div', { class: 'editor__split-col editor__split-col--right' }, [
          field(t('editor.year'), input('year', raw.year || '', 'number')),
          field(t('editor.category'), categorySelect),
          field('TIPO DE PAPEL', paperTypeSelect),
          field(t('editor.status'), statusSelect),
          field('EFECTO HOLOGRÁFICO', holoSwitch, 'Añade reflejo tornasol e iridiscente a la obra')
        ])
      ]),

      /* ---- Bloque de Técnicas y Materiales con NodePicker ---- */
      (function () {
        /* ---- TÉCNICAS ---- */
        const techSelected = String(raw.technique || '').split(/[,;]+/).map(function(s){ return s.trim(); }).filter(Boolean);
        const techPicker = new CYBER.NodePicker({
          hiddenName: 'technique',
          items: (TECH_PRESETS && Array.isArray(TECH_PRESETS)) ? TECH_PRESETS.slice() : [
            'Puntillismo','Rayado','Superposición','Achurado',
            'Esfumado','Trama','Garabateo','Difumado','Escalonado','Esgrafiado','Circulismo'
          ],
          selected: techSelected,
          centerLabel: 'TÉCNICA',
          centerIcon: '✦',
          variant: 'tech'
        });
        const techPickerEl = techPicker.build();

        /* ---- MATERIALES (selector jerárquico) ---- */
        const matSelected = String(raw.materials || '').split(/[,;]+/).map(function(s){ return s.trim(); }).filter(Boolean);
        const catId = raw.category || (self.categories[0] && self.categories[0].id) || 'grafito';

        /* Construye el selector jerárquico de materiales */
        var matPickerEl = buildHierarchicalMaterialPicker(
          'materials',
          CATEGORY_MATERIALS_PRESETS[catId] || CATEGORY_MATERIALS_PRESETS.grafito || [],
          matSelected
        );

        /* Reconstruir materiales al cambiar categoría */
        categorySelect.addEventListener('change', function () {
          const newCatId = categorySelect.value;
          const newMatDefs = CATEGORY_MATERIALS_PRESETS[newCatId] || CATEGORY_MATERIALS_PRESETS.grafito || [];
          const newPicker = buildHierarchicalMaterialPicker('materials', newMatDefs, []);
          matPickerEl.parentNode && matPickerEl.parentNode.replaceChild(newPicker, matPickerEl);
          matPickerEl = newPicker;
        });

        const techSection = dom.el('div', { class: 'editor__section-box np-section' }, [
          dom.el('p', { class: 'editor__section-title np-section-title', text: t('editor.technique') || 'Técnicas' }),
          techPickerEl
        ]);

        const matSection = dom.el('div', { class: 'editor__section-box np-section' }, [
          dom.el('p', { class: 'editor__section-title np-section-title', text: t('editor.materials') || 'Materiales utilizados' }),
          matPickerEl
        ]);

        return dom.el('section', { class: 'editor__lang editor__lang--solo' }, [
          techSection,
          matSection,
          field(t('editor.story') || 'Historia / Detrás de la obra', textarea('story', raw.story || ''))
        ]);
      })(),

      /* ---- Fila 6: Paleta de colores (Ancho completo) ---- */
      field(t('editor.palette'), paletteBox, t('editor.paletteHint'))
    ]);

    const deleteButton = isEdit ? dom.el('button', {
      class: 'btn btn--ghost editor__delete',
      text: t('editor.delete'),
      attrs: { 'data-action': 'delete' }
    }) : null;

    const foot = dom.el('footer', { class: 'editor__foot' }, [
      deleteButton || dom.el('span'),
      dom.el('span', { class: 'spacer' }),
      dom.el('button', { class: 'btn btn--ghost editor__cancel', text: t('editor.cancel'), attrs: { 'data-action': 'cancel' } }),
      dom.el('button', { class: 'btn editor__save', text: t('editor.save'), attrs: { 'data-action': 'save' } })
    ]);

    const modal = dom.el('div', {
      class: 'editor',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t(isEdit ? 'editor.titleEdit' : 'editor.titleNew') }
    }, [head, body, foot]);

    this.root.appendChild(dom.el('div', { class: 'editor__backdrop', attrs: { 'data-close': 'true' } }));
    this.root.appendChild(modal);

    /* acciones */
    dom.on(modal, 'click', '[data-action]', function (evt, target) {
      const action = target.dataset.action;
      if (action === 'save') self.save();
      else if (action === 'cancel') self.close();
      else if (action === 'delete') self.armDelete(target);
    });
    dom.on(this.root, 'click', '[data-close]', function () { self.close(); });

    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.open = true;

    const first = this.root.querySelector('input, select, textarea');
    if (first) first.focus({ preventScroll: true });
  };

  /* ------------------------------------------------------------
     Acciones
     ------------------------------------------------------------ */

  Editor.prototype.collect = function () {
    function value(name) {
      const el = this.root.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    }
    const split = function (text) {
      return String(text || '').split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    };

    const title = value.call(this, 'title');

    const palette = split(value.call(this, 'palette')).map(function (hex) {
      let h = String(hex || '').trim();
      if (!h.startsWith('#') && /^[0-9a-f]{3,8}$/i.test(h)) h = '#' + h;
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) {
        if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
        return h.toLowerCase();
      }
      return null;
    }).filter(Boolean);
    const tags = split(value.call(this, 'tags')).map(function (tag) { return tag.toLowerCase(); });

    const category = value.call(this, 'category') || (this.categories[0] && this.categories[0].id);
    const year = parseInt(value.call(this, 'year'), 10) || new Date().getFullYear();

    const imageUrl = value.call(this, 'imageUrl') || this.currentImageUrl || '';
    const materialsImageUrl = value.call(this, 'materialsImageUrl') || (this.art && (this.art.materialsImageUrl || this.art.materialsImage)) || '';
    const paper = value.call(this, 'paperType') || value.call(this, 'paper') || (this.art && this.art.paper) || '';
    const grammage = value.call(this, 'grammage') || (this.art && this.art.grammage) || '';
    const brand = value.call(this, 'brand') || (this.art && this.art.brand) || '';
    const existingDesc = (this.art && (this.art.description || (this.art.l10n && this.art.l10n.es && this.art.l10n.es.description))) || '';
    const existingDescEn = (this.art && (this.art.description || (this.art.l10n && this.art.l10n.en && this.art.l10n.en.description))) || '';

    const holoEl = this.root.querySelector('[name="holographic"]');
    const holographic = holoEl ? holoEl.checked : (this.art ? !!this.art.holographic : false);

    return {
      id: this.id || ('user-' + Date.now()),
      imageUrl: imageUrl,
      materialsImageUrl: materialsImageUrl,
      materialsImage: materialsImageUrl,
      gallery: value.call(this, 'gallery'),
      holographic: holographic,
      title: value.call(this, 'title') || title,
      category: category,
      technique: value.call(this, 'technique') || '—',
      materials: value.call(this, 'materials') || '—',
      paper: paper,
      grammage: grammage,
      brand: brand,
      year: year,
      size: value.call(this, 'size') || (this.art && this.art.size) || '—',
      status: value.call(this, 'status') || 'archivo',
      seed: this.art ? this.art.seed : CYBER.DataService.hashSeed(title + '|' + Date.now()),
      render: RENDER_BY_CATEGORY[category] || 'mixed',
      featured: this.art ? !!this.art.featured : false,
      palette: palette.length ? palette : ['#05070c', '#00eaff', '#e8f3ff'],
      tags: tags.length ? tags : ((this.art && this.art.tags) ? this.art.tags.slice() : []),
      description: existingDesc,
      story: value.call(this, 'story'),
      en: {
        title: title,
        technique: value.call(this, 'technique'),
        materials: value.call(this, 'materials'),
        description: existingDescEn,
        story: value.call(this, 'story')
      }
    };
  };

  Editor.prototype.save = function () {
    const raw = this.collect();
    if (!raw.title) {
      bus.emit(CYBER.EVENTS.TOAST, { type: 'error', text: t('editor.titleRequired') });
      return this;
    }
    const wasEdit = !!this.id;
    this.close();
    if (this.handlers.onSave) this.handlers.onSave(raw, wasEdit);
    return this;
  };

  /** Primero arma el botón; un segundo clic confirma el borrado. */
  Editor.prototype.armDelete = function (button) {
    const self = this;
    if (this.armed) {
      this.armed = false;
      this.close();
      if (this.handlers.onDelete) this.handlers.onDelete(this.id, this.art);
      return;
    }
    this.armed = true;
    button.textContent = t('editor.deleteConfirm');
    button.classList.add('is-armed');
    window.setTimeout(function () {
      self.armed = false;
      button.textContent = t('editor.delete');
      button.classList.remove('is-armed');
    }, 3200);
  };

  /* ------------------------------------------------------------
     Diálogo de confirmación reutilizable
     ------------------------------------------------------------ */

  Editor.prototype.confirmDelete = function (id) {
    const self = this;
    const art = this.handlers.findArtwork ? this.handlers.findArtwork(id) : null;
    const title = art ? art.title : id;
    Editor.confirm(t('editor.confirmTitle'), t('editor.confirmBody', { title: dom.escape(title) }), function () {
      if (self.handlers.onDelete) self.handlers.onDelete(id, art);
    });
  };

  /** Diálogo de confirmación genérico (título + mensaje HTML). */
  Editor.confirm = function (title, bodyHtml, onConfirm) {
    const root = document.getElementById('editor-root');
    if (!root) return;
    dom.clear(root);

    const panel = dom.el('div', {
      class: 'confirm',
      attrs: { role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title }
    }, [
      dom.el('h2', { class: 'confirm__title', text: title }),
      dom.el('p', { class: 'confirm__body', html: bodyHtml }),
      dom.el('div', { class: 'confirm__actions' }, [
        dom.el('button', {
          class: 'btn btn--ghost',
          text: t('editor.keep'),
          attrs: { 'data-close': 'true' }
        }),
        dom.el('button', {
          class: 'btn btn--magenta',
          text: t('editor.delete'),
          attrs: { 'data-ok': 'true' }
        })
      ])
    ]);

    root.appendChild(dom.el('div', { class: 'editor__backdrop', attrs: { 'data-close': 'true' } }));
    root.appendChild(panel);
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');

    function closeDialog() {
      document.removeEventListener('keydown', onKeyDown);
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      window.setTimeout(function () { dom.clear(root); }, 260);
    }

    function onKeyDown(evt) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        closeDialog();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    dom.on(panel, 'click', '[data-ok]', function () {
      closeDialog();
      if (onConfirm) onConfirm();
    });
    dom.on(root, 'click', '[data-close]', function () {
      closeDialog();
    });

    const ok = panel.querySelector('[data-ok]');
    if (ok) ok.focus({ preventScroll: true });
  };

  CYBER.Editor = Editor;
})(window.CYBER = window.CYBER || {});
