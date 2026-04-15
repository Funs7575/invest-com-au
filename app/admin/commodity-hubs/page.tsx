import AdminShell from "@/components/AdminShell";
import { listActiveSectors } from "@/lib/commodities";
import CommodityHubsClient from "./CommodityHubsClient";

export const dynamic = "force-dynamic";

/**
 * Admin page — launch new commodity verticals.
 *
 * The goal of this surface is "spin up a new /invest/<sector> hub
 * in under 5 minutes". Editorial picks a sector slug, pastes in
 * the hero copy + ESG rating, adds a starting set of tickers +
 * ETFs, and hits save. The backing API handles validation and
 * upserts. The public /invest/<sector> page just needs a tiny
 * wrapper file (10 lines, same pattern as /invest/oil-gas) to go
 * live.
 */
export default async function AdminCommodityHubsPage() {
  const sectors = await listActiveSectors();

  return (
    <AdminShell title="Commodity hubs (vertical launcher)">
      <div className="max-w-5xl">
        <p className="text-sm text-slate-600 mb-6">
          Manage /invest/&lt;sector&gt; hubs. Each row represents a live
          commodity vertical powered by the{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            commodity_sectors
          </code>{" "}
          table. To publish a new one, create the sector row here and
          add its starter stocks + ETFs, then ship a{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            app/invest/&lt;slug&gt;/page.tsx
          </code>{" "}
          wrapper following the oil-gas example.
        </p>

        <CommodityHubsClient
          initialSectors={sectors.map((s) => ({
            id: s.id,
            slug: s.slug,
            display_name: s.display_name,
            hero_description: s.hero_description,
            esg_risk_rating: s.esg_risk_rating,
            launched_at: s.launched_at,
            display_order: s.display_order,
          }))}
        />
      </div>
    </AdminShell>
  );
}
