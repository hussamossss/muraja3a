import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'مجدول مراجعة الحفظ',
  description: 'تطبيق لمتابعة مراجعة القرآن الكريم بالتكرار المتباعد',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Amiri+Quran&display=swap"
        />
      </head>
      <body>
        <LanguageProvider>
          <div className="w-full">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}
