/* Datos ficticios para probar la aplicación */
(function (KF) {
  'use strict';

  const U = KF.U;
  const S = KF.Store;

  KF.Demo = {
    load: function () {
      const hoy = U.today();
      const precio = Number(S.settings.precioSesion) || 15000;
      if (!S.settings.precioSesion) S.saveSettings({ precioSesion: precio });

      const pacientes = [
        { nombre: 'Laura', apellido: 'Martínez', dni: '30111222', fechaNac: '1984-05-12', sexo: 'Femenino',
          telefono: '342 155 111222', email: 'laura.ejemplo@mail.com', direccion: 'San Martín 2450', localidad: 'Santa Fe',
          provincia: 'Santa Fe', ocupacion: 'Docente', obraSocial: 'IAPOS', nroAfiliado: '123456/01',
          medicoDerivante: 'Dr. Pérez (Traumatología)', sesionesIndicadas: 10,
          diagnostico: 'Lumbalgia mecánica', motivoConsulta: 'Dolor lumbar de 3 semanas de evolución que aumenta al estar sentada.',
          antecedentes: 'Sin cirugías. Sedentaria.', medicacion: 'Ibuprofeno 400 mg si hay dolor', alergias: 'Ninguna conocida',
          evaluacion: 'Dolor a la palpación de musculatura paravertebral lumbar. Flexión de tronco limitada. EVA 7/10. Lasègue negativo.',
          objetivos: 'Disminuir dolor, mejorar movilidad, educación postural y fortalecimiento de core.' },
        { nombre: 'Jorge', apellido: 'Gómez', dni: '25333444', fechaNac: '1976-11-03', sexo: 'Masculino',
          telefono: '342 154 333444', direccion: 'Av. 7 de Marzo 1800', localidad: 'Santo Tomé', provincia: 'Santa Fe',
          ocupacion: 'Comerciante / Fútbol amateur', obraSocial: 'Particular', sesionesIndicadas: 15,
          diagnostico: 'Post-quirúrgico LCA rodilla derecha', motivoConsulta: 'Rehabilitación luego de plástica de LCA (hace 4 semanas).',
          antecedentes: 'Esguince de tobillo izquierdo en 2019.', evaluacion: 'Edema leve. Flexión 95°, extensión -5°. Atrofia de cuádriceps.',
          objetivos: 'Recuperar rango completo, fuerza y retorno progresivo al deporte.' },
        { nombre: 'Ana', apellido: 'Rodríguez', dni: '40555666', fechaNac: '1998-02-20', sexo: 'Femenino',
          telefono: '342 156 555666', email: 'ana.ejemplo@mail.com', localidad: 'Santa Fe', provincia: 'Santa Fe',
          ocupacion: 'Estudiante / Hockey', obraSocial: 'OSDE', nroAfiliado: '6100 2233 4455', sesionesIndicadas: 8,
          diagnostico: 'Esguince de tobillo grado II', motivoConsulta: 'Inversión forzada jugando al hockey.',
          evaluacion: 'Edema perimaleolar externo, dolor en LPAA. EVA 6/10.' }
      ].map(function (p) { return S.savePaciente(p); });

      /* Servicios: el primero (Kinesiología) y el segundo (Quiropraxia), si existe */
      const servicios = S.servicios();
      const kine = servicios[0].id;
      const quiro = (servicios[1] || servicios[0]).id;

      /* Dos agendas: la principal y un segundo profesional de ejemplo */
      const prof1 = S.profesionalPrincipal().id;
      const prof2 = S.saveProfesional({
        nombre: 'Lic. Martín Sosa (ejemplo)', especialidad: 'Quiropraxia', matricula: '4321',
        color: S.COLORES_PROF[1], horaInicio: '09:00', horaFin: '18:00', duracionTurno: 30,
        precioSesion: precio + 3000, activo: true, servicios: [quiro]
      }).id;

      const turno = function (p, dias, hora, estado, motivo, prof) {
        const profesionalId = prof || prof1;
        const servicio = prof === prof2 ? quiro : kine;
        return S.saveTurno({ pacienteId: p.id, profesionalId: profesionalId, servicio: servicio, fecha: U.addDays(hoy, dias), hora: hora,
          duracion: S.configProfesional(profesionalId, servicio).duracionTurno, estado: estado, motivo: motivo || '' });
      };

      const t1 = turno(pacientes[0], -4, '09:00', 'asistio', 'Lumbalgia');
      const t2 = turno(pacientes[0], -2, '09:00', 'asistio', 'Lumbalgia');
      turno(pacientes[0], 0, '09:00', 'confirmado', 'Lumbalgia');
      turno(pacientes[0], 2, '09:00', 'pendiente', 'Lumbalgia');
      const t3 = turno(pacientes[1], -3, '17:00', 'asistio', 'Rehabilitación LCA');
      turno(pacientes[1], -1, '17:00', 'falta_aviso', 'Rehabilitación LCA');
      turno(pacientes[1], 0, '17:00', 'pendiente', 'Rehabilitación LCA');
      turno(pacientes[1], 1, '17:00', 'pendiente', 'Rehabilitación LCA');
      turno(pacientes[2], 0, '09:00', 'pendiente', 'Evaluación quiropráctica', prof2);
      turno(pacientes[2], 3, '10:30', 'pendiente', 'Ajuste quiropráctico', prof2);

      S.saveEvolucion({ asistencia: 'atendido', servicio: kine, profesionalId: prof1, pacienteId: pacientes[0].id, turnoId: t1.id, fecha: t1.fecha, sesionNro: 1, dolor: 7,
        tratamiento: 'Magnetoterapia 20 min, TENS 15 min, masoterapia paravertebral.',
        evolucion: 'Llega con mucho dolor. Se retira más aliviada.', indicaciones: 'Calor local 15 min 2 veces por día.' });
      S.saveEvolucion({ asistencia: 'atendido', servicio: kine, profesionalId: prof1, pacienteId: pacientes[0].id, turnoId: t2.id, fecha: t2.fecha, sesionNro: 2, dolor: 5,
        tratamiento: 'TENS, movilización lumbar, ejercicios de Williams.',
        evolucion: 'Refiere mejoría, duerme mejor.' });
      S.saveEvolucion({ asistencia: 'atendido', servicio: kine, profesionalId: prof1, pacienteId: pacientes[1].id, turnoId: t3.id, fecha: t3.fecha, sesionNro: 1, dolor: 4,
        tratamiento: 'Crioterapia, movilización patelar, isométricos de cuádriceps, bicicleta sin carga 10 min.',
        evolucion: 'Buena tolerancia. Flexión 100°.' });

      S.savePago({ servicio: kine, profesionalId: prof1, pacienteId: pacientes[0].id, fecha: U.addDays(hoy, -4), monto: precio * 5, sesiones: 5,
        concepto: 'Paquete de sesiones', forma: 'Transferencia', notas: 'Paga 5 sesiones por adelantado' });
      S.savePago({ servicio: kine, profesionalId: prof1, pacienteId: pacientes[1].id, turnoId: t3.id, fecha: t3.fecha, monto: precio, sesiones: 1,
        concepto: 'Sesión individual', forma: 'Efectivo' });
      S.savePago({ servicio: quiro, profesionalId: prof2, pacienteId: pacientes[2].id, fecha: hoy, monto: precio + 3000, sesiones: 1,
        concepto: 'Evaluación / Primera consulta', forma: 'Mercado Pago' });
    }
  };
})(window.KF);
