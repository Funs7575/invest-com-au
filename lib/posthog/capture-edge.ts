import type { EventName, EventProps } from './events'

export function captureEdgeEvent<T extends EventName>(
  distinctId: string,
  name: T,
  props: EventProps[T],
): void {
  const key = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
  if (!key) return
  fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, distinct_id: distinctId, event: name, properties: props }),
  }).catch(() => null)
}
