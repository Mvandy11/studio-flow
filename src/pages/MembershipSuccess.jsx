import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MembershipSuccess() {
  const [status, setStatus] = useState("activating"); 
  const [message, setMessage] = useState("");

  useEffect(() => {
    const activate = async () => {
      try {
        // 1. Refresh Supabase session after Stripe redirect
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setStatus("error");
          setMessage("No Supabase session found. Please log in again.");
          return;
        }

        // 2. Extract tier from URL
        const tier = new URLSearchParams(window.location.search).get("tier");
        if (!tier) {
          setStatus("error");
          setMessage("Missing membership tier in redirect URL.");
          return;
        }

        // 3. Call backend with Authorization header
        const res = await fetch("/api/membership/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ tier })
        });

        // 4. Handle non‑JSON responses (HTML error pages)
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          setStatus("error");
          setMessage("Server returned an unexpected response.");
          console.error("HTML response:", text);
          return;
        }

        // 5. Handle backend errors
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Activation failed.");
          return;
        }

        // 6. Success!
        setStatus("success");
        setMessage("Your membership is now active!");

      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("Unexpected error during activation.");
      }
    };

    activate();
  }, []);

  // UI STATES
  if (status === "activating") {
    return (
      <div className="activation-loading">
        <h2>Activating your membership...</h2>
        <p>Just a moment while we set up your access.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="activation-success">
        <h2>Membership Activated 🎉</h2>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="activation-error">
      <h2>Activation Failed</h2>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>
        Retry Activation
      </button>
      <button onClick={() => (window.location.href = "/membership")}>
        Return to Membership Page
      </button>
    </div>
  );
}

