export async function startRenderJob({ identity_id, scenes }) {
  const render_id = crypto.randomUUID();
  return render_id;
}

export async function getRenderStatusJob(render_id) {
  return {
    render_id,
    status: "completed",
    video_url: `https://your-storage/videos/${render_id}.mp4`,
    session_id: "session-id-placeholder"
  };
}
