import HubLeadForm from "@/components/leads/HubLeadForm";
import type { ComponentProps } from "react";

interface HubAdvisorCTAProps extends ComponentProps<typeof HubLeadForm> {
  /** Optional className for the root <section>. Defaults to slate background with top border. */
  className?: string;
}

/**
 * <HubAdvisorCTA> — bottom-of-page advisor lead-capture section for hub pages.
 *
 * Wraps <HubLeadForm> in the standard section + container layout extracted
 * from the repeated pattern across hub pages. All HubLeadForm props are
 * forwarded. Use className to override the section background when the page
 * context requires white background or both-side borders.
 *
 * W-06 — hub foundation stream (REMEDIATION_QUEUE.md).
 */
export default function HubAdvisorCTA({ className, ...formProps }: HubAdvisorCTAProps) {
  return (
    <section className={className ?? "py-12 bg-slate-50 border-t border-slate-200"}>
      <div className="container-custom max-w-2xl">
        <HubLeadForm {...formProps} />
      </div>
    </section>
  );
}
