#!/usr/bin/env node
/*
 * Prepara una instalación para un cliente (otro consultorio).
 *
 * Netlify lo ejecuta como "Build command":  node herramientas/configurar-cliente.js
 * y toma los datos de las variables de entorno del sitio (Site configuration →
 * Environment variables):
 *
 *   SUPABASE_URL          Project URL del Supabase del cliente (https://xxxx.supabase.co)
 *   SUPABASE_KEY          Clave pública "publishable" (sb_publishable_…) o "anon"
 *   CONSULTORIO_NOMBRE    Nombre que se muestra al abrir la app (por defecto "Mi Consultorio")
 *   CONSULTORIO_SUBTITULO Texto debajo del nombre (por defecto "Kinesiología y Fisiatría")
 *   COLOR_PRINCIPAL       Opcional, por ejemplo #1f6fb2
 *   COLOR_ACENTO          Opcional
 *   COLOR_BARRA           Opcional
 *
 * El cliente después puede subir su logo y cambiar los colores desde la app
 * (Ajustes → Marca y colores).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const env = process.env;

function fallar(msg) {
  console.error('\n[configurar-cliente] ERROR: ' + msg + '\n');
  process.exit(1);
}

function color(nombre, porDefecto) {
  const v = (env[nombre] || '').trim();
  if (!v) return porDefecto;
  if (!/^#[0-9a-f]{6}$/i.test(v)) fallar(nombre + ' tiene que ser un color del tipo #1f6fb2 (recibido: "' + v + '").');
  return v.toLowerCase();
}

const url = (env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const key = (env.SUPABASE_KEY || '').trim();
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) fallar('SUPABASE_URL no parece una URL de Supabase: "' + url + '".');
if (url && !key) fallar('Falta SUPABASE_KEY.');
if (key) {
  let payload = '';
  try { payload = Buffer.from((key.split('.')[1] || ''), 'base64').toString('utf8'); } catch (e) { /* no es JWT */ }
  if (/^sb_secret_/.test(key) || /service_role/.test(payload)) {
    fallar('SUPABASE_KEY es una clave SECRETA. Usá la clave pública ("publishable" o "anon").');
  }
}

const marca = {
  nombre: (env.CONSULTORIO_NOMBRE || 'Mi Consultorio').trim(),
  subtitulo: (env.CONSULTORIO_SUBTITULO !== undefined ? env.CONSULTORIO_SUBTITULO : 'Kinesiología y Fisiatría').trim(),
  nombrePartes: null,
  logo: '',
  simbolo: 'img/generico.svg',
  logoFondoOscuro: false,
  colores: {
    principal: color('COLOR_PRINCIPAL', '#1f6fb2'),
    acento: color('COLOR_ACENTO', '#2e8b57'),
    barra: color('COLOR_BARRA', '#0f2238')
  },
  proveedor: 'FisioCoreSalud'
};

const aviso = '/* Generado por herramientas/configurar-cliente.js. No editar a mano en las instalaciones de clientes. */\n';

fs.writeFileSync(path.join(raiz, 'js/config.js'),
  aviso + 'window.KF_CONFIG = ' + JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key }, null, 2) + ';\n');

fs.writeFileSync(path.join(raiz, 'js/marca.js'),
  aviso + 'window.KF_MARCA = ' + JSON.stringify(marca, null, 2) + ';\n');

const manifestPath = path.join(raiz, 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.name = marca.nombre + (marca.subtitulo ? ' · ' + marca.subtitulo : '');
manifest.short_name = marca.nombre.slice(0, 24);
manifest.description = marca.nombre + ': fichas de pacientes, historia clínica, turnos y pagos.';
manifest.background_color = marca.colores.barra;
manifest.theme_color = marca.colores.barra;
manifest.icons = [
  { src: 'img/generico-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'img/generico-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const indexPath = path.join(raiz, 'index.html');
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8')
  .replace('href="img/simbolo-180.png"', 'href="img/generico-180.png"')
  .replace(/<title>[^<]*<\/title>/, '<title>' + marca.nombre.replace(/[<&]/g, '') + '</title>'));

console.log('[configurar-cliente] Listo: "' + marca.nombre + '"' +
  (url ? ' conectado a ' + url : ' SIN nube (los datos quedan en cada dispositivo)') + '.');
