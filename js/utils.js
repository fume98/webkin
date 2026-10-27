/* Utilidades generales: fechas, formato, escapes e íconos */
window.KF = window.KF || {};

(function (KF) {
  'use strict';

  const U = {};

  U.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  U.esc = function (value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /* Texto multilínea seguro */
  U.nl2br = function (value) {
    return U.esc(value).replace(/\n/g, '<br>');
  };

  U.pad = function (n) {
    return String(n).padStart(2, '0');
  };

  /* Fecha local en formato YYYY-MM-DD */
  U.toISODate = function (date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };

  U.today = function () {
    return U.toISODate(new Date());
  };

  U.nowTime = function () {
    const d = new Date();
    return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };

  U.parseDate = function (iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  U.addDays = function (iso, days) {
    const d = U.parseDate(iso);
    d.setDate(d.getDate() + days);
    return U.toISODate(d);
  };

  /* Lunes de la semana de la fecha dada */
  U.startOfWeek = function (iso) {
    const d = U.parseDate(iso);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return U.toISODate(d);
  };

  U.DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  U.DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  U.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  U.cap = function (s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  };

  /* 03/10/2026 */
  U.fmtDate = function (iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  };

  /* Viernes 3 de octubre */
  U.fmtDateLong = function (iso, withYear) {
    if (!iso) return '';
    const d = U.parseDate(iso);
    let s = U.cap(U.DIAS[d.getDay()]) + ' ' + d.getDate() + ' de ' + U.MESES[d.getMonth()];
    if (withYear) s += ' de ' + d.getFullYear();
    return s;
  };

  U.fmtMonth = function (ym) {
    const [y, m] = ym.split('-').map(Number);
    return U.cap(U.MESES[m - 1]) + ' ' + y;
  };

  U.fmtMoney = function (n) {
    const num = Number(n) || 0;
    return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  U.age = function (iso) {
    if (!iso) return null;
    const b = U.parseDate(iso);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  };

  U.timeToMin = function (t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  U.minToTime = function (min) {
    return U.pad(Math.floor(min / 60) % 24) + ':' + U.pad(min % 60);
  };

  /* Normaliza para búsquedas: sin tildes y en minúsculas */
  U.norm = function (s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  };

  U.initials = function (p) {
    return ((p.nombre || '').charAt(0) + (p.apellido || '').charAt(0)).toUpperCase() || '?';
  };

  U.fullName = function (p) {
    if (!p) return 'Paciente eliminado';
    return [p.apellido, p.nombre].filter(Boolean).join(', ');
  };

  /* Arma el número para WhatsApp (Argentina por defecto) */
  U.waPhone = function (tel) {
    let d = String(tel || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('54')) {
      if (!d.startsWith('549')) d = '549' + d.slice(2);
      return d;
    }
    if (d.startsWith('0')) d = d.slice(1);
    return '549' + d;
  };

  U.waLink = function (tel, text) {
    const num = U.waPhone(tel);
    if (!num) return '';
    return 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  U.download = function (filename, content, type) {
    const blob = new Blob([content], { type: type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  };

  /* Íconos SVG de trazo (estilo lineal) */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 2 4.5 5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    wallet: '<rect x="2.5" y="6" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><circle cx="16.5" cy="15" r="1.3"/><path d="M5 6l10-3.5 1.5 3.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    whatsapp: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.8-2-1-1 1c-1.2-.5-2.2-1.5-2.7-2.7l1-1-1-2L9 8.5z"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    clip: '<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3"/>',
    camera: '<path d="M3 8.5A2 2 0 0 1 5 6.5h2.5L9 4h6l1.5 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
    cloudOff: '<path d="M3 3l18 18M8 7.4A6 6 0 0 1 17.7 10H18a4 4 0 0 1 2.3 7.3M16 19H7a5 5 0 0 1-1.5-9.8"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.2v.3"/>',
    columna: '<rect x="9" y="2.5" width="6" height="3.5" rx="1.2"/><rect x="8.5" y="7.5" width="7" height="3.5" rx="1.2"/><rect x="8" y="12.5" width="8" height="3.5" rx="1.2"/><rect x="8.5" y="17.5" width="7" height="4" rx="1.5"/>',
    heart: '<path d="M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z"/>',
    dollar: '<path d="M12 2.5v19M16.5 6.5c-.8-1.3-2.5-2-4.5-2-2.6 0-4.5 1.3-4.5 3.3 0 4.7 9.5 2.4 9.5 7.4 0 2-2 3.3-4.8 3.3-2.2 0-4-.8-5-2.3"/>',
    logo: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v7M12 14.5l-3.5 6.5M12 14.5l3.5 6.5M6 10.5l6-1.5 6 1.5"/>'
  };

  U.icon = function (name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || '') + '</svg>';
  };

  /* Construye <option> a partir de una lista */
  U.options = function (list, selected) {
    return list.map(function (o) {
      const val = typeof o === 'string' ? o : o.value;
      const label = typeof o === 'string' ? o : o.label;
      return '<option value="' + U.esc(val) + '"' + (String(val) === String(selected) ? ' selected' : '') + '>' +
        U.esc(label) + '</option>';
    }).join('');
  };

  KF.U = U;
})(window.KF);
