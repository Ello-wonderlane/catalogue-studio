import { useState } from "react";
import { fmtDateTime, download } from "../lib/util.js";

const LABEL = { add: "Added product", edit: "Edited product", delete: "Deleted product", "delete-all": "Cleared all products", import: "Imported from Excel", "import-update": "Updated from Excel", restore: "Restored backup", thumb: "Set thumbnail", settings: "Changed settings" };
const describe = (h) => {
  const d = h.detail || {};
  if (h.action === "edit") return d.fields?.length ? "changed: " + d.fields.join(", ") : "no field changes";
  if (h.action === "add") return d.name || "";
  if (h.action === "delete") return d.name || "";
  if (h.action === "import") return `${d.added} new (${(d.skus || []).slice(0, 5).join(", ")}${(d.skus || []).length > 5 ? "…" : ""})`;
  if (h.action === "import-update") return `${d.updated} updated (${(d.skus || []).slice(0, 5).join(", ")}${(d.skus || []).length > 5 ? "…" : ""})`;
  if (h.action === "settings") return (d.changed || []).join(", ");
  if (h.action === "restore") return `${d.products} products from backup ${d.from || ""}`;
  if (h.action === "delete-all") return `${d.count} products`;
  return d.note || "";
};

export default function HistoryView({ history, products, startEdit }) {
  const [person, setPerson] = useState("all");
  const [action, setAction] = useState("all");
  const [q, setQ] = useState("");
  const people = [...new Set(history.map((h) => h.who).filter(Boolean))];
  const list = history.filter((h) => (person === "all" || h.who === person) && (action === "all" || h.action === action) && (!q || (h.sku + " " + JSON.stringify(h.detail || {})).toLowerCase().includes(q.toLowerCase())));
  const exportCsv = () => { const rows = [["When", "Who", "Action", "SKU", "Detail"], ...list.map((h) => [fmtDateTime(h.at), h.who, LABEL[h.action] || h.action, h.sku, describe(h)])]; download("data:text/csv;charset=utf-8," + encodeURIComponent(rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")), "catalogue-history.csv"); };
  const perPerson = people.map((p) => ({ p, n: history.filter((h) => h.who === p).length })).sort((a, b) => b.n - a.n);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 20 }}>Edit history</h2>
          <span className="note">{history.length} entries · newest first</span>
          <span style={{ marginLeft: "auto" }} />
          <select value={person} onChange={(e) => setPerson(e.target.value)} style={{ width: 160 }}><option value="all">Everyone</option>{people.map((p) => <option key={p}>{p}</option>)}</select>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={{ width: 190 }}><option value="all">All actions</option>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input placeholder="SKU or text…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
          <button className="btn small" onClick={exportCsv}>Export CSV</button>
        </div>
        <div className="row" style={{ marginBottom: 6 }}>{perPerson.map(({ p, n }) => <span key={p} className="chip"><b>{p}</b> {n} changes</span>)}</div>
        <div style={{ overflowX: "auto" }}><table className="cat">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>SKU</th><th>Detail</th></tr></thead>
          <tbody>{list.slice(0, 500).map((h, i) => { const p = products.find((x) => x.sku === h.sku); return (<tr key={i}>
            <td className="note" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(h.at)}</td><td><b>{h.who || "?"}</b></td><td>{LABEL[h.action] || h.action}</td>
            <td className="mono">{h.sku}{p && <button className="btn small" style={{ marginLeft: 6 }} onClick={() => startEdit(p)}>open</button>}</td>
            <td style={{ maxWidth: 520 }}>{describe(h)}</td></tr>); })}</tbody>
        </table></div>
        {list.length === 0 && <div className="empty">No history yet — every add, edit, delete, import and settings change is recorded here with the person's name.</div>}
      </div>
    </div>
  );
}
