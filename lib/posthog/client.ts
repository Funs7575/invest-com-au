import type { PostHog as PostHogBrowser } from 'posthog-js'

let client: PostHogBrowser | null = null

export function getClientPostHog(): PostHogBrowser | null {
  return client
}

export async function initClientPostHog(): Promise<PostHogBrowser | null> {
  if (typeof window === 'undefined') return null
  if (client) return client

  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
  const host = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com'
  if (!key) return null

  const mod = await import('posthog-js')
  const posthog = mod.default

  posthog.init(key, {
    api_host: host,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
  })

  client = posthog
  return client
}
