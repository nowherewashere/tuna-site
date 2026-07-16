/**
 * Flag-emoji parsing for the per-plan `locations` string.
 *
 * The API stores locations as an opaque emoji string typed by the admin in the
 * bot (e.g. "🇩🇪 | 🇯🇵 | 🇷🇺") — Telegram renders those fine, but Windows has no
 * flag glyphs, so browsers there show bare letter pairs ("DE JP RU"). The site
 * therefore extracts the ISO codes and renders real SVG flags (vendored from
 * flag-icons in /public/assets/flags/, see LICENSE.txt there) instead.
 */

const RI_PAIR = /\p{RI}\p{RI}/gu;
const RI_BASE = 0x1f1e6; // regional indicator "A"

export interface ParsedLocations {
  /** Lowercase ISO 3166-1 alpha-2 codes, in the order they appear. */
  codes: string[];
  /** Whatever non-flag text remains after stripping flags and separators. */
  rest: string;
}

/** Extract flag-emoji country codes; keep any leftover free text as `rest`. */
export function parseLocations(raw: string): ParsedLocations {
  const codes: string[] = [];
  const rest = raw
    .replace(RI_PAIR, (pair) => {
      codes.push(
        [...pair]
          .map((ch) => String.fromCharCode(ch.codePointAt(0)! - RI_BASE + 0x61))
          .join(""),
      );
      return "";
    })
    // Drop the emoji variation selector and the admin's decorative separators
    // (pipes, commas, dots) that only made sense between the emoji flags.
    .replace(/️/g, "")
    .replace(/[|,;·•/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { codes, rest };
}

/** Russian country name for the tooltip/aria text; falls back to the code. */
export function regionNameRu(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["ru"], { type: "region", fallback: "none" }).of(
        code.toUpperCase(),
      ) ?? code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}
