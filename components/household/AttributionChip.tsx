/**
 * AttributionChip — tiny "yours" / "<partner>" badge for combined household
 * views. Server-safe (no client hooks, no server imports) so either kind of
 * component can render it.
 */
export default function AttributionChip({
  mine,
  partnerLabel,
}: {
  mine: boolean;
  partnerLabel: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${
        mine
          ? "bg-slate-100 text-slate-600"
          : "bg-violet-100 text-violet-700"
      }`}
      title={mine ? "Your item" : `Shared by ${partnerLabel}`}
    >
      {mine ? "Yours" : partnerLabel}
    </span>
  );
}
