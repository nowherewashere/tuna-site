import type { Metadata } from "next";

// Server wrapper around the "use client" login page — a client page cannot export
// metadata, so the unique title + noindex live here (SEO-05). The auth shell is thin
// and gated; keep it out of the index (follow, so link equity still flows).
export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: true },
  // Self-canonical (override the root's canonical → "/"): a noindex page shouldn't
  // signal it's a duplicate of the homepage.
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
