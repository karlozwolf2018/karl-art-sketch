/* ============================================================
   graph/layout.js — colocación inicial + simulación de fuerzas
   Expone: CYBER.Layout.create(nodes, edges, config)
   ============================================================ */
(function (CYBER) {
  'use strict';

  const M = CYBER.M;
  const TAU = M.TAU;

  /**
   * Coloca nodos en un layout de "Cúmulos":
   * Archivo en el centro, Hubs en un anillo interno, Cartas agrupadas cerca de sus Hubs.
   */
  function place(nodes, cfg, layoutScale) {
    const core = nodes.find(n => n.type === 'core');
    const hubs = nodes.filter(n => n.type === 'hub');
    const arts = nodes.filter(n => n.type === 'art');
    const matNodes = nodes.filter(n => n.type === 'material');

    const hubRadius = cfg.hubRadius || 170;
    const artSpread = cfg.artSpread || 85;
    const scaleX = layoutScale ? layoutScale.x : 1;
    const scaleY = layoutScale ? layoutScale.y : 1;

    if (core) { core.x = 0; core.y = 0; core.vx = 0; core.vy = 0; }

    // Posicionar Hubs en círculo
    hubs.forEach((hub, index) => {
      const angle = (index / hubs.length) * TAU - Math.PI / 2;
      hub.x = Math.cos(angle) * hubRadius * scaleX;
      hub.y = Math.sin(angle) * hubRadius * scaleY;
      hub.fixed = false;
    });

    // Posicionar Obras cerca de su Hub
    const byHub = {};
    arts.forEach(art => {
      const key = CYBER.GraphModel.hubId(art.category);
      if (!byHub[key]) byHub[key] = [];
      byHub[key].push(art);
    });

    Object.keys(byHub).forEach(key => {
      const hub = nodes.find(n => n.id === key);
      if (!hub) return;
      const list = byHub[key];
      
      list.forEach((art, index) => {
        const angle = index * 2.399963229728653;
        const radius = Math.sqrt((index + 0.5) / list.length) * artSpread;
        art.x = hub.x + Math.cos(angle) * radius * scaleX;
        art.y = hub.y + Math.sin(angle) * radius * scaleY;
      });
    });

    // Materiales muy cerca de su carta padre
    matNodes.forEach(mat => {
      const parentId = mat.id.split(':')[1];
      const parent = nodes.find(n => n.id === parentId);
      if (parent) {
        mat.x = parent.x + 80; // offset pequeño
        mat.y = parent.y + 80;
      }
    });
  }

  /** Reinicia las posiciones con un desorden controlado (botón LAYOUT). */
  function shuffle(nodes, cfg, layoutScale) {
    const rnd = M.rng(Date.now() % 100000);
    place(nodes, cfg, layoutScale);
    const hubByCategory = Object.create(null);
    nodes.forEach(function (node) {
      if (node.type === 'hub') hubByCategory[node.category] = node;
    });
    const spread = cfg.artSpread || 85;
    const scaleX = layoutScale ? layoutScale.x : 1;
    const scaleY = layoutScale ? layoutScale.y : 1;
    nodes.forEach(function (node) {
      if (node.type !== 'art') return;
      const hub = hubByCategory[node.category];
      if (!hub) return;
      const angle = rnd() * TAU;
      const radius = Math.sqrt(rnd()) * spread;
      node.x = hub.x + Math.cos(angle) * radius * scaleX;
      node.y = hub.y + Math.sin(angle) * radius * scaleY;
      node.vx = (rnd() - 0.5) * 6;
      node.vy = (rnd() - 0.5) * 6;
      node.fixed = false;
    });
  }

  /**
   * Crea el motor de física.
   * @returns {{tick:Function, energy:Function, reheat:Function, shuffle:Function, place:Function}}
   */
  function create(nodes, edges, config, aspectRatio) {
    const cfg = Object.assign({
      repulsion: 12000,
      springLength: 110,
      springStrength: 0.035,
      tagStrength: 0.006,
      gravity: 0.0026,
      damping: 0.86,
      maxVelocity: 18,
      hubRadius: 170,
      artSpread: 85
    }, (config && config.graph) || {});

    const aspectScale = Math.sqrt(M.clamp(aspectRatio || 1, 0.5, 2));
    const layoutScale = { x: aspectScale * 1.25, y: 1 / aspectScale };
    let energy = 0;
    let heat = 1;
    let count = nodes.length;
    let fx = new Float64Array(count);
    let fy = new Float64Array(count);
    let nodeIndex = Object.create(null);
    nodes.forEach(function (node, i) { nodeIndex[node.id] = i; });

    function syncCoreRestLengths() {
      edges.forEach(function (edge) {
        if (edge.type !== 'core') return;
        const source = nodes[nodeIndex[edge.source]];
        const target = nodes[nodeIndex[edge.target]];
        if (source && target) edge.restLength = Math.hypot(target.x - source.x, target.y - source.y);
      });
    }

    function computeForces() {
      if (count !== nodes.length) {
        count = nodes.length;
        fx = new Float64Array(count);
        fy = new Float64Array(count);
        nodeIndex = Object.create(null);
        nodes.forEach(function (node, i) { nodeIndex[node.id] = i; });
      } else {
        fx.fill(0);
        fy.fill(0);
      }

      /* --- repulsión entre todos los pares --- */
      for (let i = 0; i < count; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < count; j += 1) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;

          if (d2 < 0.01) {
            /* desempate determinista para nodos superpuestos */
            const angle = (i * 2.399) % TAU;
            dx = Math.cos(angle) * 0.6;
            dy = Math.sin(angle) * 0.6;
            d2 = dx * dx + dy * dy;
          }

          const d = Math.sqrt(d2);
          const minDist = (a.radius + b.radius) * 0.92;
          let force;

          if (d < minDist) {
            /* contacto: empuje duro para separar tarjetas */
            force = (minDist - d) * 0.085;
          } else {
            force = cfg.repulsion / d2;
          }

          const ux = dx / d;
          const uy = dy / d;
          fx[i] -= ux * force;
          fy[i] -= uy * force;
          fx[j] += ux * force;
          fy[j] += uy * force;
        }
      }

      /* --- muelles de las aristas --- */
      edges.forEach(function (edge) {
        const i = nodeIndex[edge.source];
        const j = nodeIndex[edge.target];
        if (i === undefined || j === undefined) return;

        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const rest = edge.type === 'core'
          ? (edge.restLength || cfg.hubRadius * 0.92)
          : (edge.type === 'tag' ? cfg.springLength * 1.35 : cfg.springLength);
        const strength = (edge.type === 'tag' ? cfg.tagStrength : cfg.springStrength) * (1 + (edge.weight - 1) * 0.3);
        const force = (d - rest) * strength;
        const ux = dx / d;
        const uy = dy / d;

        fx[i] += ux * force;
        fy[i] += uy * force;
        fx[j] -= ux * force;
        fy[j] -= uy * force;
      });

      /* --- gravedad hacia el centro --- */
      let maxEnergy = 0;
      for (let i = 0; i < count; i += 1) {
        const node = nodes[i];
        if (node.fixed) { node.vx = 0; node.vy = 0; continue; }

        fx[i] -= node.x * cfg.gravity;
        fy[i] -= node.y * cfg.gravity;

        node.vx = (node.vx + fx[i] * heat) * cfg.damping;
        node.vy = (node.vy + fy[i] * heat) * cfg.damping;

        const speed = Math.hypot(node.vx, node.vy);
        if (speed > cfg.maxVelocity) {
          node.vx = (node.vx / speed) * cfg.maxVelocity;
          node.vy = (node.vy / speed) * cfg.maxVelocity;
        }

        node.x += node.vx;
        node.y += node.vy;
        maxEnergy = Math.max(maxEnergy, speed);
      }

      /* el calor baja: la constelación se asienta y deja de consumir CPU */
      heat = Math.max(0.02, heat * 0.996);
      energy = maxEnergy;
    }

    return {
      cfg: cfg,

      place: function () {
        place(nodes, cfg, layoutScale);
        syncCoreRestLengths();
      },

      shuffle: function () {
        shuffle(nodes, cfg, layoutScale);
        syncCoreRestLengths();
        heat = 1;
      },

      tick: function () {
        if (heat < 0.021 && energy < 0.06) return false;
        computeForces();
        return true;
      },

      /** Despierta la simulación (tras arrastrar o filtrar). */
      reheat: function (amount) {
        heat = M.clamp(amount === undefined ? 0.9 : amount, 0.05, 1.6);
      },

      energy: function () { return energy; },

      /** Fija un nodo en su sitio mientras se arrastra. */
      pin: function (id, x, y) {
        const node = nodes.find(function (n) { return n.id === id; });
        if (!node) return;
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
        node.fixed = true;
        heat = Math.max(heat, 0.35);
      },

      unpin: function (id) {
        const node = nodes.find(function (n) { return n.id === id; });
        if (node) node.fixed = false;
      },

      /** Mueve todo el grafo (para recentrar la constelación). */
      translateAll: function (dx, dy) {
        nodes.forEach(function (node) {
          node.x += dx;
          node.y += dy;
        });
      },

      bounds: function () {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(function (node) {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x);
          maxY = Math.max(maxY, node.y);
        });
        return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
      }
    };
  }

  CYBER.Layout = {
    create: create,
    place: place,
    shuffle: shuffle
  };
})(window.CYBER = window.CYBER || {});
