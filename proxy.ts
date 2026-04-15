import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Request ID stamping ────────────────────────────────────────
  // Every request gets a stable x-request-id so Sentry events, Vercel
  // logs, Supabase logs and client-side error reports can be
  // correlated back to a single user request. Honours upstream
  // x-request-id or x-vercel-id if the CDN already attached one,
  // otherwise generates a fresh UUID. The id is echoed on the
  // response so browser DevTools / support can quote it.
  const requestId =
    request.headers.get('x-request-id') ||
    request.headers.get('x-vercel-id') ||
    crypto.randomUUID()

  // ── Cron route protection ──────────────────────────────────────
  // Vercel cron jobs send a Bearer token — reject unauthorized callers.
  if (pathname.startsWith('/api/cron/')) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const cronResponse = NextResponse.next()
    cronResponse.headers.set('x-request-id', requestId)
    return cronResponse
  }

  // Mutate request headers so downstream route handlers can read
  // x-request-id via request.headers.get('x-request-id').
  const forwardedHeaders = new Headers(request.headers)
  forwardedHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: { headers: forwardedHeaders },
  })
  response.headers.set('x-request-id', requestId)

  // ── Security headers ─────────────────────────────────────────
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // ── Content Security Policy (nonce-based for scripts) ───────────
  // Per-request nonce so inline <script> from the Next.js runtime and
  // our own <Script nonce={...} /> tags can execute while still
  // blocking arbitrary injected scripts. 'strict-dynamic' means any
  // script loaded by a nonce'd script is also trusted, so we don't
  // need to allowlist every analytics/gtm/Sentry origin individually.
  //
  // style-src keeps 'unsafe-inline' because Tailwind JIT + the
  // Next.js runtime emit inline style blocks that we can't nonce
  // without rewriting every component. This is a known, documented
  // residual risk — XSS via style injection is much narrower than
  // script injection and doesn't give code execution.
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = Buffer.from(nonceBytes).toString('base64')

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    // The 'unsafe-inline' above is IGNORED by browsers that understand
    // 'strict-dynamic' + nonce, but kept as a fallback for older
    // browsers that don't. https: same.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://api.stripe.com https://cal.com https://app.cal.com https://*.sentry.io https://*.ingest.sentry.io",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com https://player.vimeo.com https://cal.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ]
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))

  // Make the nonce available to React Server Components via request
  // header. Next.js 16's <Script nonce={headers().get('x-nonce')} />
  // pattern reads it from here.
  forwardedHeaders.set('x-nonce', nonce)

  // ── Preview deploy protection ──────────────────────────────────
  // Vercel sets VERCEL_ENV to 'preview' on non-production branches.
  // Inject noindex header so Google never indexes staging/preview URLs.
  if (process.env.VERCEL_ENV === 'preview') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  // ── Private portal noindex ──────────────────────────────────────
  // Portal pages are behind auth and should never be indexed. Apply
  // the header here rather than trying to export metadata from each
  // "use client" portal page.tsx (which Next.js doesn't allow).
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/broker-portal') ||
    pathname.startsWith('/advisor-portal') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/invest/my-listings') ||
    pathname.startsWith('/advisor-apply')
  ) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet')
  }

  // ── Protected route detection ─────────────────────────────────
  const isAdmin = pathname.startsWith('/admin')
  const isBrokerPortal = pathname.startsWith('/broker-portal')
  const isProtected = isAdmin || isBrokerPortal

  // Skip auth for login/register/callback pages
  const isAuthPage =
    pathname === '/admin/login' ||
    pathname === '/broker-portal/login' ||
    pathname === '/broker-portal/register' ||
    pathname === '/auth/callback'

  // Only initialise Supabase auth for protected paths to avoid ~50ms
  // latency on every public page request.
  if (isProtected) {
    let supabaseResponse = NextResponse.next({ request })

    // Copy preview noindex header to supabase response if set
    if (process.env.VERCEL_ENV === 'preview') {
      supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            // Re-apply preview header after response recreation
            if (process.env.VERCEL_ENV === 'preview') {
              supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow')
            }
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Do not add code between createServerClient and getUser().
    const { data: { user } } = await supabase.auth.getUser()

    // ── Admin route protection ───────────────────────────────────
    if (isAdmin) {
      if (!pathname.startsWith('/admin/login')) {
        if (!user) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin/login'
          url.searchParams.set('redirect', pathname)
          const redirectResponse = NextResponse.redirect(url)
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
          return redirectResponse
        }

        // Only allow admin emails — use strict allowlist (consistent with API routes)
        const adminEmails = (process.env.ADMIN_EMAILS || 'admin@invest.com.au,finn@invest.com.au').split(',').map(e => e.trim().toLowerCase());
        const isAdminUser = adminEmails.includes(user.email?.toLowerCase() || '');
        if (!isAdminUser) {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          const redirectResponse = NextResponse.redirect(url)
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
          return redirectResponse
        }
      }

      // Redirect logged-in admins away from login page
      if (pathname === '/admin/login' && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    }

    // ── Broker portal route protection ───────────────────────────
    if (isBrokerPortal && !isAuthPage) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/broker-portal/login'
        url.searchParams.set('redirect', pathname)
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    }

    // Redirect logged-in brokers away from login page
    if (pathname === '/broker-portal/login' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/broker-portal'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    return supabaseResponse
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
