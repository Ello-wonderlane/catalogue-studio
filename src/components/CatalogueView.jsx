import { marginOf } from "../lib/util.js";
import { isFolderLink } from "../lib/sku.js";

export default function CatalogueView({ products, brands, dupSkus, filterBrand, setFilterBrand, q, setQ, startNew, startEdit, duplicate, remove, openStudio }) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={{ width: 200 }}><option value="all">All brands</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input placeholder="Search name, SKU, colour…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
        <button className="btn primary" style={{ marginLeft: "auto" }} onClick={startNew}>+ Add product</button>
      </div>
      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        {products.length === 0 ? <div className="empty"><h3>No products yet</h3>Add your first product, or import your existing catalogue sheet from Export / Import.</div> : (
          <table className="cat">
            <thead><tr><th></th><th>SKU</th><th>Product</th><th>Brand</th><th>Colour</th><th>MRP</th><th>Selling</th><th>Margin</th><th>Image link</th><th></th></tr></thead>
            <tbody>{products.map((p) => { const b = brands.find((x) => x.id === p.brandId); return (<tr key={p.id}>
              <td>{p.thumb ? <img className="thumb" src={p.thumb} alt="" /> : <div className="thumb" />}</td>
              <td className="mono" style={{ fontWeight: 600 }}>{p.sku || <span className="note">—</span>}{dupSkus.has(p.sku) && <span className="pill warn" style={{ marginLeft: 6 }}>duplicate</span>}</td>
              <td>{p.name || <span className="note">{p.contents}</span>}</td>
              <td><span className="pill">{b?.name || "?"}</span></td>
              <td>{p.colour}</td><td>{p.mrp && "₹" + p.mrp}</td><td>{p.selling && "₹" + p.selling}</td><td>{marginOf(p) && marginOf(p) + "%"}</td>
              <td>{p.imageUrl ? <a href={p.imageUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ox)" }}>{isFolderLink(p.imageUrl) ? "folder ⚠" : "link"}</a> : <span className="note">none</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}><button className="btn small" onClick={() => startEdit(p)}>Edit</button> <button className="btn small" onClick={() => openStudio(p)}>Studio</button> <button className="btn small" onClick={() => duplicate(p)}>New colourway</button> <button className="btn small" onClick={() => remove(p.id)}>Delete</button></td>
            </tr>); })}</tbody>
          </table>)}
      </div>
    </div>
  );
}
