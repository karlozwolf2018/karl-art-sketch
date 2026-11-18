/* ============================================================
   effects/particles.js — polvo luminoso en el fondo
   Expone: CYBER.Particles
   ============================================================ */
(function (CYBER) {
  'use strict';

  const M = CYBER.M;

  function mount(canvas, options) {
    if (!canvas) return { stop: function () {}, start: function () {} };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { stop: function () {}, start: function () {} };

    const opts = Object.assign({
      count: 90,
      colors: ['#00eaff', '#ff2e97', '#a15cff', '#7cff6b'],
      speed: 0.16,
      linkDistance: 0,
      streakChance: 0.004
    }, options || {});

    const reduced = CYBER.dom.reducedMotion();
    let particles = [];
    let streaks = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = null;
    let running = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      const rnd = M.rng(9137);
      const count = reduced ? Math.round(opts.count * 0.4)
        : Math.max(18, Math.round(opts.count * Math.min(1, width / 1440)));

      particles = new Array(count).fill(0).map(function () {
        return {
          x: rnd() * width,
          y: rnd() * height,
          vx: (rnd() - 0.5) * opts.speed * 2,
          vy: -opts.speed * (0.3 + rnd()),
          r: 0.5 + rnd() * 1.8,
          a: 0.15 + rnd() * 0.5,
          color: opts.colors[Math.floor(rnd() * opts.colors.length)],
          phase: rnd() * M.TAU
        };
      });
    }

    function spawnStreak(rnd) {
      streaks.push({
        x: rnd() * width,
        y: rnd() * height * 0.6,
        vx: 3 + rnd() * 5,
        vy: 1 + rnd() * 2,
        life: 1
      });
    }

    function frame(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const rnd = Math.random;

      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.02;

        if (p.y < -12) { p.y = height + 10; p.x = rnd() * width; }
        if (p.x < -12) p.x = width + 10;
        if (p.x > width + 12) p.x = -10;

        const twinkle = 0.65 + Math.sin(p.phase) * 0.35;
        ctx.globalAlpha = p.a * twinkle;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, M.TAU);
        ctx.fill();
      });

      ctx.shadowBlur = 0;

      if (!reduced && rnd() < opts.streakChance * 12) spawnStreak(rnd);

      streaks = streaks.filter(function (s) {
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.012;
        if (s.life <= 0 || s.x > width + 40) return false;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9);
        grad.addColorStop(0, 'rgba(255,255,255,' + (0.7 * s.life) + ')');
        grad.addColorStop(0.4, 'rgba(0,234,255,' + (0.35 * s.life) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9);
        ctx.stroke();
        return true;
      });

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    /* ajuste al redimensionar (con rebote) */
    let onResize = CYBER.dom.debounce(function () {
      resize();
    }, 180);
    window.addEventListener('resize', onResize);

    /* pausa cuando la pestaña no está visible */
    const onVisibilityChange = function () {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    resize();
    if (reduced) {
      /* un solo fotograma estático */
      running = true;
      frame(0);
      running = false;
    } else {
      start();
    }

    return {
      start: start,
      stop: stop,
      resize: resize,
      destroy: function () {
        stop();
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        onResize = null;
        onVisibilityChange = null;
      }
    };
  }

  CYBER.Particles = { mount: mount };
})(window.CYBER = window.CYBER || {});
