import { useState, useEffect, useRef } from "react";
import { loadImage, readFile, removeBackground, trimTransparent, proceduralBackground, plainBackground, composite, thumbOf, fitToJpeg } from "../lib/image.js";
import { makeBackground } from "../lib/ai.js";
import { download, sleep } from "../lib/util.js";
import { uploadProductImage, imageField, usingSupabase } from "../lib/storage.js";

export default function StudioView({ products, product, setProduct, aiSettings, setAiSettings, onApplyThumb, onApplyImage, say }) {
  const [mode, setMode] = useState("single");
  const [src, setSrc] = useState(null); const [cut, setCut] = useState(null); const [result, setResult] = useState(null);
  const [tol, setTol] = useState(40);
  const [prompt, setPrompt] = useState("soft warm studio backdrop with a light stone tabletop and gentle window light");
  const [fill, setFill] = useState(0.7); const [yOff, setYOff] = useState(0.06); const [shadow, setShadow] = useState(true);
  const [busy, setBusy] = useState("");
  const [batch, setBatch] = useState([]); // {name, src, out, status, sku}
  const [reuseBg, setReuseBg] = useState(true);
  const boxRef = useRef();
  const opts = { fill, yOffset: yOff, shadow };

  const onFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; setSrc(await readFile(f)); setCut(null); setResult(null); };
  const doCut = async () => { setBusy("Removing background…"); await sleep(30); try { setCut(trimTransparent(removeBackground(await loadImage(src), tol))); setResult(null); } catch { say("Could not process image"); } setBusy(""); };
  const generate = async () => {
    if (!cut) return; setBusy(aiSettings.engine === "instant" ? "Building backdrop…" : "Generating backdrop…");
    try { setResult(composite(await makeBackground(aiSettings, prompt), cut, opts)); }
    catch (e) { say("AI backdrop failed — used instant backdrop. " + (e.message || "")); setResult(composite(proceduralBackground(prompt, aiSettings.size), cut, opts)); }
    setBusy("");
  };
  useEffect(() => { if (result && boxRef.current) { boxRef.current.innerHTML = ""; boxRef.current.appendChild(result); } }, [result]);

  // ---- bulk ----
  const onFiles = async (e) => {
    const fs = [...(e.target.files || [])]; const items = [];
    // Longest SKU first: with plain "includes", a short SKU that happens to sit inside a longer
    // one would claim the photo, silently attaching it to the wrong product. Whatever follows the
    // SKU must be nothing, or a separator plus the image number ("SKU-2.jpg" -> slot 2).
    const bySku = products.filter((p) => p.sku).sort((a, b) => b.sku.length - a.sku.length);
    const match = (base) => {
      const u = base.toUpperCase().replace(/\s+/g, "");
      for (const p of bySku) {
        const sku = p.sku.toUpperCase();
        if (!u.startsWith(sku)) continue;
        const m = u.slice(sku.length).match(/^[-_]?(\d{1,2})?$/);
        if (m) return { sku: p.sku, slot: Math.min(5, Math.max(1, Number(m[1] || 1))) };
      }
      return { sku: "", slot: 1 };
    };
    for (const f of fs) { const s = await readFile(f); const base = f.name.replace(/\.[^.]+$/, ""); const { sku, slot } = match(base); items.push({ name: base, src: s, out: null, status: "queued", sku, slot }); }
    setBatch(items); e.target.value = "";
  };
  const runBatch = async () => {
    if (!batch.length) return;
    let bg = null;
    for (let i = 0; i < batch.length; i++) {
      setBatch((b) => b.map((x, j) => (j === i ? { ...x, status: "processing" } : x))); setBusy(`Processing ${i + 1} / ${batch.length}…`);
      try {
        const img = await loadImage(batch[i].src); const cutout = trimTransparent(removeBackground(img, tol));
        if (!bg || !reuseBg) { try { bg = await makeBackground(aiSettings, prompt); } catch { bg = proceduralBackground(prompt, aiSettings.size); } }
        const out = composite(bg, cutout, opts);
        setBatch((b) => b.map((x, j) => (j === i ? { ...x, out: out.toDataURL("image/jpeg", 0.92), thumb: thumbOf(out), status: "done" } : x)));
      } catch { setBatch((b) => b.map((x, j) => (j === i ? { ...x, status: "failed" } : x))); }
      await sleep(20);
    }
    setBusy(""); say("Batch finished");
  };
  const downloadAll = async () => { for (const it of batch) { if (it.out) { download(it.out, (it.sku || it.name) + "-bg.jpg"); await sleep(350); } } };
  const uploadAll = async () => {
    const ready = batch.filter((it) => it.out && it.sku);
    if (!ready.length) return say("Nothing to upload — file names must match a SKU.");
    let ok = 0, failed = 0;
    for (let i = 0; i < ready.length; i++) {
      const it = ready[i];
      setBusy(`Uploading ${i + 1} / ${ready.length}…`);
      try {
        const url = await uploadProductImage(it.sku, it.slot || 1, it.out);
        const p = products.find((x) => x.sku === it.sku);
        if (p) { onApplyImage?.(p.id, imageField(it.slot || 1), url, it.slot === 1 ? it.thumb : null); ok++; }
        setBatch((b) => b.map((x) => (x === it ? { ...x, status: "uploaded" } : x)));
      } catch (e) {
        failed++; console.error(e);
        setBatch((b) => b.map((x) => (x === it ? { ...x, status: "upload failed" } : x)));
      }
      await sleep(30);
    }
    setBusy("");
    say(failed ? `Uploaded ${ok}, ${failed} failed — see the console` : `Uploaded ${ok} image${ok === 1 ? "" : "s"} and linked them to their products`);
  };
  const applyThumbs = () => { let n = 0; batch.forEach((it) => { if (it.sku && it.thumb) { const p = products.find((x) => x.sku === it.sku); if (p) { onApplyThumb(p.id, it.thumb); n++; } } }); say(n ? `Set ${n} thumbnails by matching SKU in file names` : "No file names matched an existing SKU"); };

  // One real photo -> a full listing set. Slot 1 is pure white because Amazon requires the main
  // image on RGB 255,255,255; the rest are lifestyle backdrops. These are all the SAME photograph
  // on different backgrounds — a genuine second angle cannot be invented from a single shot.
  const SET_BACKDROPS = [
    { label: "White (Amazon main)", white: true },
    { label: "Warm studio + stone tabletop", prompt: "soft warm studio backdrop with a light stone tabletop and gentle window light" },
    { label: "Dark luxe", prompt: "dark moody charcoal backdrop with soft directional light" },
    { label: "Sage minimal", prompt: "sage green minimal surface, clean studio light" },
    { label: "Warm gold festive", prompt: "warm gold festive luxury backdrop with amber light" },
  ];
  const [setCount, setSetCount] = useState(5);
  const [setOut, setSetOut] = useState([]);

  const makeSet = async () => {
    if (!cut) return say("Remove the background first");
    setSetOut([]); const out = [];
    for (let i = 0; i < setCount; i++) {
      const spec = SET_BACKDROPS[i];
      setBusy(`Generating ${i + 1} / ${setCount}…`);
      try {
        const bg = spec.white ? plainBackground("#FFFFFF", aiSettings.size)
                              : await makeBackground(aiSettings, spec.prompt).catch(() => proceduralBackground(spec.prompt, aiSettings.size));
        // the white main image gets a little more margin and no shadow, which is what Amazon expects
        const img = composite(bg, cut, { ...opts, fill: spec.white ? Math.min(opts.fill, 0.8) : opts.fill, shadow: spec.white ? false : opts.shadow });
        out.push({ label: spec.label, url: img.toDataURL("image/jpeg", 0.92) });
        setSetOut([...out]);
      } catch (e) { console.error(e); }
      await sleep(20);
    }
    setBusy(""); say(`${out.length} images ready — check them, then upload`);
  };

  const uploadSet = async () => {
    if (!product?.sku) return say("Choose a product with a SKU first");
    if (!setOut.length) return say("Generate the set first");
    if (!confirm(`Upload ${setOut.length} images to ${product.sku}? This replaces images 1-${setOut.length}.`)) return;
    let ok = 0;
    for (let i = 0; i < setOut.length; i++) {
      setBusy(`Uploading ${i + 1} / ${setOut.length}…`);
      try {
        const jpeg = await fitToJpeg(setOut[i].url, 1600, 0.85);
        const url = await uploadProductImage(product.sku, i + 1, jpeg);
        onApplyImage?.(product.id, imageField(i + 1), url, i === 0 ? thumbOf(await loadImage(jpeg)) : null);
        ok++;
      } catch (e) { console.error(e); }
    }
    setBusy(""); say(`Uploaded ${ok} image${ok === 1 ? "" : "s"} to ${product.sku}`);
  };

  const settings = (
    <>
      <div className="field"><label>Background removal tolerance (on-device)</label><div className="range"><input type="range" min="8" max="110" value={tol} onChange={(e) => setTol(+e.target.value)} /><span className="mono" style={{ width: 34 }}>{tol}</span></div><div className="note">Raise it if backdrop remains, lower it if the product gets eaten.</div></div>
      <div className="field"><label>Backdrop prompt</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. dark green velvet with gold light, festive" /></div>
      <div className="field"><label>AI engine</label>
        <select value={aiSettings.engine} onChange={(e) => setAiSettings({ ...aiSettings, engine: e.target.value })}>
          <option value="instant">Instant offline backdrop (no AI, free)</option>
          <option value="local">Local model — Stable Diffusion on this PC (photoreal, free)</option>
          <option value="claude">Claude API (illustrated backdrops; needs an API key — set in Help)</option>
        </select>
        {aiSettings.engine === "local" && <div style={{ marginTop: 8 }}><input value={aiSettings.endpoint} onChange={(e) => setAiSettings({ ...aiSettings, endpoint: e.target.value })} placeholder="http://127.0.0.1:7860" /><div className="note" style={{ marginTop: 4 }}>Free local Stable Diffusion WebUI (AUTOMATIC1111 / Forge) started with <span className="mono">--api --cors-allow-origins=*</span>. Nothing leaves your machine.</div></div>}
      </div>
      <div className="grid3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="field"><label>Product size</label><div className="range"><input type="range" min="0.4" max="0.95" step="0.01" value={fill} onChange={(e) => setFill(+e.target.value)} /></div></div>
        <div className="field"><label>Vertical shift</label><div className="range"><input type="range" min="-0.2" max="0.25" step="0.01" value={yOff} onChange={(e) => setYOff(+e.target.value)} /></div></div>
      </div>
      <label className="check"><input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} /> Drop shadow</label>
    </>
  );

  return (
    <div className="grid2" style={{ gridTemplateColumns: "380px 1fr", alignItems: "start" }}>
      <div className="panel">
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Image studio</h2>
        <div className="seg-tabs"><button className={mode === "single" ? "on" : ""} onClick={() => setMode("single")}>Single photo</button><button className={mode === "bulk" ? "on" : ""} onClick={() => setMode("bulk")}>Bulk — one prompt, many photos</button></div>
        {mode === "single" ? (<>
          <div className="field"><label>Product (optional)</label><select value={product?.id || ""} onChange={(e) => setProduct(products.find((p) => p.id === e.target.value) || null)}><option value="">— none —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name || p.contents}</option>)}</select></div>
          <div className="field"><label>Product photo</label><input type="file" accept="image/*" onChange={onFile} /></div>
          {settings}
          <div className="row" style={{ marginTop: 12 }}><button className="btn" disabled={!src || !!busy} onClick={doCut}>Remove background</button><button className="btn ox" disabled={!cut || !!busy} onClick={generate}>{busy || "✦ Add background"}</button></div>
        </>) : (<>
          <div className="field"><label>Product photos (many)</label><input type="file" accept="image/*" multiple onChange={onFiles} /><div className="note">Name files with the SKU (e.g. <span className="mono">YSWHA0154PCB.jpg</span>, <span className="mono">YSWHA0154PCB-2.jpg</span> for extra angles). The first one per SKU becomes the thumbnail; upload all of them to your image host and paste the links into Image URL 1–5 on the product.</div></div>
          {settings}
          <label className="check"><input type="checkbox" checked={reuseBg} onChange={(e) => setReuseBg(e.target.checked)} /> Same backdrop for the whole batch (faster, consistent look)</label>
          <button className="btn ox" style={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 15 }} disabled={!batch.length || !!busy} onClick={runBatch}>{busy || `✦ Process ${batch.length} photos`}</button>
        </>)}
      </div>
      <div>
        {mode === "single" ? (<>
          <div className="grid3">
            <div><label>Original</label><div className="canvasbox">{src ? <img src={src} alt="" /> : <span className="note">Upload a photo</span>}</div></div>
            <div><label>Cut-out</label><div className="canvasbox">{cut ? <img src={cut.toDataURL()} alt="" /> : <span className="note">Remove background</span>}</div></div>
            <div><label>Result</label><div className="canvasbox" ref={boxRef}>{!result && <span className="note">Add background</span>}</div></div>
          </div>
          {result && <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => download(result.toDataURL("image/png"), (product?.sku || "product") + "-bg.png")}>Download PNG</button>
            <button className="btn" onClick={() => download(result.toDataURL("image/jpeg", 0.92), (product?.sku || "product") + "-bg.jpg")}>Download JPG</button>
            {product && <button className="btn" onClick={() => onApplyThumb(product.id, thumbOf(result))}>Use as catalogue thumbnail</button>}
            <button className="btn" onClick={generate} disabled={!!busy}>Regenerate</button>
          </div>}

          {cut && (
            <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Listing set from this one photo</h3>
              <div className="note" style={{ marginBottom: 10 }}>
                Puts the same cut-out product on several backdrops at once. Image 1 is pure white because Amazon
                requires the main image on white. <b>All of these are the same photograph</b> — a real second angle
                (back, inside, base) cannot be generated from one shot, and inventing one misrepresents the product,
                which drives returns and can get a listing pulled. Shoot those few extra angles once per product.
              </div>
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="note">How many
                  <select value={setCount} onChange={(e) => setSetCount(+e.target.value)} style={{ marginLeft: 6, width: 56 }}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></span>
                <button className="btn primary" disabled={!!busy} onClick={makeSet}>Generate set</button>
                {usingSupabase && <button className="btn" disabled={!setOut.length || !product?.sku || !!busy} onClick={uploadSet}>Upload &amp; link to {product?.sku || "product"}</button>}
                {!product && <span className="note">Pick a product above to upload.</span>}
              </div>
              {setOut.length > 0 && (
                <div className="bulk-grid">
                  {setOut.map((it, i) => (
                    <div className="item" key={i}>
                      <img src={it.url} alt="" />
                      <div className="cap"><span className="pill">{i === 0 ? "main" : "image " + (i + 1)}</span>
                        <div className="note">{it.label}</div>
                        <button className="btn small" style={{ marginTop: 4 }} onClick={() => download(it.url, (product?.sku || "product") + "-" + (i + 1) + ".jpg")}>Download</button></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>) : (<>
          {batch.length === 0 ? <div className="panel empty"><h3>No photos queued</h3>Pick a set of product photos, write one prompt, press Process.</div> : (<>
            <div className="row" style={{ marginBottom: 10 }}><span className="note">{batch.filter((b) => b.status === "done").length} / {batch.length} done</span><span style={{ marginLeft: "auto" }} />{usingSupabase && <button className="btn primary" disabled={!batch.some((b) => b.out && b.sku) || !!busy} onClick={uploadAll}>Upload &amp; link to products</button>}<button className="btn" disabled={!batch.some((b) => b.out)} onClick={downloadAll}>Download all</button><button className="btn" disabled={!batch.some((b) => b.thumb && b.sku)} onClick={applyThumbs}>Set thumbnails by SKU</button><button className="btn" onClick={() => setBatch([])}>Clear</button></div>
            <div className="bulk-grid">{batch.map((it, i) => <div className="item" key={i}><img src={it.out || it.src} alt="" /><div className="cap"><span className={"pill" + (it.status === "failed" ? " warn" : "")}>{it.status}</span> {it.sku && <span className="mono">{it.sku}{it.slot > 1 ? " #" + it.slot : ""}</span>}<div>{it.name}</div>{it.out && <button className="btn small" style={{ marginTop: 4 }} onClick={() => download(it.out, (it.sku || it.name) + "-bg.jpg")}>Download</button>}</div></div>)}</div>
          </>)}
        </>)}
        <div className="note" style={{ marginTop: 14 }}>“Upload &amp; link” stores each image at <span className="mono">products/&lt;SKU&gt;/n.jpg</span> and writes the permanent link straight into the product — that link is what goes into the marketplace sheet. “Download” is only for keeping a copy on your computer. Don't have SKU-named files? Use the <b>Match photos</b> tab.</div>
      </div>
    </div>
  );
}
