"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Evening reminders and nudges as phone notifications. */
export function PushToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "denied">("loading");
  const [msg, setMsg] = useState("");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !key) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, [key]);

  async function enable() {
    setMsg("");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState("denied");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key!) });
    const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await supabaseBrowser()
      .from("push_subscriptions")
      .upsert({ endpoint: j.endpoint, user_id: userId, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
    if (error) return setMsg("❌ " + error.message);
    setState("on");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabaseBrowser().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }

  return (
    <div className="card">
      <h2 className="text-lg font-extrabold">🔔 Erinnerungen · রিমাইন্ডার</h2>
      <p className="text-sm text-muted">
        A reminder at 8 PM if you have not finished, and a ping when a teammate nudges you. On iPhone, first add the app to your home screen (Share →
        Add to Home Screen).
      </p>
      <div className="mt-2">
        {state === "loading" && <span className="text-sm text-muted">…</span>}
        {state === "unsupported" && <span className="text-sm text-muted">This browser does not support notifications{key ? "" : " (VAPID key not set)"}.</span>}
        {state === "denied" && <span className="text-sm text-red">Notifications are blocked in your browser settings.</span>}
        {state === "off" && (
          <button className="btn" onClick={enable}>
            Einschalten
          </button>
        )}
        {state === "on" && (
          <button className="btn-ghost" onClick={disable}>
            ✓ On · Ausschalten
          </button>
        )}
        {msg && <p className="mt-1 text-sm">{msg}</p>}
      </div>
    </div>
  );
}
