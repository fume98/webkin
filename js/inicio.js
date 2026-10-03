/* Pantalla de inicio: resumen del día */
(function (KF) {
  'use strict';

  const U = KF.U;
  const UI = KF.UI;
  const S = KF.Store;

  const I = {};

  function saludo() {
    const h = new Date().getHours();
    if (h < 13) return 'Buen día';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  I.render = function (main) {
    const set = S.settings;
    const hoy = U.today();
    const turnosHoy = S.turnosDelDia(hoy).filter(function (t) { return t.estado !== 'cancelado'; });
    const atendidos = turnosHoy.filter(function (t) { return t.estado === 'asistio'; }).length;
    const mes = hoy.slice(0, 7);
    const cobradoMes = S.pagos().filter(function (p) { return p.fecha && p.fecha.slice(0, 7) === mes; })
      .reduce(function (s, p) { return s + (Number(p.monto) || 0); }, 0);
    const cobradoHoy = S.pagos().filter(function (p) { return p.fecha === hoy; })
      .reduce(function (s, p) { return s + (Number(p.monto) || 0); }, 0);
    const proximos = S.turnos().filter(function (t) {
      return t.fecha > hoy && t.fecha <= U.addDays(hoy, 7) && t.estado !== 'cancelado';
    }).sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); }).slice(0, 8);
    const pendientesAyer = S.turnos().filter(function (t) {
      return t.fecha < hoy && (t.estado === 'pendiente' || t.estado === 'confirmado');
    });
    const nombre = (set.profesional || '').trim().split(/\s+/).slice(0, 2).join(' ');

    const ahora = U.nowTime();
    let html =
      '<div class="page-head">' +
        '<div><h1>' + saludo() + (nombre ? ', ' + U.esc(nombre) : '') + '</h1>' +
        '<p class="sub">' + U.fmtDateLong(hoy, true) + '</p></div>' +
      '</div>' +

      '<div class="quick-grid">' +
        quick('nuevo-turno', 'calendar', 'Dar un turno', 'Agendar una sesión') +
        quick('nuevo-paciente', 'user', 'Nuevo paciente', 'Crear una ficha') +
        quick('nuevo-pago', 'dollar', 'Registrar pago', 'Anotar un cobro') +
        quick('buscar', 'search', 'Buscar paciente', 'Ver fichas') +
      '</div>' +

      '<div class="stats">' +
        statCard('calendar', 'Turnos de hoy', turnosHoy.length, atendidos + ' atendidos') +
        statCard('users', 'Pacientes', S.pacientes().length, 'fichas cargadas') +
        statCard('wallet', 'Cobrado hoy', U.fmtMoney(cobradoHoy), '') +
        statCard('dollar', 'Cobrado en ' + U.MESES[new Date().getMonth()], U.fmtMoney(cobradoMes), '') +
      '</div>';

    if (!set.profesional) {
      html += '<div class="notice">' + U.icon('settings') +
        '<div><strong>Completá tus datos profesionales</strong><p>Cargá tu nombre, matrícula y el valor de la sesión para usarlos en recibos y recordatorios.</p></div>' +
        '<a class="btn btn-secondary" href="#/ajustes">Ir a Ajustes</a></div>';
    }

    if (pendientesAyer.length) {
      html += '<div class="notice warn">' + U.icon('alert') +
        '<div><strong>Hay ' + pendientesAyer.length + (pendientesAyer.length === 1 ? ' turno pasado' : ' turnos pasados') + ' sin marcar</strong>' +
        '<p>Indicá si el paciente asistió o no para llevar bien la cuenta de sesiones.</p></div>' +
        '<button class="btn btn-secondary" id="ver-pend">Revisar</button></div>';
    }

    html += '<div class="two-col">' +
      '<section class="panel"><h2>' + U.icon('clock') + 'Agenda de hoy</h2>' +
        (turnosHoy.length
          ? '<div class="day-list">' + turnosHoy.map(function (t) {
              const p = S.paciente(t.pacienteId);
              const n = S.numeroSesion(t);
              const now = t.hora <= ahora && U.minToTime(U.timeToMin(t.hora) + Number(t.duracion || 0)) > ahora;
              return '<button class="turno-card estado-' + U.esc(t.estado) + (now ? ' now' : '') + '" data-turno="' + U.esc(t.id) + '">' +
                '<span class="t-hora"><strong>' + U.esc(t.hora) + '</strong>' + (now ? '<small>Ahora</small>' : '') + '</span>' +
                '<span class="t-info"><strong>' + U.esc(U.fullName(p)) + '</strong>' +
                '<small>' + (n && t.estado !== 'ausente' ? 'Sesión ' + n : '') + (t.motivo ? (n ? ' · ' : '') + U.esc(t.motivo) : '') + '</small></span>' +
                UI.estadoBadge(t.estado) +
              '</button>';
            }).join('') + '</div>'
          : UI.empty('calendar', 'Sin turnos hoy', 'Disfrutá el día o agendá nuevas sesiones.')) +
        '<a class="link-more" href="#/agenda">Ver agenda completa ' + U.icon('chevronRight') + '</a>' +
      '</section>' +
      '<section class="panel"><h2>' + U.icon('calendar') + 'Próximos 7 días</h2>' +
        (proximos.length
          ? '<ul class="row-list compact">' + proximos.map(function (t) {
              const p = S.paciente(t.pacienteId);
              return '<li class="row-item" data-turno="' + U.esc(t.id) + '" tabindex="0" role="button">' +
                '<div class="row-main"><strong>' + U.esc(U.fullName(p)) + '</strong>' +
                '<span class="muted">' + U.fmtDateLong(t.fecha) + ' · ' + U.esc(t.hora) + ' hs</span></div>' +
                UI.estadoBadge(t.estado) + '</li>';
            }).join('') + '</ul>'
          : '<p class="muted">No hay turnos en los próximos días.</p>') +
      '</section>' +
    '</div>';

    main.innerHTML = html;

    main.querySelectorAll('[data-turno]').forEach(function (el) {
      const open = function () { KF.Agenda.openDetail(el.dataset.turno, KF.App.refresh); };
      el.addEventListener('click', open);
      el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
    });
    main.querySelector('[data-quick=nuevo-turno]').addEventListener('click', function () {
      KF.Agenda.openForm(null, { fecha: hoy }, KF.App.refresh);
    });
    main.querySelector('[data-quick=nuevo-paciente]').addEventListener('click', function () { KF.Pacientes.openForm(); });
    main.querySelector('[data-quick=nuevo-pago]').addEventListener('click', function () { KF.Pagos.openForm(null, null, KF.App.refresh); });
    main.querySelector('[data-quick=buscar]').addEventListener('click', function () {
      location.hash = '#/pacientes';
      setTimeout(function () { const s = document.getElementById('buscar-pac'); if (s) s.focus(); }, 50);
    });
    const vp = main.querySelector('#ver-pend');
    if (vp) vp.addEventListener('click', function () { showPendientes(pendientesAyer); });
  };

  function showPendientes(list) {
    list.sort(function (a, b) { return (b.fecha + b.hora).localeCompare(a.fecha + a.hora); });
    const modal = UI.modal({
      title: 'Turnos pasados sin marcar',
      size: 'md',
      body: '<p class="modal-sub">Marcá rápidamente cómo resultó cada turno.</p><ul class="row-list">' + list.map(function (t) {
        const p = S.paciente(t.pacienteId);
        return '<li class="row-item static" data-id="' + U.esc(t.id) + '">' +
          '<div class="row-main"><strong>' + U.esc(U.fullName(p)) + '</strong>' +
          '<span class="muted">' + U.fmtDate(t.fecha) + ' · ' + U.esc(t.hora) + ' hs</span></div>' +
          '<div class="mini-btns">' +
            '<button class="btn btn-sm estado-btn estado-asistio" data-set="asistio">Asistió</button>' +
            '<button class="btn btn-sm estado-btn estado-ausente" data-set="ausente">No vino</button>' +
          '</div></li>';
      }).join('') + '</ul>'
    });
    modal.querySelectorAll('[data-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        const li = b.closest('[data-id]');
        S.saveTurno({ id: li.dataset.id, estado: b.dataset.set });
        li.classList.add('done');
        li.querySelector('.mini-btns').innerHTML = UI.estadoBadge(b.dataset.set);
        KF.App.refresh();
      });
    });
  }

  function quick(key, iconName, title, sub) {
    return '<button class="quick" data-quick="' + key + '">' +
      '<span class="quick-icon">' + U.icon(iconName) + '</span>' +
      '<span><strong>' + title + '</strong><small>' + sub + '</small></span></button>';
  }

  function statCard(iconName, label, value, sub) {
    return '<div class="stat"><span class="stat-icon">' + U.icon(iconName) + '</span>' +
      '<div><span class="stat-label">' + U.esc(label) + '</span><strong class="stat-value">' + value + '</strong>' +
      (sub ? '<small>' + U.esc(sub) + '</small>' : '') + '</div></div>';
  }

  KF.Inicio = I;
})(window.KF);
