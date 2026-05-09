'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { translations } from './translations'

export type Lang = 'ar' | 'en'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: 'ar', setLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'ar' || stored === 'en') {
      setLangState(stored)
    } else {
      const detected: Lang = navigator.language.startsWith('ar') ? 'ar' : 'en'
      setLangState(detected)
    }
    // async Supabase override for cross-device sync
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.language === 'ar' || data?.language === 'en') {
            setLangState(data.language as Lang)
            localStorage.setItem('lang', data.language)
          }
        })
    })
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_preferences').upsert({
        user_id:    user.id,
        language:   l,
        updated_at: new Date().toISOString(),
      })
    })
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang(): LangContextValue {
  return useContext(LangContext)
}

export function useT() {
  const { lang } = useLang()
  return translations[lang]
}
