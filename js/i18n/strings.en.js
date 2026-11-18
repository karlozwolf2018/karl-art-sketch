/* ============================================================
   i18n/strings.en.js — English dictionary
   Expone: CYBER.Locales.en
   ------------------------------------------------------------
   Interface text only. Artwork content (titles, techniques,
   notes) and tags live in data/*.json.
   ============================================================ */
(function (CYBER) {
  'use strict';

  CYBER.Locales = CYBER.Locales || {};

  CYBER.Locales.en = {
    meta: {
      code: 'en',
      name: 'English',
      badge: 'EN',
      switchTitle: 'Change language / Cambiar idioma',
      switchAria: 'Current language: English. Switch to Spanish',
      themeTitle: 'Light / dark theme',
      themeAria: 'Current theme: dark. Switch to light',
      addWorkTitle: 'Add a new work',
      addWorkAria: 'Add a new work to the archive',
      addWork: '+ NEW WORK'
    },

    ui: {
      brandSub: 'sketchbook archive v2.1',
      nav: { graph: 'GRAPH', gallery: 'GALLERY', info: 'INFO' },
      navLabel: 'Views',
      search: {
        placeholder: 'search work, technique, tag…',
        aria: 'Search the archive',
        clear: 'Clear search',
        count: '{{visible}} of {{total}} matches'
      },
      stats: { nodes: 'nodes', edges: 'links' },
      sidebar: {
        aria: 'Archive filters',
        techniques: 'TECHNIQUES',
        tags: 'TAGS',
        status: 'STATUS',
        telemetry: 'TELEMETRY',
        controls: 'CONTROLS',
        onlyFavorites: 'Favourites only',
        onlyAvailable: 'Available only',
        physics: 'Physics on',
        reset: 'RESET FILTERS',
        showFilters: 'Show filters'
      },
      readout: {
        artworks: 'Works',
        visible: 'Visible',
        hours: 'Studio hours',
        nodes: 'Nodes',
        edges: 'Links',
        source: 'Source'
      },
      hintsHtml:
        '<li><kbd>drag</kbd> canvas or node</li>' +
        '<li><kbd>wheel</kbd> zoom</li>' +
        '<li><kbd>click</kbd> open card</li>' +
        '<li><kbd>double click</kbd> centre node</li>' +
        '<li><kbd>/</kbd> search · <kbd>Esc</kbd> close</li>' +
        '<li><kbd>G</kbd> gallery · <kbd>F</kbd> fit</li>',
      online: 'SYSTEM ONLINE',
      tools: {
        fit: 'FIT',
        layout: 'LAYOUT',
        core: 'CORE',
        physics: 'PHYSICS',
        crt: 'CRT',
        export: 'EXPORT',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        fitTitle: 'Fit everything (F)',
        layoutTitle: 'Re-scatter the constellation (R)',
        coreTitle: 'Back to the core (C)',
        physicsTitle: 'Toggle physics (P)',
        crtTitle: 'CRT effect (T)',
        exportTitle: 'Export the visible graph to JSON',
        fullscreen: 'Full screen',
        toolbar: 'Graph tools'
      },
      graph: {
        aria: 'Node view',
        hint: 'drag the canvas · wheel to zoom · click a node',
        radar: 'RADAR',
        emptyTitle: 'NO RESULTS',
        emptyText: 'no work matches the active filters',
        emptyHint: 'try RESET FILTERS in the side panel',
        emptyArchiveTitle: 'EMPTY ARCHIVE',
        emptyArchiveText: 'The archive is clean and ready for your creations.',
        emptyArchiveHint: 'Click [+ ADD] on the top bar to upload your first work.',
        emptyArchiveBtn: '+ ADD FIRST WORK'
      },
      legend: {
        core: 'archive core',
        hub: 'technique (hub)',
        art: 'work (node)',
        catEdge: 'technique link',
        tagEdge: 'thematic affinity'
      },
      loader: {
        aria: 'Starting up',
        sub: 'assembling the sketch graph…',
        skip: 'SKIP INTRO'
      },
      views: {
        galleryAria: 'Gallery view',
        aboutAria: 'Archive information'
      },
      source: {
        json: 'JSON',
        embed: 'EMBEDDED',
        mixed: 'MIXED',
        loading: 'loading…'
      },
      statusbar: { nodes: 'NODES', edges: 'LINKS', zoom: 'ZOOM', fps: 'FPS', source: 'SOURCE' },
      noscript: 'This page needs JavaScript to draw the node graph.'
    },

    node: {
      openAria: 'Open the card for {{title}}',
      favorite: 'Favourite',
      favoriteAria: 'Mark as favourite',
      hubAria: '{{label}} ({{count}} works)',
      hubWorks: '{{count}} WORKS',
      hubTip: '{{count}} works in this technique',
      coreAria: 'Archive core',
      archive: 'ARCHIVE',
      worksSub: '{{count}} works',
      technique: 'TECHNIQUE',
      core: 'CORE'
    },

    modal: {
      closeAria: 'Close card',
      close: 'CLOSE · ESC',
      edit: 'EDIT',
      delete: 'DELETE',
      note: 'STUDIO NOTE',
      story: 'BACKSTORY',
      palette: 'COLOUR PALETTE',
      toneActive: 'Showing tones of {{tone}} ({{hex}}) · Click to reset',
      toneRestored: 'Original artwork colours restored.',
      related: 'RELATED ({{count}})',
      noNote: 'No note on record.',
      imageInfo: 'IMAGE INFO',
      imgInfoName: 'Filename',
      imgInfoSize: 'Size',
      imgInfoDimensions: 'Dimensions',
      imgInfoGenerated: 'procedurally generated',
      meta: {
        technique: 'Techniques',
        materials: 'Materials',
        size: 'Dimensions',
        year: 'Year',
        status: 'Status'
      },
      favorite: 'FAVOURITE',
      inFavorites: 'IN FAVOURITES',
      copy: 'COPY CARD',
      download: 'DOWNLOAD PNG',
      showInGraph: 'SHOW IN GRAPH',
      prev: '← PREVIOUS',
      next: 'NEXT →',
      counter: '{{position}} / {{total}}',
      seed: 'SEED',
      sheet: {
        code: 'Code',
        technique: 'Techniques',
        materials: 'Materials',
        size: 'Size',
        year: 'Year',
        status: 'Status',
        tags: 'Tags'
      },
      toast: {
        copied: 'Card for {{title}} copied',
        copyFail: 'Could not copy (browser permission)',
        colorCopied: 'Colour {{hex}} copied',
        pngReady: 'PNG generated: {{file}}',
        filteringTag: 'Filtering by tag #{{tag}}'
      }
    },

    gallery: {
      visible: 'VISIBLE WORKS',
      order: 'ORDER',
      sort: {
        recent: 'Most recent',
        oldest: 'Oldest',
        hours: 'Most hours of work',
        title: 'Title (A–Z)',
        category: 'Technique'
      },
      emptyTitle: 'NOTHING TO SHOW',
      emptyText: 'the active filters leave no work',
      emptyHint: 'press RESET FILTERS in the side panel',
      emptyArchiveTitle: 'EMPTY ARCHIVE',
      emptyArchiveText: 'You haven\'t added any artwork to your collection yet.',
      emptyArchiveHint: 'Click [+ ADD] to register your first creation.',
      openAria: 'Open the card for {{title}}',
      favoriteAria: 'Favourite'
    },

    about: {
      eyebrow: '// ARCHIVE DOSSIER',
      title: 'THE SKETCHBOOK AS A NETWORK',
      lead: 'This archive does not line the drawings up in a row: it connects them. Every work is a node and every link is a real studio relationship — same model, same palette, same obsession. Move the graph, open it, follow the threads.',
      c1: {
        title: '01 · Materials',
        body: 'Graphite 2H–8B on Bristol and Fabriano, compressed charcoal and stumps, 0.38 gel pen, dual-tip alcohol markers and acrylic ink for the accents.',
        l1: '<b>Graphite</b> — volume and value studies',
        l2: '<b>Charcoal</b> — atmosphere and raw contrast',
        l3: '<b>Ballpoint</b> — continuous line, no correction',
        l4: '<b>Markers</b> — flat colour and synthetic light'
      },
      c2: {
        title: '02 · Method',
        body: 'Everything starts with 30-second blotches and ends with long passes of 6 to 9 hours. The cards record real desk time, not kind estimates.',
        s1: 'Blind 30 s blotch',
        s2: 'Blocking in proportions',
        s3: 'Values in 3 tones',
        s4: 'Selective detail and neon accent'
      },
      c3: {
        title: '03 · The interface',
        body: 'The graph runs on force physics: nodes repel, links pull. Hexagons are <b>techniques</b>, the central hexagon is the <b>archive core</b> and the cards are the <b>works</b>. Dashed magenta links mean thematic affinity.'
      },
      c4: {
        title: '04 · Contact',
        body: 'Portrait commissions, editorial illustration and charcoal lessons. Reply within 24–48 h.',
        note: '※ These links are placeholders: edit them in <code>data/config.json</code>.'
      },
      foot: '© 2026 Karl Sketch Studio · All rights reserved. The artworks and content in this archive are original creations protected by copyright.',
      code: '© 2026 Karl Sketch Studio'
    },

    status: {
      disponible: 'Available',
      reservado: 'Reserved',
      vendido: 'Private collection',
      archivo: 'Archive only',
      exposicion: 'On show',
      desconocido: 'Archive'
    },

    formats: {
      minutes: '{{h}}h {{m}}m',
      minutesOnly: '{{m}} min',
      hoursOnly: '{{h}} h',
      hours: '{{value}} h',
      works: '{{count}} works',
      locale: 'en-GB'
    },

    toasts: {
      favAdded: 'Added to favourites: <b>{{title}}</b>',
      favRemoved: 'Removed from favourites: <b>{{title}}</b>',
      filtersReset: 'Filters <b>reset</b>',
      physicsOn: 'Physics enabled',
      physicsOff: 'Physics frozen',
      layoutNew: 'New constellation generated',
      exported: 'Exported <b>{{count}}</b> works to JSON',
      ready: 'Archive ready · <b>{{works}}</b> works across <b>{{edges}}</b> links',
      embed: 'JSON data unavailable: using the <b>embedded dataset</b>',
      noMatches: 'No matches for <b>{{query}}</b>',
      matches: '{{count}} matches · centring <b>{{title}}</b>',
      fullscreen: 'Full screen blocked by the browser',
      language: 'Language switched to <b>{{name}}</b>',
      themeOn: '<b>Light</b> theme enabled',
      themeOff: '<b>Dark</b> theme enabled',
      error: 'The interface could not start: <b>{{message}}</b>'
    },

    theme: {
      light: 'Light',
      dark: 'Dark'
    },

    editor: {
      titleNew: 'NEW WORK',
      titleEdit: 'EDIT WORK',
      closeAria: 'Close editor',
      langEs: 'Spanish',
      langEn: 'English',
      category: 'Category',
      title: 'Title',
      technique: 'Techniques',
      techniqueHint: 'Select one or more techniques (they can be combined).',
      techniquesPreset: [
        'Stippling','Hatching','Layering','Cross-hatching',
        'Blending','Scumbling','Doodling','Smudging',
        'Graduated tone','Sgraffito','Circulism'
      ],
      techniqueFreeHint: 'Write your own technique… (Enter or comma to add)',
      materialsPreset: ['Pencils','Charcoal','Pens','Colours'],
      materialFreeHint: 'Brand, model, number… (Enter or comma to add)',
      year: 'Year',
      size: 'Size',
      materials: 'Materials used',
      materialsHint: 'Brands, models and numbers of paper type, pencils, colours and pens.',
      status: 'Status',
      palette: 'Colour Palette',
      paletteHint: 'Click on swatches to edit or add new tones.',
      paletteHexText: 'HEX values (comma separated)',
      addColor: '+ Colour',
      presets: 'Presets:',
      extractPalette: '⚡ Extract from image',
      paletteExtracted: 'Palette extracted from image',
      noImageForPalette: 'Load an image or enter a URL first',
      tags: 'Tags (comma separated)',
      tagsHint: 'e.g. portrait, night, city',
      description: 'Description · studio note',
      story: 'Backstory',
      save: 'SAVE',
      cancel: 'CANCEL',
      delete: 'DELETE',
      deleteConfirm: 'YES, DELETE',
      image: 'Artwork Image (URL)',
      uploadFile: 'Upload local file',
      fileUploaded: 'Image saved to server',
      fileLoaded: 'Image loaded into sketch',
      titleRequired: 'A title is required',
      created: 'Work <b>{{title}}</b> added to the archive',
      updated: 'Work <b>{{title}}</b> updated',
      deleted: 'Work <b>{{title}}</b> deleted',
      confirmTitle: 'DELETE WORK',
      confirmBody: 'Delete <b>{{title}}</b>? This cannot be undone.',
      keep: 'CANCEL',
      storageHint: 'Changes are stored in this browser (localStorage); they do not edit the data/*.json files.'
    },

    selection: {
      category: 'TECHNIQUE · {{label}}',
      core: 'ARCHIVE CORE'
    }
  };
})(window.CYBER = window.CYBER || {});
