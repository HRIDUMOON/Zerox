import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, createSuccessResponse } from '@/lib/utils'

// GET public website settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keys = searchParams.get('keys')?.split(',')

    const where: any = { isPublic: true }
    
    if (keys && keys.length > 0) {
      where.key = { in: keys }
    }

    const settings = await prisma.websiteSetting.findMany({
      where,
      select: {
        key: true,
        value: true,
        type: true,
      },
    })

    // Convert to key-value object
    const settingsObject = settings.reduce((acc, setting) => {
      let value: any = setting.value
      
      // Parse based on type
      if (setting.type === 'BOOLEAN') {
        value = setting.value === 'true'
      } else if (setting.type === 'NUMBER') {
        value = parseFloat(setting.value) || 0
      } else if (setting.type === 'JSON') {
        try {
          value = JSON.parse(setting.value)
        } catch {
          // Keep as string if invalid JSON
        }
      }
      
      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)

    // Also get active announcements and popups
    const [announcements, popups, homepageSections] = await Promise.all([
      prisma.announcement.findMany({
        where: {
          isEnabled: true,
          OR: [
            { startDate: null },
            { startDate: { lte: new Date() } },
          ],
          AND: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        orderBy: { priority: 'desc' },
      }),
      prisma.popup.findMany({
        where: {
          isEnabled: true,
          OR: [
            { startDate: null },
            { startDate: { lte: new Date() } },
          ],
          AND: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
      }),
      prisma.homepageSection.findMany({
        where: { isEnabled: true },
        orderBy: { order: 'asc' },
      }),
    ])

    return createSuccessResponse({
      settings: settingsObject,
      announcements: announcements.map(a => ({
        ...a,
        id: a.id,
        type: a.type,
        message: a.message,
        backgroundColor: a.backgroundColor,
        textColor: a.textColor,
        link: a.link,
        linkText: a.linkText,
      })),
      popups: popups.map(p => ({
        ...p,
        id: p.id,
        title: p.title,
        description: p.description,
        image: p.image,
        buttonText: p.buttonText,
        buttonUrl: p.buttonUrl,
        displayDuration: p.displayDuration,
        displayFrequency: p.displayFrequency,
        targetPages: p.targetPages,
      })),
      homepageSections: homepageSections.map(s => ({
        ...s,
        content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content,
        settings: typeof s.settings === 'string' ? JSON.parse(s.settings) : s.settings,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
