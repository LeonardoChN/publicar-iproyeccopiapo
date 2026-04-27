-- IPROYEC - Esquema de referencia para Supabase
-- Ejecutar en SQL Editor si necesitas recrear tablas/políticas.
-- No uses service_role en frontend.

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  imagen_url text,
  fecha_evento date,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  creado_por uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists eventos_estado_idx on public.eventos (estado);
create index if not exists eventos_fecha_evento_idx on public.eventos (fecha_evento);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id),
  nombre text,
  role text not null default 'editor',
  created_at timestamp with time zone default now()
);

alter table public.eventos enable row level security;
alter table public.admin_users enable row level security;

-- Limpieza opcional si estás rehaciendo políticas. Quita los drops si ya las tienes correctas.
drop policy if exists "Admin users can read own admin row" on public.admin_users;
drop policy if exists "Public can read published events" on public.eventos;
drop policy if exists "Admins can read all events" on public.eventos;
drop policy if exists "Admins can insert events" on public.eventos;
drop policy if exists "Admins can update events" on public.eventos;
drop policy if exists "Admins can delete events" on public.eventos;

create policy "Admin users can read own admin row"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

create policy "Public can read published events"
on public.eventos
for select
to anon, authenticated
using (estado = 'publicado');

create policy "Admins can read all events"
on public.eventos
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create policy "Admins can insert events"
on public.eventos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create policy "Admins can update events"
on public.eventos
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create policy "Admins can delete events"
on public.eventos
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

-- STORAGE
-- Crea un bucket llamado eventos desde Storage > New bucket.
-- Recomendado para esta web: bucket público, porque las imágenes se mostrarán luego en iproyeccopiapo.cl.
-- Si quieres políticas por SQL, estas reglas permiten lectura pública y escritura solo a administradores.

-- Nota: si el bucket no existe, créalo primero desde el panel de Supabase.
drop policy if exists "Public can read event images" on storage.objects;
drop policy if exists "Admins can upload event images" on storage.objects;
drop policy if exists "Admins can update event images" on storage.objects;
drop policy if exists "Admins can delete event images" on storage.objects;

create policy "Public can read event images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'eventos');

create policy "Admins can upload event images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'eventos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create policy "Admins can update event images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'eventos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'eventos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create policy "Admins can delete event images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'eventos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
