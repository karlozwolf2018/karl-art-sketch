/* ============================================================
   ui/toolbar.js — Herramientas del lienzo (reemplaza al que faltaba)
   Expone: CYBER.Toolbar
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function Toolbar(rootId) {
    this.root = document.getElementById(rootId || 'toolbar-root');
    this.handlers = {};
    this.crt = true;
    this.physics = true;
    this.groupCount = 0;
  }

  /** Construye la barra de herramientas */
  Toolbar.prototype.build = function () {
    if (!this.root) return this;

    const self = this;

    this.root.innerHTML = '';

    // Botón: Ajustar
    const btnFit = dom.el('button', {
      class: 'toolbtn',
      type: 'button',
      text: 'F',
      title: t('ui.tools.fitTitle'),
      attrs: { 'aria-label': t('ui.tools.fit') },
      on: {
        click: function () { if (self.handlers.onFit) self.handlers.onFit(); }
      }
    }, [
      dom.el('svg', {
        viewBox: '0 0 24 24',
        width: '14',
        height: '14',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, [
        dom.el('path', { d: 'M4 6h16' }),
        dom.el('path', { d: 'M4 18h16' }),
        dom.el('circle', { cx: '12', cy: '12', r: '10' })
      ])
    ]);

    // Botón: Layout/Reorganizar
    const btnLayout = dom.el('button', {
      class: 'toolbtn',
      type: 'button',
      text: 'R',
      title: t('ui.tools.layoutTitle'),
      attrs: { 'aria-label': t('ui.tools.layout') },
      on: {
        click: function () { if (self.handlers.onLayout) self.handlers.onLayout(); }
      }
    }, [
      dom.el('svg', {
        viewBox: '0 0 24 24',
        width: '14',
        height: '14',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, [
        dom.el('path', { d: 'M6 9l6-6 6 6' }),
        dom.el('path', { d: 'M6 15l6 6 6-6' })
      ])
    ]);

    // Botón: Núcleo
    const btnCore = dom.el('button', {
      class: 'toolbtn',
      type: 'button',
      text: 'C',
      title: t('ui.tools.coreTitle'),
      attrs: { 'aria-label': t('ui.tools.core') },
      on: {
        click: function () { if (self.handlers.onCore) self.handlers.onCore(); }
      }
    }, [
      dom.el('svg', {
        viewBox: '0 0 24 24',
        width: '14',
        height: '14',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, [
        dom.el('circle', { cx: '12', cy: '12', r: '10' }),
        dom.el('circle', { cx: '12', cy: '10', r: '2' })
      ])
    ]);

    // Botón: Física
    const btnPhysics = dom.el('button', {
      class: 'toolbtn',
      type: 'button',
      text: 'P',
      title: t('ui.tools.physicsTitle'),
      attrs: { 'aria-label': t('ui.tools.physics') },
      on: {
        click: function () { if (self.handlers.onPhysics) self.handlers.onPhysics(); }
      }
    }, [
      dom.el('svg', {
        viewBox: '0 0 24 24',
        width: '14',
        height: '14',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, [
        dom.el('path', { d: 'M12 2a10 10 0 1 0 10 10' }),
        dom.el('circle', { cx: '12', cy: '10', r: '2' })
      ])
    ]);

    // Botón: CRT
    const btnCrt = dom.el('button', {
      class: 'toolbtn',
      type: 'button',
      text: 'T',
      title: t('ui.tools.crtTitle'),
      attrs: { 'aria-label': t('ui.tools.crt') },
      on: {
        click: function () { if (self.handlers.onCrt) self.handlers.onCrt(); }
      }
    }, [
      dom.el('svg', {
        viewBox: '0 0 24 24',
        width: '14',
        height: '14',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, [
        dom.el('rect', { x: '2', y: '3', width: '20', height: '14', rx: '2', ry: '2' }),
        dom.el('line', { x1: '2', y1: '19', x2: '22', y2: '19' }),
        dom.el('circle', { cx: '12', cy: '9', r: '2' })
      ])
    ]);

    // Botón: Exportar
    const btnExport = dom.el('button', {
      class: 'toolbtn',
      type: 'button',
      text: 'E',
      title: t('ui.tools.exportTitle'),
      attrs: { 'aria-label': t('ui.tools.export') },
      on: {
        click: function () { if (self.handlers.onExport) self.handlers.onExport(); }
      }
    }, [
      dom.el('svg', {
        viewBox: '0 0 24 24',
        width: '14',
        height: '14',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, [
        dom.el('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
        dom.el('polyline', { points: '7,10 12,15 17,10' }),
        dom.el('line', { x1: '12', y1: '15', x2: '12', y2: '3' })
      ])
    ]);

    // Contenedor de grupos
    this.groups = [];

    // Añadir botones al root
    this.root.appendChild(btnFit);
    this.root.appendChild(btnLayout);
    this.root.appendChild(btnCore);
    this.root.appendChild(btnPhysics);
    this.root.appendChild(btnCrt);
    this.root.appendChild(btnExport);

    return this;
  };

  /** Alterna el estado de física */
  Toolbar.prototype.setPhysics = function (on) {
    if (!this.root) return;
    this.physics = !!on;
    const btn = this.root.querySelector('.toolbtn');
    if (btn) btn.classList.toggle('is-on', this.physics);
  };

  /** Alterna el efecto CRT */
  Toolbar.prototype.setCrt = function (enabled) {
    if (!this.root) return;
    this.crt = !!enabled;
  };

  /** Establece el zoom actual */
  Toolbar.prototype.setZoom = function (zoom) {
    // Puede usarse para mostrar el zoom en un display si se añade
  };

  /** Manejadores de eventos */
  Toolbar.prototype.on = function (event, handler) {
    this.handlers[event] = handler;
    return this;
  };

  CYBER.Toolbar = Toolbar;
})(window.CYBER = window.CYBER || {});
