import type { MetadataRoute } from "next";

// Required under `output: "export"`: emit this metadata route as a static file at build.
export const dynamic = "force-static";

// Emitted as a static /robots.txt at build (output: "export"). Approved policy:
// allow ALL crawlers — classic search AND AI (retrieval + training) — to maximise
// presence in ChatGPT / Perplexity / AI Overviews. Only the auth/app shells are
// disallowed; they are noindex anyway and carry nothing worth crawling.
//
// The AI bots are also listed as their own group: robots.txt matching is
// "most-specific user-agent wins", so a bot that finds its own name ignores the
// `*` group entirely — the explicit group makes the welcome legible and keeps the
// same Disallow set so the policy can't drift open for those crawlers later.
const DISALLOW = ["/cabinet", "/connect", "/login"];

const AI_BOTS = [
  // Retrieval (answer-time fetch)
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  // Training / dataset scrapers
  "GPTBot",
  "CCBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: "https://tuna-vpn.com/sitemap.xml",
  };
}
