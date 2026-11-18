/* ============================================================
   core/store.js — estado central observable + preferencias
   Expone: CYBER.createStore(estadoInicial) · CYBER.store
   ============================================================ */
(function (CYBER) {
  'use strict';

  const PREF_KEY = 'neon-sketch:prefs:v1';

  /**
   * Crea un almacén de estado simple con notificación por lotes.
   * @param {object} initial
   */
  function createStore(initial) {
    let state = Object.assign({}, initial);
    const listeners = [];
    let scheduled = false;
    let pending = Object.create(null);

    function notify() {
      scheduled = false;
      const changes = pending;
      pending = Object.create(null);
      listeners.slice().forEach(function (fn) {
        try {
          fn(state, changes);
        } catch (err) {
          console.error('[store] oyente con error', err);
        }
      });
    }

    function scheduleChange(key) {
      pending[key] = true;
      if (scheduled) return;
      scheduled = true;
      // micro-tarea: agrupa varias escrituras del mismo tick
      Promise.resolve().then(notify);
    }

    const store = {
      /** Devuelve una copia superficial del estado completo. */
      get() { return state; },

      /** Lee una clave. */
      pick(key) { return state[key]; },

      /** Escribe una clave y programa la notificación. */
      set(key, value) {
        if (state[key] === value) return value;
        state[key] = value;
        scheduleChange(key);
        return value;
      },

      /** Mezcla varias claves de golpe. */
      patch(partial) {
        Object.keys(partial).forEach(function (key) {
          if (state[key] !== partial[key]) {
            state[key] = partial[key];
            scheduleChange(key);
          }
        });
        return state;
      },

      /** Actualiza mediante función pura: store.update(s => ({...})) */
      update(fn) {
        const next = fn(Object.assign({}, state));
        if (next) store.patch(next);
        return state;
      },

      /** Suscribe a cambios. Devuelve función de baja. */
      subscribe(fn) {
        listeners.push(fn);
        return function unsubscribe() {
          const idx = listeners.indexOf(fn);
          if (idx > -1) listeners.splice(idx, 1);
        };
      },

      /** Fuerza la notificación (útil tras mutaciones profundas). */
      touch(key) {
        scheduleChange(key || '*');
      },

      /** Reinicia a los valores iniciales. */
      reset() {
        state = Object.assign({}, initial);
        store.touch('*');
      }
    };

    return store;
  }

  /* ---------- preferencias persistentes (tema, CRT, física…) ---------- */
  const Prefs = {
    defaults: {
      crt: true,
      physics: true,
      theme: 'light',
      locale: 'es',
      view: 'graph',
      sidebarOpen: true
    },

    read() {
      try {
        const raw = window.localStorage.getItem(PREF_KEY);
        if (!raw) return Object.assign({}, Prefs.defaults);
        return Object.assign({}, Prefs.defaults, JSON.parse(raw));
      } catch (err) {
        console.warn('[prefs] no se pudieron leer las preferencias', err);
        return Object.assign({}, Prefs.defaults);
      }
    },

    write(prefs) {
      try {
        window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
      } catch (err) {
        /* modo privado o almacenamiento lleno: se ignora en silencio */
      }
    }
  };

  /* ---------- estado raíz de la aplicación ---------- */
  const prefs = Prefs.read();

  CYBER.Prefs = Prefs;
  CYBER.createStore = createStore;
  CYBER.store = createStore({
    /* datos */
    config: null,
    categories: [],
    artworks: [],
    nodes: [],
    edges: [],
    source: 'pendiente',

    /* interfaz */
    view: prefs.view,
    crt: prefs.crt,
    physics: prefs.physics,
    theme: prefs.theme,
    locale: prefs.locale,
    sidebarOpen: prefs.sidebarOpen,
    zoom: 1,
    fps: 0,
    loading: true,

    /* filtros */
    filters: {
      categories: [],   // ids activos; vacío = todas
      tags: [],         // etiquetas activas
      query: '',
      onlyFavorites: false,
      onlyAvailable: false
    },

    /* selección */
    selectedId: null,
    hoveredId: null,
    openArtworkId: null
  });
})(window.CYBER = window.CYBER || {});
