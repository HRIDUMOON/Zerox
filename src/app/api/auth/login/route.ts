import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse(validation.error.errors[0].message)
    }

    const { email, password } = validation.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
      },
    })

    if (!user) {
      return createErrorResponse('Invalid email or password', 401)
    }

    if (!user.isActive) {
      return createErrorResponse('Account is deactivated', 403)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return createErrorResponse('Invalid email or password', 401)
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
    })

    // Create session
    await setSession({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Log admin activity if admin user
    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT_STAFF', 'FULFILLMENT_STAFF'].includes(user.role)) {
      await prisma.adminActivityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'USER',
          entityId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      })
    }

    return createSuccessResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
