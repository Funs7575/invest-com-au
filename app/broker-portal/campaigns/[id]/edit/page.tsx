"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { Campaign, MarketplacePlacement } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Pill shown next to a label when a field has been changed from its original value
function ModifiedPill() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 leading-none">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Modified
    </span>
  );
}

// Shape we use to record the original loaded values so we can diff against them
interface OriginalValues {
  name: string;
  rateCents: string;
  dailyBudget: string;
  totalBudget: string;
  endDate: string;
  activeHoursStart: number | "";
  activeHoursEnd: number | "";
  activeDays: number[];
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = Number(params.id);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [placement, setPlacement] = useState<MarketplacePlacement | null>(null);
  const [brokerSlug, setBrokerSlug] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [rateCents, setRateCents] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeHoursStart, setActiveHoursStart] = useState<number | "">("");
  const [activeHoursEnd, setActiveHoursEnd] = useState<number | "">("");
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [templateName, setTemplateName] = useState("");

  // ADV-150: snapshot of original values for diff tracking
  const [originalValues, setOriginalValues] = useState<OriginalValues | null>(null);

  const isLive = campaign?.status === "active" || campaign?.status === "approved";

  // ADV-141: inline time-range error derived from current select values
  const timeRangeError =
    activeHoursStart !== "" &&
    activeHoursEnd !== "" &&
    activeHoursEnd <= activeHoursStart
      ? "End time must be after start time."
      : null;

  // ADV-150: compute which field keys have been modified from original
  const modifiedFields = useMemo<Set<string>>(() => {
    if (!originalValues) return new Set();
    const changed = new Set<string>();
    if (name !== originalValues.name) changed.add("name");
    if (rateCents !== originalValues.rateCents) changed.add("rateCents");
    if (dailyBudget !== originalValues.dailyBudget) changed.add("dailyBudget");
    if (totalBudget !== originalValues.totalBudget) changed.add("totalBudget");
    if (endDate !== originalValues.endDate) changed.add("endDate");
    if (activeHoursStart !== originalValues.activeHoursStart) changed.add("activeHoursStart");
    if (activeHoursEnd !== originalValues.activeHoursEnd) changed.add("activeHoursEnd");
    const sortedCurrent = [...activeDays].sort((a, b) => a - b).join(",");
    const sortedOriginal = [...originalValues.activeDays].sort((a, b) => a - b).join(",");
    if (sortedCurrent !== sortedOriginal) changed.add("activeDays");
    return changed;
  }, [
    originalValues,
    name,
    rateCents,
    dailyBudget,
    totalBudget,
    endDate,
    activeHoursStart,
    activeHoursEnd,
    activeDays,
  ]);

  // ADV-150: human-readable label map for summary sentence
  const FIELD_LABELS: Record<string, string> = {
    name: "Campaign Name",
    rateCents: "Rate",
    dailyBudget: "Daily Budget",
    totalBudget: "Total Budget",
    endDate: "End Date",
    activeHoursStart: "Active Hours Start",
    activeHoursEnd: "Active Hours End",
    activeDays: "Active Days",
  };

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/broker-portal/login");
        return;
      }

      // Verify broker ownership
      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) {
        router.push("/broker-portal/login");
        return;
      }
      setBrokerSlug(account.broker_slug);

      // Fetch campaign with placement join
      const { data: campaignData, error: fetchErr } = await supabase
        .from("campaigns")
        .select("*, marketplace_placements(*)")
        .eq("id", campaignId)
        .maybeSingle();

      if (fetchErr || !campaignData) {
        setError("Campaign not found.");
        setLoading(false);
        return;
      }

      // Verify campaign belongs to this broker
      if (campaignData.broker_slug !== account.broker_slug) {
        setError("You do not have permission to edit this campaign.");
        setLoading(false);
        return;
      }

      const c = campaignData as Campaign & { marketplace_placements: MarketplacePlacement };
      setCampaign(c);

      // Extract placement from join
      const p = c.marketplace_placements;
      if (p) setPlacement(p as MarketplacePlacement);

      // Populate form fields
      const nameVal = c.name;
      const rateVal = (c.rate_cents / 100).toFixed(2);
      const dailyVal = c.daily_budget_cents ? (c.daily_budget_cents / 100).toString() : "";
      const totalVal = c.total_budget_cents ? (c.total_budget_cents / 100).toString() : "";
      const endVal = c.end_date?.slice(0, 10) || "";
      const hoursStartVal = c.active_hours_start ?? "";
      const hoursEndVal = c.active_hours_end ?? "";
      const daysVal = c.active_days ?? [0, 1, 2, 3, 4, 5, 6];

      setName(nameVal);
      setRateCents(rateVal);
      setDailyBudget(dailyVal);
      setTotalBudget(totalVal);
      setEndDate(endVal);
      setActiveHoursStart(hoursStartVal);
      setActiveHoursEnd(hoursEndVal);
      setActiveDays(daysVal);
      setTemplateName(`${c.name} Template`);

      // ADV-150: snapshot originals
      setOriginalValues({
        name: nameVal,
        rateCents: rateVal,
        dailyBudget: dailyVal,
        totalBudget: totalVal,
        endDate: endVal,
        activeHoursStart: hoursStartVal,
        activeHoursEnd: hoursEndVal,
        activeDays: daysVal,
      });

      setLoading(false);
    };
    load();
  }, [campaignId, router]);

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    const rate = Math.round(parseFloat(rateCents) * 100);
    if (!rate || rate <= 0) {
      setError("Rate must be greater than $0.");
      return;
    }

    if (placement?.base_rate_cents && rate < placement.base_rate_cents) {
      setError(
        `Minimum rate for this placement is $${(placement.base_rate_cents / 100).toFixed(2)}`
      );
      return;
    }

    if (activeHoursStart !== "" && activeHoursEnd !== "" && activeHoursStart === activeHoursEnd) {
      setError("Active hours start and end cannot be the same.");
      return;
    }

    // ADV-141: block save when end time is not after start time
    if (timeRangeError) {
      setError(timeRangeError);
      return;
    }

    if (activeDays.length === 0) {
      setError("Select at least one active day.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({
          name: name.trim(),
          rate_cents: rate,
          daily_budget_cents: dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : null,
          total_budget_cents: totalBudget ? Math.round(parseFloat(totalBudget) * 100) : null,
          end_date: endDate || null,
          active_hours_start: activeHoursStart !== "" ? Number(activeHoursStart) : null,
          active_hours_end: activeHoursEnd !== "" ? Number(activeHoursEnd) : null,
          active_days: activeDays.length === 7 ? null : activeDays,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }

      toast("Campaign updated", "success");
      router.push("/broker-portal/campaigns");
    } catch {
      setError("Failed to save changes.");
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast("Please enter a template name", "error");
      return;
    }

    setSavingTemplate(true);

    try {
      const supabase = createClient();
      const { error: templateErr } = await supabase.from("campaign_templates").insert({
        broker_slug: brokerSlug,
        name: templateName.trim(),
        placement_id: campaign?.placement_id || null,
        inventory_type: campaign?.inventory_type || null,
        rate_cents: rateCents ? Math.round(parseFloat(rateCents) * 100) : null,
        daily_budget_cents: dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : null,
        total_budget_cents: totalBudget ? Math.round(parseFloat(totalBudget) * 100) : null,
        active_hours_start: activeHoursStart !== "" ? Number(activeHoursStart) : null,
        active_hours_end: activeHoursEnd !== "" ? Number(activeHoursEnd) : null,
        active_days: activeDays.length === 7 ? null : activeDays,
      });

      if (templateErr) {
        toast("Failed to save template: " + templateErr.message, "error");
        setSavingTemplate(false);
        return;
      }

      toast("Template saved", "success");
      setSavingTemplate(false);
    } catch {
      toast("Failed to save template", "error");
      setSavingTemplate(false);
    }
  };

  /* ─────── Loading skeleton ─────── */
  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-slate-100 rounded-lg w-64 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-96 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-slate-100 rounded w-32 animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <div className="h-10 bg-slate-100 rounded-lg w-36 animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-lg w-36 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  /* ─────── Error state ─────── */
  if (error && !campaign) {
    return (
      <div className="max-w-2xl">
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="alert-circle" size={14} />
          {error}
        </div>
        <button
          onClick={() => router.push("/broker-portal/campaigns")}
          className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  // ADV-085: shared classes for disabled read-only fields on live campaigns
  const lockedFieldCls =
    "w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Edit Campaign</h1>
        <p className="text-sm text-slate-500">
          Update settings for <span className="font-medium text-slate-700">{campaign?.name}</span>
          {placement && (
            <span>
              {" "}
              &middot; {placement.name} ({campaign?.inventory_type?.toUpperCase()})
            </span>
          )}
        </p>
      </div>

      {/* Live campaign warning */}
      {isLive && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          <Icon name="alert-triangle" size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">This campaign is currently {campaign?.status}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Rate and budget changes will take effect immediately. Adjusting the rate may affect
              your ad placement competitiveness.
            </p>
          </div>
        </div>
      )}

      {/* Form error */}
      {error && campaign && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="alert-circle" size={14} />
          {error}
        </div>
      )}

      {/* Main form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Section: General */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon name="edit-3" size={14} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-900">General</h3>
        </div>

        {/* ADV-085: Placement (read-only for live campaigns) */}
        {placement && (
          <div>
            <label
              htmlFor="camp-placement"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Placement
              {isLive && (
                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 leading-none">
                  <Icon name="lock" size={9} />
                  Locked
                </span>
              )}
            </label>
            <input
              id="camp-placement"
              type="text"
              value={`${placement.name} (${campaign?.inventory_type?.toUpperCase()})`}
              readOnly
              disabled={isLive}
              title={
                isLive
                  ? "Cannot edit placement or start date for active campaigns."
                  : undefined
              }
              className={lockedFieldCls}
            />
          </div>
        )}

        {/* Campaign name */}
        <div>
          <label htmlFor="camp-name" className="block text-sm font-medium text-slate-700 mb-1">
            Campaign Name *
            <InfoTip text="A name for your reference only -- not shown to users." />
            {modifiedFields.has("name") && <ModifiedPill />}
          </label>
          <input
            id="camp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
        </div>

        {/* Rate */}
        <div>
          <label htmlFor="camp-rate" className="block text-sm font-medium text-slate-700 mb-1">
            Rate (AUD) * &mdash;{" "}
            {campaign?.inventory_type === "cpc" ? "per click" : "per month"}
            {campaign?.inventory_type === "cpc" ? (
              <InfoTip text="The amount you pay each time a user clicks your ad. Higher rates may win more placement opportunities." />
            ) : (
              <InfoTip text="Fixed monthly fee for this featured placement." />
            )}
            {modifiedFields.has("rateCents") && <ModifiedPill />}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
            <input
              id="camp-rate"
              type="number"
              step="0.01"
              min="0.01"
              value={rateCents}
              onChange={(e) => setRateCents(e.target.value)}
              required
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            />
          </div>
          {placement?.base_rate_cents && (
            <p className="text-xs text-slate-400 mt-1">
              Minimum: ${(placement.base_rate_cents / 100).toFixed(2)}
              {campaign?.inventory_type === "cpc" ? "/click" : "/mo"}
            </p>
          )}
        </div>

        {/* Budget */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="camp-daily-budget" className="block text-sm font-medium text-slate-700 mb-1">
              Daily Budget (AUD)
              <span className="text-xs text-slate-400 ml-1">optional</span>
              <InfoTip text="Maximum amount charged per day. Prevents unexpected high-spend days. Leave blank for unlimited." />
              {modifiedFields.has("dailyBudget") && <ModifiedPill />}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
              <input
                id="camp-daily-budget"
                type="number"
                step="1"
                min="1"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="No limit"
              />
            </div>
          </div>
          <div>
            <label htmlFor="camp-total-budget" className="block text-sm font-medium text-slate-700 mb-1">
              Total Budget (AUD)
              <span className="text-xs text-slate-400 ml-1">optional</span>
              <InfoTip text="Maximum cumulative spend for the entire campaign. Campaign automatically pauses when reached." />
              {modifiedFields.has("totalBudget") && <ModifiedPill />}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
              <input
                id="camp-total-budget"
                type="number"
                step="1"
                min="1"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="No limit"
              />
            </div>
            {campaign?.total_budget_cents && campaign.total_spent_cents > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                ${(campaign.total_spent_cents / 100).toFixed(2)} spent of $
                {(campaign.total_budget_cents / 100).toFixed(0)} budget (
                {Math.round((campaign.total_spent_cents / campaign.total_budget_cents) * 100)}%)
              </p>
            )}
          </div>
        </div>

        {/* End date */}
        <div>
          <label htmlFor="camp-end-date" className="block text-sm font-medium text-slate-700 mb-1">
            End Date
            <span className="text-xs text-slate-400 ml-1">optional</span>
            {modifiedFields.has("endDate") && <ModifiedPill />}
          </label>
          <input
            id="camp-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
          {campaign?.start_date && (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Icon name="lock" size={10} className={isLive ? "text-amber-500" : ""} />
                {isLive ? "Start date locked (campaign is live):" : "Started:"}{" "}
                {campaign.start_date.slice(0, 10)}
              </p>
              {/* ADV-085: visually disabled start-date field for live campaigns */}
              {isLive && (
                <input
                  type="date"
                  value={campaign.start_date.slice(0, 10)}
                  readOnly
                  disabled={true}
                  title="Cannot edit placement or start date for active campaigns."
                  className={lockedFieldCls}
                  aria-label="Start date (locked)"
                />
              )}
            </div>
          )}
        </div>
      </form>

      {/* Dayparting section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Icon name="clock" size={14} className="text-purple-600" />
          </div>
          <h3 className="font-bold text-slate-900">Dayparting</h3>
          <InfoTip text="Control when your campaign runs. Restrict to specific hours of the day and days of the week to target peak traffic times." />
        </div>

        {/* Active hours */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="camp-hours-start" className="block text-sm font-medium text-slate-700 mb-1">
              Active Hours Start
              <span className="text-xs text-slate-400 ml-1">optional</span>
              {modifiedFields.has("activeHoursStart") && <ModifiedPill />}
            </label>
            <select
              id="camp-hours-start"
              value={activeHoursStart}
              onChange={(e) =>
                setActiveHoursStart(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 bg-white"
            >
              <option value="">All day</option>
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00{" "}
                  {h === 0
                    ? "(midnight)"
                    : h === 12
                      ? "(noon)"
                      : h < 12
                        ? "AM"
                        : "PM"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="camp-hours-end" className="block text-sm font-medium text-slate-700 mb-1">
              Active Hours End
              <span className="text-xs text-slate-400 ml-1">optional</span>
              {modifiedFields.has("activeHoursEnd") && <ModifiedPill />}
            </label>
            <select
              id="camp-hours-end"
              value={activeHoursEnd}
              onChange={(e) =>
                setActiveHoursEnd(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 bg-white ${
                timeRangeError
                  ? "border-red-400 focus:border-red-400 focus:ring-red-300/30"
                  : "border-slate-200 focus:border-slate-400"
              }`}
            >
              <option value="">All day</option>
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00{" "}
                  {h === 0
                    ? "(midnight)"
                    : h === 12
                      ? "(noon)"
                      : h < 12
                        ? "AM"
                        : "PM"}
                </option>
              ))}
            </select>
            {/* ADV-141: inline time-range error */}
            {timeRangeError && (
              <p role="alert" className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <Icon name="alert-circle" size={11} />
                {timeRangeError}
              </p>
            )}
          </div>
        </div>
        {activeHoursStart !== "" && activeHoursEnd !== "" && !timeRangeError && (
          <p className="text-xs text-slate-500">
            Campaign will run from{" "}
            <span className="font-medium">
              {String(activeHoursStart).padStart(2, "0")}:00
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {String(activeHoursEnd).padStart(2, "0")}:00
            </span>{" "}
            (AEST)
          </p>
        )}

        {/* Active days */}
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-2">
            Active Days
            <InfoTip text="Uncheck days when you want the campaign to be paused. Days are stored as 0 (Sunday) through 6 (Saturday)." />
            {modifiedFields.has("activeDays") && <ModifiedPill />}
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, index) => {
              const isActive = activeDays.includes(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {activeDays.length < 7 && activeDays.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Active on: {activeDays.map((d) => DAY_LABELS[d]).join(", ")}
            </p>
          )}
          {activeDays.length === 7 && (
            <p className="text-xs text-slate-400 mt-2">Running every day of the week</p>
          )}
        </div>
      </div>

      {/* Save as template section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Icon name="bookmark" size={14} className="text-amber-600" />
          </div>
          <h3 className="font-bold text-slate-900">Save as Template</h3>
          <InfoTip text="Save the current campaign settings as a reusable template for future campaigns." />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="ce-template-name" className="block text-sm font-medium text-slate-700 mb-1">
              Template Name
            </label>
            <input
              id="ce-template-name"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Standard CPC Settings"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || !templateName.trim()}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {savingTemplate ? "Saving..." : "Save as Template"}
          </button>
        </div>
      </div>

      {/* ADV-150: Changed fields summary */}
      {modifiedFields.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <Icon name="edit-3" size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">{modifiedFields.size} field{modifiedFields.size !== 1 ? "s" : ""} changed:</span>{" "}
            {Array.from(modifiedFields)
              .map((k) => FIELD_LABELS[k] ?? k)
              .join(", ")}
            .
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          onClick={handleSave}
          disabled={saving || !!timeRangeError}
          className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/broker-portal/campaigns")}
          className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Campaign metadata */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-1">
        <p className="text-xs text-slate-400">
          Campaign ID: {campaign?.id} &middot; Status:{" "}
          <span className="font-medium text-slate-600">
            {campaign?.status?.replace(/_/g, " ")}
          </span>
        </p>
        <p className="text-xs text-slate-400">
          Created: {campaign?.created_at ? new Date(campaign.created_at).toLocaleDateString("en-AU") : "---"}{" "}
          &middot; Last updated:{" "}
          {campaign?.updated_at ? new Date(campaign.updated_at).toLocaleDateString("en-AU") : "---"}
        </p>
        {campaign?.review_notes && (
          <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg mt-2">
            <strong>Review note:</strong> {campaign.review_notes}
          </div>
        )}
      </div>
    </div>
  );
}
