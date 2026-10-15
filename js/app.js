/* Arranque, navegación entre pantallas y bloqueo con PIN */
(function (KF) {
  'use strict';

  const U = KF.U;
  const S = KF.Store;

  const NAV = [
    { route: 'inicio', label: 'Inicio', icon: 'home' },
    { route: 'agenda', label: 'Agenda', icon: 'calendar' },
    { route: 'pacientes', label: 'Pacientes', icon: 'users' },
    { route: 'pagos', label: 'Pagos', icon: 'wallet' },
    { route: 'ajustes', label: 'Ajustes', icon: 'settings' }
  ];

  const App = {};
  let locked = false;

  function parseRoute() {
    const h = (location.hash || '#/inicio').replace(/^#\/?/, '');
    const parts = h.split('/');
    return { name: parts[0] || 'inicio', id: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function buildNav() {
    const html = NAV.map(function (n) {
      return '<a href="#/' + n.route + '" data-route="' + n.route + '">' + U.icon(n.icon) + '<span>' + n.label + '</span></a>';
    }).join('');
    document.getElementById('side-nav').innerHTML = html;
    document.getElementById('bottom-nav').innerHTML = html;
  }

  function markNav(name) {
    const active = name === 'paciente' ? 'pacientes' : name;
    document.querySelectorAll('[data-route]').forEach(function (a) {
      const on = a.dataset.route === active;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  App.refresh = function () {
    if (locked) return;
    const r = parseRoute();
    const main = document.getElementById('main');
    const scroll = window.scrollY;
    markNav(r.name);
    switch (r.name) {
      case 'agenda': KF.Agenda.render(main); break;
      case 'pacientes': KF.Pacientes.renderList(main); break;
      case 'paciente': KF.Pacientes.renderDetail(main, r.id); break;
      case 'pagos': KF.Pagos.render(main); break;
      case 'ajustes': KF.Ajustes.render(main); break;
      default: KF.Inicio.render(main);
    }
    window.scrollTo(0, scroll);
  };

  function onRoute() {
    KF.UI.closeModal();
    App.refresh();
    window.scrollTo(0, 0);
    document.getElementById('main').focus({ preventScroll: true });
  }

  App.applyFont = function () {
    document.documentElement.dataset.font = S.settings.tamanoLetra || 'normal';
  };

  App.updateBrand = function () {
    const set = S.settings;
    const sub = [set.profesional, set.titulo].filter(Boolean).join(' · ');
    document.getElementById('brand-sub').textContent = sub || 'Kinesiología y Fisiatría';
  };

  /* ---------- PIN ---------- */
  App.hashPin = function (pin) {
    const text = 'kinesio-salt::' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return Promise.resolve('d' + h.toString(16));
  };

  App.lock = function () {
    if (!S.settings.pinHash) return;
    locked = true;
    KF.UI.closeModal();
    document.getElementById('main').innerHTML = '';
    const scr = document.getElementById('lock-screen');
    scr.hidden = false;
    let pin = '';
    const len = Number(S.settings.pinLen) || 0;
    const dots = scr.querySelector('.pin-dots');
    const msg = scr.querySelector('.pin-msg');

    const draw = function () {
      dots.innerHTML = '';
      for (let i = 0; i < (len || Math.max(4, pin.length)); i++) {
        dots.innerHTML += '<i class="' + (i < pin.length ? 'on' : '') + '"></i>';
      }
    };
    const tryUnlock = function () {
      App.hashPin(pin).then(function (h) {
        if (h === S.settings.pinHash) {
          locked = false;
          scr.hidden = true;
          document.removeEventListener('keydown', onKey);
          App.refresh();
        } else if (pin.length >= (len || 8)) {
          msg.textContent = 'Clave incorrecta. Probá de nuevo.';
          dots.classList.remove('shake');
          void dots.offsetWidth;
          dots.classList.add('shake');
          pin = '';
          draw();
        }
      });
    };
    const press = function (k) {
      msg.textContent = '';
      if (k === 'del') pin = pin.slice(0, -1);
      else if (pin.length < 8) pin += k;
      draw();
      if (len ? pin.length === len : pin.length >= 4) tryUnlock();
    };
    const onKey = function (ev) {
      if (/^\d$/.test(ev.key)) press(ev.key);
      else if (ev.key === 'Backspace') press('del');
    };

    scr.querySelector('.pin-pad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(function (k) {
      if (!k) return '<span></span>';
      return '<button type="button" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Borrar' : k) + '">' +
        (k === 'del' ? U.icon('chevronLeft') : k) + '</button>';
    }).join('');
    scr.querySelectorAll('[data-k]').forEach(function (b) {
      b.addEventListener('click', function () { press(b.dataset.k); });
    });
    document.addEventListener('keydown', onKey);
    draw();
  };

  /* ---------- Inicio ---------- */
  App.init = function () {
    buildNav();
    App.applyFont();
    App.updateBrand();
    ['brand-icon', 'brand-icon-m'].forEach(function (id) {
      document.getElementById(id).innerHTML = U.icon('logo');
    });
    ['btn-lock', 'btn-lock-m'].forEach(function (id) {
      const btn = document.getElementById(id);
      btn.innerHTML = U.icon('lock');
      btn.addEventListener('click', function () {
        if (S.settings.pinHash) App.lock();
        else {
          KF.UI.toast('Primero activá una clave en Ajustes.', 'error');
          location.hash = '#/ajustes';
        }
      });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && document.getElementById('modal-root').classList.contains('open')) KF.UI.closeModal();
    });
    window.addEventListener('hashchange', onRoute);

    if (S.settings.pinHash) App.lock();
    else App.refresh();
  };

  KF.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
})(window.KF);
