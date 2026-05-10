/**
 * Tests for scripts/check-jsonld-coverage.mjs.
 *
 * Exercises the exported pure helpers directly. The audit() entrypoint is
 * filesystem-driven and is covered indirectly by CI running it on every PR.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-jsonld-coverage.mjs");

let routeOf: (filePath: string) => string;
let findExemption: (route: string) => { prefix: string; category: string } | null;
let isRedirectOnly: (body: string) => boolean;
let isNoIndex: (body: string) => boolean;
let emitsJsonLd: (body: string) => boolean;

beforeAll(async () => {
  const mod = await import(gatePath);
  routeOf = mod.routeOf;
  findExemption = mod.findExemption;
  isRedirectOnly = mod.isRedirectOnly;
  isNoIndex = mod.isNoIndex;
  emitsJsonLd = mod.emitsJsonLd;
});

describe("routeOf", () => {
  it("strips app/ prefix and /page.tsx suffix", () => {
    expect(routeOf("app/article/[slug]/page.tsx")).toBe("article/[slug]");
  });
  it("returns empty for non-page paths", () => {
    expect(routeOf("scripts/foo.mjs")).toBe("");
  });
  it("normalises Windows separators", () => {
    expect(routeOf("app\\broker\\[slug]\\page.tsx")).toBe("broker/[slug]");
  });
  it("matches layout.tsx files alongside page.tsx", () => {
    expect(routeOf("app/find-advisor/layout.tsx")).toBe("find-advisor");
  });
});

describe("findExemption", () => {
  it("returns null for a public content route", () => {
    expect(findExemption("article/[slug]")).toBeNull();
    expect(findExemption("best/[slug]")).toBeNull();
    expect(findExemption("foreign-investment")).toBeNull();
  });
  it("matches PORTAL prefixes", () => {
    expect(findExemption("admin/dashboard")?.category).toBe("PORTAL");
    expect(findExemption("advisor-portal/billing")?.category).toBe("PORTAL");
    expect(findExemption("account/profile")?.category).toBe("PORTAL");
  });
  it("matches FORM prefixes", () => {
    expect(findExemption("review/abc-token")?.category).toBe("FORM");
    expect(findExemption("review/broker/abc")?.category).toBe("FORM");
    expect(findExemption("find-advisor")?.category).toBe("FORM");
  });
  it("matches UTILITY prefixes", () => {
    expect(findExemption("newsletter/confirm")?.category).toBe("UTILITY");
    expect(findExemption("export/comparison")?.category).toBe("UTILITY");
    expect(findExemption("go/some-broker/apply")?.category).toBe("UTILITY");
  });
  it("matches LEGAL prefixes", () => {
    expect(findExemption("legal")?.category).toBe("LEGAL");
    expect(findExemption("fsg")?.category).toBe("LEGAL");
  });
  it("matches SALES prefixes", () => {
    expect(findExemption("for-advisors/pricing")?.category).toBe("SALES");
    expect(findExemption("advertise/packages")?.category).toBe("SALES");
  });
  it("does not falsely match prefix substrings", () => {
    // `admin` is a PORTAL prefix; `admins` should not match it.
    expect(findExemption("admins-list-public")).toBeNull();
    // `review` is FORM; `reviews/something-else` should NOT match unless explicitly listed.
    expect(findExemption("reviews/write")?.category).toBe("FORM");
  });
});

describe("isNoIndex", () => {
  it("detects metadata.robots.index = false", () => {
    expect(isNoIndex("robots: { index: false, follow: true }")).toBe(true);
  });
  it("detects literal noindex string", () => {
    expect(isNoIndex(`robots: "noindex,follow"`)).toBe(true);
  });
  it("returns false for indexable pages", () => {
    expect(isNoIndex("export const metadata = { title: 'Hello' };")).toBe(false);
  });
});

describe("isRedirectOnly", () => {
  it("detects bare redirect()", () => {
    const body = `
      import { redirect } from "next/navigation";
      export default function Page() { redirect("/somewhere"); }
    `;
    expect(isRedirectOnly(body)).toBe(true);
  });
  it("detects permanentRedirect()", () => {
    const body = `
      import { permanentRedirect } from "next/navigation";
      export default function Page() { permanentRedirect("/foo"); }
    `;
    expect(isRedirectOnly(body)).toBe(true);
  });
  it("detects redirect inside a larger metadata-only file", () => {
    const body = `
      import { permanentRedirect, notFound } from "next/navigation";
      const ALLOWED: Record<string, string> = {};
      export async function generateMetadata() {
        return { title: "Foo" };
      }
      export default async function Page({ params }: any) {
        const { slug } = await params;
        if (!ALLOWED[slug]) notFound();
        permanentRedirect(\`/articles?category=\${slug}\`);
      }
    `;
    expect(isRedirectOnly(body)).toBe(true);
  });
  it("returns false for a real page that calls redirect conditionally inside JSX flow", () => {
    const body = `
      import { redirect } from "next/navigation";
      export default function Page() {
        const ok = check();
        return (<div>Hello</div>);
      }
    `;
    expect(isRedirectOnly(body)).toBe(false);
  });
});

describe("emitsJsonLd", () => {
  it("detects literal application/ld+json script tag", () => {
    expect(emitsJsonLd(`<script type="application/ld+json" />`)).toBe(true);
  });
  it("detects HubPage wrapper mount", () => {
    expect(emitsJsonLd(`<HubPage config={cfg} />`)).toBe(true);
  });
  it("detects VerticalPillarPage wrapper mount", () => {
    expect(emitsJsonLd(`<VerticalPillarPage data={data} />`)).toBe(true);
  });
  it("detects JsonLd helper component", () => {
    expect(emitsJsonLd(`<JsonLd data={breadcrumb} />`)).toBe(true);
  });
  it("detects schema helper invocation", () => {
    expect(emitsJsonLd(`const ld = breadcrumbJsonLd([]);`)).toBe(true);
    expect(emitsJsonLd(`articleJsonLd({ title: 't' })`)).toBe(true);
    expect(emitsJsonLd(`governmentServiceJsonLd(input)`)).toBe(true);
  });
  it("returns false for a page with no JSON-LD signal", () => {
    expect(emitsJsonLd(`<div>Hello world</div>`)).toBe(false);
  });
  it("returns false when only the import is present (no usage)", () => {
    // Bare import is not enough — the function must be invoked. The current
    // heuristic uses `name(` so an import line alone does not trip it.
    expect(emitsJsonLd(`import { breadcrumbJsonLd } from "@/lib/seo";`)).toBe(false);
  });
});
