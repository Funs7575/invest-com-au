'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { initClientPostHog, getClientPostHog } from '@/lib/posthog/client'

function PostHogPageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)

  useEffect(() => {
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
