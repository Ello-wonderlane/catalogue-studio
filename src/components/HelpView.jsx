import { useState, Fragment } from "react";
import UsersPanel from "./UsersPanel.jsx";

// The in-app manual. Plain steps, written for a colleague who has never seen the tool.
const SECTIONS = [
  {
    id: "start", title: "1. First 10 minutes",
    body: [
      ["Import what you already have", "Export / Import → Import existing sheet → choose your catalogue .xlsx. Brands, categories, materials and colour codes are created from the sheet and every SKU is kept exactly as written. Nothing is typed twice."],
      ["Check the rules", "Brands & SKU rules → confirm brand codes, the SKU block order, and skim the colour list. Rename any category the import called “Category XX (rename me)”."],
      ["Run the health check", "Export / Import → Data health check tells you what's missing (images, prices, duplicate codes). Fix, then download a JSON backup."],
    ],
  },
  {
    id: "product", title: "2. Add a product (manual)",
    body: [
      ["Open the form", "Catalogue → + Add product (or the Add product tab)."],
      ["Pick brand → department → category", "Brand fills HSN, GST, warranty and care. Department narrows the category list (Bags, Women, Men, Kids, Footwear, Accessories). Category and colour drive the SKU."],
      ["Watch the SKU ticket", "The right-hand ticket builds the code live: brand · gender · category · style no. · material · colour. Style no. is assigned automatically (next free number for that brand + category). Tick manual only if you must type a code by hand."],
      ["Fill the rest, draft copy if you like", "Prices (landing, MRP, selling — margin is calculated), dimensions, features. ✦ Draft with AI writes the description and features from what you've entered — always review it."],
      ["System vs manual SKUs", "SKUs built by the rule are plain; SKUs that were typed (manual tick) or imported from a sheet carry a grey 'manual' badge in the Catalogue (filter: SKU source) and a 'SKU source' column in exports. The generator always checks against every existing SKU — manual, imported or system — so it never re-uses one; on import it moves to the next free style number automatically."],
      ["Save", "Save is blocked if the SKU already exists. Use “use next style no.” or change the colour. New colour names get a permanent unique code automatically."],
      ["New colourway of an existing style", "Catalogue → New colourway on the row. Everything is copied except colour, image and SKU; type the colour and the SKU completes itself with the same style number."],
    ],
  },
  {
    id: "bulk", title: "3. Add many products from Excel (bulk)",
    body: [
      ["Get the template", "Export / Import → Download blank template. It has every column (incl. Landing/MRP/Selling price) plus three helper columns: Department, Category code, Style no. The other sheets list valid Categories, Colours, Materials and a How-to-fill guide."],
      ["Fill it", "One row per product/colourway. Leave Merchant SKU Code EMPTY for new products — it is generated on import from brand + gender + category + style no. + material + colour. Paste an existing SKU only to keep it. Delete the example row."],
      ["Import — nothing gets replaced", "Export / Import → Import mode → 'Add new only' appends new rows and skips SKUs already present. Re-import the same file any time; you never get duplicates. Choose 'Add + update' only when you deliberately want the sheet's values (e.g. new prices) to overwrite matching SKUs."],
      ["Then", "Catalogue shows the new rows with a green 'new' badge; filter 'Added last 7 days' or sort 'Newest added first' to review them. Health check → fix → backup."],
    ],
  },
  {
    id: "codes", title: "4. Add a category, colour, material, brand, or column",
    body: [
      ["Category / sub-category", "Brands & SKU rules → Categories: choose department, type a code (or Suggest code) and name → Add. Codes must be unique across all departments; the app refuses a clash."],
      ["Colour", "Type it in any product — it's registered with a free 2-letter code. Or add it in Colour codes with your own code (Black BK, Blue BU, Beige BG… no two colours share a code)."],
      ["Material", "Material codes list, single letter (P = PU, L = Leather)."],
      ["Brand (e.g. a new label you launch)", "Brands & SKU rules → the Brands table has an empty last row: type the name, a 2-letter code, default HSN/GST/warranty/care → Add brand. From then on it appears in the Brand dropdown, gets its own SKU prefix, its own style numbering, and can be exported on its own (Export → Scope)."],
      ["A new column in the sheet", "That's a code change: open src/config/fields.js and add one line to FIELDS. It appears in the form, table, export picker and import automatically. Commit and push — the site rebuilds."],
      ["Change the SKU pattern", "Brands & SKU rules → SKU rule: tick/untick blocks, reorder with ↑↓, set a separator or digit count. Existing SKUs don't change; new ones follow the new rule."],
    ],
  },
  {
    id: "images", title: "5. Images and backgrounds",
    body: [
      ["Single", "Image studio → upload → Remove background (on-device) → prompt → ✦ Add background → download → upload to your image host → paste the file link into Image URL."],
      ["A video per product", "Video URL field (Identity group): paste an unlisted YouTube link, a Drive file link, or a direct .mp4 link from your image host. It exports as its own column and maps to the marketplace video field where one exists (marketplaces usually want a direct .mp4 under ~100 MB, 1080p, 15–60 s)."],
      ["Several images per product", "Each product has Image URL 1–5 (main + four more angles). Process each photo in the studio (or in bulk, named SKU.jpg, SKU-2.jpg …), host them, paste each link. Exports carry all five; marketplace formats map them to main/other image columns."],
      ["Bulk", "Image studio → Bulk tab → select many photos named after their SKU (YSWHA0154PCB.jpg) → one prompt → Process → Download all → Set thumbnails by SKU."],
      ["Which engine", "Instant = free, offline, gradient/stone/wood looks. Local = free photoreal via Stable Diffusion running on your PC. Claude API = illustrated backdrops, needs a paid API key (optional). Set below in AI setup."],
      ["Which link", "One file per SKU, named after the SKU, on a link that never changes: Drive file link set to “anyone with link” (export converts to a direct link), or Cloudflare R2 / Backblaze B2 for marketplace-safe CDN links. Never a folder link."],
    ],
  },
  {
    id: "export", title: "6. Export for a marketplace or a buyer",
    body: [
      ["Choose", "Export / Import → scope (all or one brand) → format (your template / Amazon / Flipkart / Myntra) → tick the columns you want → Download .xlsx."],
      ["What's inside", "Sheet 1 Catalog (image cells clickable, header filters). Sheet 2 SKU Legend so the receiver can decode any code. Marketplace formats mirror the platform's flat file — paste into the latest template from the seller portal."],
    ],
  },
  {
    id: "team", title: "7. Working as a team (live)",
    body: [
      ["Login", "Everyone signs in with their invited email (password, or a one-time email link). Only people on the Team access list (Help → right column) can get in; the owner adds/removes them and invites them in Supabase → Authentication → Users → Invite user."],
      ["Your name", "Type it once in the header box (top right). It is remembered on this browser and, together with your login email, stamped on every change you make."],
      ["Who is online", "Coloured chips next to your name show teammates currently on the site, which tab they are on and which SKU they are editing. In the Catalogue, that row shows a red 'being edited' badge; the edit form warns you too."],
      ["Simultaneous edits", "Everyone can work at the same time — each product is saved separately, so two people editing two different products never overwrite each other. If two people edit the same product, the last save wins, which is why the badge is there."],
      ["Live updates", "Adds, edits, imports and settings changes appear on everyone's screen within a second or two, no refresh needed."],
      ["History tab", "Every add / edit (with the list of changed fields) / delete / import / restore / settings change, with time and name. Filter by person, action or SKU, open the product from the row, or export the log as CSV to review the team's work."],
    ],
  },
  {
    id: "safety", title: "8. Keeping data safe & finding errors",
    body: [
      ["Where data lives", "In this browser (localStorage). Different device or browser = empty catalogue until you restore a backup."],
      ["Backup habit", "Export / Import → Download backup (JSON) after every session. Commit it to your GitHub repo under data/ so history is kept — you can always see who changed what and roll back."],
      ["Health check", "The list at Export / Import → Data health check is your error detector: duplicate SKUs, folder links, missing prices, unknown category codes, code clashes. Aim for “All clear” before every export."],
      ["SKU guide", "Anyone can paste a code into SKU guide → Decode to see what it means. If it says “doesn't match”, the code was typed by hand or uses a retired rule."],
    ],
  },
  {
    id: "github", title: "9. Code on GitHub & going live (summary — full steps in README.md)",
    body: [
      ["One-time", "Install Node.js LTS + Git → create a GitHub repository → in the project folder: npm install → git init → git add . → git commit → git remote add origin … → git push."],
      ["Publish", "Repo → Settings → Pages → Source: GitHub Actions. The included workflow builds and publishes on every push. Your site: https://<username>.github.io/<repo>/"],
      ["Update", "Edit files (e.g. add a field) → git add . → git commit -m \"add size chart column\" → git push. Two minutes later the live site is updated. Every change is recorded, so mistakes are easy to trace and undo."],
    ],
  },
];

export default function HelpView({ aiSettings, setAiSettings, goTo, email, say }) {
  const [open, setOpen] = useState("start");
  const set = (k, v) => setAiSettings({ ...aiSettings, [k]: v });
  return (
    <div className="grid2" style={{ gridTemplateColumns: "1fr 380px", alignItems: "start" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div className="panel"><h2 style={{ fontSize: 22, marginBottom: 4 }}>How to use Catalogue Studio</h2><div className="note">Click a section. Everything a new team member needs to add, update and export the catalogue.</div></div>
        {SECTIONS.map((s) => (
          <div className="panel" key={s.id} style={{ padding: 0 }}>
            <button onClick={() => setOpen(open === s.id ? "" : s.id)} style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", padding: "14px 18px", boxSizing: "border-box", fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 600 }}>{s.title}<span style={{ marginLeft: "auto", color: "var(--muted)" }}>{open === s.id ? "−" : "+"}</span></button>
            {open === s.id && <div style={{ padding: "0 18px 16px" }} className="legend">{s.body.map(([k, v]) => <Fragment key={k}><b>{k}</b><span style={{ lineHeight: 1.55 }}>{v}</span></Fragment>)}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 14, position: "sticky", top: 84 }}>
        <div className="panel">
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>AI setup (all optional)</h3>
          <div className="note" style={{ marginBottom: 10 }}>The tool works fully without AI. Turn these on only if you want copy drafting or richer backdrops.</div>
          <div className="field"><label>Text drafting</label>
            <select value={aiSettings.textProvider} onChange={(e) => set("textProvider", e.target.value)}><option value="ollama">Ollama — free local LLM on this PC</option><option value="claude">Claude API — paid key</option></select></div>
          {aiSettings.textProvider === "ollama" ? (<>
            <div className="field"><label>Ollama URL</label><input value={aiSettings.ollamaUrl} onChange={(e) => set("ollamaUrl", e.target.value)} /></div>
            <div className="field"><label>Model</label><input value={aiSettings.ollamaModel} onChange={(e) => set("ollamaModel", e.target.value)} placeholder="llama3.2" /></div>
            <div className="note">Install from ollama.com, then run <span className="mono">ollama pull llama3.2</span>. Start it with <span className="mono">OLLAMA_ORIGINS=* ollama serve</span> so the browser may call it. Free, offline.</div>
          </>) : (<>
            <div className="field"><label>Anthropic API key</label><input type="password" value={aiSettings.anthropicKey} onChange={(e) => set("anthropicKey", e.target.value)} placeholder="sk-ant-…" /></div>
            <div className="note">Stored only in this browser. Pay-per-use; used for text drafting and the Claude backdrop engine.</div>
          </>)}
          <div className="field" style={{ marginTop: 10 }}><label>Backdrop engine</label>
            <select value={aiSettings.engine} onChange={(e) => set("engine", e.target.value)}><option value="instant">Instant offline (free)</option><option value="local">Local Stable Diffusion (free)</option><option value="claude">Claude API (paid key)</option></select></div>
          {aiSettings.engine === "local" && <div className="field"><label>Stable Diffusion WebUI URL</label><input value={aiSettings.endpoint} onChange={(e) => set("endpoint", e.target.value)} /><div className="note" style={{ marginTop: 4 }}>AUTOMATIC1111 / Forge started with <span className="mono">--api --cors-allow-origins=*</span>.</div></div>}
        </div>
        <UsersPanel me={email} say={say} />
        <div className="panel">
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Quick jumps</h3>
          <div className="row"><button className="btn small" onClick={() => goTo("export")}>Import a sheet</button><button className="btn small" onClick={() => goTo("brands")}>Codes & SKU rule</button><button className="btn small" onClick={() => goTo("legend")}>Decode a SKU</button><button className="btn small" onClick={() => goTo("studio")}>Image studio</button></div>
        </div>
      </div>
    </div>
  );
}
