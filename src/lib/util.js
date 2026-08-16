// Small helpers shared across the app.
import { FIELDS } from "../config/fields.js";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const emptyProduct = (brand) => ({
  id: uid(), name: "", brandId: brand?.id || "", categoryCode: "", styleNo: "", materialCode: "", skuLocked: false, thumb: "",
  ...Object.fromEntries(FIELDS.map((f) => [f.key, f.def || (f.type === "select" ? f.options[0] : "")])),
  gender: "female", ageGroup: "adults-women", weightUnit: "KILOGRAM", laptop: "no", water: "water resistant", packType: "pack of 1", pattern: "solid",
  hsn: brand?.hsn || "", gst: brand?.gst || "", warranty: brand?.warranty || "", care: brand?.care || "",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
export const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
export const fmtDateTime = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toISOString().slice(0, 16).replace("T", " "); };
export const daysAgo = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity);
export const marginOf = (p) => { const s = +p.selling, l = +p.landing; return s > 0 && l >= 0 && p.selling !== "" && p.landing !== "" ? (((s - l) / s) * 100).toFixed(1) : ""; };
export const valueOf = (p, key, brands) => key === "brand" ? brands.find((b) => b.id === p.brandId)?.name || "" : key === "margin" ? marginOf(p) : key === "skuSource" ? (p.skuLocked ? (p.source === "import" ? "imported" : "manual") : "system") : key === "name" ? p.name || p.contents : (key === "createdAt" || key === "updatedAt") ? fmtDateTime(p[key]) : p[key] ?? "";
export function download(dataUrl, name) { const a = document.createElement("a"); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
