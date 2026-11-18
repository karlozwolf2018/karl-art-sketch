/* ============================================================
   data/userdata.js — obras creadas/editas/eliminadas por el usuario
   Expone: CYBER.UserData
   ------------------------------------------------------------
   Como el sitio es estático, los cambios del usuario no tocan los
   archivos JSON: se guardan como "overrides" en localStorage y se
   superponen al dataset base en cada arranque.
   ============================================================ */
(function (CYBER) {
  'use strict';

  const KEY = 'neon-sketch:userdata:v1';

  function empty() {
    return { created: [], updated: {}, deleted: [] };
  }

  function normalize(data) {
    const out = empty();
    if (!data || typeof data !== 'object') return out;
    if (Array.isArray(data.created)) out.created = data.created;
    if (data.updated && typeof data.updated === 'object' && !Array.isArray(data.updated)) out.updated = data.updated;
    if (Array.isArray(data.deleted)) out.deleted = data.deleted;
    return out;
  }

  const UserData = {
    empty: empty,

    read() {
      try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? normalize(JSON.parse(raw)) : empty();
      } catch (err) {
        return empty();
      }
    },

    write(data) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(data));
      } catch (err) {
        /* almacenamiento no disponible */
      }
      if (CYBER.bus) CYBER.bus.emit(CYBER.EVENTS.USER_DATA_CHANGED, { count: UserData.count(data) });
    },

    /** Registra una obra nueva (raw, mismo formato que data/artworks.json). */
    add(raw) {
      const data = UserData.read();
      data.created.push(raw);
      UserData.write(data);
      return data;
    },

    /** Sustituye la versión de una obra por una edición del usuario. */
    update(id, raw) {
      const data = UserData.read();
      const createdIdx = data.created.findIndex(function (art) { return art.id === id; });
      if (createdIdx > -1) {
        data.created[createdIdx] = raw;
      } else {
        data.updated[id] = raw;
      }
      UserData.write(data);
      return data;
    },

    /** Marca una obra como eliminada. */
    remove(id) {
      const data = UserData.read();
      if (data.deleted.indexOf(id) === -1) data.deleted.push(id);
      delete data.updated[id];
      data.created = data.created.filter(function (art) { return art.id !== id; });
      UserData.write(data);
      return data;
    },

    reset() {
      UserData.write(empty());
      return empty();
    },

    count(data) {
      const d = data || UserData.read();
      return d.created.length + Object.keys(d.updated).length + d.deleted.length;
    }
  };

  CYBER.UserData = UserData;
})(window.CYBER = window.CYBER || {});
