import { SEG_COLORS } from "../config/taxonomy.js";

export default function SkuTicket({ parts, sku, separator, showMeaning }) {
  return (
    <div className="ticket">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end" }}>
        {parts.map((s, i) => <div key={s.id} className={"seg" + (s.val ? "" : " empty")}><b style={{ color: s.val ? SEG_COLORS[s.id] : undefined }}>{s.val || "··"}{i < parts.length - 1 && separator ? separator : ""}</b><span>{s.id}</span></div>)}
      </div>
      <div className="note" style={{ marginTop: 6 }}>Merchant SKU: <b className="mono" style={{ color: "var(--ink)" }}>{sku || "—"}</b></div>
      {showMeaning && <div className="note" style={{ marginTop: 4 }}>{parts.filter((p) => p.val).map((p) => <span key={p.id} style={{ marginRight: 10 }}><b style={{ color: SEG_COLORS[p.id] }}>{p.val}</b> = {p.meaning || "?"}</span>)}</div>}
    </div>
  );
}
