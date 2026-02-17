export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getMostRecentFeeCheck(brokers: { fee_last_checked?: string | null }[]): string | null {
  let latest: string | null = null;
  for (const b of brokers) {
    if (b.fee_last_checked && (!latest || b.fee_last_checked > latest)) {
      latest = b.fee_last_checked;
    }
  }
  return latest;
}
