import type { Metadata } from 'next'
import './globals.css'

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
        <div className="mx-auto w-full md:max-w-2xl lg:max-w-3xl">
          {children}
        </div>
      </body>
    </html>
  )
}
