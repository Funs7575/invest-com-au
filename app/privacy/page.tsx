import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy — Invest.com.au",
  description:
    "How Invest.com.au collects, uses, and protects your personal information under the Australian Privacy Act 1988 and GDPR. Covers cookies, analytics, affiliate tracking, and your data rights.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy — Invest.com.au",
    description:
      "How Invest.com.au collects, uses, and protects your personal information under the Australian Privacy Act 1988 and GDPR.",
    url: "/privacy",
    images: [
      {
        url: "/api/og?title=Privacy+Policy&subtitle=Australian+Privacy+Act+%7C+GDPR+%7C+Your+Data+Rights&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Privacy Policy" },
]);

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">
          Version 1.3 — Last updated: 18 March 2026
        </p>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-bold mb-2">1. About This Policy</h2>
            <p className="text-slate-600">
              Invest.com.au Pty Ltd (ACN 093 882 421, ABN 90 093 882 421)
              (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
              is committed to protecting your personal information in accordance
              with the Australian Privacy Act 1988 (Cth) and the Australian
              Privacy Principles (APPs). This policy explains how we collect,
              use, disclose, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              2. Information We Collect
            </h2>
            <p className="text-slate-600 mb-2">
              We collect personal information only when it is reasonably
              necessary for our functions. The types of information we may
              collect include:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Email address</strong> — when you voluntarily subscribe
                to our newsletter or download resources (e.g. the Fee Audit
                PDF).
              </li>
              <li>
                <strong>Name, email, phone number, country of residence, investment budget, and purchase timeline</strong> — when you submit
                an enquiry form (e.g. property enquiry, buyer&apos;s agent
                contact, advisor matching). This data is shared with the
                specific provider you enquired about.
              </li>
              <li>
                <strong>Quiz and matching data</strong> — your answers to our
                platform quiz or advisor matching tool, used to generate
                personalised results. These are stored locally in your browser
                and optionally sent with your email if you choose to receive
                results.
              </li>
              <li>
                <strong>Usage data</strong> — anonymous analytics data such as
                pages visited, time spent on site, and referral source, collected
                via cookies and analytics tools.
              </li>
              <li>
                <strong>Cookie preferences</strong> — your cookie consent
                choice, stored locally in your browser.
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              We do <strong>not</strong> collect sensitive information such as
              financial account details, tax file numbers, health information, or
              government identifiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              3. How We Use Your Information
            </h2>
            <p className="text-slate-600 mb-2">
              We use your personal information for the following purposes:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                To send you the resources you requested (e.g. Fee Audit PDF).
              </li>
              <li>
                To send occasional educational content about platform comparisons
                and investing in Australia (only if you have opted in).
              </li>
              <li>
                <strong>Advisor enquiries:</strong> If you submit a consultation request
                through our advisor directory, your name, email, phone (if provided), and
                message are shared with the specific advisor you contacted. Your details
                are shared only with that advisor and are not sold to any third party.
              </li>
              <li>
                <strong>Property enquiries:</strong> If you submit an enquiry about a
                property listing, your name, email, phone (if provided), country of
                residence, investment budget, purchase timeline, and message are shared
                with the specific property developer for that listing. If you contact a
                buyer&apos;s agent, your details are shared with that agent only.
                Your details are shared only with the provider you enquired about and
                are not sold or passed to other parties.
              </li>
              <li>
                To improve our website, content, and user experience through
                anonymised analytics.
              </li>
              <li>To comply with applicable laws and regulations.</li>
            </ul>
            <p className="text-slate-600 mt-2">
              We will <strong>never</strong> sell, rent, or trade your personal
              information to third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              4. Cookies &amp; Tracking
            </h2>
            <p className="text-slate-600 mb-2">
              Our website uses cookies to enhance your experience. We use:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Essential cookies</strong> — required for site
                functionality (e.g. cookie consent preference).
              </li>
              <li>
                <strong>Analytics cookies</strong> — to understand how visitors
                use our site (anonymised data only).
              </li>
              <li>
                <strong>Affiliate tracking cookies</strong> — to attribute
                referrals to our affiliate partners. These are set when you click
                an affiliate link and are used solely for commission tracking.
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              You can decline non-essential cookies via the cookie banner when
              you first visit the site. You can also clear cookies at any time
              through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              5. Affiliate Link Tracking
            </h2>
            <p className="text-slate-600 mb-2">
              When you click a &quot;Visit&quot; or &quot;Get Started&quot; button
              for a broker or financial product, your click is routed through our
              redirect service at <code className="text-xs bg-slate-100 px-1 rounded">/go/[broker]</code>.
              This allows us to:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Record the click</strong> — we store a hashed (irreversible)
                version of your IP address, the page you clicked from, your browser
                user-agent string, and a timestamp. We do not store your raw IP address.
              </li>
              <li>
                <strong>Generate a click ID</strong> — a unique anonymous identifier
                appended to the destination URL for commission attribution.
                This ID cannot be used to identify you personally.
              </li>
              <li>
                <strong>Redirect you</strong> — after recording the click, you are
                immediately redirected (HTTP 302) to the partner&apos;s website. We
                set <code className="text-xs bg-slate-100 px-1 rounded">Referrer-Policy: no-referrer</code> to
                prevent the partner from seeing which specific page you came from.
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              All affiliate links on this site are marked with{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">rel=&quot;sponsored&quot;</code> in
              accordance with Google&apos;s guidelines for paid and affiliate links.
              This has no effect on your browsing experience but informs search
              engines about the commercial nature of the link.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              6. Third-Party Disclosure &amp; Data Processors
            </h2>
            <p className="text-slate-600 mb-2">
              We may share limited information with the following third parties:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Supabase</strong> (database hosting, USA) — email
                addresses and enquiry data are stored in our Supabase database.
                Supabase processes data on our behalf under a Data Processing
                Agreement (DPA).
              </li>
              <li>
                <strong>Vercel</strong> (website hosting, USA) — standard web
                server logs. Vercel processes data on our behalf under their
                standard DPA.
              </li>
              <li>
                <strong>Google Analytics</strong> (analytics, USA) — anonymised
                usage data is sent to Google. IP addresses are anonymised before
                transmission. Google processes data under their Data Processing
                Terms.
              </li>
              <li>
                <strong>Affiliate partners</strong> — when you click an
                affiliate link, the partner may set their own cookies. We do not
                share your email or personal data with affiliate partners.
              </li>
              <li>
                <strong>Advisors and financial professionals</strong> — when you
                submit an advisor enquiry, your contact details are shared with
                the specific advisor you selected.
              </li>
              <li>
                <strong>Property developers and buyer&apos;s agents</strong> — when
                you submit a property enquiry, your contact details are shared
                with the specific developer or agent you enquired about. We
                require all listed parties to handle your data in accordance with
                applicable privacy laws.
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              Where personal data is transferred to service providers outside
              Australia, we take reasonable steps under APP 8 to ensure those
              recipients comply with the Australian Privacy Principles, including
              through contractual data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              7. User-Generated Content (Reviews &amp; Articles)
            </h2>
            <p className="text-slate-600 mb-2">
              Our site allows users to submit reviews of advisors and financial
              platforms, and allows verified advisors to publish articles.
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Reviews:</strong> If you submit a review, your display
                name (or &quot;Anonymous&quot; if you choose) and the content of
                your review may be published publicly. We store your email
                address to verify the review and for moderation purposes — it
                is not published.
              </li>
              <li>
                <strong>Advisor articles:</strong> Articles published by advisors
                include the advisor&apos;s name and firm. We retain authorship
                records for editorial purposes.
              </li>
              <li>
                <strong>Moderation:</strong> We reserve the right to moderate,
                edit, or remove user-submitted content that violates our content
                standards or applicable law.
              </li>
              <li>
                <strong>Deletion requests:</strong> You may request removal of
                your review by contacting{" "}
                <a href="mailto:privacy@invest.com.au" className="underline">
                  privacy@invest.com.au
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. Data Security</h2>
            <p className="text-slate-600">
              We take reasonable steps to protect your personal information from
              misuse, interference, loss, and unauthorised access. Email
              addresses are stored in a secure, encrypted database with
              row-level security. However, no method of electronic transmission
              or storage is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              9. Your Rights Under the Privacy Act
            </h2>
            <p className="text-slate-600 mb-2">
              Under the Australian Privacy Act 1988, you have the right to:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Access</strong> — request a copy of the personal
                information we hold about you.
              </li>
              <li>
                <strong>Correction</strong> — request that we correct any
                inaccurate or out-of-date information.
              </li>
              <li>
                <strong>Deletion</strong> — request that we delete your personal
                information (e.g. email address) from our systems.
              </li>
              <li>
                <strong>Unsubscribe</strong> — opt out of marketing emails at
                any time via the unsubscribe link in any email we send.
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:privacy@invest.com.au"
                className="text-slate-700 hover:text-slate-900 underline"
              >
                privacy@invest.com.au
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              10. European Economic Area — GDPR Rights
            </h2>
            <p className="text-slate-600 mb-2">
              If you are located in the European Economic Area (EEA), you have
              additional rights under the General Data Protection Regulation
              (GDPR) (EU) 2016/679:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>
                <strong>Legal basis for processing</strong> — we rely on
                legitimate interests (site analytics and fraud prevention) or
                consent (where you have opted in to communications) as our legal
                basis for processing personal data.
              </li>
              <li>
                <strong>Data portability</strong> — you may request a
                machine-readable copy of personal data you have provided to us.
              </li>
              <li>
                <strong>Right to erasure</strong> (&quot;right to be
                forgotten&quot;) — you may request deletion of your personal
                data, subject to legal obligations that require us to retain
                certain records.
              </li>
              <li>
                <strong>Right to object</strong> — you may object to processing
                based on legitimate interests at any time.
              </li>
              <li>
                <strong>Supervisory authority</strong> — if you are
                dissatisfied with our response, you may lodge a complaint with
                your national data protection authority (e.g. the ICO in the UK,
                or the relevant EU DPA).
              </li>
            </ul>
            <p className="text-slate-600 mt-2">
              To exercise GDPR rights, contact{" "}
              <a
                href="mailto:privacy@invest.com.au"
                className="text-slate-700 hover:text-slate-900 underline"
              >
                privacy@invest.com.au
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              11. Email Communications (Spam Act 2003)
            </h2>
            <p className="text-slate-600">
              All commercial electronic messages sent by Invest.com.au comply
              with the Australian Spam Act 2003. We will only send you emails if
              you have given your express consent (e.g. by ticking the opt-in
              checkbox when downloading a resource). Every email includes our
              identity, contact information, and a functioning unsubscribe
              mechanism. You can unsubscribe at any time and we will action your
              request within 5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">
              12. Changes to This Policy
            </h2>
            <p className="text-slate-600">
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page with an updated &quot;Last
              updated&quot; date. We encourage you to review this page
              periodically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">13. Contact Us</h2>
            <p className="text-slate-600">
              If you have any questions about this Privacy Policy, or wish to
              make a complaint about how we have handled your personal
              information, please contact us at{" "}
              <a
                href="mailto:privacy@invest.com.au"
                className="text-slate-700 hover:text-slate-900 underline"
              >
                privacy@invest.com.au
              </a>
              .
            </p>
            <p className="text-slate-600 mt-2">
              If you are not satisfied with our response, you may lodge a
              complaint with the{" "}
              <a
                href="https://www.oaic.gov.au/privacy/privacy-complaints"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 hover:text-slate-900 underline"
              >
                Office of the Australian Information Commissioner (OAIC)
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}
