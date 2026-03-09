import { CURRENT_YEAR, CURRENT_MONTH_YEAR } from "./seo";

export interface CityConfig {
  slug: string;
  name: string;
  state: string;
  stateShort: string;
  population: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  localContext: string;
  relatedCities: string[];
  faqs: { question: string; answer: string }[];
}

const yr = CURRENT_YEAR;

export const CITIES: CityConfig[] = [
  /* ─── Sydney ─── */
  {
    slug: "sydney",
    name: "Sydney",
    state: "New South Wales",
    stateShort: "NSW",
    population: "5.4 million",
    metaTitle: `Investing in Sydney (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Sydney, NSW. ASX brokerage fees, CHESS sponsorship, and local advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Sydney, NSW`,
    intro: `Sydney is Australia's financial capital and home to the Australian Securities Exchange (ASX). With over 5.4 million residents and one of the highest median incomes in the country, Sydney investors have access to every major broker, financial advisor, and investment platform operating in Australia.`,
    localContext: `As the city where the ASX is headquartered, Sydney sits at the heart of Australia's capital markets. Many of the country's largest fund managers, stockbrokers, and financial planning firms are based in the Sydney CBD and North Sydney. Sydney investors benefit from proximity to major financial institutions, a dense network of SMSF accountants and financial planners, and a thriving fintech ecosystem in suburbs like Surry Hills and Barangaroo. The city's high property prices have also driven many Sydneysiders towards share trading, ETFs, and micro-investing as more accessible wealth-building alternatives. Whether you are a first-time investor in Parramatta or a seasoned trader in the Eastern Suburbs, comparing brokerage fees and platform features is essential — even small fee differences compound significantly on Sydney-sized portfolios.`,
    relatedCities: ["melbourne", "canberra", "brisbane", "gold-coast"],
    faqs: [
      {
        question: "What is the best share trading platform in Sydney?",
        answer: `All major Australian brokers serve Sydney investors online. The "best" platform depends on your needs — $0 brokerage platforms like Webull and moomoo suit cost-conscious traders, while CommSec and nabtrade offer deep ASX research tools favoured by Sydney's active trading community. Compare fees, CHESS sponsorship, and platform features in the table above.`,
      },
      {
        question: "How do I find a financial advisor in Sydney?",
        answer: `Sydney has one of the highest concentrations of licensed financial advisors in Australia. Use our Find an Advisor tool to search by suburb, specialty (e.g. SMSF, retirement planning, high-net-worth), and fee structure. Always verify an advisor's AFSL on the ASIC Financial Advisers Register before engaging their services.`,
      },
      {
        question: "Is Sydney a good city for investing?",
        answer: `Sydney offers unmatched access to Australia's financial infrastructure — the ASX, major banks, fund managers, and a deep pool of financial professionals are all headquartered here. High median incomes and strong employment markets also support consistent investing. However, Sydney's high cost of living means budgeting and fee-conscious investing are especially important.`,
      },
      {
        question: "Do I need a local broker if I live in Sydney?",
        answer: `No. All Australian brokers operate online and serve investors nationwide. You don't need a Sydney-based broker to trade on the ASX. However, if you prefer face-to-face advice, Sydney has the most financial advisor offices of any Australian city. For self-directed investing, compare online platforms by fees and features rather than location.`,
      },
    ],
  },

  /* ─── Melbourne ─── */
  {
    slug: "melbourne",
    name: "Melbourne",
    state: "Victoria",
    stateShort: "VIC",
    population: "5.2 million",
    metaTitle: `Investing in Melbourne (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Melbourne, VIC. Brokerage fees, platform features, and local advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Melbourne, VIC`,
    intro: `Melbourne is Australia's second-largest city and a major financial hub with a rapidly growing fintech sector. Over 5.2 million Melburnians have access to a competitive range of brokers, robo-advisors, and financial planning firms — many of which are headquartered right here in Victoria.`,
    localContext: `Melbourne has emerged as Australia's fintech capital, with companies like Airwallex, Stake, and Selfwealth all founded in the city. The Victorian capital's strong university sector produces a steady stream of finance and technology graduates, fuelling innovation in investment platforms and wealth management. Melbourne investors tend to be early adopters of new platforms — the city has some of the highest per-capita usage of robo-advisors and micro-investing apps in the country. The city is also home to a large SMSF community, with numerous specialist accountants and auditors across suburbs like South Yarra, Richmond, and the CBD. Whether you are investing from a Brunswick share house or a Toorak family office, Melbourne's competitive broker market means lower fees and better tools for all investors.`,
    relatedCities: ["sydney", "adelaide", "hobart", "canberra"],
    faqs: [
      {
        question: "What is the best share trading platform in Melbourne?",
        answer: `Melbourne investors use the same online brokers available across Australia. Platforms like Stake (founded in Melbourne), Selfwealth, moomoo, and CommSec are all popular choices. Compare ASX brokerage, US share access, and CHESS sponsorship in the table above to find the best fit for your trading style.`,
      },
      {
        question: "How do I find a financial advisor in Melbourne?",
        answer: `Melbourne has a large network of licensed financial advisors and planners. Use our Find an Advisor tool to filter by suburb, specialty, and fee structure. Many Melbourne advisors offer initial consultations at no cost. Always check the ASIC Financial Advisers Register to verify credentials.`,
      },
      {
        question: "Are there Melbourne-based brokers?",
        answer: `Yes. Several popular Australian brokers are headquartered in Melbourne, including Stake and Selfwealth. However, since all brokers operate online, your location does not affect access or pricing. Choose a broker based on fees, platform quality, and features rather than headquarters location.`,
      },
      {
        question: "What should Melbourne investors know about tax?",
        answer: `Victorian investors follow the same federal tax rules as all Australians — Capital Gains Tax on share profits, dividend taxation with franking credits, and the 50% CGT discount for assets held over 12 months. There are no state-specific investment taxes in Victoria. Consider a Melbourne-based tax agent who specialises in investment income for personalised advice.`,
      },
    ],
  },

  /* ─── Brisbane ─── */
  {
    slug: "brisbane",
    name: "Brisbane",
    state: "Queensland",
    stateShort: "QLD",
    population: "2.6 million",
    metaTitle: `Investing in Brisbane (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Brisbane, QLD. Brokerage fees, platform comparisons, and advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Brisbane, QLD`,
    intro: `Brisbane is Australia's third-largest city and the economic engine of Queensland. With a population of 2.6 million and a booming economy driven by the 2032 Olympics preparations, Brisbane investors are increasingly active in shares, property, and superannuation.`,
    localContext: `Brisbane's investment landscape is shaped by strong population growth, major infrastructure spending ahead of the 2032 Olympic Games, and a lower cost of living compared to Sydney and Melbourne. This combination means more Brisbanites have disposable income available for investing. The city's financial services sector is concentrated in the CBD and Fortitude Valley, with a growing number of fintech startups and financial planning firms. Queensland's resources sector also drives interest in mining and energy stocks — many Brisbane investors hold positions in BHP, Rio Tinto, and other ASX-listed resource companies. South East Queensland's rapid growth corridor, from the Gold Coast to the Sunshine Coast, has created a large market for property investment advisors and SMSF specialists.`,
    relatedCities: ["gold-coast", "sydney", "melbourne", "perth"],
    faqs: [
      {
        question: "What is the best broker for Brisbane investors?",
        answer: `Brisbane investors use the same online platforms available Australia-wide. Popular choices include CommSec, moomoo, Stake, and Selfwealth. The best broker depends on your trading frequency, preferred markets (ASX, US, or both), and whether you value CHESS sponsorship. Compare options in the table above.`,
      },
      {
        question: "How do I start investing in Brisbane?",
        answer: `Getting started is the same regardless of your city: 1) Choose a broker from our comparison table, 2) Open an account online (takes minutes), 3) Deposit funds via bank transfer or PayID, 4) Place your first trade. If you are new to investing, consider starting with a low-cost ETF portfolio.`,
      },
      {
        question: "Are there financial advisors in Brisbane?",
        answer: `Yes. Brisbane has a strong network of financial advisors, SMSF accountants, and wealth managers across the city and surrounding suburbs. Use our Find an Advisor tool to search by location and specialty. Many offer free initial consultations.`,
      },
      {
        question: "Does the 2032 Olympics affect investing in Brisbane?",
        answer: `The Brisbane 2032 Olympics is driving significant infrastructure investment across South East Queensland. While this creates opportunities in construction, property, and related sectors, individual stock-picking based on events carries risk. A diversified portfolio approach is generally more prudent than speculating on Olympic-related investments.`,
      },
    ],
  },

  /* ─── Perth ─── */
  {
    slug: "perth",
    name: "Perth",
    state: "Western Australia",
    stateShort: "WA",
    population: "2.2 million",
    metaTitle: `Investing in Perth (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Perth, WA. Brokerage fees, resource stock access, and advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Perth, WA`,
    intro: `Perth is Western Australia's capital and a global resources hub. With a population of 2.2 million and strong ties to the mining and energy sectors, Perth investors often have unique portfolio considerations centred around commodity exposure and resource stocks.`,
    localContext: `Perth's economy is closely linked to Australia's mining and resources sector — iron ore, lithium, gold, and natural gas drive much of the city's wealth. Many Perth investors have direct or indirect exposure to resource companies through their employer, superannuation, or personal share portfolios. This concentration makes diversification particularly important for WA investors. Perth is also home to a significant SMSF community, partly driven by high incomes in the resources sector. The city's financial advisor network specialises in areas like salary packaging for FIFO workers, resource stock portfolios, and retirement planning for workers with irregular income patterns. Despite being three hours behind the east coast, Perth investors trade on the ASX during the same market hours — but the time zone difference can be an advantage for those who want to review overnight US market moves before the ASX opens.`,
    relatedCities: ["adelaide", "melbourne", "sydney", "brisbane"],
    faqs: [
      {
        question: "What is the best broker for Perth investors?",
        answer: `Perth investors have access to all the same online brokers as the rest of Australia. For those with a focus on ASX-listed resource stocks, platforms with strong research tools (like CommSec or CMC Markets) are popular. For cost-conscious investors, $0 brokerage platforms like moomoo and Webull offer significant savings.`,
      },
      {
        question: "How do Perth investors manage the time zone difference?",
        answer: `The ASX operates on AEST, which is 2–3 hours ahead of Perth (AWST). This means the market opens at 8am Perth time and closes at 2pm. Many Perth investors find this convenient — you can review overnight US market moves and global news before the ASX opens, and your trading day is over by mid-afternoon.`,
      },
      {
        question: "Are there financial advisors in Perth?",
        answer: `Yes. Perth has a well-established financial advisory community, with particular expertise in resource sector wealth management, FIFO worker financial planning, and SMSF administration. Use our Find an Advisor tool to search by suburb and specialty.`,
      },
      {
        question: "Should Perth investors diversify away from resources?",
        answer: `Diversification is important for all investors, but especially for those in Perth whose employment income may already be tied to the resources sector. If your job, super, and share portfolio are all exposed to mining, a downturn in commodity prices could affect all three simultaneously. Consider diversifying across sectors and asset classes.`,
      },
    ],
  },

  /* ─── Adelaide ─── */
  {
    slug: "adelaide",
    name: "Adelaide",
    state: "South Australia",
    stateShort: "SA",
    population: "1.4 million",
    metaTitle: `Investing in Adelaide (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Adelaide, SA. Brokerage fees, platform comparisons, and advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Adelaide, SA`,
    intro: `Adelaide is South Australia's capital with a population of 1.4 million. Known for its affordability and growing defence and technology sectors, Adelaide offers investors a lower cost of living that frees up more capital for building wealth through shares, super, and other investments.`,
    localContext: `Adelaide's investment landscape benefits from the city's significantly lower cost of living compared to Sydney and Melbourne — housing costs alone can free up thousands of dollars per year for investing. South Australia's economy is diversifying rapidly, with major defence contracts (including the Hunter-class frigate program), a booming renewable energy sector, and growing tech hubs in places like Lot Fourteen in the CBD. Adelaide investors increasingly look beyond local industries to build diversified national and global portfolios through online brokers. The city has a strong community of self-directed investors, particularly among university-educated professionals and government workers. Adelaide's financial planning sector covers everything from basic superannuation advice to complex estate planning, with a number of award-winning firms located in the CBD and surrounding suburbs like Norwood and Unley.`,
    relatedCities: ["melbourne", "perth", "hobart", "canberra"],
    faqs: [
      {
        question: "What is the best share trading platform in Adelaide?",
        answer: `Adelaide investors use the same national online brokers as the rest of Australia. All major platforms — CommSec, Stake, moomoo, Selfwealth, CMC Markets, and others — are available regardless of your location. Compare fees and features in the table above.`,
      },
      {
        question: "How does Adelaide's lower cost of living affect investing?",
        answer: `Adelaide's lower housing costs and general living expenses compared to Sydney and Melbourne can translate directly into more money available for investing. Even modest regular contributions to a share portfolio or super fund compound significantly over time. This makes Adelaide one of the best cities in Australia for building long-term wealth through consistent investing.`,
      },
      {
        question: "Are there financial advisors in Adelaide?",
        answer: `Yes. Adelaide has a strong financial advisory sector with specialists in retirement planning, SMSF administration, and wealth management. Use our Find an Advisor tool to search by suburb and specialty across South Australia.`,
      },
      {
        question: "What industries drive investing in Adelaide?",
        answer: `Defence, renewable energy, health, and education are Adelaide's key growth sectors. However, most Adelaide investors build diversified portfolios using online brokers rather than concentrating in local industries. ASX-listed ETFs and index funds provide broad market exposure regardless of where you live.`,
      },
    ],
  },

  /* ─── Canberra ─── */
  {
    slug: "canberra",
    name: "Canberra",
    state: "Australian Capital Territory",
    stateShort: "ACT",
    population: "470,000",
    metaTitle: `Investing in Canberra (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Canberra, ACT. Brokerage fees, super fund comparisons, and advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Canberra, ACT`,
    intro: `Canberra is Australia's national capital with a population of 470,000. With the highest median household income of any Australian city and a highly educated workforce, Canberrans are among the nation's most active investors — particularly in superannuation and diversified share portfolios.`,
    localContext: `Canberra's unique economic profile — dominated by the public sector, universities, and defence — gives the city Australia's highest median household income. This translates to strong investment activity, particularly in superannuation (Commonwealth Super Scheme and PSSap are widely held), salary-sacrificed super contributions, and diversified share portfolios. Canberra investors tend to be well-informed and research-driven, reflecting the city's highly educated population. The ACT's financial advisory community specialises in public sector superannuation, transition-to-retirement strategies, and optimising defined benefit schemes. Many Canberrans also invest in property across the border in NSW (Queanbeyan, Jerrabomberra) and maintain diversified portfolios of Australian and international shares. The city's stable employment market and high incomes make it ideal for consistent, long-term investing strategies.`,
    relatedCities: ["sydney", "melbourne", "adelaide", "hobart"],
    faqs: [
      {
        question: "What is the best broker for Canberra investors?",
        answer: `Canberra investors have access to all Australian online brokers. Given the city's high average incomes and investment balances, platforms with competitive fees on larger trades and strong research tools tend to be popular. Compare brokerage fees, CHESS sponsorship, and platform features in the table above.`,
      },
      {
        question: "How does public sector super work with investing?",
        answer: `Many Canberrans are members of Commonwealth super schemes (CSS, PSS, PSSap). These defined benefit or accumulation schemes often have different rules around additional contributions, investment choice, and retirement options. Consider consulting a financial advisor who specialises in public sector super if you want to optimise your arrangements.`,
      },
      {
        question: "Are there financial advisors in Canberra?",
        answer: `Yes. Canberra has a well-established financial advisory sector with particular expertise in public sector superannuation, transition-to-retirement planning, and salary sacrifice strategies. Use our Find an Advisor tool to search by suburb and specialty.`,
      },
      {
        question: "Is Canberra good for investors?",
        answer: `Canberra's high median incomes, stable employment, and educated population make it one of the best cities in Australia for consistent investing. The city's lower volatility in employment (public sector stability) supports regular investing strategies like dollar-cost averaging into ETFs and index funds.`,
      },
    ],
  },

  /* ─── Hobart ─── */
  {
    slug: "hobart",
    name: "Hobart",
    state: "Tasmania",
    stateShort: "TAS",
    population: "250,000",
    metaTitle: `Investing in Hobart (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors in Hobart, TAS. Brokerage fees, platform comparisons, and advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing in Hobart, TAS`,
    intro: `Hobart is Tasmania's capital with a population of 250,000. Despite being Australia's smallest capital city, Hobart's growing economy, rising property values, and increasing financial sophistication have driven strong demand for online investing platforms and financial advisory services.`,
    localContext: `Hobart has experienced significant economic growth over the past decade, driven by tourism, agriculture, renewable energy, and a booming property market. This growth has increased both the wealth and financial ambitions of Tasmanian investors. While Hobart may not have the density of financial services firms found in Sydney or Melbourne, the shift to online investing platforms has levelled the playing field — Hobart investors have access to exactly the same brokers, fees, and tools as their mainland counterparts. Tasmania's ageing population means retirement planning and superannuation advice are particularly in demand. The state also has a growing SMSF community, and Hobart-based financial planners increasingly serve clients across the state using video consultations. For younger Tasmanians, micro-investing platforms and robo-advisors offer accessible entry points to building wealth alongside Hobart's more affordable cost of living.`,
    relatedCities: ["melbourne", "adelaide", "canberra", "sydney"],
    faqs: [
      {
        question: "Can I access all brokers from Hobart?",
        answer: `Yes. All Australian online brokers serve investors in every state and territory, including Tasmania. Whether you use CommSec, Stake, moomoo, or any other platform, your experience and fees are identical to those available in Sydney or Melbourne. Compare options in the table above.`,
      },
      {
        question: "Are there financial advisors in Hobart?",
        answer: `Yes, though the selection is smaller than in larger capitals. Hobart has qualified financial advisors, SMSF accountants, and wealth managers. Many also offer video consultations. Use our Find an Advisor tool to search for professionals in Tasmania.`,
      },
      {
        question: "Is Hobart a good place to start investing?",
        answer: `Hobart's lower cost of living compared to mainland capitals can free up more money for investing. Combined with full access to national online brokers and financial tools, Hobart investors can build portfolios just as effectively as those in larger cities. The key is starting early and investing consistently.`,
      },
      {
        question: "What investment considerations are specific to Tasmania?",
        answer: `Tasmania follows the same federal tax rules as all other states. The main state-specific consideration is the relatively smaller local financial advisor market — but this is easily addressed through online advisory services and video consultations with mainland-based professionals.`,
      },
    ],
  },

  /* ─── Gold Coast ─── */
  {
    slug: "gold-coast",
    name: "Gold Coast",
    state: "Queensland",
    stateShort: "QLD",
    population: "700,000",
    metaTitle: `Investing on the Gold Coast (${yr}) — Best Brokers & Financial Advisors`,
    metaDescription: `Compare the best share trading platforms and financial advisors on the Gold Coast, QLD. Brokerage fees, platform comparisons, and advisor search — updated ${CURRENT_MONTH_YEAR}.`,
    h1: `Investing on the Gold Coast, QLD`,
    intro: `The Gold Coast is Australia's sixth-largest city with a population of 700,000 and one of the fastest growth rates in the country. A vibrant economy driven by tourism, construction, and a growing professional services sector has made the Gold Coast an increasingly active investing market.`,
    localContext: `The Gold Coast's rapid population growth — fuelled by interstate migration from Sydney and Melbourne — has brought a wave of financially experienced investors to the region. Many relocators carry established investment portfolios and are looking for local financial advisors to manage their ongoing wealth strategies. The city's tourism and hospitality-driven economy creates seasonal income patterns for many residents, making consistent investing and cash flow management especially important. Property investment is a major focus on the Gold Coast, but an increasing number of residents are diversifying into shares, ETFs, and super optimisation. The Gold Coast financial advisory community is concentrated in Southport, Broadbeach, and Robina, with specialists in retirement planning, property investment strategy, and SMSF administration. The region's lifestyle appeal also attracts semi-retirees and retirees who need transition-to-retirement planning and income-focused investment strategies.`,
    relatedCities: ["brisbane", "sydney", "melbourne", "perth"],
    faqs: [
      {
        question: "What is the best broker for Gold Coast investors?",
        answer: `Gold Coast investors have access to all national online brokers. The same platforms available in Brisbane, Sydney, and Melbourne are available here — including CommSec, Stake, moomoo, Selfwealth, and more. Compare fees and features in the table above to find the best match for your needs.`,
      },
      {
        question: "Are there financial advisors on the Gold Coast?",
        answer: `Yes. The Gold Coast has a growing financial advisory sector, with specialists in retirement planning, SMSF, and property investment strategy located across Southport, Broadbeach, and Robina. Use our Find an Advisor tool to search by suburb and specialty.`,
      },
      {
        question: "How do seasonal incomes affect investing on the Gold Coast?",
        answer: `Many Gold Coast residents work in tourism, hospitality, or seasonal industries. If your income varies throughout the year, consider automating regular investments during peak earning periods and maintaining a cash buffer for quieter months. Dollar-cost averaging into ETFs or index funds can smooth out the impact of irregular income.`,
      },
      {
        question: "Should Gold Coast investors diversify beyond property?",
        answer: `The Gold Coast property market has performed well, but concentrating all your wealth in a single asset class and location carries risk. Diversifying into shares, ETFs, super contributions, and other asset classes can reduce your overall risk and provide liquidity that property does not offer.`,
      },
    ],
  },
];

/** Look up a city config by its URL slug */
export function getCityBySlug(slug: string): CityConfig | undefined {
  return CITIES.find((c) => c.slug === slug);
}

/** Return all city slugs (used for static param generation) */
export function getAllCitySlugs(): string[] {
  return CITIES.map((c) => c.slug);
}
