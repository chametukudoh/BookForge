# BookForge Studio

Work-in-progress Next.js application for designing and validating print-ready activity-book interiors, including dot-to-dot, word-search, maze, coloring and KDP preflight workflows.

## Current implementation

- Next.js 16 and React 19 application
- dashboard-style editing workspace
- dot-to-dot generation, image processing and reusable asset library
- word-search, maze, dot-marker and style tools
- print/KDP preflight utilities
- PDF/export helpers
- API route prototypes and OpenAPI contract
- PostgreSQL/Supabase migration drafts
- Node test suite covering dot-to-dot and KDP-preflight behavior

This repository is an active prototype. The broader architecture in `BookForge.md` is a product/technical design and includes components that are not fully implemented. Do not treat PRD goals or success metrics as achieved outcomes.

## Setup

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000.

AI image routes require provider credentials. Supabase-backed routes require a project URL and service-role key. Never expose server credentials through `NEXT_PUBLIC_*` variables or commit them.

## Quality checks

```powershell
npm test
npm run lint
npm run build
```

## Repository map

```text
app/          Next.js pages and API routes
components/   editors, labs and dashboard UI
contexts/     workspace and UI state
db/           migrations and local runtime data
lib/          generators, rendering, export and preflight logic
openapi/      API contract
tests/        Node test suite
BookForge.md  product and architecture draft
```

## Evidence boundaries

- The repository demonstrates a substantial product prototype and tested generation/preflight logic.
- It does not establish production users, KDP acceptance rates, revenue, uptime or the PRD's target success metrics.
- External AI providers may change behavior or pricing; generated assets require licensing and quality review before commercial publication.

## Next improvements

- Separate implemented scope from future architecture in `BookForge.md`.
- Add screenshots or a two-minute walkthrough.
- Add CI for tests, lint and build.
- Add authentication/authorization tests around project and asset routes.
- Document storage lifecycle, provider-cost controls and failure recovery.
