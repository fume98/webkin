# FisioCoreSalud · Quiropraxia Cuerpo Vital

Aplicación web del consultorio **FisioCoreSalud · Quiropraxia Cuerpo Vital** para profesionales de **Kinesiología y Fisiatría**: fichas de pacientes, historia clínica sesión por sesión, agenda de turnos y registro de pagos.

No necesita instalación ni servidor: son archivos HTML, CSS y JavaScript que funcionan en cualquier navegador (computadora, tablet o celular).

> **Software propietario. © 2026 FisioCoreSalud. Todos los derechos reservados.**
> Este código no es de uso libre. Solo puede usarse con una licencia otorgada por escrito por el titular. Está prohibido copiarlo, modificarlo, distribuirlo o usarlo para prestar servicios a terceros sin autorización. Ver [LICENSE](LICENSE).

## Funciones

**Pacientes**
- Ficha completa: nombre, apellido, DNI, fecha de nacimiento (calcula la edad), sexo, ocupación/deporte, teléfono, email, dirección, localidad, provincia, código postal y contacto de emergencia.
- Obra social / prepaga, N° de afiliado, médico derivante y cantidad de sesiones indicadas.
- Historia clínica: diagnóstico, motivo de consulta, antecedentes, medicación, alergias/contraindicaciones, estudios complementarios, evaluación kinésica inicial, objetivos y plan de tratamiento.
- Evolución **sesión por sesión**: estado de atención (Vino, Atendido, Faltó con aviso, Faltó sin aviso), tratamiento realizado, evolución, indicaciones para casa y nivel de dolor (escala EVA 0–10), en una línea de tiempo. El estado de atención actualiza solo el turno de ese día en la agenda.
- **Archivos de estudios:** en "Estudios complementarios" hay dos botones:
  - **Adjuntar archivo:** fotos, radiografías, resonancias, órdenes médicas, PDF o documentos (hasta 15 MB cada uno, se pueden elegir varios a la vez).
  - **Sacar foto:** en el celular abre la cámara del teléfono; en la computadora abre la cámara web, con vista previa para repetir la foto antes de guardarla.

  Las fotos se achican solas para ocupar poco. Cada archivo se ve en grande, se descarga o se quita desde la ficha. Con la nube se comparten entre todos los equipos; sin internet quedan guardados y se suben solos al volver la conexión.
- Buscador por nombre, apellido, DNI, teléfono, localidad u obra social.
- Botón de WhatsApp directo e impresión de la ficha.

**Agenda de turnos**
- Vista por día y por semana, con los horarios libres de la jornada.
- Número de sesión automático (por ejemplo, "Sesión 3 de 10").
- Dar varios turnos de una vez, de dos formas:
  - **Fechas y horarios a elección:** se agrega cada fecha con su horario, todas las que hagan falta.
  - **Mismos días cada semana:** por ejemplo, 10 sesiones lunes y miércoles a las 18 hs.
- Botón **"Dar turnos y enviar por WhatsApp"**: guarda todos los turnos y abre WhatsApp con un solo mensaje que los incluye a todos.
- Estados: Pendiente, Confirmado, Asistió, Falta, Falta con aviso, Falta sin aviso, Cancelado. Al marcar "Asistió" se abre la carga de la evolución. Las faltas no suman número de sesión y la ficha del paciente muestra el resumen de faltas.
- Aviso de superposición de horarios.
- **Turnos por WhatsApp:** al dar un turno (o una serie de sesiones) aparece la opción de enviárselo al paciente por WhatsApp con el mensaje ya escrito: fecha, hora, profesional, dirección y un link para que lo agende en su Google Calendar. Queda registrado qué turnos se avisaron.
- **Recordatorio por WhatsApp** de cada turno, y envío de todos los próximos turnos desde la ficha del paciente.
- **Google Calendar:** cada turno se puede agregar al calendario del profesional con un toque. Las series de sesiones se descargan en un archivo de calendario (.ics) que se abre en Google Calendar, iPhone u Outlook, con un aviso 2 horas antes.

**Secciones de turnos por servicio (Kinesiología y Quiropraxia)**
- Cada servicio tiene su propia sección en el menú, con las mismas funciones:
  - vista por día y por semana, y horarios libres;
  - filtro por profesional y varias sesiones de una vez;
  - aviso por WhatsApp, Google Calendar y estados del turno.
- La pestaña **Todas** muestra la agenda completa del consultorio.
- **Turnos:** al dar un turno se elige el tipo (Kinesiología o Quiropraxia) y solo aparecen los profesionales que atienden ese servicio. Los turnos, las sesiones y los pagos quedan marcados con su servicio, y las sesiones se numeran por separado en cada uno.
- **Duración y precio:** cada servicio puede tener los suyos. Si no, se usan los de cada profesional.
- **Otros servicios:** desde **Ajustes → Servicios** se pueden agregar más (por ejemplo, Osteopatía), y desactivar o quitar los que no se usen.
- **Pagos** muestra el total cobrado por servicio.

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
- Servicios y secciones de turnos, profesionales del consultorio (y qué servicios atiende cada uno), datos del consultorio y valores generales de turnos.
- Tamaño de letra: Normal, Grande o Muy grande.
- Clave PIN para abrir la aplicación.
- Base de datos en la nube (Supabase): conexión, usuarios con acceso y estado de sincronización.
- **Marca y colores:** nombre, subtítulo, logo, ícono y colores del consultorio, con vista previa en vivo y paletas listas.
- Copia de seguridad: descargar y restaurar (incluye los archivos adjuntos de los pacientes).
- Datos de ejemplo para probar.

## Cómo usarla

El repositorio es **privado**. La app se publica en la web desde el repositorio privado, sin que el código quede a la vista en GitHub.

### Publicarla con Netlify (gratis, funciona con repositorio privado)
1. Entrá a [netlify.com](https://www.netlify.com) y creá una cuenta con **Sign up with GitHub**.
2. Tocá **Add new project → Import an existing project → GitHub** y autorizá a Netlify a ver **solo** el repositorio `webkin`.
3. Configurá:
   - **Branch to deploy**: la rama de la app.
   - **Build command**: dejalo **vacío**.
   - **Publish directory**: `.` (un punto).
4. Tocá **Deploy**. En un minuto vas a tener un link del tipo `https://algo.netlify.app`. En **Site configuration → Change site name** podés ponerle, por ejemplo, `fisiocoresalud`, y queda `https://fisiocoresalud.netlify.app`.
5. Cada vez que se actualiza el código en GitHub, Netlify publica la nueva versión sola.
6. En el celular, abrí el link y elegí **"Agregar a pantalla de inicio"** para usarla como una app.

> GitHub Pages solo publica gratis desde repositorios públicos, por eso se usa Netlify. Cloudflare Pages o Vercel también sirven.

### Quién puede usarla
Aunque alguien tenga el link, **no puede usar la app sin permiso**: tiene que ingresar con una cuenta que figure en **Ajustes → Usuarios con acceso**. Sin eso no ve la agenda ni ningún dato.

## Base de datos en la nube (Supabase)

Sin nube, cada dispositivo guarda sus propios datos. Con la nube, **todos los profesionales comparten los mismos pacientes, agendas y pagos** desde cualquier celular o computadora, cada uno con su email y contraseña, y los cambios se ven al instante en todos los dispositivos.

### 1. Crear el proyecto (una sola vez)
1. Entrá a [supabase.com](https://supabase.com), creá una cuenta gratis y tocá **New project**.
2. Poné un nombre (por ejemplo `fisiocoresalud`), elegí una **contraseña de la base de datos** (guardala) y la región **South America (São Paulo)**. Esperá un par de minutos a que se cree.
3. Andá a **SQL Editor → New query**, pegá todo el contenido del archivo [`supabase/esquema.sql`](supabase/esquema.sql) y tocá **Run**. Tiene que decir *Success*. Esto crea también la carpeta privada `adjuntos`, donde se guardan los archivos de los pacientes.

   > **¿Ya tenías la base armada de antes?** Para usar los archivos adjuntos corré una sola vez [`supabase/archivos.sql`](supabase/archivos.sql) de la misma forma.
4. Andá a **Authentication → URL Configuration**:
   - En **Site URL** poné el link de la app, por ejemplo `https://fisiocoresalud.netlify.app/`.
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

## Marca y colores

Cada consultorio puede ponerle su propia identidad a la app **tocando el logo** (arriba en la barra lateral, o el nombre en el celular) o desde **Ajustes → Marca y colores → Personalizar**, sin tocar código:
- **Nombre y subtítulo** del consultorio. Se ven en la app, en la pestaña del navegador, en los recibos y en los recordatorios de WhatsApp.
- **Logo:** PNG con fondo transparente o con fondo negro (esto último se detecta solo). Si no hay logo, se muestra el nombre con un ícono.
- **Ícono:** opcional, para el celular y la pestaña del navegador.
- **Colores:** principal, acento y barra lateral. Se pueden elegir paletas listas o cualquier color. Si un color dificulta la lectura, la app lo ajusta sola, y si la barra es clara, los textos pasan a oscuro.

Mientras se elige, la app ya se ve con la marca nueva. Con la nube activa, la marca se aplica en todos los dispositivos del consultorio. **Volver a la marca original** deshace todo.

Los valores de fábrica de cada instalación están en [`js/marca.js`](js/marca.js).

## Vender la app a colegas

La misma app se instala por separado para cada consultorio que compra una licencia. Cada cliente tiene **su propia base de datos** (nadie ve datos de otro consultorio) y **su propio link**, con su nombre, logo y colores. El código queda en tu repositorio privado: el cliente solo recibe el link.

### Para cada cliente nuevo
1. **Base de datos:** creá un proyecto de Supabase para el cliente (ver "Base de datos en la nube", pasos 1 a 5) y corré `supabase/esquema.sql`. Lo ideal es que la cuenta de Supabase sea del cliente: el plan gratis permite 2 proyectos activos por cuenta.
2. **Sitio:** en Netlify, **Add new project → Import an existing project**, y elegí este mismo repositorio y rama. Configurá:
   - **Build command**: `node herramientas/configurar-cliente.js`
   - **Publish directory**: `.`
3. **Datos del cliente:** antes de publicar, en **Site configuration → Environment variables**, cargá:

   | Variable | Qué poner |
   |---|---|
   | `SUPABASE_URL` | Project URL del Supabase del cliente |
   | `SUPABASE_KEY` | Clave pública (`sb_publishable_…`) del cliente |
   | `CONSULTORIO_NOMBRE` | Nombre del consultorio, por ejemplo `Centro Kinésico Sur` |
   | `CONSULTORIO_SUBTITULO` | Opcional, por ejemplo `Lic. Ana Pérez` |
   | `COLOR_PRINCIPAL`, `COLOR_ACENTO`, `COLOR_BARRA` | Opcionales, del tipo `#1f6fb2` |

4. **Publicar:** tocá **Deploy** y ponele un nombre al sitio, por ejemplo `centrokinesicosur.netlify.app`. En el Supabase del cliente, cargá ese link en **Authentication → URL Configuration**.
5. **Entregar:** el cliente abre el link y crea su cuenta (queda como dueño de su consultorio). Después sube su logo y elige sus colores en **Ajustes → Marca y colores**, y suma a sus colegas en **Usuarios con acceso**.

Tu propia instalación (FisioCoreSalud) no usa *Build command*, así que siempre muestra tu marca. Cuando actualizás el código, Netlify actualiza todas las instalaciones solas.

### Licencias
El software es propietario (ver [LICENSE](LICENSE)). Conviene firmar con cada cliente un acuerdo de licencia simple: precio, plazo, cantidad de profesionales, que no puede copiar ni revender el software, y que los datos de sus pacientes son de él.

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
js/marca.js           Marca de fábrica de la instalación (nombre, logo y colores)
js/tema.js            Calcula los colores del diseño a partir de los de la marca
js/marca-ui.js        Aplica la marca y editor "Marca y colores"
js/avisos.js          Mensajes de WhatsApp, Google Calendar y archivos .ics
js/nube.js            Ingreso y sincronización con Supabase
js/config.js          Datos de conexión con Supabase
js/vendor/supabase.js Librería oficial de Supabase (licencia MIT)
js/demo.js            Datos de ejemplo
js/app.js             Navegación y clave PIN
img/logo.webp         Logo de FisioCoreSalud
img/simbolo-*.png     Ícono de la app (favicon y celular)
img/generico*         Ícono genérico para instalaciones de clientes
herramientas/configurar-cliente.js  Prepara la instalación de un cliente (lo ejecuta Netlify)
sw.js                 Permite abrir la app sin internet
supabase/esquema.sql  Tablas y reglas de seguridad de la base de datos
supabase/archivos.sql Carpeta privada para los archivos adjuntos (para bases ya creadas)
```
