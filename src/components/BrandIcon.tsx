import type { ReactNode } from "react";

/**
 * Multi-colour vendor brand marks.
 *
 * Separate from `Icon.tsx` on purpose: that component paints everything in a single
 * `currentColor`, and Google's four-colour G may not be recoloured under its brand
 * guidelines. The hex values below are the vendors' own and are NOT design tokens —
 * never swap them for `currentColor` or a CSS variable, and never restyle the shapes.
 *
 * Inlined rather than served from `public/`: this sits on the login card's critical
 * path, where an extra request that fails would leave a button with a blank space
 * where the brand mark should be.
 */
const MARKS: Record<string, { viewBox: string; paths: ReactNode }> = {
  google: {
    viewBox: "0 0 48 48",
    paths: (
      <>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </>
    ),
  },
};

export default function BrandIcon({ name, size = 20 }: { name: string; size?: number }) {
  const mark = MARKS[name];
  if (!mark) return null;
  return (
    <svg
      className="brand-ic"
      width={size}
      height={size}
      viewBox={mark.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      {mark.paths}
    </svg>
  );
}
