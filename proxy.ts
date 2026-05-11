import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyMfaCookieEdge, MFA_COOKIE_NAME } from '@/lib/admin-mfa-cookie-edge'

// Admin paths where the MFA step-up page itself lives — must never be
// gated, otherwise they redirect to themselves infinitely.
const ADMIN_MFA_EXEMPT = [
  '/admin/login',
  '/admin/mfa/verify',
  '/admin/settings/mfa',
]

// Timing-safe Bearer token comparison for the Edge runtime.
// Node's `crypto.timingSafeEqual` is unavailable in Edge; this XOR loop
// achieves the same constant-time property using the Buffer polyfill that
// Next.js already ships to Edge middleware (evidenced by the nonce encoding
// below). Consistent with the broker-signup / partner-API pattern used in
// route handlers that run on Node.
function cronTokensMatch(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const aBuf = Buffer.from(token)
  const bBuf = Buffer.from(secret)
  if (aBuf.length !== bBuf.length) return false
  let diff = 0
  for (let i = 0; i < aBuf.length; i++) {
    diff |= (aBuf[i] as number) ^ (bBuf[i] as number)
  }
  return diff === 0
}

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
    const secret = process.env.CRON_SECRET
    if (!secret || !cronTokensMatch(request.headers.get('authorization'), secret)) {
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
  // Country Mode / Language Mode: stamp the pathname so the root
  // layout can derive the active locale from the URL prefix and set
  // <html lang> + <html dir> dynamically. Server components have no
  // other way to read the pathname for root layouts (no params).
  forwardedHeaders.set('x-pathname', pathname)

  const response = NextResponse.next({
    request: { headers: forwardedHeaders },
  })
  response.headers.set('x-request-id', requestId)

  // ── Security headers ─────────────────────────────────────────
  // K-05 (audit 2026-04-26 §7 SEC-05): canonical X-Frame-Options and
  // Permissions-Policy live here. Both used to be duplicated in
  // `next.config.ts:headers` with conflicting values:
  //   - X-Frame-Options: this file had `SAMEORIGIN`, next.config had
  //     `DENY`. Browsers picked the most-restrictive (DENY); aligned
  //     here so the source-of-truth matches the effective policy.
  //   - Permissions-Policy: this file had `geolocation=()` (none),
  //     next.config had `geolocation=(self)` (allow same-origin).
  //     Multiple Permissions-Policy headers combine to the LEAST
  //     permissive — `none` was winning, silently blocking the
  //     property/postcode geolocation features. Realigned to `(self)`
  //     to preserve those features.
  // The conflicting copies have been removed from next.config.ts;
  // X-Content-Type-Options + Referrer-Policy + X-DNS-Prefetch-Control
  // + HSTS remain in both places because their values are identical
  // (no drift), and the next.config copy covers the static-asset
  // paths excluded from this middleware's matcher.
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), gyroscope=(), magnetometer=(), midi=(), ambient-light-sensor=(), battery=(), screen-wake-lock=()'
  )
  // Spectre/side-channel isolation: allow popups so Supabase OAuth flows work.
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // ── Content Security Policy (nonce-based for scripts) ───────────
  // Per-request nonce so inline <script> from the Next.js runtime and
  // our own <Script nonce={...} /> tags can execute while still
  // blocking arbitrary injected scripts. 'strict-dynamic' means any
  // script loaded by a nonce'd script is also trusted, so we don't
  // need to allowlist every analytics/gtm/Sentry origin individually.
  //
  // K-04 (audit 2026-04-26 §7 SEC-04): dropped 'unsafe-inline' from
  // script-src. Modern browsers (CSP3 — Chrome 52+, Firefox 52+,
  // Edge 79+, Safari 15.4+) ignore 'unsafe-inline' when 'strict-dynamic'
  // is present, so it was already a no-op for >95% of AU traffic. In
  // legacy CSP2 browsers (Safari < 15.4 etc.), the `https:` host-source
  // fallback still permits any HTTPS-served script; only TRULY inline
  // <script>…</script> blocks without a nonce are now blocked. Next.js
  // 16 auto-nonces framework-emitted inline scripts via the x-nonce
  // header propagation below, and our own <Script /> usages all carry
  // an explicit nonce, so there is no expected breakage path.
  //
  // style-src keeps 'unsafe-inline' because Tailwind JIT + the
  // Next.js runtime emit inline style blocks that we can't nonce
  // without rewriting every component. This is a known, documented
  // residual risk — XSS via style injection is much narrower than
  // script injection and doesn't give code execution.
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = Buffer.from(nonceBytes).toString('base64')

  // K-15 (audit 2026-04-26 §7 SEC-04 follow-up): CSP violation reporting.
  // The Report-To header defines a named endpoint group; the `report-to`
  // directive in the CSP tells browsers to POST violations there. Browsers
  // send `application/reports+json` for report-to and `application/csp-report`
  // for the legacy `report-uri` fallback — both are accepted by the endpoint.
  // max_age=86400 (24h) so the browser re-fetches the endpoint config daily.
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://invest.com.au'
  const cspReportEndpoint = `${siteOrigin}/api/csp-report`
  response.headers.set(
    'Report-To',
    JSON.stringify({
      group: 'invest-csp',
      max_age: 86400,
      endpoints: [{ url: cspReportEndpoint }],
    })
  )

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    // The `https:` host-source above is the fallback for legacy CSP2
    // browsers that don't understand 'strict-dynamic'. CSP3 browsers
    // ignore both `https:` and the strict-dynamic-shadowed sources.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://api.stripe.com https://cal.com https://app.cal.com https://*.sentry.io https://*.ingest.sentry.io https://eu.i.posthog.com https://us.i.posthog.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com https://player.vimeo.com https://cal.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
    // Violation reporting: modern Reporting API (report-to) + legacy fallback
    // (report-uri). Both point to /api/csp-report which persists to
    // csp_violations for trend analysis. Legacy browsers that only understand
    // report-uri will use the full absolute URL; modern browsers use the
    // Report-To group name.
    "report-to invest-csp",
    `report-uri ${cspReportEndpoint}`,
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

        // ── MFA step-up gate ───────────────────────────────────────
        // Authenticated admins must also have a valid admin_mfa_verified
        // cookie before accessing any admin page. Exempt paths are the
        // login page, the MFA verify page itself, and the MFA settings
        // page (so admins can enroll even if the cookie has expired).
        //
        // Dev/test fallthrough: if ADMIN_MFA_COOKIE_SECRET is not set, the
        // gate is skipped with a console warning so local development works
        // without the secret. In production the secret MUST be set — if
        // it's absent, verifyMfaCookieEdge returns false and every admin
        // request redirects to the verify page (where the verify route
        // also fails), making the admin panel inaccessible until the secret
        // is configured. See docs/ops/admin-mfa-rollout.md.
        const mfaSecretSet =
          process.env.ADMIN_MFA_COOKIE_SECRET &&
          process.env.ADMIN_MFA_COOKIE_SECRET.length >= 32
        if (!mfaSecretSet && process.env.NODE_ENV !== 'production') {
          // Skip gate in dev — warn once per cold start
          console.warn('[proxy] ADMIN_MFA_COOKIE_SECRET not set — MFA gate disabled in dev')
        } else {
          const isMfaExempt = ADMIN_MFA_EXEMPT.some(p => pathname.startsWith(p))
          if (!isMfaExempt) {
            const mfaValid = await verifyMfaCookieEdge(
              request.cookies.get(MFA_COOKIE_NAME)?.value,
            )
            if (!mfaValid) {
              const url = request.nextUrl.clone()
              url.pathname = '/admin/mfa/verify'
              url.searchParams.set('redirect', pathname)
              const redirectResponse = NextResponse.redirect(url)
              supabaseResponse.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie.name, cookie.value)
              })
              return redirectResponse
            }
          }
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
