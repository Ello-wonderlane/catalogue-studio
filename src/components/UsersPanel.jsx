import { useState, useEffect } from "react";
import { listUsers, addUser, removeUser, usingSupabase } from "../lib/storage.js";

// Owner-only: who may log in. Adding here is step 1; step 2 is inviting them in Supabase (Authentication → Users → Invite user).
export default function UsersPanel({ me, say }) {
  const [users, setUsers] = useState([]); const [email, setEmail] = useState(""); const [role, setRole] = useState("editor");
  const refresh = () => listUsers().then(setUsers).catch(() => {});
  useEffect(() => { refresh(); }, []);
  if (!usingSupabase) return null;
  const isOwner = users.some((u) => u.email === (me || "").toLowerCase() && u.role === "owner");
  return (
    <div className="panel">
      <h3 style={{ fontSize: 16, marginBottom: 6 }}>Team access (who can log in)</h3>
      <div className="note" style={{ marginBottom: 8 }}>Two steps for a new person: <b>1.</b> add their email here · <b>2.</b> Supabase → Authentication → Users → <b>Invite user</b> (they get an email, click it, set a password). Removing them here blocks access immediately.</div>
      {users.map((u) => <div key={u.email} className="row" style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}><span style={{ flex: 1 }}>{u.email}</span><span className="pill">{u.role}</span>{isOwner && u.role !== "owner" && <button className="btn small" onClick={() => removeUser(u.email).then(refresh).then(() => say("Removed " + u.email))}>Remove</button>}</div>)}
      {isOwner ? <div className="row" style={{ marginTop: 10 }}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new.person@company.com" style={{ width: 240 }} /><select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 110 }}><option value="editor">editor</option><option value="owner">owner</option></select><button className="btn small primary" disabled={!email.includes("@")} onClick={() => addUser(email, role).then(() => { setEmail(""); refresh(); say("Added — now invite them in Supabase"); }).catch((e) => say(e.message))}>Add</button></div>
        : <div className="note" style={{ marginTop: 8 }}>Only an owner can add or remove people.</div>}
    </div>
  );
}
