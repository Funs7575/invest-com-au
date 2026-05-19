import type { TreeNode } from "@/components/DecisionTree";

export const SALARY_SACRIFICE_TREE: TreeNode[] = [
  // ── Questions ────────────────────────────────────────────────────────────
  {
    id: "start",
    question: "What is your employment situation?",
    options: [
      {
        label: "Employee — I receive payslips and my employer pays SG super",
        next: "income-range",
      },
      {
        label:
          "Self-employed, sole trader, or company director paying myself a salary",
        next: "leaf-self-employed",
      },
    ],
  },
  {
    id: "income-range",
    question: "What is your approximate annual salary before tax and before super?",
    options: [
      { label: "Under $45,000", next: "leaf-low-income" },
      { label: "$45,000–$120,000", next: "cap-check" },
      { label: "Over $120,000", next: "cap-check-high" },
    ],
  },
  {
    id: "cap-check",
    question:
      "Your employer contributes 11.5% SG. Will your total contributions (employer + salary sacrifice) stay comfortably under the $30,000 annual cap?",
    options: [
      {
        label: "Yes — plenty of room (e.g. employer SG on $80k is ~$9,200/yr)",
        next: "leaf-clear-winner",
      },
      {
        label: "I'm close to or may already be at the $30,000 cap",
        next: "leaf-near-cap",
      },
    ],
  },
  {
    id: "cap-check-high",
    question: "Is your income above $250,000?",
    options: [
      {
        label: "Yes — I earn above $250,000",
        next: "leaf-div293",
      },
      {
        label: "No — I earn between $120,000 and $250,000",
        next: "leaf-high-earner",
      },
    ],
  },

  // ── Leaves ───────────────────────────────────────────────────────────────
  {
    id: "leaf-self-employed",
    verdict: "review",
    heading: "Use personal deductible contributions instead",
    detail:
      "Salary sacrifice is an employee benefit — you can't sacrifice salary you pay yourself from a company in the traditional sense. Self-employed people achieve the same tax outcome by making personal concessional contributions and claiming a tax deduction via an ATO Notice of Intent form. The contribution is still taxed at 15% inside super, saving you the gap to your marginal rate. Speak with your accountant to confirm the mechanics for your structure.",
    action: { label: "Find a financial advisor", href: "/find-advisor" },
  },
  {
    id: "leaf-low-income",
    verdict: "review",
    heading: "The benefit is modest — check the super co-contribution first",
    detail:
      "At incomes under $45,000, your marginal tax rate (including Medicare) is around 21%. Super contributions are taxed at 15%, so the saving is roughly 6 cents per dollar — modest compared to higher earners. Before salary sacrificing, check whether the government super co-contribution suits you better: contribute $1,000 of after-tax money and receive up to $500 from the ATO if you earn under $43,445. That's a 50% guaranteed return on eligible contributions.",
    action: {
      label: "Super contributions calculator",
      href: "/super-contributions-calculator",
    },
  },
  {
    id: "leaf-clear-winner",
    verdict: "buy",
    heading: "Salary sacrifice makes clear financial sense",
    detail:
      "In the $45k–$120k income band your marginal tax rate is 32.5–39% (including Medicare). Concessional super contributions are taxed at 15%, so you save roughly 17–24 cents per dollar sacrificed — plus the compounding effect of that extra money inside a low-tax environment. Make sure your total contributions (employer SG + salary sacrifice) stay under $30,000 to avoid excess contributions tax. Talk to your payroll team to set up the arrangement.",
    action: {
      label: "Super contributions calculator",
      href: "/super-contributions-calculator",
    },
  },
  {
    id: "leaf-near-cap",
    verdict: "review",
    heading: "Check your remaining cap room carefully",
    detail:
      "The concessional contributions cap is $30,000 per financial year. Your employer's SG contributions count toward this. Contributions over the cap are included in your assessable income and taxed at your marginal rate, plus an interest charge. Use myGov to check your available cap room (ATO > Super > Information), or ask your fund. If you've had prior years with unused cap room, the carry-forward rules may let you contribute more — worth checking with an accountant.",
    action: { label: "Find a financial advisor", href: "/find-advisor" },
  },
  {
    id: "leaf-high-earner",
    verdict: "buy",
    heading: "Strong case — the tax saving is significant",
    detail:
      "At $120k–$250k income your marginal rate is 39–47% (including Medicare). Salary sacrificing into super reduces that income at your marginal rate; contributions are taxed at 15% inside super. The effective saving is 24–32 cents per dollar — one of the highest-return, lowest-risk tax strategies available to Australian employees. Confirm your total contributions (SG + sacrifice) will stay under $30,000, and consider whether maxing out the cap each year makes sense for your retirement timeline.",
    action: {
      label: "Super contributions calculator",
      href: "/super-contributions-calculator",
    },
  },
  {
    id: "leaf-div293",
    verdict: "buy",
    heading: "Still worthwhile, but the margin is narrower",
    detail:
      "Division 293 tax adds an extra 15% charge on super contributions for incomes over $250,000, bringing the effective tax rate on concessional contributions to 30%. Your marginal rate is 47% (45% + 2% Medicare), so salary sacrifice still saves you 17 cents per dollar — a meaningful benefit, just not as large as for lower-income earners. The $30,000 concessional cap still applies. An accountant can also review whether non-concessional contributions or other structures suit your broader strategy.",
    action: { label: "Find a financial advisor", href: "/find-advisor" },
  },
];

export const SALARY_SACRIFICE_START_ID = "start";
