// Restore a backup JSON into Supabase. Run from the catalogue-studio folder:
//   export SUPABASE_URL=https://xxxx.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=...           # Supabase → Project Settings → API
//   node scripts/restore.mjs ../catalogue-backups/data/backup-2026-09-05.json --dry-run
//   node scripts/restore.mjs ../catalogue-backups/data/backup-2026-09-05.json
//
// Products are written first and only then are stale rows removed, so a failure part-way
// through leaves the old catalogue intact rather than an empty database.
import fs from "node:fs";

const file = process.argv[2];
const dry = process.argv.includes("--dry-run");
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!file) die("usage: node scripts/restore.mjs <backup.json> [--dry-run]");
if (!URL || !KEY) die("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first");

const backup = JSON.parse(fs.readFileSync(file, "utf8"));
const products = backup.products || [];
if (!Array.isArray(products)) die("that file has no products array — is it a Catalogue Studio backup?");

const SETTINGS_KEYS = ["brands", "categories", "materials", "colours", "skuConfig", "exportPrefs", "requiredFields", "customFormats"];
const settings = Object.fromEntries(SETTINGS_KEYS.filter((k) => backup[k] !== undefined).map((k) => [k, backup[k]]));

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function api(pathname, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${pathname}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${pathname} → ${res.status} ${await res.text()}`);
  return res;
}

const live = await api("catalogue_products?select=id", { headers: { Prefer: "count=exact", Range: "0-0" } })
  .then((r) => Number((r.headers.get("content-range") || "*/0").split("/").pop()));

console.log(`backup   : ${file}`);
console.log(`taken at : ${backup.exportedAt || "unknown"}`);
console.log(`restoring: ${products.length} products, ${Object.keys(settings).length} settings groups`);
console.log(`database : currently holds ${live} products`);

if (dry) { console.log("\n--dry-run: nothing was written."); process.exit(0); }
if (live > 0 && products.length < live * 0.5)
  die(`refusing: this backup has ${products.length} products but the database has ${live}. Re-run with --force if you really mean it.`, !process.argv.includes("--force"));

const now = new Date().toISOString();
// 1. upsert everything from the backup (in batches, matching the app's own limit)
for (let i = 0; i < products.length; i += 200) {
  const rows = products.slice(i, i + 200).map((p) => ({ id: p.id, sku: p.sku || "", data: p, updated_at: now, updated_by: "restore" }));
  await api("catalogue_products", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(rows) });
  console.log(`  upserted ${Math.min(i + 200, products.length)}/${products.length}`);
}
// 2. only now delete rows the backup does not contain
const keep = new Set(products.map((p) => p.id));
const all = await api("catalogue_products?select=id").then((r) => r.json());
const stale = all.map((r) => r.id).filter((id) => !keep.has(id));
if (stale.length) {
  const list = stale.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(",");
  await api(`catalogue_products?id=in.(${encodeURIComponent(list)})`, { method: "DELETE" });
  console.log(`  removed ${stale.length} product(s) not in the backup`);
}
// 3. settings
if (Object.keys(settings).length) {
  await api("catalogue_settings", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ id: "main", data: settings, updated_at: now, updated_by: "restore" }]) });
  console.log("  settings restored");
}
// 4. record the restore in the history the app shows
await api("catalogue_history", { method: "POST", body: JSON.stringify([{ at: now, who: "restore script", action: "restore", sku: "",
  detail: { products: products.length, from: backup.exportedAt || file } }]) });

console.log(`\nDone. Reload the site — it should show ${products.length} products.`);

function die(msg, when = true) { if (when) { console.error("Error: " + msg); process.exit(1); } }
