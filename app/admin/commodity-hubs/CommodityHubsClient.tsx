"use client";

import { useState } from "react";

interface Sector {
  id: number;
  slug: string;
  display_name: string;
  hero_description: string;
  esg_risk_rating: string;
  launched_at: string | null;
  display_order: number;
}

interface Props {
  initialSectors: Sector[];
}

type StockFormState = {
  sector_slug: string;
  ticker: string;
  company_name: string;
  market_cap_bucket: string;
  primary_exposure: string;
  blurb: string;
};

type EtfFormState = {
  sector_slug: string;
  ticker: string;
  name: string;
  issuer: string;
  mer_pct: string;
  blurb: string;
};

const emptyStock: StockFormState = {
  sector_slug: "",
  ticker: "",
  company_name: "",
  market_cap_bucket: "mid",
  primary_exposure: "producer",
  blurb: "",
};

const emptyEtf: EtfFormState = {
  sector_slug: "",
  ticker: "",
  name: "",
  issuer: "",
  mer_pct: "",
  blurb: "",
};

export default function CommodityHubsClient({ initialSectors }: Props) {
  const [sectors, setSectors] = useState(initialSectors);

  // Sector form
  const [sectorSlug, setSectorSlug] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [sectorHero, setSectorHero] = useState("");
  const [sectorEsg, setSectorEsg] = useState("medium");
  const [sectorNotes, setSectorNotes] = useState("");
  const [sectorBusy, setSectorBusy] = useState(false);
  const [sectorMsg, setSectorMsg] = useState<string | null>(null);
  const [sectorErr, setSectorErr] = useState<string | null>(null);

  // Stock / ETF forms
  const [stockForm, setStockForm] = useState<StockFormState>(emptyStock);
  const [etfForm, setEtfForm] = useState<EtfFormState>(emptyEtf);
  const [childMsg, setChildMsg] = useState<string | null>(null);
  const [childErr, setChildErr] = useState<string | null>(null);

  const saveSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectorBusy(true);
    setSectorMsg(null);
    setSectorErr(null);
    try {
      const res = await fetch("/api/admin/commodity-hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: sectorSlug,
          display_name: sectorName,
          hero_description: sectorHero,
          esg_risk_rating: sectorEsg,
          regulator_notes: sectorNotes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSectorErr(json.error || "Upsert failed");
        return;
      }
      setSectorMsg(`Sector "${sectorSlug}" saved.`);
      // Refresh the list
      const listRes = await fetch("/api/admin/commodity-hubs", { cache: "no-store" });
      if (listRes.ok) {
        const data = await listRes.json();
        setSectors(data.items || []);
      }
      setSectorSlug("");
      setSectorName("");
      setSectorHero("");
      setSectorEsg("medium");
      setSectorNotes("");
    } finally {
      setSectorBusy(false);
    }
  };

  const saveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setChildMsg(null);
    setChildErr(null);
    const res = await fetch("/api/admin/commodity-hubs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "stock", ...stockForm }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setChildErr(json.error || "Stock upsert failed");
      return;
    }
    setChildMsg(`Stock ${stockForm.ticker.toUpperCase()} saved.`);
    setStockForm((prev) => ({ ...emptyStock, sector_slug: prev.sector_slug }));
  };

  const saveEtf = async (e: React.FormEvent) => {
    e.preventDefault();
    setChildMsg(null);
    setChildErr(null);
    const res = await fetch("/api/admin/commodity-hubs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "etf",
        ...etfForm,
        mer_pct: etfForm.mer_pct ? Number(etfForm.mer_pct) : null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setChildErr(json.error || "ETF upsert failed");
      return;
    }
    setChildMsg(`ETF ${etfForm.ticker.toUpperCase()} saved.`);
    setEtfForm((prev) => ({ ...emptyEtf, sector_slug: prev.sector_slug }));
  };

  return (
    <div className="space-y-10">
      {/* Sector list */}
      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Active sectors ({sectors.length})
        </h2>
        {sectors.length === 0 ? (
          <p className="text-sm text-slate-500">No sectors yet. Create one below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Slug</th>
                  <th className="text-left px-3 py-2">Display name</th>
                  <th className="text-left px-3 py-2">ESG</th>
                  <th className="text-left px-3 py-2">Launched</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-slate-800">{s.slug}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {s.display_name}
                    </td>
                    <td className="px-3 py-2 capitalize">{s.esg_risk_rating}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {s.launched_at
                        ? new Date(s.launched_at).toLocaleDateString("en-AU")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* New sector form */}
      <form
        onSubmit={saveSector}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Create / update sector
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Slug (kebab-case)
            </span>
            <input
              required
              value={sectorSlug}
              onChange={(e) => setSectorSlug(e.target.value)}
              placeholder="oil-gas"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Display name
            </span>
            <input
              required
              value={sectorName}
              onChange={(e) => setSectorName(e.target.value)}
              placeholder="Oil & Gas"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Hero description
            </span>
            <textarea
              required
              rows={3}
              value={sectorHero}
              onChange={(e) => setSectorHero(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              ESG risk rating
            </span>
            <select
              value={sectorEsg}
              onChange={(e) => setSectorEsg(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Regulator notes (optional)
            </span>
            <input
              value={sectorNotes}
              onChange={(e) => setSectorNotes(e.target.value)}
              placeholder="FIRB approval required ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {sectorErr && (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {sectorErr}
          </p>
        )}
        {sectorMsg && (
          <p role="status" className="mt-3 text-xs text-emerald-700">
            {sectorMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={sectorBusy}
          className="mt-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg"
        >
          {sectorBusy ? "Saving…" : "Save sector"}
        </button>
      </form>

      {/* Add stock / ETF */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <form
          onSubmit={saveStock}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-base font-bold text-slate-900 mb-3">Add ASX stock</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Sector slug
              </span>
              <input
                required
                value={stockForm.sector_slug}
                onChange={(e) =>
                  setStockForm((prev) => ({ ...prev, sector_slug: e.target.value }))
                }
                placeholder="oil-gas"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Ticker
              </span>
              <input
                required
                value={stockForm.ticker}
                onChange={(e) =>
                  setStockForm((prev) => ({ ...prev, ticker: e.target.value }))
                }
                placeholder="WDS"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Market cap
              </span>
              <select
                value={stockForm.market_cap_bucket}
                onChange={(e) =>
                  setStockForm((prev) => ({
                    ...prev,
                    market_cap_bucket: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="mega">Mega</option>
                <option value="large">Large</option>
                <option value="mid">Mid</option>
                <option value="small">Small</option>
                <option value="spec">Speculative</option>
              </select>
            </label>
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Company name
              </span>
              <input
                required
                value={stockForm.company_name}
                onChange={(e) =>
                  setStockForm((prev) => ({ ...prev, company_name: e.target.value }))
                }
                placeholder="Woodside Energy Group"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Editorial blurb
              </span>
              <textarea
                rows={2}
                value={stockForm.blurb}
                onChange={(e) =>
                  setStockForm((prev) => ({ ...prev, blurb: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2 rounded-lg"
          >
            Save stock
          </button>
        </form>

        <form
          onSubmit={saveEtf}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-base font-bold text-slate-900 mb-3">Add ETF</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Sector slug
              </span>
              <input
                required
                value={etfForm.sector_slug}
                onChange={(e) =>
                  setEtfForm((prev) => ({ ...prev, sector_slug: e.target.value }))
                }
                placeholder="oil-gas"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Ticker
              </span>
              <input
                required
                value={etfForm.ticker}
                onChange={(e) =>
                  setEtfForm((prev) => ({ ...prev, ticker: e.target.value }))
                }
                placeholder="OOO"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                MER %
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={etfForm.mer_pct}
                onChange={(e) =>
                  setEtfForm((prev) => ({ ...prev, mer_pct: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Full ETF name
              </span>
              <input
                required
                value={etfForm.name}
                onChange={(e) =>
                  setEtfForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="BetaShares Crude Oil Index ETF"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Issuer
              </span>
              <input
                value={etfForm.issuer}
                onChange={(e) =>
                  setEtfForm((prev) => ({ ...prev, issuer: e.target.value }))
                }
                placeholder="BetaShares"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Blurb
              </span>
              <textarea
                rows={2}
                value={etfForm.blurb}
                onChange={(e) =>
                  setEtfForm((prev) => ({ ...prev, blurb: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2 rounded-lg"
          >
            Save ETF
          </button>
        </form>
      </div>

      {childErr && (
        <p role="alert" className="text-xs text-red-700">
          {childErr}
        </p>
      )}
      {childMsg && (
        <p role="status" className="text-xs text-emerald-700">
          {childMsg}
        </p>
      )}
    </div>
  );
}
