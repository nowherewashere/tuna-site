import type { PublicPlanLanding } from "@/lib/api";
import { SITE_URL } from "@/lib/config";

/**
 * schema.org (JSON-LD) builders — the single source for every structured-data node
 * the site emits. Pure data (no client APIs) so both the root layout and page server
 * components can call them under `output: "export"`. Every entity carries an absolute
 * `@id` so cross-page references (publisher / isPartOf / about) resolve into one
 * canonical graph. We mark up ONLY content that is visible on the page and never
 * fabricate ratings or reviews.
 */

export const ORIGIN = SITE_URL;
export const ORG_ID = `${ORIGIN}/#organization`;
export const WEBSITE_ID = `${ORIGIN}/#website`;

// Official brand profiles (owner-confirmed): the Telegram bot is the only public
// handle in the codebase — no invented channels.
const SAME_AS = ["https://t.me/VPNTuna_Bot"];

type JsonLdNode = Record<string, unknown>;

function organizationNode(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Tuna VPN",
    url: `${ORIGIN}/`,
    logo: `${ORIGIN}/favicon-512x512.png`,
    sameAs: SAME_AS,
  };
}

function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${ORIGIN}/`,
    name: "Tuna VPN",
    inLanguage: "ru-RU",
    publisher: { "@id": ORG_ID },
    // No `potentialAction`/SearchAction: the site has no search feature, and marking
    // up functionality that doesn't exist is exactly what the audit's hard rules forbid.
  };
}

/** Sitewide graph (Organization + WebSite) rendered once from the root layout. */
export function siteGraph(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(), websiteNode()],
  };
}

/** Round a decimal price string to a whole ruble ("139.33" → "139"), matching the
 *  visible pricing card (PricingSection.priceLabel) so the JSON-LD price equals the
 *  number actually on screen. Falls back to the raw string if it isn't numeric. */
function rublePrice(rub: string): string {
  const n = Math.round(parseFloat(rub));
  return Number.isFinite(n) ? String(n) : rub;
}

/** Drop a leading emoji / variation-selector / ZWJ run an operator may prefix to a
 *  plan name (mirrors PricingSection.cleanPlanName) so the schema name matches the
 *  visible <h3>. */
function cleanPlanName(name: string): string {
  return name.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "");
}

/**
 * SoftwareApplication for the Tuna VPN app, with one Offer per VISIBLE plan card.
 * Returns null when no plans were server-rendered (build-time fetch failed → the HTML
 * shows skeletons, so there is nothing truthful to mark up). `operatingSystem` lists
 * the platforms named in the visible FAQ. No aggregateRating (no real reviews).
 */
export function softwareAppGraph(plans: PublicPlanLanding[]): JsonLdNode | null {
  if (plans.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tuna VPN",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Windows, macOS, iOS, Android, Smart TV",
    url: `${ORIGIN}/`,
    inLanguage: "ru-RU",
    publisher: { "@id": ORG_ID },
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: cleanPlanName(p.name),
      // The visible card reads "от {monthly_from_rub} ₽/мес"; price mirrors that number.
      price: rublePrice(p.monthly_from_rub),
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
      url: `${ORIGIN}/#pricing`,
    })),
  };
}

export interface LegalPageMeta {
  /** Route path, e.g. "/oferta". */
  path: string;
  /** Page name / breadcrumb leaf, e.g. "Публичная оферта". */
  name: string;
  /** ISO date shown on the page ("Дата вступления в силу"), e.g. "2026-07-07". */
  date: string;
}

/**
 * Legal-page graph: a BreadcrumbList (Главная → page) plus a WebPage node carrying
 * the honest publish/update date already visible in the document (GEO-04 E-E-A-T),
 * tied into the sitewide WebSite/Organization entities.
 */
export function legalPageGraph(meta: LegalPageMeta): JsonLdNode {
  const url = `${ORIGIN}${meta.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: `${ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: meta.name, item: url },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: meta.name,
        inLanguage: "ru-RU",
        datePublished: meta.date,
        dateModified: meta.date,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORG_ID },
      },
    ],
  };
}
