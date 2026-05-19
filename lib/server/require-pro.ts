import { getSubscription } from "./get-subscription";

export type ProGate = Awaited<ReturnType<typeof getSubscription>>;

export async function requirePro(): Promise<ProGate> {
  return getSubscription();
}

export function gateContent<T>(isPro: boolean, premium: T, free: T): T {
  return isPro ? premium : free;
}

export function truncateText(input: string, maxChars: number): string {
  if (!input) return "";
  if (input.length <= maxChars) return input;
  const slice = input.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

export function truncateHtml(html: string, maxChars: number): string {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, "");
  if (text.length <= maxChars) return html;
  let visible = 0;
  let i = 0;
  let inTag = false;
  while (i < html.length && visible < maxChars) {
    const ch = html[i];
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) visible++;
    i++;
  }
  if (inTag) {
    const tagStart = html.lastIndexOf("<", i);
    if (tagStart > 0) i = tagStart;
  }
  return `${html.slice(0, i)}…`;
}
