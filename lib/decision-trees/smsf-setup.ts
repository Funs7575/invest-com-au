import type { TreeNode } from "@/components/DecisionTree";

export const SMSF_SETUP_TREE: TreeNode[] = [
  // ── Questions ────────────────────────────────────────────────────────────
  {
    id: "start",
    question: "What is the main reason you are considering setting up an SMSF?",
    options: [
      {
        label:
          "I want control over where my super is invested (stocks, ETFs, property)",
        next: "balance-check",
      },
      {
        label:
          "I want to buy my business premises inside super (business real property)",
        next: "leaf-business-property",
      },
      {
        label:
          "My current fund's returns or fees have disappointed me",
        next: "returns-check",
      },
    ],
  },
  {
    id: "balance-check",
    question:
      "What is your current super balance? Include your partner's if you plan to run a joint SMSF.",
    options: [
      { label: "Under $200,000", next: "leaf-too-small" },
      { label: "$200,000–$500,000", next: "leaf-viable-watch-costs" },
      { label: "Over $500,000", next: "leaf-viable-strong" },
    ],
  },
  {
    id: "returns-check",
    question:
      "Have you compared your current fund against a low-cost indexed option on the ATO's YourSuper comparison tool?",
    options: [
      {
        label: "No — I haven't done a proper comparison yet",
        next: "leaf-check-fund-first",
      },
      {
        label: "Yes — and I still want the control of an SMSF",
        next: "balance-check",
      },
    ],
  },

  // ── Leaves ───────────────────────────────────────────────────────────────
  {
    id: "leaf-business-property",
    verdict: "review",
    heading: "SMSFs can hold business real property — with conditions",
    detail:
      "Business real property (commercial premises used wholly and exclusively in a business) is one of the few assets an SMSF can purchase from a related party. Your fund can buy your business's premises and lease them back to you at market rent. A balance of $500,000+ is generally needed to make the admin costs worthwhile, and you'll need a licensed SMSF adviser to establish the trust deed, investment strategy, and limited recourse borrowing arrangement (LRBA) if you're borrowing. Get specialist advice before proceeding.",
    action: { label: "Find an SMSF specialist", href: "/find-advisor" },
  },
  {
    id: "leaf-too-small",
    verdict: "rent",
    heading: "Your balance is too small to make an SMSF cost-effective",
    detail:
      "SMSF running costs — accounting, audit, ASIC fees, investment platform — typically range from $2,000 to $5,000+ per year regardless of fund size. On a $200,000 balance that's 1–2.5%, far higher than most APRA funds. Financial advisers generally suggest waiting until your balance reaches at least $300,000–$500,000 before setting up an SMSF. Continue building your balance in a low-cost industry or platform fund in the meantime.",
    action: {
      label: "Compare super funds",
      href: "/compare/super",
    },
  },
  {
    id: "leaf-viable-watch-costs",
    verdict: "review",
    heading: "An SMSF is viable — model the costs carefully",
    detail:
      "At $200,000–$500,000 an SMSF is economically possible, but costs matter. Using a specialist accounting platform (e.g. BGL, Class) via an online SMSF administrator can bring annual costs to $2,000–$3,000. At $300,000 that's 0.7–1%, comparable with some retail funds. Get a quote from two or three SMSF administrators, compare against your current fund's total fee drag, and model a 5-year cost projection before committing. Also consider whether a platform super fund gives you equivalent investment control at lower cost.",
    action: { label: "Find an SMSF specialist", href: "/find-advisor" },
  },
  {
    id: "leaf-viable-strong",
    verdict: "buy",
    heading: "An SMSF makes strong economic sense at your balance",
    detail:
      "Above $500,000 the fixed cost of running an SMSF (typically $2,000–$4,000/year) becomes a small percentage of assets — often below what retail or platform super funds charge. You gain full control over the investment strategy: ASX and global equities, ETFs, managed funds, direct property (with conditions), unlisted investments, and physical gold or collectables (subject to storage and insurance rules). A licensed SMSF adviser can help set up the trust deed, draft a compliant investment strategy, arrange the annual audit, and guide the rollover process.",
    action: { label: "Find an SMSF specialist", href: "/find-advisor" },
  },
  {
    id: "leaf-check-fund-first",
    verdict: "review",
    heading: "Check your existing fund before making the switch",
    detail:
      "Many people in SMSFs are there for performance reasons that turn out to be a mismatch between their fund and investment option — not the fund itself. Use the ATO's YourSuper comparison tool (ato.gov.au/yoursuper) to compare your current fund's net return and fee drag against the benchmark. If your fund underperforms, you may be able to switch to a growth or indexed option within the same fund, saving thousands in transition costs. If you still want an SMSF after a proper comparison, the balance question is the next step.",
    action: {
      label: "Compare super funds",
      href: "/compare/super",
    },
  },
];

export const SMSF_SETUP_START_ID = "start";
