/**
 * Hardcoded sector / country / dividend yield mappings for common tickers.
 * Covers top ASX stocks, popular US stocks, and common ETFs.
 */

export interface TickerInfo {
  sector: string;
  country: "AU" | "US" | "International";
  dividend_yield_est: number; // estimated annual yield as decimal, e.g. 0.04 = 4%
}

export const SECTORS = [
  "Financials",
  "Mining",
  "Healthcare",
  "Technology",
  "Energy",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Telecommunications",
  "Real Estate",
  "Utilities",
  "Materials",
  "ETF - Broad Market",
  "ETF - International",
  "ETF - Sector",
  "Other",
] as const;

export type Sector = (typeof SECTORS)[number];

export const TICKER_MAP: Record<string, TickerInfo> = {
  // ── Top ASX Stocks ──────────────────────────────────────────────
  BHP: { sector: "Mining", country: "AU", dividend_yield_est: 0.052 },
  CBA: { sector: "Financials", country: "AU", dividend_yield_est: 0.035 },
  CSL: { sector: "Healthcare", country: "AU", dividend_yield_est: 0.011 },
  NAB: { sector: "Financials", country: "AU", dividend_yield_est: 0.045 },
  WBC: { sector: "Financials", country: "AU", dividend_yield_est: 0.048 },
  ANZ: { sector: "Financials", country: "AU", dividend_yield_est: 0.05 },
  WES: { sector: "Consumer Staples", country: "AU", dividend_yield_est: 0.032 },
  WOW: { sector: "Consumer Staples", country: "AU", dividend_yield_est: 0.028 },
  MQG: { sector: "Financials", country: "AU", dividend_yield_est: 0.033 },
  RIO: { sector: "Mining", country: "AU", dividend_yield_est: 0.055 },
  FMG: { sector: "Mining", country: "AU", dividend_yield_est: 0.07 },
  TLS: { sector: "Telecommunications", country: "AU", dividend_yield_est: 0.04 },
  ALL: { sector: "Consumer Discretionary", country: "AU", dividend_yield_est: 0.015 },
  JHX: { sector: "Materials", country: "AU", dividend_yield_est: 0.018 },
  REA: { sector: "Technology", country: "AU", dividend_yield_est: 0.01 },
  XRO: { sector: "Technology", country: "AU", dividend_yield_est: 0.0 },
  WDS: { sector: "Energy", country: "AU", dividend_yield_est: 0.06 },
  TCL: { sector: "Industrials", country: "AU", dividend_yield_est: 0.035 },
  GMG: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.015 },
  STO: { sector: "Energy", country: "AU", dividend_yield_est: 0.045 },
  COL: { sector: "Consumer Staples", country: "AU", dividend_yield_est: 0.03 },
  WTC: { sector: "Technology", country: "AU", dividend_yield_est: 0.005 },
  QBE: { sector: "Financials", country: "AU", dividend_yield_est: 0.03 },
  SUN: { sector: "Financials", country: "AU", dividend_yield_est: 0.042 },
  IAG: { sector: "Financials", country: "AU", dividend_yield_est: 0.038 },
  SOL: { sector: "Industrials", country: "AU", dividend_yield_est: 0.02 },
  ORG: { sector: "Energy", country: "AU", dividend_yield_est: 0.035 },
  APA: { sector: "Utilities", country: "AU", dividend_yield_est: 0.055 },
  MPL: { sector: "Healthcare", country: "AU", dividend_yield_est: 0.032 },
  RMD: { sector: "Healthcare", country: "AU", dividend_yield_est: 0.008 },
  MIN: { sector: "Mining", country: "AU", dividend_yield_est: 0.04 },
  S32: { sector: "Mining", country: "AU", dividend_yield_est: 0.035 },
  AGL: { sector: "Utilities", country: "AU", dividend_yield_est: 0.04 },
  NCM: { sector: "Mining", country: "AU", dividend_yield_est: 0.015 },
  NST: { sector: "Mining", country: "AU", dividend_yield_est: 0.02 },
  AMC: { sector: "Materials", country: "AU", dividend_yield_est: 0.04 },
  BSL: { sector: "Materials", country: "AU", dividend_yield_est: 0.02 },
  ORI: { sector: "Materials", country: "AU", dividend_yield_est: 0.028 },
  TWE: { sector: "Consumer Staples", country: "AU", dividend_yield_est: 0.025 },
  SEK: { sector: "Technology", country: "AU", dividend_yield_est: 0.02 },
  CAR: { sector: "Technology", country: "AU", dividend_yield_est: 0.018 },
  CPU: { sector: "Technology", country: "AU", dividend_yield_est: 0.015 },
  SHL: { sector: "Healthcare", country: "AU", dividend_yield_est: 0.028 },
  RHC: { sector: "Healthcare", country: "AU", dividend_yield_est: 0.016 },
  SGP: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.045 },
  MGR: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.04 },
  GPT: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.048 },
  DXS: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.055 },
  SCG: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.05 },
  LLC: { sector: "Real Estate", country: "AU", dividend_yield_est: 0.035 },

  // ── Top US Stocks ───────────────────────────────────────────────
  AAPL: { sector: "Technology", country: "US", dividend_yield_est: 0.005 },
  MSFT: { sector: "Technology", country: "US", dividend_yield_est: 0.007 },
  AMZN: { sector: "Consumer Discretionary", country: "US", dividend_yield_est: 0.0 },
  GOOGL: { sector: "Technology", country: "US", dividend_yield_est: 0.005 },
  GOOG: { sector: "Technology", country: "US", dividend_yield_est: 0.005 },
  META: { sector: "Technology", country: "US", dividend_yield_est: 0.004 },
  TSLA: { sector: "Consumer Discretionary", country: "US", dividend_yield_est: 0.0 },
  NVDA: { sector: "Technology", country: "US", dividend_yield_est: 0.002 },
  JPM: { sector: "Financials", country: "US", dividend_yield_est: 0.025 },
  V: { sector: "Financials", country: "US", dividend_yield_est: 0.007 },
  MA: { sector: "Financials", country: "US", dividend_yield_est: 0.006 },
  JNJ: { sector: "Healthcare", country: "US", dividend_yield_est: 0.03 },
  UNH: { sector: "Healthcare", country: "US", dividend_yield_est: 0.014 },
  PG: { sector: "Consumer Staples", country: "US", dividend_yield_est: 0.024 },
  KO: { sector: "Consumer Staples", country: "US", dividend_yield_est: 0.03 },
  PEP: { sector: "Consumer Staples", country: "US", dividend_yield_est: 0.027 },
  DIS: { sector: "Consumer Discretionary", country: "US", dividend_yield_est: 0.008 },
  NFLX: { sector: "Consumer Discretionary", country: "US", dividend_yield_est: 0.0 },
  AMD: { sector: "Technology", country: "US", dividend_yield_est: 0.0 },
  INTC: { sector: "Technology", country: "US", dividend_yield_est: 0.015 },
  COST: { sector: "Consumer Staples", country: "US", dividend_yield_est: 0.006 },
  WMT: { sector: "Consumer Staples", country: "US", dividend_yield_est: 0.014 },
  BA: { sector: "Industrials", country: "US", dividend_yield_est: 0.0 },
  XOM: { sector: "Energy", country: "US", dividend_yield_est: 0.034 },
  CVX: { sector: "Energy", country: "US", dividend_yield_est: 0.04 },
  ABBV: { sector: "Healthcare", country: "US", dividend_yield_est: 0.037 },
  MRK: { sector: "Healthcare", country: "US", dividend_yield_est: 0.026 },
  PFE: { sector: "Healthcare", country: "US", dividend_yield_est: 0.058 },
  BAC: { sector: "Financials", country: "US", dividend_yield_est: 0.026 },
  GS: { sector: "Financials", country: "US", dividend_yield_est: 0.023 },

  // ── Popular ETFs ────────────────────────────────────────────────
  VAS: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.038 },
  A200: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.04 },
  IOZ: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.039 },
  STW: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.038 },
  VGS: { sector: "ETF - International", country: "International", dividend_yield_est: 0.016 },
  IVV: { sector: "ETF - International", country: "US", dividend_yield_est: 0.013 },
  NDQ: { sector: "ETF - International", country: "US", dividend_yield_est: 0.005 },
  VTS: { sector: "ETF - International", country: "US", dividend_yield_est: 0.013 },
  VEU: { sector: "ETF - International", country: "International", dividend_yield_est: 0.03 },
  VDHG: { sector: "ETF - Broad Market", country: "International", dividend_yield_est: 0.025 },
  DHHF: { sector: "ETF - Broad Market", country: "International", dividend_yield_est: 0.022 },
  VHY: { sector: "ETF - Sector", country: "AU", dividend_yield_est: 0.055 },
  SYI: { sector: "ETF - Sector", country: "AU", dividend_yield_est: 0.048 },
  HACK: { sector: "ETF - Sector", country: "International", dividend_yield_est: 0.003 },
  QUAL: { sector: "ETF - International", country: "International", dividend_yield_est: 0.012 },
  MOAT: { sector: "ETF - International", country: "US", dividend_yield_est: 0.01 },
  MVW: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.032 },
  QOZ: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.035 },
  VGAD: { sector: "ETF - International", country: "International", dividend_yield_est: 0.018 },
  IHVV: { sector: "ETF - International", country: "US", dividend_yield_est: 0.012 },
  ETHI: { sector: "ETF - International", country: "International", dividend_yield_est: 0.008 },
  FAIR: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.035 },
  GEAR: { sector: "ETF - Broad Market", country: "AU", dividend_yield_est: 0.02 },
  VAP: { sector: "ETF - Sector", country: "AU", dividend_yield_est: 0.04 },
  VAF: { sector: "ETF - Sector", country: "AU", dividend_yield_est: 0.03 },
  VIF: { sector: "ETF - Sector", country: "International", dividend_yield_est: 0.025 },
};

/** Look up a ticker (case-insensitive). Returns undefined if not found. */
export function lookupTicker(ticker: string): TickerInfo | undefined {
  // Strip ".AX" suffix common in ASX tickers
  const clean = ticker.replace(/\.AX$/i, "").toUpperCase().trim();
  return TICKER_MAP[clean];
}

/**
 * Determine if a ticker is likely franked (Australian company paying dividends).
 * Simplistic: AU-country stocks with meaningful dividend yield.
 */
export function isFrankedDividend(ticker: string): boolean {
  const info = lookupTicker(ticker);
  if (!info) return false;
  return info.country === "AU" && info.dividend_yield_est > 0.01 && !info.sector.startsWith("ETF");
}

/** Get the franking rate estimate (assume 100% franked for big AU companies). */
export function estimatedFrankingRate(ticker: string): number {
  return isFrankedDividend(ticker) ? 1.0 : 0;
}
