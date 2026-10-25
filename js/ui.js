/* Componentes de interfaz: ventanas, avisos, confirmaciones y campos */
(function (KF) {
  'use strict';

  const U = KF.U;
  const UI = {};

  /* ---------- Avisos breves ---------- */
  UI.toast = function (msg, type) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.setAttribute('role', 'status');
    el.innerHTML = U.icon(type === 'error' ? 'alert' : 'check') + '<span>' + U.esc(msg) + '</span>';
    box.appendChild(el);
    setTimeout(function () { el.classList.add('hide'); }, 3200);
    setTimeout(function () { el.remove(); }, 3700);
  };

  /* ---------- Ventana modal ---------- */
  let lastFocus = null;

  let alCerrar = null;

  UI.closeModal = function () {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    const f = alCerrar;
    alCerrar = null;
    if (f) f();
  };

  /*
   * opts: { title, body (html), size: 'sm'|'md'|'lg', submitLabel, danger,
   *         onSubmit(form) -> false para no cerrar, extraFooter (html), onOpen(el), onClose() }
   */
  UI.modal = function (opts) {
    if (alCerrar) { const f = alCerrar; alCerrar = null; f(); }
    lastFocus = document.activeElement;
    const root = document.getElementById('modal-root');
    const hasForm = !!opts.onSubmit;
    root.innerHTML =
      '<div class="modal-backdrop" data-close></div>' +
      '<div class="modal ' + (opts.size || 'md') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<' + (hasForm ? 'form novalidate' : 'div') + ' class="modal-inner">' +
          '<header class="modal-head">' +
            '<h2 id="modal-title">' + U.esc(opts.title || '') + '</h2>' +
            '<button type="button" class="btn-icon" data-close aria-label="Cerrar">' + U.icon('x') + '</button>' +
          '</header>' +
          '<div class="modal-body">' + (opts.body || '') + '</div>' +
          '<footer class="modal-foot">' +
            (opts.extraFooter || '') +
            '<span class="spacer"></span>' +
            '<button type="button" class="btn btn-ghost" data-close>' + (hasForm ? 'Cancelar' : 'Cerrar') + '</button>' +
            (hasForm ? '<button type="submit" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '">' +
              U.icon(opts.danger ? 'trash' : 'check') + (opts.submitLabel || 'Guardar') + '</button>' : '') +
          '</footer>' +
        '</' + (hasForm ? 'form' : 'div') + '>' +
      '</div>';
    root.classList.add('open');
    document.body.classList.add('no-scroll');
    alCerrar = opts.onClose || null;

    root.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', UI.closeModal);
    });

    const modalEl = root.querySelector('.modal');
    if (hasForm) {
      const form = root.querySelector('form');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!UI.validate(form)) return;
        const result = opts.onSubmit(form);
        if (result !== false) UI.closeModal();
      });
    }
    if (opts.onOpen) opts.onOpen(modalEl);

    const first = modalEl.querySelector('[autofocus], .modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea');
    if (first && window.matchMedia('(pointer:fine)').matches) first.focus();
    return modalEl;
  };

  UI.confirm = function (opts) {
    UI.modal({
      title: opts.title || '¿Estás seguro?',
      size: 'sm',
      body: '<p class="confirm-text">' + U.esc(opts.message || '') + '</p>',
      submitLabel: opts.confirmLabel || 'Sí, eliminar',
      danger: opts.danger !== false,
      onSubmit: function () { opts.onConfirm(); }
    });
  };

  /* ---------- Validación simple ---------- */
  UI.validate = function (form) {
    let ok = true;
    let firstBad = null;
    form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('invalid'); });
    form.querySelectorAll('[required]').forEach(function (input) {
      if (!String(input.value || '').trim()) {
        ok = false;
        const f = input.closest('.field');
        if (f) f.classList.add('invalid');
        if (!firstBad) firstBad = input;
      }
    });
    form.querySelectorAll('input[type=email]').forEach(function (input) {
      if (input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        ok = false;
        const f = input.closest('.field');
        if (f) f.classList.add('invalid');
        if (!firstBad) firstBad = input;
      }
    });
    if (!ok) {
      UI.toast('Revisá los campos marcados en rojo.', 'error');
      if (firstBad) firstBad.focus();
    }
    return ok;
  };

  UI.formData = function (form) {
    const out = {};
    new FormData(form).forEach(function (v, k) { out[k] = typeof v === 'string' ? v.trim() : v; });
    return out;
  };

  /* ---------- Generadores de campos ---------- */
  /*
   * f: { name, label, type, value, required, placeholder, options, hint, full, rows, min, max, step, attrs }
   */
  UI.field = function (f) {
    /* idPrefix evita ids repetidos cuando la página de fondo tiene campos con el mismo nombre */
    const id = (f.idPrefix || 'f_') + f.name;
    const req = f.required ? ' required' : '';
    const val = f.value === undefined || f.value === null ? '' : f.value;
    const ph = f.placeholder ? ' placeholder="' + U.esc(f.placeholder) + '"' : '';
    const extra = f.attrs || '';
    let control;

    if (f.type === 'textarea') {
      control = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' + ph + req + extra + '>' +
        U.esc(val) + '</textarea>';
    } else if (f.type === 'select') {
      control = '<select id="' + id + '" name="' + f.name + '"' + req + extra + '>' +
        (f.empty !== undefined ? '<option value="">' + U.esc(f.empty) + '</option>' : '') +
        U.options(f.options || [], val) + '</select>';
    } else {
      const type = f.type || 'text';
      const num = (f.min !== undefined ? ' min="' + f.min + '"' : '') +
        (f.max !== undefined ? ' max="' + f.max + '"' : '') +
        (f.step !== undefined ? ' step="' + f.step + '"' : '');
      const mode = type === 'tel' ? ' inputmode="tel"' : (type === 'number' ? ' inputmode="decimal"' : '');
      control = '<input id="' + id + '" name="' + f.name + '" type="' + type + '" value="' + U.esc(val) + '"' +
        ph + req + num + mode + extra + '>';
    }

    return '<div class="field' + (f.full ? ' full' : '') + (f.half ? ' half' : '') + '">' +
      '<label for="' + id + '">' + U.esc(f.label) + (f.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
      control +
      (f.hint ? '<small class="hint">' + U.esc(f.hint) + '</small>' : '') +
      '<small class="error-msg">' + (f.type === 'email' ? 'Ingresá un email válido' : 'Este dato es obligatorio') + '</small>' +
    '</div>';
  };

  UI.fieldset = function (title, fields, iconName) {
    return '<fieldset class="form-section"><legend>' + (iconName ? U.icon(iconName) : '') + U.esc(title) + '</legend>' +
      '<div class="form-grid">' + fields.map(UI.field).join('') + '</div></fieldset>';
  };

  /* ---------- Bloques reutilizables ---------- */
  UI.empty = function (iconName, title, text, actionHtml) {
    return '<div class="empty">' +
      '<div class="empty-icon">' + U.icon(iconName) + '</div>' +
      '<h3>' + U.esc(title) + '</h3>' +
      (text ? '<p>' + U.esc(text) + '</p>' : '') +
      (actionHtml || '') +
    '</div>';
  };

  UI.estadoBadge = function (estado) {
    return '<span class="badge estado-' + U.esc(estado) + '">' + U.esc(KF.Store.estadoLabel(estado)) + '</span>';
  };

  /* Selector de paciente con búsqueda (datalist accesible) */
  UI.pacienteSelect = function (selectedId, name) {
    const pacientes = KF.Store.pacientes();
    return '<div class="field full">' +
      '<label for="f_' + (name || 'pacienteId') + '">Paciente <span class="req" aria-hidden="true">*</span></label>' +
      '<select id="f_' + (name || 'pacienteId') + '" name="' + (name || 'pacienteId') + '" required>' +
        '<option value="">Elegí un paciente…</option>' +
        pacientes.map(function (p) {
          return '<option value="' + U.esc(p.id) + '"' + (p.id === selectedId ? ' selected' : '') + '>' +
            U.esc(U.fullName(p)) + (p.dni ? ' — DNI ' + U.esc(p.dni) : '') + '</option>';
        }).join('') +
      '</select>' +
      '<small class="error-msg">Elegí un paciente</small>' +
    '</div>';
  };

  /* ---------- Profesionales ---------- */
  UI.hayVariosProfesionales = function () {
    return KF.Store.profesionales().length > 1;
  };

  /* Etiqueta con el color y el nombre del profesional */
  UI.profTag = function (profesionalId, extraClass) {
    const p = KF.Store.profesional(profesionalId);
    if (!p) return '';
    return '<span class="prof-tag ' + (extraClass || '') + '" style="--prof:' + U.esc(p.color || '#4f5e5b') + '">' +
      '<i aria-hidden="true"></i>' + U.esc(p.nombre) + '</span>';
  };

  UI.profSelect = function (selectedId, opts) {
    const o = opts || {};
    const name = o.name || 'profesionalId';
    /* Si se indica un servicio, solo los profesionales que lo atienden */
    const list = o.servicio ? KF.Store.profesionalesDeServicio(o.servicio) : KF.Store.profesionales();
    if (!list.length) Array.prototype.push.apply(list, KF.Store.profesionales());
    /* Un turno viejo de una agenda desactivada conserva a su profesional */
    const actual = KF.Store.profesional(selectedId);
    if (actual && !list.some(function (p) { return p.id === actual.id; })) list.push(actual);
    const sel = actual ? selectedId : (list[0] && list[0].id);
    return '<div class="field' + (o.full === false ? '' : ' full') + '">' +
      '<label for="f_' + name + '">' + U.esc(o.label || 'Profesional') + ' <span class="req" aria-hidden="true">*</span></label>' +
      '<select id="f_' + name + '" name="' + name + '" required>' +
        list.map(function (p) {
          return '<option value="' + U.esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' +
            U.esc(p.nombre) + (p.especialidad ? ' — ' + U.esc(p.especialidad) : '') + '</option>';
        }).join('') +
      '</select>' +
      '<small class="error-msg">Elegí un profesional</small>' +
    '</div>';
  };

  /* Fila de botones para filtrar por profesional ('' = todos) */
  UI.profFilter = function (selectedId, allLabel, servicioId) {
    const list = KF.Store.profesionalesDeServicio(servicioId);
    if (list.length < 2) return '';
    return '<div class="prof-filter" role="group" aria-label="Filtrar por profesional">' +
      '<button type="button" data-prof="" class="' + (!selectedId ? 'active' : '') + '">' + U.esc(allLabel || 'Todos') + '</button>' +
      list.map(function (p) {
        return '<button type="button" data-prof="' + U.esc(p.id) + '" class="' + (p.id === selectedId ? 'active' : '') + '" ' +
          'style="--prof:' + U.esc(p.color || '#4f5e5b') + '"><i aria-hidden="true"></i>' + U.esc(p.nombre) + '</button>';
      }).join('') +
    '</div>';
  };

  /* Opciones <option> de profesionales para un servicio (para actualizar un select) */
  UI.profOptions = function (servicioId, selectedId) {
    let list = KF.Store.profesionalesDeServicio(servicioId);
    if (!list.length) list = KF.Store.profesionales();
    const sel = list.some(function (p) { return p.id === selectedId; }) ? selectedId : (list[0] && list[0].id);
    return list.map(function (p) {
      return '<option value="' + U.esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' +
        U.esc(p.nombre) + (p.especialidad ? ' — ' + U.esc(p.especialidad) : '') + '</option>';
    }).join('');
  };

  /* ---------- Servicios (Kinesiología, Quiropraxia…) ---------- */
  UI.hayVariosServicios = function () {
    return KF.Store.servicios().length > 1;
  };

  UI.servTag = function (servicioId, extraClass) {
    const sv = KF.Store.servicio(servicioId);
    if (!sv) return '';
    return '<span class="serv-tag ' + (extraClass || '') + '" style="--serv:' + U.esc(sv.color || '#4f5e5b') + '">' + U.esc(sv.nombre) + '</span>';
  };

  /* Botones grandes para elegir el servicio de un turno o pago */
  UI.servicioCampo = function (selectedId, opts) {
    const o = opts || {};
    const list = KF.Store.servicios();
    const actual = KF.Store.servicio(selectedId);
    if (actual && !list.some(function (x) { return x.id === actual.id; })) list.push(actual);
    const sel = actual ? selectedId : (list[0] && list[0].id);
    if (list.length < 2) return '<input type="hidden" name="servicio" value="' + U.esc(sel || '') + '">';
    return '<div class="field full"><label>' + U.esc(o.label || 'Servicio') + '</label>' +
      '<div class="serv-options" role="radiogroup" aria-label="Servicio">' +
        list.map(function (x) {
          return '<label class="serv-opt" style="--serv:' + U.esc(x.color || '#4f5e5b') + '"><input type="radio" name="servicio" value="' + U.esc(x.id) + '"' +
            (x.id === sel ? ' checked' : '') + '><span>' + U.esc(x.nombre) + '</span></label>';
        }).join('') +
      '</div></div>';
  };

  UI.bindProfFilter = function (box, onChange) {
    box.querySelectorAll('.prof-filter [data-prof]').forEach(function (b) {
      b.addEventListener('click', function () { onChange(b.dataset.prof); });
    });
  };

  KF.UI = UI;
})(window.KF);
