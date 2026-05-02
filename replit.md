# Studio Flow

## Overview

Cinematic creator platform — React + Vite frontend (workspace root) backed by an Express.js API server and Supabase.

## Stack

- **Frontend**: React + Vite (workspace root `src/`)
- **API server**: Express.js at `server/` (CommonJS/ESM, port 3001)
- **Database / Storage**: Supabase (PostgreSQL + Storage bucket `studio-flow-library`)
- **AI**: OpenAI via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`)
- **Image processing**: sharp, Replicate (Real-ESRGAN for upscale)
- **Audio processing**: ffmpeg + OpenAI gpt-audio (denoise pipeline)
- **Package manager**: pnpm (workspace root)
- **Styling**: BEM-namespaced CSS modules + global CSS in `src/styles/`

## Workflows

| Name | Command | Port |
|------|---------|------|
| Start application | `pnpm run dev` | 5173 |
| Start API server | `node server/index.js` | 3001 |

Vite proxy forwards `/api` → `http://localhost:3001`.

---

## Navigation & Layout

Global shell layout in `src/components/Layout.jsx`:
- **Left sidebar** (`AppSidebar.jsx`) — fixed 240px nav with all sections. Collapses on mobile (<900px).
- **Top bar** (`Navbar.jsx`) — minimal: search, subscribe button, user auth. Hamburger on mobile.
- **Mobile drawer** (`MobileDrawer.jsx`) — full nav on mobile including all new routes.
- Layout CSS: `src/styles/app-layout.css`
- Utility buttons (`.btn`, `.btn--primary`, etc.): `src/styles/components.css`

---

## Creator-Admin Role (Michael Vandeventer)

Michael (obviouslyinspiredstudio@outlook.com) has permanent `creator_admin` role granting:
- Full free access to all features and tools
- Bypass of all paywalls and subscription tiers
- Access to the Admin Dashboard (`/admin`)
- Ability to create and manage contests

- Role constants: `src/lib/roles.js` — `ROLES`, `isCreatorAdmin()`, `isCreatorOrAdmin()`
- Hook: `src/hooks/useAuth.js` — returns `{ user, role, loading, login, signup, logout }`
- Migration: `server/db/migrations/add_role_to_profiles.sql`

---

## AI Tools Suite

### AI Denoise (`/tools/denoise`)
- Route: `server/routes/ai/denoise.js`
- Feature module: `src/features/ai-denoise/`
- Pipeline: ffmpeg pre-process → OpenAI gpt-audio speech enhancement

### AI Upscale (`/tools/upscale`)
- Route: `server/routes/ai/upscale.js`
- Service: `server/services/upscaleService.js`
- Uses: Replicate Real-ESRGAN (`REPLICATE_API_TOKEN` required)

### AI Enhance (`/tools/enhance`)
- Route: `server/routes/ai/enhance.js`
- Uses: OpenAI `gpt-image-1` via `/images/edit`
- Outputs auto-saved to Supabase `ai_outputs` table

### Shared Library Grid
- Table: `ai_outputs` (migration: `server/db/migrations/create_ai_outputs_table.sql`)
- Grid: `src/components/library/AiOutputsGrid.jsx`
- Hook: `src/hooks/useAiOutputs.js`

---

## Contest System

Full contest engine at `/contests`.

- **Server routes**: `server/routes/contests.js` (mounted at `/api/contests`)
  - `GET  /api/contests` — list all contests (filterable by status)
  - `GET  /api/contests/:id` — single contest + entries
  - `POST /api/contests` — create contest (creator_admin only)
  - `PATCH /api/contests/:id` — update contest (creator_admin only)
  - `POST /api/contests/:id/entries` — submit entry (file upload + email)
  - `POST /api/contests/:id/entries/:entryId/vote` — vote (anti-spam: unique per user/entry)
  - `GET  /api/contests/:id/entries` — list entries

- **Email notifications**: nodemailer sends to `obviouslyinspiredstudio@outlook.com` on entry submission. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars. Fails silently if not configured.

- **Frontend pages**:
  - `src/pages/contests/ContestsPage.jsx` — listing with status filters
  - `src/pages/contests/ContestDetailPage.jsx` — detail, submission form, voting, winners
  - `src/pages/contests/CreateContestPage.jsx` — admin create form (creator_admin only)
  - `src/components/contests/ContestCard.jsx` — card component

- **DB migration**: `server/db/migrations/create_contests_tables.sql`
  - Tables: `contests`, `contest_entries`, `contest_votes`, `free_tickets`

- **Styles**: `src/styles/contests.css`

---

## Admin Dashboard (`/admin`)

Protected route — redirects non-admin users to `/`.

- `src/pages/AdminDashboard.jsx`
- Tabs: Overview, Contests, Events, Submissions, Tickets, Moderation
- Loads data directly from Supabase (contests, events, tickets, contest_entries)
- Contest lifecycle management: Draft → Active → Voting → Completed → Archived
- Styles: `src/styles/admin.css`

---

## Creator Portfolio (`/profile`, `/profile/:id`)

Full public portfolio page for every creator.

- `src/pages/CreatorProfile.jsx`
- Sections: cover, avatar, bio, social links, action buttons (Hire Me, Book Session, Edit Profile)
- Stats strip: sessions count, events count, followers
- Session gallery (linked to `/session/:id`)
- Upcoming events list
- Shop section (placeholder products)
- Tip Jar (with preset amounts)
- Styles: `src/styles/portfolio.css`

---

## Earnings Dashboard (`/earnings`)

- `src/pages/EarningsDashboard.jsx`
- Summary cards: Total Earned, Ticket Sales, Product Sales, Tips
- Transaction list (real ticket data from Supabase + mock tips)
- Payout info linked to Premier Settings

---

## Ticketing with Free-Ticket Perk

- `src/lib/createTicket.js` — `createTicket(supabase, eventId, userId)`
- On every paid ticket purchase, automatically issues 1 free view-only ticket to `free_tickets` table
- Free ticket is linked to the same event and marked `ticket_type: 'view_only'`

---

## Database Tables

Run these migrations in order in your Supabase SQL editor:
1. `server/db/migrations/add_role_to_profiles.sql` — adds `role` column to `profiles`
2. `server/db/migrations/create_ai_outputs_table.sql` — shared AI outputs library
3. `server/db/migrations/create_contests_tables.sql` — contests, entries, votes, free_tickets

---

## Routes

| Path | Component |
|------|-----------|
| `/` | Home |
| `/feed` | Feed |
| `/profile` | CreatorProfile (own) |
| `/profile/:id` | CreatorProfile (other creator) |
| `/studio` | Studio |
| `/studio/sessions` | StudioSessions |
| `/tools` | Tools |
| `/tools/denoise` | DenoiseToolPage |
| `/tools/upscale` | UpscalePage |
| `/tools/enhance` | EnhancePage |
| `/contests` | ContestsPage |
| `/contests/create` | CreateContestPage (admin) |
| `/contests/:id` | ContestDetailPage |
| `/creator-academy` | CreatorAcademy |
| `/earnings` | EarningsDashboard |
| `/admin` | AdminDashboard (admin) |
| `/events/create` | CreateEventPage |
| `/events/:id` | EventPage |
| `/events/:eventId/purchase` | PurchasePage |
| `/stage/:stageRoomId` | StagePage |

---

## Environment Variables

| Variable | Used By |
|----------|---------|
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | server AI routes |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | server AI routes |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | frontend + server |
| `SUPABASE_SERVICE_ROLE_KEY` | server (storage/DB writes) |
| `VITE_SUPABASE_ANON_KEY` | frontend (read queries) |
| `REPLICATE_API_TOKEN` | upscale tool |
| `SUPABASE_STORAGE_BUCKET` | server (default: `studio-flow-library`) |
| `SMTP_HOST` | contest email notifications (optional) |
| `SMTP_PORT` | contest email notifications (optional) |
| `SMTP_USER` | contest email notifications (optional) |
| `SMTP_PASS` | contest email notifications (optional) |
