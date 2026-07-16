"use client";

import { parseLocations, regionNameRu } from "@/lib/flags";

/**
 * Renders a plan's `locations` emoji string as real SVG flags (vendored
 * flag-icons, /assets/flags/<code>.svg) — Windows browsers have no flag-emoji
 * glyphs and would show bare letter pairs otherwise. Any non-flag text the
 * admin typed is kept after the icons; a string with no flag emoji at all
 * falls back to plain text. Flags are decorative images: the wrapper carries
 * the Russian country names for screen readers, each icon a hover tooltip.
 */
export default function LocationFlags({ locations }: { locations: string }) {
  const { codes, rest } = parseLocations(locations);

  if (codes.length === 0) {
    return <span aria-label="Локации">{locations}</span>;
  }

  const names = codes.map(regionNameRu);

  return (
    <span className="loc-flags" role="img" aria-label={`Локации: ${names.join(", ")}`}>
      {codes.map((code, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- static export; tiny local SVGs, no optimizer
        <img
          key={`${code}-${i}`}
          src={`/assets/flags/${code}.svg`}
          alt=""
          title={names[i]}
          width={21}
          height={16}
          loading="lazy"
          draggable={false}
          // Unknown pair the icon set doesn't cover → hide instead of a broken image.
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ))}
      {rest && <span className="loc-flags-rest">{rest}</span>}
    </span>
  );
}
