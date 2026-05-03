'use client'

import { useEffect, useState } from 'react'
import { loadPageWords, SURAH_NAMES, BASMALA, NO_BASMALA_SURAHS } from '@/lib/quran-data'
import type { QuranWord } from '@/lib/types'

interface QuranPageProps {
  pageNumber:   number
  interactive?: boolean
  selectedKeys?: Set<string>
  onWordToggle?: (word: QuranWord) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toArabic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function AyahMarker({ n }: { n: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: '50%',
      border: '1px solid rgba(138,143,143,0.5)',
      fontSize: 10, color: 'var(--sub)',
      fontFamily: '"Amiri Quran", serif',
      flexShrink: 0, userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {toArabic(n)}
    </span>
  )
}

function SurahHeader({ surah }: { surah: number }) {
  const name    = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const basmala = surah !== 1 && !NO_BASMALA_SURAHS.has(surah)
  return (
    <div style={{ textAlign: 'center', margin: '14px 0 8px', direction: 'rtl' }}>
      <div style={{
        display: 'inline-block', padding: '5px 24px',
        border: '1.5px solid var(--border)', borderRadius: 40,
        fontSize: 16, fontFamily: '"Amiri Quran", serif', color: 'var(--cream)',
        marginBottom: basmala ? 8 : 0,
      }}>
        سورة {name}
      </div>
      {basmala && (
        <div style={{ fontFamily: '"Amiri Quran", serif', fontSize: 24, color: 'var(--sub)', marginTop: 4 }}>
          {BASMALA}
        </div>
      )}
    </div>
  )
}

// ── Line item: word or ayah-marker ────────────────────────────────────────────
type Item = { type: 'word'; word: QuranWord } | { type: 'marker'; ayah: number }

function buildLines(allWords: QuranWord[]): { ln: number; items: Item[]; newSurahs: number[] }[] {
  // group by line
  const lineMap = new Map<number, QuranWord[]>()
  for (const w of allWords) {
    if (!lineMap.has(w.ln)) lineMap.set(w.ln, [])
    lineMap.get(w.ln)!.push(w)
  }

  // last word of each ayah (absolute, across all lines)
  const ayahLastLine = new Map<string, number>()
  for (const w of allWords) {
    const key = `${w.s}:${w.a}`
    const cur = ayahLastLine.get(key) ?? -1
    if (w.ln > cur) ayahLastLine.set(key, w.ln)
  }

  // first line of each surah
  const surahFirstLine = new Map<number, number>()
  for (const w of allWords) {
    const cur = surahFirstLine.get(w.s) ?? Infinity
    if (w.ln < cur) surahFirstLine.set(w.s, w.ln)
  }

  return [...lineMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ln, words]) => {
      const items: Item[] = []
      for (let i = 0; i < words.length; i++) {
        const w   = words[i]
        const key = `${w.s}:${w.a}`
        items.push({ type: 'word', word: w })
        // insert marker after last word of this ayah IF the ayah ends on this line
        const nextDiff = !words[i + 1] || words[i + 1].a !== w.a || words[i + 1].s !== w.s
        if (nextDiff && ayahLastLine.get(key) === ln) {
          items.push({ type: 'marker', ayah: w.a })
        }
      }
      // which surahs start on this line
      const newSurahs = [...surahFirstLine.entries()]
        .filter(([, l]) => l === ln)
        .map(([s]) => s)
      return { ln, items, newSurahs }
    })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuranPage({
  pageNumber,
  interactive  = false,
  selectedKeys = new Set(),
  onWordToggle,
}: QuranPageProps) {
  const [lines,   setLines]   = useState<ReturnType<typeof buildLines>>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    loadPageWords(pageNumber)
      .then(words => setLines(buildLines(words)))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [pageNumber])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}>جارٍ تحميل الصفحة...</div>
  )
  if (error) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--red)', fontSize: 13 }}>{error}</div>
  )

  const shownSurahs = new Set<number>()

  return (
    <div style={{
      direction: 'rtl', fontFamily: '"Amiri Quran", "Amiri", serif',
      padding: '12px 16px 20px',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {lines.map(line => {
        const headers = line.newSurahs.filter(s => !shownSurahs.has(s))
        headers.forEach(s => shownSurahs.add(s))

        // count real words (not markers) to decide justification
        const wordCount = line.items.filter(i => i.type === 'word').length
        const justify   = wordCount >= 3 ? 'space-between' : 'flex-end'

        return (
          <div key={line.ln}>
            {headers.map(s => <SurahHeader key={s} surah={s} />)}

            <div style={{
              display: 'flex', flexDirection: 'row',
              justifyContent: justify,
              alignItems: 'center',
              direction: 'rtl',
              fontSize: 24,
              lineHeight: 2.4,
              width: '100%',
              gap: wordCount < 3 ? 6 : 0,
            }}>
              {line.items.map((item, idx) =>
                item.type === 'marker'
                  ? <AyahMarker key={`m-${idx}`} n={item.ayah} />
                  : (
                    <span
                      key={`${item.word.s}:${item.word.a}:${item.word.wi}`}
                      onClick={interactive ? () => onWordToggle?.(item.word) : undefined}
                      style={{
                        cursor:     interactive ? 'pointer' : 'default',
                        background: selectedKeys.has(`${item.word.s}:${item.word.a}:${item.word.wi}`)
                          ? 'rgba(239,68,68,0.2)' : 'transparent',
                        color: selectedKeys.has(`${item.word.s}:${item.word.a}:${item.word.wi}`)
                          ? '#EF4444' : 'inherit',
                        borderRadius: 4,
                        padding: '2px 1px',
                        transition: 'background .12s, color .12s',
                      }}
                    >
                      {item.word.t}
                    </span>
                  )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
