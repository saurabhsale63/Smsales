const { extractDomain } = require("./search");

function normalizeTopic(topic) {
  return (topic || "").trim();
}

function credibilityScore(source, trustedDomains) {
  const domain = source.domain || extractDomain(source.url || "");
  let score = 0.3;
  if (trustedDomains.some((t) => domain.endsWith(t))) score += 0.4;
  if ((source.snippet || "").length > 40) score += 0.2;
  if (source.publishedAt) score += 0.1;
  return Math.min(1, score);
}

class ResearchGuideAgent {
  constructor({ searchFn, store, config }) {
    this.searchFn = searchFn;
    this.store = store;
    this.config = config;
  }

  clarificationQuestions(topic, audience) {
    const questions = [];
    if (!audience) questions.push("Who is the target audience for this research guide?");
    if (topic.split(" ").length < 3) questions.push("Which specific sub-topic or industry context should this focus on?");
    questions.push("What is your expected output depth: quick overview or deep analysis?");
    return questions;
  }

  rankSources(sources) {
    const scored = sources
      .map((source) => ({
        ...source,
        domain: source.domain || extractDomain(source.url || ""),
        score: credibilityScore(source, this.config.trustedDomains)
      }))
      .filter((source) => source.score >= this.config.minCredibilityScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxSources);
    return scored;
  }

  synthesizeGuide({ topic, audience, rankedSources }) {
    const keyInsights = rankedSources.slice(0, 5).map((source, index) => ({
      insight: source.snippet || `Source relevance for ${topic}: ${source.title}`,
      citation: `[S${index + 1}]`
    }));
    const sourceList = rankedSources.map((source, index) => ({
      id: `S${index + 1}`,
      title: source.title,
      url: source.url,
      domain: source.domain,
      credibilityScore: Number(source.score.toFixed(2))
    }));

    return {
      summary: `Research guide for ${topic}${audience ? ` (${audience})` : ""}, synthesized from high-credibility sources.`,
      actionPlan: [
        "Review the top 3 sources to validate baseline understanding.",
        "Compare conflicting claims and keep only cross-source agreements.",
        "Create a final deliverable with citations for each key claim."
      ],
      keyInsights,
      sources: sourceList
    };
  }

  validateCitations(guide) {
    const citations = new Set(guide.sources.map((s) => s.id));
    const uncited = guide.keyInsights.filter((k) => !citations.has(k.citation.replace("[", "").replace("]", "")));
    return { valid: uncited.length === 0, uncited };
  }

  async generateGuide({ topic, audience = "", sessionId = null }) {
    const cleanTopic = normalizeTopic(topic);
    if (!cleanTopic) throw new Error("Topic is required");

    const rawSources = await this.searchFn(cleanTopic, {
      maxSources: this.config.maxSources,
      maxRetries: this.config.maxRetries
    });
    const rankedSources = this.rankSources(rawSources || []);
    if (rankedSources.length === 0) {
      throw new Error("No credible sources found. Please refine your topic.");
    }

    const guide = this.synthesizeGuide({ topic: cleanTopic, audience, rankedSources });
    const citationCheck = this.validateCitations(guide);
    if (!citationCheck.valid) throw new Error("Citation validation failed");

    const session =
      sessionId && this.store.get(sessionId)
        ? this.store.update(sessionId, (current) => ({
            ...current,
            topic: cleanTopic,
            audience,
            sources: rankedSources,
            guide,
            turns: [...current.turns, { role: "user", content: `Generate guide: ${cleanTopic}` }, { role: "assistant", content: guide.summary }]
          }))
        : this.store.create({
            topic: cleanTopic,
            audience,
            sources: rankedSources,
            guide,
            turns: [{ role: "user", content: `Generate guide: ${cleanTopic}` }, { role: "assistant", content: guide.summary }]
          });

    return {
      sessionId: session.id,
      clarificationQuestions: this.clarificationQuestions(cleanTopic, audience),
      guide
    };
  }

  async followUp({ sessionId, question }) {
    const session = this.store.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (!question || !question.trim()) throw new Error("Question is required");

    const topSources = session.sources.slice(0, 3).map((s, i) => `[S${i + 1}] ${s.title}: ${s.url}`);
    const answer = `Based on existing sources, "${question}" can be explored by reviewing: ${topSources.join(" | ")}`;

    const updated = this.store.update(sessionId, (current) => ({
      ...current,
      turns: [...current.turns, { role: "user", content: question }, { role: "assistant", content: answer }]
    }));

    return { sessionId, answer, turns: updated.turns };
  }
}

module.exports = { ResearchGuideAgent };
