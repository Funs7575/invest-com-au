"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { Broker } from "@/lib/types";

type FeeChangeEntry = { date: string; field: string; old_value: string; new_value: string };

const PAGE_SIZE = 15;

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [editing, setEditing] = useState<Broker | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Broker | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");

  const supabase = createClient();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("brokers").select("*").order("rating", { ascending: false });
    if (data) setBrokers(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (formData: FormData, feeChangelog: FeeChangeEntry[]) => {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!name || !name.trim()) {
      toast("Name is required", "error");
      return;
    }
    if (!slug || !slug.trim()) {
      toast("Slug is required", "error");
      return;
    }

    // Duplicate slug check
    if (!editing || editing.slug !== slug) {
      const existing = brokers.find(b => b.slug === slug && b.id !== editing?.id);
      if (existing) {
        toast(`Slug "${slug}" is already used by ${existing.name}`, "error");
        return;
      }
    }

    setSaving(true);
    const record: Record<string, unknown> = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      tagline: formData.get("tagline") || null,
      color: formData.get("color") || "#0f172a",
      asx_fee: formData.get("asx_fee") || null,
      asx_fee_value: formData.get("asx_fee_value") ? Number(formData.get("asx_fee_value")) : null,
      us_fee: formData.get("us_fee") || null,
      us_fee_value: formData.get("us_fee_value") ? Number(formData.get("us_fee_value")) : null,
      fx_rate: formData.get("fx_rate") ? Number(formData.get("fx_rate")) : null,
      chess_sponsored: formData.get("chess_sponsored") === "on",
      smsf_support: formData.get("smsf_support") === "on",
      is_crypto: formData.get("is_crypto") === "on",
      deal: formData.get("deal") === "on",
      editors_pick: formData.get("editors_pick") === "on",
      inactivity_fee: formData.get("inactivity_fee") || null,
      min_deposit: formData.get("min_deposit") || null,
      rating: formData.get("rating") ? Number(formData.get("rating")) : null,
      affiliate_url: formData.get("affiliate_url") || null,
      cta_text: formData.get("cta_text") || null,
      deal_text: formData.get("deal_text") || null,
      status: formData.get("status") || "active",
      regulated_by: formData.get("regulated_by") || null,
      year_founded: formData.get("year_founded") ? Number(formData.get("year_founded")) : null,
      headquarters: formData.get("headquarters") || null,
      review_content: formData.get("review_content") || null,
      pros: formData.get("pros") ? (formData.get("pros") as string).split("\n").filter(Boolean) : [],
      cons: formData.get("cons") ? (formData.get("cons") as string).split("\n").filter(Boolean) : [],
      platforms: formData.get("platforms") ? (formData.get("platforms") as string).split("\n").filter(Boolean) : [],
      markets: formData.get("markets") ? (formData.get("markets") as string).split("\n").filter(Boolean) : [],
      payment_methods: formData.get("payment_methods") ? (formData.get("payment_methods") as string).split("\n").filter(Boolean) : [],
      // Fee verification fields
      fee_source_url: formData.get("fee_source_url") || null,
      fee_source_tcs_url: formData.get("fee_source_tcs_url") || null,
      fee_verified_date: formData.get("fee_verified_date") || null,
      fee_changelog: feeChangelog.length > 0 ? feeChangelog : [],
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        const { error } = await supabase.from("brokers").update(record).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brokers").insert(record);
        if (error) throw error;
      }
      toast("Broker saved", "success");
    } catch {
      toast("Failed to save broker", "error");
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("brokers").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast("Broker deleted", "success");
    } catch {
      toast("Failed to delete broker", "error");
    }
    setDeleteTarget(null);
    load();
  };

  const handleBulkAction = async () => {
    if (selected.size === 0 || !bulkAction) return;
    const ids = Array.from(selected);

    if (bulkAction === "activate" || bulkAction === "deactivate") {
      const status = bulkAction === "activate" ? "active" : "inactive";
      const { error } = await supabase.from("brokers").update({ status, updated_at: new Date().toISOString() }).in("id", ids);
      if (error) { toast("Bulk update failed", "error"); }
      else { toast(`${ids.length} broker(s) set to ${status}`, "success"); }
    } else if (bulkAction === "delete") {
      const { error } = await supabase.from("brokers").delete().in("id", ids);
      if (error) { toast("Bulk delete failed", "error"); }
      else { toast(`${ids.length} broker(s) deleted`, "success"); }
    }
    setSelected(new Set());
    setBulkAction("");
    load();
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showForm = editing || creating;
  const formBroker = editing || {} as Partial<Broker>;

  const filteredBrokers = brokers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBrokers.length / PAGE_SIZE);
  const paginatedBrokers = filteredBrokers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelectAll = () => {
    if (selected.size === paginatedBrokers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedBrokers.map(b => b.id)));
    }
  };

  useEffect(() => { setPage(0); }, [search]);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Brokers</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{filteredBrokers.length} broker{filteredBrokers.length !== 1 ? "s" : ""}</span>
          {!showForm && (
            <button onClick={() => setCreating(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors">+ Add Broker</button>
          )}
        </div>
      </div>

      {showForm ? (
        <BrokerForm broker={formBroker} saving={saving} onSave={handleSave} onCancel={() => { setEditing(null); setCreating(false); }} />
      ) : (
        <>
          <div className="mb-4">
            <input type="text" placeholder="Search brokers by name or slug..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-700/30" />
          </div>

          {/* Bulk Action Bar */}
          {selected.size > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">{selected.size} broker{selected.size !== 1 ? "s" : ""} selected</span>
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                >
                  <option value="">Choose action...</option>
                  <option value="activate">Set Active</option>
                  <option value="deactivate">Set Inactive</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={paginatedBrokers.length > 0 && selected.size === paginatedBrokers.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ASX Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Verified</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedBrokers.map((broker) => (
                  <tr key={broker.id} className={`hover:bg-slate-50 ${selected.has(broker.id) ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(broker.id)}
                        onChange={() => toggleSelect(broker.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{broker.name}</div>
                      <div className="text-xs text-slate-500">{broker.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-semibold">{broker.rating || "\u2014"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{broker.asx_fee || "N/A"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {broker.fee_verified_date ? (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-600">
                          {new Date(broker.fee_verified_date).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-50 text-amber-600">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${broker.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-600"}`}>{broker.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <a href={`/broker/${broker.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-700">Preview</a>
                      <button onClick={() => setEditing(broker)} className="text-xs text-amber-600 hover:text-amber-700">Edit</button>
                      <button onClick={() => setDeleteTarget(broker)} className="text-xs text-red-600 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">&larr; Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next &rarr;</button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Broker" message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete Broker" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminShell>
  );
}

function BrokerForm({ broker, saving, onSave, onCancel }: { broker: Partial<Broker>; saving: boolean; onSave: (fd: FormData, changelog: FeeChangeEntry[]) => void; onCancel: () => void; }) {
  const [changelog, setChangelog] = useState<FeeChangeEntry[]>(broker.fee_changelog || []);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<FeeChangeEntry>({ date: new Date().toISOString().split("T")[0], field: "", old_value: "", new_value: "" });

  const addEntry = () => {
    if (!newEntry.field || !newEntry.old_value || !newEntry.new_value) return;
    setChangelog(prev => [newEntry, ...prev]);
    setNewEntry({ date: new Date().toISOString().split("T")[0], field: "", old_value: "", new_value: "" });
    setShowAddEntry(false);
  };

  const removeEntry = (index: number) => {
    setChangelog(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.currentTarget), changelog); }} className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      {/* Basic Info */}
      <SectionHeading title="Basic Info" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Name *" name="name" defaultValue={broker.name} required />
        <Field label="Slug *" name="slug" defaultValue={broker.slug} required />
        <Field label="Color" name="color" defaultValue={broker.color || "#0f172a"} />
      </div>
      <Field label="Tagline" name="tagline" defaultValue={broker.tagline} />

      {/* Fees */}
      <SectionHeading title="Fees & Costs" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="ASX Fee (display)" name="asx_fee" defaultValue={broker.asx_fee} />
        <Field label="ASX Fee Value ($)" name="asx_fee_value" defaultValue={broker.asx_fee_value?.toString()} type="number" step="0.01" />
        <Field label="US Fee (display)" name="us_fee" defaultValue={broker.us_fee} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="US Fee Value ($)" name="us_fee_value" defaultValue={broker.us_fee_value?.toString()} type="number" step="0.01" />
        <Field label="FX Rate (%)" name="fx_rate" defaultValue={broker.fx_rate?.toString()} type="number" step="0.001" />
        <Field label="Inactivity Fee" name="inactivity_fee" defaultValue={broker.inactivity_fee} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Min Deposit" name="min_deposit" defaultValue={broker.min_deposit} />
        <Field label="Rating" name="rating" defaultValue={broker.rating?.toString()} type="number" step="0.1" min="0" max="5" />
        <Field label="Status" name="status" defaultValue={broker.status || "active"} />
      </div>

      {/* Fee Verification */}
      <SectionHeading title="Fee Verification" badge={broker.fee_verified_date ? "Verified" : "Pending"} badgeColor={broker.fee_verified_date ? "green" : "amber"} />
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Verified Date" name="fee_verified_date" defaultValue={broker.fee_verified_date || ""} type="date" />
          <Field label="Pricing Page URL" name="fee_source_url" defaultValue={broker.fee_source_url} placeholder="https://broker.com.au/pricing" />
          <Field label="T&Cs / PDS URL" name="fee_source_tcs_url" defaultValue={broker.fee_source_tcs_url} placeholder="https://broker.com.au/terms" />
        </div>
        <p className="text-xs text-slate-500">Set the verified date when you confirm fees match the broker&apos;s pricing page. This date is shown publicly on the broker review page.</p>

        {/* Mark as verified today shortcut */}
        {!broker.fee_verified_date && (
          <button
            type="button"
            onClick={() => {
              const dateInput = document.querySelector('input[name="fee_verified_date"]') as HTMLInputElement;
              if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
            }}
            className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
          >
            Set to today &rarr;
          </button>
        )}
      </div>

      {/* Fee Changelog */}
      <SectionHeading title="Fee Change History" count={changelog.length} />
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 space-y-3">
        {changelog.length === 0 && !showAddEntry && (
          <p className="text-xs text-slate-500">No fee changes recorded. Add an entry when a broker changes their fees.</p>
        )}

        {changelog.map((entry, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-500">{entry.date}</span>
              <span className="text-xs text-slate-600 mx-2">&mdash;</span>
              <span className="text-xs font-medium text-slate-900">{entry.field}:</span>
              <span className="text-xs text-red-600 ml-1 line-through">{entry.old_value}</span>
              <span className="text-xs text-slate-500 mx-1">&rarr;</span>
              <span className="text-xs text-green-600">{entry.new_value}</span>
            </div>
            <button type="button" onClick={() => removeEntry(i)} className="text-xs text-red-600 hover:text-red-300 ml-3 shrink-0">&times;</button>
          </div>
        ))}

        {showAddEntry && (
          <div className="border border-slate-500 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Field</label>
                <select
                  value={newEntry.field}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, field: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                >
                  <option value="">Select...</option>
                  <option value="ASX Brokerage">ASX Brokerage</option>
                  <option value="US Brokerage">US Brokerage</option>
                  <option value="FX Rate">FX Rate</option>
                  <option value="Inactivity Fee">Inactivity Fee</option>
                  <option value="Min Deposit">Min Deposit</option>
                  <option value="Account Fee">Account Fee</option>
                  <option value="Options Fee">Options Fee</option>
                  <option value="Crypto Fee">Crypto Fee</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Old Value</label>
                <input
                  type="text"
                  value={newEntry.old_value}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, old_value: e.target.value }))}
                  placeholder="e.g. $9.50"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">New Value</label>
                <input
                  type="text"
                  value={newEntry.new_value}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, new_value: e.target.value }))}
                  placeholder="e.g. $5.00"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addEntry}
                disabled={!newEntry.field || !newEntry.old_value || !newEntry.new_value}
                className="bg-green-600 hover:bg-green-700 text-slate-900 font-semibold rounded-lg px-4 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Entry
              </button>
              <button type="button" onClick={() => setShowAddEntry(false)} className="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {!showAddEntry && (
          <button
            type="button"
            onClick={() => setShowAddEntry(true)}
            className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
          >
            + Add fee change entry
          </button>
        )}
      </div>

      {/* Flags */}
      <SectionHeading title="Flags" />
      <div className="flex flex-wrap gap-6">
        <Checkbox label="CHESS Sponsored" name="chess_sponsored" defaultChecked={broker.chess_sponsored} />
        <Checkbox label="SMSF Support" name="smsf_support" defaultChecked={broker.smsf_support} />
        <Checkbox label="Crypto" name="is_crypto" defaultChecked={broker.is_crypto} />
        <Checkbox label="Deal" name="deal" defaultChecked={broker.deal} />
        <Checkbox label="Editor's Pick" name="editors_pick" defaultChecked={broker.editors_pick} />
      </div>

      {/* Affiliate & CTA */}
      <SectionHeading title="Affiliate & CTA" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Affiliate URL" name="affiliate_url" defaultValue={broker.affiliate_url} />
        <Field label="CTA Text" name="cta_text" defaultValue={broker.cta_text} />
      </div>
      <Field label="Deal Text" name="deal_text" defaultValue={broker.deal_text} />

      {/* Company Info */}
      <SectionHeading title="Company Info" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Regulated By" name="regulated_by" defaultValue={broker.regulated_by} />
        <Field label="Year Founded" name="year_founded" defaultValue={broker.year_founded?.toString()} type="number" />
        <Field label="Headquarters" name="headquarters" defaultValue={broker.headquarters} />
      </div>

      {/* Lists */}
      <SectionHeading title="Pros, Cons & Details" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextArea label="Pros (one per line)" name="pros" defaultValue={broker.pros?.join("\n")} rows={4} />
        <TextArea label="Cons (one per line)" name="cons" defaultValue={broker.cons?.join("\n")} rows={4} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextArea label="Platforms (one per line)" name="platforms" defaultValue={broker.platforms?.join("\n")} rows={3} />
        <TextArea label="Markets (one per line)" name="markets" defaultValue={broker.markets?.join("\n")} rows={3} />
        <TextArea label="Payment Methods (one per line)" name="payment_methods" defaultValue={broker.payment_methods?.join("\n")} rows={3} />
      </div>

      {/* Review Content */}
      <SectionHeading title="Review Content" />
      <TextArea label="Review Content" name="review_content" defaultValue={broker.review_content} rows={6} />

      {/* Save */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50">{saving ? "Saving..." : broker.id ? "Update Broker" : "Create Broker"}</button>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-900 px-4 py-2.5 text-sm transition-colors">Cancel</button>
      </div>
    </form>
  );
}

function SectionHeading({ title, badge, badgeColor, count }: { title: string; badge?: string; badgeColor?: "green" | "amber"; count?: number }) {
  const colorMap = { green: "bg-green-50 text-green-600", amber: "bg-amber-50 text-amber-600" };
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">{title}</h3>
      {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[badgeColor || "amber"]}`}>{badge}</span>}
      {count != null && count > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">{count}</span>}
    </div>
  );
}

function Field({ label, name, defaultValue, required, type = "text", placeholder, ...props }: { label: string; name: string; defaultValue?: string; required?: boolean; type?: string; placeholder?: string; [key: string]: unknown; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue || ""} required={required} placeholder={placeholder} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-700/30" {...props} />
    </div>
  );
}

function TextArea({ label, name, defaultValue, rows = 3 }: { label: string; name: string; defaultValue?: string; rows?: number; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <textarea name={name} defaultValue={defaultValue || ""} rows={rows} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-700/30" />
    </div>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 rounded bg-slate-200 border-slate-300" />
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}
