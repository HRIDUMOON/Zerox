import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

interface RouteGuardOptions {
  requiredRoles?: string[]
  allowGuest?: boolean
}

export function withAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  options: RouteGuardOptions = {}
) {
  return async (request: NextRequest) => {
    const { requiredRoles, allowGuest = false } = options
    
    const session = await getSession()
    
    if (!session && !allowGuest) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (session && requiredRoles && !requiredRoles.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    return handler(request, session)
  }
}

export function withAdmin(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
  })
}

export function withSupport(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF']
  })
}

export function withFulfillment(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'FULFILLMENT_STAFF']
  })
}
