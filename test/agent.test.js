const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { ResearchGuideAgent } = require("../src/agent");
const { SessionStore } = require("../src/sessionStore");

function makeStore(fileName) {
  const filePath = path.resolve(__dirname, "..", "data", fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return new SessionStore(filePath);
}

const config = {
  trustedDomains: ["wikipedia.org", "edu", "gov"],
  maxSources: 5,
  minCredibilityScore: 0.2,
  maxRetries: 1
};

test("generateGuide returns citation-first structured response", async () => {
  const searchFn = async () => [
    { title: "AI in Education", url: "https://en.wikipedia.org/wiki/AI", snippet: "AI improves adaptive learning at scale." },
    { title: "OECD education", url: "https://www.oecd.org/education", snippet: "OECD reports describe measurable outcomes." }
  ];
  const store = makeStore("sessions-test-1.json");
  const agent = new ResearchGuideAgent({ searchFn, store, config });
  const result = await agent.generateGuide({ topic: "AI for research guide", audience: "students" });

  assert.ok(result.sessionId);
  assert.equal(result.guide.sources.length > 0, true);
  result.guide.keyInsights.forEach((insight) => assert.match(insight.citation, /^\[S\d+\]$/));
});

test("followUp reuses previous session context", async () => {
  const searchFn = async () => [{ title: "AI in Education", url: "https://en.wikipedia.org/wiki/AI", snippet: "AI improves adaptive learning at scale." }];
  const store = makeStore("sessions-test-2.json");
  const agent = new ResearchGuideAgent({ searchFn, store, config });
  const initial = await agent.generateGuide({ topic: "AI for students" });
  const follow = await agent.followUp({ sessionId: initial.sessionId, question: "What should I read first?" });

  assert.equal(follow.sessionId, initial.sessionId);
  assert.match(follow.answer, /Based on existing sources/);
  assert.equal(follow.turns.length >= 4, true);
});

test("generateGuide rejects empty topics", async () => {
  const store = makeStore("sessions-test-3.json");
  const agent = new ResearchGuideAgent({ searchFn: async () => [], store, config });
  await assert.rejects(() => agent.generateGuide({ topic: "  " }), /Topic is required/);
});
