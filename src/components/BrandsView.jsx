import { useState } from "react";
import { SEG_COLORS, SEG_HELP } from "../config/taxonomy.js";
import { FIELDS, DEFAULT_REQUIRED } from "../config/fields.js";
import { uid } from "../lib/util.js";
import { uniqueCode, buildSku } from "../lib/sku.js";
import SkuTicket from "./SkuTicket.jsx";

export function ListEditor({ title, items, setItems, fields, note, codeKey = "code" }) {
  const [draft, setDraft] = useState(Object.fromEntries(fields.map((f) => [f.key, ""])));
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("");
  const add = () => {
    if (fields.some((f) => !draft[f.key])) return;
    if (items.some((it) => it[codeKey].toUpperCase() === draft[codeKey].toUpperCase())) { setErr(`Code ${draft[codeKey]} is already used by “${items.find((it) => it[codeKey].toUpperCase() === draft[codeKey].toUpperCase())[fields.find((f) => f.key !== codeKey && f.key !== "dept").key]}”. Pick another.`); return; }
    setErr(""); setItems([...items, { ...draft, [codeKey]: draft[codeKey].toUpperCase() }]); setDraft(Object.fromEntries(fields.map((f) => [f.key, ""])));
  };
  const suggest = () => { const nameKey = fields.find((f) => f.key !== codeKey && f.key !== "dept").key; if (draft[nameKey]) setDraft({ ...draft, [codeKey]: uniqueCode(draft[nameKey], items.map((i) => i[codeKey])) }); };
  const shown = items.filter((it) => !filter || Object.values(it).join(" ").toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 8 }}><h3 style={{ fontSize: 16 }}>{title} <span className="note">({items.length})</span></h3><input style={{ width: 160, marginLeft: "auto" }} placeholder="filter…" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
      {note && <div className="note" style={{ marginBottom: 8 }}>{note}</div>}
      <div className="row" style={{ marginBottom: 10, maxHeight: 190, overflowY: "auto" }}>{shown.map((it, i) => <span className="chip" key={it[codeKey] + i}>{it.dept && <span className="note">{it.dept} ·</span>}<b className="mono">{it[codeKey]}</b> {it[fields.find((f) => f.key !== codeKey && f.key !== "dept").key]}<button aria-label="remove" onClick={() => setItems(items.filter((x) => x !== it))}>×</button></span>)}</div>
      <div className="row">{fields.map((f) => f.options ? <select key={f.key} style={{ width: f.w || 130 }} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}><option value="">{f.ph}</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select> : <input key={f.key} style={{ width: f.w || 140 }} placeholder={f.ph} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })} />)}<button className="btn small" onClick={suggest}>Suggest code</button><button className="btn small primary" onClick={add}>Add</button></div>
      {err && <div className="note" style={{ color: "var(--ox)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
export default function BrandsView({ brands, setBrands, categories, setCategories, materials, setMaterials, colours, setColours, skuConfig, setSkuConfig, requiredFields = [], setRequiredFields = () => {}, say }) {
  const reqToggle = (k) => setRequiredFields(requiredFields.includes(k) ? requiredFields.filter((x) => x !== k) : [...requiredFields, k]);
  const [nb, setNb] = useState({ name: "", code: "", hsn: "42022910", gst: "0.18", warranty: "domestic 6months", care: "Wipe with clean & dry cloth." });
  const addBrand = () => { if (!nb.name || !nb.code) return; if (brands.some((b) => b.code === nb.code)) { say("Brand code " + nb.code + " is already used"); return; } setBrands([...brands, { id: "b_" + uid(), ...nb }]); setNb({ ...nb, name: "", code: "" }); say("Brand added"); };
  const updBrand = (id, k, v) => setBrands(brands.map((b) => (b.id === id ? { ...b, [k]: v } : b)));
  const move = (i, dir) => { const s = [...skuConfig.segments]; const j = i + dir; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; setSkuConfig({ ...skuConfig, segments: s }); };
  const preview = buildSku({ brandId: brands[0]?.id, gender: "female", categoryCode: "HA", styleNo: "154", material: "PU", colour: "Croco Black" }, { brands, colours, materials, categories, skuConfig });
  const depts = [...new Set(categories.map((c) => c.dept))];
  const dupCodes = (list) => { const seen = {}; list.forEach((x) => (seen[x.code] = (seen[x.code] || 0) + 1)); return Object.keys(seen).filter((k) => seen[k] > 1); };
  const conflicts = [...dupCodes(colours).map((c) => "colour " + c), ...dupCodes(materials).map((c) => "material " + c), ...dupCodes(categories).map((c) => "category " + c), ...dupCodes(brands).map((c) => "brand " + c)];
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="panel">
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Brands</h2>
        <div style={{ overflowX: "auto" }}><table className="cat"><thead><tr><th>Brand</th><th>Code</th><th>Default HSN</th><th>GST</th><th>Warranty</th><th>Care</th><th></th></tr></thead>
          <tbody>{brands.map((b) => <tr key={b.id}>
            <td><input value={b.name} onChange={(e) => updBrand(b.id, "name", e.target.value)} /></td><td><input className="mono" style={{ width: 70 }} value={b.code} onChange={(e) => updBrand(b.id, "code", e.target.value.toUpperCase())} /></td>
            <td><input style={{ width: 110 }} value={b.hsn} onChange={(e) => updBrand(b.id, "hsn", e.target.value)} /></td><td><input style={{ width: 70 }} value={b.gst} onChange={(e) => updBrand(b.id, "gst", e.target.value)} /></td>
            <td><input value={b.warranty} onChange={(e) => updBrand(b.id, "warranty", e.target.value)} /></td><td><input value={b.care} onChange={(e) => updBrand(b.id, "care", e.target.value)} /></td>
            <td><button className="btn small" disabled={brands.length === 1} onClick={() => setBrands(brands.filter((x) => x.id !== b.id))}>Remove</button></td></tr>)}
            <tr><td><input placeholder="New brand name" value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} /></td><td><input className="mono" style={{ width: 70 }} placeholder="XX" value={nb.code} onChange={(e) => setNb({ ...nb, code: e.target.value.toUpperCase() })} /></td><td><input style={{ width: 110 }} value={nb.hsn} onChange={(e) => setNb({ ...nb, hsn: e.target.value })} /></td><td><input style={{ width: 70 }} value={nb.gst} onChange={(e) => setNb({ ...nb, gst: e.target.value })} /></td><td><input value={nb.warranty} onChange={(e) => setNb({ ...nb, warranty: e.target.value })} /></td><td><input value={nb.care} onChange={(e) => setNb({ ...nb, care: e.target.value })} /></td><td><button className="btn small primary" onClick={addBrand}>Add brand</button></td></tr>
          </tbody></table></div>
      </div>
      <div className="panel">
        <div className="row" style={{ marginBottom: 6 }}><h2 style={{ fontSize: 20 }}>Completeness — required fields</h2><span className="note">({requiredFields.length} required)</span><span style={{ marginLeft: "auto" }} /><button className="btn small" onClick={() => setRequiredFields(DEFAULT_REQUIRED)}>Default</button><button className="btn small" onClick={() => setRequiredFields(FIELDS.filter((f) => !["computed", "date", "brand"].includes(f.type) && f.key !== "brand").map((f) => f.key))}>All</button><button className="btn small" onClick={() => setRequiredFields([])}>None</button></div>
        <div className="note" style={{ marginBottom: 8 }}>A product is “complete” when every ticked field is filled. Incomplete ones show a red “N missing” badge in the Catalogue (filter: incomplete only), the form marks each missing field, and the health check counts them per field.</div>
        <div className="grid4">{[...new Set(FIELDS.map((f) => f.grp))].map((g) => <div key={g}><label style={{ color: "var(--olive)" }}>{g}</label>{FIELDS.filter((f) => f.grp === g && !["computed", "date"].includes(f.type) && f.key !== "brand").map((f) => <label className="check" key={f.key}><input type="checkbox" checked={requiredFields.includes(f.key)} onChange={() => reqToggle(f.key)} /> {f.label}</label>)}</div>)}</div>
      </div>
      {conflicts.length > 0 && <div className="panel" style={{ borderColor: "#E6B8B8", background: "#FBEAEA" }}><b>Code conflicts to fix:</b> {conflicts.join(", ")}. Two entries share a code, which would produce identical SKUs. Remove one below.</div>}
      <div className="grid2">
        <div className="panel">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>SKU rule</h2>
          <div className="note" style={{ marginBottom: 10 }}>Turn segments on/off and reorder them. Preview uses a sample product.</div>
          {skuConfig.segments.map((s, i) => <div className="row" key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <input type="checkbox" checked={s.on} onChange={(e) => setSkuConfig({ ...skuConfig, segments: skuConfig.segments.map((x) => (x.id === s.id ? { ...x, on: e.target.checked } : x)) })} />
            <span style={{ width: 90, fontWeight: 600, color: SEG_COLORS[s.id] }}>{s.label}</span><span className="note" style={{ flex: 1 }}>{SEG_HELP[s.id]}</span>
            <button className="btn small" onClick={() => move(i, -1)}>↑</button><button className="btn small" onClick={() => move(i, 1)}>↓</button>
          </div>)}
          <div className="row" style={{ marginTop: 12 }}>
            <div><label>Separator</label><input style={{ width: 80 }} value={skuConfig.separator} onChange={(e) => setSkuConfig({ ...skuConfig, separator: e.target.value })} placeholder="none" /></div>
            <div><label>Style digits</label><input type="number" min="2" max="6" style={{ width: 80 }} value={skuConfig.styleDigits} onChange={(e) => setSkuConfig({ ...skuConfig, styleDigits: Math.max(2, Math.min(6, +e.target.value || 4)) })} /></div>
          </div>
          <div style={{ marginTop: 14 }}><SkuTicket parts={preview.parts} sku={preview.sku} separator={skuConfig.separator} showMeaning /></div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <ListEditor title="Categories & sub-categories" items={categories} setItems={setCategories} fields={[{ key: "dept", ph: "Department", options: depts, w: 130 }, { key: "code", ph: "Code", w: 80, upper: true }, { key: "name", ph: "Category name", w: 180 }]} note="Departments: Bags, Women, Men, Kids, Footwear, Accessories. Codes are unique across all departments so a SKU can always be decoded." />
          <ListEditor title="Material codes" items={materials} setItems={setMaterials} fields={[{ key: "code", ph: "Code", w: 80, upper: true }, { key: "name", ph: "Material (as typed in product)", w: 200 }]} />
          <ListEditor title="Colour codes" items={colours} setItems={setColours} fields={[{ key: "code", ph: "Code", w: 80, upper: true }, { key: "name", ph: "Colour name", w: 200 }]} note="Every colour has its own code — Black BK, Blue BU, Beige BG, Brown BR — so no two colours collide. New colours typed into a product are added here automatically with a free code." />
        </div>
      </div>
    </div>
  );
}
