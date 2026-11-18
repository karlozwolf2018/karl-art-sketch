/* ============================================================
   core/i18n.js — motor de idiomas (es / en)
   Expone: CYBER.I18n
   ------------------------------------------------------------
   · t('clave.anidada', { var: valor })  → texto traducido
   · applyDom()                          → traduce data-i18n del HTML
   · tagLabel('manos')                   → etiqueta traducida
   El idioma activo se emite por el bus con LOCALE_CHANGED.
   ============================================================ */
(function (CYBER) {
  'use strict';

  const FALLBACK = 'es';
  let current = FALLBACK;
  let tagLabels = Object.create(null);

  function dict(locale) {
    return (CYBER.Locales && CYBER.Locales[locale || current]) || null;
  }

  /** Busca una clave con notación de puntos dentro del diccionario. */
  function lookup(path, locale) {
    const source = dict(locale);
    if (!source || !path) return undefined;
    return String(path).split('.').reduce(function (acc, part) {
      if (acc === undefined || acc === null) return undefined;
      return acc[part];
    }, source);
  }

  /** Sustituye {{marcadores}} por sus valores. */
  function interpolate(text, vars) {
    if (!vars || typeof text !== 'string') return text;
    return text.replace(/\{\{(\w+)\}\}/g, function (match, name) {
      return vars[name] === undefined ? match : String(vars[name]);
    });
  }

  function eachMatch(scope, selector, fn) {
    if (scope.nodeType === 1 && scope.matches && scope.matches(selector)) fn(scope);
    Array.prototype.forEach.call(scope.querySelectorAll(selector), fn);
  }

  const I18n = {
    available: ['es'],
    fallback: FALLBACK,

    /** Idioma inicial (antes de crear la interfaz). */
    init(locale) {
      current = I18n.available.indexOf(locale) > -1 ? locale : FALLBACK;
      document.documentElement.lang = current;
      document.documentElement.dataset.locale = current;
      I18n.applyDom();
      return current;
    },

    locale() { return current; },

    dict(locale) { return dict(locale); },

    name(locale) {
      const d = dict(locale);
      return d ? d.meta.name : String(locale || current);
    },

    badge(locale) {
      const d = dict(locale);
      return d ? d.meta.badge : String(locale || current).toUpperCase();
    },

    /**
     * Cambia el idioma activo.
     * @param {string} locale 'es' | 'en'
     * @param {{silent?:boolean, force?:boolean}} [options]
     */
    set(locale, options) {
      const opts = options || {};
      const next = I18n.available.indexOf(locale) > -1 ? locale : FALLBACK;
      if (next === current && !opts.force) return current;

      current = next;
      document.documentElement.lang = current;
      document.documentElement.dataset.locale = current;
      I18n.applyDom();

      if (!opts.silent && CYBER.bus) {
        CYBER.bus.emit(CYBER.EVENTS.LOCALE_CHANGED, {
          locale: current,
          name: I18n.name(),
          badge: I18n.badge()
        });
      }
      return current;
    },

    /** Alterna entre los idiomas disponibles. */
    toggle() {
      const index = I18n.available.indexOf(current);
      return I18n.set(I18n.available[(index + 1) % I18n.available.length]);
    },

    /** Texto traducido (con respaldo en el idioma por defecto). */
    t(key, vars) {
      if (key === undefined || key === null) return '';
      let value = lookup(key, current);
      if (value === undefined) value = lookup(key, FALLBACK);
      if (value === undefined) return typeof key === 'string' ? key : '';
      if (typeof value !== 'string') return value;
      return interpolate(value, vars);
    },

    has(key) { return lookup(key, current) !== undefined; },

    /**
     * Traduce el DOM estático:
     *   data-i18n="clave"                 → textContent
     *   data-i18n-html="clave"            → innerHTML
     *   data-i18n-attr="title:clave,aria-label:clave2"
     */
    applyDom(root) {
      const scope = root || document;

      eachMatch(scope, '[data-i18n]', function (node) {
        const value = I18n.t(node.dataset.i18n);
        node.textContent = value;
        /* los títulos con efecto glitch leen su copia de data-text */
        if (node.hasAttribute('data-text')) node.setAttribute('data-text', value);
      });

      eachMatch(scope, '[data-i18n-html]', function (node) {
        node.innerHTML = I18n.t(node.dataset.i18nHtml);
      });

      eachMatch(scope, '[data-i18n-attr]', function (node) {
        node.dataset.i18nAttr.split(',').forEach(function (pair) {
          const parts = pair.split(':');
          const attr = (parts[0] || '').trim();
          const key = (parts[1] || '').trim();
          if (!attr || !key) return;
          node.setAttribute(attr, I18n.t(key));
        });
      });
    },

    /** Diccionario de etiquetas cargado desde data/tags.json. */
    setTagLabels(map) {
      tagLabels = map || Object.create(null);
    },

    /** Nombre visible de una etiqueta interna (clave neutra → idioma). */
    tagLabel(tag) {
      const key = String(tag === undefined || tag === null ? '' : tag);
      const entry = tagLabels[key] || tagLabels[key.toLowerCase()];
      if (!entry) return key;
      return entry[current] || entry[FALLBACK] || key;
    },

    /** Número formateado según el idioma activo. */
    number(value, options) {
      try {
        return new Intl.NumberFormat(I18n.t('formats.locale'), options).format(Number(value) || 0);
      } catch (err) {
        return String(value);
      }
    },

    /** Fecha larga según el idioma activo. */
    date(value, options) {
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return String(value || '');
      try {
        return date.toLocaleDateString(I18n.t('formats.locale'), options || { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (err) {
        return date.toDateString();
      }
    }
  };

  CYBER.I18n = I18n;
})(window.CYBER = window.CYBER || {});
