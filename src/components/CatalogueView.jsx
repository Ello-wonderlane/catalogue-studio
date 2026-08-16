import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { FIELDS } from "../config/fields.js";
import { valueOf } from "../lib/util.js";
import { marginOf, fmtDate, daysAgo } from "../lib/util.js";
import { isFolderLink } from "../lib/sku.js";

const FRESH = [["any", "Any time"], ["1", "Added today"], ["7", "Added last 7 days"], ["30", "Added last 30 days"], ["u7", "Updated last 7 days"], ["since", "Added since date…"]];
const SORTS = [["newest", "Newest added first"], ["updated", "Recently updated first"], ["sku", "SKU A → Z"], ["oldest", "Oldest first"]];

export default function CatalogueView({ products, brands, dupSkus, filterBrand, setFilterBrand, q, setQ, startNew, startEdit, duplicate, remove, removeMany, openStudio, othersEditing = [] }) {
  const [sel, setSel] = useState(new Set());
  const [fresh, setFresh] = useState("any");
  const [since, setSince] = useState("");
  const [sort, setSort] = useState("newest");
  const [src, setSrc] = useState("all");

  let list = products.filter((p) => {
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
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 190 }}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <span className="note">{list.length} of {products.length}</span>
        {sel.size > 0 && <span className="row" style={{ gap: 6 }}><span className="pill">{sel.size} selected</span><button className="btn small" onClick={exportSelected}>Export selected</button><button className="btn small" style={{ borderColor: "#E6B8B8", color: "var(--ox)" }} onClick={() => { removeMany([...sel]); setSel(new Set()); }}>Delete selected</button><button className="btn small" onClick={() => setSel(new Set())}>Clear</button></span>}
        <button className="btn primary" style={{ marginLeft: "auto" }} onClick={startNew}>+ Add product</button>
      </div>
      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        {list.length === 0 ? <div className="empty"><h3>{products.length ? "Nothing matches these filters" : "No products yet"}</h3>{products.length ? "Change the freshness filter or search." : "Add your first product, or import your existing catalogue sheet from Export / Import."}</div> : (
          <table className="cat">
            <thead><tr><th><input type="checkbox" checked={allSel} onChange={toggleAll} title="select all visible" /></th><th></th><th>SKU</th><th>Product</th><th>Brand</th><th>Colour</th><th>MRP</th><th>Selling</th><th>Margin</th><th>Image link</th><th>Added</th><th>Updated</th><th></th></tr></thead>
            <tbody>{list.map((p) => { const b = brands.find((x) => x.id === p.brandId); return (<tr key={p.id} style={sel.has(p.id) ? { background: "#F5F1E6" } : undefined}>
              <td><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} /></td>
              <td>{p.thumb ? <img className="thumb" src={p.thumb} alt="" /> : <div className="thumb" />}</td>
              <td className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{p.sku || <span className="note">—</span>}{dupSkus.has(p.sku) && <span className="pill warn" style={{ marginLeft: 6 }}>duplicate</span>}{p.skuLocked && p.sku && <span className="pill" style={{ marginLeft: 6, background: "#EEE9DC", borderColor: "#D9CBA6", color: "#7A5C1E" }} title="typed or imported, not generated by the rule">manual</span>}{othersEditing.includes(p.sku) && <span className="pill warn" style={{ marginLeft: 6 }} title="a teammate has this open">being edited</span>}{isNew(p) && <span className="pill" style={{ marginLeft: 6, background: "#E8F0E4", borderColor: "#B9CDB0", color: "var(--olive)" }}>new</span>}</td>
              <td>{p.name || <span className="note">{p.contents}</span>}</td>
              <td><span className="pill">{b?.name || "?"}</span></td>
              <td>{p.colour}</td><td>{p.mrp && "₹" + p.mrp}</td><td>{p.selling && "₹" + p.selling}</td><td>{marginOf(p) && marginOf(p) + "%"}</td>
              <td>{p.imageUrl ? <a href={p.imageUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ox)" }}>{isFolderLink(p.imageUrl) ? "folder ⚠" : "link"}</a> : <span className="note">none</span>}</td>
              <td className="note" style={{ whiteSpace: "nowrap" }} title={p.source ? "via " + p.source : ""}>{fmtDate(p.createdAt)}</td>
              <td className="note" style={{ whiteSpace: "nowrap" }}>{fmtDate(p.updatedAt)}</td>
              <td style={{ whiteSpace: "nowrap" }}><button className="btn small" onClick={() => startEdit(p)}>Edit</button> <button className="btn small" onClick={() => openStudio(p)}>Studio</button> <button className="btn small" onClick={() => duplicate(p)}>New colourway</button> <button className="btn small" onClick={() => remove(p.id)}>Delete</button></td>
            </tr>); })}</tbody>
          </table>)}
      </div>
    </div>
  );
}
