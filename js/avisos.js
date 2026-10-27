/* Avisos de turnos: mensajes de WhatsApp, Google Calendar y archivo de calendario (.ics) */
(function (KF) {
  'use strict';

  const U = KF.U;
  const S = KF.Store;

  const AV = {};

  function zonaHoraria() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires'; }
    catch (e) { return 'America/Argentina/Buenos_Aires'; }
  }

  function inicioFin(t) {
    const ini = U.parseDate(t.fecha);
    const [h, m] = t.hora.split(':').map(Number);
    ini.setHours(h, m, 0, 0);
    const fin = new Date(ini.getTime() + (Number(t.duracion) || 45) * 60000);
    return { ini: ini, fin: fin };
  }

  /* 20261026T090000 (hora local, con la zona horaria aparte) */
  function fechaLocalCompacta(d) {
    return d.getFullYear() + U.pad(d.getMonth() + 1) + U.pad(d.getDate()) + 'T' + U.pad(d.getHours()) + U.pad(d.getMinutes()) + '00';
  }

  /* 20261026T120000Z (UTC, para el archivo .ics) */
  function fechaUTC(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /* "de Quiropraxia" (solo si el consultorio tiene más de un servicio) */
  function deServicio(t) {
    const sv = S.servicio(t.servicio);
    return sv && UI().hayVariosServicios() ? ' de ' + sv.nombre : '';
  }

  function consultorio() {
    const m = KF.Marca.actual();
    return m.nombre + (m.subtitulo ? ' - ' + m.subtitulo.replace(/\s*·\s*/g, ' ') : '');
  }

  /*
   * Datos del evento según para quién es:
   *  - 'paciente': "Turno en <consultorio>", con el profesional y la dirección
   *  - 'profesional': "Turno: <paciente>", con teléfono, sesión y motivo
   */
  function evento(t, para) {
    const p = S.paciente(t.pacienteId);
    const prof = S.profesional(t.profesionalId);
    const set = S.settings;
    const n = S.numeroSesion(t);
    if (para === 'profesional') {
      return {
        titulo: (deServicio(t) ? S.servicio(t.servicio).nombre + ': ' : 'Turno: ') + U.fullName(p) + (n ? ' (sesión ' + n + ')' : ''),
        detalle: [
          p && p.telefono ? 'Teléfono: ' + p.telefono : '',
          t.motivo ? 'Motivo: ' + t.motivo : '',
          prof && UI().hayVariosProfesionales() ? 'Profesional: ' + prof.nombre : '',
          t.notas ? 'Notas: ' + t.notas : ''
        ].filter(Boolean).join('\n'),
        lugar: set.direccion || ''
      };
    }
    return {
      titulo: 'Turno' + deServicio(t) + ' en ' + KF.Marca.actual().nombre,
      detalle: [
        prof ? 'Con ' + prof.nombre + (prof.especialidad ? ' (' + prof.especialidad + ')' : '') : '',
        t.motivo ? t.motivo : '',
        set.telefono ? 'Teléfono del consultorio: ' + set.telefono : ''
      ].filter(Boolean).join('\n'),
      lugar: set.direccion || ''
    };
  }

  function UI() { return KF.UI; }

  /* Enlace que abre Google Calendar con el evento listo para guardar */
  AV.linkGoogle = function (t, para) {
    const e = evento(t, para);
    const r = inicioFin(t);
    const q = [
      'action=TEMPLATE',
      'text=' + encodeURIComponent(e.titulo),
      'dates=' + fechaLocalCompacta(r.ini) + '/' + fechaLocalCompacta(r.fin),
      'ctz=' + encodeURIComponent(zonaHoraria()),
      e.detalle ? 'details=' + encodeURIComponent(e.detalle) : '',
      e.lugar ? 'location=' + encodeURIComponent(e.lugar) : ''
    ].filter(Boolean).join('&');
    return 'https://calendar.google.com/calendar/render?' + q;
  };

  function icsTexto(v) {
    return String(v || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /* Las líneas de un .ics no deben pasar los 75 caracteres */
  function plegar(linea) {
    const out = [];
    let resto = linea;
    while (resto.length > 74) { out.push(resto.slice(0, 74)); resto = ' ' + resto.slice(74); }
    out.push(resto);
    return out.join('\r\n');
  }

  /* Archivo de calendario con uno o varios turnos (Google Calendar, iPhone, Outlook…) */
  AV.ics = function (turnos, para) {
    const ahora = fechaUTC(new Date());
    const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Consultorio//Turnos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    turnos.forEach(function (t) {
      const e = evento(t, para);
      const r = inicioFin(t);
      lineas.push('BEGIN:VEVENT',
        'UID:' + t.id + '-' + (para || 'paciente') + '@consultorio',
        'DTSTAMP:' + ahora,
        'DTSTART:' + fechaUTC(r.ini),
        'DTEND:' + fechaUTC(r.fin),
        'SUMMARY:' + icsTexto(e.titulo));
      if (e.detalle) lineas.push('DESCRIPTION:' + icsTexto(e.detalle));
      if (e.lugar) lineas.push('LOCATION:' + icsTexto(e.lugar));
      lineas.push('BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsTexto(e.titulo), 'END:VALARM', 'END:VEVENT');
    });
    lineas.push('END:VCALENDAR');
    return lineas.map(plegar).join('\r\n') + '\r\n';
  };

  AV.descargarIcs = function (turnos, para, nombre) {
    U.download((nombre || 'turnos') + '.ics', AV.ics(turnos, para), 'text/calendar;charset=utf-8');
  };

  /* ---------- Mensajes de WhatsApp ---------- */
  function lineaTurno(t, conDia) {
    return (conDia ? U.fmtDateLong(t.fecha) : U.fmtDate(t.fecha)) + ' a las ' + t.hora + ' hs';
  }

  /* Confirmación de uno o varios turnos otorgados */
  AV.mensajeConfirmacion = function (turnos) {
    const lista = turnos.slice().sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
    const t0 = lista[0];
    const p = S.paciente(t0.pacienteId);
    const set = S.settings;
    const profs = lista.map(function (t) { return t.profesionalId; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    const prof = profs.length === 1 ? S.profesional(profs[0]) : null;
    const partes = ['Hola ' + (p ? p.nombre : '') + '! '];
    const servs = lista.map(function (t) { return t.servicio; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    const mismoServicio = servs.length === 1;
    if (lista.length === 1) {
      partes.push('Te confirmo tu turno' + deServicio(t0) + ' en ' + consultorio() + ':\n\n');
      partes.push('📅 ' + lineaTurno(t0, true) + '\n');
    } else {
      partes.push('Te confirmo tus ' + lista.length + ' turnos' + (mismoServicio ? deServicio(t0) : '') + ' en ' + consultorio() + ':\n\n');
      lista.forEach(function (t, i) {
        partes.push((i + 1) + '. ' + U.cap(U.DIAS[U.parseDate(t.fecha).getDay()]) + ' ' + lineaTurno(t) +
          (!mismoServicio && deServicio(t) ? ' (' + S.servicio(t.servicio).nombre + ')' : '') + '\n');
      });
    }
    if (prof) partes.push('👤 Con ' + prof.nombre + '\n');
    if (set.direccion) partes.push('📍 ' + set.direccion + '\n');
    if (lista.length === 1) partes.push('\nAgendalo en tu Google Calendar: ' + AV.linkGoogle(t0, 'paciente') + '\n');
    partes.push('\nSi no podés asistir, avisame con anticipación. ¡Gracias!');
    if (prof) partes.push('\n' + prof.nombre);
    return partes.join('');
  };

  /* Recordatorio de un turno (se manda unos días u horas antes) */
  AV.mensajeRecordatorio = function (t) {
    const p = S.paciente(t.pacienteId);
    const prof = S.profesional(t.profesionalId);
    const set = S.settings;
    return 'Hola ' + (p ? p.nombre : '') + '! Te recuerdo tu turno' + deServicio(t) + ' en ' + consultorio() + ' el ' +
      U.fmtDateLong(t.fecha).toLowerCase() + ' a las ' + t.hora + ' hs' +
      (prof && UI().hayVariosProfesionales() ? ' con ' + prof.nombre : '') +
      (set.direccion ? ' en ' + set.direccion : '') + '. Por favor confirmá tu asistencia.' +
      '\n' + (prof ? prof.nombre + ' · ' : '') + consultorio();
  };

  /* Marca los turnos como avisados (queda registrado cuándo) */
  AV.marcarAvisados = function (turnos) {
    const ahora = new Date().toISOString();
    turnos.forEach(function (t) { S.saveTurno({ id: t.id, avisadoWhatsApp: ahora }); });
  };

  /* ---------- Ventana "Turno otorgado" ---------- */
  AV.mostrarOtorgados = function (ids, onChange) {
    const ui = UI();
    const turnos = ids.map(function (id) { return S.turno(id); }).filter(Boolean)
      .sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
    if (!turnos.length) return;
    const t0 = turnos[0];
    const p = S.paciente(t0.pacienteId);
    const wa = p ? U.waLink(p.telefono, AV.mensajeConfirmacion(turnos)) : '';
    const varios = turnos.length > 1;
    const yaEnviados = turnos.every(function (t) { return t.avisadoWhatsApp; });

    const body =
      '<div class="otorgado">' +
        '<div class="otorgado-ok">' + U.icon('check') + '</div>' +
        '<p class="otorgado-titulo">' + (varios ? 'Se dieron ' + turnos.length + ' turnos' : 'Turno' + deServicio(t0) + ' otorgado') +
          ' a <strong>' + U.esc(U.fullName(p)) + '</strong></p>' +
        '<ul class="otorgado-lista">' + turnos.slice(0, 12).map(function (t) {
          return '<li>' + U.icon('calendar') + U.esc(U.fmtDateLong(t.fecha)) + ' · ' + U.esc(t.hora) + ' hs</li>';
        }).join('') + (turnos.length > 12 ? '<li class="muted">y ' + (turnos.length - 12) + ' más…</li>' : '') + '</ul>' +
        (yaEnviados
          ? '<p class="otorgado-enviado">' + U.icon('whatsapp') + (varios ? 'Los turnos se enviaron' : 'El turno se envió') + ' por WhatsApp</p>'
          : '<h4>¿Querés avisarle al paciente?</h4>') +
        '<div class="otorgado-acciones">' +
          (wa
            ? '<a class="btn btn-wa btn-lg" href="' + U.esc(wa) + '" target="_blank" rel="noopener" data-av="wa">' + U.icon('whatsapp') +
              (yaEnviados ? 'Volver a enviar' : 'Enviar ' + (varios ? 'los ' + turnos.length + ' turnos' : 'el turno')) + ' por WhatsApp</a>'
            : '<p class="notice warn small">' + U.icon('alert') + '<span>El paciente no tiene teléfono cargado. Agregalo en su ficha para poder avisarle por WhatsApp.</span></p>') +
        '</div>' +
        '<h4>Agendarlo en tu calendario</h4>' +
        '<div class="otorgado-acciones">' +
          (varios
            ? '<button type="button" class="btn btn-secondary" data-av="ics">' + U.icon('download') + 'Descargar los ' + turnos.length + ' turnos para Google Calendar</button>' +
              '<small class="hint">Abrí el archivo desde el celular, o en la compu andá a Google Calendar → Configuración → Importar.</small>'
            : '<a class="btn btn-secondary" href="' + U.esc(AV.linkGoogle(t0, 'profesional')) + '" target="_blank" rel="noopener">' + U.icon('calendar') + 'Agregar a mi Google Calendar</a>') +
        '</div>' +
      '</div>';

    const modal = ui.modal({ title: varios ? 'Turnos otorgados' : 'Turno otorgado', size: 'md', body: body });
    const btnWa = modal.querySelector('[data-av=wa]');
    if (btnWa) btnWa.addEventListener('click', function () {
      AV.marcarAvisados(turnos);
      ui.toast('Se abrió WhatsApp con el mensaje listo para enviar');
      if (onChange) onChange();
    });
    const btnIcs = modal.querySelector('[data-av=ics]');
    if (btnIcs) btnIcs.addEventListener('click', function () {
      AV.descargarIcs(turnos, 'profesional', 'turnos-' + U.norm(U.fullName(p)).replace(/[^a-z0-9]+/g, '-'));
      ui.toast('Archivo de calendario descargado');
    });
  };

  KF.Avisos = AV;
})(window.KF);
