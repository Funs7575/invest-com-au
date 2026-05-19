'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { initClientPostHog, getClientPostHog } from '@/lib/posthog/client'
import { hasAnalyticsConsent } from '@/lib/consent'

function PostHogPageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Only initialise PostHog after the user has accepted analytics cookies.
    // Without this gate, PostHog would start capturing sessions for all
    // visitors, including those who have not yet responded to the cookie
    // banner — a consent gap under the Australian Privacy Act.
    if (!hasAnalyticsConsent()) return
    // Defer to browser idle so PostHog's 189 kB SDK download/parse
    // doesn't compete with the LCP image / first interaction. Falls
    // back to a 2s timeout on browsers without requestIdleCallback
    // (covers older Safari / Firefox / SSR safety).
    const ric =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) =>
            (window as Window & typeof globalThis).requestIdleCallback!(cb, {
              timeout: 4000,
            })
        : (cb: () => void) => window.setTimeout(cb, 2000)
    const handle = ric(() => {
      void initClientPostHog().then(() => setReady(true))
    })
    return () => {
      if (
        typeof handle === 'number' &&
        typeof window !== 'undefined' &&
        'cancelIdleCallback' in window
      ) {
        ;(
          window as Window & typeof globalThis
        ).cancelIdleCallback?.(handle as unknown as number)
      } else if (typeof handle === 'number') {
        window.clearTimeout(handle)
      }
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const ph = getClientPostHog()
    if (!ph || !pathname) return
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    ph.capture('$pageview', { $current_url: url })
  }, [ready, pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageviewTracker />
      </Suspense>
      {children}
    </>
  )
}
