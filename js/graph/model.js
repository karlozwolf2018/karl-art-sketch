/* ============================================================
   graph/model.js — construcción del grafo (nodos y aristas)
   Expone: CYBER.GraphModel
   ------------------------------------------------------------
   Reglas del archivo:
     · 1 nodo NÚCLEO  → conecta con cada técnica
     · 1 nodo HUB por técnica → conecta con sus obras
     · obras entre sí cuando comparten >= tagAffinityMin etiquetas
   ============================================================ */
(function (CYBER) {
  'use strict';

  const CORE_ID = 'core';

  /** Radio visual usado por la física (los nodos de obra son tarjetas). */
  function radiusFor(type) {
    if (type === 'core') return 30;
    if (type === 'hub') return 30;
    return 68;
  }

  function hubId(categoryId) { return 'hub:' + categoryId; }

  /** Construye nodos y aristas a partir de los datos normalizados. */
  function build(artworks, categories, config) {
    const cfg = (config && config.graph) || {};
    const affinityMin = Math.max(1, parseInt(cfg.tagAffinityMin, 10) || 2);
    const maxTagEdges = Math.max(1, parseInt(cfg.maxTagEdges, 10) || 3);

    const nodes = [];
    const edges = [];

    /* ---------- nodo núcleo ---------- */
    const core = {
      id: CORE_ID,
      type: 'core',
      label: 'ARCHIVO',
      sublabel: artworks.length + ' obras',
      color: '#00eaff',
      accent: '#ff2e97',
      icon: '⬡',
      radius: radiusFor('core'),
      x: 0, y: 0, vx: 0, vy: 0,
      fixed: false,
      tags: [],
      count: artworks.length
    };
    nodes.push(core);

    /* ---------- hubs por técnica ---------- */
    const usedCategories = categories.filter(function (cat) {
      return artworks.some(function (art) { return art.category === cat.id; });
    });

    const countByCat = CYBER.DataService.countByCategory(artworks, categories);

    usedCategories.forEach(function (cat, index) {
      const node = {
        id: hubId(cat.id),
        type: 'hub',
        label: cat.label,
        sublabel: cat.description,
        color: cat.color,
        accent: cat.accent,
        icon: cat.icon,
        category: cat.id,
        radius: radiusFor('hub'),
        x: 0, y: 0, vx: 0, vy: 0,
        fixed: false,
        tags: [],
        count: countByCat[cat.id] || 0,
        order: index
      };
      nodes.push(node);

      edges.push({
        id: 'e:' + CORE_ID + '>' + node.id,
        source: CORE_ID,
        target: node.id,
        type: 'core',
        color: cat.color,
        weight: 1
      });
    });

    /* ---------- nodos de obra ---------- */
    artworks.forEach(function (art) {
      const node = {
        id: art.id,
        type: 'art',
        label: art.title,
        sublabel: art.technique,
        color: art.color,
        accent: art.accent,
        icon: art.icon,
        category: art.category,
        radius: radiusFor('art'),
        x: 0, y: 0, vx: 0, vy: 0,
        fixed: false,
        tags: art.tags.slice(),
        artwork: art,
        count: art.tags.length
      };
      nodes.push(node);

      edges.push({
        id: 'e:' + hubId(art.category) + '>' + art.id,
        source: hubId(art.category),
        target: art.id,
        type: 'cat',
        color: art.color,
        weight: 1
      });
    });

    /* ---------- aristas de afinidad temática ---------- */
    const byId = Object.create(null);
    nodes.forEach(function (node) { byId[node.id] = node; });

    const candidates = [];
    for (let i = 0; i < artworks.length; i += 1) {
      for (let j = i + 1; j < artworks.length; j += 1) {
        const a = artworks[i];
        const b = artworks[j];
        const shared = a.tags.filter(function (tag) { return b.tags.indexOf(tag) > -1; });
        if (shared.length >= affinityMin) {
          candidates.push({ a: a, b: b, shared: shared, weight: shared.length });
        }
      }
    }

    candidates.sort(function (x, y) { return y.weight - x.weight; });

    const degree = Object.create(null);
    candidates.forEach(function (pair) {
      const da = degree[pair.a.id] || 0;
      const db = degree[pair.b.id] || 0;
      if (da >= maxTagEdges || db >= maxTagEdges) return;
      degree[pair.a.id] = da + 1;
      degree[pair.b.id] = db + 1;

      edges.push({
        id: 'e:' + pair.a.id + '~' + pair.b.id,
        source: pair.a.id,
        target: pair.b.id,
        type: 'tag',
        color: '#ff2e97',
        weight: pair.weight,
        shared: pair.shared
      });
    });

    /* ---------- índice de vecinos (para resaltar relaciones) ---------- */
    const neighbors = Object.create(null);
    nodes.forEach(function (node) { neighbors[node.id] = []; });
    edges.forEach(function (edge) {
      if (neighbors[edge.source]) neighbors[edge.source].push({ id: edge.target, edge: edge });
      if (neighbors[edge.target]) neighbors[edge.target].push({ id: edge.source, edge: edge });
    });

    return {
      coreId: CORE_ID,
      nodes: nodes,
      edges: edges,
      byId: byId,
      neighbors: neighbors,
      tags: CYBER.DataService.tagCloud(artworks),
      stats: {
        nodes: nodes.length,
        edges: edges.length,
        artworks: artworks.length,
        hubs: usedCategories.length,
        affinity: edges.filter(function (e) { return e.type === 'tag'; }).length,
        hours: CYBER.DataService.totalHours(artworks)
      }
    };
  }

  /** Devuelve el conjunto de ids relacionados con `id` (vecinos directos). */
  function relatedOf(model, id, depth) {
    const levels = Math.max(1, depth || 1);
    const seen = Object.create(null);
    let frontier = [id];
    const out = [];

    for (let level = 0; level < levels; level += 1) {
      const next = [];
      frontier.forEach(function (current) {
        (model.neighbors[current] || []).forEach(function (link) {
          if (link.id === id || seen[link.id]) return;
          seen[link.id] = true;
          out.push(link.id);
          next.push(link.id);
        });
      });
      frontier = next;
    }
    return out;
  }

  /** Aristas que tocan un nodo (para el resaltado). */
  function edgesOf(model, id) {
    return model.edges.filter(function (edge) {
      return edge.source === id || edge.target === id;
    });
  }

  CYBER.GraphModel = {
    build: build,
    relatedOf: relatedOf,
    edgesOf: edgesOf,
    hubId: hubId,
    CORE_ID: CORE_ID
  };
})(window.CYBER = window.CYBER || {});
