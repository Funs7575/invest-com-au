export interface HelpFaq {
  question: string;
  answer: string;
}

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  /** Plain-text paragraphs. Each string renders as a <p>. */
  body: string[];
  faqs?: HelpFaq[];
  updatedAt: string;
}

export interface HelpCategory {
  slug: string;
  title: string;
  description: string;
  articles: HelpArticle[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Learn how invest.com.au works and how to find the right platform or advisor for you.",
    articles: [
      {
        slug: "how-invest-com-au-works",
        title: "How invest.com.au works",
        summary: "We compare Australian brokers, savings accounts, and advisors so you can make informed financial decisions.",
        body: [
          "invest.com.au is an independent comparison site for Australian investors. We research, rate, and compare brokers, savings accounts, managed funds, and financial advisors — all in one place.",
          "Our editorial team analyses fee structures, features, and user experience for every platform we list. We update data regularly so you see current rates and fees, not last year's numbers.",
          "We earn revenue from affiliate partnerships with some of the platforms we list. This never influences our ratings — our comparison methodology is applied equally to every product, including partners. You can read our full editorial independence policy on the About page.",
          "Use our comparison tables to filter by what matters to you: fee type, minimum deposit, asset classes, or user ratings. Our calculators show you the true yearly cost based on your own trading habits.",
        ],
        faqs: [
          {
            question: "Is invest.com.au free to use?",
            answer: "Yes. All comparisons, calculators, and guides on invest.com.au are free. We are funded by affiliate commissions from some platforms — this does not affect our ratings or rankings.",
          },
          {
            question: "How often is the data updated?",
            answer: "Broker fees and savings rates are updated within 48 hours of a change. We also run automated checks to flag stale data. Each data point shows a 'last updated' label.",
          },
          {
            question: "Do you provide personal financial advice?",
            answer: "No. invest.com.au provides general information only, not personal financial advice. If you need tailored advice, use our advisor matching tool to find a licensed financial adviser.",
          },
        ],
        updatedAt: "2026-05-11",
      },
      {
        slug: "how-brokers-are-ranked",
        title: "How brokers are ranked",
        summary: "Our broker rankings combine fees, features, reliability, and user experience — not just affiliate commissions.",
        body: [
          "Every broker on invest.com.au is scored across five dimensions: fee competitiveness, platform features, asset class breadth, customer support quality, and regulatory standing. The overall star rating is a weighted average of these scores.",
          "Fee competitiveness is weighted most heavily (40%) because it has the largest measurable impact on long-term returns. We score fees against the median for that platform type — a fee that is 20% below median scores higher than one at median.",
          "We do not accept payment for higher rankings. Sponsored placements are clearly labelled 'Sponsored' and appear separately from the organic comparison results.",
          "Our full methodology, including the exact weighting formula and data sources, is published on the Methodology page.",
        ],
        faqs: [
          {
            question: "Can a broker pay to improve its ranking?",
            answer: "No. Rankings are determined solely by our scoring methodology. Brokers can purchase sponsored placement labels, which appear above or alongside organic results and are clearly marked.",
          },
          {
            question: "How do I report an error in a broker listing?",
            answer: "Email us at data@invest.com.au with the broker name and the incorrect field. We aim to review and correct verified errors within 2 business days.",
          },
        ],
        updatedAt: "2026-05-11",
      },
    ],
  },
  {
    slug: "brokers",
    title: "Brokers & Platforms",
    description: "Understand brokerage fees, platform types, and how to choose the right broker for your investing style.",
    articles: [
      {
        slug: "what-is-brokerage",
        title: "What is brokerage?",
        summary: "Brokerage is the fee you pay each time you buy or sell a share. It can be a flat fee, a percentage, or a combination.",
        body: [
          "Brokerage is the commission charged by a broker for executing your trade. In Australia, most online brokers charge either a flat fee (e.g. $9.50 per trade) or a percentage of the trade value (e.g. 0.1%), whichever is higher.",
          "Flat-fee brokers are generally cheaper for larger trades. Percentage-fee brokers can be cheaper for very small trades. Our TCO Calculator shows you the true yearly cost based on your own trade size and frequency.",
          "Some brokers charge additional fees for US shares, FX conversion, inactivity, or data subscriptions. Our comparison tables surface all material fees so you can compare total cost, not just the headline brokerage figure.",
          "CHESS-sponsored brokers hold your shares in your own name on the ASX CHESS system. Custodian model brokers hold shares on your behalf. Both are legally compliant in Australia — the main practical difference is how quickly you can transfer your shares if you switch brokers.",
        ],
        faqs: [
          {
            question: "What is a flat-fee broker?",
            answer: "A flat-fee broker charges the same dollar amount per trade regardless of trade size. For example, $9.50 per trade whether you buy $500 or $50,000 worth of shares. This makes them cost-effective for larger trades.",
          },
          {
            question: "What is an FX fee?",
            answer: "An FX (foreign exchange) fee is charged when you buy shares listed in a foreign currency, like US-listed shares. Australian brokers typically charge 0%–0.7% of the trade value as an FX conversion margin on top of brokerage.",
          },
          {
            question: "What is CHESS sponsorship?",
            answer: "CHESS (Clearing House Electronic Subregister System) sponsorship means your Australian shares are registered in your name on the ASX's system. You receive a Holder Identification Number (HIN). If your broker closes, you can transfer your shares to another broker using your HIN.",
          },
        ],
        updatedAt: "2026-05-11",
      },
      {
        slug: "chess-vs-custodian",
        title: "CHESS vs custodian brokers",
        summary: "CHESS-sponsored brokers register shares in your name. Custodian brokers hold shares on your behalf. Each has trade-offs.",
        body: [
          "CHESS-sponsored brokers are the traditional Australian model. Your shares are registered in your name on the ASX's CHESS system and you receive a HIN (Holder Identification Number). This makes broker-to-broker transfers straightforward — you take your shares with you if you switch.",
          "Custodian (or wrap) brokers hold shares on behalf of all their clients in a pooled or segregated custodial account. This is the dominant model for international brokers operating in Australia and for many fintech platforms. Under the Corporations Act, client assets are segregated from the broker's own assets — your shares remain yours even if the broker becomes insolvent.",
          "Practically, CHESS brokers can be slightly slower to execute complex orders and may charge more. Custodian brokers often offer lower fees, faster execution, and access to a broader range of international markets. The right choice depends on which assets you want to trade and how often you expect to switch platforms.",
        ],
        faqs: [
          {
            question: "Are custodian brokers safe?",
            answer: "Yes. Custodian brokers in Australia are AFSL-licensed and must segregate client assets from company assets under the Corporations Act. If a custodian broker becomes insolvent, client assets are protected in the winding-up process. The key risk is operational — choose a reputable, well-capitalised broker.",
          },
          {
            question: "Can I transfer shares from a custodian broker to a CHESS broker?",
            answer: "Yes, but the process is called an off-market transfer and can take 3–10 business days and may incur a fee (typically $15–$55 per holding). Contact both brokers to initiate the transfer.",
          },
        ],
        updatedAt: "2026-05-11",
      },
    ],
  },
  {
    slug: "investing-basics",
    title: "Investing Basics",
    description: "Foundational concepts for Australian investors — shares, ETFs, super, and risk.",
    articles: [
      {
        slug: "what-is-an-etf",
        title: "What is an ETF?",
        summary: "An ETF (exchange-traded fund) is a basket of assets you can buy and sell on the ASX like a share.",
        body: [
          "An ETF (exchange-traded fund) is a fund that holds a collection of assets — shares, bonds, commodities, or a mix — and trades on a stock exchange just like an individual share. When you buy an ETF, you own a proportional slice of everything in the fund.",
          "Index ETFs track a market index such as the ASX 200 or S&P 500. Because they simply replicate an index rather than actively selecting stocks, they have very low management fees (typically 0.03%–0.20% per year for broad index funds). This cost advantage compounds significantly over decades.",
          "Active ETFs hold a portfolio selected by a fund manager who aims to outperform the market. They charge higher fees (typically 0.5%–1.5% per year) and have a mixed track record relative to passive index alternatives.",
          "Australian-listed ETFs (ASX-listed) are subject to Australian tax rules. Distributions are generally treated as dividends and may carry franking credits. ETFs listed on international exchanges may attract foreign withholding tax.",
        ],
        faqs: [
          {
            question: "How are ETFs taxed in Australia?",
            answer: "ETF distributions are taxed as income in the year received. Capital gains on ETF units held for more than 12 months are eligible for the 50% CGT discount. Your broker will provide a tax statement each year with the relevant figures for your tax return.",
          },
          {
            question: "What is the difference between an ETF and a managed fund?",
            answer: "ETFs trade on a stock exchange in real-time during market hours. Managed funds are typically priced once per day and transacted directly with the fund manager. ETFs generally have lower minimum investment amounts and lower ongoing fees.",
          },
        ],
        updatedAt: "2026-05-11",
      },
      {
        slug: "understanding-risk",
        title: "Understanding investment risk",
        summary: "All investments carry risk. Understanding the types of risk helps you build a portfolio suited to your goals.",
        body: [
          "Investment risk is the possibility that your investment will decline in value or produce lower returns than expected. Risk and return are related — assets with higher potential returns generally carry higher short-term volatility.",
          "Market risk (or systematic risk) affects all investments of a type simultaneously — a broad share market fall will reduce the value of almost every share ETF regardless of how well-diversified you are within shares. Diversifying across asset classes (shares, bonds, property, cash) reduces market risk.",
          "Concentration risk arises when a large portion of your portfolio is in a single company, sector, or country. Broad index ETFs mitigate concentration risk by holding hundreds or thousands of companies.",
          "Currency risk affects investments denominated in foreign currencies. If the AUD rises against the USD, your US-listed holdings lose value in AUD terms even if they rise in USD terms. Some ETFs offer currency-hedged versions.",
          "Liquidity risk is the risk you cannot sell an asset quickly at a fair price. Listed shares and ETFs are generally highly liquid. Property, unlisted funds, and some alternative investments can be hard to exit quickly.",
        ],
        faqs: [
          {
            question: "How much risk should I take?",
            answer: "This depends on your investment time horizon, financial situation, and emotional tolerance for short-term losses. Generally: longer time horizons can absorb more short-term volatility; shorter horizons warrant more conservative portfolios. A financial adviser can help you assess your personal risk profile.",
          },
        ],
        updatedAt: "2026-05-11",
      },
    ],
  },
  {
    slug: "account",
    title: "Account & Profile",
    description: "Managing your invest.com.au account, saved comparisons, and notification preferences.",
    articles: [
      {
        slug: "create-account",
        title: "Creating an account",
        summary: "Create a free account to save comparisons, set rate alerts, and get personalised recommendations.",
        body: [
          "Creating an account on invest.com.au is free and takes under two minutes. Click 'Sign up' in the header and enter your email address. You'll receive a confirmation link — click it and you're in.",
          "Your account gives you access to saved comparisons (shortlists), rate change alerts, calculator history, and personalised recommendations based on your investor profile quiz.",
          "We use Supabase Auth for authentication. You can also sign in with Google for one-click access. We never store your password in plaintext — credentials are hashed using industry-standard algorithms.",
          "Your data is protected under our Privacy Policy and complies with the Australian Privacy Act 1988. You can delete your account and all associated data at any time from Account Settings.",
        ],
        faqs: [
          {
            question: "Can I use invest.com.au without an account?",
            answer: "Yes. All comparison tables, calculators, and guides are freely accessible without an account. Creating an account unlocks saved comparisons, alerts, and personalised features.",
          },
          {
            question: "How do I delete my account?",
            answer: "Go to Account Settings → Privacy → Delete Account. This permanently removes your profile, saved comparisons, and all associated data. This action cannot be undone.",
          },
          {
            question: "Is my data shared with third parties?",
            answer: "We do not sell your personal data. We share anonymised, aggregated usage data with analytics providers (Plausible — privacy-first, no cross-site tracking). See our full Privacy Policy for details.",
          },
        ],
        updatedAt: "2026-05-11",
      },
      {
        slug: "save-comparison",
        title: "Saving and sharing comparisons",
        summary: "Save broker or product comparisons to your account or share a direct link with a partner or advisor.",
        body: [
          "To save a comparison, click the bookmark icon on any broker card or use the 'Save' button in the comparison table. Saved items appear in your Shortlist, accessible from the account menu.",
          "You can share a comparison directly by copying the URL from your browser's address bar. The URL encodes your current filter settings so whoever opens it sees exactly the same comparison you built.",
          "For calculator results, click 'Share Results' below any calculator output. This copies a shareable link that pre-fills the calculator with your inputs — useful for sharing with a partner or accountant.",
          "Signed-in users can also save calculator states across devices. Your inputs are automatically saved as you type and restored when you return.",
        ],
        faqs: [
          {
            question: "Do I need an account to share a comparison?",
            answer: "No. You can share calculator results and filter states via URL without an account. Account holders get the additional benefit of cross-device sync and persistent shortlists.",
          },
        ],
        updatedAt: "2026-05-11",
      },
    ],
  },
];

export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.slug === slug);
}

export function getArticleBySlug(
  categorySlug: string,
  articleSlug: string,
): { category: HelpCategory; article: HelpArticle } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  const article = category.articles.find((a) => a.slug === articleSlug);
  if (!article) return undefined;
  return { category, article };
}
