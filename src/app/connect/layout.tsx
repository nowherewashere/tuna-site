import type { Metadata } from "next";

// /connect is a client-only redirect stub to /login (see the page). Under static
// export it's served as a 200 shell, so mark it noindex and point the canonical at
// its real destination (SEO-12) — a non-JS crawler then never treats it as a thin
// duplicate of the homepage.
export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
