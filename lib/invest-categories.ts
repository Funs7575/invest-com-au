import type { InvestListingVertical } from "./types";
import { CURRENT_YEAR, UPDATED_LABEL } from "./seo";

const yr = CURRENT_YEAR;
const upd = UPDATED_LABEL;

// ═══════════════════════════════════════════════════════════════════
// Sub-category config for each investment vertical
// ═══════════════════════════════════════════════════════════════════

export interface InvestSubcategory {
  slug: string;
  label: string;
  /** DB value in investment_listings.sub_category */
  dbValue: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  faqs: { question: string; answer: string }[];
}

export interface InvestCategory {
  /** URL slug — used in /invest/{slug}/listings */
  slug: string;
  /** Display label */
  label: string;
  /** DB vertical value(s) in investment_listings.vertical */
  dbVerticals: InvestListingVertical[];
  /** Optional: also include fund sub-categories matching these values */
  dbFundSubCategories?: string[];
  /** Color theme */
  color: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    gradient: string;
  };
  icon: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  subcategories: InvestSubcategory[];
}

// ═══════════════════════════════════════════════════════════════════
// Category definitions
// ═══════════════════════════════════════════════════════════════════

const categories: InvestCategory[] = [
  // ─── Buy a Business ───
  {
    slug: "buy-business",
    label: "Business",
    dbVerticals: ["business"],
    color: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      accent: "bg-blue-600",
      gradient: "from-blue-50 to-white",
    },
    icon: "building-2",
    title: `Buy a Business in Australia — Listings & Opportunities (${yr})`,
    h1: "Buy a Business in Australia",
    metaDescription: `Browse verified business-for-sale listings across Australia. Cafes, franchises, professional services, e-commerce & more. ${upd}.`,
    intro: `Looking to buy a business in Australia? Browse our curated directory of businesses for sale — from established cafes and professional practices to digital agencies and e-commerce brands. Each listing includes financials, location, and direct contact details.`,
    sections: [
      {
        heading: "What to Look for When Buying a Business in Australia",
        body: "The three most important factors are verified financials (at least 2-3 years of profit & loss statements), the reason for sale, and whether the business has transferable leases, contracts, and licenses. Always engage a business broker or solicitor before signing anything. Due diligence should include reviewing ATO compliance, employee entitlements, and any pending litigation.",
      },
      {
        heading: "How Much Does It Cost to Buy a Business?",
        body: "Small businesses in Australia typically sell for 2-3x annual profit (SDE multiple). A cafe might go for $150,000-$500,000, while professional practices can fetch $500,000-$2M+. Franchise businesses have their own pricing structures. Factor in stamp duty, legal fees, and working capital on top of the purchase price.",
      },
    ],
    faqs: [
      {
        question: "How do I buy a business in Australia?",
        answer: "Start by researching the industry, then browse listings to find opportunities that match your budget and skills. Engage a business broker, conduct due diligence (financials, legal, compliance), arrange finance, negotiate terms, and sign a sale contract. Most acquisitions take 2-6 months from first contact to settlement.",
      },
      {
        question: "What taxes apply when buying a business in Australia?",
        answer: "You may pay stamp duty on the business transfer (varies by state), GST on assets (if the sale isn't a 'going concern'), and capital gains tax applies to the seller. As the buyer, factor in transfer costs for leases, licenses, and registrations. Consult a tax agent before committing.",
      },
      {
        question: "Can foreigners buy a business in Australia?",
        answer: "Yes. Foreign nationals can buy Australian businesses, though FIRB approval may be required for acquisitions above certain thresholds. Business visa pathways (subclass 188/888) are available for entrepreneurs investing $200,000-$5M+ in Australian businesses.",
      },
    ],
    subcategories: [
      {
        slug: "hospitality",
        label: "Hospitality",
        dbValue: "independent",
        title: `Hospitality Businesses for Sale in Australia (${yr})`,
        h1: "Hospitality Businesses for Sale in Australia",
        metaDescription: `Buy a cafe, restaurant, or bar in Australia. Browse hospitality business listings with financials. ${upd}.`,
        intro: "Browse cafes, restaurants, bars, and food businesses for sale across Australia. Hospitality remains one of the most popular business categories for first-time buyers.",
        faqs: [
          { question: "How much does a cafe cost in Australia?", answer: "A small cafe typically sells for $100,000-$350,000 depending on location, turnover, and lease terms. High-traffic CBD cafes can fetch $500,000+. Key factors include foot traffic, lease length, and whether the business comes with existing staff." },
          { question: "Is a restaurant a good investment in Australia?", answer: "Restaurants can be profitable but are high-risk — around 60% of new restaurants close within 3 years. Look for established businesses with loyal customers, strong online reviews, and at least 3 years of stable financials before investing." },
        ],
      },
      {
        slug: "retail",
        label: "Retail",
        dbValue: "independent",
        title: `Retail Businesses for Sale in Australia (${yr})`,
        h1: "Retail Businesses for Sale in Australia",
        metaDescription: `Buy a retail business in Australia. Browse retail stores, e-commerce, and specialty shops for sale. ${upd}.`,
        intro: "From brick-and-mortar specialty stores to established e-commerce brands, browse retail business opportunities across Australia.",
        faqs: [
          { question: "Is retail a good business to buy in Australia?", answer: "Online-first and niche retail businesses are performing well. Traditional retail faces challenges from e-commerce, so look for businesses with strong online presence, loyal customer bases, and defensible niches. Average margins in Australian retail are 5-15%." },
        ],
      },
      {
        slug: "healthcare",
        label: "Healthcare",
        dbValue: "independent",
        title: `Healthcare Businesses for Sale in Australia (${yr})`,
        h1: "Healthcare Businesses for Sale in Australia",
        metaDescription: `Buy a healthcare or medical practice in Australia. Childcare centres, dental practices, allied health. ${upd}.`,
        intro: "Healthcare businesses are among the most resilient investments in Australia. Browse childcare centres, dental practices, physiotherapy clinics, and allied health businesses for sale.",
        faqs: [
          { question: "How much does a childcare centre cost in Australia?", answer: "Childcare centres typically sell for $1M-$5M+ depending on capacity, occupancy rates, and location. They're valued at 3-5x EBITDA. High demand and government subsidies (CCS) make childcare one of Australia's most stable business sectors." },
        ],
      },
      {
        slug: "services",
        label: "Services",
        dbValue: "independent",
        title: `Service Businesses for Sale in Australia (${yr})`,
        h1: "Service Businesses for Sale in Australia",
        metaDescription: `Buy a service business in Australia. Cleaning, accounting, automotive, professional services. ${upd}.`,
        intro: "Service businesses often have lower capital requirements and recurring revenue. Browse accounting practices, cleaning companies, automotive workshops, and other service businesses for sale.",
        faqs: [
          { question: "What is the most profitable service business in Australia?", answer: "Professional services (accounting, legal, consulting) typically have the highest margins at 20-40%. Trade services (plumbing, electrical) are also highly profitable with strong demand. Look for businesses with recurring contracts and established client bases." },
        ],
      },
    ],
  },

  // ─── Mining ───
  {
    slug: "mining",
    label: "Mining",
    dbVerticals: ["mining"],
    color: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      accent: "bg-amber-600",
      gradient: "from-amber-50 to-white",
    },
    icon: "pickaxe",
    title: `Mining Investment Opportunities in Australia (${yr})`,
    h1: "Mining Investment Opportunities in Australia",
    metaDescription: `Invest in Australian mining — gold, lithium, rare earths, iron ore, copper. Browse mining tenements, royalty streams & JV opportunities. ${upd}.`,
    intro: `Australia is the world's largest exporter of iron ore and lithium, and the second-largest gold producer. Our mining investment marketplace features exploration tenements, development projects, royalty streams, and joint venture opportunities across Australia's major mining regions.`,
    sections: [
      {
        heading: "Why Invest in Australian Mining?",
        body: "Australia's mining sector attracted $33B in foreign investment in 2024-25, representing 33% of all FDI. The country holds the world's largest reserves of lithium, zinc, nickel, and rutile, and is a top-3 producer of iron ore, coal, gold, aluminium, and uranium. With the global energy transition driving demand for critical minerals, Australian mining assets are highly sought after.",
      },
      {
        heading: "Types of Mining Investments Available",
        body: "Opportunities range from early-stage exploration tenements ($500K-$5M) to producing mines ($50M+) and royalty streams (passive income from production). Joint venture partnerships allow investors to fund exploration in exchange for equity. For passive exposure, ASX-listed mining companies and ETFs (like MNRS or QRE) offer liquid alternatives.",
      },
    ],
    faqs: [
      {
        question: "How do I invest in mining in Australia?",
        answer: "You can invest directly by acquiring mining tenements or joining joint ventures (requires significant capital and expertise), or indirectly through ASX-listed mining stocks, mining ETFs, or mining-focused managed funds. Direct investment typically starts at $500,000+ while ASX stocks can be bought for any amount.",
      },
      {
        question: "What is a mining tenement in Australia?",
        answer: "A mining tenement is a government-granted right to explore or mine a specific area. Types include Exploration Licences (EL), Mining Leases (ML), and Prospecting Licences. They're granted by state governments and come with conditions including expenditure commitments, environmental obligations, and native title considerations.",
      },
      {
        question: "Is lithium mining a good investment in Australia?",
        answer: "Australia is the world's largest lithium producer, and demand is projected to grow 5-10x by 2030 driven by EV batteries. However, lithium prices are volatile — they surged 400% in 2021-22 then fell 80% in 2023-24. Invest based on long-term fundamentals, not short-term price movements.",
      },
    ],
    subcategories: [
      {
        slug: "gold",
        label: "Gold",
        dbValue: "gold",
        title: `Gold Mining Investments in Australia (${yr})`,
        h1: "Gold Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian gold mining — tenements, producing mines, royalty streams in WA, QLD, NSW. ${upd}.`,
        intro: "Australia is the world's second-largest gold producer, with the Goldfields-Esperance region in WA producing over 60% of domestic output. Browse gold mining investment opportunities.",
        faqs: [
          { question: "Where is gold mined in Australia?", answer: "Western Australia produces ~70% of Australia's gold, concentrated in the Goldfields-Esperance region (Kalgoorlie-Boulder). Other major producing states include Queensland (Mount Isa, Charters Towers), NSW (Orange, Cobar), and Victoria (Bendigo, Ballarat)." },
          { question: "How much does a gold mining lease cost in Australia?", answer: "Exploration tenements in prospective areas start from $200,000-$2M. Producing mines or advanced development projects typically sell for $5M-$100M+ depending on reserve size, grade, and infrastructure. Royalty streams offer passive income for $1M-$20M." },
        ],
      },
      {
        slug: "lithium",
        label: "Lithium",
        dbValue: "lithium",
        title: `Lithium Mining Investments in Australia (${yr})`,
        h1: "Lithium Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian lithium mining — exploration tenements, spodumene projects, battery metals. ${upd}.`,
        intro: "Australia produces over half the world's lithium, primarily from hard-rock (spodumene) mines in Western Australia. The energy transition is driving unprecedented demand for this critical mineral.",
        faqs: [
          { question: "Why is Australian lithium important?", answer: "Australia is the world's largest lithium producer, supplying ~50% of global demand. Australian spodumene is processed into battery-grade lithium hydroxide used in EV batteries. Major deposits are in WA's Pilbara and Goldfields regions." },
        ],
      },
      {
        slug: "copper",
        label: "Copper",
        dbValue: "copper_gold",
        title: `Copper Mining Investments in Australia (${yr})`,
        h1: "Copper Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian copper mining — exploration, development projects in QLD, SA, NSW. ${upd}.`,
        intro: "Copper is essential for the energy transition — EVs use 3-4x more copper than ICE vehicles, and renewable energy systems are copper-intensive. Australia has significant copper deposits across Queensland, South Australia, and NSW.",
        faqs: [
          { question: "Where is copper mined in Australia?", answer: "Major copper deposits are in South Australia (Olympic Dam — world's largest known deposit), Queensland (Mount Isa, Ernest Henry), and NSW (Cadia-Ridgeway, Northparkes). Copper-gold porphyry deposits are particularly attractive." },
        ],
      },
      {
        slug: "rare-earths",
        label: "Rare Earths",
        dbValue: "rare_earths",
        title: `Rare Earth Mining Investments in Australia (${yr})`,
        h1: "Rare Earth Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian rare earth mining — critical minerals, permanent magnets, defence applications. ${upd}.`,
        intro: "Rare earth elements are critical for defence, renewable energy, and advanced technology. Australia holds the world's sixth-largest reserves and is positioning as a reliable alternative to Chinese supply dominance.",
        faqs: [
          { question: "Why are rare earths strategically important?", answer: "Rare earths are used in permanent magnets (wind turbines, EV motors), defence systems, smartphones, and medical devices. China controls ~60% of mining and ~90% of processing. Australia, the US, and allies are investing heavily in alternative supply chains." },
        ],
      },
      {
        slug: "nickel",
        label: "Nickel",
        dbValue: "nickel",
        title: `Nickel Mining Investments in Australia (${yr})`,
        h1: "Nickel Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian nickel mining — battery-grade sulphide projects, laterite deposits, critical minerals. ${upd}.`,
        intro: "Battery-grade nickel demand is projected to rise 300-400% by 2030. Australia's Yilgarn Craton and Kambalda belt in WA host world-class nickel sulphide deposits preferred for EV battery cathodes — offering ethical sourcing advantages over Indonesian laterite operations.",
        faqs: [
          { question: "Why is Australian nickel important for batteries?", answer: "EV batteries use nickel-rich cathodes (NMC and NCA chemistries). Australian nickel sulphide produces high-purity Class 1 nickel suitable for batteries, unlike laterite-derived nickel which requires energy-intensive processing. WA's nickel belt has decades of production history and established processing infrastructure." },
          { question: "What happened to nickel prices in 2023-24?", answer: "Nickel prices fell sharply due to Indonesian nickel pig iron oversupply. However, battery-grade nickel commands a significant premium, and Western automakers are increasingly seeking non-Indonesian supply chains for ESG and supply security reasons — benefiting Australian producers." },
        ],
      },
      {
        slug: "cobalt",
        label: "Cobalt",
        dbValue: "cobalt",
        title: `Cobalt Mining Investments in Australia (${yr})`,
        h1: "Cobalt Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian cobalt mining — ethical supply, battery metals, critical mineral projects. ${upd}.`,
        intro: "Cobalt is essential for lithium-ion battery cathodes and is designated a critical mineral under the US-Australia framework. Australian cobalt projects offer ethical sourcing advantages over artisanal supply from the Democratic Republic of Congo.",
        faqs: [
          { question: "Why is Australian cobalt strategically important?", answer: "Over 70% of global cobalt comes from the DRC, often with significant ESG concerns. Australian cobalt from nickel-cobalt laterite and copper-cobalt deposits provides Western manufacturers with an ethical, traceable supply chain — increasingly demanded by EV makers and their customers." },
        ],
      },
      {
        slug: "vanadium",
        label: "Vanadium",
        dbValue: "vanadium",
        title: `Vanadium Mining Investments in Australia (${yr})`,
        h1: "Vanadium Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian vanadium mining — grid-scale battery storage, steel alloys, critical minerals. ${upd}.`,
        intro: "Vanadium is emerging as a key material for grid-scale energy storage via vanadium redox flow batteries (VRFBs). Australia hosts some of the world's largest undeveloped vanadium deposits, primarily in Queensland.",
        faqs: [
          { question: "What are vanadium redox flow batteries?", answer: "VRFBs store energy in vanadium electrolyte solutions and are ideal for grid-scale storage (4-12 hours). Unlike lithium batteries, they don't degrade with cycling and can last 25+ years. As renewable energy penetration increases, demand for long-duration storage — and vanadium — is growing rapidly." },
        ],
      },
      {
        slug: "uranium",
        label: "Uranium",
        dbValue: "uranium",
        title: `Uranium Mining Investments in Australia (${yr})`,
        h1: "Uranium Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian uranium mining — ISR projects, nuclear renaissance, Olympic Dam province. ${upd}.`,
        intro: "The global nuclear renaissance is driving renewed interest in uranium. Australia holds the world's largest uranium reserves, with South Australia hosting world-class deposits. In-situ recovery (ISR) technology reduces environmental impact and capital costs.",
        faqs: [
          { question: "Can you mine uranium in Australia?", answer: "Yes, but regulation varies by state. South Australia actively permits uranium mining (Olympic Dam, Beverley, Four Mile). The Northern Territory allows it under federal oversight. Western Australia lifted its uranium mining ban in 2024. NSW, Victoria, and Queensland maintain moratoriums on uranium mining." },
        ],
      },
      {
        slug: "coal",
        label: "Coal",
        dbValue: "coal",
        title: `Coal Mining Investments in Australia (${yr})`,
        h1: "Coal Mining Investment Opportunities in Australia",
        metaDescription: `Invest in Australian coal mining — royalty streams, metallurgical coal, thermal coal assets. ${upd}.`,
        intro: "Despite the energy transition, metallurgical (coking) coal remains essential for steel production, and Australia is the world's largest exporter. Coal royalty streams offer passive income with no operational risk.",
        faqs: [
          { question: "Is coal still a good investment in Australia?", answer: "Metallurgical coal (used in steelmaking) has stronger long-term prospects than thermal coal (used for electricity). Australian met coal commands premium prices due to quality. Royalty streams on existing mines can generate 8-15% yields. However, ESG concerns and divestment trends are reducing the pool of buyers." },
        ],
      },
    ],
  },

  // ─── Farmland ───
  {
    slug: "farmland",
    label: "Farmland",
    dbVerticals: ["farmland"],
    color: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      accent: "bg-green-600",
      gradient: "from-green-50 to-white",
    },
    icon: "wheat",
    title: `Farmland & Agricultural Investment in Australia (${yr})`,
    h1: "Farmland & Agricultural Investment in Australia",
    metaDescription: `Invest in Australian farmland — cropping, livestock, dairy, vineyards, water rights. Browse agricultural properties for sale. ${upd}.`,
    intro: `Australia has 370 million hectares of agricultural land, making it one of the world's largest farming nations. Browse farmland investment opportunities across cropping, livestock, dairy, horticulture, and water rights.`,
    sections: [
      {
        heading: "Why Invest in Australian Farmland?",
        body: "Australian farmland has delivered average returns of 9-12% p.a. over the past 30 years (including capital gains and operating income), outperforming Australian equities on a risk-adjusted basis. Key drivers include food security demand, water scarcity value, carbon credit potential, and growing Asian middle-class demand for Australian premium food products.",
      },
      {
        heading: "FIRB Rules for Foreign Farmland Buyers",
        body: "Foreign investors must notify FIRB for all agricultural land acquisitions regardless of value (the $0 threshold applies). FIRB assesses national interest, including food security, employment, and environmental impact. The cumulative threshold for agricultural land is $15M. Approval typically takes 30-90 days. Water entitlements have separate thresholds and rules.",
      },
    ],
    faqs: [
      {
        question: "How much does farmland cost in Australia?",
        answer: "Prices vary enormously by location and use. Broadacre cropping land in NSW/QLD averages $5,000-$15,000/ha. Premium dairy land in Gippsland or the Western Districts can exceed $20,000/ha. Vineyards in premium regions like the Barossa Valley can reach $100,000+/ha with established vines.",
      },
      {
        question: "Can foreigners buy farmland in Australia?",
        answer: "Yes, but all foreign agricultural land purchases must be notified to FIRB. Approval is generally granted if the investment benefits Australia through increased production, employment, or infrastructure. The cumulative $15M threshold means multiple purchases are tracked.",
      },
    ],
    subcategories: [
      {
        slug: "cropping",
        label: "Cropping",
        dbValue: "cropping",
        title: `Cropping Farms for Sale in Australia (${yr})`,
        h1: "Cropping Farms for Sale in Australia",
        metaDescription: `Buy cropping farm in Australia. Wheat, barley, canola & grain properties for sale in NSW, QLD, WA, SA. ${upd}.`,
        intro: "Australia is a major global grain exporter, producing 40-60 million tonnes annually. Browse cropping properties from the Darling Downs to the WA wheat belt.",
        faqs: [
          { question: "What crops are most profitable in Australia?", answer: "Canola, chickpeas, and cotton typically command the highest margins, though wheat and barley offer more stable returns. Irrigated cropping land (with water entitlements) is significantly more valuable and productive than dryland properties." },
        ],
      },
      {
        slug: "dairy",
        label: "Dairy",
        dbValue: "dairy",
        title: `Dairy Farms for Sale in Australia (${yr})`,
        h1: "Dairy Farms for Sale in Australia",
        metaDescription: `Buy a dairy farm in Australia. Dairy properties for sale in VIC, TAS, NSW with water and infrastructure. ${upd}.`,
        intro: "Australia's dairy industry is concentrated in Victoria's Gippsland and Western Districts, with growing production in Tasmania. Browse dairy farm investment opportunities.",
        faqs: [
          { question: "How much does a dairy farm cost in Australia?", answer: "Small dairy farms (100-200 cows) sell for $2M-$5M. Large-scale operations (500+ cows) with modern infrastructure can cost $10M-$30M. Key factors include water security, pasture quality, dairy license value, and proximity to processing plants." },
        ],
      },
      {
        slug: "viticulture",
        label: "Viticulture",
        dbValue: "horticulture",
        title: `Vineyards & Wineries for Sale in Australia (${yr})`,
        h1: "Vineyards & Wineries for Sale in Australia",
        metaDescription: `Buy a vineyard or winery in Australia. Wine country properties in Barossa, Hunter Valley, Margaret River. ${upd}.`,
        intro: "Australia is the world's fifth-largest wine exporter. Browse vineyards and wineries for sale in premium regions like the Barossa Valley, Hunter Valley, Margaret River, and Yarra Valley.",
        faqs: [
          { question: "How much does a vineyard cost in Australia?", answer: "Small boutique vineyards (5-20ha) start from $1M-$5M. Premium region vineyards with established brands, cellar doors, and export contracts can sell for $10M-$50M+. Barossa Valley and Margaret River command the highest per-hectare prices." },
        ],
      },
      {
        slug: "horticulture",
        label: "Horticulture",
        dbValue: "horticulture",
        title: `Horticulture Farms for Sale in Australia (${yr})`,
        h1: "Horticulture & Orchard Investments in Australia",
        metaDescription: `Buy a horticulture farm in Australia. Orchards, macadamias, avocados, citrus properties for sale. ${upd}.`,
        intro: "Australia's horticulture sector is booming, driven by strong export demand for macadamias, avocados, almonds, and citrus. Browse horticulture farm opportunities.",
        faqs: [
          { question: "What are the best horticulture investments in Australia?", answer: "Macadamia orchards, almond plantations, and avocado farms have seen strong demand and price growth. Macadamia prices have been volatile but long-term demand from Asia is strong. Almonds benefit from scale and established export markets." },
        ],
      },
    ],
  },

  // ─── Commercial Property ───
  {
    slug: "commercial-property",
    label: "Commercial Property",
    dbVerticals: ["commercial_property"],
    color: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-700",
      accent: "bg-slate-600",
      gradient: "from-slate-50 to-white",
    },
    icon: "building",
    title: `Commercial Property Investment in Australia (${yr})`,
    h1: "Commercial Property Investment in Australia",
    metaDescription: `Invest in Australian commercial property — office, retail, industrial, medical, hotel. Browse commercial real estate listings. ${upd}.`,
    intro: `Australia's commercial property market is valued at over $900 billion. Browse investment-grade office buildings, industrial warehouses, retail centres, medical facilities, and hotel assets across all major cities.`,
    sections: [
      {
        heading: "Commercial Property vs Residential Investment",
        body: "Commercial property typically offers higher rental yields (5-8% vs 3-4% for residential), longer lease terms (5-15 years vs 6-12 months), and tenants who pay outgoings. However, it requires more capital, has higher vacancy risk, and is less liquid. Commercial lending typically requires 30-40% deposits with shorter loan terms.",
      },
    ],
    faqs: [
      {
        question: "What is the minimum investment for commercial property in Australia?",
        answer: "Direct commercial property investment typically starts at $500,000-$1M for small strata offices or retail shops. Larger assets (warehouses, office buildings) start at $5M+. For smaller budgets, A-REITs on the ASX offer exposure from as little as a single share price.",
      },
      {
        question: "What commercial property yields should I expect in Australia?",
        answer: "Industrial: 4.5-6.5% (tightest cap rates, strongest demand). Office: 5-8% (CBD vs suburban). Retail: 5-7% (neighbourhood centres outperforming large malls). Medical/childcare: 5-6.5% (long leases, government-backed revenue). Hotel: 6-10% (higher risk, operational complexity).",
      },
    ],
    subcategories: [
      {
        slug: "office",
        label: "Office",
        dbValue: "office",
        title: `Office Buildings for Sale in Australia (${yr})`,
        h1: "Office Property Investment Opportunities in Australia",
        metaDescription: `Buy office property in Australia. CBD and suburban offices for sale with lease details. ${upd}.`,
        intro: "From A-grade CBD towers to suburban office parks, browse office investment opportunities across Australia's major cities.",
        faqs: [
          { question: "Is office property a good investment in Australia?", answer: "Post-COVID, Australian office markets have bifurcated. Premium/A-grade offices in CBD locations maintain strong demand, while B/C-grade suburban offices face higher vacancy. Look for buildings with long leases to quality tenants, good amenities, and flexible floor plates." },
        ],
      },
      {
        slug: "industrial",
        label: "Industrial",
        dbValue: "industrial",
        title: `Industrial Property for Sale in Australia (${yr})`,
        h1: "Industrial Property Investment in Australia",
        metaDescription: `Buy industrial property in Australia. Warehouses, logistics, manufacturing for investment. ${upd}.`,
        intro: "Industrial and logistics property is Australia's hottest commercial asset class, driven by e-commerce growth, supply chain reshoring, and data centre demand.",
        faqs: [
          { question: "Why is industrial property in demand in Australia?", answer: "E-commerce drove a 30% increase in warehouse demand since 2020. Supply chain restructuring, onshoring of manufacturing, and data centre construction are adding further demand. Vacancy rates in Sydney and Melbourne are below 2%, driving rental growth of 10-15% p.a." },
        ],
      },
      {
        slug: "retail",
        label: "Retail",
        dbValue: "retail",
        title: `Retail Property for Sale in Australia (${yr})`,
        h1: "Retail Property Investment in Australia",
        metaDescription: `Buy retail property in Australia. Shopping centres, neighbourhood retail, high-street shops. ${upd}.`,
        intro: "Neighbourhood shopping centres and convenience retail have outperformed large malls. Browse retail property investment opportunities anchored by supermarkets and essential services.",
        faqs: [
          { question: "Is retail property still a good investment?", answer: "Neighbourhood and convenience retail (anchored by Woolworths, Coles, or ALDI) remains resilient with 5-7% yields and long leases. Large discretionary malls face structural headwinds from e-commerce. The sweet spot is non-discretionary, convenience-focused retail with supermarket anchors." },
        ],
      },
      {
        slug: "medical",
        label: "Medical",
        dbValue: "medical",
        title: `Medical Property for Sale in Australia (${yr})`,
        h1: "Medical & Healthcare Property Investment in Australia",
        metaDescription: `Buy medical centre or healthcare property in Australia. Long-lease medical assets. ${upd}.`,
        intro: "Medical property offers long leases (10-15 years), government-backed revenue streams, and low vacancy. Browse medical centres, specialist clinics, and healthcare facilities for sale.",
        faqs: [
          { question: "Why is medical property attractive to investors?", answer: "Medical tenants sign long leases (10-15 years with options), pay above-market rents due to fit-out investment, and have government-backed Medicare revenue. Vacancy rates are extremely low as medical practices rarely relocate. Yields of 5-6.5% with excellent security." },
        ],
      },
      {
        slug: "childcare",
        label: "Childcare",
        dbValue: "hotel",
        title: `Childcare Centre Property for Sale in Australia (${yr})`,
        h1: "Childcare Centre Property Investment in Australia",
        metaDescription: `Buy childcare centre property in Australia. Long-lease childcare assets backed by government subsidies. ${upd}.`,
        intro: "Purpose-built childcare centres are among Australia's most sought-after commercial properties, offering 15-20 year leases backed by government subsidies (CCS).",
        faqs: [
          { question: "What yields do childcare properties offer?", answer: "Childcare centres typically trade on yields of 4.5-6%, with newer purpose-built centres at the tighter end. Long leases (15-20 years with annual CPI increases), government-backed revenue via CCS subsidies, and high barriers to new supply make them attractive to institutional and private investors." },
        ],
      },
    ],
  },

  // ─── Franchise ───
  {
    slug: "franchise",
    label: "Franchise",
    dbVerticals: ["franchise"],
    color: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      accent: "bg-purple-600",
      gradient: "from-purple-50 to-white",
    },
    icon: "star",
    title: `Franchise Opportunities in Australia (${yr})`,
    h1: "Franchise Opportunities in Australia",
    metaDescription: `Buy a franchise in Australia. Food, fitness, services, convenience — browse verified franchise listings with financials. ${upd}.`,
    intro: `Australia's franchise sector generates $180B+ in revenue annually. Browse franchise opportunities from Australia's most recognised brands — from food and fitness to home services and convenience retail. Each listing includes investment requirements, territory details, and franchisor support.`,
    sections: [
      {
        heading: "Why Buy a Franchise Instead of Starting from Scratch?",
        body: "Franchises have a significantly lower failure rate than independent businesses (around 13% vs 60% within 5 years). You get a proven business model, brand recognition, training, marketing support, and buying power. The trade-off is ongoing royalty fees (typically 4-8% of revenue) and less operational autonomy.",
      },
    ],
    faqs: [
      {
        question: "How much does a franchise cost in Australia?",
        answer: "Entry costs vary enormously: Jim's Group franchises start from $30,000-$100,000, fast food (McDonald's, KFC) requires $1M-$2M+, and fitness (F45, Anytime Fitness) costs $200,000-$500,000. Most franchisors offer financing assistance or approved lender lists.",
      },
      {
        question: "What is the most profitable franchise in Australia?",
        answer: "High-margin franchise categories include professional services (accounting, real estate), fitness, and food delivery. McDonald's franchisees average $500K+ net profit, but the entry cost reflects this. Jim's Group franchises offer strong returns relative to investment for owner-operators.",
      },
    ],
    subcategories: [
      {
        slug: "food-beverage",
        label: "Food & Beverage",
        dbValue: "food",
        title: `Food & Beverage Franchises in Australia (${yr})`,
        h1: "Food & Beverage Franchise Opportunities in Australia",
        metaDescription: `Buy a food franchise in Australia. McDonald's, Subway, Zambrero, and more. Browse food franchise listings. ${upd}.`,
        intro: "Food and beverage franchises are Australia's most popular franchise category. Browse opportunities from fast food giants to emerging healthy eating brands.",
        faqs: [
          { question: "What is the cheapest food franchise in Australia?", answer: "Sushi Sushi, Roll'd, and GYG start from $200,000-$350,000. Subway franchises can be acquired for $150,000-$350,000 depending on location. Food truck and kiosk concepts start from $50,000-$150,000." },
        ],
      },
      {
        slug: "fitness",
        label: "Fitness",
        dbValue: "fitness",
        title: `Fitness Franchises in Australia (${yr})`,
        h1: "Fitness Franchise Opportunities in Australia",
        metaDescription: `Buy a fitness franchise in Australia. F45, Anytime Fitness, gym franchises for sale. ${upd}.`,
        intro: "Australia's fitness franchise market is thriving, driven by strong health consciousness and high gym membership rates. Browse established fitness franchise opportunities.",
        faqs: [
          { question: "How much does an F45 franchise cost?", answer: "F45 franchises typically require $200,000-$400,000 total investment including franchise fee, fit-out, and working capital. Anytime Fitness is similar at $200,000-$500,000. Jetts Fitness offers a lower entry point at $150,000-$300,000." },
        ],
      },
      {
        slug: "automotive",
        label: "Automotive & Services",
        dbValue: "home_services",
        title: `Service & Automotive Franchises in Australia (${yr})`,
        h1: "Service & Automotive Franchises in Australia",
        metaDescription: `Buy a service franchise in Australia. Jim's Group, home services, automotive — browse franchise listings. ${upd}.`,
        intro: "Service and automotive franchises offer lower overheads and strong demand. From Jim's Group master franchises to automotive repair chains, browse opportunities with recurring revenue.",
        faqs: [
          { question: "How much does a Jim's franchise cost?", answer: "Jim's Group franchises range from $30,000-$80,000 depending on the division (Mowing, Cleaning, Test & Tag). Master franchises for new territories start from $250,000. Jim's offers a guaranteed income program for the first year." },
        ],
      },
    ],
  },

  // ─── Renewable Energy ───
  {
    slug: "renewable-energy",
    label: "Renewable Energy",
    dbVerticals: ["energy"],
    color: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      accent: "bg-emerald-600",
      gradient: "from-emerald-50 to-white",
    },
    icon: "zap",
    title: `Renewable Energy Investment in Australia (${yr})`,
    h1: "Renewable Energy Investment Opportunities in Australia",
    metaDescription: `Invest in Australian renewable energy — solar farms, wind projects, battery storage, hydrogen. Browse clean energy opportunities. ${upd}.`,
    intro: `Australia is undergoing one of the world's largest energy transitions, with $100B+ committed to renewable energy projects. Browse solar farms, wind farms, battery storage, hydrogen projects, and community solar opportunities.`,
    sections: [
      {
        heading: "Australia's Renewable Energy Boom",
        body: "The Australian Renewable Energy Target (RET) and state-level targets are driving unprecedented investment. NSW alone targets 12GW of new renewables by 2030. Solar and wind are now the cheapest forms of new electricity generation in Australia, and battery storage is solving intermittency. This creates opportunities for investors at every scale — from $500 community solar panels to $100M+ utility-scale projects.",
      },
    ],
    faqs: [
      {
        question: "How can I invest in renewable energy in Australia?",
        answer: "Options range from community solar programs ($500+), to direct project investment ($1M+), to ASX-listed companies and ETFs. Key listed names include AGL Energy, Origin Energy, Meridian Energy, and New Energy Solar. Green bonds offer fixed income exposure. For large-scale direct investment, solar and wind farms typically seek equity partners for $10M-$100M+ projects.",
      },
      {
        question: "What returns do renewable energy projects generate?",
        answer: "Utility-scale solar farms target 8-12% IRR, wind farms 7-11%, and battery storage 10-15%+ (rapidly improving economics). Community solar offers 5-8% returns. Revenue is supported by power purchase agreements (PPAs), renewable energy certificates (LGCs), and spot market sales.",
      },
    ],
    subcategories: [
      {
        slug: "solar",
        label: "Solar",
        dbValue: "solar",
        title: `Solar Farm Investments in Australia (${yr})`,
        h1: "Solar Farm Investment Opportunities in Australia",
        metaDescription: `Invest in Australian solar farms. Utility-scale and community solar projects for investors. ${upd}.`,
        intro: "Australia has the highest solar radiation per square metre of any continent. Browse solar farm development projects, operating assets, and community solar opportunities.",
        faqs: [
          { question: "How much does a solar farm cost in Australia?", answer: "Community solar projects: $500-$50,000 per investor. Small commercial solar: $100,000-$500,000. Utility-scale solar farms: $50M-$500M+ depending on capacity. Development-stage projects seeking equity partners typically require $5M-$50M commitments." },
        ],
      },
      {
        slug: "wind",
        label: "Wind",
        dbValue: "wind",
        title: `Wind Farm Investments in Australia (${yr})`,
        h1: "Wind Farm Investment Opportunities in Australia",
        metaDescription: `Invest in Australian wind farms. Onshore wind projects in SA, VIC, NSW. ${upd}.`,
        intro: "Australia has world-class wind resources, particularly in South Australia, Victoria, and western NSW. Browse wind farm investment and joint venture opportunities.",
        faqs: [
          { question: "Which states have the best wind resources?", answer: "South Australia leads with the highest installed capacity and best wind resources. Victoria and western NSW are the fastest-growing regions. Tasmania has excellent resources with new projects in the pipeline. Offshore wind is emerging, with Victoria leading regulatory frameworks." },
        ],
      },
      {
        slug: "battery-storage",
        label: "Battery Storage",
        dbValue: "battery",
        title: `Battery Storage Investments in Australia (${yr})`,
        h1: "Battery Storage Investment Opportunities in Australia",
        metaDescription: `Invest in Australian battery storage projects. Grid-scale batteries, BESS, energy storage. ${upd}.`,
        intro: "Battery energy storage systems (BESS) are the fastest-growing segment of Australia's energy sector, solving renewable intermittency and providing grid stability services.",
        faqs: [
          { question: "Are battery storage investments profitable?", answer: "Grid-scale BESS projects are delivering strong returns through energy arbitrage (buying cheap, selling dear), frequency control ancillary services (FCAS), and capacity payments. The Hornsdale Power Reserve (Tesla Big Battery) has earned 2-3x its initial investment. Returns of 10-15%+ IRR are being achieved." },
        ],
      },
      {
        slug: "hydrogen",
        label: "Hydrogen",
        dbValue: "community_solar",
        title: `Green Hydrogen Investments in Australia (${yr})`,
        h1: "Green Hydrogen Investment Opportunities in Australia",
        metaDescription: `Invest in Australian green hydrogen projects. Export hydrogen, electrolyser projects. ${upd}.`,
        intro: "Australia aims to be a global green hydrogen superpower, with $10B+ in announced projects. Browse hydrogen investment opportunities across production, export, and industrial applications.",
        faqs: [
          { question: "Is hydrogen a good investment in Australia?", answer: "Green hydrogen is early-stage but has enormous potential. Australia's abundant renewable energy, land, and proximity to Asian markets position it well. Government subsidies (Hydrogen Headstart program — $2B) are de-risking projects. However, most projects are pre-revenue and require patient capital." },
        ],
      },
    ],
  },

  // ─── Startups ───
  {
    slug: "startups",
    label: "Startups",
    dbVerticals: ["startup"],
    color: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-700",
      accent: "bg-indigo-600",
      gradient: "from-indigo-50 to-white",
    },
    icon: "rocket",
    title: `Startup Investment Opportunities in Australia (${yr})`,
    h1: "Startup Investment Opportunities in Australia",
    metaDescription: `Invest in Australian startups — fintech, healthtech, proptech, cleantech. Browse pre-seed to Series B opportunities. ${upd}.`,
    intro: `Australia's startup ecosystem is valued at $260B+ and growing. Browse investment opportunities in fintech, healthtech, proptech, cleantech, and agritech startups — from equity crowdfunding rounds to Series A/B raises.`,
    sections: [
      {
        heading: "How Startup Investing Works in Australia",
        body: "You can invest in Australian startups through equity crowdfunding platforms (Birchal, VentureCrowd — minimum $50-$500), angel investor networks (minimum $5,000-$50,000), or direct investment at Series A+ stages ($100,000+). The CSF regime allows retail investors to invest up to $10,000 per company per year through licensed platforms.",
      },
    ],
    faqs: [
      {
        question: "Can retail investors invest in Australian startups?",
        answer: "Yes. Since 2017, the Crowd-Sourced Funding (CSF) regime allows retail investors to invest up to $10,000 per company per year through licensed platforms like Birchal and VentureCrowd. No minimum investment — some raises accept $50. However, startup investing is high-risk; expect most investments to return zero.",
      },
      {
        question: "What returns do startup investments generate?",
        answer: "Startup returns follow a power law — most fail, but winners can return 10-100x+. Australian VC funds have historically returned 10-15% net IRR. Individual angel investments are much higher risk. Diversification across 20-30 startups is recommended. Expect a 5-10 year holding period with no liquidity.",
      },
    ],
    subcategories: [
      {
        slug: "fintech",
        label: "Fintech",
        dbValue: "fintech",
        title: `Fintech Startup Investments in Australia (${yr})`,
        h1: "Fintech Startup Investment Opportunities in Australia",
        metaDescription: `Invest in Australian fintech startups — payments, lending, wealth management, blockchain. ${upd}.`,
        intro: "Australia's fintech sector is the largest in APAC outside China, with companies like Afterpay, Airwallex, and Judo Bank leading globally. Browse current fintech investment opportunities.",
        faqs: [
          { question: "What fintech sectors are growing fastest in Australia?", answer: "B2B payments, open banking applications, BNPL alternatives, wealth management platforms, and blockchain/DeFi are seeing the most investor interest. RegTech (regulatory compliance) and InsurTech are also growing rapidly." },
        ],
      },
      {
        slug: "healthtech",
        label: "HealthTech",
        dbValue: "medtech",
        title: `HealthTech Startup Investments in Australia (${yr})`,
        h1: "HealthTech Startup Investment Opportunities in Australia",
        metaDescription: `Invest in Australian healthtech startups — telehealth, medtech, digital health, biotech. ${upd}.`,
        intro: "Australia punches above its weight in medical research and healthtech. Browse investment opportunities in telehealth, medical devices, digital health platforms, and biotech.",
        faqs: [
          { question: "Why is Australian healthtech attractive to investors?", answer: "Australia has world-class medical research infrastructure, a large public health system creating digital health demand, and R&D tax incentives (up to 43.5% refundable offset). The $200B+ healthcare sector is rapidly digitising, creating significant startup opportunities." },
        ],
      },
      {
        slug: "proptech",
        label: "PropTech",
        dbValue: "proptech",
        title: `PropTech Startup Investments in Australia (${yr})`,
        h1: "PropTech Startup Investment Opportunities in Australia",
        metaDescription: `Invest in Australian proptech startups — property management, fractional ownership, construction tech. ${upd}.`,
        intro: "Australia's $10T+ property market is ripe for disruption. Browse proptech startups tackling rental management, fractional ownership, construction efficiency, and property analytics.",
        faqs: [
          { question: "What proptech categories are most investable?", answer: "Rental management SaaS, fractional property ownership platforms, construction tech (modular, 3D printing), property data analytics, and mortgage/settlement digitisation are seeing the most VC interest in Australia." },
        ],
      },
      {
        slug: "cleantech",
        label: "CleanTech",
        dbValue: "cleantech",
        title: `CleanTech Startup Investments in Australia (${yr})`,
        h1: "CleanTech Startup Investment Opportunities in Australia",
        metaDescription: `Invest in Australian cleantech startups — green hydrogen, carbon capture, circular economy. ${upd}.`,
        intro: "Australia's energy transition is creating massive cleantech opportunities. Browse startups in green hydrogen, carbon capture, circular economy, and clean energy technology.",
        faqs: [
          { question: "What government support exists for cleantech startups?", answer: "CEFC (Clean Energy Finance Corporation) provides concessional finance. ARENA (Australian Renewable Energy Agency) offers grants. The R&D Tax Incentive provides up to 43.5% refundable offset. State governments offer additional grants and co-investment programs." },
        ],
      },
    ],
  },

  // ─── Alternatives ───
  {
    slug: "alternatives",
    label: "Alternatives",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["art", "wine"],
    color: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
      accent: "bg-rose-600",
      gradient: "from-rose-50 to-white",
    },
    icon: "gem",
    title: `Alternative Investments in Australia (${yr})`,
    h1: "Alternative Investments in Australia",
    metaDescription: `Invest in wine, art, classic cars, watches, coins, whisky in Australia. Browse alternative investment listings and platforms. ${upd}.`,
    intro: `Alternative investments — wine, art, classic cars, luxury watches, rare coins, and whisky — are Australia's fastest-growing asset class. With low correlation to equities and potential for significant capital appreciation, alternatives offer portfolio diversification beyond traditional investments.`,
    sections: [
      {
        heading: "Why Alternative Investments Are Growing in Australia",
        body: "Australians allocated 15% more to alternative assets in 2025 compared to 2024, driven by fractional ownership platforms (Masterworks, Vinovest, Maverix) making previously inaccessible assets available from $500. Fine wine has returned 13.6% p.a. over 20 years (Liv-ex 1000), art 14.1% (Artprice Global Index), and classic cars 12.5% (HAGI Top Index). Low correlation to equities makes them attractive for portfolio diversification.",
      },
      {
        heading: "Tax Treatment of Collectibles in Australia",
        body: "Collectibles held over 12 months qualify for the 50% CGT discount. SMSFs can hold collectibles but face strict rules: the asset must be insured, stored independently (not at a trustee's home), and not be used personally by members. Personal-use assets under $10,000 are CGT-exempt. Always keep purchase receipts and independent valuations for tax purposes.",
      },
    ],
    faqs: [
      {
        question: "How do I invest in wine in Australia?",
        answer: "Options include: direct purchase through auction houses (Langton's, Webb's) or fine wine merchants (min ~$500/bottle for investment-grade); fractional platforms like Vinovest or Cult Wines (min $1,000); wine funds; or building your own cellar. Focus on Penfolds Grange, Henschke Hill of Grace, and Barossa/McLaren Vale Shiraz for Australian investment-grade wines.",
      },
      {
        question: "Is art a good investment in Australia?",
        answer: "Australian art has performed well — Brett Whiteley, Sidney Nolan, and Emily Kame Kngwarreye works have appreciated 10-20% p.a. over the past decade. Contemporary Aboriginal art is an emerging category. Entry points range from $5,000 for emerging artists to $500,000+ for blue-chip works. Fractional art platforms like Masterworks and Maverix allow $500+ investments.",
      },
      {
        question: "Can I hold collectibles in an SMSF?",
        answer: "Yes, but strict ATO rules apply. Collectibles (art, wine, jewellery, cars, coins) in an SMSF must be: insured within 7 days of acquisition, stored away from members' premises, not leased or used by related parties, and decisions documented in writing. Penalties for non-compliance are severe.",
      },
    ],
    subcategories: [
      {
        slug: "wine",
        label: "Wine",
        dbValue: "wine",
        title: `Wine Investment in Australia (${yr})`,
        h1: "Wine Investment Opportunities in Australia",
        metaDescription: `Invest in fine wine in Australia. Penfolds Grange, Barossa Shiraz, wine funds, fractional wine platforms. ${upd}.`,
        intro: "Fine wine has returned 13.6% p.a. over 20 years. Australia produces some of the world's most collectible wines — Penfolds Grange, Henschke Hill of Grace, and premium Barossa Shiraz lead the way.",
        faqs: [
          { question: "What Australian wines are investment-grade?", answer: "Penfolds Grange (consistently ranks in Liv-ex Power 100), Henschke Hill of Grace, Torbreck RunRig, Chris Ringland, Clarendon Hills Astralis, and premium Barossa Shiraz. Old vintages (pre-2000) of Grange regularly sell for $1,000-$5,000+ per bottle." },
          { question: "How much do I need to start wine investing?", answer: "Direct: $500-$1,000 per investment-grade bottle. Vinovest: $1,000 minimum. Cult Wines: $10,000 minimum portfolio. Wine funds: typically $50,000+ minimum. Community storage/insurance adds $10-20/bottle/year." },
        ],
      },
      {
        slug: "art",
        label: "Art",
        dbValue: "art",
        title: `Art Investment in Australia (${yr})`,
        h1: "Art Investment Opportunities in Australia",
        metaDescription: `Invest in Australian art. Contemporary, Aboriginal, fractional art platforms. Browse art investment opportunities. ${upd}.`,
        intro: "Australian art has delivered strong returns, with blue-chip works by Brett Whiteley, Sidney Nolan, and Emily Kame Kngwarreye appreciating 10-20% p.a. Fractional platforms are democratising access.",
        faqs: [
          { question: "How do I start investing in art in Australia?", answer: "Entry points: fractional art platforms (Masterworks, Maverix) from $500; emerging Australian artists from $2,000-$10,000 at galleries; mid-career artists $10,000-$100,000 at auction; blue-chip works $100,000+. Start with galleries, art fairs (Sydney Contemporary, Melbourne Art Fair), and auction houses (Sotheby's, Christie's, Deutscher and Hackett)." },
        ],
      },
      {
        slug: "cars",
        label: "Classic Cars",
        dbValue: "wine",
        title: `Classic Car Investment in Australia (${yr})`,
        h1: "Classic Car Investment in Australia",
        metaDescription: `Invest in classic and collectible cars in Australia. Australian muscle cars, European classics, investment returns. ${upd}.`,
        intro: "Classic cars have returned 12.5% p.a. globally (HAGI Top Index). Australian muscle cars — Ford GT-HO, Holden Torana A9X, Bathurst winners — have seen exceptional appreciation.",
        faqs: [
          { question: "What classic cars are best for investment in Australia?", answer: "Australian: Ford Falcon GTHO Phase III ($1M+), Holden Torana A9X ($500K+), early Holden Monaros. International: Ferrari 250 series, Porsche 911 (air-cooled), Mercedes 300SL. Entry-level investment cars start from $50,000-$100,000 for appreciating models." },
        ],
      },
      {
        slug: "watches",
        label: "Watches",
        dbValue: "wine",
        title: `Watch Investment in Australia (${yr})`,
        h1: "Luxury Watch Investment in Australia",
        metaDescription: `Invest in luxury watches in Australia. Rolex, Patek Philippe, Audemars Piguet investment analysis. ${upd}.`,
        intro: "Luxury watches have emerged as a legitimate alternative asset class, with Rolex, Patek Philippe, and Audemars Piguet models appreciating 8-15% p.a. over the past decade.",
        faqs: [
          { question: "Which watches are best for investment?", answer: "Rolex: Daytona, Submariner, GMT-Master II (especially discontinued models). Patek Philippe: Nautilus 5711, Aquanaut. Audemars Piguet: Royal Oak. Key factors are scarcity, condition, box/papers, and provenance. Buy from authorised dealers or reputable pre-owned dealers." },
        ],
      },
      {
        slug: "coins",
        label: "Rare Coins",
        dbValue: "wine",
        title: `Rare Coin Investment in Australia (${yr})`,
        h1: "Rare Coin Investment in Australia",
        metaDescription: `Invest in rare Australian coins. Pre-decimal, gold sovereigns, numismatic collectibles. ${upd}.`,
        intro: "Australian rare coins — pre-decimal pennies, gold sovereigns, and proof sets — have a dedicated collector market with strong long-term appreciation for key rarities.",
        faqs: [
          { question: "What Australian coins are worth investing in?", answer: "Key rarities: 1930 Australian Penny ($1M+), 1813 Holey Dollar ($500K+), Adelaide Pound ($100K+). More accessible: pre-decimal proof sets ($5,000-$50,000), gold sovereigns ($500-$5,000), and Type II/III varieties. Quality (MS65+ grading) and rarity drive returns." },
        ],
      },
      {
        slug: "whisky",
        label: "Whisky",
        dbValue: "wine",
        title: `Whisky Investment in Australia (${yr})`,
        h1: "Whisky Investment in Australia",
        metaDescription: `Invest in whisky in Australia. Scotch, Australian single malt, cask investment. ${upd}.`,
        intro: "Rare whisky has been the best-performing collectible of the past decade, returning 586% over 10 years (Knight Frank Wealth Report). Australian whisky (Sullivans Cove, Starward) is gaining global recognition.",
        faqs: [
          { question: "How do I invest in whisky in Australia?", answer: "Bottles: invest in limited releases from Scotch distilleries (Macallan, Dalmore) or Australian distilleries (Sullivans Cove, Starward). Casks: buy a full cask ($5,000-$50,000+) and mature it in a bonded warehouse. Platforms: Whisky Investment Direct, Caskable. Focus on distilleries with brand power and proven secondary market demand." },
        ],
      },
    ],
  },

  // ─── Private Credit ───
  {
    slug: "private-credit",
    label: "Private Credit",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["private_credit"],
    color: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      text: "text-teal-700",
      accent: "bg-teal-600",
      gradient: "from-teal-50 to-white",
    },
    icon: "credit-card",
    title: `Private Credit & P2P Lending in Australia (${yr})`,
    h1: "Private Credit & P2P Lending in Australia",
    metaDescription: `Invest in Australian private credit — La Trobe Financial, Qualitas, Metrics Credit Partners. Yields 6-10% p.a. ${upd}.`,
    intro: `Private credit is Australia's fastest-growing alternative asset class, offering yields of 6-10% p.a. — significantly above term deposits. Browse private debt funds, peer-to-peer lending platforms, and real estate debt opportunities from established Australian fund managers.`,
    sections: [
      {
        heading: "What Is Private Credit?",
        body: "Private credit refers to non-bank lending — debt provided by fund managers, institutional investors, or individuals directly to borrowers. In Australia, private credit funds typically lend to commercial real estate developers, SMEs, and infrastructure projects. Returns come from interest payments, with the underlying loans secured by property or assets.",
      },
    ],
    faqs: [
      {
        question: "What returns do private credit funds offer in Australia?",
        answer: "Australian private credit funds typically target 6-10% p.a. net returns. La Trobe Financial's Credit Fund has delivered ~6.5% p.a. Qualitas targets 8-10% for their real estate debt funds. Returns are primarily income (interest), with low volatility compared to equities.",
      },
      {
        question: "How safe is private credit investment?",
        answer: "Private credit carries default risk, but Australian funds have historically had low loss rates (<1% for established managers). Security is typically first-mortgage real estate (60-70% LVR). Key risks include economic downturn, property value declines, and liquidity constraints (most funds have 3-12 month redemption periods).",
      },
    ],
    subcategories: [],
  },

  // ─── Infrastructure ───
  {
    slug: "infrastructure",
    label: "Infrastructure",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["infrastructure"],
    color: {
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      text: "text-cyan-700",
      accent: "bg-cyan-600",
      gradient: "from-cyan-50 to-white",
    },
    icon: "git-branch",
    title: `Infrastructure Investment in Australia (${yr})`,
    h1: "Infrastructure Investment Opportunities in Australia",
    metaDescription: `Invest in Australian infrastructure — toll roads, airports, utilities, ports. Listed and unlisted funds. ${upd}.`,
    intro: `Infrastructure assets — toll roads, airports, utilities, and ports — offer stable, inflation-linked cash flows with long duration. Browse listed and unlisted infrastructure investment opportunities in Australia.`,
    sections: [
      {
        heading: "Why Infrastructure Is Attractive to Investors",
        body: "Infrastructure assets typically have monopoly or near-monopoly positions, government-backed revenue streams, and inflation-linked pricing mechanisms. They provide stable, predictable cash flows with lower correlation to equity markets. Australian superannuation funds allocate 10-15% to infrastructure, and individual investors can access the asset class through ASX-listed vehicles or wholesale funds.",
      },
    ],
    faqs: [
      {
        question: "How can individual investors access infrastructure?",
        answer: "ASX-listed options include Transurban (TCL — toll roads), APA Group (APA — gas pipelines), Atlas Arteria (ALX — toll roads), and infrastructure ETFs. Unlisted funds from Macquarie, IFM, and AMP Capital offer wholesale investors direct asset exposure with higher minimums ($20,000-$100,000+).",
      },
    ],
    subcategories: [],
  },

  // ─── Funds ───
  {
    slug: "funds",
    label: "Funds",
    dbVerticals: ["fund"],
    color: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      accent: "bg-violet-600",
      gradient: "from-violet-50 to-white",
    },
    icon: "dollar-sign",
    title: `Investment Funds in Australia (${yr})`,
    h1: "Investment Funds in Australia",
    metaDescription: `Browse Australian investment funds — hedge funds, PE, managed funds, REITs, SIV-complying funds. Compare minimums and returns. ${upd}.`,
    intro: `Australia's managed fund industry manages $4T+ in assets. Browse hedge funds, private equity, managed funds, REITs, private credit, and SIV-complying funds. Each listing includes minimum investment, strategy, and performance history.`,
    sections: [
      {
        heading: "Types of Investment Funds Available in Australia",
        body: "Managed Funds (Vanguard, Betashares — from $200), Hedge Funds (Regal, Bronte, Antipodes — $50K-$500K minimum), Private Equity (wholesale investors only — $100K+), REITs (ASX-listed from one share price), Private Credit (La Trobe, Qualitas — $20K+), and SIV-Complying Funds (for Significant Investor Visa applicants — $5M+ structured portfolio).",
      },
    ],
    faqs: [
      {
        question: "What is an SIV-complying fund?",
        answer: "Significant Investor Visa (SIV — subclass 188C) applicants must invest $5M in complying investments: at least $500K in venture capital/growth PE, at least $1.5M in approved managed funds, and the balance in balancing investments (ASX, bonds, property — excluding residential). SIV-complying funds are specifically structured to meet these requirements.",
      },
      {
        question: "What is the minimum investment for a hedge fund in Australia?",
        answer: "Most Australian hedge funds require wholesale investor status (net assets >$2.5M or income >$250K p.a.) and minimum investments of $50,000-$500,000. Some listed alternatives like Regal Partners (RPL) and Magellan (MFG) offer ASX-listed vehicles with no minimum.",
      },
    ],
    subcategories: [
      {
        slug: "hedge-funds",
        label: "Hedge Funds",
        dbValue: "hedge_fund",
        title: `Hedge Funds in Australia (${yr})`,
        h1: "Hedge Fund Investment Opportunities in Australia",
        metaDescription: `Browse Australian hedge funds. Long-short, macro, quantitative strategies. Compare returns and minimums. ${upd}.`,
        intro: "Australia has a sophisticated hedge fund industry managing $50B+ in assets. Browse funds across long-short equity, global macro, quantitative, and event-driven strategies.",
        faqs: [
          { question: "What are the best-performing Australian hedge funds?", answer: "Regal Partners, Bronte Capital, and Antipodes Partners have delivered strong long-term returns. Performance varies by strategy and market conditions. Past performance does not guarantee future returns. Look for consistent risk-adjusted returns (Sharpe ratio >1) over 5+ years." },
        ],
      },
      {
        slug: "private-credit-funds",
        label: "Private Credit",
        dbValue: "private_credit",
        title: `Private Credit Funds in Australia (${yr})`,
        h1: "Private Credit Funds in Australia",
        metaDescription: `Browse Australian private credit funds. La Trobe, Qualitas, Metrics Credit Partners. Yields 6-10% p.a. ${upd}.`,
        intro: "Private credit funds offer higher yields than term deposits with regular income distributions. Browse Australia's leading private debt managers.",
        faqs: [
          { question: "Which private credit funds are available to retail investors?", answer: "La Trobe Financial Credit Fund ($20,000 minimum), Metrics Credit Partners Direct Income Fund ($50,000), and some Qualitas funds accept retail investors. Most target 6-10% p.a. returns with monthly or quarterly distributions." },
        ],
      },
      {
        slug: "reits",
        label: "REITs",
        dbValue: "reit",
        title: `Australian REITs for Investment (${yr})`,
        h1: "A-REITs — Australian Real Estate Investment Trusts",
        metaDescription: `Browse Australian REITs. Compare Goodman, Stockland, Dexus by sector, yield, and NTA discount. ${upd}.`,
        intro: "A-REITs offer liquid, diversified property exposure on the ASX. Browse industrial, retail, office, and diversified trusts with current yield and NTA data.",
        faqs: [
          { question: "What are the best Australian REITs?", answer: "By sector: Industrial — Goodman Group (GMG), Centuria Industrial REIT. Office — Dexus, Centuria Office REIT. Retail — Scentre Group (Westfield), Vicinity Centres. Diversified — Stockland, Mirvac, Charter Hall. Industrial REITs have been the strongest performers due to logistics demand." },
        ],
      },
      {
        slug: "siv-complying",
        label: "SIV Complying",
        dbValue: "siv_complying",
        title: `SIV Complying Funds in Australia (${yr})`,
        h1: "SIV Complying Investment Funds in Australia",
        metaDescription: `Browse SIV-complying funds for Significant Investor Visa (subclass 188C) applicants. $5M structured portfolios. ${upd}.`,
        intro: "Significant Investor Visa (SIV) applicants must invest $5M in complying investments. Browse funds specifically structured to meet FIRB and Home Affairs requirements.",
        faqs: [
          { question: "How much do I need for an SIV in Australia?", answer: "The SIV requires a $5M investment split: at least $500K in VC/growth PE (10%), at least $1.5M in approved managed funds (30%), and the balance ($3M) in balancing investments. Fund managers like Ellerston, Regal, and Pengana offer pre-packaged SIV portfolios." },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// Lookup helpers
// ═══════════════════════════════════════════════════════════════════

export function getAllInvestCategories(): InvestCategory[] {
  return categories;
}

export function getInvestCategoryBySlug(slug: string): InvestCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getAllInvestCategorySlugs(): string[] {
  return categories.map((c) => c.slug);
}

export function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string
): InvestSubcategory | undefined {
  const cat = getInvestCategoryBySlug(categorySlug);
  if (!cat) return undefined;
  return cat.subcategories.find((s) => s.slug === subcategorySlug);
}

export function getAllSubcategorySlugs(): { category: string; subcategory: string }[] {
  return categories.flatMap((c) =>
    c.subcategories.map((s) => ({ category: c.slug, subcategory: s.slug }))
  );
}

/**
 * Build a Supabase filter for a given category.
 * Returns the vertical values and optional sub_category filter.
 */
export function getCategoryDbFilter(cat: InvestCategory): {
  verticals: string[];
  subCategories?: string[];
} {
  if (cat.dbFundSubCategories && cat.dbFundSubCategories.length > 0) {
    return {
      verticals: cat.dbVerticals,
      subCategories: cat.dbFundSubCategories,
    };
  }
  return { verticals: cat.dbVerticals };
}
