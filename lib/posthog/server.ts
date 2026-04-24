import { PostHog } from 'posthog-node'
import type { EventName, EventProps } from './events'

let server: PostHog | null = null

function getServerPostHog(): PostHog | null {
  if (server) return server
  const key = process.env['POSTHOG_API_KEY'] ?? process.env['NEXT_PUBLIC_POSTHOG_KEY']
  const host = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com'
  if (!key) return null
  server = new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
  })
  return server
}

export async function captureServerEvent<T extends EventName>(
  distinctId: string,
  name: T,
  props: EventProps[T],
): Promise<void> {
  const ph = getServerPostHog()
  if (!ph) return
  ph.capture({ distinctId, event: name, properties: props })
  await ph.shutdown()
  server = null
}
