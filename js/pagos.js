/* Pagos: registro de cobros, formas de pago y resumen mensual */
(function (KF) {
  'use strict';

  const U = KF.U;
  const UI = KF.UI;
  const S = KF.Store;

  const PG = {};
  let mesSel = U.today().slice(0, 7);
  let formaSel = '';
  let profSel = '';

  function breakdown(titulo, totales, total, etiqueta) {
    const keys = Object.keys(totales).sort(function (a, b) { return totales[b] - totales[a]; });
    if (!keys.length) return '';
    return '<div class="bd-group">' + (titulo ? '<h4>' + U.esc(titulo) + '</h4>' : '') + keys.map(function (k) {
      const pct = total ? Math.round(totales[k] * 100 / total) : 0;
      return '<div class="bd-row"><span>' + etiqueta(k) + '</span>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<strong>' + U.fmtMoney(totales[k]) + '</strong></div>';
    }).join('') + '</div>';
  }

  /* ================= Vista principal ================= */
  PG.render = function (main) {
    if (profSel && !S.profesional(profSel)) profSel = '';
    const varios = UI.hayVariosProfesionales();
    const pagos = S.pagos().filter(function (p) {
      return p.fecha && p.fecha.slice(0, 7) === mesSel && (!formaSel || p.forma === formaSel) &&
        (!profSel || p.profesionalId === profSel);
    });
    const total = pagos.reduce(function (s, p) { return s + (Number(p.monto) || 0); }, 0);
    const porForma = {};
    const porProf = {};
    const porServ = {};
    pagos.forEach(function (p) {
      porForma[p.forma] = (porForma[p.forma] || 0) + (Number(p.monto) || 0);
      porProf[p.profesionalId] = (porProf[p.profesionalId] || 0) + (Number(p.monto) || 0);
      porServ[p.servicio] = (porServ[p.servicio] || 0) + (Number(p.monto) || 0);
    });
    const mostrarProf = varios && !profSel;

    main.innerHTML =
      '<div class="page-head">' +
        '<div><h1>Pagos y cobros</h1><p class="sub">Registrá qué abonó cada paciente y de qué forma</p></div>' +
        '<button class="btn btn-primary btn-lg" id="btn-nuevo-pago">' + U.icon('plus') + 'Registrar pago</button>' +
      '</div>' +
      UI.profFilter(profSel, 'Todos los profesionales') +
      '<div class="agenda-bar">' +
        '<div class="date-nav">' +
          '<button class="btn-icon lg" data-mes="-1" aria-label="Mes anterior">' + U.icon('chevronLeft') + '</button>' +
          '<input type="month" id="mes" value="' + mesSel + '" aria-label="Mes">' +
          '<button class="btn-icon lg" data-mes="1" aria-label="Mes siguiente">' + U.icon('chevronRight') + '</button>' +
        '</div>' +
        '<label class="inline-select">Forma de pago ' +
          '<select id="forma-filtro"><option value="">Todas</option>' + U.options(S.FORMAS_PAGO, formaSel) + '</select>' +
        '</label>' +
      '</div>' +
      '<div class="summary-row">' +
        '<div class="summary-total"><span>Total cobrado en ' + U.esc(U.fmtMonth(mesSel)) + '</span>' +
          '<strong>' + U.fmtMoney(total) + '</strong>' +
          '<small>' + pagos.length + (pagos.length === 1 ? ' pago' : ' pagos') +
            (profSel ? ' · ' + U.esc(S.profesional(profSel).nombre) : '') + '</small></div>' +
        (pagos.length ? '<div class="summary-breakdown">' +
          (UI.hayVariosServicios() ? breakdown('Por servicio', porServ, total, function (k) { return UI.servTag(k) || 'Sin asignar'; }) : '') +
          (mostrarProf ? breakdown('Por profesional', porProf, total, function (k) { return UI.profTag(k) || 'Sin asignar'; }) : '') +
          breakdown(mostrarProf || UI.hayVariosServicios() ? 'Por forma de pago' : '', porForma, total, U.esc) +
        '</div>' : '') +
      '</div>' +
      '<div id="pagos-lista"></div>' +
      '<div class="toolbar end"><button class="btn btn-ghost" id="exp-csv">' + U.icon('download') + 'Descargar planilla del mes (Excel)</button></div>';

    main.querySelector('#btn-nuevo-pago').addEventListener('click', function () {
      PG.openForm(null, profSel ? { profesionalId: profSel } : null, KF.App.refresh);
    });
    UI.bindProfFilter(main, function (id) { profSel = id; PG.render(main); });
    main.querySelectorAll('[data-mes]').forEach(function (b) {
      b.addEventListener('click', function () {
        const [y, m] = mesSel.split('-').map(Number);
        const d = new Date(y, m - 1 + Number(b.dataset.mes), 1);
        mesSel = d.getFullYear() + '-' + U.pad(d.getMonth() + 1);
        PG.render(main);
      });
    });
    main.querySelector('#mes').addEventListener('change', function (ev) {
      if (ev.target.value) { mesSel = ev.target.value; PG.render(main); }
    });
    main.querySelector('#forma-filtro').addEventListener('change', function (ev) {
      formaSel = ev.target.value;
      PG.render(main);
    });
    main.querySelector('#exp-csv').addEventListener('click', function () { exportCSV(pagos); });

    const box = main.querySelector('#pagos-lista');
    if (!pagos.length) {
      box.innerHTML = UI.empty('wallet', 'No hay pagos en este período', 'Usá "Registrar pago" para anotar un cobro.');
    } else {
      box.innerHTML = PG.table(pagos, true);
      PG.bindTable(box, KF.App.refresh);
    }
  };

  /* Tabla de pagos reutilizable (también en la ficha del paciente) */
  PG.table = function (pagos, conPaciente) {
    const varios = UI.hayVariosProfesionales();
    return '<div class="table-wrap"><table class="table">' +
      '<thead><tr><th>Fecha</th>' + (conPaciente ? '<th>Paciente</th>' : '') + (varios ? '<th>Profesional</th>' : '') +
      '<th>Qué abonó</th><th>Forma de pago</th><th class="num">Monto</th><th class="no-print"><span class="sr-only">Acciones</span></th></tr></thead>' +
      '<tbody>' + pagos.map(function (p) {
        const pac = S.paciente(p.pacienteId);
        const det = [p.concepto, Number(p.sesiones) ? p.sesiones + (Number(p.sesiones) === 1 ? ' sesión' : ' sesiones') : '']
          .filter(Boolean).join(' · ');
        return '<tr>' +
          '<td data-label="Fecha">' + U.fmtDate(p.fecha) + '</td>' +
          (conPaciente ? '<td data-label="Paciente"><a href="#/paciente/' + U.esc(p.pacienteId) + '">' + U.esc(U.fullName(pac)) + '</a></td>' : '') +
          (varios ? '<td data-label="Profesional">' + UI.profTag(p.profesionalId, 'sm') + '</td>' : '') +
          '<td data-label="Qué abonó"><div class="td-val">' + (UI.hayVariosServicios() ? UI.servTag(p.servicio, 'sm') + ' ' : '') + U.esc(det) +
            (p.notas ? '<br><small class="muted">' + U.esc(p.notas) + '</small>' : '') + '</div></td>' +
          '<td data-label="Forma de pago"><span class="badge pay">' + U.esc(p.forma) + '</span></td>' +
          '<td data-label="Monto" class="num"><strong>' + U.fmtMoney(p.monto) + '</strong></td>' +
          '<td class="row-actions no-print">' +
            '<button class="btn-icon" data-pago-edit="' + U.esc(p.id) + '" aria-label="Editar pago">' + U.icon('edit') + '</button>' +
            '<button class="btn-icon danger" data-pago-del="' + U.esc(p.id) + '" aria-label="Eliminar pago">' + U.icon('trash') + '</button>' +
            '<button class="btn-icon" data-pago-rec="' + U.esc(p.id) + '" aria-label="Imprimir recibo">' + U.icon('printer') + '</button>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  };

  PG.bindTable = function (box, onChange) {
    box.querySelectorAll('[data-pago-edit]').forEach(function (b) {
      b.addEventListener('click', function () { PG.openForm(b.dataset.pagoEdit, null, onChange); });
    });
    box.querySelectorAll('[data-pago-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        const p = S.pago(b.dataset.pagoDel);
        UI.confirm({
          title: 'Eliminar pago',
          message: '¿Eliminar el pago de ' + U.fmtMoney(p.monto) + ' del ' + U.fmtDate(p.fecha) + '?',
          onConfirm: function () { S.deletePago(p.id); UI.toast('Pago eliminado'); if (onChange) onChange(); }
        });
      });
    });
    box.querySelectorAll('[data-pago-rec]').forEach(function (b) {
      b.addEventListener('click', function () { recibo(b.dataset.pagoRec); });
    });
  };

  /* ================= Formulario ================= */
  PG.openForm = function (id, preset, onSaved) {
    if (!S.pacientes().length) {
      UI.toast('Primero cargá un paciente.', 'error');
      return;
    }
    const pre = Object.assign({}, preset || {});
    if (!pre.profesionalId) {
      pre.profesionalId = pre.pacienteId ? KF.Pacientes.profesionalHabitual(pre.pacienteId) : S.profesionalPrincipal().id;
    }
    if (!pre.servicio) {
      pre.servicio = pre.pacienteId ? KF.Pacientes.servicioHabitual(pre.pacienteId) : S.servicioPrincipal().id;
    }
    const p = id ? S.pago(id) : Object.assign({
      fecha: U.today(),
      forma: 'Efectivo',
      concepto: 'Sesión individual',
      sesiones: 1,
      monto: S.configProfesional(pre.profesionalId, pre.servicio).precioSesion || ''
    }, pre);

    const body =
      '<div class="form-grid">' +
        UI.servicioCampo(p.servicio, { label: 'Servicio' }) +
        UI.pacienteSelect(p.pacienteId) +
        UI.profSelect(p.profesionalId, { label: 'Profesional (a quién corresponde el cobro)' }) +
        UI.field({ name: 'fecha', label: 'Fecha de pago', type: 'date', value: p.fecha, required: true }) +
        UI.field({ name: 'monto', label: 'Monto abonado ($)', type: 'number', value: p.monto, min: 0, step: 'any', required: true }) +
        UI.field({ name: 'concepto', label: '¿Qué abonó?', type: 'select', value: p.concepto, options: S.CONCEPTOS }) +
        UI.field({ name: 'sesiones', label: 'Sesiones que cubre', type: 'number', value: p.sesiones, min: 0, step: 1,
          hint: 'Sirve para saber cuántas sesiones tiene pagas' }) +
        '<div class="field full"><label>Forma de pago</label>' +
          '<div class="pay-options" role="radiogroup" aria-label="Forma de pago">' +
            S.FORMAS_PAGO.map(function (f) {
              return '<label class="chip lg"><input type="radio" name="forma" value="' + U.esc(f) + '"' +
                (p.forma === f ? ' checked' : '') + '><span>' + U.esc(f) + '</span></label>';
            }).join('') +
          '</div>' +
        '</div>' +
        UI.field({ name: 'notas', label: 'Detalle / Observaciones', type: 'textarea', rows: 2, value: p.notas, full: true,
          placeholder: 'Ej: N° de operación, cuotas, banco, paga la diferencia la próxima…' }) +
      '</div>';

    UI.modal({
      title: id ? 'Editar pago' : 'Registrar pago',
      size: 'md',
      body: body,
      submitLabel: id ? 'Guardar cambios' : 'Registrar pago',
      onOpen: function (modal) {
        const concepto = modal.querySelector('[name=concepto]');
        const sesiones = modal.querySelector('[name=sesiones]');
        const monto = modal.querySelector('[name=monto]');
        const prof = modal.querySelector('[name=profesionalId]');
        const servicio = function () {
          const r = modal.querySelector('[name=servicio]:checked') || modal.querySelector('[name=servicio]');
          return r ? r.value : '';
        };
        let precio = S.configProfesional(prof.value, servicio()).precioSesion;
        /* Cada servicio y cada profesional pueden tener su propio valor de sesión */
        const actualizarPrecio = function () {
          precio = S.configProfesional(prof.value, servicio()).precioSesion;
          if (id || !precio) return;
          if (concepto.value === 'Sesión individual') monto.value = precio;
          else if (concepto.value === 'Paquete de sesiones') monto.value = precio * (Number(sesiones.value) || 0);
        };
        prof.addEventListener('change', actualizarPrecio);
        modal.querySelectorAll('input[type=radio][name=servicio]').forEach(function (r) { r.addEventListener('change', actualizarPrecio); });
        /* Sugerencias automáticas según el concepto elegido */
        concepto.addEventListener('change', function () {
          if (concepto.value === 'Sesión individual') { sesiones.value = 1; if (precio) monto.value = precio; }
          else if (concepto.value === 'Paquete de sesiones') { if (!Number(sesiones.value) || Number(sesiones.value) < 2) sesiones.value = 10; if (precio) monto.value = precio * Number(sesiones.value); }
          else if (['Seña', 'Coseguro / Copago', 'Otro'].indexOf(concepto.value) >= 0) sesiones.value = 0;
        });
        sesiones.addEventListener('input', function () {
          if (precio && concepto.value === 'Paquete de sesiones') monto.value = precio * (Number(sesiones.value) || 0);
        });
      },
      onSubmit: function (form) {
        const d = UI.formData(form);
        d.monto = Number(d.monto) || 0;
        d.sesiones = Number(d.sesiones) || 0;
        d.forma = d.forma || 'Otro';
        if (id) d.id = id;
        if (!id && preset && preset.turnoId) d.turnoId = preset.turnoId;
        S.savePago(d);
        UI.toast(id ? 'Pago actualizado' : 'Pago de ' + U.fmtMoney(d.monto) + ' registrado');
        if (onSaved) onSaved();
      }
    });
  };

  /* ================= Recibo imprimible ================= */
  function recibo(id) {
    const p = S.pago(id);
    const pac = S.paciente(p.pacienteId);
    const set = S.settings;
    const prof = S.profesional(p.profesionalId) || {};
    const marca = KF.Marca.actual();
    const logoRec = marca.logo || marca.simbolo;
    const html =
      '<div class="recibo">' +
        '<header>' +
          (logoRec ? '<img class="rec-logo' + (marca.logoFondoOscuro ? ' fondo-oscuro' : '') + '" src="' + U.esc(logoRec) + '" alt="' + U.esc(KF.Marca.nombreCompleto(marca)) + '">' : '') +
          '<div class="rec-info"><strong class="rec-brand">' + U.esc(marca.nombre) + '</strong><br>' +
          (marca.subtitulo ? '<span class="rec-tag">' + U.esc(marca.subtitulo) + '</span><br>' : '') +
          (prof.nombre ? U.esc(prof.nombre) + '<br>' : '') +
          U.esc(prof.especialidad || '') + (prof.matricula ? ' · M.P. ' + U.esc(prof.matricula) : '') + '<br>' +
          U.esc([set.direccion, set.telefono].filter(Boolean).join(' · ')) + '</div>' +
          '<div class="rec-title">RECIBO<br><small>' + U.fmtDate(p.fecha) + '</small></div></header>' +
        '<p>Recibí de <strong>' + U.esc(pac ? (pac.nombre + ' ' + pac.apellido) : '') + '</strong>' +
          (pac && pac.dni ? ' (DNI ' + U.esc(pac.dni) + ')' : '') + ' la suma de <strong>' + U.fmtMoney(p.monto) + '</strong> ' +
          'en concepto de <strong>' + U.esc(p.concepto || '') + '</strong>' +
          (Number(p.sesiones) ? ' (' + p.sesiones + (Number(p.sesiones) === 1 ? ' sesión' : ' sesiones') + ')' : '') +
          ', abonado mediante <strong>' + U.esc(p.forma) + '</strong>.</p>' +
        (p.notas ? '<p class="muted">' + U.esc(p.notas) + '</p>' : '') +
        '<div class="firma">Firma y sello</div>' +
        '<p class="small muted">Documento no válido como factura.</p>' +
      '</div>';
    UI.modal({
      title: 'Recibo de pago',
      size: 'md',
      body: '<div class="print-area">' + html + '</div>',
      extraFooter: '<button type="button" class="btn btn-primary" id="print-rec">' + U.icon('printer') + 'Imprimir</button>'
    });
    document.getElementById('print-rec').addEventListener('click', function () {
      document.body.classList.add('printing-modal');
      window.print();
      setTimeout(function () { document.body.classList.remove('printing-modal'); }, 500);
    });
  }

  function exportCSV(pagos) {
    const rows = [['Fecha', 'Servicio', 'Profesional', 'Apellido', 'Nombre', 'DNI', 'Qué abonó', 'Sesiones', 'Forma de pago', 'Monto', 'Observaciones']];
    pagos.slice().reverse().forEach(function (p) {
      const pac = S.paciente(p.pacienteId) || {};
      const prof = S.profesional(p.profesionalId) || {};
      rows.push([U.fmtDate(p.fecha), (S.servicio(p.servicio) || {}).nombre || '', prof.nombre || '', pac.apellido || '', pac.nombre || '', pac.dni || '', p.concepto || '',
        p.sesiones || 0, p.forma || '', String(p.monto || 0).replace('.', ','), p.notas || '']);
    });
    const csv = '﻿' + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    U.download('pagos-' + mesSel + '.csv', csv, 'text/csv;charset=utf-8');
  }

  KF.Pagos = PG;
})(window.KF);
