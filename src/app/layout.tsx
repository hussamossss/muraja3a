import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n'
import RegisterSW from '@/components/RegisterSW'

export const metadata: Metadata = {
  title: 'مجدول مراجعة الحفظ',
  description: 'تطبيق لمتابعة مراجعة القرآن الكريم بالتكرار المتباعد',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'مُراجِع',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F1411',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Amiri+Quran&display=swap"
        />
      </head>
      <body>
        <LanguageProvider>
          <RegisterSW />
          <div className="w-full">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}
