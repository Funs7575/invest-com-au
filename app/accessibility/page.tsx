import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility Statement — Invest.com.au",
  description:
    "Invest.com.au is committed to making our website accessible to all users, including those with disabilities, in accordance with WCAG 2.1 and the Disability Discrimination Act 1992.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <div className="py-8 md:py-12">
      <div className="container-custom max-w-3xl">
        <h1 className="text-3xl font-extrabold mb-2">Accessibility Statement</h1>
        <p className="text-sm text-slate-500 mb-8">
          Last updated: 18 March 2026
        </p>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-bold mb-2">Our Commitment</h2>
            <p className="text-slate-600">
              Invest.com.au Pty Ltd (ACN 093 882 421) is committed to ensuring
              our website is accessible to all users, including people with
              disabilities. We aim to meet the{" "}
              <strong>
                Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
              </strong>{" "}
              standards published by the World Wide Web Consortium (W3C).
            </p>
            <p className="text-slate-600 mt-2">
              Our commitment to accessibility reflects our obligations under the{" "}
              <strong>Disability Discrimination Act 1992 (Cth)</strong> and our
              belief that all users deserve equal access to financial information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Current Conformance Status</h2>
            <p className="text-slate-600">
              We are working toward full WCAG 2.1 Level AA conformance. Our
              current status is <strong>partial conformance</strong> — most pages
              meet Level AA criteria but some content may not yet fully conform.
              We are actively working to address known gaps.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Features We Have Implemented</h2>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Keyboard navigation</strong> — all interactive elements
                (buttons, links, forms) are accessible via keyboard.
              </li>
              <li>
                <strong>Semantic HTML</strong> — pages use proper heading
                hierarchy, landmark regions, and ARIA labels where appropriate.
              </li>
              <li>
                <strong>Sufficient colour contrast</strong> — text and
                interactive elements are designed to meet WCAG AA contrast
                ratios (4.5:1 for normal text, 3:1 for large text).
              </li>
              <li>
                <strong>Text alternatives</strong> — decorative images use empty
                alt attributes; informational images include descriptive alt
                text.
              </li>
              <li>
                <strong>Responsive design</strong> — content reflows at all
                viewport sizes without loss of information.
              </li>
              <li>
                <strong>Focus indicators</strong> — visible focus rings are
                displayed on all interactive elements.
              </li>
              <li>
                <strong>Form labels</strong> — all form inputs have associated
                labels and error messages are clearly associated with their
                fields.
              </li>
              <li>
                <strong>Skip navigation</strong> — a skip-to-main-content link
                is available at the top of each page for screen reader and
                keyboard users.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Known Limitations</h2>
            <p className="text-slate-600 mb-2">
              We are aware of the following areas that do not yet fully meet WCAG
              2.1 Level AA and are working to address them:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                Some complex data tables (loan comparison, platform comparison)
                may not have fully descriptive column/row header associations for
                screen readers.
              </li>
              <li>
                Some interactive charts and data visualisations do not yet have
                text-based equivalents.
              </li>
              <li>
                Some PDF downloads may not be tagged for screen reader
                accessibility.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Technical Approach</h2>
            <p className="text-slate-600">
              Our website is built using Next.js with server-side rendering,
              which produces semantic HTML by default. We use Tailwind CSS for
              styling. Accessibility is considered during design and development,
              and we test with keyboard navigation and screen reader tools
              (including NVDA and VoiceOver) during development.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Feedback &amp; Contact</h2>
            <p className="text-slate-600 mb-2">
              We welcome feedback on the accessibility of Invest.com.au. If you
              experience any barriers to accessing our content, please contact us:
            </p>
            <ul className="list-none text-slate-600 space-y-1">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:accessibility@invest.com.au"
                  className="text-slate-700 hover:text-slate-900 underline"
                >
                  accessibility@invest.com.au
                </a>
              </li>
              <li>
                <strong>Subject line:</strong> Accessibility Feedback
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              We aim to respond to accessibility feedback within 5 business days.
              If your issue requires urgent resolution or we are unable to resolve
              it, we will work with you to provide the information you need in an
              alternative format.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Formal Complaints</h2>
            <p className="text-slate-600">
              If you are not satisfied with our response to an accessibility
              concern, you may lodge a complaint with the{" "}
              <a
                href="https://www.humanrights.gov.au/complaints"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 hover:text-slate-900 underline"
              >
                Australian Human Rights Commission
              </a>{" "}
              under the Disability Discrimination Act 1992.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Third-Party Content</h2>
            <p className="text-slate-600">
              Some content on our site is provided by third parties (e.g.
              embedded tools, external links). We do not control the
              accessibility of third-party content but aim to link only to
              services that maintain reasonable accessibility standards.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Related:{" "}
              <Link href="/privacy" className="hover:text-slate-600 underline">
                Privacy Policy
              </Link>{" "}
              &middot;{" "}
              <Link href="/terms" className="hover:text-slate-600 underline">
                Terms of Use
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
