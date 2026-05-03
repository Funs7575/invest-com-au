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
        dbValue: "viticulture",
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
        dbValue: "childcare",
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
        dbValue: "automotive",
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
        dbValue: "hydrogen",
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
        dbValue: "healthtech",
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
        dbValue: "cars",
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
        dbValue: "watches",
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
        dbValue: "coins",
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
        dbValue: "whisky",
        title: `Whisky Investment in Australia (${yr})`,
        h1: "Whisky Investment in Australia",
        metaDescription: `Invest in whisky in Australia. Scotch, Australian single malt, cask investment. ${upd}.`,
        intro: "Rare whisky has been the best-performing collectible of the past decade, returning 586% over 10 years (Knight Frank Wealth Report). Australian whisky (Sullivans Cove, Starward) is gaining global recognition.",
        faqs: [
          { question: "How do I invest in whisky in Australia?", answer: "Bottles: invest in limited releases from Scotch distilleries (Macallan, Dalmore) or Australian distilleries (Sullivans Cove, Starward). Casks: buy a full cask ($5,000-$50,000+) and mature it in a bonded warehouse. Platforms: Whisky Investment Direct, Caskable. Focus on distilleries with brand power and proven secondary market demand." },
        ],
      },
      {
        slug: "sports-memorabilia",
        label: "Sports Memorabilia",
        dbValue: "sports_memorabilia",
        title: `Sports Memorabilia Investment in Australia (${yr})`,
        h1: "Sports Memorabilia & Trading Card Investment in Australia",
        metaDescription: `Invest in Australian sports memorabilia and trading cards. Cricket, AFL, NRL, Olympic memorabilia, graded cards. ${upd}.`,
        intro: "Sports memorabilia and graded trading cards have emerged as a recognised alternative asset class. Australian cricket (Bradman-era bats and signed jerseys), AFL premiership memorabilia, and graded NRL/AFL cards have shown strong long-term appreciation, particularly for items with documented provenance.",
        faqs: [
          { question: "What sports memorabilia is worth investing in Australia?", answer: "Cricket: signed Bradman items ($50K-$500K+), Test match-worn baggy greens, signed bats from premiership-winning teams. AFL: premiership guernseys, signed Brownlow medallist items, jumpers worn in grand finals. NRL: Origin-worn jerseys, premiership memorabilia. Graded cards (PSA 10 or BGS 9.5+) of star players from key sets — Select, Stadium Club, Topps Chrome — typically lead the modern card market." },
          { question: "How do I authenticate sports memorabilia?", answer: "Use established auction houses (Mossgreen, Charles Leski, Lawsons) which provide chain-of-custody documentation. Card grading services PSA, BGS, and SGC are the recognised authorities for graded cards. Avoid items without provenance or third-party authentication — counterfeit signed items are common in this market." },
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

  // ─── Royalties ───
  {
    slug: "royalties",
    label: "Royalties",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["royalty_stream"],
    color: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
      accent: "bg-rose-600",
      gradient: "from-rose-50 to-white",
    },
    icon: "coins",
    title: `Invest in Royalty Streams in Australia (${yr})`,
    h1: "Invest in Royalty Streams in Australia",
    metaDescription: `Mining royalties (Deterra DRR, Elemental Altus), music catalogue royalties, IP / patent royalties and oil & gas overriding royalties. ${upd}.`,
    intro: `Royalty income — paid as a percentage of revenue or net profits from an underlying asset — sits between bonds and equity in the capital stack. Australian retail investors can access mining royalties via ASX names like Deterra (DRR), or direct music, IP and petroleum royalty deals via the wholesale market.`,
    sections: [
      {
        heading: "What a royalty actually pays",
        body: "A royalty is a contractual right to a slice of revenue or net profits, separate from the equity or debt of the operator. The economic position is closer to a preferred bond than common equity — payments are senior to dividends, capped at the contracted percentage, and not exposed to operator cost blow-outs. The trade-off is no upside beyond the contracted rate and exposure to underlying production decline.",
      },
      {
        heading: "Australian royalty market context",
        body: "The Australian royalty market is dominated by mining royalties — the legacy of state-government held royalties on iron ore, coal and gold, plus a small cohort of private royalty deeds. Deterra Royalties (ASX: DRR) sits at the centre of the listed market, with its Mining Area C royalty over BHP delivering the bulk of distributable cash. Petroleum royalties are concentrated in WA, QLD and the NT, overlapping with state royalty regimes and federal PRRT.",
      },
    ],
    faqs: [
      {
        question: "How are royalty payments taxed for Australian residents?",
        answer: "Royalties received by an Australian resident are assessable as ordinary income under section 6-5 of ITAA 1997 — they are not capital gains and the 50% CGT discount does not apply. Mining and petroleum royalties paid to non-residents are subject to royalty withholding tax under section 12-280 of the TAA, generally 30% but reduced by applicable double-tax agreements (often to 5% or 10%).",
      },
      {
        question: "Can retail investors access royalty deals directly?",
        answer: "Most direct royalty deals are wholesale-only, relying on the section 708 carve-outs from the disclosure regime. Retail investors get exposure indirectly through ASX-listed royalty companies (DRR, ELT) or registered managed investment schemes that hold royalty assets.",
      },
      {
        question: "What minimum allocation is typical for direct royalty deals?",
        answer: "Direct mining or petroleum royalty acquisitions typically need $250,000–$5M. Music catalogue secondary sales on Royalty Exchange start at $5,000 but most institutional catalogues clear at $500K+. ASX-listed royalty equities have no minimum beyond standard brokerage.",
      },
    ],
    subcategories: [],
  },

  // ─── Income-Asset Businesses ───
  {
    slug: "income-assets",
    label: "Income-Asset Businesses",
    dbVerticals: ["business"],
    color: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      accent: "bg-emerald-600",
      gradient: "from-emerald-50 to-white",
    },
    icon: "wallet",
    title: `Income-Generating Asset Businesses in Australia (${yr})`,
    h1: "Income-Generating Asset Businesses in Australia",
    metaDescription: `Vending routes, ATM networks, car washes, laundromats, self-storage and billboard rights — cash-flow businesses with $30K–$10M entry tickets. ${upd}.`,
    intro: `Vending routes, ATM networks, car washes, laundromats, self-storage and billboard rights — physical-asset businesses bought for the cash flow they throw off rather than capital growth. Entry tickets from $30,000 to $10M, net yields from 6% to 25%, and a wide spectrum of owner-time commitment.`,
    sections: [
      {
        heading: "Yield is not return",
        body: "Headline net yield on an income-asset business is the cash return after operating costs but before financing, tax, replacement capex and the seller's exit value. Sustainable long-term return on capital is typically 30%–60% of the headline yield once equipment depreciation, lease renewal contingency and your owner-time are properly costed. Always model a 7–10 year horizon, not a one-year yield.",
      },
      {
        heading: "Australian income-asset market context",
        body: "The market is fragmented and almost entirely unbranded at the small-business end. Self-storage and billboard rights have institutional buyers (NSR, Storage King, oOh!media, JCDecaux); the rest is dominated by owner-operators acquiring and rolling up portfolios. Pricing is typically quoted as a multiple of seller's discretionary earnings (SDE) — 1.5×–3× for vending and ATM routes, 2×–4× for car washes and laundromats, 6–10× for self-storage facilities.",
      },
    ],
    faqs: [
      {
        question: "How is GST treated on these business acquisitions?",
        answer: "Going-concern transfers are GST-free under section 38-325 of the GST Act when the seller transfers all assets necessary to continue operating and both parties agree in writing. Asset-only sales not meeting the going-concern test attract 10% GST. Commercial freehold component (e.g. self-storage land, car wash freehold) may be taxed under the margin scheme if eligible.",
      },
      {
        question: "What yields should I realistically expect?",
        answer: "Net yield ranges by asset class: vending 8%–25%, ATMs 5%–25%, car washes 8%–20%, laundromats 10%–18%, self-storage 6%–9% (institutional bid-up), billboards 15%–40% on owner-cleared land. Higher headline yields almost always reflect lower asset quality.",
      },
      {
        question: "How passive are these businesses really?",
        answer: "Passive on a spectrum. Self-storage with an outsourced manager is genuinely passive (4–8 hours/month). Vending and ATM routes need 10–30 hours/week if owner-managed, near-zero if route-management is contracted out at 15%–25% of gross revenue. Car washes and laundromats are part-time-active.",
      },
    ],
    subcategories: [],
  },

  // ─── ASX IPO Calendar ───
  {
    slug: "ipo-calendar",
    label: "ASX IPO Calendar",
    dbVerticals: ["startup"],
    color: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-700",
      accent: "bg-indigo-600",
      gradient: "from-indigo-50 to-white",
    },
    icon: "calendar",
    title: `ASX IPO Calendar (${yr}) — Upcoming Australian IPOs`,
    h1: "ASX IPO Calendar",
    metaDescription: `Track upcoming ASX IPOs and recent Australian listings. Broker priority allocations, retail allocation rules, lockup periods. ${upd}.`,
    intro: `Upcoming Australian IPOs, recent listings and how to access ASX offers as a retail investor — broker priority allocations, public offers, OnMarket aggregation and lockup mechanics.`,
    sections: [
      {
        heading: "How to access ASX IPOs as a retail investor",
        body: "Three primary routes: broker priority allocations through CommSec, nabtrade, Morgans, Bell Direct or Macquarie Direct; broker-managed offers via Morgans, Bell Potter, E&P, Wilsons or Canaccord (where you typically need a meaningful trading or wealth relationship); and general public offers attached to the prospectus, accessible via OnMarket or directly via BPAY application.",
      },
      {
        heading: "Retail vs institutional allocation split",
        body: "Retail allocations on Australian IPOs typically run 5%–15% of the total raise. Institutional priority bookbuild takes the bulk. Larger IPOs (above $500M raise) tend to have higher retail allocations because spread requirements demand a retail tail; smaller mid-cap IPOs often allocate >90% to institutions and broker-priority retail.",
      },
    ],
    faqs: [
      {
        question: "How do ASX IPOs perform vs the index historically?",
        answer: "Australian IPO first-day returns average around 7%–10% (ASIC, SIRCA database) but median first-day return is closer to flat — averages are skewed by the tail of high-pop deals. 12-month post-IPO returns are mixed; IPOs underperform the ASX 200 over the medium term on average, with significant dispersion. Picking IPOs that beat the index requires real research.",
      },
      {
        question: "Can I get an allocation as a small retail investor?",
        answer: "Yes for general public offers (apply via prospectus or OnMarket from $1,000–$2,500) and for smaller-cap IPOs through CommSec, nabtrade and OnMarket. Marquee large-cap IPOs are heavily oversubscribed and retail allocations are scaled meaningfully. A private wealth or premium-broker relationship is the practical route to consistent allocations.",
      },
      {
        question: "What is a lockup period?",
        answer: "Lockups (escrow) restrict pre-IPO shareholders from selling for 6, 12 or 24 months post-listing. ASX-imposed escrow applies under Listing Rule Chapter 9 to vendors of mining and biotech companies. Discretionary escrow is negotiated by the corporate advisor. Lockup expiry days frequently trigger meaningful share-price selling pressure.",
      },
    ],
    subcategories: [],
  },

  // ─── Pre-IPO ───
  {
    slug: "pre-ipo",
    label: "Pre-IPO",
    dbVerticals: ["startup"],
    color: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      accent: "bg-red-600",
      gradient: "from-red-50 to-white",
    },
    icon: "trophy",
    title: `Pre-IPO Investing in Australia (${yr}) — Wholesale Only`,
    h1: "Pre-IPO Investing in Australia",
    metaDescription: `Late-stage private placements before IPO — wholesale only. Sophisticated investor (s708) requirements, deal structures, Australian platforms and risks. ${upd}.`,
    intro: `Late-stage private company investments before initial public offering — accessible only to sophisticated and wholesale investors under the Corporations Act section 708 exemptions. Material risks, illiquidity and IPO timing variance.`,
    sections: [
      {
        heading: "Wholesale and sophisticated investors only",
        body: "Pre-IPO deals are structured as private placements relying on section 708 disclosure exemptions. Sophisticated investor (s708(8)): gross income of $250,000+ for each of the last two years, or net assets of $2.5M (subject to Reg 6D.2.03 calculation excluding the family home). Wholesale investor (s708(11)): accountant's certificate confirming the equivalent thresholds, or professional investor status. Retail investors cannot access these deals directly.",
      },
      {
        heading: "Australian platforms and channels",
        body: "PrimaryMarkets dominates the secondary marketplace for late-stage private company shares. OnMarket Pre-IPO runs primary issuance for wholesale investors. Broker syndicate desks at Macquarie Capital, UBS Australia, Morgans, Bell Potter and Canaccord Genuity manage pre-IPO rounds for wholesale and HNW clients. Equity crowdfunding under CSF (s738) is a separate retail-accessible regime, capped at $10K per investor per company.",
      },
    ],
    faqs: [
      {
        question: "Can a retail investor in Australia invest in pre-IPO?",
        answer: "Generally no — direct pre-IPO investments are wholesale-only under section 708. The exceptions are equity crowdfunding under the CSF regime (section 738) which allows retail investment up to $10,000 per company per year through licensed CSF intermediaries like Birchal and Equitise, and ASX-listed pre-IPO funds which give indirect listed exposure to a basket of pre-IPO investments.",
      },
      {
        question: "What's the realistic distribution of pre-IPO returns?",
        answer: "Pre-IPO is glamorised because winners are public. The realistic individual-deal distribution: ~20–30% deliver intended IPO timing and meaningful uplift, ~30–40% flat or modestly positive after IPO with delays, ~20–30% stall (no IPO in the expected window, capital locked), ~10–20% material capital impairment or total loss. Diversify across 8–15 deals; size as a single-digit-percent allocation of total assets.",
      },
      {
        question: "How are pre-IPO gains taxed?",
        answer: "Capital gains on pre-IPO shares held more than 12 months by individuals or trusts qualify for the 50% CGT discount. Convertible notes have specific TOFA treatment — conversion triggers CGT event G3 with cost base equal to conversion price plus accrued interest. Division 83A ESS startup concessions can apply for genuine startups under $50M revenue. Always engage a tax adviser.",
      },
    ],
    subcategories: [],
  },

  // ─── Bonds & Fixed Income ───
  {
    slug: "bonds",
    label: "Bonds",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["bond"],
    color: {
      bg: "bg-sky-50",
      border: "border-sky-200",
      text: "text-sky-700",
      accent: "bg-sky-600",
      gradient: "from-sky-50 to-white",
    },
    icon: "landmark",
    title: `Australian Bonds & Fixed Income Investing (${yr})`,
    h1: "Australian Bonds & Fixed Income",
    metaDescription: `Australian Government Bonds (ACGB), corporate bonds, ASX bond ETFs (VGB, AGVT, IAF) and FIIG / XTB access. Yield curve, minimum sizes, tax. ${upd}.`,
    intro: `Australian fixed income spans Australian Government Bonds (ACGBs), semi-government issuance, corporate bonds, and the listed-bond ETF wrapper market. The asset class trades off equity-like growth for contractual coupons and a defined repayment date — the trade-off is interest-rate risk, credit risk, and lower long-run returns than equities.`,
    sections: [
      {
        heading: "How Australian retail investors actually access bonds",
        body: "Direct ACGB access via the AOFM's exchange-traded Treasury bonds (eAGBs) on the ASX from any standard brokerage account, with $100 face-value parcels. Listed bond ETFs are the most liquid retail wrapper: Vanguard VGB (Australian government), Betashares AGVT (long-duration government), iShares IAF (composite Aussie bond), and Vanguard VAF cover most of the curve. FIIG Securities is the dominant retail/wholesale corporate bond broker in Australia, with $10,000 minimum parcels. XTB lists exchange-traded corporate bonds on the ASX. Most direct corporate bond issuance is wholesale-only under section 708.",
      },
      {
        heading: "Reading the Australian yield curve",
        body: "The 3-year and 10-year ACGB yields are the headline benchmarks the RBA, futures markets and corporate bond spreads price off. A normal curve slopes upward — longer maturities offer higher yields. Inversion (3y above 10y) has historically preceded slowdowns. Credit spreads — corporate yield minus government yield — widen in stress and compress in benign markets. Investment-grade A-rated Australian corporate spreads typically run 80–180bps over swap; sub-investment-grade widens materially.",
      },
      {
        heading: "Risks specific to fixed income",
        body: "Interest-rate risk is the dominant driver: a 1% rise in yields drops a 10-year bond's price by roughly 8–9%. Credit risk applies to corporate and sub-sovereign issuers — defaults are rare in IG but recovery rates compress prices well before default. Inflation risk erodes the real value of fixed coupons; ACGB inflation-linked bonds (TIBs) hedge this directly. Liquidity is thinner than equities outside the most-traded eAGBs and major corporate ETFs.",
      },
    ],
    faqs: [
      {
        question: "What are the most popular ASX-listed bond ETFs in Australia?",
        answer: "Vanguard VGB (Australian government, ~0.16% MER), Vanguard VAF (composite Aussie bond, 0.10% MER), iShares IAF (Aussie composite, 0.15% MER), Betashares AGVT (long-duration government), Betashares CRED (investment-grade corporate), and Vanguard VBND (global aggregate, AUD-hedged) cover most allocation needs. ETFs trade like shares with normal brokerage but no minimum face-value parcel.",
      },
      {
        question: "How are bond coupons and capital gains taxed in Australia?",
        answer: "Coupon interest is assessable as ordinary income under section 6-5 of ITAA 1997 in the year received. Capital gain or loss on disposal is calculated under the CGT rules; individuals and trusts qualify for the 50% CGT discount on bonds held over 12 months, but the Traditional Securities rules (Division 16E) can recharacterise some of the gain as ordinary income for deeply-discounted bonds. SMSFs receive coupons taxed at 15% in accumulation phase.",
      },
      {
        question: "What's the minimum to buy a corporate bond directly?",
        answer: "FIIG Securities typically lists $10,000 minimum parcels for retail corporate bonds. XTB exchange-traded bonds on the ASX trade in standard share parcels (no fixed minimum beyond brokerage). Direct wholesale corporate bond issues commonly require $500,000+ under the section 708 wholesale carve-out. The ETF route avoids the minimum-parcel issue entirely.",
      },
    ],
    subcategories: [],
  },

  // ─── Hybrid Securities ───
  {
    slug: "hybrid-securities",
    label: "Hybrid Securities",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["hybrid"],
    color: {
      bg: "bg-stone-50",
      border: "border-stone-200",
      text: "text-stone-700",
      accent: "bg-stone-600",
      gradient: "from-stone-50 to-white",
    },
    icon: "shield",
    title: `Australian Hybrid Securities & Capital Notes (${yr})`,
    h1: "Australian Hybrid Securities & Capital Notes",
    metaDescription: `ASX bank hybrids, capital notes and subordinated debt — APRA Basel III tier, conversion risk, distribution stopper rules. ${upd}.`,
    intro: `Hybrid securities sit between debt and equity in the bank capital stack. Australian bank hybrids — issued by CBA, NAB, Westpac, ANZ and Macquarie — pay franked distributions at a margin over BBSW, with mandatory conversion triggers tied to APRA's regulatory capital framework. Higher running yield than senior debt comes with materially more risk than retail investors typically appreciate.`,
    sections: [
      {
        heading: "Where hybrids sit in the bank capital stack",
        body: "Australian bank hybrids are typically Additional Tier 1 (AT1) capital under APRA's Basel III framework. AT1 instruments rank below senior unsecured debt, below Tier 2 subordinated debt, and above ordinary equity. They carry non-cumulative discretionary distributions (the issuer can skip a coupon without triggering default), a non-viability conversion trigger (APRA can force conversion to ordinary shares if the issuer is non-viable), and a capital-trigger conversion (mandatory conversion if Common Equity Tier 1 falls below 5.125%).",
      },
      {
        heading: "Pricing and yield mechanics",
        body: "Most ASX bank hybrids price at a margin over the 90-day BBSW (Bank Bill Swap Rate), with quarterly franked distributions. The grossed-up running yield (cash yield plus franking credits) typically runs 4.0%–6.0% above BBSW. Examples include CBAPI, NABPF, WBCPK and ANZPI. APRA announced in late 2024 that AT1 instruments will be phased out of bank capital — replaced by Tier 2 — which has materially compressed new-issuance margins and shortened the runway for the asset class as a whole.",
      },
      {
        heading: "Risks specific to hybrids",
        body: "Conversion risk: in stress scenarios, hybrids convert to shares at issuer-favourable ratios that can crystallise material losses. Distribution-stopper risk: APRA can force the issuer to skip distributions without triggering default. Liquidity is thinner than equities — bid-ask spreads widen in stress. Wholesale-only carve-outs apply to some new issues. The asset class behaved more like equity than debt during the March 2020 COVID stress, dropping 20–30% before recovering.",
      },
    ],
    faqs: [
      {
        question: "How are hybrid distributions taxed in Australia?",
        answer: "Distributions on Australian bank hybrids are typically franked dividends, treated under the imputation system. Australian-resident individuals gross up the distribution by the franking credit, pay tax at marginal rate, and offset franking credits against tax payable; excess credits are refundable for low-income holders. SMSFs in accumulation get the 15% rate against the grossed-up amount; SMSFs in pension phase typically receive the franking credits as a refund.",
      },
      {
        question: "What does APRA's AT1 phase-out mean for existing hybrid investors?",
        answer: "APRA confirmed in December 2024 that Additional Tier 1 capital instruments will be phased out of the Australian banking system, with transition arrangements through to 2032. Existing AT1 hybrids remain on issue until their first call date, at which point the issuer is expected to redeem rather than refinance. Net effect: a slowly shrinking asset class with reduced new supply, supportive for prices of existing notes near-term.",
      },
      {
        question: "Are hybrids appropriate for retail investors?",
        answer: "ASIC has repeatedly raised concerns about retail investor understanding of hybrid risks, particularly conversion mechanics and distribution-stopper rules. Hybrids are listed on the ASX and accessible to all retail investors via standard brokerage, but the risk profile is closer to deeply-subordinated bank equity than to the term-deposit substitute they are sometimes marketed as. Read the prospectus, model conversion outcomes, and limit position size accordingly.",
      },
    ],
    subcategories: [],
  },

  // ─── Dividend Investing ───
  {
    slug: "dividend-investing",
    label: "Dividend Investing",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["dividend"],
    color: {
      bg: "bg-lime-50",
      border: "border-lime-200",
      text: "text-lime-700",
      accent: "bg-lime-600",
      gradient: "from-lime-50 to-white",
    },
    icon: "dollar-sign",
    title: `Dividend Investing on the ASX (${yr})`,
    h1: "Dividend Investing on the ASX",
    metaDescription: `ASX dividend stocks, franking credits, DRPs and high-yield ETFs (VHY, IHD, DVDY). Banks, miners, utilities and the franking-yield illusion. ${upd}.`,
    intro: `Australia's imputation system makes ASX dividend yield genuinely different from US or European equity income. The Big Four banks, large miners and utilities form the backbone of the high-yield ASX index, with grossed-up yields routinely in the 6%–9% range. The trade-off is concentration risk — the same handful of names dominate every yield-focused portfolio.`,
    sections: [
      {
        heading: "Franking credits and grossed-up yield",
        body: "Australia's dividend imputation system attaches a franking credit to dividends paid out of company profits already taxed at the corporate rate (currently 30% for large companies, 25% for base-rate entities). Resident individuals gross up the dividend by the franking credit, pay tax at marginal rate, and offset the credit against tax payable — excess credits are refundable for low-income individuals and pension-phase superannuation. A 4% fully-franked dividend grosses up to ~5.7% pre-tax-equivalent yield against unfranked income.",
      },
      {
        heading: "ASX high-yield concentration",
        body: "The ASX 200 yield is heavily concentrated: the Big Four banks (CBA, NAB, WBC, ANZ), the major miners (BHP, RIO, FMG), the utilities (AGL, Origin, APA), and Telstra account for the bulk of grossed-up dividend dollars distributed by the index. ETF wrappers like Vanguard VHY, iShares IHD and Betashares DVDY systematise this concentration — they are not diversified high-yield portfolios in the international sense but reweighted exposures to the same handful of names.",
      },
      {
        heading: "Dividend reinvestment plans (DRPs)",
        body: "Most ASX dividend payers offer a DRP — dividends are reinvested into additional shares at a small discount (typically 1.5%–2.5%) to the volume-weighted average price over the pricing window. DRPs are not a tax deferral; the dividend is still assessable in the year declared even though no cash changes hands. CommSec, nabtrade and most brokers handle DRP elections; share registries (Computershare, Link, Boardroom) are the operational counterparty.",
      },
    ],
    faqs: [
      {
        question: "What is the franking-yield illusion?",
        answer: "Companies that pay out 100% of earnings as dividends — common among Australian banks during 2014–2019 — have very little capital available for reinvestment. Total return = dividend + capital growth, and a stretched payout ratio sacrifices the second term. Investors fixated on grossed-up yield often miss that the high-payout name with no growth has lower total return than a moderate-yield name reinvesting at 15% ROE. CBA's payout ratio rerating in 2024–25 illustrates this dynamic.",
      },
      {
        question: "Are franking credits available to foreign investors?",
        answer: "Generally no. Franking credits are only refundable or offsettable for Australian-resident taxpayers (and SMSFs). Non-resident investors receive the cash dividend and are subject to dividend withholding tax at 30% (typically reduced to 0%–15% under double-tax agreements) on the unfranked portion only — the franked portion is exempt from DWT but the credit itself has no value to the non-resident. This is why some Australian dividend stocks trade on lower implicit yields to foreign holders.",
      },
      {
        question: "Which ASX dividend ETFs are most popular?",
        answer: "Vanguard VHY (Australian Shares High Yield, ~0.25% MER), iShares IHD (S&P/ASX Dividend Opportunities, ~0.30% MER), Betashares DVDY (Australian Dividend Harvester, ~0.35% MER), and SPDR SYI (MSCI Australia Select High Dividend Yield) are the largest by AUM. Read the index methodology — some screen for sustainability of dividend, others purely rank on trailing yield, which can lead to value-trap concentration.",
      },
    ],
    subcategories: [],
  },

  // ─── REITs ───
  {
    slug: "reits",
    label: "REITs",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["reit"],
    color: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      accent: "bg-emerald-600",
      gradient: "from-emerald-50 to-white",
    },
    icon: "building",
    title: `Australian REITs (A-REITs) — ASX Real Estate (${yr})`,
    h1: "Australian Real Estate Investment Trusts (A-REITs)",
    metaDescription: `Compare ASX-listed A-REITs by sector, NTA premium/discount, gearing and yield — Goodman, Stockland, Mirvac, Dexus, Scentre, Charter Hall. ${upd}.`,
    intro: `A-REITs offer liquid, exchange-traded property exposure across industrial, retail, office, healthcare and diversified sectors. The S&P/ASX 200 A-REIT index has a market capitalisation of approximately $130B+, dominated by Goodman Group on the industrial side and a handful of diversified majors. REIT prices are interest-rate-sensitive; gearing and NTA discount are the two metrics that matter most.`,
    sections: [
      {
        heading: "The Australian REIT landscape by sector",
        body: "Industrial: Goodman Group (GMG) is the standout, with ~$25B+ market cap and global logistics development pipeline; Centuria Industrial REIT (CIP) and ESR Australia are mid-cap pure-plays. Retail: Scentre Group (SCG, Westfield AU/NZ), Vicinity Centres (VCX), Charter Hall Retail (CQR). Office: Dexus (DXS), Centuria Office REIT (COF). Diversified: Stockland (SGP), Mirvac (MGR), GPT (GPT), Charter Hall Long WALE REIT (CLW). Healthcare: Healthco (HCW), HealthCo Healthcare and Wellness (HCW). Specialised: National Storage REIT (NSR, self-storage).",
      },
      {
        heading: "NTA discount, gearing and rate sensitivity",
        body: "REIT pricing typically tracks the cycle of interest rates and the gap between unit price and net tangible asset value (NTA). Trading at an NTA discount is normal in a rising-rate environment — it reflects the market's view that valuers haven't yet caught up with current cap rates. Gearing across A-REITs typically runs 25%–35% loan-to-value; APRA has no direct authority but trust constitutions and lending covenants enforce caps. A 1% rise in long-end rates typically triggers 8%–15% A-REIT price compression as cap rates re-rate.",
      },
      {
        heading: "REIT ETFs and managed funds",
        body: "Vanguard VAP (Australian Property Securities, ~0.23% MER), SPDR SLF (S&P/ASX 200 Listed Property), Betashares MVA (Australian Property) and VanEck MVS provide diversified A-REIT exposure in a single trade. Active managers like Resolution Capital, APN Property Group and Charter Hall Direct run long-only A-REIT mandates targeting active risk against the index. Unlisted property funds (commercial-property-focused) operate alongside the listed market with different liquidity profiles.",
      },
    ],
    faqs: [
      {
        question: "How are A-REIT distributions taxed?",
        answer: "A-REITs are typically Attribution Managed Investment Trusts (AMITs) under Division 276. Distributions flow through the trust untaxed and are characterised by component for the holder — Australian rental income, foreign income, capital gains, and tax-deferred (return of capital) components are all reported separately on the annual AMMA statement. Tax-deferred components reduce cost base under section 104-71 rather than producing immediate assessable income, which can defer tax until disposal.",
      },
      {
        question: "Why do REIT prices fall when interest rates rise?",
        answer: "Two reinforcing mechanisms. First, valuation: commercial property cap rates re-rate upward as the risk-free rate rises, mechanically lowering the value of the underlying property assets. Second, financing cost: REIT gearing means rising rates increase interest expense on existing debt at refinance and tighten interest cover. The combination produces material price compression, with long-WALE office and retail typically more rate-sensitive than industrial or healthcare.",
      },
      {
        question: "Can I invest in A-REITs through my SMSF?",
        answer: "Yes — A-REITs are widely used in SMSF portfolios for property exposure that doesn't trigger the in-house asset (s71 SISA) rules or the storage and insurance complexity of direct property. They count toward listed asset allocations under the investment strategy and can hold significant weight without triggering single-asset concentration concerns. Distributions are taxed at 15% in accumulation and tax-free in pension phase up to the transfer balance cap.",
      },
    ],
    subcategories: [],
  },

  // ─── Crypto Staking ───
  {
    slug: "crypto-staking",
    label: "Crypto Staking",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["crypto_staking"],
    color: {
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-200",
      text: "text-fuchsia-700",
      accent: "bg-fuchsia-600",
      gradient: "from-fuchsia-50 to-white",
    },
    icon: "bitcoin",
    title: `Crypto Staking in Australia (${yr})`,
    h1: "Crypto Staking in Australia",
    metaDescription: `Stake Ethereum, Solana, ADA and other PoS assets via AUSTRAC-registered Australian exchanges. Slashing, restaking and ATO income treatment. ${upd}.`,
    intro: `Staking pays a yield for committing proof-of-stake tokens to validate blockchain transactions. Australian retail access runs through AUSTRAC-registered digital currency exchanges — Swyftx, CoinSpot, Independent Reserve, Kraken Australia and Binance Australia. Yields range from 2%–8% on the major PoS assets, with material risks the marketing rarely emphasises.`,
    sections: [
      {
        heading: "How staking actually works in Australia",
        body: "Most retail users access staking through a custodial exchange — the exchange runs validators and passes through a portion of staking rewards after taking a service fee (typically 15%–25%). Direct (non-custodial) staking via wallets like MetaMask, Phantom or Ledger Live retains custody but adds operational complexity. Liquid-staking tokens (LSTs) such as Lido stETH or Rocket Pool rETH wrap staked positions in a tradeable token — convenient, but introducing additional smart-contract and depeg risk. AUSTRAC registration is mandatory for any exchange operating in Australia; check the Digital Currency Exchange Register before depositing.",
      },
      {
        heading: "Slashing, depeg and counterparty risks",
        body: "Slashing penalises validators that double-sign or are offline beyond protocol thresholds — losses range from 0.5% (offline) to 100% (severe double-sign) of the staked balance. Custodial exchanges typically pool slashing risk across users but don't always insure against it. LSTs can depeg from the underlying asset during stress — stETH traded ~6% below ETH during the May–June 2022 stress. Restaking protocols (EigenLayer, Symbiotic) layer additional slashing conditions and have counterparty/smart-contract exposure beyond base-layer staking. Custodial exchange failure is the dominant historical loss path — FTX, Celsius and Voyager all held customer staked balances at collapse.",
      },
      {
        heading: "Australian regulatory and tax treatment",
        body: "AUSTRAC requires DCE registration for any business providing crypto services in Australia. ASIC regulates platforms that offer leveraged or derivatives products on crypto. The ATO's TR 2022/D2 and TD 2014/26 establish that staking rewards are assessable as ordinary income under section 6-5 at the AUD market value on the day of receipt — this creates a capital base for that token equal to the income amount, with subsequent disposal triggering CGT. Tracking is operationally hard; tools like Koinly, CryptoTaxCalculator and CoinTracking integrate with major Australian exchanges.",
      },
    ],
    faqs: [
      {
        question: "Which Australian exchanges offer staking?",
        answer: "Swyftx, CoinSpot, Independent Reserve, Kraken Australia, Binance Australia and OKX Australia all offer staking on major PoS assets — typically ETH, SOL, ADA, DOT, ATOM and AVAX. Yields and lockup periods vary by exchange and protocol. All listed exchanges are AUSTRAC-registered; verify on the AUSTRAC register before depositing. Yield quotes typically exclude the exchange's service fee — read the fine print.",
      },
      {
        question: "How is staking income taxed in Australia?",
        answer: "Staking rewards are ordinary income at the AUD market value on the day of receipt, per ATO guidance (TR 2022/D2). The amount included becomes the cost base of the received tokens for future CGT purposes. Disposal of the rewarded tokens (sale, swap, transfer) triggers CGT event A1; the 50% CGT discount applies for individuals and trusts holding more than 12 months. Maintain a per-reward record — exchanges' year-end statements vary in quality and the ATO has flagged crypto as a focus area.",
      },
      {
        question: "Can SMSFs stake crypto?",
        answer: "Possible but operationally complex. SMSF crypto staking must comply with the sole-purpose test (s62 SISA), the in-house asset rules (s71), and the trustee's investment strategy. Custodial staking on a corporate-account exchange typically passes the auditor's separation-of-assets check; non-custodial staking from a personal wallet does not. Australian SMSF auditors increasingly scrutinise crypto holdings; engage an SMSF-specialist auditor before staking.",
      },
    ],
    subcategories: [],
  },

  // ─── Forex ───
  {
    slug: "forex",
    label: "Forex",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["forex"],
    color: {
      bg: "bg-zinc-50",
      border: "border-zinc-200",
      text: "text-zinc-700",
      accent: "bg-zinc-600",
      gradient: "from-zinc-50 to-white",
    },
    icon: "globe",
    title: `Forex Trading in Australia (${yr})`,
    h1: "Forex Trading in Australia",
    metaDescription: `Spot FX and CFD forex via ASIC-licensed brokers — Pepperstone, IC Markets, IG, CMC. Leverage caps, AFCA dispute path, ATO income treatment. ${upd}.`,
    intro: `Retail forex in Australia is regulated as a derivatives product (mostly CFDs over spot FX) under ASIC product intervention orders. The market is dominated by ASIC-licensed providers — Pepperstone, IC Markets, IG, CMC Markets, Saxo and Plus500. Spreads and execution quality have converged among the top tier; the main differentiators are platform, customer service and regulatory standing.`,
    sections: [
      {
        heading: "ASIC product intervention and leverage caps",
        body: "ASIC's CFD product intervention order (effective March 2021, extended through May 2031) caps retail leverage at 30:1 on major currency pairs (EUR/USD, USD/JPY, GBP/USD, AUD/USD), 20:1 on non-major pairs, 10:1 on commodities and non-major indices, 5:1 on shares, and 2:1 on cryptocurrency CFDs. Negative balance protection is mandatory. Bonuses and gifts for opening or funding accounts are banned. Wholesale clients can opt out of the leverage cap with the section 761G/761GA threshold tests — net assets >$2.5M or income >$250K p.a.",
      },
      {
        heading: "Choosing an Australian forex broker",
        body: "Verify ASIC AFSL on the AFS Licensee register — the AFSL number must appear on the broker's website and PDS. Check AFCA membership for retail dispute resolution. Look at execution model (true ECN/STP vs market-maker dealing desk), spread structure (tight raw-spread plus commission, or wider all-inclusive), and regulatory history. Pepperstone and IC Markets dominate the Australian raw-spread ECN tier; IG, CMC and Saxo dominate the all-inclusive retail tier; offshore unlicensed brokers should be avoided — the ASIC Moneysmart register flags scam operators regularly.",
      },
      {
        heading: "Risks specific to leveraged FX",
        body: "Most retail forex CFD accounts lose money — ASIC and ESMA-required disclosures consistently show 65%–85% of retail accounts in net loss over any 12-month window. Leverage amplifies both directions; gap risk during news events or weekend reopens can produce moves beyond stop-loss levels (the broker's negative balance protection caps the maximum loss at the deposited capital, but the position can still go to zero). Funding (overnight rollover) costs accrue daily on held positions, compounding adverse selection over time. FX should be approached as a high-risk speculative activity, not a long-term wealth strategy.",
      },
    ],
    faqs: [
      {
        question: "Is forex trading legal in Australia?",
        answer: "Yes, through ASIC-licensed brokers holding an AFSL with derivatives authorisation. Trading through an unlicensed offshore broker is not illegal for the trader but offers no AFCA dispute resolution and no compensation scheme protection. The Australian Financial Complaints Authority (AFCA) is the external dispute resolution scheme for retail FX disputes with licensed brokers; complaints unresolved within 45 days at the broker level can be lodged with AFCA at no cost.",
      },
      {
        question: "How is forex profit taxed in Australia?",
        answer: "For retail traders, forex CFD gains and losses are typically assessable as ordinary income (revenue account) under section 6-5 of ITAA 1997 — not capital gains. The ATO position in TR 2005/15 distinguishes between forex held for investment (rare for retail CFDs) and forex held for short-term profit-making — the latter is revenue. Losses are deductible against other ordinary income in the same year. Carrying on a business of trading carries different rules including PSI and non-commercial loss tests; engage a tax adviser if trading volumes are material.",
      },
      {
        question: "What's the difference between spot FX and CFD forex?",
        answer: "Spot FX is the actual exchange of one currency for another, settled T+2 — used by businesses, banks and large investors via the interbank market. Retail forex offered by Australian brokers is almost universally CFDs (contracts for difference) — synthetic exposure to FX price moves, no physical currency changes hands, settlement is in AUD against the position's AUD-equivalent P&L. CFD forex is the regulated retail product; access to true spot FX requires a wholesale prime-brokerage relationship.",
      },
    ],
    subcategories: [],
  },

  // ─── Options Trading ───
  {
    slug: "options-trading",
    label: "Options Trading",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["options"],
    color: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      accent: "bg-red-600",
      gradient: "from-red-50 to-white",
    },
    icon: "trending-up",
    title: `ASX Options Trading in Australia (${yr})`,
    h1: "ASX Options Trading in Australia",
    metaDescription: `ASX equity and index (XJO) options — covered calls, cash-secured puts, leverage and assignment risk. Australian broker access and tax treatment. ${upd}.`,
    intro: `ASX options give Australian investors the ability to hedge, generate income, or take leveraged positions on the underlying. The ASX runs equity options on around 70 of the most liquid stocks plus index options on the S&P/ASX 200 (XJO). The market is far smaller than the US options market — liquidity, spreads and strike selection are correspondingly narrower.`,
    sections: [
      {
        heading: "ASX option mechanics — American vs European exercise",
        body: "ASX equity options are American-style — exercisable at any time prior to expiry, settled via physical delivery of the underlying shares. ASX index options on the XJO are European-style — exercisable only at expiry, cash-settled in AUD against the opening index value on expiry day. Standard contract size is 100 shares per option for equity options; XJO options have a $10 multiplier on the index points. Expiry is typically the third Thursday of the month for equity options. Margin is required by the writer (seller) of an option, calculated daily by ASX Clear.",
      },
      {
        heading: "Common Australian retail option strategies",
        body: "Covered calls — sell call options against owned shares to generate premium income; the trade-off is capping upside above the strike. Common on Big Four banks and large miners as a yield-enhancement play, ~2%–5% annualised premium pickup. Cash-secured puts — sell put options on cash-collateralised positions, willing to be assigned the underlying at the strike; effectively a paid limit order. Protective puts — buy puts to insure long stock positions during expected volatility (earnings, central bank decisions). Spreads — long/short option pairs to define risk and reduce premium cost.",
      },
      {
        heading: "Australian broker access to ASX options",
        body: "CommSec, nabtrade, Bell Direct, Macquarie Direct and Saxo Australia offer ASX options trading to retail accounts; CMC Markets and IG offer options as part of their derivatives product set. Brokerage typically runs $30–$40 per contract leg or a percentage of premium; ECN-style providers can be cheaper for higher volume. Foreign-exchange access (US options on Interactive Brokers, etc.) is available to Australian retail accounts but introduces tax-reporting complexity and FX risk on the AUD-USD leg.",
      },
    ],
    faqs: [
      {
        question: "How are option premiums taxed in Australia?",
        answer: "The ATO position in TR 2007/D9 and supporting guidance treats option premiums as ordinary income (revenue account) for traders and as capital under the CGT regime for investors using options for hedging and infrequent strategic positions. The line between investor and trader is drawn case-by-case based on volume, intent and sophistication. For most active retail option traders, premiums received and lost are revenue items; premiums paid for puts as long-term portfolio insurance can fall on the capital account.",
      },
      {
        question: "What's the assignment risk on covered calls?",
        answer: "When you sell (write) a call option and the underlying trades above the strike near expiry, the option is likely to be exercised — you must deliver the shares at the strike price. If you're holding the underlying at a low cost base, exercise crystallises a capital gain you may not have intended. American-style exercise means assignment can occur at any time, particularly around dividend ex-dates when in-the-money calls are commonly exercised early to capture the dividend. Roll the position before ex-date or close out to avoid surprise assignment.",
      },
      {
        question: "How liquid are ASX options?",
        answer: "Liquidity is concentrated in the largest names — BHP, CBA, NAB, WBC, ANZ, RIO, FMG, CSL and Telstra — and in XJO index options. Bid-ask spreads on liquid contracts are typically 1–3 cents on at-the-money strikes; mid-cap option spreads are wider and out-of-the-money strikes can have meaningful bid-ask gap. Volume is far lower than the US — a typical liquid ASX option has 100–1000 contracts open interest vs millions on a comparable US name. Strategy selection should account for execution slippage.",
      },
    ],
    subcategories: [],
  },

  // ─── IPOs ───
  {
    slug: "ipos",
    label: "ASX IPOs",
    dbVerticals: ["startup"],
    color: {
      bg: "bg-pink-50",
      border: "border-pink-200",
      text: "text-pink-700",
      accent: "bg-pink-600",
      gradient: "from-pink-50 to-white",
    },
    icon: "rocket",
    title: `ASX IPOs — Australian Initial Public Offerings (${yr})`,
    h1: "ASX IPOs — Australian Initial Public Offerings",
    metaDescription: `Recent ASX IPOs and IPO performance vs the index. Priority broker allocations, escrow lockups, bookbuild dynamics. ${upd}.`,
    intro: `ASX IPOs cover the full spectrum from sub-$10M micro-cap mining floats to multi-billion-dollar privatisations. The retail allocation pathway runs through priority broker offers (CommSec, nabtrade, Morgans, Bell Potter), public offers via prospectus, and aggregation platforms like OnMarket. Performance varies wildly — large floats are typically heavily oversubscribed, small-cap mining floats often free-fall after listing.`,
    sections: [
      {
        heading: "How retail investors get ASX IPO allocations",
        body: "Three main routes. Priority broker offers — your retail broker (CommSec, nabtrade, Morgans, Bell Direct) participates in the bookbuild and offers stock to its clients in priority; allocation depends on the broker's sub-allocation, your trading history with the broker, and demand. Public offers — accessible via prospectus, typically $1,000–$2,500 minimum, applied via BPAY or OnMarket. Wholesale broker offers — Macquarie, UBS, JPMorgan, Citi run institutional bookbuilds with HNW retail allocations to private wealth clients. Marquee large-cap IPOs are heavily scaled; mid-cap and small-cap retail allocations are typically more accessible.",
      },
      {
        heading: "Escrow, lockups and prospectus mechanics",
        body: "ASX Listing Rule Chapter 9 imposes mandatory escrow on certain pre-IPO shareholders of small-cap and mining floats — typically 12 to 24 months. Discretionary escrow is negotiated by the corporate adviser and is common on larger floats. Lockup expiry days frequently trigger material selling pressure as escrowed shareholders crystallise gains. The prospectus is the primary disclosure document under section 710 of the Corporations Act — read the use-of-funds, the financial information, the risk factors and the related-party transactions before applying.",
      },
      {
        heading: "ASX IPO performance vs the index",
        body: "Australian IPO first-day returns average around 7%–10% based on long-run SIRCA data, but the median is closer to flat — averages are skewed by a long tail of high-pop deals. 12-month post-IPO returns are mixed: the median IPO underperforms the ASX 200 over the medium term, with significant dispersion. The dispersion is wider for small-cap and micro-cap floats, where genuine quality is rare and adverse selection is high. Index inclusion (ASX 200, ASX 300) typically takes 3–9 months post-listing depending on free-float size, and inclusion-driven buying can support price.",
      },
    ],
    faqs: [
      {
        question: "How do I subscribe to a public IPO offer in Australia?",
        answer: "Read the prospectus on the issuer's website or via ASIC's ASIC Connect. Apply through the prospectus application form (BPAY) or via an aggregation platform like OnMarket — minimum is typically $1,000–$2,500. The offer closes on a specified date; allocation is confirmed shortly before listing. If oversubscribed, you receive a scaled allocation. Funds for the unfilled portion are returned to the BPAY account.",
      },
      {
        question: "Why do small-cap ASX IPOs often underperform?",
        answer: "Adverse selection — the highest-quality private companies don't need to IPO at small-cap valuations. Many small-cap ASX listings are mining or biotech vehicles raising development capital at speculative valuations. Free-float is often tight at listing, with promoters and seed shareholders escrowed; price can spike on listing then drift down through the lockup expiry period. Always read the prospectus' use-of-funds and management track record carefully before subscribing.",
      },
      {
        question: "What's a backdoor listing?",
        answer: "A backdoor listing is an IPO via reverse takeover of an existing ASX-listed shell company — the operating business is acquired by the shell, share consolidated and renamed. ASX requires the shell's share register, structure and prospectus disclosure to comply with Chapters 1 and 2 of the Listing Rules at the time of the transaction. Backdoor listings are common in mining and biotech where the existing shell already has the listing infrastructure in place; they are subject to the same escrow rules as a fresh IPO.",
      },
    ],
    subcategories: [],
  },

  // ─── Managed Funds ───
  {
    slug: "managed-funds",
    label: "Managed Funds",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["managed_fund"],
    color: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      accent: "bg-violet-600",
      gradient: "from-violet-50 to-white",
    },
    icon: "briefcase",
    title: `Australian Managed Funds (${yr})`,
    h1: "Australian Managed Funds",
    metaDescription: `Compare retail and wholesale managed funds in Australia. APIR codes, MERs, mFund settlement, platform vs direct access. ${upd}.`,
    intro: `Australia's managed fund industry oversees over $4 trillion in assets, spanning retail unit trusts, wholesale funds, ETFs, and superannuation pooled vehicles. Retail access is via fund manager direct, mFund settlement on the ASX, or investment platforms (Netwealth, HUB24, BT Panorama, Macquarie Wrap, North). Choice of access pathway materially affects all-in cost.`,
    sections: [
      {
        heading: "How Australian managed funds are accessed",
        body: "Direct application — apply to the fund manager via PDS application form, paper or online; settlement via direct debit or BPAY. mFund — the ASX-operated settlement service that lets investors apply for unlisted managed funds through a normal broker (CommSec, nabtrade) using CHESS settlement; available on around 150–200 funds. Platform — investment wrap accounts (Netwealth, HUB24, BT Panorama) offer access to thousands of funds with consolidated reporting and tax statements; platform fees of 0.10%–0.50% apply on top of fund MER. Each access route has different minimum, fee and reporting characteristics.",
      },
      {
        heading: "MER, performance fees and the high-cost-low-cost trade-off",
        body: "Active Australian equity managed funds typically charge 0.80%–1.50% management fee plus performance fees structured as 15%–20% of returns over a benchmark with a high-water mark. Index ETF wrappers (Vanguard VAS, iShares IOZ, Betashares A200) charge 0.04%–0.12% MER. Long-term net-of-fee performance data (S&P SPIVA Australia) consistently shows the majority of active Australian equity managers underperform the ASX 200 over 10-year windows. The case for active is strongest in inefficient asset classes (small-cap, emerging market, alternatives) and weakest in large-cap Australian and US equity.",
      },
      {
        heading: "Wholesale vs retail funds",
        body: "Wholesale funds require sophisticated/wholesale investor status (>$2.5M net assets or >$250K income, with accountant certification) and offer lower fees, tighter strategies, and higher minimums ($50K–$500K+). Retail funds carry the full disclosure regime including the PDS, FDS (Fee Disclosure Statement) and TMD (Target Market Determination) under DDO requirements. The economic difference in fees can be material — the same manager might charge 0.50% wholesale and 1.00% retail for substantively the same exposure.",
      },
    ],
    faqs: [
      {
        question: "What is an APIR code?",
        answer: "APIR (Asia Pacific Investment Register) codes are unique six-character identifiers for Australian managed fund products. The code identifies the specific fund, share class and currency unit — for example, VAN0010AU is the Vanguard Australian Shares Index Fund, retail class. APIR codes are used by platforms, registries and reporting providers to track holdings, transactions and distributions. The code is on the front page of every Australian managed fund PDS.",
      },
      {
        question: "What is mFund and how does it differ from an ETF?",
        answer: "mFund is the ASX-operated settlement service for unlisted managed funds — investors apply for fund units through a CHESS-sponsored broker account, with units held in CHESS like shares. Unlike an ETF, mFund units are priced once daily at the fund's NAV (no intraday trading, no bid-ask spread). mFund covers around 150–200 funds across Australian and global equities, fixed income, multi-asset and alternatives. mFund is a settlement convenience, not a fund product — the underlying fund's strategy, MER and PDS are unchanged from direct application.",
      },
      {
        question: "How are managed fund distributions taxed?",
        answer: "Most Australian managed funds are Attribution Managed Investment Trusts (AMITs) under Division 276 of ITAA 1997. Distributions are characterised by component on the AMMA tax statement — Australian income, foreign income, franked dividends with credits, capital gains (net of any 50% discount), and tax-deferred amounts. The AMMA statement is issued annually after 30 June; cost-base adjustments for tax-deferred distributions are reported alongside. Holders include the attributed amount in assessable income whether or not it was reinvested.",
      },
    ],
    subcategories: [],
  },

  // ─── Private Equity ───
  {
    slug: "private-equity",
    label: "Private Equity",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["private_equity"],
    color: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      accent: "bg-purple-600",
      gradient: "from-purple-50 to-white",
    },
    icon: "briefcase",
    title: `Private Equity Investment in Australia (${yr})`,
    h1: "Private Equity Investment in Australia",
    metaDescription: `Australian and global PE — wholesale-only access via s708, listed PE proxies, J-curve, 7-10 year lockups. Pacific Equity Partners, Quadrant, Adamantem. ${upd}.`,
    intro: `Private equity funds buy operating businesses with a 4–7 year hold horizon, restructure or scale them, and exit via trade sale, IPO or secondary buyout. Australian-domiciled PE is concentrated among Pacific Equity Partners, Quadrant, Adamantem, BGH and Crescent Capital, plus the Australian arms of Bain Capital, KKR and TPG. Direct fund access is wholesale-only; retail proxies exist on the ASX.`,
    sections: [
      {
        heading: "How private equity funds are structured",
        body: "Australian PE funds are typically Limited Partnerships — Limited Partners (LPs) provide capital, the General Partner (GP) makes investment decisions and earns management fee plus carried interest. Standard economics: 1.5%–2.0% management fee on committed capital during the investment period, then on invested capital; 20% carried interest above an 8% preferred return with a catch-up. Fund life is typically 10 years (5-year investment period plus 5-year harvest), with 1–2 years of optional extension. LP commitments are drawn down over the investment period as deals close.",
      },
      {
        heading: "Australian and global PE access pathways",
        body: "Direct fund commitments — wholesale and sophisticated investors only under section 708, minimums typically $250K–$5M+; access for Australian HNW investors via private bank channels (Macquarie Wealth, JBWere, Crestone) or PE feeder funds (Schroders, Hamilton Lane, Pengana). Listed PE proxies on the ASX — Magellan Capital Partners (MFL), Bailador Technology Investments (BTI). Global listed PE — KKR (NYSE), Blackstone (NYSE), Brookfield (NYSE/TSX) trade on offshore exchanges and are accessible via Australian brokers with international access. ETFs like iShares Listed Private Equity (IPRV) wrap a basket of listed PE names.",
      },
      {
        heading: "The J-curve and what to expect",
        body: "PE returns follow a J-curve — early years see negative IRR as fees are paid against not-yet-revalued investments, with returns building through the harvest period. A typical Australian buyout fund might show -10% IRR in years 1–2, -5% to +5% in years 3–4, +15% to +25% in years 5–7, and final performance crystallised in years 8–10. Cambridge Associates Australian PE benchmark long-run net IRR has been around 12%–15% — comparable to ASX 200 total return but with materially higher illiquidity and dispersion across managers. Past returns do not guarantee future returns and dispersion across funds is wide.",
      },
    ],
    faqs: [
      {
        question: "Can retail investors access Australian PE?",
        answer: "Not directly — Australian PE fund commitments are wholesale-only under the section 708 disclosure exemption, requiring sophisticated/wholesale investor status (>$2.5M net assets or >$250K income with accountant certification) plus the relevant PDS or IM. Retail proxies include ASX-listed PE vehicles like Magellan Capital Partners (MFL) and Bailador Technology Investments (BTI), or global listed PE names accessible through international brokerage. Retail-friendly feeder structures from Pengana and Schroders have started to appear with $50K–$100K minimums.",
      },
      {
        question: "How is carried interest taxed in Australia?",
        answer: "Carried interest received by an Australian-resident GP partner is generally assessed as ordinary income under Division 6 partnership rules, then potentially recharacterised as a capital gain if the carry is structured through a Limited Partnership or unit trust holding the partnership interest as a CGT asset. The ATO's Taxpayer Alert TA 2018/2 flagged structures intended to convert carry to CGT. Specific structuring depends on the fund's domicile, the GP entity, and the LP's tax position; engage specialist tax counsel.",
      },
      {
        question: "What's the minimum to commit to a PE fund?",
        answer: "Direct LP commitments to Australian PE funds typically start at $250,000–$1,000,000, with most institutional-quality funds clearing at $5M+. Feeder funds operated by private banks and platforms aggregate retail/wholesale commitments down to $50,000–$100,000 minimums. Listed PE vehicles on the ASX trade like ordinary shares with no minimum beyond brokerage. The illiquidity premium argument for PE only holds if you can size the commitment such that the 7–10 year lockup doesn't constrain other capital needs.",
      },
    ],
    subcategories: [],
  },

  // ─── SMSF ───
  {
    slug: "smsf",
    label: "SMSF",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["smsf"],
    color: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      text: "text-teal-700",
      accent: "bg-teal-600",
      gradient: "from-teal-50 to-white",
    },
    icon: "piggy-bank",
    title: `Self-Managed Super Funds (SMSF) in Australia (${yr})`,
    h1: "Self-Managed Super Funds in Australia",
    metaDescription: `SMSF setup, audit, sole-purpose test, in-house asset rules and LRBA constraints. Trustee structure, costs and ATO compliance. ${upd}.`,
    intro: `Self-managed super funds are private superannuation trusts with up to six members, where members are also trustees. The ATO regulates SMSFs, with around 600,000 funds holding approximately $900B in assets. SMSFs offer investment choice and control superannuation industry funds don't — at the cost of trustee responsibility, mandatory audit, and operational complexity.`,
    sections: [
      {
        heading: "SMSF setup and ongoing costs",
        body: "Setup costs typically $2,000–$5,000 — trust deed, ABN/TFN registration, ATO regulator registration, electronic service address, bank account setup. A corporate trustee structure costs an extra ~$700 ASIC registration but provides cleaner asset separation, easier member changes, and reduced personal liability versus individual trustees. Annual ongoing costs: independent SMSF audit ($300–$800), accounting and tax return ($1,500–$3,500), ATO supervisory levy ($259), plus any actuarial certificate fees. Total annual running cost typically $2,000–$5,000 — making SMSFs uneconomic below approximately $250,000 in fund assets, per the ATO's own analysis.",
      },
      {
        heading: "Sole-purpose test, in-house assets and key SISA constraints",
        body: "The sole-purpose test (s62 SISA) requires the fund to be maintained solely for retirement, death, illness or termination-of-employment benefits. The in-house asset rule (s71) restricts loans to, investments in, and leases with related parties to no more than 5% of total fund assets at acquisition. The non-arm's-length income (NALI) rules tax non-arm's-length income at 45%. Limited Recourse Borrowing Arrangements (LRBAs, s67A) allow gearing for property and other single acquirable assets but require the borrowed property be held in a separate bare trust until the loan is repaid. Breaches of these rules can result in non-complying fund status and tax at 45% on the entire fund.",
      },
      {
        heading: "Investment options inside an SMSF",
        body: "Direct ASX shares, ETFs, and managed funds (no operational restriction). Direct property — both residential and commercial — though residential property must be at arm's length and cannot be acquired from a related party. Commercial property (business real property) can be acquired from a related party at market value, and a related-party business can lease it. Cryptocurrency and overseas listed securities are permitted with appropriate audit support. Collectibles (artwork, wine, coins) are permitted but subject to the in-house asset and sole-purpose test rules — they cannot be held at the trustee's home or used personally. International shares via brokers like Stake, Pearler and Selfwealth are increasingly common in SMSF portfolios.",
      },
    ],
    faqs: [
      {
        question: "How much do I need to make an SMSF worthwhile?",
        answer: "ATO and Productivity Commission analysis indicates SMSFs become cost-competitive with industry funds at approximately $250,000–$500,000 in fund assets, depending on the fee benchmark. Below $200,000, the fixed annual costs ($3,000–$5,000) typically outweigh the fee savings versus a low-cost industry fund (0.50%–1.00% all-in). Above $500,000, SMSF costs scale flat while industry fund fees scale linearly, so the relative cost gap widens in favour of SMSF. Investment-control benefits (direct property, alternatives) are independent of cost comparison.",
      },
      {
        question: "What is an LRBA and when is it appropriate?",
        answer: "A Limited Recourse Borrowing Arrangement allows an SMSF to borrow to acquire a single asset (typically property) under s67A SISA. The borrowed asset is held in a separate bare trust; the lender's recourse is limited to the asset only — other fund assets are quarantined. LRBAs were heavily marketed in the 2015–2019 property cycle but the ATO and APRA have since tightened scrutiny. They are appropriate for trustees with material fund assets, established income, and a clear long-term investment thesis on the underlying property; they are inappropriate as a leveraged speculation vehicle for marginal trustees.",
      },
      {
        question: "Who can be an SMSF trustee?",
        answer: "Each member must be a trustee (individual trustee structure) or a director of the corporate trustee company (corporate trustee structure). Members must be at least 18 years old or have a parent/guardian as trustee on their behalf. Disqualified persons under s120 SISA — including those with dishonesty offence convictions, undischarged bankrupts, and those previously disqualified by the ATO — cannot act as trustee. Funds with up to 6 members are permitted (raised from 4 in 2021). Single-member funds are common; both a director-and-shareholder corporate trustee or two individual trustees can satisfy the structural requirements.",
      },
    ],
    subcategories: [],
  },

  // ─── Commodities ───
  {
    slug: "commodities",
    label: "Commodities",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["commodity"],
    color: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-700",
      accent: "bg-orange-600",
      gradient: "from-orange-50 to-white",
    },
    icon: "coins",
    title: `Commodities Investment in Australia (${yr})`,
    h1: "Commodities Investment in Australia",
    metaDescription: `Gold, silver, oil, LNG, iron ore and copper exposures via ASX stocks, ETFs (GOLD, OOO, MNRS, QRE) and ASX 24 futures. ${upd}.`,
    intro: `Australia is one of the world's largest commodity exporters — iron ore, LNG, coal, gold, lithium and bauxite dominate export receipts. Retail commodity exposure runs through ASX-listed mining and energy stocks, commodity ETFs that hold the physical or track futures, and the ASX 24 futures market for direct contract access via licensed brokers.`,
    sections: [
      {
        heading: "Commodity exposure routes for Australian investors",
        body: "Physical-backed ETFs — GOLD (Global X Physical Gold), NGLD (BetaShares Gold Bullion AUD-Hedged), ETPMAG (silver), PMGOLD (Perth Mint Gold) hold allocated bullion and track the underlying metal price closely. Equity ETFs — MNRS (BetaShares Global Gold Miners), QRE (BetaShares ASX 200 Resources), VAP — provide leveraged exposure to commodity prices via mining-company earnings. Futures via ASX 24 (formerly SFE) — wool, grain, energy and electricity contracts — accessible through ASIC-licensed futures brokers (Morgans, Macquarie Futures, Halifax) with margin requirements and overnight rollover. Direct equity in major miners (BHP, RIO, FMG, WDS, STO) for the largest commodity exposures.",
      },
      {
        heading: "How commodity prices affect Australian listed equities",
        body: "Iron ore — BHP and RIO derive 60%–80% of earnings from iron ore at high prices; FMG is a near-pure iron-ore play. The 62% Fe China benchmark price and AUD/USD exchange rate are the two dominant drivers. Lithium — PLS, MIN, IGO, LTR and AKE earnings track spodumene and battery-grade lithium hydroxide pricing, with material lag from spot moves to realised average pricing. Gold — Australian gold producers (NST, EVN, NEM) earn in AUD-hedged terms — AUD gold price (USD gold price divided by AUD/USD) is the relevant earnings driver. Energy — WDS and STO track LNG long-term contract pricing, oil-linked or hub-linked depending on customer mix.",
      },
      {
        heading: "Tax treatment of physical bullion vs ETFs",
        body: "Physical gold and silver bullion held by individuals is a CGT asset under section 108-10 — capital gains qualify for the 50% CGT discount after 12 months. Physical-backed ETFs (GOLD, NGLD) are unit trusts and generally generate AMIT tax statements with capital-gains-character distributions; the underlying gold appreciation is captured on disposal of units. Futures and options on commodities are typically revenue items for active traders and capital items for hedgers — the line is drawn case-by-case. SMSFs holding physical bullion must comply with sole-purpose test and in-house asset rules; storage at the trustee's residence triggers compliance issues.",
      },
    ],
    faqs: [
      {
        question: "Is investing in commodities a hedge against inflation?",
        answer: "Historically yes for gold and energy; mixed for industrial commodities. Long-run data shows gold is positively correlated with US realised inflation and negatively correlated with real interest rates. Energy commodities (oil, gas, coal) typically rise during demand-driven inflation but fall in supply-driven recessions. Industrial metals (copper, iron ore) track global growth more than CPI directly. Australian listed-mining exposure carries equity-market beta in addition to commodity-price exposure, which can dilute the inflation-hedge property in stress scenarios.",
      },
      {
        question: "How do I trade commodities futures in Australia?",
        answer: "Open an account with an ASIC-licensed futures broker — Morgans, Macquarie Futures, Halifax Investment Services, or international brokers with Australian access (Interactive Brokers, Saxo). The ASX 24 (formerly Sydney Futures Exchange) lists wool, grains, electricity and select energy contracts; international exposure runs via the offshore exchanges (CME, ICE, LME). Margin is required (typically 5%–15% of contract value) and positions mark-to-market daily; gap risk on news events can trigger margin calls or position liquidation.",
      },
      {
        question: "Should I hold commodities directly or via mining stocks?",
        answer: "Direct commodity exposure (physical ETFs, futures) tracks the spot price closely with no operational risk, but no dividend yield and ongoing storage/management fees of 0.20%–0.50%. Mining-stock exposure provides leverage to commodity moves through operating gearing — a 20% rise in iron ore can produce a 50%+ rise in BHP earnings — plus dividend yield and franking credits, but introduces operational, regulatory, geological and management risk. Most diversified portfolios use both: direct ETFs for pure inflation/safe-haven exposure, mining equity for income and growth.",
      },
    ],
    subcategories: [],
  },

  // ─── Gold ───
  {
    slug: "gold",
    label: "Gold",
    dbVerticals: ["fund"],
    dbFundSubCategories: ["gold"],
    color: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      accent: "bg-yellow-600",
      gradient: "from-yellow-50 to-white",
    },
    icon: "coins",
    title: `Investing in Gold in Australia (${yr})`,
    h1: "Investing in Gold in Australia",
    metaDescription: `Perth Mint coins and bars, ASX gold ETFs (GOLD, NGLD, GDX), Australian gold producers (NST, EVN). SMSF storage rules, bullion CGT. ${upd}.`,
    intro: `Australia is the world's second-largest gold producer behind China, with the Perth Mint operating as the country's main refiner and bullion dealer. Retail gold exposure runs through Perth Mint coins and bars, ASX-listed physical-backed ETFs, and Australian gold-mining stocks. Each pathway has different cost, custody and tax characteristics.`,
    sections: [
      {
        heading: "Physical bullion via the Perth Mint",
        body: "The Perth Mint, owned by the Western Australian Government, is the only Australian-government-guaranteed bullion refiner. Retail products include the Australian Kangaroo coin (1 oz / 1/2 oz / 1/4 oz / 1/10 oz), Australian Lunar Series coins, and cast/minted bars from 1g to 1kg. Buy-back spreads typically run 1%–4% over spot for coins, 0.5%–2% for bars depending on size. The Perth Mint Depository Online (PMDO) lets retail investors hold allocated, unallocated or pool-allocated gold/silver in vault storage from $50 minimum, with ongoing storage fees of 0.50%–1.00% p.a. for allocated.",
      },
      {
        heading: "ASX gold ETFs and gold-miner ETFs",
        body: "Physical-backed gold ETFs: GOLD (Global X Physical Gold, ~0.40% MER, AUD-quoted), NGLD (BetaShares Gold Bullion AUD-Hedged, ~0.59%), PMGOLD (Perth Mint Gold, ~0.15% — backed by the Perth Mint Gold pool). Gold-miner ETFs: MNRS (BetaShares Global Gold Miners ETF, ~0.57%), GDX (Global X Gold Miners, ~0.51%) — provide leveraged exposure to the gold price through mining-company earnings. The GOLD/MNRS pair illustrates the trade-off: physical gold rose 65% in 2024–25, MNRS rose ~120% over the same window, but with materially higher drawdowns.",
      },
      {
        heading: "Australian gold-mining equities",
        body: "Major ASX-listed gold producers: Newmont (NEM, primary US listing also on the ASX), Northern Star Resources (NST), Evolution Mining (EVN), Genesis Minerals (GMD), De Grey Mining (DEG, developer-near-producer), Westgold (WGX), Ramelius Resources (RMS). Australian-domiciled gold producers benefit from a weaker AUD relative to USD-denominated gold pricing, since costs are largely AUD and revenue is USD-linked — a rising AUD/USD compresses margins, a falling AUD/USD expands them. Production grade, all-in sustaining cost (AISC), and reserve life are the key operational metrics. AISC under $1,500 USD/oz typically marks a low-cost producer.",
      },
    ],
    faqs: [
      {
        question: "How is physical gold taxed in Australia?",
        answer: "Physical gold bullion held by individuals is a CGT asset under section 108-10 of ITAA 1997 — capital gains on disposal qualify for the 50% CGT discount where held more than 12 months. GST is generally not payable on investment-grade gold (99.5%+ purity in tradable form). Personal-use assets (gold jewellery, decorative coins) are subject to different rules — the personal-use asset exemption applies only for items acquired for less than $10,000. Records of acquisition cost, transaction date and disposal price are essential — Perth Mint and most reputable dealers issue acquisition documentation suitable for ATO purposes.",
      },
      {
        question: "Can my SMSF hold physical gold?",
        answer: "Yes, with conditions. The investment must satisfy the sole-purpose test (s62 SISA) — held for retirement benefits, not personal use. Bullion cannot be stored at the trustee's home or used as decorative display. Storage in a properly insured third-party vault (Perth Mint Depository, ABC Bullion vault, Custodian Vaults) satisfies the separation-of-assets requirement and is auditable. The collectibles regime under s62A also imposes specific storage and insurance requirements where applicable. Engage an SMSF-specialist auditor before acquiring bullion.",
      },
      {
        question: "What are typical buy-sell spreads on gold in Australia?",
        answer: "Perth Mint coins: 4%–8% spread on small denominations (1/10 oz Kangaroo), narrowing to 2%–4% on 1 oz and 0.5%–2% on bars (1 oz to 1 kg). Online dealers like ABC Bullion, Ainslie Bullion and Gold Stackers offer competitive spreads — typically 1%–3% over spot for cast bars, 2%–5% on minted bars and coins. PMGOLD on the ASX trades at a tight bid-ask spread (typically 0.05%–0.20%) plus normal brokerage. ETFs (GOLD, NGLD) trade at near-NAV with spreads of 0.10%–0.30%.",
      },
    ],
    subcategories: [],
  },

  // ─── Lithium ───
  {
    slug: "lithium",
    label: "Lithium",
    dbVerticals: ["mining"],
    color: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-700",
      accent: "bg-gray-600",
      gradient: "from-gray-50 to-white",
    },
    icon: "zap",
    title: `Australian Lithium Mining Investment (${yr})`,
    h1: "Australian Lithium Mining Investment",
    metaDescription: `ASX lithium pure-plays (PLS, MIN, LTR, IGO, AKE) and developers. Spodumene vs brine, battery-grade vs technical, LFP/NMC chemistries. ${upd}.`,
    intro: `Australia is the world's largest lithium producer, supplying around 50% of global lithium output — almost entirely from hard-rock spodumene operations in Western Australia's Greenbushes, Pilgangoora, Mount Marion and Wodgina mines. ASX-listed lithium pure-plays give Australian retail investors direct exposure to the global EV battery supply chain, with all the volatility that implies.`,
    sections: [
      {
        heading: "Australian lithium production landscape",
        body: "Greenbushes — operated by Talison Lithium (jointly held by IGO and Tianqi/Albemarle); the world's largest hard-rock lithium mine. Pilgangoora — Pilbara Minerals (PLS), Australia's largest pure-play producer; spodumene concentrate sold under offtake agreements with Chinese converters. Mount Marion — Mineral Resources (MIN) joint venture with Albemarle. Wodgina — Mineral Resources/Albemarle JV, on care-and-maintenance through the 2024–2025 lithium price downturn before phased restart. Developers: Liontown Resources (LTR, Kathleen Valley project), Core Lithium (CXO, Finniss), Lake Resources (LKE, brine play in Argentina). Allkem (AKE) merged with US-listed Livent to form Arcadium in 2024.",
      },
      {
        heading: "Spodumene vs brine, battery-grade vs technical",
        body: "Hard-rock spodumene — mined ore is processed to spodumene concentrate (SC6 grade ~6% Li2O), then converted to battery-grade lithium hydroxide or carbonate by downstream chemical operations (mostly in China). Brine — saline groundwater pumped from below salt flats, evaporated and processed; lower-cost but slower ramp, dominated by Chile, Argentina and China. Battery-grade lithium hydroxide is the preferred input for high-nickel NMC chemistries (Tesla high-end, premium EVs); battery-grade lithium carbonate is preferred for LFP chemistries (Chinese EVs, BYD, lower-cost models). The LFP shift in 2023–2025 changed the relative pricing of carbonate vs hydroxide.",
      },
      {
        heading: "Lithium price cycles and volatility",
        body: "Lithium prices are notoriously volatile. SC6 spodumene concentrate rose from ~USD 400/t in 2020 to a peak of ~USD 8,000/t in late 2022, fell to ~USD 850/t by mid-2024, and has bounced and flattened in 2025. Battery-grade lithium hydroxide followed a similar but lagged path. Most ASX pure-plays operate at AISC of USD 400–800/t SC6, meaning the 2024–25 price downturn was margin-compressing but not loss-making for the lower-cost producers. Investment thesis depends on long-run EV adoption assumptions and the cycle of supply additions versus demand growth.",
      },
    ],
    faqs: [
      {
        question: "Why is Australia such a dominant lithium producer?",
        answer: "Geological — the WA spodumene deposits at Greenbushes, Pilgangoora and Mount Marion are among the highest-grade and largest hard-rock lithium resources globally. Operational — established mining infrastructure, skilled workforce, and proximity to deepwater export ports (Port Hedland, Esperance) make WA a low-cost spodumene producer. Regulatory — Australia's mining permitting regime is well-established with clear native title and environmental approval pathways. Customer — strong offtake demand from Chinese lithium chemical converters (Tianqi, Ganfeng, Albemarle's Kemerton facility in WA) underpins concentrate sales.",
      },
      {
        question: "What's the difference between spodumene producers and integrated chemical producers?",
        answer: "Spodumene producers (PLS, MIN at Mount Marion) sell concentrate to Chinese chemical converters and earn a percentage of the hydroxide/carbonate price after conversion costs. Integrated producers (IGO via Greenbushes/Tianqi, Albemarle Kemerton, future Liontown plans) capture more of the value chain — the spread between concentrate value and hydroxide value can be USD 5,000+/t at high prices, USD 1,000+/t at depressed prices. Vertical integration is capital-intensive and operationally complex but materially expands margin per unit at scale.",
      },
      {
        question: "How does FIRB review affect lithium investment?",
        answer: "Lithium is on Australia's Critical Minerals List and is treated as a national-security sensitive sector under the FIRB framework. Foreign acquisition of substantial interests in Australian lithium projects triggers mandatory FIRB review with national-security assessment by the Department of Home Affairs. Several proposed Chinese acquisitions in 2023–2025 were either restructured or rejected under this regime. Domestic Australian investors via ASX equity face no FIRB constraints; international investors should plan for review timelines of 30–120 days.",
      },
    ],
    subcategories: [],
  },

  // ─── Uranium ───
  {
    slug: "uranium",
    label: "Uranium",
    dbVerticals: ["mining"],
    color: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      accent: "bg-green-600",
      gradient: "from-green-50 to-white",
    },
    icon: "flame",
    title: `Australian Uranium Investment (${yr})`,
    h1: "Australian Uranium Mining Investment",
    metaDescription: `ASX uranium producers (PDN, BOE), developers (DYL, BMN, AEE), explorers and the Global X ATOM ETF. FIRB double-approval rules. ${upd}.`,
    intro: `Australia holds the world's largest uranium reserves — approximately 30% of global identified resources — but produces only around 10% of global supply due to long-standing federal and state restrictions. ASX-listed uranium exposure spans operating producers, advanced developers, and exploration plays, plus the Global X Uranium ETF (ATOM). The investment thesis hinges on small modular reactor (SMR) demand and structural supply-demand deficit.`,
    sections: [
      {
        heading: "Australian uranium production and policy",
        body: "Three operating uranium mines in Australia: Olympic Dam (BHP, copper-gold-uranium polymetallic in SA), Four Mile (Heathgate Resources, ISR in SA), and Honeymoon (Boss Energy BOE, ISR in SA — restarted 2024). Ranger uranium mine in NT closed in 2021 and is in rehabilitation. Western Australia maintains its long-standing ban on new uranium mines under state policy; Queensland's policy stance similarly restricts new development. Federal export controls require all Australian uranium be sold under bilateral safeguards agreements (Nuclear Cooperation Agreements) ensuring peaceful, non-proliferation use only — typically with US, EU, Japan, South Korea, China and India.",
      },
      {
        heading: "ASX uranium investment universe",
        body: "Producers — Boss Energy (BOE, Honeymoon ISR producer) and Paladin Energy (PDN, Langer Heinrich in Namibia plus Australian exploration). Developers — Deep Yellow (DYL, Tumas in Namibia and Mulga Rock in WA pending state permitting), Bannerman Energy (BMN, Etango in Namibia), Alligator Energy (AGE, Samphire in SA), Aura Energy (AEE, Tiris in Mauritania). Explorers — multiple junior plays in NT, SA, Queensland and offshore. The Global X Uranium ETF (ATOM) on the ASX provides diversified exposure to the global uranium equity universe, including Cameco, Kazatomprom and the major US developers. Most pure-play uranium equities are highly leveraged to the spot uranium price.",
      },
      {
        heading: "Uranium demand thesis and risks",
        body: "Demand thesis — the IEA projects nuclear capacity to roughly double by 2050 under net-zero scenarios, driven by SMR deployment, French and US life-extensions, and Chinese build-out. Existing operating reactors require ~180Mlb U3O8 annually; primary mine supply runs around 145Mlb, with the gap covered by inventory drawdown, secondary supply (depleted uranium re-enrichment), and Russian sources progressively excluded under sanctions. Risks — uranium price volatility (spot moved from USD 30/lb in 2020 to USD 100+/lb in early 2024 to USD 70/lb mid-2025), permitting delays at Australian projects, geopolitical risk for African production, and the always-present nuclear-incident tail risk that has historically shut entire reactor fleets (Fukushima, Three Mile Island).",
      },
    ],
    faqs: [
      {
        question: "Why is Australia's uranium production so much smaller than its reserves?",
        answer: "State-government policy. Western Australia maintains a long-standing ban on new uranium mines under successive Labor governments. Queensland has similarly restricted new development. Only South Australia and the Northern Territory permit uranium production at scale, and federal export controls limit market access to safeguard-approved customer countries. The political settlement around uranium has been stable for decades — large-scale capacity expansion in WA or Queensland would require material state-government policy change.",
      },
      {
        question: "What is FIRB double-approval for uranium?",
        answer: "Uranium is treated as a national-security-sensitive sector under the FIRB framework. Foreign acquisition of a substantial interest in an Australian uranium asset typically requires both (a) standard FIRB approval under the Foreign Acquisitions and Takeovers Act, and (b) a separate Department of Home Affairs national-security review and conditional approval, often with non-disposal undertakings and end-use restrictions. Approval timelines run 60–180 days. Domestic Australian investors via ASX equity face no FIRB constraints.",
      },
      {
        question: "How do I invest in uranium without taking single-stock risk?",
        answer: "Global X Uranium ETF (ATOM) on the ASX — provides diversified exposure to global uranium producers, developers and physical uranium funds. The ASX-listed Sprott Physical Uranium Trust U.U / Yellow Cake (YCA) on the LSE — direct physical uranium exposure (Sprott trust is unlisted in Australia but accessible via offshore brokerage). Diversifying across 3–5 ASX-listed names (BOE, PDN, DYL, BMN, AEE) provides a manual basket. Single-stock uranium plays carry exploration, permitting, technical and price risk in compounding combination.",
      },
    ],
    subcategories: [],
  },

  // ─── Oil & Gas ───
  {
    slug: "oil-gas",
    label: "Oil & Gas",
    dbVerticals: ["energy"],
    color: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      accent: "bg-amber-600",
      gradient: "from-amber-50 to-white",
    },
    icon: "flame",
    title: `Australian Oil & Gas Investment (${yr})`,
    h1: "Australian Oil & Gas Investment",
    metaDescription: `ASX oil and gas majors (WDS, STO), LNG export thesis, gas reservation policy, petroleum royalties and FIRB national-security review. ${upd}.`,
    intro: `Australia is the world's second-largest LNG exporter, with operations centred on the North West Shelf, Gorgon, Wheatstone, Ichthys and Pluto projects in WA, plus the Gladstone CSG-LNG complex in Queensland. ASX-listed oil and gas exposure is dominated by Woodside Energy (WDS) and Santos (STO), with mid-cap names including Beach Energy (BPT), Karoon Energy (KAR) and Strike Energy (STX).`,
    sections: [
      {
        heading: "Australian oil and gas sector structure",
        body: "Woodside Energy (WDS) — the largest pure-play, operating Pluto LNG, Wheatstone and the North West Shelf venture, plus the merged BHP Petroleum US Gulf assets. Santos (STO) — significant CSG-LNG exposure via Gladstone GLNG, plus Cooper Basin and Western Australian assets, with the merger conversation with Woodside live since 2024. Beach Energy (BPT) — Cooper Basin gas and oil. Karoon Energy (KAR) — Brazil deepwater oil. Strike Energy (STX), Cooper Energy (COE) — domestic gas producers servicing east-coast and Western Australian markets. The east-coast domestic gas market is structurally tight, with reservation policy and price caps a recurring political issue.",
      },
      {
        heading: "Gas reservation policy and east-coast market dynamics",
        body: "Western Australia's domestic gas reservation policy requires LNG project operators to reserve 15% of project gas for the WA domestic market — a long-standing arrangement that has kept WA domestic gas prices relatively contained. The east coast has no equivalent federal reservation policy; gas prices on the east coast surged in 2022–2024, prompting the federal Gas Code of Conduct (December 2023) imposing $12/GJ price caps on uncontracted gas and mandatory information disclosure. The Albanese government has signalled further intervention if east-coast supply tightness continues — a policy risk overhang for Queensland and offshore Bass Strait producers.",
      },
      {
        heading: "Petroleum royalties, PRRT and the tax framework",
        body: "Petroleum projects in Australia pay a combination of state royalties (Queensland CSG-LNG, NSW), federal royalties on certain offshore projects, and the Petroleum Resource Rent Tax (PRRT) — a profit-based tax of 40% applied to the project's taxable profit after deduction of capital and operating costs. PRRT was reformed in 2024 with a cap on uplifted exploration expenditure deduction at 90% of taxable profit, accelerating PRRT payments from major LNG projects. Royalties are deductible against PRRT. Foreign acquisition of substantial petroleum assets triggers FIRB review with national-security assessment under the strategic-asset framework.",
      },
    ],
    faqs: [
      {
        question: "How do Australian LNG project earnings track LNG prices?",
        answer: "Most Australian LNG cargoes are sold under long-term oil-linked or hub-linked contracts, with contract pricing lagging spot LNG by 3–6 months. JKM (Japan-Korea Marker) is the Asian spot LNG benchmark; Henry Hub and TTF are the US and European hub references. WDS and STO report realised LNG prices that reflect their contract mix — typically 70%–85% long-term contracted, 15%–30% spot. Realised price changes lag spot moves, and capex outlook depends on long-term demand assumptions through to the late 2030s — the disputed timeline for global LNG demand peak.",
      },
      {
        question: "What's the outlook for east-coast Australian gas?",
        answer: "Structurally tight. Bass Strait depletion and limited new supply from the Cooper Basin combine with QLD CSG-LNG export commitments to leave east-coast domestic supply at risk through 2026–2030. Federal price caps under the Gas Code of Conduct are in place. New supply from Beetaloo Basin (NT, Origin/Tamboran) and offshore Otway Basin developments are the main supply-side catalysts, with regulatory and environmental approval risk. Investment thesis depends on resolution of the supply-policy tension.",
      },
      {
        question: "Are oil and gas stocks compatible with ESG-focused investing?",
        answer: "Tension. Major Australian super funds (AustralianSuper, Aware Super, HESTA) have material oil-and-gas equity holdings while running stewardship programs targeting net-zero alignment. Pure-divestment strategies (no fossil fuel exposure) are available via specific ETFs (BetaShares ETHI, Vanguard ESGI, etc.). Engagement-focused approaches retain exposure but vote shareholdings on climate transition plans — the Australian say-on-climate motion at WDS and STO AGMs has been a recurring vote. Personal investment philosophy and the role of Australian gas in transition pathways are at the centre of the debate.",
      },
    ],
    subcategories: [],
  },

  // ─── Hydrogen ───
  {
    slug: "hydrogen",
    label: "Hydrogen",
    dbVerticals: ["energy"],
    color: {
      bg: "bg-neutral-50",
      border: "border-neutral-200",
      text: "text-neutral-700",
      accent: "bg-neutral-600",
      gradient: "from-neutral-50 to-white",
    },
    icon: "flame",
    title: `Australian Hydrogen Investment (${yr})`,
    h1: "Australian Hydrogen Investment",
    metaDescription: `ASX-listed hydrogen plays (HXG, FFI, GLN, HE8), Hydrogen Headstart program, export demand thesis and pre-revenue caution. ${upd}.`,
    intro: `Australia's hydrogen ambition centres on green hydrogen for export to Japan, South Korea and Europe, plus domestic decarbonisation of steel, fertiliser and heavy transport. The federal Hydrogen Headstart program offers $2B in production credits, with the inaugural shortlist announced in 2024. Most ASX-listed hydrogen pure-plays remain pre-revenue and require equity raises ahead of FID.`,
    sections: [
      {
        heading: "ASX hydrogen investment universe",
        body: "Pure-play developers — Hexagon Energy Materials (HXG), Province Resources (PRL, joint venture with Total Eren on HyEnergy in WA), Hazer Group (HZR, methane pyrolysis), Pure Hydrogen (PH2), Sparc Hydrogen (SPN), Global Energy Ventures (GEV, hydrogen shipping). Larger names with hydrogen exposure — Fortescue (FMG, via Fortescue Future Industries spin-out plans), Origin Energy (ORG, Hunter Valley Hydrogen Hub), Woodside (WDS, H2OK in the US, H2Perth in WA — though several projects have been cancelled or delayed), AGL (AGL, Hunter Energy Hub conceptual). HE8 (Hydrogen Energy Australia) and similar names trade as speculative pre-revenue plays.",
      },
      {
        heading: "Hydrogen Headstart and federal policy support",
        body: "The Hydrogen Headstart program (announced May 2023, expanded 2024) provides $2B in production-linked contracts-for-difference for green hydrogen production, with the inaugural shortlist of 6 projects announced in 2024 — Murchison (Province/Total Eren JV), Hunter Valley Hydrogen Hub (Origin), HyEnergy and others. The program closes part of the green-hydrogen production-cost gap relative to grey/blue hydrogen and to international competitors. State-level support includes WA Renewable Hydrogen Strategy, NSW Hydrogen Strategy, and QLD's hydrogen industry roadmap. CEFC and ARENA grant programs supplement equity capital for early-stage projects.",
      },
      {
        heading: "Pre-revenue caution and the export demand thesis",
        body: "The hydrogen export thesis hinges on customer offtake at delivered prices that close the gap with grey/blue hydrogen and with alternative low-carbon technologies (electrification, batteries, CCS-blue ammonia). Japanese and Korean utilities have signed early offtake LoIs but firm contracts at scale remain limited. Capex per project runs USD 3B–10B+, requiring multi-decade contracts to underwrite. Many ASX hydrogen pure-plays are at the FEED or pre-FEED stage with no revenue, modest cash balances, and recurring equity dilution. Investor risk is high — historical hydrogen-project cancellations include Woodside's H2Perth, multiple Fortescue green-hydrogen projects, and several joint-venture realignments through 2024–2025.",
      },
    ],
    faqs: [
      {
        question: "What are the differences between green, blue and grey hydrogen?",
        answer: "Grey hydrogen — produced from natural gas via steam methane reforming with CO2 vented to atmosphere; the dominant industrial source today. Blue hydrogen — same process with carbon capture and storage (CCS) attached, reducing emissions by 60%–95% depending on capture rate. Green hydrogen — produced via electrolysis of water powered by renewable electricity, near-zero emissions when the input electricity is renewable. The Australian export thesis is dominantly green; CCS-blue projects (Woodside H2OK, Santos Moomba CCS) exist but face emerging concerns about capture rate verification and long-term storage integrity.",
      },
      {
        question: "Why are hydrogen projects so capital-intensive?",
        answer: "Production economics — at-scale electrolysis projects need 1GW+ of dedicated renewable generation, transmission to electrolyser site, electrolyser stack capex of USD 800–1500/kW, water treatment, hydrogen compression and either ammonia synthesis or liquefaction for export shipping. The integrated capex for a 100,000 tpa green hydrogen project runs USD 3B–10B with payback periods of 12–25 years against current production-cost gaps. Subsidy regimes (Hydrogen Headstart, US IRA s45V, EU CBAM/Hydrogen Bank) are essential to closing the gap to bankability.",
      },
      {
        question: "Is hydrogen investment appropriate for retail Australian investors?",
        answer: "High-risk speculative exposure only. Most ASX hydrogen pure-plays are pre-revenue, dependent on continued government policy support, and subject to recurring equity dilution and project-cancellation risk. Position size should be small (single-digit % of portfolio at most) and timeline expectations should be 5–15 years. Diversified renewable-energy exposure via ETFs (FUEL, ERTH, CLNE) provides indirect hydrogen exposure with lower single-project risk. Direct allocation to hydrogen pure-plays only after reading the project economics, equity raise pipeline and management track record carefully.",
      },
    ],
    subcategories: [],
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
