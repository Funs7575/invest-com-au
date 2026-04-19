/**
 * Dictionary for translated foreign-investor pages.
 *
 * Keep keys grouped by page/section — dictionary lookups at the
 * leaf-node level. New copy goes under a new key rather than being
 * stuffed into existing fields so translators can work per-key
 * without diffing entire paragraphs.
 *
 * All three locales are required — CI-safe: missing keys are a type
 * error thanks to the shared `ForeignInvestmentDict` shape.
 */

import type { Locale } from "./locales";

export interface ForeignInvestmentDict {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    heading: string;
    subhead: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  topicCards: Array<{
    title: string;
    description: string;
    href: string;
  }>;
  firb: {
    heading: string;
    body: string[];
    calculatorCta: string;
  };
  siv: {
    heading: string;
    body: string[];
    cta: string;
  };
  tax: {
    heading: string;
    body: string[];
    calculatorCta: string;
  };
  disclaimer: string;
  languageSwitcher: {
    availableIn: string;
  };
}

const EN: ForeignInvestmentDict = {
  meta: {
    title: "Investing in Australia from Overseas — 2026 Guide",
    description:
      "How non-residents, visa holders and new migrants invest in Australia. Covers FIRB property rules, the SIV pathway, withholding tax on dividends and interest, and the brokers that accept overseas investors.",
  },
  hero: {
    eyebrow: "For non-residents and visa holders",
    heading: "Investing in Australia from overseas",
    subhead:
      "FIRB rules, the Significant Investor Visa, non-resident withholding tax, and the brokers that will actually open an account for you. Updated for 2026.",
    ctaPrimary: "FIRB fee estimator",
    ctaSecondary: "Withholding tax calculator",
  },
  topicCards: [
    {
      title: "Buying property",
      description:
        "FIRB rules, state stamp duty surcharges, the 2025-27 established-dwelling ban, and the vacancy fee.",
      href: "/foreign-investment/property",
    },
    {
      title: "Shares & ETFs",
      description:
        "Which Australian brokers accept non-residents, dividend withholding tax, and CGT on listed shares.",
      href: "/foreign-investment/shares",
    },
    {
      title: "Significant Investor Visa",
      description:
        "The $5m SIV pathway — complying investments, visa conditions, and the residency timeline.",
      href: "/foreign-investment/siv",
    },
    {
      title: "Withholding tax",
      description:
        "Dividends, interest, and royalties for non-residents. DTA rates for 45+ treaty countries.",
      href: "/foreign-investment/tax",
    },
  ],
  firb: {
    heading: "Foreign Investment Review Board (FIRB)",
    body: [
      "The Foreign Investment Review Board reviews proposed foreign purchases of Australian residential real estate and recommends approval or refusal to the Treasurer. Most non-residents buying residential property in Australia need FIRB approval before they sign a contract.",
      "Application fees start at $14,100 for properties up to $1m and scale by price. State-level stamp duty surcharges of 7–8% apply on top. Between 1 April 2025 and 31 March 2027, foreign persons (including most temporary residents) are banned from buying established dwellings — only new builds, off-the-plan, and vacant land for development qualify.",
    ],
    calculatorCta: "Estimate your FIRB fee",
  },
  siv: {
    heading: "Significant Investor Visa (subclass 188C)",
    body: [
      "The SIV requires a minimum $5 million of complying investments in Australia: at least $1m in venture capital, $1.5m in eligible emerging companies, and the remainder in a balanced portfolio. Four years leads to permanent residency subclass 888.",
      "There is no English-language test and no upper age limit, making it the most accessible investor-visa pathway for non-resident applicants. Expect ongoing reporting, an annual balancing requirement, and significant professional fees for migration and investment structuring.",
    ],
    cta: "Compare SIV complying investments",
  },
  tax: {
    heading: "Non-resident withholding tax",
    body: [
      "Australia applies withholding tax to Australian-sourced income paid to foreign residents. Default rates are 30% on unfranked dividends, 10% on interest, 30% on royalties. Fully franked dividends carry no withholding because corporate tax has already been paid via imputation.",
      "If your country has a Double Tax Agreement (DTA) with Australia — currently 45+ countries including the US, UK, China, Hong Kong, Singapore, South Korea and the UAE — the rates are often substantially lower. Most treaty dividend rates are 15%, and interest is typically capped at 10%.",
    ],
    calculatorCta: "Withholding tax calculator",
  },
  disclaimer:
    "General information only. Not personal tax, financial, immigration or legal advice. Consult a licensed professional for your specific circumstances.",
  languageSwitcher: {
    availableIn: "Available languages",
  },
};

const ZH: ForeignInvestmentDict = {
  meta: {
    title: "海外投资澳大利亚 — 2026 年完整指南",
    description:
      "非居民、持签证者及新移民在澳大利亚投资的完整指南。涵盖 FIRB 房产规则、重大投资者签证 (SIV)、非居民预扣税,以及接受海外投资者的券商。",
  },
  hero: {
    eyebrow: "非居民与持签证者专属",
    heading: "海外投资澳大利亚",
    subhead:
      "FIRB 规则、重大投资者签证 (SIV)、非居民预扣税,以及真正接受海外账户的澳大利亚券商。2026 年最新更新。",
    ctaPrimary: "FIRB 费用估算器",
    ctaSecondary: "预扣税计算器",
  },
  topicCards: [
    {
      title: "购买房产",
      description:
        "FIRB 规则、各州印花税附加费、2025-27 年已建住宅购买禁令,以及空置费。",
      href: "/zh/foreign-investment/property",
    },
    {
      title: "股票与 ETF",
      description:
        "哪些澳大利亚券商接受非居民、股息预扣税,以及上市股票的资本利得税。",
      href: "/zh/foreign-investment/shares",
    },
    {
      title: "重大投资者签证 (SIV)",
      description:
        "500 万澳元 SIV 通道 — 合规投资、签证条件以及居留权时间线。",
      href: "/zh/foreign-investment/siv",
    },
    {
      title: "预扣税",
      description:
        "非居民的股息、利息和特许权使用费。45 个以上双重税收协定国家的税率。",
      href: "/zh/foreign-investment/tax",
    },
  ],
  firb: {
    heading: "外国投资审查委员会 (FIRB)",
    body: [
      "外国投资审查委员会负责审查外国人购买澳大利亚住宅房产的申请,并向财政部长提出批准或拒绝的建议。大多数非居民在澳大利亚购买住宅房产前都需要获得 FIRB 批准。",
      "100 万澳元以下房产的申请费从 14,100 澳元起,随房价递增。此外还需缴纳各州 7–8% 的印花税附加费。在 2025 年 4 月 1 日至 2027 年 3 月 31 日期间,外国人(包括大多数临时居民)被禁止购买已建住宅 — 只有新建住宅、期房和用于开发的空地符合条件。",
    ],
    calculatorCta: "估算您的 FIRB 费用",
  },
  siv: {
    heading: "重大投资者签证 (188C 子类别)",
    body: [
      "SIV 要求在澳大利亚至少投资 500 万澳元的合规投资: 至少 100 万澳元投资于风险投资、150 万澳元投资于新兴企业,其余部分投资于均衡组合。四年后可申请 888 永久居留签证。",
      "没有英语语言考试要求,也没有年龄上限,这使其成为非居民申请人最易获得的投资者签证通道。但须持续履行申报义务、每年进行平衡审查,并支付可观的移民和投资架构专业费用。",
    ],
    cta: "比较 SIV 合规投资",
  },
  tax: {
    heading: "非居民预扣税",
    body: [
      "澳大利亚对支付给外国居民的来源于澳大利亚的收入征收预扣税。默认税率为: 未抵免股息 30%、利息 10%、特许权使用费 30%。已全额抵免的股息因企业已通过抵免制度缴纳税款,因此不再预扣。",
      "如果您所在的国家与澳大利亚签订了双重税收协定 (DTA) — 目前超过 45 个国家,包括美国、英国、中国、香港、新加坡、韩国和阿联酋 — 税率通常会大幅降低。大多数协定股息税率为 15%,利息通常上限为 10%。",
    ],
    calculatorCta: "预扣税计算器",
  },
  disclaimer:
    "仅供一般参考,不构成个人税务、金融、移民或法律建议。请就您的具体情况咨询有执照的专业人士。",
  languageSwitcher: {
    availableIn: "可用语言",
  },
};

const KO: ForeignInvestmentDict = {
  meta: {
    title: "해외에서 호주 투자하기 — 2026 완벽 가이드",
    description:
      "비거주자, 비자 소지자 및 신규 이민자를 위한 호주 투자 가이드. FIRB 부동산 규정, 중대투자자비자(SIV), 비거주자 원천징수세, 해외 투자자를 받아주는 증권사까지 모두 다룹니다.",
  },
  hero: {
    eyebrow: "비거주자 및 비자 소지자 대상",
    heading: "해외에서 호주 투자하기",
    subhead:
      "FIRB 규정, 중대투자자비자(SIV), 비거주자 원천징수세, 그리고 실제로 해외 계좌를 개설해주는 호주 증권사 정보. 2026년 최신 업데이트.",
    ctaPrimary: "FIRB 수수료 계산기",
    ctaSecondary: "원천징수세 계산기",
  },
  topicCards: [
    {
      title: "부동산 매입",
      description:
        "FIRB 규정, 주별 인지세 추가 부담금, 2025-27년 기존 주택 매입 금지, 공실 수수료.",
      href: "/ko/foreign-investment/property",
    },
    {
      title: "주식 & ETF",
      description:
        "어떤 호주 증권사가 비거주자를 받는지, 배당금 원천징수세, 상장 주식 양도소득세(CGT).",
      href: "/ko/foreign-investment/shares",
    },
    {
      title: "중대투자자비자(SIV)",
      description:
        "500만 호주달러 SIV 경로 — 적격 투자, 비자 조건, 영주권 타임라인.",
      href: "/ko/foreign-investment/siv",
    },
    {
      title: "원천징수세",
      description:
        "비거주자 대상 배당, 이자, 로열티. 45개 이상 조세조약국의 DTA 요율.",
      href: "/ko/foreign-investment/tax",
    },
  ],
  firb: {
    heading: "외국인투자심사위원회 (FIRB)",
    body: [
      "FIRB는 외국인의 호주 주거용 부동산 매입 신청을 심사하고, 재무장관에게 승인 또는 거부를 권고합니다. 대부분의 비거주자는 호주에서 주거용 부동산을 계약하기 전에 FIRB 승인을 받아야 합니다.",
      "100만 호주달러 이하 부동산의 경우 신청료는 14,100 호주달러부터 시작하며 가격에 따라 상승합니다. 여기에 주별 7–8%의 인지세 추가 부담금이 더해집니다. 2025년 4월 1일부터 2027년 3월 31일까지 외국인(대부분의 임시 거주자 포함)은 기존 주택 매입이 금지되며, 신축·분양권·개발용 공터만 허용됩니다.",
    ],
    calculatorCta: "FIRB 수수료 계산하기",
  },
  siv: {
    heading: "중대투자자비자 (188C)",
    body: [
      "SIV는 호주 내 최소 500만 호주달러의 적격 투자가 요구됩니다: 벤처캐피털에 최소 100만 호주달러, 신흥기업에 150만 호주달러, 나머지는 밸런스 포트폴리오. 4년 후 888 영주권 신청이 가능합니다.",
      "영어 시험과 연령 상한이 없어, 비거주자 신청자에게 가장 접근성이 높은 투자자 비자 경로입니다. 지속적인 보고 의무, 연간 잔액 균형 요건, 그리고 상당한 이민 및 투자 구조화 전문가 비용이 발생합니다.",
    ],
    cta: "SIV 적격 투자 비교",
  },
  tax: {
    heading: "비거주자 원천징수세",
    body: [
      "호주는 외국 거주자에게 지급되는 호주원천 소득에 원천징수세를 적용합니다. 기본 요율은: 미공제 배당 30%, 이자 10%, 로열티 30%. 완전 공제된 배당은 이미 법인세가 귀속제도를 통해 납부되었으므로 원천징수되지 않습니다.",
      "귀하의 국가가 호주와 조세조약(DTA)을 체결한 경우 — 현재 45개국 이상, 미국, 영국, 중국, 홍콩, 싱가포르, 한국, UAE 포함 — 요율이 크게 낮아질 수 있습니다. 대부분의 조약 배당 요율은 15%, 이자는 보통 10%로 제한됩니다.",
    ],
    calculatorCta: "원천징수세 계산기",
  },
  disclaimer:
    "일반적인 정보 안내입니다. 개인의 세무, 금융, 이민, 법률 자문이 아닙니다. 구체적인 상황은 자격을 갖춘 전문가에게 상담하시기 바랍니다.",
  languageSwitcher: {
    availableIn: "사용 가능한 언어",
  },
};

const DICTIONARIES: Record<Locale, ForeignInvestmentDict> = {
  en: EN,
  zh: ZH,
  ko: KO,
};

export function getForeignInvestmentDict(locale: Locale): ForeignInvestmentDict {
  return DICTIONARIES[locale];
}

/* ─── Sub-page dictionaries: SIV, Property, Tax ─────────────── */

export interface SubPageDict {
  meta: { title: string; description: string };
  hero: { eyebrow: string; heading: string; subhead: string };
  /** Body sections — each has a heading + 2-4 paragraphs. */
  sections: Array<{ heading: string; body: string[] }>;
  /** Tool/calculator CTA links emitted at the bottom of every page. */
  ctas: Array<{ label: string; href: string }>;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════
//                         SIV sub-page
// ═══════════════════════════════════════════════════════════════

const SIV_EN: SubPageDict = {
  meta: {
    title: "Significant Investor Visa (188C) — 2026 Guide",
    description:
      "The $5m SIV pathway to Australian residency. Complying investments, fees, timelines, and how to structure the portfolio.",
  },
  hero: {
    eyebrow: "Non-resident investor pathway",
    heading: "Significant Investor Visa (188C)",
    subhead:
      "The $5m investment pathway to Australian permanent residency. No English test, no upper age limit, but strict portfolio rules.",
  },
  sections: [
    {
      heading: "What the SIV requires",
      body: [
        "The Significant Investor Visa (subclass 188C) is a provisional visa for applicants willing to invest at least AUD 5 million in compliant Australian assets. After four years of meeting the requirements, you can apply for permanent residency under subclass 888.",
        "Unlike most investor visas, the SIV has no upper age limit, no English-language test, and no points test. What it does have is a strict Complying Investment Framework set by the Department of Home Affairs.",
      ],
    },
    {
      heading: "The Complying Investment Framework",
      body: [
        "At least AUD 1 million must go into Australian venture capital and growth private-equity funds. Another AUD 1.5 million goes into eligible managed funds investing in Australian small-cap emerging companies. The remaining AUD 2.5 million goes into a balanced portfolio of listed shares, corporate bonds, residential property funds, or commercial property.",
        "The composition is rebalanced annually through an independent compliance review. Failure to maintain the mix can trigger visa cancellation, so working with a migration agent and a wealth manager experienced with SIV rules is essential.",
      ],
    },
    {
      heading: "Timeline and costs",
      body: [
        "Expected timeline from state nomination to permanent residency is 4–5 years. Budget AUD 25,000–60,000 in professional fees (migration, legal, accounting) on top of the investment itself. Ongoing annual compliance reporting adds another AUD 5,000–10,000.",
        "The visa requires 40 days per year of physical presence in Australia during the provisional period — lower than most investor visas and the reason many clients with business interests in Asia favour this pathway.",
      ],
    },
  ],
  ctas: [
    { label: "Compare SIV complying investments", href: "/foreign-investment/siv" },
    { label: "FIRB fee estimator", href: "/firb-fee-estimator" },
    { label: "Find a migration agent", href: "/advisors/migration-agents" },
  ],
  disclaimer:
    "General information only. SIV rules change. Always confirm current requirements with a MARA-registered migration agent before committing funds.",
};

const SIV_ZH: SubPageDict = {
  meta: {
    title: "重大投资者签证 (188C) — 2026 年指南",
    description:
      "500 万澳元 SIV 通往澳大利亚居留权的通道。合规投资、费用、时间线,以及投资组合的构建方法。",
  },
  hero: {
    eyebrow: "非居民投资者通道",
    heading: "重大投资者签证 (188C)",
    subhead:
      "通过投资 500 万澳元获得澳大利亚永久居留权的通道。无英语考试、无年龄上限,但投资组合规则严格。",
  },
  sections: [
    {
      heading: "SIV 的要求",
      body: [
        "重大投资者签证 (188C 子类别) 是为愿意在澳大利亚合规资产中投资至少 500 万澳元的申请人提供的临时签证。在满足要求四年后,您可以根据 888 子类别申请永久居留权。",
        "与大多数投资者签证不同,SIV 没有年龄上限、英语考试或评分测试。但它确实有内政部制定的严格的合规投资框架。",
      ],
    },
    {
      heading: "合规投资框架",
      body: [
        "至少 100 万澳元必须投资于澳大利亚风险投资和成长型私募股权基金。另外 150 万澳元投资于投资澳大利亚小市值新兴公司的合格管理基金。其余 250 万澳元投资于上市股票、公司债券、住宅房地产基金或商业房地产的均衡投资组合。",
        "该组合每年通过独立的合规审查进行再平衡。未能保持组合可能触发签证取消,因此与熟悉 SIV 规则的移民代理和财富经理合作至关重要。",
      ],
    },
    {
      heading: "时间线和成本",
      body: [
        "从州提名到永久居留权的预期时间线为 4-5 年。除投资本身外,预算 25,000 至 60,000 澳元的专业费用(移民、法律、会计)。持续的年度合规报告每年还会增加 5,000 至 10,000 澳元。",
        "该签证要求在临时期间每年在澳大利亚实际居住 40 天 — 低于大多数投资者签证,这也是许多在亚洲有业务利益的客户青睐此通道的原因。",
      ],
    },
  ],
  ctas: [
    { label: "比较 SIV 合规投资", href: "/zh/foreign-investment/siv" },
    { label: "FIRB 费用估算器", href: "/firb-fee-estimator" },
    { label: "寻找移民代理", href: "/advisors/migration-agents" },
  ],
  disclaimer:
    "仅供一般参考。SIV 规则会变更。投入资金前请务必向 MARA 注册的移民代理确认当前要求。",
};

const SIV_KO: SubPageDict = {
  meta: {
    title: "중대투자자비자 (188C) — 2026 가이드",
    description:
      "500만 호주달러 SIV 영주권 경로. 적격 투자, 수수료, 타임라인, 포트폴리오 구성 방법.",
  },
  hero: {
    eyebrow: "비거주자 투자자 경로",
    heading: "중대투자자비자 (188C)",
    subhead:
      "500만 호주달러 투자로 호주 영주권을 얻는 경로. 영어 시험 없음, 연령 상한 없음, 단 포트폴리오 규정은 엄격합니다.",
  },
  sections: [
    {
      heading: "SIV가 요구하는 것",
      body: [
        "중대투자자비자 (188C)는 호주 적격 자산에 최소 500만 호주달러를 투자할 의사가 있는 신청자를 위한 임시 비자입니다. 요건을 4년 동안 충족하면 888 영주권을 신청할 수 있습니다.",
        "대부분의 투자자 비자와 달리 SIV는 연령 상한, 영어 시험, 점수 테스트가 없습니다. 대신 내무부에서 정한 엄격한 적격 투자 프레임워크가 있습니다.",
      ],
    },
    {
      heading: "적격 투자 프레임워크",
      body: [
        "최소 100만 호주달러는 호주 벤처캐피털 및 성장형 사모펀드에, 150만 호주달러는 호주 중소형 신흥기업에 투자하는 적격 매니지드펀드에 들어가야 합니다. 나머지 250만 호주달러는 상장주식, 회사채, 주거용 부동산 펀드 또는 상업용 부동산 등 밸런스 포트폴리오로 구성합니다.",
        "포트폴리오 구성은 매년 독립 준수 심사를 통해 리밸런싱됩니다. 구성 요건을 지키지 못하면 비자 취소로 이어질 수 있으므로, SIV 규정에 익숙한 이민 대리인과 자산관리사와 협업하는 것이 필수적입니다.",
      ],
    },
    {
      heading: "타임라인과 비용",
      body: [
        "주 지명에서 영주권까지 예상 소요기간은 4-5년입니다. 투자 자체 외에 이민·법무·회계 전문가 비용으로 2만5천에서 6만 호주달러를 예산에 잡으세요. 연간 준수 보고에 추가로 5천-1만 호주달러가 듭니다.",
        "이 비자는 임시 거주 기간 동안 호주에서 연간 40일의 실체류를 요구합니다 — 대부분의 투자자 비자보다 낮은 수준으로, 아시아에 사업 이익이 있는 고객들이 이 경로를 선호하는 이유입니다.",
      ],
    },
  ],
  ctas: [
    { label: "SIV 적격 투자 비교", href: "/ko/foreign-investment/siv" },
    { label: "FIRB 수수료 계산기", href: "/firb-fee-estimator" },
    { label: "이민 대리인 찾기", href: "/advisors/migration-agents" },
  ],
  disclaimer:
    "일반적인 정보 안내. SIV 규정은 변경됩니다. 자금을 투입하기 전에 MARA 등록 이민 대리인에게 현재 요건을 반드시 확인하세요.",
};

// ═══════════════════════════════════════════════════════════════
//                       Property sub-page
// ═══════════════════════════════════════════════════════════════

const PROPERTY_EN: SubPageDict = {
  meta: {
    title: "Buying Australian Property as a Foreigner — 2026 Guide",
    description:
      "FIRB approval, stamp duty surcharges, the 2025-27 established-dwelling ban, vacancy fees, and the tax rules every non-resident buyer needs to know.",
  },
  hero: {
    eyebrow: "Non-resident property buyer's guide",
    heading: "Buying Australian property as a foreigner",
    subhead:
      "FIRB rules, state surcharges, the 2025-27 established-dwelling ban, and the fees your conveyancer won't volunteer.",
  },
  sections: [
    {
      heading: "FIRB approval: what's required",
      body: [
        "Almost every residential property purchase by a non-resident requires pre-approval from the Foreign Investment Review Board. You apply through the ATO's Online Services for Foreign Investors portal before signing contracts.",
        "Application fees start at AUD 14,100 for properties up to AUD 1 million and scale by purchase price — an AUD 3 million property costs ~AUD 42,300 in application fees alone. Fees are paid upfront and non-refundable if your purchase falls through.",
      ],
    },
    {
      heading: "The 2025-2027 established-dwelling ban",
      body: [
        "From 1 April 2025 to 31 March 2027, foreign persons (including most temporary residents) cannot buy an established dwelling in Australia. Only new builds, off-the-plan purchases from the developer, and vacant land for development are allowed.",
        "Narrow exceptions apply — for example, businesses providing accommodation for workers, or certain temporary visa holders buying a principal residence where explicit FIRB approval is granted. Confirm with a migration lawyer before signing.",
      ],
    },
    {
      heading: "Stamp duty and land tax surcharges",
      body: [
        "Every state charges an additional stamp-duty surcharge on foreign buyers of residential property: NSW 9%, Victoria 8%, Queensland 8%, WA 7%, ACT 4%. These are on top of standard stamp duty, so on a AUD 1 million Sydney purchase the effective duty is ~13.5% (AUD 135,000) vs ~4.5% for a local.",
        "Land tax also comes with an annual surcharge (NSW 5%, Victoria 4%) payable every year you hold the property. And foreign owners whose property sits vacant for more than 183 days per year pay the federal vacancy fee — equal to the original FIRB application fee.",
      ],
    },
    {
      heading: "Capital gains tax when you sell",
      body: [
        "Foreign residents do NOT get the 50% CGT discount that Australian residents enjoy. The full capital gain is taxed at non-resident rates (30% up to AUD 135,000, 37% above, 45% above AUD 190,000).",
        "Since 2017, buyers of property worth AUD 750,000+ must withhold 12.5% of the purchase price and remit it to the ATO if the seller can't produce an ATO clearance certificate. Non-resident sellers lodge a tax return in Australia to reconcile and claim any refund.",
      ],
    },
  ],
  ctas: [
    { label: "FIRB fee estimator", href: "/firb-fee-estimator" },
    { label: "Non-resident CGT checker", href: "/non-resident-cgt-checker" },
    { label: "Find a foreign-investment lawyer", href: "/advisors/foreign-investment-lawyers" },
  ],
  disclaimer:
    "General information only. Australian property tax rules are complex and change frequently. Engage a licensed migration lawyer and a conveyancer experienced with foreign buyers.",
};

const PROPERTY_ZH: SubPageDict = {
  meta: {
    title: "外国人购买澳大利亚房产 — 2026 年指南",
    description:
      "FIRB 批准、印花税附加费、2025-27 年已建住宅禁令、空置费,以及每位非居民买家都需要了解的税收规则。",
  },
  hero: {
    eyebrow: "非居民房产买家指南",
    heading: "外国人购买澳大利亚房产",
    subhead:
      "FIRB 规则、各州附加费、2025-27 年已建住宅禁令,以及您的过户律师不会主动告知的费用。",
  },
  sections: [
    {
      heading: "FIRB 批准: 所需条件",
      body: [
        "非居民购买几乎所有住宅房产都需要获得外国投资审查委员会的预先批准。您在签订合同之前通过澳大利亚税务局的在线外国投资者服务门户提交申请。",
        "100 万澳元以下房产的申请费从 14,100 澳元起,随购买价格递增 — 300 万澳元的房产仅申请费就需要约 42,300 澳元。费用须预先支付,如果购买失败不予退还。",
      ],
    },
    {
      heading: "2025-2027 年已建住宅禁令",
      body: [
        "从 2025 年 4 月 1 日至 2027 年 3 月 31 日,外国人(包括大多数临时居民)不得购买澳大利亚的已建住宅。只允许新建、期房(从开发商处购买)和用于开发的空地。",
        "适用狭义例外 — 例如,为工人提供住宿的企业,或某些临时签证持有人在获得明确 FIRB 批准的情况下购买主要居所。签约前请与移民律师确认。",
      ],
    },
    {
      heading: "印花税和土地税附加费",
      body: [
        "每个州都对外国买家的住宅房产征收额外印花税附加费: 新州 9%、维州 8%、昆州 8%、西澳 7%、首都领地 4%。这些是在标准印花税之上征收的,因此在悉尼购买 100 万澳元房产的有效税率约为 13.5% (135,000 澳元),而本地人仅为约 4.5%。",
        "土地税也有年度附加费(新州 5%、维州 4%),在您持有房产的每一年都需要支付。此外,年度空置超过 183 天的外国业主需要支付联邦空置费 — 金额等同于原始 FIRB 申请费。",
      ],
    },
    {
      heading: "出售时的资本利得税",
      body: [
        "外国居民不享受澳大利亚居民的 50% 资本利得税折扣。全额资本利得按非居民税率征税(低于 135,000 澳元为 30%、超过则为 37%、超过 190,000 澳元为 45%)。",
        "自 2017 年以来,如果卖家无法出具澳大利亚税务局清算证明,价值 750,000 澳元以上的房产买家必须扣留 12.5% 的购买价格并汇给税务局。非居民卖家在澳大利亚提交纳税申报表以进行对账并申请退款。",
      ],
    },
  ],
  ctas: [
    { label: "FIRB 费用估算器", href: "/firb-fee-estimator" },
    { label: "非居民 CGT 检查器", href: "/non-resident-cgt-checker" },
    { label: "寻找外国投资律师", href: "/advisors/foreign-investment-lawyers" },
  ],
  disclaimer:
    "仅供一般参考。澳大利亚房产税规则复杂且经常变化。请聘请有执照的移民律师和熟悉外国买家的过户律师。",
};

const PROPERTY_KO: SubPageDict = {
  meta: {
    title: "외국인의 호주 부동산 매입 — 2026 가이드",
    description:
      "FIRB 승인, 인지세 추가 부담금, 2025-27년 기존 주택 매입 금지, 공실 수수료, 그리고 모든 비거주자 매수인이 알아야 할 세제.",
  },
  hero: {
    eyebrow: "비거주자 부동산 매수인 가이드",
    heading: "외국인의 호주 부동산 매입",
    subhead:
      "FIRB 규정, 주별 부담금, 2025-27년 기존 주택 매입 금지, 그리고 컨베이언서가 자진해서 말해주지 않는 각종 수수료.",
  },
  sections: [
    {
      heading: "FIRB 승인: 무엇이 필요한가",
      body: [
        "비거주자가 주거용 부동산을 매입하는 거의 모든 경우, 외국인투자심사위원회(FIRB)의 사전 승인이 필요합니다. 계약서 서명 전에 호주국세청(ATO)의 외국 투자자 온라인 포털을 통해 신청합니다.",
        "100만 호주달러 이하 부동산의 신청 수수료는 14,100 호주달러부터 시작하며 매입가에 따라 커집니다 — 300만 호주달러 부동산은 신청 수수료만 약 42,300 호주달러입니다. 사전 납부이며 거래가 무산되어도 환불되지 않습니다.",
      ],
    },
    {
      heading: "2025-2027 기존 주택 매입 금지",
      body: [
        "2025년 4월 1일부터 2027년 3월 31일까지 외국인(대부분의 임시 거주자 포함)은 호주 내 기존 주택을 매입할 수 없습니다. 신축, 개발사에서 직접 사는 분양권, 개발용 공터만 허용됩니다.",
        "제한적 예외가 있습니다 — 예를 들어 근로자 숙소를 제공하는 사업체, 또는 명시적 FIRB 승인을 받은 특정 임시 비자 소지자의 주된 거주지 매입. 계약 전 이민 변호사에게 확인하세요.",
      ],
    },
    {
      heading: "인지세 및 토지세 추가 부담금",
      body: [
        "주마다 외국인 매수인의 주거용 부동산에 인지세 추가 부담금을 부과합니다: NSW 9%, 빅토리아 8%, 퀸즐랜드 8%, WA 7%, ACT 4%. 이는 일반 인지세에 추가되는 금액이므로, 시드니에서 100만 호주달러 부동산을 매입할 경우 실효 세율은 약 13.5%(13만5천 호주달러) 수준이며 현지인은 약 4.5%입니다.",
        "토지세에도 연간 추가 부담금(NSW 5%, 빅토리아 4%)이 있으며 부동산을 보유하는 매년 납부합니다. 또한 연간 183일 이상 공실인 부동산을 보유한 외국인 소유주는 연방 공실 수수료를 납부해야 하며 — 이는 최초 FIRB 신청 수수료와 동액입니다.",
      ],
    },
    {
      heading: "매각 시 양도소득세",
      body: [
        "외국 거주자는 호주 거주자가 받는 50% CGT 할인을 받지 못합니다. 양도차익 전액이 비거주자 요율(13.5만 호주달러까지 30%, 초과분 37%, 19만 호주달러 초과 45%)로 과세됩니다.",
        "2017년 이후, 75만 호주달러 이상의 부동산을 매입하는 매수인은 매도인이 호주국세청의 클리어런스 증명서를 제시하지 못하면 매입가의 12.5%를 원천징수하여 국세청에 납부해야 합니다. 비거주자 매도인은 호주에서 세금 신고를 하여 정산하고 환급을 청구합니다.",
      ],
    },
  ],
  ctas: [
    { label: "FIRB 수수료 계산기", href: "/firb-fee-estimator" },
    { label: "비거주자 CGT 체크", href: "/non-resident-cgt-checker" },
    { label: "외국인 투자 변호사 찾기", href: "/advisors/foreign-investment-lawyers" },
  ],
  disclaimer:
    "일반적인 정보 안내. 호주 부동산 세제는 복잡하고 자주 변경됩니다. 반드시 자격을 갖춘 이민 변호사와 외국인 매수인 경험이 있는 컨베이언서를 선임하세요.",
};

// ═══════════════════════════════════════════════════════════════
//                          Tax sub-page
// ═══════════════════════════════════════════════════════════════

const TAX_EN: SubPageDict = {
  meta: {
    title: "Non-Resident Tax in Australia — Withholding, CGT, Franking — 2026",
    description:
      "Plain-English guide to Australian tax for non-residents: withholding tax rates, DTA discounts, CGT on shares vs property, franking credits, and the ATO tax return you still need to lodge.",
  },
  hero: {
    eyebrow: "Non-resident tax explainer",
    heading: "Australian tax for non-residents",
    subhead:
      "Withholding rates, DTA discounts, CGT on shares vs property, franking credits, and when you still need to lodge an Australian return.",
  },
  sections: [
    {
      heading: "Withholding tax rates — the defaults",
      body: [
        "Australia applies withholding tax at source to Australian-sourced income paid to foreign residents. The default rates (before any treaty) are: unfranked dividends 30%, interest 10%, royalties 30%, and most capital gains on real property 12.5% (clearance-certificate dependent).",
        "Fully franked dividends carry no withholding — corporate tax has already been paid on the underlying profit via Australia's imputation system, so no further tax is collected at source.",
      ],
    },
    {
      heading: "Double Tax Agreement discounts",
      body: [
        "Australia has DTAs with 45+ countries. Treaty rates are typically lower than defaults: most treaty dividends are taxed at 15% (some as low as 5% for substantial shareholders), interest is often capped at 10%, and royalty rates vary widely (5–15%).",
        "Major treaty partners include the United States, United Kingdom, China, Hong Kong, Singapore, South Korea, Japan, and the UAE. To claim the treaty rate, give your broker or fund manager the appropriate residency declaration — otherwise the default rates apply and you're left chasing a refund.",
      ],
    },
    {
      heading: "CGT: shares vs property",
      body: [
        "Non-residents generally do NOT owe Australian CGT on capital gains from ASX-listed shares — Australia has largely exempted portfolio equity. The major exceptions are holdings of 10%+ in a single company or in trusts heavily exposed to Australian real property.",
        "On Australian real property, non-residents DO owe CGT at the progressive non-resident rates (30% up to AUD 135,000, scaling to 45%) AND lose the 50% general discount available to residents. The full gain is taxed at the full non-resident rate.",
      ],
    },
    {
      heading: "When you need to lodge a return",
      body: [
        "Non-residents must lodge an Australian tax return if they have Australian-sourced income not fully covered by withholding (e.g. rental income, capital gains on real property, business income). They can optionally lodge to claim refunds of excess withholding collected at the default rate when a treaty rate applies.",
        "Returns are lodged via a registered tax agent or directly through the ATO. Simple non-resident returns covering a single rental property or dividend stream typically cost AUD 400–800 to prepare professionally.",
      ],
    },
  ],
  ctas: [
    { label: "Withholding tax calculator", href: "/tools/withholding-tax-calculator" },
    { label: "Non-resident CGT checker", href: "/non-resident-cgt-checker" },
    { label: "Non-resident dividend calculator", href: "/non-resident-dividend-calculator" },
  ],
  disclaimer:
    "General information only. Non-resident tax interacts with your home-country tax, tax residency status, and treaty position. Engage a tax agent with cross-border experience before relying on any numbers here.",
};

const TAX_ZH: SubPageDict = {
  meta: {
    title: "澳大利亚非居民税收 — 预扣税、CGT、抵免 — 2026",
    description:
      "非居民澳大利亚税收的简明指南: 预扣税率、双重税收协定折扣、股票与房产的资本利得税、抵免,以及您仍需要提交的税务申报。",
  },
  hero: {
    eyebrow: "非居民税务解读",
    heading: "非居民的澳大利亚税收",
    subhead:
      "预扣税率、双重税收协定折扣、股票与房产的资本利得税、抵免,以及何时仍需提交澳大利亚申报表。",
  },
  sections: [
    {
      heading: "预扣税率 — 默认值",
      body: [
        "澳大利亚对支付给外国居民的澳大利亚来源收入按来源扣除预扣税。默认税率(协定前)为: 未抵免股息 30%、利息 10%、特许权使用费 30%、大多数房产资本利得 12.5% (取决于清算证明)。",
        "完全抵免的股息不扣预扣税 — 企业税已通过澳大利亚的抵免制度对基础利润支付,因此不再在来源处收取税款。",
      ],
    },
    {
      heading: "双重税收协定折扣",
      body: [
        "澳大利亚与 45 个以上的国家签订了双重税收协定。协定税率通常低于默认值: 大多数协定股息按 15% 征税(大股东有低至 5%),利息通常上限为 10%,特许权使用费差异较大(5–15%)。",
        "主要协定伙伴包括美国、英国、中国、香港、新加坡、韩国、日本和阿联酋。要申请协定税率,请向您的券商或基金经理提供适当的居住声明 — 否则适用默认税率,您将需要追索退款。",
      ],
    },
    {
      heading: "资本利得税: 股票与房产",
      body: [
        "非居民通常不就 ASX 上市股票的资本利得缴纳澳大利亚 CGT — 澳大利亚基本上豁免了投资组合股权。主要例外是单一公司 10% 以上的持股或高度投资于澳大利亚房产的信托。",
        "对于澳大利亚房产,非居民确实需要按累进非居民税率缴纳 CGT (13.5 万澳元以下 30%,最高 45%),并且失去澳大利亚居民享有的 50% 一般折扣。全额利得按完整非居民税率征税。",
      ],
    },
    {
      heading: "何时需要提交申报表",
      body: [
        "非居民如果有未完全被预扣税覆盖的澳大利亚来源收入(例如租金收入、房产资本利得、营业收入),必须提交澳大利亚纳税申报表。当适用协定税率时,他们可以选择提交申报以申请退还按默认税率收取的超额预扣税。",
        "申报表通过注册税务代理或直接通过澳大利亚税务局提交。涵盖单一租赁房产或股息流的简单非居民申报表,专业制作通常需要 400 至 800 澳元。",
      ],
    },
  ],
  ctas: [
    { label: "预扣税计算器", href: "/tools/withholding-tax-calculator" },
    { label: "非居民 CGT 检查器", href: "/non-resident-cgt-checker" },
    { label: "非居民股息计算器", href: "/non-resident-dividend-calculator" },
  ],
  disclaimer:
    "仅供一般参考。非居民税务与您的母国税务、税务居住身份和协定立场相互作用。在依赖此处任何数字之前,请聘请具有跨境经验的税务代理。",
};

const TAX_KO: SubPageDict = {
  meta: {
    title: "호주 비거주자 세제 — 원천징수·CGT·프랭킹 — 2026",
    description:
      "비거주자를 위한 호주 세제의 쉬운 가이드: 원천징수 세율, DTA 할인, 주식 vs 부동산 양도세, 프랭킹 크레딧, 그리고 여전히 신고해야 할 호주 세무 신고.",
  },
  hero: {
    eyebrow: "비거주자 세제 해설",
    heading: "비거주자의 호주 세제",
    subhead:
      "원천징수 세율, 조세조약 할인, 주식 vs 부동산 양도세, 프랭킹 크레딧, 그리고 호주 세무 신고가 여전히 필요한 때.",
  },
  sections: [
    {
      heading: "원천징수 세율 — 기본값",
      body: [
        "호주는 외국 거주자에게 지급되는 호주 원천 소득에 원천징수세를 적용합니다. 기본 세율(조약 이전)은: 미공제 배당 30%, 이자 10%, 로열티 30%, 대부분의 부동산 양도차익 12.5% (클리어런스 증명서 여부에 따라 달라짐).",
        "완전 공제된 배당은 원천징수되지 않습니다 — 호주의 귀속제도(imputation)를 통해 법인세가 이미 기초 이익에 대해 납부되었기 때문에, 원천에서 추가 세금이 징수되지 않습니다.",
      ],
    },
    {
      heading: "조세조약 할인",
      body: [
        "호주는 45개국 이상과 DTA를 체결하고 있습니다. 조약 세율은 보통 기본값보다 낮습니다: 대부분의 조약 배당은 15% 과세(상당지분 주주의 경우 5%까지 낮아지기도), 이자는 일반적으로 10%로 제한, 로열티는 5–15%로 다양합니다.",
        "주요 조약국은 미국, 영국, 중국, 홍콩, 싱가포르, 한국, 일본, UAE 등입니다. 조약 세율을 적용받으려면 증권사 또는 펀드 매니저에게 적절한 거주지 신고서를 제출해야 합니다 — 그렇지 않으면 기본 세율이 적용되어 추후 환급을 받아야 합니다.",
      ],
    },
    {
      heading: "양도소득세: 주식 vs 부동산",
      body: [
        "비거주자는 일반적으로 ASX 상장 주식의 양도차익에 대해 호주 CGT를 부담하지 않습니다 — 호주는 포트폴리오 지분을 대체로 면제했습니다. 주요 예외는 단일 기업 지분 10% 이상 보유나, 호주 부동산에 크게 노출된 트러스트입니다.",
        "호주 부동산의 경우 비거주자는 누진 비거주자 세율(13.5만 호주달러까지 30%, 최대 45%)로 CGT를 부담하며, 거주자에게 주어지는 50% 일반 할인도 받지 못합니다. 양도차익 전액이 전체 비거주자 세율로 과세됩니다.",
      ],
    },
    {
      heading: "신고가 필요한 시점",
      body: [
        "비거주자는 원천징수로 완전히 해소되지 않는 호주 원천 소득(임대 소득, 부동산 양도차익, 사업소득 등)이 있으면 호주 세무 신고를 해야 합니다. 조약 세율이 적용되는데 기본 세율로 원천징수가 이뤄진 경우 환급을 받기 위해 선택적으로 신고할 수도 있습니다.",
        "신고는 등록된 세무 대리인을 통하거나 호주국세청에 직접 제출합니다. 단일 임대 부동산이나 배당 흐름을 다루는 단순 비거주자 신고는 전문가 대행 기준 400–800 호주달러 정도 듭니다.",
      ],
    },
  ],
  ctas: [
    { label: "원천징수세 계산기", href: "/tools/withholding-tax-calculator" },
    { label: "비거주자 CGT 체크", href: "/non-resident-cgt-checker" },
    { label: "비거주자 배당 계산기", href: "/non-resident-dividend-calculator" },
  ],
  disclaimer:
    "일반적인 정보 안내. 비거주자 세제는 본국 세제, 세무 거주 상태, 조약 지위와 상호 작용합니다. 여기 수치에 의존하기 전에 국가간 경험이 있는 세무 대리인의 도움을 받으세요.",
};

const SUB_PAGE_DICTS: Record<"siv" | "property" | "tax", Record<Locale, SubPageDict>> = {
  siv: { en: SIV_EN, zh: SIV_ZH, ko: SIV_KO },
  property: { en: PROPERTY_EN, zh: PROPERTY_ZH, ko: PROPERTY_KO },
  tax: { en: TAX_EN, zh: TAX_ZH, ko: TAX_KO },
};

export function getSubPageDict(
  slug: "siv" | "property" | "tax",
  locale: Locale,
): SubPageDict {
  return SUB_PAGE_DICTS[slug][locale];
}
