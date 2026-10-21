-- Pericia socioeconómica · ejecutar una sola vez en SQL Editor de Supabase
-- Necesita Auth por correo habilitado. No agregar service_role al frontend.
create table if not exists public.pericia_document_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_id text not null check (doc_id ~ '^[0-9]+-[0-9]+$'),
  status text not null default 'pending' check (status in ('pending','review','done','na')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_id)
);
alter table public.pericia_document_states enable row level security;

drop policy if exists "states_read_owner" on public.pericia_document_states;
create policy "states_read_owner" on public.pericia_document_states
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "states_insert_owner" on public.pericia_document_states;
create policy "states_insert_owner" on public.pericia_document_states
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "states_update_owner" on public.pericia_document_states;
create policy "states_update_owner" on public.pericia_document_states
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create table if not exists public.pericia_document_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_id text not null check (doc_id ~ '^[0-9]+-[0-9]+$'),
  client_file_id text not null,
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 26214400),
  content_type text,
  created_at timestamptz not null default now(),
  unique(user_id, client_file_id)
);
alter table public.pericia_document_files enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.pericia_document_states to authenticated;
grant select, insert, delete on public.pericia_document_files to authenticated;

drop policy if exists "files_read_owner" on public.pericia_document_files;
create policy "files_read_owner" on public.pericia_document_files
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "files_insert_owner" on public.pericia_document_files;
create policy "files_insert_owner" on public.pericia_document_files
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "files_delete_owner" on public.pericia_document_files;
create policy "files_delete_owner" on public.pericia_document_files
for delete to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('pericia-documents','pericia-documents',false,26214400,
array['application/pdf','image/jpeg','image/png','image/webp','image/heic',
'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'text/plain','application/octet-stream'])
on conflict (id) do update set
public=false,
file_size_limit=excluded.file_size_limit,
allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "pericia_storage_select_owner" on storage.objects;
create policy "pericia_storage_select_owner" on storage.objects
for select to authenticated
using (bucket_id = 'pericia-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "pericia_storage_insert_owner" on storage.objects;
create policy "pericia_storage_insert_owner" on storage.objects
for insert to authenticated
with check (bucket_id = 'pericia-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "pericia_storage_delete_owner" on storage.objects;
create policy "pericia_storage_delete_owner" on storage.objects
for delete to authenticated
using (bucket_id = 'pericia-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
