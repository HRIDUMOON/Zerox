import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper function to safely disconnect Prisma client
export async function disconnectPrisma() {
  await prisma.$disconnect()
}

// Helper function to connect Prisma client
export async function connectPrisma() {
  await prisma.$connect()
}

// Seed function for initial data
export async function seedDatabase() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (existingAdmin) {
      console.log('Database already seeded')
      return
    }

    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Create Super Admin
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isActive: true,
      }
    })

    // Create default website settings
    const defaultSettings = [
      { key: 'site_name', value: 'Enterprise Store', type: 'TEXT', description: 'Website Name', isPublic: true },
      { key: 'site_description', value: 'Your trusted online shopping destination', type: 'TEXT', description: 'Website Description', isPublic: true },
      { key: 'site_url', value: 'https://example.com', type: 'TEXT', description: 'Website URL', isPublic: true },
      { key: 'contact_email', value: 'support@example.com', type: 'TEXT', description: 'Contact Email', isPublic: true },
      { key: 'contact_phone', value: '+1 (555) 123-4567', type: 'TEXT', description: 'Phone Number', isPublic: true },
      { key: 'primary_color', value: '#3B82F6', type: 'COLOR', description: 'Primary Theme Color', isPublic: true },
      { key: 'secondary_color', value: '#1E40AF', type: 'COLOR', description: 'Secondary Theme Color', isPublic: true },
      { key: 'dark_mode', value: 'false', type: 'BOOLEAN', description: 'Dark Mode Enabled', isPublic: true },
      { key: 'footer_text', value: '© 2024 Enterprise Store. All rights reserved.', type: 'TEXT', description: 'Footer Text', isPublic: true },
      { key: 'currency', value: 'USD', type: 'TEXT', description: 'Default Currency', isPublic: false },
      { key: 'tax_rate', value: '0', type: 'NUMBER', description: 'Default Tax Rate (%)', isPublic: false },
    ]

    for (const setting of defaultSettings) {
      await prisma.websiteSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting as any
      })
    }

    console.log('Database seeded successfully')
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}
