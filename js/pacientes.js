/* Pacientes: listado, ficha, historia clínica (evoluciones por sesión) */
(function (KF) {
  'use strict';

  const U = KF.U;
  const UI = KF.UI;
  const S = KF.Store;

  const P = {};
  let filtro = '';

  /* ================= Listado ================= */
  P.renderList = function (main) {
    main.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Pacientes</h1><p class="sub">Fichas personales e historias clínicas</p></div>' +
        '<button class="btn btn-primary btn-lg" id="btn-nuevo-pac">' + U.icon('plus') + 'Nuevo paciente</button>' +
      '</div>' +
      '<div class="search-box">' + U.icon('search') +
        '<input type="search" id="buscar-pac" placeholder="Buscar por nombre, apellido, DNI o teléfono…" ' +
        'aria-label="Buscar paciente" value="' + U.esc(filtro) + '">' +
      '</div>' +
      '<div id="lista-pac"></div>';

    main.querySelector('#btn-nuevo-pac').addEventListener('click', function () { P.openForm(); });
    const input = main.querySelector('#buscar-pac');
    input.addEventListener('input', U.debounce(function () {
      filtro = input.value;
      drawList(main.querySelector('#lista-pac'));
    }, 120));
    drawList(main.querySelector('#lista-pac'));
  };

  function drawList(box) {
    const all = S.pacientes();
    if (!all.length) {
      box.innerHTML = UI.empty('users', 'Todavía no cargaste pacientes',
        'Tocá "Nuevo paciente" para crear la primera ficha.',
        '<button class="btn btn-primary" data-new>' + U.icon('plus') + 'Nuevo paciente</button>');
      box.querySelector('[data-new]').addEventListener('click', function () { P.openForm(); });
      return;
    }
    const q = U.norm(filtro);
    const qDigits = filtro.replace(/\D/g, '');
    const list = all.filter(function (p) {
      if (!q) return true;
      const hay = U.norm([p.nombre, p.apellido, p.nombre + ' ' + p.apellido, p.apellido + ' ' + p.nombre,
        p.dni, p.localidad, p.obraSocial].join(' '));
      if (hay.indexOf(q) >= 0) return true;
      return qDigits.length >= 3 && String(p.telefono || '').replace(/\D/g, '').indexOf(qDigits) >= 0;
    });

    if (!list.length) {
      box.innerHTML = UI.empty('search', 'Sin resultados', 'No hay pacientes que coincidan con "' + filtro + '".');
      return;
    }

    box.innerHTML = '<p class="count">' + list.length + (list.length === 1 ? ' paciente' : ' pacientes') + '</p>' +
      '<ul class="card-list">' + list.map(function (p) {
        const edad = U.age(p.fechaNac);
        const prox = proximoTurno(p.id);
        return '<li><a class="person-card" href="#/paciente/' + U.esc(p.id) + '">' +
          '<span class="avatar">' + U.esc(U.initials(p)) + '</span>' +
          '<span class="person-info">' +
            '<strong>' + U.esc(U.fullName(p)) + '</strong>' +
            '<span class="muted">' +
              [edad !== null ? edad + ' años' : '', p.dni ? 'DNI ' + U.esc(p.dni) : '', U.esc(p.obraSocial || '')]
                .filter(Boolean).join(' · ') +
            '</span>' +
            (p.diagnostico ? '<span class="tag">' + U.esc(p.diagnostico) + '</span>' : '') +
          '</span>' +
          '<span class="person-side">' +
            (prox ? '<span class="next">' + U.icon('calendar') + U.fmtDate(prox.fecha) + ' ' + U.esc(prox.hora) + '</span>' : '') +
            U.icon('chevronRight', 'chev') +
          '</span>' +
        '</a></li>';
      }).join('') + '</ul>';
  }

  function proximoTurno(pacienteId) {
    const hoy = U.today();
    const ahora = U.nowTime();
    return S.turnosDePaciente(pacienteId).find(function (t) {
      return t.estado !== 'cancelado' && (t.fecha > hoy || (t.fecha === hoy && t.hora >= ahora));
    }) || null;
  }

  /* ================= Formulario de ficha ================= */
  P.openForm = function (id, onSaved) {
    const p = id ? S.paciente(id) : {};
    const body =
      UI.fieldset('Datos personales', [
        { name: 'nombre', label: 'Nombre', value: p.nombre, required: true, attrs: ' autocomplete="off" autofocus' },
        { name: 'apellido', label: 'Apellido', value: p.apellido, required: true, attrs: ' autocomplete="off"' },
        { name: 'dni', label: 'DNI', value: p.dni, attrs: ' inputmode="numeric"' },
        { name: 'fechaNac', label: 'Fecha de nacimiento', type: 'date', value: p.fechaNac },
        { name: 'sexo', label: 'Sexo', type: 'select', value: p.sexo, empty: '—',
          options: ['Femenino', 'Masculino', 'Otro / Prefiere no decir'] },
        { name: 'ocupacion', label: 'Ocupación / Deporte', value: p.ocupacion }
      ], 'user') +
      UI.fieldset('Contacto', [
        { name: 'telefono', label: 'Teléfono / Celular', type: 'tel', value: p.telefono, placeholder: 'Ej: 342 155 123456' },
        { name: 'email', label: 'Email', type: 'email', value: p.email },
        { name: 'direccion', label: 'Dirección', value: p.direccion, placeholder: 'Calle y número' },
        { name: 'localidad', label: 'Localidad', value: p.localidad },
        { name: 'provincia', label: 'Provincia', value: p.provincia },
        { name: 'cp', label: 'Código postal', value: p.cp },
        { name: 'emergenciaNombre', label: 'Contacto de emergencia', value: p.emergenciaNombre, placeholder: 'Nombre y vínculo' },
        { name: 'emergenciaTel', label: 'Teléfono de emergencia', type: 'tel', value: p.emergenciaTel }
      ], 'phone') +
      UI.fieldset('Cobertura y derivación', [
        { name: 'obraSocial', label: 'Obra social / Prepaga', value: p.obraSocial, placeholder: 'Particular, IAPOS, OSDE…' },
        { name: 'nroAfiliado', label: 'N° de afiliado', value: p.nroAfiliado },
        { name: 'medicoDerivante', label: 'Médico derivante', value: p.medicoDerivante },
        { name: 'sesionesIndicadas', label: 'Sesiones indicadas', type: 'number', value: p.sesionesIndicadas, min: 0, step: 1,
          hint: 'Cantidad de sesiones de la orden médica' }
      ], 'file') +
      UI.fieldset('Historia clínica', [
        { name: 'diagnostico', label: 'Diagnóstico', value: p.diagnostico, full: true,
          placeholder: 'Ej: Lumbalgia mecánica, esguince de tobillo grado II…' },
        { name: 'motivoConsulta', label: 'Motivo de consulta', type: 'textarea', value: p.motivoConsulta, full: true },
        { name: 'antecedentes', label: 'Antecedentes (enfermedades, cirugías, lesiones previas)', type: 'textarea', value: p.antecedentes, full: true },
        { name: 'medicacion', label: 'Medicación actual', type: 'textarea', rows: 2, value: p.medicacion },
        { name: 'alergias', label: 'Alergias / Contraindicaciones', type: 'textarea', rows: 2, value: p.alergias },
        { name: 'estudios', label: 'Estudios complementarios (Rx, RMN, ecografía…)', type: 'textarea', rows: 2, value: p.estudios, full: true },
        { name: 'evaluacion', label: 'Evaluación kinésica inicial', type: 'textarea', rows: 4, value: p.evaluacion, full: true,
          placeholder: 'Inspección, palpación, rango de movimiento, fuerza, pruebas especiales, dolor (EVA)…' },
        { name: 'objetivos', label: 'Objetivos y plan de tratamiento', type: 'textarea', value: p.objetivos, full: true },
        { name: 'notas', label: 'Otras observaciones', type: 'textarea', rows: 2, value: p.notas, full: true }
      ], 'clipboard');

    UI.modal({
      title: id ? 'Editar ficha' : 'Nuevo paciente',
      size: 'lg',
      body: body,
      submitLabel: id ? 'Guardar cambios' : 'Crear ficha',
      onSubmit: function (form) {
        const d = UI.formData(form);
        if (d.dni) {
          const dup = S.pacientes().find(function (x) { return x.dni === d.dni && x.id !== id; });
          if (dup && !window.confirm('Ya existe un paciente con el DNI ' + d.dni + ' (' + U.fullName(dup) + '). ¿Guardar igual?')) {
            return false;
          }
        }
        if (id) d.id = id;
        const saved = S.savePaciente(d);
        UI.toast(id ? 'Ficha actualizada' : 'Paciente creado');
        if (onSaved) onSaved(saved);
        else if (!id) location.hash = '#/paciente/' + saved.id;
        else KF.App.refresh();
      }
    });
  };

  /* ================= Detalle del paciente ================= */
  let tabActual = 'ficha';

  P.renderDetail = function (main, id, tab) {
    const p = S.paciente(id);
    if (!p) {
      main.innerHTML = UI.empty('alert', 'Paciente no encontrado', 'Puede que se haya eliminado.',
        '<a class="btn btn-primary" href="#/pacientes">Volver a pacientes</a>');
      return;
    }
    if (tab) tabActual = tab;

    const edad = U.age(p.fechaNac);
    const cuenta = S.cuentaPaciente(id);
    const wa = U.waLink(p.telefono);

    main.innerHTML =
      '<a class="back-link no-print" href="#/pacientes">' + U.icon('arrowLeft') + 'Volver a pacientes</a>' +
      '<section class="patient-hero">' +
        '<span class="avatar xl">' + U.esc(U.initials(p)) + '</span>' +
        '<div class="hero-info">' +
          '<h1>' + U.esc((p.nombre || '') + ' ' + (p.apellido || '')) + '</h1>' +
          '<p class="sub">' + [edad !== null ? edad + ' años' : '', p.dni ? 'DNI ' + U.esc(p.dni) : '',
            U.esc(p.obraSocial || '')].filter(Boolean).join(' · ') + '</p>' +
          (p.diagnostico ? '<span class="tag lg">' + U.esc(p.diagnostico) + '</span>' : '') +
        '</div>' +
        '<div class="hero-actions no-print">' +
          '<button class="btn btn-primary" data-act="turno">' + U.icon('calendar') + 'Dar turno</button>' +
          '<button class="btn btn-secondary" data-act="evolucion">' + U.icon('activity') + 'Cargar sesión</button>' +
          '<button class="btn btn-secondary" data-act="pago">' + U.icon('dollar') + 'Registrar pago</button>' +
          (wa ? '<a class="btn btn-wa" href="' + U.esc(wa) + '" target="_blank" rel="noopener">' + U.icon('whatsapp') + 'WhatsApp</a>' : '') +
        '</div>' +
      '</section>' +

      '<div class="mini-stats">' +
        stat('Sesiones realizadas', cuenta.asistidas + (p.sesionesIndicadas ? ' de ' + U.esc(p.sesionesIndicadas) : '')) +
        stat('Sesiones pagas', cuenta.sesionesPagas) +
        stat(cuenta.saldoSesiones >= 0 ? 'Sesiones a favor' : 'Sesiones adeudadas', Math.abs(cuenta.saldoSesiones),
          cuenta.saldoSesiones < 0 ? 'warn' : (cuenta.saldoSesiones > 0 ? 'ok' : '')) +
        stat('Total abonado', U.fmtMoney(cuenta.totalAbonado)) +
      '</div>' +

      '<nav class="tabs no-print" role="tablist">' +
        tabBtn('ficha', 'Ficha', 'user') +
        tabBtn('historia', 'Historia clínica', 'clipboard') +
        tabBtn('turnos', 'Turnos', 'calendar') +
        tabBtn('pagos', 'Pagos', 'wallet') +
      '</nav>' +
      '<div id="tab-content"></div>';

    main.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        tabActual = b.dataset.tab;
        main.querySelectorAll('.tabs button').forEach(function (x) {
          x.classList.toggle('active', x === b);
          x.setAttribute('aria-selected', x === b ? 'true' : 'false');
        });
        drawTab(main.querySelector('#tab-content'), p);
      });
    });

    main.querySelector('[data-act=turno]').addEventListener('click', function () {
      KF.Agenda.openForm(null, { pacienteId: id, profesionalId: P.profesionalHabitual(id) }, KF.App.refresh);
    });
    main.querySelector('[data-act=evolucion]').addEventListener('click', function () {
      P.openEvolucion(id, null, KF.App.refresh);
    });
    main.querySelector('[data-act=pago]').addEventListener('click', function () {
      KF.Pagos.openForm(null, { pacienteId: id, profesionalId: P.profesionalHabitual(id) }, KF.App.refresh);
    });

    drawTab(main.querySelector('#tab-content'), p);
  };

  function stat(label, value, cls) {
    return '<div class="mini-stat ' + (cls || '') + '"><span>' + U.esc(label) + '</span><strong>' + value + '</strong></div>';
  }

  function tabBtn(key, label, iconName) {
    const act = tabActual === key;
    return '<button role="tab" data-tab="' + key + '" class="' + (act ? 'active' : '') + '" aria-selected="' + act + '">' +
      U.icon(iconName) + '<span>' + label + '</span></button>';
  }

  function drawTab(box, p) {
    if (tabActual === 'historia') return drawHistoria(box, p);
    if (tabActual === 'turnos') return drawTurnos(box, p);
    if (tabActual === 'pagos') return drawPagos(box, p);
    return drawFicha(box, p);
  }

  function info(label, value, full) {
    return '<div class="info' + (full ? ' full' : '') + '"><dt>' + U.esc(label) + '</dt><dd>' +
      (value ? U.nl2br(value) : '<span class="muted">—</span>') + '</dd></div>';
  }

  function drawFicha(box, p) {
    const dir = [p.direccion, p.localidad, p.provincia, p.cp ? 'CP ' + p.cp : ''].filter(Boolean).join(', ');
    box.innerHTML =
      '<div class="toolbar no-print">' +
        '<button class="btn btn-secondary" data-edit>' + U.icon('edit') + 'Editar ficha</button>' +
        '<button class="btn btn-ghost" data-print>' + U.icon('printer') + 'Imprimir</button>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn-ghost danger" data-del>' + U.icon('trash') + 'Eliminar paciente</button>' +
      '</div>' +
      '<div class="panel"><h3>' + U.icon('user') + 'Datos personales y contacto</h3><dl class="info-grid">' +
        info('Fecha de nacimiento', p.fechaNac ? U.fmtDate(p.fechaNac) : '') +
        info('Sexo', p.sexo) +
        info('Ocupación / Deporte', p.ocupacion) +
        info('Teléfono', p.telefono) +
        info('Email', p.email) +
        info('Dirección', dir) +
        info('Contacto de emergencia', [p.emergenciaNombre, p.emergenciaTel].filter(Boolean).join(' — ')) +
      '</dl></div>' +
      '<div class="panel"><h3>' + U.icon('file') + 'Cobertura y derivación</h3><dl class="info-grid">' +
        info('Obra social / Prepaga', p.obraSocial) +
        info('N° de afiliado', p.nroAfiliado) +
        info('Médico derivante', p.medicoDerivante) +
        info('Sesiones indicadas', p.sesionesIndicadas) +
      '</dl></div>' +
      '<div class="panel"><h3>' + U.icon('clipboard') + 'Historia clínica</h3><dl class="info-grid">' +
        info('Diagnóstico', p.diagnostico, true) +
        info('Motivo de consulta', p.motivoConsulta, true) +
        info('Antecedentes', p.antecedentes, true) +
        info('Medicación actual', p.medicacion) +
        info('Alergias / Contraindicaciones', p.alergias) +
        info('Estudios complementarios', p.estudios, true) +
        info('Evaluación kinésica inicial', p.evaluacion, true) +
        info('Objetivos y plan de tratamiento', p.objetivos, true) +
        info('Otras observaciones', p.notas, true) +
      '</dl></div>' +
      '<div class="print-only">' + printEvoluciones(p) + '</div>';

    box.querySelector('[data-edit]').addEventListener('click', function () { P.openForm(p.id); });
    box.querySelector('[data-print]').addEventListener('click', function () { window.print(); });
    box.querySelector('[data-del]').addEventListener('click', function () {
      UI.confirm({
        title: 'Eliminar paciente',
        message: 'Se eliminará la ficha de ' + U.fullName(p) + ' junto con su historia clínica, turnos y pagos. Esta acción no se puede deshacer.',
        onConfirm: function () {
          S.deletePaciente(p.id);
          UI.toast('Paciente eliminado');
          location.hash = '#/pacientes';
        }
      });
    });
  }

  /* Profesional con el que se atiende el paciente (el de su último turno) */
  P.profesionalHabitual = function (pacienteId) {
    const hoy = U.today();
    const turnos = S.turnosDePaciente(pacienteId).filter(function (t) { return t.estado !== 'cancelado'; });
    const pasados = turnos.filter(function (t) { return t.fecha <= hoy; });
    const t = pasados[pasados.length - 1] || turnos[0];
    return t && S.profesional(t.profesionalId) ? t.profesionalId : S.profesionalPrincipal().id;
  };

  function printEvoluciones(p) {
    const evs = S.evolucionesDePaciente(p.id);
    if (!evs.length) return '';
    return '<div class="panel"><h3>Evolución por sesión</h3>' + evs.map(function (e) {
      const pr = S.profesional(e.profesionalId);
      return '<p><strong>' + U.fmtDate(e.fecha) + (e.sesionNro ? ' — Sesión ' + U.esc(e.sesionNro) : '') + '</strong>' +
        (pr ? ' · Atendió: ' + U.esc(pr.nombre) : '') +
        (e.dolor !== '' && e.dolor !== undefined ? ' · Dolor (EVA): ' + U.esc(e.dolor) + '/10' : '') + '<br>' +
        (e.tratamiento ? 'Tratamiento: ' + U.nl2br(e.tratamiento) + '<br>' : '') +
        (e.evolucion ? 'Evolución: ' + U.nl2br(e.evolucion) : '') + '</p>';
    }).join('') + '</div>';
  }

  /* ---------- Historia clínica / evoluciones ---------- */
  function drawHistoria(box, p) {
    const evs = S.evolucionesDePaciente(p.id);
    let html = '<div class="toolbar no-print">' +
      '<button class="btn btn-primary" data-new>' + U.icon('plus') + 'Cargar sesión / evolución</button>' +
      '<button class="btn btn-ghost" data-ficha>' + U.icon('clipboard') + 'Ver datos clínicos de la ficha</button>' +
    '</div>';

    if (!evs.length) {
      html += UI.empty('activity', 'Sin sesiones cargadas',
        'Acá vas a ver la evolución del paciente sesión por sesión: qué se hizo, cómo respondió y su nivel de dolor.');
    } else {
      html += '<ol class="timeline">' + evs.map(function (e) {
        const dolor = e.dolor !== '' && e.dolor !== undefined && e.dolor !== null;
        return '<li class="tl-item">' +
          '<div class="tl-dot"></div>' +
          '<div class="tl-card">' +
            '<header>' +
              '<div><strong>' + U.fmtDateLong(e.fecha, true) + '</strong>' +
                (e.sesionNro ? ' <span class="badge">Sesión ' + U.esc(e.sesionNro) + '</span>' : '') +
                (UI.hayVariosProfesionales() ? ' ' + UI.profTag(e.profesionalId) : '') + '</div>' +
              (dolor ? '<span class="eva eva-' + evaLevel(e.dolor) + '" title="Escala visual analógica">Dolor ' + U.esc(e.dolor) + '/10</span>' : '') +
            '</header>' +
            (e.tratamiento ? '<p><span class="lbl">Tratamiento realizado</span>' + U.nl2br(e.tratamiento) + '</p>' : '') +
            (e.evolucion ? '<p><span class="lbl">Evolución / Observaciones</span>' + U.nl2br(e.evolucion) + '</p>' : '') +
            (e.indicaciones ? '<p><span class="lbl">Indicaciones para casa</span>' + U.nl2br(e.indicaciones) + '</p>' : '') +
            '<div class="tl-actions no-print">' +
              '<button class="btn btn-sm btn-ghost" data-edit="' + U.esc(e.id) + '">' + U.icon('edit') + 'Editar</button>' +
              '<button class="btn btn-sm btn-ghost danger" data-del="' + U.esc(e.id) + '">' + U.icon('trash') + 'Eliminar</button>' +
            '</div>' +
          '</div>' +
        '</li>';
      }).join('') + '</ol>';
    }
    box.innerHTML = html;

    const redraw = function () { KF.App.refresh(); };
    box.querySelector('[data-new]').addEventListener('click', function () { P.openEvolucion(p.id, null, redraw); });
    box.querySelector('[data-ficha]').addEventListener('click', function () {
      tabActual = 'ficha';
      KF.App.refresh();
    });
    box.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { P.openEvolucion(p.id, b.dataset.edit, redraw); });
    });
    box.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.confirm({
          title: 'Eliminar registro',
          message: '¿Eliminar este registro de la historia clínica?',
          onConfirm: function () { S.deleteEvolucion(b.dataset.del); UI.toast('Registro eliminado'); redraw(); }
        });
      });
    });
  }

  function evaLevel(v) {
    const n = Number(v);
    if (n <= 3) return 'low';
    if (n <= 6) return 'mid';
    return 'high';
  }

  P.openEvolucion = function (pacienteId, evolucionId, onSaved, preset) {
    const e = evolucionId ? S.evolucion(evolucionId) : Object.assign({ fecha: U.today() }, preset || {});
    if (!e.profesionalId) e.profesionalId = P.profesionalHabitual(pacienteId);
    if (!evolucionId && !e.sesionNro) {
      const asistidas = S.turnosDePaciente(pacienteId).filter(function (t) { return t.estado === 'asistio'; }).length;
      const cargadas = S.evolucionesDePaciente(pacienteId).length;
      e.sesionNro = Math.max(asistidas, cargadas + 1);
    }
    const p = S.paciente(pacienteId);
    const dolorVal = e.dolor === undefined ? '' : e.dolor;

    const body =
      '<p class="modal-sub">' + U.icon('user') + U.esc(U.fullName(p)) + '</p>' +
      '<div class="form-grid">' +
        UI.field({ name: 'fecha', label: 'Fecha', type: 'date', value: e.fecha, required: true }) +
        UI.field({ name: 'sesionNro', label: 'N° de sesión', type: 'number', value: e.sesionNro, min: 1, step: 1 }) +
        UI.profSelect(e.profesionalId, { label: 'Profesional que atendió' }) +
        '<div class="field full">' +
          '<label for="f_dolor">Dolor del paciente (EVA 0 a 10)</label>' +
          '<div class="eva-picker" role="radiogroup" aria-label="Nivel de dolor">' +
            '<label class="eva-opt none"><input type="radio" name="dolor" value=""' + (dolorVal === '' ? ' checked' : '') + '><span>No registrar</span></label>' +
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) {
              return '<label class="eva-opt eva-' + evaLevel(n) + '"><input type="radio" name="dolor" value="' + n + '"' +
                (String(dolorVal) === String(n) ? ' checked' : '') + '><span>' + n + '</span></label>';
            }).join('') +
          '</div>' +
          '<small class="hint">0 = sin dolor · 10 = el peor dolor imaginable</small>' +
        '</div>' +
        UI.field({ name: 'tratamiento', label: 'Tratamiento realizado', type: 'textarea', rows: 3, value: e.tratamiento, full: true,
          placeholder: 'Ej: Magnetoterapia 20 min, TENS, movilización articular, ejercicios de fortalecimiento…' }) +
        UI.field({ name: 'evolucion', label: 'Evolución / Observaciones', type: 'textarea', rows: 3, value: e.evolucion, full: true,
          placeholder: '¿Cómo llegó y cómo se fue? Cambios respecto a la sesión anterior…' }) +
        UI.field({ name: 'indicaciones', label: 'Indicaciones para casa', type: 'textarea', rows: 2, value: e.indicaciones, full: true }) +
      '</div>';

    UI.modal({
      title: evolucionId ? 'Editar sesión' : 'Cargar sesión / evolución',
      size: 'md',
      body: body,
      onSubmit: function (form) {
        const d = UI.formData(form);
        d.pacienteId = pacienteId;
        if (evolucionId) d.id = evolucionId;
        if (preset && preset.turnoId) d.turnoId = preset.turnoId;
        if (!d.tratamiento && !d.evolucion && d.dolor === '') {
          UI.toast('Escribí al menos el tratamiento o la evolución.', 'error');
          return false;
        }
        S.saveEvolucion(d);
        UI.toast('Sesión guardada en la historia clínica');
        if (onSaved) onSaved();
      }
    });
  };

  /* ---------- Turnos del paciente ---------- */
  function drawTurnos(box, p) {
    const turnos = S.turnosDePaciente(p.id).slice().reverse();
    const hoy = U.today();
    const proximos = S.turnosDePaciente(p.id).filter(function (t) {
      return t.fecha >= hoy && t.estado !== 'cancelado' && t.estado !== 'ausente' && t.estado !== 'asistio';
    });
    const wa = proximos.length ? U.waLink(p.telefono, KF.Avisos.mensajeConfirmacion(proximos)) : '';
    let html = '<div class="toolbar no-print"><button class="btn btn-primary" data-new>' + U.icon('plus') + 'Dar turno</button>' +
      (wa ? '<a class="btn btn-wa" href="' + U.esc(wa) + '" target="_blank" rel="noopener" data-wa-proximos>' + U.icon('whatsapp') +
        'Enviar ' + (proximos.length === 1 ? 'el próximo turno' : 'los ' + proximos.length + ' próximos turnos') + ' por WhatsApp</a>' : '') +
      (proximos.length ? '<button class="btn btn-secondary" data-ics>' + U.icon('calendar') + 'Descargar para el calendario</button>' : '') +
    '</div>' +
    (proximos.length && !p.telefono ? '<p class="muted small no-print">Para enviarle los turnos por WhatsApp, cargá su teléfono en la ficha.</p>' : '');
    if (!turnos.length) {
      html += UI.empty('calendar', 'Sin turnos', 'Este paciente todavía no tiene turnos asignados.');
    } else {
      html += '<ul class="row-list">' + turnos.map(function (t) {
        const n = S.numeroSesion(t);
        return '<li class="row-item" data-id="' + U.esc(t.id) + '" tabindex="0" role="button">' +
          '<div class="row-main"><strong>' + U.fmtDateLong(t.fecha, true) + ' · ' + U.esc(t.hora) + ' hs</strong>' +
          '<span class="muted">' + (n && t.estado !== 'cancelado' && t.estado !== 'ausente' ? 'Sesión ' + n + (p.sesionesIndicadas ? ' de ' + U.esc(p.sesionesIndicadas) : '') + ' · ' : '') +
          U.esc(t.duracion) + ' min' + (t.motivo ? ' · ' + U.esc(t.motivo) : '') + '</span>' +
          (UI.hayVariosProfesionales() ? UI.profTag(t.profesionalId, 'sm') : '') + '</div>' +
          UI.estadoBadge(t.estado) +
        '</li>';
      }).join('') + '</ul>';
    }
    box.innerHTML = html;
    box.querySelector('[data-new]').addEventListener('click', function () {
      KF.Agenda.openForm(null, { pacienteId: p.id, profesionalId: P.profesionalHabitual(p.id) }, KF.App.refresh);
    });
    const btnWa = box.querySelector('[data-wa-proximos]');
    if (btnWa) btnWa.addEventListener('click', function () {
      KF.Avisos.marcarAvisados(proximos);
      UI.toast('Se abrió WhatsApp con los turnos listos para enviar');
    });
    const btnIcs = box.querySelector('[data-ics]');
    if (btnIcs) btnIcs.addEventListener('click', function () {
      KF.Avisos.descargarIcs(proximos, 'profesional', 'turnos-' + U.norm(U.fullName(p)).replace(/[^a-z0-9]+/g, '-'));
      UI.toast('Archivo de calendario descargado');
    });
    box.querySelectorAll('.row-item').forEach(function (li) {
      const open = function () { KF.Agenda.openDetail(li.dataset.id, KF.App.refresh); };
      li.addEventListener('click', open);
      li.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
    });
  }

  /* ---------- Pagos del paciente ---------- */
  function drawPagos(box, p) {
    const pagos = S.pagosDePaciente(p.id);
    let html = '<div class="toolbar no-print"><button class="btn btn-primary" data-new>' + U.icon('plus') + 'Registrar pago</button></div>';
    if (!pagos.length) {
      html += UI.empty('wallet', 'Sin pagos registrados', 'Cuando el paciente abone, registralo acá indicando qué pagó y cómo.');
    } else {
      html += KF.Pagos.table(pagos, false);
    }
    box.innerHTML = html;
    box.querySelector('[data-new]').addEventListener('click', function () {
      KF.Pagos.openForm(null, { pacienteId: p.id, profesionalId: P.profesionalHabitual(p.id) }, KF.App.refresh);
    });
    KF.Pagos.bindTable(box, KF.App.refresh);
  }

  KF.Pacientes = P;
})(window.KF);
