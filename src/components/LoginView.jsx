import { useState, useEffect } from "react";
import { auth } from "../lib/storage.js";

export default function LoginView({ onDone }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("password"); // password | link | setpw
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (window.location.hash.includes("type=recovery") || window.location.hash.includes("type=invite")) setMode("setpw"); }, []);
  const run = async (fn, ok) => { setBusy(true); setMsg(""); try { const { error } = await fn(); if (error) throw error; setMsg(ok); } catch (e) { setMsg(e.message || String(e)); } setBusy(false); };
  return (
    <div className="cs" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div className="panel" style={{ width: 380 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Catalogue Studio</h1>
        <div className="note" style={{ marginBottom: 16 }}>Sign in with your invited email address.</div>
        {mode === "setpw" ? (<>
          <div className="field"><label>Choose a password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <button className="btn primary" disabled={busy || pw.length < 8} onClick={() => run(() => auth.setPassword(pw), "Password saved — you're in.").then(onDone)}>Save password</button>
          <div className="note" style={{ marginTop: 8 }}>At least 8 characters.</div>
        </>) : (<>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoFocus /></div>
          {mode === "password" && <div className="field"><label>Password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(() => auth.signInPassword(email, pw), "")} /></div>}
          <div className="row">
            {mode === "password" ? <button className="btn primary" disabled={busy || !email || !pw} onClick={() => run(() => auth.signInPassword(email, pw), "")}>Sign in</button>
              : <button className="btn primary" disabled={busy || !email} onClick={() => run(() => auth.signInLink(email), "Check your inbox — click the link to sign in.")}>Email me a login link</button>}
            <button className="btn" onClick={() => setMode(mode === "password" ? "link" : "password")}>{mode === "password" ? "Use email link instead" : "Use password instead"}</button>
          </div>
          {mode === "password" && <button className="btn small" style={{ marginTop: 10 }} disabled={!email} onClick={() => run(() => auth.resetPassword(email), "Reset link sent — check your inbox.")}>Forgot / set password</button>}
        </>)}
        {msg && <div className="note" style={{ marginTop: 12, color: /sent|inbox|saved/i.test(msg) ? "var(--olive)" : "var(--ox)" }}>{msg}</div>}
        <div className="note" style={{ marginTop: 16 }}>No account? Ask the owner to invite you (Help → Team access).</div>
      </div>
    </div>
  );
}
