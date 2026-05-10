'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Lang, TranslationKey } from './translations'

interface I18nCtx {
  lang:    Lang
  setLang: (l: Lang) => void
  t:       (k: TranslationKey) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')

  useEffect(() => {
    const saved = localStorage.getItem('muraja3a-lang') as Lang | null
    if (saved === 'en' || saved === 'ar') {
      // User has an explicit preference — honour it
      setLangState(saved)
    } else {
      // First visit: detect from browser locale
      const browserLang = navigator.language || ''
      const detected: Lang = browserLang.toLowerCase().startsWith('ar') ? 'ar' : 'en'
      setLangState(detected)
      // Don't save yet — only save on explicit user toggle
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('muraja3a-lang', l)
  }

  const t = (k: TranslationKey): string => translations[lang]?.[k] ?? translations['en'][k] ?? k

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be inside LanguageProvider')
  return ctx
}
