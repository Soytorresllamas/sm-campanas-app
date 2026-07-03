-- Tabla de estado del Gantt para "SM · Planeación 2 Campañas".
-- Prefijo sm_campanas_ para NO mezclarse con el otro proyecto que vive en esta base.
-- Ejecuta este script una vez en: Supabase → SQL Editor.

create table if not exists public.sm_campanas_gantt (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.sm_campanas_gantt enable row level security;

-- Acceso anónimo de lectura/escritura (el control real lo da el gate de contraseña del front).
-- Igual que en estrategia-innova: cualquiera con la publishable key puede leer/editar este tablero.
drop policy if exists "sm_campanas_gantt_anon_all" on public.sm_campanas_gantt;
create policy "sm_campanas_gantt_anon_all"
  on public.sm_campanas_gantt
  for all
  to anon
  using (true)
  with check (true);

-- Tabla de la planeación de servicios (hojas de asesores). Mismo patrón que el Gantt.
create table if not exists public.sm_campanas_planeacion (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.sm_campanas_planeacion enable row level security;

drop policy if exists "sm_campanas_planeacion_anon_all" on public.sm_campanas_planeacion;
create policy "sm_campanas_planeacion_anon_all"
  on public.sm_campanas_planeacion
  for all
  to anon
  using (true)
  with check (true);
