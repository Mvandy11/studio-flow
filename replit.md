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

## AI Tools Suite

### AI Denoise (`/tools/denoise`)
- Route: `server/routes/ai/denoise.js`
- Feature module: `src/features/ai-denoise/`
- Pipeline: ffmpeg pre-process → OpenAI gpt-audio speech enhancement

### AI Upscale (`/tools/upscale`)
- Route: `server/routes/ai/upscale.js`
- Service: `server/services/upscaleService.js`
- Components: `src/components/upscale/` (FileDropZone, BeforeAfterSlider)
- Hook: `src/hooks/useUpscale.js`
- Uses: Replicate Real-ESRGAN (`REPLICATE_API_TOKEN` required)

### AI Enhance (`/tools/enhance`)
- Route: `server/routes/ai/enhance.js`
- Components: `src/components/enhance/` (ImageDropzone, BeforeAfterComparison, EnhanceToolbar)
- Hook: `src/hooks/useEnhance.js`
- Service: `src/services/enhanceApi.js`
- Uses: OpenAI `gpt-image-1` via `/images/edit` (Replit AI integration)
- Outputs auto-saved to Supabase `ai_outputs` table + `studio-flow-library` bucket

## Shared Library Grid

All AI tools share a unified outputs library backed by the `ai_outputs` Supabase table.

- Table migration: `server/db/migrations/create_ai_outputs_table.sql`
- Grid component: `src/components/library/AiOutputsGrid.jsx`
- Card component: `src/components/library/AiOutputCard.jsx`
- Hook: `src/hooks/useAiOutputs.js`
- API service: `src/services/libraryApi.js`
- Styles: `src/styles/library-ai-grid.css`

## Environment Variables

| Variable | Used By |
|----------|---------|
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | server/services/openaiService.js, server/routes/ai/enhance.js |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | server/services/openaiService.js, server/routes/ai/enhance.js |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | frontend + server |
| `SUPABASE_SERVICE_ROLE_KEY` | server (storage/DB writes) |
| `VITE_SUPABASE_ANON_KEY` | frontend (read queries) |
| `REPLICATE_API_TOKEN` | upscale tool |
| `SUPABASE_STORAGE_BUCKET` | server (default: `studio-flow-library`) |
| `VITE_SUPABASE_BUCKET` | frontend (default: `studio-flow-library`) |

## Key File Paths

```
src/
  App.jsx                          — Router (all tool routes wired here)
  pages/EnhancePage.jsx
  pages/UpscalePage.jsx
  features/ai-denoise/             — Denoise feature module
  components/enhance/              — Enhance UI components
  components/upscale/              — Upscale UI components
  components/library/              — Shared Library grid
  hooks/useEnhance.js
  hooks/useUpscale.js
  hooks/useAiOutputs.js
  services/enhanceApi.js
  services/libraryApi.js
  styles/enhance.css
  styles/library-ai-grid.css
server/
  index.js                         — Express entry point
  routes/ai/index.js               — Mounts all AI sub-routers
  routes/ai/enhance.js             — POST /api/ai/enhance
  routes/ai/upscale.js             — POST /api/ai/upscale
  routes/ai/denoise.js             — POST /api/ai/denoise
  routes/ai/outputs.js             — GET  /api/ai/outputs
  services/openaiService.js        — Denoise pipeline
  services/upscaleService.js       — Replicate upscale
  db/migrations/                   — SQL migration files
```

## Database Setup

Run `server/db/migrations/create_ai_outputs_table.sql` once in your Supabase SQL editor to create the `ai_outputs` table before using any AI tool that saves to the Library.
