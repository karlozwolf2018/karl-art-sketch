/* ============================================================
   effects/glitch.js — rotura digital ocasional en los títulos
   Expone: CYBER.Glitch
   ============================================================ */
(function (CYBER) {
  'use strict';

  let timer = null;

  /** Dispara el glitch de un elemento concreto. */
  function trigger(node, duration) {
    if (!node || CYBER.dom.reducedMotion()) return;
    node.classList.add('is-glitching');
    window.setTimeout(function () {
      node.classList.remove('is-glitching');
    }, duration || 460);
  }

  /**
   * Programa glitches aleatorios sobre cualquier .glitch del documento.
   * @param {{min?:number, max?:number}} options
   */
  function init(options) {
    const opts = Object.assign({ min: 4200, max: 11000 }, options || {});
    if (CYBER.dom.reducedMotion()) return { destroy: function () {} };

    function schedule() {
      const wait = opts.min + Math.random() * (opts.max - opts.min);
      timer = window.setTimeout(function () {
        const nodes = CYBER.dom.qsa('.glitch:not(.is-glitching)');
        if (nodes.length) {
          const visible = nodes.filter(function (n) { return n.offsetParent !== null; });
          const pick = (visible.length ? visible : nodes)[Math.floor(Math.random() * (visible.length || nodes.length))];
          trigger(pick);
        }
        schedule();
      }, wait);
    }

    schedule();

    /* los nodos y tarjetas también pueden glitchear al pasar el ratón */
    const onHover = function (evt) {
      const node = evt.target.closest && evt.target.closest('.glitch-hover');
      if (node && Math.random() < 0.5) trigger(node, 300);
    };
    document.addEventListener('mouseover', onHover, { passive: true });

    return {
      destroy: function () {
        if (timer) window.clearTimeout(timer);
        timer = null;
        document.removeEventListener('mouseover', onHover);
      }
    };
  }

  CYBER.Glitch = { init: init, trigger: trigger };
})(window.CYBER = window.CYBER || {});
