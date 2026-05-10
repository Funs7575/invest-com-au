/**
 * Tiny render-side wrapper for JSON-LD structured data.
 *
 * Centralises the boilerplate `<script type="application/ld+json">` block
 * so page authors only have to compute the schema object — the helper
 * handles serialisation, the script tag, and array-of-blocks fan-out.
 *
 * Pair with builders from `lib/seo.ts` (`breadcrumbJsonLd`),
 * `lib/json-ld.ts`, or `lib/schema-markup.ts`.
 *
 * Example:
 *
 *     <JsonLd
 *       data={breadcrumbJsonLd([
 *         { name: "Home", url: absoluteUrl("/") },
 *         { name: "Articles" },
 *       ])}
 *     />
 *
 * Multiple blocks (e.g. BreadcrumbList + ItemList on a listing page):
 *
 *     <JsonLd data={[breadcrumb, itemList]} />
 */

interface JsonLdProps {
  /** A single JSON-LD object, or an array of them (one <script> per item). */
  data: object | object[] | null | undefined;
  /** Optional `data-testid` prefix. Each block gets `${testId}-${index}`. */
  testId?: string;
}

export default function JsonLd({ data, testId }: JsonLdProps) {
  if (!data) return null;
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
          {...(testId ? { "data-testid": `${testId}-${i}` } : {})}
        />
      ))}
    </>
  );
}
