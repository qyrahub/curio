import { useState } from "react";
import { brand } from "../lib/brand";
import { api } from "../lib/api";
import { getUser, saveAuth } from "../lib/auth";
import { SectionArt } from "../components/heroArt";
import type { UserPublic } from "../types";

function Sparkles() {
  return (
    <div className="auth-bg" aria-hidden="true">
      <svg viewBox="0 0 60 60" width="70" height="70" style={{ top: "10%", left: "8%" }}>
        <path d="M30 6c3 16 8 21 24 24-16 3-21 8-24 24-3-16-8-21-24-24 16-3 21-8 24-24Z" fill="#FFC94D" opacity="0.5" />
      </svg>
      <svg viewBox="0 0 60 60" width="46" height="46" style={{ top: "70%", left: "16%" }}>
        <path d="M30 6c3 16 8 21 24 24-16 3-21 8-24 24-3-16-8-21-24-24 16-3 21-8 24-24Z" fill="#5BBF8A" opacity="0.45" />
      </svg>
      <svg viewBox="0 0 60 60" width="58" height="58" style={{ top: "16%", right: "10%" }}>
        <path d="M30 6c3 16 8 21 24 24-16 3-21 8-24 24-3-16-8-21-24-24 16-3 21-8 24-24Z" fill="#5AA7E6" opacity="0.45" />
      </svg>
      <svg viewBox="0 0 60 60" width="50" height="50" style={{ bottom: "10%", right: "14%" }}>
        <path d="M30 6c3 16 8 21 24 24-16 3-21 8-24 24-3-16-8-21-24-24 16-3 21-8 24-24Z" fill="#FF7A66" opacity="0.45" />
      </svg>
    </div>
  );
}

export default function Account({ onChange }: { onChange: (u: UserPublic | null) => void }) {
  const [user, setUser] = useState<UserPublic | null>(getUser());
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (mode === "reset") {
        const r = await api.resetRequest(email);
        setMsg(r.message);
      } else {
        const r = mode === "signup" ? await api.signup(email, password) : await api.login(email, password);
        saveAuth(r.token, r.user); setUser(r.user); onChange(r.user);
        window.location.hash = "home"; // land straight in the app
      }
    } catch (e) { setErr(String(e).replace(/^Error:\s*API \d+:\s*/, "")); }
    finally { setBusy(false); }
  }
  if (user) {
    // Already signed in — there is nothing to do here, so go where they wanted to be.
    window.location.hash = "home";
    return (
      <div className="auth-page">
        <Sparkles />
        <div className="auth-card">
          <div style={{ maxWidth: 200, margin: "0 auto 6px" }}><SectionArt kind="account" /></div>
          <h2>Welcome back ✨</h2>
          <p className="sub">Taking you home…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Sparkles />
      <div className="auth-card">
        <div style={{ maxWidth: 190, margin: "0 auto -6px" }}><SectionArt kind="account" /></div>
        <div className="eyebrow">{brand.name}</div>
        <h2>{mode === "reset" ? "Reset your password" : mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className="sub">
          {mode === "reset" ? "We'll send reset instructions to your email."
            : "A space for you and your child to explore together."}
        </p>

        {mode !== "reset" && (
          <div className="seg">
            <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setErr(null); setMsg(null); }}>Sign in</button>
            <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setErr(null); setMsg(null); }}>Create account</button>
          </div>
        )}

        <label className="lbl">Email</label>
        <input className="custom-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        {mode !== "reset" && (
          <>
            <label className="lbl">Password</label>
            <input className="custom-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "at least 8 characters" : "your password"} />
          </>
        )}

        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? "…" : mode === "reset" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        <div style={{ textAlign: "center" }}>
          {mode === "login" && <button className="auth-link" onClick={() => { setMode("reset"); setErr(null); }}>Forgot your password?</button>}
          {mode === "reset" && <button className="auth-link" onClick={() => { setMode("login"); setErr(null); setMsg(null); }}>← Back to sign in</button>}
        </div>

        {err && <p className="auth-msg" style={{ color: "#c0392b" }}>{err}</p>}
        {msg && <p className="auth-msg">{msg}</p>}
      </div>
    </div>
  );
}
