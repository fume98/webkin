/* Almacenamiento de datos en el navegador (localStorage) */
(function (KF) {
  'use strict';

  const U = KF.U;
  const KEY_LOCAL = 'kinesio_datos_v1';          /* modo sin nube */
  const KEY_NUBE = 'kinesio_nube_cache_v1';       /* copia local de los datos de la nube */
  const KEY_DISPOSITIVO = 'kinesio_dispositivo_v1'; /* preferencias propias de este dispositivo */
  let KEY = KEY_LOCAL;
  let modoNube = false;

  const COLECCIONES = ['profesionales', 'pacientes', 'turnos', 'evoluciones', 'pagos'];
  /* Ajustes que no se comparten entre dispositivos */
  const DEVICE_KEYS = ['tamanoLetra', 'pinHash', 'pinLen', 'ultimoBackup'];

  const FORMAS_PAGO = [
    'Efectivo',
    'Transferencia',
    'Mercado Pago',
    'Tarjeta de débito',
    'Tarjeta de crédito',
    'Obra social / Prepaga',
    'Otro'
  ];

  const CONCEPTOS = [
    'Sesión individual',
    'Paquete de sesiones',
    'Evaluación / Primera consulta',
    'Coseguro / Copago',
    'Seña',
    'Atención a domicilio',
    'Otro'
  ];

  const ESTADOS_TURNO = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'asistio', label: 'Asistió' },
    { value: 'ausente', label: 'No vino' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  /* Colores para distinguir la agenda de cada profesional */
  const COLORES_PROF = ['#0b7f7c', '#5f6e22', '#2f6f9f', '#7a4f9a', '#c0573e', '#a07800', '#b0457a', '#4f5e5b'];

  /* Servicios que ofrece el consultorio: cada uno tiene su propia sección de turnos */
  const SERVICIOS_DEFAULT = [
    { id: 'kinesiologia', nombre: 'Kinesiología', corto: 'Kinesio', color: '#0b7f7c', duracionTurno: '', precioSesion: '', activo: true },
    { id: 'quiropraxia', nombre: 'Quiropraxia', corto: 'Quiro', color: '#7a4f9a', duracionTurno: '', precioSesion: '', activo: true }
  ];
  const COLORES_SERV = ['#0b7f7c', '#7a4f9a', '#c0573e', '#2f6f9f', '#a07800', '#b0457a', '#5f6e22', '#4f5e5b'];

  const DEFAULT_SETTINGS = {
    profesional: '',
    titulo: 'Lic. en Kinesiología y Fisiatría',
    matricula: '',
    telefono: '',
    direccion: '',
    precioSesion: 0,
    duracionTurno: 45,
    horaInicio: '08:00',
    horaFin: '20:00',
    tamanoLetra: 'normal',
    pinHash: '',
    pinLen: 0,
    ultimoBackup: ''
  };

  function emptyData() {
    return {
      version: 1,
      settings: Object.assign({}, DEFAULT_SETTINGS),
      profesionales: [],
      pacientes: [],
      turnos: [],
      evoluciones: [],
      pagos: []
    };
  }

  let data = load();

  function leerJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('No se pudieron leer los datos', e);
      return null;
    }
  }

  function load() {
    return normalize(leerJSON(KEY) || emptyData());
  }

  function pick(obj, keys) {
    const out = {};
    keys.forEach(function (k) { if (obj && obj[k] !== undefined) out[k] = obj[k]; });
    return out;
  }

  /* Preferencias del dispositivo (en modo nube viven aparte de los datos compartidos) */
  function prefsDispositivo() {
    const guardadas = leerJSON(KEY_DISPOSITIVO);
    if (guardadas) return guardadas;
    const local = leerJSON(KEY_LOCAL);
    return pick((local && local.settings) || data.settings, DEVICE_KEYS);
  }

  function normalize(d) {
    const base = emptyData();
    const out = Object.assign(base, d || {});
    out.settings = Object.assign({}, DEFAULT_SETTINGS, (d && d.settings) || {});
    ['profesionales', 'pacientes', 'turnos', 'evoluciones', 'pagos'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    migrarProfesionales(out);
    migrarServicios(out);
    return out;
  }

  /* Servicios de un profesional: si no eligió ninguno, atiende todos */
  function serviciosDeProf(prof, servicios) {
    const ids = servicios.map(function (x) { return x.id; });
    const propios = prof && Array.isArray(prof.servicios) ? prof.servicios.filter(function (x) { return ids.indexOf(x) >= 0; }) : [];
    return propios.length ? propios : ids;
  }

  /*
   * Los turnos, sesiones y pagos de versiones anteriores no tenían servicio:
   * se les asigna el del turno, el único que atiende su profesional, Quiropraxia
   * si el profesional es quiropráctico, o el primero (Kinesiología).
   */
  function migrarServicios(d) {
    const st = d.settings;
    if (!Array.isArray(st.servicios) || !st.servicios.length) {
      st.servicios = JSON.parse(JSON.stringify(SERVICIOS_DEFAULT));
    }
    const servicios = st.servicios;
    const primero = servicios[0].id;
    const tieneQuiro = servicios.some(function (x) { return x.id === 'quiropraxia'; });
    const profs = {};
    d.profesionales.forEach(function (p) { profs[p.id] = p; });
    const deduce = function (x) {
      const prof = profs[x.profesionalId];
      const propios = serviciosDeProf(prof, servicios);
      if (propios.length === 1) return propios[0];
      if (tieneQuiro && prof && /quiro/i.test(prof.especialidad || '') && !/kines/i.test(prof.especialidad || '')) return 'quiropraxia';
      return primero;
    };
    const porTurno = {};
    d.turnos.forEach(function (t) {
      if (!t.servicio) t.servicio = deduce(t);
      porTurno[t.id] = t.servicio;
    });
    ['evoluciones', 'pagos'].forEach(function (k) {
      d[k].forEach(function (x) { if (!x.servicio) x.servicio = porTurno[x.turnoId] || deduce(x); });
    });
  }

  /*
   * Siempre debe existir al menos un profesional. Los datos de versiones
   * anteriores (un solo profesional en Ajustes) se pasan al primero y sus
   * turnos, sesiones y pagos quedan asignados a él.
   */
  function migrarProfesionales(d) {
    const st = d.settings;
    if (!d.profesionales.length) {
      d.profesionales.push({
        id: U.uid(),
        nombre: st.profesional || 'Profesional principal',
        especialidad: st.titulo || 'Lic. en Kinesiología y Fisiatría',
        matricula: st.matricula || '',
        telefono: '',
        color: COLORES_PROF[0],
        duracionTurno: '',
        horaInicio: '',
        horaFin: '',
        precioSesion: '',
        activo: true,
        creado: new Date().toISOString()
      });
    }
    const first = d.profesionales[0].id;
    const ids = {};
    d.profesionales.forEach(function (p) { ids[p.id] = true; });
    ['turnos', 'evoluciones', 'pagos'].forEach(function (k) {
      d[k].forEach(function (x) { if (!x.profesionalId || !ids[x.profesionalId]) x.profesionalId = first; });
    });
  }

  /* silencioso: cambios que vienen de la nube y no hay que volver a subir */
  function save(silencioso) {
    let ok = true;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      if (modoNube) localStorage.setItem(KEY_DISPOSITIVO, JSON.stringify(pick(data.settings, DEVICE_KEYS)));
    } catch (e) {
      console.error(e);
      ok = false;
      if (!modoNube) KF.UI && KF.UI.toast('No se pudo guardar. El almacenamiento del navegador está lleno o bloqueado.', 'error');
    }
    if (modoNube && !silencioso && KF.Nube) KF.Nube.alGuardar();
    return ok;
  }

  /* CRUD genérico */
  function upsert(collection, item) {
    const list = data[collection];
    const now = new Date().toISOString();
    if (item.id) {
      const idx = list.findIndex(function (x) { return x.id === item.id; });
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], item, { actualizado: now });
        save();
        return list[idx];
      }
    }
    const created = Object.assign({ id: U.uid(), creado: now }, item);
    list.push(created);
    save();
    return created;
  }

  function remove(collection, id) {
    data[collection] = data[collection].filter(function (x) { return x.id !== id; });
    save();
  }

  function get(collection, id) {
    return data[collection].find(function (x) { return x.id === id; }) || null;
  }

  const S = {
    FORMAS_PAGO: FORMAS_PAGO,
    CONCEPTOS: CONCEPTOS,
    ESTADOS_TURNO: ESTADOS_TURNO,

    COLORES_PROF: COLORES_PROF,
    COLECCIONES: COLECCIONES,
    DEVICE_KEYS: DEVICE_KEYS,

    /* ---------- Integración con la nube ---------- */
    datos: function () { return data; },
    esModoNube: function () { return modoNube; },
    /* Datos del modo sin nube de este dispositivo (para ofrecer subirlos) */
    datosLocales: function () {
      const d = leerJSON(KEY_LOCAL);
      return d ? normalize(d) : null;
    },
    cacheNube: function () { return leerJSON(KEY_NUBE); },
    /* Pasa a trabajar con los datos de la nube */
    activarNube: function (remotos) {
      const prefs = prefsDispositivo();
      modoNube = true;
      KEY = KEY_NUBE;
      data = normalize(remotos || emptyData());
      data.settings = Object.assign(data.settings, prefs);
      save(true);
      return data;
    },
    /* Aplica un registro que llegó de la nube (null = borrado) */
    aplicarRegistro: function (coleccion, id, rec) {
      if (coleccion === 'consultorio') {
        const servicios = data.settings.servicios;
        data.settings = Object.assign({}, DEFAULT_SETTINGS, rec || {}, pick(data.settings, DEVICE_KEYS));
        if (!Array.isArray(data.settings.servicios) || !data.settings.servicios.length) {
          data.settings.servicios = servicios || JSON.parse(JSON.stringify(SERVICIOS_DEFAULT));
        }
      } else if (COLECCIONES.indexOf(coleccion) >= 0) {
        const list = data[coleccion];
        const idx = list.findIndex(function (x) { return x.id === id; });
        if (!rec) { if (idx >= 0) list.splice(idx, 1); }
        else if (idx >= 0) list[idx] = rec;
        else list.push(rec);
      }
      save(true);
    },
    /* Al cerrar sesión: se borra la copia local de los datos de la nube */
    salirDeNube: function () {
      try { localStorage.removeItem(KEY_NUBE); } catch (e) { /* nada */ }
      modoNube = false;
      KEY = KEY_LOCAL;
      data = load();
    },

    estadoLabel: function (value) {
      const e = ESTADOS_TURNO.find(function (x) { return x.value === value; });
      return e ? e.label : value;
    },

    get settings() { return data.settings; },

    saveSettings: function (partial) {
      data.settings = Object.assign({}, data.settings, partial);
      save();
    },

    /* Profesionales del consultorio */
    profesionales: function (incluirInactivos) {
      return data.profesionales.filter(function (p) { return incluirInactivos || p.activo !== false; });
    },
    profesional: function (id) { return get('profesionales', id); },
    /* ---------- Servicios ---------- */
    COLORES_SERV: COLORES_SERV,
    servicios: function (incluirInactivos) {
      return (data.settings.servicios || []).filter(function (x) { return incluirInactivos || x.activo !== false; });
    },
    servicio: function (id) {
      return (data.settings.servicios || []).find(function (x) { return x.id === id; }) || null;
    },
    servicioPrincipal: function () {
      return S.servicios()[0] || data.settings.servicios[0];
    },
    saveServicios: function (lista) {
      S.saveSettings({ servicios: lista });
    },
    serviciosDeProfesional: function (profId) {
      return serviciosDeProf(S.profesional(profId), S.servicios(true));
    },
    /* Profesionales activos que atienden un servicio */
    profesionalesDeServicio: function (servicioId) {
      return S.profesionales().filter(function (p) {
        return !servicioId || S.serviciosDeProfesional(p.id).indexOf(servicioId) >= 0;
      });
    },
    usoServicio: function (id) {
      const f = function (x) { return x.servicio === id; };
      return { turnos: data.turnos.filter(f).length, pagos: data.pagos.filter(f).length };
    },

    profesionalPrincipal: function () {
      return S.profesionales()[0] || data.profesionales[0];
    },
    saveProfesional: function (p) { return upsert('profesionales', p); },
    /*
     * Datos de agenda del profesional para un servicio.
     * Duración y precio: los del servicio, si no los del profesional, si no los generales.
     */
    configProfesional: function (id, servicioId) {
      const p = S.profesional(id) || {};
      const sv = S.servicio(servicioId) || {};
      const st = data.settings;
      return {
        duracionTurno: Number(sv.duracionTurno) || Number(p.duracionTurno) || Number(st.duracionTurno) || 45,
        horaInicio: p.horaInicio || st.horaInicio || '08:00',
        horaFin: p.horaFin || st.horaFin || '20:00',
        precioSesion: Number(sv.precioSesion) || Number(p.precioSesion) || Number(st.precioSesion) || 0
      };
    },
    usoProfesional: function (id) {
      const f = function (x) { return x.profesionalId === id; };
      return {
        turnos: data.turnos.filter(f).length,
        evoluciones: data.evoluciones.filter(f).length,
        pagos: data.pagos.filter(f).length
      };
    },
    deleteProfesional: function (id) {
      remove('profesionales', id);
    },

    /* Pacientes */
    pacientes: function () {
      return data.pacientes.slice().sort(function (a, b) {
        return U.fullName(a).localeCompare(U.fullName(b), 'es');
      });
    },
    paciente: function (id) { return get('pacientes', id); },
    savePaciente: function (p) { return upsert('pacientes', p); },
    deletePaciente: function (id) {
      data.turnos = data.turnos.filter(function (t) { return t.pacienteId !== id; });
      data.evoluciones = data.evoluciones.filter(function (e) { return e.pacienteId !== id; });
      data.pagos = data.pagos.filter(function (p) { return p.pacienteId !== id; });
      remove('pacientes', id);
    },

    /* Turnos */
    turnos: function () { return data.turnos; },
    turno: function (id) { return get('turnos', id); },
    saveTurno: function (t) { return upsert('turnos', t); },
    deleteTurno: function (id) {
      data.evoluciones.forEach(function (e) { if (e.turnoId === id) e.turnoId = ''; });
      data.pagos.forEach(function (p) { if (p.turnoId === id) p.turnoId = ''; });
      remove('turnos', id);
    },
    turnosDelDia: function (fecha, profesionalId, servicioId) {
      return data.turnos.filter(function (t) {
        return t.fecha === fecha && (!profesionalId || t.profesionalId === profesionalId) &&
          (!servicioId || t.servicio === servicioId);
      })
        .sort(function (a, b) { return a.hora.localeCompare(b.hora); });
    },
    turnosDePaciente: function (pacienteId) {
      return data.turnos.filter(function (t) { return t.pacienteId === pacienteId; })
        .sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
    },
    /* Número de sesión del turno dentro del tratamiento del paciente (en ese servicio) */
    numeroSesion: function (turno) {
      const lista = S.turnosDePaciente(turno.pacienteId).filter(function (t) {
        return t.estado !== 'cancelado' && t.estado !== 'ausente' && (t.servicio || '') === (turno.servicio || '');
      });
      const idx = lista.findIndex(function (t) { return t.id === turno.id; });
      return idx >= 0 ? idx + 1 : null;
    },
    /* Busca superposición de horarios en el mismo día y con el mismo profesional */
    turnoSuperpuesto: function (fecha, hora, duracion, excludeId, profesionalId) {
      const ini = U.timeToMin(hora);
      const fin = ini + (Number(duracion) || 0);
      return data.turnos.find(function (t) {
        if (t.id === excludeId || t.fecha !== fecha || t.estado === 'cancelado') return false;
        if (profesionalId && t.profesionalId !== profesionalId) return false;
        const ti = U.timeToMin(t.hora);
        const tf = ti + (Number(t.duracion) || 0);
        return ini < tf && ti < fin;
      }) || null;
    },

    /* Historia clínica: evoluciones por sesión */
    evolucionesDePaciente: function (pacienteId) {
      return data.evoluciones.filter(function (e) { return e.pacienteId === pacienteId; })
        .sort(function (a, b) { return (b.fecha + (b.creado || '')).localeCompare(a.fecha + (a.creado || '')); });
    },
    evolucion: function (id) { return get('evoluciones', id); },
    saveEvolucion: function (e) { return upsert('evoluciones', e); },
    deleteEvolucion: function (id) { remove('evoluciones', id); },

    /* Pagos */
    pagos: function () {
      return data.pagos.slice().sort(function (a, b) {
        return (b.fecha + (b.creado || '')).localeCompare(a.fecha + (a.creado || ''));
      });
    },
    pago: function (id) { return get('pagos', id); },
    pagosDePaciente: function (pacienteId) {
      return S.pagos().filter(function (p) { return p.pacienteId === pacienteId; });
    },
    savePago: function (p) { return upsert('pagos', p); },
    deletePago: function (id) { remove('pagos', id); },

    /* Resumen de cuenta del paciente (en sesiones y en dinero) */
    cuentaPaciente: function (pacienteId) {
      const asistidas = data.turnos.filter(function (t) {
        return t.pacienteId === pacienteId && t.estado === 'asistio';
      }).length;
      const pagos = S.pagosDePaciente(pacienteId);
      const sesionesPagas = pagos.reduce(function (s, p) { return s + (Number(p.sesiones) || 0); }, 0);
      const total = pagos.reduce(function (s, p) { return s + (Number(p.monto) || 0); }, 0);
      return {
        asistidas: asistidas,
        sesionesPagas: sesionesPagas,
        saldoSesiones: sesionesPagas - asistidas,
        totalAbonado: total,
        ultimoPago: pagos[0] || null
      };
    },

    /* Copia de seguridad */
    exportJSON: function () {
      return JSON.stringify(Object.assign({}, data, { exportado: new Date().toISOString() }), null, 2);
    },
    importJSON: function (text) {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.pacientes)) {
        throw new Error('El archivo no parece una copia de seguridad válida.');
      }
      const pin = data.settings.pinHash;
      const pinLen = data.settings.pinLen;
      data = normalize(parsed);
      if (!parsed.settings || parsed.settings.pinHash === undefined) {
        data.settings.pinHash = pin;
        data.settings.pinLen = pinLen;
      }
      save();
    },
    resetAll: function () {
      data = normalize(emptyData());
      save();
    },
    stats: function () {
      return {
        profesionales: S.profesionales().length,
        pacientes: data.pacientes.length,
        turnos: data.turnos.length,
        evoluciones: data.evoluciones.length,
        pagos: data.pagos.length
      };
    }
  };

  KF.Store = S;
})(window.KF);
