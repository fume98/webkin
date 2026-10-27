/* Base de datos en la nube (Supabase): ingreso, sincronización y cambios en vivo */
(function (KF) {
  'use strict';

  const U = KF.U;
  const S = KF.Store;

  const CFG_KEY = 'kinesio_nube_config';
  const PEND_KEY = 'kinesio_nube_pendientes';
  const META_KEY = 'kinesio_nube_meta';
  const SEP = '\u0001';
  const LOTE = 200;

  const N = {};
  let client = null;
  let usuario = null;          /* email de la sesión */
  let snapshot = {};           /* lo que la nube ya tiene: clave -> JSON canónico */
  let pendientes = {};         /* cambios locales sin subir: clave -> registro */
  let ultimaSync = '';         /* mayor "actualizado" recibido */
  let enviando = false;
  let timerEnvio = null;
  let timerReintento = null;
  let canal = null;
  let alListo = null;
  let estado = { tipo: 'local', detalle: '' };
  let oyentes = [];

  /* ================= Configuración ================= */
  N.config = function () {
    const c = window.KF_CONFIG || {};
    if (c.supabaseUrl && c.supabaseAnonKey) return { url: c.supabaseUrl, key: c.supabaseAnonKey, origen: 'archivo' };
    try {
      const l = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
      if (l && l.url && l.key) return { url: l.url, key: l.key, origen: 'dispositivo' };
    } catch (e) { /* configuración dañada: se ignora */ }
    return null;
  };

  N.activa = function () { return !!N.config(); };

  N.validarUrl = function (url) {
    return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(String(url || '').trim());
  };

  N.guardarConfig = function (url, key) {
    localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim().replace(/\/$/, ''), key: key.trim() }));
  };

  N.usuario = function () { return usuario; };
  /* Cliente de Supabase con sesión iniciada (lo usan los archivos adjuntos) */
  N.cliente = function () { return client && usuario && S.esModoNube() ? client : null; };
  N.estado = function () { return estado; };
  N.pendientes = function () { return Object.keys(pendientes).length; };
  N.alCambiarEstado = function (fn) { oyentes.push(fn); };

  function setEstado(tipo, detalle) {
    estado = { tipo: tipo, detalle: detalle || '' };
    oyentes.forEach(function (fn) { try { fn(estado); } catch (e) { console.error(e); } });
  }

  /* ================= Utilidades ================= */
  /* JSON con claves ordenadas: así un mismo registro siempre se compara igual */
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; })
        .map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }

  function clave(col, id) { return col + SEP + id; }

  /* Los datos locales expresados como registros de la nube */
  function registrosLocales() {
    const d = S.datos();
    const out = {};
    S.COLECCIONES.forEach(function (col) {
      d[col].forEach(function (rec) { if (rec && rec.id) out[clave(col, rec.id)] = { c: col, id: rec.id, data: rec }; });
    });
    const consultorio = {};
    Object.keys(d.settings).forEach(function (k) {
      if (S.DEVICE_KEYS.indexOf(k) < 0) consultorio[k] = d.settings[k];
    });
    out[clave('consultorio', 'ajustes')] = { c: 'consultorio', id: 'ajustes', data: consultorio };
    return out;
  }

  function guardarPendientes() {
    try {
      localStorage.setItem(PEND_KEY, JSON.stringify({ email: usuario, items: pendientes }));
      localStorage.setItem(META_KEY, JSON.stringify({ email: usuario, ultimaSync: ultimaSync }));
    } catch (e) { console.error(e); }
  }

  function leer(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function mensajeError(err) {
    const m = String((err && (err.message || err.error_description || err.msg)) || err || '');
    if (/invalid login credentials/i.test(m)) return 'Email o contraseña incorrectos.';
    if (/email not confirmed/i.test(m)) return 'Todavía no confirmaste tu email. Revisá tu correo (también la carpeta de spam).';
    if (/already registered|already been registered/i.test(m)) return 'Ese email ya tiene una cuenta. Ingresá con tu contraseña.';
    if (/password should be at least|at least 6/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
    if (/signups not allowed|signup is disabled/i.test(m)) return 'La creación de cuentas está desactivada en Supabase.';
    if (/fetch|network|load failed|timeout/i.test(m)) return 'No hay conexión con el servidor. Revisá internet y probá de nuevo.';
    return m || 'Ocurrió un error inesperado.';
  }
  N.mensajeError = mensajeError;

  function esErrorDeRed(err) {
    return !navigator.onLine || /fetch|network|load failed|timeout/i.test(String((err && err.message) || err || ''));
  }

  /* ================= Pantalla de ingreso ================= */
  function pantalla(html) {
    const scr = document.getElementById('nube-screen');
    scr.hidden = false;
    scr.querySelector('.nube-content').innerHTML = html;
    const first = scr.querySelector('input');
    if (first && window.matchMedia('(pointer:fine)').matches) first.focus();
    return scr;
  }

  function ocultarPantalla() {
    document.getElementById('nube-screen').hidden = true;
  }

  function campo(name, label, type, extra) {
    return '<label class="nube-field"><span>' + label + '</span>' +
      '<input name="' + name + '" type="' + type + '" required ' + (extra || '') + '></label>';
  }

  function aviso(scr, msg, tipo) {
    const el = scr.querySelector('.nube-msg');
    el.textContent = msg || '';
    el.className = 'nube-msg ' + (tipo || 'error');
  }

  function cargando(texto) {
    pantalla('<div class="nube-loading"><span class="spinner" aria-hidden="true"></span><p>' + U.esc(texto) + '</p></div>');
  }

  function redirigirA() {
    return location.href.split('#')[0];
  }

  function mostrarLogin(msg, tipo) {
    const cfg = N.config();
    const scr = pantalla(
      '<h1>Ingresá a tu cuenta</h1>' +
      '<form class="nube-form" novalidate>' +
        campo('email', 'Email', 'email', 'autocomplete="username" inputmode="email"') +
        campo('password', 'Contraseña', 'password', 'autocomplete="current-password"') +
        '<p class="nube-msg" role="alert"></p>' +
        '<button type="submit" class="btn btn-primary btn-lg nube-btn">Ingresar</button>' +
      '</form>' +
      '<div class="nube-links">' +
        '<button type="button" class="linklike" data-ir="registro">Crear una cuenta</button>' +
        '<button type="button" class="linklike" data-ir="recuperar">¿Olvidaste tu contraseña?</button>' +
        (cfg && cfg.origen === 'dispositivo'
          ? '<button type="button" class="linklike muted-link" data-ir="desconectar">Dejar de usar la nube en este dispositivo</button>' : '') +
      '</div>');
    if (msg) aviso(scr, msg, tipo);
    enlaces(scr);
    scr.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const f = ev.target;
      const email = f.email.value.trim().toLowerCase();
      const pass = f.password.value;
      if (!email || !pass) { aviso(scr, 'Completá el email y la contraseña.'); return; }
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      aviso(scr, 'Ingresando…', 'info');
      client.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
        btn.disabled = false;
        if (r.error) { aviso(scr, mensajeError(r.error)); return; }
        entrar(r.data.user);
      }).catch(function (e) { btn.disabled = false; aviso(scr, mensajeError(e)); });
    });
  }

  function mostrarRegistro() {
    const scr = pantalla(
      '<h1>Crear una cuenta</h1>' +
      '<p class="nube-sub">Después de crearla, alguien del consultorio tiene que darte acceso (salvo que seas la primera persona).</p>' +
      '<form class="nube-form" novalidate>' +
        campo('email', 'Email', 'email', 'autocomplete="username" inputmode="email"') +
        campo('password', 'Contraseña (mínimo 6 caracteres)', 'password', 'autocomplete="new-password" minlength="6"') +
        campo('password2', 'Repetí la contraseña', 'password', 'autocomplete="new-password" minlength="6"') +
        '<p class="nube-msg" role="alert"></p>' +
        '<button type="submit" class="btn btn-primary btn-lg nube-btn">Crear cuenta</button>' +
      '</form>' +
      '<div class="nube-links"><button type="button" class="linklike" data-ir="login">Ya tengo cuenta</button></div>');
    enlaces(scr);
    scr.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const f = ev.target;
      const email = f.email.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { aviso(scr, 'Ingresá un email válido.'); return; }
      if (f.password.value.length < 6) { aviso(scr, 'La contraseña debe tener al menos 6 caracteres.'); return; }
      if (f.password.value !== f.password2.value) { aviso(scr, 'Las contraseñas no coinciden.'); return; }
      aviso(scr, 'Creando cuenta…', 'info');
      client.auth.signUp({ email: email, password: f.password.value, options: { emailRedirectTo: redirigirA() } })
        .then(function (r) {
          if (r.error) { aviso(scr, mensajeError(r.error)); return; }
          if (r.data.session) { entrar(r.data.user); return; }
          mostrarLogin('Listo. Te enviamos un email a ' + email + ' para confirmar la cuenta. Confirmala y después ingresá acá.', 'ok');
        }).catch(function (e) { aviso(scr, mensajeError(e)); });
    });
  }

  function mostrarRecuperar() {
    const scr = pantalla(
      '<h1>Recuperar contraseña</h1>' +
      '<p class="nube-sub">Te mandamos un email con un enlace para elegir una contraseña nueva.</p>' +
      '<form class="nube-form" novalidate>' +
        campo('email', 'Email', 'email', 'autocomplete="username" inputmode="email"') +
        '<p class="nube-msg" role="alert"></p>' +
        '<button type="submit" class="btn btn-primary btn-lg nube-btn">Enviar email</button>' +
      '</form>' +
      '<div class="nube-links"><button type="button" class="linklike" data-ir="login">Volver</button></div>');
    enlaces(scr);
    scr.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const email = ev.target.email.value.trim().toLowerCase();
      if (!email) { aviso(scr, 'Ingresá tu email.'); return; }
      aviso(scr, 'Enviando…', 'info');
      client.auth.resetPasswordForEmail(email, { redirectTo: redirigirA() }).then(function (r) {
        if (r.error) { aviso(scr, mensajeError(r.error)); return; }
        mostrarLogin('Si el email tiene una cuenta, te llegó un enlace para cambiar la contraseña.', 'ok');
      }).catch(function (e) { aviso(scr, mensajeError(e)); });
    });
  }

  function mostrarNuevaClave() {
    const scr = pantalla(
      '<h1>Elegí tu contraseña nueva</h1>' +
      '<form class="nube-form" novalidate>' +
        campo('password', 'Contraseña nueva (mínimo 6 caracteres)', 'password', 'autocomplete="new-password" minlength="6"') +
        campo('password2', 'Repetila', 'password', 'autocomplete="new-password" minlength="6"') +
        '<p class="nube-msg" role="alert"></p>' +
        '<button type="submit" class="btn btn-primary btn-lg nube-btn">Guardar contraseña</button>' +
      '</form>');
    scr.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const f = ev.target;
      if (f.password.value.length < 6) { aviso(scr, 'La contraseña debe tener al menos 6 caracteres.'); return; }
      if (f.password.value !== f.password2.value) { aviso(scr, 'Las contraseñas no coinciden.'); return; }
      client.auth.updateUser({ password: f.password.value }).then(function (r) {
        if (r.error) { aviso(scr, mensajeError(r.error)); return; }
        entrar(r.data.user);
      }).catch(function (e) { aviso(scr, mensajeError(e)); });
    });
  }

  function mostrarSinAcceso(email) {
    const scr = pantalla(
      '<h1>Tu cuenta todavía no tiene acceso</h1>' +
      '<p class="nube-sub">Ingresaste como <strong>' + U.esc(email) + '</strong>. Pedile a alguien del consultorio que agregue ' +
        'este email en <strong>Ajustes → Usuarios con acceso</strong>, y después tocá "Volver a intentar".</p>' +
      '<div class="nube-actions">' +
        '<button type="button" class="btn btn-primary btn-lg" data-ir="reintentar">Volver a intentar</button>' +
        '<button type="button" class="btn btn-ghost on-dark" data-ir="salir">Cerrar sesión</button>' +
      '</div>');
    enlaces(scr);
  }

  function mostrarErrorConexion(err, hayCache) {
    const scr = pantalla(
      '<h1>No se pudo conectar</h1>' +
      '<p class="nube-sub">' + U.esc(mensajeError(err)) + '</p>' +
      '<div class="nube-actions">' +
        '<button type="button" class="btn btn-primary btn-lg" data-ir="reintentar">Reintentar</button>' +
        (hayCache ? '<button type="button" class="btn btn-ghost on-dark" data-ir="offline">Trabajar sin conexión</button>' : '') +
      '</div>' +
      (hayCache ? '<p class="nube-sub small">Sin conexión vas a ver los datos de la última vez. Lo que cargues se sube solo cuando vuelva internet.</p>' : ''));
    enlaces(scr);
  }

  function enlaces(scr) {
    scr.querySelectorAll('[data-ir]').forEach(function (b) {
      b.addEventListener('click', function () {
        const ir = b.dataset.ir;
        if (ir === 'registro') mostrarRegistro();
        else if (ir === 'recuperar') mostrarRecuperar();
        else if (ir === 'login') mostrarLogin();
        else if (ir === 'salir') N.cerrarSesion(true);
        else if (ir === 'reintentar') location.reload();
        else if (ir === 'offline') arrancarSinConexion();
        else if (ir === 'desconectar') N.desconectarDispositivo();
      });
    });
  }

  /* ================= Arranque ================= */
  /* Llama a listo() cuando la app puede mostrarse (en modo local, enseguida) */
  N.arrancar = function (listo) {
    alListo = listo;
    const cfg = N.config();
    if (!cfg) { setEstado('local'); listo(); return; }

    const pend = leer(PEND_KEY);
    if (pend && pend.items) { pendientes = pend.items; usuario = pend.email; }

    if (!window.supabase || !window.supabase.createClient) {
      /* La librería no cargó (sin internet al abrir) */
      if (S.cacheNube()) { arrancarSinConexion(); return; }
      mostrarErrorConexion(new Error('network'), false);
      return;
    }

    /* Enlace de "cambiar contraseña" recibido por email */
    let recuperando = /type=recovery/.test(location.hash);

    client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'kinesio_nube_sesion' }
    });

    client.auth.onAuthStateChange(function (evento) {
      if (evento === 'PASSWORD_RECOVERY') { recuperando = true; mostrarNuevaClave(); }
    });

    cargando('Conectando…');
    client.auth.getSession().then(function (r) {
      if (recuperando) { mostrarNuevaClave(); return; }
      const sesion = r.data && r.data.session;
      if (sesion) entrar(sesion.user);
      else if (!navigator.onLine && S.cacheNube()) arrancarSinConexion();
      else mostrarLogin();
    }).catch(function (e) {
      if (S.cacheNube()) mostrarErrorConexion(e, true);
      else mostrarErrorConexion(e, false);
    });

    window.addEventListener('online', function () { if (client && usuario && S.esModoNube()) { suscribir(); ponerseAlDia(); enviar(); } });
    window.addEventListener('offline', function () { if (usuario) setEstado('offline'); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && client && usuario && estado.tipo !== 'local') ponerseAlDia();
    });
    setInterval(function () { if (client && usuario && navigator.onLine) { ponerseAlDia(); enviar(); } }, 120000);
  };

  function arrancarSinConexion() {
    const meta = leer(META_KEY) || {};
    usuario = meta.email || usuario;
    ultimaSync = meta.ultimaSync || '';
    S.activarNube(S.cacheNube());
    /* La copia local refleja lo último que se supo de la nube más los cambios pendientes */
    snapshot = {};
    const locales = registrosLocales();
    Object.keys(locales).forEach(function (k) { if (!pendientes[k]) snapshot[k] = canon(locales[k].data); });
    setEstado('offline');
    if (client) suscribir();
    ocultarPantalla();
    if (alListo) { const f = alListo; alListo = null; f(); }
  }

  function entrar(user) {
    const email = String((user && user.email) || '').toLowerCase();
    /* Limpia de la dirección los datos del enlace de confirmación */
    if (/access_token|type=/.test(location.hash)) {
      history.replaceState(null, '', location.pathname + location.search + '#/inicio');
    }
    if (usuario && usuario !== email) pendientes = {}; /* pendientes de otra cuenta: no se mezclan */
    usuario = email;
    cargando('Verificando acceso…');
    client.rpc('reclamar_acceso_inicial').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) { mostrarSinAcceso(email); return; }
      return cargarTodo();
    }).catch(function (e) {
      const meta = leer(META_KEY);
      const hayCache = !!(S.cacheNube() && meta && meta.email === email);
      if (esErrorDeRed(e) && hayCache) { arrancarSinConexion(); return; }
      mostrarErrorConexion(e, hayCache);
    });
  }

  /* Trae todos los registros de a páginas */
  function traerTodo() {
    const filas = [];
    function pagina(desde) {
      return client.from('registros').select('coleccion,id,data,borrado,actualizado')
        .order('coleccion').order('id').range(desde, desde + 999)
        .then(function (r) {
          if (r.error) throw r.error;
          Array.prototype.push.apply(filas, r.data);
          return r.data.length === 1000 ? pagina(desde + 1000) : filas;
        });
    }
    return pagina(0);
  }

  function armarDatos(filas) {
    const d = { settings: {}, profesionales: [], pacientes: [], turnos: [], evoluciones: [], pagos: [] };
    snapshot = {};
    ultimaSync = '';
    filas.forEach(function (f) {
      if (f.actualizado > ultimaSync) ultimaSync = f.actualizado;
      if (f.borrado) return;
      snapshot[clave(f.coleccion, f.id)] = canon(f.data);
      if (f.coleccion === 'consultorio') d.settings = f.data;
      else if (d[f.coleccion]) d[f.coleccion].push(f.data);
    });
    /* Cambios hechos sin conexión que todavía no se subieron */
    Object.keys(pendientes).forEach(function (k) {
      const p = pendientes[k];
      if (p.c === 'consultorio') { if (!p.borrado) d.settings = p.data; return; }
      const list = d[p.c];
      if (!list) return;
      const idx = list.findIndex(function (x) { return x.id === p.id; });
      if (p.borrado) { if (idx >= 0) list.splice(idx, 1); }
      else if (idx >= 0) list[idx] = p.data;
      else list.push(p.data);
    });
    return d;
  }

  function cargarTodo() {
    cargando('Cargando datos del consultorio…');
    return traerTodo().then(function (filas) {
      const vacia = !filas.length && !Object.keys(pendientes).length;
      const locales = S.datosLocales();
      const hayLocales = locales && (locales.pacientes.length || locales.turnos.length);
      if (vacia && hayLocales) { ofrecerSubida(locales); return; }
      iniciar(armarDatos(filas));
    });
  }

  function ofrecerSubida(locales) {
    const scr = pantalla(
      '<h1>La nube está vacía</h1>' +
      '<p class="nube-sub">En este dispositivo hay <strong>' + locales.pacientes.length + ' pacientes</strong>, ' +
        locales.turnos.length + ' turnos y ' + locales.pagos.length + ' pagos cargados. ¿Querés subirlos a la nube para ' +
        'que los vean todos los profesionales?</p>' +
      '<div class="nube-actions">' +
        '<button type="button" class="btn btn-primary btn-lg" data-sub="si">Sí, subir mis datos</button>' +
        '<button type="button" class="btn btn-ghost on-dark" data-sub="no">No, empezar de cero</button>' +
      '</div>');
    scr.querySelectorAll('[data-sub]').forEach(function (b) {
      b.addEventListener('click', function () {
        snapshot = {};
        iniciar(b.dataset.sub === 'si' ? locales : null);
      });
    });
  }

  function iniciar(datos) {
    S.activarNube(datos);
    /* Sube lo que falte (pendientes, datos migrados o el profesional inicial) */
    N.alGuardar();
    suscribir();
    setEstado(N.pendientes() ? 'guardando' : 'ok');
    ocultarPantalla();
    if (alListo) { const f = alListo; alListo = null; f(); }
    else if (KF.App) KF.App.refresh();
  }

  /* ================= Envío de cambios ================= */
  /* Se llama cada vez que la app guarda: detecta qué cambió y lo sube */
  N.alGuardar = function () {
    if (!S.esModoNube()) return;
    const locales = registrosLocales();
    let hubo = false;
    Object.keys(locales).forEach(function (k) {
      const r = locales[k];
      const c = canon(r.data);
      if (snapshot[k] !== c) {
        snapshot[k] = c;
        pendientes[k] = { c: r.c, id: r.id, data: JSON.parse(JSON.stringify(r.data)), borrado: false };
        hubo = true;
      }
    });
    Object.keys(snapshot).forEach(function (k) {
      if (!locales[k]) {
        const partes = k.split(SEP);
        delete snapshot[k];
        pendientes[k] = { c: partes[0], id: partes[1], data: {}, borrado: true };
        hubo = true;
      }
    });
    if (!hubo) return;
    guardarPendientes();
    if (estado.tipo !== 'offline') setEstado('guardando');
    clearTimeout(timerEnvio);
    timerEnvio = setTimeout(enviar, 300);
  };

  function enviar() {
    if (enviando || !client || !usuario) return Promise.resolve();
    const claves = Object.keys(pendientes);
    if (!claves.length) {
      if (estado.tipo === 'guardando' || estado.tipo === 'offline' || estado.tipo === 'error') setEstado('ok');
      return Promise.resolve();
    }
    if (!navigator.onLine) { setEstado('offline'); return Promise.resolve(); }
    enviando = true;
    setEstado('guardando');
    const lote = claves.slice(0, LOTE).map(function (k) { return { k: k, item: pendientes[k] }; });
    const filas = lote.map(function (x) {
      return { coleccion: x.item.c, id: x.item.id, data: x.item.data, borrado: x.item.borrado };
    });
    return client.from('registros').upsert(filas, { onConflict: 'coleccion,id' }).then(function (r) {
      enviando = false;
      if (r.error) throw r.error;
      lote.forEach(function (x) { if (pendientes[x.k] === x.item) delete pendientes[x.k]; });
      guardarPendientes();
      return enviar();
    }).catch(function (e) {
      enviando = false;
      console.error('No se pudieron subir los cambios', e);
      setEstado(esErrorDeRed(e) ? 'offline' : 'error', mensajeError(e));
      clearTimeout(timerReintento);
      timerReintento = setTimeout(enviar, 15000);
    });
  }

  /* ================= Cambios de otros dispositivos ================= */
  let timerRefresco = null;
  function refrescarPantalla() {
    clearTimeout(timerRefresco);
    timerRefresco = setTimeout(function () {
      const activo = document.activeElement;
      const main = document.getElementById('main');
      /* No se interrumpe a quien está escribiendo en la pantalla principal */
      if (activo && main && main.contains(activo) && /^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName)) {
        activo.addEventListener('blur', refrescarPantalla, { once: true });
        return;
      }
      if (KF.App) { KF.App.refresh(); KF.App.updateBrand(); }
    }, 400);
  }

  function aplicarFila(f) {
    if (f.actualizado > ultimaSync) ultimaSync = f.actualizado;
    const k = clave(f.coleccion, f.id);
    if (pendientes[k]) return false; /* hay un cambio local más nuevo esperando subir */
    if (f.borrado) {
      if (!(k in snapshot)) return false;
      delete snapshot[k];
      S.aplicarRegistro(f.coleccion, f.id, null);
      return true;
    }
    const c = canon(f.data);
    if (snapshot[k] === c) return false;
    snapshot[k] = c;
    S.aplicarRegistro(f.coleccion, f.id, f.data);
    return true;
  }

  function suscribir() {
    if (canal || !client) return;
    canal = client.channel('registros-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, function (payload) {
        if (payload.new && payload.new.coleccion && aplicarFila(payload.new)) {
          guardarPendientes();
          refrescarPantalla();
        }
      })
      .subscribe(function (st) {
        if (st === 'SUBSCRIBED') ponerseAlDia();
      });
  }

  /* Trae lo que cambió desde la última vez (por si se perdió algún aviso en vivo) */
  let alDiaEnCurso = false;
  function ponerseAlDia() {
    if (!client || !usuario || alDiaEnCurso || !S.esModoNube()) return Promise.resolve();
    alDiaEnCurso = true;
    const desde = ultimaSync ? new Date(new Date(ultimaSync).getTime() - 10000).toISOString() : '1970-01-01T00:00:00Z';
    return client.from('registros').select('coleccion,id,data,borrado,actualizado')
      .gt('actualizado', desde).order('actualizado').limit(1000)
      .then(function (r) {
        alDiaEnCurso = false;
        if (r.error) throw r.error;
        let cambios = false;
        r.data.forEach(function (f) { if (aplicarFila(f)) cambios = true; });
        guardarPendientes();
        if (cambios) refrescarPantalla();
        if (estado.tipo === 'offline' && !N.pendientes()) setEstado('ok');
        if (r.data.length === 1000) return ponerseAlDia();
      }).catch(function (e) {
        alDiaEnCurso = false;
        if (esErrorDeRed(e)) setEstado('offline');
      });
  }

  N.sincronizarAhora = function () {
    return enviar().then(ponerseAlDia);
  };

  /* ================= Usuarios con acceso ================= */
  N.listarMiembros = function () {
    return client.from('miembros').select('email,agregado_por,creado').order('creado').then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  };

  N.agregarMiembro = function (email) {
    return client.from('miembros').insert({ email: email.trim().toLowerCase(), agregado_por: usuario }).then(function (r) {
      if (r.error) {
        if (/duplicate|unique/i.test(r.error.message)) throw new Error('Ese email ya tiene acceso.');
        throw r.error;
      }
    });
  };

  N.quitarMiembro = function (email) {
    return client.from('miembros').delete().eq('email', email).then(function (r) {
      if (r.error) throw r.error;
    });
  };

  /* ================= Salir ================= */
  N.cerrarSesion = function (sinPreguntar) {
    const hacer = function () {
      const fin = function () {
        try {
          localStorage.removeItem(PEND_KEY);
          localStorage.removeItem(META_KEY);
        } catch (e) { /* nada */ }
        S.salirDeNube();
        location.hash = '';
        /* Los archivos adjuntos guardados en este equipo también se borran */
        const recargar = function () { location.reload(); };
        if (KF.Archivos) KF.Archivos.vaciarDispositivo().then(recargar, recargar);
        else recargar();
      };
      if (client) client.auth.signOut().then(fin, fin);
      else fin();
    };
    const archivos = KF.Archivos ? KF.Archivos.pendientes() : 0;
    if (sinPreguntar || (!N.pendientes() && !archivos)) { hacer(); return; }
    KF.UI.confirm({
      title: 'Hay cambios sin subir',
      message: 'Hay ' + [N.pendientes() ? N.pendientes() + ' cambios' : '', archivos ? archivos + (archivos === 1 ? ' archivo' : ' archivos') : '']
        .filter(Boolean).join(' y ') + ' que todavía no se subieron a la nube (falta conexión). Si cerrás sesión ahora se pierden. ¿Cerrar igual?',
      confirmLabel: 'Cerrar sesión igual',
      onConfirm: hacer
    });
  };

  /* Quita la configuración guardada en este dispositivo y vuelve al modo sin nube */
  N.desconectarDispositivo = function () {
    try { localStorage.removeItem(CFG_KEY); } catch (e) { /* nada */ }
    N.cerrarSesion(true);
  };

  KF.Nube = N;
})(window.KF);
