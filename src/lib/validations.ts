import { z } from 'zod'

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Register Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>

// Product Schema
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'SUBSCRIPTION']).default('PHYSICAL'),
  price: z.number().positive('Price must be positive'),
  discountPrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  profitMargin: z.number().nonnegative().optional(),
  stockQuantity: z.number().int().nonnegative().default(0),
  minOrderQuantity: z.number().int().positive().default(1),
  maxOrderQuantity: z.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isSale: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  weight: z.number().positive().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  digitalDelivery: z.boolean().default(false),
  deliveryMethod: z.enum(['AUTOMATIC', 'MANUAL', 'EMAIL', 'DOWNLOAD']).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
})

export type ProductInput = z.infer<typeof productSchema>

// Order Schema
export const orderCreateSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    variantId: z.string().optional(),
  })),
  shippingAddressId: z.string().optional(),
  billingAddressId: z.string().optional(),
  customerNote: z.string().optional(),
  paymentMethod: z.string().optional(),
  couponCode: z.string().optional(),
})

export type OrderCreateInput = z.infer<typeof orderCreateSchema>

// Coupon Schema
export const couponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  value: z.number().positive('Value must be positive'),
  minOrderValue: z.number().nonnegative().optional(),
  maxDiscount: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  startDate: z.date(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
  applicableTo: z.enum(['ALL', 'CATEGORY', 'PRODUCT']).default('ALL'),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
})

export type CouponInput = z.infer<typeof couponSchema>

// Support Ticket Schema
export const ticketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  orderId: z.string().optional(),
})

export type TicketInput = z.infer<typeof ticketSchema>

// Website Setting Schema
export const websiteSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
  type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'JSON', 'IMAGE', 'COLOR', 'RICHTEXT']).default('TEXT'),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
})

export type WebsiteSettingInput = z.infer<typeof websiteSettingSchema>

// Address Schema
export const addressSchema = z.object({
  label: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  phone: z.string().min(1, 'Phone is required'),
  isDefault: z.boolean().default(false),
})

export type AddressInput = z.infer<typeof addressSchema>

// Digital Stock Schema
export const digitalStockSchema = z.object({
  productId: z.string(),
  items: z.array(z.object({
    itemValue: z.string().min(1, 'Item value is required'),
    itemType: z.enum(['KEY', 'LICENSE', 'SERIAL', 'ACCOUNT', 'CODE', 'CREDENTIAL', 'FILE', 'CUSTOM_TEXT']).default('KEY'),
  })),
})

export type DigitalStockInput = z.infer<typeof digitalStockSchema>

// Subscription Schema
export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  plan: z.string().min(1, 'Plan is required'),
  duration: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']),
  period: z.number().int().positive(),
  price: z.number().positive(),
  renewalType: z.enum(['AUTO', 'MANUAL']).default('MANUAL'),
})

export type SubscriptionInput = z.infer<typeof subscriptionSchema>

// Popup Schema
export const popupSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  image: z.string().optional(),
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  displayDuration: z.number().int().positive().default(5),
  displayFrequency: z.string().default('once_per_session'),
  targetPages: z.string().default('all'),
  isEnabled: z.boolean().default(false),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

export type PopupInput = z.infer<typeof popupSchema>

// Announcement Schema
export const announcementSchema = z.object({
  type: z.enum(['BAR', 'BANNER', 'NOTICE', 'MAINTENANCE', 'FLASH_SALE']).default('BAR'),
  message: z.string().min(1, 'Message is required'),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  link: z.string().optional(),
  linkText: z.string().optional(),
  isEnabled: z.boolean().default(false),
  priority: z.number().int().default(0),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

export type AnnouncementInput = z.infer<typeof announcementSchema>

// Category Schema
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  order: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categorySchema>

// Brand Schema
export const brandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  isEnabled: z.boolean().default(true),
})

export type BrandInput = z.infer<typeof brandSchema>
