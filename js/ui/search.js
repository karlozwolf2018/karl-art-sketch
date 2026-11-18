/* ============================================================
   ui/search.js — caja de búsqueda global
   Expone: CYBER.Search
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;

  function Search() {
    this.input = document.getElementById('search-input');
    this.box = this.input ? this.input.closest('.searchbox') : null;
    this.clearBtn = document.getElementById('search-clear');
    this.count = document.getElementById('search-count');
    this.handlers = {};
  }

  /**
   * @param {{onChange:Function, onSubmit:Function, onClear:Function}} handlers
   */
  Search.prototype.init = function (handlers) {
    this.handlers = handlers || {};
    const self = this;
    if (!this.input) return this;

    const pushChange = dom.debounce(function () {
      const value = self.input.value.trim();
      self.box.classList.toggle('has-value', value.length > 0);
      self.box.classList.toggle('has-query', value.length > 1);
      if (self.handlers.onChange) self.handlers.onChange(value);
    }, 180);

    this.input.addEventListener('input', pushChange);

    this.input.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        if (self.handlers.onSubmit) self.handlers.onSubmit(self.input.value.trim());
      } else if (evt.key === 'Escape') {
        evt.preventDefault();
        self.clear();
      }
    });

    /* en móvil, el icono abre la caja completa */
    if (this.box && dom.isTouch()) {
      this.box.addEventListener('click', function (evt) {
        if (!self.box.classList.contains('is-open') && evt.target.closest('.searchbox__icon')) {
          self.box.classList.add('is-open');
          self.input.focus();
        }
      });
      document.addEventListener('click', function (evt) {
        if (!self.box.contains(evt.target)) self.box.classList.remove('is-open');
      });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', function () { self.clear(); });
    }

    return this;
  };

  Search.prototype.clear = function () {
    if (!this.input) return;
    this.input.value = '';
    this.box.classList.remove('has-value', 'has-query');
    if (this.handlers.onClear) this.handlers.onClear();
  };

  Search.prototype.focus = function () {
    if (!this.input) return;
    if (this.box && !this.box.classList.contains('is-open') && dom.isTouch()) {
      this.box.classList.add('is-open');
    }
    this.input.focus();
    this.input.select();
  };

  Search.prototype.setCount = function (visible, total) {
    if (!this.count) return;
    const query = this.input ? this.input.value.trim() : '';
    const t = function (key, vars) { return CYBER.I18n ? CYBER.I18n.t(key, vars) : key; };
    this.count.textContent = query ? t('ui.search.count', { visible: visible, total: total }) : '';
  };

  CYBER.Search = Search;
})(window.CYBER = window.CYBER || {});
