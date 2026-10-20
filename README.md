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

**Varios profesionales**
- Cada profesional del consultorio tiene su propia agenda, con un color para distinguirla, y puede tener su propio horario, duración de turno y valor de sesión.
- La agenda se puede ver completa o filtrada por profesional, con los horarios libres de cada uno.
- Dos profesionales pueden atender a la misma hora; la superposición se avisa solo dentro de la misma agenda.
- Cada sesión de la historia clínica y cada pago quedan asociados a quien atendió. Los recibos salen con sus datos.
- En Pagos se ve el total cobrado por profesional.
- Un profesional que deja el consultorio se desactiva sin perder su historial.

**Pagos**
- Monto, fecha, forma de pago (efectivo, transferencia, Mercado Pago, débito, crédito, obra social, otro) y qué abonó (sesión individual, paquete de sesiones, evaluación, coseguro, seña, domicilio, otro), con la cantidad de sesiones que cubre.
- Cuenta del paciente: sesiones realizadas, sesiones pagas, sesiones a favor o adeudadas y total abonado.
- Resumen mensual por forma de pago, recibo imprimible y planilla descargable para Excel.

**Ajustes**
- Profesionales del consultorio (agregar, editar, desactivar), datos del consultorio y valores generales de turnos.
- Tamaño de letra: Normal, Grande o Muy grande.
- Clave PIN para abrir la aplicación.
- Base de datos en la nube (Supabase): conexión, usuarios con acceso y estado de sincronización.
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

## Base de datos en la nube (Supabase)

Sin nube, cada dispositivo guarda sus propios datos. Con la nube, **todos los profesionales comparten los mismos pacientes, agendas y pagos** desde cualquier celular o computadora, cada uno con su email y contraseña, y los cambios se ven al instante en todos los dispositivos.

### 1. Crear el proyecto (una sola vez)
1. Entrá a [supabase.com](https://supabase.com), creá una cuenta gratis y tocá **New project**.
2. Poné un nombre (por ejemplo `fisiocoresalud`), elegí una **contraseña de la base de datos** (guardala) y la región **South America (São Paulo)**. Esperá un par de minutos a que se cree.
3. Andá a **SQL Editor → New query**, pegá todo el contenido del archivo [`supabase/esquema.sql`](supabase/esquema.sql) y tocá **Run**. Tiene que decir *Success*.
4. Andá a **Authentication → URL Configuration**:
   - En **Site URL** poné el link de la app, por ejemplo `https://fume98.github.io/webkin/`.
   - En **Redirect URLs** agregá ese mismo link.

   Así funcionan los emails de confirmación de cuenta y de cambio de contraseña.
5. Andá a **Project Settings → API Keys** (o **Data API**) y copiá:
   - **Project URL**, del tipo `https://abcdefghijkl.supabase.co`.
   - La clave **publishable** (`sb_publishable_…`) o, en proyectos más viejos, la **anon public**.

   ⚠️ Nunca uses la clave **secret** ni la **service_role**.

### 2. Conectar la app
Hay dos formas:
- **Para todos los dispositivos a la vez (recomendado):** cargá la URL y la clave en el archivo [`js/config.js`](js/config.js). Desde ese momento, cualquiera que abra la app ve la pantalla de ingreso.
- **Solo en un dispositivo:** en la app, **Ajustes → Base de datos en la nube → Conectar con Supabase**, y pegá los dos datos.

### 3. Primer ingreso
1. Abrí la app y tocá **Crear una cuenta** con tu email y una contraseña.
2. Confirmá el email que te manda Supabase (revisá también la carpeta de spam) y después ingresá.
3. **La primera cuenta que entra queda como dueña del consultorio.** Hacelo apenas termines de crear el proyecto.
4. Si en ese dispositivo ya tenías pacientes cargados, la app te ofrece **subirlos a la nube**.

### 4. Sumar a los demás profesionales
1. En **Ajustes → Usuarios con acceso**, agregá el email de la persona.
2. Esa persona abre la app, toca **Crear una cuenta** con ese mismo email, confirma el email e ingresa.
3. Para sacarle el acceso a alguien, tocá **Quitar acceso**.

### Cómo funciona
- **Sin internet** la app sigue funcionando con los últimos datos. Lo que cargues se guarda en el dispositivo y **se sube solo** cuando vuelve la conexión. El estado se ve abajo en la barra lateral, o en el ícono de arriba en el celular.
- **Seguridad:** solo las cuentas de la lista de *Usuarios con acceso* pueden ver o modificar datos. Lo controla la propia base de datos, no solo la app. La clave pública puede estar a la vista sin riesgo.
- **Borrados:** los borrados quedan registrados, y cada cambio guarda quién lo hizo y cuándo.
- **Al cerrar sesión** se borra la copia local de los datos de ese dispositivo.
- **Plan gratis de Supabase:**
  - Alcanza de sobra para un consultorio.
  - Si el proyecto pasa una semana sin uso, Supabase lo pausa. Se reactiva con un clic desde su panel.
  - Los emails de confirmación tienen un límite de pocos por hora. Si alguno no llega, se puede confirmar la cuenta a mano en **Authentication → Users**.

## Importante sobre los datos

- **Sin nube**, los datos se guardan solo en el navegador del dispositivo donde se cargan. Si usás la app en la compu y en el celular, cada uno tiene sus propios datos. Para pasarlos, usá **Ajustes → Descargar copia de seguridad** y después **Restaurar desde archivo** en el otro dispositivo.
- **Hacé una copia de seguridad seguido** (por ejemplo, semanal) y guardala en un lugar seguro, también si usás la nube.
- Activá la **clave PIN** si otras personas usan la misma computadora.
- Recordá cuidar la confidencialidad de los datos de salud de tus pacientes (Ley 26.529 de Derechos del Paciente y Ley 25.326 de Protección de Datos Personales). Cada profesional debe usar su propia cuenta y no compartir contraseñas.

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
js/ajustes.js         Configuración, profesionales, nube y copias de seguridad
js/nube.js            Ingreso y sincronización con Supabase
js/config.js          Datos de conexión con Supabase
js/vendor/supabase.js Librería oficial de Supabase (licencia MIT)
js/demo.js            Datos de ejemplo
js/app.js             Navegación y clave PIN
img/logo.webp         Logo de FisioCoreSalud
img/simbolo-*.png     Ícono de la app (favicon y celular)
sw.js                 Permite abrir la app sin internet
supabase/esquema.sql  Tablas y reglas de seguridad de la base de datos
```
