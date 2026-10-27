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
  let servSel = ''; /* '' = todos los servicios (agenda general) */

  function profFiltro() {
    if (profSel && !S.profesional(profSel)) profSel = '';
    /* Al pasar a otro servicio, el profesional elegido tiene que atenderlo */
    if (profSel && servSel && S.serviciosDeProfesional(profSel).indexOf(servSel) < 0) profSel = '';
    return profSel;
  }

  /* Servicio para un turno nuevo: el de la sección abierta, o el del profesional */
  function servicioPara(profesionalId) {
    if (servSel) return servSel;
    const propios = profesionalId ? S.serviciosDeProfesional(profesionalId) : [];
    const activos = S.servicios().map(function (x) { return x.id; });
    return propios.find(function (x) { return activos.indexOf(x) >= 0; }) || S.servicioPrincipal().id;
  }

  A.setFecha = function (iso) { fechaSel = iso; };

  /* ================= Vista principal ================= */
  A.render = function (main, servicioId) {
    if (servicioId !== undefined) servSel = S.servicio(servicioId) ? servicioId : '';
    profFiltro();
    const sv = S.servicio(servSel);
    const semanaIni = U.startOfWeek(fechaSel);
    const titulo = vista === 'dia'
      ? U.fmtDateLong(fechaSel, true)
      : 'Semana del ' + U.fmtDate(semanaIni) + ' al ' + U.fmtDate(U.addDays(semanaIni, 6));

    main.innerHTML =
      '<div class="page-head">' +
        '<div><h1>' + (sv ? 'Turnos de ' + U.esc(sv.nombre) : 'Agenda de turnos') + '</h1>' +
          '<p class="sub">' + U.esc(titulo) + (fechaSel === U.today() && vista === 'dia' ? ' · Hoy' : '') + '</p></div>' +
        '<button class="btn btn-primary btn-lg" id="btn-nuevo-turno">' + U.icon('plus') +
          (sv ? 'Turno de ' + U.esc(sv.nombre) : 'Nuevo turno') + '</button>' +
      '</div>' +
      tabsServicios() +
      UI.profFilter(profSel, sv ? 'Todos los profesionales' : 'Todas las agendas', servSel) +
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
      A.openForm(null, { fecha: fechaSel, profesionalId: profSel, servicio: servSel }, KF.App.refresh);
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

  /* Pestañas Kinesiología | Quiropraxia | Todas (solo si hay más de un servicio) */
  function tabsServicios() {
    const lista = S.servicios();
    if (lista.length < 2) return '';
    return '<nav class="serv-tabs" aria-label="Servicios">' +
      lista.map(function (x) {
        return '<a href="#/agenda/' + U.esc(x.id) + '" class="' + (servSel === x.id ? 'active' : '') + '" style="--serv:' + U.esc(x.color || '#4f5e5b') + '">' +
          '<i aria-hidden="true"></i>' + U.esc(x.nombre) + '</a>';
      }).join('') +
      '<a href="#/agenda" class="todas ' + (!servSel ? 'active' : '') + '">Todas</a>' +
    '</nav>';
  }

  function weekStrip(ini) {
    const hoy = U.today();
    let html = '<div class="week-strip">';
    for (let i = 0; i < 7; i++) {
      const f = U.addDays(ini, i);
      const d = U.parseDate(f);
      const n = S.turnosDelDia(f, profSel, servSel).filter(function (t) { return t.estado !== 'cancelado'; }).length;
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
    const indic = p && p.sesionesIndicadas && t.servicio === S.servicioPrincipal().id ? ' de ' + U.esc(p.sesionesIndicadas) : '';
    return '<button class="turno-card estado-' + U.esc(t.estado) + (compact ? ' compact' : '') + '" data-turno="' + U.esc(t.id) + '">' +
      '<span class="t-hora"><strong>' + U.esc(t.hora) + '</strong>' + (compact ? '' : '<small>' + fin + '</small>') + '</span>' +
      '<span class="t-info">' +
        '<strong>' + U.esc(U.fullName(p)) + '</strong>' +
        '<small>' + (n && S.cuentaComoSesion(t.estado) ? 'Sesión ' + n + indic : '') +
          (!compact && t.motivo ? (n ? ' · ' : '') + U.esc(t.motivo) : '') + '</small>' +
        (!profSel && UI.hayVariosProfesionales() ? UI.profTag(t.profesionalId, compact ? 'sm' : '') : '') +
        (!servSel && UI.hayVariosServicios() ? UI.servTag(t.servicio, compact ? 'sm' : '') : '') +
      '</span>' +
      (t.avisadoWhatsApp && !compact ? '<span class="t-avisado" title="Turno enviado por WhatsApp">' + U.icon('whatsapp') + '</span>' : '') +
      (compact ? '' : UI.estadoBadge(t.estado)) +
    '</button>';
  }

  function bindCards(box) {
    box.querySelectorAll('[data-turno]').forEach(function (b) {
      b.addEventListener('click', function () { A.openDetail(b.dataset.turno, KF.App.refresh); });
    });
  }

  function drawDay(box, fecha) {
    const turnos = S.turnosDelDia(fecha, profSel, servSel);
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
        A.openForm(null, { fecha: fecha, hora: b.dataset.slot, profesionalId: b.dataset.prof, servicio: servicioPara(b.dataset.prof) }, KF.App.refresh);
      });
    });
  }

  /* Horarios libres de cada profesional según su jornada */
  function libresDe(fecha, profesionalId) {
    const cfg = S.configProfesional(profesionalId, servicioPara(profesionalId));
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
    const profs = profSel ? [S.profesional(profSel)] : S.profesionalesDeServicio(servSel);
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
      const turnos = S.turnosDelDia(f, profSel, servSel);
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
    if (!pre.servicio) pre.servicio = servicioPara(pre.profesionalId);
    if (!pre.profesionalId || S.serviciosDeProfesional(pre.profesionalId).indexOf(pre.servicio) < 0) {
      const delServicio = S.profesionalesDeServicio(pre.servicio);
      const filtro = profFiltro();
      pre.profesionalId = (filtro && delServicio.some(function (p) { return p.id === filtro; }) ? filtro : '') ||
        (delServicio[0] && delServicio[0].id) || S.profesionalPrincipal().id;
    }
    const t = id ? S.turno(id) : Object.assign({
      fecha: U.today(),
      hora: '',
      duracion: S.configProfesional(pre.profesionalId, pre.servicio).duracionTurno,
      estado: 'pendiente'
    }, pre);

    const dias = [1, 2, 3, 4, 5, 6];
    const body =
      '<div class="form-grid">' +
        UI.servicioCampo(t.servicio, { label: 'Tipo de turno' }) +
        UI.pacienteSelect(t.pacienteId) +
        UI.profSelect(t.profesionalId, { label: 'Profesional que atiende', servicio: t.servicio }) +
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
          '<summary>' + U.icon('calendar') + 'Dar varios turnos de una vez (opcional)</summary>' +
          '<div class="segmented rep-modo" role="radiogroup" aria-label="Cómo elegir los turnos">' +
            '<label><input type="radio" name="rep_modo" value="fechas" checked><span>Fechas y horarios a elección</span></label>' +
            '<label><input type="radio" name="rep_modo" value="semana"><span>Mismos días cada semana</span></label>' +
          '</div>' +
          '<div class="rep-panel" data-panel="fechas">' +
            '<p class="hint">El primer turno es el de arriba. Agregá todas las fechas y horarios que quieras.</p>' +
            '<div class="fechas-lista"></div>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-add-fecha>' + U.icon('plus') + 'Agregar otra fecha</button>' +
          '</div>' +
          '<div class="rep-panel" data-panel="semana" hidden>' +
            '<p class="hint">Elegí los días de la semana y cuántas sesiones en total. ' +
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
          '</div>' +
          '<p class="hint rep-wa">' + U.icon('whatsapp') + '<span>Con <strong>"Dar turnos y enviar por WhatsApp"</strong> se guardan todos y se le mandan juntos al paciente.</span></p>' +
        '</details>');

    const svT = S.servicio(t.servicio);
    let enviarWa = false; /* lo activa el botón "Dar turno y enviar por WhatsApp" */
    const modalEl = UI.modal({
      title: id ? 'Editar turno' : (svT && UI.hayVariosServicios() ? 'Nuevo turno de ' + svT.nombre : 'Nuevo turno'),
      size: 'md',
      body: body,
      submitLabel: id ? 'Guardar cambios' : 'Dar turno',
      extraFooter: id ? '' : '<button type="button" class="btn btn-wa" data-guardar-wa>' + U.icon('whatsapp') + '<span>Dar turno y enviar por WhatsApp</span></button>',
      onOpen: function (modal) {
        if (!id) prepararVarios(modal);
        const prof = modal.querySelector('[name=profesionalId]');
        const dur = modal.querySelector('[name=duracion]');
        const servicioElegido = function () {
          const r = modal.querySelector('[name=servicio]:checked') || modal.querySelector('[name=servicio]');
          return r ? r.value : '';
        };
        /* Al cambiar de servicio o de profesional se sugiere la duración que corresponde */
        const sugerir = function () { if (!id) dur.value = S.configProfesional(prof.value, servicioElegido()).duracionTurno; };
        prof.addEventListener('change', sugerir);
        modal.querySelectorAll('input[type=radio][name=servicio]').forEach(function (r) {
          r.addEventListener('change', function () {
            /* Solo quedan los profesionales que atienden ese servicio */
            prof.innerHTML = UI.profOptions(r.value, prof.value);
            const titulo = modal.querySelector('#modal-title');
            const sv = S.servicio(r.value);
            if (!id && titulo && sv) titulo.textContent = 'Nuevo turno de ' + sv.nombre;
            sugerir();
          });
        });
      },
      onSubmit: function (form) {
        const d = UI.formData(form);
        const modo = (form.querySelector('input[name=rep_modo]:checked') || {}).value;
        const repDias = Array.prototype.map.call(form.querySelectorAll('input[name=rep_dia]:checked'), function (x) { return Number(x.value); });
        const repTotal = Number(d.rep_total) || 0;
        const abierto = form.querySelector('.repeat-box') && form.querySelector('.repeat-box').open;
        ['rep_dia', 'rep_total', 'rep_modo', 'ext_fecha', 'ext_hora'].forEach(function (k) { delete d[k]; });
        d.duracion = Number(d.duracion) || 45;
        const quiereWa = enviarWa;
        enviarWa = false;

        if (!id && abierto) {
          let lista = null;
          if (modo === 'semana' && repDias.length && repTotal > 1) {
            lista = fechasPorSemana(d.fecha, repDias, repTotal).map(function (f) { return { fecha: f, hora: d.hora }; });
          } else if (modo === 'fechas') {
            const extras = leerFechasExtra(form);
            if (extras === null) return false;
            if (extras.length) lista = [{ fecha: d.fecha, hora: d.hora }].concat(extras);
          }
          if (lista) return crearTurnos(d, lista, onSaved, quiereWa);
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
        const guardado = S.saveTurno(d);
        fechaSel = d.fecha;
        if (onSaved) onSaved();
        if (id) { UI.toast('Turno actualizado'); return; }
        if (quiereWa) enviarPorWhatsApp([guardado]);
        /* Turno nuevo: se ofrece avisar al paciente y agendarlo (después de cerrar este formulario) */
        setTimeout(function () { KF.Avisos.mostrarOtorgados([guardado.id], onSaved); }, 0);
      }
    });

    /* "Dar turno y enviar por WhatsApp": guarda y abre WhatsApp en el mismo toque */
    const btnWa = modalEl.querySelector('[data-guardar-wa]');
    if (btnWa) btnWa.addEventListener('click', function () {
      enviarWa = true;
      const form = modalEl.querySelector('form');
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true }));
      enviarWa = false;
    });
  };

  /* ---------- Varios turnos de una vez ---------- */
  function prepararVarios(modal) {
    const box = modal.querySelector('.repeat-box');
    if (!box) return;
    const lista = box.querySelector('.fechas-lista');
    const btnWa = modal.querySelector('[data-guardar-wa] span');
    const fechaBase = modal.querySelector('[name=fecha]');
    const horaBase = modal.querySelector('[name=hora]');

    const contar = function () {
      const modo = (box.querySelector('input[name=rep_modo]:checked') || {}).value;
      let n = 1;
      if (box.open && modo === 'fechas') n += lista.querySelectorAll('.fecha-row').length;
      if (box.open && modo === 'semana') n = Math.max(1, Number(box.querySelector('[name=rep_total]').value) || 1);
      const submit = modal.querySelector('.modal-foot button[type=submit]');
      submit.lastChild.textContent = n > 1 ? 'Dar ' + n + ' turnos' : 'Dar turno';
      if (btnWa) btnWa.textContent = n > 1 ? 'Dar ' + n + ' turnos y enviar por WhatsApp' : 'Dar turno y enviar por WhatsApp';
    };

    const agregar = function () {
      const filas = lista.querySelectorAll('.fecha-row');
      const ultima = filas.length ? filas[filas.length - 1] : null;
      const desde = ultima ? ultima.querySelector('[name=ext_fecha]').value : fechaBase.value;
      const hora = ultima ? ultima.querySelector('[name=ext_hora]').value : horaBase.value;
      const row = document.createElement('div');
      row.className = 'fecha-row';
      row.innerHTML =
        '<span class="fecha-num">' + (filas.length + 2) + '</span>' +
        '<input type="date" name="ext_fecha" aria-label="Fecha" value="' + (desde ? U.addDays(desde, 7) : '') + '">' +
        '<input type="time" name="ext_hora" aria-label="Hora" step="300" value="' + U.esc(hora || '') + '">' +
        '<button type="button" class="btn-icon danger" aria-label="Quitar esta fecha">' + U.icon('x') + '</button>';
      row.querySelector('button').addEventListener('click', function () {
        row.remove();
        lista.querySelectorAll('.fecha-num').forEach(function (el, i) { el.textContent = i + 2; });
        contar();
      });
      lista.appendChild(row);
      contar();
      const inp = row.querySelector('[name=ext_fecha]');
      if (window.matchMedia('(pointer:fine)').matches) inp.focus();
    };

    box.querySelector('[data-add-fecha]').addEventListener('click', agregar);
    box.addEventListener('toggle', function () {
      if (box.open && !lista.children.length && (box.querySelector('input[name=rep_modo]:checked') || {}).value === 'fechas') agregar();
      contar();
    });
    box.querySelectorAll('input[name=rep_modo]').forEach(function (r) {
      r.addEventListener('change', function () {
        box.querySelectorAll('.rep-panel').forEach(function (p) { p.hidden = p.dataset.panel !== r.value; });
        if (r.value === 'fechas' && !lista.children.length) agregar();
        contar();
      });
    });
    box.querySelector('[name=rep_total]').addEventListener('input', contar);
  }

  /* Lee las fechas extra; null si hay alguna incompleta */
  function leerFechasExtra(form) {
    const out = [];
    let incompleta = false;
    form.querySelectorAll('.fecha-row').forEach(function (row) {
      const f = row.querySelector('[name=ext_fecha]').value;
      const h = row.querySelector('[name=ext_hora]').value;
      row.classList.toggle('invalid', !f || !h);
      if (!f || !h) incompleta = true;
      else out.push({ fecha: f, hora: h });
    });
    if (incompleta) { UI.toast('Completá la fecha y la hora de cada turno, o quitá los que no uses.', 'error'); return null; }
    return out;
  }

  function fechasPorSemana(desde, dias, total) {
    const fechas = [];
    let f = desde;
    let guard = 0;
    while (fechas.length < total && guard < 400) {
      if (dias.indexOf(U.parseDate(f).getDay()) >= 0) fechas.push(f);
      f = U.addDays(f, 1);
      guard++;
    }
    return fechas;
  }

  function enviarPorWhatsApp(turnos) {
    const p = S.paciente(turnos[0].pacienteId);
    const wa = p ? U.waLink(p.telefono, KF.Avisos.mensajeConfirmacion(turnos)) : '';
    if (!wa) {
      UI.toast('El paciente no tiene teléfono cargado: no se pudo enviar por WhatsApp.', 'error');
      return;
    }
    window.open(wa, '_blank', 'noopener');
    KF.Avisos.marcarAvisados(turnos);
    UI.toast('Se abrió WhatsApp con ' + (turnos.length === 1 ? 'el turno' : 'los ' + turnos.length + ' turnos') + ' para enviar');
  }

  /* Crea varios turnos iguales en distintas fechas y horarios */
  function crearTurnos(base, lista, onSaved, enviarWa) {
    /* Sin repetidos y en orden */
    const vistos = {};
    const unicos = lista.filter(function (x) {
      const k = x.fecha + ' ' + x.hora;
      if (vistos[k]) return false;
      vistos[k] = true;
      return true;
    }).sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
    let choques = 0;
    const guardados = [];
    unicos.forEach(function (x) {
      if (S.turnoSuperpuesto(x.fecha, x.hora, base.duracion, null, base.profesionalId)) choques++;
      guardados.push(S.saveTurno(Object.assign({}, base, { fecha: x.fecha, hora: x.hora })));
    });
    if (choques) UI.toast(choques + (choques === 1 ? ' turno se superpone' : ' turnos se superponen') + ' con otros. Revisá la agenda.', 'error');
    fechaSel = unicos[0].fecha;
    if (onSaved) onSaved();
    if (enviarWa) enviarPorWhatsApp(guardados);
    const ids = guardados.map(function (t) { return t.id; });
    setTimeout(function () { KF.Avisos.mostrarOtorgados(ids, onSaved); }, 0);
  }

  /* ================= Detalle del turno ================= */
  A.openDetail = function (id, onChange) {
    const t = S.turno(id);
    if (!t) return;
    const p = S.paciente(t.pacienteId);
    const n = S.numeroSesion(t);
    const prof = S.profesional(t.profesionalId);
    const pagos = S.pagos().filter(function (x) { return x.turnoId === t.id; });

    const wa = p ? U.waLink(p.telefono, KF.Avisos.mensajeRecordatorio(t)) : '';
    const waConfirmar = p ? U.waLink(p.telefono, KF.Avisos.mensajeConfirmacion([t])) : '';

    const body =
      '<div class="turno-detail">' +
        '<div class="td-head">' +
          '<span class="avatar">' + U.esc(p ? U.initials(p) : '?') + '</span>' +
          '<div><strong class="td-name">' + U.esc(U.fullName(p)) + '</strong>' +
          '<span class="muted">' + (p && p.telefono ? U.esc(p.telefono) : 'Sin teléfono') + '</span></div>' +
        '</div>' +
        '<dl class="info-grid">' +
          (UI.hayVariosServicios() ? '<div class="info full"><dt>Servicio</dt><dd>' + (UI.servTag(t.servicio) || '—') + '</dd></div>' : '') +
          '<div class="info full"><dt>Profesional</dt><dd>' + (UI.profTag(t.profesionalId) || '—') +
            (prof && prof.especialidad ? ' <span class="muted">' + U.esc(prof.especialidad) + '</span>' : '') + '</dd></div>' +
          '<div class="info"><dt>Fecha</dt><dd>' + U.fmtDateLong(t.fecha, true) + '</dd></div>' +
          '<div class="info"><dt>Horario</dt><dd>' + U.esc(t.hora) + ' a ' + U.minToTime(U.timeToMin(t.hora) + Number(t.duracion || 0)) + ' hs</dd></div>' +
          '<div class="info"><dt>Sesión</dt><dd>' + (n && S.cuentaComoSesion(t.estado) ? 'N° ' + n + (p && p.sesionesIndicadas && t.servicio === S.servicioPrincipal().id ? ' de ' + U.esc(p.sesionesIndicadas) : '') : '—') + '</dd></div>' +
          '<div class="info"><dt>Pago</dt><dd>' + (pagos.length
            ? pagos.map(function (x) { return U.fmtMoney(x.monto) + ' (' + U.esc(x.forma) + ')'; }).join('<br>')
            : '<span class="muted">Sin pago asociado</span>') + '</dd></div>' +
          (t.motivo ? '<div class="info full"><dt>Motivo</dt><dd>' + U.esc(t.motivo) + '</dd></div>' : '') +
          (t.notas ? '<div class="info full"><dt>Notas</dt><dd>' + U.nl2br(t.notas) + '</dd></div>' : '') +
          (t.avisadoWhatsApp ? '<div class="info full"><dt>Aviso</dt><dd>' + U.icon('whatsapp') + ' Enviado por WhatsApp el ' +
            U.fmtDate(U.toISODate(new Date(t.avisadoWhatsApp))) + '</dd></div>' : '') +
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
          (waConfirmar ? '<a class="btn btn-wa" href="' + U.esc(waConfirmar) + '" target="_blank" rel="noopener" data-q="wa-confirmar">' + U.icon('whatsapp') + 'Enviar turno por WhatsApp</a>' : '') +
          (wa ? '<a class="btn btn-secondary" href="' + U.esc(wa) + '" target="_blank" rel="noopener" data-q="wa-recordar">' + U.icon('whatsapp') + 'Recordatorio por WhatsApp</a>' : '') +
          '<a class="btn btn-secondary" href="' + U.esc(KF.Avisos.linkGoogle(t, 'profesional')) + '" target="_blank" rel="noopener">' + U.icon('calendar') + 'Agregar a Google Calendar</a>' +
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
              fecha: t.fecha, turnoId: t.id, profesionalId: t.profesionalId, servicio: t.servicio, sesionNro: S.numeroSesion(S.turno(t.id)) || ''
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
      KF.Pacientes.openEvolucion(t.pacienteId, null, onChange, { fecha: t.fecha, turnoId: t.id, profesionalId: t.profesionalId, servicio: t.servicio, sesionNro: n || '' });
    });
    q('pago', function () {
      UI.closeModal();
      KF.Pagos.openForm(null, { pacienteId: t.pacienteId, turnoId: t.id, fecha: t.fecha, profesionalId: t.profesionalId, servicio: t.servicio }, onChange);
    });
    q('ficha', function () { UI.closeModal(); });
    q('wa-confirmar', function () { KF.Avisos.marcarAvisados([t]); if (onChange) onChange(); });
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
