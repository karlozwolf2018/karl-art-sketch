/* ============================================================
   utils/math.js — azar determinista, interpolación, geometría
   Expone: CYBER.M
   ============================================================ */
(function (CYBER) {
  'use strict';

  const TAU = Math.PI * 2;

  /** Generador pseudoaleatorio determinista (mulberry32). */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function random() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Reasigna `value` del rango [inMin,inMax] al rango [outMin,outMax]. */
  function map(value, inMin, inMax, outMin, outMax) {
    if (inMax - inMin === 0) return outMin;
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  /** Suaviza un valor hacia su objetivo (independiente de los FPS). */
  function approach(current, target, factor) {
    return current + (target - current) * clamp(factor, 0, 1);
  }

  /** Punto de una curva de Bézier cúbica. */
  function cubicPoint(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return (mt * mt * mt) * p0
      + 3 * (mt * mt) * t * p1
      + 3 * mt * (t * t) * p2
      + (t * t * t) * p3;
  }

  /** Etiqueta de color legible sobre un fondo dado. */
  function pointInRect(px, py, x, y, w, h) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }

  /** Mezcla dos colores hex (#rrggbb). */
  function mixHex(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    if (!ca || !cb) return a;
    const r = Math.round(lerp(ca.r, cb.r, t));
    const g = Math.round(lerp(ca.g, cb.g, t));
    const bl = Math.round(lerp(ca.b, cb.b, t));
    return '#' + [r, g, bl].map(function (v) {
      const s = clamp(v, 0, 255).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    let value = String(hex).replace('#', '').trim();
    if (value.length === 3) value = value.split('').map(function (c) { return c + c; }).join('');
    if (value.length !== 6) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    if (!c) return hex;
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  /** Luminancia relativa (0 = negro, 1 = blanco). */
  function luminance(hex) {
    const c = hexToRgb(hex);
    if (!c) return 0;
    const channel = function (v) {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  /** Grados a radianes. */
  function rad(deg) { return deg * Math.PI / 180; }

  /** Normaliza un ángulo a [0, TAU). */
  function normAngle(a) {
    let angle = a % TAU;
    if (angle < 0) angle += TAU;
    return angle;
  }

  CYBER.M = {
    TAU: TAU,
    rng: rng,
    clamp: clamp,
    lerp: lerp,
    map: map,
    dist: dist,
    dist2: dist2,
    approach: approach,
    cubicPoint: cubicPoint,
    pointInRect: pointInRect,
    mixHex: mixHex,
    hexToRgb: hexToRgb,
    rgba: rgba,
    luminance: luminance,
    rad: rad,
    normAngle: normAngle
  };
})(window.CYBER = window.CYBER || {});
