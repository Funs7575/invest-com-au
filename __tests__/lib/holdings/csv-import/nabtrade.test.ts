import { describe, it, expect } from "vitest";
import { parseNabTradeCsv } from "@/lib/holdings/csv-import/nabtrade";

const HEADER =
  "Trade Date,Settlement Date,Account,Order #,Action,Quantity,Symbol,Description,Price,Brokerage,GST,Amount,Currency";

describe("parseNabTradeCsv", () => {
  it("parses three Bought rows on ASX", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,12345,A1,Bought,100,BHP,BHP Group Ltd,45.10,14.95,1.50,4510.00,AUD",
      "15/03/2026,17/03/2026,12345,A2,Bought,50,CBA,Commonwealth Bank,109.50,14.95,1.50,5475.00,AUD",
      "20/04/2026,22/04/2026,12345,A3,Bought,30,WBC,Westpac,30.10,14.95,1.50,903.00,AUD",
    ].join("\n");

    const { rows, errors } = parseNabTradeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);

    const [r0, r1, r2] = rows;
    expect(r0?.ticker).toBe("BHP");
    expect(r0?.exchange).toBe("ASX");
    expect(r0?.shares).toBe(100);
    expect(r0?.cost_basis_per_share_cents).toBe(4510);
    expect(r0?.acquired_at).toBe("2026-03-01");
    expect(r0?.broker_slug).toBe("nabtrade");

    expect(r1?.ticker).toBe("CBA");
    expect(r2?.cost_basis_per_share_cents).toBe(3010);
  });

  it("uses currency to route US orders to NASDAQ", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,12345,A1,Bought,10,AAPL,Apple Inc.,150.00,9.95,0.00,1500.00,USD",
      "01/03/2026,03/03/2026,12345,A2,Bought,5,VOD,Vodafone,80.00,9.95,0.00,400.00,GBP",
    ].join("\n");
    const { rows, errors } = parseNabTradeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]?.exchange).toBe("NASDAQ");
    expect(rows[1]?.exchange).toBe("LSE");
  });

  it("surfaces Sold/Dividend rows as skipped errors", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,12345,A1,Bought,100,BHP,BHP,45.00,14.95,1.50,4500.00,AUD",
      "02/03/2026,04/03/2026,12345,A2,Sold,50,CBA,CBA,110.00,14.95,1.50,5500.00,AUD",
      "03/03/2026,05/03/2026,12345,A3,Dividend,0,BHP,BHP dividend,1.45,0,0,145.00,AUD",
    ].join("\n");
    const { rows, errors } = parseNabTradeCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/non-BUY/);
  });

  it("rejects invalid date / quantity", () => {
    const csv = [
      HEADER,
      "BAD-DATE,03/03/2026,12345,A1,Bought,100,BHP,BHP,45.00,14.95,1.50,4500.00,AUD",
      "01/03/2026,03/03/2026,12345,A2,Bought,0,BHP,BHP,45.00,14.95,1.50,0,AUD",
    ].join("\n");
    const { rows, errors } = parseNabTradeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/date/);
    expect(errors[1]?.reason).toMatch(/quantity/);
  });

  it("accepts older Buy/Sell action vocab as fallback", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,12345,A1,Buy,100,BHP,BHP,45.00,14.95,1.50,4500.00,AUD",
    ].join("\n");
    const { rows, errors } = parseNabTradeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("returns an error if the header is missing", () => {
    const csv = "01/03/2026,03/03/2026,12345,A1,Bought,100,BHP,BHP,45.00,14.95,1.50,4500.00,AUD";
    const { rows, errors } = parseNabTradeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toMatch(/header/);
  });

  it("returns a cap error when input exceeds 500 data rows", () => {
    const row =
      "01/03/2026,03/03/2026,12345,A1,Bought,1,BHP,BHP,45.00,14.95,1.50,45.00,AUD";
    const csv = [HEADER, ...new Array(501).fill(row)].join("\n");
    const { rows, errors } = parseNabTradeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("returns an explicit empty error for empty input", () => {
    const { rows, errors } = parseNabTradeCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
