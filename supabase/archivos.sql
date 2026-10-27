-- =====================================================================
-- Archivos adjuntos de los pacientes (estudios, radiografías, fotos)
--
-- Si ya tenías la base armada, corré SOLO este archivo una vez:
-- Supabase → "SQL Editor" → "New query" → pegar todo → "Run".
-- (También está incluido al final de esquema.sql.) Se puede repetir.
-- =====================================================================

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
