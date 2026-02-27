-- BookForge Studio - Dot-to-Dot bulk line-art pipeline
-- Date: 2026-02-27

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'line_art_source_mode') then
    create type line_art_source_mode as enum ('theme_ai', 'single_trace', 'bulk_library');
  end if;
  if not exists (select 1 from pg_type where typname = 'line_art_asset_status') then
    create type line_art_asset_status as enum ('uploaded', 'processing', 'ready', 'failed', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'line_art_processing_status') then
    create type line_art_processing_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
  end if;
end $$;

alter type page_type add value if not exists 'dot_to_dot';

create table if not exists line_art_collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  settings_json jsonb not null default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists line_art_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  collection_id uuid references line_art_collections(id) on delete set null,
  base_asset_id uuid references assets(id) on delete set null,
  source_filename text not null,
  mime_type text not null,
  width int,
  height int,
  sha256 text,
  tags text[] not null default '{}',
  style_profile_id uuid references style_profiles(id),
  status line_art_asset_status not null default 'uploaded',
  trace_json jsonb,
  diagnostics_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists line_art_processing (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  line_art_asset_id uuid not null references line_art_assets(id) on delete cascade,
  status line_art_processing_status not null default 'queued',
  stage text not null default 'ingest',
  attempt int not null default 1 check (attempt > 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_json jsonb,
  result_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists dot_to_dot_page_state (
  page_id uuid primary key references pages(id) on delete cascade,
  source_mode line_art_source_mode not null default 'theme_ai',
  source_asset_id uuid references line_art_assets(id) on delete set null,
  contour_points_json jsonb not null default '[]'::jsonb,
  guide_points_json jsonb not null default '[]'::jsonb,
  points_json jsonb not null default '[]'::jsonb,
  labels_json jsonb not null default '[]'::jsonb,
  qa_json jsonb not null default '{}'::jsonb,
  recipe_json jsonb not null default '{}'::jsonb,
  revision int not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pages add column if not exists source_mode line_art_source_mode;
alter table pages add column if not exists source_asset_id uuid references line_art_assets(id);
alter table pages add column if not exists recipe_json jsonb not null default '{}'::jsonb;

update pages
set source_mode = 'theme_ai'::line_art_source_mode
where type::text = 'dot_to_dot' and source_mode is null;

create unique index if not exists uq_line_art_assets_project_sha256
  on line_art_assets (project_id, sha256)
  where sha256 is not null;
create index if not exists idx_line_art_assets_project_status on line_art_assets(project_id, status);
create index if not exists idx_line_art_assets_collection on line_art_assets(collection_id);
create index if not exists idx_line_art_assets_tags on line_art_assets using gin(tags);
create index if not exists idx_line_art_processing_project_status on line_art_processing(project_id, status);
create index if not exists idx_line_art_processing_asset_created on line_art_processing(line_art_asset_id, created_at desc);
create index if not exists idx_dot_to_dot_revision on dot_to_dot_page_state(revision);
create index if not exists idx_pages_project_source_mode on pages(project_id, source_mode);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_line_art_collections_updated_at') then
    create trigger trg_line_art_collections_updated_at
      before update on line_art_collections for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_line_art_assets_updated_at') then
    create trigger trg_line_art_assets_updated_at
      before update on line_art_assets for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_dot_to_dot_page_state_updated_at') then
    create trigger trg_dot_to_dot_page_state_updated_at
      before update on dot_to_dot_page_state for each row execute function set_updated_at();
  end if;
end $$;

create or replace function ensure_dot_to_dot_page_type()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pages p
    where p.id = new.page_id and p.type::text = 'dot_to_dot'
  ) then
    raise exception 'dot_to_dot_page_state.page_id must reference page type dot_to_dot';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_dot_to_dot_page_type') then
    create trigger trg_dot_to_dot_page_type
      before insert or update on dot_to_dot_page_state
      for each row execute function ensure_dot_to_dot_page_type();
  end if;
end $$;

commit;
