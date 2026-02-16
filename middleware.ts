import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add code between createServerClient and getUser().
  // A simple mistake could make it very hard to debug auth issues.
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes (except login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      const redirectResponse = NextResponse.redirect(url)
      // Copy refreshed auth cookies to the redirect response
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    // Only allow admin emails (additional emails via ADMIN_EMAILS env var, comma-separated)
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
  if (request.nextUrl.pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    const redirectResponse = NextResponse.redirect(url)
    // Copy refreshed auth cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
