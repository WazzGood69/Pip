import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.MAX_REQUESTS_PER_MINUTE || 18);
const MAX_BODY = 32_000;
const usage = new Map();

const send = (res, status, data) => {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
};

function allowed(ip) {
  const now = Date.now();
  const old = usage.get(ip) || [];
  const recent = old.filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    usage.set(ip, recent);
    return false;
  }
  recent.push(now);
  usage.set(ip, recent);
  return true;
}

async function bodyJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw Object.assign(new Error("Request is too large."), { status: 413 });
  }
  try { return JSON.parse(raw || "{}"); }
  catch { throw Object.assign(new Error("Invalid JSON request."), { status: 400 }); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/pip/health") {
    return send(res, 200, {
      ok: true,
      configured: Boolean(API_KEY),
      model: MODEL,
      provider: "GroqCloud"
    });
  }

  if (req.method === "POST" && url.pathname === "/api/pip/chat") {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim();
    if (!allowed(ip)) return send(res, 429, { error: "Pip needs a short pause. Please try again in a minute." });
    if (!API_KEY) return send(res, 503, { error: "The server owner has not configured GROQ_API_KEY yet." });

    try {
      const input = await bodyJson(req);
      const system = typeof input.system === "string" ? input.system.slice(0, 12_000) : "";
      const user = typeof input.user === "string" ? input.user.slice(0, 12_000) : "";
      const maxTokens = Math.max(40, Math.min(Number(input.max_tokens) || 220, 500));
      if (!system || !user) return send(res, 400, { error: "Both system and user prompts are required." });

      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          temperature: 0.8,
          top_p: 0.9,
          max_tokens: maxTokens
        }),
        signal: AbortSignal.timeout(45_000)
      });

      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const detail = payload?.error?.message || `Groq returned HTTP ${upstream.status}.`;
        return send(res, upstream.status === 429 ? 429 : 502, {
          error: upstream.status === 429
            ? "Pip has reached the provider's current usage limit. Try again later."
            : `Groq request failed: ${String(detail).slice(0, 240)}`
        });
      }
      const text = payload?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) return send(res, 502, { error: "The AI provider returned an empty answer." });
      return send(res, 200, { text: text.trim(), model: MODEL });
    } catch (error) {
      const status = error.status || (error.name === "TimeoutError" ? 504 : 500);
      return send(res, status, { error: status === 504 ? "Pip's AI took too long to answer." : (error.message || "Unexpected server error.") });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed." });
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filename = path.join(PUBLIC, normalized);
  if (!filename.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: "Forbidden." });
  try {
    const info = await stat(filename);
    if (!info.isFile()) return send(res, 404, { error: "Not found." });
    const ext = path.extname(filename).toLowerCase();
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
    res.writeHead(200, { "content-type": types[ext] || "application/octet-stream", "x-content-type-options": "nosniff" });
    if (req.method === "HEAD") return res.end();
    res.end(await readFile(filename));
  } catch {
    send(res, 404, { error: "Not found." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Pip server listening on port ${PORT}; model=${MODEL}; API key configured=${Boolean(API_KEY)}`);
});
