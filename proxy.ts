import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // ── Preview deploy protection ──────────────────────────────────
  // Vercel sets VERCEL_ENV to 'preview' on non-production branches.
  // Inject noindex header so Google never indexes staging/preview URLs.
  if (process.env.VERCEL_ENV === 'preview') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
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
              supabaseResponse.cookies.set(name, value, options as any)
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

        // Only allow admin emails
        const extraAdmins = (process.env.ADMIN_EMAILS || 'finnduns@gmail.com').split(',').map(e => e.trim().toLowerCase());
        const isAdminUser = user.email?.endsWith('@invest.com.au') || extraAdmins.includes(user.email?.toLowerCase() || '');
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
