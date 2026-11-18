/* ============================================================
   utils/format.js — formateo de textos, cifras y fechas
   Expone: CYBER.Fmt
   ------------------------------------------------------------
   Depende de CYBER.I18n: plurales, tiempos, cifras y fechas
   salen siempre en el idioma activo.
   ============================================================ */
(function (CYBER) {
  'use strict';

  function t(key, vars) {
    return CYBER.I18n ? CYBER.I18n.t(key, vars) : key;
  }

  function has(key) {
    return CYBER.I18n ? CYBER.I18n.has(key) : false;
  }

  function pad(value, size) {
    let out = String(value);
    while (out.length < (size || 2)) out = '0' + out;
    return out;
  }

  /** 450 -> "7 h 30 min" (es) · "7h 30m" (en) */
  function minutes(total) {
    const value = Math.max(0, Math.round(Number(total) || 0));
    const h = Math.floor(value / 60);
    const m = value % 60;
    if (!h) return t('formats.minutesOnly', { m: m });
    if (!m) return t('formats.hoursOnly', { h: h });
    return t('formats.minutes', { h: h, m: pad(m) });
  }

  /** 450 -> 7.5 */
  function hours(total) {
    return Math.round(((Number(total) || 0) / 60) * 10) / 10;
  }

  /** "art-001" -> "ART·001", "user-001" -> "Karl Art Bocetos · 001" */
  function code(id) {
    var str = String(id || '');
    if (/^user\b[-_\s·]*/i.test(str)) {
      var rest = str.replace(/^user\b[-_\s·]*/i, '').trim();
      return rest ? 'Karl Art Bocetos · ' + rest : 'Karl Art Bocetos';
    }
    return str
      .toUpperCase()
      .replace(/[-_]+/g, '·');
  }

  /** Número de obra a partir del id: art-007 -> 7 */
  function index(id) {
    const match = String(id || '').match(/(\d+)\s*$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function number(value) {
    return CYBER.I18n ? CYBER.I18n.number(value) : String(value);
  }

  function percent(value, digits) {
    return (Number(value) * 100).toFixed(digits === undefined ? 0 : digits) + '%';
  }

  function slug(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function year(value) {
    const match = String(value || '').match(/\d{4}/);
    return match ? match[0] : String(value || '');
  }

  function dateLong(value) {
    return CYBER.I18n ? CYBER.I18n.date(value) : String(value || '');
  }

  function clock(date) {
    const d = date || new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /** Estado de disponibilidad en el idioma activo. */
  function status(value) {
    const key = 'status.' + String(value || '');
    return has(key) ? t(key) : t('status.desconocido');
  }

  function truncate(text, max) {
    const value = String(text || '');
    if (value.length <= max) return value;
    const cut = value.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  /** Plurales sencillos a partir de dos claves del diccionario. */
  function plural(count, singularKey, pluralKey) {
    return t(count === 1 ? singularKey : (pluralKey || singularKey), { count: count });
  }

  CYBER.Fmt = {
    pad: pad,
    minutes: minutes,
    hours: hours,
    code: code,
    index: index,
    number: number,
    percent: percent,
    slug: slug,
    year: year,
    dateLong: dateLong,
    clock: clock,
    status: status,
    truncate: truncate,
    plural: plural,
    t: t
  };
})(window.CYBER = window.CYBER || {});
