import { useState, useMemo } from "react";
import { readFile, loadImage, fitToJpeg, thumbOf } from "../lib/image.js";
import { uploadProductImage, imageField, usingSupabase } from "../lib/storage.js";
import { sleep } from "../lib/util.js";

// Assign a folder of camera photos (IMG_1234.jpg …) to products by sight, for when you don't
// know the SKU codes. Pick a product, click its photos in order — first click becomes the main
// image, then angles 2-5 — then upload. Photos are shrunk to 1600px on the way out.
export default function MatchView({ products, brands, onApplyImage, say }) {
  const [photos, setPhotos] = useState([]);   // {id,name,src,productId,slot}
  const [pick, setPick] = useState(null);     // product currently being filled
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(0);

  const onFiles = async (e) => {
    const fs = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    if (!fs.length) return;
    setBusy(`Reading ${fs.length} photos…`);
    const items = [];
    for (const f of fs) items.push({ id: f.name + ":" + f.size, name: f.name, src: await readFile(f), productId: "", slot: 0 });
    // keep them in the order the camera wrote them, so a per-product burst stays together
    items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setPhotos(items); setBusy(""); e.target.value = "";
    say(`${items.length} photos loaded — pick a product, then click its photos in order`);
  };

  const assignedTo = (pid) => photos.filter((p) => p.productId === pid).sort((a, b) => a.slot - b.slot);
  const toggle = (photo) => {
    if (!pick) return say("Choose a product on the right first");
    setPhotos((ps) => {
      const mine = ps.filter((x) => x.productId === pick.id);
      if (photo.productId === pick.id) {                      // clicking again unassigns and closes the gap
        const rest = mine.filter((x) => x.id !== photo.id).sort((a, b) => a.slot - b.slot);
        return ps.map((x) => {
          if (x.id === photo.id) return { ...x, productId: "", slot: 0 };
          const i = rest.findIndex((r) => r.id === x.id);
          return i >= 0 ? { ...x, slot: i + 1 } : x;
        });
      }
      if (mine.length >= 5) { say(`${pick.sku || "This product"} already has 5 images`); return ps; }
      return ps.map((x) => (x.id === photo.id ? { ...x, productId: pick.id, slot: mine.length + 1 } : x));
    });
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => !t || [p.sku, p.name, p.colour, p.contents].some((v) => String(v || "").toLowerCase().includes(t)));
  }, [products, q]);

  const ready = photos.filter((p) => p.productId && p.slot);
  const upload = async () => {
    if (!ready.length) return say("Nothing assigned yet");
    if (!confirm(`Upload ${ready.length} photo(s) to ${new Set(ready.map((r) => r.productId)).size} product(s)?`)) return;
    let ok = 0, failed = 0; setDone(0);
    for (const item of ready) {
      const p = products.find((x) => x.id === item.productId);
      if (!p?.sku) { failed++; continue; }
      setBusy(`Uploading ${ok + failed + 1} / ${ready.length}…`);
      try {
        const jpeg = await fitToJpeg(item.src, 1600, 0.85);
        const url = await uploadProductImage(p.sku, item.slot, jpeg);
        const thumb = item.slot === 1 ? thumbOf(await loadImage(jpeg)) : null;
        onApplyImage?.(p.id, imageField(item.slot), url, thumb);
        ok++;
      } catch (e) { console.error(item.name, e); failed++; }
      setDone((n) => n + 1); await sleep(20);
    }
    setBusy("");
    if (ok) setPhotos((ps) => ps.filter((x) => !ready.includes(x)));
    say(failed ? `Uploaded ${ok}, ${failed} failed — see the console` : `Uploaded ${ok} photo${ok === 1 ? "" : "s"}`);
  };

  const nameOf = (p) => [p.sku || "(no SKU)", p.name || p.contents, p.colour].filter(Boolean).join(" · ");

  return (
    <div className="card">
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>Match photos to products</h2>
      <div className="note" style={{ marginBottom: 12 }}>
        For a folder of camera photos when you don't know the SKU codes. Pick a product on the right,
        then click its photos in order — the first becomes the main image, the rest become angles 2-5.
        Photos are shrunk to 1600px before upload, which is what the marketplaces want.
        {!usingSupabase && <b> Needs Supabase — set it up first.</b>}
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <label className="btn" style={{ margin: 0 }}>Choose photos…
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onFiles} /></label>
        <span className="note">{photos.length} loaded · <b>{ready.length}</b> assigned{busy ? ` · ${busy}` : ""}</span>
        <span style={{ marginLeft: "auto" }} />
        <button className="btn primary" disabled={!ready.length || !!busy || !usingSupabase} onClick={upload}>
          Upload {ready.length || ""} &amp; link</button>
        <button className="btn" disabled={!photos.length} onClick={() => { setPhotos([]); setPick(null); }}>Clear</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div>
          {!photos.length && <div className="note">No photos loaded yet.</div>}
          <div className="bulk-grid">
            {photos.map((ph) => {
              const owner = ph.productId ? products.find((x) => x.id === ph.productId) : null;
              const mine = pick && ph.productId === pick.id;
              return (
                <div className="item" key={ph.id} onClick={() => toggle(ph)}
                     style={{ cursor: "pointer", outline: mine ? "2px solid var(--olive)" : owner ? "2px solid var(--line)" : "none", opacity: owner && !mine ? 0.55 : 1 }}>
                  <img src={ph.src} alt="" />
                  <div className="cap">
                    {ph.slot ? <span className="pill">{ph.slot === 1 ? "main" : "angle " + ph.slot}</span> : <span className="note">unassigned</span>}
                    <div className="note" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{owner ? (owner.sku || owner.name) : ph.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Product being filled</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name, colour, SKU…" />
          </div>
          <div style={{ maxHeight: 460, overflow: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
            {list.map((p) => {
              const n = assignedTo(p.id).length;
              const on = pick?.id === p.id;
              return (
                <div key={p.id} onClick={() => setPick(p)}
                     style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 9px", cursor: "pointer",
                              background: on ? "var(--soft)" : "transparent", borderBottom: "1px solid var(--line)" }}>
                  {p.thumb ? <img className="thumb" src={p.thumb} alt="" /> : <div className="thumb" />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mono" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(p)}</div>
                    <div className="note">{n ? `${n} photo${n === 1 ? "" : "s"} assigned` : "none yet"}</div>
                  </div>
                  {on && <span className="pill">filling</span>}
                </div>
              );
            })}
            {!list.length && <div className="note" style={{ padding: 10 }}>No products match “{q}”.</div>}
          </div>
          <div className="note" style={{ marginTop: 8 }}>
            Click a product, then its photos. Clicking an assigned photo again removes it and renumbers the rest.
          </div>
        </div>
      </div>
    </div>
  );
}
