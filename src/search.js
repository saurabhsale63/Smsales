function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function retry(fn, retries) {
  let error;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      error = err;
    }
  }
  throw error;
}

async function wikipediaSearch(query, { maxSources = 8, maxRetries = 1 } = {}) {
  const endpoint = `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=${maxSources}`;
  return retry(async () => {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Failed to retrieve sources");
    const payload = await response.json();
    const pages = payload.pages || [];
    return pages.map((page) => ({
      title: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      snippet: page.description || page.excerpt || "",
      publishedAt: null,
      domain: extractDomain(`https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`)
    }));
  }, maxRetries);
}

module.exports = { wikipediaSearch, extractDomain };
