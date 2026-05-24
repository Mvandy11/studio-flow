import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

export default function NewEvent() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Comedy");
  const [thumbnail, setThumbnail] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    "Comedy", "Music", "Dance", "Fitness", "Gaming", "Education",
    "Cooking", "Motivation", "Kids", "Talk Show", "Tutorials", "Art"
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return alert("Not logged in");

    // Upload thumbnail
    let thumbnail_url = null;
    if (thumbnail) {
      const { data } = await supabase.storage
        .from("thumbnails")
        .upload(`thumb-${Date.now()}`, thumbnail);
      thumbnail_url = supabase.storage.from("thumbnails").getPublicUrl(data.path).data.publicUrl;
    }

    // Upload video
    let video_url = null;
    if (video) {
      const { data } = await supabase.storage
        .from("videos")
        .upload(`video-${Date.now()}`, video);
      video_url = supabase.storage.from("videos").getPublicUrl(data.path).data.publicUrl;
    }

    // Insert event slot
    await supabase.from("event_slots").insert({
      creator_id: user.id,
      title,
      description,
      category,
      thumbnail_url,
      video_url,
      is_live: false
    });

    router.push("/creator/events");
  }

  return (
    <div className="page">
      <h1>Create Event</h1>

      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required />

        <label>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required />

        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        <label>Thumbnail</label>
        <input type="file" accept="image/*" onChange={e => setThumbnail(e.target.files[0])} />

        <label>Video Upload</label>
        <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />

        <button disabled={loading}>
          {loading ? "Uploading..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
