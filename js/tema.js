/*
 * Motor de colores: a partir de 3 colores de marca (principal, acento y barra)
 * calcula todas las variantes que usa el diseño y cuida que los textos se lean bien.
 * Se carga en el <head> para aplicar los colores antes de mostrar la página.
 */
window.KF = window.KF || {};

(function (KF) {
  'use strict';

  /* Colores de styles.css: con estos no hace falta calcular nada */
  const ORIGINALES = { principal: '#0b7f7c', acento: '#5f6e22', barra: '#000000' };
  const CACHE_KEY = 'kinesio_marca_cache';
  const VARS = ['--primary', '--primary-dark', '--primary-bright', '--primary-soft', '--primary-softer',
    '--olive', '--olive-dark', '--olive-light', '--olive-soft', '--black', '--black-2',
    '--side-fg', '--side-warn', '--side-error', '--tag-color', '--focus'];

  function hexValido(h) { return /^#[0-9a-f]{6}$/i.test(String(h || '')); }

  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hex(c) {
    return '#' + c.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'); }).join('');
  }

  /* Mezcla a con b: t = 0 → a, t = 1 → b */
  function mezclar(a, b, t) {
    const x = rgb(a);
    const y = rgb(b);
    return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; }));
  }

  function luminancia(h) {
    return rgb(h).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }

  function contraste(a, b) {
    const x = luminancia(a);
    const y = luminancia(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* Acerca el color a "hacia" hasta que contraste con "fondo" lo suficiente */
  function ajustar(color, fondo, hacia, minimo) {
    let c = color;
    for (let i = 0; i < 40 && contraste(c, fondo) < minimo; i++) c = mezclar(c, hacia, 0.06);
    return c;
  }

  function esClaro(h) { return luminancia(h) > 0.35; }

  function calcular(col) {
    const barra = col.barra;
    const clara = esClaro(barra);
    const sobreBarra = clara ? '#000000' : '#ffffff';
    const principal = ajustar(col.principal, '#ffffff', '#000000', 4.5);
    const acento = ajustar(col.acento, '#ffffff', '#000000', 4.5);
    const brillante = ajustar(col.principal, barra, sobreBarra, 4.5);
    const r = rgb(brillante);
    return {
      '--primary': principal,
      '--primary-dark': mezclar(principal, '#000000', 0.25),
      '--primary-bright': brillante,
      '--primary-soft': mezclar(principal, '#ffffff', 0.85),
      '--primary-softer': mezclar(principal, '#ffffff', 0.93),
      '--olive': acento,
      '--olive-dark': mezclar(acento, '#000000', 0.2),
      '--olive-light': ajustar(col.acento, barra, sobreBarra, 4.5),
      '--olive-soft': mezclar(acento, '#ffffff', 0.88),
      '--black': barra,
      '--black-2': mezclar(barra, clara ? '#000000' : '#ffffff', 0.07),
      '--side-fg': clara ? '#121616' : '#ffffff',
      '--side-warn': clara ? '#9a6200' : '#ffb74d',
      '--side-error': clara ? '#b3261e' : '#ff8a80',
      '--tag-color': brillante,
      '--focus': '0 0 0 3px rgba(' + r[0] + ', ' + r[1] + ', ' + r[2] + ', .45)'
    };
  }

  function coloresDe(marca) {
    const c = (marca && marca.colores) || {};
    return {
      principal: hexValido(c.principal) ? c.principal.toLowerCase() : ORIGINALES.principal,
      acento: hexValido(c.acento) ? c.acento.toLowerCase() : ORIGINALES.acento,
      barra: hexValido(c.barra) ? c.barra.toLowerCase() : ORIGINALES.barra
    };
  }

  function aplicarColores(marca) {
    const col = coloresDe(marca);
    const root = document.documentElement;
    const originales = col.principal === ORIGINALES.principal && col.acento === ORIGINALES.acento &&
      col.barra === ORIGINALES.barra;
    if (originales) {
      VARS.forEach(function (v) { root.style.removeProperty(v); });
    } else {
      const vars = calcular(col);
      Object.keys(vars).forEach(function (v) { root.style.setProperty(v, vars[v]); });
    }
    root.classList.toggle('barra-clara', esClaro(col.barra));
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', col.barra);
  }

  /* Marca de fábrica combinada con la personalizada desde la app */
  function efectiva(personalizada) {
    const base = window.KF_MARCA || {};
    const p = personalizada || {};
    const m = {
      nombre: p.nombre || base.nombre || 'Mi Consultorio',
      subtitulo: p.subtitulo !== undefined ? p.subtitulo : (base.subtitulo || ''),
      nombrePartes: base.nombrePartes || null,
      logo: p.logo !== undefined ? p.logo : (base.logo || ''),
      simbolo: p.simbolo !== undefined ? p.simbolo : (base.simbolo || ''),
      logoFondoOscuro: p.logoFondoOscuro !== undefined ? !!p.logoFondoOscuro : !!base.logoFondoOscuro,
      colores: Object.assign({}, base.colores || {}, p.colores || {}),
      proveedor: base.proveedor || ''
    };
    /* Las partes de color solo valen si el nombre sigue siendo el de fábrica */
    if (!m.nombrePartes || m.nombrePartes.join('') !== m.nombre) m.nombrePartes = null;
    return m;
  }

  function leerCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
  }

  function guardarCache(personalizada) {
    try {
      if (personalizada) localStorage.setItem(CACHE_KEY, JSON.stringify(personalizada));
      else localStorage.removeItem(CACHE_KEY);
    } catch (e) { /* sin espacio: no es grave */ }
  }

  KF.Tema = {
    ORIGINALES: ORIGINALES,
    calcular: calcular,
    contraste: contraste,
    esClaro: esClaro,
    hexValido: hexValido,
    coloresDe: coloresDe,
    aplicarColores: aplicarColores,
    efectiva: efectiva,
    leerCache: leerCache,
    guardarCache: guardarCache
  };

  /* Antes de mostrar nada: colores de la última marca usada en este dispositivo */
  aplicarColores(efectiva(leerCache()));
})(window.KF);
