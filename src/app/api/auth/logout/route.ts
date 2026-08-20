import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
import { handleApiError, createSuccessResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    await clearSession()
    
    return createSuccessResponse({ message: 'Logged out successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
