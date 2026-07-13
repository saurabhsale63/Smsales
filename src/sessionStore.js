const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

class SessionStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.ensureStore();
  }

  ensureStore() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ sessions: {} }, null, 2), "utf8");
    }
  }

  readAll() {
    return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
  }

  writeAll(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  create(initial = {}) {
    const data = this.readAll();
    const id = crypto.randomUUID();
    data.sessions[id] = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topic: initial.topic || "",
      audience: initial.audience || "",
      sources: initial.sources || [],
      guide: initial.guide || null,
      turns: initial.turns || []
    };
    this.writeAll(data);
    return data.sessions[id];
  }

  get(id) {
    const data = this.readAll();
    return data.sessions[id] || null;
  }

  update(id, updater) {
    const data = this.readAll();
    const current = data.sessions[id];
    if (!current) return null;
    const next = updater(current);
    next.updatedAt = new Date().toISOString();
    data.sessions[id] = next;
    this.writeAll(data);
    return next;
  }
}

module.exports = { SessionStore };
