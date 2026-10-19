/* Agenda de turnos: vista por día y por semana, alta, detalle y estados */
(function (KF) {
  'use strict';

  const U = KF.U;
  const UI = KF.UI;
  const S = KF.Store;

  const A = {};
  let fechaSel = U.today();
  let vista = 'dia';
  let profSel = ''; /* '' = todos los profesionales */

  function profFiltro() {
    if (profSel && !S.profesional(profSel)) profSel = '';
    return profSel;
  }

  A.setFecha = function (iso) { fechaSel = iso; };

  /* ================= Vista principal ================= */
  A.render = function (main) {
    profFiltro();
    const semanaIni = U.startOfWeek(fechaSel);
    const titulo = vista === 'dia'
      ? U.fmtDateLong(fechaSel, true)
      : 'Semana del ' + U.fmtDate(semanaIni) + ' al ' + U.fmtDate(U.addDays(semanaIni, 6));

    main.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Agenda de turnos</h1><p class="sub">' + U.esc(titulo) + (fechaSel === U.today() && vista === 'dia' ? ' · Hoy' : '') + '</p></div>' +
        '<button class="btn btn-primary btn-lg" id="btn-nuevo-turno">' + U.icon('plus') + 'Nuevo turno</button>' +
      '</div>' +
      UI.profFilter(profSel, 'Todas las agendas') +
      '<div class="agenda-bar">' +
        '<div class="date-nav">' +
          '<button class="btn-icon lg" data-nav="-1" aria-label="Anterior">' + U.icon('chevronLeft') + '</button>' +
          '<button class="btn btn-ghost" data-nav="hoy">Hoy</button>' +
          '<input type="date" id="agenda-fecha" value="' + fechaSel + '" aria-label="Elegir fecha">' +
          '<button class="btn-icon lg" data-nav="1" aria-label="Siguiente">' + U.icon('chevronRight') + '</button>' +
        '</div>' +
        '<div class="segmented" role="group" aria-label="Vista">' +
          '<button data-vista="dia" class="' + (vista === 'dia' ? 'active' : '') + '">Día</button>' +
          '<button data-vista="semana" class="' + (vista === 'semana' ? 'active' : '') + '">Semana</button>' +
        '</div>' +
      '</div>' +
      weekStrip(semanaIni) +
      '<div id="agenda-body"></div>';

    main.querySelector('#btn-nuevo-turno').addEventListener('click', function () {
      A.openForm(null, { fecha: fechaSel, profesionalId: profSel }, KF.App.refresh);
    });
    UI.bindProfFilter(main, function (id) { profSel = id; A.render(main); });
    main.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.dataset.nav;
        if (v === 'hoy') fechaSel = U.today();
        else fechaSel = U.addDays(fechaSel, Number(v) * (vista === 'dia' ? 1 : 7));
        A.render(main);
      });
    });
    main.querySelector('#agenda-fecha').addEventListener('change', function (ev) {
      if (ev.target.value) { fechaSel = ev.target.value; A.render(main); }
    });
    main.querySelectorAll('[data-vista]').forEach(function (b) {
      b.addEventListener('click', function () { vista = b.dataset.vista; A.render(main); });
    });
    main.querySelectorAll('.week-strip button').forEach(function (b) {
      b.addEventListener('click', function () { fechaSel = b.dataset.fecha; vista = 'dia'; A.render(main); });
    });

    const body = main.querySelector('#agenda-body');
    if (vista === 'dia') drawDay(body, fechaSel);
    else drawWeek(body, semanaIni);
  };

  function weekStrip(ini) {
    const hoy = U.today();
    let html = '<div class="week-strip">';
    for (let i = 0; i < 7; i++) {
      const f = U.addDays(ini, i);
      const d = U.parseDate(f);
      const n = S.turnosDelDia(f, profSel).filter(function (t) { return t.estado !== 'cancelado'; }).length;
      html += '<button data-fecha="' + f + '" class="' + (f === fechaSel ? 'sel ' : '') + (f === hoy ? 'today' : '') + '">' +
        '<span class="wd">' + U.DIAS_CORTOS[d.getDay()] + '</span>' +
        '<span class="dn">' + d.getDate() + '</span>' +
        '<span class="cnt">' + (n ? n + (n === 1 ? ' turno' : ' turnos') : '&nbsp;') + '</span>' +
      '</button>';
    }
    return html + '</div>';
  }

  function turnoCard(t, compact) {
    const p = S.paciente(t.pacienteId);
    const n = S.numeroSesion(t);
    const fin = U.minToTime(U.timeToMin(t.hora) + (Number(t.duracion) || 0));
    const indic = p && p.sesionesIndicadas ? ' de ' + U.esc(p.sesionesIndicadas) : '';
    return '<button class="turno-card estado-' + U.esc(t.estado) + (compact ? ' compact' : '') + '" data-turno="' + U.esc(t.id) + '">' +
      '<span class="t-hora"><strong>' + U.esc(t.hora) + '</strong>' + (compact ? '' : '<small>' + fin + '</small>') + '</span>' +
      '<span class="t-info">' +
        '<strong>' + U.esc(U.fullName(p)) + '</strong>' +
        '<small>' + (n && t.estado !== 'cancelado' && t.estado !== 'ausente' ? 'Sesión ' + n + indic : '') +
          (!compact && t.motivo ? (n ? ' · ' : '') + U.esc(t.motivo) : '') + '</small>' +
        (!profSel && UI.hayVariosProfesionales() ? UI.profTag(t.profesionalId, compact ? 'sm' : '') : '') +
      '</span>' +
      (compact ? '' : UI.estadoBadge(t.estado)) +
    '</button>';
  }

  function bindCards(box) {
    box.querySelectorAll('[data-turno]').forEach(function (b) {
      b.addEventListener('click', function () { A.openDetail(b.dataset.turno, KF.App.refresh); });
    });
  }

  function drawDay(box, fecha) {
    const turnos = S.turnosDelDia(fecha, profSel);
    if (!turnos.length) {
      box.innerHTML = UI.empty('calendar', 'No hay turnos para este día', 'Podés agregar uno con el botón "Nuevo turno" o tocando un horario libre.') +
        freeSlots(fecha);
    } else {
      box.innerHTML = '<div class="day-list">' + turnos.map(function (t) { return turnoCard(t); }).join('') + '</div>' +
        freeSlots(fecha);
    }
    bindCards(box);
    box.querySelectorAll('[data-slot]').forEach(function (b) {
      b.addEventListener('click', function () {
        A.openForm(null, { fecha: fecha, hora: b.dataset.slot, profesionalId: b.dataset.prof }, KF.App.refresh);
      });
    });
  }

  /* Horarios libres de cada profesional según su jornada */
  function libresDe(fecha, profesionalId) {
    const cfg = S.configProfesional(profesionalId);
    const dur = cfg.duracionTurno;
    let ini = U.timeToMin(cfg.horaInicio);
    const fin = U.timeToMin(cfg.horaFin);
    const hoy = U.today();
    const ahora = U.timeToMin(U.nowTime());
    const libres = [];
    for (; ini + dur <= fin; ini += dur) {
      const h = U.minToTime(ini);
      if (fecha < hoy || (fecha === hoy && ini < ahora)) continue;
      if (!S.turnoSuperpuesto(fecha, h, dur, null, profesionalId)) libres.push(h);
    }
    return libres;
  }

  function freeSlots(fecha) {
    const profs = profSel ? [S.profesional(profSel)] : S.profesionales();
    const varios = profs.length > 1;
    const grupos = profs.map(function (p) {
      const libres = libresDe(fecha, p.id);
      if (!libres.length) return '';
      return (varios ? '<div class="slots-group"><h4>' + UI.profTag(p.id) + '</h4>' : '') +
        '<div class="slots">' + libres.map(function (h) {
          return '<button class="slot" data-slot="' + h + '" data-prof="' + U.esc(p.id) + '" ' +
            'aria-label="' + h + (varios ? ' con ' + U.esc(p.nombre) : '') + '">' + h + '</button>';
        }).join('') + '</div>' + (varios ? '</div>' : '');
    }).join('');
    if (!grupos) return '';
    return '<div class="panel slots-panel"><h3>' + U.icon('clock') + 'Horarios libres</h3>' + grupos + '</div>';
  }

  function drawWeek(box, ini) {
    let html = '<div class="week-grid">';
    for (let i = 0; i < 7; i++) {
      const f = U.addDays(ini, i);
      const d = U.parseDate(f);
      const turnos = S.turnosDelDia(f, profSel);
      html += '<section class="week-col' + (f === U.today() ? ' today' : '') + '">' +
        '<h3><button class="linklike" data-dia="' + f + '">' + U.DIAS_CORTOS[d.getDay()] + ' ' + d.getDate() + '</button></h3>' +
        (turnos.length ? turnos.map(function (t) { return turnoCard(t, true); }).join('') : '<p class="muted small">Sin turnos</p>') +
      '</section>';
    }
    box.innerHTML = html + '</div>';
    bindCards(box);
    box.querySelectorAll('[data-dia]').forEach(function (b) {
      b.addEventListener('click', function () {
        fechaSel = b.dataset.dia;
        vista = 'dia';
        KF.App.refresh();
      });
    });
  }

  /* ================= Formulario de turno ================= */
  A.openForm = function (id, preset, onSaved) {
    if (!S.pacientes().length) {
      UI.modal({
        title: 'Primero cargá un paciente',
        size: 'sm',
        body: '<p class="confirm-text">Para dar un turno necesitás tener al menos un paciente cargado.</p>',
        extraFooter: '<button type="button" class="btn btn-primary" id="go-new-pac">' + U.icon('plus') + 'Nuevo paciente</button>'
      });
      document.getElementById('go-new-pac').addEventListener('click', function () {
        UI.closeModal();
        KF.Pacientes.openForm();
      });
      return;
    }

    const pre = Object.assign({}, preset || {});
    if (!pre.profesionalId) pre.profesionalId = profFiltro() || S.profesionalPrincipal().id;
    const t = id ? S.turno(id) : Object.assign({
      fecha: U.today(),
      hora: '',
      duracion: S.configProfesional(pre.profesionalId).duracionTurno,
      estado: 'pendiente'
    }, pre);

    const dias = [1, 2, 3, 4, 5, 6];
    const body =
      '<div class="form-grid">' +
        UI.pacienteSelect(t.pacienteId) +
        UI.profSelect(t.profesionalId, { label: 'Profesional que atiende' }) +
        UI.field({ name: 'fecha', label: 'Fecha', type: 'date', value: t.fecha, required: true }) +
        UI.field({ name: 'hora', label: 'Hora', type: 'time', value: t.hora, required: true, step: 300 }) +
        UI.field({ name: 'duracion', label: 'Duración (minutos)', type: 'number', value: t.duracion, min: 5, step: 5, required: true }) +
        UI.field({ name: 'estado', label: 'Estado', type: 'select', value: t.estado, options: S.ESTADOS_TURNO }) +
        UI.field({ name: 'motivo', label: 'Motivo / Tratamiento', value: t.motivo, full: true,
          placeholder: 'Ej: Rehabilitación de rodilla, evaluación inicial…' }) +
        UI.field({ name: 'notas', label: 'Notas', type: 'textarea', rows: 2, value: t.notas, full: true }) +
      '</div>' +
      (id ? '' :
        '<details class="repeat-box">' +
          '<summary>' + U.icon('calendar') + 'Dar varias sesiones de una vez (opcional)</summary>' +
          '<p class="hint">Ideal para tratamientos: elegí los días de la semana y cuántas sesiones en total. ' +
          'Se crean a la misma hora a partir de la fecha indicada.</p>' +
          '<div class="dias-check" role="group" aria-label="Días de la semana">' +
            dias.map(function (d) {
              return '<label class="chip"><input type="checkbox" name="rep_dia" value="' + d + '"><span>' + U.DIAS_CORTOS[d] + '</span></label>';
            }).join('') +
          '</div>' +
          '<div class="form-grid">' +
            UI.field({ name: 'rep_total', label: 'Cantidad total de sesiones', type: 'number', min: 1, max: 60, step: 1,
              placeholder: 'Ej: 10' }) +
          '</div>' +
        '</details>');

    UI.modal({
      title: id ? 'Editar turno' : 'Nuevo turno',
      size: 'md',
      body: body,
      submitLabel: id ? 'Guardar cambios' : 'Dar turno',
      onOpen: function (modal) {
        /* Al cambiar de profesional se sugiere la duración de su turno */
        const prof = modal.querySelector('[name=profesionalId]');
        const dur = modal.querySelector('[name=duracion]');
        if (!id) prof.addEventListener('change', function () { dur.value = S.configProfesional(prof.value).duracionTurno; });
      },
      onSubmit: function (form) {
        const d = UI.formData(form);
        const repDias = Array.prototype.map.call(form.querySelectorAll('input[name=rep_dia]:checked'), function (x) { return Number(x.value); });
        const repTotal = Number(d.rep_total) || 0;
        delete d.rep_dia;
        delete d.rep_total;
        d.duracion = Number(d.duracion) || 45;

        if (!id && repDias.length && repTotal > 1) {
          return crearSerie(d, repDias, repTotal, onSaved);
        }

        const choque = S.turnoSuperpuesto(d.fecha, d.hora, d.duracion, id, d.profesionalId);
        if (choque) {
          const pc = S.paciente(choque.pacienteId);
          const pr = S.profesional(d.profesionalId);
          if (!window.confirm('Ese horario se superpone con el turno de ' + U.fullName(pc) + ' a las ' + choque.hora +
            (UI.hayVariosProfesionales() && pr ? ' en la agenda de ' + pr.nombre : '') + '. ¿Guardar igual?')) {
            return false;
          }
        }
        if (id) d.id = id;
        S.saveTurno(d);
        UI.toast(id ? 'Turno actualizado' : 'Turno asignado para el ' + U.fmtDate(d.fecha) + ' a las ' + d.hora);
        fechaSel = d.fecha;
        if (onSaved) onSaved();
      }
    });
  };

  function crearSerie(base, dias, total, onSaved) {
    const fechas = [];
    let f = base.fecha;
    let guard = 0;
    while (fechas.length < total && guard < 400) {
      if (dias.indexOf(U.parseDate(f).getDay()) >= 0) fechas.push(f);
      f = U.addDays(f, 1);
      guard++;
    }
    let choques = 0;
    fechas.forEach(function (fecha) {
      if (S.turnoSuperpuesto(fecha, base.hora, base.duracion, null, base.profesionalId)) choques++;
      S.saveTurno(Object.assign({}, base, { fecha: fecha }));
    });
    UI.toast('Se asignaron ' + fechas.length + ' turnos (' + U.fmtDate(fechas[0]) + ' al ' + U.fmtDate(fechas[fechas.length - 1]) + ')');
    if (choques) UI.toast(choques + (choques === 1 ? ' turno se superpone' : ' turnos se superponen') + ' con otros. Revisá la agenda.', 'error');
    fechaSel = fechas[0];
    if (onSaved) onSaved();
  }

  /* ================= Detalle del turno ================= */
  A.openDetail = function (id, onChange) {
    const t = S.turno(id);
    if (!t) return;
    const p = S.paciente(t.pacienteId);
    const n = S.numeroSesion(t);
    const set = S.settings;
    const prof = S.profesional(t.profesionalId);
    const pagos = S.pagos().filter(function (x) { return x.turnoId === t.id; });

    const msg = 'Hola ' + (p ? p.nombre : '') + '! Te recuerdo tu turno en FisioCoreSalud - Quiropraxia Cuerpo Vital el ' +
      U.fmtDateLong(t.fecha).toLowerCase() + ' a las ' + t.hora + ' hs' +
      (prof && UI.hayVariosProfesionales() ? ' con ' + prof.nombre : '') +
      (set.direccion ? ' en ' + set.direccion : '') + '. Por favor confirmá tu asistencia. ' +
      '\n' + (prof ? prof.nombre + ' · ' : '') + 'FisioCoreSalud - Quiropraxia Cuerpo Vital';
    const wa = p ? U.waLink(p.telefono, msg) : '';

    const body =
      '<div class="turno-detail">' +
        '<div class="td-head">' +
          '<span class="avatar">' + U.esc(p ? U.initials(p) : '?') + '</span>' +
          '<div><strong class="td-name">' + U.esc(U.fullName(p)) + '</strong>' +
          '<span class="muted">' + (p && p.telefono ? U.esc(p.telefono) : 'Sin teléfono') + '</span></div>' +
        '</div>' +
        '<dl class="info-grid">' +
          '<div class="info full"><dt>Profesional</dt><dd>' + (UI.profTag(t.profesionalId) || '—') +
            (prof && prof.especialidad ? ' <span class="muted">' + U.esc(prof.especialidad) + '</span>' : '') + '</dd></div>' +
          '<div class="info"><dt>Fecha</dt><dd>' + U.fmtDateLong(t.fecha, true) + '</dd></div>' +
          '<div class="info"><dt>Horario</dt><dd>' + U.esc(t.hora) + ' a ' + U.minToTime(U.timeToMin(t.hora) + Number(t.duracion || 0)) + ' hs</dd></div>' +
          '<div class="info"><dt>Sesión</dt><dd>' + (n && t.estado !== 'cancelado' && t.estado !== 'ausente' ? 'N° ' + n + (p && p.sesionesIndicadas ? ' de ' + U.esc(p.sesionesIndicadas) : '') : '—') + '</dd></div>' +
          '<div class="info"><dt>Pago</dt><dd>' + (pagos.length
            ? pagos.map(function (x) { return U.fmtMoney(x.monto) + ' (' + U.esc(x.forma) + ')'; }).join('<br>')
            : '<span class="muted">Sin pago asociado</span>') + '</dd></div>' +
          (t.motivo ? '<div class="info full"><dt>Motivo</dt><dd>' + U.esc(t.motivo) + '</dd></div>' : '') +
          (t.notas ? '<div class="info full"><dt>Notas</dt><dd>' + U.nl2br(t.notas) + '</dd></div>' : '') +
        '</dl>' +
        '<h4>¿Cómo resultó el turno?</h4>' +
        '<div class="estado-buttons">' +
          S.ESTADOS_TURNO.map(function (e) {
            return '<button type="button" class="estado-btn estado-' + e.value + (t.estado === e.value ? ' active' : '') +
              '" data-estado="' + e.value + '" aria-pressed="' + (t.estado === e.value) + '">' + e.label + '</button>';
          }).join('') +
        '</div>' +
        '<div class="quick-actions">' +
          '<button type="button" class="btn btn-secondary" data-q="evolucion">' + U.icon('activity') + 'Cargar evolución</button>' +
          '<button type="button" class="btn btn-secondary" data-q="pago">' + U.icon('dollar') + 'Registrar pago</button>' +
          (wa ? '<a class="btn btn-wa" href="' + U.esc(wa) + '" target="_blank" rel="noopener">' + U.icon('whatsapp') + 'Recordatorio por WhatsApp</a>' : '') +
          (p ? '<a class="btn btn-ghost" href="#/paciente/' + U.esc(p.id) + '" data-q="ficha">' + U.icon('user') + 'Ver ficha</a>' : '') +
        '</div>' +
      '</div>';

    const modal = UI.modal({
      title: 'Turno',
      size: 'md',
      body: body,
      extraFooter:
        '<button type="button" class="btn btn-ghost danger" data-q="borrar">' + U.icon('trash') + 'Eliminar</button>' +
        '<button type="button" class="btn btn-ghost" data-q="editar">' + U.icon('edit') + 'Editar</button>'
    });

    modal.querySelectorAll('[data-estado]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.saveTurno({ id: t.id, estado: b.dataset.estado });
        UI.closeModal();
        UI.toast('Turno marcado como "' + S.estadoLabel(b.dataset.estado) + '"');
        if (onChange) onChange();
        if (b.dataset.estado === 'asistio' && p) {
          const yaTiene = S.evolucionesDePaciente(p.id).some(function (e) { return e.turnoId === t.id; });
          if (!yaTiene) {
            KF.Pacientes.openEvolucion(p.id, null, onChange, {
              fecha: t.fecha, turnoId: t.id, profesionalId: t.profesionalId, sesionNro: S.numeroSesion(S.turno(t.id)) || ''
            });
          }
        }
      });
    });

    const q = function (name, fn) {
      const el = modal.querySelector('[data-q=' + name + ']');
      if (el) el.addEventListener('click', fn);
    };
    q('evolucion', function () {
      UI.closeModal();
      KF.Pacientes.openEvolucion(t.pacienteId, null, onChange, { fecha: t.fecha, turnoId: t.id, profesionalId: t.profesionalId, sesionNro: n || '' });
    });
    q('pago', function () {
      UI.closeModal();
      KF.Pagos.openForm(null, { pacienteId: t.pacienteId, turnoId: t.id, fecha: t.fecha, profesionalId: t.profesionalId }, onChange);
    });
    q('ficha', function () { UI.closeModal(); });
    q('editar', function () { UI.closeModal(); A.openForm(t.id, null, onChange); });
    q('borrar', function () {
      UI.confirm({
        title: 'Eliminar turno',
        message: '¿Eliminar el turno de ' + U.fullName(p) + ' del ' + U.fmtDate(t.fecha) + ' a las ' + t.hora + '?',
        onConfirm: function () {
          S.deleteTurno(t.id);
          UI.toast('Turno eliminado');
          if (onChange) onChange();
        }
      });
    });
  };

  KF.Agenda = A;
})(window.KF);
