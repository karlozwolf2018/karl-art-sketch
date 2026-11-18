/* ============================================================
   graph/edges.js — capa SVG de aristas (curvas, flujo, resaltado)
   Expone: CYBER.EdgeLayer
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;

  /** Curva de Bézier con un ligero arco perpendicular entre dos nodos. */
  function pathData(a, b, bias) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;

    const startPad = (a.radius || 60) * 0.72;
    const endPad = (b.radius || 60) * 0.72;

    const x1 = a.x + ux * startPad;
    const y1 = a.y + uy * startPad;
    const x2 = b.x - ux * endPad;
    const y2 = b.y - uy * endPad;

    const span = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
    const offset = Math.min(70, span * 0.14) * (bias === undefined ? 1 : bias);

    const c1x = x1 + (x2 - x1) * 0.34 + nx * offset;
    const c1y = y1 + (y2 - y1) * 0.34 + ny * offset;
    const c2x = x1 + (x2 - x1) * 0.66 + nx * offset;
    const c2y = y1 + (y2 - y1) * 0.66 + ny * offset;

    return 'M' + x1.toFixed(1) + ',' + y1.toFixed(1)
      + 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1)
      + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1)
      + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);
  }

  function EdgeLayer(svg, options) {
    this.svg = svg;
    this.opts = Object.assign({ packets: true, maxPackets: 5 }, options || {});
    this.map = Object.create(null);
    this.defs = null;
    this.group = null;
    this.packets = [];
    this._biasSeed = 0;

    this.buildDefs();
  }

  EdgeLayer.prototype.buildDefs = function () {
    if (!this.svg) return;
    dom.clear(this.svg);

    const defs = dom.svg('defs');

    /* resplandor para aristas activas */
    const filter = dom.svg('filter', { id: 'edge-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' });
    filter.appendChild(dom.svg('feGaussianBlur', { stdDeviation: '3.2', result: 'blur' }));
    const merge = dom.svg('feMerge');
    merge.appendChild(dom.svg('feMergeNode', { in: 'blur' }));
    merge.appendChild(dom.svg('feMergeNode', { in: 'SourceGraphic' }));
    filter.appendChild(merge);
    defs.appendChild(filter);

    /* rejilla de puntos para el fondo de las aristas */
    const pattern = dom.svg('pattern', { id: 'edge-dots', width: '28', height: '28', patternUnits: 'userSpaceOnUse' });
    pattern.appendChild(dom.svg('circle', { cx: '1', cy: '1', r: '1', fill: 'rgba(0,234,255,.10)' }));
    defs.appendChild(pattern);

    this.defs = defs;
    this.group = dom.svg('g', { class: 'edges' });
    this.svg.appendChild(defs);
    this.svg.appendChild(dom.svg('rect', {
      x: '-4500', y: '-3500', width: '9000', height: '7000', fill: 'url(#edge-dots)', opacity: '.28'
    }));
    this.svg.appendChild(this.group);
  };

  /** Reconstruye todas las aristas. */
  EdgeLayer.prototype.setEdges = function (edges, nodes) {
    if (!this.group) return;
    dom.clear(this.group);
    this.map = Object.create(null);
    this.packets = [];

    const byId = Object.create(null);
    (nodes || []).forEach(function (node) { byId[node.id] = node; });

    const self = this;
    const colors = Object.create(null);
    edges.forEach(function (edge) {
      colors[edge.color] = (colors[edge.color] || 0) + 1;
    });

    /* limpia gradientes previos: setEdges puede llamarse al reconstruir el grafo */
    dom.qsa('linearGradient', this.defs).forEach(function (old) { old.remove(); });

    /* un gradiente por color de técnica: del núcleo al color */
    Object.keys(colors).forEach(function (color, index) {
      const key = 'grad-' + index;
      const grad = dom.svg('linearGradient', {
        id: key, x1: '0', y1: '0', x2: '1', y2: '1',
        gradientUnits: 'objectBoundingBox'
      });
      grad.appendChild(dom.svg('stop', { offset: '0%', 'stop-color': '#00eaff', 'stop-opacity': '.18' }));
      grad.appendChild(dom.svg('stop', { offset: '55%', 'stop-color': color, 'stop-opacity': '.55' }));
      grad.appendChild(dom.svg('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '.9' }));
      self.defs.appendChild(grad);
      colors[color] = key;
    });

    edges.forEach(function (edge, i) {
      const path = dom.svg('path', {
        class: 'edge edge--' + (edge.type === 'tag' ? 'tag' : (edge.type === 'core' ? 'core' : 'cat')),
        'data-edge': edge.id,
        'data-source': edge.source,
        'data-target': edge.target,
        stroke: edge.type === 'core' ? 'url(#' + colors[edge.color] + ')' : edge.color,
        d: 'M0,0'
      });
      path.style.animationDelay = (-(i % 12) * 0.17) + 's';

      self.group.appendChild(path);
      self.map[edge.id] = { edge: edge, path: path, index: i };
    });
  };

  /** Recalcula la geometría de todas las aristas. */
  EdgeLayer.prototype.render = function (nodesById, time) {
    const self = this;
    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      const a = nodesById[item.edge.source];
      const b = nodesById[item.edge.target];
      if (!a || !b) return;
      const bias = item.edge.type === 'tag' ? (item.index % 2 ? -1 : 1) : 1;
      item.path.setAttribute('d', pathData(a, b, bias));
    });

    if (this.opts.packets && this.packets.length) {
      const t = (time || 0) / 1000;
      this.packets.forEach(function (packet) {
        const item = self.map[packet.edgeId];
        if (!item || !item.path || !item.path.getTotalLength || item.path.style.display === 'none') return;
        try {
          const total = item.path.getTotalLength();
          if (!total) return;
          const progress = ((t * packet.speed + packet.offset) % 1);
          const point = item.path.getPointAtLength(total * progress);
          packet.el.setAttribute('cx', point.x.toFixed(1));
          packet.el.setAttribute('cy', point.y.toFixed(1));
        } catch (err) {
          /* ignorado si el elemento SVG no está renderizado */
        }
      });
    }
  };

  /** Marca qué aristas muestran paquetes de datos en movimiento. */
  EdgeLayer.prototype.setPackets = function (edgeIds) {
    if (!this.group) return;
    this.packets.forEach(function (packet) { packet.el.remove(); });
    this.packets = [];
    if (!this.opts.packets) return;

    const limit = Math.min(this.opts.maxPackets, edgeIds.length);
    const self = this;
    for (let i = 0; i < limit; i += 1) {
      const edgeId = edgeIds[i];
      const circle = dom.svg('circle', { class: 'edge__packet', r: '2.6', cx: '-9999', cy: '-9999' });
      circle.style.fill = (self.map[edgeId] && self.map[edgeId].edge.color) || '#fff';
      this.group.appendChild(circle);
      this.packets.push({ edgeId: edgeId, el: circle, speed: 0.22 + (i % 3) * 0.06, offset: i * 0.21 });
    }
  };

  /**
   * Aplica el estado visual: foco, relaciones y elementos filtrados.
   * @param {{focusId?:string, relatedIds?:string[], visibleIds?:Object, edgeHot?:Object}} state
   */
  EdgeLayer.prototype.setState = function (state) {
    const self = this;
    const related = state.relatedIds || [];
    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      const el = item.path;
      const touchesFocus = state.focusId && (item.edge.source === state.focusId || item.edge.target === state.focusId);
      const touchesRelated = related.length && (related.indexOf(item.edge.source) > -1 || related.indexOf(item.edge.target) > -1);

      el.classList.toggle('is-hot', !!touchesFocus);
      el.classList.toggle('is-flow', !!touchesFocus);
      el.classList.toggle('is-dim', !!state.focusId && !touchesFocus && !touchesRelated);
    });
  };

  /** Oculta aristas cuyos extremos no están visibles por los filtros. */
  EdgeLayer.prototype.applyVisibility = function (visibleIds) {
    const self = this;
    Object.keys(this.map).forEach(function (id) {
      const item = self.map[id];
      const visible = (!visibleIds || (visibleIds[item.edge.source] && visibleIds[item.edge.target]));
      item.path.style.display = visible ? '' : 'none';
    });
  };

  CYBER.EdgeLayer = EdgeLayer;
  CYBER.EdgeLayer.pathData = pathData;
})(window.CYBER = window.CYBER || {});
