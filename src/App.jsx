import { useState, useEffect, useMemo, useRef } from "react";
import { FIELDS, DEFAULT_REQUIRED } from "./config/fields.js";
import { DEFAULT_CATEGORIES, DEFAULT_MATERIALS, DEFAULT_COLOURS, DEFAULT_SKU } from "./config/taxonomy.js";
import { DEFAULT_AI } from "./lib/ai.js";
import { uid, emptyProduct } from "./lib/util.js";
import { uniqueCode } from "./lib/sku.js";
import * as store from "./lib/storage.js";
import CatalogueView from "./components/CatalogueView.jsx";
import EditView from "./components/EditView.jsx";
import StudioView from "./components/StudioView.jsx";
import MatchView from "./components/MatchView.jsx";
import BrandsView from "./components/BrandsView.jsx";
import LegendView from "./components/LegendView.jsx";
import ExportView from "./components/ExportView.jsx";
import HelpView from "./components/HelpView.jsx";
import HistoryView from "./components/HistoryView.jsx";
import Presence from "./components/Presence.jsx";
import LoginView from "./components/LoginView.jsx";

const DEFAULT_BRANDS = [{ id: "b_yselle", name: "Yselle", code: "YS", hsn: "42022910", gst: "0.18", warranty: "domestic 6months", care: "Wipe with clean & dry cloth." }];
// which fields changed between two versions of a product (for the history log)
const diffFields = (a, b) => FIELDS.filter((f) => !["computed", "date"].includes(f.type) && String(a?.[f.key] ?? "") !== String(b?.[f.key] ?? "")).map((f) => f.label).concat(["categoryCode", "styleNo", "name"].filter((k) => String(a?.[k] ?? "") !== String(b?.[k] ?? "")));

export default function App() {
  const [brands, setBrands] = useState(DEFAULT_BRANDS);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [colours, setColours] = useState(DEFAULT_COLOURS);
  const [skuConfig, setSkuConfig] = useState(DEFAULT_SKU);
  const [exportPrefs, setExportPrefs] = useState({ fields: FIELDS.map((f) => f.key), directLinks: true, market: "ours" });
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI);
  const [requiredFields, setRequiredFields] = useState(DEFAULT_REQUIRED);
  const [customFormats, setCustomFormats] = useState([]);
  const [history, setHistory] = useState([]);
  const [who, setWhoState] = useState(store.getWho());
  const [presence, setPresence] = useState([]);
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [needPw, setNeedPw] = useState(() => ["invite", "recovery"].includes(store.initialLinkType));
  const [tab, setTab] = useState("catalogue");
  const [editing, setEditing] = useState(null);
  const [studioProduct, setStudioProduct] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [q, setQ] = useState("");
  const myKey = useRef(uid());
  const lastSavedSettings = useRef("");
  const whoRef = useRef(who); whoRef.current = who;
  const emailRef = useRef("");

  const ctx = useMemo(() => ({ brands, colours, materials, categories, skuConfig, requiredFields }), [brands, colours, materials, categories, skuConfig, requiredFields]);
  const say = (m) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const setWho = (n) => { store.setWho(n); setWhoState(n); store.updatePresence({ key: myKey.current, name: n, tab, sku: editing?.sku || "" }); };
  const applySettings = (s) => { if (!s) return; s.brands && setBrands(s.brands); s.categories && setCategories(s.categories); s.materials && setMaterials(s.materials); s.colours && setColours(s.colours); s.skuConfig && setSkuConfig(s.skuConfig); s.exportPrefs && setExportPrefs(s.exportPrefs); s.requiredFields && setRequiredFields(s.requiredFields); s.customFormats && setCustomFormats(s.customFormats); lastSavedSettings.current = JSON.stringify(store.pickSettings({ ...s })); };
  const logIt = (action, sku, detail) => { const e = { who: (whoRef.current || "unknown") + (emailRef.current ? " <" + emailRef.current + ">" : ""), action, sku: sku || "", detail: detail || {} }; store.log(e).then((saved) => { if (!store.usingSupabase) setHistory((h) => [saved || { at: new Date().toISOString(), ...e }, ...h]); }).catch(console.error); };

  // ---- login gate (Supabase mode only) ----
  useEffect(() => { if (!store.usingSupabase) { setSession(null); return; } store.auth.session().then(setSession); return store.auth.onChange((s, e) => { setSession(s); if (e === "PASSWORD_RECOVERY") setNeedPw(true); }); }, []);
  const email = session?.user?.email || ""; emailRef.current = email;
  useEffect(() => { if (email && !store.getWho()) setWho(email.split("@")[0]); }, [email]);
  const signOut = () => store.auth.signOut();

  // ---- load once, then subscribe to live changes ----
  useEffect(() => { if (session === undefined || (store.usingSupabase && !session)) return; let un = () => {}; (async () => {
    try {
      const { settings, products: ps, history: hi } = await store.loadAll();
      applySettings(settings); setProducts(ps || []); setHistory(hi || []);
    } catch (e) { console.error(e); say("Could not load data: " + (e.message || e)); }
    const ai = store.loadLocalAi(); if (ai) setAiSettings({ ...DEFAULT_AI, ...ai });
    setLoaded(true);
    un = store.subscribe({
      onProduct: (p) => p && setProducts((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p])),
      onProductDelete: (id) => id && setProducts((ps) => ps.filter((x) => x.id !== id)),
      onSettings: (s) => { const j = JSON.stringify(store.pickSettings(s || {})); if (j !== lastSavedSettings.current) applySettings(s); },
      onHistory: (h) => setHistory((hs) => [h, ...hs].slice(0, 2000)),
      onPresence: setPresence,
    }, { key: myKey.current, name: store.getWho() || "unnamed", tab: "catalogue", sku: "" });
  })(); return () => un(); }, [session === undefined || (store.usingSupabase && !session)]);
  // ---- settings autosave (brands, codes, rules, export prefs) ----
  useEffect(() => { if (!loaded) return; const s = { brands, categories, materials, colours, skuConfig, exportPrefs, requiredFields, customFormats }; const j = JSON.stringify(s); if (j === lastSavedSettings.current) return;
    const t = setTimeout(async () => { const prev = lastSavedSettings.current ? JSON.parse(lastSavedSettings.current) : {}; const changed = Object.keys(s).filter((k) => JSON.stringify(s[k]) !== JSON.stringify(prev[k])); lastSavedSettings.current = j; try { await store.saveSettings(s, whoRef.current); if (changed.length && changed.some((k) => k !== "exportPrefs")) logIt("settings", "", { changed }); } catch (e) { say("Save failed: " + e.message); } }, 700);
    return () => clearTimeout(t); }, [brands, categories, materials, colours, skuConfig, exportPrefs, requiredFields, customFormats, loaded]);
  useEffect(() => { if (loaded) store.saveLocalAi(aiSettings); }, [aiSettings, loaded]);
  useEffect(() => { store.updatePresence({ key: myKey.current, name: who || "unnamed", tab, sku: tab === "edit" ? editing?.sku || "(new)" : "" }); }, [tab, editing?.sku, who]);

  // ---- colour registry ----
  const registerColours = (items) => setColours((cs) => {
    const out = [...cs];
    items.forEach((it) => { const name = (typeof it === "string" ? it : it?.name || "").trim(); if (!name) return; if (out.some((c) => c.name.toLowerCase() === name.toLowerCase())) return; const wanted = typeof it === "object" && it.code && !out.some((c) => c.code === it.code) ? it.code : null; out.push({ name, code: wanted || uniqueCode(name, out.map((c) => c.code)) }); });
    return out;
  });

  // ---- product actions (each one saved immediately + logged) ----
  const persist = async (fn, okMsg) => { try { await fn(); if (okMsg) say(okMsg); } catch (e) { console.error(e); say("Save failed: " + (e.message || e)); } };
  const upsertProduct = (p0) => {
    const now = new Date().toISOString(); const p = { ...p0, updatedAt: now, createdAt: p0.createdAt || now, source: p0.source || "manual" };
    const prev = products.find((x) => x.id === p.id); registerColours([p.colour]);
    setProducts((ps) => (prev ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
    persist(() => store.upsertProducts([p], who)); logIt(prev ? "edit" : "add", p.sku, prev ? { fields: diffFields(prev, p) } : { name: p.name || p.contents });
  };
  const addProducts = (out, updates) => {
    setProducts((ps) => { const upd = new Map(updates.map((u) => [u.id, u])); return [...ps.map((x) => upd.get(x.id) || x), ...out]; });
    persist(() => store.upsertProducts([...out, ...updates], who));
    if (out.length) logIt("import", "", { added: out.length, skus: out.slice(0, 20).map((p) => p.sku) });
    if (updates.length) logIt("import-update", "", { updated: updates.length, skus: updates.slice(0, 20).map((p) => p.sku) });
  };
  const remove = (id) => { const p = products.find((x) => x.id === id); if (!p || !confirm(`Delete ${p.sku || "this product"}?`)) return; setProducts((ps) => ps.filter((x) => x.id !== id)); persist(() => store.deleteProducts([id])); logIt("delete", p.sku, { name: p.name || p.contents }); };
  const removeMany = (ids) => { const list = products.filter((p) => ids.includes(p.id)); if (!list.length) return; if (!confirm(`Delete ${list.length} product${list.length > 1 ? "s" : ""}? This cannot be undone (History keeps a record).`)) return; setProducts((ps) => ps.filter((x) => !ids.includes(x.id))); persist(() => store.deleteProducts(ids), `Deleted ${list.length}`); logIt("delete", "", { count: list.length, skus: list.slice(0, 30).map((p) => p.sku) }); };
  const clearProducts = () => { const ids = products.map((p) => p.id); setProducts([]); persist(() => store.deleteProducts(ids)); logIt("delete-all", "", { count: ids.length }); };
  const restoreAll = (s) => { applySettings(s); const list = s.products || []; setProducts(list); persist(() => store.replaceAllProducts(list, who), "Backup restored"); logIt("restore", "", { products: list.length, from: s.exportedAt || "" }); };
  // Called by the image studio after a photo is uploaded to Storage: writes the permanent URL into
  // the right imageUrl field, and uses the first image as the catalogue thumbnail too.
  const applyImage = (id, field, url, thumb) => {
    const p = products.find((x) => x.id === id); if (!p) return;
    const np = { ...p, [field]: url, ...(thumb ? { thumb } : {}), updatedAt: new Date().toISOString() };
    setProducts((ps) => ps.map((x) => (x.id === id ? np : x)));
    persist(() => store.upsertProducts([np], who));
    logIt("edit", p.sku, { fields: [field] });
  };
  const applyThumb = (id, thumb) => { const p = products.find((x) => x.id === id); if (!p) return; const np = { ...p, thumb, updatedAt: new Date().toISOString() }; setProducts((ps) => ps.map((x) => (x.id === id ? np : x))); persist(() => store.upsertProducts([np], who), "Thumbnail updated"); logIt("thumb", p.sku, {}); };

  const startNew = () => { setEditing(emptyProduct(brands[0])); setTab("edit"); };
  const startEdit = (p) => { setEditing({ ...p }); setTab("edit"); };
  const duplicate = (p) => { setEditing({ ...p, id: uid(), colour: "", sku: "", skuLocked: false, thumb: "", imageUrl: "", imageUrl2: "", imageUrl3: "", imageUrl4: "", imageUrl5: "", createdAt: "", updatedAt: "" }); setTab("edit"); };
  const openStudio = (p) => { setStudioProduct(p); setTab("studio"); };

  const dupSkus = useMemo(() => { const seen = {}; products.forEach((p) => { if (p.sku) seen[p.sku] = (seen[p.sku] || 0) + 1; }); return new Set(Object.keys(seen).filter((k) => seen[k] > 1)); }, [products]);
  const visible = products.filter((p) => (filterBrand === "all" || p.brandId === filterBrand) && (!q || [p.name, p.sku, p.colour, p.contents, p.about].join(" ").toLowerCase().includes(q.toLowerCase())));
  const othersEditing = presence.filter((x) => x.key !== myKey.current && x.sku && x.sku !== "(new)").map((x) => x.sku);

  const TABS = [["catalogue", "Catalogue"], ["edit", editing && products.some((x) => x.id === editing.id) ? "Edit product" : "Add product"], ["studio", "Image studio"], ["match", "Match photos"], ["brands", "Brands & SKU rules"], ["legend", "SKU guide"], ["export", "Export / Import"], ["history", "History"], ["help", "Help"]];

  if (session === undefined) return <div className="cs" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}><div className="note">Loading…</div></div>;
  if (store.usingSupabase && (!session || needPw)) return <LoginView onDone={() => { history.replaceState(null, "", window.location.pathname + window.location.search); setNeedPw(false); store.auth.session().then(setSession); }} />;

  return (
    <div className="cs">
      <header className="top">
        <div><h1>Catalogue Studio</h1><div className="sub">{brands.length} brand{brands.length !== 1 && "s"} · {products.length} products · {dupSkus.size ? <span style={{ color: "var(--ox)" }}>{dupSkus.size} duplicate SKU{dupSkus.size > 1 && "s"} to fix</span> : "all SKUs unique"} · {store.usingSupabase ? "shared live via Supabase" : "saved on this device"}</div></div>
        <Presence {...{ presence, myKey: myKey.current, who, setWho, email, signOut }} />
        <nav className="tabs">{TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => { if (k === "edit" && !editing) startNew(); else setTab(k); }}>{l}</button>)}</nav>
      </header>
      {!who && loaded && <div style={{ background: "#FBEAEA", borderBottom: "1px solid #E6B8B8", padding: "8px 24px", fontSize: 13 }}>Please enter your name (top right) so the history shows who made each change.</div>}
      <main className="wrap">
        {tab === "catalogue" && <CatalogueView {...{ products: visible, brands, dupSkus, filterBrand, setFilterBrand, q, setQ, startNew, startEdit, duplicate, remove, removeMany, openStudio, othersEditing, requiredFields }} />}
        {tab === "edit" && editing && <EditView {...{ product: editing, setProduct: setEditing, products, brands, categories, materials, colours, skuConfig, ctx, aiSettings, othersEditing, requiredFields, onSave: (p) => { upsertProduct(p); say("Saved " + p.sku); setTab("catalogue"); }, onCancel: () => setTab("catalogue"), openStudio, say }} />}
        {tab === "match" && <MatchView {...{ products, brands, onApplyImage: applyImage, say }} />}
        {tab === "studio" && <StudioView {...{ products, product: studioProduct, setProduct: setStudioProduct, aiSettings, setAiSettings, onApplyThumb: applyThumb, onApplyImage: applyImage, say }} />}
        {tab === "brands" && <BrandsView {...{ brands, setBrands, categories, setCategories, materials, setMaterials, colours, setColours, skuConfig, setSkuConfig, requiredFields, setRequiredFields, say }} />}
        {tab === "legend" && <LegendView {...{ ctx, products }} />}
        {tab === "export" && <ExportView {...{ products, brands, setBrands, ctx, setCategories, setMaterials, exportPrefs, setExportPrefs, registerColours, addProducts, clearProducts, restoreAll, customFormats, setCustomFormats, say }} />}
        {tab === "history" && <HistoryView {...{ history, products, startEdit }} />}
        {tab === "help" && <HelpView {...{ aiSettings, setAiSettings, goTo: setTab, email, say }} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
