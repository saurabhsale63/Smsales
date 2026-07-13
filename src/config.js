const config = {
  trustedDomains: ["wikipedia.org", "gov", "edu", "who.int", "worldbank.org", "oecd.org"],
  maxSources: 8,
  minCredibilityScore: 0.35,
  maxRetries: 2,
  requestTimeoutMs: 8000,
  rateLimit: {
    windowMs: 60_000,
    maxRequestsPerIp: 30
  }
};

module.exports = { config };
