-- =====================================================================
-- FisioCoreSalud · Quiropraxia Cuerpo Vital
-- Esquema de la base de datos en Supabase
--
-- Cómo usarlo: en Supabase, abrí "SQL Editor" → "New query", pegá todo
-- este archivo y tocá "Run". Se puede volver a correr sin problemas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Personas con acceso a los datos del consultorio.
-- La primera cuenta que entra a la app queda como miembro automáticamente;
-- a las demás se las agrega desde la app (Ajustes → Usuarios con acceso).
-- ---------------------------------------------------------------------
create table if not exists public.miembros (
  email text primary key check (email = lower(email)),
  agregado_por text,
  creado timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Todos los datos de la app: profesionales, pacientes, turnos,
-- evoluciones (historia clínica), pagos y los datos del consultorio.
-- Cada fila guarda un registro completo en "data".
-- Al borrar, se marca "borrado" para que el resto de los dispositivos
-- también se enteren.
-- ---------------------------------------------------------------------
create table if not exists public.registros (
  coleccion text not null check (coleccion in
    ('consultorio', 'profesionales', 'pacientes', 'turnos', 'evoluciones', 'pagos')),
  id text not null check (length(id) between 1 and 64),
  data jsonb not null default '{}'::jsonb,
  borrado boolean not null default false,
  actualizado timestamptz not null default now(),
  actualizado_por text,
  primary key (coleccion, id)
);

create index if not exists registros_actualizado_idx on public.registros (actualizado);

-- Fecha y autor de cada cambio los pone la base, no el navegador
create or replace function public.registros_marcar_cambio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado := clock_timestamp();
  new.actualizado_por := lower(auth.jwt() ->> 'email');
  return new;
end;
$$;

drop trigger if exists registros_marcar_cambio on public.registros;
create trigger registros_marcar_cambio
  before insert or update on public.registros
  for each row execute function public.registros_marcar_cambio();

-- ---------------------------------------------------------------------
-- Funciones de permisos
-- ---------------------------------------------------------------------
create or replace function public.es_miembro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.miembros
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- Si todavía no hay nadie con acceso, la primera cuenta que entra queda
-- como miembro. Devuelve true si la persona tiene (o acaba de recibir) acceso.
create or replace function public.reclamar_acceso_inicial()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  mi_email text := lower(auth.jwt() ->> 'email');
begin
  if mi_email is null or mi_email = '' then
    return false;
  end if;
  -- Evita que dos cuentas nuevas se registren como "primeras" a la vez
  lock table public.miembros in exclusive mode;
  if not exists (select 1 from public.miembros) then
    insert into public.miembros (email, agregado_por) values (mi_email, 'primer acceso');
  end if;
  return exists (select 1 from public.miembros where email = mi_email);
end;
$$;

revoke all on function public.es_miembro() from public, anon;
revoke all on function public.reclamar_acceso_inicial() from public, anon;
grant execute on function public.es_miembro() to authenticated;
grant execute on function public.reclamar_acceso_inicial() to authenticated;

-- ---------------------------------------------------------------------
-- Seguridad a nivel de fila: sin una cuenta autorizada no se ve nada.
-- ---------------------------------------------------------------------
alter table public.miembros enable row level security;
alter table public.registros enable row level security;

revoke all on public.miembros from anon;
revoke all on public.registros from anon;

drop policy if exists "miembros: ver" on public.miembros;
drop policy if exists "miembros: agregar" on public.miembros;
drop policy if exists "miembros: quitar" on public.miembros;
create policy "miembros: ver" on public.miembros
  for select to authenticated using (public.es_miembro());
create policy "miembros: agregar" on public.miembros
  for insert to authenticated with check (public.es_miembro());
-- Nadie puede quitarse a sí mismo (así nunca queda el consultorio sin acceso)
create policy "miembros: quitar" on public.miembros
  for delete to authenticated
  using (public.es_miembro() and email <> lower(auth.jwt() ->> 'email'));

drop policy if exists "registros: ver" on public.registros;
drop policy if exists "registros: crear" on public.registros;
drop policy if exists "registros: modificar" on public.registros;
create policy "registros: ver" on public.registros
  for select to authenticated using (public.es_miembro());
create policy "registros: crear" on public.registros
  for insert to authenticated with check (public.es_miembro());
create policy "registros: modificar" on public.registros
  for update to authenticated using (public.es_miembro()) with check (public.es_miembro());
-- Sin política de DELETE: los borrados se hacen marcando "borrado".

grant select, insert, delete on public.miembros to authenticated;
grant select, insert, update on public.registros to authenticated;

-- ---------------------------------------------------------------------
-- Cambios en vivo: cada dispositivo se entera al instante de lo que
-- cargan los demás.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros'
     ) then
    alter publication supabase_realtime add table public.registros;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- Archivos adjuntos de los pacientes (estudios, radiografías, fotos)
-- ---------------------------------------------------------------------
-- Carpeta privada "adjuntos": nada es público, hasta 15 MB por archivo
insert into storage.buckets (id, name, public, file_size_limit)
values ('adjuntos', 'adjuntos', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Sólo las cuentas con acceso al consultorio pueden ver, subir o borrar
drop policy if exists "adjuntos: ver" on storage.objects;
drop policy if exists "adjuntos: subir" on storage.objects;
drop policy if exists "adjuntos: reemplazar" on storage.objects;
drop policy if exists "adjuntos: borrar" on storage.objects;
create policy "adjuntos: ver" on storage.objects
  for select to authenticated using (bucket_id = 'adjuntos' and public.es_miembro());
create policy "adjuntos: subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'adjuntos' and public.es_miembro());
create policy "adjuntos: reemplazar" on storage.objects
  for update to authenticated
  using (bucket_id = 'adjuntos' and public.es_miembro())
  with check (bucket_id = 'adjuntos' and public.es_miembro());
create policy "adjuntos: borrar" on storage.objects
  for delete to authenticated using (bucket_id = 'adjuntos' and public.es_miembro());


-- ---------------------------------------------------------------------
-- Solicitudes de acceso
-- ---------------------------------------------------------------------
create table if not exists public.solicitudes (
  email text primary key check (email = lower(email)),
  nombre text not null default '' check (length(nombre) <= 120),
  mensaje text not null default '' check (length(mensaje) <= 500),
  creado timestamptz not null default now()
);

alter table public.solicitudes enable row level security;
revoke all on public.solicitudes from anon, authenticated;
grant select on public.solicitudes to authenticated;

-- Cada uno ve su propia solicitud; quienes tienen acceso ven todas
drop policy if exists "solicitudes: ver" on public.solicitudes;
create policy "solicitudes: ver" on public.solicitudes
  for select to authenticated
  using (public.es_miembro() or email = lower(auth.jwt() ->> 'email'));

-- Pedir acceso (con la cuenta con la que se ingresó, no con otro email).
-- Devuelve true si la persona ya tiene acceso.
create or replace function public.solicitar_acceso(p_nombre text, p_mensaje text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  mi_email text := lower(auth.jwt() ->> 'email');
begin
  if mi_email is null or mi_email = '' then
    raise exception 'Sesión no válida';
  end if;
  if exists (select 1 from public.miembros where email = mi_email) then
    return true;
  end if;
  if not exists (select 1 from public.solicitudes where email = mi_email)
     and (select count(*) from public.solicitudes) >= 100 then
    raise exception 'Hay demasiadas solicitudes pendientes. Avisale al consultorio.';
  end if;
  insert into public.solicitudes (email, nombre, mensaje)
  values (mi_email, left(coalesce(trim(p_nombre), ''), 120), left(coalesce(trim(p_mensaje), ''), 500))
  on conflict (email) do update
    set nombre = excluded.nombre, mensaje = excluded.mensaje, creado = now();
  return false;
end;
$$;

-- Aprobar (da acceso) o rechazar una solicitud. Sólo quien ya tiene acceso.
create or replace function public.responder_solicitud(p_email text, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mi_email text := lower(auth.jwt() ->> 'email');
  su_email text := lower(trim(p_email));
begin
  if not public.es_miembro() then
    raise exception 'No tenés permiso para responder solicitudes';
  end if;
  if p_aprobar then
    insert into public.miembros (email, agregado_por) values (su_email, mi_email)
    on conflict (email) do nothing;
  end if;
  delete from public.solicitudes where email = su_email;
end;
$$;

-- Email de la cuenta principal del consultorio, para que quien pide
-- acceso le pueda avisar por email. Sólo con sesión iniciada.
create or replace function public.contacto_consultorio()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case when coalesce(auth.jwt() ->> 'email', '') = '' then null
    else (select email from public.miembros order by creado limit 1) end;
$$;

-- Si alguien recibe acceso desde "Dar acceso", su solicitud se borra sola
create or replace function public.miembros_borrar_solicitud()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.solicitudes where email = new.email;
  return new;
end;
$$;

drop trigger if exists miembros_borrar_solicitud on public.miembros;
create trigger miembros_borrar_solicitud
  after insert on public.miembros
  for each row execute function public.miembros_borrar_solicitud();

revoke all on function public.solicitar_acceso(text, text) from public, anon;
revoke all on function public.responder_solicitud(text, boolean) from public, anon;
revoke all on function public.contacto_consultorio() from public, anon;
revoke all on function public.miembros_borrar_solicitud() from public, anon, authenticated;
grant execute on function public.solicitar_acceso(text, text) to authenticated;
grant execute on function public.responder_solicitud(text, boolean) to authenticated;
grant execute on function public.contacto_consultorio() to authenticated;
