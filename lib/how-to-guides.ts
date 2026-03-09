import type { Broker, PlatformType } from "./types";

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
