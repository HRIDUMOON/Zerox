import { prisma } from './prisma'

// Initialize default settings on app startup
export async function initializeSettings() {
  try {
    const settingCount = await prisma.websiteSetting.count()
    
    if (settingCount === 0) {
      console.log('Initializing default website settings...')
      
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
          update: {},
          create: setting as any,
        })
      }
      
      console.log('Default settings initialized successfully')
    }
  } catch (error) {
    console.error('Error initializing settings:', error)
  }
}

// Get a single setting value
export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.websiteSetting.findUnique({
    where: { key },
  })
  return setting?.value || null
}

// Get multiple settings
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const settings = await prisma.websiteSetting.findMany({
    where: { key: { in: keys } },
  })
  
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)
}

// Get all public settings
export async function getPublicSettings(): Promise<Record<string, any>> {
  const settings = await prisma.websiteSetting.findMany({
    where: { isPublic: true },
  })
  
  return settings.reduce((acc, setting) => {
    let value: any = setting.value
    
    if (setting.type === 'BOOLEAN') {
      value = setting.value === 'true'
    } else if (setting.type === 'NUMBER') {
      value = parseFloat(setting.value) || 0
    } else if (setting.type === 'JSON') {
      try {
        value = JSON.parse(setting.value)
      } catch {
        // Keep as string
      }
    }
    
    acc[setting.key] = value
    return acc
  }, {} as Record<string, any>)
}

// Update a setting
export async function updateSetting(key: string, value: string): Promise<void> {
  await prisma.websiteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}
