/* Archivos adjuntos del paciente (estudios, radiografías, órdenes) y cámara */
(function (KF) {
  'use strict';

  const U = KF.U;
  const S = KF.Store;
  const UI = KF.UI;
  const A = {};

  const DB_NOMBRE = 'kinesio_archivos';
  const DB_TABLA = 'archivos';
  const BORRAR_KEY = 'kinesio_archivos_borrar';
  const BUCKET = 'adjuntos';
  const MAX_MB = 15;
  const LADO_MAX = 2000;           /* las fotos se achican a 2000 px de lado mayor */
  const ACEPTA = 'image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt';

  A.MAX_MB = MAX_MB;

  /* ================= Guardado en el dispositivo (IndexedDB) ================= */
  let dbPromesa = null;
  function abrirDb() {
    if (!dbPromesa) {
      dbPromesa = new Promise(function (ok, mal) {
        if (!window.indexedDB) { mal(new Error('Este navegador no permite guardar archivos.')); return; }
        const req = indexedDB.open(DB_NOMBRE, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(DB_TABLA); };
        req.onsuccess = function () { ok(req.result); };
        req.onerror = function () { mal(req.error); };
      });
      dbPromesa.catch(function () { dbPromesa = null; });
    }
    return dbPromesa;
  }

  function tx(modo, fn) {
    return abrirDb().then(function (db) {
      return new Promise(function (ok, mal) {
        const t = db.transaction(DB_TABLA, modo);
        const req = fn(t.objectStore(DB_TABLA));
        t.oncomplete = function () { ok(req ? req.result : undefined); };
        t.onerror = function () { mal(t.error); };
        t.onabort = function () { mal(t.error || new Error('No se pudo guardar el archivo (¿falta espacio?).')); };
      });
    });
  }

  const local = {
    get: function (id) { return tx('readonly', function (st) { return st.get(id); }); },
    put: function (id, v) { return tx('readwrite', function (st) { return st.put(v, id); }); },
    del: function (id) { return tx('readwrite', function (st) { return st.delete(id); }); },
    claves: function () { return tx('readonly', function (st) { return st.getAllKeys(); }); }
  };

  /* ================= Nube (Supabase Storage) ================= */
  function cliente() { return KF.Nube && KF.Nube.cliente ? KF.Nube.cliente() : null; }
  function ruta(pacienteId, id) { return pacienteId + '/' + id; }

  const sinSubir = {};            /* id -> true mientras el archivo no llegó a la nube */
  let avisoBucket = false;

  function errorDeStorage(e) {
    const msg = String((e && (e.message || e.error)) || e || '');
    if (/bucket not found|not found/i.test(msg) && !avisoBucket) {
      avisoBucket = true;
      UI.toast('Falta activar los archivos en Supabase: volvé a correr el archivo supabase/esquema.sql', 'error');
    }
    return msg;
  }

  function subir(id) {
    const c = cliente();
    if (!c || !navigator.onLine) return Promise.resolve(false);
    return local.get(id).then(function (r) {
      if (!r || r.subido) return true;
      /* Si el archivo ya no figura en ninguna ficha, no se sube y se libera el espacio */
      if (!A.lista(r.pacienteId).some(function (m) { return m.id === id; })) {
        delete sinSubir[id];
        return local.del(id).then(function () { return true; });
      }
      return c.storage.from(BUCKET).upload(ruta(r.pacienteId, id), r.blob, {
        contentType: r.tipo || r.blob.type || 'application/octet-stream', upsert: true
      }).then(function (res) {
        if (res && res.error) { errorDeStorage(res.error); return false; }
        r.subido = true;
        delete sinSubir[id];
        return local.put(id, r).then(function () { return true; });
      });
    }).catch(function (e) { errorDeStorage(e); return false; });
  }

  function listaBorrar() {
    try { return JSON.parse(localStorage.getItem(BORRAR_KEY) || '[]'); } catch (e) { return []; }
  }
  function guardarListaBorrar(l) {
    try { localStorage.setItem(BORRAR_KEY, JSON.stringify(l)); } catch (e) { /* sin espacio */ }
  }

  function borrarEnNube(rutas) {
    if (!rutas.length) return Promise.resolve();
    const c = cliente();
    if (!c || !navigator.onLine) { guardarListaBorrar(listaBorrar().concat(rutas)); return Promise.resolve(); }
    return c.storage.from(BUCKET).remove(rutas).then(function (res) {
      if (res && res.error) throw res.error;
    }).catch(function () { guardarListaBorrar(listaBorrar().concat(rutas)); });
  }

  /* Sube lo que quedó pendiente y borra lo que se quitó sin conexión */
  let sincronizando = null;
  let yaRevisado = false;       /* la primera vez se revisan todos los archivos del dispositivo */
  A.sincronizar = function () {
    if (!cliente() || !navigator.onLine) return Promise.resolve();
    if (yaRevisado && !Object.keys(sinSubir).length && !listaBorrar().length) return Promise.resolve();
    if (sincronizando) return sincronizando;
    const borrar = listaBorrar();
    guardarListaBorrar([]);
    sincronizando = borrarEnNube(borrar).then(function () {
      return local.claves();
    }).then(function (ids) {
      return ids.reduce(function (p, id) { return p.then(function () { return subir(id); }); }, Promise.resolve());
    }).catch(function () {}).then(function () {
      yaRevisado = true;
      sincronizando = null;
      pintarPendientes();
    });
    return sincronizando;
  };

  function nubeActiva() { return !!(KF.Nube && KF.Nube.activa && KF.Nube.activa()); }

  /* Al arrancar: marca qué archivos faltan subir */
  function cargarPendientes() {
    if (!nubeActiva()) return Promise.resolve();
    return local.claves().then(function (ids) {
      return Promise.all(ids.map(function (id) {
        return local.get(id).then(function (r) { if (r && !r.subido) sinSubir[id] = true; });
      }));
    }).catch(function () {});
  }

  /* ================= Datos ================= */
  A.lista = function (pacienteId) {
    const p = S.paciente(pacienteId);
    return p && Array.isArray(p.adjuntos) ? p.adjuntos : [];
  };

  A.fmtTamano = function (b) {
    if (!b) return '';
    if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
    return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  };

  function esImagen(tipo) { return /^image\//.test(tipo || ''); }
  function esPdf(tipo, nombre) { return tipo === 'application/pdf' || /\.pdf$/i.test(nombre || ''); }

  function nombreFoto() {
    const d = new Date();
    const dos = function (n) { return String(n).padStart(2, '0'); };
    return 'Foto ' + dos(d.getDate()) + '-' + dos(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' +
      dos(d.getHours()) + '.' + dos(d.getMinutes()) + '.jpg';
  }

  /* Achica las fotos grandes para que ocupen poco y suban rápido */
  function comprimir(blob, nombre) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(blob.type)) return Promise.resolve({ blob: blob, nombre: nombre });
    return new Promise(function (ok) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth, h = img.naturalHeight;
        const esc = Math.min(1, LADO_MAX / Math.max(w, h));
        if (esc === 1 && blob.size < 1.5 * 1024 * 1024) { ok({ blob: blob, nombre: nombre }); return; }
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * esc);
        cv.height = Math.round(h * esc);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(function (b) {
          if (!b || b.size >= blob.size) { ok({ blob: blob, nombre: nombre }); return; }
          ok({ blob: b, nombre: String(nombre).replace(/\.[a-z0-9]+$/i, '') + '.jpg' });
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok({ blob: blob, nombre: nombre }); };
      img.src = url;
    });
  }

  /* Prepara un archivo (lo achica y arma sus datos) sin guardarlo todavía */
  A.preparar = function (blob, nombre, origen) {
    nombre = nombre || (origen === 'camara' ? nombreFoto() : 'Archivo');
    return comprimir(blob, nombre).then(function (r) {
      if (r.blob.size > MAX_MB * 1024 * 1024) {
        throw new Error('"' + nombre + '" pesa ' + A.fmtTamano(r.blob.size) + '. El máximo es ' + MAX_MB + ' MB.');
      }
      return {
        blob: r.blob,
        meta: {
          id: U.uid(),
          nombre: r.nombre,
          tipo: r.blob.type || 'application/octet-stream',
          tamano: r.blob.size,
          fecha: new Date().toISOString(),
          origen: origen || 'archivo'
        }
      };
    });
  };

  /* Guarda un archivo ya preparado en la ficha del paciente */
  A.guardar = function (pacienteId, prep) {
    const nube = nubeActiva();
    return local.put(prep.meta.id, {
      blob: prep.blob, tipo: prep.meta.tipo, pacienteId: pacienteId, subido: false
    }).then(function () {
      if (nube) sinSubir[prep.meta.id] = true;
      S.savePaciente({ id: pacienteId, adjuntos: A.lista(pacienteId).concat([prep.meta]) });
      if (nube) subir(prep.meta.id).then(pintarPendientes);
      return prep.meta;
    });
  };

  A.agregar = function (pacienteId, blob, nombre, origen) {
    return A.preparar(blob, nombre, origen).then(function (prep) { return A.guardar(pacienteId, prep); });
  };

  /* Trae el archivo: del dispositivo o, si no está, de la nube */
  A.obtener = function (pacienteId, meta) {
    return local.get(meta.id).catch(function () { return null; }).then(function (r) {
      if (r && r.blob) return r.blob;
      const c = cliente();
      if (!c) throw new Error(KF.Nube && KF.Nube.activa && KF.Nube.activa()
        ? 'Sin conexión: el archivo se va a poder ver cuando vuelva internet.'
        : 'El archivo no está en este dispositivo.');
      return c.storage.from(BUCKET).download(ruta(pacienteId, meta.id)).then(function (res) {
        if (res.error || !res.data) throw new Error('No se pudo descargar el archivo: ' + errorDeStorage(res.error));
        const blob = res.data.type ? res.data : new Blob([res.data], { type: meta.tipo });
        local.put(meta.id, { blob: blob, tipo: meta.tipo, pacienteId: pacienteId, subido: true }).catch(function () {});
        return blob;
      });
    });
  };

  A.quitar = function (pacienteId, id) {
    S.savePaciente({ id: pacienteId, adjuntos: A.lista(pacienteId).filter(function (m) { return m.id !== id; }) });
    delete sinSubir[id];
    local.del(id).catch(function () {});
    if (nubeActiva()) borrarEnNube([ruta(pacienteId, id)]);
  };

  /* Al eliminar un paciente se borran también sus archivos */
  A.borrarDePaciente = function (pacienteId) {
    const metas = A.lista(pacienteId);
    metas.forEach(function (m) { delete sinSubir[m.id]; local.del(m.id).catch(function () {}); });
    if (metas.length && nubeActiva()) {
      borrarEnNube(metas.map(function (m) { return ruta(pacienteId, m.id); }));
    }
  };

  /* ================= Copia de seguridad ================= */
  function aDataUrl(blob) {
    return new Promise(function (ok, mal) {
      const fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { mal(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  /* { id: { pacienteId, data: 'data:…' } } con todos los archivos que se puedan leer */
  A.paraCopia = function () {
    const out = {};
    const todos = [];
    S.pacientes().forEach(function (p) {
      (p.adjuntos || []).forEach(function (m) { todos.push({ p: p.id, m: m }); });
    });
    return todos.reduce(function (pr, x) {
      return pr.then(function () {
        return A.obtener(x.p, x.m).then(aDataUrl).then(function (data) {
          out[x.m.id] = { pacienteId: x.p, data: data };
        }).catch(function () { /* no disponible: queda sólo el nombre */ });
      });
    }, Promise.resolve()).then(function () { return { archivos: out, total: todos.length }; });
  };

  A.restaurarCopia = function (archivos) {
    if (!archivos) return Promise.resolve(0);
    const nube = nubeActiva();
    const ids = Object.keys(archivos);
    return ids.reduce(function (pr, id) {
      return pr.then(function () {
        const a = archivos[id];
        return fetch(a.data).then(function (r) { return r.blob(); }).then(function (blob) {
          if (nube) sinSubir[id] = true;
          return local.put(id, { blob: blob, tipo: blob.type, pacienteId: a.pacienteId, subido: false });
        }).catch(function () {});
      });
    }, Promise.resolve()).then(function () {
      if (nube) A.sincronizar();
      return ids.length;
    });
  };

  /* ================= Elegir archivos y cámara ================= */
  function elegirArchivo(opts, alElegir) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = opts.accept || ACEPTA;
    if (opts.multiple) inp.multiple = true;
    if (opts.capture) inp.setAttribute('capture', opts.capture);
    inp.hidden = true;
    inp.addEventListener('change', function () {
      const files = Array.prototype.slice.call(inp.files || []);
      inp.remove();
      if (files.length) alElegir(files);
    });
    document.body.appendChild(inp);
    inp.click();
  }
  A.elegirArchivo = elegirArchivo;

  function esCelular() {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  /*
   * Abre la cámara y llama a alTomar(blob, nombre) con la foto.
   * En el celular usa la cámara del teléfono; en la computadora, la webcam.
   */
  A.camara = function (alTomar) {
    const puedeWebcam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext);
    if (esCelular() || !puedeWebcam) {
      elegirArchivo({ accept: 'image/*', capture: 'environment' }, function (files) { alTomar(files[0], files[0].name); });
      return;
    }
    abrirWebcam(alTomar);
  };

  function capa(clase, html) {
    const el = document.createElement('div');
    el.className = 'capa ' + clase;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');
    return el;
  }
  function cerrarCapa(el) {
    el.remove();
    if (!document.querySelector('.capa') && !document.getElementById('modal-root').classList.contains('open')) {
      document.body.classList.remove('no-scroll');
    }
  }

  function abrirWebcam(alTomar) {
    let stream = null;
    let camaras = [];
    let camIdx = 0;
    let foto = null;
    const el = capa('camara',
      '<div class="cam-caja">' +
        '<header class="cam-head"><h2>' + U.icon('camera') + 'Sacar foto</h2>' +
          '<button type="button" class="btn-icon" data-cerrar aria-label="Cerrar">' + U.icon('x') + '</button></header>' +
        '<div class="cam-vista">' +
          '<video playsinline autoplay muted></video>' +
          '<img alt="Foto tomada" hidden>' +
          '<p class="cam-msg">Abriendo la cámara…</p>' +
        '</div>' +
        '<footer class="cam-pie">' +
          '<div class="cam-tomar">' +
            '<button type="button" class="btn btn-ghost" data-cambiar hidden>' + U.icon('refresh') + 'Cambiar cámara</button>' +
            '<button type="button" class="cam-disparo" data-disparar aria-label="Sacar foto" disabled><span></span></button>' +
            '<button type="button" class="btn btn-ghost" data-archivo>' + U.icon('clip') + 'Elegir archivo</button>' +
          '</div>' +
          '<div class="cam-revisar" hidden>' +
            '<button type="button" class="btn btn-secondary" data-repetir>' + U.icon('refresh') + 'Sacar otra</button>' +
            '<button type="button" class="btn btn-primary" data-usar>' + U.icon('check') + 'Usar foto</button>' +
          '</div>' +
        '</footer>' +
      '</div>');
    const video = el.querySelector('video');
    const img = el.querySelector('img');
    const msg = el.querySelector('.cam-msg');
    const disparo = el.querySelector('[data-disparar]');

    function parar() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    function cerrar() {
      parar();
      if (img.src) URL.revokeObjectURL(img.src);
      document.removeEventListener('keydown', teclas, true);
      cerrarCapa(el);
    }
    function teclas(ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); }
    }
    document.addEventListener('keydown', teclas, true);

    function iniciar() {
      parar();
      msg.hidden = false;
      msg.textContent = 'Abriendo la cámara…';
      disparo.disabled = true;
      const video_ = camaras[camIdx]
        ? { deviceId: { exact: camaras[camIdx].deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } };
      navigator.mediaDevices.getUserMedia({ video: video_, audio: false }).then(function (s) {
        if (!el.isConnected) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s;
        video.srcObject = s;
        video.hidden = false;
        msg.hidden = true;
        disparo.disabled = false;
        disparo.focus();
        if (!camaras.length && navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().then(function (devs) {
            camaras = devs.filter(function (d) { return d.kind === 'videoinput'; });
            const actual = s.getVideoTracks()[0] && s.getVideoTracks()[0].getSettings().deviceId;
            camIdx = Math.max(0, camaras.findIndex(function (d) { return d.deviceId === actual; }));
            el.querySelector('[data-cambiar]').hidden = camaras.length < 2;
          }).catch(function () {});
        }
      }).catch(function (e) {
        const n = e && e.name;
        msg.hidden = false;
        msg.innerHTML = U.icon('alert') + '<span>' + (n === 'NotAllowedError' || n === 'SecurityError'
          ? 'No hay permiso para usar la cámara. Habilitalo en el candado de la barra de direcciones del navegador y volvé a intentar.'
          : n === 'NotFoundError' || n === 'OverconstrainedError'
            ? 'No se encontró ninguna cámara en este equipo.'
            : 'No se pudo abrir la cámara. Probá cerrar otros programas que la estén usando.') + '</span>';
      });
    }

    disparo.addEventListener('click', function () {
      if (!stream || !video.videoWidth) return;
      const cv = document.createElement('canvas');
      cv.width = video.videoWidth;
      cv.height = video.videoHeight;
      cv.getContext('2d').drawImage(video, 0, 0);
      cv.toBlob(function (b) {
        if (!b) return;
        foto = b;
        img.src = URL.createObjectURL(b);
        img.hidden = false;
        video.hidden = true;
        parar();
        el.querySelector('.cam-tomar').hidden = true;
        el.querySelector('.cam-revisar').hidden = false;
        el.querySelector('[data-usar]').focus();
      }, 'image/jpeg', 0.9);
    });
    el.querySelector('[data-repetir]').addEventListener('click', function () {
      if (img.src) URL.revokeObjectURL(img.src);
      img.removeAttribute('src');
      img.hidden = true;
      foto = null;
      el.querySelector('.cam-tomar').hidden = false;
      el.querySelector('.cam-revisar').hidden = true;
      iniciar();
    });
    el.querySelector('[data-usar]').addEventListener('click', function () {
      const b = foto;
      cerrar();
      if (b) alTomar(b, nombreFoto());
    });
    el.querySelector('[data-cambiar]').addEventListener('click', function () {
      if (camaras.length < 2) return;
      camIdx = (camIdx + 1) % camaras.length;
      iniciar();
    });
    el.querySelector('[data-archivo]').addEventListener('click', function () {
      cerrar();
      elegirArchivo({ accept: 'image/*' }, function (files) { alTomar(files[0], files[0].name); });
    });
    el.querySelector('[data-cerrar]').addEventListener('click', cerrar);
    iniciar();
  }

  /* ================= Visor ================= */
  A.ver = function (pacienteId, meta, alQuitar, blobDirecto) {
    const el = capa('visor',
      '<div class="visor-caja">' +
        '<header class="visor-head"><div><h2>' + U.esc(meta.nombre) + '</h2>' +
          '<p class="small muted">' + U.fmtDate(String(meta.fecha || '').slice(0, 10)) + ' · ' + A.fmtTamano(meta.tamano) + '</p></div>' +
          '<button type="button" class="btn-icon" data-cerrar aria-label="Cerrar">' + U.icon('x') + '</button></header>' +
        '<div class="visor-cuerpo"><p class="muted">Cargando…</p></div>' +
        '<footer class="visor-pie">' +
          (alQuitar ? '<button type="button" class="btn btn-ghost danger" data-quitar>' + U.icon('trash') + 'Quitar</button>' : '') +
          '<span class="spacer"></span>' +
          '<a class="btn btn-secondary" data-abrir target="_blank" rel="noopener" hidden>' + U.icon('file') + 'Abrir en otra pestaña</a>' +
          '<a class="btn btn-primary" data-descargar hidden>' + U.icon('download') + 'Descargar</a>' +
        '</footer>' +
      '</div>');
    let url = null;
    function cerrar() {
      document.removeEventListener('keydown', teclas, true);
      if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      cerrarCapa(el);
    }
    function teclas(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } }
    document.addEventListener('keydown', teclas, true);
    el.querySelector('[data-cerrar]').addEventListener('click', cerrar);
    el.addEventListener('click', function (ev) { if (ev.target === el) cerrar(); });
    if (alQuitar) {
      el.querySelector('[data-quitar]').addEventListener('click', function () {
        if (!window.confirm('¿Quitar "' + meta.nombre + '" de la ficha?')) return;
        cerrar();
        alQuitar();
      });
    }
    const cuerpo = el.querySelector('.visor-cuerpo');
    (blobDirecto ? Promise.resolve(blobDirecto) : A.obtener(pacienteId, meta)).then(function (blob) {
      url = URL.createObjectURL(blob);
      const abrir = el.querySelector('[data-abrir]');
      const desc = el.querySelector('[data-descargar]');
      abrir.href = url; abrir.hidden = false;
      desc.href = url; desc.download = meta.nombre; desc.hidden = false;
      if (esImagen(meta.tipo)) {
        cuerpo.innerHTML = '<img alt="' + U.esc(meta.nombre) + '" src="' + url + '">';
        abrir.hidden = true;
      } else if (esPdf(meta.tipo, meta.nombre) && !esCelular()) {
        cuerpo.innerHTML = '<iframe title="' + U.esc(meta.nombre) + '" src="' + url + '"></iframe>';
      } else {
        cuerpo.innerHTML = '<div class="visor-archivo">' + U.icon('file') + '<p>' + U.esc(meta.nombre) + '</p>' +
          '<p class="small muted">Tocá "' + (esPdf(meta.tipo, meta.nombre) ? 'Abrir en otra pestaña' : 'Descargar') + '" para verlo.</p></div>';
        if (!esPdf(meta.tipo, meta.nombre)) abrir.hidden = true;
      }
    }).catch(function (e) {
      cuerpo.innerHTML = '<div class="visor-archivo">' + U.icon('alert') + '<p>' + U.esc(e.message || 'No se pudo abrir el archivo.') + '</p></div>';
    });
  };

  /* ================= Bloque de adjuntos (ficha y formulario) ================= */
  const montados = [];

  function pintarPendientes() {
    montados.forEach(function (m) {
      if (!m.box.isConnected) return;
      m.box.querySelectorAll('.adj-item[data-id]').forEach(function (li) {
        li.classList.toggle('sin-subir', !!sinSubir[li.dataset.id]);
      });
    });
  }

  /*
   * opts.pacienteId: guarda al instante en la ficha.
   * opts.memoria (array): paciente nuevo, se guardan al crear la ficha.
   */
  A.montar = function (box, opts) {
    const urls = [];
    const reg = { box: box };
    for (let i = montados.length - 1; i >= 0; i--) if (!montados[i].box.isConnected) montados.splice(i, 1);
    montados.push(reg);

    function items() {
      if (opts.memoria) return opts.memoria.map(function (x) { return { meta: x.meta, blob: x.blob }; });
      return A.lista(opts.pacienteId).map(function (m) { return { meta: m }; });
    }

    function pintar() {
      urls.splice(0).forEach(function (u) { URL.revokeObjectURL(u); });
      const lista = items();
      box.innerHTML =
        '<div class="adj-acciones no-print">' +
          '<button type="button" class="btn btn-secondary" data-adjuntar>' + U.icon('clip') + 'Adjuntar archivo</button>' +
          '<button type="button" class="btn btn-secondary" data-foto>' + U.icon('camera') + 'Sacar foto</button>' +
        '</div>' +
        (lista.length
          ? '<ul class="adj-grid">' + lista.map(function (x) {
              const m = x.meta;
              return '<li class="adj-item' + (sinSubir[m.id] ? ' sin-subir' : '') + '" data-id="' + U.esc(m.id) + '">' +
                '<button type="button" class="adj-ver" data-ver="' + U.esc(m.id) + '" title="Ver ' + U.esc(m.nombre) + '">' +
                  '<span class="adj-mini">' + U.icon(esImagen(m.tipo) ? 'image' : 'file') +
                    (esPdf(m.tipo, m.nombre) ? '<em>PDF</em>' : '') + '</span>' +
                  '<span class="adj-nombre">' + U.esc(m.nombre) + '</span>' +
                  '<span class="adj-meta">' + U.fmtDate(String(m.fecha || '').slice(0, 10)) + ' · ' + A.fmtTamano(m.tamano) + '</span>' +
                '</button>' +
                '<span class="adj-nube" title="Todavía no se subió a la nube">' + U.icon('cloudOff') + '</span>' +
                '<button type="button" class="btn-icon adj-quitar no-print" data-quitar="' + U.esc(m.id) + '" aria-label="Quitar ' + U.esc(m.nombre) + '">' + U.icon('x') + '</button>' +
              '</li>';
            }).join('') + '</ul>'
          : '<p class="adj-vacio muted">Todavía no hay archivos. Podés adjuntar fotos de estudios, radiografías, órdenes médicas o PDFs.</p>') +
        '<p class="hint no-print">Imágenes, PDF o documentos de hasta ' + MAX_MB + ' MB. Las fotos se achican solas para ocupar poco.</p>';

      /* Miniaturas de las imágenes */
      lista.forEach(function (x) {
        if (!esImagen(x.meta.tipo)) return;
        /* Si la foto no está en este equipo se trae de la nube (y queda guardada) */
        const pr = x.blob ? Promise.resolve(x.blob) : A.obtener(opts.pacienteId, x.meta);
        pr.then(function (blob) {
          if (!blob || !box.isConnected) return;
          const mini = box.querySelector('.adj-item[data-id="' + x.meta.id + '"] .adj-mini');
          if (!mini) return;
          const u = URL.createObjectURL(blob);
          urls.push(u);
          mini.innerHTML = '<img alt="" src="' + u + '">';
        }).catch(function () {});
      });

      box.querySelector('[data-adjuntar]').addEventListener('click', function () {
        elegirArchivo({ multiple: true }, function (files) { agregarVarios(files.map(function (f) { return { blob: f, nombre: f.name, origen: 'archivo' }; })); });
      });
      box.querySelector('[data-foto]').addEventListener('click', function () {
        A.camara(function (blob, nombre) { agregarVarios([{ blob: blob, nombre: nombre, origen: 'camara' }]); });
      });
      box.querySelectorAll('[data-ver]').forEach(function (b) {
        b.addEventListener('click', function () {
          const x = items().find(function (i) { return i.meta.id === b.dataset.ver; });
          if (!x) return;
          if (opts.memoria) A.ver('', x.meta, function () { quitar(x.meta); }, x.blob);
          else A.ver(opts.pacienteId, x.meta, function () { quitar(x.meta); });
        });
      });
      box.querySelectorAll('[data-quitar]').forEach(function (b) {
        b.addEventListener('click', function () {
          const x = items().find(function (i) { return i.meta.id === b.dataset.quitar; });
          if (x && window.confirm('¿Quitar "' + x.meta.nombre + '" de la ficha?')) quitar(x.meta);
        });
      });
    }

    function quitar(meta) {
      if (opts.memoria) {
        const i = opts.memoria.findIndex(function (x) { return x.meta.id === meta.id; });
        if (i >= 0) opts.memoria.splice(i, 1);
      } else {
        A.quitar(opts.pacienteId, meta.id);
      }
      UI.toast('Archivo quitado');
      pintar();
      if (opts.alCambiar) opts.alCambiar();
    }

    function agregarVarios(lista) {
      box.classList.add('cargando');
      let ok = 0;
      lista.reduce(function (pr, x) {
        return pr.then(function () {
          return A.preparar(x.blob, x.nombre, x.origen).then(function (prep) {
            if (opts.memoria) { opts.memoria.push(prep); ok++; return; }
            return A.guardar(opts.pacienteId, prep).then(function () { ok++; });
          }).catch(function (e) { UI.toast(e.message || 'No se pudo guardar el archivo', 'error'); });
        });
      }, Promise.resolve()).then(function () {
        box.classList.remove('cargando');
        if (ok) UI.toast(ok === 1 ? (lista[0].origen === 'camara' ? 'Foto guardada en la ficha' : 'Archivo adjuntado') : ok + ' archivos adjuntados');
        pintar();
        if (opts.alCambiar) opts.alCambiar();
      });
    }

    pintar();
    return { refrescar: pintar };
  };

  /* Guarda los archivos cargados al crear un paciente nuevo */
  A.guardarMemoria = function (pacienteId, memoria) {
    return (memoria || []).reduce(function (pr, prep) {
      return pr.then(function () { return A.guardar(pacienteId, prep); });
    }, Promise.resolve());
  };

  A.pendientes = function () { return Object.keys(sinSubir).length; };

  /* Borra todos los archivos guardados en este equipo (al cerrar sesión en la nube) */
  A.vaciarDispositivo = function () {
    return new Promise(function (ok) {
      const fin = function () { ok(); };
      const borrar = function () {
        if (!window.indexedDB) { ok(); return; }
        const req = indexedDB.deleteDatabase(DB_NOMBRE);
        req.onsuccess = fin; req.onerror = fin; req.onblocked = fin;
        setTimeout(fin, 1500);
      };
      if (dbPromesa) dbPromesa.then(function (db) { db.close(); borrar(); }, borrar);
      else borrar();
      try { localStorage.removeItem(BORRAR_KEY); } catch (e) { /* nada */ }
    });
  };

  /* ================= Arranque ================= */
  A.iniciar = function () {
    cargarPendientes().then(function () {
      pintarPendientes();
      A.sincronizar();
    });
    window.addEventListener('online', function () { setTimeout(A.sincronizar, 1500); });
    if (KF.Nube && KF.Nube.alCambiarEstado) {
      KF.Nube.alCambiarEstado(function (e) { if (e && e.tipo === 'ok') A.sincronizar(); });
    }
  };

  KF.Archivos = A;
})(window.KF);
