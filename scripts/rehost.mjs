// Move product images to another host (e.g. Cloudflare R2) without editing 600 products by hand.
// Copy the bucket's files across first, keeping the same products/<SKU>/<n>.jpg paths, then:
//
//   export SUPABASE_URL=https://xxxx.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=...
//   node scripts/rehost.mjs https://old-base/ https://new-base/ --dry-run
//   node scripts/rehost.mjs https://old-base/ https://new-base/
//
// Only the URL prefix changes; the per-SKU path stays identical, which is the whole point of
// deriving image paths from the SKU.
import process from "node:process";

const [from, to] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry-run");
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!from || !to) { console.error("usage: node scripts/rehost.mjs <old-base-url> <new-base-url> [--dry-run]"); process.exit(2); }
if (!URL_ || !KEY) { console.error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first"); process.exit(2); }

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const FIELDS = ["imageUrl", "imageUrl2", "imageUrl3", "imageUrl4", "imageUrl5", "videoUrl"];

const rows = await fetch(`${URL_}/rest/v1/catalogue_products?select=id,data`, { headers: h }).then((r) => r.json());
const changed = [];
for (const row of rows) {
  const p = { ...row.data };
  let hit = false;
  for (const f of FIELDS) {
    if (typeof p[f] === "string" && p[f].startsWith(from)) { p[f] = to + p[f].slice(from.length); hit = true; }
  }
  if (hit) changed.push({ id: row.id, sku: p.sku || "", data: p });
}

console.log(`${rows.length} products scanned, ${changed.length} contain images on ${from}`);
if (!changed.length) process.exit(0);
console.log(`example: ${FIELDS.map((f) => changed[0].data[f]).find(Boolean)}`);
if (dry) { console.log("\n--dry-run: nothing was written."); process.exit(0); }

const now = new Date().toISOString();
for (let i = 0; i < changed.length; i += 200) {
  const batch = changed.slice(i, i + 200).map((c) => ({ ...c, updated_at: now, updated_by: "rehost" }));
  const res = await fetch(`${URL_}/rest/v1/catalogue_products`, {
    method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(batch),
  });
  if (!res.ok) { console.error(await res.text()); process.exit(1); }
  console.log(`  updated ${Math.min(i + 200, changed.length)}/${changed.length}`);
}
console.log("Done. Check a product in the app, then retire the old bucket.");
