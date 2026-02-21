import { createClient } from "@/lib/supabase/server";

export const COURSE_SLUG = "investing-101";

export const COURSE_CONFIG = {
  slug: COURSE_SLUG,
  title: "How to Actually Start Investing in Australia",
  subtitle: "The complete beginner's guide to shares, ETFs, brokers & tax — built for Australians.",
  description:
    "A practical, no-fluff course covering everything from opening your first brokerage account to building a $10K portfolio. " +
    "Includes SMSF basics, franking credits, and capital gains tax explained simply.",
  price: 297,
  proPrice: 197,
  currency: "AUD",
  stripePriceId: process.env.STRIPE_COURSE_PRICE_ID || "",
  stripeProPriceId: process.env.STRIPE_COURSE_PRO_PRICE_ID || "",
  totalLessons: 18,
  totalModules: 6,
  estimatedHours: 3,
  guarantee: "30-day money-back guarantee — no questions asked.",
} as const;

export interface CourseModule {
  index: number;
  title: string;
  description: string;
  lessons: { index: number; title: string; slug: string; isFreePreview?: boolean }[];
}

export const COURSE_MODULES: CourseModule[] = [
  {
    index: 1,
    title: "How the ASX Works",
    description: "Understand the Australian Securities Exchange, how share trading works, and the types of investments available.",
    lessons: [
      { index: 1, title: "What Is the ASX?", slug: "what-is-the-asx", isFreePreview: true },
      { index: 2, title: "How Share Trading Works", slug: "how-share-trading-works", isFreePreview: true },
      { index: 3, title: "Types of Investments", slug: "types-of-investments" },
    ],
  },
  {
    index: 2,
    title: "Choosing a Broker",
    description: "Learn what to look for in a broker, how fees work, and the difference between CHESS-sponsored and custodial models.",
    lessons: [
      { index: 1, title: "What to Look for in a Broker", slug: "what-to-look-for-broker", isFreePreview: true },
      { index: 2, title: "Fees Explained", slug: "fees-explained" },
      { index: 3, title: "CHESS vs Custodial", slug: "chess-vs-custodial" },
    ],
  },
  {
    index: 3,
    title: "Opening Your First Account",
    description: "A step-by-step walkthrough of opening a brokerage account, verifying your identity, and funding it.",
    lessons: [
      { index: 1, title: "Step-by-Step Account Setup", slug: "account-setup" },
      { index: 2, title: "Verification Process", slug: "verification-process" },
      { index: 3, title: "Funding Your Account", slug: "funding-your-account" },
    ],
  },
  {
    index: 4,
    title: "Building a $10K Portfolio",
    description: "ETF basics, diversification principles, and how to place your very first trade on the ASX.",
    lessons: [
      { index: 1, title: "ETF Basics", slug: "etf-basics" },
      { index: 2, title: "Diversification", slug: "diversification" },
      { index: 3, title: "Your First Purchase", slug: "your-first-purchase" },
    ],
  },
  {
    index: 5,
    title: "Tax & Dividends",
    description: "Capital gains tax, franking credits, and record-keeping essentials every Australian investor needs to know.",
    lessons: [
      { index: 1, title: "Capital Gains Tax", slug: "capital-gains-tax" },
      { index: 2, title: "Franking Credits", slug: "franking-credits" },
      { index: 3, title: "Record Keeping", slug: "record-keeping" },
    ],
  },
  {
    index: 6,
    title: "SMSF Basics",
    description: "An introduction to Self-Managed Super Funds — what they are, how to set one up, and the investment rules.",
    lessons: [
      { index: 1, title: "What Is an SMSF?", slug: "what-is-smsf" },
      { index: 2, title: "Setting Up an SMSF", slug: "setting-up-smsf" },
      { index: 3, title: "SMSF Investment Rules", slug: "smsf-investment-rules" },
    ],
  },
];

/**
 * Server-side: check if user has purchased the course.
 */
export async function hasCourseAccess(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("course_slug", COURSE_SLUG)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * Flatten all lessons into a single ordered list for prev/next navigation.
 */
export function getAllLessonSlugs(): string[] {
  return COURSE_MODULES.flatMap((m) => m.lessons.map((l) => l.slug));
}

/**
 * Find module + lesson info by slug.
 */
export function findLessonBySlug(slug: string) {
  for (const mod of COURSE_MODULES) {
    const lesson = mod.lessons.find((l) => l.slug === slug);
    if (lesson) {
      return { module: mod, lesson };
    }
  }
  return null;
}
