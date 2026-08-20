import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/middleware/route-guards'
import { productSchema } from '@/lib/validations'
import { handleApiError, createSuccessResponse, createErrorResponse, slugify } from '@/lib/utils'

// GET all products with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const type = searchParams.get('type')

    const where: any = {}

    if (status) where.status = status
    if (category) where.categoryId = category
    if (brand) where.brandId = brand
    if (type) where.productType = type
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          _count: { select: { variants: true, digitalStocks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return createSuccessResponse({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      const body = await request.json()
      
      // Validate input
      const validation = productSchema.safeParse(body)
      if (!validation.success) {
        return createErrorResponse(validation.error.errors[0].message)
      }

      const data = validation.data
      
      // Generate slug if not provided
      const slug = data.slug || slugify(data.name)

      // Check if slug already exists
      const existingProduct = await prisma.product.findUnique({ where: { slug } })
      if (existingProduct) {
        return createErrorResponse('Product with this slug already exists', 409)
      }

      // Calculate profit margin if cost price is provided
      let profitMargin = data.profitMargin
      if (!profitMargin && data.costPrice && data.price > data.costPrice) {
        profitMargin = ((data.price - data.costPrice) / data.costPrice) * 100
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          ...data,
          slug,
          profitMargin: profitMargin ? parseFloat(profitMargin.toFixed(2)) : null,
          images: data.images || [],
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        },
        include: {
          category: true,
          brand: true,
        },
      })

      // Log activity
      await prisma.adminActivityLog.create({
        data: {
          userId: user.id,
          action: 'PRODUCT_CREATED',
          entity: 'PRODUCT',
          entityId: product.id,
          details: { name: product.name, sku: product.sku },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      })

      return createSuccessResponse(product, 201)
    } catch (error) {
      return handleApiError(error)
    }
  })(request, user!)
}
