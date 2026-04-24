'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'
import { initClientPostHog, getClientPostHog } from '@/lib/posthog/client'

function PostHogPageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    void initClientPostHog()
  }, [])

  useEffect(() => {
    const ph = getClientPostHog()
    if (!ph || !pathname) return
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

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
