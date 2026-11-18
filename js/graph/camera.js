/* ============================================================
   graph/camera.js — paneo, zoom y encuadre del lienzo
   Expone: CYBER.Camera
   ============================================================ */
(function (CYBER) {
  'use strict';

  const M = CYBER.M;

  function Camera(options) {
    const opts = options || {};
    this.x = opts.x === undefined ? 0 : opts.x;
    this.y = opts.y === undefined ? 0 : opts.y;
    this.k = opts.k === undefined ? 1 : opts.k;
    this.minZoom = opts.minZoom || 0.26;
    this.maxZoom = opts.maxZoom || 2.6;
    this.animate = false;
  }

  /** Convierte coordenadas de pantalla (viewport) a coordenadas de mundo. */
  Camera.prototype.toWorld = function (screenX, screenY) {
    return {
      x: (screenX - this.x) / this.k,
      y: (screenY - this.y) / this.k
    };
  };

  /** Convierte coordenadas de mundo a pantalla. */
  Camera.prototype.toScreen = function (worldX, worldY) {
    return {
      x: worldX * this.k + this.x,
      y: worldY * this.k + this.y
    };
  };

  /** Desplaza la cámara en píxeles de pantalla. */
  Camera.prototype.translate = function (dx, dy) {
    this.animate = false;
    this.x += dx;
    this.y += dy;
    return this;
  };

  /** Fija el zoom manteniendo `point` (pantalla) bajo el cursor. */
  Camera.prototype.zoomAt = function (point, factor, animate) {
    const target = M.clamp(this.k * factor, this.minZoom, this.maxZoom);
    if (target === this.k) return this;
    const ratio = target / this.k;
    this.animate = !!animate;
    this.x = point.x - (point.x - this.x) * ratio;
    this.y = point.y - (point.y - this.y) * ratio;
    this.k = target;
    return this;
  };

  /** Coloca un punto del mundo en el centro del viewport. */
  Camera.prototype.centerOn = function (worldX, worldY, viewW, viewH, zoom, animate) {
    this.animate = animate !== false;
    if (zoom) this.k = M.clamp(zoom, this.minZoom, this.maxZoom);
    this.x = viewW / 2 - worldX * this.k;
    this.y = viewH / 2 - worldY * this.k;
    return this;
  };

  /**
   * Encuadra un conjunto de nodos dentro del viewport.
   * @param {Array} nodes nodos con x, y, radius
   * @param {number} viewW
   * @param {number} viewH
   * @param {number} padding
   */
  Camera.prototype.fit = function (nodes, viewW, viewH, padding) {
    if (!nodes || !nodes.length) return this;
    const pad = padding === undefined ? 120 : padding;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(function (node) {
      const r = (node.radius || 60) * 0.9;
      minX = Math.min(minX, node.x - r);
      minY = Math.min(minY, node.y - r);
      maxX = Math.max(maxX, node.x + r);
      maxY = Math.max(maxY, node.y + r);
    });

    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const scale = M.clamp(Math.min((viewW - pad * 2) / boxW, (viewH - pad * 2) / boxH), this.minZoom, this.maxZoom);

    this.animate = true;
    this.k = scale;
    this.x = viewW / 2 - ((minX + maxX) / 2) * scale;
    this.y = viewH / 2 - ((minY + maxY) / 2) * scale;
    return this;
  };

  /** Aplica la transformación a un elemento (con transición opcional). */
  Camera.prototype.applyTo = function (element, timing) {
    if (!element) return;
    element.style.transition = this.animate && timing !== null
      ? 'transform ' + (timing || 520) + 'ms cubic-bezier(.22,1,.36,1)'
      : 'none';
    element.style.transform = 'translate3d(' + Math.round(this.x * 100) / 100 + 'px,'
      + Math.round(this.y * 100) / 100 + 'px,0) scale(' + Math.round(this.k * 10000) / 10000 + ')';
  };

  /** Rectángulo visible en coordenadas de mundo (para el minimapa y el culling). */
  Camera.prototype.viewportRect = function (viewW, viewH) {
    const topLeft = this.toWorld(0, 0);
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: viewW / this.k,
      h: viewH / this.k
    };
  };

  CYBER.Camera = Camera;
})(window.CYBER = window.CYBER || {});
