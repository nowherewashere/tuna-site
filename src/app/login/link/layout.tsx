import type { Metadata } from "next";

// The landing page for the one-tap link mailed with a login code. Served as a 200 shell
// under static export, so noindex it and point the canonical at the real entry point —
// same treatment as /connect and /auth/callback.
export const metadata: Metadata = {
  title: "Вход по ссылке",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function LoginLinkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
