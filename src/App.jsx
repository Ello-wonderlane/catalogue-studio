import { useState, useEffect, useMemo } from "react";
import { FIELDS } from "./config/fields.js";
import { DEFAULT_CATEGORIES, DEFAULT_MATERIALS, DEFAULT_COLOURS, DEFAULT_SKU } from "./config/taxonomy.js";
import { DEFAULT_AI } from "./lib/ai.js";
import { uid, emptyProduct } from "./lib/util.js";
import { uniqueCode } from "./lib/sku.js";
import { loadState, saveState, loadLocalAi, usingSupabase } from "./lib/storage.js";
import CatalogueView from "./components/CatalogueView.jsx";
import EditView from "./components/EditView.jsx";
import StudioView from "./components/StudioView.jsx";
import BrandsView from "./components/BrandsView.jsx";
import LegendView from "./components/LegendView.jsx";
import ExportView from "./components/ExportView.jsx";
import HelpView from "./components/HelpView.jsx";

export default function App() {
  const [brands, setBrands] = useState([{ id: "b_yselle", name: "Yselle", code: "YS", hsn: "42022910", gst: "0.18", warranty: "domestic 6months", care: "Wipe with clean & dry cloth." }]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [colours, setColours] = useState(DEFAULT_COLOURS);
  const [skuConfig, setSkuConfig] = useState(DEFAULT_SKU);
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI);
  const [exportPrefs, setExportPrefs] = useState({ fields: FIELDS.map((f) => f.key), directLinks: true, market: "ours" });
  const [tab, setTab] = useState("catalogue");
  const [editing, setEditing] = useState(null);
  const [studioProduct, setStudioProduct] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [q, setQ] = useState("");

  const ctx = useMemo(() => ({ brands, colours, materials, categories, skuConfig }), [brands, colours, materials, categories, skuConfig]);
  const say = (m) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  useEffect(() => { (async () => {
    const s = await loadState();
    if (s) { ["brands", "products", "categories", "materials", "colours", "skuConfig", "aiSettings", "exportPrefs"].forEach((k) => { if (s[k]) ({ brands: setBrands, products: setProducts, categories: setCategories, materials: setMaterials, colours: setColours, skuConfig: setSkuConfig, aiSettings: (v) => setAiSettings({ ...DEFAULT_AI, ...v }), exportPrefs: setExportPrefs })[k](s[k]); }); }
    const ai = loadLocalAi(); if (ai) setAiSettings({ ...DEFAULT_AI, ...ai });
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; const t = setTimeout(() => saveState({ brands, products, categories, materials, colours, skuConfig, aiSettings, exportPrefs }), 600); return () => clearTimeout(t); }, [brands, products, categories, materials, colours, skuConfig, aiSettings, exportPrefs, loaded]);

  // Learn new colours: give any unseen colour a permanent conflict-free code
  // Register colours that are new to the list. Accepts names ("Croco Black") or {name, code} to keep a legacy code from an imported sheet.
  const registerColours = (items) => setColours((cs) => {
    const out = [...cs];
    items.forEach((it) => {
      const name = (typeof it === "string" ? it : it?.name || "").trim(); if (!name) return;
      if (out.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
      const wanted = typeof it === "object" && it.code && !out.some((c) => c.code === it.code) ? it.code : null;
      out.push({ name, code: wanted || uniqueCode(name, out.map((c) => c.code)) });
    });
    return out;
  });
  const restoreAll = (s) => { s.brands && setBrands(s.brands); s.products && setProducts(s.products); s.categories && setCategories(s.categories); s.materials && setMaterials(s.materials); s.colours && setColours(s.colours); s.skuConfig && setSkuConfig(s.skuConfig); say("Backup restored"); };
  const upsertProduct = (p) => { registerColours([p.colour]); setProducts((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p])); };
  const startNew = () => { setEditing(emptyProduct(brands[0])); setTab("edit"); };
  const startEdit = (p) => { setEditing({ ...p }); setTab("edit"); };
  const duplicate = (p) => { setEditing({ ...p, id: uid(), colour: "", sku: "", skuLocked: false, thumb: "", imageUrl: "" }); setTab("edit"); };
  const remove = (id) => { if (confirm("Delete this product?")) setProducts((ps) => ps.filter((p) => p.id !== id)); };
  const openStudio = (p) => { setStudioProduct(p); setTab("studio"); };

  const dupSkus = useMemo(() => { const seen = {}; products.forEach((p) => { if (p.sku) seen[p.sku] = (seen[p.sku] || 0) + 1; }); return new Set(Object.keys(seen).filter((k) => seen[k] > 1)); }, [products]);
  const visible = products.filter((p) => (filterBrand === "all" || p.brandId === filterBrand) && (!q || [p.name, p.sku, p.colour, p.contents, p.about].join(" ").toLowerCase().includes(q.toLowerCase())));

  const TABS = [["catalogue", "Catalogue"], ["edit", editing && products.some((x) => x.id === editing.id) ? "Edit product" : "Add product"], ["studio", "Image studio"], ["brands", "Brands & SKU rules"], ["legend", "SKU guide"], ["export", "Export / Import"], ["help", "Help"]];

  return (
    <div className="cs">
      <header className="top">
        <div><h1>Catalogue Studio</h1><div className="sub">{brands.length} brand{brands.length !== 1 && "s"} · {products.length} products · {dupSkus.size ? <span style={{ color: "var(--ox)" }}>{dupSkus.size} duplicate SKU{dupSkus.size > 1 && "s"} to fix</span> : "all SKUs unique"} · {usingSupabase ? "shared via Supabase" : "saved on this device"}</div></div>
        <nav className="tabs">{TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => { if (k === "edit" && !editing) startNew(); else setTab(k); }}>{l}</button>)}</nav>
      </header>
      <main className="wrap">
        {tab === "catalogue" && <CatalogueView {...{ products: visible, brands, dupSkus, filterBrand, setFilterBrand, q, setQ, startNew, startEdit, duplicate, remove, openStudio }} />}
        {tab === "edit" && editing && <EditView {...{ product: editing, setProduct: setEditing, products, brands, categories, materials, colours, skuConfig, ctx, aiSettings, onSave: (p) => { upsertProduct(p); say("Saved " + p.sku); setTab("catalogue"); }, onCancel: () => setTab("catalogue"), openStudio, say }} />}
        {tab === "studio" && <StudioView {...{ products, product: studioProduct, setProduct: setStudioProduct, aiSettings, setAiSettings, onApplyThumb: (id, thumb) => { setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, thumb } : p))); say("Thumbnail updated"); }, say }} />}
        {tab === "brands" && <BrandsView {...{ brands, setBrands, categories, setCategories, materials, setMaterials, colours, setColours, skuConfig, setSkuConfig, say }} />}
        {tab === "legend" && <LegendView {...{ ctx, products }} />}
        {tab === "export" && <ExportView {...{ products, brands, setBrands, setProducts, ctx, setCategories, setMaterials, exportPrefs, setExportPrefs, registerColours, restoreAll, say }} />}
        {tab === "help" && <HelpView {...{ aiSettings, setAiSettings, goTo: setTab }} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
