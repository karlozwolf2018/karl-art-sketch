/* ============================================================
   ui/toolbar.js — Herramientas flotantes (Arrastrable/Desplegable)
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function Toolbar(rootId) {
    this.root = document.getElementById(rootId || 'toolbar');
    this.handlers = {};
    this.physics = true;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.wasDragged = false;
  }

  Toolbar.prototype.init = function (handlers) {
    if (!this.root) return this;
    this.handlers = handlers || {};
    this.build();
    this.enableDrag();
    return this;
  };

  Toolbar.prototype.setView = function (view) {
    if (!this.root) return this;
    this.root.hidden = view !== 'graph';
    return this;
  };

  Toolbar.prototype.flash = function () {
    if (!this.root) return this;
    this.root.classList.remove('is-flashing');
    void this.root.offsetWidth;
    this.root.classList.add('is-flashing');
    window.setTimeout(() => {
      this.root && this.root.classList.remove('is-flashing');
    }, 180);
    return this;
  };

  Toolbar.prototype.build = function () {
    if (!this.root) return this;
    const self = this;
    this.root.innerHTML = '';
    this.root.className = 'toolbar';

    // Botón principal
    const toggleBtn = dom.el('button', {
      class: 'toolbtn toolbtn--main',
      id: 'btn-toolbar-toggle',
      type: 'button',
      title: 'Herramientas (Arrastrar o Clic)'
    }, [dom.el('span', { text: '⚙' })]);

    toggleBtn.addEventListener('click', (evt) => {
      if (self.wasDragged) {
        self.wasDragged = false;
        return;
      }
      evt.stopPropagation();
      self.root.classList.toggle('is-expanded');
    });

    this.root.appendChild(toggleBtn);

    const buttons = [
      { id: 'btn-fit', icon: '⤢', title: t('ui.tools.fit') },
      { id: 'btn-layout', icon: '⟳', title: t('ui.tools.layout') },
      { id: 'btn-focus-core', icon: '◎', title: t('ui.tools.core') },
      { id: 'btn-physics', icon: '⚛', title: t('ui.tools.physics') },
      { id: 'btn-export', icon: '⤓', title: t('ui.tools.export') },
      { id: 'btn-fullscreen', icon: '⛶', title: t('ui.tools.fullscreen') }
    ];

    buttons.forEach((btn, index) => {
      // TODOS los botones se marcan como 'toolbtn--sub' para que se oculten inicialmente
      const el = dom.el('button', {
        class: 'toolbtn toolbtn--sub',
        id: btn.id,
        type: 'button',
        title: btn.title,
        on: { click: (evt) => {
          evt.stopPropagation();
          if (btn.id === 'btn-fit' && self.handlers.onFit) self.handlers.onFit();
          if (btn.id === 'btn-layout' && self.handlers.onLayout) self.handlers.onLayout();
          if (btn.id === 'btn-focus-core' && self.handlers.onCore) self.handlers.onCore();
          if (btn.id === 'btn-physics') {
            self.physics = !self.physics;
            self.setPhysics(self.physics);
            if (self.handlers.onPhysics) self.handlers.onPhysics(self.physics);
          }
          if (btn.id === 'btn-export' && self.handlers.onExport) self.handlers.onExport();
          if (btn.id === 'btn-fullscreen') {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
          }
        }}
      }, [dom.el('span', { text: btn.icon })]);
      
      // Todos los botones ahora se añaden después del botón de toggle, 
      // para que todos se desplieguen solo al hacer clic.
      this.root.appendChild(el);
    });
    return this;
  };

  Toolbar.prototype.enableDrag = function () {
    const self = this;
    const root = this.root;
    let startX = 0, startY = 0;

    const onPointerDown = (evt) => {
      if (evt.target.closest('.toolbtn--sub')) return;
      self.isDragging = true;
      self.wasDragged = false;
      startX = evt.clientX;
      startY = evt.clientY;
      const rect = root.getBoundingClientRect();
      self.dragOffset.x = evt.clientX - rect.left;
      self.dragOffset.y = evt.clientY - rect.top;
      root.style.transition = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (evt) => {
      if (!self.isDragging) return;
      const dx = evt.clientX - startX;
      const dy = evt.clientY - startY;
      if (Math.hypot(dx, dy) > 5) self.wasDragged = true;
      let x = evt.clientX - self.dragOffset.x;
      let y = evt.clientY - self.dragOffset.y;
      x = Math.max(10, Math.min(x, window.innerWidth - root.offsetWidth - 10));
      y = Math.max(10, Math.min(y, window.innerHeight - root.offsetHeight - 10));
      root.style.left = x + 'px';
      root.style.top = y + 'px';
      root.style.right = 'auto';
    };

    const onPointerUp = () => {
      self.isDragging = false;
      root.style.transition = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    root.addEventListener('pointerdown', onPointerDown);
  };

  Toolbar.prototype.setPhysics = function (on) {
    if (!this.root) return;
    this.physics = !!on;
    const btn = this.root.querySelector('#btn-physics');
    if (btn) btn.classList.toggle('is-on', this.physics);
  };

  Toolbar.prototype.setCrt = function () {};
  Toolbar.prototype.setZoom = function () {};
  Toolbar.prototype.on = function (event, handler) {
    this.handlers[event] = handler;
    return this;
  };

  CYBER.Toolbar = Toolbar;
})(window.CYBER = window.CYBER || {});
