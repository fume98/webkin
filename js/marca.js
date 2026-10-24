/*
 * Marca de esta instalación: nombre, logo y colores.
 *
 * Son los valores de fábrica. Cada consultorio puede cambiarlos desde la app
 * (Ajustes → Marca y colores) sin tocar este archivo.
 * Para instalaciones de clientes, este archivo lo genera
 * herramientas/configurar-cliente.js a partir de las variables de Netlify.
 */
window.KF_MARCA = {
  nombre: 'FisioCoreSalud',
  subtitulo: 'Quiropraxia · Cuerpo Vital',
  /* Opcional: el nombre en partes, cada una con un color de la marca */
  nombrePartes: ['Fisio', 'Core', 'Salud'],
  logo: 'img/logo.webp',
  simbolo: 'img/simbolo.webp',
  /* true si el logo tiene fondo negro (se funde con la barra oscura) */
  logoFondoOscuro: true,
  colores: {
    principal: '#0b7f7c',
    acento: '#5f6e22',
    barra: '#000000'
  },
  /* Quién desarrolla y licencia el software (no editable desde la app) */
  proveedor: 'FisioCoreSalud'
};
