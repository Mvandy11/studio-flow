import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MyEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getUser()).data.user;
      const { data } = await supabase
        .from("event_slots")
        .select("*")
        .eq("creator_id", user.id);
      setEvents(data);
    }
    load();
  }, []);

  return (
    <div>
      <h1>My Events</h1>
      {events.map(ev => (
        <div key={ev.id}>
          <h3>{ev.title}</h3>
          <p>{ev.category}</p>
        </div>
      ))}
    </div>
  );
}
