-- BookForge Studio - Initial schema from PRD v1.3
-- Date: 2026-02-26

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type project_status as enum ('draft', 'ready', 'exporting', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'page_type') then
    create type page_type as enum (
      'cover_placeholder',
      'front_matter',
      'sudoku',
      'word_search',
      'maze',
      'matching',
      'coloring',
      'solution',
      'back_matter'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'job_type') then
    create type job_type as enum ('generate', 'qc', 'render', 'export');
  end if;
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'qc_severity') then
    create type qc_severity as enum ('info', 'warning', 'error');
  end if;
  if not exists (select 1 from pg_type where typname = 'export_variant') then
    create type export_variant as enum ('INTERIOR', 'SOLUTIONS', 'COMBINED', 'PROMPT_PACK');
  end if;
  if not exists (select 1 from pg_type where typname = 'export_status') then
    create type export_status as enum ('queued', 'building', 'ready', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'style_mode') then
    create type style_mode as enum ('GLOBAL', 'PER_PAGE');
  end if;
  if not exists (select 1 from pg_type where typname = 'page_qc_state') then
    create type page_qc_state as enum ('pending', 'passed', 'warning', 'error');
  end if;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_users_email_lower on users (lower(email));

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  trim_profile text not null,
  settings_json jsonb not null default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists style_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  audience_tags text[] not null default '{}',
  rules_json jsonb not null,
  prompt_blocks jsonb not null,
  version int not null default 1,
  is_public boolean not null default false,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  title text not null,
  template_id uuid references templates(id),
  status project_status not null default 'draft',
  style_profile_id uuid references style_profiles(id),
  style_mode style_mode not null default 'GLOBAL',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source text not null check (source in ('manual', 'regenerate', 'clone', 'system')),
  snapshot_json jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  storage_key text not null unique,
  mime_type text not null,
  width int,
  height int,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  page_number int not null check (page_number > 0),
  type page_type not null,
  config_json jsonb not null default '{}'::jsonb,
  style_profile_override_id uuid references style_profiles(id),
  asset_id uuid references assets(id),
  qc_state page_qc_state not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, page_number)
);

create table if not exists word_search_page_state (
  page_id uuid primary key references pages(id) on delete cascade,
  grid_size int not null check (grid_size between 10 and 24),
  grid_json jsonb not null,
  words_json jsonb not null,
  locale text not null default 'en-US',
  revision int not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists maze_page_state (
  page_id uuid primary key references pages(id) on delete cascade,
  rows int not null check (rows between 8 and 80),
  cols int not null check (cols between 8 and 80),
  graph_json jsonb not null,
  entrance_json jsonb not null,
  exit_json jsonb not null,
  solution_path_json jsonb,
  revision int not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type job_type not null,
  status job_status not null default 'queued',
  idempotency_key text,
  payload_json jsonb not null,
  result_json jsonb,
  error_json jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_jobs_idempotency_key on jobs (idempotency_key) where idempotency_key is not null;

create table if not exists qc_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  page_id uuid references pages(id) on delete cascade,
  rule_id text not null,
  severity qc_severity not null,
  message text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  variant export_variant not null,
  status export_status not null default 'queued',
  file_asset_id uuid references assets(id),
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pages_project_type on pages(project_id, type);
create index if not exists idx_pages_project_number on pages(project_id, page_number);
create index if not exists idx_jobs_project_created on jobs(project_id, created_at desc);
create index if not exists idx_jobs_project_status on jobs(project_id, status);
create index if not exists idx_qc_project_severity on qc_results(project_id, severity);
create index if not exists idx_qc_page_rule on qc_results(page_id, rule_id);
create index if not exists idx_word_search_revision on word_search_page_state(revision);
create index if not exists idx_maze_revision on maze_page_state(revision);
create index if not exists idx_exports_project_created on exports(project_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated_at') then
    create trigger trg_users_updated_at before update on users for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_templates_updated_at') then
    create trigger trg_templates_updated_at before update on templates for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_style_profiles_updated_at') then
    create trigger trg_style_profiles_updated_at before update on style_profiles for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_projects_updated_at') then
    create trigger trg_projects_updated_at before update on projects for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_pages_updated_at') then
    create trigger trg_pages_updated_at before update on pages for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_word_search_updated_at') then
    create trigger trg_word_search_updated_at before update on word_search_page_state for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_maze_updated_at') then
    create trigger trg_maze_updated_at before update on maze_page_state for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_exports_updated_at') then
    create trigger trg_exports_updated_at before update on exports for each row execute function set_updated_at();
  end if;
end $$;

create or replace function ensure_word_search_page_type()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pages p
    where p.id = new.page_id and p.type = 'word_search'
  ) then
    raise exception 'word_search_page_state.page_id must reference page type word_search';
  end if;
  return new;
end;
$$;

create or replace function ensure_maze_page_type()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pages p
    where p.id = new.page_id and p.type = 'maze'
  ) then
    raise exception 'maze_page_state.page_id must reference page type maze';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_word_search_page_type') then
    create trigger trg_word_search_page_type
    before insert or update on word_search_page_state
    for each row execute function ensure_word_search_page_type();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_maze_page_type') then
    create trigger trg_maze_page_type
    before insert or update on maze_page_state
    for each row execute function ensure_maze_page_type();
  end if;
end $$;

commit;
