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
  it("parses two Stocks BUY orders and infers exchange by currency", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",100,150.25,151.00,-15025,-1.00,15026,0,75,O',
      'Trades,Data,Order,Stocks,AUD,BHP,"2026-02-20, 09:45:00",50,45.10,45.20,-2255,-7.50,2262.50,0,5,O',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);

    const [r0, r1] = rows;
    expect(r0?.ticker).toBe("AAPL");
    expect(r0?.exchange).toBe("NASDAQ");
    expect(r0?.shares).toBe(100);
    expect(r0?.cost_basis_per_share_cents).toBe(15025);
    expect(r0?.acquired_at).toBe("2026-01-15");
    expect(r0?.broker_slug).toBe("ibkr");

    expect(r1?.ticker).toBe("BHP");
    expect(r1?.exchange).toBe("ASX");
  });

  it("skips SubTotal / Total aggregation rows silently", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",100,150.00,150.00,-15000,-1.00,15001,0,0,O',
      "Trades,SubTotal,,Stocks,USD,AAPL,,100,,,-15000,-1.00,15001,0,0,",
      "Trades,Total,,Stocks,USD,,,,,,,-15000,-1.00,15001,0,0,",
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("surfaces negative-quantity (SELL) rows as skipped errors", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",100,150.00,150.00,-15000,-1.00,15001,0,0,O',
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-02-15, 10:30:00",-50,160.00,160.00,8000,-1.00,-7501,499,0,C',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("AAPL");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/SELL/);
  });

  it("skips non-stock asset categories with a clear error", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Equity and Index Options,USD,AAPL  240119C00150000,"2026-01-10, 10:30:00",1,2.50,2.60,-250,-0.65,250.65,0,10,O',
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",100,150.00,150.00,-15000,-1.00,15001,0,0,O',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("AAPL");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/non-stock/);
  });

  it("maps currency to expected exchange", () => {
    const csv = buildStatement(
      'Trades,Data,Order,Stocks,GBP,VOD,"2026-01-15, 10:30:00",100,80.00,80.00,-8000,-1.00,8001,0,0,O',
      'Trades,Data,Order,Stocks,HKD,0700,"2026-01-15, 10:30:00",100,330.00,330.00,-33000,-1.00,33001,0,0,O',
      'Trades,Data,Order,Stocks,JPY,7203,"2026-01-15, 10:30:00",100,2500.00,2500.00,-250000,-1.00,250001,0,0,O',
      'Trades,Data,Order,Stocks,SGD,D05,"2026-01-15, 10:30:00",100,30.00,30.00,-3000,-1.00,3001,0,0,O',
    );
    const { rows, errors } = parseIbkrCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.exchange).toBe("LSE");
    expect(rows[1]?.exchange).toBe("HKEX");
    expect(rows[2]?.exchange).toBe("TYO");
    expect(rows[3]?.exchange).toBe("SGX");
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
        'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",10,150.00,150.00,-1500,-1.00,1501,0,0,O',
        "Dividends,Header,Currency,Date,Description,Amount",
        "Dividends,Data,USD,2026-03-01,AAPL Dividend,5.50",
      ].join("\n");
    const { rows, errors } = parseIbkrCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("returns a cap error when Trades section exceeds 500 data rows", () => {
    const row =
      'Trades,Data,Order,Stocks,USD,AAPL,"2026-01-15, 10:30:00",1,150.00,150.00,-150,-1.00,151,0,0,O';
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
