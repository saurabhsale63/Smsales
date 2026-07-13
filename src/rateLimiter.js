class RateLimiter {
  constructor({ windowMs, maxRequestsPerIp }) {
    this.windowMs = windowMs;
    this.maxRequestsPerIp = maxRequestsPerIp;
    this.store = new Map();
  }

  check(ip) {
    const now = Date.now();
    const key = ip || "unknown";
    const item = this.store.get(key);
    if (!item || now > item.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequestsPerIp - 1 };
    }
    if (item.count >= this.maxRequestsPerIp) {
      return { allowed: false, remaining: 0, retryAfterMs: item.resetAt - now };
    }
    item.count += 1;
    return { allowed: true, remaining: this.maxRequestsPerIp - item.count };
  }
}

module.exports = { RateLimiter };
