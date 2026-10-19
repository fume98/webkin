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

    main.innerHTML =
      '<div class="page-head"><div><h1>Ajustes</h1><p class="sub">Configurá la aplicación a tu medida</p></div></div>' +

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
        '<h2>' + U.icon('download') + 'Copia de seguridad</h2>' +
        '<p>Tenés <strong>' + st.profesionales + '</strong> ' + (st.profesionales === 1 ? 'profesional' : 'profesionales') + ', <strong>' + st.pacientes + '</strong> pacientes, <strong>' + st.turnos + '</strong> turnos, ' +
          '<strong>' + st.evoluciones + '</strong> registros de historia clínica y <strong>' + st.pagos + '</strong> pagos.</p>' +
        '<p class="muted">Los datos se guardan en este dispositivo y navegador. Descargá una copia de seguridad seguido ' +
          '(por ejemplo, una vez por semana) y guardala en un lugar seguro (pendrive, Google Drive, mail). ' +
          'Con ese archivo podés recuperar todo o pasar los datos a otra computadora.</p>' +
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
      '</section>';

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
      U.download('kinesio-copia-' + U.today() + '.json', S.exportJSON(), 'application/json');
      S.saveSettings({ ultimoBackup: new Date().toISOString() });
      UI.toast('Copia de seguridad descargada');
      setTimeout(function () { AJ.render(main); }, 300);
    });

    main.querySelector('#bk-import').addEventListener('change', function (ev) {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        UI.confirm({
          title: 'Restaurar copia de seguridad',
          message: 'Se reemplazarán TODOS los datos actuales por los del archivo "' + file.name + '". ¿Continuar?',
          confirmLabel: 'Restaurar',
          onConfirm: function () {
            try {
              S.importJSON(reader.result);
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
        body: '<p class="confirm-text">Se eliminarán todos los pacientes, historias clínicas, turnos, pagos y ajustes. ' +
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

  /* ================= Profesionales ================= */
  /* "Lic. María Gómez" -> "MG" */
  function iniciales(nombre) {
    const partes = String(nombre || '').replace(/^(lic|dr|dra|klgo|klga|prof)\.?\s+/i, '').trim().split(/\s+/);
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
        if (id) d.id = id;
        else d.activo = true;
        S.saveProfesional(d);
        UI.toast(id ? 'Profesional actualizado' : d.nombre + ' ya tiene su agenda');
        KF.App.updateBrand();
        if (onSaved) onSaved();
      }
    });
  };

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
