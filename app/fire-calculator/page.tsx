import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import FireCalculatorClient from "./FireCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `FIRE Calculator Australia — Financial Independence Number (${CURRENT_YEAR})`,
  description:
    "Calculate your FIRE number and how many years until financial independence. Uses the 4% safe withdrawal rule to estimate when your investments can sustain your lifestyle indefinitely.",
  alternates: { canonical: "/fire-calculator" },
  openGraph: {
    title: "FIRE Calculator — Financial Independence, Retire Early",
    description:
      "Free FIRE calculator for Australians. Find your financial independence number and project how many years until you can retire early.",
    images: [
      {
        url: "/api/og?title=FIRE+Calculator&subtitle=Financial+Independence%2C+Retire+Early&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `FIRE Calculator — ${SITE_NAME}`,
  description:
    "Calculate your FIRE (Financial Independence, Retire Early) number and projected years to financial independence using the 4% safe withdrawal rule.",
  url: "https://invest.com.au/fire-calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
    { "@type": "ListItem", position: 2, name: "Calculators", item: "https://invest.com.au/calculators" },
    {
      "@type": "ListItem",
      position: 3,
      name: "FIRE Calculator",
      item: "https://invest.com.au/fire-calculator",
    },
  ],
};

const faqLd = faqJsonLd([
  {
    q: "What is the FIRE number?",
    a: "Your FIRE number is the total investment portfolio value you need to retire early and live off investment returns indefinitely. It is calculated as your annual expenses divided by your safe withdrawal rate. Using the popular 4% rule, your FIRE number is 25× your annual expenses.",
  },
  {
    q: "What is the 4% safe withdrawal rate?",
    a: "The 4% rule suggests that if you withdraw 4% of your portfolio in year one of retirement and adjust for inflation each year, your portfolio has a historically high probability of lasting 30+ years. It was derived from the Trinity Study of US market data. Some Australian FIRE practitioners use 3.5% for retirements spanning 40+ years.",
  },
  {
    q: "How do I calculate financial independence?",
    a: "Divide your desired annual living expenses by your safe withdrawal rate. For example, if you need $60,000 per year and use the 4% rule, your FIRE number is $60,000 ÷ 0.04 = $1,500,000. Once your invested assets reach that figure, your portfolio should sustain your spending indefinitely.",
  },
  {
    q: "How long does it take to reach FIRE?",
    a: "Time to FIRE depends primarily on your savings rate — the percentage of take-home income you invest. A 10% savings rate may take 40+ years; a 50% savings rate can achieve FIRE in around 17 years; a 75% savings rate can get there in under 10 years. Investment returns also have a significant effect.",
  },
  {
    q: "What is the difference between Lean FIRE and Fat FIRE?",
    a: "Lean FIRE means retiring on a frugal budget, typically under $40,000 per year for a single person in Australia. Fat FIRE targets a more comfortable lifestyle, often $100,000+ per year. Barista FIRE combines a small portfolio with part-time work to cover the gap, and Coast FIRE means you have enough invested that growth alone will reach your FIRE number by traditional retirement age.",
  },
  {
    q: "Does superannuation count towards my FIRE number?",
    a: "Yes, but with an important caveat — you cannot access super until your preservation age (55–60 depending on birth year). Australian FIRE planners often split their strategy into two buckets: a taxable brokerage account to fund early retirement until preservation age, and super for the traditional retirement phase.",
  },
]);

export default function FireCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <FireCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
