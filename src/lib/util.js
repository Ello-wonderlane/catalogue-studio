// Small helpers shared across the app.
import { FIELDS } from "../config/fields.js";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const emptyProduct = (brand) => ({
  id: uid(), name: "", brandId: brand?.id || "", categoryCode: "", styleNo: "", materialCode: "", skuLocked: false, thumb: "",
  ...Object.fromEntries(FIELDS.map((f) => [f.key, f.def || (f.type === "select" ? f.options[0] : "")])),
  gender: "female", ageGroup: "adults-women", weightUnit: "KILOGRAM", laptop: "no", water: "water resistant", packType: "pack of 1", pattern: "solid",
  hsn: brand?.hsn || "", gst: brand?.gst || "", warranty: brand?.warranty || "", care: brand?.care || "",
});
export const marginOf = (p) => { const s = +p.selling, l = +p.landing; return s > 0 && l >= 0 && p.selling !== "" && p.landing !== "" ? (((s - l) / s) * 100).toFixed(1) : ""; };
export const valueOf = (p, key, brands) => key === "brand" ? brands.find((b) => b.id === p.brandId)?.name || "" : key === "margin" ? marginOf(p) : key === "name" ? p.name || p.contents : p[key] ?? "";
export function download(dataUrl, name) { const a = document.createElement("a"); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
