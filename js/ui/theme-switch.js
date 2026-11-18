/* ============================================================
   ui/theme-switch.js — conmutador de tema claro / oscuro
   Expone: CYBER.ThemeSwitch
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function ThemeSwitch(buttonId) {
    this.button = document.getElementById(buttonId || 'btn-theme');
    this.icon = this.button ? this.button.querySelector('.themeswitch__icon') : null;
    this.current = 'light';
  }

  ThemeSwitch.prototype.init = function (handlers) {
    const self = this;
    this.handlers = handlers || {};
    if (!this.button) return this;

    this.current = document.documentElement.dataset.theme || 'light';
    this.button.addEventListener('click', function () { self.toggle(); });

    this.refresh();
    return this;
  };

  ThemeSwitch.prototype.set = function (theme) {
    this.current = theme === 'light' ? 'light' : 'neon';
    document.documentElement.dataset.theme = this.current;
    this.refresh();
    return this.current;
  };

  ThemeSwitch.prototype.toggle = function () {
    const next = this.current === 'neon' ? 'light' : 'neon';
    this.set(next);
    CYBER.store.set('theme', next);

    bus.emit(CYBER.EVENTS.TOAST, {
      type: 'info',
      text: t(next === 'light' ? 'toasts.themeOn' : 'toasts.themeOff')
    });
    bus.emit(CYBER.EVENTS.THEME_CHANGED, { theme: next });

    if (this.handlers.onChange) this.handlers.onChange(next);
    return next;
  };

  ThemeSwitch.prototype.refresh = function () {
    if (!this.button) return;
    const light = this.current === 'light';
    this.button.setAttribute('data-theme', this.current);
    this.button.setAttribute('aria-pressed', light ? 'true' : 'false');
    this.button.setAttribute('aria-label', t(light ? 'meta.themeAriaLight' : 'meta.themeAria'));
    this.button.setAttribute('title', t('meta.themeTitle'));
    if (this.icon) this.icon.textContent = light ? '☀' : '🌙';
  };

  CYBER.ThemeSwitch = ThemeSwitch;
})(window.CYBER = window.CYBER || {});
