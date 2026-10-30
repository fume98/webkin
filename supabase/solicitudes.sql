-- =====================================================================
-- Solicitudes de acceso
--
-- Quien crea su cuenta en la app y todavía no tiene acceso puede
-- "Solicitar acceso". La solicitud aparece en Ajustes → Usuarios con
-- acceso para aprobarla o rechazarla con un toque.
--
-- Si ya tenías la base armada, corré SOLO este archivo una vez:
-- Supabase → "SQL Editor" → "New query" → pegar todo → "Run".
-- (También está incluido en esquema.sql.) Se puede repetir.
-- =====================================================================

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
