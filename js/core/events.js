/* ============================================================
   core/events.js — bus de eventos mínimo (pub/sub)
   Expone: CYBER.bus  ·  CYBER.Events.createBus()
   ============================================================ */
(function (CYBER) {
  'use strict';

  /**
   * Crea un bus de eventos aislado.
   * @returns {{on:Function, once:Function, off:Function, emit:Function, clear:Function}}
   */
  function createBus() {
    const channels = Object.create(null);

    function listeners(type) {
      if (!channels[type]) channels[type] = [];
      return channels[type];
    }

    const bus = {
      /** Suscribe `fn` a `type`. Devuelve una función para desuscribirse. */
      on(type, fn) {
        listeners(type).push(fn);
        return function off() { bus.off(type, fn); };
      },

      /** Suscribe una sola vez. */
      once(type, fn) {
        function wrapper(payload) {
          bus.off(type, wrapper);
          fn(payload);
        }
        wrapper.__original = fn;
        return bus.on(type, wrapper);
      },

      /** Cancela una suscripción concreta (o todas si se omite `fn`). */
      off(type, fn) {
        if (!channels[type]) return;
        if (!fn) { delete channels[type]; return; }
        channels[type] = channels[type].filter(function (item) {
          return item !== fn && item.__original !== fn;
        });
      },

      /** Emite un evento; los errores de un oyente no rompen a los demás. */
      emit(type, payload) {
        const list = channels[type];
        if (!list || !list.length) return;
        list.slice().forEach(function (fn) {
          try {
            fn(payload);
          } catch (err) {
            // Un fallo en un módulo no debe tumbar la interfaz completa.
            console.error('[bus] fallo al manejar "' + type + '"', err);
          }
        });
      },

      /** Número de oyentes de un canal (diagnóstico). */
      count(type) {
        return channels[type] ? channels[type].length : 0;
      },

      /** Elimina todos los canales. */
      clear() {
        Object.keys(channels).forEach(function (key) { delete channels[key]; });
      }
    };

    return bus;
  }

  CYBER.Events = { createBus: createBus };
  CYBER.bus = createBus();

  /* Catálogo de eventos usados por la aplicación (documentación viva). */
  CYBER.EVENTS = {
    DATA_READY: 'data:ready',
    DATA_ERROR: 'data:error',
    LOCALE_CHANGED: 'locale:changed',
    FILTERS_CHANGED: 'filters:changed',
    VIEW_CHANGED: 'view:changed',
    NODE_SELECT: 'node:select',
    NODE_HOVER: 'node:hover',
    GRAPH_TICK: 'graph:tick',
    GRAPH_STATS: 'graph:stats',
    ARTWORK_REQUEST: 'artwork:request',
    ARTWORK_OPEN: 'artwork:open',
    ARTWORK_CLOSE: 'artwork:close',
    FAVORITES_CHANGED: 'favorites:changed',
    THEME_CHANGED: 'theme:changed',
    USER_DATA_CHANGED: 'userdata:changed',
    EDITOR_OPEN_NEW: 'editor:open-new',
    EDITOR_OPEN_EDIT: 'editor:open-edit',
    ARTWORK_DELETE: 'artwork:delete',
    TOAST: 'ui:toast',
    ZOOM_CHANGED: 'graph:zoom',
    LAYOUT_RESET: 'graph:layout-reset',
    ADMIN_CHANGED: 'admin:changed'
  };
})(window.CYBER = window.CYBER || {});
