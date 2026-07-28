import type { Metadata } from "next";

// /auth/callback is a client-only shell the OAuth provider redirects into (see the
// page). Under static export it's served as a 200 shell, so mark it noindex and point
// the canonical at the real entry point — a non-JS crawler then never treats it as a
// thin duplicate. Mirrors /connect.
export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
