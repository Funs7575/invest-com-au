import type { DecisionFlow } from "@/lib/decision-flows";

export const BUY_VS_RENT_FLOW: DecisionFlow = {
  title: "Should I Buy or Rent?",
  description:
    "Answer a few questions to get a personalised recommendation for your Australian property situation.",
  startId: "q1-goal",
  nodes: {
    "q1-goal": {
      type: "question",
      id: "q1-goal",
      question: "What's your primary housing goal right now?",
      options: [
        {
          label: "Build long-term wealth through property",
          nextId: "q2-deposit",
        },
        {
          label: "Flexibility to move for work or lifestyle",
          nextId: "out-rent-flex",
        },
        {
          label: "Tax advantages (negative gearing)",
          detail: "37–45% marginal tax rate is where this strategy works best",
          nextId: "q2-ng",
        },
        {
          label: "I already own and am considering upgrading",
          nextId: "out-upgrade",
        },
      ],
    },
    "q2-deposit": {
      type: "question",
      id: "q2-deposit",
      question: "How much deposit do you have saved?",
      detail:
        "20% avoids LMI (Lenders Mortgage Insurance). 5% is the typical lender minimum.",
      options: [
        { label: "20% or more", nextId: "q3-tenure" },
        {
          label: "5–20% saved (LMI territory)",
          detail: "LMI can add $10,000–$30,000 to your loan",
          nextId: "q-fhb",
        },
        {
          label: "Under 5%",
          detail: "Most lenders won't approve below 5%",
          nextId: "out-save-first",
        },
      ],
    },
    "q3-tenure": {
      type: "question",
      id: "q3-tenure",
      question: "How long do you plan to stay in this property?",
      detail:
        "Stamp duty (typically 3–5% of purchase price) makes buying costly if you move quickly.",
      options: [
        { label: "5+ years", nextId: "q4-market" },
        { label: "3–5 years", nextId: "out-borderline" },
        { label: "Under 3 years", nextId: "out-rent-short" },
      ],
    },
    "q4-market": {
      type: "question",
      id: "q4-market",
      question: "How would you describe your local property market?",
      options: [
        {
          label: "Strong growth area",
          detail: "Capital city core, coastal lifestyle, high-demand suburb",
          nextId: "out-buy-growth",
        },
        {
          label: "Stable / steady",
          detail: "Regional city, established suburb with moderate growth",
          nextId: "out-rent-invest",
        },
        {
          label: "Uncertain / oversupplied",
          detail: "New estates, mining towns, areas with falling prices",
          nextId: "out-rent-uncertain",
        },
      ],
    },
    "q-fhb": {
      type: "question",
      id: "q-fhb",
      question: "Are you a first home buyer?",
      detail:
        "First home buyers may qualify for grants, stamp duty concessions, and the FHSS scheme.",
      options: [
        { label: "Yes — first home buyer", nextId: "out-fhb" },
        {
          label: "No — I've owned property before",
          detail: "Continue with standard buyer assessment",
          nextId: "q3-tenure",
        },
      ],
    },
    "q2-ng": {
      type: "question",
      id: "q2-ng",
      question: "What's your approximate marginal income tax rate?",
      detail:
        "Negative gearing works by offsetting rental losses against your income — the higher your rate, the greater the tax relief.",
      options: [
        {
          label: "37–45% (income $120k+)",
          nextId: "out-buy-ng",
        },
        {
          label: "Under 37% (income under $120k)",
          detail: "Still viable but less impactful — let's assess your situation",
          nextId: "q2-deposit",
        },
      ],
    },
    "out-buy-growth": {
      type: "outcome",
      id: "out-buy-growth",
      title: "Lean towards Buying",
      summary:
        "With a 20%+ deposit, a long intended tenure, and a growth market, buying stacks up well. The equity you build compounds over time and provides housing security.",
      recommendation:
        "Run the full numbers: compare estimated mortgage repayments against rent + investment returns on your deposit. Factor in stamp duty upfront (check your state concessions), council rates, strata if applicable, and maintenance (~1% of property value per year). A mortgage broker can model your serviceability at today's rates.",
      primaryCta: { label: "Use the Mortgage Calculator", href: "/mortgage-calculator" },
      secondaryCta: {
        label: "Find a Mortgage Broker",
        href: "/find-advisor?need=mortgage_broker",
      },
      advisorCta: true,
    },
    "out-rent-invest": {
      type: "outcome",
      id: "out-rent-invest",
      title: "Consider Renting + Investing the Difference",
      summary:
        "In a stable market, renting frees up capital to invest in diversified assets (ETFs, index funds). Over 10–15 years, a disciplined 'rent and invest' approach often matches or beats buying in low-growth markets — especially when factoring in stamp duty, maintenance, and illiquidity.",
      recommendation:
        "Calculate the 'rent vs buy' gap: stamp duty + deposit opportunity cost + ongoing costs. Invest that difference in low-cost diversified funds (VGS + A200 is a common starting point). Revisit buying when your market shows stronger fundamentals or your savings exceed 25%.",
      primaryCta: { label: "ETF Hub", href: "/etfs" },
      secondaryCta: {
        label: "Property Hub",
        href: "/property",
      },
      advisorCta: true,
    },
    "out-rent-uncertain": {
      type: "outcome",
      id: "out-rent-uncertain",
      title: "Rent for Now",
      summary:
        "Buying in an uncertain or oversupplied market means capital at risk and reduced liquidity. Stamp duty alone (3–5%) takes years to recoup if prices stagnate or fall.",
      recommendation:
        "Stay flexible: monitor the market for 12–24 months. Use the savings period to invest in liquid assets and build your deposit beyond 20%. You'll have more options and lower LVR when market fundamentals improve.",
      primaryCta: { label: "High-Yield Savings Accounts", href: "/savings" },
      secondaryCta: { label: "Property Hub", href: "/property" },
    },
    "out-rent-short": {
      type: "outcome",
      id: "out-rent-short",
      title: "Rent — Timeline Too Short to Buy",
      summary:
        "Stamp duty (typically $15,000–$60,000 depending on state and price) plus agent fees (~2%), lender fees, and moving costs mean you need meaningful capital growth just to break even on a short hold.",
      recommendation:
        "Unless you're in a strongly appreciating market, buying for under 3 years rarely makes financial sense. Keep renting and stay liquid. Reassess when your timeline extends to 5+ years.",
      primaryCta: { label: "Savings Calculator", href: "/savings-calculator" },
      secondaryCta: { label: "Property Hub", href: "/property" },
    },
    "out-borderline": {
      type: "outcome",
      id: "out-borderline",
      title: "It's Borderline — Run the Numbers",
      summary:
        "3–5 years is the grey zone. Stamp duty is a meaningful cost but capital growth can cover it in appreciating markets. The right answer depends on your specific market, property price, and investment alternatives.",
      recommendation:
        "Model your specific scenario: input your state's stamp duty rate, expected annual capital growth (3–8% depending on market), and the return you could earn investing your deposit in shares instead. A 1% difference in growth rate changes the answer significantly.",
      primaryCta: {
        label: "Property vs Shares Calculator",
        href: "/tools",
      },
      secondaryCta: {
        label: "Find a Buyer's Agent",
        href: "/find-advisor?need=buyers_agent",
      },
      advisorCta: true,
    },
    "out-save-first": {
      type: "outcome",
      id: "out-save-first",
      title: "Build Your Deposit First",
      summary:
        "Under 5% means most lenders won't approve you. Even with approval, LMI on a very small deposit can add $20,000–$40,000 to your total loan cost.",
      recommendation:
        "Accelerate your savings with a high-interest savings account and the First Home Super Saver Scheme (FHSS) — up to $50,000 in voluntary super contributions, taxed at 15% going in instead of your marginal rate, and accessible for a first home deposit. Aim for 10–20% before approaching lenders.",
      primaryCta: { label: "First Home Buyer Hub", href: "/first-home-buyer" },
      secondaryCta: { label: "Super Hub", href: "/super" },
    },
    "out-fhb": {
      type: "outcome",
      id: "out-fhb",
      title: "First Home Buyer Path",
      summary:
        "First home buyers have access to significant government support that can offset the LMI cost and reduce upfront barriers: the First Home Owner Grant (up to $30,000 in some states), stamp duty concessions or exemptions (full exemption under price caps in most states), and the FHSS scheme for accessing super contributions tax-effectively.",
      recommendation:
        "Check your state's FHB grants and price caps, apply for the First Home Guarantee (federal scheme allowing 5% deposit without LMI), and explore FHSS if you've made voluntary super contributions. A mortgage broker can identify the best lenders for first home buyers at your deposit level.",
      primaryCta: { label: "First Home Buyer Hub", href: "/first-home-buyer" },
      secondaryCta: {
        label: "Find a Mortgage Broker",
        href: "/find-advisor?need=mortgage_broker",
      },
      advisorCta: true,
    },
    "out-rent-flex": {
      type: "outcome",
      id: "out-rent-flex",
      title: "Rent — Flexibility Wins",
      summary:
        "If career mobility, lifestyle change, or personal flexibility is the priority, renting is the rational choice. Buying locks in significant transaction costs (~5–7% of property value) and a timeline to sell of months, making it poorly suited for mobile households.",
      recommendation:
        "Invest the money you would have used as a deposit in liquid, diversified assets (ETFs, managed funds). Revisit buying when your life situation stabilises and you have a longer-term view of where you want to live.",
      primaryCta: { label: "ETF Hub", href: "/etfs" },
      secondaryCta: { label: "Investment Hub", href: "/invest" },
    },
    "out-upgrade": {
      type: "outcome",
      id: "out-upgrade",
      title: "Upgrading — Leverage Your Equity",
      summary:
        "As an existing owner, your equity is your key asset. In rising markets, selling and upgrading simultaneously avoids bridging finance risk. Your equity growth since purchase determines how much deposit you're bringing to the next purchase.",
      recommendation:
        "Get your current property independently valued. Speak to a mortgage broker about equity access, simultaneous sale and purchase timing, bridging finance (if needed), and the stamp duty cost of the new property. Consider whether a renovation on your existing property might deliver equivalent value at lower cost.",
      primaryCta: {
        label: "Find a Mortgage Broker",
        href: "/find-advisor?need=mortgage_broker",
      },
      secondaryCta: { label: "Property Hub", href: "/property" },
      advisorCta: true,
    },
    "out-buy-ng": {
      type: "outcome",
      id: "out-buy-ng",
      title: "Buying for Tax — Check the Full Model",
      summary:
        "At 37%+ marginal rate, negative gearing provides real tax relief. But the strategy requires capital growth to be profitable overall — rental income rarely covers outgoings, so you depend on the property appreciating to come out ahead.",
      recommendation:
        "Model your negative gearing scenario carefully: annual interest costs, depreciation schedule (engage a quantity surveyor), rental yield, expected capital growth rate, and hold period. The 50% CGT discount applies after 12 months — making it most effective as a 5–10+ year strategy. An accountant can run the after-tax numbers for your specific situation.",
      primaryCta: { label: "Negative Gearing Hub", href: "/negative-gearing" },
      secondaryCta: {
        label: "Find an Accountant/Adviser",
        href: "/find-advisor?need=accountant",
      },
      advisorCta: true,
    },
  },
};
