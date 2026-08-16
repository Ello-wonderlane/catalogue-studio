import { useState } from "react";
import * as XLSX from "xlsx";
import { FIELDS, VIRTUAL_FIELDS, AUTOMAP } from "../config/fields.js";
import { uid } from "../lib/util.js";

// Build an export format from a marketplace's own template file (Amazon / Nykaa / Ajio / Flipkart / Myntra ...).
// The template's header rows are kept exactly; each of its columns is mapped to one of our fields, a fixed value, or left blank.
const OPTIONS = [["", "— leave blank —"], ["__const", "Fixed value…"], ...FIELDS.filter((f) => f.type !== "date").map((f) => [f.key, f.label]), ...VIRTUAL_FIELDS];
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const autoMap = (header) => { const h = norm(header); if (!h) return ""; for (const [re, key] of AUTOMAP) if (re.test(h)) return key; return ""; };

export default function FormatBuilder({ formats, setFormats, say, onClose, editing }) {
  const [draft, setDraft] = useState(editing || null); // {id,name,sheet,headerRowIndex,headerRows,cols:[{header,map,constant}]}
  const [wb, setWb] = useState(null);
  const [sheet, setSheet] = useState("");
  const [hdrRow, setHdrRow] = useState(1);
  const [name, setName] = useState(editing?.name || "");

  const readFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const w = XLSX.read(r.result, { type: "array" }); setWb(w); setSheet(w.SheetNames[0]); guessHeaderRow(w, w.SheetNames[0]); }; r.readAsArrayBuffer(f); e.target.value = ""; };
  const rowsOf = (w, sh) => XLSX.utils.sheet_to_json(w.Sheets[sh], { header: 1, defval: "", blankrows: false }).slice(0, 12);
  const guessHeaderRow = (w, sh) => { const rows = rowsOf(w, sh); let best = 1, score = -1; rows.forEach((r, i) => { const s = r.filter((c) => String(c).trim()).length + r.filter((c) => autoMap(c)).length * 2; if (s > score) { score = s; best = i + 1; } }); setHdrRow(best); };
  const build = () => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: "", blankrows: false });
    const headerRows = rows.slice(0, hdrRow); const header = rows[hdrRow - 1] || [];
    const width = Math.max(...headerRows.map((r) => r.length));
    const cols = Array.from({ length: width }, (_, i) => ({ header: String(header[i] ?? ""), map: autoMap(header[i]) || (headerRows.length > 1 ? autoMap(headerRows[headerRows.length - 2]?.[i]) : "") || "", constant: "" }));
    setDraft({ id: editing?.id || uid(), name: name || sheet, sheet, headerRowIndex: hdrRow, headerRows, cols });
  };
  const setCol = (i, patch) => setDraft((d) => ({ ...d, cols: d.cols.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const save = () => { if (!draft.name.trim()) { say("Give the format a name"); return; } const f = { ...draft, name: draft.name.trim() }; setFormats(formats.some((x) => x.id === f.id) ? formats.map((x) => (x.id === f.id ? f : x)) : [...formats, f]); say("Format saved: " + f.name); onClose(); };
  const mapped = draft ? draft.cols.filter((c) => c.map).length : 0;

  return (
    <div className="panel" style={{ borderColor: "var(--tan)" }}>
      <div className="row" style={{ marginBottom: 8 }}><h3 style={{ fontSize: 17 }}>{editing ? "Edit format: " + editing.name : "New marketplace format from a template file"}</h3><span style={{ marginLeft: "auto" }} /><button className="btn small" onClick={onClose}>Close</button></div>
      {!draft && (<>
        <div className="note" style={{ marginBottom: 10 }}>Download the listing / catalogue template from the marketplace's seller portal (Amazon: Inventory → Add products via upload → category template; Nykaa / Ajio / Myntra / Flipkart: their catalogue upload sheet). Upload it here — its headers are kept exactly and you map each column once.</div>
        <div className="row"><input type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={readFile} />
          {wb && <><select value={sheet} onChange={(e) => { setSheet(e.target.value); guessHeaderRow(wb, e.target.value); }} style={{ width: 200 }}>{wb.SheetNames.map((s) => <option key={s}>{s}</option>)}</select>
            <label style={{ margin: 0 }}>Header row</label><input type="number" min="1" max="12" value={hdrRow} onChange={(e) => setHdrRow(+e.target.value || 1)} style={{ width: 70 }} />
            <input placeholder="Format name (e.g. Amazon Handbags)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 240 }} />
            <button className="btn primary" onClick={build}>Read columns →</button></>}</div>
        {wb && <div style={{ overflowX: "auto", marginTop: 10 }}><table className="cat" style={{ fontSize: 11 }}><tbody>{rowsOf(wb, sheet).map((r, i) => <tr key={i} style={i + 1 === hdrRow ? { background: "#F5F1E6" } : undefined}><td className="note">{i + 1}</td>{r.slice(0, 14).map((c, j) => <td key={j} style={{ maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(c)}</td>)}{r.length > 14 && <td className="note">+{r.length - 14}</td>}</tr>)}</tbody></table><div className="note">Highlighted row = the header row that will be mapped (rows above it are copied to the export unchanged, e.g. Amazon's label row). Sheet: data rows in the template are ignored.</div></div>}
      </>)}
      {draft && (<>
        <div className="row" style={{ marginBottom: 8 }}><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ width: 260 }} placeholder="Format name" /><span className="note">{draft.cols.length} columns · {mapped} mapped · {draft.cols.filter((c) => c.map === "__const").length} fixed</span><span style={{ marginLeft: "auto" }} /><button className="btn small" onClick={() => setDraft({ ...draft, cols: draft.cols.map((c) => ({ ...c, map: c.map || autoMap(c.header) })) })}>Auto-map empty</button><button className="btn primary" onClick={save}>Save format</button></div>
        <div style={{ maxHeight: 460, overflowY: "auto" }}><table className="cat">
          <thead><tr><th>#</th><th>Marketplace column</th><th>Fill with</th><th>Fixed value</th></tr></thead>
          <tbody>{draft.cols.map((c, i) => <tr key={i} style={!c.map ? { opacity: 0.7 } : undefined}>
            <td className="note">{i + 1}</td><td style={{ maxWidth: 260 }} title={c.header}>{c.header || <span className="note">(blank header)</span>}</td>
            <td><select value={c.map} onChange={(e) => setCol(i, { map: e.target.value })} style={{ width: 240 }}>{OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
            <td>{c.map === "__const" && <input value={c.constant} onChange={(e) => setCol(i, { constant: e.target.value })} placeholder="e.g. IN, Handbag, New" style={{ width: 200 }} />}</td>
          </tr>)}</tbody></table></div>
        <div className="note" style={{ marginTop: 8 }}>Tip: columns the marketplace fills itself or that don't apply can stay blank. Fixed values are handy for country of origin, condition (New), item type, fulfilment, etc.</div>
      </>)}
    </div>
  );
}
