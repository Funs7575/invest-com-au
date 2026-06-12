import type { Broker } from "./types";

export interface HowToGuide {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  steps: { heading: string; body: string }[];
  relatedBrokerFilter: (b: Broker) => boolean;
  relatedBestPages: { label: string; href: string }[];
  faqs: { question: string; answer: string }[];
  verticalLink: string;
}

export const HOW_TO_GUIDES: HowToGuide[] = [
  {
    slug: "buy-shares",
    title: "How to Buy Shares in Australia (2026) — Step-by-Step Guide",
    h1: "How to Buy Shares in Australia",
    metaDescription:
      "Learn how to buy shares in Australia in 6 simple steps. Compare brokers, open an account, and place your first trade. Updated March 2026.",
    intro:
      "Buying shares in Australia has never been easier. With $0 brokerage platforms now available and fully digital sign-up processes, you can go from zero to owning your first ASX shares in under 30 minutes. This guide walks you through every step — from choosing the right broker to placing your first trade and monitoring your portfolio over time. Whether you're investing $500 or $50,000, the process is the same.",
    steps: [
      {
        heading: "Choose a Share Trading Platform",
        body: `The first step is selecting an online broker that suits your needs. In Australia, you have dozens of options ranging from big-bank brokers like CommSec to zero-fee platforms like Stake and Moomoo. Key factors to compare include brokerage fees (how much each trade costs), whether the platform offers CHESS sponsorship (meaning shares are held in your name on the ASX register), the range of markets available, and the quality of the trading app or platform.

For beginners, we recommend starting with a platform that offers low or zero brokerage fees and a simple, intuitive interface. This lets you learn the ropes without paying excessive fees on small trades. You can always switch brokers later as your needs evolve — transferring CHESS-sponsored holdings between brokers is straightforward.

Consider whether you want to trade Australian shares only, or also access US and international markets. Some platforms excel at ASX trading while others are better for global investing. Check our comparison table below to see how the top platforms stack up.`,
      },
      {
        heading: "Open Your Brokerage Account",
        body: `Opening a brokerage account in Australia is entirely online and typically takes 5 to 15 minutes. You'll need your full name, date of birth, residential address, Tax File Number (TFN), and a valid photo ID (driver's licence or passport). Most platforms verify your identity electronically in real time, though some may require you to upload a photo of your ID.

Providing your TFN is optional but highly recommended — without it, your broker is required to withhold tax at the highest marginal rate on any dividends you receive. Your TFN is protected by law and can only be used for authorised purposes.

Once your account is approved (usually instantly or within one business day), you'll receive your unique Holder Identification Number (HIN) if the platform is CHESS-sponsored. This is your personal identifier on the ASX subregister and proves that you own the shares directly.`,
      },
      {
        heading: "Deposit Funds Into Your Account",
        body: `Before you can buy shares, you need to transfer money into your brokerage account. Most Australian platforms accept bank transfers (PayID, BPAY, or direct deposit), and some also accept debit cards or POLi payments. Bank transfers are free but may take 1–2 business days to clear, while PayID and card payments are often instant.

There's no legal minimum amount required to start investing in shares, though some platforms have minimum trade sizes (often $500 for ASX shares). Practically, it makes sense to start with enough to cover brokerage fees without them eating into your returns — if your broker charges $10 per trade, investing $100 means you've already lost 10% to fees before your shares move.

With $0 brokerage platforms, you can invest as little as you like without fee drag. Some platforms also offer fractional shares, letting you buy a portion of an expensive share rather than needing the full price.`,
      },
      {
        heading: "Research the Stocks You Want to Buy",
        body: `Before placing your first order, spend time understanding what you're buying. For beginners, Exchange-Traded Funds (ETFs) are an excellent starting point — they give you instant diversification across dozens or hundreds of companies in a single purchase. Popular ASX ETFs include VAS (Vanguard Australian Shares), IVV (iShares S&P 500), and A200 (BetaShares Australia 200).

If you want to buy individual company shares, research the company's financial health, earnings history, competitive position, and growth prospects. Your broker's platform will usually provide basic company data, charts, and analyst ratings. For deeper research, consider free resources like the ASX website, company annual reports, and financial news outlets.

A core principle for beginners: diversify. Don't put all your money into a single stock. Spread your investments across different companies, industries, and even countries. This reduces your risk if one company or sector underperforms. Many financial advisers suggest starting with broad ETFs and then adding individual stocks as you gain experience and confidence.`,
      },
      {
        heading: "Place Your First Trade",
        body: `You're ready to buy. On your broker's platform, search for the share or ETF by its ASX code (e.g., "VAS" for Vanguard Australian Shares). Select "Buy" and you'll be asked to choose between a market order (buy at the current price) or a limit order (set the maximum price you're willing to pay).

Market orders execute immediately at the best available price — simple and fast. Limit orders let you set a price ceiling, which is useful if the share price is volatile or you want to wait for a dip. For beginners buying liquid ETFs or blue-chip shares, market orders are usually fine.

Enter the number of shares (or dollar amount on platforms supporting dollar-based ordering), review the order summary including any brokerage fees, and confirm. Your order will be sent to the ASX and typically settles on a T+2 basis — meaning you officially own the shares two business days after the trade executes. Your portfolio will update immediately to show the pending settlement.`,
      },
      {
        heading: "Monitor and Manage Your Portfolio",
        body: `Congratulations — you own shares! Now comes the important part: managing your investments for the long term. Your broker's app or website will show your portfolio value, individual holdings, gains and losses, and any dividends received.

For most investors, the best strategy is to invest regularly (monthly or quarterly) and hold for the long term. This approach, called dollar-cost averaging, means you buy more shares when prices are low and fewer when prices are high, smoothing out your average purchase price over time. Resist the urge to check your portfolio daily or panic-sell during market dips — historically, the Australian share market has returned around 9–10% per year over the long term.

Come tax time (July each year), your broker will provide a tax summary showing your dividends, capital gains, and franking credits. If you hold shares for more than 12 months before selling, you receive a 50% capital gains tax discount. Keep records of all your buy and sell transactions for your tax return.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker",
    relatedBestPages: [
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
      { label: "Share Trading Platforms", href: "/share-trading" },
    ],
    faqs: [
      {
        question: "How much money do I need to start buying shares in Australia?",
        answer:
          "There's no legal minimum, but practically most brokers have a minimum trade size of $500 for ASX shares. With $0 brokerage platforms, you can invest small amounts without fees eating into returns. Some platforms also offer fractional shares, letting you start with as little as $1.",
      },
      {
        question: "Do I need an ABN or special licence to buy shares?",
        answer:
          "No. Any Australian resident aged 18 or over can open a brokerage account and buy shares. You'll need a valid ID and your Tax File Number. No ABN, special licence, or qualifications are required.",
      },
      {
        question: "What is CHESS sponsorship and why does it matter?",
        answer:
          "CHESS (Clearing House Electronic Subregister System) is the ASX's settlement system. With a CHESS-sponsored broker, your shares are held directly in your name on the ASX register. This means you have direct legal ownership, even if your broker goes bust. Custodial brokers hold shares on your behalf, which adds a layer of counterparty risk.",
      },
      {
        question: "How are shares taxed in Australia?",
        answer:
          "Dividends are taxed as income but may include franking credits that reduce your tax. Capital gains (profit from selling shares) are added to your income. If you hold shares for more than 12 months, you receive a 50% capital gains tax discount. Losses can be used to offset gains.",
      },
      {
        question: "Can I buy US shares from Australia?",
        answer:
          "Yes. Most Australian brokers now offer US share trading. Platforms like Stake, Moomoo, and Interactive Brokers let you buy US shares and ETFs, often with competitive FX rates. You'll need to complete a W-8BEN form for US tax treaty benefits.",
      },
      {
        question: "What's the difference between shares and ETFs?",
        answer:
          "A share represents ownership in a single company (e.g., BHP, CBA). An ETF (Exchange-Traded Fund) is a basket of shares that trades on the stock exchange like a single share. ETFs offer instant diversification — for example, VAS holds 300+ Australian companies in one purchase.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "buy-bitcoin",
    title: "How to Buy Bitcoin in Australia (2026) — Step-by-Step Guide",
    h1: "How to Buy Bitcoin in Australia",
    metaDescription:
      "Learn how to buy Bitcoin in Australia in 5 simple steps. Compare crypto exchanges, verify your identity, and secure your BTC. Updated March 2026.",
    intro:
      "Bitcoin is the most popular cryptocurrency in Australia, and buying it has become remarkably straightforward. Australian crypto exchanges are regulated by AUSTRAC, accept AUD deposits, and let you buy Bitcoin in minutes. This guide covers everything from choosing an exchange to securing your Bitcoin — whether you're buying $50 or $50,000 worth.",
    steps: [
      {
        heading: "Choose an Australian Crypto Exchange",
        body: `Start by selecting a reputable crypto exchange that's registered with AUSTRAC (Australian Transaction Reports and Analysis Centre). This is the minimum regulatory requirement for operating a digital currency exchange in Australia, and it means the platform must comply with anti-money laundering and counter-terrorism financing laws.

Key factors to compare include trading fees (typically 0.1% to 1% per trade), the spread (difference between buy and sell prices), deposit methods (PayID, bank transfer, card), and the range of cryptocurrencies available. Some exchanges specialise in Bitcoin and a few major coins, while others list hundreds of altcoins.

Also consider the platform's security track record, whether they offer a mobile app, and their customer support responsiveness. Australian exchanges like CoinSpot and Swyftx are well-established, while global platforms like Binance and Kraken also serve Australian customers. Check our comparison table below to see how the top exchanges compare on fees and features.`,
      },
      {
        heading: "Verify Your Identity (KYC)",
        body: `All AUSTRAC-registered exchanges are legally required to verify your identity before you can trade. This Know Your Customer (KYC) process typically involves uploading a photo of your driver's licence or passport, taking a selfie for facial verification, and providing your residential address.

Most exchanges verify your identity within minutes using automated checks, though it can take up to 24 hours in some cases. Some platforms let you start with basic verification (limited to smaller transactions) and upgrade to full verification later for higher limits.

This verification requirement exists to prevent money laundering and fraud. While it may feel intrusive, it's actually a positive sign — it means the exchange is following Australian regulations and taking compliance seriously. Unregulated platforms that don't require KYC should be treated with extreme caution.`,
      },
      {
        heading: "Deposit Australian Dollars",
        body: `Once verified, deposit AUD into your exchange account. Most Australian exchanges offer several deposit methods: PayID (instant and free), bank transfer (1–2 business days, usually free), POLi (instant), and credit/debit card (instant but often carries a 1–2% fee).

PayID is usually the best option — it's instant, free, and supported by all major Australian banks. Simply use the exchange's PayID details (usually an email address or phone number linked to their account) and the deposit appears within seconds.

Start with a small amount for your first purchase — $50 or $100 is enough to go through the entire buy process and get comfortable with the platform. You can always deposit more later. There's no rush, and Bitcoin is divisible to eight decimal places (0.00000001 BTC, called a "satoshi"), so you can buy a tiny fraction of a Bitcoin.`,
      },
      {
        heading: "Buy Bitcoin",
        body: `With AUD in your account, you're ready to buy Bitcoin. Navigate to the BTC/AUD trading pair and choose between an instant buy (simple, slightly higher spread) or a limit order (you set the price, lower cost but may not fill immediately).

For beginners, the instant buy or market order is easiest — you enter the AUD amount you want to spend, review the price and fees, and confirm. The Bitcoin is credited to your exchange wallet instantly. Most exchanges show the exact amount of BTC you'll receive before you confirm.

If you plan to buy Bitcoin regularly, consider setting up recurring buys. Many Australian exchanges let you automate weekly or monthly purchases — a strategy called dollar-cost averaging. This removes the stress of trying to time the market and smooths out your average purchase price over time. Even $25 or $50 per week adds up significantly over months and years.`,
      },
      {
        heading: "Secure Your Bitcoin",
        body: `Once you've bought Bitcoin, consider how you want to store it. You have three main options: leave it on the exchange (convenient but you're trusting the exchange), transfer it to a software wallet on your phone (more secure, you control the keys), or use a hardware wallet like Ledger or Trezor (most secure for large amounts).

For small amounts (under $1,000), keeping your Bitcoin on a reputable Australian exchange is reasonable — they have insurance policies and security measures in place. For larger holdings, a hardware wallet gives you complete control over your private keys, meaning no one (including the exchange) can access your Bitcoin.

If you do use a hardware wallet or software wallet, you'll receive a recovery seed phrase — usually 12 or 24 words. Write this down on paper and store it securely. Never store your seed phrase digitally (no photos, no cloud storage, no notes apps). If you lose your seed phrase and your wallet is damaged, your Bitcoin is permanently lost.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "crypto_exchange",
    relatedBestPages: [
      { label: "Best Crypto Exchanges", href: "/best/crypto" },
      { label: "Crypto Platforms Overview", href: "/crypto" },
    ],
    faqs: [
      {
        question: "Is Bitcoin legal in Australia?",
        answer:
          "Yes. Bitcoin is legal to buy, sell, and hold in Australia. The ATO treats it as an asset for capital gains tax purposes. Crypto exchanges must register with AUSTRAC and comply with AML/CTF laws.",
      },
      {
        question: "How much Bitcoin can I buy with $100 AUD?",
        answer:
          "Bitcoin is divisible to eight decimal places, so you can buy a fraction with any amount. At a price of $150,000 AUD per Bitcoin, $100 would buy approximately 0.000667 BTC. The exact amount depends on the current price and your exchange's fees.",
      },
      {
        question: "Do I have to pay tax on Bitcoin in Australia?",
        answer:
          "Yes. The ATO treats Bitcoin as an asset subject to capital gains tax. If you sell Bitcoin for more than you paid, the profit is a capital gain and must be declared. If you hold for more than 12 months, you get the 50% CGT discount. Using Bitcoin to buy goods or swap for other crypto is also a taxable event.",
      },
      {
        question: "What's the safest way to store Bitcoin?",
        answer:
          "For large amounts, a hardware wallet (like Ledger or Trezor) is the safest option — your private keys never touch the internet. For smaller amounts, a reputable AUSTRAC-registered exchange with insurance and 2FA is acceptable. Never share your private keys or recovery seed phrase with anyone.",
      },
      {
        question: "Can I lose all my money investing in Bitcoin?",
        answer:
          "Yes. Bitcoin is highly volatile and speculative. Its price can drop 30-50% in a matter of weeks. There is no government guarantee or compensation scheme for crypto losses in Australia. Only invest what you can afford to lose entirely.",
      },
    ],
    verticalLink: "/crypto",
  },
  {
    slug: "buy-etfs",
    title: "How to Buy ETFs in Australia (2026) — Step-by-Step Guide",
    h1: "How to Buy ETFs in Australia",
    metaDescription:
      "Learn how to buy ETFs in Australia in 5 simple steps. Compare brokers, understand ETF types, and build a diversified portfolio. Updated March 2026.",
    intro:
      "Exchange-Traded Funds (ETFs) are the most popular investment vehicle for Australian beginners and experienced investors alike. They offer instant diversification, low fees, and the simplicity of buying a single ticker on the ASX. This guide walks you through understanding ETFs, choosing the right broker, selecting your first ETFs, and building a long-term portfolio.",
    steps: [
      {
        heading: "Understand What ETFs Are and Why They're Popular",
        body: `An ETF is a managed fund that trades on the stock exchange like a regular share. When you buy one unit of VAS (Vanguard Australian Shares), for example, you're effectively buying a tiny slice of over 300 Australian companies in a single transaction. This instant diversification is the primary appeal of ETFs.

ETFs charge an annual management fee (called the MER — Management Expense Ratio), which is deducted from the fund's value automatically. Index ETFs typically charge 0.03% to 0.25% per year — far cheaper than actively managed funds which often charge 1–2%. On a $10,000 investment, a 0.07% MER costs just $7 per year.

There are ETFs for almost every investment strategy: Australian shares (VAS, A200, IOZ), US shares (IVV, NDQ, VTS), global shares (VGS, VGAD), bonds (VAF, VGB), property (VAP), gold (GOLD, PMGOLD), and even thematics like cybersecurity or clean energy. This variety lets you build a diversified portfolio using just 3–5 ETFs.`,
      },
      {
        heading: "Choose a Low-Cost Broker",
        body: `Since ETFs trade on the ASX just like shares, you need a share trading account to buy them. The broker you choose matters because brokerage fees directly impact your returns — especially if you're investing small amounts regularly.

For ETF investors who make regular monthly purchases, zero-brokerage platforms like Stake and Moomoo are ideal. If you invest $500 monthly with a $10 brokerage fee, you lose 2% of every contribution to fees. With $0 brokerage, that money stays invested and compounding.

Other important features for ETF investors include automatic dividend reinvestment plans (DRPs), portfolio reporting for tax time, and the ability to set up recurring buy orders. Some brokers also offer CHESS sponsorship, which means your ETF units are held directly in your name — an important consideration for long-term holders.`,
      },
      {
        heading: "Pick Your First ETFs",
        body: `For beginners, a simple two or three-ETF portfolio covers all the bases. A popular starter portfolio looks like this: VAS or A200 (Australian shares, ~40%), VGS (International shares, ~40%), and VAF (Australian bonds, ~20%). This gives you exposure to thousands of companies globally with just three purchases.

When selecting ETFs, compare the MER (lower is better), fund size (larger is better for liquidity), tracking error (how closely it follows the index), and whether it's domiciled in Australia (for tax efficiency). The biggest ETF providers on the ASX are Vanguard, BetaShares, iShares (BlackRock), and VanEck.

Avoid the temptation to buy too many niche or thematic ETFs when starting out. A broad market index ETF gives you exposure to all sectors automatically. As your portfolio grows and your knowledge deepens, you can add satellite ETF positions in specific themes you believe in — but your core should remain in diversified, low-cost index funds.`,
      },
      {
        heading: "Place Your ETF Order",
        body: `Buying an ETF works exactly like buying a share. Search for the ETF code on your broker's platform (e.g., "VAS"), select "Buy", choose the number of units or dollar amount, and confirm. The order settles on T+2, and the ETF units appear in your portfolio.

For ETFs, market orders are usually fine since popular ETFs like VAS and IVV have tight bid-ask spreads (the difference between the buy and sell price). However, avoid trading in the first and last 15 minutes of the trading day when spreads can widen. The middle of the trading day offers the best pricing.

If you're investing a lump sum, you might consider splitting it across 2–3 purchases over a few weeks. This protects you from buying everything at a short-term peak. For regular ongoing investments, set up a recurring buy schedule — many investors choose to invest on the same day each month, immediately after their pay arrives.`,
      },
      {
        heading: "Rebalance and Grow Your Portfolio",
        body: `Once you've built your initial ETF portfolio, the ongoing work is minimal. Check your allocations every 6–12 months to ensure they haven't drifted too far from your targets. If your Australian shares have grown to 55% of your portfolio but your target is 40%, you can rebalance by buying more international shares with your next contribution.

Reinvesting dividends is crucial for long-term returns. Most ETFs pay distributions quarterly (March, June, September, December). You can reinvest these manually by buying more units, or set up a Dividend Reinvestment Plan (DRP) through your broker or the ETF provider's registrar (Computershare or Link Market Services).

Over decades, a simple 3-ETF portfolio with regular contributions and reinvested dividends can build substantial wealth. The power of compounding means that a $500/month contribution growing at 8% per year becomes over $370,000 after 20 years — and over $950,000 after 30 years. The key is starting early, contributing consistently, and resisting the urge to time the market.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" && (b.asx_fee_value ?? 100) <= 10,
    relatedBestPages: [
      { label: "Best Brokers for ETF Investing", href: "/best/etf-investing" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
      { label: "Share Trading Platforms", href: "/share-trading" },
    ],
    faqs: [
      {
        question: "What is the best ETF to buy in Australia for beginners?",
        answer:
          "VAS (Vanguard Australian Shares Index) and VGS (Vanguard MSCI International) are the most popular starter ETFs. VAS gives you exposure to 300+ Australian companies, while VGS covers 1,500+ international companies. Together, they provide broad global diversification at a combined MER under 0.15%.",
      },
      {
        question: "How much money do I need to start investing in ETFs?",
        answer:
          "Most ASX-listed ETFs can be bought for under $100 per unit. With $0 brokerage platforms, you can start with a single unit. Practically, investing at least $500 at a time is sensible to keep any brokerage costs proportional. Some platforms offer fractional ETF investing from as little as $1.",
      },
      {
        question: "Are ETFs safer than individual shares?",
        answer:
          "ETFs are generally considered lower risk than individual shares because they're diversified across many companies. If one company in the ETF performs poorly, it has a limited impact on your overall return. However, ETFs still carry market risk — if the entire market falls, your ETF will fall too.",
      },
      {
        question: "Do ETFs pay dividends?",
        answer:
          "Yes. Most Australian ETFs pay distributions (dividends) quarterly — in March, June, September, and December. The amount varies based on the dividends paid by the underlying companies. Australian share ETFs often include franking credits, which can reduce your tax bill.",
      },
      {
        question: "What is the difference between VAS and A200?",
        answer:
          "Both are Australian share index ETFs. VAS tracks the ASX 300 (300 companies) with a 0.07% MER. A200 tracks the ASX 200 (200 companies) with a 0.04% MER. In practice, their performance is nearly identical. A200 is slightly cheaper; VAS is slightly more diversified.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "open-brokerage-account",
    title: "How to Open a Brokerage Account in Australia (2026)",
    h1: "How to Open a Brokerage Account in Australia",
    metaDescription:
      "Step-by-step guide to opening a brokerage account in Australia. What you need, how long it takes, and which brokers are best. Updated March 2026.",
    intro:
      "Opening a brokerage account is the gateway to investing in shares, ETFs, and other financial products on the ASX. The process is fully online, takes 5 to 15 minutes, and you can usually start trading the same day. This guide covers everything you need to know — from comparing brokers and gathering your documents to funding your account and placing your first trade.",
    steps: [
      {
        heading: "Compare Brokers and Choose the Right One",
        body: `Before opening an account, compare the available platforms to find one that matches your investing style. The key factors to evaluate are brokerage fees (cost per trade), available markets (ASX only, or also US/international), account types (individual, joint, trust, SMSF), CHESS sponsorship, and platform quality.

If you're a beginner making small, regular investments, a zero-brokerage platform like Stake or Moomoo minimises costs. If you need advanced tools, international market access, or margin lending, consider Interactive Brokers or CMC Markets. If you want the familiarity of a big-bank broker, CommSec or nabtrade integrate with your existing banking.

Don't overthink this decision — you can always open a second brokerage account later or transfer your holdings between CHESS-sponsored brokers. The most important thing is to get started. Check our comparison table below for a side-by-side view of the top platforms.`,
      },
      {
        heading: "Gather Your Documents",
        body: `To open a brokerage account in Australia, you'll need the following: a valid photo ID (Australian driver's licence or passport), your residential address (must match your ID or a recent utility bill), your Tax File Number (TFN), your bank account details for linking deposits and withdrawals, and your mobile phone number for two-factor authentication.

If you're opening a joint account, both account holders need to provide their ID and TFN. For company, trust, or SMSF accounts, you'll also need the entity's ABN, trust deed, or SMSF establishment documents.

Having everything ready before you start the application means you can complete it in one sitting without delays. Most platforms use electronic identity verification (eIDV), which checks your details against government databases in real time — so you don't need to mail or upload certified copies of documents.`,
      },
      {
        heading: "Complete the Online Application",
        body: `Visit your chosen broker's website or download their app, and start the account opening process. You'll typically go through these steps: enter your personal details, verify your identity (upload ID photo and take a selfie), provide your TFN, agree to the terms and conditions, and set up your login credentials.

Most applications take 5–10 minutes to complete. The identity verification step is usually the longest — some platforms verify you instantly using eIDV, while others may take a few hours or up to one business day if manual review is required.

Read the Product Disclosure Statement (PDS) and Financial Services Guide (FSG) before accepting the terms. These documents outline the platform's fees, features, risks, and complaint handling processes. While it's tempting to skip these, they contain important information about how your money and shares are handled.`,
      },
      {
        heading: "Verify Your Identity",
        body: `All Australian brokers are required by law to verify your identity before you can trade. This Know Your Customer (KYC) process is mandated by AUSTRAC under anti-money laundering regulations.

Most platforms use a combination of electronic identity verification (checking your details against government databases) and document verification (you upload a photo of your ID). Some also require a selfie or short video for biometric matching.

If automatic verification fails — which can happen if your name or address doesn't exactly match government records — you may need to provide additional documentation such as a utility bill, bank statement, or Medicare card. Contact the broker's support team if you get stuck — they process these manually and it's usually resolved within 24 hours.`,
      },
      {
        heading: "Fund Your Account",
        body: `Once approved, link your bank account and make your first deposit. Most brokers offer multiple deposit methods: PayID or Osko (instant, free), direct bank transfer (1–2 business days, free), BPAY (1 business day), and sometimes debit/credit card (instant but may incur a small fee).

PayID is the best option for most people — it's instant and free. Your broker will provide their PayID details along with a unique reference number to link the deposit to your account. Once the funds arrive, they'll appear in your available cash balance.

Some brokers don't require an upfront deposit — you can fund your account only when you're ready to make your first trade. Others have minimum deposit requirements ranging from $0 to $500. Check your broker's specific requirements on their website.`,
      },
      {
        heading: "Start Trading",
        body: `With your account funded, you're ready to buy shares, ETFs, or other products. Search for a security by its ASX code or name, select the number of units or dollar amount you want to buy, choose your order type (market or limit), review the order summary, and confirm.

Your first trade is a milestone worth celebrating — you're now an investor. After the initial excitement, take time to explore your broker's platform features: watchlists, price alerts, portfolio analytics, company research, and dividend tracking. Getting familiar with these tools will make you a more informed investor over time.

Consider setting up two-factor authentication (2FA) if you haven't already, and review your account security settings. Enable email notifications for trade confirmations and account activity. These are simple steps that protect your account and keep you informed about your investments.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker",
    relatedBestPages: [
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
      { label: "Share Trading Platforms", href: "/share-trading" },
    ],
    faqs: [
      {
        question: "How long does it take to open a brokerage account?",
        answer:
          "Most online applications take 5–15 minutes to complete. Identity verification is usually instant with eIDV, though some platforms may take up to 24 hours. You can typically start trading the same day you apply.",
      },
      {
        question: "Do I need a minimum amount to open a brokerage account?",
        answer:
          "Many Australian brokers have no minimum deposit requirement. Some platforms like CommSec require no upfront deposit — you fund your account when you're ready to trade. Others may have minimums ranging from $0 to $500.",
      },
      {
        question: "Can I have multiple brokerage accounts?",
        answer:
          "Yes. There's no limit on how many brokerage accounts you can have. Many investors use multiple accounts — for example, one for Australian shares and another for international shares. If both are CHESS-sponsored, you'll have separate HINs for each.",
      },
      {
        question: "Is my money safe in a brokerage account?",
        answer:
          "ASIC-regulated brokers must hold client funds in segregated trust accounts, separate from the broker's own money. CHESS-sponsored shares are held in your name on the ASX register, so they're protected even if the broker fails. However, there is no government guarantee scheme equivalent to the bank deposit guarantee for brokerage accounts.",
      },
      {
        question: "What is a HIN and why is it important?",
        answer:
          "A HIN (Holder Identification Number) is your unique identifier on the ASX CHESS system. It proves you directly own the shares in your name. When you open a CHESS-sponsored brokerage account, you're assigned a HIN starting with 'X'. You can transfer your HIN between CHESS-sponsored brokers if you switch.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "start-investing",
    title: "How to Start Investing in Australia (2026) — Beginner's Guide",
    h1: "How to Start Investing in Australia",
    metaDescription:
      "Learn how to start investing in Australia from scratch. Set goals, choose a platform, and build your first portfolio. Beginner-friendly guide, updated March 2026.",
    intro:
      "Investing is one of the most powerful tools for building long-term wealth, yet most Australians keep their savings in a bank account earning less than inflation. Whether you have $500 or $50,000 to get started, this guide will take you from complete beginner to confident investor. We cover goal-setting, emergency funds, platform selection, your first investments, and the habits that turn small contributions into life-changing wealth over decades.",
    steps: [
      {
        heading: "Set Clear Financial Goals",
        body: `Before investing a single dollar, define why you're investing. Your goals determine your strategy, timeline, and risk tolerance. Common goals include building a house deposit (3–5 years), generating passive income (ongoing), retiring early (10–30 years), or simply growing wealth over time.

Short-term goals (under 3 years) call for conservative investments like high-interest savings accounts or term deposits — you can't afford a market downturn wiping 20% of your house deposit. Medium-term goals (3–10 years) suit a balanced portfolio of shares, ETFs, and bonds. Long-term goals (10+ years) give you the time horizon to ride out volatility and invest more aggressively in growth assets like shares and ETFs.

Write down your goals with specific numbers and dates. "I want to invest" is vague. "I want to accumulate $100,000 for a house deposit by 2030" is actionable. This clarity will guide every investment decision you make and help you stay focused when markets get turbulent.`,
      },
      {
        heading: "Build an Emergency Fund First",
        body: `Before investing in shares or ETFs, ensure you have 3–6 months of living expenses set aside in a high-interest savings account. This emergency fund is your financial safety net — it covers unexpected expenses like car repairs, medical bills, or job loss without forcing you to sell investments at a bad time.

An emergency fund should be in a savings account or offset account where you can access it within 1–2 business days. Do not invest your emergency fund in shares, crypto, or other volatile assets. The whole point is that it's there when you need it, regardless of market conditions.

A practical starting point: calculate your essential monthly expenses (rent, food, utilities, insurance, transport) and multiply by three. That's your minimum emergency fund target. Once you've hit this target, every dollar above it can be directed into investments. Many Australians find that building their emergency fund and starting to invest simultaneously (e.g., splitting savings 50/50) keeps momentum going.`,
      },
      {
        heading: "Learn the Investing Basics",
        body: `You don't need a finance degree to invest successfully, but understanding a few key concepts will serve you well. The most important concepts are: compound interest (your returns earn returns, creating exponential growth), diversification (spreading investments to reduce risk), asset allocation (the mix of shares, bonds, property, and cash), and dollar-cost averaging (investing regularly regardless of market conditions).

The Australian share market has returned approximately 9–10% per year on average over the past century (including dividends). However, individual years vary wildly — from +33% (2009) to -38% (2008). The key insight is that time in the market beats timing the market. Investors who stayed invested through the 2008 crash recovered their losses within 2–3 years and went on to significant gains.

Free resources for learning include the ASX's online education modules, Vanguard's investor education centre, the MoneySmart website (run by ASIC), and financial literacy podcasts like "Equity Mates" and "She's on the Money". Our own courses and guides on Invest.com.au are also designed for Australian beginners.`,
      },
      {
        heading: "Choose an Investing Platform",
        body: `Now it's time to choose where to invest. For most beginners, a share trading platform that offers access to ASX shares and ETFs is the best starting point. The key features to look for are low fees, a user-friendly interface, CHESS sponsorship, and good educational resources.

If you want a hands-off approach, consider a robo-advisor like Stockspot, Spaceship, or Raiz. These platforms automatically invest your money in a diversified portfolio of ETFs based on your risk profile. You don't need to pick individual investments — the algorithm handles everything for a small management fee (typically 0.2–0.6% per year).

If you prefer to choose your own investments, an online broker like Stake, Moomoo, CMC Markets, or CommSec gives you full control. You decide which shares and ETFs to buy, when to buy them, and how much to invest. This approach requires more effort but gives you complete control and typically lower ongoing fees than robo-advisors.`,
      },
      {
        heading: "Start Small and Invest Consistently",
        body: `You don't need thousands of dollars to start investing. With $0 brokerage platforms and ETFs trading under $100 per unit, you can begin with whatever you can comfortably afford after covering essentials and your emergency fund. Even $50 per week — the cost of a few takeaway coffees — compounds into real wealth over time.

The most important habit is consistency. Set up an automatic transfer from your bank account to your brokerage account on payday. Treat investing like a bill that gets paid first, not an afterthought with whatever's left. This "pay yourself first" approach is the single most powerful wealth-building habit you can develop.

Start with a simple portfolio: one or two broad ETFs (e.g., VAS for Australian shares and VGS for international shares) give you instant diversification across thousands of companies. You can refine your strategy over time as you learn more, but getting invested early is far more important than finding the "perfect" portfolio. A simple portfolio you stick with beats a complex one you never start.`,
      },
      {
        heading: "Diversify and Stay the Course",
        body: `Diversification means not putting all your eggs in one basket. At a minimum, spread your investments across different asset classes (shares, bonds, property), geographies (Australia, US, international), and sectors (financials, technology, healthcare, resources). ETFs make diversification effortless — a single ETF can hold hundreds of companies across multiple sectors.

A classic balanced portfolio for Australian investors might look like: 40% Australian shares (VAS), 40% international shares (VGS), and 20% bonds or fixed income (VAF). Younger investors with a longer time horizon might go 50/50 shares with no bonds, while those closer to retirement might hold more bonds for stability.

The hardest part of investing isn't picking the right stocks or timing the market — it's staying invested during downturns. Markets will drop 10–20% periodically, and it will feel terrible. But selling during a crash locks in your losses. Every major market crash in history has been followed by a recovery to new highs. Your job as a long-term investor is to stay the course, keep contributing, and let compound interest do the heavy lifting over decades.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => (b.rating ?? 0) >= 4,
    relatedBestPages: [
      { label: "Take the Broker Quiz", href: "/quiz" },
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Share Trading Platforms", href: "/share-trading" },
    ],
    faqs: [
      {
        question: "How much money do I need to start investing in Australia?",
        answer:
          "You can start with as little as $50 using zero-brokerage platforms and fractional shares. Robo-advisors like Raiz let you invest spare change. There's no minimum required by law — the key is starting early and investing consistently, even in small amounts.",
      },
      {
        question: "What should I invest in as a complete beginner?",
        answer:
          "Broad market ETFs are the best starting point. VAS (Australian shares) and VGS (international shares) give you exposure to thousands of companies in just two purchases. They're low-cost, diversified, and require minimal ongoing management. Add complexity only as your knowledge grows.",
      },
      {
        question: "Is investing risky?",
        answer:
          "All investing carries risk — share prices can go down as well as up. However, historically, diversified share portfolios have delivered positive returns over any 10+ year period in Australia. The biggest risk for young Australians is actually not investing — leaving money in cash that loses value to inflation year after year.",
      },
      {
        question: "Should I pay off debt before investing?",
        answer:
          "Pay off high-interest debt first (credit cards, personal loans). The interest rate on credit card debt (15–22%) is almost certainly higher than your investment returns. However, you can invest while paying off a low-interest mortgage — most mortgage rates are lower than long-term share market returns.",
      },
      {
        question: "What's the difference between a broker and a robo-advisor?",
        answer:
          "A broker (like Stake or CommSec) lets you pick and buy individual shares and ETFs yourself. A robo-advisor (like Stockspot or Raiz) automatically invests your money in a diversified ETF portfolio based on your risk profile. Brokers give you more control; robo-advisors are more hands-off.",
      },
      {
        question: "How do I pay tax on investments in Australia?",
        answer:
          "Dividends are added to your taxable income (but may include franking credits). Capital gains from selling are taxed at your marginal rate, with a 50% discount if you held the asset for 12+ months. Your broker provides an annual tax summary. Consider a tax agent if your situation is complex.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "buy-vanguard-etfs",
    title: "How to Buy Vanguard ETFs in Australia (2026) — Step-by-Step Guide",
    h1: "How to Buy Vanguard ETFs in Australia",
    metaDescription:
      "Learn how to buy Vanguard ETFs in Australia in 6 simple steps. Compare VAS, VGS, VDHG and more. Choose the right broker and build a low-cost portfolio. Updated March 2026.",
    intro:
      "Vanguard is the world's largest ETF provider and its Australian-listed ETFs — including VAS, VGS, and VDHG — are among the most popular investments on the ASX. With management fees as low as 0.04%, Vanguard ETFs offer a low-cost, diversified way to build long-term wealth. This guide shows you exactly how to buy Vanguard ETFs in Australia, from choosing a broker to building a complete portfolio.",
    steps: [
      {
        heading: "Understand the Vanguard ETF Range on the ASX",
        body: `Vanguard lists over 30 ETFs on the ASX, covering Australian shares, international shares, bonds, property, and multi-asset (diversified) portfolios. The most popular Vanguard ETFs include VAS (Australian Shares Index, tracking the ASX 300), VGS (MSCI International Shares), VDHG (Diversified High Growth, a one-fund portfolio), and VAF (Australian Fixed Interest).

Each ETF charges an annual management fee called the MER (Management Expense Ratio), which is deducted from the fund's value automatically. Vanguard's MERs range from 0.04% (VAS) to 0.27% (VDHG). On a $10,000 investment, a 0.07% MER costs just $7 per year — far cheaper than most actively managed funds at 1–2%.

Before buying, decide which Vanguard ETFs suit your goals. For Australian exposure, choose VAS or VAS paired with VGS for global diversification. If you want a single all-in-one fund, VDHG gives you a pre-built portfolio of 90% growth assets and 10% bonds — no rebalancing required.`,
      },
      {
        heading: "Choose a Low-Cost Broker",
        body: `Vanguard ETFs trade on the ASX like regular shares, so you need a share trading account to buy them. The broker you choose directly affects your costs — especially if you plan to invest small amounts regularly. A $10 brokerage fee on a $500 monthly investment eats 2% of your contribution before it even starts growing.

Zero-brokerage platforms like Stake and Moomoo let you buy ASX ETFs with no trading fees, making them ideal for regular Vanguard ETF purchases. Other strong options include CMC Markets (which offers $0 brokerage on the first trade per day for stocks valued under $1,000) and SelfWealth ($9.50 flat-fee brokerage).

Vanguard also offers its own platform, Vanguard Personal Investor, where you can buy Vanguard ETFs with $0 brokerage. However, it charges a 0.20% annual account fee on balances up to $50,000, which may outweigh the brokerage savings for smaller portfolios. Compare the total cost (brokerage + account fees) across platforms before deciding.`,
      },
      {
        heading: "Open Your Brokerage Account",
        body: `Once you've chosen a broker, opening an account is fully online and takes 5–15 minutes. You'll need your full name, date of birth, residential address, Tax File Number (TFN), and a valid photo ID (driver's licence or passport). Most platforms verify your identity electronically in real time.

Providing your TFN ensures you don't have tax withheld at the highest marginal rate on ETF distributions. CHESS-sponsored brokers will assign you a Holder Identification Number (HIN), which proves you own the ETF units directly in your name on the ASX register.

If you already have a brokerage account with another platform, you can use it to buy Vanguard ETFs immediately — no need to open a new one. However, if your current broker charges high brokerage fees, it may be worth switching to a lower-cost option for regular ETF investing.`,
      },
      {
        heading: "Fund Your Account and Place Your First Order",
        body: `Deposit AUD into your brokerage account via PayID (instant, free), bank transfer (1–2 business days), or card payment. Once funds are available, search for the Vanguard ETF by its ASX code — for example, type "VAS" for the Vanguard Australian Shares Index ETF.

Select "Buy" and choose between a market order (executes immediately at the best available price) or a limit order (you set the maximum price you'll pay). For liquid Vanguard ETFs like VAS and VGS, market orders are usually fine as the bid-ask spread is very tight. Avoid trading in the first and last 15 minutes of the session when spreads can widen.

Enter the number of units you want to buy (or a dollar amount on platforms that support dollar-based ordering), review the total cost including any brokerage fees, and confirm. The trade settles on T+2 — meaning you officially own the ETF units two business days later. Your portfolio will update immediately to show the pending purchase.`,
      },
      {
        heading: "Set Up Regular Investments (Dollar-Cost Averaging)",
        body: `The real power of Vanguard ETFs comes from investing consistently over time. Set up a recurring deposit from your bank account to your brokerage on each payday, then buy more ETF units at regular intervals — weekly, fortnightly, or monthly. This strategy, called dollar-cost averaging, means you buy more units when prices are low and fewer when prices are high, smoothing out your average purchase price.

Some platforms like Vanguard Personal Investor and Pearler offer automated recurring buy orders, so the entire process runs on autopilot. On other platforms, you'll need to manually place the order each time your deposit arrives — but it only takes 30 seconds once you know the process.

Even modest regular investments compound dramatically over time. Investing $200 per month into Vanguard ETFs returning 8% per year grows to approximately $59,000 after 15 years and $118,000 after 25 years. Starting early and staying consistent matters far more than choosing the "perfect" entry point.`,
      },
      {
        heading: "Monitor Distributions and Rebalance Annually",
        body: `Vanguard ETFs pay distributions (dividends) quarterly — typically in March, June, September, and December. Australian share ETFs like VAS include franking credits, which can reduce your tax bill. International ETFs like VGS may include foreign income tax offsets.

You can reinvest distributions automatically through a Dividend Reinvestment Plan (DRP). Most brokers let you enrol in the DRP through the share registry (Computershare for Vanguard ETFs). Under a DRP, your distributions are used to buy additional ETF units instead of being paid as cash — maximising the compounding effect.

If you hold multiple Vanguard ETFs, check your portfolio allocation every 6–12 months. Market movements can cause your original target allocation to drift. For example, if strong international markets push your VGS holding from 50% to 60% of your portfolio, you can rebalance by directing your next few contributions to VAS. If you hold VDHG, rebalancing is done automatically within the fund.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" && (b.asx_fee_value ?? 100) <= 10,
    relatedBestPages: [
      { label: "Best Brokers for ETF Investing", href: "/best/etf-investing" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
    ],
    faqs: [
      {
        question: "What is the best Vanguard ETF to buy in Australia?",
        answer:
          "VAS (Vanguard Australian Shares Index) and VGS (Vanguard MSCI International Shares) are the two most popular Vanguard ETFs. For a single all-in-one fund, VDHG (Diversified High Growth) provides a pre-built portfolio of Australian shares, international shares, bonds, and property in one purchase.",
      },
      {
        question: "Can I buy Vanguard ETFs with $0 brokerage?",
        answer:
          "Yes. Platforms like Stake and Moomoo offer $0 brokerage on ASX trades, including Vanguard ETFs. Vanguard Personal Investor also offers $0 brokerage on Vanguard ETFs, though it charges a 0.20% annual account fee on balances up to $50,000.",
      },
      {
        question: "What is the difference between VAS, A200, and IOZ?",
        answer:
          "All three are Australian share index ETFs. VAS (Vanguard) tracks the ASX 300 with a 0.07% MER. A200 (BetaShares) tracks the ASX 200 with a 0.04% MER. IOZ (iShares) tracks the ASX 200 with a 0.05% MER. Performance is nearly identical; the main differences are fund size, MER, and index coverage.",
      },
      {
        question: "Do Vanguard ETFs pay dividends?",
        answer:
          "Yes. Most Vanguard ETFs pay quarterly distributions in March, June, September, and December. VAS distributions typically include franking credits from Australian company dividends, which can offset your tax liability. You can reinvest distributions automatically via a DRP.",
      },
      {
        question: "Should I buy VAS and VGS separately or just buy VDHG?",
        answer:
          "VDHG is a convenient all-in-one option that auto-rebalances, but it includes a small bond allocation and has a slightly higher MER (0.27%). Buying VAS and VGS separately gives you more control over your allocation and lower combined fees (under 0.10%), but requires manual rebalancing. For simplicity, VDHG is excellent; for optimisation, separate ETFs win.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "set-up-smsf",
    title: "How to Set Up a Self-Managed Super Fund (SMSF) in Australia (2026)",
    h1: "How to Set Up a Self-Managed Super Fund (SMSF)",
    metaDescription:
      "Learn how to set up a Self-Managed Super Fund (SMSF) in Australia. Step-by-step guide covering registration, trustees, investment strategy, and compliance. Updated March 2026.",
    intro:
      "A Self-Managed Super Fund (SMSF) gives you complete control over your superannuation investments — from ASX shares and ETFs to property and even cryptocurrency. With over 600,000 SMSFs in Australia managing $900+ billion, they are a popular choice for Australians who want hands-on control. However, setting one up involves legal, tax, and compliance obligations that require careful planning. This guide walks you through every step.",
    steps: [
      {
        heading: "Decide If an SMSF Is Right for You",
        body: `An SMSF is not for everyone. Before setting one up, honestly assess whether the benefits outweigh the costs and responsibilities. SMSFs are generally most cost-effective when your super balance is above $200,000 — below that, the fixed annual costs (audit, accounting, ASIC fees) can eat into your returns compared to a low-cost industry fund.

Running an SMSF means you become responsible for investment decisions, record-keeping, compliance with super laws, annual audits, and tax lodgements. You (or your appointed professionals) must keep up with changing regulations. The ATO actively monitors SMSFs and can impose significant penalties for non-compliance.

The main advantages of an SMSF are investment flexibility (you can invest in direct property, unlisted assets, and specific shares), tax optimisation opportunities (especially in retirement phase), estate planning control, and the ability to pool super with up to five other members (typically family). If these benefits align with your goals and you have the time and interest to manage a fund, an SMSF may be right for you.`,
      },
      {
        heading: "Choose Your Fund Structure and Appoint Trustees",
        body: `An SMSF can have up to six members, and every member must be a trustee (individual trustee structure) or a director of the corporate trustee (corporate trustee structure). Most new SMSFs use a corporate trustee, which offers better asset protection, easier member changes, and a perpetual legal entity.

To set up a corporate trustee, you'll need to register a special-purpose company with ASIC (cost: $576 for a special-purpose company with a reduced annual review fee of $66). This company's sole purpose is to act as trustee of the SMSF — it cannot conduct any other business. All fund members become directors of the company.

With individual trustees, each member is personally liable for the fund. If a member dies, becomes incapacitated, or wants to leave, the trust deed must be amended and asset ownership transferred — a more complex process than simply changing company directors. For these reasons, financial advisers and accountants strongly recommend the corporate trustee structure for most SMSFs.`,
      },
      {
        heading: "Create the Trust Deed and Register with the ATO",
        body: `The trust deed is the legal document that establishes your SMSF and sets out the rules for how it operates — including member eligibility, investment powers, benefit payment conditions, and winding-up procedures. You should have a specialist SMSF lawyer or accountant prepare the deed to ensure it complies with superannuation law and is flexible enough for future changes.

Once your trust deed is executed (signed by all trustees), you need to register the SMSF with the ATO. This involves applying for an Australian Business Number (ABN) and a Tax File Number (TFN) for the fund, and electing for the fund to be regulated by the ATO. Registration is done online through the ABR (Australian Business Register) and typically takes 1–2 weeks.

After registration, the ATO will add your fund to the Super Fund Lookup registry, which verifies it as a complying super fund. This is important because employers need to check this registry before directing your super guarantee contributions to your SMSF. Your fund must be registered and active on Super Fund Lookup before you can roll over any existing super.`,
      },
      {
        heading: "Open a Bank Account and Roll Over Your Super",
        body: `Every SMSF must have its own dedicated bank account, separate from any personal or business accounts. The account must be in the name of the fund (e.g., "Smith Family Super Fund") or the corporate trustee (e.g., "Smith Super Pty Ltd as trustee for Smith Family Super Fund"). Most major banks and some specialist providers offer SMSF bank accounts.

Once the bank account is open and your fund is registered on Super Fund Lookup, you can roll over your existing super from your current fund. Contact your current super fund or use the myGov / ATO rollover portal to initiate the transfer. Rollovers typically take 3–5 business days for industry funds and up to 30 days for some retail funds.

You'll also need to open a brokerage account in the name of the SMSF if you plan to invest in ASX shares and ETFs. Several platforms support SMSF accounts, including CMC Markets, Interactive Brokers, SelfWealth, and CommSec. Compare brokerage fees and SMSF-specific features like automated reporting and tax summaries.`,
      },
      {
        heading: "Create Your Investment Strategy",
        body: `Super law requires every SMSF to have a documented investment strategy that considers the fund's objectives, members' risk profiles, diversification, liquidity needs, and insurance requirements. This isn't just a formality — the ATO reviews investment strategies during audits and expects them to be genuinely followed.

Your investment strategy should specify target asset allocations (e.g., 40% Australian shares, 30% international shares, 20% property, 10% cash), the types of investments permitted, and how you plan to manage risk. It should be reviewed at least annually or whenever a significant event occurs (e.g., a member approaches retirement, market conditions change substantially).

Consider taking professional advice when creating your investment strategy, especially for your first SMSF. An SMSF-specialist financial adviser can help you structure a strategy that balances growth, risk, and compliance. The cost of advice (typically $2,000–$5,000 for initial setup) is small compared to the potential consequences of a poorly constructed strategy or regulatory breach.`,
      },
      {
        heading: "Set Up Ongoing Compliance and Administration",
        body: `Running an SMSF requires annual compliance obligations. Each year, your fund needs an independent audit by an ASIC-registered SMSF auditor, lodgement of an annual return with the ATO, preparation of financial statements, and a review of your investment strategy. Most trustees engage an SMSF accountant or administrator to handle these tasks.

Annual administration costs typically range from $1,500 to $3,500, depending on the complexity of the fund and whether you use a specialist SMSF administrator, an accountant, or a combination. Some online SMSF administration platforms offer lower-cost packages starting from around $1,000 per year.

Keep meticulous records of all transactions, member contributions, pension payments, investment decisions, and trustee meeting minutes. The ATO can request these records at any time, and poor record-keeping is one of the most common reasons SMSFs receive compliance warnings. Set up a cloud-based filing system or use your administrator's portal to store all documents securely.`,
      },
      {
        heading: "Understand the Tax Benefits and Contribution Rules",
        body: `SMSFs enjoy the same concessional tax treatment as other super funds. Investment income (including dividends, interest, and rent) is taxed at a flat 15%, and capital gains on assets held for more than 12 months are taxed at 10%. When the fund moves into retirement phase (paying a pension to a member), investment earnings become completely tax-free.

Contributions to your SMSF follow the same rules as any super fund. Concessional (before-tax) contributions are capped at $30,000 per year (2025–26), and non-concessional (after-tax) contributions are capped at $120,000 per year (or up to $360,000 using the bring-forward rule if you're under 75). Exceeding these caps triggers additional tax.

One of the key advantages of an SMSF is the ability to optimise franking credits from Australian shares. Fully franked dividends paid to an SMSF in accumulation phase effectively attract no additional tax (the 30% company tax credit fully offsets the 15% super tax, with the excess refunded). In pension phase, all franking credits are refunded in full — making Australian dividend shares particularly attractive for SMSF investors.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" && b.smsf_support === true,
    relatedBestPages: [
      { label: "Best Brokers for SMSFs", href: "/best/smsf" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
      { label: "Share Trading Platforms", href: "/share-trading" },
    ],
    faqs: [
      {
        question: "How much does it cost to set up an SMSF?",
        answer:
          "Setup costs typically range from $1,500 to $3,500, including trust deed preparation, corporate trustee registration ($576 ASIC fee), ATO registration, and professional advice. Ongoing annual costs (accounting, audit, ASIC fee) run $2,000 to $4,000 per year.",
      },
      {
        question: "What is the minimum balance to start an SMSF?",
        answer:
          "There is no legal minimum, but the ATO and most advisers suggest a minimum balance of $200,000 to make an SMSF cost-effective. Below this level, the fixed annual costs (around $2,000–$4,000) represent a disproportionately high percentage of your balance compared to a low-cost industry fund.",
      },
      {
        question: "Can an SMSF invest in property?",
        answer:
          "Yes. SMSFs can invest in residential and commercial property, including using a Limited Recourse Borrowing Arrangement (LRBA) to take out a loan. However, SMSF property investment is heavily regulated — you cannot live in or rent the property from the fund (residential), and the property must meet the sole purpose test.",
      },
      {
        question: "How many members can an SMSF have?",
        answer:
          "An SMSF can have up to six members (increased from four in 2021). All members must be trustees (individual structure) or directors of the corporate trustee. Members are typically family members, though there is no legal requirement for a family relationship.",
      },
      {
        question: "What happens if my SMSF is non-compliant?",
        answer:
          "The ATO can issue education directions, rectification directions, or administrative penalties (up to $18,780 per trustee per contravention). In serious cases, the fund can be made non-complying, which triggers tax at 45% on the entire fund balance. Compliance is not optional — take it seriously.",
      },
    ],
    verticalLink: "/super",
  },
  {
    slug: "claim-franking-credits",
    title: "How to Claim Franking Credits on Your Tax Return (2026) — Guide",
    h1: "How to Claim Franking Credits on Your Tax Return",
    metaDescription:
      "Learn how to claim franking credits on your Australian tax return. Understand imputation credits, refunds, and how franking reduces your tax bill. Updated March 2026.",
    intro:
      "Franking credits (also called imputation credits) are one of Australia's most valuable tax benefits for share investors. When an Australian company pays tax on its profits at 30%, it can pass that tax credit to shareholders via franked dividends. You then claim those credits on your tax return to reduce your tax — or even receive a cash refund. This guide explains exactly how franking credits work and how to claim them correctly.",
    steps: [
      {
        heading: "Understand How Franking Credits Work",
        body: `Australia's dividend imputation system prevents double taxation of company profits. When a company earns $100 profit, it pays $30 in company tax (at the 30% rate) and can distribute the remaining $70 as a fully franked dividend to shareholders. The $30 already paid in tax is attached to the dividend as a franking credit.

As a shareholder, you receive $70 in cash but your taxable income includes both the cash dividend ($70) and the franking credit ($30) — a total of $100 (called the "grossed-up dividend"). You then pay tax on the full $100 at your marginal rate, but you receive a $30 tax offset for the franking credits already paid by the company. If your marginal rate is below 30%, you receive the excess as a refund.

For example, if your marginal tax rate is 19% (income between $18,201 and $45,000), you owe $19 tax on the $100 grossed-up dividend but have a $30 franking credit — resulting in an $11 refund. If your marginal rate is 37%, you owe $37 and have a $30 credit, so you pay an extra $7. Retirees and low-income earners benefit the most because they can receive franking credit refunds in cash.`,
      },
      {
        heading: "Collect Your Dividend Statements",
        body: `Throughout the financial year (1 July to 30 June), you'll receive dividend statements from each company or ETF that pays you a distribution. These statements show the cash amount paid, the franking credits attached, and any withholding tax deducted. Keep all dividend statements — you'll need them at tax time.

If you hold shares through a broker, your broker will typically provide an annual tax summary or consolidated statement that lists all dividends received and their franking credits for the financial year. CHESS-sponsored brokers receive this information from the share registries (Computershare, Link Market Services) and pass it on to you.

For ETF distributions, the process is similar but slightly more complex. ETF distributions may include multiple components: franked dividends, unfranked dividends, foreign income, capital gains (discounted and non-discounted), and tax-deferred amounts. Your ETF provider will issue an Annual Tax Statement (usually available by September) that breaks down each component for your tax return.`,
      },
      {
        heading: "Calculate Your Grossed-Up Dividends",
        body: `To correctly report franked dividends on your tax return, you need to calculate the "grossed-up" amount for each dividend. The grossed-up dividend equals the cash dividend received plus the franking credit. Your broker's tax summary usually provides this calculation, but understanding it helps you check for errors.

The formula is: Franking Credit = Cash Dividend x (Company Tax Rate / (1 - Company Tax Rate)). For a fully franked dividend from a company paying 30% tax: Franking Credit = Cash Dividend x (0.30 / 0.70) = Cash Dividend x 0.4286. So a $700 cash dividend carries $300 in franking credits, for a grossed-up total of $1,000.

Partially franked dividends work the same way but only for the franked portion. If a dividend is 50% franked, only half the dividend carries franking credits. Some companies pay unfranked dividends (0% franked) — these carry no credits. Your dividend statements will always specify the franking percentage and the exact credit amount, so you don't need to calculate it manually in most cases.`,
      },
      {
        heading: "Report Franking Credits on Your Tax Return",
        body: `When lodging your tax return (either through myTax or a tax agent), franking credits are reported at Item 11 — Dividends. You'll enter three key amounts: the total unfranked dividends received, the total franked dividends received (the grossed-up amount including credits), and the total franking credits.

In myTax, the ATO pre-fills much of this information from data shared by share registries and your broker. However, always check the pre-filled amounts against your own records and dividend statements — pre-fill data can be incomplete or delayed, especially for distributions received late in the financial year (May–June).

The franking credits appear as a tax offset on your notice of assessment, directly reducing your tax payable dollar-for-dollar. If your total franking credits exceed your tax liability, the excess is refunded to you as cash (for individuals, super funds in retirement phase, and charities). This refund of excess franking credits is unique to Australia's imputation system and is particularly valuable for retirees and those on low incomes.`,
      },
      {
        heading: "Understand the 45-Day Holding Rule",
        body: `To claim franking credits, you must satisfy the "holding period rule" (also called the 45-day rule). You need to hold the shares "at risk" for at least 45 days (excluding the purchase and sale dates) during a period beginning 45 days before and ending 45 days after the ex-dividend date. For preference shares, the holding period is 90 days.

"At risk" means you must have genuine economic exposure to the shares — you can't use hedging strategies (like put options or short selling) to eliminate the risk of price movements while still collecting franking credits. The ATO specifically targets arrangements designed to "wash" or "manufacture" franking credits.

There is an important exemption: individual taxpayers with total franking credits of $5,000 or less in a financial year are exempt from the 45-day rule. This means most retail investors with modest portfolios don't need to worry about it. If your franking credits exceed $5,000, ensure you've held each relevant parcel of shares for the required period before claiming the credits.`,
      },
      {
        heading: "Maximise Your Franking Credit Benefits",
        body: `To get the most from franking credits, consider focusing your Australian share portfolio on companies and ETFs that pay fully franked dividends. The big four banks (CBA, NAB, ANZ, Westpac), BHP, Telstra, Woolworths, and other large ASX companies typically pay fully franked dividends. Australian share ETFs like VAS, A200, and IOZ pass through franking credits to unit holders.

Your effective return from franked dividends depends on your marginal tax rate. At the 0% tax bracket (including the tax-free threshold), you keep the entire cash dividend plus receive the full franking credit as a refund — an effective pre-tax yield significantly higher than the stated dividend yield. At the 45% bracket, franking credits still reduce your tax, but the benefit is smaller.

For SMSF investors, franking credits are especially powerful. In accumulation phase (15% tax), a fully franked dividend effectively costs no additional tax, with excess credits refunded. In pension phase (0% tax), the entire franking credit is refunded in cash. This is why many SMSFs build portfolios heavily weighted toward fully franked Australian shares and ETFs.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker",
    relatedBestPages: [
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
      { label: "Best Brokers for SMSFs", href: "/best/smsf" },
    ],
    faqs: [
      {
        question: "What are franking credits?",
        answer:
          "Franking credits (imputation credits) represent tax already paid by a company on its profits. When the company pays a franked dividend, the credits are passed to shareholders who can use them to reduce their personal tax or receive a cash refund if their tax rate is below the company rate.",
      },
      {
        question: "Can I get a cash refund for franking credits?",
        answer:
          "Yes. If your total franking credits exceed your tax liability for the year, the excess is refunded to you as cash. This commonly applies to retirees, low-income earners, and self-managed super funds in pension phase. The refund appears on your notice of assessment after lodging your tax return.",
      },
      {
        question: "Do ETFs pass on franking credits?",
        answer:
          "Yes. Australian share ETFs like VAS, A200, and IOZ pass through franking credits from the underlying company dividends to ETF unit holders. The credits are detailed in the ETF's Annual Tax Statement, which you use to complete your tax return.",
      },
      {
        question: "What is the 45-day holding rule for franking credits?",
        answer:
          "You must hold shares 'at risk' for at least 45 days around the ex-dividend date to claim franking credits. However, individual taxpayers with total franking credits of $5,000 or less per year are exempt from this rule — so most retail investors are not affected.",
      },
      {
        question: "How much are franking credits worth?",
        answer:
          "Each dollar of franking credit reduces your tax by one dollar. For a fully franked $70 cash dividend from a company paying 30% tax, the franking credit is $30. If your marginal tax rate is 19%, you receive an $11 refund. If your rate is 37%, you pay $7 extra. The lower your tax rate, the more valuable franking credits are.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "buy-cryptocurrency",
    title: "How to Buy Cryptocurrency in Australia (2026) — Step-by-Step Guide",
    h1: "How to Buy Cryptocurrency in Australia",
    metaDescription:
      "Learn how to buy cryptocurrency in Australia in 6 simple steps. Compare crypto exchanges, understand fees, and secure your digital assets. Updated March 2026.",
    intro:
      "Cryptocurrency investing has gone mainstream in Australia, with millions of Australians now holding digital assets. Beyond Bitcoin, there are thousands of cryptocurrencies including Ethereum, Solana, XRP, and Cardano — each with different use cases and risk profiles. This guide covers the full process of buying crypto in Australia, from choosing a regulated exchange to securing your investments and understanding your tax obligations.",
    steps: [
      {
        heading: "Learn the Basics Before You Buy",
        body: `Cryptocurrency is a digital asset secured by blockchain technology — a decentralised, transparent ledger that records every transaction. Bitcoin (BTC) was the first cryptocurrency, launched in 2009, and remains the largest by market capitalisation. Ethereum (ETH) is the second-largest and powers a vast ecosystem of decentralised applications (dApps), smart contracts, and other tokens.

Before buying, understand the key risks. Crypto markets are extremely volatile — prices can swing 20–50% in a matter of days. There is no government guarantee, no compensation scheme, and no central authority to reverse transactions or recover lost funds. The Australian Securities and Investments Commission (ASIC) has warned that crypto is a high-risk, speculative investment.

That said, crypto has delivered extraordinary long-term returns for early adopters and has become an established asset class held by institutional investors, superannuation funds, and major corporations worldwide. The key is to only invest what you can afford to lose entirely, start small, and educate yourself before committing significant capital.`,
      },
      {
        heading: "Choose an AUSTRAC-Registered Exchange",
        body: `All cryptocurrency exchanges operating in Australia must be registered with AUSTRAC (Australian Transaction Reports and Analysis Centre) under anti-money laundering and counter-terrorism financing laws. Buying from a registered exchange ensures the platform follows basic compliance standards, including identity verification and transaction monitoring.

Popular Australian exchanges include CoinSpot (one of the longest-running Australian exchanges with 400+ coins), Swyftx (competitive spreads and a user-friendly app), and Independent Reserve (institutional-grade platform with strong regulatory standing). Global exchanges like Binance, Kraken, and OKX also serve Australian customers with AUD deposit options.

Key factors to compare include trading fees (typically 0.1% to 1% per trade), the spread (hidden cost between buy and sell prices — often larger than the stated fee), deposit methods (PayID, bank transfer, card), the range of supported cryptocurrencies, security features (cold storage, insurance), and customer support quality. Check our comparison table below for a side-by-side overview.`,
      },
      {
        heading: "Complete Identity Verification (KYC)",
        body: `Every AUSTRAC-registered exchange requires Know Your Customer (KYC) verification before you can trade. You'll need to upload a photo of your driver's licence or passport, complete a selfie or video verification for biometric matching, and provide your residential address. Some exchanges also require proof of address (utility bill or bank statement).

Verification is typically completed within minutes using automated checks, though during peak demand it can take up to 24–48 hours. Once verified, you'll have full access to buy, sell, and withdraw crypto. Some platforms offer tiered verification — basic KYC for smaller limits, enhanced KYC for higher trading and withdrawal limits.

Never use an exchange that doesn't require KYC — it's likely unregistered with AUSTRAC and operating outside Australian law. While privacy is a valid concern, the regulatory framework exists to protect you from fraud, scams, and money laundering. Registered exchanges also provide better recourse if something goes wrong with your account or a transaction.`,
      },
      {
        heading: "Deposit AUD and Make Your First Purchase",
        body: `Once verified, deposit Australian dollars into your exchange account. PayID/Osko is the most popular method — it's instant and free with most exchanges and banks. Bank transfer is also free but takes 1–2 business days. Credit/debit card deposits are instant but often carry a 1–2% fee, making them the most expensive option for regular investors.

Start with a small amount — $50 or $100 — to familiarise yourself with the buying process before committing larger sums. Navigate to the cryptocurrency you want to buy (e.g., Bitcoin, Ethereum), enter the AUD amount you want to spend, review the price and fees, and confirm. The crypto is credited to your exchange wallet immediately.

Most exchanges offer two buying modes: instant buy (simple, one-click purchase at a slightly wider spread) and spot trading (you set the price using limit orders, which can save money but requires more knowledge). For beginners, instant buy is the easiest option. As you gain experience, move to spot trading to reduce your effective fees.`,
      },
      {
        heading: "Secure Your Cryptocurrency",
        body: `How you store your crypto depends on the amount and your risk tolerance. For small holdings (under $1,000–$2,000), keeping crypto on a reputable exchange is reasonable — modern exchanges use cold storage (offline wallets), multi-signature security, and insurance policies. Enable two-factor authentication (2FA) using an authenticator app (not SMS) for maximum account security.

For larger holdings, consider transferring crypto to a self-custody wallet where you control the private keys. Software wallets like MetaMask (Ethereum), Trust Wallet (multi-chain), and Exodus (desktop and mobile) are free and offer a good balance of security and usability. Hardware wallets like Ledger and Trezor provide the highest security by keeping your private keys offline.

If you use a self-custody wallet, you'll receive a recovery seed phrase — 12 or 24 words that can restore your wallet if your device is lost or damaged. Write this phrase on paper and store it in a secure location (ideally multiple copies in different locations). Never store your seed phrase digitally — no screenshots, no cloud storage, no email. If someone accesses your seed phrase, they control your crypto.`,
      },
      {
        heading: "Understand Australian Crypto Tax Rules",
        body: `The ATO treats cryptocurrency as an asset subject to capital gains tax (CGT). Every time you sell crypto for AUD, swap one crypto for another, or use crypto to purchase goods or services, it's a taxable event. You must track the cost basis (purchase price) and disposal price for every transaction to calculate your capital gain or loss.

If you hold crypto for more than 12 months before selling, you receive a 50% CGT discount — meaning only half the gain is added to your taxable income. Short-term gains (held less than 12 months) are taxed at your full marginal rate. Crypto losses can be used to offset crypto gains or gains from other assets like shares, but cannot be claimed against regular income.

Record-keeping is essential. Use a crypto tax calculator like Koinly, CoinTracker, or Syla to automatically import your transaction history from exchanges and wallets, calculate gains and losses, and generate ATO-ready reports. The ATO receives data directly from Australian exchanges and uses data-matching to identify taxpayers who have traded crypto, so accurate reporting is non-negotiable.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "crypto_exchange",
    relatedBestPages: [
      { label: "Best Crypto Exchanges", href: "/best/crypto" },
      { label: "Crypto Platforms Overview", href: "/crypto" },
    ],
    faqs: [
      {
        question: "Is cryptocurrency legal in Australia?",
        answer:
          "Yes. Cryptocurrency is legal to buy, sell, and hold in Australia. Crypto exchanges must be registered with AUSTRAC. The ATO treats crypto as an asset for capital gains tax purposes. There is no specific cryptocurrency legislation, but existing financial regulations and tax laws apply.",
      },
      {
        question: "What is the best crypto exchange in Australia?",
        answer:
          "CoinSpot and Swyftx are the most popular Australian exchanges, offering a wide range of coins, AUD deposits, and user-friendly apps. For lower fees, Independent Reserve and Kraken offer competitive spot trading rates. The best choice depends on your priorities — range of coins, fees, security, or ease of use.",
      },
      {
        question: "How much cryptocurrency can I buy with $100 AUD?",
        answer:
          "All major cryptocurrencies are divisible, so you can buy a fraction with any amount. At a Bitcoin price of $150,000 AUD, $100 buys approximately 0.000667 BTC. At an Ethereum price of $6,000 AUD, $100 buys approximately 0.0167 ETH. The exact amount depends on current prices and exchange fees.",
      },
      {
        question: "Do I pay tax when I buy cryptocurrency in Australia?",
        answer:
          "No. Buying crypto with AUD is not a taxable event. Tax is triggered when you sell crypto for AUD, swap one crypto for another, or use crypto to buy goods/services. You must report capital gains or losses on your tax return. Holding crypto for 12+ months qualifies for the 50% CGT discount.",
      },
      {
        question: "What happens if a crypto exchange goes bankrupt?",
        answer:
          "Your crypto on an exchange is typically held as an unsecured creditor claim in bankruptcy. Unlike bank deposits, there is no government guarantee for crypto on exchanges. This is why many investors use self-custody wallets for larger holdings — if you control the private keys, you control the crypto regardless of exchange failures.",
      },
    ],
    verticalLink: "/crypto",
  },
  {
    slug: "invest-in-property",
    title: "How to Invest in Property in Australia (2026) — Step-by-Step Guide",
    h1: "How to Invest in Property in Australia",
    metaDescription:
      "Learn how to invest in property in Australia. Compare direct ownership, REITs, and property platforms. Understand financing, tax benefits, and risks. Updated March 2026.",
    intro:
      "Property is Australia's most popular asset class, with over $10 trillion in residential real estate alone. But you don't need hundreds of thousands of dollars to get started — modern options range from buying a rental property to investing in ASX-listed REITs or fractional property platforms from as little as $100. This guide covers all the ways to invest in Australian property, helping you choose the path that matches your budget, goals, and risk tolerance.",
    steps: [
      {
        heading: "Understand Your Property Investment Options",
        body: `Property investment in Australia spans a wide spectrum. Direct property ownership — buying a house, apartment, or commercial property to rent out — is the traditional approach. It offers capital growth, rental income, and significant tax benefits, but requires a large deposit (typically 10–20% of the purchase price plus stamp duty and legal fees) and ongoing management.

ASX-listed Real Estate Investment Trusts (REITs) let you buy shares in a portfolio of properties — commercial offices, shopping centres, industrial warehouses, and more — with as little as one unit (often under $20). Popular REITs include Goodman Group (GMG), Scentre Group (SCG), and Stockland (SGP). REIT ETFs like VAP (Vanguard Australian Property Securities) provide diversified exposure across dozens of REITs in a single purchase.

Fractional property platforms like BrickX and DomaCom let you buy a fraction of a specific residential property, combining elements of direct ownership with the low entry point of a REIT. These platforms are newer and less liquid than REITs, but they provide exposure to specific suburbs and property types that REITs don't cover. Each option has different risk, return, liquidity, and tax characteristics — understanding these differences is essential before investing.`,
      },
      {
        heading: "Assess Your Financial Position",
        body: `Before investing in property, honestly assess your financial capacity. For direct property, you'll need a deposit (typically 10–20% of the purchase price), stamp duty (varies by state — typically 3–5% of the purchase price), legal/conveyancing fees ($1,500–$3,000), building and pest inspections ($500–$1,000), and enough savings to cover ongoing costs like council rates, insurance, maintenance, and potential vacancy periods.

For REIT investing, the barriers are much lower. You need a brokerage account and enough to buy at least one unit — most REITs trade between $2 and $20 per unit. A REIT ETF like VAP trades around $80–$90 per unit. With $0 brokerage platforms, you can start REIT investing with a few hundred dollars and no ongoing fees beyond the ETF's MER (0.23% for VAP).

Regardless of which path you choose, ensure you have an emergency fund (3–6 months of expenses) before investing. For direct property, this is especially important — unexpected repair costs, vacancy periods, or interest rate rises can strain your cash flow. A buffer of at least $10,000–$20,000 above your deposit and purchase costs provides a safety net for the first year of property ownership.`,
      },
      {
        heading: "Research the Market and Choose Your Strategy",
        body: `For direct property investors, location research is critical. Factors driving property growth include population growth, infrastructure spending (new transport links, hospitals, schools), employment hubs, rental vacancy rates, and supply constraints (limited new development). Capital city properties near transport and amenities have historically delivered the most consistent long-term growth.

Decide between a capital growth strategy (targeting suburbs with strong price appreciation potential but lower rental yields) and a cash-flow strategy (targeting higher rental yields, often in regional areas, to cover mortgage repayments from day one). Most investors compromise with a balanced approach — decent growth potential with acceptable rental income.

For REIT investors, research the fund's portfolio composition, occupancy rates, debt levels, distribution yield, and management quality. Office REITs have faced headwinds from hybrid work trends, while industrial and logistics REITs (like Goodman Group) have benefited from e-commerce growth. Diversified REIT ETFs spread your risk across multiple property sectors and managers.`,
      },
      {
        heading: "Secure Financing (For Direct Property)",
        body: `Most property investors use a mortgage to leverage their investment. With a 20% deposit, you can control a $500,000 property with $100,000 of your own capital — if the property grows 5% in value ($25,000), that's a 25% return on your invested capital. However, leverage amplifies losses too — a 5% price drop is also a 25% loss on your capital.

To get pre-approved for an investment property loan, you'll need to demonstrate sufficient income to service the loan (including stress-tested at higher rates), a clean credit history, and evidence of your existing assets and liabilities. Investment loans typically carry slightly higher interest rates than owner-occupier loans (0.2–0.5% premium) and most lenders require a 20% deposit to avoid Lenders Mortgage Insurance (LMI).

Shop around for the best mortgage rate — even a 0.25% difference in interest rate saves $6,250 over 5 years on a $500,000 loan. Use a mortgage broker (free to you — they're paid by the lender) to compare offers from multiple banks. Consider whether you want a fixed rate (certainty but less flexibility), variable rate (flexibility but rate risk), or a split loan (both).`,
      },
      {
        heading: "Make Your Investment (Direct or Platform-Based)",
        body: `For direct property: once you've secured financing and found a suitable property, make an offer (or bid at auction), conduct due diligence (building inspection, pest inspection, strata report for apartments), exchange contracts, and settle (typically 30–90 days after exchange). Engage a solicitor or conveyancer to handle the legal paperwork and protect your interests.

For REITs and property ETFs: open a brokerage account (if you don't have one), search for the REIT or ETF by its ASX code (e.g., "VAP" for Vanguard Australian Property Securities), and buy units just like you would buy any share or ETF. The process takes minutes and you can invest any amount above the minimum unit price. Consider setting up regular purchases to build your REIT position over time.

For fractional property platforms: create an account on the platform, browse available properties, review the property's location, price, expected yield, and fees, and purchase your desired number of "bricks" or fractional units. Be aware that these platforms are less liquid than REITs — you can only sell your units when there's a buyer on the platform, and the platform may charge a buy/sell spread.`,
      },
      {
        heading: "Manage Your Investment and Understand Tax Benefits",
        body: `For direct property, consider hiring a property manager (fees typically 5–8% of rental income) to handle tenant sourcing, rent collection, inspections, and maintenance. They save you time and ensure compliance with tenancy laws, which vary by state. Landlord insurance (around $1,000–$2,000 per year) protects against tenant damage, loss of rent, and liability claims.

Property investment offers significant tax advantages in Australia. Expenses like mortgage interest, council rates, insurance, property management fees, repairs, and depreciation are tax-deductible against your rental income. If your deductible expenses exceed your rental income (negative gearing), the loss reduces your overall taxable income. A quantity surveyor can prepare a depreciation schedule ($600–$800) to maximise your depreciation deductions, which often save thousands per year in tax.

REIT distributions are treated differently for tax — they typically include a mix of income, capital gains, and tax-deferred components. Your REIT or ETF provider will issue an Annual Tax Statement breaking down these components. Capital gains from selling REITs held for more than 12 months qualify for the 50% CGT discount, just like shares. Keep all records of purchase prices, distributions, and expenses for your tax return.`,
      },
      {
        heading: "Monitor Performance and Build Your Portfolio Over Time",
        body: `Property is a long-term investment. Australian residential property has averaged around 6–7% capital growth per year over the past 30 years, though performance varies significantly by location and property type. Combined with rental yield (typically 3–5% for houses, 4–6% for apartments) and tax benefits, total returns can be attractive — but they require patience and a multi-year time horizon.

For direct property investors, review your investment annually: is the rental yield keeping pace with mortgage costs? Are there maintenance issues to address? Could the property benefit from renovations to increase value or rent? Consider a formal property valuation every 2–3 years to track your equity position and determine whether to refinance, sell, or acquire additional properties.

For REIT and ETF investors, monitor your portfolio allocation and rebalance if property exposure becomes too large or small relative to your targets. REITs can be more volatile than direct property because they trade on the share market — prices can drop sharply during market selloffs even if underlying property values are stable. This volatility is the price you pay for liquidity, and long-term REIT investors should ride out short-term fluctuations.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" || b.platform_type === "property_platform",
    relatedBestPages: [
      { label: "Best Property Platforms", href: "/best/property" },
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Share Trading Platforms", href: "/share-trading" },
    ],
    faqs: [
      {
        question: "How much money do I need to invest in Australian property?",
        answer:
          "For direct property, you typically need a 10–20% deposit plus stamp duty and fees — roughly $60,000–$120,000 for a $500,000 property. For REITs and property ETFs on the ASX, you can start with as little as one unit (often under $100). Fractional property platforms let you invest from around $100.",
      },
      {
        question: "What is negative gearing?",
        answer:
          "Negative gearing occurs when the costs of owning an investment property (mortgage interest, rates, insurance, maintenance, depreciation) exceed the rental income. The resulting loss reduces your overall taxable income. For example, if your rental income is $25,000 but deductible expenses total $35,000, the $10,000 loss reduces your taxable income.",
      },
      {
        question: "Are REITs a good alternative to direct property?",
        answer:
          "REITs offer property exposure with low entry costs, instant diversification, daily liquidity, and no property management hassles. However, they don't offer the same leverage benefits as a mortgage, and REIT prices can be more volatile than direct property values. REITs and direct property can complement each other in a diversified portfolio.",
      },
      {
        question: "What are the tax benefits of property investment?",
        answer:
          "Deductible expenses include mortgage interest, council rates, insurance, repairs, property management fees, and depreciation. Negative gearing losses reduce your taxable income. Capital gains on sale are taxed at your marginal rate, with a 50% discount if held for 12+ months. A depreciation schedule can unlock thousands per year in additional deductions.",
      },
      {
        question: "Is property or shares a better investment in Australia?",
        answer:
          "Both have delivered similar long-term returns (7–10% including income). Property allows leverage via a mortgage, which amplifies returns. Shares offer better liquidity, lower transaction costs, and easier diversification. Most financial advisers recommend holding both asset classes. The best investment is the one you'll stick with for the long term.",
      },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "salary-sacrifice-super",
    title: "How to Salary Sacrifice into Super (2026) — Step-by-Step",
    h1: "How to Salary Sacrifice into Super",
    metaDescription: "Learn how salary sacrifice into super works in Australia. Tax benefits, contribution caps, how to set it up with your employer, and common mistakes to avoid.",
    intro: "Salary sacrificing into super is one of the most effective tax strategies for Australian workers. By redirecting part of your pre-tax salary into your super fund, you reduce your taxable income and boost your retirement savings simultaneously. This guide explains exactly how to set it up, what the limits are, and how much you could save.",
    steps: [
      { heading: "Understand How Salary Sacrifice Works", body: "Salary sacrifice (also called salary packaging) means you agree with your employer to have part of your pre-tax salary paid directly into your super fund as an extra contribution, on top of the mandatory employer contributions. These contributions are taxed at 15% in your super fund — much lower than most people's marginal tax rate (which can be 32.5%, 37%, or 45%). The difference between your marginal rate and 15% is your tax saving." },
      { heading: "Check Your Contribution Caps", body: "The concessional (before-tax) contribution cap for 2025-26 is $30,000 per year. This includes your employer's mandatory super guarantee contributions (currently 11.5%), any salary sacrifice amounts, and any personal contributions you claim a tax deduction for. If you exceed the cap, the excess is added to your taxable income and you may pay additional tax. Use the ATO's online tools to check your year-to-date contributions." },
      { heading: "Calculate Your Potential Tax Saving", body: "If you earn $100,000 and sacrifice $10,000 into super, you save roughly $2,250 in tax (the difference between your 32.5% + 2% Medicare levy rate and the 15% super contributions tax). The exact saving depends on your marginal tax rate. Those earning over $250,000 pay an additional 15% Division 293 tax on super contributions, reducing the benefit." },
      { heading: "Set Up With Your Employer", body: "Contact your payroll or HR department and ask to set up a salary sacrifice arrangement. You'll typically need to complete a form specifying how much you want to sacrifice per pay period. The arrangement applies to future salary only — you can't retrospectively sacrifice salary already earned. Most employers can set this up within one pay cycle." },
      { heading: "Choose Fixed Amount or Percentage", body: "You can sacrifice a fixed dollar amount per pay (e.g., $200/fortnight) or a percentage of your salary (e.g., 5%). Fixed amounts give you certainty about your take-home pay. Percentages automatically adjust if your salary changes. Either way, make sure you monitor your total concessional contributions across the year to stay under the $30,000 cap." },
      { heading: "Monitor and Adjust", body: "Check your super fund statements quarterly to verify contributions are being received correctly. Review your arrangement annually — especially if you get a pay rise, change jobs, or if the contribution caps change. Remember that you can stop or adjust salary sacrifice at any time by notifying your employer." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "super_fund",
    relatedBestPages: [{ label: "Best Super Funds", href: "/best/super-funds" }, { label: "SMSF Guide", href: "/how-to/set-up-smsf" }],
    faqs: [
      { question: "Is salary sacrifice into super worth it?", answer: "For most Australians earning over $45,000, yes — you save at least 17.5 cents in tax for every dollar sacrificed. The higher your tax bracket, the bigger the benefit." },
      { question: "Can I access salary sacrificed super early?", answer: "Generally no — super is preserved until you reach preservation age (currently 60). Early access is only available in limited hardship circumstances." },
      { question: "Does salary sacrifice reduce my super guarantee?", answer: "It depends on your employment agreement. Some employers calculate the super guarantee on your pre-sacrifice salary, others on your post-sacrifice salary. Check with your employer." },
      { question: "What happens to salary sacrifice if I change jobs?", answer: "Salary sacrifice arrangements end when you leave an employer. Set up a new arrangement with your next employer. Existing super contributions stay in your fund." },
    ],
    verticalLink: "/super",
  },
  {
    slug: "tax-loss-harvesting",
    title: "Tax-Loss Harvesting in Australia (2026) — How to Offset Capital Gains",
    h1: "How to Tax-Loss Harvest in Australia",
    metaDescription: "Learn how tax-loss harvesting works for Australian investors. Sell losing investments to offset capital gains and reduce your tax bill. Rules, timing, and wash sale risks.",
    intro: "Tax-loss harvesting is a strategy where you sell investments at a loss to offset capital gains tax on your winning investments. Done correctly, it can save you thousands in tax each financial year. This guide explains the Australian rules, when to harvest, and the pitfalls to avoid.",
    steps: [
      { heading: "Understand Capital Gains Tax Basics", body: "When you sell an investment for more than you paid, the profit is a capital gain and is added to your taxable income. If you've held the asset for more than 12 months, you get a 50% CGT discount — only half the gain is taxable. Capital losses can be used to offset capital gains, reducing your tax. Unused losses can be carried forward to future years indefinitely." },
      { heading: "Identify Losing Positions", body: "Review your portfolio near the end of the financial year (June 30) and identify investments currently trading below your purchase price. These are candidates for harvesting. Check both your brokerage account and any managed funds or ETFs you hold. Consider the total return including dividends — a stock may be down in price but positive overall when dividends are included." },
      { heading: "Calculate the Tax Benefit", body: "If you have $5,000 in capital gains and $3,000 in unrealised losses you could harvest, selling the losing positions would reduce your net capital gain to $2,000. At a 32.5% marginal rate, that saves roughly $975 in tax. Weigh this against brokerage costs and whether you still want exposure to the sold asset." },
      { heading: "Execute the Sell Orders", body: "Sell the losing positions before June 30 to crystallise the loss in the current financial year. The trade must settle before June 30 — for ASX shares, settlement is T+2 (two business days), so you need to sell by approximately June 26. Keep records of the purchase price, sale price, and dates for your tax return." },
      { heading: "Avoid the Wash Sale Trap", body: "The ATO may disallow your capital loss if you sell an asset and buy the same or substantially similar asset shortly before or after the sale — this is called a 'wash sale'. While Australia doesn't have a formal wash sale rule like the US, the ATO can apply Part IVA (the general anti-avoidance rule) if it considers the arrangement was done solely for the tax benefit. As a rule of thumb, wait at least 30 days before repurchasing the same asset." },
      { heading: "Reinvest Strategically", body: "After selling, you can reinvest the proceeds into a different but similar investment to maintain your portfolio allocation. For example, if you sell one Australian shares ETF at a loss, you could buy a different Australian shares ETF from another provider. This maintains your market exposure while crystalising the tax loss." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best Share Trading Platforms", href: "/best/share-trading" }, { label: "CGT Calculator", href: "/calculators" }],
    faqs: [
      { question: "When is the best time to tax-loss harvest?", answer: "Most investors review their portfolios in May-June before the end of the Australian financial year. However, you can harvest losses any time during the year." },
      { question: "Can I carry forward capital losses?", answer: "Yes — unused capital losses can be carried forward indefinitely and offset against future capital gains. You must apply them against gains before using the 50% CGT discount." },
      { question: "Does tax-loss harvesting work with ETFs?", answer: "Yes — ETFs are a common vehicle for tax-loss harvesting because there are often similar ETFs from different providers tracking similar indices." },
      { question: "Can I tax-loss harvest in my super fund?", answer: "Not directly as an individual. However, SMSF trustees can implement tax-loss harvesting strategies within the fund." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "transfer-shares-between-brokers",
    title: "How to Transfer Shares Between Brokers (2026) — CHESS Transfer Guide",
    h1: "How to Transfer Shares Between Brokers",
    metaDescription: "Step-by-step guide to transferring shares between brokers in Australia. CHESS transfers, off-market transfers, timelines, costs, and what to watch out for.",
    intro: "Switching brokers in Australia is straightforward if your shares are CHESS-sponsored — you can transfer them without selling and rebuying (which would trigger capital gains tax). This guide covers the exact process, timelines, and potential costs.",
    steps: [
      { heading: "Check If Your Shares Are CHESS-Sponsored", body: "If your shares have a HIN (Holder Identification Number) starting with 'X', they're CHESS-sponsored and held in your name on the ASX register. This makes transfers simple. If they're custodian-held (no personal HIN), you may need to sell and rebuy, or the new broker may have a process to transfer custodian holdings." },
      { heading: "Open an Account With the New Broker", body: "Set up and verify your account with the new broker before initiating the transfer. Make sure the name and details match exactly — mismatches can delay or block transfers. The new broker will either assign you a new HIN or allow you to keep your existing one (broker-to-broker transfer)." },
      { heading: "Initiate the Transfer", body: "Log into your new broker and look for 'Transfer Shares In' or 'CHESS Transfer'. You'll typically need your existing HIN, the SRN (Security Reference Number) for each holding, and your old broker's PID (Participant Identifier). Submit the transfer request. Some brokers handle this via an online form, others require you to download and submit a paper form." },
      { heading: "Wait for Completion (3-7 Business Days)", body: "Standard CHESS transfers take 3-5 business days. During this period, you cannot trade the shares being transferred. The old broker may charge an exit fee (typically $0-$55 per holding transferred). Your new broker may waive incoming transfer fees or even rebate the old broker's exit fees as a promotion." },
      { heading: "Verify and Update Records", body: "Once the transfer is complete, check that all holdings appear correctly in your new broker account with the correct purchase dates and cost bases. You'll need to manually enter cost base information for tax purposes, as this doesn't always transfer automatically. Keep your old broker account open briefly in case of issues." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker" && b.chess_sponsored === true,
    relatedBestPages: [{ label: "CHESS-Sponsored Brokers", href: "/compare?feature=chess" }, { label: "Switching Calculator", href: "/switching-calculator" }],
    faqs: [
      { question: "Does transferring shares trigger CGT?", answer: "No — a CHESS transfer moves shares between brokers without selling them, so there's no capital gains event. Your original purchase date and cost base are preserved." },
      { question: "Can I transfer shares from CommSec to Stake?", answer: "Yes — both are CHESS-sponsored brokers. You can initiate a broker-to-broker CHESS transfer, typically completing in 3-5 business days." },
      { question: "What if my shares are custodian-held?", answer: "Custodian-held shares (no personal HIN) are trickier. You may need to sell and rebuy, or ask both brokers about their custodian transfer process. Some brokers like Moomoo offer off-market transfers for custodian holdings." },
      { question: "How much does it cost to transfer shares?", answer: "The receiving broker usually does not charge. The sending broker may charge $0-$55 per holding. Some brokers like Stake waive exit fees." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "compare-super-funds",
    title: "How to Compare Super Funds in Australia (2026) — What to Look For",
    h1: "How to Compare Super Funds",
    metaDescription: "Learn how to compare Australian super funds. Key metrics: fees, investment performance, insurance, investment options, and switching process explained step by step.",
    intro: "Your super fund can make a six-figure difference to your retirement balance, yet most Australians never actively compare or switch funds. This guide shows you exactly what to look for, how to compare like-for-like, and how to switch without losing insurance cover.",
    steps: [
      { heading: "Compare Total Fees (Not Just Admin Fees)", body: "Super fees come in multiple layers: administration fees (flat dollar amount), investment fees (percentage of your balance), and indirect costs. A fund advertising 'low fees' might have high investment fees. Use the total fee figure, which combines all costs. On a $200,000 balance, a 0.5% fee difference costs $1,000 per year — compounding over 30 years, that's over $50,000." },
      { heading: "Look at Long-Term Performance (10+ Years)", body: "Compare investment returns over 10+ year periods, not just the last year. One good year doesn't make a good fund. Compare the same investment option type — the 'balanced' option in Fund A versus the 'balanced' option in Fund B. AustralianSuper, Hostplus, UniSuper, and Australian Retirement Trust have consistently ranked in the top performers over 10-year periods." },
      { heading: "Check Your Insurance Cover", body: "Most super funds include default life insurance and total & permanent disability (TPD) cover. Before switching, compare: the level of cover, the premiums (deducted from your super balance), and any waiting periods. If you have a pre-existing health condition, you may not get equivalent cover with a new fund. Always confirm your new cover is active before cancelling the old fund." },
      { heading: "Review Investment Options", body: "Check if the fund offers the investment options you want: high growth, balanced, conservative, direct shares, ethical/ESG options. If you want to actively choose your investments within super, look for funds with a member direct investment option. Some funds like UniSuper and Australian Retirement Trust offer extensive choice." },
      { heading: "Switch via MyGov (Easiest Method)", body: "The simplest way to switch super is through your MyGov account linked to the ATO. Log in, go to Super, select 'Transfer super', choose the fund to transfer from and to, and submit. The transfer typically takes 3-5 business days. You can also use the new fund's rollover form. Make sure you only consolidate into one fund to avoid paying multiple sets of fees." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "super_fund",
    relatedBestPages: [{ label: "Best Super Funds", href: "/best/super-funds" }, { label: "Super Fund Comparison", href: "/compare/super" }],
    faqs: [
      { question: "Can I lose money by switching super funds?", answer: "You could lose insurance cover if you don't arrange new cover before cancelling. Investment-wise, switching doesn't trigger CGT as super is a tax-sheltered environment." },
      { question: "Should I consolidate multiple super accounts?", answer: "Generally yes — multiple accounts mean multiple sets of fees and insurance premiums. Consolidate into the best-performing, lowest-fee fund. Exception: keep separate accounts if one has grandfathered insurance terms." },
      { question: "How do I find my lost super?", answer: "Log into MyGov linked to ATO, go to Super, and select 'Manage my super'. It shows all super accounts held in your name, including lost or unclaimed super." },
      { question: "How often should I review my super fund?", answer: "At least annually. Check performance against peers, review insurance cover, and ensure your investment option matches your risk profile." },
    ],
    verticalLink: "/super",
  },
  {
    slug: "invest-in-us-shares",
    title: "How to Invest in US Shares from Australia (2026) — Complete Guide",
    h1: "How to Invest in US Shares from Australia",
    metaDescription: "How to buy US shares like Apple, Tesla, and Amazon from Australia. Broker options, FX fees, W-8BEN forms, dividend withholding tax, and tax implications explained.",
    intro: "Investing in US shares from Australia gives you access to the world's largest stock market — companies like Apple, Microsoft, Amazon, Tesla, and NVIDIA. Several Australian brokers now offer $0 brokerage on US trades, making it cheaper than ever. This guide covers every step from choosing a broker to understanding the tax implications.",
    steps: [
      { heading: "Choose a Broker With US Market Access", body: "Several Australian brokers offer US share trading: Stake ($0 US brokerage, 0.7% FX), Moomoo ($0 US brokerage, 0.35% FX), CMC Markets ($0 US brokerage, 0.6% FX), Interactive Brokers (US$0.005/share, 0.002% FX), and IG ($0 brokerage, 0.7% FX). The key cost difference is FX fees — the rate you pay to convert AUD to USD. On a $10,000 trade, a 0.7% FX fee costs $70 versus $2 with Interactive Brokers." },
      { heading: "Complete the W-8BEN Form", body: "Before trading US shares, you must complete a W-8BEN form (usually digitally within the broker app). This form tells the US IRS you're an Australian tax resident and reduces US dividend withholding tax from 30% to 15% under the Australia-US tax treaty. Without it, you'll lose 30% of every dividend payment. The form is valid for 3 years and most brokers prompt you to renew." },
      { heading: "Fund Your Account in AUD", body: "Deposit AUD into your broker account. The broker will convert to USD when you place a trade (some let you hold a USD cash balance). Check if your broker offers a multi-currency account — holding USD avoids paying FX fees on every trade. Stake and Interactive Brokers both offer USD wallets." },
      { heading: "Place Your First US Trade", body: "US markets trade from 1:30am to 8:00am AEDT (11:30pm to 6:00am AEST). Most brokers let you place limit orders outside market hours. Start with well-known companies or US ETFs like VOO (S&P 500), QQQ (Nasdaq 100), or VTI (total US market). Fractional shares are available on some platforms, letting you buy $50 worth of a $200 stock." },
      { heading: "Understand the Tax Implications", body: "US shares held by Australian residents are subject to Australian tax. Capital gains are taxed the same as Australian shares (with the 50% CGT discount for 12+ month holdings). US dividends have 15% withheld at source (with W-8BEN), and you can claim this as a foreign income tax offset on your Australian tax return to avoid double taxation. Report all US income on your Australian tax return." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker" && b.us_fee_value !== null && b.us_fee_value !== undefined,
    relatedBestPages: [{ label: "Best for US Shares", href: "/best/us-shares" }, { label: "FX Fee Comparison", href: "/compare" }],
    faqs: [
      { question: "Do I pay tax in both Australia and the US?", answer: "You pay 15% US withholding tax on dividends (with W-8BEN), then claim this as a credit against your Australian tax. Capital gains are only taxed in Australia." },
      { question: "Can I buy US shares with CommSec?", answer: "Yes, CommSec offers US share trading but charges $19.95 per trade plus 0.6% FX — significantly more expensive than Stake ($0 + 0.7% FX) or Interactive Brokers ($0.005/share + 0.002% FX)." },
      { question: "What time can I trade US shares from Australia?", answer: "US markets (NYSE, NASDAQ) open at 11:30pm AEST / 1:30am AEDT and close at 6:00am AEST / 8:00am AEDT." },
      { question: "What are fractional shares?", answer: "Some brokers let you buy a dollar amount of a US stock rather than whole shares. Stake, Moomoo, and eToro offer fractional US shares." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "buy-term-deposit",
    title: "How to Buy a Term Deposit in Australia (2026) — Rates & Process",
    h1: "How to Open a Term Deposit in Australia",
    metaDescription: "How to open a term deposit in Australia. Compare rates, choose a term, understand early withdrawal penalties, and decide if a TD is right for your savings.",
    intro: "Term deposits are one of the safest investments available in Australia — your capital is guaranteed by the government up to $250,000 per institution under the Financial Claims Scheme. With rates above 5% in 2026, they're an attractive option for parking cash. Here's how to get started.",
    steps: [
      { heading: "Compare Rates Across Institutions", body: "Rates vary significantly between banks. As of early 2026, top 6-month rates range from 4.85% to 5.10%, with Judo Bank, ING, and Macquarie consistently offering competitive rates. Don't just check the big four banks — smaller banks and credit unions often offer 0.3-0.5% more. Use our comparison table to see current rates side-by-side." },
      { heading: "Choose Your Term Length", body: "Term deposits range from 1 month to 5 years. Shorter terms (3-6 months) give you flexibility to re-invest at potentially higher rates. Longer terms (1-2 years) lock in today's rate but limit your access. Consider laddering — splitting your deposit across different terms (e.g., 3 months, 6 months, 12 months) so portions mature regularly." },
      { heading: "Decide on Interest Payment Frequency", body: "Most term deposits let you choose when interest is paid: at maturity, monthly, quarterly, or annually. Monthly payments give you access to interest income, but the rate may be slightly lower. Interest at maturity typically offers the highest rate because the bank retains the interest for the full term." },
      { heading: "Apply Online or In-Branch", body: "Most banks allow you to open a term deposit entirely online. You'll need an existing savings or transaction account with the bank (some require this, others don't). Transfer the deposit amount, select your term and interest frequency, and confirm. The process typically takes 10-15 minutes. Minimum deposits range from $1,000 to $25,000 depending on the institution." },
      { heading: "Understand Early Withdrawal Rules", body: "If you need your money before the term ends, most banks apply a penalty — typically a reduced interest rate (often dropping to the base savings rate or lower). Some banks require 31 days' notice for early withdrawal. Factor this into your decision: if you might need the money, choose a shorter term or keep some in a high-interest savings account instead." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "term_deposit",
    relatedBestPages: [{ label: "Best Term Deposits", href: "/best/term-deposits" }, { label: "Savings Accounts", href: "/compare?filter=savings" }],
    faqs: [
      { question: "Are term deposits safe?", answer: "Yes — deposits up to $250,000 per ADI (Authorised Deposit-taking Institution) are guaranteed by the Australian Government under the Financial Claims Scheme." },
      { question: "Do I pay tax on term deposit interest?", answer: "Yes — interest earned on term deposits is assessable income and must be declared on your tax return. The bank reports it to the ATO. Consider the after-tax return when comparing with other investments." },
      { question: "What happens when my term deposit matures?", answer: "Most banks auto-roll your deposit into a new term at the current rate. You usually have a grace period (7-14 days) to withdraw or change terms without penalty. Set a calendar reminder." },
      { question: "Can I have multiple term deposits?", answer: "Yes. Many investors ladder multiple term deposits with different maturity dates for regular access while earning competitive rates." },
    ],
    verticalLink: "/compare",
  },
  {
    slug: "open-high-interest-savings",
    title: "How to Open a High-Interest Savings Account (2026) — Best Rates",
    h1: "How to Open a High-Interest Savings Account",
    metaDescription: "How to find and open the best high-interest savings account in Australia. Compare rates, bonus conditions, and account features. Top accounts pay 5.50%+ in 2026.",
    intro: "High-interest savings accounts in Australia are paying 5% or more in 2026 — significantly better than the big four banks' standard rates of 1-2%. The catch: most require you to meet monthly conditions (like depositing a minimum amount) to earn the full rate. This guide shows you how to find the best rate and actually earn it.",
    steps: [
      { heading: "Compare Base Rates vs Bonus Rates", body: "Most high-interest savings accounts advertise a 'bonus rate' that requires meeting monthly conditions. The base rate (what you earn if you miss the conditions) is often much lower. ING Savings Maximiser pays 5.50% if you deposit $1,000/month and make 5 card purchases — but only 0.55% base. Ubank pays 5.50% with a $200/month deposit. Compare the conditions you can realistically meet." },
      { heading: "Check the Conditions You Need to Meet", body: "Common bonus conditions include: depositing a minimum amount each month ($200-$2,000), making a certain number of card transactions (usually 5), growing your balance each month, or having a linked transaction account. Choose an account with conditions that fit your normal spending and saving patterns — don't open an account where you'll consistently miss the bonus." },
      { heading: "Open the Account Online", body: "Most high-interest savings accounts can be opened online in 5-10 minutes. You'll need your ID (driver's licence or passport), tax file number, and an existing bank account to transfer funds from. Some banks (like ING and Ubank) require you to also open a linked transaction account to earn the bonus rate." },
      { heading: "Set Up Automatic Deposits", body: "Set up an automatic recurring transfer from your pay account to ensure you meet the monthly deposit condition. Time it for just after payday. If the condition is '$1,000 per month', set up a $1,000 automatic transfer on the 1st of each month. This removes the risk of forgetting and missing the bonus rate." },
      { heading: "Review Rates Quarterly", body: "Banks regularly change savings rates — sometimes without notice. Set a quarterly reminder to check if your account is still competitive. Switching savings accounts is easy and free, so don't stick with a below-market rate out of inertia. Our comparison page shows current rates updated daily." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "savings_account",
    relatedBestPages: [{ label: "Best Savings Accounts", href: "/compare?filter=savings" }, { label: "Savings Calculator", href: "/savings-calculator" }],
    faqs: [
      { question: "What is the highest savings rate in Australia?", answer: "As of early 2026, ING Savings Maximiser and Ubank Save both offer 5.50% with conditions met. Rates change frequently — check our comparison page for current rates." },
      { question: "Are savings accounts covered by the government guarantee?", answer: "Yes — deposits up to $250,000 per ADI are guaranteed under the Financial Claims Scheme, same as term deposits." },
      { question: "Can I have multiple high-interest savings accounts?", answer: "Yes — there's no limit. Some people maintain accounts at multiple banks to maximise the $250,000 guarantee per institution, or to earn bonus rates on different conditions." },
      { question: "What happens if I miss the bonus conditions one month?", answer: "You earn only the base rate for that month. You can earn the bonus rate again next month by meeting conditions. It is not permanent." },
    ],
    verticalLink: "/savings",
  },
  {
    slug: "invest-in-etfs-for-beginners",
    title: "ETF Investing for Beginners Australia (2026) — How to Start",
    h1: "ETF Investing for Beginners in Australia",
    metaDescription: "A beginner's guide to ETF investing in Australia. What ETFs are, how to choose them, the best ETFs for beginners, and how to build a simple portfolio.",
    intro: "ETFs (Exchange-Traded Funds) are the most popular way for Australians to invest in a diversified portfolio. They trade on the ASX like regular shares but give you instant exposure to hundreds or thousands of stocks, bonds, or other assets. This guide is for complete beginners who want to start investing in ETFs.",
    steps: [
      { heading: "Understand What an ETF Is", body: "An ETF is a fund that holds a basket of investments (shares, bonds, property, etc.) and trades on the stock exchange. When you buy one unit of the Vanguard Australian Shares ETF (VAS), you're effectively buying a tiny piece of the 300 largest Australian companies. ETFs are managed passively — they track an index rather than trying to beat it — which keeps fees extremely low (typically 0.04% to 0.50% per year)." },
      { heading: "Choose an ETF Strategy", body: "The simplest approach for beginners is a core portfolio of 2-3 ETFs covering different markets. A common Australian beginner portfolio: VAS (Australian shares, ~40%), VGS (international shares, ~40%), and VAF (Australian bonds, ~20%). This gives you diversification across geographies and asset classes. Adjust the percentages based on your risk tolerance and time horizon." },
      { heading: "Open a Brokerage Account", body: "You need a share trading account to buy ETFs. For beginners, platforms like Stake ($3/trade), CMC Markets ($0 first trade/day), or Superhero ($2/trade) offer low costs and simple interfaces. If you want CHESS sponsorship (shares held in your name), choose Stake, CMC Markets, Pearler, or SelfWealth." },
      { heading: "Place Your First ETF Order", body: "Search for the ETF by its ASX code (e.g., 'VAS'). Place a 'limit order' at or near the current price — this ensures you don't pay more than you expect. Start with whatever amount you're comfortable with — many ETFs trade at $50-100 per unit. You can buy as little as one unit. Consider investing a fixed amount regularly (dollar-cost averaging) rather than trying to time the market." },
      { heading: "Reinvest Dividends and Stay the Course", body: "Most ETFs pay dividends quarterly or semi-annually. You can reinvest these by buying more units, or some brokers offer a DRP (Dividend Reinvestment Plan) that does this automatically. The key to ETF investing is consistency — invest regularly, don't panic sell during market drops, and let compound returns do the work over decades." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best ETFs Australia", href: "/article/best-etfs-australia" }, { label: "Best for Beginners", href: "/best/beginners" }],
    faqs: [
      { question: "How much money do I need to start investing in ETFs?", answer: "As little as $50-100 to buy a single ETF unit. With fractional share brokers, you can start with even less. There's no minimum beyond the unit price and your broker's minimum order." },
      { question: "Are ETFs safer than individual shares?", answer: "ETFs are diversified — one ETF might hold 300+ companies — so the risk of any single company failing has minimal impact. However, ETFs still carry market risk (the whole market can go down)." },
      { question: "What's the difference between VAS and A200?", answer: "VAS (Vanguard) tracks the ASX 300 with a 0.07% fee. A200 (Betashares) tracks the ASX 200 with a 0.04% fee. Both give broad Australian share exposure — A200 is slightly cheaper, VAS covers 100 more companies." },
      { question: "How are ETFs taxed in Australia?", answer: "ETF distributions are taxable income. Capital gains tax applies on sale with a 50% discount if held over 12 months. ETFs provide annual tax statements." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "dividend-investing-australia",
    title: "How to Start Dividend Investing in Australia (2026) — Income Strategy",
    h1: "How to Start Dividend Investing in Australia",
    metaDescription: "A guide to dividend investing in Australia. Franking credits, dividend yield, DRPs, best dividend stocks and ETFs, and building a passive income portfolio.",
    intro: "Dividend investing is popular in Australia thanks to our unique franking credit system, which means dividends from Australian companies often come with a tax credit that can reduce or even eliminate the tax you owe. This guide explains how to build a dividend income portfolio.",
    steps: [
      { heading: "Understand Franking Credits", body: "When an Australian company pays tax on its profits (at 30% or 25%), it can pass these tax credits to shareholders as 'franking credits' attached to dividends. If your marginal tax rate is below 30%, you actually get a tax refund on the difference. A fully franked dividend of $700 comes with $300 in franking credits — meaning the company earned $1,000 pre-tax. You declare $1,000 as income but get credit for $300 already paid." },
      { heading: "Focus on Dividend Yield and Sustainability", body: "Dividend yield is the annual dividend divided by the share price. A $50 stock paying $2.50/year in dividends has a 5% yield. But yield alone isn't enough — check if the company can sustain and grow its dividends. Look at the payout ratio (dividends as % of profits). A payout ratio over 80% leaves little room for dividend growth. The big four banks, Telstra, and major miners are traditional Australian dividend payers." },
      { heading: "Consider Dividend ETFs", body: "For diversified dividend income without picking individual stocks, consider dividend-focused ETFs. VHY (Vanguard Australian Shares High Yield) focuses on high-dividend ASX stocks. SYI (SPDR MSCI Australia Select High Dividend Yield) is another option. These typically yield 4-6% fully franked. International dividend ETFs like VGE or VDHG provide global income diversification but without franking credits." },
      { heading: "Set Up a Dividend Reinvestment Plan (DRP)", body: "Most ASX companies and ETFs offer a DRP — dividends are automatically reinvested by buying more shares, often at a small discount and with no brokerage. This compounds your returns over time. When you're building wealth (not yet needing income), DRPs accelerate portfolio growth significantly." },
      { heading: "Build Your Portfolio Gradually", body: "Don't try to build a full dividend portfolio at once. Start with 1-2 high-quality dividend stocks or a dividend ETF, then add positions over time. Aim for diversification across sectors — don't put everything in banks just because they pay high dividends. A well-diversified dividend portfolio might include banks, miners, REITs, infrastructure, and consumer staples." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best Share Trading Platforms", href: "/best/share-trading" }, { label: "Franking Credits Guide", href: "/how-to/claim-franking-credits" }],
    faqs: [
      { question: "How much do I need to earn $1,000/month in dividends?", answer: "At a 5% fully franked yield, you'd need about $240,000 invested. At 4%, about $300,000. This assumes all dividends are from fully franked Australian companies." },
      { question: "Are dividends taxed in Australia?", answer: "Yes — dividends are assessable income. However, fully franked dividends come with franking credits that offset the tax. If your marginal rate is below 30%, you may receive a refund." },
      { question: "What's better: dividend stocks or growth stocks?", answer: "It depends on your stage of life. Growth stocks (which reinvest profits instead of paying dividends) may generate higher total returns over long periods. Dividend stocks provide regular income and tend to be less volatile." },
      { question: "What is a dividend reinvestment plan (DRP)?", answer: "A DRP automatically uses your dividend payments to buy more shares, often at a small discount with no brokerage. Most ASX companies offer DRPs." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "choose-robo-advisor",
    title: "How to Choose a Robo-Advisor in Australia (2026) — Comparison Guide",
    h1: "How to Choose a Robo-Advisor in Australia",
    metaDescription: "How to choose the best robo-advisor in Australia. Compare Stockspot, Raiz, Spaceship, Six Park, and Vanguard. Fees, performance, minimum investment, and features.",
    intro: "Robo-advisors automate your investing by building and managing a diversified ETF portfolio based on your risk profile. They're ideal for people who want to invest but don't want to pick individual stocks or rebalance their portfolio manually. This guide compares the major Australian options.",
    steps: [
      { heading: "Understand What a Robo-Advisor Does", body: "A robo-advisor asks you questions about your financial goals, risk tolerance, and investment timeline. Based on your answers, it creates a portfolio of ETFs (typically 5-10 different funds covering Australian shares, international shares, bonds, and property). It then automatically rebalances your portfolio when it drifts from the target allocation, and reinvests dividends." },
      { heading: "Compare Fees Carefully", body: "Robo-advisor fees have two layers: the platform fee (0.20%-0.66% per year) and the underlying ETF fees (typically 0.10%-0.30%). Total cost is usually 0.30%-0.96% annually. Stockspot charges 0.66% on balances under $50k (total ~0.86% including ETFs). Raiz charges $4.50/month flat fee (better for small balances). Vanguard Personal Investor charges 0.20% (cheapest for larger balances)." },
      { heading: "Check Minimum Investment Requirements", body: "Minimums vary: Raiz has no minimum (invest from $5), Spaceship starts at $1, Stockspot requires $2,000, Six Park requires $10,000, and Vanguard Personal Investor requires $1,000. If you're starting small, Raiz or Spaceship make sense. For larger amounts, Stockspot or Vanguard offer better value." },
      { heading: "Review Investment Philosophy and Options", body: "Each robo-advisor has a different approach. Stockspot focuses on evidence-based investing with gold allocation for downside protection. Raiz offers themed portfolios including 'Sapphire' (socially responsible). Spaceship has a 'Universe' portfolio focused on tech/innovation companies. Six Park offers human advisor oversight. Choose the philosophy that aligns with your views." },
      { heading: "Consider Tax Efficiency", body: "Look for robo-advisors that offer tax-loss harvesting (selling losing positions to offset gains), tax-optimised portfolio construction, and clear tax reporting. Stockspot and Six Park provide annual tax reports that make filing easy. Some robo-advisors also offer SMSF-compatible accounts for self-managed super." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "robo_advisor",
    relatedBestPages: [{ label: "Best Robo-Advisors", href: "/best/robo-advisors" }, { label: "Robo vs Financial Planner", href: "/advisor-guides/financial-planner-vs-robo-advisor" }],
    faqs: [
      { question: "Are robo-advisors safe?", answer: "Yes — your money is invested in regulated ETFs held by a custodian. If the robo-advisor company goes bankrupt, your investments are protected. All major Australian robo-advisors hold an AFSL or operate under one." },
      { question: "Can I withdraw my money at any time?", answer: "Yes — robo-advisors don't have lock-up periods. Withdrawals typically take 2-5 business days to process. However, selling investments may trigger capital gains tax." },
      { question: "Do robo-advisors outperform index funds?", answer: "Generally no — most robo-advisors invest in the same index funds you could buy yourself. You're paying for the convenience of automatic rebalancing, portfolio construction, and tax optimisation. For hands-off investors, this convenience is worth the 0.2-0.7% annual fee." },
      { question: "Can I use a robo-advisor for my super?", answer: "Some robo-advisors offer SMSF accounts (like Stockspot). Others like Spaceship offer their own super product." },
    ],
    verticalLink: "/compare",
  },
  {
    slug: "set-up-family-trust-investing",
    title: "How to Set Up a Family Trust for Investing in Australia (2026)",
    h1: "How to Set Up a Family Trust for Investing",
    metaDescription: "Step-by-step guide to setting up a family trust for investing in Australia. Learn about trust structures, tax benefits, costs, and how to open a trust brokerage account.",
    intro: "A family trust (discretionary trust) is one of the most common structures Australians use to hold investments, manage tax, and protect assets. Trusts let you distribute investment income among family members — potentially reducing total tax by directing income to lower-income earners. This guide walks you through how to set one up for share or property investing.",
    steps: [
      { heading: "Understand How a Family Trust Works", body: "A family trust is a legal arrangement where a trustee holds and manages assets on behalf of beneficiaries (usually family members). The trustee decides how to distribute income each year. The key benefit is tax flexibility — you can distribute dividends and capital gains to family members in lower tax brackets. For example, if you earn $180k but your spouse earns $40k, distributing investment income to your spouse means it's taxed at a lower marginal rate.\n\nA family trust is a discretionary trust, meaning the trustee has discretion over distributions each year. This is different from a unit trust where income is split by fixed units." },
      { heading: "Choose a Trustee Structure", body: "The trustee is legally responsible for managing the trust's assets. You have two options: an individual trustee (you personally) or a corporate trustee (a company you set up to act as trustee). Most financial advisors recommend a corporate trustee because it provides limited liability — if the trust is sued, your personal assets are protected. A corporate trustee costs more upfront ($500-$1,000 for ASIC registration) but is safer long-term.\n\nIf you choose an individual trustee, you and your spouse can be joint trustees. This is simpler and cheaper but offers less asset protection." },
      { heading: "Get the Trust Deed Drafted", body: "The trust deed is the legal document that sets out the rules of your trust — who the beneficiaries are, what the trustee can do, how income is distributed, and what happens if the trust is wound up. You need a solicitor or specialist trust service to draft this properly. Expect to pay $1,000-$3,000 for a quality deed.\n\nDon't use free templates — the ATO scrutinises trusts closely, and a poorly drafted deed can result in unintended tax consequences or the trust being treated as invalid. The deed should name a wide class of beneficiaries (you, spouse, children, future grandchildren, related entities) to maximise future flexibility." },
      { heading: "Apply for a TFN and ABN for the Trust", body: "Once the deed is signed, apply for a Tax File Number (TFN) and Australian Business Number (ABN) for the trust entity. You can do this online through the Australian Business Register (ABR). The trust is a separate taxpayer entity — it must lodge its own tax return each year.\n\nYou'll also need to open a bank account in the trust's name. Most banks require the original trust deed, trustee identification, and the trust TFN to open an account." },
      { heading: "Open a Brokerage Account in the Trust's Name", body: "Most Australian brokers support trust accounts — including CommSec, Interactive Brokers, CMC Markets, and Stake. You'll need to provide the trust deed, trustee identification, trust TFN, and trust ABN. The account will be in the format 'John Smith ATF Smith Family Trust'.\n\nCHESS-sponsored brokers are recommended for trusts so the shares are registered directly in the trust's name on the ASX register. This makes administration cleaner and ownership clearer." },
      { heading: "Manage Annual Distributions and Tax Returns", body: "Before 30 June each year, the trustee must make a distribution resolution — a formal decision about how the trust's income will be distributed among beneficiaries. If you don't make a resolution, the trust may be taxed at the top marginal rate (47%).\n\nThe trust lodges its own tax return showing total income and how it was distributed. Each beneficiary then includes their share on their personal tax return. Franking credits from Australian shares flow through to beneficiaries, which is a major advantage for trust investing.\n\nExpect to pay an accountant $1,500-$3,000 annually for trust tax returns and distribution advice." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best Brokers for Advanced Investors", href: "/best/advanced" }, { label: "Best Low-Fee Brokers", href: "/best/low-fees" }],
    faqs: [
      { question: "How much does it cost to set up a family trust?", answer: "Total setup costs are typically $2,000-$5,000 including the trust deed ($1,000-$3,000), corporate trustee registration ($500-$1,000), and professional fees. Ongoing costs include annual tax returns ($1,500-$3,000) and ASIC corporate trustee fees (~$300/year)." },
      { question: "Can I put my existing shares into a trust?", answer: "Yes, but transferring shares from your personal name to a trust triggers a CGT event — you'll pay capital gains tax on any unrealised gains at the time of transfer. If your shares have significant unrealised gains, this may be costly. Get tax advice before transferring." },
      { question: "Is a family trust worth it for small portfolios?", answer: "Generally, trusts become worthwhile when your portfolio generates more than $20,000-$30,000 in annual income and you have family members in lower tax brackets. Below this level, the annual accounting costs may outweigh the tax savings." },
      { question: "Do I need a financial advisor to set up a family trust?", answer: "You need at minimum a solicitor to draft the trust deed and an accountant to handle tax registrations and ongoing returns. A financial advisor can help structure distributions optimally. Using a one-stop trust establishment service (many law firms offer this) typically costs less than hiring each professional separately." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "invest-in-reits",
    title: "How to Invest in REITs in Australia (2026) — Complete Guide",
    h1: "How to Invest in REITs in Australia",
    metaDescription: "Learn how to invest in Australian REITs (Real Estate Investment Trusts). Compare top ASX-listed REITs, understand yields, risks, and how to build a property income portfolio.",
    intro: "REITs (Real Estate Investment Trusts) let you invest in commercial property — shopping centres, office towers, warehouses, and more — without buying a physical building. They trade on the ASX like shares, pay regular distributions, and offer diversification away from direct residential property. This guide shows you how to get started.",
    steps: [
      { heading: "Understand What a REIT Is", body: "A REIT is a company that owns, operates, or finances income-producing real estate. In Australia, ASX-listed REITs (sometimes called A-REITs) hold billions of dollars in commercial property and distribute most of their rental income to shareholders. By law, REITs must distribute at least 90% of taxable income.\n\nCommon REIT sectors include retail (Scentre Group, Vicinity Centres), industrial/logistics (Goodman Group, Centuria Industrial), office (Dexus, GPT Group), and diversified (Stockland, Mirvac). Each sector has different risk and return characteristics." },
      { heading: "Compare REIT Types and Sectors", body: "Industrial/logistics REITs have been the strongest performers in recent years, driven by e-commerce demand for warehouses. Retail REITs were hit hard by COVID but have recovered. Office REITs face ongoing uncertainty from work-from-home trends.\n\nYou can also invest in REIT ETFs for instant diversification: VAP (Vanguard Australian Property Securities) holds 30+ REITs in one fund, and MVA (VanEck Australian Property) offers similar diversification. REIT ETFs charge 0.23-0.35% in annual fees." },
      { heading: "Evaluate Distribution Yield and Growth", body: "The distribution yield tells you how much income you'll receive relative to the share price. Australian REITs typically yield 4-7% — higher than most ASX shares. However, don't chase yield alone. A very high yield may signal the market expects trouble (falling property values, tenant vacancies).\n\nAlso look at: occupancy rate (above 95% is healthy), weighted average lease expiry (WALE — longer is more stable), debt levels (gearing above 40% adds risk), and whether the REIT is growing its portfolio or just maintaining." },
      { heading: "Open a Brokerage Account and Buy", body: "You buy REITs through any Australian share trading platform, the same way you buy ordinary ASX shares. Search for the REIT by its ASX code (e.g. 'GMG' for Goodman Group), select Buy, and place your order. Settlement is T+2.\n\nMost REITs have share prices between $1 and $15, making them accessible for small investors. There's no minimum number of units to buy, though your broker may have a minimum trade value (usually $500)." },
      { heading: "Understand REIT Tax Treatment", body: "REIT distributions are more complex than ordinary dividends. Each distribution has components: taxable income (like rent), tax-deferred amounts (from building depreciation), and capital gains. Your REIT will send an annual tax statement (AMMA statement) breaking this down.\n\nTax-deferred amounts reduce your cost base rather than being taxed immediately — you pay CGT when you sell. This means REITs can be tax-efficient for long-term holders. Franking credits are rare for REITs since trusts don't pay company tax." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker" || b.platform_type === "property_platform",
    relatedBestPages: [{ label: "Best Property Platforms", href: "/best/property-platforms" }, { label: "Best Brokers for Beginners", href: "/best/beginners" }],
    faqs: [
      { question: "Are REITs a good investment in 2026?", answer: "REITs offer diversification and income but are sensitive to interest rates. As rates stabilise, REITs become more attractive. Industrial/logistics REITs remain strong due to e-commerce growth. Consider REITs as 10-20% of a diversified portfolio rather than your only investment." },
      { question: "What's the difference between a REIT and buying an investment property?", answer: "REITs are liquid (sell on ASX in seconds), diversified (dozens of properties), and require no management. Direct property gives you leverage (bank lending), more control, and potential negative gearing benefits. REITs are simpler and more accessible; direct property has higher returns potential but more complexity." },
      { question: "How often do REITs pay distributions?", answer: "Most Australian REITs pay distributions quarterly or semi-annually. Some pay monthly. Distribution dates are published on the REIT's website and your broker's platform." },
      { question: "Can I hold REITs inside super?", answer: "Yes. You can buy ASX-listed REITs inside a self-managed super fund (SMSF) or via a managed fund option inside some retail/industry super funds. REIT distributions inside super are taxed at 15% (or 0% in pension phase), making them highly tax-efficient for superannuation investors." },
    ],
    verticalLink: "/share-trading",
  },
  {
    slug: "refinance-home-loan",
    title: "How to Refinance Your Home Loan in Australia (2026) — Step-by-Step",
    h1: "How to Refinance Your Home Loan in Australia",
    metaDescription: "Complete guide to refinancing your Australian home loan. Learn when to refinance, how to compare rates, switch lenders, and save thousands in interest. Updated 2026.",
    intro: "Refinancing your home loan could save you tens of thousands of dollars over the life of your mortgage. With Australian mortgage rates varying significantly between lenders, switching to a lower rate — or negotiating a better deal with your current lender — is one of the highest-impact financial moves you can make. This guide covers everything from when to refinance to how to actually switch.",
    steps: [
      { heading: "Check If Refinancing Makes Sense", body: "Refinancing isn't free — there are costs involved, so you need to make sure the savings outweigh them. The main reasons to refinance are: securing a lower interest rate (even 0.25% lower on a $600,000 loan saves ~$1,500/year), accessing equity for renovations or investing, switching from a variable to fixed rate (or vice versa), or consolidating debts.\n\nAs a rule of thumb, if you can save at least 0.25-0.50% on your rate and plan to stay in the loan for 2+ years, refinancing is usually worthwhile. Use an online refinance calculator to estimate your savings." },
      { heading: "Understand the Costs Involved", body: "Common refinancing costs include: discharge fee from your current lender ($150-$400), application fee with the new lender ($0-$600, many waive this), property valuation ($0-$500), settlement/legal fees ($200-$500), and break costs if you're leaving a fixed-rate loan early (can be thousands). Some lenders offer cashback deals ($2,000-$4,000) to offset switching costs.\n\nAlso check if you'll lose any offset account balance benefits or if your current lender has exit fees. Loans taken out after July 2011 cannot have exit fees in Australia." },
      { heading: "Compare Home Loan Offers", body: "Start by checking what rate your current lender would offer to retain you — many banks have a 'retention team' that can offer a better rate without you needing to switch. If their offer isn't competitive, shop around.\n\nCompare these key features: interest rate (both advertised and comparison rate), loan features (offset account, redraw, extra repayments), fees (ongoing and upfront), and flexibility. A mortgage broker can compare hundreds of lenders for you at no cost — they're paid by the lender. Our advisor directory lists verified Australian mortgage brokers." },
      { heading: "Apply to the New Lender", body: "The application process is similar to your original loan. You'll need proof of income (payslips, tax returns), bank statements (3-6 months), current loan details, and property information. The new lender will value your property to confirm the loan-to-value ratio (LVR).\n\nIf your LVR is above 80% (you owe more than 80% of the property value), you may need to pay Lenders Mortgage Insurance (LMI) again. This can make refinancing uneconomic, so check your equity position first. The process typically takes 2-4 weeks from application to settlement." },
      { heading: "Settlement and Switching", body: "Once approved, the new lender's solicitor handles the settlement process — paying out your old loan and registering the new mortgage. You don't need to do much during this stage. Your old lender will provide a payout figure, the new lender pays this amount, and your repayments start with the new lender.\n\nAfter settlement, set up your offset account, update any automatic payments, and review your new repayment schedule. Consider making extra repayments if your new loan allows it — even small extra payments significantly reduce the total interest over the life of the loan." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" }, { label: "Find a Buyers Agent", href: "/advisors/buyers-agents" }],
    faqs: [
      { question: "How often should I refinance my home loan?", answer: "Review your rate every 1-2 years. Many Australians set and forget their mortgage, missing out on significant savings. Even if you don't switch lenders, calling your bank to ask for a rate review can save you thousands." },
      { question: "Can I refinance if I'm self-employed?", answer: "Yes, but it can be harder to prove income. Lenders typically want 2 years of tax returns and financials. Some non-bank lenders specialise in self-employed borrowers and have more flexible criteria." },
      { question: "Will refinancing affect my credit score?", answer: "The credit enquiry may cause a small, temporary dip (5-10 points). Having a new loan account also affects your score short-term. However, lower repayments and better loan management quickly offset this. Avoid multiple applications to different lenders simultaneously — use a broker instead." },
      { question: "How long does refinancing take?", answer: "Most refinances settle in 2–4 weeks from application to settlement. Simple applications with complete documentation can be faster. Delays typically arise from property valuations, missing documents, or slow discharge from the current lender. A mortgage broker can help manage the process and reduce delays." },
    ],
    verticalLink: "/advisors/mortgage-brokers",
  },
  {
    slug: "build-emergency-fund",
    title: "How to Build an Emergency Fund in Australia (2026) — Savings Guide",
    h1: "How to Build an Emergency Fund in Australia",
    metaDescription: "How to build an emergency fund in Australia. Learn how much to save, where to keep it, and strategies to reach your target faster. High-interest savings account tips included.",
    intro: "An emergency fund is money set aside for unexpected expenses — job loss, medical bills, car repairs, or urgent home maintenance. Financial experts recommend having 3-6 months of essential expenses saved before you start investing. Without this safety net, you might be forced to sell investments at a loss or take on high-interest debt when life throws a curveball.",
    steps: [
      { heading: "Calculate Your Target Amount", body: "Add up your essential monthly expenses: rent/mortgage, food, utilities, insurance, transport, minimum debt repayments, and any dependant costs. Multiply by 3 for a basic safety net, or by 6 for a more comfortable buffer.\n\nFor example, if your essential expenses are $4,000/month, aim for $12,000-$24,000. Single-income households, self-employed people, and those with variable income should lean toward 6 months. Dual-income households with stable jobs can start with 3 months." },
      { heading: "Choose a High-Interest Savings Account", body: "Your emergency fund should be in a high-interest savings account — accessible within 1-2 business days but not so easy to access that you dip into it casually. Look for accounts offering bonus interest rates (currently 5.0-5.50% in Australia) with conditions like depositing a minimum amount monthly.\n\nTop options in 2026 include ING Savings Maximiser, Ubank, BOQ, and Macquarie. Compare rates on our savings account comparison page. Avoid term deposits for emergency funds — you need the money to be accessible without penalties." },
      { heading: "Automate Your Savings", body: "Set up an automatic transfer on payday — even $100-$200 per week adds up to $5,200-$10,400 per year. Treat it like a non-negotiable bill payment. The 'pay yourself first' principle means saving before spending, not saving what's left over.\n\nSome banks offer round-up features that automatically save spare change from transactions. While small individually, round-ups can add $500-$1,000 per year passively." },
      { heading: "Accelerate with Windfalls", body: "Direct any unexpected money straight to your emergency fund: tax refunds, work bonuses, cash gifts, selling unused items, or side hustle income. A $3,000 tax refund can fast-track your savings by months.\n\nIf you have high-interest debt (credit cards at 20%+), it may make sense to split extra money between debt repayment and emergency savings. Paying off a $5,000 credit card balance saves you $1,000/year in interest — effectively a guaranteed 20% return." },
      { heading: "Maintain and Protect Your Fund", body: "Once you reach your target, don't stop the habit — redirect automatic savings to investments instead. If you use your emergency fund (that's what it's for!), pause investing temporarily and rebuild it before continuing to invest.\n\nReview your target annually as your expenses change. A new mortgage, having children, or lifestyle changes may mean your target needs to increase. Keep the fund in a separate bank from your everyday spending to reduce the temptation to dip into it." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "savings_account",
    relatedBestPages: [{ label: "Best High-Interest Savings Accounts", href: "/best/high-interest-savings" }, { label: "Best Term Deposits", href: "/best/term-deposits" }],
    faqs: [
      { question: "Should I invest my emergency fund?", answer: "No — your emergency fund should be in cash (a savings account). Shares, ETFs, or crypto can lose value exactly when you need the money most. The point of an emergency fund is guaranteed availability, not growth." },
      { question: "Is 3 months really enough?", answer: "3 months is the minimum. If you're self-employed, have dependants, or work in a volatile industry, aim for 6 months. Some conservative savers keep 12 months, though beyond 6 months the opportunity cost of not investing becomes significant." },
      { question: "Should I save my emergency fund before paying off debt?", answer: "Keep at least $2,000-$3,000 as a mini emergency fund while aggressively paying off high-interest debt (credit cards, personal loans). Once high-interest debt is cleared, build the full 3-6 month fund before investing." },
      { question: "Where should I keep my emergency fund?", answer: "A high-interest savings account (HISA) with a big four or online bank is ideal. Look for one that pays the bonus rate with minimal conditions — typically depositing a minimum amount monthly and making no withdrawals. Keep it separate from your everyday transaction account so you're not tempted to dip in." },
    ],
    verticalLink: "/savings",
  },
  {
    slug: "invest-for-children",
    title: "How to Invest for Your Children in Australia (2026) — Parents' Guide",
    h1: "How to Invest for Your Children in Australia",
    metaDescription: "How to invest for your children in Australia. Compare children's investment accounts, custodial arrangements, bonds, and ETFs. Tax rules for minors explained.",
    intro: "Starting to invest for your children early gives them the greatest financial advantage possible — time. A $5,000 investment at birth growing at 8% p.a. becomes over $50,000 by the time they're 30. This guide covers the different ways to invest for kids in Australia, including tax implications for minor children.",
    steps: [
      { heading: "Understand Tax Rules for Minors", body: "Children under 18 have special tax rules in Australia. Unearned income (investment returns, interest, dividends) above $416/year is taxed at penalty rates — 66% from $417 and up to 45% above $1,307. This is designed to prevent income splitting.\n\nHowever, capital gains from selling shares are taxed at normal marginal rates (not penalty rates), and children get the tax-free threshold ($18,200) on capital gains. This means buy-and-hold strategies (growth shares/ETFs that you sell after the child turns 18) can be more tax-efficient than income-generating investments." },
      { heading: "Choose Your Investment Structure", body: "You have several options:\n\n1. **Invest in your own name 'for' the child** — simplest approach, taxed at your marginal rate, and you maintain full control. You can gift the investments when they turn 18.\n\n2. **Minor trust account** — a trust with the child as beneficiary. More complex and costly but offers asset protection and flexibility.\n\n3. **Insurance bonds (investment bonds)** — taxed internally at 30% with no personal tax on withdrawal after 10 years. Good for parents in higher tax brackets.\n\n4. **Children's savings account** — simple bank accounts earning interest, good for teaching savings habits but returns are low." },
      { heading: "Consider Insurance Bonds for Tax Efficiency", body: "Insurance bonds (also called investment bonds) are one of the most tax-efficient ways to invest for children. The bond company pays tax at 30% internally, and if you hold for 10+ years, withdrawals are completely tax-free — regardless of your marginal tax rate.\n\nProviders include Centuria LifeGoals, Generation Life, and Australian Unity. You can invest in diversified portfolios within the bond. The key rule: you can contribute up to 125% of the previous year's contribution without restarting the 10-year clock.\n\nFor a child born today, a 10-year bond matures before they turn 11 — well before they need the money for education or a first car." },
      { heading: "Start With Broad ETFs for Long-Term Growth", body: "For a multi-decade investment horizon, growth-oriented ETFs are ideal. Consider:\n\n- **VDHG** (Vanguard Diversified High Growth) — a single fund with 90% growth assets, globally diversified\n- **IVV** (iShares S&P 500) — US market exposure\n- **VAS** (Vanguard Australian Shares) — Australian market exposure\n- **NDQ** (BetaShares Nasdaq 100) — US tech/growth exposure\n\nWith 15-20+ years to invest, short-term market drops are irrelevant. Dollar-cost averaging (regular small investments) reduces timing risk." },
      { heading: "Teach Financial Literacy Along the Way", body: "The best gift isn't just the money — it's the knowledge. As your children grow, involve them in investment decisions. Show them the portfolio, explain compound interest, let them pick a share or ETF to research.\n\nApps like Raiz Family let children see their investments growing. Some parents open a small brokerage account and let teenagers manage a portion with guidance. Starting financial education early leads to better money habits for life." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker" || b.platform_type === "robo_advisor",
    relatedBestPages: [{ label: "Best Robo-Advisors", href: "/best/robo-advisors" }, { label: "Best ETF Brokers", href: "/best/etf-trading" }],
    faqs: [
      { question: "Can I open a brokerage account for a child?", answer: "Children can't open brokerage accounts in their own name. You can invest in your name on their behalf, set up a minor trust, or use investment bonds. Some platforms like Raiz offer family accounts where you can invest for children under your profile." },
      { question: "How much should I invest for my child each month?", answer: "Even $50-$100/month makes a huge difference over 18 years. $100/month at 8% p.a. grows to approximately $48,000 by the child's 18th birthday. Start with whatever you can afford and increase over time." },
      { question: "What about saving for school fees?", answer: "For school fees within 5-10 years, consider a mix of high-interest savings and conservative investments (diversified funds with some bonds). For fees 10+ years away, growth ETFs or insurance bonds are appropriate. Dedicated education savings plans (scholarship plans) also exist but compare fees carefully." },
      { question: "At what age can children access invested funds?", answer: "Investments held in your name can be gifted at any age you choose. Minor trust accounts typically vest at 18. Insurance bonds can be accessed by you (as the bond owner) at any time after 10 years, then gifted to the child. There's no legal requirement to transfer at 18 — you can hold funds until the child is ready." },
    ],
    verticalLink: "/compare",
  },
  {
    slug: "start-forex-trading",
    title: "How to Start Forex Trading in Australia (2026) — Beginner's Guide",
    h1: "How to Start Forex Trading in Australia",
    metaDescription: "How to start forex trading in Australia. Learn about currency pairs, leverage, choosing an ASIC-regulated broker, and risk management. Beginner-friendly guide for 2026.",
    intro: "Forex (foreign exchange) trading involves buying and selling currency pairs to profit from exchange rate movements. It's the world's largest financial market, trading over $7 trillion daily. While forex can be profitable, it's also high-risk — ASIC data shows that around 70% of retail forex traders lose money. This guide explains how to start responsibly with an ASIC-regulated broker.",
    steps: [
      { heading: "Understand How Forex Trading Works", body: "Forex is traded in pairs — you're always buying one currency and selling another. For example, buying AUD/USD means you're buying Australian dollars and selling US dollars. If you think the AUD will strengthen against the USD, you go 'long' on AUD/USD. If you think it'll weaken, you go 'short'.\n\nForex prices move in pips (the fourth decimal place for most pairs). If AUD/USD moves from 0.6500 to 0.6510, that's a 10-pip move. Forex brokers make money from the spread — the difference between the buy and sell price — typically 0.1-2.0 pips for major pairs." },
      { heading: "Choose an ASIC-Regulated Broker", body: "Always use an ASIC-regulated forex broker in Australia. ASIC limits retail leverage to 30:1 for major currency pairs (down from the unregulated 500:1 some offshore brokers offer), requires negative balance protection, and mandates risk warnings. This protects you from catastrophic losses.\n\nKey factors to compare: spreads (lower is better — top brokers offer 0.0-0.1 pips on major pairs with commission), platform quality (MetaTrader 4/5, cTrader, or proprietary), minimum deposit, and educational resources. Popular ASIC-regulated forex brokers include IC Markets, Pepperstone, FP Markets, and CMC Markets." },
      { heading: "Learn the Major Currency Pairs", body: "Start with major pairs — they have the tightest spreads and most liquidity:\n\n- **EUR/USD** — most traded pair globally\n- **AUD/USD** — the 'Aussie', highly relevant if you earn AUD\n- **GBP/USD** — 'Cable', very liquid\n- **USD/JPY** — important for Asian session trading\n\nAvoid exotic pairs (e.g. USD/TRY, AUD/ZAR) as a beginner — they have wider spreads, lower liquidity, and more unpredictable movements. Stick to majors until you're consistently profitable." },
      { heading: "Practice on a Demo Account First", body: "Every reputable forex broker offers a free demo account with virtual money. Use it for at least 2-4 weeks before risking real money. Practice placing orders, using stop-losses, managing position sizes, and testing a strategy.\n\nDemo trading has one major limitation: it doesn't replicate the psychological pressure of real money. When you transition to live trading, start with the minimum possible position size. Many traders are profitable on demo but struggle with live accounts because emotions override their strategy." },
      { heading: "Implement Strict Risk Management", body: "Risk management is what separates surviving traders from those who blow up their accounts. Key rules:\n\n1. **Never risk more than 1-2% of your account on a single trade** — on a $5,000 account, that's $50-$100 maximum loss per trade\n2. **Always use stop-losses** — set them before entering a trade, not after\n3. **Aim for at least a 1:2 risk-reward ratio** — risk $50 to potentially make $100\n4. **Don't over-leverage** — just because you can use 30:1 leverage doesn't mean you should. Start with 5:1 or 10:1\n5. **Keep a trading journal** — record every trade, your reasoning, and the outcome\n\nMost beginners fail because they over-leverage, don't use stops, or revenge-trade after losses." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "cfd_forex",
    relatedBestPages: [{ label: "Best Forex Brokers", href: "/best/forex-brokers" }, { label: "Best CFD Platforms", href: "/best/cfd-trading" }],
    faqs: [
      { question: "How much money do I need to start forex trading?", answer: "Most ASIC-regulated brokers have minimums of $200-$500. However, starting with less than $1,000-$2,000 makes proper position sizing very difficult. A $200 account with 1% risk per trade means $2 maximum risk — impractical for most pairs." },
      { question: "Is forex trading legal in Australia?", answer: "Yes — forex trading is fully legal and regulated by ASIC. Only trade with brokers holding an Australian Financial Services Licence (AFSL). Avoid offshore/unregulated brokers that circumvent ASIC protections." },
      { question: "Can I make a living from forex trading?", answer: "A very small percentage of retail traders are consistently profitable enough to live on. Most successful forex traders treat it as a supplement to their income, not a replacement. Be sceptical of anyone selling courses promising easy profits — if it were easy, everyone would do it." },
      { question: "How is forex income taxed in Australia?", answer: "Forex trading profits are generally taxed as assessable income at your marginal rate. If you trade frequently, the ATO may classify you as a trader (business income) rather than an investor (capital gains). Losses may be deductible. Keep detailed records and consult a tax accountant familiar with trading." },
    ],
    verticalLink: "/forex",
  },
  {
    slug: "buy-government-bonds-australia",
    title: "How to Buy Government Bonds in Australia (2026) — Step-by-Step Guide",
    h1: "How to Buy Government Bonds in Australia",
    metaDescription: "Learn how to buy Australian government bonds in 2026. AGBs, Treasury bonds, retail bond platforms, and how bonds fit into a diversified investment portfolio.",
    intro: "Australian Government Bonds (AGBs) are debt securities issued by the Commonwealth of Australia. They pay a fixed interest rate (coupon) every six months and return your principal at maturity. Bonds are considered among the safest investments available because they're backed by the federal government. This guide explains your options for buying them in 2026.",
    steps: [
      { heading: "Understand the Types of Government Bonds", body: "Australia offers two main types: Treasury Bonds (fixed-rate coupon bonds with maturities of 2-30 years) and Treasury Indexed Bonds (TIBs, where the principal adjusts with CPI inflation). Treasury Bonds suit investors wanting predictable income. TIBs suit those wanting inflation protection. Interest rates (yields) on bonds move inversely to price — when yields rise, bond prices fall, and vice versa." },
      { heading: "Decide How to Access Bonds", body: "There are three main routes: (1) **ASX-listed bond ETFs** — the easiest option for most Australians; ETFs like VAF, PLUS, or IAF give diversified exposure to Australian bonds via your existing brokerage account; (2) **Direct purchase via ASX** — some government bonds trade on the ASX under 'XBND' codes and can be bought through any stockbroker; (3) **Australian Government Bonds website** — the Treasury's own retail portal (australiangovernmentbonds.gov.au) allows direct purchase of some retail bonds." },
      { heading: "Open or Use an Existing Brokerage Account", body: "For ASX-listed bonds or bond ETFs, you need a standard brokerage account — the same one you'd use to buy shares. If you don't have one, compare CHESS-sponsored brokers and open an account online. For direct Treasury purchases, register at australiangovernmentbonds.gov.au with your TFN and bank details. No brokerage account is required for direct purchases." },
      { heading: "Choose Your Bond or Bond ETF", body: "For most retail investors, bond ETFs are the better choice: they're diversified, liquid, and low-cost. Compare: **VAF** (Vanguard Australian Fixed Interest Index ETF, MER 0.10%), **PLUS** (VanEck Australian Government Bond Plus ETF), and **AGVT** (BetaShares Australian Government Bond ETF). For direct bonds, check current yields and maturity dates at the RBA website or your broker's bond search tool." },
      { heading: "Place Your Order and Monitor Your Investment", body: "For ETFs, simply place a market or limit order through your broker just like buying shares. For direct bonds, the minimum investment is typically $1,000 and you can hold to maturity (receiving all coupons plus face value) or sell on the ASX before maturity at market price. Monitor interest rate movements — rising rates reduce bond prices. In a rising rate environment, shorter-duration bonds are less affected." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best Online Brokers", href: "/best/online-brokers" }, { label: "Best ETF Brokers", href: "/best/etf-brokers" }],
    faqs: [
      { question: "Are Australian government bonds guaranteed?", answer: "Yes — Australian Government Bonds are backed by the Commonwealth of Australia, which has never defaulted on its debt. They are considered risk-free from a credit perspective, though their market price fluctuates with interest rates." },
      { question: "What return can I expect from Australian government bonds?", answer: "As of early 2026, 10-year Australian government bond yields are approximately 4.2-4.5% per annum. Shorter-term bonds yield less. Returns are lower than equities over long periods, but much more stable." },
      { question: "How is bond income taxed in Australia?", answer: "Coupon (interest) payments are taxed as ordinary income at your marginal tax rate. If you sell a bond before maturity at a profit, CGT applies (with the 50% discount available if held over 12 months). Capital losses on bonds can offset other capital gains." },
      { question: "What is the minimum investment for Australian government bonds?", answer: "Via the government's retail portal, minimums are typically $1,000. Via ASX-listed ETFs, you can invest from as little as $50-$100 per unit. Direct ASX-listed Treasury bonds trade in $1,000 face-value parcels." },
    ],
    verticalLink: "/bonds",
  },
  {
    slug: "invest-in-gold",
    title: "How to Invest in Gold in Australia (2026) — Complete Guide",
    h1: "How to Invest in Gold in Australia",
    metaDescription: "How to invest in gold in Australia. Compare physical gold, gold ETFs, gold mining shares, and gold futures. Pros, cons, and tax treatment for Australian investors.",
    intro: "Gold has been a store of value for thousands of years and remains a popular portfolio diversifier in 2026. When share markets fall or inflation rises, gold often holds its value — or appreciates. Australian investors have multiple ways to access gold, from buying physical bars and coins to low-cost gold ETFs and mining shares. This guide compares all your options.",
    steps: [
      { heading: "Understand Why (and Whether) You Want Gold", body: "Gold doesn't pay dividends or earn revenue — its price is driven by supply, demand, and investor sentiment. It tends to perform well during periods of high inflation, currency weakness, or geopolitical uncertainty. Most financial advisers suggest limiting gold to 5-15% of a portfolio as a hedge, not the core holding. If you're buying gold because you think the financial system will collapse, consider whether that view is realistic and diversify appropriately." },
      { heading: "Choose Your Gold Investment Method", body: "**Physical gold** — You can buy gold coins (Perth Mint Lunar Series, Kangaroo bullion) or bars from the Perth Mint, bullion dealers, or major banks. You need to arrange secure storage (home safe, bank safe deposit box, or vault storage). **Gold ETFs** — ASX-listed ETFs like GOLD (Perth Mint Physical Gold ETF) and QAU (BetaShares Gold Bullion ETF - Currency Hedged) hold physical gold on your behalf. Much easier than storing physical gold. **Gold mining shares** — Companies like Newmont, Northern Star, or Evolution Mining give leveraged exposure to gold prices. Higher risk/reward than physical gold. **Futures/CFDs** — Suitable only for experienced traders due to leverage risk." },
      { heading: "Buy a Gold ETF (Recommended for Most Investors)", body: "The simplest approach for most Australians is a gold ETF via your existing brokerage account. The Perth Mint Physical Gold ETF (GOLD) is backed by physical gold held in the Perth Mint's vault and is GST-free (unlike buying physical gold as a retail investor). BetaShares QAU is currency-hedged, removing AUD/USD fluctuation from your return. Compare MERs (GOLD: 0.15%, QAU: 0.59%) and decide whether you want currency exposure." },
      { heading: "Buy Physical Gold (If You Prefer Tangibility)", body: "The Perth Mint (perthmint.com) is Australia's most trusted source for physical gold. Buy online with delivery or storage at the Mint. For coins and smaller bars, also consider ABC Bullion (Sydney), Guardian Vaults, or Kitco. When comparing prices, note the 'spot price' (wholesale market price) versus the retail price you'll pay — premiums of 2-10% over spot are normal. Capital gains tax applies when you sell, but GST does not apply to investment-grade gold." },
      { heading: "Store and Insure Your Gold", body: "If you hold physical gold, secure storage is essential. Options: (1) Home safe — cheap but limited cover from home insurance (typically $1,000-$2,000 max). Get a dedicated bullion rider on your policy. (2) Bank safe deposit box — typically $100-$400/year but banks don't insure contents. (3) Professional vault storage — Perth Mint's depository program, Custodian Vaults, and others offer allocated storage with full insurance from around 0.5-1.0% per annum of value." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best ETF Brokers", href: "/best/etf-brokers" }, { label: "Best Online Brokers", href: "/best/online-brokers" }],
    faqs: [
      { question: "Is gold a good investment in Australia?", answer: "Gold is a useful portfolio diversifier but not a growth investment — it has returned roughly 8-9% per annum in AUD terms over the past decade, but with high volatility and no income. Most advisers suggest a 5-15% allocation at most." },
      { question: "Do I pay GST on gold in Australia?", answer: "No — investment-grade gold (99.5% purity or higher, in standard bar/coin form) is GST-free under the precious metals GST concession. Gold jewellery and numismatic coins are subject to GST." },
      { question: "How is gold taxed in Australia?", answer: "Selling gold (physical or ETF units) triggers CGT. If held over 12 months, the 50% CGT discount applies. Gold ETFs also distribute any internal income, which is taxed at your marginal rate. Physical gold earns no income." },
      { question: "What is the gold price today in Australia?", answer: "Gold prices change constantly based on the global USD spot price and AUD/USD exchange rate. Check the Perth Mint website, ASX quotes for GOLD ETF, or financial data sites for the current AUD gold price per ounce or gram." },
    ],
    verticalLink: "/commodities",
  },
  {
    slug: "dollar-cost-averaging",
    title: "How to Dollar-Cost Average in Australia (2026) — Beginner's Strategy Guide",
    h1: "How to Dollar-Cost Average Your Investments",
    metaDescription: "Learn how to dollar-cost average (DCA) in Australia. Set up automatic regular investments into ETFs or shares to reduce timing risk and build wealth steadily.",
    intro: "Dollar-cost averaging (DCA) means investing a fixed dollar amount at regular intervals — say, $500 every fortnight — regardless of whether the market is up or down. It's one of the most powerful and psychologically easiest ways to build long-term wealth, removing the impossible task of timing the market. This guide explains how to implement DCA with Australian shares and ETFs.",
    steps: [
      { heading: "Understand How DCA Works", body: "When you invest a fixed amount regularly, you automatically buy more units when prices are low and fewer when prices are high. Over time this lowers your average cost per unit compared to making large, irregular investments. For example, investing $500/month into an ETF means you buy 10 units at $50, then 12.5 units when the price drops to $40, then 9 units when it rises to $55 — your average cost is lower than the average price.\n\nDCA doesn't guarantee profits or prevent losses, but it dramatically reduces the risk of investing a large lump sum at a market peak." },
      { heading: "Choose What to Invest In", body: "DCA works best with diversified, low-cost investments you plan to hold for years. Top choices for Australian DCA investors: **Broad Australian ETFs** (VAS, IOZ — track the ASX 300), **Global ETFs** (VGS, IVV — international developed markets), **Diversified/all-in-one ETFs** (VDHG, DHHF — automatically balanced across asset classes). Avoid DCA-ing into individual shares of speculative companies — if they go to zero, regular buying makes the loss worse." },
      { heading: "Open a Low-Cost Brokerage Account", body: "For regular small investments, brokerage costs matter enormously. Paying $10 brokerage on a $200 investment is a 5% fee before you've started. Choose a broker with low or zero brokerage for small amounts: **Pearler** (designed for DCA, automatic investing, $6.50/trade), **CommSec Pocket** ($2 trades up to $1,000), **Superhero** ($5 trades). Set up a linked bank account you'll use as your investment 'source'." },
      { heading: "Set Up Automatic Investing", body: "The key to DCA is making it automatic so you're not tempted to time the market. Pearler and some other brokers allow you to schedule automatic buy orders. Alternatively, set up a bank transfer to your brokerage account on the same day as your paycheck, then manually place the order (takes 2 minutes). The goal: make investing as boring and automatic as paying rent." },
      { heading: "Stay Consistent Through Market Downturns", body: "DCA only works if you keep investing when markets fall — which is psychologically the hardest part. When the ASX drops 20%, remind yourself that you're now buying more units for the same dollar amount. Your future self will thank you. Review your DCA amount annually (increasing it as your income grows) but don't stop during downturns unless you genuinely have a financial emergency." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best ETF Brokers", href: "/best/etf-brokers" }, { label: "Best Robo-Advisors", href: "/best/robo-advisors" }],
    faqs: [
      { question: "Is dollar-cost averaging better than lump sum investing?", answer: "Research generally shows lump-sum investing outperforms DCA about two-thirds of the time (because markets tend to rise over time, so putting money to work sooner is better). However, DCA is better for investors who don't have a lump sum, can't tolerate the psychological risk of investing everything at once, or are investing from regular income." },
      { question: "How often should I dollar-cost average?", answer: "Fortnightly or monthly works well for most people — aligning with pay cycles. More frequent (e.g., weekly) adds minimal statistical benefit but can increase brokerage costs. Less frequent (e.g., quarterly) is fine but brokerage as a percentage of investment falls naturally with larger amounts." },
      { question: "What is the minimum amount for DCA?", answer: "You can start DCA with as little as $50-$100/month via CommSec Pocket or similar micro-investing apps. Most full-service brokers need $500+ to make brokerage worthwhile. $200-$500/month is a practical minimum for most ETF-based strategies." },
      { question: "Do you pay tax on DCA investments?", answer: "Yes — each purchase creates a separate tax lot with its own cost base. When you sell, CGT applies to each lot based on purchase date and price. Hold lots for over 12 months to qualify for the 50% CGT discount. Using a spreadsheet or software to track each lot is essential for accurate tax reporting." },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "consolidate-super",
    title: "How to Consolidate Your Super in Australia (2026) — Step-by-Step",
    h1: "How to Consolidate Multiple Super Accounts Into One",
    metaDescription: "Learn how to consolidate your superannuation accounts in Australia. Merge multiple super funds using myGov, avoid paying multiple sets of fees, and boost retirement savings.",
    intro: "If you've changed jobs over the years, you likely have multiple superannuation accounts — each charging separate fees and insurance premiums. Consolidating them into one fund can save you thousands in duplicate fees. The ATO estimates Australians hold over $17 billion in multiple or lost super accounts. This guide shows you how to find and consolidate them in under 30 minutes.",
    steps: [
      { heading: "Find All Your Super Accounts", body: "Log into myGov (my.gov.au) and link the ATO service. Under 'Super', you'll see all super accounts held in your name, including any lost or ATO-held super. Alternatively, contact the ATO on 13 28 65 or ask your current employer for your TFN-linked super details. Note the balance and fees for each account before deciding which to consolidate into." },
      { heading: "Choose Which Fund to Keep", body: "Before consolidating, compare your funds on: **Fees** (total annual fees including admin and investment fees as a percentage of balance), **Investment performance** (5-10 year returns after fees), **Insurance** (default death/TPD cover and income protection — consolidating may cancel coverage you need), and **Extra features** (financial advice, retirement income products). The ATO's YourSuper comparison tool at ato.gov.au/yoursuper ranks all MySuper products by fees and returns." },
      { heading: "Check Your Insurance Before Transferring", body: "This is the most important step many people skip. If you consolidate, your insurance in the old fund may be cancelled. If you have a pre-existing condition that might affect future insurance applications, or if your current fund has cover you couldn't replicate in your chosen fund, speak to a financial adviser or insurance specialist first. You may be able to transfer insurance between funds without fresh underwriting in some cases." },
      { heading: "Consolidate via myGov (Fastest Method)", body: "In myGov, go to ATO > Super > Manage > Transfer super. You'll see all your accounts listed. Select the accounts you want to transfer FROM and the account to transfer TO. The transfer is free and typically completes within 3 business days. The ATO notifies the losing fund to release the money. The entire process takes under 10 minutes." },
      { heading: "Update Your Employer for Future Contributions", body: "After consolidating, notify your employer to direct future SG contributions to your chosen fund. Complete a Standard Choice Fund form (available from the ATO) and give it to your payroll team. Your employer must action it within two months. If you don't nominate a fund, employers must use their default fund or check if you have an existing stapled fund via the ATO." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "super_fund",
    relatedBestPages: [{ label: "Best Super Funds", href: "/best/super-funds" }, { label: "Set Up SMSF", href: "/how-to/set-up-smsf" }],
    faqs: [
      { question: "Will I lose any super when I consolidate?", answer: "No — consolidating transfers your full balance (minus any applicable exit fees, which are now capped at 3% and only apply to very small accounts). The transfer is processed at market value on the transfer date." },
      { question: "How long does it take to consolidate super?", answer: "Via myGov, transfers typically complete within 3 business days. Some funds can take up to 30 days if they need to sell illiquid assets. You'll receive a notification from the ATO when the transfer is complete." },
      { question: "What happens to my insurance when I consolidate super?", answer: "Insurance in the fund you're leaving is typically cancelled when you transfer out. Insurance in your chosen fund continues. Always check both fund's PDS for insurance details before consolidating, and consider your health status before cancelling any coverage." },
      { question: "Is it worth consolidating a small super balance?", answer: "Almost always yes — a $3,000 account paying $100/year in fees will be eroded significantly over time. Even small balances benefit from consolidation unless there's a specific reason to keep the account (like valuable insurance cover)." },
    ],
    verticalLink: "/super",
  },
  {
    slug: "invest-in-managed-funds",
    title: "How to Invest in Managed Funds in Australia (2026) — Beginner's Guide",
    h1: "How to Invest in Managed Funds in Australia",
    metaDescription: "Learn how to invest in managed funds in Australia. Compare unlisted managed funds vs ETFs, how to apply, minimum investments, fees, and tax treatment for 2026.",
    intro: "Managed funds pool money from multiple investors and are professionally managed by a fund manager who invests in a diversified portfolio of assets. Unlike ETFs, most managed funds are 'unlisted' — you buy and sell units directly with the fund manager rather than on a stock exchange. Australia has hundreds of managed funds covering shares, property, fixed income, and alternative assets. This guide explains how to access them.",
    steps: [
      { heading: "Understand the Difference Between Managed Funds and ETFs", body: "Both are pooled investment vehicles managed by professionals, but they differ in how you buy them. **ETFs** trade on the ASX like shares — you buy and sell through a broker at market prices throughout the day. **Unlisted managed funds** are purchased directly from the fund manager (or via a platform) at the fund's end-of-day Net Asset Value (NAV). Managed funds often have minimum investments of $5,000-$25,000 and less liquidity. However, some managed funds offer superior access to asset classes (e.g., private equity, infrastructure) not available via ETFs." },
      { heading: "Choose Your Fund Type and Manager", body: "Decide on your investment objective first: growth (equity funds), income (bond/credit funds), diversified (balanced/multi-asset funds), or specialist (property, infrastructure, alternatives). Then research managers: Vanguard, Fidelity, Magellan, Platinum, Perpetual, and Allan Gray are among Australia's prominent fund managers. Check APRA performance data and Morningstar ratings. Focus on: long-term performance after fees, management expense ratio (MER), portfolio manager tenure, and investment philosophy." },
      { heading: "Apply Directly or Through a Platform", body: "**Direct application** — Download the PDS (Product Disclosure Statement) and application form from the fund manager's website. You'll need to provide TFN, bank details, and identity documents. Minimum investments vary: Vanguard's managed funds require $5,000 minimum with $1,000 subsequent investments; some boutique managers require $20,000+.\n\n**Via investment platforms** — Platforms like Macquarie Wrap, BT Panorama, HUB24, or Netwealth give access to hundreds of managed funds with lower minimums (sometimes $1,000) and consolidated reporting. These suit investors with multiple funds or those working with an adviser." },
      { heading: "Complete the Application and Fund Your Investment", body: "Complete the application form accurately, especially the TFN and beneficiary details. Transfer the required minimum investment to the fund's application bank account with your reference number. Most funds process applications within 2-5 business days. You'll receive a confirmation letter and unit statement. Keep all application documents for your tax records — the units you receive have a cost base equal to your initial investment." },
      { heading: "Monitor Performance and Rebalance", body: "Check your managed fund statements quarterly. Most funds provide annual tax statements (including the tax components of any distributions) and regular performance reports. Review your allocation annually — if your equity managed funds have grown significantly, consider rebalancing back to your target allocation. When comparing performance, always benchmark against the fund's stated benchmark (e.g., S&P/ASX 300 Accumulation Index for Australian equity funds) after fees." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best ETF Brokers", href: "/best/etf-brokers" }, { label: "Best Robo-Advisors", href: "/best/robo-advisors" }],
    faqs: [
      { question: "What is the minimum investment in a managed fund in Australia?", answer: "Minimums vary widely. Index managed funds (like Vanguard's retail funds) typically start at $5,000. Actively managed boutique funds often require $10,000-$25,000. Via investment platforms, minimums can be lower — sometimes $1,000 or less." },
      { question: "Are managed funds better than ETFs?", answer: "Not necessarily — most actively managed funds underperform their benchmark index after fees over 10+ years. ETFs that track an index are cheaper (MER of 0.03-0.50% vs 0.50-2.00% for active managers) and more transparent. Managed funds may outperform in niche asset classes or for sophisticated strategies not available as ETFs." },
      { question: "How are managed fund distributions taxed?", answer: "Managed fund distributions include income (interest, dividends, rent) taxed at your marginal rate, and capital gains (both discounted and non-discounted) that flow through to you. Your annual tax statement from the fund manager will break down each component. You report them in your tax return even if you reinvest distributions." },
      { question: "How do I redeem (sell) a managed fund?", answer: "Submit a redemption request to the fund manager (by email, letter, or through their online portal). The redemption is processed at the next available NAV price — typically the end-of-day price on the day received. Funds are usually credited to your nominated bank account within 3-7 business days, though some illiquid funds may take longer or have redemption gates in stressed markets." },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "retire-early-australia",
    title: "How to Retire Early in Australia (2026) — FIRE Strategy Guide",
    h1: "How to Retire Early in Australia",
    metaDescription: "How to retire early in Australia using the FIRE strategy. Calculate your number, maximise super and investments, understand Centrelink, and plan your drawdown strategy.",
    intro: "The FIRE movement (Financial Independence, Retire Early) has a growing Australian following. The core idea: save and invest aggressively — typically 50-70% of your income — until your investment portfolio generates enough passive income to cover your living expenses indefinitely. Early retirement in Australia has unique considerations: super preservation age rules, the age pension, and Australia's relatively high cost of living. This guide covers the essentials.",
    steps: [
      { heading: "Calculate Your FIRE Number", body: "Your FIRE number is roughly 25 times your annual living expenses (based on the '4% rule' — the idea that withdrawing 4% of your portfolio annually has historically sustained a portfolio for 30+ years). If you spend $60,000/year, you need $1.5 million.\n\nFor early retirees in Australia, the 3-3.5% rule is safer given potentially 50+ year retirements. At 3.5%, you need about 28.5x your expenses — $60,000/year requires $1.7 million. Use the Moneysmart Retirement Planner to model different scenarios." },
      { heading: "Maximise Your Investment Strategy", body: "Build a two-bucket approach: (1) **Super bucket** — maximise concessional contributions ($30,000/year) and non-concessional contributions ($110,000/year) to take advantage of the 15% tax rate. You can't access this until preservation age (60). (2) **Outside-super bucket** — invest in a low-cost diversified ETF portfolio (VAS, VGS, VDHG) via a brokerage account. This is your bridge to fund living costs from retirement until you can access super.\n\nThe size of each bucket depends on how early you plan to retire. Retiring at 45 means 15 years of bridge funding needed." },
      { heading: "Reduce Your Expenses Aggressively", body: "The most powerful FIRE lever is your savings rate, not your investment returns. Common FIRE strategies: pay off your home loan (eliminating the largest expense), reduce lifestyle inflation as income grows, move to a lower cost-of-living area, drive older cars, cook at home, eliminate subscription creep. A household saving $80,000/year on $120,000 income (67% savings rate) can retire in roughly 8 years. Saving $20,000/year (17% savings rate) takes 43 years." },
      { heading: "Understand Super Preservation Age Rules", body: "You cannot access super until preservation age (currently 60 for those born after 1 July 1964). If you retire at 45, you need 15 years of living expenses outside super. Strategies to bridge this gap: dividends and distributions from your ETF portfolio, part-time or casual work, rental income, or building a buffer in an offset account. Also consider that withdrawing from super as a lump sum after 60 is tax-free — a significant advantage to structure properly." },
      { heading: "Plan Your Drawdown and Tax Strategy", body: "In retirement, structure withdrawals tax-efficiently: draw from outside-super assets first (to let super compound longer), keep annual income below the tax-free threshold ($18,200) where possible, utilise franking credits from Australian shares, and consider a transition-to-retirement (TTR) strategy from age 60. Consult a fee-only financial adviser for a drawdown strategy — getting this right can add years to how long your money lasts." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best ETF Brokers", href: "/best/etf-brokers" }, { label: "Best Super Funds", href: "/best/super-funds" }],
    faqs: [
      { question: "How much do I need to retire early in Australia?", answer: "Using the 3.5% rule, you need roughly 28.5 times your annual expenses. For $50,000/year spending, that's $1.43 million. For $80,000/year, it's $2.28 million. The exact amount depends on your lifestyle, whether you'll receive the Age Pension, and your asset allocation." },
      { question: "Can I get the Age Pension if I retire early?", answer: "The Age Pension is available from age 67 and is means-tested. If you retire early with a large investment portfolio, you may not qualify initially. However, as you spend down assets in your 60s before qualifying age, or if markets decline, you may partially qualify later. The full single pension is approximately $28,500/year in 2026." },
      { question: "What if I retire early and run out of money?", answer: "The 4% (or 3.5%) rule has a high historical success rate but is not guaranteed. Safeguards: maintain 1-2 years' expenses in cash to avoid selling during downturns, be flexible on spending (reduce in bad years), consider part-time work as a fallback, and ensure you'll eventually receive the Age Pension as a safety net." },
      { question: "Is the FIRE strategy suitable for families in Australia?", answer: "Yes, but it requires more capital. Factor in children's education costs, a larger home, and health insurance for the whole family. Some FIRE adherents use a 'BaristaFIRE' approach — building a smaller portfolio and supplementing with part-time work to cover extra family costs." },
    ],
    verticalLink: "/super",
  },
  {
    slug: "build-share-portfolio",
    title: "How to Build a Share Portfolio in Australia (2026) — Step-by-Step Guide",
    h1: "How to Build a Share Portfolio From Scratch",
    metaDescription: "Learn how to build a share portfolio in Australia in 2026. Asset allocation, stock selection, diversification, rebalancing, and common beginner mistakes to avoid.",
    intro: "Building a share portfolio is more than picking a few stocks — it requires a clear investment strategy, proper diversification, and the discipline to stick to your plan through market ups and downs. Whether you're starting with $5,000 or $500,000, the principles are the same. This guide walks through building a solid Australian share portfolio from scratch.",
    steps: [
      { heading: "Define Your Investment Goals and Time Horizon", body: "Before buying a single share, be clear on: Why are you investing? (retirement, house deposit, income, wealth building), When will you need the money? (1 year, 5 years, 20+ years), and How much volatility can you tolerate? (can you stay invested during a 30% market crash?). A 25-year-old building retirement wealth can handle more risk than a 55-year-old needing funds in 5 years. Your goals and timeline dictate your asset allocation." },
      { heading: "Set Your Asset Allocation", body: "Asset allocation — the split between shares, bonds, property, and cash — determines around 90% of your portfolio's long-term performance. A common starting framework:\n\n- **Aggressive** (growth-focused, 20+ year horizon): 90-100% equities\n- **Balanced** (medium horizon, some income): 60-70% equities, 30-40% bonds/cash\n- **Conservative** (short horizon, capital preservation): 30-40% equities, 60-70% defensive\n\nWithin equities, diversify internationally: don't put everything in Australian shares (which are dominated by banks and miners)." },
      { heading: "Choose Core Holdings — ETFs or Individual Shares", body: "**ETF-core approach** (recommended for most): Build a portfolio around 2-4 low-cost index ETFs. A classic simple Australian portfolio: VAS (ASX 300, ~30%), VGS (global developed markets ex-Australia, ~60%), VAF or VBND (Australian bonds, ~10%). This gives exposure to thousands of companies globally for a combined MER of around 0.10-0.15%.\n\n**Stock-picking approach**: If you want individual shares, start with blue chips (CBA, BHP, CSL, Wesfarmers, Macquarie) before adding smaller companies. Limit any single stock to no more than 5-10% of your portfolio." },
      { heading: "Open a Brokerage Account and Fund It", body: "Open a CHESS-sponsored brokerage account — this gives you legal ownership of shares in your name. Compare Stake (no brokerage on US shares, $3 AUS), Superhero ($5 ASX trades), CommSec (full service, $10-$29.95), or CMC Markets Invest ($0 for first trade, then $11). Link a bank account, complete the application (takes 1-3 days), fund the account, and place your first orders. Start with your core ETF positions before adding individual shares." },
      { heading: "Rebalance Annually and Stay the Course", body: "Over time, strong-performing assets grow to become a larger share of your portfolio, increasing your risk. Rebalance annually by selling assets that have grown above target weight and buying those below. This enforces 'sell high, buy low' discipline. Use a simple spreadsheet to track your target allocation vs actual. More important than rebalancing: don't panic-sell during downturns. Time in the market beats timing the market almost every time." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best Online Brokers", href: "/best/online-brokers" }, { label: "Best ETF Brokers", href: "/best/etf-brokers" }],
    faqs: [
      { question: "How much money do I need to start a share portfolio?", answer: "You can start with as little as $500, but $2,000-$5,000 is more practical when factoring in brokerage costs. For a diversified ETF portfolio, you need enough to cover minimums and keep brokerage under 0.5% of your investment. Some micro-investing apps (Raiz, CommSec Pocket) let you start with $50." },
      { question: "How many shares should be in a portfolio?", answer: "For an ETF-based portfolio, 3-5 funds can give you exposure to thousands of underlying companies. For individual stocks, 15-25 companies across different sectors is generally considered well-diversified. Fewer than 10 individual stocks concentrates risk significantly." },
      { question: "Should I invest in Australian or international shares?", answer: "Both — Australia represents only about 2% of global market capitalisation. A portfolio of 100% Australian shares is very concentrated in banks, miners, and supermarkets. Most experts recommend 30-40% Australian shares for franking credit benefits and 60-70% international for global diversification." },
      { question: "How do I track my share portfolio performance?", answer: "Use your broker's portfolio tracker, third-party apps like Sharesight (excellent for Australian tax reporting), or a simple spreadsheet. Compare your returns against a benchmark (e.g., the ASX 200 Total Return index for Australian shares). Measure on a total return basis including dividends." },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "claim-lost-super",
    title: "How to Find and Claim Lost Super in Australia (2026)",
    h1: "How to Find and Claim Your Lost Super",
    metaDescription: "How to find and claim lost or unclaimed super in Australia. Use myGov and the ATO to locate accounts, consolidate, and recover ATO-held super. Free and easy process.",
    intro: "The ATO holds over $17 billion in lost and unclaimed superannuation on behalf of Australians. Lost super occurs when a fund loses contact with you — often after you move house, change your name, or simply forget about small accounts from previous jobs. Finding and recovering your super is free, takes about 20 minutes, and could mean thousands of extra dollars in your retirement fund.",
    steps: [
      { heading: "Log Into myGov and Link the ATO", body: "Go to my.gov.au and log in (or create an account if you don't have one — you'll need a myGovID or verify via Centrelink/Medicare). Once logged in, go to Services > Australian Taxation Office. If you haven't linked ATO to your myGov, select 'Link' and follow the prompts. You'll need your TFN or a recent tax notice of assessment to link." },
      { heading: "Check 'Super' in the ATO Portal", body: "In the ATO section of myGov, navigate to Super > Manage > Consolidate super. You'll see a complete list of all super accounts linked to your TFN — including active accounts, lost accounts, and any super currently held by the ATO. The ATO holds super when a fund declares a member 'lost' (they've had no contact with you for 5 years and your balance is under $6,000, or any balance if the fund can't locate you)." },
      { heading: "Identify Your Accounts", body: "Review each account listed. Note the fund name, approximate balance, and status (active, lost, or ATO-held). Cross-reference with your memory of past employers — think back to every job you've had, especially casual or part-time work in your late teens and 20s. Each employer was required to pay super on your behalf if you earned over $450/month (the threshold has since been removed — all employment now attracts super)." },
      { heading: "Transfer Lost and ATO-Held Super", body: "For **lost super still held by a fund**: use the myGov consolidation tool to transfer it to your chosen active fund. The process is immediate and costs nothing. For **ATO-held super**: you can claim it directly through myGov (ATO > Super > Manage > Transfer ATO-held super). You can transfer ATO-held super to your chosen fund or have it paid directly to you if the total is under $200 (be aware this is taxable at your marginal rate if paid directly)." },
      { heading: "Update Your Details to Prevent Future Lost Super", body: "After recovering your super, update your contact details in every active fund's member portal. Add your TFN to all funds if you haven't already (without a TFN, funds withhold extra tax). Set up email or postal address alerts so funds can reach you if they need to. Consider consolidating all accounts into one to simplify future tracking." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "super_fund",
    relatedBestPages: [{ label: "Best Super Funds", href: "/best/super-funds" }, { label: "Consolidate Super", href: "/how-to/consolidate-super" }],
    faqs: [
      { question: "How much lost super is there in Australia?", answer: "The ATO held approximately $17.2 billion in lost and unclaimed super as at June 2025, spread across millions of accounts. The average ATO-held account balance is around $700-$1,500, but some lost super accounts with active funds can be much larger." },
      { question: "Is there a fee to claim lost super?", answer: "No — claiming lost super through myGov or directly from the ATO is completely free. Be very wary of any third-party 'lost super finder' services that charge a percentage fee — the free ATO tool does the same thing." },
      { question: "How long does it take to get my lost super?", answer: "Transfers between funds via myGov typically complete within 3 business days. ATO-held super transferred to a fund also takes 3-5 business days. Direct payment of ATO-held amounts under $200 takes 7-10 business days to reach your bank account." },
      { question: "Can I claim super from a job I did as a teenager?", answer: "Yes — if your employer paid super (required for anyone earning over $450/month pre-2022, all employees post-2022) and the fund has lost contact with you, that money is sitting somewhere. Use myGov to find it. Even $500 left in super for 30 years at 8% becomes $5,000." },
    ],
    verticalLink: "/super",
  },
  {
    slug: "use-stock-screener",
    title: "How to Use a Stock Screener to Find Australian Shares (2026)",
    h1: "How to Use a Stock Screener to Find Shares",
    metaDescription: "Learn how to use a stock screener to find ASX shares in Australia. Key filters, fundamental metrics, and how to build a watchlist of quality Australian stocks.",
    intro: "A stock screener is a tool that filters the entire ASX (or global markets) down to a shortlist of companies matching your specified criteria — price-to-earnings ratio, dividend yield, market capitalisation, revenue growth, and hundreds of other filters. Used correctly, screeners can surface investment ideas you'd never find manually scrolling through 2,000 ASX stocks. This guide shows you how to use them effectively.",
    steps: [
      { heading: "Choose a Stock Screener", body: "Several screeners work well for ASX stocks:\n\n- **Commsec** (free, basic) — good for quick ASX screens by sector, market cap, and yield\n- **Simply Wall St** (freemium) — popular with Australian retail investors; visualises financial health intuitively\n- **Stock Doctor** (paid) — used by serious Australian value investors; comprehensive financial health ratings\n- **Tikr Terminal** (freemium) — institutional-quality data for ASX and global markets\n- **Finviz** (free/paid) — excellent for US markets, limited ASX coverage\n- **Wisesheets/Marketindex** — good free options for ASX fundamentals\n\nFor beginners, Simply Wall St's interface is the most intuitive. For more control over specific metrics, Tikr or Stock Doctor are better." },
      { heading: "Define What You're Looking For", body: "Before filtering, know your investment strategy. Common approaches:\n\n**Dividend income**: Screen for high fully-franked dividend yield (>4%), low payout ratio (<70%), positive earnings trend\n**Value investing**: Low P/E ratio (<15x), low Price-to-Book (<1.5x), positive earnings, no excessive debt\n**Growth investing**: Revenue growth >15%/year, earnings growth >20%/year, expanding margins\n**Quality/compounding**: High ROE (>15%), low debt-to-equity (<0.5x), consistent earnings over 5+ years\n\nMixing too many criteria often produces zero results — start with 2-3 key filters." },
      { heading: "Apply Your Filters", body: "In your chosen screener, set your filters one at a time and watch how the results narrow. Useful starting filters for ASX investors:\n\n1. **Market cap** — set a minimum (e.g., >$500M) to exclude micro-caps with limited liquidity and analyst coverage\n2. **Dividend yield** — e.g., >3.5% for income seekers\n3. **P/E ratio** — e.g., 8-20x for reasonable value\n4. **Debt-to-equity** — e.g., <1.0x to avoid over-leveraged companies\n5. **Sector** — exclude or include specific sectors based on your existing holdings\n\nAim for a shortlist of 10-30 stocks to research further, not a final buy list." },
      { heading: "Research Your Screened Results", body: "A screen result is a lead, not a recommendation. For each company on your shortlist: read the latest annual report and half-year results, check for one-off items distorting the P/E ratio, review the management team and their track record, assess the competitive position (does this company have a moat?), and read recent ASX announcements. Many stocks screen well statistically but have fundamental problems — a low P/E might reflect genuine value OR a company in structural decline." },
      { heading: "Build a Watchlist and Set Price Alerts", body: "Add your best ideas to a watchlist in your broker platform or screener. Set price alerts at your target buy price — most screeners and broker apps support email or push notification alerts. Review your watchlist monthly, updating your fundamental views as companies report. The best opportunities often appear during market corrections when quality companies briefly drop to attractive prices — having a pre-researched watchlist means you can act quickly when opportunities arise." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "share_broker",
    relatedBestPages: [{ label: "Best Online Brokers", href: "/best/online-brokers" }, { label: "Best Share Trading Platforms", href: "/best/share-trading" }],
    faqs: [
      { question: "What is the best free stock screener for ASX shares?", answer: "Marketindex.com.au and Commsec's screener are the best free options for ASX stocks. Simply Wall St offers a generous free tier. For US stocks, Finviz is excellent. None are perfect for ASX screening — paid tools like Stock Doctor offer more comprehensive Australian data." },
      { question: "What metrics should I screen for when buying ASX shares?", answer: "Start with market cap (>$300M for liquidity), P/E ratio (context-dependent by sector), dividend yield and franking (if income-focused), return on equity (>12% is good), and debt-to-equity (<1x generally). Avoid using P/E alone — profitability, debt, and cash flow matter just as much." },
      { question: "Can I trust stock screener data for ASX companies?", answer: "Data quality varies. Major screeners use third-party data providers and occasional errors or delays occur, especially for small-caps. Always verify key metrics against the company's actual financial statements (available on ASX announcements) before making investment decisions." },
      { question: "Does screening for shares guarantee good returns?", answer: "No — screening identifies candidates for further research, not guaranteed winners. Screens are backward-looking (past financials) while investing is forward-looking. A company can screen perfectly today and deteriorate tomorrow. Treat screens as a starting point, not an endpoint." },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "negative-gear-property",
    title: "How Negative Gearing Works in Australia (2026) — Complete Guide",
    h1: "How to Negatively Gear an Investment Property in Australia",
    metaDescription: "How negative gearing works in Australia. Tax deductions, cash flow impact, ATO rules, when it makes financial sense, and how to claim on your tax return in 2026.",
    intro: "Negative gearing occurs when the costs of owning an investment property (interest, repairs, depreciation, management fees) exceed the rental income it generates. The resulting net loss can be deducted from your other taxable income — typically your salary — reducing your tax bill. Australia is one of the few countries that allows this, making negatively geared property a popular strategy for high-income earners. This guide explains how it works, when it makes sense, and the risks involved.",
    steps: [
      { heading: "Understand the Mechanics of Negative Gearing", body: "If your investment property generates $25,000 in annual rent but costs $40,000 to hold (including $32,000 in mortgage interest, $4,000 management fees, $2,000 repairs, and $2,000 council/water rates), you have a $15,000 rental loss. This $15,000 is deducted from your taxable income. If you earn $130,000 from your job, your taxable income drops to $115,000 — saving you roughly $5,250 in tax (at the 35% marginal rate including Medicare levy). The property is still costing you roughly $9,750 net per year after the tax refund." },
      { heading: "Know What You Can Deduct", body: "Deductible property expenses include: mortgage interest (not principal repayments), property management fees, maintenance and repairs (not improvements — these are depreciated), council and water rates, landlord insurance, body corporate fees, advertising for tenants, bank charges on the loan, and depreciation on the building (2.5%/year for residential properties built after 1987) and fixtures/fittings (via a tax depreciation schedule from a quantity surveyor). You cannot deduct capital improvements — these are added to the cost base and reduce CGT when you sell." },
      { heading: "Get a Tax Depreciation Schedule", body: "Depreciation is a non-cash deduction — you're deducting wear and tear without spending money. On a new property, depreciation can add $5,000-$15,000/year in additional deductions. To claim depreciation, you need a tax depreciation schedule from an ATO-registered quantity surveyor (typically $400-$700 one-off cost, fully tax deductible). Send the report to your accountant to include in your tax return. For older properties, building depreciation may be limited, but plant-and-equipment depreciation is still available." },
      { heading: "Claim on Your Tax Return (or PAYG Withholding Variation)", body: "Option 1: Claim the rental loss annually in your tax return (schedule E). Your accountant adds up all rental income and deductible expenses, calculates the net loss, and offsets it against your salary income. You receive the tax saving as a larger refund.\n\nOption 2 (better cash flow): Lodge a PAYG withholding variation with the ATO (Form NAT 2036). The ATO instructs your employer to withhold less tax from each paycheque, giving you the benefit monthly rather than as a lump sum refund. This can improve your weekly cash flow by $100-$300+ depending on your loss." },
      { heading: "Assess Whether Negative Gearing Makes Financial Sense", body: "Negative gearing only makes long-term financial sense if capital growth exceeds your net holding costs over time. The math: if you're losing $10,000/year net (after tax benefit), you need the property to grow by at least $10,000/year just to break even — that requires at least 2-3% annual capital growth on a $400,000 property.\n\nNegative gearing works best for: high-income earners (45% marginal rate saves 30 cents more per dollar of loss than someone on 32.5%), long holding periods (10+ years to let growth compound), properties with strong capital growth prospects (inner-city, infrastructure corridors), and investors who won't need to sell at a loss during downturns. Avoid over-leveraging — rising interest rates can quickly turn a manageable loss into a financial crisis." },
    ],
    relatedBrokerFilter: (b) => b.platform_type === "property_platform",
    relatedBestPages: [{ label: "Best Mortgage Brokers", href: "/best/mortgage-brokers" }, { label: "Best Investment Property Loans", href: "/best/investment-property-loans" }],
    faqs: [
      { question: "How much tax do I save with negative gearing?", answer: "It depends on your marginal tax rate and the size of your rental loss. A $15,000 rental loss saves $5,250 for someone on the 35% rate (32.5% + 2% Medicare), $6,750 for someone on the 45% rate (47% including Medicare levy). The higher your income, the more valuable the deduction." },
      { question: "Does negative gearing work with shares?", answer: "Yes — you can negatively gear any income-producing investment, including shares. If you borrow to buy a share portfolio and the interest cost exceeds dividends received, you have a negatively geared investment. However, shares are more volatile and margin lending carries additional risks compared to property." },
      { question: "What happens when I sell a negatively geared property?", answer: "Selling triggers CGT on the profit (sale price minus purchase price minus capital costs). If you've held the property over 12 months, you receive the 50% CGT discount. Note that depreciation you've claimed reduces the cost base for plant and equipment items, potentially increasing your CGT. Get advice from a tax accountant before selling." },
      { question: "Is negative gearing being abolished in Australia?", answer: "As of 2026, negative gearing remains fully available to all Australian investors. There have been policy debates, but no changes have been enacted. The ATO's current rules continue to allow full deductibility of investment property losses against other income." },
    ],
    verticalLink: "/property",
  },
  {
    slug: "rebalance-portfolio",
    title: "How to Rebalance Your Investment Portfolio in Australia (2026)",
    h1: "How to Rebalance Your Investment Portfolio",
    metaDescription:
      "Learn how to rebalance your investment portfolio in Australia. Step-by-step guide covering when to rebalance, tax-smart strategies, and how to avoid common mistakes. Updated 2026.",
    intro:
      "Rebalancing is the process of realigning your portfolio back to its target asset allocation after market movements have shifted the mix. Over time, assets that perform well grow to represent a larger share of your portfolio — increasing risk. A portfolio that started as 70% shares and 30% bonds may drift to 85% shares after a bull run, meaning far more risk than you originally intended. This guide shows you exactly how to rebalance your Australian portfolio efficiently and tax-effectively.",
    steps: [
      {
        heading: "Know Your Target Asset Allocation",
        body: `Rebalancing starts with having a written target allocation — what percentage of your portfolio should sit in each asset class. Common examples:\n\n- **Aggressive (long time horizon):** 90% shares (70% global, 20% Australian), 10% cash/bonds\n- **Balanced:** 70% shares, 20% fixed income, 10% cash\n- **Conservative (near retirement):** 40% shares, 40% bonds/fixed income, 20% cash\n\nIf you don't have a written target, set one before you rebalance. Your target should reflect your time horizon, risk tolerance, and income needs — not the current market environment. Changing your allocation in response to market conditions is market timing, not rebalancing.\n\nWrite down your target in a spreadsheet or investment journal alongside the date you set it. This discipline prevents you from unconsciously moving the goalposts after a correction.`,
      },
      {
        heading: "Calculate Your Current Portfolio Drift",
        body: `Export your current holdings from your broker(s) and calculate the current dollar value and percentage of each asset class. Compare to your target. A drift of +/-5% is a common threshold for triggering a rebalance. Some investors use a calendar approach — rebalance quarterly or annually regardless of drift.\n\nDon't forget to include all accounts: broker account, super, SMSFs, bonds/term deposits, and any investment property equity if you're tracking a full net-worth allocation. Your super balance may be doing the heavy lifting in fixed income without you realising it.`,
      },
      {
        heading: "Choose a Rebalancing Method",
        body: `There are two main rebalancing approaches — and the tax-smart choice is to use new money first:\n\n**Method 1 — New contributions (tax-free):** Direct new investment money into underweight asset classes rather than selling overweight assets. No CGT, no transaction costs from selling. This is the preferred method for investors still in the accumulation phase with regular contributions.\n\n**Method 2 — Sell overweight, buy underweight:** When new contributions aren't enough, sell some of the overweight assets and reinvest into underweight ones. This triggers CGT on any gains. To minimise tax: hold assets over 12 months before selling to access the 50% CGT discount, offset gains with any losses in your portfolio, and sell in low-income years where possible.\n\n**Method 3 — Dividend reinvestment:** Direct dividend reinvestment into underweight asset classes via DRP plans or manual reinvestment. Gradual but effective over time.`,
      },
      {
        heading: "Account for Tax Before Selling",
        body: `Before you sell anything, calculate the tax impact:\n\n1. **Check holding periods:** Any asset held under 12 months attracts full CGT at your marginal rate. Assets held over 12 months get the 50% discount. If an overweight asset is approaching 12 months, delay selling by a few weeks to qualify.\n\n2. **Identify available losses:** Check for unrealised losses in your portfolio that could offset gains. Selling a loss-making position before the end of the tax year allows you to crystallise the loss and offset it against rebalancing gains.\n\n3. **Super is tax-efficient to rebalance:** If you hold assets in super (especially SMSF), rebalancing within the fund incurs only 10% CGT on gains — far less than outside super. Prioritise rebalancing within super before selling in your personal account.`,
      },
      {
        heading: "Execute the Trades",
        body: `With your plan ready, execute in this order:\n\n1. **Buy underweight assets first** using available cash and upcoming contributions. This avoids the need to sell at all if you have sufficient new money.\n\n2. **Process the sells**: Log into your broker platform, place sell orders for the overweight positions you've identified. For ASX-listed ETFs and shares, settlement is T+2 — cash available two business days after the sale.\n\n3. **Complete the buys**: Once the sold funds settle, place buy orders for the underweight positions.\n\n4. **Record everything**: Note the date, price, units, and proceeds of every transaction for your tax records.\n\nFor most retail investors, rebalancing once a year is sufficient. Over-rebalancing generates unnecessary transaction costs and CGT events without meaningfully improving outcomes.`,
      },
      {
        heading: "Automate Where Possible",
        body: `The best rebalancing strategy is one you'll actually do. Automation removes friction:\n\n- **Diversified multi-asset ETFs** (VDHG, DHHF): These ETFs rebalance internally — you never need to manually rebalance between asset classes. Ideal for simple, low-maintenance portfolios.\n\n- **Robo-advisors** (Stockspot, InvestSMART): Automatically rebalance your portfolio when drift exceeds thresholds.\n\n- **Automatic DRP on ETFs:** Some brokers allow automatic dividend reinvestment into specific holdings, which can gradually rebalance toward underweight positions.\n\n- **Calendar reminder**: Set a recurring annual event (e.g., 1 July each year) to review your portfolio allocation.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker",
    relatedBestPages: [
      { label: "Best Low-Fee Platforms", href: "/best/low-fees" },
      { label: "Best ETF Platforms", href: "/best/etf-platforms" },
      { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
    ],
    faqs: [
      {
        question: "How often should I rebalance my portfolio?",
        answer:
          "Annual rebalancing is sufficient for most investors. Research shows that rebalancing more frequently produces similar risk-adjusted outcomes but generates more CGT events and transaction costs. A common approach: rebalance when any asset class drifts more than 5% from target OR once a year — whichever comes first.",
      },
      {
        question: "Does rebalancing trigger tax in Australia?",
        answer:
          "Selling an asset at a profit triggers Capital Gains Tax. For assets held over 12 months, you receive the 50% CGT discount — only half the gain is added to your taxable income. The tax-smart approach is to rebalance primarily by directing new contributions to underweight asset classes, avoiding the need to sell entirely.",
      },
      {
        question: "What is the best way to rebalance an ETF portfolio in Australia?",
        answer:
          "The simplest approach is to use new contributions. Each time you invest, buy the ETF that is most underweight relative to your target. This avoids selling and the associated CGT. When contributions aren't enough, sell the most overweight ETF and buy the most underweight — preferably after 12 months to access the CGT discount.",
      },
      {
        question: "Should I rebalance my super separately from my broker account?",
        answer:
          "Yes — treat your super and outside-super investments as separate pools. Rebalancing inside super is tax-advantaged (max 10% CGT vs your marginal rate outside super), so prioritise rebalancing within your SMSF or industry fund before touching your personal brokerage account.",
      },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "create-investment-plan",
    title: "How to Create an Investment Plan in Australia (2026) — Step-by-Step",
    h1: "How to Create an Investment Plan in Australia",
    metaDescription:
      "How to write a personal investment plan in Australia. Set financial goals, choose asset classes, select platforms, and build a strategy that matches your timeline and risk tolerance. Updated 2026.",
    intro:
      "An investment plan is a written document that defines your financial goals, the strategy you'll use to reach them, and the rules you'll follow when markets get emotional. Without a plan, investing becomes reactive — you buy when markets are rising and sell when they're falling, which is the opposite of what generates long-term wealth. This guide walks you through every component of a solid investment plan for an Australian investor.",
    steps: [
      {
        heading: "Define Your Financial Goals",
        body: `Every investment plan starts with a clear answer to: what am I investing for? Goals drive every other decision — time horizon, risk tolerance, and asset class selection all flow from here.\n\nCommon Australian investor goals and typical timeframes:\n- **First home deposit** — 3–7 years\n- **Children's education** — 5–15 years\n- **Financial independence / FIRE** — 10–25 years\n- **Supplementing retirement income** — Ongoing\n\nFor each goal, write down: (1) the target dollar amount, (2) the target date, and (3) the current savings toward it. This clarity makes it possible to calculate exactly how much you need to invest and at what expected return to reach the target.`,
      },
      {
        heading: "Understand Your Time Horizon and Risk Tolerance",
        body: `Time horizon and risk tolerance determine your asset allocation:\n\n**Time horizon** is simple — how many years until you need the money? Longer horizons allow more exposure to volatile growth assets because you have time to recover from downturns.\n\n**Risk tolerance** has two dimensions: (1) your financial ability to tolerate losses (emergency fund? stable income? no margin debt?) and (2) your emotional ability to stay the course during a 30–40% market drop without panic-selling.\n\nA common mistake is confusing risk capacity (financial ability) with risk tolerance (emotional comfort). Overestimating your emotional tolerance leads to panic-selling at the worst time. Honest self-assessment: could you watch a $100,000 portfolio fall to $65,000 and not sell? If not, reduce your equity allocation.`,
      },
      {
        heading: "Choose Your Asset Allocation",
        body: `Asset allocation — how much goes into shares, bonds, property, and cash — is responsible for the majority of long-term portfolio return variation. Suggested starting points by time horizon:\n\n**10+ years:** 80–100% growth assets (shares, listed property), 0–20% defensive\n**5–10 years:** 60–80% growth, 20–40% defensive\n**2–5 years:** 40–60% growth, 40–60% defensive\n**Under 2 years:** 0–30% growth, 70–100% defensive\n\nWithin the growth allocation, typical Australian diversification: 30–40% Australian shares (franking credit advantage), 40–50% global shares, 10–15% listed property/REITs.\n\nWrite the percentages down — this is your investment policy statement and the foundation of all future decisions.`,
      },
      {
        heading: "Select Your Investment Vehicles",
        body: `Once you have a target allocation, choose the specific vehicles:\n\n**For most Australians, low-cost index ETFs are the best starting point.** Example all-ETF portfolio:\n\n- **Australian shares:** VAS (MER 0.07%) or A200 (MER 0.04%)\n- **Global shares:** IVV (MER 0.03%) or VGS (MER 0.18%)\n- **Fixed income:** VBND (MER 0.20%)\n\nAlternatively, a single diversified ETF handles everything: VDHG (90% growth/10% defensive, MER 0.27%) or DHHF (100% shares, MER 0.19%).\n\n**Superannuation is an asset class too.** Factor your super investment mix into your overall allocation. You may not need additional bonds outside super if super already provides defensive exposure.`,
      },
      {
        heading: "Choose Your Brokerage Platform",
        body: `Key criteria for choosing a broker for your investment plan:\n\n**CHESS sponsorship:** Shares held in your own name on the ASX register. Important for ownership security and broker portability.\n\n**Brokerage fees:** A $10 brokerage on a $1,000 monthly investment = 1% fee drag. Zero-brokerage platforms mean more of every contribution goes to work.\n\n**Auto-invest tools:** Some platforms allow recurring auto-investment into specific ETFs — making regular investing automatic and frictionless.\n\n**International market access:** If your plan includes global ETFs, check whether your broker offers direct NYSE/NASDAQ access or CHESS-quoted international ETFs.`,
      },
      {
        heading: "Write It Down and Set a Review Schedule",
        body: `Your plan is only real if it's written down. A one-page investment policy statement (IPS) should capture:\n\n1. **Goals:** Each goal, dollar target, and timeline\n2. **Asset allocation:** Target percentages for each asset class\n3. **Holdings:** Which specific ETFs/funds represent each allocation\n4. **Contribution schedule:** How much invested monthly/quarterly\n5. **Rebalancing rule:** When and how you'll rebalance\n6. **Rules for changing the plan:** Life events only — not market movements\n\nReview annually, or after major life events (marriage, children, job change, inheritance). The single most powerful thing your investment plan does is stop you from making emotional decisions during market downturns.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker",
    relatedBestPages: [
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Best Low-Fee Platforms", href: "/best/low-fees" },
      { label: "Best ETF Platforms", href: "/best/etf-platforms" },
    ],
    faqs: [
      {
        question: "Do I need a financial adviser to create an investment plan?",
        answer:
          "Not necessarily. For straightforward goals (index ETF investing, long time horizon, no complex tax situation), a DIY investment plan is entirely achievable. ASIC's MoneySmart website provides free, unbiased tools. However, if you have complex circumstances — significant assets, SMSF, business interests, or approaching retirement — a qualified AFS licence holder can add substantial value.",
      },
      {
        question: "How much money do I need to start an investment plan in Australia?",
        answer:
          "You can start with as little as $100 on zero-brokerage platforms. For brokers charging $5–10 brokerage, it makes sense to invest at least $1,000–$2,000 per trade. The more important question is regularity — $500 per month consistently for 20 years outperforms most lump-sum strategies.",
      },
      {
        question: "What is a reasonable expected return for an Australian investment portfolio?",
        answer:
          "Historical long-run returns: Australian shares ~9.5%/year (including dividends), global shares ~10%/year. A 70/30 growth/defensive portfolio has historically returned ~7–8% annually. Subtract inflation (~3%) for real returns. Past returns don't guarantee future results, but long-run diversified equity returns have consistently exceeded inflation over 10+ year periods.",
      },
      {
        question: "Should my investment plan include superannuation?",
        answer:
          "Absolutely — super is the most tax-effective investment structure available to Australians. Your plan should address: which fund to use, what investment option to select, whether to make additional concessional contributions, and how super integrates with your outside-super portfolio allocation.",
      },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "invest-small-amounts",
    title: "How to Invest Small Amounts of Money in Australia (2026)",
    h1: "How to Invest Small Amounts of Money in Australia",
    metaDescription:
      "How to invest $100, $500, or $1,000 in Australia. Best platforms for small investors, micro-investing apps, fractional shares, and ETFs. Start investing with any amount in 2026.",
    intro:
      "You don't need thousands of dollars to start investing in Australia. With zero-brokerage platforms, micro-investing apps, and fractional shares, you can put $100 to work in global markets in under 10 minutes. The bigger barrier for most people isn't access — it's knowing where to start. This guide explains the best ways to invest small amounts in Australia, and how to scale up from there.",
    steps: [
      {
        heading: "Understand How Fees Affect Small Investments",
        body: `Fees are the most important consideration when investing small amounts. On traditional brokers charging $10–$20 per trade, a $200 investment loses 5–10% to brokerage before your shares move — you need significant growth just to break even on fees.\n\nThe solution is choosing the right platform for your investment size:\n\n**Zero brokerage platforms (Stake, moomoo):** $0 per trade on ASX ETFs and shares. Ideal for any amount.\n\n**Micro-investing apps (Raiz, Spaceship):** Invest spare change or set small recurring contributions from $5/month. Pre-built diversified portfolios. Higher management fees (0.275–0.5% annually) but no per-trade brokerage.\n\n**Low-cost CHESS-sponsored brokers (Selfwealth, Superhero):** Fixed $5–9.50 brokerage per trade. Reasonable for $1,000+ trades, expensive for $100 trades.\n\nMatch your platform to your investment amount. For regular investments under $500, zero-brokerage or micro-investing is clearly preferable.`,
      },
      {
        heading: "Choose Between Micro-Investing and Direct ETF Investing",
        body: `Two main approaches for small investors:\n\n**Micro-investing apps (Raiz, Spaceship Voyager):**\n- Invest from $5 with round-up features\n- Fully managed diversified portfolios\n- No brokerage, but ongoing management fee (Spaceship: free under $5k; Raiz: $4.50/month)\n- Best for: absolute beginners wanting fully hands-off investing\n\n**Direct ASX ETF investing (via zero-brokerage broker):**\n- Buy ETFs like VAS, IVV, DHHF directly on the ASX\n- Very low ongoing fees (ETF MER 0.04–0.27%, no platform fee on zero-brokerage platforms)\n- You choose and manage your own allocations\n- Best for: investors comfortable selecting their own ETFs\n\nFor most people starting out, a micro-investing app is a great way to begin building the habit. As your balance grows past $5,000–$10,000, switching to direct ETFs typically reduces ongoing costs significantly.`,
      },
      {
        heading: "Start with a Simple ETF Portfolio",
        body: `If investing directly, keep your portfolio simple. A one or two ETF portfolio is entirely appropriate for small investors:\n\n**One fund option:**\n- DHHF (BetaShares Diversified All Growth, MER 0.19%): 100% shares, globally diversified, auto-rebalancing built in.\n- VDHG (Vanguard Diversified High Growth, MER 0.27%): 90% shares, 10% bonds — slightly less volatile.\n\n**Two fund option:**\n- VAS (Australian shares, MER 0.07%) + IVV or VGS (global shares, MER 0.03–0.18%)\n- Direct each new contribution to whichever is most underweight to rebalance naturally.\n\nStart simple. $100/month invested consistently from age 25 at 8% annual return over 40 years becomes over $320,000 — the amount matters less than consistency and starting early.`,
      },
      {
        heading: "Set Up a Regular Auto-Investment",
        body: `The single biggest lever for small investors is automation. A monthly direct debit to your investment account removes decision-making friction and ensures you invest in down markets as well as up.\n\n**Setting up automatic investing:**\n- On Raiz/Spaceship: set a recurring weekly or monthly transfer in-app\n- On Stake: use the recurring buy feature for select ETFs\n- On moomoo: set up an auto-invest plan for ASX ETFs\n- On other brokers: set a monthly bank transfer on payday and manually invest on a set day\n\nAligning your investment transfer with your pay cycle ensures you invest before spending. Even $100–$200 per month is a meaningful start. Commit to investing a percentage of every pay rise to accelerate wealth accumulation without reducing your current lifestyle.`,
      },
      {
        heading: "Understand Tax on Small Investments",
        body: `Even small investment portfolios have tax obligations:\n\n**Dividends are taxable income.** ETF distributions and dividends are added to your taxable income. Your broker issues an annual tax statement (July–August) with all details and attached franking credits. Enter these in your tax return.\n\n**Capital gains:** Selling shares or ETFs at a profit triggers CGT. For assets held over 12 months, you receive a 50% CGT discount.\n\n**Franking credits:** Australian ETFs like VAS distribute franked dividends — the included tax credits offset your income tax or can be refunded if you're in a low tax bracket.\n\n**Below the tax-free threshold:** If total taxable income is under $18,200, you pay no income tax. But you still need to file a tax return to claim any franking credit refunds.`,
      },
      {
        heading: "Build Gradually and Scale Up",
        body: `Starting small is how most successful long-term investors began. The most important outcome of your first year investing is building habits and knowledge, not returns.\n\n**Year 1 milestones:**\n- Choose a platform and make your first investment\n- Set up a monthly automatic contribution\n- Learn to read your portfolio statement and tax report\n- Experience one market dip without panic-selling\n\n**Year 2–3:**\n- Increase monthly contributions as income grows\n- Consider whether to switch from micro-investing app to direct ETFs\n- Open a CHESS-sponsored account for larger amounts\n\n**When you reach $10,000–$20,000:**\n- Reassess platform fees (direct ETF investing typically cheaper than micro-apps at this scale)\n- Consider adding a second ETF for broader diversification\n- Look into super contributions above the compulsory guarantee`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" && (b.asx_fee_value ?? 100) <= 5,
    relatedBestPages: [
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Best for Micro-Investing", href: "/best/micro-investing" },
      { label: "Best Free Brokerage", href: "/best/free-brokerage" },
    ],
    faqs: [
      {
        question: "Can I invest $100 in Australia?",
        answer:
          "Yes — on zero-brokerage platforms like Stake or moomoo, you can invest $100 with no fees. On micro-investing apps like Raiz and Spaceship, you can invest as little as $5. The key consideration for very small amounts is the ongoing management fee as a percentage of your balance — Raiz charges $4.50/month (5.4% annually on a $1,000 balance). As your balance grows, costs become less significant as a percentage.",
      },
      {
        question: "Is it worth investing $500 in shares in Australia?",
        answer:
          "Yes, particularly on a zero-brokerage platform. $500 invested in a broad ETF like DHHF incurs no trade cost and immediately starts compounding. $500 plus $100/month for 10 years becomes approximately $19,000 at 8% growth. The real power is adding to it regularly.",
      },
      {
        question: "What is the best micro-investing app in Australia?",
        answer:
          "Raiz and Spaceship Voyager are the two most popular. Spaceship has no management fee on balances under $5,000 and offers curated portfolios including a tech-focused option. Raiz charges $4.50/month and offers more diversified options with bank account round-up integration. For pure simplicity on small balances, Spaceship's free tier is hard to beat.",
      },
      {
        question: "Should I pay off debt before investing small amounts?",
        answer:
          "It depends on the interest rate. High-interest debt (credit cards at 15–22%) should generally be cleared before investing. HECS/HELP debt (indexed to CPI, ~3–4%) can coexist with investing. Low-rate home loan debt (5–6%) is borderline — many Australians split surplus income between extra repayments and investing.",
      },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "build-passive-income",
    title: "How to Build a Passive Income Portfolio in Australia (2026)",
    h1: "How to Build a Passive Income Portfolio in Australia",
    metaDescription:
      "How to generate passive income from investing in Australia. Dividend shares, high-yield ETFs, franking credits, REITs, and a step-by-step income portfolio strategy. Updated 2026.",
    intro:
      "Passive income from investments — dividends, distributions, and rental income — is the foundation of financial independence for millions of Australians. Unlike a salary, it doesn't require your time to earn. This guide shows you how to build a portfolio that generates growing, tax-effective passive income through ASX dividend shares, income-focused ETFs, REITs, and the unique advantage of franking credits.",
    steps: [
      {
        heading: "Define Your Passive Income Target",
        body: `Start by knowing what you're aiming for. Calculate your annual living expenses and determine how much passive income you need:\n\n- **Partial supplement:** $10,000–$20,000/year\n- **Replace a modest salary:** $40,000–$60,000/year\n- **Full financial independence:** $70,000–$100,000+/year\n\nReverse-engineer the portfolio size required using your target yield. At a 4% gross yield:\n- $20,000 income → $500,000 portfolio\n- $60,000 income → $1,500,000 portfolio\n\nWith franking credits, the effective return is higher. A 4% fully franked Australian portfolio has an effective pre-tax yield of ~5.7%. For a retiree paying 0% tax, the cash yield including franking refunds can exceed the stated dividend yield significantly.`,
      },
      {
        heading: "Understand the Income Sources Available",
        body: `Australia's income investing landscape is unusually rich:\n\n**Fully franked dividends:** Australian companies pay 30% corporate tax and pass the credit to shareholders via franking credits. For investors with marginal rates below 30%, the excess is refunded as cash — making Australian dividends worth significantly more in after-tax terms.\n\n**High-yield ASX shares:** Big four banks (CBA, NAB, ANZ, WBC), BHP, and Telstra consistently pay large fully-franked dividends — 4–8% yield before grossing up.\n\n**Listed Investment Companies (LICs):** AFIC, Argo, and Milton hold diversified ASX portfolios with decades-long track records of steady, growing dividends and built-in dividend smoothing reserves.\n\n**High-yield ETFs (VHY, HVST):** Diversified baskets of high-yielding Australian shares, available as a single ASX ETF.\n\n**A-REITs:** Listed property trusts (Scentre Group, Charter Hall) distribute quarterly rental income at 3–6% yields.`,
      },
      {
        heading: "Build Your Core Income Portfolio",
        body: `A well-structured Australian income portfolio combines several streams:\n\n**Core layer — diversified income ETFs (50–60%):**\n- VHY (Vanguard High Yield ETF, MER 0.25%): ~5% yield, largely franked\n- LICs (AFIC, Argo): long-term dividend track record, trade like shares\n\n**Australian blue-chip shares (20–30%):**\nDirect holdings in 8–15 quality dividend payers across sectors: banks (CBA, NAB), miners (BHP), retail (Wesfarmers), telecom (Telstra), infrastructure (APA Group). Diversify across sectors — don't overweight any single industry.\n\n**A-REITs for property income (10–20%):**\nMVA (VanEck Australian Property ETF) or direct REIT holdings provide quarterly distributions from commercial property rents.\n\n**International income (0–20%):**\nVHYL (Vanguard International High Yield) for global dividend diversification — note these are unfranked, so less tax-efficient for Australian residents.`,
      },
      {
        heading: "Maximise After-Tax Income with Franking Credits",
        body: `Franking credits are the most underused income tool available to Australian investors:\n\n**For investors below the 30% tax bracket:** Every dollar of fully franked dividends can deliver a tax refund. A $7,000 fully franked dividend comes with $3,000 in franking credits — if your marginal rate is 0% or 19%, you receive the excess as a cash refund.\n\n**SMSF in pension phase:** All franking credit refunds within an SMSF in pension mode are 100% tax-free — the most powerful application of franking credits for retirees.\n\n**How to claim:** Your broker's annual tax statement lists all franking credits received. Enter these in your tax return (Item 12 for individuals) — your tax software handles the calculation automatically.`,
      },
      {
        heading: "Track, Review, and Grow Your Income",
        body: `Building a passive income portfolio is a multi-year project. Track your progress:\n\n**Monthly:** Record dividends received, distributions, and franking credits. Portfolio tracking apps like Sharesight specifically track dividend income and franking credits for Australian tax purposes.\n\n**Annual review:** Calculate total dividend/distribution income for the year. Is your income growing via: (a) adding capital, (b) company dividend growth, or (c) reinvesting dividends?\n\n**Dividend reinvestment (DRIP):** Many ASX companies offer DRPs where dividends automatically purchase additional shares — typically at a small discount, with no brokerage. This compounds your income holdings without additional cash.`,
      },
      {
        heading: "Structure for Tax Efficiency",
        body: `How your portfolio is structured legally significantly impacts after-tax returns:\n\n**Personal name:** Simplest. Income taxed at marginal rate. 50% CGT discount applies.\n\n**Joint name (couples):** Split income between two tax returns, reducing the average marginal rate if one partner earns less.\n\n**Family trust:** Income distributed to lower-income beneficiaries each year. Best for portfolios over $300,000 with multiple family members.\n\n**SMSF in accumulation:** Income taxed at 15%, capital gains at 10% (with 12-month discount).\n\n**SMSF in pension phase:** All investment income and capital gains tax-free (subject to $1.9M transfer balance cap) — the gold standard for income investing in retirement.\n\nGet financial advice before selecting a structure — optimal choice depends on your income, family situation, and time horizon.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" && b.chess_sponsored === true,
    relatedBestPages: [
      { label: "Best for Dividend Investing", href: "/best/dividend-investing" },
      { label: "Best for SMSF Investors", href: "/best/smsf" },
      { label: "Best CHESS-Sponsored Brokers", href: "/best/chess-sponsored" },
    ],
    faqs: [
      {
        question: "How much money do I need to generate $1,000 per month in passive income?",
        answer:
          "At a 5% grossed-up yield (typical for a well-structured Australian income portfolio), you need $240,000 invested to generate $12,000/year ($1,000/month). At 4% yield, the required portfolio is $300,000. Franking credit refunds for retirees or low-income earners can significantly boost effective income beyond the stated dividend yield.",
      },
      {
        question: "What is the best dividend ETF in Australia?",
        answer:
          "The most popular is VHY (Vanguard Australian Shares High Yield ETF, MER 0.25%), which tracks the highest-yielding 40% of ASX shares and delivers around 4.5–5.5% gross yield, largely franked. HVST (BetaShares Australian Dividend Harvester, MER 0.76%) targets higher income but has higher fees. For broader diversification including international dividends, VHYL complements a domestic income focus.",
      },
      {
        question: "Are dividend shares better than growth ETFs for passive income?",
        answer:
          "For investors who need regular cash income (retirees, semi-retired), dividend-focused portfolios are preferable because they generate income without requiring you to sell assets. For investors who don't need current income, there's no mathematical difference between taking dividends vs selling equivalent growth periodically. Choose dividend stocks if you need the cash flow; choose total return ETFs if you don't.",
      },
      {
        question: "How do franking credits work for passive income investors?",
        answer:
          "When an Australian company pays a fully franked dividend, it passes a 30% corporate tax credit to shareholders. You include both the cash dividend and the franking credit in your tax return. If your marginal rate is below 30%, the ATO refunds the excess credit as cash. For retirees with low taxable income, franking credits can add 20–40% to the effective value of Australian dividends.",
      },
    ],
    verticalLink: "/investing",
  },
  {
    slug: "invest-in-index-funds",
    title: "How to Invest in Index Funds in Australia (2026) — Beginner's Guide",
    h1: "How to Invest in Index Funds in Australia",
    metaDescription:
      "Learn how to invest in index funds in Australia. What index funds are, the best ASX-listed options, how to choose the right fund, and a step-by-step guide for beginners. Updated 2026.",
    intro:
      "Index funds are one of the most powerful investment vehicles available to ordinary Australians — and one of the most underutilised. Rather than trying to pick winning stocks, an index fund simply owns every company in an index (like the ASX 200 or S&P 500), delivering market-average returns at a fraction of the cost of actively managed funds. Backed by decades of evidence and championed by investors from Warren Buffett to Jack Bogle, index investing is the default strategy for most successful long-term investors. Here's how to get started in Australia.",
    steps: [
      {
        heading: "Understand What Index Funds Are (and Why They Work)",
        body: `An index fund is a pooled investment that tracks a market index — a predefined list of companies. The S&P/ASX 200 includes the 200 largest ASX-listed companies by market cap. An ASX 200 index fund owns all 200 companies in proportion to their size.\n\nWhy index funds beat most active management:\n- **Cost:** Index ETFs in Australia cost 0.03–0.20%/year. Actively managed funds cost 0.5–1.5%. Over 30 years, this fee difference compounds enormously.\n- **Consistency:** Research consistently shows 80–90% of active fund managers underperform their index benchmark over 10+ year periods after fees.\n- **Diversification:** One purchase instantly diversifies across hundreds of companies, eliminating individual company risk.\n\nIn Australia, index funds are almost exclusively offered as Exchange-Traded Funds (ETFs) — listed securities that trade on the ASX like shares. You buy them through any standard Australian share broker.`,
      },
      {
        heading: "Choose the Right Index Funds for Your Goals",
        body: `The most important decision is which index to track. Key options for Australian investors:\n\n**Australian market:**\n- **VAS** (Vanguard Australian Shares, MER 0.07%): ASX 300 — 300 largest Australian companies\n- **A200** (BetaShares Australia 200, MER 0.04%): ASX 200 — cheapest broad Australian ETF\n- **IOZ** (iShares Core S&P/ASX 200, MER 0.05%)\n\n**Global market:**\n- **IVV** (iShares Core S&P 500, MER 0.03%): 500 largest US companies — most popular global ETF in Australia\n- **VGS** (Vanguard MSCI International, MER 0.18%): Developed markets ex-Australia (23 countries)\n- **IWLD** (iShares MSCI World, MER 0.09%): Global developed markets\n\n**All-in-one diversified:**\n- **DHHF** (BetaShares Diversified All Growth, MER 0.19%): Australian + global + emerging markets in one fund\n- **VDHG** (Vanguard Diversified High Growth, MER 0.27%): 90% shares/10% bonds\n\nFor most beginners, starting with a single all-in-one ETF (DHHF or VDHG) or a simple two-fund combination (VAS + IVV) covers virtually all the diversification needed.`,
      },
      {
        heading: "Open a Share Brokerage Account",
        body: `To buy index fund ETFs in Australia, you need a share brokerage account. ASX ETFs are purchased like ordinary shares — no special account required.\n\n**For most beginners, a zero-brokerage or low-brokerage CHESS-sponsored account is ideal:**\n\n- **Stake:** $0 brokerage on ASX ETFs and shares. CHESS-sponsored.\n- **moomoo:** $0 brokerage on ASX trades. Strong research tools.\n- **Superhero:** $2 brokerage for ETFs. CHESS-sponsored.\n- **Selfwealth:** $9.50 flat brokerage. CHESS-sponsored.\n\nTo open an account: provide full name, DOB, address, Tax File Number, and photo ID. Most accounts open within minutes electronically. Transfer funds via PayID, BPAY, or bank transfer.`,
      },
      {
        heading: "Place Your First Index Fund Order",
        body: `Once your account is funded:\n\n1. Log into your broker platform or app\n2. Search for the ETF by its ASX code (e.g., "VAS" or "DHHF")\n3. Select "Buy"\n4. Choose **Market order** (executes at current price) or **Limit order** (set maximum price)\n5. Enter the number of units or dollar amount\n6. Review: confirm units, estimated total cost, and any brokerage fee\n7. Confirm the order\n\nThe order executes during ASX trading hours (10am–4pm AEST, Mon–Fri). Settlement occurs T+2. Your portfolio shows the position as 'pending settlement' until then.\n\nFor liquid, well-traded ETFs like VAS and IVV, market orders are fine — the bid/ask spread is tiny. For smaller or less liquid ETFs, limit orders prevent paying an inflated price.`,
      },
      {
        heading: "Invest Regularly Using Dollar-Cost Averaging",
        body: `One-off investments are a start, but the real power of index investing comes from regular contributions over a long period — dollar-cost averaging (DCA).\n\nWith DCA, you invest a fixed dollar amount at regular intervals regardless of market conditions. When the market is down, you buy more units at a lower price. Over time, this smooths your average cost and removes the stress of timing the market.\n\n**Setting up automatic DCA:**\n- Set up a recurring transfer from your bank to your brokerage account on payday\n- Some platforms (moomoo, Stake) offer automated recurring investment features\n\nConsistency matters more than timing. Missing even the 10 best trading days in a decade significantly reduces long-term returns — and those best days often occur during volatile markets when emotions tempt investors to sit on cash.`,
      },
      {
        heading: "Manage Your Portfolio Over Time",
        body: `Index fund investing doesn't require constant attention — that's one of its primary advantages. Periodic management is worthwhile:\n\n**Annual tasks:**\n- Review asset allocation and rebalance if significant drift has occurred\n- Confirm your chosen ETFs still align with your goals\n- Reconcile your annual tax statement and claim any franking credits\n- Consider increasing contributions if your income has grown\n\n**What NOT to do:**\n- Don't check daily — this encourages emotional decision-making\n- Don't chase recent outperformers — past performance doesn't predict future returns\n- Don't sell during corrections unless your life circumstances have changed\n\n**Long-term expectations:** The ASX 200 has returned approximately 9.5% annually over 30 years including dividends. The S&P 500 has returned ~10–11% USD annually. These returns include multiple recessions and crashes — the key was staying invested.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) =>
      b.platform_type === "share_broker" && (b.asx_fee_value ?? 100) <= 10,
    relatedBestPages: [
      { label: "Best ETF Platforms", href: "/best/etf-platforms" },
      { label: "Best Brokers for Beginners", href: "/best/beginners" },
      { label: "Best Low-Fee Brokers", href: "/best/low-fees" },
    ],
    faqs: [
      {
        question: "What is the difference between an index fund and an ETF in Australia?",
        answer:
          "In Australia, the terms are often used interchangeably. An ETF (Exchange-Traded Fund) is the delivery mechanism — it's listed on the ASX and traded like a share. An index fund is the strategy — it passively tracks an index. Almost all Australian retail index funds are structured as ETFs. There are also unlisted index managed funds (Vanguard's direct range), but for most retail investors, ASX-listed index ETFs are the standard form.",
      },
      {
        question: "What are the best index funds in Australia in 2026?",
        answer:
          "The most widely held index ETFs are: VAS (Vanguard Australian Shares, MER 0.07%), A200 (BetaShares Australia 200, MER 0.04%), IVV (iShares S&P 500, MER 0.03%), VGS (Vanguard International Shares, MER 0.18%), DHHF (all-in-one, MER 0.19%), and VDHG (all-in-one with bonds, MER 0.27%). For beginners, DHHF or VAS+IVV are the most popular low-cost starting points.",
      },
      {
        question: "How much do I need to start investing in index funds in Australia?",
        answer:
          "On zero-brokerage platforms, you can start with as little as $100. DHHF trades at approximately $35/unit, VAS at ~$100/unit. On brokers that charge $5–10 brokerage per trade, it makes economic sense to invest at least $1,000–$2,000 per trade to keep fees below 0.5–1%.",
      },
      {
        question: "Should I choose Australian or global index funds?",
        answer:
          "Both. Australian index funds (VAS, A200) provide ASX exposure plus franking credits on dividends. However, Australia represents only ~2% of global market capitalisation, so a portfolio limited to Australian shares is highly concentrated. Most advisers recommend 30–40% Australian shares for the franking benefit and 60–70% global (via IVV, VGS) for diversification and access to sectors underrepresented on the ASX such as technology and healthcare.",
      },
      {
        question: "Are index funds safe in Australia?",
        answer:
          "Index funds are ASIC-regulated products managed by licensed fund managers. They're not protected against market losses — they fall in value when markets fall. However, broad diversification eliminates company-specific risk, making them lower risk than individual stocks. The primary risk is short-to-medium term volatility, which is why a long time horizon (5+ years) is recommended.",
      },
    ],
    verticalLink: "/investing",
  },

  // ─── Foreign Investment Guides ────────────────────────────────────────────

  {
    slug: "invest-in-australia-as-non-resident",
    title: "How to Invest in Australia as a Non-Resident (2026) — Complete Guide",
    h1: "How to Invest in Australia as a Non-Resident",
    metaDescription:
      "Step-by-step guide to investing in Australia as a non-resident. Open a brokerage account, understand withholding tax, avoid common mistakes, and find the right platforms. Updated March 2026.",
    intro:
      "Non-residents can invest in Australian shares, crypto, and property — but the rules are different from what Australian residents experience. You'll face withholding tax on dividends and interest, stricter KYC checks, and limited broker options if you don't have an Australian address. This guide walks you through every step, from understanding your tax obligations to opening accounts and making your first investment.",
    steps: [
      {
        heading: "Understand your tax obligations first",
        body: `Before investing a single dollar, understand how Australian tax applies to non-residents. The key rules:

**Dividends:** Unfranked dividends attract 30% withholding tax (WHT) — reduced to typically 15% if your country has a Double Tax Agreement (DTA) with Australia (USA, UK, NZ, etc.). Fully franked dividends attract 0% WHT (tax already paid by the company).

**Interest:** Australian bank interest attracts 10% WHT — deducted automatically by the bank.

**CGT on shares:** Non-residents are generally EXEMPT from Australian CGT on listed shares (portfolio holdings under 10%). This is a significant advantage.

**CGT on property:** Non-residents are NOT exempt from CGT on Australian real property. Full non-resident CGT rates apply.

**No tax-free threshold:** Non-residents are taxed from the first dollar of Australian income at 32.5% (up to $120,000).

Check whether your country has a DTA with Australia — this is the single most important factor affecting your after-tax returns. Visit our Tax Guide for non-residents.`,
      },
      {
        heading: "Choose what to invest in",
        body: `The most accessible investments for non-residents without an Australian address are:

**Australian shares and ETFs** — available via Interactive Brokers (the most non-resident-friendly broker). Gives exposure to ASX-listed companies, ETFs, and international markets via a single account. Dividend withholding tax applies, but the CGT exemption is a major advantage.

**Crypto** — most AUSTRAC-registered exchanges accept non-residents. Lower barriers to entry than share brokers. No WHT on crypto gains.

**Property** — possible but complex: FIRB approval required, stamp duty surcharges of 7–8%, limited to new dwellings (non-residents cannot buy established homes). Requires professional legal advice.

**Savings accounts** — difficult to open without an Australian address. 10% WHT on interest. Usually not worth the effort for non-residents compared to home-country alternatives.`,
      },
      {
        heading: "Open a brokerage or exchange account",
        body: `For shares: Interactive Brokers is the leading option for non-residents without an Australian address. It accepts clients in 200+ countries and provides access to ASX shares, ETFs, and global markets. Sign-up is online: passport, overseas address, and source of funds declaration. Account opening takes 1–3 business days.

For crypto: Major AUSTRAC-registered exchanges (CoinSpot, Swyftx, Binance AU) accept non-residents. You'll need a passport and overseas proof of address. Enhanced KYC may require additional documentation for larger account limits. Fund via international wire transfer (AUD bank account not required).

For both: Declare your non-resident status upfront. This ensures correct withholding tax rates are applied. If you don't declare, the platform may withhold at the top marginal rate.`,
      },
      {
        heading: "Complete enhanced KYC verification",
        body: `As a non-resident, expect a more thorough identity verification process than domestic customers. Required documents typically include:

- Valid passport (not a driver's licence — most platforms require passport for international ID)
- Proof of overseas address: utility bill, bank statement, or government letter dated within 3 months
- For larger account limits or deposits: source of funds declaration (e.g., employment income letter, recent payslips, bank statements)
- Some platforms require a "liveness check" — a selfie or short video holding your ID

Allow 24–72 hours for enhanced KYC to be processed. Have documents ready in advance in clear PDF or photo format.`,
      },
      {
        heading: "Fund your account and declare non-resident status",
        body: `Funding an Australian brokerage or exchange account from overseas:

- International wire transfer (SWIFT) is universally accepted — but can incur FX fees and take 1–3 business days
- Some platforms accept Wise or other money transfer services (check platform-specific guidance)
- Credit/debit card funding is available on some crypto exchanges (higher fees)

When funding, declare your non-residency to the broker or exchange. For share brokers, provide your TFN (if you have one) or a written declaration that you're a non-resident for tax purposes. This ensures the correct withholding rate (e.g., 15% DTA rate rather than 30%) is applied to your dividends.

For US shares, complete a W-8BEN form — this certifies your non-US status and entitles you to the reduced US dividend withholding rate under the Australia-US DTA.`,
      },
      {
        heading: "Monitor and report correctly in your home country",
        body: `Australian withholding tax is a final tax — you don't need to lodge an Australian return for passive dividend or interest income. However, you likely need to declare Australian investment income in your home country's tax return.

Key records to keep:
- Brokerage transaction history (buy/sell dates, prices, quantities)
- Dividend statements showing the gross dividend and WHT deducted
- Annual tax summary from your broker (most provide these for each calendar year)

If you receive fully franked Australian dividends, the gross-up amount (dividend + franking credit) may need to be declared in your home country even though you didn't receive the credit. Get advice from a tax professional in your home country familiar with cross-border investment income.

Consider consulting an Australian tax agent if you have rental income, business income, or capital gains on Australian property — these may require an Australian return.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker" && (b as Broker & { accepts_non_residents?: boolean }).accepts_non_residents === true,
    relatedBestPages: [
      { label: "Foreign Investment Hub", href: "/foreign-investment" },
      { label: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
      { label: "Share Brokers for Non-Residents", href: "/foreign-investment/shares" },
    ],
    faqs: [
      {
        question: "Can I open an Australian brokerage account without an Australian address?",
        answer:
          "Very few Australian brokers accept non-residents without an Australian address. Interactive Brokers is the primary option — it operates in 200+ countries and doesn't require an Australian residential address.",
      },
      {
        question: "Do non-residents pay capital gains tax in Australia on share sales?",
        answer:
          "Generally no. Non-residents are typically exempt from Australian CGT on gains from listed Australian company shares (Section 855-10 exemption), provided they hold less than 10% of the company. This exemption does NOT apply to Australian real property.",
      },
      {
        question: "What is the withholding tax rate for non-residents on dividends?",
        answer:
          "30% on unfranked dividends, reduced to typically 15% if your country has a DTA with Australia. Fully franked dividends attract 0% WHT (tax already paid via the imputation system). The rate is applied automatically by the company's share registry.",
      },
      {
        question: "Do I need a Tax File Number (TFN) as a non-resident?",
        answer:
          "You don't need a TFN, but you must declare your non-resident status to your broker. Without a TFN or non-residency declaration, the broker must withhold at the top marginal rate. You can apply for a TFN as a non-resident if you have a valid visa or Australian income.",
      },
    ],
    verticalLink: "/foreign-investment",
  },
  {
    slug: "claim-dasp-super",
    title: "How to Claim DASP Superannuation in Australia (2026) — Step-by-Step",
    h1: "How to Claim Your Super via DASP When Leaving Australia",
    metaDescription:
      "Step-by-step guide to claiming Departing Australia Superannuation Payment (DASP). Who's eligible, DASP withholding rates (35% or 65%), how to apply online, and what to expect. Updated March 2026.",
    intro:
      "If you worked in Australia on a temporary visa, your employer paid superannuation on your wages. When you leave Australia permanently, you can claim that super back through DASP (Departing Australia Superannuation Payment). But there's a catch: the ATO withholds 35% (or 65% for Working Holiday Makers) before paying you. This guide walks you through the exact steps.",
    steps: [
      {
        heading: "Check you meet the eligibility requirements",
        body: `Before applying for DASP, you must meet ALL of the following:

1. You held an eligible temporary visa (not a permanent resident or citizen)
2. Your temporary visa has ceased — either expired, cancelled, or you've departed and it's expired
3. You have permanently departed Australia (or intend to — you must have left)
4. You are NOT an Australian or New Zealand citizen

NZ citizens have a better option: the Trans-Tasman Retirement Savings Portability Scheme allows you to transfer your Australian super to a KiwiSaver fund instead of taking DASP — which avoids the withholding tax.

**Working Holiday Makers (subclass 417 and 462):** You're eligible for DASP but your withholding rate is 65% across all components — not 35%.`,
      },
      {
        heading: "Find all your super funds",
        body: `Many people working in Australia accumulate super across multiple funds — especially if they worked for different employers. Before you leave (or while you still have access to myGov), find all your super:

1. Set up a myGov account (mygov.gov.au) and link it to the ATO
2. In the ATO section, go to Super → My super — this shows all your super accounts
3. Note the fund name, ABN, and member number for each

Consider consolidating into a single fund before leaving — this simplifies the DASP claim (one application instead of many). Check for any exit fees or insurance implications before consolidating.

If you don't have myGov access, you can use the ATO's Super Seeker or call the ATO on 13 28 65.`,
      },
      {
        heading: "Gather your documents",
        body: `For the online DASP application, you'll need:

- Your passport (the same one used when working in Australia)
- Your super fund details: fund name, ABN, and member number (from your member statements or MyGov)
- Tax File Number (if you have one — not mandatory but speeds processing)
- Australian bank account details (if you have one — for direct payment) OR overseas bank account details
- Evidence your visa has ceased (the DASP system usually verifies this automatically via the Department of Home Affairs, but have your visa grant letter handy)

If you have multiple funds, gather details for each.`,
      },
      {
        heading: "Apply online via the DASP portal",
        body: `The DASP application is completely online at ato.gov.au/dasp.

Steps in the portal:
1. Create or log in to the DASP portal (separate from myGov)
2. Select "Apply for DASP" and enter your passport details
3. The system automatically checks your visa status with the Department of Home Affairs
4. Add each super fund: fund name, ABN, member number, your date of birth, estimated balance
5. Provide your payment details: Australian or overseas bank account, or request a cheque
6. Submit and note your application reference number

The portal submits your application electronically to each fund. Processing takes up to 28 days per fund — AUSTRAC identity verification must be completed before payment is released.`,
      },
      {
        heading: "Understand the withholding and receive payment",
        body: `Once the fund processes your DASP claim, they will:

1. Calculate the DASP withholding tax on each component
2. Deduct the withholding tax
3. Transfer the remaining amount to your nominated account

For most temporary visa holders (not WHM):
- Taxed element: 35% withheld → you receive 65 cents per dollar
- Tax-free component: 0% withheld → you receive 100 cents per dollar

For Working Holiday Makers: 65% withheld across all components → you receive 35 cents per dollar.

Payment can be made to an Australian or overseas bank account. International transfers may take an additional 3–5 business days after the fund releases the funds.

**Important:** DASP withholding is a final Australian tax. You don't need to lodge an Australian tax return for DASP only. However, declare the DASP payment in your home country's tax return as required.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "super_fund",
    relatedBestPages: [
      { label: "Super & DASP Guide", href: "/foreign-investment/super" },
      { label: "Foreign Investment Hub", href: "/foreign-investment" },
      { label: "Compare Super Funds", href: "/super" },
    ],
    faqs: [
      {
        question: "How much of my super will I receive through DASP?",
        answer:
          "For most temporary visa holders: approximately 65% (35% withholding on the taxed element). For Working Holiday Makers (subclass 417 and 462): approximately 35% (65% withholding on all components). Tax-free components (from after-tax contributions) are returned at 100%.",
      },
      {
        question: "Can I claim DASP before leaving Australia?",
        answer:
          "No. DASP can only be claimed after your temporary visa has ceased and you have departed Australia. You cannot access super while your visa is still valid.",
      },
      {
        question: "Is there a time limit to claim DASP?",
        answer:
          "No hard time limit. However, after 2 years of inactivity, super may be transferred to the ATO as 'lost super'. You can still claim it from the ATO's lost super register — it's preserved indefinitely.",
      },
      {
        question: "What if my employer didn't pay super?",
        answer:
          "Employer super guarantee is mandatory for all employees (including temporary visa holders) earning over $450/month (since 2022, all workers). If super wasn't paid, report to the ATO or Fair Work Australia. The ATO can recover unpaid super from employers.",
      },
    ],
    verticalLink: "/foreign-investment/super",
  },
  {
    slug: "withholding-tax-australia-non-resident",
    title: "Understanding Australian Withholding Tax for Non-Residents (2026)",
    h1: "Australian Withholding Tax for Non-Residents — Complete Explainer",
    metaDescription:
      "How Australian withholding tax works for non-residents. Rates by income type (dividends 30%, interest 10%), DTA treaty reductions, franking credits, and what you actually receive. Updated March 2026.",
    intro:
      "Withholding tax is the mechanism Australia uses to collect tax from non-residents on income sourced here. Unlike residents who pay tax via assessments and returns, most non-resident investment income is taxed at source — the company, bank, or fund deducts the tax before paying you. Understanding these rates, and how Double Tax Agreements can reduce them, is fundamental to investing in Australia from overseas.",
    steps: [
      {
        heading: "Understand which income types attract withholding tax",
        body: `Australian withholding tax applies to different types of income at different rates:

**Dividends (unfranked): 30%** — The most significant rate. Applied on the unfranked portion of any dividend paid to a non-resident. If your country has a DTA with Australia, this is typically reduced to 15%.

**Dividends (fully franked): 0%** — If the Australian company has paid 30% corporate tax on its profits, the dividend is "franked" and no additional withholding applies. Major Australian blue-chip companies (CBA, BHP, CSL, etc.) typically pay heavily franked dividends — this is a major advantage for non-residents.

**Interest: 10%** — Applied to interest paid by Australian banks, bonds, and other debt instruments. This rate is rarely reduced below 10% by DTAs.

**Royalties: 30%** — Applied to royalties paid to non-residents. Often reduced significantly by DTA (to 5–15%).

**Rental income, business income:** Not subject to withholding — instead taxed at non-resident marginal rates via the standard assessment process. An Australian tax return is required.`,
      },
      {
        heading: "Check if your country has a Double Tax Agreement (DTA)",
        body: `Australia has DTAs with 40+ countries. These treaties set lower withholding rates that override the standard rates above.

**Key DTA countries and their dividend WHT rates:**
- USA: 15% (instead of 30%)
- UK: 15%
- NZ: 15%
- Japan: 10%
- Singapore: 15%
- Germany: 15%
- France: 15%
- China: 15%

**Countries WITHOUT a DTA with Australia (full 30% applies):**
- UAE, Saudi Arabia, Taiwan, Brazil, Nigeria

Check our full DTA table at /foreign-investment/tax for all 30+ countries.

To claim DTA rates: provide your residency details to your broker. For some countries, a tax residency certificate may be required. Your broker or fund will apply the correct rate automatically once residency is confirmed.`,
      },
      {
        heading: "Understand franking credits — and why non-residents can't claim refunds",
        body: `Australia's imputation system means companies pay 30% corporate tax on profits before paying dividends. When they pay dividends to shareholders, they "attach" franking credits representing the corporate tax already paid.

For Australian residents: franking credits offset their personal tax bill, and if the credit exceeds their tax liability, they get a refund. This is why Australian investors love franked dividends.

For non-residents: the zero withholding on franked dividends is the only benefit — you cannot claim a refund of franking credits. You receive the gross dividend without additional withholding, but the franking credits have no direct cash value to you.

Practical implication: an Australian company paying a 70% franked dividend would attract WHT on only 30% of the dividend amount (the unfranked portion). A fully franked dividend has no Australian tax for non-residents.`,
      },
      {
        heading: "See what you actually receive after withholding",
        body: `Here's how withholding tax affects what you actually receive:

**Example 1: Unfranked dividend (no DTA country)**
- Declared dividend: $100
- WHT at 30%: −$30
- You receive: $70

**Example 2: Unfranked dividend (DTA country, e.g. USA)**
- Declared dividend: $100
- WHT at 15% (DTA rate): −$15
- You receive: $85

**Example 3: Fully franked dividend (any non-resident)**
- Declared dividend: $100 + $42.86 franking credit attached
- WHT: $0 (fully franked, no withholding)
- You receive: $100

**Example 4: Australian bank interest**
- Interest accrued: $1,000
- WHT at 10%: −$100
- You receive: $900`,
      },
      {
        heading: "Claim foreign tax offsets in your home country",
        body: `The Australian withholding tax you pay is usually a foreign tax credit in your home country. How this works:

1. Australia taxes your Australian investment income via withholding
2. You declare the gross Australian income in your home country's tax return
3. You claim a foreign income tax offset for the Australian WHT paid
4. Your home country taxes you on the Australian income, then deducts the Australian tax already paid
5. Net result: tax is generally paid once (at the higher of the two countries' rates)

The mechanics vary by country — some give a direct credit, others give an exemption or deduction. Consult a tax professional in your home country who understands cross-border investment income.

Note: if your home country's tax rate on dividend income is lower than the Australian WHT rate (e.g., your home country taxes dividends at 10% and Australia withheld 15%), you may not get a full offset — the "excess" Australian tax is lost.`,
      },
    ],
    relatedBrokerFilter: (b: Broker) => b.platform_type === "share_broker",
    relatedBestPages: [
      { label: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
      { label: "Foreign Investment Hub", href: "/foreign-investment" },
      { label: "Share Brokers for Non-Residents", href: "/foreign-investment/shares" },
    ],
    faqs: [
      {
        question: "Is Australian withholding tax the same as income tax?",
        answer:
          "For non-residents, withholding tax on passive income (dividends, interest) IS the final tax — you don't lodge a return to pay additional tax, and you can't get a refund. For rental income and business income, the standard non-resident income tax rates apply instead via an assessment.",
      },
      {
        question: "How do I apply for DTA-reduced withholding rates?",
        answer:
          "Inform your broker of your residency status. They will apply the DTA rate automatically. For some countries, you may need to provide a tax residency certificate from your home country's tax authority. If you've had too much withholding deducted, you may be able to lodge a request for refund — seek professional advice.",
      },
      {
        question: "Does withholding tax apply to Australian ETFs?",
        answer:
          "Yes. Australian ETFs distribute income (dividends, interest, capital gains) to unit holders. Non-residents receive distributions after withholding tax is deducted on the applicable portions. Distributions may consist of various components — some attracting WHT, some not. Check the ETF's distribution statement for details.",
      },
      {
        question: "Do I need to lodge an Australian tax return as a non-resident investor?",
        answer:
          "Generally no — if your only Australian income is passive investment income (dividends, interest, distributions), withholding tax is the final tax and no Australian tax return is required. However, if you earn Australian rental income, business income, or capital gains from Australian property, you must lodge a non-resident Australian tax return. Seek advice from a tax professional familiar with cross-border taxation.",
      },
    ],
    verticalLink: "/foreign-investment/tax",
  },
];

/** Get all guide slugs for static params */
export function getAllGuideSlugs(): string[] {
  return HOW_TO_GUIDES.map((g) => g.slug);
}

/** Get a guide by slug */
export function getGuide(slug: string): HowToGuide | undefined {
  return HOW_TO_GUIDES.find((g) => g.slug === slug);
}

/** Get all guides */
export function getAllGuides(): HowToGuide[] {
  return HOW_TO_GUIDES;
}
