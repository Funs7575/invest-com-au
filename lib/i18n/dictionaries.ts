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
