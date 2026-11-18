/* ============================================================
   ui/toast.js — avisos flotantes
   Expone: CYBER.Toast
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;

  const ICONS = {
    info: '›',
    ok: '✓',
    warn: '!',
    error: '×',
    magenta: '◆'
  };

  const Toast = {
    root: null,
    max: 4,

    init() {
      this.root = document.getElementById('toast-root');
      const self = this;
      CYBER.bus.on(CYBER.EVENTS.TOAST, function (payload) {
        if (!payload) return;
        self.show(payload.text || payload.message, payload.type, payload);
      });
      return this;
    },

    /**
     * Muestra un aviso.
     * @param {string} text admite <b> y <em>
     * @param {string} [type] info|ok|warn|error|magenta
     */
    show(text, type, options) {
      if (!this.root || !text) return null;
      const opts = options || {};
      const kind = ICONS[type] ? type : 'info';

      /* límite de avisos simultáneos */
      while (this.root.children.length >= this.max) {
        this.root.removeChild(this.root.firstElementChild);
      }

      const node = dom.el('div', { class: 'toast toast--' + kind, attrs: { role: 'status' } }, [
        dom.el('span', { class: 'toast__icon', text: ICONS[kind] }),
        dom.el('span', { class: 'toast__text', html: text }),
        dom.el('span', { class: 'toast__bar' })
      ]);

      this.root.appendChild(node);

      const life = opts.duration || 3200;
      const remove = function () {
        if (!node.parentNode) return;
        node.classList.add('is-out');
        window.setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 320);
      };

      node.addEventListener('click', remove);
      window.setTimeout(remove, life);
      return node;
    },

    ok(text) { return this.show(text, 'ok'); },
    warn(text) { return this.show(text, 'warn'); },
    error(text) { return this.show(text, 'error'); }
  };

  CYBER.Toast = Toast;
})(window.CYBER = window.CYBER || {});
