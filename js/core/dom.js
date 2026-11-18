/* ============================================================
   core/dom.js — utilidades de creación y consulta del DOM
   Expone: CYBER.dom
   ============================================================ */
(function (CYBER) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const HTML_NS = 'http://www.w3.org/1999/xhtml';

  function applyAttrs(node, attrs, ns) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (key) {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) return;

      if (key === 'class' || key === 'className') {
        node.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : value);
      } else if (key === 'text') {
        node.textContent = String(value);
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (prop) {
          if (prop.indexOf('--') === 0) node.style.setProperty(prop, value[prop]);
          else node.style[prop] = value[prop];
        });
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.keys(value).forEach(function (prop) { node.dataset[prop] = value[prop]; });
      } else if (key === 'on' && typeof value === 'object') {
        Object.keys(value).forEach(function (evt) { node.addEventListener(evt, value[evt]); });
      } else if (key === 'attrs' && typeof value === 'object') {
        Object.keys(value).forEach(function (attr) { node.setAttribute(attr, value[attr]); });
      } else if (key in node && key !== 'list' && ns === HTML_NS) {
        try { node[key] = value; } catch (err) { node.setAttribute(key, value); }
      } else {
        node.setAttribute(key, value);
      }
    });
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined) return;
    const list = Array.isArray(children) ? children : [children];
    list.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(String(child))
        : child);
    });
  }

  /** Crea un elemento HTML. */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    applyAttrs(node, attrs, HTML_NS);
    appendChildren(node, children);
    return node;
  }

  /** Crea un elemento SVG. */
  function svg(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    applyAttrs(node, attrs, SVG_NS);
    appendChildren(node, children);
    return node;
  }

  /** Fragmento de documento a partir de varios nodos. */
  function frag(children) {
    const f = document.createDocumentFragment();
    appendChildren(f, children);
    return f;
  }

  const dom = {
    el: el,
    svg: svg,
    frag: frag,
    SVG_NS: SVG_NS,

    qs(selector, scope) { return (scope || document).querySelector(selector); },
    qsa(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); },

    /** Delegación de eventos: on(root, 'click', '.sel', handler) */
    on(root, type, selector, handler, options) {
      function listener(evt) {
        if (typeof selector === 'function') { selector(evt); return; }
        const target = evt.target.closest ? evt.target.closest(selector) : null;
        if (target && root.contains(target)) handler(evt, target);
      }
      root.addEventListener(type, listener, options || false);
      return function off() { root.removeEventListener(type, listener, options || false); };
    },

    clear(node) {
      while (node && node.firstChild) node.removeChild(node.firstChild);
      return node;
    },

    show(node, visible) { if (node) node.hidden = !visible; },

    toggleClass(node, cls, active) {
      if (!node) return;
      if (active === undefined) node.classList.toggle(cls);
      else node.classList.toggle(cls, !!active);
    },

    setVar(node, name, value) {
      if (node && value !== undefined && value !== null) node.style.setProperty(name, String(value));
    },

    /** Texto seguro para inyección en plantillas HTML. */
    escape(text) {
      return String(text === null || text === undefined ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /** Resalta la coincidencia de búsqueda dentro de un texto. */
    highlight(text, query) {
      if (!text) return '';
      const q = String(query || '').trim();
      if (!q) return dom.escape(text);
      const needle = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(' + needle + ')', 'ig');
      const parts = String(text).split(regex);
      return parts.map(function (part) {
        if (!part) return '';
        return regex.test(part)
          ? '<mark class="hl">' + dom.escape(part) + '</mark>'
          : dom.escape(part);
      }).join('');
    },

    /**
     * Debounce: retrasa la ejecución hasta que pasa `wait` ms sin llamadas.
     */
    debounce(fn, wait) {
      let timer = null;
      return function debounced() {
        const args = arguments;
        const self = this;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(self, args); }, wait || 150);
      };
    },

    /** Throttle por ventana de tiempo (para pan/zoom). */
    throttle(fn, wait) {
      let last = 0;
      let timer = null;
      return function throttled() {
        const args = arguments;
        const self = this;
        const now = Date.now();
        const remaining = wait - (now - last);
        if (remaining <= 0) {
          last = now;
          fn.apply(self, args);
        } else if (!timer) {
          timer = setTimeout(function () {
            last = Date.now();
            timer = null;
            fn.apply(self, args);
          }, remaining);
        }
      };
    },

    /** mide un elemento */
    size(node) {
      const rect = node.getBoundingClientRect();
      return { w: rect.width, h: rect.height, left: rect.left, top: rect.top };
    },

    /** ¿el usuario pidió menos animación? */
    reducedMotion() {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    },

    /** ¿dispositivo táctil sin hover fino? */
    isTouch() {
      return !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
    },

    /** siguiente frame (promesa) */
    nextFrame() {
      return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
    }
  };

  CYBER.dom = dom;
})(window.CYBER = window.CYBER || {});
