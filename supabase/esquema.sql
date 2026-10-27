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
