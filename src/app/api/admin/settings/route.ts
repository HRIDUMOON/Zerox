import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/middleware/route-guards'
import { handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/utils'

// GET all website settings
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.websiteSetting.findMany({
      orderBy: { key: 'asc' },
    })

    // Convert to key-value object for easier access
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
        isPublic: setting.isPublic,
      }
      return acc
    }, {} as Record<string, any>)

    return createSuccessResponse(settingsObject)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Create or update settings
export async function POST(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      const body = await request.json()
      const { key, value, type = 'TEXT', description, isPublic = true } = body

      if (!key) {
        return createErrorResponse('Key is required')
      }

      const setting = await prisma.websiteSetting.upsert({
        where: { key },
        update: { value, type, description, isPublic },
        create: { key, value, type, description, isPublic },
      })

      // Log activity
      await prisma.adminActivityLog.create({
        data: {
          userId: user.id,
          action: 'SETTING_UPDATED',
          entity: 'WEBSITE_SETTING',
          entityId: setting.id,
          details: { key, value },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      })

      return createSuccessResponse(setting)
    } catch (error) {
      return handleApiError(error)
    }
  })(request, user!)
}

// PUT - Bulk update settings
export async function PUT(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      const body = await request.json()
      const updates = body.settings || body

      const results = []
      for (const [key, value] of Object.entries(updates)) {
        const setting = await prisma.websiteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
        results.push(setting)
      }

      // Log activity
      await prisma.adminActivityLog.create({
        data: {
          userId: user.id,
          action: 'SETTINGS_BULK_UPDATE',
          entity: 'WEBSITE_SETTING',
          details: { keys: Object.keys(updates) },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      })

      return createSuccessResponse(results)
    } catch (error) {
      return handleApiError(error)
    }
  })(request, user!)
}
