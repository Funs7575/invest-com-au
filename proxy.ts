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

  // ── Admin route protection ─────────────────────────────────────
  // Only initialise Supabase auth for /admin paths to avoid ~50ms
  // latency on every public page request.
  if (pathname.startsWith('/admin')) {
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

    // Protect admin routes (except login)
    if (!pathname.startsWith('/admin/login')) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }

      // Only allow admin emails
      const extraAdmins = (process.env.ADMIN_EMAILS || 'finnduns@gmail.com').split(',').map(e => e.trim().toLowerCase());
      const isAdmin = user.email?.endsWith('@invest.com.au') || extraAdmins.includes(user.email?.toLowerCase() || '');
      if (!isAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    }

    // Redirect logged-in users away from login page
    if (pathname === '/admin/login' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
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
