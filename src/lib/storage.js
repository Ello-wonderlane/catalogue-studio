// Persistence.
//   1) If VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set (.env file), the whole catalogue is saved
//      to a Supabase table so every device / team member sees the same data.
//   2) Otherwise it falls back to this browser's localStorage.
// The Supabase table (run once in Supabase → SQL editor, also in supabase/setup.sql):
//   create table catalogue_state (id text primary key, data jsonb, updated_at timestamptz default now());
const KEY = "catalogue-studio-v2";
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const usingSupabase = Boolean(URL && ANON);
const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };

export async function loadState() {
  try {
    if (usingSupabase) {
      const r = await fetch(`${URL}/rest/v1/catalogue_state?id=eq.${KEY}&select=data`, { headers });
      if (!r.ok) throw new Error("Supabase load failed: " + r.status);
      const rows = await r.json(); return rows[0]?.data || null;
    }
    if (window.storage?.get) { const r = await window.storage.get(KEY, false); return r ? JSON.parse(r.value) : null; }
    const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null;
  } catch (e) { console.error(e); return null; }
}
export async function saveState(s) {
  try {
    const { aiSettings, ...shared } = s; // never send API keys to the shared table
    if (usingSupabase) {
      const r = await fetch(`${URL}/rest/v1/catalogue_state`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: KEY, data: shared, updated_at: new Date().toISOString() }) });
      if (!r.ok) throw new Error("Supabase save failed: " + r.status);
      localStorage.setItem(KEY + "-ai", JSON.stringify(aiSettings || {}));
      return;
    }
    const val = JSON.stringify(s);
    if (window.storage?.set) await window.storage.set(KEY, val, false); else localStorage.setItem(KEY, val);
  } catch (e) { console.error("save failed", e); }
}
export function loadLocalAi() { try { return JSON.parse(localStorage.getItem(KEY + "-ai") || "null"); } catch { return null; } }
