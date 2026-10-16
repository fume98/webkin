# FisioCoreSalud · Quiropraxia Cuerpo Vital

Aplicación web del consultorio **FisioCoreSalud · Quiropraxia Cuerpo Vital** para profesionales de **Kinesiología y Fisiatría**: fichas de pacientes, historia clínica sesión por sesión, agenda de turnos y registro de pagos.

No necesita instalación ni servidor: son archivos HTML, CSS y JavaScript que funcionan en cualquier navegador (computadora, tablet o celular).

## Funciones

**Pacientes**
- Ficha completa: nombre, apellido, DNI, fecha de nacimiento (calcula la edad), sexo, ocupación/deporte, teléfono, email, dirección, localidad, provincia, código postal y contacto de emergencia.
- Obra social / prepaga, N° de afiliado, médico derivante y cantidad de sesiones indicadas.
- Historia clínica: diagnóstico, motivo de consulta, antecedentes, medicación, alergias/contraindicaciones, estudios complementarios, evaluación kinésica inicial, objetivos y plan de tratamiento.
- Evolución **sesión por sesión**: tratamiento realizado, evolución, indicaciones para casa y nivel de dolor (escala EVA 0–10), en una línea de tiempo.
- Buscador por nombre, apellido, DNI, teléfono, localidad u obra social.
- Botón de WhatsApp directo e impresión de la ficha.

**Agenda de turnos**
- Vista por día y por semana, con los horarios libres de la jornada.
- Número de sesión automático (por ejemplo, "Sesión 3 de 10").
- Dar varias sesiones de una vez (por ejemplo, 10 sesiones lunes y miércoles a las 18 hs).
- Estados: Pendiente, Confirmado, Asistió, No vino, Cancelado. Al marcar "Asistió" se abre la carga de la evolución.
- Aviso de superposición de horarios.
- Recordatorio por WhatsApp con el mensaje ya escrito.

**Pagos**
- Monto, fecha, forma de pago (efectivo, transferencia, Mercado Pago, débito, crédito, obra social, otro) y qué abonó (sesión individual, paquete de sesiones, evaluación, coseguro, seña, domicilio, otro), con la cantidad de sesiones que cubre.
- Cuenta del paciente: sesiones realizadas, sesiones pagas, sesiones a favor o adeudadas y total abonado.
- Resumen mensual por forma de pago, recibo imprimible y planilla descargable para Excel.

**Ajustes**
- Datos profesionales (nombre, matrícula, dirección), valor de la sesión, duración del turno y horario de la jornada.
- Tamaño de letra: Normal, Grande o Muy grande.
- Clave PIN para abrir la aplicación.
- Copia de seguridad: descargar y restaurar.
- Datos de ejemplo para probar.

## Cómo usarla

### Opción 1: en la computadora, sin internet
Descargá el proyecto (botón verde **Code → Download ZIP** en GitHub), descomprimilo y abrí `index.html` con Chrome, Edge o Firefox.

### Opción 2: online, gratis, con GitHub Pages
1. En GitHub, entrá al repositorio → **Settings** → **Pages**.
2. En *Source* elegí **Deploy from a branch**, seleccioná la rama y la carpeta `/ (root)` → **Save**.
3. En un par de minutos vas a tener un link del tipo `https://USUARIO.github.io/webkin/`.
4. En el celular, abrí el link y elegí **"Agregar a pantalla de inicio"** para usarla como una app.

## Importante sobre los datos

- Los datos se guardan **en el navegador del dispositivo donde se cargan** (almacenamiento local). No se envían a ningún servidor.
- Si usás la app en la compu y en el celular, cada uno tiene sus propios datos. Para pasarlos, usá **Ajustes → Descargar copia de seguridad** y después **Restaurar desde archivo** en el otro dispositivo.
- **Hacé una copia de seguridad seguido** (por ejemplo, semanal) y guardala en un lugar seguro. Si se borran los datos de navegación, la información se pierde.
- Activá la **clave PIN** si otras personas usan la misma computadora.
- Recordá cuidar la confidencialidad de los datos de salud de tus pacientes (Ley 26.529 de Derechos del Paciente y Ley 25.326 de Protección de Datos Personales).

## Estructura

```
index.html            Página principal
css/styles.css        Diseño (incluye celular e impresión)
js/utils.js           Fechas, formatos e íconos
js/store.js           Guardado de datos
js/ui.js              Ventanas, avisos y formularios
js/inicio.js          Pantalla de inicio
js/pacientes.js       Fichas e historia clínica
js/agenda.js          Turnos
js/pagos.js           Pagos y recibos
js/ajustes.js         Configuración y copias de seguridad
js/demo.js            Datos de ejemplo
js/app.js             Navegación y clave PIN
img/logo.webp         Logo de FisioCoreSalud
img/simbolo-*.png     Ícono de la app (favicon y celular)
```
