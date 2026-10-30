"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="gate">
      <img src="/assets/brand/logo-line-navy.png" alt="The Athos Group" width="300" height="21" />
      <h1>Site editor</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          const r = await fetch("/api/edit/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
          if (r.ok) return location.reload();
          setErr((await r.json().catch(() => ({}))).error || "Couldn't sign in.");
          setBusy(false);
        }}
      >
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <button type="submit" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {err && <p className="warn" role="alert">{err}</p>}
      </form>
    </main>
  );
}
