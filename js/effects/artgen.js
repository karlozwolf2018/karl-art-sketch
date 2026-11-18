/* ============================================================
   effects/artgen.js — generador procedural de bocetos
   ------------------------------------------------------------
   Cada obra se dibuja con canvas 2D a partir de su `seed`, su
   técnica (`render`) y sus etiquetas (`tags`), que eligen el tema.
   Expone: CYBER.ArtGen
   ============================================================ */
(function (CYBER) {
  'use strict';

  const M = CYBER.M;
  const cache = new Map();
  const imgCache = new Map();

  /* ---------- utilidades de trazado ---------- */

  /** Convierte una lista de puntos en una curva suave (Catmull-Rom → Bézier). */
  function smoothPath(ctx, points, closed) {
    if (!points || points.length < 2) return;
    const pts = points.slice();
    if (closed) pts.push(pts[0]);

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]
      );
    }
    if (closed) ctx.closePath();
  }

  /** Desplaza ligeramente los puntos para que el trazo no sea mecánico. */
  function jitter(points, rnd, amount) {
    return points.map(function (point) {
      return [
        point[0] + (rnd() - 0.5) * amount,
        point[1] + (rnd() - 0.5) * amount
      ];
    });
  }

  /** Puntos repartidos sobre un arco. */
  function arcPoints(cx, cy, rx, ry, from, to, steps) {
    const out = [];
    const total = steps || 24;
    for (let i = 0; i <= total; i += 1) {
      const t = from + (to - from) * (i / total);
      out.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
    }
    return out;
  }

  /** Rellena una franja con líneas paralelas (tramado). */
  function hatchLines(x, y, w, h, angle, spacing, rnd) {
    const lines = [];
    const diag = Math.hypot(w, h);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const stepX = -dirY;
    const stepY = dirX;
    const total = Math.ceil(diag / spacing);
    for (let i = -total; i <= total; i += 1) {
      const ox = x + w / 2 + stepX * i * spacing;
      const oy = y + h / 2 + stepY * i * spacing;
      const half = diag / 2 * (0.55 + rnd() * 0.45);
      lines.push([
        [ox - dirX * half, oy - dirY * half],
        [ox + dirX * half, oy + dirY * half]
      ]);
    }
    return lines;
  }

  /* ---------- utilidades de paleta ---------- */

  /** Extrae y normaliza los 4 colores de la paleta de la obra. */
  function resolvePalette(art) {
    const raw = Array.isArray(art && art.palette) ? art.palette : [];
    const valid = raw.filter(function (c) {
      return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
    });
    const fallbackColor = (art && art.color) || '#00eaff';
    if (valid.length === 0) {
      return ['#05070c', fallbackColor, fallbackColor, '#e8f3ff'];
    }
    return [
      valid[0],
      valid[1] || valid[0],
      valid[2] || valid[1] || valid[0],
      valid[3] || valid[2] || valid[0]
    ];
  }

  /* ---------- pinceles por técnica ---------- */

  /**
   * Crea el "pincel" que usará cada tema. La técnica define grosor,
   * desenfoque, opacidad y ruido del trazo.
   */
  function makeBrush(ctx, rnd, style, w, h, art) {
    const cfg = BRUSH_STYLES[style] || BRUSH_STYLES.mixed;
    const pal = resolvePalette(art);
    const primaryAccent = pal[1];
    const secondaryAccent = pal[2];

    function line(points, weight, alpha, color) {
      if (!points || points.length < 2) return;
      const pts = jitter(points, rnd, cfg.wobble);
      ctx.save();
      ctx.globalAlpha = alpha === undefined ? cfg.alpha : alpha;
      ctx.strokeStyle = color || cfg.color;
      ctx.lineWidth = Math.max(0.4, (weight || 1) * cfg.weight * w / 420);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (cfg.blur) {
        ctx.shadowColor = color || cfg.color;
        ctx.shadowBlur = cfg.blur * w / 420;
      }
      smoothPath(ctx, pts, false);
      ctx.stroke();
      /* pasada secundaria: da sensación de trazo repasado */
      if (cfg.redraw > 0 && rnd() < cfg.redraw) {
        ctx.globalAlpha = (alpha === undefined ? cfg.alpha : alpha) * 0.5;
        smoothPath(ctx, jitter(points, rnd, cfg.wobble * 1.8), false);
        ctx.stroke();
      }
      ctx.restore();
    }

    function shape(points, fill, alpha, blur) {
      ctx.save();
      ctx.globalAlpha = alpha === undefined ? cfg.fillAlpha : alpha;
      ctx.fillStyle = fill;
      if (blur || cfg.blur) {
        ctx.shadowColor = fill;
        ctx.shadowBlur = (blur || cfg.blur) * w / 420;
      }
      smoothPath(ctx, jitter(points, rnd, cfg.wobble * 0.6), true);
      ctx.fill();
      ctx.restore();
    }

    function mark(x, y, radius, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha === undefined ? 0.5 : alpha;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, M.TAU);
      ctx.fill();
      ctx.restore();
    }

    function hatch(x, y, ww, hh, angle, spacing, alpha) {
      const lines = hatchLines(x, y, ww, hh, angle, spacing, rnd);
      lines.forEach(function (pts) {
        const cx = x + ww / 2;
        const cy = y + hh / 2;
        const inside = pts.every(function (p) {
          return p[0] > x - 4 && p[0] < x + ww + 4 && p[1] > y - 4 && p[1] < y + hh + 4;
        });
        if (!inside && M.dist(cx, cy, (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2) > Math.hypot(ww, hh) * 0.6) return;
        line(pts, cfg.hatchWeight, alpha === undefined ? cfg.hatchAlpha : alpha);
      });
    }

    /** Borra para recuperar luces (carboncillo / mixta). */
    function erase(points, radius, strength) {
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = strength === undefined ? 0.8 : strength;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = radius;
      ctx.lineCap = 'round';
      smoothPath(ctx, points, false);
      ctx.stroke();
      ctx.restore();
    }

    /** Acento neón: siempre con glow, es la firma cyberpunk guiada por la paleta. */
    function accent(points, width, alpha, color) {
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha === undefined ? 0.85 : alpha;
      const acColor = color || (rnd() < 0.65 ? primaryAccent : secondaryAccent);
      ctx.strokeStyle = acColor;
      ctx.lineWidth = width || 1.6;
      ctx.shadowColor = acColor;
      ctx.shadowBlur = 14 * w / 620;
      ctx.lineCap = 'round';
      smoothPath(ctx, points, false);
      ctx.stroke();
      ctx.restore();
    }

    return {
      cfg: cfg,
      line: line,
      shape: shape,
      mark: mark,
      hatch: hatch,
      erase: erase,
      accent: accent,
      pal: pal,
      palette: pal,
      rnd: rnd,
      ctx: ctx,
      w: w,
      h: h,
      art: art
    };
  }

  const BRUSH_STYLES = {
    graphite: { color: '#b9c6d6', weight: 0.9, alpha: 0.5, blur: 0, wobble: 1.6, hatchWeight: 0.55, hatchAlpha: 0.32, fillAlpha: 0.25, redraw: 0.35 },
    charcoal: { color: '#0d1016', weight: 3.4, alpha: 0.72, blur: 6, wobble: 4.2, hatchWeight: 1.6, hatchAlpha: 0.4, fillAlpha: 0.55, redraw: 0.5 },
    ink: { color: '#0a0c12', weight: 1.2, alpha: 0.86, blur: 0, wobble: 1.1, hatchWeight: 0.5, hatchAlpha: 0.5, fillAlpha: 0.4, redraw: 0.6 },
    marker: { color: '#1a2740', weight: 7, alpha: 0.5, blur: 2, wobble: 3.4, hatchWeight: 3, hatchAlpha: 0.35, fillAlpha: 0.5, redraw: 0.2 },
    mixed: { color: '#dbe6f2', weight: 1.6, alpha: 0.6, blur: 3, wobble: 2.6, hatchWeight: 0.9, hatchAlpha: 0.36, fillAlpha: 0.45, redraw: 0.45 },
    digital: { color: '#8fa6c4', weight: 1.4, alpha: 0.55, blur: 4, wobble: 0.8, hatchWeight: 0.8, hatchAlpha: 0.28, fillAlpha: 0.4, redraw: 0.25 }
  };

  /* ---------- temas (composiciones) ---------- */

  const SUBJECTS = {
    /* Retrato / busto con fondo atmosférico */
    bust: function (b, rnd, w, h) {
      const cx = w * (0.44 + rnd() * 0.12);
      const cy = h * (0.46 + rnd() * 0.06);
      const rx = w * 0.16;
      const ry = h * 0.24;

      b.shape(hatchLines(0, h * 0.62, w, h * 0.4, 0.2, 9, rnd).map(function (l) { return l[0]; }), b.cfg.color, 0.12);

      /* cuello y hombros */
      b.shape([
        [cx - rx * 2.3, h * 1.02], [cx - rx * 1.5, cy + ry * 1.25],
        [cx - rx * 0.5, cy + ry * 1.05], [cx, cy + ry * 1.15],
        [cx + rx * 0.6, cy + ry * 1.0], [cx + rx * 1.6, cy + ry * 1.3],
        [cx + rx * 2.3, h * 1.02]
      ], b.cfg.color, 0.28);

      /* cabeza */
      const head = [];
      for (let i = 0; i <= 30; i += 1) {
        const t = (i / 30) * M.TAU;
        const squash = Math.sin(t) > 0 ? 1.06 : 0.94;
        head.push([cx + Math.cos(t) * rx * (1 + Math.sin(t * 2) * 0.05), cy + Math.sin(t) * ry * squash]);
      }
      b.shape(head, b.cfg.color, 0.22);
      b.line(head.concat([head[0]]), 1.4, 0.6);

      /* pelo */
      for (let i = 0; i < 26; i += 1) {
        const t = Math.PI * (1.05 + rnd() * 0.95);
        const start = [cx + Math.cos(t) * rx * 1.02, cy + Math.sin(t) * ry * 1.02];
        const end = [start[0] + (rnd() - 0.5) * rx * 1.5, start[1] + (rnd() - 0.2) * ry * 1.4];
        b.line([start, [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], end], 1.6, 0.42);
      }

      /* ojos, nariz, boca */
      const eyeY = cy - ry * 0.14;
      [-1, 1].forEach(function (side) {
        const ex = cx + side * rx * 0.42;
        b.line(arcPoints(ex, eyeY, rx * 0.22, ry * 0.07, Math.PI * 1.05, Math.PI * 1.95, 12), 1.3, 0.7);
        b.mark(ex, eyeY, rx * 0.11, '#04060c', 0.75);
        b.line(arcPoints(ex, eyeY - ry * 0.04, rx * 0.24, ry * 0.05, Math.PI * 1.1, Math.PI * 1.9, 10), 0.9, 0.45);
      });
      b.line([[cx + rx * 0.03, cy - ry * 0.02], [cx + rx * 0.1, cy + ry * 0.16], [cx - rx * 0.04, cy + ry * 0.2]], 1.2, 0.55);
      b.line(arcPoints(cx, cy + ry * 0.42, rx * 0.34, ry * 0.09, 0.1, Math.PI - 0.1, 14), 1.4, 0.6);

      /* sombra lateral + luz de contorno */
      b.hatch(cx - rx * 1.9, cy - ry * 0.9, rx * 1.4, ry * 1.9, 0.9, 7, 0.3);
      b.hatch(cx + rx * 0.6, cy - ry * 0.5, rx * 1.3, ry * 1.4, 1.2, 6, 0.26);
      b.accent([
        [cx - rx * 0.9, cy - ry * 0.75], [cx - rx * 1.1, cy], [cx - rx * 0.95, cy + ry * 0.8]
      ], 1.5, 0.7);
    },

    /* Ciudad nocturna con skyline y neones */
    city: function (b, rnd, w, h) {
      const horizon = h * (0.72 + rnd() * 0.1);
      b.line([[0, horizon], [w, horizon]], 1, 0.4);

      /* edificios en dos planos */
      let x = -20;
      while (x < w + 20) {
        const bw = w * (0.05 + rnd() * 0.1);
        const bh = h * (0.16 + rnd() * 0.42);
        const y = horizon - bh;
        b.shape([[x, horizon], [x, y], [x + bw, y], [x + bw, horizon]], b.cfg.color, 0.2 + rnd() * 0.18);
        b.line([[x, horizon], [x, y], [x + bw, y], [x + bw, horizon]], 1.2, 0.55);

        /* ventanas */
        const cols = Math.max(2, Math.round(bw / (w * 0.014)));
        const rows = Math.max(3, Math.round(bh / (h * 0.05)));
        for (let c = 0; c < cols; c += 1) {
          for (let r = 0; r < rows; r += 1) {
            if (rnd() < 0.42) continue;
            const wx = x + bw * (0.14 + (c / cols) * 0.72);
            const wy = y + bh * (0.08 + (r / rows) * 0.84);
            b.line([[wx, wy], [wx + bw * 0.05, wy]], 1.6, 0.3 + rnd() * 0.5,
              rnd() < 0.25 ? b.art.color : '#f2f7ff');
          }
        }
        /* antenas */
        if (rnd() < 0.5) b.line([[x + bw / 2, y], [x + bw / 2, y - h * (0.04 + rnd() * 0.08)]], 1, 0.45);
        x += bw + w * (0.004 + rnd() * 0.02);
      }

      /* calle mojada y reflejos */
      for (let i = 0; i < 22; i += 1) {
        const ry = horizon + rnd() * (h - horizon);
        const rw = w * (0.04 + rnd() * 0.22);
        b.accent([[w * rnd(), ry], [w * rnd(), ry + h * 0.01]], 1.2, 0.1 + rnd() * 0.22,
          rnd() < 0.4 ? '#00eaff' : b.art.color);
      }
      /* farolas / neones */
      for (let i = 0; i < 5; i += 1) {
        const lx = w * (0.08 + rnd() * 0.84);
        const ly = horizon - h * (0.02 + rnd() * 0.3);
        b.mark(lx, ly, w * (0.03 + rnd() * 0.05), rnd() < 0.5 ? '#ff2e97' : b.art.color, 0.4);
        b.accent([[lx, ly], [lx, ly + h * 0.14]], 1.6, 0.5);
      }
      /* niebla */
      for (let i = 0; i < 7; i += 1) {
        b.mark(w * rnd(), horizon - h * rnd() * 0.4, w * (0.12 + rnd() * 0.2), '#8fa6c4', 0.06);
      }
    },

    /* Manos / anatomía */
    hands: function (b, rnd, w, h) {
      const cx = w * 0.5;
      const cy = h * 0.55;
      const scale = Math.min(w, h) * 0.42;

      /* palma */
      const palm = [
        [cx - scale * 0.5, cy + scale * 0.28], [cx - scale * 0.56, cy - scale * 0.05],
        [cx - scale * 0.4, cy - scale * 0.3], [cx - scale * 0.05, cy - scale * 0.38],
        [cx + scale * 0.34, cy - scale * 0.3], [cx + scale * 0.5, cy - scale * 0.02],
        [cx + scale * 0.42, cy + scale * 0.3], [cx + scale * 0.05, cy + scale * 0.44]
      ];
      b.shape(palm, b.cfg.color, 0.18);
      b.line(palm.concat([palm[0]]), 1.3, 0.6);

      /* dedos como segmentos articulados */
      const baseAngle = -1.15;
      for (let f = 0; f < 4; f += 1) {
        const angle = baseAngle + f * 0.33 + (rnd() - 0.5) * 0.1;
        const len = scale * (0.62 - f * 0.07 + rnd() * 0.08);
        const rootX = cx - scale * 0.34 + f * scale * 0.22;
        const rootY = cy - scale * 0.34;
        const midX = rootX + Math.cos(angle) * len * 0.55;
        const midY = rootY + Math.sin(angle) * len * 0.55;
        const tipX = midX + Math.cos(angle + 0.42) * len * 0.5;
        const tipY = midY + Math.sin(angle + 0.42) * len * 0.5;
        b.line([[rootX, rootY], [midX, midY], [tipX, tipY]], 1.6, 0.62);
        b.line([[rootX, rootY + scale * 0.06], [midX + scale * 0.05, midY + scale * 0.02], [tipX, tipY + scale * 0.03]], 1, 0.36);
        b.line(arcPoints(midX, midY, scale * 0.05, scale * 0.04, 0, M.TAU, 12), 1, 0.3);
      }
      /* pulgar */
      const thumbRoot = [cx - scale * 0.5, cy + scale * 0.02];
      const thumbTip = [cx - scale * 0.95, cy - scale * 0.28];
      b.line([thumbRoot, [(thumbRoot[0] + thumbTip[0]) / 2, thumbRoot[1] + scale * 0.1], thumbTip], 1.7, 0.6);

      /* tendones y pliegues */
      for (let i = 0; i < 16; i += 1) {
        const sx = cx - scale * 0.4 + rnd() * scale * 0.8;
        const sy = cy - scale * 0.2 + rnd() * scale * 0.5;
        b.line([[sx, sy], [sx + (rnd() - 0.5) * scale * 0.3, sy + scale * (0.1 + rnd() * 0.2)]], 0.7, 0.3);
      }
      b.hatch(cx - scale * 0.9, cy - scale * 0.7, scale * 0.7, scale * 1.3, 1.1, 6, 0.3);
      b.accent([[cx - scale * 0.88, cy - scale * 0.2], [cx - scale * 0.6, cy + scale * 0.35], [cx - scale * 0.1, cy + scale * 0.5]], 1.4, 0.6);
    },

    /* Criatura orgánica / mecánica */
    creature: function (b, rnd, w, h) {
      const cx = w * 0.5;
      const cy = h * 0.56;
      const scale = Math.min(w, h) * 0.5;
      const lobes = 9 + Math.floor(rnd() * 5);

      const body = [];
      for (let i = 0; i <= 48; i += 1) {
        const t = (i / 48) * M.TAU;
        const wob = 1 + Math.sin(t * lobes) * 0.11 + Math.sin(t * 3 + 1) * 0.07;
        body.push([cx + Math.cos(t) * scale * 0.62 * wob, cy + Math.sin(t) * scale * 0.7 * wob]);
      }
      b.shape(body, b.cfg.color, 0.26);
      b.line(body.concat([body[0]]), 1.5, 0.66);

      /* interior: placas y tramado */
      for (let i = 0; i < 16; i += 1) {
        const t = rnd() * M.TAU;
        const r = scale * (0.1 + rnd() * 0.42);
        const px = cx + Math.cos(t) * r;
        const py = cy + Math.sin(t) * r * 1.1;
        b.line(arcPoints(px, py, scale * (0.05 + rnd() * 0.1), scale * (0.04 + rnd() * 0.08), rnd() * 3, rnd() * 3 + 2.6, 14), 1.1, 0.45);
      }
      b.hatch(cx - scale * 0.5, cy - scale * 0.1, scale * 1.0, scale * 0.7, 0.6, 7, 0.32);

      /* patas / tentáculos */
      const legs = 4 + Math.floor(rnd() * 4);
      for (let l = 0; l < legs; l += 1) {
        const t = M.TAU * (l / legs) + rnd() * 0.3;
        const rootX = cx + Math.cos(t) * scale * 0.5;
        const rootY = cy + Math.sin(t) * scale * 0.55;
        const len = scale * (0.4 + rnd() * 0.5);
        const a1 = t + (rnd() - 0.5) * 0.6;
        const a2 = a1 + (rnd() > 0.5 ? 1 : -1) * (0.8 + rnd() * 0.7);
        const j1 = [rootX + Math.cos(a1) * len * 0.5, rootY + Math.sin(a1) * len * 0.5];
        const j2 = [j1[0] + Math.cos(a2) * len * 0.5, j1[1] + Math.sin(a2) * len * 0.5];
        b.line([[rootX, rootY], j1, j2], 1.8, 0.6);
        b.line(arcPoints(...j1, scale * 0.05, scale * 0.05, 0, M.TAU, 12), 1, 0.35);
      }

      /* ojos */
      const eyes = 1 + Math.floor(rnd() * 3);
      for (let e = 0; e < eyes; e += 1) {
        const ex = cx + (rnd() - 0.5) * scale * 0.5;
        const ey = cy - scale * (0.1 + rnd() * 0.25);
        b.shape(arcPoints(ex, ey, scale * 0.11, scale * 0.075, 0, M.TAU, 18), '#04060c', 0.85);
        b.mark(ex, ey, scale * 0.2, b.art.color, 0.5);
        b.accent(arcPoints(ex, ey, scale * 0.12, scale * 0.08, 0, M.TAU, 18), 1.2, 0.8);
      }
    },

    /* Bodegón: tres volúmenes geométricos */
    still: function (b, rnd, w, h) {
      const base = h * 0.78;
      b.line([[w * 0.06, base], [w * 0.94, base]], 1.4, 0.5);
      b.hatch(w * 0.06, base, w * 0.88, h * 0.16, 0.08, 7, 0.22);

      /* esfera */
      const sx = w * 0.32;
      const sr = Math.min(w, h) * 0.15;
      b.shape(arcPoints(sx, base - sr, sr, sr, 0, M.TAU, 36), b.cfg.color, 0.2);
      b.line(arcPoints(sx, base - sr, sr, sr, 0, M.TAU, 36), 1.3, 0.6);
      b.line(arcPoints(sx, base - sr, sr * 0.82, sr * 0.82, Math.PI * 1.05, Math.PI * 1.75, 16), 1, 0.35);
      b.mark(sx + sr * 0.35, base - sr * 1.3, sr * 1.1, b.art.color, 0.28);

      /* cilindro */
      const cxr = w * 0.56;
      const cw = sr * 0.85;
      const ch = sr * 2.1;
      b.shape([
        [cxr - cw, base], [cxr - cw, base - ch], [cxr + cw, base - ch], [cxr + cw, base]
      ], b.cfg.color, 0.2);
      b.line(arcPoints(cxr, base - ch, cw, cw * 0.32, 0, M.TAU, 26), 1.3, 0.6);
      b.line([[cxr - cw, base], [cxr - cw, base - ch]], 1.3, 0.6);
      b.line([[cxr + cw, base], [cxr + cw, base - ch]], 1.3, 0.6);
      b.hatch(cxr + cw * 0.15, base - ch, cw * 0.9, ch, 1.4, 5, 0.34);

      /* cubo */
      const kx = w * 0.78;
      const ks = sr * 1.1;
      b.line([[kx - ks, base], [kx - ks, base - ks * 1.6], [kx + ks * 0.3, base - ks * 1.6], [kx + ks * 0.3, base]], 1.4, 0.6);
      b.line([[kx - ks, base - ks * 1.6], [kx - ks * 0.3, base - ks * 2], [kx + ks * 0.6, base - ks * 2], [kx + ks * 0.3, base - ks * 1.6]], 1.4, 0.6);
      b.line([[kx + ks * 0.3, base], [kx + ks * 0.6, base - ks * 0.4], [kx + ks * 0.6, base - ks * 2]], 1.4, 0.55);
      b.hatch(kx - ks, base - ks * 1.6, ks * 1.3, ks * 1.6, 0.85, 6, 0.3);

      /* sombras proyectadas */
      b.mark(sx + sr * 0.6, base + sr * 0.2, sr * 1.5, '#04060c', 0.4);
      b.mark(cxr + cw, base + sr * 0.2, cw * 1.6, '#04060c', 0.35);
      b.accent([[w * 0.1, base - h * 0.02], [w * 0.9, base - h * 0.02]], 1.2, 0.35);
    },

    /* Figura en movimiento */
    figure: function (b, rnd, w, h) {
      const cx = w * 0.5;
      const cy = h * 0.44;
      const scale = Math.min(w, h) * 0.42;

      /* cabeza */
      const headR = scale * 0.16;
      b.shape(arcPoints(cx + scale * 0.1, cy - scale * 0.62, headR, headR * 1.12, 0, M.TAU, 26), b.cfg.color, 0.22);
      b.line(arcPoints(cx + scale * 0.1, cy - scale * 0.62, headR, headR * 1.12, 0, M.TAU, 26), 1.3, 0.62);

      /* columna */
      const hip = [cx, cy + scale * 0.35];
      b.line([[cx + scale * 0.08, cy - scale * 0.44], [cx + scale * 0.02, cy - scale * 0.1], hip], 2, 0.66);

      /* brazos con arco de movimiento */
      for (let s = 0; s < 2; s += 1) {
        const dir = s ? 1 : -1;
        const a1 = -0.6 + dir * (0.5 + rnd() * 0.8);
        const a2 = a1 + dir * (0.6 + rnd() * 0.8);
        const sh = [cx + scale * 0.06, cy - scale * 0.36];
        const el = [sh[0] + Math.cos(a1) * scale * 0.42, sh[1] + Math.sin(a1) * scale * 0.42];
        const hd = [el[0] + Math.cos(a2) * scale * 0.36, el[1] + Math.sin(a2) * scale * 0.36];
        b.line([sh, el, hd], 1.9, 0.62);
        b.line(arcPoints(...hd, scale * 0.06, scale * 0.06, 0, M.TAU, 12), 1.2, 0.4);
      }

      /* piernas */
      for (let s = 0; s < 2; s += 1) {
        const dir = s ? 1 : -1;
        const k = [hip[0] + dir * scale * (0.2 + rnd() * 0.14), hip[1] + scale * 0.4];
        const f = [k[0] + dir * scale * (0.06 + rnd() * 0.2), hip[1] + scale * 0.86];
        b.line([hip, k, f], 2, 0.62);
      }

      /* estelas de movimiento */
      for (let i = 0; i < 10; i += 1) {
        const yy = cy - scale * 0.7 + rnd() * scale * 1.6;
        const xx = cx - scale * (0.5 + rnd() * 0.9);
        b.line([[xx, yy], [xx + scale * (0.2 + rnd() * 0.5), yy + (rnd() - 0.5) * scale * 0.1]], 1, 0.22);
      }
      /* suelo y sombra */
      b.line([[w * 0.1, h * 0.9], [w * 0.9, h * 0.88]], 1.2, 0.4);
      b.mark(cx, h * 0.9, scale * 0.7, '#04060c', 0.4);
      b.accent([
        [cx + scale * 0.1, cy - scale * 0.78], [cx + scale * 0.7, cy - scale * 0.4],
        [cx + scale * 0.9, cy + scale * 0.2]
      ], 1.4, 0.6);
    },

    /* Multitud: muchas figuras pequeñas */
    crowd: function (b, rnd, w, h) {
      b.hatch(0, h * 0.6, w, h * 0.42, 0.05, 6, 0.2);
      const rows = 5;
      for (let r = 0; r < rows; r += 1) {
        const depth = r / rows;
        const count = 9 + Math.round((1 - depth) * 12);
        for (let i = 0; i < count; i += 1) {
          const x = (w / count) * (i + 0.5) + (rnd() - 0.5) * w * 0.03;
          const scale = h * (0.06 + (1 - depth) * 0.14) * (0.8 + rnd() * 0.4);
          const y = h * (0.42 + depth * 0.42);
          const hr = scale * 0.14;
          b.shape(arcPoints(x, y - scale * 0.42, hr, hr * 1.1, 0, M.TAU, 14), b.cfg.color, 0.3);
          b.line([[x, y - scale * 0.28], [x, y + scale * 0.1]], 1.5, 0.6);
          b.line([[x - scale * 0.2, y + scale * 0.3], [x, y + scale * 0.1], [x + scale * 0.2, y + scale * 0.34]], 1.4, 0.55);
          b.line([[x - scale * 0.26, y - scale * 0.18], [x, y - scale * 0.24], [x + scale * 0.28, y - scale * 0.14]], 1.3, 0.5);
        }
      }
      for (let i = 0; i < 6; i += 1) {
        b.mark(w * rnd(), h * (0.1 + rnd() * 0.4), w * 0.08, b.art.color, 0.12);
      }
      b.accent([[w * 0.05, h * 0.86], [w * 0.5, h * 0.9], [w * 0.95, h * 0.87]], 1.4, 0.45);
    }
  };

  const TAG_TO_SUBJECT = {
    ciudad: 'city', arquitectura: 'city', nocturno: 'city', niebla: 'city', calle: 'city', mural: 'city',
    retrato: 'bust', autorretrato: 'bust', mascara: 'bust', 'máscara': 'bust', piel: 'bust', comico: 'bust', 'cómic': 'bust',
    manos: 'hands', anatomia: 'hands', 'anatomía': 'hands', estudio: 'hands',
    criatura: 'creature', mecanismo: 'creature', fantasia: 'creature', 'fantasía': 'creature', insecto: 'creature',
    bodegon: 'still', 'bodegón': 'still', volumen: 'still', comida: 'still',
    figura: 'figure', movimiento: 'figure', luz: 'figure', contraste: 'figure',
    multitud: 'crowd', textura: 'crowd', linea: 'crowd', 'línea': 'crowd'
  };

  /** Compara etiquetas ignorando acentos y mayúsculas. */
  function foldTag(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /* índice de TAG_TO_SUBJECT sin acentos, para que "anatomía" o "cómic" también casen */
  const FOLDED_SUBJECTS = (function () {
    const map = Object.create(null);
    Object.keys(TAG_TO_SUBJECT).forEach(function (key) {
      map[foldTag(key)] = TAG_TO_SUBJECT[key];
    });
    return map;
  })();

  /** Elige el tema a partir de las etiquetas y, si no hay pistas, del seed. */
  function chooseSubject(art) {
    if (!art) return 'bust';
    const scores = Object.create(null);
    (art.tags || []).forEach(function (tag) {
      if (!tag) return;
      const subject = TAG_TO_SUBJECT[tag] || FOLDED_SUBJECTS[foldTag(tag)] || TAG_TO_SUBJECT[foldTag(tag)];
      if (subject) scores[subject] = (scores[subject] || 0) + 1;
    });
    const sorted = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    const best = sorted[0];
    if (best) return best;
    const keys = Object.keys(SUBJECTS);
    const seed = Number.isFinite(art.seed) ? art.seed : 0;
    const selectedKey = keys[Math.abs(seed) % keys.length];
    return selectedKey || 'bust';
  }

  /* ---------- fondo y acabados ---------- */

  function paintBackground(ctx, art, w, h, rnd) {
    const pal = resolvePalette(art);
    const base = ctx.createLinearGradient(0, 0, w * 0.6, h);
    base.addColorStop(0, '#080b13');
    base.addColorStop(0.55, '#05070d');
    base.addColorStop(1, '#0a0d16');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    /* tinte ambiental base de la paleta */
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    /* mancha de color primario de la paleta */
    const glow = ctx.createRadialGradient(w * (0.3 + rnd() * 0.4), h * 0.35, 0, w * 0.5, h * 0.5, w * 0.75);
    glow.addColorStop(0, M.rgba(pal[1], 0.2));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    /* mancha secundaria de contorno con pal[2] */
    if (pal[2] && pal[2] !== pal[1]) {
      const glow2 = ctx.createRadialGradient(w * 0.8, h * 0.75, 0, w * 0.75, h * 0.7, w * 0.55);
      glow2.addColorStop(0, M.rgba(pal[2], 0.14));
      glow2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, w, h);
    }

    /* grano de papel */
    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < w * h / 220; i += 1) {
      ctx.fillStyle = rnd() < 0.5 ? '#ffffff' : '#8fa6c4';
      ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
    }
    ctx.restore();

    /* retícula técnica tenue con el tono de acento */
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = pal[1];
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += w / 14) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += h / 9) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  }

  function paintFinish(ctx, art, w, h, rnd, style, isImage) {
    const pal = resolvePalette(art);
    const frameColor = pal[1] || art.color || '#00eaff';
    const sigColor = pal[2] || pal[1] || art.color || '#00eaff';

    /* scanlines */
    ctx.save();
    ctx.globalAlpha = isImage ? 0.03 : 0.1;
    ctx.fillStyle = '#000';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.restore();

    /* viñeta */
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, isImage ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.66)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    /* marco de encuadre y marcas de esquina con color de paleta */
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = Math.max(1, w / 400);
    const pad = w * 0.028;
    const arm = w * 0.05;
    [[pad, pad, 1, 1], [w - pad, pad, -1, 1], [pad, h - pad, 1, -1], [w - pad, h - pad, -1, -1]]
      .forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0] + c[2] * arm, c[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(c[0], c[1] + c[3] * arm);
        ctx.stroke();
      });
    ctx.restore();

    /* firma: pequeña rúbrica procedural con color secundario */
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = Math.max(1, w / 520);
    ctx.beginPath();
    const sgx = w * 0.78;
    const sgy = h * 0.93;
    ctx.moveTo(sgx, sgy);
    for (let i = 0; i < 7; i += 1) {
      ctx.lineTo(sgx + i * w * 0.012, sgy - (rnd() - 0.5) * h * 0.035);
    }
    ctx.stroke();
    ctx.restore();

    /* acento digital: marquesina de selección */
    if (style === 'digital' && !isImage) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.1, h * 0.12, w * 0.8, h * 0.62);
      ctx.restore();
    }
  }

  /* ---------- API pública ---------- */

  function paint(canvas, art, options) {
    if (!canvas || !art) return null;
    const opts = options || {};
    const dpr = opts.dpr === undefined ? Math.min(window.devicePixelRatio || 1, 2) : opts.dpr;
    const cssW = opts.width || canvas.clientWidth || 320;
    const cssH = opts.height || canvas.clientHeight || Math.round(cssW * 0.625);

    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const rnd = M.rng(art.seed || 1);
    const style = BRUSH_STYLES[art.render] ? art.render : 'mixed';

    if (art.imageUrl) {
      function drawArtImage(img) {
        ctx.clearRect(0, 0, cssW, cssH);
        paintBackground(ctx, art, cssW, cssH, rnd);

        // Aspect contain centrado: NUNCA recortar la imagen (requisito de usuario)
        const nwOrig = img.naturalWidth || img.width || cssW;
        const nhOrig = img.naturalHeight || img.height || cssH;
        const scale = Math.min(cssW / nwOrig, cssH / nhOrig);
        const nw = nwOrig * scale;
        const nh = nhOrig * scale;
        const nx = (cssW - nw) / 2;
        const ny = (cssH - nh) / 2;

        // Halo ambiental de paleta para integrar la imagen con el lienzo
        const pal = resolvePalette(art);
        const ambColor = pal[1] || pal[0] || art.color || '#00eaff';
        const halo = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(nw, nh) * 0.2, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.65);
        halo.addColorStop(0, M.rgba(ambColor, 0.2));
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, cssW, cssH);

        ctx.save();
        ctx.drawImage(img, nx, ny, nw, nh);
        ctx.restore();

        // Borde cyberpunk discreto alrededor de la imagen contenida
        ctx.save();
        ctx.strokeStyle = M.rgba(ambColor, 0.28);
        ctx.lineWidth = 1;
        ctx.strokeRect(nx, ny, nw, nh);
        ctx.restore();

        paintFinish(ctx, art, cssW, cssH, rnd, style, true);
      }

      const cachedImg = imgCache.get(art.imageUrl);
      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        drawArtImage(cachedImg);
        return canvas;
      }

      // Mientras carga la imagen, pintar un fondo elegante
      paintBackground(ctx, art, cssW, cssH, rnd);

      const img = cachedImg || (typeof Image !== 'undefined' ? new Image() : null);
      if (!img) return canvas;
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        imgCache.set(art.imageUrl, img);
        drawArtImage(img);
      };
      img.onerror = function() {
        // Si la URL falla (ej. bloqueada o rota), pintar el tema procedural normal
        paintBackground(ctx, art, cssW, cssH, rnd);
        const brush = makeBrush(ctx, rnd, style, cssW, cssH, art);
        const subject = SUBJECTS[chooseSubject(art)] || SUBJECTS.bust;
        ctx.save();
        subject(brush, rnd, cssW, cssH, art);
        ctx.restore();
        paintFinish(ctx, art, cssW, cssH, rnd, style, false);
      };
      if (!cachedImg) {
        imgCache.set(art.imageUrl, img);
        img.src = art.imageUrl;
      }
      return canvas;
    }

    paintBackground(ctx, art, cssW, cssH, rnd);

    const brush = makeBrush(ctx, rnd, style, cssW, cssH, art);

    /* el tema lo deciden las etiquetas de la obra */
    const subject = SUBJECTS[chooseSubject(art)] || SUBJECTS.bust;
    ctx.save();
    subject(brush, rnd, cssW, cssH, art);
    ctx.restore();

    /* capa de técnica extra: cada material añade su textura propia */
    if (style === 'charcoal') {
      for (let i = 0; i < 12; i += 1) {
        brush.mark(rnd() * cssW, rnd() * cssH, cssW * (0.06 + rnd() * 0.14), '#0b0e14', 0.14);
      }
      brush.erase([[cssW * 0.2, cssH * 0.3], [cssW * 0.45, cssH * 0.22], [cssW * 0.7, cssH * 0.35]], cssW * 0.06, 0.5);
    } else if (style === 'marker') {
      const pal = resolvePalette(art);
      pal.slice(0, 4).forEach(function (hex, i) {
        const bx = cssW * (0.08 + i * 0.22);
        brush.shape([
          [bx, cssH * 0.82], [bx + cssW * 0.16, cssH * 0.78],
          [bx + cssW * 0.18, cssH * 0.95], [bx - cssW * 0.02, cssH * 0.97]
        ], hex, 0.35);
      });
    } else if (style === 'ink') {
      for (let i = 0; i < 3; i += 1) {
        brush.hatch(cssW * (0.1 + rnd() * 0.5), cssH * (0.15 + rnd() * 0.5),
          cssW * (0.12 + rnd() * 0.2), cssH * (0.1 + rnd() * 0.2), rnd() * 3, 4.5, 0.42);
      }
    } else if (style === 'graphite') {
      for (let i = 0; i < 5; i += 1) {
        brush.mark(cssW * rnd(), cssH * rnd(), cssW * (0.1 + rnd() * 0.18), '#c9d6e4', 0.06);
      }
    } else if (style === 'digital') {
      const pal = resolvePalette(art);
      const g = ctx.createLinearGradient(0, 0, cssW, cssH);
      g.addColorStop(0, M.rgba(pal[1], 0.22));
      g.addColorStop(0.6, M.rgba(pal[2], 0.12));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    }

    paintFinish(ctx, art, cssW, cssH, rnd, style, false);
    return canvas;
  }

  /** Data URL en caché (para miniaturas de la ficha y relacionados). */
  function dataURL(art, width, height) {
    const w = width || 320;
    const h = height || Math.round(w * 0.625);
    const key = art.id + '@' + w + 'x' + h;
    if (cache.has(key)) return cache.get(key);

    if (art.imageUrl) return art.imageUrl;

    const canvas = document.createElement('canvas');
    paint(canvas, art, { width: w, height: h, dpr: 1 });
    const url = canvas.toDataURL('image/png');
    cache.set(key, url);
    return url;
  }

  /** Imagen lista para insertar en el DOM. */
  function image(art, width, height, alt) {
    const img = document.createElement('img');
    img.src = dataURL(art, width, height);
    img.alt = alt || art.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function clearCache() {
    cache.clear();
    imgCache.clear();
  }

  CYBER.ArtGen = {
    paint: paint,
    dataURL: dataURL,
    image: image,
    clearCache: clearCache,
    chooseSubject: chooseSubject,
    styles: Object.keys(BRUSH_STYLES)
  };
})(window.CYBER = window.CYBER || {});
