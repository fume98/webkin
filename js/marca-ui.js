/* Marca del consultorio: aplica nombre, logo y colores, y permite editarlos desde la app */
(function (KF) {
  'use strict';

  const U = KF.U;
  const S = KF.Store;
  const T = KF.Tema;

  const GENERICO = 'img/generico.svg';
  const M = {};

  /* Ícono genérico (figura humana) pintado con el color principal del consultorio */
  function iconoGenerico(color) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="' + color + '"/>' +
      '<g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="13" r="5"/>' +
      '<path d="M32 21v18M32 39l-9 15M32 39l9 15M17 28l15-4 15 4"/></g></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* Paletas listas para elegir con un toque */
  M.PALETAS = [
    { nombre: 'Azul clínico', colores: { principal: '#1f6fb2', acento: '#2e8b57', barra: '#0f2238' } },
    { nombre: 'Verde salud', colores: { principal: '#2e7d32', acento: '#00897b', barra: '#1b2e20' } },
    { nombre: 'Turquesa', colores: { principal: '#0b7f7c', acento: '#5f6e22', barra: '#000000' } },
    { nombre: 'Violeta', colores: { principal: '#6a4c93', acento: '#c2185b', barra: '#24182f' } },
    { nombre: 'Terracota', colores: { principal: '#b5542f', acento: '#6b8e23', barra: '#2b1d17' } },
    { nombre: 'Gris elegante', colores: { principal: '#37474f', acento: '#00838f', barra: '#263238' } },
    { nombre: 'Claro', colores: { principal: '#1f6fb2', acento: '#2e8b57', barra: '#ffffff' } }
  ];

  /* Marca que se está usando (de fábrica + la personalizada del consultorio) */
  M.actual = function () {
    return T.efectiva(S.settings.marca);
  };

  M.nombreCompleto = function (m) {
    m = m || M.actual();
    return m.nombre + (m.subtitulo ? ' · ' + m.subtitulo.replace(/\s*·\s*/g, ' ') : '');
  };

  /* Pinta la marca en toda la página. personalizada: la configuración a mostrar */
  M.pintar = function (personalizada) {
    const m = T.efectiva(personalizada);
    T.aplicarColores(m);
    const barraOscura = !T.esClaro(T.coloresDe(m).barra);
    const principal = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0b7f7c';
    const propio = m.simbolo && m.simbolo !== GENERICO ? m.simbolo : '';
    const simbolo = propio || m.logo || iconoGenerico(principal);

    document.querySelectorAll('[data-marca=logo]').forEach(function (img) {
      if (m.logo) {
        if (img.getAttribute('src') !== m.logo) img.src = m.logo;
        img.alt = M.nombreCompleto(m);
        img.hidden = false;
        img.classList.toggle('fundir', m.logoFondoOscuro && barraOscura);
        img.classList.toggle('con-fondo', m.logoFondoOscuro && !barraOscura);
      } else {
        img.hidden = true;
      }
    });
    document.querySelectorAll('[data-marca=nombre-bloque]').forEach(function (el) {
      el.hidden = !!m.logo;
      el.innerHTML = m.logo ? '' :
        '<img src="' + U.esc(simbolo) + '" alt="" class="nb-simbolo">' +
        '<strong>' + U.esc(m.nombre) + '</strong>' +
        (m.subtitulo ? '<small>' + U.esc(m.subtitulo) + '</small>' : '');
    });
    document.querySelectorAll('[data-marca=simbolo]').forEach(function (img) {
      if (img.getAttribute('src') !== simbolo) img.src = simbolo;
    });
    document.querySelectorAll('[data-marca=wordmark]').forEach(function (el) {
      el.innerHTML = m.nombrePartes
        ? m.nombrePartes.map(function (p, i) { return '<span class="wm-' + (i + 1) + '">' + U.esc(p) + '</span>'; }).join('')
        : '<span class="wm-1">' + U.esc(m.nombre) + '</span>';
    });
    document.querySelectorAll('[data-marca=subtitulo]').forEach(function (el) {
      el.textContent = m.subtitulo || '';
      el.hidden = !m.subtitulo;
    });
    document.title = M.nombreCompleto(m);
    const fav = document.getElementById('favicon');
    if (fav) fav.href = simbolo;
    const apple = document.getElementById('apple-icon');
    if (apple && (propio || m.logo)) apple.href = simbolo;
    return m;
  };

  /* Aplica la marca guardada del consultorio y la recuerda para la próxima apertura */
  M.aplicar = function () {
    const p = S.settings.marca || null;
    T.guardarCache(p);
    return M.pintar(p);
  };

  /* ================= Imágenes ================= */
  /* Reduce la imagen y detecta si tiene fondo negro (mirando las esquinas) */
  M.procesarImagen = function (file, max) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('El archivo tiene que ser una imagen (PNG, JPG, WEBP o SVG).')); return; }
      if (file.size > 8 * 1024 * 1024) { reject(new Error('La imagen es muy pesada (máximo 8 MB).')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const w = img.naturalWidth || max;
        const h = img.naturalHeight || max;
        const k = Math.min(1, max / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k));
        c.height = Math.max(1, Math.round(h * k));
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let oscuro = true;
        [[0, 0], [c.width - 1, 0], [0, c.height - 1], [c.width - 1, c.height - 1]].forEach(function (pt) {
          const d = ctx.getImageData(pt[0], pt[1], 1, 1).data;
          const lum = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
          if (d[3] < 200 || lum > 0.12) oscuro = false;
        });
        let data = c.toDataURL('image/webp', 0.9);
        if (data.indexOf('data:image/webp') !== 0) data = c.toDataURL('image/png');
        resolve({ dataUrl: data, fondoOscuro: oscuro });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  };

  /* ================= Editor ================= */
  M.resumenHtml = function () {
    const m = M.actual();
    const col = T.coloresDe(m);
    return '<div class="marca-resumen">' +
      '<div class="marca-muestra" style="background:' + U.esc(col.barra) + '">' +
        (m.logo
          ? '<img src="' + U.esc(m.logo) + '" alt="">'
          : '<img src="' + U.esc(m.simbolo || GENERICO) + '" alt="" class="chico">') +
      '</div>' +
      '<div class="marca-datos"><strong>' + U.esc(m.nombre) + '</strong>' +
        (m.subtitulo ? '<span class="muted">' + U.esc(m.subtitulo) + '</span>' : '') +
        '<span class="swatches">' + ['principal', 'acento', 'barra'].map(function (k) {
          return '<i style="background:' + U.esc(col[k]) + '" title="' + k + '"></i>';
        }).join('') + '</span>' +
      '</div>' +
    '</div>';
  };

  M.abrirEditor = function (onGuardar) {
    const UI = KF.UI;
    const inicial = M.actual();
    /* Copia de trabajo: se va mostrando en vivo mientras se edita */
    const tmp = {
      nombre: inicial.nombre,
      subtitulo: inicial.subtitulo,
      logo: inicial.logo,
      simbolo: (S.settings.marca && S.settings.marca.simbolo !== undefined) ? S.settings.marca.simbolo :
        (inicial.simbolo === inicial.logo ? '' : inicial.simbolo),
      logoFondoOscuro: inicial.logoFondoOscuro,
      colores: T.coloresDe(inicial)
    };
    let guardado = false;

    const imgCampo = function (key, titulo, ayuda) {
      return '<div class="field full marca-img" data-img="' + key + '">' +
        '<label>' + titulo + '</label>' +
        '<div class="marca-img-row">' +
          '<span class="marca-img-prev"></span>' +
          '<label class="btn btn-secondary file-btn">' + U.icon('upload') + 'Subir imagen' +
            '<input type="file" accept="image/*" hidden data-subir="' + key + '"></label>' +
          '<button type="button" class="btn btn-ghost danger" data-quitar-img="' + key + '">' + U.icon('trash') + 'Quitar</button>' +
        '</div>' +
        '<small class="hint">' + ayuda + '</small>' +
      '</div>';
    };

    const body =
      '<div class="form-grid">' +
        UI.field({ idPrefix: 'mk_', name: 'nombre', label: 'Nombre del consultorio', value: tmp.nombre, required: true,
          attrs: ' autocomplete="off"' }) +
        UI.field({ idPrefix: 'mk_', name: 'subtitulo', label: 'Subtítulo (opcional)', value: tmp.subtitulo,
          placeholder: 'Ej: Kinesiología y Rehabilitación' }) +
        imgCampo('logo', 'Logo', 'PNG con fondo transparente, o con fondo negro. Si no subís un logo se muestra el nombre.') +
        imgCampo('simbolo', 'Ícono (opcional)', 'Imagen cuadrada para el celular y la pestaña del navegador. Si no subís uno se usa el logo.') +
        '<div class="field full"><label class="check-line"><input type="checkbox" id="mk_fondo"' + (tmp.logoFondoOscuro ? ' checked' : '') + '>' +
          '<span>Mi logo tiene fondo negro</span></label>' +
          '<small class="hint">Se detecta solo al subirlo. Así el logo se funde con la barra oscura.</small></div>' +
      '</div>' +
      '<fieldset class="form-section sub-section"><legend>' + U.icon('settings') + 'Colores</legend>' +
        '<div class="paletas" role="group" aria-label="Paletas sugeridas">' +
          M.PALETAS.map(function (p, i) {
            return '<button type="button" class="paleta" data-paleta="' + i + '">' +
              '<span class="swatches">' + ['principal', 'acento', 'barra'].map(function (k) {
                return '<i style="background:' + p.colores[k] + '"></i>';
              }).join('') + '</span>' + U.esc(p.nombre) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="form-grid colores-grid">' +
          colorCampo('principal', 'Color principal', 'Botones y destacados') +
          colorCampo('acento', 'Color de acento', 'Detalles y estados') +
          colorCampo('barra', 'Color de la barra lateral', 'También el menú del celular') +
        '</div>' +
        '<p class="hint">Mientras elegís, la app ya se ve con los colores nuevos. Si un color dificulta la lectura, se ajusta solo.</p>' +
      '</fieldset>';

    function colorCampo(k, label, ayuda) {
      return '<div class="field color-field"><label for="mk_c_' + k + '">' + label + '</label>' +
        '<div class="color-row"><input type="color" id="mk_c_' + k + '" data-color="' + k + '" value="' + tmp.colores[k] + '">' +
        '<input type="text" class="color-hex" data-hex="' + k + '" value="' + tmp.colores[k] + '" maxlength="7" aria-label="' + label + ' (código)"></div>' +
        '<small class="hint">' + ayuda + '</small></div>';
    }

    const modal = UI.modal({
      title: 'Marca y colores',
      size: 'lg',
      body: body,
      submitLabel: 'Guardar marca',
      onOpen: function (el) {
        const vista = function () {
          M.pintar({
            nombre: tmp.nombre || inicial.nombre, subtitulo: tmp.subtitulo, logo: tmp.logo,
            simbolo: tmp.simbolo, logoFondoOscuro: tmp.logoFondoOscuro, colores: tmp.colores
          });
          ['logo', 'simbolo'].forEach(function (k) {
            const prev = el.querySelector('[data-img=' + k + '] .marca-img-prev');
            const src = tmp[k];
            prev.innerHTML = src ? '<img src="' + U.esc(src) + '" alt="">' : '<span class="muted small">Sin imagen</span>';
            prev.style.background = tmp.colores.barra;
            el.querySelector('[data-quitar-img=' + k + ']').hidden = !src;
          });
          el.querySelectorAll('[data-color]').forEach(function (inp) { inp.value = tmp.colores[inp.dataset.color]; });
          el.querySelectorAll('[data-hex]').forEach(function (inp) {
            if (document.activeElement !== inp) inp.value = tmp.colores[inp.dataset.hex];
          });
          el.querySelector('#mk_fondo').checked = tmp.logoFondoOscuro;
        };
        el.querySelector('#mk_nombre').addEventListener('input', function (ev) { tmp.nombre = ev.target.value.trim(); vista(); });
        el.querySelector('#mk_subtitulo').addEventListener('input', function (ev) { tmp.subtitulo = ev.target.value.trim(); vista(); });
        el.querySelector('#mk_fondo').addEventListener('change', function (ev) { tmp.logoFondoOscuro = ev.target.checked; vista(); });
        el.querySelectorAll('[data-color]').forEach(function (inp) {
          inp.addEventListener('input', function () { tmp.colores[inp.dataset.color] = inp.value.toLowerCase(); vista(); });
        });
        el.querySelectorAll('[data-hex]').forEach(function (inp) {
          inp.addEventListener('input', function () {
            let v = inp.value.trim();
            if (v && v[0] !== '#') v = '#' + v;
            if (T.hexValido(v)) { tmp.colores[inp.dataset.hex] = v.toLowerCase(); vista(); }
          });
        });
        el.querySelectorAll('[data-paleta]').forEach(function (b) {
          b.addEventListener('click', function () {
            tmp.colores = Object.assign({}, M.PALETAS[Number(b.dataset.paleta)].colores);
            vista();
          });
        });
        el.querySelectorAll('[data-subir]').forEach(function (inp) {
          inp.addEventListener('change', function () {
            const k = inp.dataset.subir;
            const file = inp.files[0];
            inp.value = '';
            if (!file) return;
            M.procesarImagen(file, k === 'logo' ? 600 : 256).then(function (r) {
              tmp[k] = r.dataUrl;
              if (k === 'logo') {
                tmp.logoFondoOscuro = r.fondoOscuro;
                /* Con un logo propio, el ícono de fábrica ya no corresponde */
                if (tmp.simbolo && tmp.simbolo === (window.KF_MARCA || {}).simbolo) tmp.simbolo = '';
              }
              vista();
            }).catch(function (e) { UI.toast(e.message, 'error'); });
          });
        });
        el.querySelectorAll('[data-quitar-img]').forEach(function (b) {
          b.addEventListener('click', function () { tmp[b.dataset.quitarImg] = ''; vista(); });
        });
        vista();
      },
      onClose: function () {
        if (!guardado) M.aplicar(); /* cancelado: vuelve a la marca guardada */
      },
      onSubmit: function () {
        if (!tmp.nombre) { UI.toast('Escribí el nombre del consultorio.', 'error'); return false; }
        guardado = true;
        S.saveSettings({ marca: JSON.parse(JSON.stringify(tmp)) });
        M.aplicar();
        UI.toast('Marca guardada');
        if (onGuardar) onGuardar();
      },
      extraFooter: '<button type="button" class="btn btn-ghost" id="mk_restaurar">Volver a la marca original</button>'
    });

    modal.querySelector('#mk_restaurar').addEventListener('click', function () {
      UI.confirm({
        title: 'Volver a la marca original',
        message: 'Se van a usar otra vez el nombre, el logo y los colores originales de esta instalación.',
        confirmLabel: 'Volver a la original',
        danger: false,
        onConfirm: function () {
          S.saveSettings({ marca: null });
          M.aplicar();
          UI.toast('Se restauró la marca original');
          if (onGuardar) onGuardar();
        }
      });
    });
  };

  KF.Marca = M;

  /* Al abrir: la marca de la última vez (antes de tener los datos del consultorio) */
  M.pintar(T.leerCache());
})(window.KF);
