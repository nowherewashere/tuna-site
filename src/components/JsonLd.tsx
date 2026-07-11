/**
 * Emits one JSON-LD <script>. Server component (no "use client") so the serialized
 * schema.org data lands directly in the static HTML for search crawlers and AI
 * engines. Centralizes the `dangerouslySetInnerHTML` pattern shared by the root
 * layout and the page server components (single source, no per-call boilerplate).
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
