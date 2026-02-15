"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import type { Broker } from "@/lib/types";

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [editing, setEditing] = useState<Broker | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from("brokers").select("*").order("rating", { ascending: false });
    if (data) setBrokers(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (formData: FormData) => {
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
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      await supabase.from("brokers").update(record).eq("id", editing.id);
    } else {
      await supabase.from("brokers").insert(record);
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this broker?")) return;
    await supabase.from("brokers").delete().eq("id", id);
    load();
  };

  const showForm = editing || creating;
  const formBroker = editing || {} as Partial<Broker>;

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Brokers</h1>
        {!showForm && (
          <button
            onClick={() => setCreating(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            + Add Broker
          </button>
        )}
      </div>

      {showForm ? (
        <BrokerForm
          broker={formBroker}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Broker</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">ASX Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {brokers.map((broker) => (
                <tr key={broker.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">{broker.name}</div>
                    <div className="text-xs text-slate-400">{broker.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-amber-400 font-semibold">{broker.rating || "—"}★</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{broker.asx_fee || "N/A"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      broker.status === "active" ? "bg-green-500/10 text-green-400" : "bg-slate-600 text-slate-300"
                    }`}>
                      {broker.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditing(broker)} className="text-xs text-amber-400 hover:text-amber-300">Edit</button>
                    <button onClick={() => handleDelete(broker.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function BrokerForm({
  broker,
  saving,
  onSave,
  onCancel,
}: {
  broker: Partial<Broker>;
  saving: boolean;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.currentTarget)); }}
      className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Name" name="name" defaultValue={broker.name} required />
        <Field label="Slug" name="slug" defaultValue={broker.slug} required />
        <Field label="Color" name="color" defaultValue={broker.color || "#0f172a"} />
      </div>

      <Field label="Tagline" name="tagline" defaultValue={broker.tagline} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="ASX Fee (display)" name="asx_fee" defaultValue={broker.asx_fee} />
        <Field label="ASX Fee Value ($)" name="asx_fee_value" defaultValue={broker.asx_fee_value?.toString()} type="number" step="0.01" />
        <Field label="US Fee (display)" name="us_fee" defaultValue={broker.us_fee} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="US Fee Value ($)" name="us_fee_value" defaultValue={broker.us_fee_value?.toString()} type="number" step="0.01" />
        <Field label="FX Rate (%)" name="fx_rate" defaultValue={broker.fx_rate?.toString()} type="number" step="0.001" />
        <Field label="Rating" name="rating" defaultValue={broker.rating?.toString()} type="number" step="0.1" min="0" max="5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Inactivity Fee" name="inactivity_fee" defaultValue={broker.inactivity_fee} />
        <Field label="Min Deposit" name="min_deposit" defaultValue={broker.min_deposit} />
        <Field label="Status" name="status" defaultValue={broker.status || "active"} />
      </div>

      <div className="flex flex-wrap gap-6">
        <Checkbox label="CHESS Sponsored" name="chess_sponsored" defaultChecked={broker.chess_sponsored} />
        <Checkbox label="SMSF Support" name="smsf_support" defaultChecked={broker.smsf_support} />
        <Checkbox label="Crypto" name="is_crypto" defaultChecked={broker.is_crypto} />
        <Checkbox label="Deal" name="deal" defaultChecked={broker.deal} />
        <Checkbox label="Editor's Pick" name="editors_pick" defaultChecked={broker.editors_pick} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Affiliate URL" name="affiliate_url" defaultValue={broker.affiliate_url} />
        <Field label="CTA Text" name="cta_text" defaultValue={broker.cta_text} />
      </div>

      <Field label="Deal Text" name="deal_text" defaultValue={broker.deal_text} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Regulated By" name="regulated_by" defaultValue={broker.regulated_by} />
        <Field label="Year Founded" name="year_founded" defaultValue={broker.year_founded?.toString()} type="number" />
        <Field label="Headquarters" name="headquarters" defaultValue={broker.headquarters} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextArea label="Pros (one per line)" name="pros" defaultValue={broker.pros?.join("\n")} rows={4} />
        <TextArea label="Cons (one per line)" name="cons" defaultValue={broker.cons?.join("\n")} rows={4} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextArea label="Platforms (one per line)" name="platforms" defaultValue={broker.platforms?.join("\n")} rows={3} />
        <TextArea label="Markets (one per line)" name="markets" defaultValue={broker.markets?.join("\n")} rows={3} />
        <TextArea label="Payment Methods (one per line)" name="payment_methods" defaultValue={broker.payment_methods?.join("\n")} rows={3} />
      </div>

      <TextArea label="Review Content" name="review_content" defaultValue={broker.review_content} rows={6} />

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : broker.id ? "Update Broker" : "Create Broker"}
        </button>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white px-4 py-2.5 text-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue, required, type = "text", ...props }: {
  label: string; name: string; defaultValue?: string; required?: boolean; type?: string;
  [key: string]: unknown;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue || ""}
        required={required}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        {...props}
      />
    </div>
  );
}

function TextArea({ label, name, defaultValue, rows = 3 }: {
  label: string; name: string; defaultValue?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue || ""}
        rows={rows}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      />
    </div>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 rounded bg-slate-700 border-slate-600" />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}
