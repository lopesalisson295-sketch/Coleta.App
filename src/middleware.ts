import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isOnboardingPage = req.nextUrl.pathname.startsWith('/onboarding')

    if (!token) {
      if (!isAuthPage && !isOnboardingPage) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
      return null
    }

    if (isAuthPage || isOnboardingPage) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    const role = token.role as string

    if (req.nextUrl.pathname === '/') {
      if (role === 'MOTORISTA') {
        return NextResponse.redirect(new URL('/coletas', req.url))
      }
    }

    if (req.nextUrl.pathname.startsWith('/veiculos') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return null
  },
  {
    callbacks: {
      authorized: () => true, // We handle redirects in the middleware function
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}
