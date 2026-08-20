import { create } from 'zustand'

interface WebsiteSettings {
  siteName: string
  siteDescription: string
  primaryColor: string
  secondaryColor: string
  darkMode: boolean
  footerText: string
  contactEmail: string
  contactPhone: string
  currency: string
  logo: string | null
  favicon: string | null
  isLoading: boolean
  setSettings: (settings: Partial<WebsiteSettings>) => void
  loadSettings: () => Promise<void>
}

export const useWebsiteStore = create<WebsiteSettings>((set, get) => ({
  siteName: 'Enterprise Store',
  siteDescription: 'Your trusted online shopping destination',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  darkMode: false,
  footerText: '© 2024 Enterprise Store. All rights reserved.',
  contactEmail: 'support@example.com',
  contactPhone: '+1 (555) 123-4567',
  currency: 'USD',
  logo: null,
  favicon: null,
  isLoading: false,
  
  setSettings: (settings) => set(settings),
  
  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const response = await fetch('/api/store/settings')
      const data = await response.json()
      
      if (data.success) {
        const settings = data.data.settings
        set({
          siteName: settings.site_name || get().siteName,
          siteDescription: settings.site_description || get().siteDescription,
          primaryColor: settings.primary_color || get().primaryColor,
          secondaryColor: settings.secondary_color || get().secondaryColor,
          darkMode: settings.dark_mode === true || settings.dark_mode === 'true',
          footerText: settings.footer_text || get().footerText,
          contactEmail: settings.contact_email || get().contactEmail,
          contactPhone: settings.contact_phone || get().contactPhone,
          currency: settings.currency || get().currency,
          logo: settings.logo || null,
          favicon: settings.favicon || null,
        })
      }
    } catch (error) {
      console.error('Failed to load website settings:', error)
    } finally {
      set({ isLoading: false })
    }
  },
}))
