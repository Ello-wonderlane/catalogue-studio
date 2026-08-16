# Catalogue Studio

A catalogue management tool for fashion / accessories brands: multiple brands, auto-generated SKU codes, a fashion category tree, pricing, an on-device image studio (background removal + prompt-driven backdrops, single or bulk), Excel import/export in your own template or Amazon / Flipkart / Myntra style, a SKU legend, a data health check and JSON backups.

Everything runs in the browser. No server, no database, no paid AI required.

---

## 1. Project layout — where things live (so errors are easy to find)

```
catalogue-studio/
├─ index.html                 page shell
├─ package.json               dependencies + scripts (npm run dev / build)
├─ vite.config.js             build settings (base './' = works on GitHub Pages)
├─ .github/workflows/deploy.yml   auto-publish to GitHub Pages on every push
└─ src/
   ├─ main.jsx                boots React
   ├─ App.jsx                 top-level state, tabs, save/load
   ├─ styles.css              colours, fonts, layout
   ├─ config/
   │  ├─ fields.js            THE COLUMN LIST (Excel headers), gender codes, marketplace templates
   │  └─ taxonomy.js          default categories by department, material codes, colour codes, SKU rule
   ├─ lib/
   │  ├─ sku.js               SKU build / decode, conflict-free code generator, image-link helpers
   │  ├─ image.js             background removal, backdrop, compositing (browser only)
   │  ├─ ai.js                optional AI: Ollama (free, local), Stable Diffusion (free, local), Claude API (key)
   │  ├─ storage.js           saves to localStorage
   │  └─ util.js              small helpers
   └─ components/
      ├─ CatalogueView.jsx    product table
      ├─ EditView.jsx         add / edit product form + live SKU ticket
      ├─ StudioView.jsx       image studio (single + bulk)
      ├─ BrandsView.jsx       brands, SKU rule, category/material/colour code lists
      ├─ LegendView.jsx       "how to read a SKU" + decoder
      ├─ ExportView.jsx       Excel export/import, health check, JSON backup
      ├─ HelpView.jsx         in-app tutorial + AI setup
      └─ SkuTicket.jsx        the SKU display block
```

Rule of thumb when something looks wrong:
| Symptom | Look in |
|---|---|
| Wrong / missing column in Excel or the form | `src/config/fields.js` |
| Wrong SKU letters, decode fails, code clash | `src/lib/sku.js`, `src/config/taxonomy.js` |
| Background removal / backdrop looks off | `src/lib/image.js` |
| AI button errors | `src/lib/ai.js` and Help → AI setup in the app |
| Export layout / marketplace headers | `src/config/fields.js` (MARKETPLACES) and `src/components/ExportView.jsx` |
| Data disappeared | Data is per browser. Restore a JSON backup (Export / Import tab). |

---

## 2. Run it on your computer (one time, ~10 minutes)

1. Install **Node.js LTS** from https://nodejs.org (includes `npm`). Install **Git** from https://git-scm.com.
2. Unzip this project. Open a terminal / PowerShell **inside the folder** (the one containing `package.json`).
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
4. Open the address it prints (usually http://localhost:5173). Go to **Export / Import → Import existing sheet** and drop your catalogue .xlsx. Done.

`npm run build` creates a `dist/` folder — a plain static website you can put anywhere.

---

## 3. Put the code on GitHub (step by step)

1. Create a free account at https://github.com if you don't have one.
2. Top-right **+ → New repository**. Name: `catalogue-studio`. Keep it **Private** (your business data/logic) unless you want it public. **Do not** tick "Add a README" (we already have one). Create.
3. GitHub shows commands — in your project folder run:
   ```bash
   git init
   git add .
   git commit -m "Catalogue Studio – first version"
   git branch -M main
   git remote add origin https://github.com/<your-username>/catalogue-studio.git
   git push -u origin main
   ```
   (Git will ask you to sign in the first time — use your GitHub login / a personal access token when prompted.)
4. Refresh the repository page: all files are there. From now on every change is recorded with who/when/what.

**Making a change later (e.g. add a column):**
```bash
# edit src/config/fields.js, save
git add .
git commit -m "Add Size chart column"
git push
```

**Keeping data with the code (optional but recommended):** create a `data/` folder in the repo and commit your JSON backups (`Export / Import → Download backup`) there. Git history then doubles as an audit trail of the catalogue.

---

## 4. Take it live (free hosting on GitHub Pages)

The repository already contains `.github/workflows/deploy.yml`, which builds and publishes automatically.

1. Push the code (section 3).
2. On GitHub: repository → **Settings → Pages**.
3. Under **Build and deployment → Source** choose **GitHub Actions**. Save.
4. Go to the **Actions** tab — a "Deploy to GitHub Pages" run appears. When it's green (1–2 min), the site is live at:
   `https://<your-username>.github.io/catalogue-studio/`
5. Every future `git push` to `main` re-publishes.

Notes
- Private repos need GitHub Pro for Pages, or make the repository public (the code has no secrets; your product data lives only in each user's browser + your backups). Alternative free hosts that work with private repos: **Netlify** or **Vercel** — sign in with GitHub, "Import project", build command `npm run build`, output `dist`. Same result.
- The live site stores data in each visitor's browser. Team members share data via **JSON backup / restore** or the Excel export.

---

## 4b. Shared data + live collaboration with Supabase (optional, free tier)

Version 3 stores each product as its own row, keeps an edit history and shows who is online. **If you set up Supabase with an earlier version, run `supabase/setup.sql` again** (SQL Editor → paste → Run) — it creates the new tables and the app moves your existing data across automatically on first load.

1. supabase.com → New project → wait for it to be ready.
2. SQL Editor → New query → paste the contents of `supabase/setup.sql` → Run.
3. Project Settings → API → copy **Project URL** and **anon public** key.
4. In the project folder copy `.env.example` to `.env` and paste both values. Restart `npm run dev`. The header now says "shared via Supabase".
5. For the live site: GitHub repo → Settings → Secrets and variables → Actions → New repository secret: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Push again; the build picks them up.
Everyone opening the site now sees and edits the same catalogue. Last save wins, so avoid two people editing the same product at the same moment. API keys for AI stay in each person's browser and are never sent to Supabase.

## 4c. Login (v4) — only invited people can open the catalogue

One-time setup, ~5 minutes:
1. Supabase → **SQL Editor** → run `supabase/setup.sql` again (adds the login rules; the owner `wonderlane.global@gmail.com` is pre-listed).
2. Supabase → **Authentication → URL Configuration**: Site URL = `https://ello-wonderlane.github.io/catalogue-studio/` and add the same to Redirect URLs. Save.
3. Supabase → **Authentication → Sign In / Providers → Email**: keep Email enabled; turn **off** "Allow new users to sign up" (so only invited people can register). Save.
4. Supabase → **Authentication → Users → Add user → Send invitation** to `wonderlane.global@gmail.com`. Open the email → click the link → the site opens and asks you to choose a password → done.
5. Push the code (commit + Sync). The live site now shows a sign-in screen.

Adding a teammate later (owner only): Help tab → Team access → add their email → then Supabase → Authentication → Users → Invite user. Removing them from Team access blocks them immediately.

## 4d. Watchdog (v4) — automatic health checks
`.github/workflows/healthcheck.yml` runs every hour: live site up, Supabase up, code builds. On failure it opens a GitHub Issue and GitHub emails the owner. On Sundays it also stores a JSON backup of the whole catalogue in `data/` — for that, add one more repository secret **SUPABASE_SERVICE_ROLE_KEY** (Supabase → Project Settings → API Keys → service_role; never put this in the app). Run it manually any time from Actions → Health check → Run workflow.

## 5. Optional free AI on your own PC

- **Text drafting (product copy):** install **Ollama** (https://ollama.com), then `ollama pull llama3.2` and start it with CORS allowed so the browser may call it:
  - macOS/Linux: `OLLAMA_ORIGINS=* ollama serve`
  - Windows (PowerShell): `$env:OLLAMA_ORIGINS="*"; ollama serve`
  In the app: Help → AI setup → Text drafting: Ollama.
- **Photoreal backdrops:** install **Stable Diffusion WebUI** (AUTOMATIC1111 or Forge) and start it with `--api --cors-allow-origins=*`. In the app: Help → Backdrop engine: Local Stable Diffusion.
- **Claude API** (paid, optional): paste a key in Help → AI setup. Used only from your browser.

Without any of these the app still does everything, using the built-in "instant" backdrop.

---

## 6. Everyday use (short version — the full tutorial is the **Help** tab in the app)

- **Bulk add from Excel:** Export / Import → Download blank template → fill → Import (mode "Add new only" appends and never replaces; "Add + update" overwrites matching SKUs). Blank SKUs are generated on import.
- **Team:** enter your name in the header; the History tab lists every change with name/time; presence chips show who is online and which SKU they are editing.
- **Freshness:** Catalogue shows Added / Updated dates, a "new" badge for the last 7 days, and filters (Added today / 7 days / 30 days / since date) plus sorting.
- **Add one product:** Catalogue → + Add product. SKU builds itself; save is blocked on duplicates.
- **New colourway:** Catalogue → New colourway on a row.
- **New category / colour / material / brand:** Brands & SKU rules. Codes must be unique; use "Suggest code".
- **Images:** Image studio (single or bulk) → download → host → paste link.
- **Export:** Export / Import → format + columns → Download .xlsx (includes a SKU Legend sheet).
- **Before every export:** Data health check should read "All clear". Then Download backup.
