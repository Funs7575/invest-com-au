import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import FireCalculatorClient from "./FireCalculatorClient";

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

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the FIRE number?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your FIRE number is the total investment portfolio value you need to retire early and live off investment returns indefinitely. It is calculated as your annual expenses divided by your safe withdrawal rate. Using the popular 4% rule, your FIRE number is 25× your annual expenses.",
      },
    },
    {
      "@type": "Question",
      name: "What is the 4% rule?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The 4% rule (also called the safe withdrawal rate) suggests that if you withdraw 4% of your portfolio in year one of retirement and adjust for inflation each year, your portfolio has a historically high probability of lasting 30+ years. It was derived from the 'Trinity Study' of US market data.",
      },
    },
    {
      "@type": "Question",
      name: "Is 4% a safe withdrawal rate for Australians?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Australian research suggests 3.5-4% may be appropriate for longer retirement periods (40+ years). Some Australian FIRE practitioners use 3.5% to be conservative, particularly given sequence-of-returns risk and Australia's different market conditions. Consider consulting a financial adviser to determine an appropriate rate for your situation.",
      },
    },
    {
      "@type": "Question",
      name: "What does FIRE stand for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FIRE stands for Financial Independence, Retire Early. It is a movement focused on extreme savings and investment to achieve financial independence earlier than the traditional retirement age. Common variants include Lean FIRE (minimal spending), Fat FIRE (comfortable spending), Barista FIRE (part-time work), and Coast FIRE (enough invested to grow to your FIRE number without further contributions).",
      },
    },
  ],
};

export default function FireCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <FireCalculatorClient />
    </>
  );
}
