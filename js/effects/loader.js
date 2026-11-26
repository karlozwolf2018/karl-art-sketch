/* ============================================================
   effects/loader.js — loader de inicio y precarga de miniaturas
   Expone: CYBER.Loader.run({lines, waitFor}) / preloadImages(urls)
   ============================================================ */
(function (CYBER) {
  'use strict';

  const DEFAULT_LINES = [
    '> inicializando kernel visual .......... [ ok ]',
    '> montando interfaz de nodos ........... [ ok ]',
    '> sistema listo.'
  ];
  let progressValue = 0;

  function setProgress(ratio) {
    progressValue = Math.max(progressValue, Math.round(CYBER.M.clamp(ratio, 0, 1) * 100));
    const bar = document.getElementById('loader-bar');
    const progress = document.getElementById('loader-progress');
    const pct = document.getElementById('loader-pct');
    if (bar) bar.style.width = progressValue + '%';
    if (progress) progress.setAttribute('aria-valuenow', String(progressValue));
    if (pct) pct.textContent = progressValue + '%';
  }

  function run(options) {
    const opts = options || {};
    const root = document.getElementById('loader');
    const linesBox = document.getElementById('loader-lines');
    const skip = document.getElementById('loader-skip');
    const lines = (opts.lines && opts.lines.length ? opts.lines : DEFAULT_LINES).slice();

    if (!root || !linesBox) return Promise.resolve();

    let introComplete = false;
    let ready = !opts.waitFor;
    let dismissed = false;
    let index = 0;
    let resolveDone;
    const done = new Promise(function (resolve) { resolveDone = resolve; });

    progressValue = 0;
    root.classList.remove('is-done');
    root.setAttribute('aria-hidden', 'false');
    document.body.setAttribute('aria-busy', 'true');

    const stepDelay = opts.stepDelay === undefined ? 96 : Math.max(0, opts.stepDelay);
    const startTime = Date.now();
    const minDuration = opts.minDuration === undefined ? 900 : opts.minDuration;

    setProgress(0);

    function decorate(text) {
      const span = document.createElement('div');
      const cls = /\[ ok \]/.test(text) ? 'ok' : (/warn|aviso/i.test(text) ? 'warn' : 'dim');
      span.className = cls;
      span.textContent = text;
      return span;
    }

    function finishIntro() {
      if (introComplete) return;
      introComplete = true;
      const cursor = document.createElement('div');
      cursor.className = 'cursor';
      cursor.textContent = '█';
      linesBox.appendChild(cursor);
      if (skip) skip.hidden = true;
      maybeDismiss();
    }

    function maybeDismiss() {
      if (!introComplete || !ready || dismissed) return;
      dismissed = true;
      setProgress(1);
      const elapsed = Date.now() - startTime;
      const wait = Math.max(0, minDuration - elapsed) + 260;
      window.setTimeout(function () {
        root.classList.add('is-done');
        document.body.classList.remove('is-booting');
        document.body.setAttribute('aria-busy', 'false');
        window.setTimeout(function () {
          root.setAttribute('aria-hidden', 'true');
          document.removeEventListener('keydown', onKey);
          resolveDone();
        }, 600);
      }, wait);
    }

    function typeNext() {
      if (introComplete) return;
      if (index >= lines.length) {
        finishIntro();
        return;
      }

      linesBox.appendChild(decorate(lines[index]));
      linesBox.scrollTop = linesBox.scrollHeight;
      index += 1;
      setProgress(0.2 * index / lines.length);
      window.setTimeout(typeNext, stepDelay);
    }

    if (skip) {
      skip.addEventListener('click', function () {
        if (introComplete) return;
        lines.slice(index).forEach(function (line) { linesBox.appendChild(decorate(line)); });
        index = lines.length;
        finishIntro();
      }, { once: true });
    }

    /* accesibilidad: Escape también salta la intro */
    const onKey = function (evt) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        if (introComplete) return;
        lines.slice(index).forEach(function (line) { linesBox.appendChild(decorate(line)); });
        index = lines.length;
        finishIntro();
      }
    };
    document.addEventListener('keydown', onKey);

    if (opts.waitFor) {
      Promise.resolve(opts.waitFor).then(function () {
        ready = true;
        maybeDismiss();
      });
    }

    typeNext();
    return done;
  }

  function preloadImages(urls) {
    const uniqueUrls = Array.from(new Set((urls || []).filter(function (url) {
      return typeof url === 'string' && url.trim();
    })));
    const total = uniqueUrls.length;
    if (!total) {
      setProgress(0.9);
      return Promise.resolve({ loaded: 0, failed: 0 });
    }

    setProgress(0.2);
    return new Promise(function (resolve) {
      let completed = 0;
      let loaded = 0;
      let failed = 0;
      let settled = false;
      const entries = [];
      const timeout = window.setTimeout(function () {
        entries.forEach(function (entry) { complete(entry, false); });
      }, 12000);

      function complete(entry, success) {
        if (entry.done) return;
        entry.done = true;
        entry.image.onload = null;
        entry.image.onerror = null;
        completed += 1;
        if (success) loaded += 1;
        else failed += 1;
        setProgress(0.2 + 0.7 * completed / total);

        if (completed === total && !settled) {
          settled = true;
          window.clearTimeout(timeout);
          resolve({ loaded: loaded, failed: failed });
        }
      }

      uniqueUrls.forEach(function (url) {
        const image = new Image();
        const entry = { image: image, done: false };
        entries.push(entry);
        image.onload = function () { complete(entry, true); };
        image.onerror = function () { complete(entry, false); };
        image.src = url.trim();
        if (image.complete) {
          window.setTimeout(function () {
            complete(entry, image.naturalWidth > 0);
          }, 0);
        }
      });
    });
  }

  CYBER.Loader = { run: run, preloadImages: preloadImages };
})(window.CYBER = window.CYBER || {});
