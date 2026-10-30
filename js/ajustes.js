/* Ajustes: datos profesionales, jornada, accesibilidad, clave y copias de seguridad */
(function (KF) {
  'use strict';

  const U = KF.U;
  const UI = KF.UI;
  const S = KF.Store;

  const AJ = {};

  AJ.render = function (main) {
    const set = S.settings;
    const st = S.stats();
    const nube = S.esModoNube();

    main.innerHTML =
      '<div class="page-head"><div><h1>Ajustes</h1><p class="sub">Configurá la aplicación a tu medida</p></div></div>' +

      '<section class="panel" id="panel-servicios">' +
        '<div class="panel-head">' +
          '<h2>' + U.icon('calendar') + 'Servicios y secciones de turnos</h2>' +
          '<button type="button" class="btn btn-primary" id="serv-nuevo">' + U.icon('plus') + 'Agregar servicio</button>' +
        '</div>' +
        '<p class="muted">Cada servicio tiene su propia sección para dar turnos, con las mismas funciones. ' +
          'Podés darle una duración y un valor de sesión propios.</p>' +
        listaServicios() +
      '</section>' +

      '<section class="panel" id="panel-profs">' +
        '<div class="panel-head">' +
          '<h2>' + U.icon('users') + 'Profesionales y agendas</h2>' +
          '<button type="button" class="btn btn-primary" id="prof-nuevo">' + U.icon('plus') + 'Agregar profesional</button>' +
        '</div>' +
        '<p class="muted">Cada profesional tiene su propia agenda de turnos. Podés darle un horario, una duración de turno y un valor de sesión distintos.</p>' +
        listaProfesionales() +
      '</section>' +

      '<form id="form-prof" class="panel" novalidate>' +
        '<h2>' + U.icon('home') + 'Datos del consultorio</h2>' +
        '<div class="form-grid">' +
          UI.field({ name: 'telefono', label: 'Teléfono del consultorio', type: 'tel', value: set.telefono }) +
          UI.field({ name: 'direccion', label: 'Dirección del consultorio', value: set.direccion }) +
        '</div>' +
        '<h2>' + U.icon('clock') + 'Valores generales de turnos</h2>' +
        '<p class="muted">Se usan para los profesionales que no tienen un valor propio.</p>' +
        '<div class="form-grid">' +
          UI.field({ name: 'precioSesion', label: 'Valor de la sesión ($)', type: 'number', value: set.precioSesion, min: 0, step: 'any',
            hint: 'Se sugiere automáticamente al registrar pagos' }) +
          UI.field({ name: 'duracionTurno', label: 'Duración de cada turno (min)', type: 'number', value: set.duracionTurno, min: 5, step: 5 }) +
          UI.field({ name: 'horaInicio', label: 'Inicio de la jornada', type: 'time', value: set.horaInicio }) +
          UI.field({ name: 'horaFin', label: 'Fin de la jornada', type: 'time', value: set.horaFin }) +
        '</div>' +
        '<div class="toolbar end"><button class="btn btn-primary" type="submit">' + U.icon('check') + 'Guardar ajustes</button></div>' +
      '</form>' +

      '<section class="panel">' +
        '<h2>' + U.icon('search') + 'Tamaño de la letra</h2>' +
        '<p class="muted">Agrandá el texto si te resulta más cómodo para leer.</p>' +
        '<div class="segmented big" role="group" aria-label="Tamaño de letra">' +
          ['normal', 'grande', 'muy-grande'].map(function (v) {
            const label = { normal: 'Normal', grande: 'Grande', 'muy-grande': 'Muy grande' }[v];
            return '<button type="button" data-font="' + v + '" class="' + (set.tamanoLetra === v ? 'active' : '') + '">' +
              '<span class="font-sample fs-' + v + '">Aa</span>' + label + '</button>';
          }).join('') +
        '</div>' +
      '</section>' +

      '<section class="panel">' +
        '<h2>' + U.icon('lock') + 'Clave de acceso</h2>' +
        '<p class="muted">Pedí un PIN al abrir la aplicación para proteger los datos de tus pacientes de miradas ajenas.</p>' +
        '<div class="toolbar">' +
          (set.pinHash
            ? '<span class="badge estado-asistio">' + U.icon('check') + 'Clave activada</span>' +
              '<button class="btn btn-secondary" id="pin-cambiar">Cambiar clave</button>' +
              '<button class="btn btn-ghost danger" id="pin-quitar">Quitar clave</button>' +
              '<button class="btn btn-ghost" id="pin-bloquear">' + U.icon('lock') + 'Bloquear ahora</button>'
            : '<button class="btn btn-secondary" id="pin-cambiar">' + U.icon('lock') + 'Activar clave</button>') +
        '</div>' +
      '</section>' +

      '<section class="panel">' +
        '<div class="panel-head">' +
          '<h2>' + U.icon('heart') + 'Marca y colores</h2>' +
          '<button type="button" class="btn btn-primary" id="marca-editar">' + U.icon('edit') + 'Personalizar</button>' +
        '</div>' +
        '<p class="muted">El nombre, el logo y los colores del consultorio. Se ven en toda la app, en los recibos y en los recordatorios' +
          (nube ? ', y se aplican en todos los dispositivos' : '') + '.</p>' +
        KF.Marca.resumenHtml() +
      '</section>' +

      panelNube() +

      '<section class="panel">' +
        '<h2>' + U.icon('download') + 'Copia de seguridad</h2>' +
        '<p>Tenés <strong>' + st.profesionales + '</strong> ' + (st.profesionales === 1 ? 'profesional' : 'profesionales') + ', <strong>' + st.pacientes + '</strong> pacientes, <strong>' + st.turnos + '</strong> turnos, ' +
          '<strong>' + st.evoluciones + '</strong> registros de historia clínica y <strong>' + st.pagos + '</strong> pagos.</p>' +
        (nube
          ? '<p class="muted">Los datos están en la nube y se comparten entre todos los dispositivos. Igual conviene descargar ' +
            'una copia de seguridad cada tanto y guardarla en un lugar seguro.</p>'
          : '<p class="muted">Los datos se guardan en este dispositivo y navegador. Descargá una copia de seguridad seguido ' +
            '(por ejemplo, una vez por semana) y guardala en un lugar seguro (pendrive, Google Drive, mail). ' +
            'Con ese archivo podés recuperar todo o pasar los datos a otra computadora.</p>') +
        (set.ultimoBackup ? '<p class="small">Última copia descargada: <strong>' + U.fmtDate(set.ultimoBackup.slice(0, 10)) + '</strong></p>' : '') +
        '<div class="toolbar">' +
          '<button class="btn btn-primary" id="bk-export">' + U.icon('download') + 'Descargar copia de seguridad</button>' +
          '<label class="btn btn-secondary file-btn">' + U.icon('upload') + 'Restaurar desde archivo' +
            '<input type="file" id="bk-import" accept=".json,application/json" hidden></label>' +
        '</div>' +
      '</section>' +

      '<section class="panel danger-zone">' +
        '<h2>' + U.icon('alert') + 'Zona de cuidado</h2>' +
        '<div class="toolbar">' +
          '<button class="btn btn-ghost" id="demo">Cargar datos de ejemplo</button>' +
          '<button class="btn btn-ghost danger" id="reset">' + U.icon('trash') + 'Borrar todos los datos</button>' +
        '</div>' +
      '</section>' +
      '<p class="legal">Software © 2026 ' + U.esc(KF.Marca.actual().proveedor || 'FisioCoreSalud') + '. Todos los derechos reservados.<br>' +
        'Software propietario de uso exclusivo bajo licencia. Prohibida su copia, modificación o distribución sin autorización del titular.</p>';

    bindNube(main);
    main.querySelector('#marca-editar').addEventListener('click', function () {
      KF.Marca.abrirEditor(function () { AJ.render(main); });
    });

    main.querySelector('#serv-nuevo').addEventListener('click', function () { AJ.openServicio(null, function () { AJ.render(main); }); });
    main.querySelectorAll('[data-serv-edit]').forEach(function (b) {
      b.addEventListener('click', function () { AJ.openServicio(b.dataset.servEdit, function () { AJ.render(main); }); });
    });
    main.querySelectorAll('[data-serv-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { cambiarServicio(b.dataset.servToggle, function () { AJ.render(main); }); });
    });

    main.querySelector('#prof-nuevo').addEventListener('click', function () { AJ.openProfesional(null, function () { AJ.render(main); }); });
    main.querySelectorAll('[data-prof-edit]').forEach(function (b) {
      b.addEventListener('click', function () { AJ.openProfesional(b.dataset.profEdit, function () { AJ.render(main); }); });
    });
    main.querySelectorAll('[data-prof-del]').forEach(function (b) {
      b.addEventListener('click', function () { quitarProfesional(b.dataset.profDel, function () { AJ.render(main); }); });
    });
    main.querySelectorAll('[data-prof-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.saveProfesional({ id: b.dataset.profAct, activo: true });
        UI.toast('Agenda reactivada');
        KF.App.updateBrand();
        AJ.render(main);
      });
    });

    main.querySelector('#form-prof').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const d = UI.formData(ev.target);
      d.precioSesion = Number(d.precioSesion) || 0;
      d.duracionTurno = Number(d.duracionTurno) || 45;
      if (d.horaInicio && d.horaFin && d.horaInicio >= d.horaFin) {
        UI.toast('El fin de la jornada debe ser posterior al inicio.', 'error');
        return;
      }
      S.saveSettings(d);
      UI.toast('Ajustes guardados');
      KF.App.updateBrand();
    });

    main.querySelectorAll('[data-font]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.saveSettings({ tamanoLetra: b.dataset.font });
        KF.App.applyFont();
        AJ.render(main);
      });
    });

    main.querySelector('#pin-cambiar').addEventListener('click', openPin);
    const quitar = main.querySelector('#pin-quitar');
    if (quitar) quitar.addEventListener('click', function () {
      UI.confirm({
        title: 'Quitar clave',
        message: 'La aplicación se abrirá sin pedir clave. ¿Continuar?',
        confirmLabel: 'Quitar clave',
        onConfirm: function () { S.saveSettings({ pinHash: '', pinLen: 0 }); UI.toast('Clave desactivada'); AJ.render(main); }
      });
    });
    const bloquear = main.querySelector('#pin-bloquear');
    if (bloquear) bloquear.addEventListener('click', function () { KF.App.lock(); });

    main.querySelector('#bk-export').addEventListener('click', function () {
      const btn = this;
      btn.disabled = true;
      /* La copia incluye los archivos adjuntos (estudios, fotos) */
      KF.Archivos.paraCopia().then(function (r) {
        let texto = S.exportJSON();
        const n = Object.keys(r.archivos).length;
        if (n) {
          const obj = JSON.parse(texto);
          obj.archivos = r.archivos;
          texto = JSON.stringify(obj);
        }
        U.download('kinesio-copia-' + U.today() + '.json', texto, 'application/json');
        S.saveSettings({ ultimoBackup: new Date().toISOString() });
        UI.toast(r.total > n
          ? 'Copia descargada. ' + (r.total - n) + ' archivo(s) no se pudieron incluir (revisá la conexión).'
          : 'Copia de seguridad descargada' + (n ? ' (con ' + n + (n === 1 ? ' archivo)' : ' archivos)') : ''),
        r.total > n ? 'error' : 'ok');
        setTimeout(function () { AJ.render(main); }, 300);
      }).catch(function (e) {
        btn.disabled = false;
        UI.toast(e.message || 'No se pudo armar la copia', 'error');
      });
    });

    main.querySelector('#bk-import').addEventListener('change', function (ev) {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        UI.confirm({
          title: 'Restaurar copia de seguridad',
          message: 'Se reemplazarán TODOS los datos actuales por los del archivo "' + file.name + '"' +
            (nube ? ', en la nube y para todos los profesionales' : '') + '. ¿Continuar?',
          confirmLabel: 'Restaurar',
          onConfirm: function () {
            try {
              let texto = reader.result;
              let archivos = null;
              const obj = JSON.parse(texto);
              if (obj && obj.archivos) {
                archivos = obj.archivos;
                delete obj.archivos;
                texto = JSON.stringify(obj);
              }
              S.importJSON(texto);
              if (archivos) KF.Archivos.restaurarCopia(archivos).then(function () { KF.App.refresh(); });
              UI.toast('Datos restaurados correctamente');
              KF.App.applyFont();
              KF.App.updateBrand();
              AJ.render(main);
            } catch (e) {
              UI.toast(e.message || 'No se pudo leer el archivo', 'error');
            }
          }
        });
      };
      reader.readAsText(file);
      ev.target.value = '';
    });

    main.querySelector('#demo').addEventListener('click', function () {
      UI.confirm({
        title: 'Datos de ejemplo',
        message: 'Se agregarán algunos pacientes, un segundo profesional, turnos y pagos ficticios para que pruebes la aplicación. Después podés borrarlos.',
        confirmLabel: 'Agregar ejemplos',
        danger: false,
        onConfirm: function () { KF.Demo.load(); UI.toast('Datos de ejemplo cargados'); location.hash = '#/inicio'; }
      });
    });

    main.querySelector('#reset').addEventListener('click', function () {
      UI.modal({
        title: 'Borrar todos los datos',
        size: 'sm',
        danger: true,
        submitLabel: 'Borrar todo',
        body: '<p class="confirm-text">Se eliminarán todos los pacientes, historias clínicas, turnos, pagos y ajustes' +
          (nube ? ' <strong>de la nube, para todos los profesionales y dispositivos</strong>' : '') + '. ' +
          '<strong>No se puede deshacer.</strong></p>' +
          UI.field({ name: 'conf', label: 'Para confirmar escribí BORRAR', required: true, attrs: ' autocomplete="off"' }),
        onSubmit: function (form) {
          if (UI.formData(form).conf.toUpperCase() !== 'BORRAR') {
            UI.toast('Escribí BORRAR para confirmar.', 'error');
            return false;
          }
          S.resetAll();
          KF.App.applyFont();
          KF.App.updateBrand();
          UI.toast('Se borraron todos los datos');
          location.hash = '#/inicio';
        }
      });
    });
  };

  /* ================= Base de datos en la nube ================= */
  const TEXTO_ESTADO = {
    ok: 'Sincronizado',
    guardando: 'Guardando cambios…',
    offline: 'Sin conexión (los cambios se suben solos al volver internet)',
    error: 'Hubo un problema al guardar en la nube'
  };

  function panelNube() {
    const N = KF.Nube;
    if (!S.esModoNube()) {
      return '<section class="panel">' +
        '<h2>' + U.icon('upload') + 'Base de datos en la nube</h2>' +
        '<p>Ahora los datos se guardan solo en este dispositivo. Conectando una base de datos en la nube (Supabase), ' +
          'todos los profesionales pueden ver y cargar las agendas desde su celular o computadora, cada uno con su usuario y contraseña.</p>' +
        '<p class="muted">Primero hay que crear el proyecto en Supabase y correr el archivo <strong>supabase/esquema.sql</strong> ' +
          '(los pasos están en el README del proyecto). Después pegá acá los datos de conexión.</p>' +
        '<div class="toolbar"><button type="button" class="btn btn-primary" id="nube-conectar">' + U.icon('upload') + 'Conectar con Supabase</button></div>' +
      '</section>';
    }
    const est = N.estado();
    const cfg = N.config() || {};
    return '<section class="panel" id="panel-nube">' +
      '<h2>' + U.icon('upload') + 'Base de datos en la nube</h2>' +
      '<dl class="info-grid">' +
        '<div class="info"><dt>Cuenta</dt><dd>' + U.esc(N.usuario() || '—') + '</dd></div>' +
        '<div class="info"><dt>Estado</dt><dd><span class="sync-line sync-' + U.esc(est.tipo) + '">' +
          U.esc(TEXTO_ESTADO[est.tipo] || est.tipo) + '</span>' +
          (N.pendientes() ? ' <span class="muted">(' + N.pendientes() + ' cambios por subir)</span>' : '') +
          (est.detalle && est.tipo === 'error' ? '<br><small class="muted">' + U.esc(est.detalle) + '</small>' : '') + '</dd></div>' +
      '</dl>' +
      '<div class="toolbar" style="margin-top:1rem">' +
        '<button type="button" class="btn btn-secondary" id="nube-sync">' + U.icon('upload') + 'Sincronizar ahora</button>' +
        '<button type="button" class="btn btn-ghost" id="nube-salir">' + U.icon('lock') + 'Cerrar sesión</button>' +
        (cfg.origen === 'dispositivo'
          ? '<button type="button" class="btn btn-ghost danger" id="nube-desconectar">Dejar de usar la nube en este dispositivo</button>' : '') +
      '</div>' +
      '<h3 class="sub-title" id="usuarios-acceso">' + U.icon('users') + 'Usuarios con acceso</h3>' +
      '<div id="solicitudes-lista"></div>' +
      '<p class="muted">Solo estas personas pueden ver los datos del consultorio. Para sumar a alguien, pasale el link de la app: ' +
        'toca <strong>"Crear cuenta y pedir acceso"</strong> y su solicitud aparece acá para aprobarla. ' +
        'También podés agregar su email directamente.</p>' +
      '<div id="miembros-lista"><p class="muted">Cargando…</p></div>' +
      '<form class="add-member" id="miembro-form" novalidate>' +
        UI.field({ idPrefix: 'mb_', name: 'email', label: 'Email de la persona', type: 'email', required: true,
          attrs: ' autocomplete="off" inputmode="email"' }) +
        '<button type="submit" class="btn btn-primary">' + U.icon('plus') + 'Dar acceso</button>' +
      '</form>' +
    '</section>';
  }

  /* Pedidos de acceso de profesionales que crearon su cuenta */
  function cargarSolicitudes(main) {
    const box = main.querySelector('#solicitudes-lista');
    if (!box) return;
    KF.Nube.listarSolicitudes().then(function (lista) {
      if (!lista.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="solicitudes">' +
        '<h4>' + U.icon('mail') + (lista.length === 1 ? '1 persona pide acceso' : lista.length + ' personas piden acceso') + '</h4>' +
        '<ul class="row-list compact">' + lista.map(function (x) {
          return '<li class="row-item static solicitud"><div class="row-main">' +
            '<strong>' + U.esc(x.nombre || x.email) + '</strong>' +
            '<span class="muted small">' + U.esc(x.email) + ' · ' + U.fmtDate(String(x.creado || '').slice(0, 10)) + '</span>' +
            (x.mensaje ? '<span class="sol-msg">"' + U.esc(x.mensaje) + '"</span>' : '') + '</div>' +
            '<div class="sol-acciones">' +
              '<button type="button" class="btn btn-sm btn-primary" data-aprobar="' + U.esc(x.email) + '">' + U.icon('check') + 'Aprobar</button>' +
              '<button type="button" class="btn btn-sm btn-ghost danger" data-rechazar="' + U.esc(x.email) + '">' + U.icon('x') + 'Rechazar</button>' +
            '</div></li>';
        }).join('') + '</ul></div>';
      function responder(email, aprobar) {
        KF.Nube.responderSolicitud(email, aprobar).then(function () {
          UI.toast(aprobar ? email + ' ya tiene acceso' : 'Solicitud rechazada');
          cargarSolicitudes(main);
          cargarMiembros(main);
          KF.App.revisarSolicitudes();
        }).catch(function (e) { UI.toast(KF.Nube.mensajeError(e), 'error'); });
      }
      box.querySelectorAll('[data-aprobar]').forEach(function (b) {
        b.addEventListener('click', function () { responder(b.dataset.aprobar, true); });
      });
      box.querySelectorAll('[data-rechazar]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (window.confirm('¿Rechazar el pedido de ' + b.dataset.rechazar + '? No va a poder ver los datos del consultorio.')) responder(b.dataset.rechazar, false);
        });
      });
    }).catch(function (e) {
      if (/solicitudes|schema cache|does not exist|relation/i.test(String((e && e.message) || ''))) {
        box.innerHTML = '<div class="notice">' + U.icon('alert') + '<div><strong>Activá las solicitudes de acceso</strong>' +
          '<p>Para que los profesionales puedan pedir acceso desde la app, corré una vez el archivo <strong>supabase/solicitudes.sql</strong> en Supabase (SQL Editor).</p></div></div>';
      }
    });
  }

  function cargarMiembros(main) {
    const box = main.querySelector('#miembros-lista');
    if (!box) return;
    const yo = KF.Nube.usuario();
    KF.Nube.listarMiembros().then(function (lista) {
      box.innerHTML = '<ul class="row-list compact">' + lista.map(function (m) {
        return '<li class="row-item static"><div class="row-main"><strong>' + U.esc(m.email) + (m.email === yo ? ' (vos)' : '') + '</strong>' +
          '<span class="muted small">' + (m.agregado_por ? 'Agregado por ' + U.esc(m.agregado_por) : '') + '</span></div>' +
          (m.email === yo ? '' : '<button type="button" class="btn btn-sm btn-ghost danger" data-quitar="' + U.esc(m.email) + '">' +
            U.icon('trash') + 'Quitar acceso</button>') +
        '</li>';
      }).join('') + '</ul>';
      box.querySelectorAll('[data-quitar]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirm({
            title: 'Quitar acceso',
            message: b.dataset.quitar + ' ya no va a poder ver ni cargar datos del consultorio. ¿Continuar?',
            confirmLabel: 'Quitar acceso',
            onConfirm: function () {
              KF.Nube.quitarMiembro(b.dataset.quitar).then(function () {
                UI.toast('Acceso quitado');
                cargarMiembros(main);
              }).catch(function (e) { UI.toast(KF.Nube.mensajeError(e), 'error'); });
            }
          });
        });
      });
    }).catch(function (e) {
      box.innerHTML = '<p class="muted">No se pudo cargar la lista: ' + U.esc(KF.Nube.mensajeError(e)) + '</p>';
    });
  }

  function bindNube(main) {
    const conectar = main.querySelector('#nube-conectar');
    if (conectar) conectar.addEventListener('click', abrirConexion);
    if (!S.esModoNube()) return;
    cargarMiembros(main);
    cargarSolicitudes(main);
    if (/solicitudes/.test(location.hash)) {
      setTimeout(function () { const t = main.querySelector('#usuarios-acceso'); if (t) t.scrollIntoView({ block: 'start' }); }, 50);
    }
    main.querySelector('#nube-sync').addEventListener('click', function () {
      KF.Nube.sincronizarAhora().then(function () {
        UI.toast(KF.Nube.pendientes() ? 'Quedan cambios por subir: revisá la conexión' : 'Todo sincronizado',
          KF.Nube.pendientes() ? 'error' : 'ok');
        AJ.render(main);
      });
    });
    main.querySelector('#nube-salir').addEventListener('click', function () { KF.Nube.cerrarSesion(); });
    const desc = main.querySelector('#nube-desconectar');
    if (desc) desc.addEventListener('click', function () {
      UI.confirm({
        title: 'Dejar de usar la nube',
        message: 'Este dispositivo vuelve a guardar los datos solo de forma local. Los datos de la nube no se borran.',
        confirmLabel: 'Desconectar',
        danger: false,
        onConfirm: function () { KF.Nube.desconectarDispositivo(); }
      });
    });
    main.querySelector('#miembro-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const form = ev.target;
      if (!UI.validate(form)) return;
      const email = UI.formData(form).email.toLowerCase();
      KF.Nube.agregarMiembro(email).then(function () {
        UI.toast(email + ' ya tiene acceso');
        form.reset();
        cargarMiembros(main);
      }).catch(function (e) { UI.toast(KF.Nube.mensajeError(e), 'error'); });
    });
  }

  function abrirConexion() {
    UI.modal({
      title: 'Conectar con Supabase',
      size: 'md',
      body: '<p class="modal-sub">Los datos están en Supabase → Project Settings → API Keys / Data API.</p>' +
        '<div class="form-grid one">' +
          UI.field({ idPrefix: 'sb_', name: 'url', label: 'Project URL', required: true,
            placeholder: 'https://abcdefghijkl.supabase.co', attrs: ' autocomplete="off" inputmode="url"' }) +
          UI.field({ idPrefix: 'sb_', name: 'key', label: 'Clave pública ("publishable" o "anon public")', type: 'textarea', rows: 3, required: true,
            placeholder: 'sb_publishable_… o eyJhbGciOi…', hint: 'Nunca uses la clave "secret" ni la "service_role".' }) +
        '</div>' +
        '<p class="hint">Esta conexión queda guardada en este dispositivo. Para que todos los dispositivos se conecten solos, ' +
          'esos mismos datos se pueden cargar en el archivo js/config.js.</p>',
      submitLabel: 'Conectar',
      onSubmit: function (form) {
        const d = UI.formData(form);
        if (!KF.Nube.validarUrl(d.url)) {
          UI.toast('La URL tiene que ser del tipo https://xxxx.supabase.co', 'error');
          return false;
        }
        if (/^sb_secret_/.test(d.key) || /service_role/.test(atobSeguro(d.key))) {
          UI.toast('Esa es una clave secreta y no se debe usar acá. Copiá la clave "publishable" o "anon public".', 'error');
          return false;
        }
        KF.Nube.guardarConfig(d.url, d.key);
        location.hash = '';
        location.reload();
      }
    });
  }

  /* Lee el contenido de la clave (JWT) para detectar si es la secreta */
  function atobSeguro(jwt) {
    try {
      const parte = String(jwt).split('.')[1] || '';
      return atob(parte.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) { return ''; }
  }

  /* ================= Profesionales ================= */
  /* "Lic. María Gómez" -> "MG" */
  function iniciales(nombre) {
    const partes = String(nombre || '').replace(/^(lic|dr|dra|klgo|klga|prof)\.?\s+/i, '').trim().split(/\s+/)
      .filter(function (w) { return /^\p{L}/u.test(w); });
    return ((partes[0] || '').charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '')).toUpperCase() || '?';
  }

  function listaProfesionales() {
    const todos = S.profesionales(true);
    return '<ul class="prof-list">' + todos.map(function (p) {
      const cfg = S.configProfesional(p.id);
      const uso = S.usoProfesional(p.id);
      const inactivo = p.activo === false;
      return '<li class="prof-item' + (inactivo ? ' inactive' : '') + '" style="--prof:' + U.esc(p.color || '#4f5e5b') + '">' +
        '<span class="prof-dot" aria-hidden="true">' + U.esc(iniciales(p.nombre)) + '</span>' +
        '<div class="prof-info">' +
          '<strong>' + U.esc(p.nombre) + (inactivo ? ' <span class="badge">Agenda desactivada</span>' : '') + '</strong>' +
          '<span class="muted">' + [U.esc(p.especialidad || ''), p.matricula ? 'M.P. ' + U.esc(p.matricula) : ''].filter(Boolean).join(' · ') + '</span>' +
          '<small class="muted">' + U.esc(cfg.horaInicio) + ' a ' + U.esc(cfg.horaFin) + ' hs · turnos de ' + cfg.duracionTurno + ' min' +
            (cfg.precioSesion ? ' · sesión ' + U.fmtMoney(cfg.precioSesion) : '') + ' · ' + uso.turnos + (uso.turnos === 1 ? ' turno' : ' turnos') + '</small>' +
          (UI.hayVariosServicios() ? '<span class="check-group">' + S.serviciosDeProfesional(p.id).map(function (sid) { return UI.servTag(sid, 'sm'); }).join('') + '</span>' : '') +
        '</div>' +
        '<div class="prof-actions">' +
          '<button type="button" class="btn btn-sm btn-secondary" data-prof-edit="' + U.esc(p.id) + '">' + U.icon('edit') + 'Editar</button>' +
          (inactivo
            ? '<button type="button" class="btn btn-sm btn-ghost" data-prof-act="' + U.esc(p.id) + '">Reactivar</button>'
            : (S.profesionales().length > 1
              ? '<button type="button" class="btn btn-sm btn-ghost danger" data-prof-del="' + U.esc(p.id) + '">' + U.icon('trash') + 'Quitar</button>'
              : '')) +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';
  }

  AJ.openProfesional = function (id, onSaved) {
    const usados = S.profesionales(true).map(function (p) { return p.color; });
    const libre = S.COLORES_PROF.find(function (c) { return usados.indexOf(c) < 0; }) || S.COLORES_PROF[0];
    const p = id ? S.profesional(id) : { color: libre, especialidad: 'Lic. en Kinesiología y Fisiatría' };
    const set = S.settings;
    const body =
      '<div class="form-grid">' +
        UI.field({ idPrefix: 'pf_', name: 'nombre', label: 'Nombre y apellido', value: p.nombre === 'Profesional principal' ? '' : p.nombre, required: true,
          placeholder: 'Ej: Lic. María Gómez', attrs: ' autocomplete="off" autofocus' }) +
        UI.field({ idPrefix: 'pf_', name: 'especialidad', label: 'Título / Especialidad', value: p.especialidad,
          placeholder: 'Ej: Lic. en Kinesiología, Quiropraxia…' }) +
        UI.field({ idPrefix: 'pf_', name: 'matricula', label: 'Matrícula profesional', value: p.matricula }) +
        UI.field({ idPrefix: 'pf_', name: 'telefono', label: 'Teléfono', type: 'tel', value: p.telefono }) +
        '<div class="field full"><label>Color de su agenda</label>' +
          '<div class="color-options" role="radiogroup" aria-label="Color de la agenda">' +
            S.COLORES_PROF.map(function (c, i) {
              return '<label class="color-opt"><input type="radio" name="color" value="' + c + '"' + (p.color === c ? ' checked' : '') + '>' +
                '<span style="background:' + c + '"><span class="sr-only">Color ' + (i + 1) + '</span></span></label>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
      (S.servicios(true).length > 1
        ? '<div class="field full"><label>Servicios que atiende</label>' +
            '<div class="check-group" role="group" aria-label="Servicios que atiende">' +
              S.servicios(true).map(function (sv) {
                const marcado = S.serviciosDeProfesional(id).indexOf(sv.id) >= 0 || !id;
                return '<label class="chip"><input type="checkbox" name="servicios" value="' + U.esc(sv.id) + '"' + (marcado ? ' checked' : '') + '>' +
                  '<span>' + U.esc(sv.nombre) + '</span></label>';
              }).join('') +
            '</div><small class="hint">Su agenda aparece en la sección de cada servicio que atienda.</small></div>'
        : '') +
      '<fieldset class="form-section sub-section"><legend>' + U.icon('clock') + 'Agenda y valores (opcional)</legend>' +
        '<p class="hint">Si los dejás vacíos se usan los valores generales del consultorio (' +
          U.esc(set.horaInicio) + ' a ' + U.esc(set.horaFin) + ' hs, turnos de ' + U.esc(set.duracionTurno) + ' min' +
          (Number(set.precioSesion) ? ', sesión ' + U.fmtMoney(set.precioSesion) : '') + ').</p>' +
        '<div class="form-grid">' +
          UI.field({ idPrefix: 'pf_', name: 'horaInicio', label: 'Inicio de su jornada', type: 'time', value: p.horaInicio }) +
          UI.field({ idPrefix: 'pf_', name: 'horaFin', label: 'Fin de su jornada', type: 'time', value: p.horaFin }) +
          UI.field({ idPrefix: 'pf_', name: 'duracionTurno', label: 'Duración de sus turnos (min)', type: 'number', value: p.duracionTurno, min: 5, step: 5 }) +
          UI.field({ idPrefix: 'pf_', name: 'precioSesion', label: 'Valor de su sesión ($)', type: 'number', value: p.precioSesion, min: 0, step: 'any' }) +
        '</div>' +
      '</fieldset>';

    UI.modal({
      title: id ? 'Editar profesional' : 'Agregar profesional',
      size: 'md',
      body: body,
      submitLabel: id ? 'Guardar cambios' : 'Agregar',
      onSubmit: function (form) {
        const d = UI.formData(form);
        const ini = d.horaInicio || set.horaInicio;
        const fin = d.horaFin || set.horaFin;
        if (ini && fin && ini >= fin) {
          UI.toast('El fin de la jornada debe ser posterior al inicio.', 'error');
          return false;
        }
        d.color = d.color || libre;
        const marcados = Array.prototype.map.call(form.querySelectorAll('input[name=servicios]:checked'), function (x) { return x.value; });
        if (form.querySelector('input[name=servicios]')) {
          if (!marcados.length) { UI.toast('Elegí al menos un servicio que atienda.', 'error'); return false; }
          /* Si atiende todos se guarda vacío: así también atiende los servicios que se agreguen después */
          d.servicios = marcados.length === S.servicios(true).length ? [] : marcados;
        } else {
          delete d.servicios;
        }
        if (id) d.id = id;
        else d.activo = true;
        S.saveProfesional(d);
        UI.toast(id ? 'Profesional actualizado' : d.nombre + ' ya tiene su agenda');
        KF.App.updateBrand();
        if (onSaved) onSaved();
      }
    });
  };

  /* ================= Servicios ================= */
  function listaServicios() {
    return '<ul class="serv-list">' + S.servicios(true).map(function (sv) {
      const uso = S.usoServicio(sv.id);
      const inactivo = sv.activo === false;
      const profs = S.profesionalesDeServicio(sv.id);
      return '<li class="serv-item' + (inactivo ? ' inactive' : '') + '" style="--serv:' + U.esc(sv.color || '#4f5e5b') + '">' +
        '<span class="prof-dot" style="--prof:' + U.esc(sv.color || '#4f5e5b') + '" aria-hidden="true">' + U.icon(KF.App.iconoServicio(sv)) + '</span>' +
        '<div class="prof-info">' +
          '<strong>' + U.esc(sv.nombre) + (inactivo ? ' <span class="badge">Desactivado</span>' : '') + '</strong>' +
          '<small class="muted">' +
            [Number(sv.duracionTurno) ? 'turnos de ' + sv.duracionTurno + ' min' : 'duración de cada profesional',
              Number(sv.precioSesion) ? 'sesión ' + U.fmtMoney(sv.precioSesion) : '',
              profs.length + (profs.length === 1 ? ' profesional' : ' profesionales'),
              uso.turnos + (uso.turnos === 1 ? ' turno' : ' turnos')].filter(Boolean).join(' · ') + '</small>' +
        '</div>' +
        '<div class="prof-actions">' +
          '<button type="button" class="btn btn-sm btn-secondary" data-serv-edit="' + U.esc(sv.id) + '">' + U.icon('edit') + 'Editar</button>' +
          (inactivo
            ? '<button type="button" class="btn btn-sm btn-ghost" data-serv-toggle="' + U.esc(sv.id) + '">Reactivar</button>'
            : (S.servicios().length > 1
              ? '<button type="button" class="btn btn-sm btn-ghost danger" data-serv-toggle="' + U.esc(sv.id) + '">' + U.icon('trash') +
                (uso.turnos + uso.pagos ? 'Desactivar' : 'Quitar') + '</button>'
              : '')) +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';
  }

  AJ.openServicio = function (id, onSaved) {
    const lista = S.servicios(true);
    const usados = lista.map(function (x) { return x.color; });
    const libre = S.COLORES_SERV.find(function (c) { return usados.indexOf(c) < 0; }) || S.COLORES_SERV[0];
    const sv = id ? S.servicio(id) : { color: libre };
    const body =
      '<div class="form-grid">' +
        UI.field({ idPrefix: 'sv_', name: 'nombre', label: 'Nombre del servicio', value: sv.nombre, required: true,
          placeholder: 'Ej: Kinesiología, Quiropraxia, Osteopatía…', attrs: ' autocomplete="off" autofocus' }) +
        UI.field({ idPrefix: 'sv_', name: 'corto', label: 'Nombre corto (menú del celular)', value: sv.corto,
          placeholder: 'Ej: Kinesio', attrs: ' maxlength="10"', hint: 'Hasta 10 letras. Si lo dejás vacío se usa el nombre.' }) +
        UI.field({ idPrefix: 'sv_', name: 'duracionTurno', label: 'Duración del turno (min)', type: 'number', value: sv.duracionTurno, min: 5, step: 5,
          hint: 'Si lo dejás vacío se usa la de cada profesional.' }) +
        UI.field({ idPrefix: 'sv_', name: 'precioSesion', label: 'Valor de la sesión ($)', type: 'number', value: sv.precioSesion, min: 0, step: 'any',
          hint: 'Se sugiere al registrar pagos de este servicio.' }) +
        '<div class="field full"><label>Color</label>' +
          '<div class="color-options" role="radiogroup" aria-label="Color del servicio">' +
            S.COLORES_SERV.map(function (c, i) {
              return '<label class="color-opt"><input type="radio" name="color" value="' + c + '"' + (sv.color === c ? ' checked' : '') + '>' +
                '<span style="background:' + c + '"><span class="sr-only">Color ' + (i + 1) + '</span></span></label>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
    UI.modal({
      title: id ? 'Editar servicio' : 'Agregar servicio',
      size: 'md',
      body: body,
      submitLabel: id ? 'Guardar cambios' : 'Agregar',
      onSubmit: function (form) {
        const d = UI.formData(form);
        const nombre = d.nombre.trim();
        const repetido = lista.some(function (x) { return x.id !== id && U.norm(x.nombre) === U.norm(nombre); });
        if (repetido) { UI.toast('Ya existe un servicio con ese nombre.', 'error'); return false; }
        const datos = {
          nombre: nombre,
          corto: (d.corto || '').trim(),
          duracionTurno: d.duracionTurno ? Number(d.duracionTurno) : '',
          precioSesion: d.precioSesion ? Number(d.precioSesion) : '',
          color: d.color || libre
        };
        let nueva;
        if (id) {
          nueva = lista.map(function (x) { return x.id === id ? Object.assign({}, x, datos) : x; });
        } else {
          let base = U.norm(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'servicio';
          let nuevoId = base;
          let i = 2;
          while (lista.some(function (x) { return x.id === nuevoId; })) nuevoId = base + '-' + (i++);
          nueva = lista.concat([Object.assign({ id: nuevoId, activo: true }, datos)]);
        }
        S.saveServicios(nueva);
        UI.toast(id ? 'Servicio actualizado' : 'Se agregó la sección de turnos de ' + nombre);
        KF.App.updateBrand();
        if (onSaved) onSaved();
      }
    });
  };

  /* Quitar (si no tiene turnos) o desactivar / reactivar un servicio */
  function cambiarServicio(id, onDone) {
    const sv = S.servicio(id);
    const lista = S.servicios(true);
    if (sv.activo === false) {
      S.saveServicios(lista.map(function (x) { return x.id === id ? Object.assign({}, x, { activo: true }) : x; }));
      UI.toast('Servicio reactivado');
      KF.App.updateBrand();
      if (onDone) onDone();
      return;
    }
    const uso = S.usoServicio(id);
    const conDatos = uso.turnos + uso.pagos > 0;
    UI.confirm({
      title: conDatos ? 'Desactivar servicio' : 'Quitar servicio',
      message: conDatos
        ? sv.nombre + ' tiene ' + uso.turnos + ' turnos registrados. Su sección se va a ocultar y no se le podrán dar turnos nuevos, pero el historial se conserva. Podés reactivarlo cuando quieras.'
        : '¿Quitar el servicio ' + sv.nombre + '?',
      confirmLabel: conDatos ? 'Desactivar' : 'Quitar',
      onConfirm: function () {
        S.saveServicios(conDatos
          ? lista.map(function (x) { return x.id === id ? Object.assign({}, x, { activo: false }) : x; })
          : lista.filter(function (x) { return x.id !== id; }));
        UI.toast(conDatos ? 'Servicio desactivado' : 'Servicio quitado');
        KF.App.updateBrand();
        if (onDone) onDone();
      }
    });
  }

  function quitarProfesional(id, onDone) {
    const p = S.profesional(id);
    const uso = S.usoProfesional(id);
    const conDatos = uso.turnos + uso.evoluciones + uso.pagos > 0;
    if (conDatos) {
      /* Con historial: se desactiva para no perder turnos, sesiones ni pagos */
      UI.confirm({
        title: 'Desactivar agenda',
        message: p.nombre + ' tiene ' + uso.turnos + ' turnos, ' + uso.evoluciones + ' sesiones y ' + uso.pagos +
          ' pagos registrados. Su agenda se va a desactivar (no se le podrán dar turnos nuevos), pero el historial se conserva. ' +
          'Podés reactivarla cuando quieras.',
        confirmLabel: 'Desactivar agenda',
        onConfirm: function () {
          S.saveProfesional({ id: id, activo: false });
          UI.toast('Agenda de ' + p.nombre + ' desactivada');
          KF.App.updateBrand();
          if (onDone) onDone();
        }
      });
    } else {
      UI.confirm({
        title: 'Quitar profesional',
        message: '¿Quitar a ' + p.nombre + ' del consultorio?',
        confirmLabel: 'Quitar',
        onConfirm: function () {
          S.deleteProfesional(id);
          UI.toast('Profesional quitado');
          KF.App.updateBrand();
          if (onDone) onDone();
        }
      });
    }
  }

  function openPin() {
    UI.modal({
      title: 'Clave de acceso',
      size: 'sm',
      body: '<p class="modal-sub">Elegí un PIN de 4 a 8 números. Anotalo en un lugar seguro: si lo olvidás, ' +
        'vas a tener que borrar los datos del navegador y restaurar una copia de seguridad.</p>' +
        '<div class="form-grid one">' +
          UI.field({ name: 'pin1', label: 'Nuevo PIN', type: 'password', required: true,
            attrs: ' inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"' }) +
          UI.field({ name: 'pin2', label: 'Repetí el PIN', type: 'password', required: true,
            attrs: ' inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"' }) +
        '</div>',
      submitLabel: 'Guardar clave',
      onSubmit: function (form) {
        const d = UI.formData(form);
        if (!/^\d{4,8}$/.test(d.pin1)) { UI.toast('El PIN debe tener entre 4 y 8 números.', 'error'); return false; }
        if (d.pin1 !== d.pin2) { UI.toast('Los PIN no coinciden.', 'error'); return false; }
        KF.App.hashPin(d.pin1).then(function (h) {
          S.saveSettings({ pinHash: h, pinLen: d.pin1.length });
          UI.toast('Clave guardada');
          KF.App.refresh();
        });
      }
    });
  }

  KF.Ajustes = AJ;
})(window.KF);
