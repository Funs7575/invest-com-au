import { describe, it, expect } from "vitest";
import { parseIbkrCsv } from "@/lib/holdings/csv-import/ibkr";

// Minimal IBKR Activity Statement shape: irrelevant sections before
// Trades, then the Trades section with a Header and a few Data rows.
const STATEMENT_PREAMBLE = [
  "Statement,Header,Field Name,Field Value",
  "Statement,Data,BrokerName,Interactive Brokers",
  "Account Information,Header,Field Name,Field Value",
  "Account Information,Data,AccountAlias,test-account",
].join("\n");

const TRADES_HEADER =
  "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code";

function buildStatement(...tradeDataRows: string[]): string {
  return [STATEMENT_PREAMBLE, TRADES_HEADER, ...tradeDataRows].join("\n");
}

describe("parseIbkrCsv", () => {
  it("parses AUD BUY orders and rejects non-AUD with an FX-conversion error", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",100,150.25,151.00,-15025,-1.00,15026,0,75,O',
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-02-20, 09:45:00",50,45.10,45.20,-2255,-7.50,2262.50,0,5,O',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    // AAPL (USD) is rejected because cost_basis_per_share_cents downstream
    // is consumed as AUD cents. BHP (AUD) passes through.
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/non-AUD.*USD|FX conversion/i);

    expect(rows[0]?.ticker).toBe("BHP");
    expect(rows[0]?.exchange).toBe("ASX");
    expect(rows[0]?.shares).toBe(50);
    expect(rows[0]?.cost_basis_per_share_cents).toBe(4510);
    expect(rows[0]?.acquired_at).toBe("2026-02-20");
    // Slug must match data/site-data.json:292 — the catalogue uses
    // "interactive-brokers"; the parser used to ship "ibkr" (Codex review
    // on PR #862 surfaced this drift). Soft-link breaks for IBKR rows
    // unless they agree.
    expect(rows[0]?.broker_slug).toBe("interactive-brokers");
  });

  it("skips SubTotal / Total aggregation rows silently (AUD BUY)", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-01-15, 10:30:00",100,45.00,45.00,-4500,-1.00,4501,0,0,O',
      "Trades,SubTotal,,Stocks,AUD,BHP,,100,,,-4500,-1.00,4501,0,0,",
      "Trades,Total,,Stocks,AUD,,,,,,,-4500,-1.00,4501,0,0,",
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("surfaces negative-quantity (SELL) rows as skipped errors", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-01-15, 10:30:00",100,45.00,45.00,-4500,-1.00,4501,0,0,O',
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-02-15, 10:30:00",-50,50.00,50.00,2500,-1.00,-2251,499,0,C',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/SELL/);
  });

  it("skips non-stock asset categories with a clear error", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Equity and Index Options,AUD,BHP  240119C00045000,"2026-01-10, 10:30:00",1,2.50,2.60,-250,-0.65,250.65,0,10,O',
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-01-15, 10:30:00",100,45.00,45.00,-4500,-1.00,4501,0,0,O',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/non-stock/);
  });

  it("rejects non-AUD trades (USD/GBP/HKD/JPY/SGD) until FX support ships", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,GBP,VOD,"2026-01-15, 10:30:00",100,80.00,80.00,-8000,-1.00,8001,0,0,O',
      'Trades,Data,Order,Stocks,HKD,0700,"2026-01-15, 10:30:00",100,330.00,330.00,-33000,-1.00,33001,0,0,O',
      'Trades,Data,Order,Stocks,JPY,7203,"2026-01-15, 10:30:00",100,2500.00,2500.00,-250000,-1.00,250001,0,0,O',
      'Trades,Data,Order,Stocks,SGD,D05,"2026-01-15, 10:30:00",100,30.00,30.00,-3000,-1.00,3001,0,0,O',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(4);
    expect(errors.every((e) => /non-AUD|FX conversion/i.test(e.reason))).toBe(true);
  });

  it("returns an error when the Trades section is absent", () => {
    const { rows, errors } = parseIbkrCsv(STATEMENT_PREAMBLE);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/Trades.*Header/);
  });

  it("stops reading at the next section boundary", () => {
    const csv =
      [
        STATEMENT_PREAMBLE,
        TRADES_HEADER,
        'Trades,Data,Order,Stocks,AUD,BHP,"2026-01-15, 10:30:00",10,45.00,45.00,-450,-1.00,451,0,0,O',
        "Dividends,Header,Currency,Date,Description,Amount",
        "Dividends,Data,AUD,2026-03-01,BHP Dividend,5.50",
      ].join("\n");
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("returns a cap error when Trades section exceeds 500 data rows", () => {
    const row =
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-01-15, 10:30:00",1,45.00,45.00,-45,-1.00,46,0,0,O';
    const csv = [STATEMENT_PREAMBLE, TRADES_HEADER, ...new Array(501).fill(row)].join(
      "\n",
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("returns an explicit empty error for empty input", () => {
    const { rows, errors } = parseIbkrCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
