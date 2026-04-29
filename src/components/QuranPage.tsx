'use client'

import { useEffect, useState } from 'react'
import { loadPageWords, groupByAyah, SURAH_NAMES, BASMALA, NO_BASMALA_SURAHS } from '@/lib/quran-data'
import type { QuranWord } from '@/lib/types'

interface QuranPageProps {
  pageNumber:   number
  interactive?: boolean
  selectedKeys?: Set<string>
  onWordToggle?: (word: QuranWord) => void
}

// أرقام عربية (هندية)
function toArabic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function AyahMarker({ n }: { n: number }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: '50%',
      border: '1.5px solid rgba(138,143,143,0.45)',
      fontSize: 11,
      color: 'var(--sub)',
      fontFamily: '"Amiri Quran", serif',
      margin: '0 3px',
      verticalAlign: 'middle',
      flexShrink: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {toArabic(n)}
    </span>
  )
}

function SurahHeader({ surah }: { surah: number }) {
  const name     = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const basmala  = surah !== 1 && !NO_BASMALA_SURAHS.has(surah)

  return (
    <div style={{
      textAlign: 'center',
      margin: '20px 0 12px',
      borderTop: '1px solid var(--border)',
      paddingTop: 16,
    }}>
      {/* اسم السورة */}
      <div style={{
        display: 'inline-block',
        padding: '6px 28px',
        border: '1.5px solid var(--border)',
        borderRadius: 40,
        fontSize: 17,
        fontWeight: 700,
        fontFamily: '"Amiri Quran", serif',
        color: 'var(--cream)',
        letterSpacing: 1,
        marginBottom: basmala ? 12 : 0,
      }}>
        سورة {name}
      </div>

      {/* البسملة */}
      {basmala && (
        <div style={{
          fontFamily: '"Amiri Quran", serif',
          fontSize: 22,
          color: 'var(--sub)',
          letterSpacing: 1,
        }}>
          {BASMALA}
        </div>
      )}
    </div>
  )
}

export default function QuranPage({
  pageNumber,
  interactive  = false,
  selectedKeys = new Set(),
  onWordToggle,
}: QuranPageProps) {
  const [ayahs, setAyahs]     = useState<ReturnType<typeof groupByAyah>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadPageWords(pageNumber)
      .then(words => setAyahs(groupByAyah(words)))
      .catch(e  => setError(String(e)))
      .finally(() => setLoading(false))
  }, [pageNumber])

  if (loading) return (
    <div style={{ textAlign:'center', padding:40, color:'var(--sub)' }}>
      جارٍ تحميل الصفحة...
    </div>
  )

  if (error) return (
    <div style={{ textAlign:'center', padding:40, color:'var(--red)', fontSize:13 }}>
      {error}
    </div>
  )

  let lastSurah = -1

  return (
    <div style={{
      direction: 'rtl',
      fontFamily: '"Amiri Quran", "Amiri", serif',
      fontSize: 22,
      lineHeight: 2.8,
      color: 'var(--cream)',
      padding: '8px 20px 20px',
      textAlign: 'justify',
    }}>
      {ayahs.map(({ key, surah, ayah, words }) => {
        const newSurah = surah !== lastSurah
        lastSurah = surah

        return (
          <span key={key}>
            {/* فاصل السورة عند التغيّر */}
            {newSurah && <SurahHeader surah={surah} />}

            {/* كلمات الآية */}
            {words.map(word => {
              const wKey     = `${word.s}:${word.a}:${word.wi}`
              const selected = selectedKeys.has(wKey)
              return (
                <span
                  key={wKey}
                  onClick={interactive ? () => onWordToggle?.(word) : undefined}
                  style={{
                    display: 'inline-block',
                    padding: '4px 3px',
                    minWidth: 28,
                    borderRadius: 5,
                    cursor: interactive ? 'pointer' : 'default',
                    background: selected ? 'rgba(239,68,68,0.15)' : 'transparent',
                    color:      selected ? '#EF4444' : 'var(--cream)',
                    outline:    selected ? '1.5px solid rgba(239,68,68,0.4)' : 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    transition: 'background .12s, color .12s',
                  }}
                >
                  {word.t}
                </span>
              )
            })}

            {/* رقم الآية في دائرة */}
            <AyahMarker n={ayah} />
            {' '}
          </span>
        )
      })}
    </div>
  )
}
