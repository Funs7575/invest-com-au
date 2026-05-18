import { describe, expect, it } from "vitest";
import {
  mapSharesightHoldings,
  type SharesightHolding,
} from "@/lib/sharesight/mapping";

describe("mapSharesightHoldings", () => {
  it("maps a clean AUD ASX position", () => {
    const raw: SharesightHolding[] = [
      {
        instrument_code: "BHP",
        market_code: "ASX",
        quantity: 100,
        average_buy_price: 42.5,
        first_purchase_date: "2024-03-15",
        currency_code: "AUD",
        instrument_name: "BHP Group Ltd",
      },
    ];
    const { rows, errors } = mapSharesightHoldings(raw);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ticker: "BHP",
      exchange: "ASX",
      shares: 100,
      cost_basis_per_share_cents: 4250,
      acquired_at: "2024-03-15",
      broker_slug: "sharesight",
    });
    expect(rows[0]!.notes).toContain("BHP Group Ltd");
  });

  it("rounds the price to the nearest cent", () => {
    const { rows } = mapSharesightHoldings([
      {
        instrument_code: "VAS",
        market_code: "ASX",
        quantity: 10,
        average_buy_price: 92.4567,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
    ]);
    expect(rows[0]!.cost_basis_per_share_cents).toBe(9246);
  });

  it("blocks non-AUD positions with an FX-pending error rather than wrong cost basis", () => {
    const { rows, errors } = mapSharesightHoldings([
      {
        instrument_code: "AAPL",
        market_code: "NASDAQ",
        quantity: 5,
        average_buy_price: 150,
        first_purchase_date: "2024-01-01",
        currency_code: "USD",
      },
    ]);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toMatch(/non-AUD position \(USD\) requires FX/i);
  });

  it("flags missing instrument code", () => {
    const { rows, errors } = mapSharesightHoldings([
      {
        instrument_code: "",
        market_code: "ASX",
        quantity: 10,
        average_buy_price: 1,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
    ]);
    expect(rows).toEqual([]);
    expect(errors[0]!.reason).toMatch(/missing instrument code/i);
  });

  it("flags zero / negative quantity", () => {
    const { errors } = mapSharesightHoldings([
      {
        instrument_code: "BHP",
        market_code: "ASX",
        quantity: 0,
        average_buy_price: 1,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
    ]);
    expect(errors[0]!.reason).toMatch(/invalid quantity/i);
  });

  it("rejects unparseable first_purchase_date", () => {
    const { errors } = mapSharesightHoldings([
      {
        instrument_code: "BHP",
        market_code: "ASX",
        quantity: 1,
        average_buy_price: 1,
        first_purchase_date: "15/03/2024",
        currency_code: "AUD",
      },
    ]);
    expect(errors[0]!.reason).toMatch(/unparseable first_purchase_date/i);
  });

  it("normalises common Sharesight market aliases", () => {
    const { rows } = mapSharesightHoldings([
      {
        instrument_code: "VOO",
        market_code: "NMS",
        quantity: 1,
        average_buy_price: 100,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
      {
        instrument_code: "VOD",
        market_code: "LON",
        quantity: 1,
        average_buy_price: 1,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
    ]);
    expect(rows[0]!.exchange).toBe("NASDAQ");
    expect(rows[1]!.exchange).toBe("LSE");
  });

  it("falls back to OTHER for unknown markets", () => {
    const { rows } = mapSharesightHoldings([
      {
        instrument_code: "XYZ",
        market_code: "XETRA",
        quantity: 1,
        average_buy_price: 1,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
    ]);
    expect(rows[0]!.exchange).toBe("OTHER");
  });

  it("emits each-row index 1-based to match the CSV path", () => {
    const { errors } = mapSharesightHoldings([
      {
        instrument_code: "BHP",
        market_code: "ASX",
        quantity: 1,
        average_buy_price: 1,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
      {
        instrument_code: "",
        market_code: "ASX",
        quantity: 1,
        average_buy_price: 1,
        first_purchase_date: "2024-01-01",
        currency_code: "AUD",
      },
    ]);
    expect(errors[0]!.rowIndex).toBe(2);
  });
});
