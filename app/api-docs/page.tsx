import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const metadata = {
  title: "API Documentation | Invest.com.au",
  description:
    "API documentation for financial planners and developers. Access Australian broker fee data, comparisons, and fee change history via a RESTful JSON API.",
  alternates: { canonical: "/api-docs" },
  openGraph: {
    title: "API Documentation | Invest.com.au",
    description:
      "Access Australian broker data via our REST API. Built for financial planners, advisors, and fintech developers.",
  },
};

function CodeBlock({ children, lang }: { children: string; lang: string }) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-3 text-[10px] font-mono uppercase text-slate-400">
        {lang}
      </div>
      <pre className="bg-slate-900 text-slate-100 text-sm rounded-lg p-4 overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  auth,
  description,
  children,
}: {
  method: string;
  path: string;
  auth: boolean;
  description: string;
  children?: React.ReactNode;
}) {
  const methodColor =
    method === "GET"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-blue-100 text-blue-700";

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-5 py-3 flex items-center gap-3 border-b border-slate-200">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor}`}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-slate-800">{path}</code>
        {auth && (
          <span className="ml-auto text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            Auth required
          </span>
        )}
        {!auth && (
          <span className="ml-auto text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            Public
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-600">{description}</p>
        {children}
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "API Documentation" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-brand">API Documentation</span>
          </div>

          {/* Header */}
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
            Broker Data API
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl">
            Access verified Australian broker fee data, comparisons, and fee
            change history via a RESTful JSON API. Built for financial planners,
            advisors, and fintech developers.
          </p>

          {/* Getting Started */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Getting Started
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800">
                  1. Get an API key
                </h3>
                <p className="text-sm text-slate-600">
                  Request a free API key by sending a POST request to{" "}
                  <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">
                    /api/v1/api-keys
                  </code>{" "}
                  or{" "}
                  <Link
                    href="/contact"
                    className="text-brand underline underline-offset-2"
                  >
                    contact us
                  </Link>
                  .
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800">
                  2. Include your key in requests
                </h3>
                <p className="text-sm text-slate-600">
                  Pass your API key in the{" "}
                  <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">
                    Authorization
                  </code>{" "}
                  header:
                </p>
                <CodeBlock lang="http">
                  {`Authorization: Bearer ica_your_api_key_here`}
                </CodeBlock>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800">
                  3. Base URL
                </h3>
                <p className="text-sm text-slate-600">
                  All endpoints are served from:
                </p>
                <code className="block text-sm bg-slate-200 px-3 py-2 rounded font-mono">
                  https://invest.com.au/api/v1
                </code>
              </div>
            </div>
          </section>

          {/* Rate Limits */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Rate Limits
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700 border-b border-slate-200">
                      Tier
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700 border-b border-slate-200">
                      Per Minute
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700 border-b border-slate-200">
                      Per Day
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700 border-b border-slate-200">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 font-medium">Free</td>
                    <td className="px-4 py-2.5 text-slate-600">30</td>
                    <td className="px-4 py-2.5 text-slate-600">1,000</td>
                    <td className="px-4 py-2.5 text-slate-600">$0</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 font-medium">Basic</td>
                    <td className="px-4 py-2.5 text-slate-600">60</td>
                    <td className="px-4 py-2.5 text-slate-600">5,000</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <Link
                        href="/contact"
                        className="text-brand underline underline-offset-2"
                      >
                        Contact us
                      </Link>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 font-medium">Pro</td>
                    <td className="px-4 py-2.5 text-slate-600">120</td>
                    <td className="px-4 py-2.5 text-slate-600">25,000</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <Link
                        href="/contact"
                        className="text-brand underline underline-offset-2"
                      >
                        Contact us
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium">Enterprise</td>
                    <td className="px-4 py-2.5 text-slate-600">300</td>
                    <td className="px-4 py-2.5 text-slate-600">100,000</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <Link
                        href="/contact"
                        className="text-brand underline underline-offset-2"
                      >
                        Contact us
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Daily limits reset at midnight UTC. If you exceed your rate limit
              you will receive a{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded">429</code>{" "}
              response.
            </p>
          </section>

          {/* Endpoints */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Endpoints
            </h2>
            <div className="space-y-6">
              {/* List Brokers */}
              <EndpointCard
                method="GET"
                path="/api/v1/brokers"
                auth={true}
                description="List all active brokers with public data. Supports filtering by platform type, CHESS sponsorship, SMSF support, and pagination."
              >
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Query Parameters
                  </h4>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        platform_type
                      </code>{" "}
                      &mdash; share_broker, crypto_exchange, cfd_forex,
                      multi_asset, robo_advisor, savings
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        chess_sponsored
                      </code>{" "}
                      &mdash; true / false
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        smsf_support
                      </code>{" "}
                      &mdash; true / false
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        is_crypto
                      </code>{" "}
                      &mdash; true / false
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        limit
                      </code>{" "}
                      &mdash; Results per page (default 20, max 100)
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        offset
                      </code>{" "}
                      &mdash; Pagination offset (default 0)
                    </p>
                  </div>
                </div>
              </EndpointCard>

              {/* Single Broker */}
              <EndpointCard
                method="GET"
                path="/api/v1/brokers/:slug"
                auth={true}
                description="Get a single broker's full public profile by slug. Includes the last 10 fee changes from the broker's fee changelog."
              >
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Path Parameters
                  </h4>
                  <p className="text-sm text-slate-600">
                    <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                      slug
                    </code>{" "}
                    &mdash; The broker&apos;s URL slug (e.g. &quot;stake&quot;,
                    &quot;commsec&quot;, &quot;selfwealth&quot;)
                  </p>
                </div>
              </EndpointCard>

              {/* Compare */}
              <EndpointCard
                method="GET"
                path="/api/v1/compare"
                auth={true}
                description="Compare up to 5 brokers side-by-side. Returns broker data in the same order as the requested slugs."
              >
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Query Parameters
                  </h4>
                  <p className="text-sm text-slate-600">
                    <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                      slugs
                    </code>{" "}
                    &mdash; Comma-separated broker slugs, max 5. Example:{" "}
                    <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                      stake,selfwealth,commsec
                    </code>
                  </p>
                </div>
              </EndpointCard>

              {/* Request API Key */}
              <EndpointCard
                method="POST"
                path="/api/v1/api-keys"
                auth={false}
                description="Request a new API key. The plain-text key is returned once in the response and cannot be retrieved again. Maximum 3 keys per email."
              >
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Request Body (JSON)
                  </h4>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        email
                      </code>{" "}
                      <span className="text-red-500 text-xs">required</span>{" "}
                      &mdash; Your email address
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        name
                      </code>{" "}
                      <span className="text-red-500 text-xs">required</span>{" "}
                      &mdash; A label for this API key
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        company_name
                      </code>{" "}
                      &mdash; Your company or practice name
                    </p>
                    <p>
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                        use_case
                      </code>{" "}
                      &mdash; Brief description of your intended use
                    </p>
                  </div>
                </div>
              </EndpointCard>

              {/* Docs */}
              <EndpointCard
                method="GET"
                path="/api/v1/docs"
                auth={false}
                description="Returns this API's documentation as a JSON object. Useful for programmatic discovery."
              />
            </div>
          </section>

          {/* Code Examples */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Code Examples
            </h2>
            <div className="space-y-6">
              {/* curl */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  curl
                </h3>
                <CodeBlock lang="bash">
                  {`# List CHESS-sponsored share brokers
curl -H "Authorization: Bearer ica_your_key_here" \\
  "https://invest.com.au/api/v1/brokers?platform_type=share_broker&chess_sponsored=true"

# Get a single broker
curl -H "Authorization: Bearer ica_your_key_here" \\
  "https://invest.com.au/api/v1/brokers/stake"

# Compare brokers
curl -H "Authorization: Bearer ica_your_key_here" \\
  "https://invest.com.au/api/v1/compare?slugs=stake,selfwealth,commsec"`}
                </CodeBlock>
              </div>

              {/* JavaScript */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  JavaScript / TypeScript
                </h3>
                <CodeBlock lang="javascript">
                  {`const API_KEY = "ica_your_key_here";
const BASE = "https://invest.com.au/api/v1";

async function getBrokers() {
  const res = await fetch(\`\${BASE}/brokers?platform_type=share_broker&limit=10\`, {
    headers: { Authorization: \`Bearer \${API_KEY}\` },
  });
  const { data, meta } = await res.json();
  console.log(\`Found \${meta.total} brokers\`);
  return data;
}

async function compareBrokers(slugs) {
  const res = await fetch(\`\${BASE}/compare?slugs=\${slugs.join(",")}\`, {
    headers: { Authorization: \`Bearer \${API_KEY}\` },
  });
  return (await res.json()).data;
}`}
                </CodeBlock>
              </div>

              {/* Python */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Python
                </h3>
                <CodeBlock lang="python">
                  {`import requests

API_KEY = "ica_your_key_here"
BASE = "https://invest.com.au/api/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# List brokers with SMSF support
response = requests.get(
    f"{BASE}/brokers",
    headers=HEADERS,
    params={"smsf_support": "true", "limit": 20}
)
data = response.json()
for broker in data["data"]:
    print(f"{broker['name']}: ASX fee {broker['asx_fee']}")

# Get a single broker with fee history
broker = requests.get(f"{BASE}/brokers/commsec", headers=HEADERS).json()
for change in broker["data"]["fee_changelog"]:
    print(f"{change['field_name']}: {change['old_value']} -> {change['new_value']}")`}
                </CodeBlock>
              </div>
            </div>
          </section>

          {/* Response Format */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Response Format
            </h2>
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-2">
                  Success Response
                </h3>
                <CodeBlock lang="json">
                  {`{
  "data": [ ... ],
  "meta": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "updated_at": "2026-04-10T12:00:00Z"
  }
}`}
                </CodeBlock>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-2">
                  Error Response
                </h3>
                <CodeBlock lang="json">
                  {`{
  "error": "Invalid API key"
}`}
                </CodeBlock>
                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                      401
                    </code>{" "}
                    &mdash; Invalid or missing API key
                  </p>
                  <p>
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                      400
                    </code>{" "}
                    &mdash; Bad request (invalid parameters)
                  </p>
                  <p>
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                      404
                    </code>{" "}
                    &mdash; Resource not found
                  </p>
                  <p>
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                      429
                    </code>{" "}
                    &mdash; Rate limit exceeded
                  </p>
                  <p>
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                      500
                    </code>{" "}
                    &mdash; Internal server error
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Fields */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Available Data Fields
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              The API exposes only public, non-sensitive broker data. Sensitive
              commercial fields (affiliate URLs, commission rates, CPA values,
              sponsorship details) are never included in API responses.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">
                      Field
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">
                      Type
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {[
                    ["name", "string", "Broker display name"],
                    ["slug", "string", "URL-safe identifier"],
                    ["asx_fee", "string", "ASX trade fee display text"],
                    ["asx_fee_value", "number", "ASX fee as a number (for sorting)"],
                    ["us_fee", "string", "US trade fee display text"],
                    ["us_fee_value", "number", "US fee as a number"],
                    ["fx_rate", "number", "Foreign exchange rate markup (%)"],
                    ["chess_sponsored", "boolean", "CHESS sponsorship status"],
                    ["smsf_support", "boolean", "SMSF account support"],
                    ["is_crypto", "boolean", "Crypto exchange flag"],
                    ["platform_type", "string", "Platform category"],
                    ["rating", "number", "Editorial rating (0-5)"],
                    ["inactivity_fee", "string", "Inactivity fee text"],
                    ["min_deposit", "string", "Minimum deposit text"],
                    ["markets", "json", "Supported market information"],
                    ["regulated_by", "string", "Regulatory body (e.g. ASIC)"],
                    ["year_founded", "number", "Year the broker was founded"],
                    ["fee_verified_date", "string", "When fees were last verified"],
                    ["fee_changelog", "array", "Last 10 fee changes (single broker only)"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="border-b border-slate-100">
                      <td className="px-4 py-2">
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          {field}
                        </code>
                      </td>
                      <td className="px-4 py-2 text-xs">{type}</td>
                      <td className="px-4 py-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Support */}
          <section className="mb-8">
            <div className="bg-slate-900 text-white rounded-xl p-6 md:p-8">
              <h2 className="text-lg font-bold mb-2">
                Need help or a higher rate limit?
              </h2>
              <p className="text-sm text-slate-300 mb-4">
                Contact our API team for enterprise access, custom integrations,
                or bulk data exports.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-block bg-white text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Contact Us
                </Link>
                <a
                  href="mailto:api@invest.com.au"
                  className="inline-block border border-slate-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-slate-400 transition-colors"
                >
                  api@invest.com.au
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
