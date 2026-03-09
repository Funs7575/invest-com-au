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
    slug: "how-to-buy-shares",
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
    slug: "how-to-buy-bitcoin",
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
    slug: "how-to-buy-etfs",
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
    slug: "how-to-open-brokerage-account",
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
    slug: "how-to-start-investing",
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
