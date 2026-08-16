// Image processing that runs entirely in the browser: background removal (flood fill from the edges),
// trimming, the instant procedural backdrop, compositing and thumbnails. No server, no AI service.

export function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
export function readFile(f) { return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); }); }
export function removeBackground(img, tolerance = 40) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h); const d = id.data;
  const edge = [];
  for (let x = 0; x < w; x++) { edge.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { edge.push(y * w, y * w + w - 1); }
  let r0 = 0, g0 = 0, b0 = 0; edge.forEach((i) => { r0 += d[i * 4]; g0 += d[i * 4 + 1]; b0 += d[i * 4 + 2]; }); r0 /= edge.length; g0 /= edge.length; b0 /= edge.length;
  const tol2 = tolerance * tolerance * 3;
  const near = (i) => { const dr = d[i * 4] - r0, dg = d[i * 4 + 1] - g0, db = d[i * 4 + 2] - b0; return dr * dr + dg * dg + db * db <= tol2; };
  const bg = new Uint8Array(w * h); const stack = [];
  edge.forEach((i) => { if (!bg[i] && near(i)) { bg[i] = 1; stack.push(i); } });
  while (stack.length) {
    const i = stack.pop(); const x = i % w, y = (i / w) | 0;
    const nb = []; if (x > 0) nb.push(i - 1); if (x < w - 1) nb.push(i + 1); if (y > 0) nb.push(i - w); if (y < h - 1) nb.push(i + w);
    for (const j of nb) if (!bg[j] && near(j)) { bg[j] = 1; stack.push(j); }
  }
  for (let i = 0; i < w * h; i++) if (bg[i]) d[i * 4 + 3] = 0;
  const a = new Uint8ClampedArray(w * h); for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (a[i] === 255) { const s = a[i - 1] + a[i + 1] + a[i - w] + a[i + w]; if (s < 1020) d[i * 4 + 3] = Math.round((a[i] * 2 + s / 4) / 3); } }
  ctx.putImageData(id, 0, 0); return c;
}
export function trimTransparent(canvas) {
  const w = canvas.width, h = canvas.height; const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (maxX <= minX) return canvas;
  const out = document.createElement("canvas"); out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext("2d").drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height); return out;
}
export function proceduralBackground(prompt, size = 1024) {
  const c = document.createElement("canvas"); c.width = size; c.height = size; const g = c.getContext("2d"); const p = prompt.toLowerCase();
  let base = ["#E8E2D8", "#CFC6B8"], accent = "#B8975F";
  if (/dark|black|night|moody|charcoal/.test(p)) { base = ["#2A2622", "#141210"]; accent = "#6E5A3A"; }
  else if (/marble|white|clean|studio|minimal/.test(p)) { base = ["#F5F3EF", "#DEDAD3"]; accent = "#C9C3B8"; }
  else if (/pink|blush|rose|pastel/.test(p)) { base = ["#F6E4E4", "#E7C4C4"]; accent = "#D9A3A3"; }
  else if (/green|olive|sage|forest|leaf/.test(p)) { base = ["#DCE2D2", "#9FAA8C"]; accent = "#6E7A5A"; }
  else if (/blue|sky|ocean|navy/.test(p)) { base = ["#DCE6EF", "#9FB6CB"]; accent = "#5C7A96"; }
  else if (/gold|luxury|festive|warm|sunset|amber/.test(p)) { base = ["#F1DFC0", "#C79A5C"]; accent = "#A87A38"; }
  else if (/wood|oak|walnut|table|desk/.test(p)) { base = ["#C7A17A", "#7E5A3B"]; accent = "#5C3F27"; }
  else if (/red|maroon|burgundy|wine/.test(p)) { base = ["#E7CACA", "#8A3B3B"]; accent = "#5C2323"; }
  const grad = g.createLinearGradient(0, 0, size * 0.3, size); grad.addColorStop(0, base[0]); grad.addColorStop(1, base[1]); g.fillStyle = grad; g.fillRect(0, 0, size, size);
  const rg = g.createRadialGradient(size * 0.35, size * 0.3, 10, size * 0.35, size * 0.3, size * 0.75); rg.addColorStop(0, "rgba(255,255,255,0.35)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(0, 0, size, size);
  if (/table|desk|surface|shelf|floor|counter|marble|wood|stone/.test(p)) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, size * 0.66, size, size * 0.34); g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, size * 0.66, size, 3); }
  if (/marble/.test(p)) { g.strokeStyle = "rgba(120,120,120,0.18)"; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); let x = Math.random() * size, y = 0; g.moveTo(x, y); while (y < size) { x += (Math.random() - 0.5) * 60; y += 30 + Math.random() * 40; g.lineTo(x, y); } g.stroke(); } }
  if (/wood|oak|walnut/.test(p)) { g.strokeStyle = "rgba(60,35,15,0.15)"; g.lineWidth = 3; for (let y = 0; y < size; y += 14 + Math.random() * 10) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x < size; x += 40) g.lineTo(x, y + Math.sin(x / 90 + y) * 4); g.stroke(); } }
  const id = g.getImageData(0, 0, size, size); const d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0);
  const vg = g.createRadialGradient(size / 2, size / 2, size * 0.45, size / 2, size / 2, size * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.25)"); g.fillStyle = vg; g.fillRect(0, 0, size, size);
  g.fillStyle = accent; g.globalAlpha = 0.08; g.fillRect(0, 0, size, size); g.globalAlpha = 1; return c;
}
export function composite(bg, cutout, opts) {
  const size = bg.width; const c = document.createElement("canvas"); c.width = size; c.height = size; const g = c.getContext("2d"); g.drawImage(bg, 0, 0);
  const scale = Math.min((size * opts.fill) / cutout.width, (size * opts.fill) / cutout.height); const w = cutout.width * scale, h = cutout.height * scale; const x = (size - w) / 2, y = (size - h) / 2 + size * opts.yOffset;
  if (opts.shadow) { g.save(); g.shadowColor = "rgba(0,0,0,0.45)"; g.shadowBlur = size * 0.05; g.shadowOffsetY = size * 0.02; g.drawImage(cutout, x, y, w, h); g.restore(); }
  g.drawImage(cutout, x, y, w, h); return c;
}
export function thumbOf(cv, px = 320) { const w = cv.width, h = cv.height; const s = Math.min(px / w, px / h, 1); const c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s); c.getContext("2d").drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.82); }
