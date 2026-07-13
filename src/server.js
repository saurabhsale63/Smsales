const http = require("node:http");
const path = require("node:path");
const { config } = require("./config");
const { wikipediaSearch } = require("./search");
const { SessionStore } = require("./sessionStore");
const { ResearchGuideAgent } = require("./agent");
const { RateLimiter } = require("./rateLimiter");

const store = new SessionStore(path.resolve(__dirname, "..", "data", "sessions.json"));
const agent = new ResearchGuideAgent({
  searchFn: wikipediaSearch,
  store,
  config
});
const limiter = new RateLimiter(config.rateLimit);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || "unknown";
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    return sendJson(res, 429, { error: "Rate limit exceeded", retryAfterMs: rate.retryAfterMs });
  }

  try {
    if (req.method === "GET" && req.url.startsWith("/session/")) {
      const sessionId = req.url.replace("/session/", "").trim();
      const session = store.get(sessionId);
      if (!session) return sendJson(res, 404, { error: "Session not found" });
      return sendJson(res, 200, session);
    }

    if (req.method === "POST" && req.url === "/guide") {
      const payload = await parseBody(req);
      const result = await agent.generateGuide(payload);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && req.url === "/followup") {
      const payload = await parseBody(req);
      const result = await agent.followUp(payload);
      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    process.stdout.write(`Research guide agent listening on ${port}\n`);
  });
}

module.exports = { server };
