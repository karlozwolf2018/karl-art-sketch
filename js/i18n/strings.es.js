/* ============================================================
   i18n/strings.es.js — diccionario español (idioma por defecto)
   Expone: CYBER.Locales.es
   ------------------------------------------------------------
   Solo contiene TEXTO DE INTERFAZ. El contenido de las obras
   (títulos, técnicas, notas) y las etiquetas viven en data/*.json.
   ============================================================ */
(function (CYBER) {
  'use strict';

  CYBER.Locales = CYBER.Locales || {};

  CYBER.Locales.es = {
    meta: {
      code: 'es',
      name: 'Español',
      badge: 'ES',
      switchTitle: 'Cambiar idioma / Change language',
      switchAria: 'Idioma actual: español. Cambiar a inglés',
      themeTitle: 'Tema claro / oscuro',
      themeAria: 'Tema actual: oscuro. Cambiar a claro',
      themeAriaLight: 'Tema actual: claro. Cambiar a oscuro',
      addWorkTitle: 'Añadir una obra nueva',
      addWorkAria: 'Añadir una obra nueva al archivo',
      addWork: '+ NUEVA OBRA'
    },

    ui: {
      brandSub: 'archivo de bocetos v2.1',
      nav: { graph: 'GRAFO', gallery: 'GALERÍA', info: 'INFO' },
      navLabel: 'Vistas',
      search: {
        placeholder: 'buscar obra, técnica, tag…',
        aria: 'Buscar en el archivo',
        clear: 'Limpiar búsqueda',
        count: '{{visible}} de {{total}} coincidencias'
      },
      stats: { nodes: 'nodos', edges: 'enlaces' },
      sidebar: {
        aria: 'Filtros del archivo',
        techniques: 'TÉCNICAS',
        tags: 'TAGS',
        status: 'ESTADO',
        telemetry: 'TELEMETRÍA',
        controls: 'CONTROLES',
        onlyFavorites: 'Sólo favoritos',
        onlyAvailable: 'Sólo disponibles',
        physics: 'Física activa',
        reset: 'REINICIAR FILTROS',
        showFilters: 'Mostrar filtros'
      },
      readout: {
        artworks: 'Obras',
        visible: 'Visibles',
        hours: 'Horas de estudio',
        nodes: 'Nodos',
        edges: 'Enlaces',
        source: 'Fuente'
      },
      hintsHtml:
        '<li><kbd>arrastrar</kbd> lienzo o nodo</li>' +
        '<li><kbd>rueda</kbd> zoom</li>' +
        '<li><kbd>click</kbd> abrir ficha</li>' +
        '<li><kbd>doble click</kbd> centrar nodo</li>' +
        '<li><kbd>/</kbd> buscar · <kbd>Esc</kbd> cerrar</li>' +
        '<li><kbd>G</kbd> galería · <kbd>F</kbd> encajar</li>',
      online: 'SISTEMA EN LÍNEA',
      tools: {
        fit: 'AJUSTAR',
        layout: 'ORDENAR',
        core: 'NÚCLEO',
        physics: 'FÍSICA',
        crt: 'CRT',
        export: 'EXPORTAR',
        zoomIn: 'Acercar',
        zoomOut: 'Alejar',
        fitTitle: 'Encajar todo (F)',
        layoutTitle: 'Reordenar constelación (R)',
        coreTitle: 'Volver al núcleo (C)',
        physicsTitle: 'Activar/desactivar física (P)',
        crtTitle: 'Efecto CRT (T)',
        exportTitle: 'Exportar el grafo visible a JSON',
        fullscreen: 'Pantalla completa',
        toolbar: 'Herramientas del grafo'
      },
      graph: {
        aria: 'Vista de nodos',
        hint: 'arrastra el lienzo · rueda para zoom · click en un nodo',
        radar: 'RADAR',
        emptyTitle: 'SIN RESULTADOS',
        emptyText: 'ninguna obra cumple los filtros activos',
        emptyHint: 'prueba a pulsar REINICIAR FILTROS en el panel',
        emptyArchiveTitle: 'ARCHIVO SIN OBRAS',
        emptyArchiveText: 'El archivo está listo para recibir tus creaciones.',
        emptyArchiveHint: 'Pulsa el botón [+ AÑADIR] en la barra superior para subir tu primera obra.',
        emptyArchiveBtn: '+ AÑADIR PRIMERA OBRA'
      },
      legend: {
        core: 'núcleo del archivo',
        hub: 'técnica (hub)',
        art: 'obra (nodo)',
        catEdge: 'enlace de técnica',
        tagEdge: 'afinidad temática'
      },
      loader: {
        aria: 'Iniciando sistema',
        sub: 'montando grafo de bocetos…',
        progress: 'Progreso de carga',
        skip: 'SALTAR INTRO'
      },
      views: {
        galleryAria: 'Vista de galería',
        aboutAria: 'Información del archivo'
      },
      source: {
        json: 'JSON',
        embed: 'EMBEBIDO',
        mixed: 'MIXTO',
        loading: 'cargando…'
      },
      statusbar: { nodes: 'NODOS', edges: 'ENLACES', zoom: 'ZOOM', fps: 'FPS', source: 'FUENTE' },
      noscript: 'Este archivo necesita JavaScript para dibujar el grafo de nodos.'
    },

    node: {
      openAria: 'Abrir ficha de {{title}}',
      favorite: 'Favorito',
      favoriteAria: 'Marcar como favorito',
      hubAria: '{{label}} ({{count}} obras)',
      hubWorks: '{{count}} OBRAS',
      hubTip: '{{count}} obras en esta técnica',
      coreAria: 'Núcleo del archivo',
      archive: 'ARCHIVO',
      worksSub: '{{count}} obras',
      technique: 'TÉCNICA',
      core: 'NÚCLEO'
    },

    modal: {
      closeAria: 'Cerrar ficha',
      close: 'CERRAR · ESC',
      edit: 'EDITAR',
      delete: 'ELIMINAR',
      note: 'NOTA DE ESTUDIO',
      story: 'HISTORIA',
      palette: 'PALETA DE COLORES',
      toneActive: 'Mostrando tonos de {{tone}} ({{hex}}) · Clic para restaurar',
      toneRestored: 'Restaurados colores originales de la obra.',
      related: 'RELACIONADAS ({{count}})',
      noNote: 'Sin nota registrada.',
      imageInfo: 'INFORMACIÓN DE IMAGEN',
      imgInfoName: 'Nombre',
      imgInfoSize: 'Tamaño',
      imgInfoDimensions: 'Dimensiones',
      imgInfoGenerated: 'generada proceduralmente',
      meta: {
        technique: 'Técnicas',
        materials: 'Materiales',
        size: 'Medidas',
        year: 'Año',
        status: 'Estado'
      },
      favorite: 'FAVORITO',
      inFavorites: 'EN FAVORITOS',
      copy: 'COPIAR FICHA',
      download: 'DESCARGAR PNG',
      showInGraph: 'VER EN EL GRAFO',
      prev: '← ANTERIOR',
      next: 'SIGUIENTE →',
      counter: '{{position}} / {{total}}',
      seed: 'SEMILLA',
      sheet: {
        code: 'Código',
        technique: 'Técnicas',
        materials: 'Materiales',
        size: 'Medidas',
        year: 'Año',
        status: 'Estado',
        tags: 'Etiquetas'
      },
      toast: {
        copied: 'Ficha de {{title}} copiada',
        copyFail: 'No se pudo copiar (permiso del navegador)',
        colorCopied: 'Color {{hex}} copiado',
        pngReady: 'PNG generado: {{file}}',
        filteringTag: 'Filtrando por etiqueta #{{tag}}'
      }
    },

    gallery: {
      visible: 'OBRAS VISIBLES',
      order: 'ORDEN',
      sort: {
        recent: 'Más recientes',
        oldest: 'Más antiguas',
        hours: 'Más horas de trabajo',
        title: 'Título (A–Z)',
        category: 'Técnica'
      },
      emptyTitle: 'NADA QUE MOSTRAR',
      emptyText: 'los filtros activos no dejan ninguna obra',
      emptyHint: 'pulsa REINICIAR FILTROS en el panel lateral',
      emptyArchiveTitle: 'ARCHIVO SIN OBRAS',
      emptyArchiveText: 'Aún no has añadido ninguna obra a tu colección.',
      emptyArchiveHint: 'Haz clic en [+ AÑADIR] para registrar tu primera creación.',
      openAria: 'Abrir ficha de {{title}}',
      favoriteAria: 'Favorito'
    },

    about: {
      eyebrow: '// DOSSIER DEL ARCHIVO',
      title: 'EL CUADERNO COMO RED',
      lead: 'Este archivo no ordena los dibujos en fila: los conecta. Cada obra es un nodo y cada enlace es una relación real de estudio — mismo modelo, misma paleta, misma obsesión. Mueve el grafo, ábrelo, sigue los hilos.',
      c1: {
        title: '01 · Materiales',
        body: 'Grafito 2H–8B sobre Bristol y Fabriano, carboncillo prensado y difuminos, bolígrafo de gel 0.38, marcadores de alcohol de doble punta y tinta acrílica para los acentos.',
        l1: '<b>Grafito</b> — estudio de volumen y valor',
        l2: '<b>Carboncillo</b> — atmósfera y contraste crudo',
        l3: '<b>Bolígrafo</b> — línea continua, sin corrección',
        l4: '<b>Marcadores</b> — color plano y luz sintética'
      },
      c2: {
        title: '02 · Método',
        body: 'Todo empieza con manchas de 30 segundos y termina con pasadas largas de 6 a 9 horas. Las fichas guardan tiempos reales de butaca, no estimaciones amables.',
        s1: 'Mancha rápida de 30 s',
        s2: 'Bloqueo de proporciones',
        s3: 'Valorización en 3 tonos',
        s4: 'Detalle selectivo y acento neón'
      },
      c3: {
        title: '03 · La interfaz',
        body: 'El grafo usa física de fuerzas: los nodos se repelen, los enlaces tiran. Los hexágonos son <b>técnicas</b>, el hexágono central es el <b>núcleo del archivo</b> y las tarjetas son las <b>obras</b>. Los enlaces punteados magenta significan afinidad temática.'
      },
      c4: {
        title: '04 · Contacto',
        body: 'Encargos de retrato, ilustración editorial y clases de carboncillo. Respuesta en 24–48 h.'
      },
      foot: '© 2026 Karl Sketch Studio · Todos los derechos reservados. Todas las obras y el contenido de este archivo son de autoría propia y están protegidos por derechos de autor.',
      code: '© 2026 Karl Sketch Studio'
    },

    status: {
      disponible: 'Disponible',
      reservado: 'Reservado',
      vendido: 'En colección privada',
      archivo: 'Sólo archivo',
      exposicion: 'En exposición',
      desconocido: 'Archivo'
    },

    formats: {
      minutes: '{{h}} h {{m}} min',
      minutesOnly: '{{m}} min',
      hoursOnly: '{{h}} h',
      hours: '{{value}} h',
      works: '{{count}} obras',
      locale: 'es-ES'
    },

    toasts: {
      favAdded: 'Añadido a favoritos: <b>{{title}}</b>',
      favRemoved: 'Quitado de favoritos: <b>{{title}}</b>',
      filtersReset: 'Filtros <b>reiniciados</b>',
      physicsOn: 'Física activada',
      physicsOff: 'Física congelada',
      layoutNew: 'Nueva constelación generada',
      exported: 'Exportadas <b>{{count}}</b> obras a JSON',
      ready: 'Archivo listo · <b>{{works}}</b> obras en <b>{{edges}}</b> enlaces',
      embed: 'Datos JSON no accesibles: usando el <b>dataset embebido</b>',
      noMatches: 'Sin coincidencias para <b>{{query}}</b>',
      matches: '{{count}} coincidencias · centrando <b>{{title}}</b>',
      fullscreen: 'Pantalla completa bloqueada por el navegador',
      language: 'Idioma cambiado a <b>{{name}}</b>',
      themeOn: 'Tema <b>claro</b> activado',
      themeOff: 'Tema <b>oscuro</b> activado',
      error: 'No se pudo iniciar la interfaz: <b>{{message}}</b>'
    },

    theme: {
      light: 'Claro',
      dark: 'Oscuro'
    },

    editor: {
      titleNew: 'NUEVA OBRA',
      titleEdit: 'EDITAR OBRA',
      closeAria: 'Cerrar editor',
      langEs: 'Español',
      langEn: 'Inglés',
      category: 'Categoría',
      title: 'Título',
      technique: 'Técnicas',
      techniqueHint: 'Selecciona una o más técnicas (puedes combinarlas).',
      techniquesPreset: [
        'Puntillismo','Rayado','Superposición','Achurado',
        'Esfumado','Trama','Garabateo','Difumado',
        'Escalonado','Esgrafiado','Circulismo'
      ],
      techniqueFreeHint: 'Escribir técnica propia… (Enter o coma para añadir)',
      materialsPreset: [],
      materialFreeHint: 'Marca, modelo, número… (Enter o coma para añadir)',
      year: 'Año',
      size: 'Medidas',
      materials: 'Materiales utilizados',
      materialsHint: 'Marcas, modelos y números de tipo de papel, lápices, colores y bolígrafos.',
      status: 'Estado',
      palette: 'Paleta de colores',
      paletteHint: 'Haz clic en los colores para editar o añade nuevos tonos.',
      paletteHexText: 'Valores HEX (separados por comas)',
      addColor: '+ Color',
      presets: 'Presets:',
      extractPalette: '⚡ Extraer de imagen',
      paletteExtracted: 'Paleta extraída de la imagen',
      noImageForPalette: 'Carga una imagen o ingresa una URL primero',
      tags: 'Etiquetas (separadas por comas)',
      tagsHint: 'ej: retrato, nocturno, ciudad',
      description: 'Descripción · nota de estudio',
      story: 'Historia',
      save: 'GUARDAR',
      cancel: 'CANCELAR',
      delete: 'ELIMINAR',
      deleteConfirm: 'SÍ, ELIMINAR',
      image: 'Imagen de la obra (URL)',
      uploadFile: 'Subir archivo local',
      fileUploaded: 'Imagen guardada en el servidor',
      fileLoaded: 'Imagen cargada en el boceto',
      titleRequired: 'El título es obligatorio',
      created: 'Obra <b>{{title}}</b> añadida al archivo',
      updated: 'Obra <b>{{title}}</b> actualizada',
      deleted: 'Obra <b>{{title}}</b> eliminada',
      confirmTitle: 'ELIMINAR OBRA',
      confirmBody: '¿Eliminar <b>{{title}}</b>? Esta acción no se puede deshacer.',
      keep: 'CANCELAR',
      storageHint: 'Los cambios se guardan en este navegador (localStorage).'
    },

    /* títulos de la barra de estado cuando hay un nodo seleccionado */
    selection: {
      category: 'TÉCNICA · {{label}}',
      core: 'NÚCLEO DEL ARCHIVO'
    }
  };
})(window.CYBER = window.CYBER || {});
