import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, createSuccessResponse } from '@/lib/utils'

// GET all published products for storefront
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const sale = searchParams.get('sale')
    const newProducts = searchParams.get('new')
    const sort = searchParams.get('sort') || 'createdAt'
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')

    const where: any = {
      status: 'PUBLISHED',
      isEnabled: true,
    }

    if (category) where.categoryId = category
    if (brand) where.brandId = brand
    if (featured === 'true') where.isFeatured = true
    if (sale === 'true') where.isSale = true
    if (newProducts === 'true') where.isNew = true
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Price filter
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    // Sorting
    const orderBy: any = {}
    switch (sort) {
      case 'price_asc':
        orderBy.price = 'asc'
        break
      case 'price_desc':
        orderBy.price = 'desc'
        break
      case 'name_asc':
        orderBy.name = 'asc'
        break
      case 'name_desc':
        orderBy.name = 'desc'
        break
      case 'newest':
        orderBy.createdAt = 'desc'
        break
      case 'popular':
        orderBy.soldStock = 'desc'
        break
      default:
        orderBy.createdAt = 'desc'
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Calculate discount percentage for each product
    const productsWithDiscount = products.map(p => ({
      ...p,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      costPrice: p.costPrice ? Number(p.costPrice) : null,
      profitMargin: p.profitMargin ? Number(p.profitMargin) : null,
      discountPercentage: p.discountPrice 
        ? Math.round(((Number(p.price) - Number(p.discountPrice)) / Number(p.price)) * 100)
        : 0,
    }))

    return createSuccessResponse({
      products: productsWithDiscount,
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
