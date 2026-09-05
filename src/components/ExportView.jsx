import { useState } from "react";
import * as XLSX from "xlsx";
import { FIELDS, NON_TEMPLATE, GENDER_MEANING, MARKETPLACES, MARKET_REQUIRED, HELPER_COLS, missingFields } from "../config/fields.js";
import FormatBuilder from "./FormatBuilder.jsx";
import { SEG_HELP } from "../config/taxonomy.js";
import { uid, download, emptyProduct, valueOf } from "../lib/util.js";
import { usingSupabase } from "../lib/storage.js";
import { uniqueCode, directImageUrl, isFolderLink, buildSku, nextStyleNo, ensureUniqueSku, decodeSku, supplierToMerchantSku } from "../lib/sku.js";

function healthCheck(products, ctx) {
  const issues = [];
  const add = (msg, list) => { if (list.length) issues.push({ msg, count: list.length, skus: list.map((p) => p.sku || p.name || "(no sku)") }); };
  const seen = {}; products.forEach((p) => (seen[p.sku] = (seen[p.sku] || 0) + 1));
  add("duplicate SKU codes", products.filter((p) => p.sku && seen[p.sku] > 1));
  add("products without a SKU", products.filter((p) => !p.sku));
  add("products without a main image link", products.filter((p) => !p.imageUrl));
  add("image links that point to a Drive folder (not a file)", products.filter((p) => isFolderLink(p.imageUrl)));
  add("products missing MRP or selling price", products.filter((p) => !p.mrp || !p.selling));
  add("selling price higher than MRP", products.filter((p) => p.mrp && p.selling && +p.selling > +p.mrp));
  add("products with a category code not in the category list", products.filter((p) => p.categoryCode && !ctx.categories.some((c) => c.code === p.categoryCode)));
  add("products with a colour not in the colour list", products.filter((p) => p.colour && !ctx.colours.some((c) => c.name.toLowerCase() === p.colour.trim().toLowerCase())));
  add("products with no description", products.filter((p) => !p.about));
  add("products with a missing brand", products.filter((p) => !ctx.brands.some((b) => b.id === p.brandId)));
  (ctx.requiredFields || []).forEach((k) => { const f = FIELDS.find((x) => x.key === k); if (!f || k === "brand") return; add(`products missing “${f.label}”`, products.filter((p) => String(p[k] ?? "").trim() === "")); });
  // ---- listing hygiene: the things a marketplace accepts but that read badly, or get you delisted ----
  const txt = (p) => String(p.about || "");
  add("descriptions shorter than 80 characters (marketplaces rank these poorly)", products.filter((p) => txt(p) && txt(p).length < 80));
  const sameAbout = {}; products.forEach((p) => { const k = txt(p).trim().toLowerCase(); if (k) sameAbout[k] = (sameAbout[k] || 0) + 1; });
  add("descriptions copied word-for-word on another product (duplicate content is penalised)", products.filter((p) => txt(p) && sameAbout[txt(p).trim().toLowerCase()] > 1));
  add("ALL-CAPS text in the name or description (rejected by Amazon and Myntra)", products.filter((p) => [p.name, p.about].some((v) => { const t = String(v || ""); const letters = t.replace(/[^A-Za-z]/g, ""); return letters.length > 12 && letters === letters.toUpperCase(); })));
  add("promotional wording that marketplaces disallow (best/cheapest/sale/free shipping/#1)", products.filter((p) => /\b(best price|cheapest|lowest price|free shipping|sale|discount|#1|no\.?\s*1 )\b/i.test([p.name, p.about, p.benefits].join(" "))));
  add("contact details in the listing text (email, phone or web address — grounds for removal)", products.filter((p) => /(@[\w-]+\.[a-z]{2,}|\bwww\.|https?:\/\/|\b[6-9]\d{9}\b)/i.test([p.name, p.about, p.benefits, p.care].join(" "))));
  add("GST that is not one of 0 / 5 / 12 / 18 / 28", products.filter((p) => { const g = String(p.gst ?? "").trim(); if (!g) return false; const n = Math.round(parseFloat(g) * (parseFloat(g) < 1 ? 100 : 1)); return ![0, 5, 12, 18, 28].includes(n); }));
  add("HSN codes that are not 4, 6 or 8 digits", products.filter((p) => { const h = String(p.hsn ?? "").trim(); return h && !/^\d{4}(\d{2})?(\d{2})?$/.test(h); }));
  add("prices that are not plain numbers", products.filter((p) => [p.mrp, p.selling, p.landing].some((v) => String(v ?? "").trim() !== "" && !isFinite(Number(v)))));
  add("a dimension or weight of zero", products.filter((p) => ["height", "width", "length", "weight"].some((k) => String(p[k] ?? "").trim() !== "" && Number(p[k]) === 0)));
  add("fewer than 3 images (marketplaces convert far better with 4-5)", products.filter((p) => [p.imageUrl, p.imageUrl2, p.imageUrl3, p.imageUrl4, p.imageUrl5].filter(Boolean).length < 3));
  add("image links that are not direct file URLs (a marketplace cannot fetch these)", products.filter((p) => p.imageUrl && !isFolderLink(p.imageUrl) && !/^https?:\/\/\S+\.(jpe?g|png|webp|avif)(\?|$)/i.test(p.imageUrl)));

  add("manual/imported SKUs that do not follow the SKU rule (cannot be decoded — fine if intentional)", products.filter((p) => p.skuLocked && p.sku && !decodeSku(p.sku, ctx)));
  const dup = (list, label) => { const c = {}; list.forEach((x) => (c[x.code] = (c[x.code] || 0) + 1)); const d = Object.keys(c).filter((k) => c[k] > 1); if (d.length) issues.push({ msg: `${label} codes used twice (${d.join(", ")})`, count: d.length, skus: [] }); };
  dup(ctx.colours, "colour"); dup(ctx.categories, "category"); dup(ctx.materials, "material"); dup(ctx.brands, "brand");
  return issues;
}

export default function ExportView({ products, brands, setBrands, ctx, setCategories, setMaterials, exportPrefs, setExportPrefs, registerColours, addProducts, clearProducts, restoreAll, customFormats = [], setCustomFormats = () => {}, say }) {
  const [builder, setBuilder] = useState(null); // null | "new" | format object
  const health = healthCheck(products, ctx);
  // Per-marketplace pre-flight: which products would be rejected, and for which columns.
  const label = (k) => FIELDS.find((f) => f.key === k)?.label || k;
  const readiness = Object.entries(MARKET_REQUIRED).map(([mk, req]) => {
    const gaps = {};
    products.forEach((p) => req.forEach((k) => {
      const v = k === "brand" ? (brands.find((b) => b.id === p.brandId)?.name || p.brand) : p[k];
      if (String(v ?? "").trim() === "") (gaps[k] = gaps[k] || []).push(p.sku || p.name || "(no sku)");
    }));
    const blocked = new Set(Object.values(gaps).flat());
    return { mk, name: MARKETPLACES[mk]?.name || mk, gaps, ready: products.length - blocked.size, total: products.length };
  });
  const [scope, setScope] = useState("all");
  const [importMode, setImportMode] = useState("add");
  const [supplierPrefix, setSupplierPrefix] = useState(2); // supplier brand characters to swap for ours
  const rows = products.filter((p) => scope === "all" || p.brandId === scope);
  const sel = new Set(exportPrefs.fields);
  const toggle = (k) => setExportPrefs({ ...exportPrefs, fields: sel.has(k) ? exportPrefs.fields.filter((x) => x !== k) : [...exportPrefs.fields, k] });
  const setAll = (keys) => setExportPrefs({ ...exportPrefs, fields: keys });
  const grps = [...new Set(FIELDS.map((f) => f.grp))];
  const link = (u) => (exportPrefs.directLinks ? directImageUrl(u) : u);
  const folderCount = rows.filter((p) => isFolderLink(p.imageUrl)).length;

  const legendSheet = () => {
    const aoa = [["HOW TO READ A SKU (" + ctx.skuConfig.segments.filter((s) => s.on).map((s) => s.label).join(" + ") + ")"], []];
    ctx.skuConfig.segments.filter((s) => s.on).forEach((s, i) => aoa.push([`${i + 1}. ${s.label}`, SEG_HELP[s.id]]));
    aoa.push([], ["BRAND CODES"], ...ctx.brands.map((b) => [b.code, b.name]), [], ["GENDER CODES"], ...Object.entries(GENDER_MEANING), [], ["CATEGORY CODES"], ...ctx.categories.map((c) => [c.code, c.name, c.dept]), [], ["MATERIAL CODES"], ...ctx.materials.map((m) => [m.code, m.name]), [], ["COLOUR CODES"], ...ctx.colours.map((c) => [c.code, c.name]));
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 14 }]; return ws;
  };
  const downloadTemplate = () => {
    const cols = [...HELPER_COLS.map((c) => c[0]), ...FIELDS.filter((f) => f.type !== "computed" && f.type !== "date").map((f) => f.label)];
    const ex = { Department: "Bags", "Category code": "HA", "Style no.": "", Brand: ctx.brands[0]?.name || "Yselle", "Merchant SKU Code": "(leave blank to auto-generate, or paste an existing SKU)", "Image URL": "https://drive.google.com/file/d/…/view", "Vendor colour": "Croco Black", "Print and Pattern": "animal", "Vendor size": "one size", "Package Contents": "1 Shoulder Bag", "Pack Type": "pack of 1", "HSN code": "42022910", "GST%": 0.18, "Landing Price": 350, MRP: 1999, "Selling Price": 1299, "About the product": "…", "Benefits & Special features": "…", "Age group": "adults-women", Gender: "female", "Warranty Details": "domestic 6months", "Care instructions": "Wipe with clean & dry cloth.", "Material Detail": "PU", "Compartment Detail": "Single main compartment", "Laptop Compartment": "no", "Height  (cm)": 17.5, "Width  (cm)": 5.25, "Length  (cm)": 27.5, "Weight (amount)": 0.45, "Weight (unit)": "KILOGRAM", "Feature 1": "lightweight and durable", "Feature 2": "reflective details", "Feature 3": "eco-friendly construction", "Water Resistance Level": "water resistant" };
    const ws = XLSX.utils.aoa_to_sheet([cols, cols.map((c) => ex[c] ?? "")]);
    ws["!cols"] = cols.map((c) => ({ wch: ["About the product", "Benefits & Special features", "Merchant SKU Code"].includes(c) ? 48 : Math.max(14, c.length + 2) }));
    const how = XLSX.utils.aoa_to_sheet([
      ["HOW TO FILL THIS TEMPLATE"], [],
      ["1", "One row per product / colourway. Keep the header row exactly as it is."],
      ["2", "Merchant SKU Code: leave EMPTY for new products — the tool generates it from Brand + Gender + Category code + Style no. + Material + Colour. Paste an existing SKU to keep it."],
      ["3", "Department + Category code: pick from the Categories sheet (e.g. Bags / HA). Style no.: leave empty for the next free number; fill it to add another colourway of an existing style."],
      ["4", "Vendor colour: use a name from the Colours sheet, or a new name (it gets a new unique code automatically)."],
      ["5", "Dropdown-style columns must use these values — Pack Type: pack of 1..6 · Gender: female/male/unisex/kids · Age group: adults-women/adults-men/adults-unisex/teens/kids-girls/kids-boys/kids-unisex/infants · Laptop Compartment: yes/no · Weight (unit): KILOGRAM/GRAM · Water Resistance Level: water resistant / waterproof / not water resistant"],
      ["6", "Image URL must be a link to ONE image file (not a folder). Landing Price / MRP / Selling Price are plain numbers, GST% as 0.18."],
      ["7", "Import mode 'Add new only' skips SKUs already in the catalogue. 'Add + update' overwrites matching SKUs with the values in your sheet — use it to bulk-update prices or text."],
      ["8", "Delete the example row before importing."],
    ]); how["!cols"] = [{ wch: 4 }, { wch: 120 }];
    const cats = XLSX.utils.aoa_to_sheet([["Department", "Category code", "Category name"], ...ctx.categories.map((c) => [c.dept, c.code, c.name])]); cats["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 30 }];
    const cols2 = XLSX.utils.aoa_to_sheet([["Colour name", "Code"], ...ctx.colours.map((c) => [c.name, c.code])]);
    const mats = XLSX.utils.aoa_to_sheet([["Material (type exactly)", "Code"], ...ctx.materials.map((m) => [m.name, m.code])]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catalog"); XLSX.utils.book_append_sheet(wb, how, "How to fill"); XLSX.utils.book_append_sheet(wb, cats, "Categories"); XLSX.utils.book_append_sheet(wb, cols2, "Colours"); XLSX.utils.book_append_sheet(wb, mats, "Materials"); XLSX.utils.book_append_sheet(wb, legendSheet(), "SKU Legend");
    XLSX.writeFile(wb, "Catalogue_Template.xlsx"); say("Template downloaded");
  };
  const val = (p, key) => { if (key === "missing") return missingFields(p, ctx.requiredFields || []).join(", "); if (key === "category") return ctx.categories.find((c) => c.code === p.categoryCode)?.name || ""; if (key === "department") return ctx.categories.find((c) => c.code === p.categoryCode)?.dept || ""; if (key === "brandCode") return brands.find((b) => b.id === p.brandId)?.code || ""; if (key === "imageUrl") return link(p.imageUrl); return valueOf(p, key, brands); };
  const exportCustom = (fmt) => {
    const data = rows.map((p) => fmt.cols.map((c) => (c.map === "__const" ? c.constant : c.map ? val(p, c.map) : "")));
    const ws = XLSX.utils.aoa_to_sheet([...fmt.headerRows.map((r) => fmt.cols.map((_, i) => r[i] ?? "")), ...data]);
    ws["!cols"] = fmt.cols.map((c) => ({ wch: Math.min(40, Math.max(12, String(c.header).length + 2)) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, (fmt.sheet || "Sheet1").slice(0, 31));
    XLSX.writeFile(wb, `${fmt.name.replace(/[^\w-]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`); say(`Exported ${rows.length} rows in “${fmt.name}” format`);
  };
  const doExport = (asCsv) => {
    if (exportPrefs.market.startsWith("custom:")) { const f = customFormats.find((x) => x.id === exportPrefs.market.slice(7)); if (f) return exportCustom(f); }
    const mp = MARKETPLACES[exportPrefs.market] || MARKETPLACES.ours;
    let header, keys;
    if (mp.cols) { header = mp.cols.map((c) => c[0]); keys = mp.cols.map((c) => c[1]); }
    else { const fs = FIELDS.filter((f) => sel.has(f.key)); header = fs.map((f) => f.label); keys = fs.map((f) => f.key); }
    const data = rows.map((p) => keys.map((k) => { const f = FIELDS.find((x) => x.key === k); const v = val(p, k); return f?.type === "number" && v !== "" ? Number(v) : v; }));
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const urlCol = keys.indexOf("imageUrl");
    if (urlCol >= 0) rows.forEach((p, i) => { if (p.imageUrl) { const addr = XLSX.utils.encode_cell({ r: i + 1, c: urlCol }); if (ws[addr]) ws[addr].l = { Target: link(p.imageUrl) }; } });
    ws["!cols"] = keys.map((k) => ({ wch: ["about", "benefits"].includes(k) ? 60 : k === "imageUrl" ? 50 : 16 }));
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, rows.length), c: keys.length - 1 } }) };
    const base = (scope === "all" ? "Catalog" : brands.find((b) => b.id === scope)?.name || "Catalog") + (mp.cols ? "_" + exportPrefs.market : "") + "_" + new Date().toISOString().slice(0, 10);
    if (asCsv) { download("data:text/csv;charset=utf-8," + encodeURIComponent(XLSX.utils.sheet_to_csv(ws)), base + ".csv"); return; }
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Catalog"); XLSX.utils.book_append_sheet(wb, legendSheet(), "SKU Legend");
    XLSX.writeFile(wb, base + ".xlsx"); say("Exported " + rows.length + " rows");
  };
  const importFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader();
    r.onload = () => {
      try {
        const wb = XLSX.read(r.result, { type: "array" }); const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
        const head = aoa[0].map(norm); const idx = (label) => head.indexOf(norm(label));
        let newBrands = [...brands]; const newCats = [], newMats = [], newCols = []; const out = []; const updates = [];
        const localColours = [...ctx.colours]; const localCats = [...ctx.categories];
        const bySku = new Map(products.map((p) => [p.sku, p])); const seenInSheet = new Set(); let skipped = 0, blank = 0, mapped = 0;
        const now = new Date().toISOString();
        const helper = (label) => { const i = idx(label); return i >= 0 ? String(aoa_row[i] ?? "").trim() : ""; };
        let aoa_row = null;
        aoa.slice(1).forEach((row) => {
          if (!row.some((c) => String(c).trim())) return;
          aoa_row = row;
          const p = emptyProduct(null); p.source = "import";
          FIELDS.forEach((fd) => { const i = idx(fd.label); if (i >= 0 && !["brand", "computed"].includes(fd.type)) { const v = String(row[i] ?? "").trim(); if (fd.type === "date") { if (v) p[fd.key] = new Date(v).toISOString(); } else p[fd.key] = v; } });
          if (String(p.sku).startsWith("(leave blank")) p.sku = "";
          if (!p.createdAt) p.createdAt = now; p.updatedAt = now;
          const bname = String(row[idx("Brand")] ?? "").trim() || "Imported";
          let b = newBrands.find((x) => x.name.toLowerCase() === bname.toLowerCase());
          if (!b) { b = { id: "b_" + uid(), name: bname, code: uniqueCode(bname, newBrands.map((x) => x.code)), hsn: p.hsn, gst: p.gst, warranty: p.warranty, care: p.care }; newBrands.push(b); }
          p.brandId = b.id;
          // Supplier sheet: swap their leading brand characters for our code and keep the rest of their
          // number, so one glance matches a row in their inventory to a row in ours. Their original code
          // stays on the product in Supplier SKU. A row that already carries our own SKU is left alone.
          if (!p.sku && p.supplierSku) { const s = supplierToMerchantSku(p.supplierSku, b.code, supplierPrefix); if (s) { p.sku = s; mapped++; } }
          // helper columns from the template
          const hCat = helper("Category code").toUpperCase(), hStyle = helper("Style no.").replace(/\D/g, ""), hDept = helper("Department");
          if (hCat) { p.categoryCode = hCat; if (!localCats.some((c) => c.code === hCat)) { const c = { dept: hDept || "Imported", code: hCat, name: "Category " + hCat + " (rename me)" }; localCats.push(c); newCats.push(c); } }
          if (hStyle) p.styleNo = hStyle;
          // colour registry (local, so codes stay unique inside this import too)
          const addColour = (name, code) => { if (!name) return; if (localColours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return; const c = { name, code: code && !localColours.some((x) => x.code === code) ? code : uniqueCode(name, localColours.map((x) => x.code)) }; localColours.push(c); newCols.push(c); };
          const m = (p.sku || "").toUpperCase().match(/^([A-Z]{2})([WMUK])([A-Z]+?)(\d{3,6})([A-Z]?)([A-Z0-9]{2})$/);
          if (m) {
            p.categoryCode = p.categoryCode || m[3]; p.styleNo = p.styleNo || m[4]; if (m[5]) p.materialCode = m[5];
            if (!localCats.some((c) => c.code === m[3])) { const c = { dept: hDept || "Imported", code: m[3], name: "Category " + m[3] + " (rename me)" }; localCats.push(c); newCats.push(c); }
            if (m[5] && p.material && !ctx.materials.some((x) => x.code === m[5]) && !newMats.some((x) => x.code === m[5])) newMats.push({ code: m[5], name: p.material });
            addColour(p.colour, m[6]);
          } else addColour(p.colour);
          if (!p.sku) {
            // blank SKU → generate it from the rule (needs brand + category)
            if (!p.categoryCode) { blank++; return; }
            const pool = [...products, ...out];
            if (!p.styleNo) p.styleNo = nextStyleNo(pool, p.brandId, p.categoryCode, ctx.skuConfig.styleDigits);
            const taken = new Set([...bySku.keys(), ...seenInSheet]); const r = ensureUniqueSku(p, { ...ctx, brands: newBrands, colours: localColours, categories: localCats }, taken); p.styleNo = r.styleNo; p.sku = r.sku; p.skuLocked = false;
          } else { p.sku = p.sku.toUpperCase(); p.skuLocked = true; }
          if (seenInSheet.has(p.sku)) { skipped++; return; } seenInSheet.add(p.sku);
          const existingP = bySku.get(p.sku);
          if (existingP) {
            if (importMode === "update") { const merged = { ...existingP, ...Object.fromEntries(Object.entries(p).filter(([k, v]) => v !== "" && !["id", "createdAt", "thumb", "source"].includes(k))), updatedAt: now }; updates.push(merged); }
            else skipped++;
            return;
          }
          if (!p.name) p.name = (p.contents || "").split(",")[0].replace(/^\d+\s*/, "");
          out.push(p);
        });
        if (newCats.length) setCategories((cs) => [...cs, ...newCats]);
        if (newMats.length) setMaterials((ms) => [...ms, ...newMats]);
        registerColours(newCols); setBrands(newBrands);
        addProducts(out, updates);
        say(`Imported ${out.length} new${updates.length ? `, updated ${updates.length}` : ""}${mapped ? `, ${mapped} SKUs mapped from supplier codes` : ""}${skipped ? `, skipped ${skipped} existing/duplicate SKUs` : ""}${blank ? `, ${blank} rows had no SKU and no Category code` : ""}${newCats.length ? `, ${newCats.length} new category codes` : ""}`);
      } catch (err) { say("Import failed: " + err.message); }
    };
    r.readAsArrayBuffer(f); e.target.value = "";
  };
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="grid2" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
        <div className="panel">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Export catalogue</h2>
          <div className="field"><label>Scope</label><select value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">All brands ({products.length})</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name} ({products.filter((p) => p.brandId === b.id).length})</option>)}</select></div>
          <div className="field"><label>Format</label><select value={exportPrefs.market} onChange={(e) => setExportPrefs({ ...exportPrefs, market: e.target.value })}>{Object.entries(MARKETPLACES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}{customFormats.length > 0 && <optgroup label="Your marketplace templates">{customFormats.map((f) => <option key={f.id} value={"custom:" + f.id}>{f.name} ({f.cols.length} cols)</option>)}</optgroup>}</select>
            {exportPrefs.market.startsWith("custom:") && <div className="row" style={{ marginTop: 6 }}><button className="btn small" onClick={() => setBuilder(customFormats.find((x) => x.id === exportPrefs.market.slice(7)))}>Edit mapping</button><button className="btn small" onClick={() => { if (confirm("Delete this format?")) { setCustomFormats(customFormats.filter((x) => x.id !== exportPrefs.market.slice(7))); setExportPrefs({ ...exportPrefs, market: "ours" }); } }}>Delete format</button></div>}
            {exportPrefs.market !== "ours" && !exportPrefs.market.startsWith("custom:") && <div className="note" style={{ marginTop: 4 }}>Marketplace headers are a close approximation of the platform's flat file — always download the latest template from the seller portal and paste these columns across, since marketplaces rename fields from time to time.</div>}</div>
          <label className="check"><input type="checkbox" checked={exportPrefs.directLinks} onChange={(e) => setExportPrefs({ ...exportPrefs, directLinks: e.target.checked })} /> Convert Drive / Dropbox share links to direct image links</label>
          {folderCount > 0 && <div className="note" style={{ color: "var(--ox)", marginTop: 6 }}>{folderCount} product{folderCount > 1 && "s"} still point{folderCount === 1 && "s"} to a Drive <b>folder</b>. Folder links can't be converted — they'll be exported as-is (a human can open them; a marketplace can't).</div>}
          <div className="row" style={{ marginTop: 12 }}><button className="btn primary" disabled={!rows.length} onClick={() => doExport(false)}>Download .xlsx</button><button className="btn" disabled={!rows.length} onClick={() => doExport(true)}>Download .csv</button></div>
          <div className="note" style={{ marginTop: 8 }}>The .xlsx has two sheets: <b>Catalog</b> (image cells are clickable, header row filterable) and <b>SKU Legend</b> so recipients can decode every code.</div>
        </div>
        <div className="panel">
          <div className="row" style={{ marginBottom: 6 }}><h2 style={{ fontSize: 20 }}>Columns to include</h2><span style={{ marginLeft: "auto" }} /><button className="btn small" onClick={() => setAll(FIELDS.map((f) => f.key))}>All</button><button className="btn small" onClick={() => setAll(FIELDS.filter((f) => !NON_TEMPLATE.includes(f.key)).map((f) => f.key))}>Original 28 only</button><button className="btn small" onClick={() => setAll(FIELDS.filter((f) => !f.price && f.key !== "margin").map((f) => f.key))}>Hide prices</button><button className="btn small" onClick={() => setAll([])}>None</button></div>
          {exportPrefs.market !== "ours" ? <div className="note">Column selection applies to the standard format. For an exact marketplace file, build a format from the marketplace's own template below. Marketplace formats use their own fixed column set.</div> : (
            <div className="grid3">{grps.map((g) => <div key={g}><label style={{ color: "var(--olive)" }}>{g}</label>{FIELDS.filter((f) => f.grp === g).map((f) => <label className="check" key={f.key}><input type="checkbox" checked={sel.has(f.key)} onChange={() => toggle(f.key)} /> {f.label}</label>)}</div>)}</div>)}
        </div>
      </div>
      {builder ? <FormatBuilder formats={customFormats} setFormats={setCustomFormats} say={say} onClose={() => setBuilder(null)} editing={builder === "new" ? null : builder} /> : (
        <div className="panel">
          <div className="row"><h2 style={{ fontSize: 20 }}>Exact marketplace formats (Amazon, Nykaa, Ajio, Myntra, Flipkart…)</h2><span style={{ marginLeft: "auto" }} /><button className="btn primary" onClick={() => setBuilder("new")}>+ New format from a template file</button></div>
          <div className="note" style={{ marginTop: 6 }}>Upload the marketplace's own listing template once, map its columns to your fields (auto-suggested), save it under a name. It then appears in the Format dropdown above and exports with the marketplace's exact headers — ready to upload back to the seller portal.{customFormats.length ? " Saved: " + customFormats.map((f) => f.name).join(", ") + "." : ""}</div>
        </div>)}
      <div className="grid2">
        <div className="panel">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Data health check</h2>
          <div className="note" style={{ marginBottom: 10 }}>Runs live on the whole catalogue. Anything listed here will cause trouble on a marketplace upload or confuse a colleague reading the sheet.</div>
          {health.length === 0 ? <span className="pill" style={{ background: "#E8F0E4", borderColor: "#B9CDB0", color: "var(--olive)" }}>All clear — no issues found</span> :
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{health.map((h, i) => <li key={i}><b>{h.count}</b> {h.msg}{h.skus.length ? <span className="note"> — {h.skus.slice(0, 6).join(", ")}{h.skus.length > 6 && ` +${h.skus.length - 6} more`}</span> : null}</li>)}</ul>}
        </div>
        <div className="panel">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Marketplace readiness</h2>
          <div className="note" style={{ marginBottom: 10 }}>How many products carry everything each platform asks for. Approximate — platforms change their mandatory columns without warning, so confirm against the seller portal's own template (and build a custom format from it below for an exact file).</div>
          {!products.length ? <div className="note">No products yet.</div> : (
            <table className="tbl" style={{ marginBottom: 6 }}><tbody>
              {readiness.map((r) => {
                const missing = Object.entries(r.gaps).sort((a, b) => b[1].length - a[1].length);
                const all = r.ready === r.total;
                return (
                  <tr key={r.mk}>
                    <td style={{ whiteSpace: "nowrap" }}><b>{r.name}</b></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="pill" style={all ? { background: "#E8F0E4", borderColor: "#B9CDB0", color: "var(--olive)" } : {}}>{r.ready} / {r.total} ready</span>
                    </td>
                    <td>{all ? <span className="note">every product has the required columns</span> :
                      <span className="note">missing {missing.slice(0, 6).map(([k, list]) => `${label(k)} (${list.length})`).join(", ")}{missing.length > 6 ? ` +${missing.length - 6} more` : ""}</span>}</td>
                  </tr>
                );
              })}
            </tbody></table>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Backup & restore (JSON)</h2>
          <div className="note" style={{ marginBottom: 10 }}>{usingSupabase ? <>Your catalogue is stored in Supabase and shared by the whole team, and a full backup is saved automatically every day to the private <span className="mono">catalogue-backups</span> repository. This button is for taking an extra copy before a big import or clear-out. Restore replaces everything.</> : <>Data lives in this browser only. Download a JSON backup regularly and restore it on any other device. Restore replaces everything.</>}</div>
          <div className="row"><button className="btn primary" onClick={() => download("data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ products, brands, categories: ctx.categories, materials: ctx.materials, colours: ctx.colours, skuConfig: ctx.skuConfig, exportPrefs, requiredFields: ctx.requiredFields, customFormats, exportedAt: new Date().toISOString() }, null, 2)), "catalogue-backup-" + new Date().toISOString().slice(0, 10) + ".json")}>Download backup</button>
            <label className="btn" style={{ margin: 0 }}>Restore backup<input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const j = JSON.parse(r.result); if (!confirm(`Replace current data with backup from ${j.exportedAt || "unknown date"} (${(j.products || []).length} products)?`)) return; restoreAll(j); } catch { say("Not a valid backup file"); } }; r.readAsText(f); e.target.value = ""; }} /></label></div>
        </div>
      </div>
      <div className="grid2">
        <div className="panel">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Image links — what goes into the sheet</h2>
          <div className="note" style={{ fontSize: 13, lineHeight: 1.65 }}>
            The Excel carries a <b>URL per product</b>, not the image itself. Anyone opening the sheet clicks it; marketplace bulk uploads fetch the image from it. So the link must open a single image file directly (ends up showing only the picture, e.g. <span className="mono">…/YSWHA0154PCB.jpg</span>). Your current sheet uses Drive <b>folder</b> links — fine for a human, but no marketplace can ingest a folder.<br /><br />
            <b>Cheap, easy options, roughly in order of ease:</b><br />
            1. <b>Google Drive (free, 15 GB)</b> — upload the image, right-click → Share → “Anyone with the link”, copy the file link. Tick the box on the left and the export rewrites it to <span className="mono">drive.google.com/uc?export=view&id=…</span>, which loads as an image. Good for sharing with buyers; some marketplaces are picky about Drive links.<br />
            2. <b>Cloudflare R2 or Backblaze B2 (near-free, 10 GB free)</b> — a real CDN, permanent clean links like <span className="mono">https://img.yourbrand.com/YSWHA0154PCB.jpg</span>. Best if you'll list on Amazon/Flipkart/Myntra; upload with a free tool like Cyberduck.<br />
            3. <b>Your own website / Shopify / WordPress media library</b> — if you already have one, its media links are permanent and marketplace-safe.<br />
            4. <b>ImgBB / Imgur / Postimages (free)</b> — quickest for a handful of images; less suitable as a long-term catalogue store.<br /><br />
            <b>Rule of thumb:</b> one file per SKU, named after the SKU, on a link that never changes. Then the sheet stays valid forever.
          </div>
        </div>
        <div className="panel">
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Import existing sheet</h2>
          <div className="note" style={{ marginBottom: 12 }}>Drop in the template (or any sheet with the same headers) — new rows are appended, nothing existing is replaced unless you choose the update mode. Brands are created automatically, SKUs already present are skipped (never duplicated), colours are registered with unique codes, and SKUs are decoded into category / style / material so new colourways continue the numbering.</div>
          <div className="field"><label>Import mode</label><select value={importMode} onChange={(e) => setImportMode(e.target.value)}><option value="add">Add new only — rows whose SKU already exists are skipped (safe)</option><option value="update">Add new + update existing — matching SKUs get the sheet's values (bulk price/text updates)</option></select></div>
          <div className="field"><label>Supplier SKU → our SKU</label><div className="row"><span className="note">Swap the first</span><input type="number" min="0" max="6" value={supplierPrefix} style={{ width: 60 }} onChange={(e) => setSupplierPrefix(e.target.value)} /><span className="note">characters of a <b>Supplier SKU</b> column for our brand code, keeping the rest of their number. Their code is stored on the product so both sides can match stock.</span></div></div>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={importFile} />
          <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={downloadTemplate}>Download blank template (.xlsx)</button><span className="note">All columns incl. prices, plus Department / Category code / Style no. Leave SKU empty and it's generated on import.</span></div>
          <div style={{ marginTop: 20 }}><button className="btn small" onClick={() => { if (confirm("Remove ALL products? Brands and rules stay.")) clearProducts(); }}>Clear all products</button></div>
        </div>
      </div>
    </div>
  );
}

