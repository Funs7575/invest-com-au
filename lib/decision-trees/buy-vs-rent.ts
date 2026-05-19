import type { TreeNode } from "@/components/DecisionTree";

export const BUY_VS_RENT_TREE: TreeNode[] = [
  // ── Questions ────────────────────────────────────────────────────────────
  {
    id: "start",
    question: "Which situation describes you best?",
    options: [
      {
        label: "I'm renting and wondering whether to buy",
        next: "horizon",
      },
      {
        label: "I own a home and wondering whether to sell and rent",
        next: "own-sell",
      },
    ],
  },
  {
    id: "horizon",
    question: "How long do you plan to stay in the same area?",
    options: [
      { label: "Less than 3 years", next: "leaf-rent-short" },
      { label: "3–7 years", next: "deposit-medium" },
      { label: "More than 7 years", next: "deposit-long" },
    ],
  },
  {
    id: "deposit-medium",
    question: "Do you have (or can you save) a 20% deposit?",
    options: [
      { label: "Yes — 20% or more saved", next: "leaf-buy-medium" },
      { label: "No — I'd need LMI or a guarantor", next: "leaf-rent-lmi" },
    ],
  },
  {
    id: "deposit-long",
    question: "What's your deposit situation?",
    options: [
      { label: "20% or more — ready to go", next: "leaf-buy-strong" },
      { label: "Under 20% — would need LMI", next: "leaf-buy-lmi-long" },
      { label: "Not yet saving toward a deposit", next: "leaf-save-long" },
    ],
  },
  {
    id: "own-sell",
    question: "What's the main reason you're considering selling?",
    options: [
      {
        label: "I need to relocate or move frequently",
        next: "leaf-sell-mobile",
      },
      {
        label: "I want to access my equity to invest elsewhere",
        next: "leaf-review-equity",
      },
      {
        label: "The property has gone up a lot and I want to lock in profit",
        next: "leaf-review-cgt",
      },
    ],
  },

  // ── Leaves ───────────────────────────────────────────────────────────────
  {
    id: "leaf-rent-short",
    verdict: "rent",
    heading: "Renting makes more sense right now",
    detail:
      "Buying and selling within 3 years rarely covers stamp duty, agent fees, and transaction costs — which can add up to 5–8% of the purchase price. You'd need significant capital growth just to break even. Renting keeps you flexible and protects your savings.",
    action: {
      label: "Run the mortgage repayment calculator",
      href: "/calculators/mortgage-repayment",
    },
  },
  {
    id: "leaf-buy-medium",
    verdict: "buy",
    heading: "Buying is viable — weigh the numbers carefully",
    detail:
      "With a 20% deposit and a 3–7 year horizon, you avoid LMI and have meaningful equity from day one. Model stamp duty, council rates, maintenance (~1% of purchase price per year), and mortgage repayments versus your current rent. If the monthly gap is manageable and your income is stable, buying can make strong sense.",
    action: {
      label: "Run the mortgage repayment calculator",
      href: "/calculators/mortgage-repayment",
    },
  },
  {
    id: "leaf-rent-lmi",
    verdict: "rent",
    heading: "Renting while saving is likely smarter",
    detail:
      "LMI adds 1–3% to your loan balance on day one, and over a 3–7 year hold that cost is hard to recover. Consider renting while saving toward 20%, or explore the First Home Guarantee scheme — eligible first-home buyers can purchase with as little as a 5% deposit and no LMI.",
    action: {
      label: "First home buyer options",
      href: "/first-home-buyer",
    },
  },
  {
    id: "leaf-buy-strong",
    verdict: "buy",
    heading: "You're in a strong position to buy",
    detail:
      "A 20%+ deposit eliminates LMI, gives you equity from day one, and combined with a 7+ year horizon means the market has time to work for you. Make sure your income can comfortably service the loan and you retain a 3–6 month emergency buffer after settlement.",
    action: {
      label: "Compare mortgage rates",
      href: "/calculators/mortgage-repayment",
    },
  },
  {
    id: "leaf-buy-lmi-long",
    verdict: "buy",
    heading: "Buying with LMI can make sense over 7+ years",
    detail:
      "LMI costs (typically 1–3% of the loan) look steep up front, but spread over a 7+ year hold they become more manageable — particularly in markets with moderate growth. Check whether the First Home Guarantee could eliminate LMI entirely, and confirm repayments are comfortable at a 2% rate buffer above the current rate.",
    action: {
      label: "Explore first-home buyer options",
      href: "/first-home-buyer",
    },
  },
  {
    id: "leaf-save-long",
    verdict: "save",
    heading: "Rent while you build your deposit",
    detail:
      "If you haven't started saving yet, the gap is wider than it looks — but a 7+ year timeline is genuinely workable. The First Home Super Saver scheme (FHSS) lets you contribute up to $50,000 into super and withdraw it for a deposit at a lower tax rate, giving your savings a meaningful boost.",
    action: {
      label: "First home buyer guide",
      href: "/first-home-buyer",
    },
  },
  {
    id: "leaf-sell-mobile",
    verdict: "rent",
    heading: "Selling and renting suits a mobile lifestyle",
    detail:
      "If you're relocating frequently or expect major life changes, owning a property while renting elsewhere means running two sets of costs. Selling locks in your gains and gives you flexibility to rent optimally wherever you need to be. Before listing, check whether renting your property out could cover both costs instead.",
  },
  {
    id: "leaf-review-equity",
    verdict: "review",
    heading: "Explore equity release before selling",
    detail:
      "Selling to access equity triggers stamp duty, agent fees, and potential CGT on a future purchase. A redraw facility, home equity loan, or offset restructure may give you the capital you need without those transaction costs. Speak with a mortgage broker before committing to a sale.",
    action: {
      label: "Find a financial advisor",
      href: "/find-advisor",
    },
  },
  {
    id: "leaf-review-cgt",
    verdict: "review",
    heading: "Talk to a tax advisor before selling",
    detail:
      "Realising a large capital gain triggers CGT. The 50% CGT discount applies to assets held over 12 months, but timing the sale correctly — for example, in a lower-income year — can significantly reduce the tax bill. An accountant or tax advisor can model the numbers specific to your situation.",
    action: {
      label: "Find a financial advisor",
      href: "/find-advisor",
    },
  },
];

export const BUY_VS_RENT_START_ID = "start";
