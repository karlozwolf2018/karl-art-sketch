/* ============================================================
   effects/loader.js — arranque tipo terminal
   Expone: CYBER.Loader.run({lines}) → Promise
   ============================================================ */
(function (CYBER) {
  'use strict';

  const DEFAULT_LINES = [
    '> inicializando kernel visual .......... [ ok ]',
    '> montando interfaz de nodos ........... [ ok ]',
    '> sistema listo.'
  ];

  function run(options) {
    const opts = options || {};
    const root = document.getElementById('loader');
    const linesBox = document.getElementById('loader-lines');
    const bar = document.getElementById('loader-bar');
    const pct = document.getElementById('loader-pct');
    const skip = document.getElementById('loader-skip');
    const lines = (opts.lines && opts.lines.length ? opts.lines : DEFAULT_LINES).slice();

    if (!root || !linesBox) return Promise.resolve();

    let finished = false;
    let index = 0;
    let resolveDone;
    const done = new Promise(function (resolve) { resolveDone = resolve; });

    const stepDelay = opts.stepDelay || 96;
    const startTime = Date.now();
    const minDuration = opts.minDuration === undefined ? 900 : opts.minDuration;

    if (minDuration === 0) {
      root.classList.add('is-done');
      document.body.classList.remove('is-booting');
      root.setAttribute('aria-hidden', 'true');
      return Promise.resolve();
    }

    function setProgress(ratio) {
      const value = Math.round(CYBER.M.clamp(ratio, 0, 1) * 100);
      if (bar) bar.style.width = value + '%';
      if (pct) pct.textContent = value + '%';
    }

    function decorate(text) {
      const span = document.createElement('div');
      const cls = /\[ ok \]/.test(text) ? 'ok' : (/warn|aviso/i.test(text) ? 'warn' : 'dim');
      span.className = cls;
      span.textContent = text;
      return span;
    }

    function typeNext() {
      if (finished) return;
      if (index >= lines.length) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor';
        cursor.textContent = '█';
        linesBox.appendChild(cursor);
        setProgress(1);
        finish();
        return;
      }

      linesBox.appendChild(decorate(lines[index]));
      linesBox.scrollTop = linesBox.scrollHeight;
      index += 1;
      setProgress(index / lines.length);
      window.setTimeout(typeNext, stepDelay);
    }

    function finish() {
      if (finished) return;
      finished = true;
      const elapsed = Date.now() - startTime;
      const wait = Math.max(0, minDuration - elapsed) + 260;
      window.setTimeout(function () {
        root.classList.add('is-done');
        document.body.classList.remove('is-booting');
        window.setTimeout(function () { root.setAttribute('aria-hidden', 'true'); }, 600);
        resolveDone();
      }, wait);
    }

    if (skip) {
      skip.addEventListener('click', function () {
        finished = true;
        lines.slice(index).forEach(function (line) { linesBox.appendChild(decorate(line)); });
        setProgress(1);
        finish();
      }, { once: true });
    }

    /* accesibilidad: Escape también salta la intro */
    const onKey = function (evt) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        if (finished) return;
        finished = true;
        setProgress(1);
        finish();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);

    typeNext();
    return done;
  }

  CYBER.Loader = { run: run };
})(window.CYBER = window.CYBER || {});
