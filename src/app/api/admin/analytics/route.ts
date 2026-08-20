import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/middleware/route-guards'
import { handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/utils'

// GET - Dashboard Analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || '7d'

    // Calculate date range
    const now = new Date()
    let start = new Date()
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'yesterday':
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        now.setDate(now.getDate() - 1)
        now.setHours(23, 59, 59, 999)
        break
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '3m':
        start.setMonth(start.getMonth() - 3)
        break
      case '6m':
        start.setMonth(start.getMonth() - 6)
        break
      case '1y':
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        if (startDate && endDate) {
          start = new Date(startDate)
          now.setMilliseconds(new Date(endDate).getMilliseconds())
        }
    }

    // Get all relevant data in parallel
    const [
      totalRevenue,
      todayRevenue,
      orderStats,
      customerStats,
      productStats,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      // Total Revenue
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: start, lte: now },
        },
        _sum: { total: true },
      }),
      // Today's Revenue
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(),
          },
        },
        _sum: { total: true },
      }),
      // Order Statistics
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: start, lte: now } },
        _count: true,
      }),
      // Customer Statistics
      Promise.all([
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({
          where: {
            role: 'CUSTOMER',
            createdAt: { gte: start, lte: now },
          },
        }),
      ]),
      // Product Statistics
      Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { stockQuantity: 0, isEnabled: true } }),
        prisma.product.count({ 
          where: { 
            stockQuantity: { lte: 10, gt: 0 }, 
            isEnabled: true 
          } 
        }),
        prisma.product.count({ where: { productType: 'DIGITAL' } }),
        prisma.product.count({ where: { productType: 'PHYSICAL' } }),
      ]),
      // Top Products
      prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { createdAt: { gte: start, lte: now } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      // Recent Orders
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: now } },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { select: { productName: true, quantity: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // Process order stats
    const ordersByStatus = orderStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count
      return acc
    }, {} as Record<string, number>)

    // Calculate profit
    const totalProfit = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: now },
      },
      _sum: { total: true },
    })

    return createSuccessResponse({
      revenue: {
        total: Number(totalRevenue._sum.total) || 0,
        today: Number(todayRevenue._sum.total) || 0,
        profit: Number(totalProfit._sum.total) || 0,
      },
      orders: {
        total: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
        pending: ordersByStatus['PENDING'] || 0,
        processing: ordersByStatus['PROCESSING'] || 0,
        completed: ordersByStatus['DELIVERED'] || 0,
        cancelled: ordersByStatus['CANCELLED'] || 0,
      },
      customers: {
        total: customerStats[0],
        new: customerStats[1],
      },
      products: {
        total: productStats[0],
        outOfStock: productStats[1],
        lowStock: productStats[2],
        digital: productStats[3],
        physical: productStats[4],
      },
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        name: p.productName,
        quantitySold: p._sum.quantity,
        revenue: Number(p._sum.total) || 0,
      })),
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: `${o.user.firstName} ${o.user.lastName}`,
        email: o.user.email,
        total: Number(o.total),
        status: o.status,
        items: o.items.length,
        createdAt: o.createdAt,
      })),
      period: {
        start: start.toISOString(),
        end: now.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
