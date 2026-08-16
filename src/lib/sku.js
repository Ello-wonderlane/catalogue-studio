// SKU engine: conflict-free code generation, SKU building, SKU decoding, image-link helpers.
import { GENDER_CODES, GENDER_MEANING } from "../config/fields.js";

export function candidateCodes(name, len = 2) {
  const clean = name.replace(/[^a-z\s]/gi, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean).map((w) => w.toUpperCase());
  const out = [];
  if (!words.length) return out;
  const w0 = words[0];
  if (words.length >= 2) out.push(words[0][0] + words[1][0]);
  if (w0.length >= 2) out.push(w0.slice(0, 2));
  const cons = w0.replace(/[AEIOU]/g, "");
  if (cons.length >= 2) out.push(cons[0] + cons[1]);
  if (w0.length >= 3) out.push(w0[0] + w0[2]);
  out.push(w0[0] + w0[w0.length - 1]);
  for (let i = 1; i < w0.length; i++) out.push(w0[0] + w0[i]);
  for (let d = 1; d <= 9; d++) out.push(w0[0] + d);
  return [...new Set(out.filter((c) => c.length === len))];
}
export function uniqueCode(name, taken) {
  const t = new Set(taken.map((c) => c.toUpperCase()));
  const c = candidateCodes(name).find((x) => !t.has(x));
  return c || ("X" + (t.size % 10));
}
export function colourCode(name, colours) {
  if (!name) return "";
  const hit = colours.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  return hit ? hit.code : uniqueCode(name, colours.map((c) => c.code));
}
export function materialCodeOf(p, materials) {
  if (p.materialCode) return p.materialCode;
  const hit = materials.find((m) => m.name.toLowerCase() === (p.material || "").trim().toLowerCase());
  return hit ? hit.code : (p.material || "").replace(/[^a-z]/gi, "").slice(0, 1).toUpperCase();
}
export function nextStyleNo(products, brandId, categoryCode, digits) {
  let max = 0;
  products.forEach((p) => { if (p.brandId === brandId && p.categoryCode === categoryCode && p.styleNo) max = Math.max(max, parseInt(p.styleNo, 10) || 0); });
  return String(max + 1).padStart(digits, "0");
}
export function buildSku(p, ctx) {
  const { brands, colours, materials, skuConfig } = ctx;
  const brand = brands.find((b) => b.id === p.brandId);
  const parts = skuConfig.segments.filter((s) => s.on).map((s) => {
    switch (s.id) {
      case "brand": return { id: s.id, val: brand?.code || "", meaning: brand?.name || "" };
      case "gender": return { id: s.id, val: GENDER_CODES[p.gender] || "", meaning: GENDER_MEANING[GENDER_CODES[p.gender]] || "" };
      case "category": return { id: s.id, val: p.categoryCode || "", meaning: ctx.categories?.find((c) => c.code === p.categoryCode)?.name || "" };
      case "style": return { id: s.id, val: (p.styleNo || "").padStart(skuConfig.styleDigits, "0"), meaning: p.styleNo ? "style #" + parseInt(p.styleNo, 10) : "" };
      case "material": { const v = materialCodeOf(p, materials); return { id: s.id, val: v, meaning: materials.find((m) => m.code === v)?.name || p.material || "" }; }
      case "colour": return { id: s.id, val: colourCode(p.colour, colours), meaning: p.colour || "" };
      default: return { id: s.id, val: "" };
    }
  });
  return { parts, sku: parts.map((x) => x.val).join(skuConfig.separator) };
}
// Decode any SKU string against the current rules
export function decodeSku(sku, ctx) {
  const { brands, colours, materials, categories, skuConfig } = ctx;
  let rest = (sku || "").toUpperCase().replace(new RegExp(skuConfig.separator ? skuConfig.separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "(?!)", "g"), "");
  const out = [];
  for (const s of skuConfig.segments.filter((x) => x.on)) {
    let val = "", meaning = "";
    if (s.id === "brand") { const b = brands.find((b) => rest.startsWith(b.code)); if (!b) return null; val = b.code; meaning = b.name; }
    else if (s.id === "gender") { val = rest[0] || ""; meaning = GENDER_MEANING[val] || "?"; }
    else if (s.id === "category") { const c = [...categories].sort((a, b) => b.code.length - a.code.length).find((c) => rest.startsWith(c.code)); if (!c) return null; val = c.code; meaning = c.name; }
    else if (s.id === "style") { const m = rest.match(/^\d+/); if (!m) return null; val = m[0]; meaning = "style #" + parseInt(val, 10); }
    else if (s.id === "material") { val = rest[0] || ""; meaning = materials.find((m) => m.code === val)?.name || "?"; }
    else if (s.id === "colour") { val = rest.slice(0, 2); meaning = colours.find((c) => c.code === val)?.name || "?"; }
    out.push({ id: s.id, val, meaning }); rest = rest.slice(val.length);
  }
  return rest ? null : out;
}
// Google Drive share link → direct image link
export function directImageUrl(u) {
  if (!u) return u;
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  const d = u.match(/dropbox\.com\/(.+)\?dl=0/); if (d) return `https://dl.dropboxusercontent.com/${d[1]}`;
  return u;
}
export const isFolderLink = (u) => /drive\.google\.com\/drive\/folders/.test(u || "");

// Build the SKU and, if it already exists (manual, imported or generated), move to the next free style number.
export function ensureUniqueSku(p, ctx, takenSet) {
  let styleNo = p.styleNo || "1"; let sku = buildSku({ ...p, styleNo }, ctx).sku; let guard = 0;
  while (takenSet.has(sku) && guard++ < 5000) { styleNo = String(parseInt(styleNo, 10) + 1).padStart(ctx.skuConfig.styleDigits, "0"); sku = buildSku({ ...p, styleNo }, ctx).sku; }
  return { styleNo, sku };
}
