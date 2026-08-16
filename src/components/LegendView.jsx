import { useState, Fragment } from "react";
import { GENDER_MEANING } from "../config/fields.js";
import { SEG_COLORS, SEG_HELP } from "../config/taxonomy.js";
import { buildSku, decodeSku } from "../lib/sku.js";
import SkuTicket from "./SkuTicket.jsx";

export default function LegendView({ ctx, products }) {
  const [test, setTest] = useState(products[0]?.sku || "YSWHA0154PCB");
  const decoded = decodeSku(test, ctx);
  const on = ctx.skuConfig.segments.filter((s) => s.on);
  const example = buildSku({ brandId: ctx.brands[0]?.id, gender: "female", categoryCode: "HA", styleNo: "154", material: "PU", colour: "Croco Black" }, ctx);
  const cats = [...new Set(ctx.categories.map((c) => c.dept))];
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="panel">
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>How to read a SKU</h2>
        <div className="note" style={{ marginBottom: 14, maxWidth: 760 }}>Every product code is built from fixed blocks in a fixed order. Read it left to right. Anyone new to the team can use this page (or the “SKU Legend” sheet included in every Excel export) to understand any code without asking.</div>
        <SkuTicket parts={example.parts} sku={example.sku} separator={ctx.skuConfig.separator} showMeaning />
        <div style={{ marginTop: 16 }} className="legend">
          {on.map((s, i) => <Fragment key={s.id}>
            <b style={{ color: SEG_COLORS[s.id] }}>{i + 1}. {s.label}</b>
            <span>{SEG_HELP[s.id]}{s.id === "style" && ` — ${ctx.skuConfig.styleDigits} digits, restarts at 0001 for every brand + category, so “${example.parts.find((p) => p.id === "style")?.val}” is the ${parseInt(example.parts.find((p) => p.id === "style")?.val || "1", 10)}th style in that category. Colourways of the same style share it.`}</span>
          </Fragment>)}
        </div>
      </div>
      <div className="panel">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Decode any SKU</h3>
        <div className="row"><input className="mono" style={{ width: 240 }} value={test} onChange={(e) => setTest(e.target.value.toUpperCase())} />
          {decoded ? <span className="row">{decoded.map((d) => <span key={d.id} className="chip"><b className="mono" style={{ color: SEG_COLORS[d.id] }}>{d.val}</b> {d.meaning}</span>)}</span> : <span className="note" style={{ color: "var(--ox)" }}>Doesn't match the current SKU rule (an unknown brand/category code, or a manually typed SKU).</span>}</div>
      </div>
      <div className="grid3">
        <div className="panel"><h3 style={{ fontSize: 16, marginBottom: 8 }}>Brand codes</h3>{ctx.brands.map((b) => <div key={b.id}><b className="mono">{b.code}</b> {b.name}</div>)}
          <h3 style={{ fontSize: 16, margin: "14px 0 8px" }}>Gender codes</h3>{Object.entries(GENDER_MEANING).map(([k, v]) => <div key={k}><b className="mono">{k}</b> {v}</div>)}
          <h3 style={{ fontSize: 16, margin: "14px 0 8px" }}>Material codes</h3>{ctx.materials.map((m) => <div key={m.code}><b className="mono">{m.code}</b> {m.name}</div>)}</div>
        <div className="panel"><h3 style={{ fontSize: 16, marginBottom: 8 }}>Category codes</h3>{cats.map((d) => <div key={d} style={{ marginBottom: 8 }}><label>{d}</label>{ctx.categories.filter((c) => c.dept === d).map((c) => <div key={c.code} style={{ fontSize: 13 }}><b className="mono">{c.code}</b> {c.name}</div>)}</div>)}</div>
        <div className="panel"><h3 style={{ fontSize: 16, marginBottom: 8 }}>Colour codes</h3>{ctx.colours.map((c) => <div key={c.code} style={{ fontSize: 13 }}><b className="mono">{c.code}</b> {c.name}</div>)}</div>
      </div>
    </div>
  );
}
