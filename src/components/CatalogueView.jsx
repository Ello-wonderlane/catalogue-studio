import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { FIELDS, missingFields } from "../config/fields.js";
import { valueOf, fmtDate as fd } from "../lib/util.js";
const DEFAULT_COLS = ["colour", "mrp", "selling", "margin", "imageUrl", "createdAt", "updatedAt"];
const loadCols = () => { try { const c = JSON.parse(localStorage.getItem("catalogue-cols") || "null"); return Array.isArray(c) ? c : DEFAULT_COLS; } catch { return DEFAULT_COLS; } };
import { marginOf, fmtDate, daysAgo } from "../lib/util.js";
import { isFolderLink } from "../lib/sku.js";

const FRESH = [["any", "Any time"], ["1", "Added today"], ["7", "Added last 7 days"], ["30", "Added last 30 days"], ["u7", "Updated last 7 days"], ["since", "Added since date…"]];
const SORTS = [["newest", "Newest added first"], ["updated", "Recently updated first"], ["sku", "SKU A → Z"], ["oldest", "Oldest first"]];

export default function CatalogueView({ products, brands, dupSkus, filterBrand, setFilterBrand, q, setQ, startNew, startEdit, duplicate, remove, removeMany, openStudio, othersEditing = [], requiredFields = [] }) {
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [sel, setSel] = useState(new Set());
  const [cols, setColsState] = useState(loadCols);
  const [pick, setPick] = useState(false);
  const setCols = (c) => { setColsState(c); localStorage.setItem("catalogue-cols", JSON.stringify(c)); };
  const colFields = cols.map((k) => FIELDS.find((f) => f.key === k)).filter(Boolean).filter((f) => !["brand", "sku"].includes(f.key));
  const cell = (p, f) => { if (f.key === "missing") { const m = missingFields(p, requiredFields); return m.length ? <span className="pill warn" title={m.join(", ")}>{m.length} missing</span> : <span className="pill" style={{ background: "#E8F0E4", borderColor: "#B9CDB0", color: "var(--olive)" }}>complete</span>; } const v = valueOf(p, f.key, brands); if (f.key === "imageUrl") return v ? <a href={v} target="_blank" rel="noreferrer" style={{ color: "var(--ox)" }}>{isFolderLink(v) ? "folder ⚠" : "link"}</a> : <span className="note">none</span>; if (f.type === "url" && v) return <a href={v} target="_blank" rel="noreferrer" style={{ color: "var(--ox)" }}>link</a>; if (f.type === "date") return <span className="note" style={{ whiteSpace: "nowrap" }}>{fd(p[f.key])}</span>; if (f.key === "margin") return v ? v + "%" : ""; if (f.price) return v !== "" ? "₹" + v : ""; return <span style={{ display: "inline-block", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }} title={String(v)}>{String(v)}</span>; };
  const [fresh, setFresh] = useState("any");
  const [since, setSince] = useState("");
  const [sort, setSort] = useState("newest");
  const [src, setSrc] = useState("all");

  let list = products.filter((p) => {
    if (onlyIncomplete && missingFields(p, requiredFields).length === 0) return false;
    if (src === "system" && p.skuLocked) return false;
    if (src === "manual" && !p.skuLocked) return false;
    if (fresh === "any") return true;
    if (fresh === "u7") return daysAgo(p.updatedAt) <= 7;
    if (fresh === "since") return since ? new Date(p.createdAt) >= new Date(since) : true;
    return daysAgo(p.createdAt) <= +fresh;
  });
  const t = (x) => (x ? new Date(x).getTime() : 0);
  list = [...list].sort((a, b) => sort === "newest" ? t(b.createdAt) - t(a.createdAt) : sort === "updated" ? t(b.updatedAt) - t(a.updatedAt) : sort === "oldest" ? t(a.createdAt) - t(b.createdAt) : (a.sku || "").localeCompare(b.sku || ""));
  const isNew = (p) => daysAgo(p.createdAt) <= 7;
  const visibleIds = list.map((p) => p.id); const allSel = visibleIds.length > 0 && visibleIds.every((id) => sel.has(id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); allSel ? visibleIds.forEach((id) => n.delete(id)) : visibleIds.forEach((id) => n.add(id)); return n; });
  const selected = products.filter((p) => sel.has(p.id));
  const exportSelected = () => { const fs = FIELDS.filter((f) => f.type !== "computed" || f.key === "margin"); const ws = XLSX.utils.aoa_to_sheet([fs.map((f) => f.label), ...selected.map((p) => fs.map((f) => valueOf(p, f.key, brands)))]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Catalog"); XLSX.writeFile(wb, `Catalog_selected_${selected.length}.xlsx`); };

  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={{ width: 170 }}><option value="all">All brands</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input placeholder="Search name, SKU, colour…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
        <select value={fresh} onChange={(e) => setFresh(e.target.value)} style={{ width: 190 }}>{FRESH.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        {fresh === "since" && <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={{ width: 160 }} />}
        <select value={src} onChange={(e) => setSrc(e.target.value)} style={{ width: 170 }} title="SKU source"><option value="all">SKU: all</option><option value="system">SKU: system-generated</option><option value="manual">SKU: manual / imported</option></select>
        <label className="check" style={{ whiteSpace: "nowrap" }}><input type="checkbox" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} /> incomplete only</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 190 }}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <span className="note">{list.length} of {products.length}</span>
        {sel.size > 0 && <span className="row" style={{ gap: 6 }}><span className="pill">{sel.size} selected</span><button className="btn small" onClick={exportSelected}>Export selected</button><button className="btn small" style={{ borderColor: "#E6B8B8", color: "var(--ox)" }} onClick={() => { removeMany([...sel]); setSel(new Set()); }}>Delete selected</button><button className="btn small" onClick={() => setSel(new Set())}>Clear</button></span>}
        <span style={{ marginLeft: "auto" }} />
        <div style={{ position: "relative" }}>
          <button className="btn" onClick={() => setPick((v) => !v)}>Columns ({colFields.length}) ▾</button>
          {pick && <div className="panel" style={{ position: "absolute", right: 0, top: 44, zIndex: 9, width: 520, maxHeight: 420, overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.12)" }}>
            <div className="row" style={{ marginBottom: 8 }}><b>Show columns</b><span style={{ marginLeft: "auto" }} /><button className="btn small" onClick={() => setCols(FIELDS.filter((f) => !["brand", "sku"].includes(f.key)).map((f) => f.key))}>All</button><button className="btn small" onClick={() => setCols(DEFAULT_COLS)}>Default</button><button className="btn small" onClick={() => setCols([])}>None</button><button className="btn small" onClick={() => setPick(false)}>Done</button></div>
            <div className="grid3">{[...new Set(FIELDS.map((f) => f.grp))].map((g) => <div key={g}><label style={{ color: "var(--olive)" }}>{g}</label>{FIELDS.filter((f) => f.grp === g && !["brand", "sku"].includes(f.key)).map((f) => <label className="check" key={f.key}><input type="checkbox" checked={cols.includes(f.key)} onChange={() => setCols(cols.includes(f.key) ? cols.filter((k) => k !== f.key) : [...cols, f.key])} /> {f.label}</label>)}</div>)}</div>
            <div className="note" style={{ marginTop: 8 }}>SKU, product name, brand and the action buttons are always shown. Your choice is remembered on this browser.</div>
          </div>}
        </div>
        <button className="btn primary" onClick={startNew}>+ Add product</button>
      </div>
      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        {list.length === 0 ? <div className="empty"><h3>{products.length ? "Nothing matches these filters" : "No products yet"}</h3>{products.length ? "Change the freshness filter or search." : "Add your first product, or import your existing catalogue sheet from Export / Import."}</div> : (
          <table className="cat">
            <thead><tr><th><input type="checkbox" checked={allSel} onChange={toggleAll} title="select all visible" /></th><th></th><th>SKU</th><th>Product</th><th>Brand</th>{colFields.map((f) => <th key={f.key}>{f.label.replace(/\s+/g, " ")}</th>)}<th></th></tr></thead>
            <tbody>{list.map((p) => { const b = brands.find((x) => x.id === p.brandId); return (<tr key={p.id} style={sel.has(p.id) ? { background: "#F5F1E6" } : undefined}>
              <td><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} /></td>
              <td>{p.thumb ? <img className="thumb" src={p.thumb} alt="" /> : <div className="thumb" />}</td>
              <td className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{p.sku || <span className="note">—</span>}{dupSkus.has(p.sku) && <span className="pill warn" style={{ marginLeft: 6 }}>duplicate</span>}{(() => { const m = missingFields(p, requiredFields); return m.length ? <span className="pill warn" style={{ marginLeft: 6 }} title={"Missing: " + m.join(", ")}>{m.length} missing</span> : null; })()}{p.skuLocked && p.sku && <span className="pill" style={{ marginLeft: 6, background: "#EEE9DC", borderColor: "#D9CBA6", color: "#7A5C1E" }} title="typed or imported, not generated by the rule">manual</span>}{othersEditing.includes(p.sku) && <span className="pill warn" style={{ marginLeft: 6 }} title="a teammate has this open">being edited</span>}{isNew(p) && <span className="pill" style={{ marginLeft: 6, background: "#E8F0E4", borderColor: "#B9CDB0", color: "var(--olive)" }}>new</span>}</td>
              <td>{p.name || <span className="note">{p.contents}</span>}</td>
              <td><span className="pill">{b?.name || "?"}</span></td>
              {colFields.map((f) => <td key={f.key}>{cell(p, f)}</td>)}
              <td style={{ whiteSpace: "nowrap" }}><button className="btn small" onClick={() => startEdit(p)}>Edit</button> <button className="btn small" onClick={() => openStudio(p)}>Studio</button> <button className="btn small" onClick={() => duplicate(p)}>New colourway</button> <button className="btn small" onClick={() => remove(p.id)}>Delete</button></td>
            </tr>); })}</tbody>
          </table>)}
      </div>
    </div>
  );
}
