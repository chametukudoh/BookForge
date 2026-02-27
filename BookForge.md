# PRD - BookForge Studio (Web App)

Version: 1.3 (Technical Draft)
Owner: Chamberlain
Last updated: 2026-02-26
Status: Draft (implementation-ready)

## 1. Product and Engineering Scope

### 1.1 Summary
BookForge Studio is a web app for producing KDP-ready interior books from a single workspace.

Supported tracks:
- Dot marker coloring books
- Standard coloring books (prompt-first workflow)
- Puzzle books (Sudoku, Word Search)
- Activity books (Mazes, Matching)

Output artifacts:
- Interior PDF (KDP-ready)
- Solutions PDF (separate or appended)
- Prompt Pack (TXT, MD, CSV)
- Project export bundle (JSON metadata + asset manifest)

### 1.2 Goals
- G1: End-to-end production without external layout tools.
- G2: Deterministic print-safe output for trim/margins/gutter constraints.
- G3: Scalable series workflow with project cloning and parameterized regeneration.
- G4: Built-in quality gates for puzzle integrity and print safety.
- G5: Consistent style output for coloring books via reusable Style Profiles.
- G6: Provide a full manual editing suite for Word Search and Maze pages after auto-generation.

### 1.3 MVP Success Metrics
- M1: 100-page Word Search book generated and exported in <= 30 minutes.
- M2: Puzzle validity pass rate >= 99%.
- M3: Export success rate >= 95% with zero blocking print-safety violations.
- M4: Style consistency complaints < 10% of coloring projects.
- M5: >= 50% monthly active users complete >= 2 projects/month.

## 2. Architecture Baseline

### 2.1 Reference Stack (MVP)
- Frontend: Next.js 15, TypeScript, Tailwind, Zustand, React Query
- API: Fastify (Node 22 + TypeScript)
- Jobs/Workers: BullMQ + Redis
- Database: PostgreSQL 16
- Object storage: S3-compatible bucket
- PDF pipeline: SVG renderers + PDFKit (or equivalent)
- Auth: JWT access tokens + refresh token rotation

Note: Stack is replaceable. Contracts in this document are implementation constraints regardless of framework.

### 2.2 Component Topology
1. Web Client
2. API Service
3. Generation Worker Service
4. QC Worker Service
5. Rendering Worker Service
6. Postgres
7. Redis queue
8. Object storage

### 2.3 Service Responsibilities
- Web Client: project editing, page planning, preview, export triggers
- API Service: authz, validation, orchestration, persistence
- Generation Worker: puzzle/activity/page-plan generation
- QC Worker: puzzle validation, style checks, print checks
- Rendering Worker: SVG/PDF composition and export generation

## 3. Domain Model and Persistence

### 3.1 Core Entities
- `users`
- `projects`
- `project_versions`
- `templates`
- `pages`
- `word_search_page_state`
- `maze_page_state`
- `style_profiles`
- `assets`
- `jobs`
- `exports`
- `qc_results`

### 3.2 PostgreSQL Schema (Initial)

```sql
create type project_status as enum ('draft', 'ready', 'exporting', 'archived');
create type page_type as enum ('cover_placeholder', 'front_matter', 'sudoku', 'word_search', 'maze', 'matching', 'coloring', 'solution', 'back_matter');
create type job_type as enum ('generate', 'qc', 'render', 'export');
create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type qc_severity as enum ('info', 'warning', 'error');

create table users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table style_profiles (
  id uuid primary key,
  name text not null,
  category text not null,
  audience_tags text[] not null default '{}',
  rules_json jsonb not null,
  prompt_blocks jsonb not null,
  version int not null default 1,
  is_public boolean not null default false,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key,
  owner_id uuid not null references users(id),
  title text not null,
  template_id uuid,
  status project_status not null default 'draft',
  style_profile_id uuid references style_profiles(id),
  style_mode text not null check (style_mode in ('GLOBAL', 'PER_PAGE')),
  settings_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pages (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  page_number int not null,
  type page_type not null,
  config_json jsonb not null default '{}',
  style_profile_override_id uuid references style_profiles(id),
  asset_id uuid,
  qc_state text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, page_number)
);

create table word_search_page_state (
  page_id uuid primary key references pages(id) on delete cascade,
  grid_size int not null check (grid_size between 10 and 24),
  grid_json jsonb not null,
  words_json jsonb not null,
  locale text not null default 'en-US',
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table maze_page_state (
  page_id uuid primary key references pages(id) on delete cascade,
  rows int not null check (rows between 8 and 80),
  cols int not null check (cols between 8 and 80),
  graph_json jsonb not null,
  entrance_json jsonb not null,
  exit_json jsonb not null,
  solution_path_json jsonb,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assets (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  storage_key text not null unique,
  mime_type text not null,
  width int,
  height int,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  type job_type not null,
  status job_status not null,
  payload_json jsonb not null,
  result_json jsonb,
  error_json jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table qc_results (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  page_id uuid references pages(id) on delete cascade,
  rule_id text not null,
  severity qc_severity not null,
  message text not null,
  details_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table exports (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  variant text not null check (variant in ('INTERIOR', 'SOLUTIONS', 'COMBINED', 'PROMPT_PACK')),
  status text not null check (status in ('queued', 'building', 'ready', 'failed')),
  file_asset_id uuid references assets(id),
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pages_project_type on pages(project_id, type);
create index idx_jobs_project_created on jobs(project_id, created_at desc);
create index idx_qc_project_severity on qc_results(project_id, severity);
create index idx_word_search_revision on word_search_page_state(revision);
create index idx_maze_revision on maze_page_state(revision);
```

### 3.3 Versioning Rules
- Every destructive page regeneration writes prior `config_json` to `project_versions`.
- Exports are immutable artifacts keyed by checksum.
- Style Profile updates are versioned; projects reference a pinned version ID.

## 4. API Contract (v1)

Base path: `/api/v1`
Auth: `Authorization: Bearer <access_token>`

### 4.1 Projects
- `POST /projects`
  - Input: title, template_id, settings, style_profile_id, style_mode
  - Output: project resource
- `GET /projects/:id`
  - Output: project + page summary + latest QC state
- `PATCH /projects/:id`
  - Input: mutable fields (title, settings, style refs)
- `POST /projects/:id/clone`
  - Input: title override, option to clone assets
- `POST /projects/:id/archive`

### 4.2 Pages and Generation
- `POST /projects/:id/pages/plan`
  - Input: page mix definition and generator settings
  - Side effect: enqueues `generate` job
- `POST /projects/:id/pages/:pageId/regenerate`
  - Input: reason + updated constraints
- `PATCH /projects/:id/pages/:pageId`
  - Input: per-page overrides and scene metadata
- `POST /projects/:id/pages/:pageId/word-search/generate`
  - Input: word list, grid config, direction set, seed (optional)
  - Output: generated grid + placements + revision
- `PATCH /projects/:id/pages/:pageId/word-search/cells`
  - Input: cell patch list (`row`, `col`, `char`) for manual edits
- `POST /projects/:id/pages/:pageId/word-search/words`
  - Input: word placement (`text`, `start`, `direction`)
- `PATCH /projects/:id/pages/:pageId/word-search/words/:wordId`
  - Input: updated placement or hidden/clue metadata
- `DELETE /projects/:id/pages/:pageId/word-search/words/:wordId`
- `POST /projects/:id/pages/:pageId/word-search/validate`
  - Output: QC-P2, QC-P2A, QC-P2B results
- `POST /projects/:id/pages/:pageId/maze/generate`
  - Input: rows, cols, difficulty, algorithm, seed (optional)
  - Output: maze graph + entrance/exit + revision
- `PATCH /projects/:id/pages/:pageId/maze/walls`
  - Input: wall edits (`add`/`remove`) for selected edges
- `PATCH /projects/:id/pages/:pageId/maze/terminals`
  - Input: entrance/exit coordinates
- `POST /projects/:id/pages/:pageId/maze/solve`
  - Output: computed solution path
- `POST /projects/:id/pages/:pageId/maze/validate`
  - Output: QC-P3, QC-P3A results

### 4.3 Style Profiles
- `GET /style-profiles`
- `POST /style-profiles` (admin/owner)
- `PATCH /style-profiles/:id` (admin/owner)
- `POST /projects/:id/style/apply`
  - Input: style_profile_id, mode (`GLOBAL` or `PER_PAGE`)

### 4.4 Prompt Studio
- `POST /projects/:id/prompts/build`
  - Output: normalized prompt set for coloring pages
- `GET /projects/:id/prompts/export?format=txt|md|csv`

### 4.5 Asset Import
- `POST /projects/:id/assets/presign`
  - Output: signed PUT URL and asset draft ID
- `POST /projects/:id/assets/:assetId/commit`
  - Input: hash, dimensions, mime
- `POST /projects/:id/pages/:pageId/attach-asset`
  - Input: asset_id

### 4.6 Quality and Export
- `POST /projects/:id/qc/run`
- `GET /projects/:id/qc`
- `POST /projects/:id/exports`
  - Input: variant (`INTERIOR`, `SOLUTIONS`, `COMBINED`, `PROMPT_PACK`)
- `GET /projects/:id/exports/:exportId`

### 4.7 Jobs
- `GET /projects/:id/jobs/:jobId`
- `POST /projects/:id/jobs/:jobId/cancel`

## 5. Job Orchestration

### 5.1 Queue Model
- Queue names: `generate`, `qc`, `render`, `export`
- Job idempotency key: `project_id + type + normalized_payload_hash`
- Max attempts:
  - generate: 2
  - qc: 2
  - render: 3
  - export: 3
- Backoff: exponential (2s, 8s, 30s)

### 5.2 State Machine
- `queued -> running -> succeeded|failed|cancelled`
- `failed` jobs emit structured `error_json` with:
  - code
  - retryable boolean
  - user_message
  - debug_context

### 5.3 Concurrency Controls
- Per project lock for render/export jobs to avoid artifact races.
- Parallel page generation allowed up to `min(8, cpu_cores * 2)`.

## 6. Generator Engine Specifications

### 6.1 Sudoku
- Algorithm: exact cover (DLX) for generation and uniqueness verification.
- Difficulty tuning by clue count and solving-technique profile.
- Requirements:
  - FR-SDK1: 4x4, 6x6, 9x9
  - FR-SDK2: unique solution required by default
- QC:
  - `QC-P1`: verify exactly one solution

### 6.2 Word Search
- Placement algorithm:
  1. Sort words descending by length
  2. Attempt placement by configured direction set
  3. Retry with shuffled order up to N attempts
  4. Fill remaining cells from locale-specific alphabet
- Config:
  - grid size 10x10 to 18x18
  - direction toggles (N, S, E, W, NE, NW, SE, SW)
- QC:
  - `QC-P2`: all words present once, coordinates recorded

### 6.2.1 Word Search Full Editing Suite
- FR-WS3: Interactive grid editor with cell-level edits.
- FR-WS4: Add/move/remove words manually, including direction changes.
- FR-WS5: Lock selected placed words so auto-fill/regenerate preserves them.
- FR-WS6: Bulk import/edit word list with duplicate and profanity guardrails.
- FR-WS7: Real-time conflict indicators:
  - out-of-bounds placement
  - illegal overlap (character mismatch)
  - duplicate placement
- FR-WS8: Editor undo/redo with minimum depth 50 operations.
- FR-WS9: Per-page revisioning and optimistic concurrency (`revision` required on write).
- FR-WS10: One-click normalize to refill only empty cells without moving locked words.
- Additional QC:
  - `QC-P2A`: every placed word path is contiguous and in allowed direction.
  - `QC-P2B`: all overlaps share matching characters only.

### 6.3 Maze
- Generation: recursive backtracker
- Optional post-process: dead-end reduction for easier levels
- QC:
  - `QC-P3`: exactly one traversable path between entrance and exit

### 6.3.1 Maze Generator and Editing Suite
- FR-MZ3: Support multiple generator algorithms (`recursive_backtracker`, `prim`, `kruskal`).
- FR-MZ4: Interactive wall editor (draw/erase walls by edge selection).
- FR-MZ5: Editable entrance and exit with hard bounds and border enforcement.
- FR-MZ6: Difficulty retuning on existing maze while preserving entrance/exit.
- FR-MZ7: Auto-solve and preview route overlay.
- FR-MZ8: Optional branch-density tuning and dead-end pruning.
- FR-MZ9: Per-page revisioning and optimistic concurrency (`revision` required on write).
- Additional QC:
  - `QC-P3A`: graph connectivity and valid terminal reachability.
  - `QC-P3B`: no isolated cells after manual edits.

### 6.4 Matching
- Modes:
  - text-to-text category matching
  - shape-to-shadow matching
- QC:
  - `QC-P4`: enforce one-to-one answer map (no ambiguity)

## 7. Style System Technical Contract

### 7.1 Style Profile JSON Schema (v1)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "rules", "prompt_blocks"],
  "properties": {
    "name": { "type": "string", "minLength": 3 },
    "category": { "type": "string" },
    "audience_tags": { "type": "array", "items": { "type": "string" } },
    "rules": {
      "type": "object",
      "required": ["line_weight", "detail_density", "shading", "background", "composition"]
    },
    "prompt_blocks": {
      "type": "object",
      "required": ["global_style_block", "negative_constraints_block"]
    }
  }
}
```

### 7.2 Prompt Assembly Contract
Final prompt string is deterministic and assembled as:
1. template constraints
2. global style block
3. page scene content
4. negative constraints
5. optional layout hints

Rules:
- Global style and negative blocks are immutable when style lock is enabled.
- Per-page override requires explicit mode `PER_PAGE`.
- Every generated prompt stores source fragments for traceability.

### 7.3 Style Drift Detection
- Rule engine scans scene text against deny terms derived from style rules.
- Violations produce `QC-ST1` warning or error based on severity mapping.

## 8. Rendering and Export Pipeline

### 8.1 Render Stages
1. Normalize project model into ordered page graph
2. Resolve page assets and generator outputs (including edited Word Search/Maze state tables)
3. Render page payloads to SVG (for puzzle/activity) or image placement commands
4. Compose PDF with trim, safe zones, and gutter transforms
5. Run print checks on final page boxes
6. Persist artifact to object storage + record checksum

### 8.2 Print Constraints
- Supported trim presets: managed in template catalog
- Safety rules:
  - min inner margin: 0.375 in
  - min outer margin: 0.25 in
  - min top/bottom margin: 0.25 in
  - gutter: template-dependent, min 0.125 in for books > 120 pages
- One-sided mode:
  - enforce odd-even parity for front-facing content blocks

### 8.3 Export Variants
- `INTERIOR`: no solutions
- `SOLUTIONS`: solutions only
- `COMBINED`: interior + appended solutions
- `PROMPT_PACK`: TXT/MD/CSV bundle in ZIP

## 9. Quality Gates

### 9.1 Blocking vs Non-Blocking
- Blocking: any `qc_results.severity = error`
- Non-blocking: warnings; export allowed with confirmation

### 9.2 QC Rule Set (MVP)
- `QC-P1` Sudoku uniqueness
- `QC-P2` Word Search placement validity
- `QC-P2A` Word Search path direction and continuity
- `QC-P2B` Word Search overlap consistency
- `QC-P3` Maze solvability
- `QC-P3A` Maze graph connectivity and terminal reachability
- `QC-P3B` Maze isolation detection after edits
- `QC-P4` Matching ambiguity
- `QC-PR1` Margin/gutter violations
- `QC-PR2` Line-thickness threshold (where measurable)
- `QC-PR3` One-sided page parity
- `QC-ST1` Style keyword conflicts
- `QC-ST2` Locked-style mutation attempts

### 9.3 Regeneration Behavior
- Regeneration is page-scoped by default.
- Optional chapter/book-wide regeneration requires explicit confirmation.

## 10. Security and Access Control

### 10.1 AuthN/AuthZ
- JWT access tokens (15 min) + rotating refresh tokens (30 days)
- RBAC roles:
  - owner
  - editor
  - viewer
  - admin (global style/template management)

### 10.2 Data Protection
- At-rest encryption for object storage and database volumes
- Signed URLs for asset upload/download with short TTL (<= 10 min)
- PII minimization: only email required for account identity

### 10.3 Abuse Controls
- Per-user and per-project rate limits for generation/export endpoints
- Anti-automation quotas for free-tier abuse prevention

## 11. Reliability, Performance, and SLOs

### 11.1 Availability Targets
- API monthly uptime target: 99.5%
- Job queue processing availability: 99.0%

### 11.2 Performance Targets
- P95 API read latency: <= 300 ms
- P95 API write latency: <= 600 ms
- 100-page Word Search generation + QC + export: <= 30 min end-to-end
- Prompt pack export (100 pages): <= 15 s

### 11.3 Scaling Targets
- Concurrent active projects: 1,000
- Concurrent queued jobs: 10,000
- Parallel renders: configurable pool, default 8 workers

## 12. Observability

### 12.1 Logging
- Structured JSON logs with correlation IDs:
  - `request_id`
  - `project_id`
  - `job_id`
  - `user_id`

### 12.2 Metrics
- Queue depth per job type
- Job success/failure rate by type
- Export duration histogram
- QC error frequency by rule ID
- API latency percentiles by endpoint

### 12.3 Tracing
- Distributed traces across API -> queue -> worker -> storage operations
- Error spans include `error_code` and retry metadata

## 13. Testing Strategy

### 13.1 Unit Tests
- Puzzle generators and validators
- Word Search editor patch application and overlap checks
- Maze editor wall mutation and connectivity checks
- Prompt assembler and style conflict scanner
- Margin/gutter calculation and parity rules

### 13.2 Integration Tests
- API + DB persistence flows
- Queue/worker lifecycle and retry behavior
- Asset upload + commit + attachment lifecycle

### 13.3 Property-Based/Deterministic Tests
- Sudoku uniqueness under randomized seeds
- Word Search placement stability across seeds and direction sets
- Maze solvability invariants

### 13.4 End-to-End Tests
- Coloring flow: project -> prompt pack -> asset attach -> export
- Word Search flow: generate -> manual edits -> validate -> export
- Maze flow: generate -> wall edits -> solve -> validate -> export
- Regression snapshots for generated PDF layout boxes

## 14. Milestones and Technical Exit Criteria

### Milestone 1: Platform Foundations
- Auth, projects, templates, base API, queue infra, minimal renderer
- Exit criteria:
  - Create/edit/archive project works
  - Basic PDF export artifact produced and downloadable

### Milestone 2: Puzzle Core
- Sudoku + Word Search generation, full editor suite, solutions, QC-P1/P2/P2A/P2B
- Exit criteria:
  - Validation suite pass rate >= 99%
  - Page-scoped regeneration supported
  - Manual Word Search edits persist and round-trip through export pipeline

### Milestone 3: Activity Core
- Maze generator + full maze editor, Matching generation, QC-P3/P3A/P3B/P4, combined books
- Exit criteria:
  - Mixed puzzle/activity exports pass print checks
  - Maze edits remain valid across save/reload/export

### Milestone 4: Style System + Prompt Studio
- Style profile CRUD, style lock, prompt assembly, QC-ST1/ST2
- Exit criteria:
  - Prompt exports deterministic from same inputs
  - Drift warnings operational

### Milestone 5: Asset Import + Production Hardening
- Asset presign/commit flow, attach-to-page, mixed rendering
- Exit criteria:
  - Prompt-to-asset-to-PDF pipeline stable in staging
  - SLO instrumentation dashboards live

## 15. Open Technical Decisions

1. Should generator workers be Node-only or split with Python for algorithmic workloads?
2. Should PDF rendering run in the same worker pool or isolated pool for memory safety?
3. Do we hard-block export on `warning` level print checks for first release?
4. Which storage lifecycle policy should archive old export artifacts?

## 16. Appendix: Starter Style Profile

```json
{
  "name": "Bold and Easy - Vector Stencil Line Art",
  "audience_tags": ["adults", "teens"],
  "rules": {
    "line_weight": "ultra_thick_outer_contour",
    "detail_density": "low",
    "shading": "none",
    "background": "none_or_minimal",
    "composition": "1-2 large subjects"
  },
  "prompt_blocks": {
    "global_style_block": "Clean black-and-white vector stencil line art, ultra-thick outer contour, simple shapes, big open areas, no shading, no grayscale, no textures, print-ready coloring page.",
    "negative_constraints_block": "No color, no gradients, no shadows, no pencil sketch lines, no crosshatching, no realistic rendering, no tiny details, no busy background.",
    "optional_layout_hints_block": "Centered composition, generous whitespace, KDP-safe margins."
  }
}
```
