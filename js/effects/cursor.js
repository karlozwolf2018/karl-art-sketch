/* ============================================================
   effects/cursor.js — halo neón que sigue al puntero
   Expone: CYBER.CursorGlow
   ============================================================ */
(function (CYBER) {
  'use strict';

  function init() {
    const node = document.getElementById('cursor-glow');
    if (!node || CYBER.dom.isTouch() || CYBER.dom.reducedMotion()) {
      return { destroy: function () {} };
    }

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };
    let raf = null;
    let active = false;

    function onMove(evt) {
      target.x = evt.clientX;
      target.y = evt.clientY;
      if (!active) {
        active = true;
        document.body.classList.add('has-cursor');
        current.x = target.x;
        current.y = target.y;
      }
    }

    function loop() {
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      node.style.transform = 'translate3d(' + (current.x - 170) + 'px,' + (current.y - 170) + 'px,0)';
      raf = requestAnimationFrame(loop);
    }

    function onOver(evt) {
      const hot = evt.target.closest && evt.target.closest('.node, .card, button, a, .tag, input');
      node.classList.toggle('is-hot', !!hot);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    
    const onLeave = function () {
      active = false;
      document.body.classList.remove('has-cursor');
    };
    document.addEventListener('pointerleave', onLeave);

    raf = requestAnimationFrame(loop);

    return {
      destroy: function () {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerover', onOver);
        document.removeEventListener('pointerleave', onLeave);
        document.body.classList.remove('has-cursor');
      }
    };
  }

  CYBER.CursorGlow = { init: init };
})(window.CYBER = window.CYBER || {});
