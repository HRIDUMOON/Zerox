import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/middleware/route-guards'
import { handleApiError, createSuccessResponse, createErrorResponse, generateOrderNumber } from '@/lib/utils'

// GET all orders with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const fulfillmentStatus = searchParams.get('fulfillmentStatus')
    const search = searchParams.get('search')

    const where: any = {}

    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus
    if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true,
              phone: true,
            } 
          },
          items: {
            include: {
              product: { select: { id: true, name: true, thumbnail: true } },
            },
          },
          transactions: { select: { id: true, amount: true, status: true, gateway: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return createSuccessResponse({
      orders: orders.map(o => ({
        ...o,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        tax: Number(o.tax),
        shippingFee: Number(o.shippingFee),
        total: Number(o.total),
        couponDiscount: o.couponDiscount ? Number(o.couponDiscount) : null,
      })),
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

// POST - Create manual order (admin only)
export async function POST(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      const body = await request.json()
      const { userId, items, shippingAddressId, customerNote, paymentMethod } = body

      if (!userId || !items || items.length === 0) {
        return createErrorResponse('User ID and items are required')
      }

      // Get user
      const customer = await prisma.user.findUnique({
        where: { id: userId },
        include: { addresses: true },
      })

      if (!customer) {
        return createErrorResponse('Customer not found')
      }

      // Validate products and calculate totals
      let subtotal = 0
      const orderItems = []

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        })

        if (!product || !product.isEnabled) {
          return createErrorResponse(`Product ${item.productId} is not available`)
        }

        if (product.stockQuantity < item.quantity) {
          return createErrorResponse(`Insufficient stock for ${product.name}`)
        }

        const price = product.discountPrice || product.price
        const itemTotal = Number(price) * item.quantity
        subtotal += itemTotal

        orderItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.thumbnail,
          quantity: item.quantity,
          price: price,
          total: itemTotal,
        })
      }

      // Calculate final totals
      const taxRate = 0 // Get from settings
      const tax = subtotal * taxRate
      const shippingFee = 0 // Calculate based on shipping method
      const total = subtotal + tax + shippingFee

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: 'CONFIRMED',
          paymentStatus: paymentMethod ? 'PENDING' : 'PENDING',
          fulfillmentStatus: 'PENDING',
          subtotal,
          tax,
          shippingFee,
          total,
          shippingAddressId,
          customerNote,
          paymentMethod,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          items: {
            create: orderItems,
          },
        },
        include: {
          user: true,
          items: true,
        },
      })

      // Reserve inventory
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            reservedStock: { increment: item.quantity },
          },
        })

        // Log inventory
        await prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            type: 'RESERVATION',
            quantity: item.quantity,
            previousQty: 0,
            newQty: item.quantity,
            reason: `Reserved for order ${order.orderNumber}`,
            referenceId: order.id,
            performedBy: user.id,
          },
        })
      }

      // Log activity
      await prisma.adminActivityLog.create({
        data: {
          userId: user.id,
          action: 'ORDER_CREATED',
          entity: 'ORDER',
          entityId: order.id,
          details: { orderNumber: order.orderNumber, customerId: userId },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      })

      // Create notification for customer
      await prisma.notification.create({
        data: {
          userId,
          type: 'ORDER_CONFIRMATION',
          title: 'Order Confirmed',
          message: `Your order ${order.orderNumber} has been confirmed.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        },
      })

      return createSuccessResponse(order, 201)
    } catch (error) {
      return handleApiError(error)
    }
  })(request, user!)
}
