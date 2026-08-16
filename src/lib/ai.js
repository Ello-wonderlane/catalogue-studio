// AI providers. Everything here is optional — the app works with the "instant" engine and no AI at all.
//   Backdrops:  instant (offline)  |  local (Stable Diffusion WebUI on your PC)  |  claude (needs an Anthropic API key)
//   Text copy:  ollama (free local LLM)  |  claude (needs an Anthropic API key)
import { loadImage, proceduralBackground } from "./image.js";

export const DEFAULT_AI = { engine: "instant", endpoint: "http://127.0.0.1:7860", size: 1024, textProvider: "ollama", ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.2", anthropicKey: "" };

function anthropicHeaders(key) {
  return { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
}
async function anthropicText(key, prompt) {
  if (!key) throw new Error("No Anthropic API key set (Help → AI setup)");
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: anthropicHeaders(key), body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json(); if (data.error) throw new Error(data.error.message);
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}
async function ollamaText(url, model, prompt) {
  const res = await fetch(url.replace(/\/$/, "") + "/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false }) });
  if (!res.ok) throw new Error("Ollama returned " + res.status + " — is it running with OLLAMA_ORIGINS=*?");
  return (await res.json()).response || "";
}
export async function askText(ai, prompt) {
  return ai.textProvider === "claude" ? anthropicText(ai.anthropicKey, prompt) : ollamaText(ai.ollamaUrl, ai.ollamaModel, prompt);
}
export async function draftCopy(ai, facts) {
  const text = await askText(ai, `Write e-commerce listing copy for this product and reply ONLY with JSON {"about":string,"benefits":string,"f1":string,"f2":string,"f3":string}. about = 2 sentences, benefits = one "Headline: sentence" line, f1-f3 = 2-4 word features. Product: ${facts}`);
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
}

async function claudeSvgBackground(ai, prompt, size = 1024) {
  const text = await anthropicText(ai.anthropicKey, `You are a product-photography set designer. Produce ONLY a single valid <svg> (no markdown, no explanation) of ${size}x${size} with viewBox="0 0 ${size} ${size}", depicting an empty product backdrop for an e-commerce catalogue image described as: "${prompt}". Requirements: photographic mood, use gradients (linearGradient/radialGradient), soft shadows via blur filters, a subtle horizontal surface line at ~66% height if it is a tabletop/floor scene, no text, no product, no people. Keep the centre area calm so a product can be placed there.`);
  const m = text.match(/<svg[\s\S]*<\/svg>/i); if (!m) throw new Error("No SVG returned");
  const url = URL.createObjectURL(new Blob([m[0]], { type: "image/svg+xml" })); const img = await loadImage(url);
  const c = document.createElement("canvas"); c.width = size; c.height = size; c.getContext("2d").drawImage(img, 0, 0, size, size); URL.revokeObjectURL(url); return c;
}
async function localSdBackground(endpoint, prompt, size = 1024) {
  const res = await fetch(endpoint.replace(/\/$/, "") + "/sdapi/v1/txt2img", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `${prompt}, empty product photography backdrop, no objects, soft studio lighting, high detail`, negative_prompt: "people, text, watermark, product, bag, object", width: size, height: size, steps: 20, cfg_scale: 6 }) });
  if (!res.ok) throw new Error("Local model returned " + res.status);
  const data = await res.json(); const img = await loadImage("data:image/png;base64," + data.images[0]);
  const c = document.createElement("canvas"); c.width = size; c.height = size; c.getContext("2d").drawImage(img, 0, 0, size, size); return c;
}
export async function makeBackground(aiSettings, prompt) {
  if (aiSettings.engine === "claude") return claudeSvgBackground(aiSettings, prompt, aiSettings.size);
  if (aiSettings.engine === "local") return localSdBackground(aiSettings.endpoint, prompt, aiSettings.size);
  return proceduralBackground(prompt, aiSettings.size);
}
