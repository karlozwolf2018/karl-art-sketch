/* ============================================================
   graph/layout.js — colocación inicial + simulación de fuerzas
   Expone: CYBER.Layout.create(nodes, edges, config)
   ============================================================ */
(function (CYBER) {
  'use strict';

  const M = CYBER.M;
  const TAU = M.TAU;

  /**
   * Reparte los nodos: núcleo al centro, hubs en anillo, obras alrededor
   * de su técnica.
   */
  function place(nodes, cfg) {
    const core = nodes.find(function (n) { return n.type === 'core'; });
    const hubs = nodes.filter(function (n) { return n.type === 'hub'; });
    const arts = nodes.filter(function (n) { return n.type === 'art'; });
    const hubRadius = cfg.hubRadius || 430;
    const spread = cfg.artSpread || 168;

    if (core) { core.x = 0; core.y = 0; core.vx = 0; core.vy = 0; }

    hubs.forEach(function (hub, index) {
      const angle = (index / Math.max(1, hubs.length)) * TAU - Math.PI / 2;
      hub.x = Math.cos(angle) * hubRadius;
      hub.y = Math.sin(angle) * hubRadius;
      hub.vx = 0;
      hub.vy = 0;
      hub.homeAngle = angle;
    });

    const byHub = Object.create(null);
    arts.forEach(function (art) {
      const key = CYBER.GraphModel.hubId(art.category);
      (byHub[key] = byHub[key] || []).push(art);
    });

    Object.keys(byHub).forEach(function (key) {
      const hub = nodes.find(function (n) { return n.id === key; });
      const list = byHub[key];
      if (!hub) return;
      /* las obras se abren en abanico hacia fuera del centro */
      const base = Math.atan2(hub.y, hub.x);
      const arc = Math.min(Math.PI * 1.15, 0.5 + list.length * 0.36);

      list.forEach(function (art, index) {
        const t = list.length === 1 ? 0.5 : index / (list.length - 1);
        const angle = base + (t - 0.5) * arc;
        const ring = spread * (1.05 + (index % 3) * 0.42);
        art.x = hub.x + Math.cos(angle) * ring;
        art.y = hub.y + Math.sin(angle) * ring;
        art.vx = 0;
        art.vy = 0;
      });
    });
  }

  /** Reinicia las posiciones con un desorden controlado (botón LAYOUT). */
  function shuffle(nodes, cfg) {
    const rnd = M.rng(Date.now() % 100000);
    place(nodes, cfg);
    nodes.forEach(function (node) {
      if (node.type === 'core') return;
      const angle = rnd() * TAU;
      const radius = node.type === 'hub'
        ? (cfg.hubRadius || 430) * (0.7 + rnd() * 0.6)
        : (cfg.artSpread || 168) * (0.8 + rnd() * 1.9);
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
      node.vx = (rnd() - 0.5) * 6;
      node.vy = (rnd() - 0.5) * 6;
      node.fixed = false;
    });
  }

  /**
   * Crea el motor de física.
   * @returns {{tick:Function, energy:Function, reheat:Function, shuffle:Function, place:Function}}
   */
  function create(nodes, edges, config) {
    const cfg = Object.assign({
      repulsion: 46000,
      springLength: 196,
      springStrength: 0.021,
      tagStrength: 0.012,
      gravity: 0.0026,
      damping: 0.86,
      maxVelocity: 26,
      hubRadius: 430,
      artSpread: 168
    }, (config && config.graph) || {});

    let energy = 0;
    let heat = 1;
    let count = nodes.length;
    let fx = new Float64Array(count);
    let fy = new Float64Array(count);
    let nodeIndex = Object.create(null);
    nodes.forEach(function (node, i) { nodeIndex[node.id] = i; });

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
          ? cfg.hubRadius * 0.92
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

      place: function () { place(nodes, cfg); },

      shuffle: function () {
        shuffle(nodes, cfg);
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
