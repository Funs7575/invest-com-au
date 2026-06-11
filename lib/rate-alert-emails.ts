/**
 * Rate-alert email renderers — pure, side-effect-free, snapshot-testable.
 *
 * Two email kinds, both strictly FACTUAL (lean-lane per
 * docs/strategy/REGULATORY-AVOID-LIST.md — no "you should switch/refinance"
 * advice language, no suitability assessment):
 *
 *   - threshold alert : "<metric> crossed your <threshold>" — sent by the
 *     rate-alerts cron when a user-defined threshold is crossed.
 *   - rate-change digest : "<n> rate changes since your last update" — sent
 *     to any-change subscribers from rate_change_log entries.
 *
 * Every email carries:
 *   - a tokenised manage-preferences link (/rate-alerts/manage?token=…)
 *   - a one-click unsubscribe link (/rate-alerts?unsubscribe=…)
 *   - the GENERAL_ADVICE_WARNING from lib/compliance.ts
 */

import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  metricKindLabel,
  metricKindPath,
  type AlertDirection,
  type MetricKind,
} from "@/lib/alert-thresholds";

// ── Shared link builders ──────────────────────────────────────────────────────

export function managePrefsUrl(siteUrl: string, unsubscribeToken: string): string {
  return `${siteUrl}/rate-alerts/manage?token=${encodeURIComponent(unsubscribeToken)}`;
}

export function unsubscribeUrl(siteUrl: string, unsubscribeToken: string): string {
  return `${siteUrl}/rate-alerts?unsubscribe=${encodeURIComponent(unsubscribeToken)}`;
}

// ── Shared chrome ─────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(title: string, content: string, footer: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
      <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:18px">${escapeHtml(title)}</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        ${content}
        ${footer}
      </div>
    </div>
  `;
}

/**
 * Compliance + list-management footer appended to every alert email.
 * Spam Act 2003: functional unsubscribe; AFSL lean-lane: general-advice
 * warning on every send.
 */
function complianceFooter(siteUrl: string, unsubscribeToken: string): string {
  const manage = managePrefsUrl(siteUrl, unsubscribeToken);
  const unsub = unsubscribeUrl(siteUrl, unsubscribeToken);
  return `
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0">
          <p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0">
            This is a factual market-data notification you asked for — it is not a
            recommendation to acquire, hold, or switch any product.
          </p>
          <p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:8px 0 0">
            ${escapeHtml(GENERAL_ADVICE_WARNING)}
          </p>
          <p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:8px 0 0">
            <a href="${manage}" style="color:#64748b;text-decoration:underline">Manage preferences</a>
            &nbsp;&middot;&nbsp;
            <a href="${unsub}" style="color:#64748b;text-decoration:underline">Unsubscribe</a>
            &nbsp;&middot;&nbsp;
            <a href="${siteUrl}/privacy" style="color:#64748b;text-decoration:underline">Privacy</a>
          </p>
        </div>
  `;
}

function footerText(siteUrl: string, unsubscribeToken: string): string {
  return [
    "This is a factual market-data notification you asked for — it is not a recommendation to acquire, hold, or switch any product.",
    GENERAL_ADVICE_WARNING,
    `Manage preferences: ${managePrefsUrl(siteUrl, unsubscribeToken)}`,
    `Unsubscribe: ${unsubscribeUrl(siteUrl, unsubscribeToken)}`,
  ].join("\n\n");
}

// ── Threshold alert ───────────────────────────────────────────────────────────

export interface ThresholdEmailInput {
  siteUrl: string;
  metricKind: MetricKind;
  direction: AlertDirection;
  /** User threshold in basis points (or cents for broker_fee). */
  thresholdBps: number;
  /** Current market value in basis points (or cents for broker_fee). */
  currentValueBps: number;
  unsubscribeToken: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function formatValue(kind: MetricKind, bps: number): string {
  const asUnits = (bps / 100).toFixed(2);
  return kind === "broker_fee" ? `$${asUnits}` : `${asUnits}% p.a.`;
}

function formatThreshold(kind: MetricKind, bps: number): string {
  const asUnits = (bps / 100).toFixed(2);
  return kind === "broker_fee" ? `$${asUnits}` : `${asUnits}%`;
}

export function renderThresholdAlertEmail(input: ThresholdEmailInput): RenderedEmail {
  const label = metricKindLabel(input.metricKind);
  const path = metricKindPath(input.metricKind);
  const directionText = input.direction === "above" ? "crossed above" : "dropped below";
  const threshold = formatThreshold(input.metricKind, input.thresholdBps);
  const current = formatValue(input.metricKind, input.currentValueBps);
  const compareUrl = `${input.siteUrl}${path}`;

  const subject = `Rate alert: ${label} ${directionText} ${threshold}`;

  const content = `
        <p style="font-size:15px;margin-top:0">
          The <strong>${escapeHtml(label)}</strong> just ${directionText} the
          <strong>${escapeHtml(threshold)}</strong> threshold you set.
        </p>
        <p style="font-size:14px;color:#64748b">
          Current value: <strong>${escapeHtml(current)}</strong>
        </p>
        <div style="text-align:center;margin:20px 0">
          <a href="${compareUrl}"
             style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            See current rates &rarr;
          </a>
        </div>
  `;

  const html = emailShell(
    "Rate Alert",
    content,
    complianceFooter(input.siteUrl, input.unsubscribeToken),
  );

  const text = [
    `The ${label} just ${directionText} the ${threshold} threshold you set.`,
    `Current value: ${current}`,
    `See current rates: ${compareUrl}`,
    "",
    footerText(input.siteUrl, input.unsubscribeToken),
  ].join("\n");

  return { subject, html, text };
}

// ── Rate-change digest ────────────────────────────────────────────────────────

export interface RateChangeItem {
  brokerName: string;
  productKind: string; // 'savings_account' | 'term_deposit'
  oldRateBps: number | null;
  newRateBps: number;
  direction: "up" | "down" | "new";
}

export interface RateChangesEmailInput {
  siteUrl: string;
  metricKind: MetricKind; // savings_rate | term_deposit
  changes: RateChangeItem[];
  unsubscribeToken: string;
}

function productKindLabel(productKind: string): string {
  return productKind === "term_deposit" ? "term deposit" : "savings account";
}

function changeLine(change: RateChangeItem): string {
  const newPct = (change.newRateBps / 100).toFixed(2);
  if (change.direction === "new" || change.oldRateBps === null) {
    return `${change.brokerName} listed a new ${productKindLabel(change.productKind)} rate: ${newPct}% p.a.`;
  }
  const oldPct = (change.oldRateBps / 100).toFixed(2);
  const verb = change.direction === "up" ? "raised" : "lowered";
  return `${change.brokerName} ${verb} its ${productKindLabel(change.productKind)} rate: ${oldPct}% → ${newPct}% p.a.`;
}

export function renderRateChangesEmail(input: RateChangesEmailInput): RenderedEmail {
  const label = metricKindLabel(input.metricKind);
  const path = metricKindPath(input.metricKind);
  const compareUrl = `${input.siteUrl}${path}`;
  const count = input.changes.length;

  const subject = `Rate update: ${count} ${label} change${count === 1 ? "" : "s"}`;

  const rows = input.changes
    .map((change) => {
      const arrow =
        change.direction === "up" ? "&#9650;" : change.direction === "down" ? "&#9660;" : "&bull;";
      const colour =
        change.direction === "up" ? "#047857" : change.direction === "down" ? "#b91c1c" : "#64748b";
      return `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155">
              <span style="color:${colour};font-size:11px">${arrow}</span>
              ${escapeHtml(changeLine(change))}
            </td>
          </tr>`;
    })
    .join("");

  const content = `
        <p style="font-size:15px;margin-top:0">
          ${count} ${escapeHtml(label)} change${count === 1 ? "" : "s"} since your last update:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${rows}
        </table>
        <div style="text-align:center;margin:20px 0 0">
          <a href="${compareUrl}"
             style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            See current rates &rarr;
          </a>
        </div>
  `;

  const html = emailShell(
    "Rate Update",
    content,
    complianceFooter(input.siteUrl, input.unsubscribeToken),
  );

  const text = [
    `${count} ${label} change${count === 1 ? "" : "s"} since your last update:`,
    "",
    ...input.changes.map((change) => `- ${changeLine(change)}`),
    "",
    `See current rates: ${compareUrl}`,
    "",
    footerText(input.siteUrl, input.unsubscribeToken),
  ].join("\n");

  return { subject, html, text };
}
