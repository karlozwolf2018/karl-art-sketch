/* ============================================================
   data/service.js — carga, validación, normalización e idioma
   Expone: CYBER.DataService
   ------------------------------------------------------------
   Estrategia de carga:
     1) intenta leer data/*.json con fetch()
     2) si falla (file://, 404, JSON roto) usa CYBER.FallbackData
     3) normaliza SIEMPRE a un modelo estable con los dos idiomas
   Contenido traducible: cada obra lleva su bloque "en", cada
   categoría sus campos *_en y las etiquetas viven en data/tags.json.
   ============================================================ */
(function (CYBER) {
  'use strict';

  const API_BASE = location.protocol === 'file:' ? '' : '';

  const SOURCES = {
    config: 'data/config.json',
    categories: API_BASE + '/api/categories',
    artworks: API_BASE + '/api/artworks',
    tags: API_BASE + '/api/tags'
  };

  const VALID_RENDERS = ['graphite', 'charcoal', 'ink', 'marker', 'mixed', 'digital'];
  const VALID_STATUS = ['disponible', 'reservado', 'vendido', 'archivo', 'exposicion'];

  function locale() {
    return CYBER.I18n ? CYBER.I18n.locale() : 'es';
  }

  function fetchJSON(url) {
    if (!window.fetch || location.protocol === 'file:') {
      return Promise.reject(new Error('fetch no disponible en ' + location.protocol));
    }
    return window.fetch(url, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' en ' + url);
      return response.json();
    });
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return String(item).trim(); }).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
    }
    return [];
  }

  function normalizeHex(value, fallback) {
    let text = String(value || '').trim();
    if (!text) return fallback;
    if (!text.startsWith('#') && /^[0-9a-f]{3,8}$/i.test(text)) {
      text = '#' + text;
    }
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) {
      if (text.length === 4) {
        text = '#' + text[1] + text[1] + text[2] + text[2] + text[3] + text[3];
      }
      return text.toLowerCase();
    }
    return fallback;
  }

  function text(value, fallback) {
    const out = String(value === undefined || value === null ? '' : value).trim();
    return out || fallback || '';
  }

  /* ---------- categorías ---------- */

  function applyCategoryLocale(category, target) {
    const pack = category.l10n[target] || category.l10n.es;
    category.label = pack.label;
    category.short = pack.short;
    category.description = pack.description;
    category.searchText = (pack.label + ' ' + pack.short + ' ' + pack.description).toLowerCase();
    return category;
  }

  function normalizeCategory(raw, index) {
    const id = String(raw && raw.id ? raw.id : 'cat-' + index).trim().toLowerCase();
    const label = text(raw && raw.label, id);
    const short = text(raw && raw.short, label);
    const description = text(raw && raw.description, '');

    const category = {
      id: id,
      color: normalizeHex(raw && raw.color, '#00eaff'),
      accent: normalizeHex(raw && raw.accent, raw && raw.color ? raw.color : '#6ff4ff'),
      icon: text(raw && raw.icon, '◆'),
      l10n: {
        es: { label: label, short: short, description: description },
        en: {
          label: text(raw && raw.label_en, label),
          short: text(raw && raw.short_en, short),
          description: text(raw && raw.description_en, description)
        }
      }
    };

    return applyCategoryLocale(category, locale());
  }

  /* ---------- obras ---------- */

  function hashSeed(value) {
    let hash = 2166136261;
    const str = String(value || 'seed');
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash) % 2147483647;
  }

  /** Vuelca al modelo los campos del idioma activo. */
  function applyArtworkLocale(artwork, target, category) {
    const pack = artwork.l10n[target] || artwork.l10n.es;
    artwork.title = pack.title;
    artwork.technique = pack.technique;
    artwork.materials = pack.materials;
    artwork.description = pack.description;
    artwork.story = pack.story;
    artwork.statusLabel = CYBER.Fmt.status(artwork.status);

    if (category) {
      artwork.categoryLabel = category.label;
      artwork.categoryShort = category.short;
      artwork.categoryDescription = category.description;
    }

    /* etiquetas visibles en el idioma activo (la clave interna no cambia) */
    artwork.tagLabels = artwork.tags.map(function (tag) {
      return CYBER.I18n ? CYBER.I18n.tagLabel(tag) : tag;
    });

    /* el buscador entiende los dos idiomas */
    artwork.searchText = [
      artwork.l10n.es.title, artwork.l10n.en.title,
      artwork.l10n.es.technique, artwork.l10n.en.technique,
      artwork.l10n.es.materials, artwork.l10n.en.materials,
      artwork.l10n.es.description, artwork.l10n.en.description,
      artwork.categoryLabel || '', artwork.categoryShort || '',
      artwork.size, artwork.year, artwork.statusLabel,
      artwork.tagLabels.join(' '), artwork.tags.join(' ')
    ].join(' ').toLowerCase();

    return artwork;
  }

  /* ---------- paleta: 8 colores, de oscuro a claro ---------- */

  /** Aclara (delta>0) u oscurece (delta<0) un color hex (mezcla con blanco/negro). */
  function shadeHex(hex, delta) {
    if (!CYBER.M || !CYBER.M.mixHex) return hex;
    if (delta > 0) return CYBER.M.mixHex(hex, '#ffffff', delta);
    if (delta < 0) return CYBER.M.mixHex(hex, '#000000', -delta);
    return hex;
  }

  /** Luminancia 0..1 de un color hex (para ordenar de oscuro a claro). */
  function luminanceOf(hex) {
    if (CYBER.M && CYBER.M.luminance) return CYBER.M.luminance(hex);
    const c = (CYBER.M && CYBER.M.hexToRgb) ? CYBER.M.hexToRgb(hex) : null;
    if (!c) return 0;
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }

  /** Devuelve una copia ordenada de más oscuro a más claro. */
  function sortDarkToLight(list) {
    return list.slice().sort(function (a, b) { return luminanceOf(a) - luminanceOf(b); });
  }

  /**
   * Construye una paleta de `target` (8) colores únicos derivados de los
   * colores del propio dibujo, ordenada de más oscuro a más claro.
   * - Si ya hay más colores que el objetivo, muestrea uniformemente para
   *   conservar el rango tonal.
   * - Si hay menos, genera tonos por mezcla y variación de luminosidad.
   * Idempotente: con exactamente `target` colores devuelve los mismos.
   */
  function expandPalette(list, target) {
    const goal = target || 8;
    const base = [];
    const seen = Object.create(null);
    (list || []).forEach(function (c) {
      const h = normalizeHex(c, null);
      if (h && !seen[h]) { seen[h] = true; base.push(h); }
    });
    if (!base.length) base.push('#0b0e16');

    const mix = (CYBER.M && CYBER.M.mixHex) ? CYBER.M.mixHex : function (a) { return a; };
    let colors;

    if (base.length > goal) {
      /* muestreo uniforme respetando el orden de luminosidad */
      const sorted = sortDarkToLight(base);
      colors = [];
      const step = (sorted.length - 1) / (goal - 1);
      for (let i = 0; i < goal; i++) colors.push(sorted[Math.round(i * step)]);
    } else {
      /* generar tonos derivados del dibujo hasta alcanzar el objetivo */
      const poolSeen = Object.create(null);
      const pool = [];
      base.forEach(function (c) { if (!poolSeen[c]) { poolSeen[c] = true; pool.push(c); } });
      const push = function (hex) {
        if (pool.length >= goal) return;
        const h = normalizeHex(hex, null);
        if (h && !poolSeen[h]) { poolSeen[h] = true; pool.push(h); }
      };

      /* mezclas entre colores consecutivos (recorrido circular) */
      [0.33, 0.5, 0.66].forEach(function (t) {
        for (let i = 0; i < base.length && pool.length < goal; i++) {
          push(mix(base[i], base[(i + 1) % base.length], t));
        }
      });
      /* variaciones de luminosidad de cada color base */
      [0.2, -0.2, 0.36, -0.36, 0.5, -0.5].forEach(function (d) {
        for (let i = 0; i < base.length && pool.length < goal; i++) {
          push(shadeHex(base[i], d));
        }
      });
      /* mezclas más cercanas a los extremos */
      [0.15, 0.85, 0.25, 0.75, 0.4, 0.6].forEach(function (t) {
        for (let i = 0; i < base.length && pool.length < goal; i++) {
          push(mix(base[i], base[(i + 1) % base.length], t));
        }
      });
      /* reserva: barrido fino de luminosidad */
      let k = 0;
      while (pool.length < goal && k < 600) {
        const delta = (((k % 11) - 5) / 10) || 0.1;
        push(shadeHex(base[k % base.length], delta));
        k++;
      }
      colors = pool;
    }

    /* dedupe + orden final oscuro→claro + longitud exacta */
    const outSeen = Object.create(null);
    const out = [];
    sortDarkToLight(colors).forEach(function (h) {
      if (!outSeen[h]) { outSeen[h] = true; out.push(h); }
    });
    let extra = 1;
    while (out.length < goal) {
      const seedColor = out[out.length - 1] || base[base.length - 1] || '#0b0e16';
      const candidate = normalizeHex(shadeHex(seedColor, 0.03 * extra), null);
      if (candidate && !outSeen[candidate]) { outSeen[candidate] = true; out.push(candidate); }
      extra++;
      if (extra > 200) break;
    }
    return sortDarkToLight(out).slice(0, goal);
  }

  function normalizeArtwork(raw, index, categoriesById) {
    const id = text(raw && raw.id, 'art-' + (index + 1));
    const categoryKey = String((raw && raw.category) || '').toLowerCase();
    const category = categoriesById[categoryKey]
      || categoriesById[Object.keys(categoriesById)[0]]
      || { id: 'sin-categoria', label: '—', short: '—', color: '#00eaff', accent: '#6ff4ff', icon: '◆', description: '' };

    const tags = toArray(raw && raw.tags).map(function (tag) { return tag.toLowerCase(); });
    let basePalette = toArray(raw && raw.palette)
      .map(function (hex) { return normalizeHex(hex, null); })
      .filter(Boolean);
    if (!basePalette.length) basePalette = ['#0b0e16', category.color, '#e8f3ff'];
    /* todas las obras muestran una paleta de 8 colores ordenada de oscuro a claro */
    const palette = expandPalette(basePalette, 8);

    const render = VALID_RENDERS.indexOf(String(raw && raw.render)) > -1 ? String(raw.render) : 'mixed';
    const status = VALID_STATUS.indexOf(String(raw && raw.status)) > -1 ? String(raw.status) : 'archivo';
    const minutes = Math.max(0, parseInt(raw && raw.minutes, 10) || 0);
    const year = parseInt(String((raw && raw.year) || '').match(/\d{4}/), 10) || new Date().getFullYear();

    const es = {
      title: text(raw && raw.title, '—'),
      technique: text(raw && raw.technique, '—'),
      materials: text(raw && raw.materials || raw && raw.support, '—'),
      description: text(raw && raw.description, ''),
      story: text(raw && raw.story, '')
    };
    const en = (raw && raw.en) || {};

    const artwork = {
      id: id,
      imageUrl: (raw && raw.imageUrl) || '',
      materialsImageUrl: (raw && (raw.materialsImageUrl || raw.materialsImage)) || '',
      gallery: (raw && raw.gallery) || '',
      holographic: !!(raw && raw.holographic),
      index: index + 1,
      code: CYBER.Fmt.code(id),
      category: category.id,
      color: category.color,
      accent: category.accent,
      icon: category.icon,
      year: year,
      size: text(raw && raw.size, '—'),
      paper: text(raw && raw.paper, ''),
      grammage: text(raw && raw.grammage, ''),
      brand: text(raw && raw.brand, ''),
      minutes: minutes,
      hours: CYBER.Fmt.hours(minutes),
      status: status,
      available: status === 'disponible',
      seed: parseInt(raw && raw.seed, 10) || hashSeed(id + '|' + es.title),
      render: render,
      featured: !!(raw && raw.featured),
      palette: palette,
      tags: tags,
      l10n: {
        es: es,
        en: {
          title: text(en.title, es.title),
          technique: text(en.technique, es.technique),
          materials: text(en.materials || en.support, es.materials),
          description: text(en.description, es.description),
          story: text(en.story, es.story)
        }
      }
    };

    return applyArtworkLocale(artwork, locale(), category);
  }

  /* ---------- configuración ---------- */

  function applyConfigLocale(config, target) {
    const pack = config.l10n[target] || config.l10n.es;
    config.tagline = pack.tagline;
    config.description = pack.description;
    config.bootLines = pack.bootLines;
    return config;
  }

  function normalizeConfig(raw) {
    const base = CYBER.FallbackData.config;
    const cfg = raw && typeof raw === 'object' ? raw : {};
    const site = Object.assign({}, base.site, cfg.site || {});
    const ui = Object.assign({}, base.ui, cfg.ui || {});

    const esLines = toArray(ui.bootLines).length ? toArray(ui.bootLines) : base.ui.bootLines;
    const enLines = toArray(ui.bootLines_en).length ? toArray(ui.bootLines_en) : esLines;

    return {
      site: site,
      graph: Object.assign({}, base.graph, cfg.graph || {}),
      ui: ui,
      links: Object.assign({}, base.links, cfg.links || {}),
      adminPasswordHash: String(cfg.adminPasswordHash || (base && base.adminPasswordHash) || '').trim(),
      adminPassword: String(cfg.adminPassword || (base && base.adminPassword) || '').trim(),
      l10n: {
        es: {
          tagline: text(site.tagline, base.site.tagline),
          description: text(site.description, ''),
          bootLines: esLines
        },
        en: {
          tagline: text(site.tagline_en, text(site.tagline, base.site.tagline)),
          description: text(site.description_en, text(site.description, '')),
          bootLines: enLines
        }
      }
    };
  }

  /* ---------- empaquetado ---------- */

  function packCategories(value) {
    if (Array.isArray(value) && value.length) return value;
    if (value && Array.isArray(value.categories) && value.categories.length) return value.categories;
    return CYBER.FallbackData.categories;
  }

  function packArtworks(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.artworks)) return value.artworks;
    return (CYBER.FallbackData && CYBER.FallbackData.artworks) || [];
  }

  function normalize(pack) {
    const config = normalizeConfig(pack.config);
    const target = locale();

    const categories = packCategories(pack.categories).map(normalizeCategory);
    const categoriesById = Object.create(null);
    categories.forEach(function (cat) { categoriesById[cat.id] = cat; });

    const artworks = packArtworks(pack.artworks).map(function (raw, index) {
      return normalizeArtwork(raw, index, categoriesById);
    });

    /* etiquetas traducibles */
    const tagMap = (pack.tags && pack.tags.tags) || pack.tags || (CYBER.FallbackData.tags || {});
    if (CYBER.I18n) CYBER.I18n.setTagLabels(tagMap);
    artworks.forEach(function (art) {
      applyArtworkLocale(art, target, categoriesById[art.category]);
    });

    applyConfigLocale(config, target);

    return {
      config: config,
      categories: categories,
      artworks: artworks,
      tags: tagMap,
      source: pack.source || 'desconocido'
    };
  }

  const DataService = {
    /** Carga todos los datos. Nunca rechaza: si algo falla usa el dataset embebido. */
    load() {
      const warnings = [];

      function attempt(key) {
        return fetchJSON(SOURCES[key]).catch(function (err) {
          warnings.push(key + ': ' + err.message);
          return null;
        });
      }

      return Promise.all([attempt('config'), attempt('categories'), attempt('artworks'), attempt('tags')])
        .then(function (results) {
          const fallback = CYBER.FallbackData;
          const useEmbedded = results.every(function (item) { return item === null; });

          const raw = {
            config: results[0] || fallback.config,
            categories: results[1] || fallback.categories,
            artworks: results[2] || fallback.artworks,
            tags: results[3] || fallback.tags
          };

          const normalized = normalize(Object.assign({}, raw, {
            source: useEmbedded ? 'embed' : (warnings.length ? 'mixto' : 'json')
          }));
          normalized.raw = raw;

          normalized.warnings = warnings;
          if (window.console && warnings.length) {
            console.info('[datos] dataset embebido como respaldo:', warnings.join(' · '));
          }
          return normalized;
        })
        .catch(function (err) {
          console.error('[datos] fallo inesperado, usando dataset embebido', err);
          const raw = {
            config: CYBER.FallbackData.config,
            categories: CYBER.FallbackData.categories,
            artworks: CYBER.FallbackData.artworks,
            tags: CYBER.FallbackData.tags
          };
          const normalized = normalize(Object.assign({}, raw, { source: 'embed' }));
          normalized.raw = raw;
          normalized.warnings = [String(err && err.message)];
          return normalized;
        });
    },

    /**
     * Reconstruye el dataset aplicando las obras creadas/editas/eliminadas
     * por el usuario (overrides) sobre los datos base.
     * @param {object} raw datos base (sin tocar)
     * @param {object} overrides {created:[], updated:{}, deleted:[]}
     */
    rebuild(raw, overrides) {
      const base = raw || {};
      const o = overrides || CYBER.UserData.empty();
      const deletedSet = Object.create(null);
      (o.deleted || []).forEach(function (id) { deletedSet[id] = true; });

      let list = packArtworks(base.artworks).filter(function (art) {
        return !deletedSet[art.id] && !(o.updated || {})[art.id];
      });
      list = list.concat(Object.keys(o.updated || {}).map(function (id) { return o.updated[id]; }));
      list = list.concat(o.created || []);

      const normalized = normalize({
        config: base.config,
        categories: base.categories,
        artworks: list,
        tags: base.tags,
        source: 'json'
      });
      normalized.raw = base;
      return normalized;
    },

    /** Reaplica el idioma a categorías, obras y configuración. */
    localize(data, target) {
      if (!data) return data;
      const next = target || locale();

      const categoriesById = Object.create(null);
      (data.categories || []).forEach(function (cat) {
        applyCategoryLocale(cat, next);
        categoriesById[cat.id] = cat;
      });

      (data.artworks || []).forEach(function (art) {
        applyArtworkLocale(art, next, categoriesById[art.category]);
      });

      if (data.config) applyConfigLocale(data.config, next);
      return data;
    },

    /** Líneas de arranque en el idioma pedido. */
    bootLines(config, target) {
      if (!config) return [];
      const pack = config.l10n && config.l10n[target || locale()];
      return (pack && pack.bootLines) || config.bootLines || [];
    },

    tagLabel(tag) {
      return CYBER.I18n ? CYBER.I18n.tagLabel(tag) : tag;
    },

    indexById(artworks) {
      const map = Object.create(null);
      artworks.forEach(function (art) { map[art.id] = art; });
      return map;
    },

    tagCloud(artworks) {
      const counts = Object.create(null);
      artworks.forEach(function (art) {
        art.tags.forEach(function (tag) { counts[tag] = (counts[tag] || 0) + 1; });
      });
      return Object.keys(counts)
        .map(function (tag) {
          return { tag: tag, label: DataService.tagLabel(tag), count: counts[tag] };
        })
        .sort(function (a, b) {
          return b.count - a.count || a.label.localeCompare(b.label, locale());
        });
    },

    totalHours(artworks) {
      return Math.round(artworks.reduce(function (sum, art) {
        return sum + (art.minutes || 0);
      }, 0) / 60 * 10) / 10;
    },

    countByCategory(artworks, categories) {
      const counts = Object.create(null);
      categories.forEach(function (cat) { counts[cat.id] = 0; });
      artworks.forEach(function (art) { counts[art.category] = (counts[art.category] || 0) + 1; });
      return counts;
    },

    hashSeed: hashSeed,

    parseMaterials(art) {
      if (!art) {
        return { paper: '—', grammage: '—', brand: '—', category: '—' };
      }
      let paper = String(art.paper || '').trim();
      let grammage = String(art.grammage || '').trim();
      let brand = String(art.brand || '').trim();
      let category = String(art.categoryLabel || art.category || '—').trim();
      if (category && category !== '—') {
        category = category.charAt(0).toUpperCase() + category.slice(1);
      }

      const rawPool = [art.materials, art.support, art.size].filter(Boolean).join(' ');

      if (!paper) {
        const presetMatch = rawPool.match(/(?:A[3-5]|B[4-6])(?:\s*·\s*[\d.x×\s]+cm)?/i);
        if (presetMatch) {
          paper = presetMatch[0].trim();
        } else if (art.support) {
          const cleanSupport = art.support.replace(/\b\d{2,3}\s*(?:g\/m²|g\/m2|gsm|g\b)/gi, '').replace(/\b(?:A[3-5]|B[4-6])\b/gi, '').trim();
          paper = cleanSupport || art.support;
        } else if (art.materials) {
          const matMatch = art.materials.match(/Papel\s+[\wáéíóúñ\s]+?(?=[,;]|\b\d+\s*g|$)/i);
          if (matMatch) {
            paper = matMatch[0].trim();
          } else if (art.size && art.size !== '—') {
            paper = art.size;
          } else {
            paper = '—';
          }
        } else if (art.size && art.size !== '—') {
          paper = art.size;
        } else {
          paper = '—';
        }
      }

      const measurementPattern = /\(\s*\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:mm|cm)\s*\)/i;
      const measurementMatch = [art.paper, art.support, art.materials].filter(Boolean).join(' ').match(measurementPattern);
      const measures = measurementMatch
        ? measurementMatch[0]
        : (art.size && art.size !== '—' ? String(art.size).trim() : '—');
      paper = paper.replace(measurementPattern, '').replace(/\s{2,}/g, ' ').trim();

      if (!grammage) {
        const gramMatch = rawPool.match(/\b\d{2,3}\s*(?:g\/m²|g\/m2|gsm|g\b)/i);
        if (gramMatch) {
          grammage = gramMatch[0].trim();
        } else {
          grammage = '—';
        }
      }

      if (!brand) {
        const brandMatch = rawPool.match(/\b(CANSON(?:\s+Serie\s+XL)?|STRATHMORE|FABRIANO|MOLESKINE|ARCHES|RHODIA|BRISTOL)\b/i);
        if (brandMatch) {
          brand = brandMatch[0].trim();
        } else {
          brand = '—';
        }
      }

      return {
        paper: paper || '—',
        measures: measures || '—',
        grammage: grammage || '—',
        brand: brand || '—',
        category: category || '—'
      };
    }
  };

  CYBER.DataService = DataService;
  CYBER.parseMaterials = DataService.parseMaterials;
})(window.CYBER = window.CYBER || {});
