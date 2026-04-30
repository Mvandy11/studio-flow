import { Router } from 'express';
import { listFolder, supabase, BUCKET } from '../../utils/supabaseUpload.js';

const router = Router();

const TOOL_FOLDERS = {
  denoise: 'library/ai-outputs/denoise',
  upscale: 'library/ai-outputs/upscale',
};

/**
 * GET /api/ai/outputs
 *
 * Returns AI output files from Supabase Storage.
 * Query params:
 *   ?tool=denoise|upscale  – filter by tool (default: all)
 *   ?limit=50              – max results per tool
 */
router.get('/outputs', async (req, res) => {
  const toolFilter = req.query.tool;
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);

  try {
    const folders =
      toolFilter && TOOL_FOLDERS[toolFilter]
        ? { [toolFilter]: TOOL_FOLDERS[toolFilter] }
        : TOOL_FOLDERS;

    const results = await Promise.all(
      Object.entries(folders).map(async ([tool, folder]) => {
        const files = await listFolder(folder, { limit });
        return files.map((f) => {
          const fullPath = `${folder}/${f.name}`;
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(fullPath);
          return {
            id: f.id ?? f.name,
            tool,
            filename: f.name.replace(/^[a-f0-9-]{36}_/, ''), // strip UUID prefix
            url: urlData?.publicUrl ?? '',
            fullPath,
            size: f.metadata?.size ?? 0,
            createdAt: f.created_at ?? f.updated_at ?? '',
            resolution: null, // populated from DB when ai_outputs table is available
          };
        });
      })
    );

    // Merge, sort newest first
    const merged = results
      .flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ outputs: merged, total: merged.length });
  } catch (err) {
    console.error('[outputs] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
