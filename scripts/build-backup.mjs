// Builds one backup file from the four Supabase dumps, refusing to write a backup that
// looks broken. Used by .github/workflows/healthcheck.yml.
//   node scripts/build-backup.mjs <srcDir> <outDir> <stamp>
import fs from "node:fs";
import path from "node:path";

const [srcDir, outDir, stamp] = process.argv.slice(2);
if (!srcDir || !outDir || !stamp) { console.error("usage: build-backup.mjs <srcDir> <outDir> <stamp>"); process.exit(2); }

const read = (f) => JSON.parse(fs.readFileSync(path.join(srcDir, f), "utf8"));
const products = read("products.json").map((r) => r.data);
const settings = (read("settings.json")[0] || {}).data || {};
const history = read("history.json");
const users = read("users.json");

// Guard: never let an empty or broken dump overwrite good backups. This is the classic way automated
// backups quietly destroy themselves — the dump fails, writes nothing, and the good copies age out.
// A genuine mass-delete can still be recorded by running the workflow by hand (FORCE=1).
fs.mkdirSync(outDir, { recursive: true });
const previous = fs.readdirSync(outDir)
  .filter((f) => /^backup-\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .filter((f) => f !== `backup-${stamp}.json`)
  .pop();

if (previous && process.env.FORCE !== "1") {
  const was = (JSON.parse(fs.readFileSync(path.join(outDir, previous), "utf8")).products || []).length;
  const now = products.length;
  if (was > 0 && now === 0)
    fail(`refusing to write 0 products when ${previous} had ${was}. The dump looks broken.`);
  if (was >= 10 && now < was * 0.5)
    fail(`product count fell ${was} → ${now} (more than half gone). Refusing to overwrite. If this is a real deletion, re-run the workflow manually.`);
}
function fail(msg) { console.error(`::error::${msg}`); process.exit(1); }

const out = {
  ...settings, products, history, users,
  exportedAt: new Date().toISOString(),
  counts: { products: products.length, history: history.length, users: users.length },
};
// write to a temp file then rename, so an interrupted run cannot leave a half-written backup
const dest = path.join(outDir, `backup-${stamp}.json`);
fs.writeFileSync(dest + ".tmp", JSON.stringify(out, null, 1));
fs.renameSync(dest + ".tmp", dest);
console.log(`products: ${products.length}  history: ${history.length}  users: ${users.length}`);
