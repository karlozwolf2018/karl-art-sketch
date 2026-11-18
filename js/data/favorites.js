/* ============================================================
   data/favorites.js — favoritos persistidos en localStorage
   Expone: CYBER.Favorites
   ============================================================ */
(function (CYBER) {
  'use strict';

  const KEY = 'neon-sketch:favorites:v1';
  let ids = read();

  function read() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function write() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(ids));
    } catch (err) {
      /* almacenamiento no disponible */
    }
    if (CYBER.bus) {
      CYBER.bus.emit(CYBER.EVENTS.FAVORITES_CHANGED, { ids: ids.slice(), count: ids.length });
    }
  }

  const Favorites = {
    has(id) { return ids.indexOf(id) > -1; },

    toggle(id) {
      if (Favorites.has(id)) {
        ids = ids.filter(function (item) { return item !== id; });
        write();
        return false;
      }
      ids = ids.concat([id]);
      write();
      return true;
    },

    add(id) { if (!Favorites.has(id)) { ids = ids.concat([id]); write(); } },

    remove(id) { if (Favorites.has(id)) { ids = ids.filter(function (item) { return item !== id; }); write(); } },

    clear() { ids = []; write(); },

    list() { return ids.slice(); },

    count() { return ids.length; }
  };

  CYBER.Favorites = Favorites;
})(window.CYBER = window.CYBER || {});
