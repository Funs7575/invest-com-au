import { describe, it, expect } from "vitest";
import { parseStakeCsv } from "@/lib/holdings/csv-import/stake";

const HEADER = "Date,Reference,Activity,Symbol,Description,Quantity,Price,Total,Currency";

// Stake's US CSV is USD-denominated; cost_basis_per_share_cents downstream
// (HoldingsClient, tax-summary.ts) is consumed as AUD cents. Until per-
// currency FX conversion ships, the parser intentionally rejects every BUY
// row with an FX-block error. These tests assert that contract; when the
// FX layer lands and STAKE_FX_DISABLED flips to false, the row-shape
// assertions in the bottom describe block become the truth source.

describe("parseStakeCsv — FX-block guard (STAKE_FX_DISABLED=true)", () => {
  it("rejects BUY rows with an FX-conversion error instead of importing wrong AUD cost basis", () => {
    const csv = [
      HEADER,
      "2026-03-01,T1,Buy,AAPL,Apple Inc.,10,150.25,1502.50,USD",
      "2026-03-15,T2,Buy,MSFT,Microsoft Corp.,5,310.00,1550.00,USD",
      "2026-04-20,T3,Buy,JNJ,Johnson & Johnson,7,160.00,1120.00,USD",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(3);
    expect(errors.every((e) => /USD-denominated|FX conversion/i.test(e.reason))).toBe(true);
    expect(errors[0]?.reason).toMatch(/AAPL/);
  });

  it("non-BUY rows still surface as 'non-BUY' errors (validation runs before FX block)", () => {
    const csv = [
      HEADER,
      "2026-03-01,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD",
      "2026-03-02,T2,Sell,AAPL,Apple,5,160.00,800.00,USD",
      "2026-03-03,T3,Dividend,AAPL,Apple dividend,0,0,5.50,USD",
      "2026-03-04,T4,Cash Deposit,,,0,0,1000.00,USD",
    ].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toHaveLength(0);
    // 1 FX-block (the Buy row) + 3 non-BUY rejections.
    expect(errors).toHaveLength(4);
    expect(errors.filter((e) => /non-BUY/.test(e.reason))).toHaveLength(3);
    expect(errors.filter((e) => /FX conversion/i.test(e.reason))).toHaveLength(1);
  });

  it("malformed-date / invalid-ticker rows error before the FX-block path", () => {
    const csv = [
      HEADER,
      "NOT-A-DATE,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD",
      "2026-03-02,T2,Buy,LONGTICKERZZ,Bad,1,1.00,1.00,USD",
    ].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/ticker|date/);
    expect(errors[1]?.reason).toMatch(/ticker/);
  });

  it("returns an error if the header row is missing (still works pre-FX-block)", () => {
    const csv = "2026-03-01,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD";
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/header/);
  });

  it("returns a cap error when input exceeds 500 data rows (cap check runs before row-level FX block)", () => {
    const buyRow = "2026-03-01,T1,Buy,AAPL,Apple,1,150.00,150.00,USD";
    const csv = [HEADER, ...new Array(501).fill(buyRow)].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("returns an explicit empty error for empty input", () => {
    const { rows, errors } = parseStakeCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
