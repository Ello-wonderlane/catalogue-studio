// Persistence + live collaboration.
//   Supabase mode (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env): products are stored one row each,
//   settings in one row, every change is written to a history table, and Realtime pushes changes + presence
//   ("who is online / editing what") to every open browser.
//   Local mode (no .env): everything in this browser's localStorage.
import { createClient } from "@supabase/supabase-js";

const KEY = "catalogue-studio-v3";
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const usingSupabase = Boolean(URL && ANON);
export const sb = usingSupabase ? createClient(URL, ANON) : null;

const SETTINGS_KEYS = ["brands", "categories", "materials", "colours", "skuConfig", "exportPrefs"];
export const pickSettings = (s) => Object.fromEntries(SETTINGS_KEYS.map((k) => [k, s[k]]));

// ---------- who am I (name kept per browser) ----------
export const getWho = () => localStorage.getItem(KEY + "-who") || "";
export const setWho = (n) => localStorage.setItem(KEY + "-who", n);
export function loadLocalAi() { try { return JSON.parse(localStorage.getItem(KEY + "-ai") || "null"); } catch { return null; } }
export function saveLocalAi(ai) { localStorage.setItem(KEY + "-ai", JSON.stringify(ai || {})); }

// ---------- local backend ----------
function localRead() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
function localWrite(obj) { localStorage.setItem(KEY, JSON.stringify(obj)); }
function localAll() { return localRead() || { settings: null, products: [], history: [] }; }

// ---------- public API ----------
export async function loadAll() {
  if (!usingSupabase) {
    const l = localAll();
    if (!l.settings) { // migrate v2 single-key format
      try { const old = JSON.parse(localStorage.getItem("catalogue-studio-v2") || "null"); if (old) return { settings: pickSettings(old), products: old.products || [], history: [] }; } catch {}
    }
    return l;
  }
  const [{ data: st }, { data: pr, error }, { data: hi }] = await Promise.all([
    sb.from("catalogue_settings").select("data").eq("id", "main").maybeSingle(),
    sb.from("catalogue_products").select("data"),
    sb.from("catalogue_history").select("at,who,action,sku,detail").order("at", { ascending: false }).limit(1000),
  ]);
  if (error) throw error;
  let settings = st?.data || null; let products = (pr || []).map((r) => r.data);
  if (!settings && products.length === 0) { // migrate from v2 catalogue_state row
    const { data: old } = await sb.from("catalogue_state").select("data").eq("id", "catalogue-studio-v2").maybeSingle();
    if (old?.data) { settings = pickSettings(old.data); products = old.data.products || []; await saveSettings(settings, "migration"); await upsertProducts(products, "migration"); await log({ who: "system", action: "restore", sku: "", detail: { note: `migrated ${products.length} products from previous version` } }); }
  }
  return { settings, products, history: hi || [] };
}
export async function saveSettings(settings, who) {
  if (!usingSupabase) { const l = localAll(); l.settings = settings; localWrite(l); return; }
  const { error } = await sb.from("catalogue_settings").upsert({ id: "main", data: settings, updated_at: new Date().toISOString(), updated_by: who || "" });
  if (error) throw error;
}
export async function upsertProducts(list, who) {
  if (!list.length) return;
  if (!usingSupabase) { const l = localAll(); const m = new Map(l.products.map((p) => [p.id, p])); list.forEach((p) => m.set(p.id, p)); l.products = [...m.values()]; localWrite(l); return; }
  const rows = list.map((p) => ({ id: p.id, sku: p.sku || "", data: p, updated_at: new Date().toISOString(), updated_by: who || "" }));
  for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from("catalogue_products").upsert(rows.slice(i, i + 200)); if (error) throw error; }
}
export async function deleteProducts(ids) {
  if (!ids.length) return;
  if (!usingSupabase) { const l = localAll(); l.products = l.products.filter((p) => !ids.includes(p.id)); localWrite(l); return; }
  const { error } = await sb.from("catalogue_products").delete().in("id", ids); if (error) throw error;
}
export async function replaceAllProducts(list, who) {
  if (!usingSupabase) { const l = localAll(); l.products = list; localWrite(l); return; }
  await sb.from("catalogue_products").delete().neq("id", ""); await upsertProducts(list, who);
}
export async function log(entry) {
  const e = { at: new Date().toISOString(), who: "", sku: "", detail: {}, ...entry };
  if (!usingSupabase) { const l = localAll(); l.history = [e, ...(l.history || [])].slice(0, 2000); localWrite(l); return e; }
  await sb.from("catalogue_history").insert(e); return e;
}
export async function loadHistory(limit = 1000) {
  if (!usingSupabase) return localAll().history || [];
  const { data } = await sb.from("catalogue_history").select("at,who,action,sku,detail").order("at", { ascending: false }).limit(limit); return data || [];
}

// ---------- realtime: data changes + presence ----------
let channel = null;
export function subscribe({ onProduct, onProductDelete, onSettings, onHistory, onPresence }, me) {
  if (!usingSupabase) return () => {};
  channel = sb.channel("catalogue-live", { config: { presence: { key: me.key } } });
  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "catalogue_products" }, (p) => { if (p.eventType === "DELETE") onProductDelete?.(p.old?.id); else onProduct?.(p.new?.data); })
    .on("postgres_changes", { event: "*", schema: "public", table: "catalogue_settings" }, (p) => onSettings?.(p.new?.data))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "catalogue_history" }, (p) => onHistory?.(p.new))
    .on("presence", { event: "sync" }, () => { const st = channel.presenceState(); onPresence?.(Object.values(st).flat()); })
    .subscribe(async (status) => { if (status === "SUBSCRIBED") await channel.track({ ...me, at: new Date().toISOString() }); });
  return () => { channel?.unsubscribe(); channel = null; };
}
export async function updatePresence(info) { if (channel) { try { await channel.track({ ...info, at: new Date().toISOString() }); } catch {} } }

// ---------- auth (login) ----------
export const auth = {
  async session() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session; },
  onChange(cb) { if (!sb) return () => {}; const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s)); return () => data.subscription.unsubscribe(); },
  signInPassword: (email, password) => sb.auth.signInWithPassword({ email, password }),
  signInLink: (email) => sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split("#")[0] } }),
  resetPassword: (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split("#")[0] }),
  setPassword: (password) => sb.auth.updateUser({ password }),
  signOut: () => sb.auth.signOut(),
};
export async function listUsers() { if (!sb) return []; const { data } = await sb.from("catalogue_users").select("email,role,added_at").order("added_at"); return data || []; }
export async function addUser(email, role = "editor") { const { error } = await sb.from("catalogue_users").insert({ email: email.trim().toLowerCase(), role }); if (error) throw error; }
export async function removeUser(email) { const { error } = await sb.from("catalogue_users").delete().eq("email", email); if (error) throw error; }
