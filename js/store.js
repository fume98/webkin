/* Almacenamiento de datos en el navegador (localStorage) */
(function (KF) {
  'use strict';

  const U = KF.U;
  const KEY = 'kinesio_datos_v1';

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
      pacientes: [],
      turnos: [],
      evoluciones: [],
      pagos: []
    };
  }

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyData();
      return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('No se pudieron leer los datos', e);
      return emptyData();
    }
  }

  function normalize(d) {
    const base = emptyData();
    const out = Object.assign(base, d || {});
    out.settings = Object.assign({}, DEFAULT_SETTINGS, (d && d.settings) || {});
    ['pacientes', 'turnos', 'evoluciones', 'pagos'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(e);
      KF.UI && KF.UI.toast('No se pudo guardar. El almacenamiento del navegador está lleno o bloqueado.', 'error');
      return false;
    }
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

    estadoLabel: function (value) {
      const e = ESTADOS_TURNO.find(function (x) { return x.value === value; });
      return e ? e.label : value;
    },

    get settings() { return data.settings; },

    saveSettings: function (partial) {
      data.settings = Object.assign({}, data.settings, partial);
      save();
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
    turnosDelDia: function (fecha) {
      return data.turnos.filter(function (t) { return t.fecha === fecha; })
        .sort(function (a, b) { return a.hora.localeCompare(b.hora); });
    },
    turnosDePaciente: function (pacienteId) {
      return data.turnos.filter(function (t) { return t.pacienteId === pacienteId; })
        .sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
    },
    /* Número de sesión del turno dentro del tratamiento del paciente */
    numeroSesion: function (turno) {
      const lista = S.turnosDePaciente(turno.pacienteId).filter(function (t) {
        return t.estado !== 'cancelado' && t.estado !== 'ausente';
      });
      const idx = lista.findIndex(function (t) { return t.id === turno.id; });
      return idx >= 0 ? idx + 1 : null;
    },
    /* Busca superposición de horarios en el mismo día */
    turnoSuperpuesto: function (fecha, hora, duracion, excludeId) {
      const ini = U.timeToMin(hora);
      const fin = ini + (Number(duracion) || 0);
      return data.turnos.find(function (t) {
        if (t.id === excludeId || t.fecha !== fecha || t.estado === 'cancelado') return false;
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
      data = emptyData();
      save();
    },
    stats: function () {
      return {
        pacientes: data.pacientes.length,
        turnos: data.turnos.length,
        evoluciones: data.evoluciones.length,
        pagos: data.pagos.length
      };
    }
  };

  KF.Store = S;
})(window.KF);
