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
    void initClientPostHog().then(() => setReady(true))
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
