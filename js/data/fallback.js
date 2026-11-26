/* ============================================================
   data/fallback.js — dataset embebido (modo sin servidor)
   ------------------------------------------------------------
   GENERADO AUTOMÁTICAMENTE. No lo edites a mano: edita los
   archivos data/*.json y ejecuta:  node tools/build-fallback.cjs
   ============================================================ */
(function (CYBER) {
  'use strict';

  var config = {
  "site": {
    "name": "KARL_SKETCH",
    "tagline": "archivo de bocetos, grafito y tinta",
    "tagline_en": "sketchbook, graphite and ink archive",
    "version": "2.1",
    "author": "Karl Sketch Studio",
    "description": "Archivo interactivo de dibujo organizado como grafo de nodos: bocetos, lápiz, carboncillo, bolígrafo, marcadores y técnica mixta.",
    "description_en": "Interactive drawing archive arranged as a node graph: sketches, pencil, charcoal, ballpoint, markers and mixed media."
  },
  "graph": {
    "repulsion": 12000,
    "springLength": 110,
    "springStrength": 0.035,
    "tagStrength": 0.006,
    "gravity": 0.0026,
    "damping": 0.86,
    "maxVelocity": 18,
    "hubRadius": 170,
    "coreRadius": 0,
    "artSpread": 85,
    "minZoom": 0.26,
    "maxZoom": 2.6,
    "tagAffinityMin": 2,
    "maxTagEdges": 3,
    "packets": true
  },
  "ui": {
    "defaultView": "graph",
    "particles": 96,
    "tooltipDelay": 240,
    "bootLines": [
      "> inicializando kernel visual .......... [ ok ]",
      "> cargando módulo de grafito ........... [ ok ]",
      "> calibrando carboncillo ............... [ ok ]",
      "> inyectando tinta 0.38 ................ [ ok ]",
      "> mezclando marcadores de alcohol ...... [ ok ]",
      "> indexando archivo / 6 técnicas ...... [ ok ]",
      "> resolviendo afinidades temáticas ..... [ ok ]",
      "> tejiendo aristas del grafo ........... [ ok ]",
      "> activando física de fuerzas ......... [ ok ]",
      "> estabilizando constelación ........... [ ok ]",
      "> montando interfaz de nodos ........... [ ok ]",
      "> sistema listo. bienvenido, dibujante."
    ],
    "bootLines_en": [
      "> booting visual kernel ................ [ ok ]",
      "> loading graphite module .............. [ ok ]",
      "> calibrating charcoal ................. [ ok ]",
      "> priming 0.38 ink pen ................. [ ok ]",
      "> blending alcohol markers ............. [ ok ]",
      "> indexing archive / 6 techniques ..... [ ok ]",
      "> resolving thematic affinities ........ [ ok ]",
      "> weaving graph edges .................. [ ok ]",
      "> enabling force physics ............... [ ok ]",
      "> settling the constellation ........... [ ok ]",
      "> mounting node interface .............. [ ok ]",
      "> system ready. welcome, draughtsman."
    ]
  },
  "links": {},
  "adminPasswordHash": "e84f4a616fa49630048b770bc7122753d354661295513793c2306b5f9dea06ab"
};
  var categories = [
  {
    "id": "grafito",
    "label": "Grafito & Lápiz",
    "short": "Grafito",
    "label_en": "Graphite & Pencil",
    "short_en": "Graphite",
    "color": "#00eaff",
    "accent": "#6ff4ff",
    "icon": "✎",
    "description": "Estudios de valor y volumen con portaminas 2H a 8B sobre Bristol y Fabriano.",
    "description_en": "Value and volume studies with 2H to 8B lead holders on Bristol and Fabriano."
  },
  {
    "id": "carboncillo",
    "label": "Carboncillo",
    "short": "Carbón",
    "label_en": "Charcoal",
    "short_en": "Charcoal",
    "color": "#ff2e97",
    "accent": "#ff9ccb",
    "icon": "▩",
    "description": "Atmósfera y contraste crudo: barra prensada, difumino y goma de borrar como pincel.",
    "description_en": "Raw atmosphere and contrast: compressed stick, stump and eraser used as a brush."
  },
  {
    "id": "boligrafo",
    "label": "Bolígrafo",
    "short": "Tinta",
    "label_en": "Ballpoint Pen",
    "short_en": "Ink",
    "color": "#a15cff",
    "accent": "#d3b0ff",
    "icon": "✒",
    "description": "Línea continua sin corrección: gel 0.38 y trama densa a mano alzada.",
    "description_en": "Continuous line with no correction: 0.38 gel and dense freehand hatching."
  },
  {
    "id": "lapices",
    "label": "Lápices de colores",
    "short": "Lápices color",
    "label_en": "Coloured Pencils",
    "short_en": "Coloured Pencils",
    "color": "#ff5722",
    "accent": "#ff8a65",
    "icon": "🎨",
    "description": "Lápices de colores para dibujar y colorear con una variedad de tonos.",
    "description_en": "Coloured pencils for drawing and shading with a wide variety of tones."
  },
  {
    "id": "estilografos",
    "label": "Estilógrafo",
    "short": "Estilógrafo",
    "label_en": "Technical Pen",
    "short_en": "Technical Pen",
    "color": "#38bdf8",
    "accent": "#a5e3ff",
    "icon": "✒",
    "description": "Tinta técnica de precisión para líneas limpias y tramas detalladas.",
    "description_en": "Precision technical ink for clean lines and detailed hatching."
  },
  {
    "id": "marcadores",
    "label": "Marcadores",
    "short": "Color",
    "label_en": "Markers",
    "short_en": "Colour",
    "color": "#ffc247",
    "accent": "#ffe3a3",
    "icon": "▧",
    "description": "Alcohol de doble punta para color plano, luz sintética y acentos neón.",
    "description_en": "Dual-tip alcohol markers for flat colour, synthetic light and neon accents."
  },
  {
    "id": "mixta",
    "label": "Técnica Mixta",
    "short": "Mixta",
    "label_en": "Mixed Media",
    "short_en": "Mixed",
    "color": "#7cff6b",
    "accent": "#c4ffbc",
    "icon": "◈",
    "description": "Tinta acrílica, grafito y collage sobre el mismo soporte, sin reglas.",
    "description_en": "Acrylic ink, graphite and collage on the same support, no rules."
  },
  {
    "id": "digital",
    "label": "Boceto Digital",
    "short": "Digital",
    "label_en": "Digital Sketch",
    "short_en": "Digital",
    "color": "#ff8a3d",
    "accent": "#ffc39b",
    "icon": "✦",
    "description": "Preliminares de mural y cómic resueltos en tableta antes de pasar a papel.",
    "description_en": "Mural and comic preliminaries resolved on tablet before moving to paper."
  }
];
  var artworks = [];
  var tags = {
  "manos": {
    "es": "manos",
    "en": "hands"
  },
  "anatomía": {
    "es": "anatomía",
    "en": "anatomy"
  },
  "estudio": {
    "es": "estudio",
    "en": "study"
  },
  "luz": {
    "es": "luz",
    "en": "light"
  },
  "bodegón": {
    "es": "bodegón",
    "en": "still life"
  },
  "volumen": {
    "es": "volumen",
    "en": "volume"
  },
  "retrato": {
    "es": "retrato",
    "en": "portrait"
  },
  "piel": {
    "es": "piel",
    "en": "skin"
  },
  "ciudad": {
    "es": "ciudad",
    "en": "city"
  },
  "nocturno": {
    "es": "nocturno",
    "en": "night"
  },
  "niebla": {
    "es": "niebla",
    "en": "fog"
  },
  "atmósfera": {
    "es": "atmósfera",
    "en": "atmosphere"
  },
  "arquitectura": {
    "es": "arquitectura",
    "en": "architecture"
  },
  "estructura": {
    "es": "estructura",
    "en": "structure"
  },
  "autorretrato": {
    "es": "autorretrato",
    "en": "self-portrait"
  },
  "contraste": {
    "es": "contraste",
    "en": "contrast"
  },
  "movimiento": {
    "es": "movimiento",
    "en": "motion"
  },
  "multitud": {
    "es": "multitud",
    "en": "crowd"
  },
  "línea": {
    "es": "línea",
    "en": "line"
  },
  "textura": {
    "es": "textura",
    "en": "texture"
  },
  "criatura": {
    "es": "criatura",
    "en": "creature"
  },
  "mecanismo": {
    "es": "mecanismo",
    "en": "mechanism"
  },
  "fantasía": {
    "es": "fantasía",
    "en": "fantasy"
  },
  "comida": {
    "es": "comida",
    "en": "food"
  },
  "color": {
    "es": "color",
    "en": "colour"
  },
  "neón": {
    "es": "neón",
    "en": "neon"
  },
  "figura": {
    "es": "figura",
    "en": "figure"
  },
  "mural": {
    "es": "mural",
    "en": "mural"
  },
  "cómic": {
    "es": "cómic",
    "en": "comic"
  },
  "collage": {
    "es": "collage",
    "en": "collage"
  },
  "máscara": {
    "es": "máscara",
    "en": "mask"
  }
};

  CYBER.FallbackData = { config: config, categories: categories, artworks: artworks, tags: tags, source: 'embed' };
})(window.CYBER = window.CYBER || {});
