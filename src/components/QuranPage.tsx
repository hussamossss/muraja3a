'use client'

import { useEffect, useState } from 'react'
import { loadPageWords, groupByLine, SURAH_NAMES, BASMALA, NO_BASMALA_SURAHS } from '@/lib/quran-data'
import type { QuranWord } from '@/lib/types'

interface QuranPageProps {
  pageNumber:   number
  interactive?: boolean
  selectedKeys?: Set<string>
  onWordToggle?: (word: QuranWord) => void
}

function toArabic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function AyahMarker({ n }: { n: number }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 26,
      height: 26,
      borderRadius: '50%',
      border: '1.5px solid rgba(138,143,143,0.45)',
      fontSize: 11,
      color: 'var(--sub)',
      fontFamily: '"Amiri Quran", serif',
      margin: '0 2px',
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
  const name    = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const basmala = surah !== 1 && !NO_BASMALA_SURAHS.has(surah)

  return (
    <div style={{ textAlign: 'center', margin: '16px 0 10px', direction: 'rtl' }}>
      <div style={{
        display: 'inline-block',
        padding: '6px 28px',
        border: '1.5px solid var(--border)',
        borderRadius: 40,
        fontSize: 18,
        fontWeight: 700,
        fontFamily: '"Amiri Quran", serif',
        color: 'var(--cream)',
        letterSpacing: 1,
        marginBottom: basmala ? 10 : 0,
      }}>
        سورة {name}
      </div>
      {basmala && (
        <div style={{
          fontFamily: '"Amiri Quran", serif',
          fontSize: 26,
          color: 'var(--sub)',
          letterSpacing: 2,
          marginTop: 4,
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
  const [lines,   setLines]   = useState<ReturnType<typeof groupByLine>>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadPageWords(pageNumber)
      .then(words => setLines(groupByLine(words)))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [pageNumber])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}>
      جارٍ تحميل الصفحة...
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--red)', fontSize: 13 }}>
      {error}
    </div>
  )

  const shownSurahs = new Set<number>()

  return (
    <div style={{
      direction:  'rtl',
      fontFamily: '"Amiri Quran", "Amiri", serif',
      padding:    '12px 16px 20px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {lines.map(line => {
        // surah headers before this line
        const headers = line.newSurahs.filter(s => !shownSurahs.has(s))
        headers.forEach(s => shownSurahs.add(s))

        return (
          <div key={line.ln}>
            {headers.map(s => <SurahHeader key={s} surah={s} />)}

            {/* ── One mushaf line ── */}
            <div style={{
              display:        'flex',
              flexDirection:  'row',
              justifyContent: 'space-between',
              alignItems:     'center',
              direction:      'rtl',
              fontSize:       26,
              lineHeight:     2.2,
              color:          'var(--cream)',
              width:          '100%',
            }}>
              {line.words.map(word => {
                const wKey     = `${word.s}:${word.a}:${word.wi}`
                const selected = selectedKeys.has(wKey)

                // find if ayah ends after this word
                const isAyahEnd = line.ayahEnds.some(
                  e => e.surah === word.s && e.ayah === word.a
                ) && line.words.indexOf(word) === line.words.map(
                  w => w.s === word.s && w.a === word.a ? w : null
                ).lastIndexOf(line.words.find(w => w.s === word.s && w.a === word.a) ?? null)

                return (
                  <span key={wKey} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                    <span
                      onClick={interactive ? () => onWordToggle?.(word) : undefined}
                      style={{
                        cursor:     interactive ? 'pointer' : 'default',
                        background: selected ? 'rgba(239,68,68,0.2)' : 'transparent',
                        color:      selected ? '#EF4444' : 'inherit',
                        borderRadius: 4,
                        padding:    '2px 1px',
                        transition: 'background .12s, color .12s',
                      }}
                    >
                      {word.t}
                    </span>
                    {isAyahEnd && <AyahMarker n={word.a} />}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
