'use client'

import { useEffect, useState, useRef, useLayoutEffect } from 'react'
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
      width: '1.1em', height: '1.1em', borderRadius: '50%',
      border: '1px solid rgba(138,143,143,0.5)',
      fontSize: '0.55em', color: 'var(--sub)',
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
    <div style={{ textAlign: 'center', margin: 'clamp(10px, 2vw, 16px) 0 clamp(6px, 1.5vw, 10px)', direction: 'rtl' }}>
      <div style={{
        display: 'inline-block', padding: 'clamp(3px, 0.7vw, 6px) clamp(16px, 3vw, 28px)',
        border: '1.5px solid var(--border)', borderRadius: 40,
        fontSize: 'clamp(14px, 4vw, 18px)', fontFamily: '"Amiri Quran", serif', color: 'var(--cream)',
        marginBottom: basmala ? 'clamp(4px, 1vw, 8px)' : 0,
      }}>
        سورة {name}
      </div>
      {basmala && (
        <div style={{ fontFamily: '"Amiri Quran", serif', fontSize: '1em', color: 'var(--sub)', marginTop: 'clamp(2px, 0.5vw, 4px)' }}>
          {BASMALA}
        </div>
      )}
    </div>
  )
}

// ── Render items helper ──────────────────────────────────────────────────────
function renderLineItems(items: Item[], selectedKeys: Set<string>, interactive: boolean, onWordToggle?: (word: QuranWord) => void) {
  return items.map((item, idx) =>
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
  )
}

// ── QuranLine: simple row — no per-line scaling (page-level scale handles it) ──
interface QuranLineProps {
  items: Item[]
  justify: 'space-between' | 'center'
  selectedKeys: Set<string>
  interactive: boolean
  onWordToggle?: (word: QuranWord) => void
}

function QuranLine({ items, justify, selectedKeys, interactive, onWordToggle }: QuranLineProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'row',
      justifyContent: justify, alignItems: 'center',
      direction: 'rtl', width: '100%',
      lineHeight: 2.2,
    }}>
      {renderLineItems(items, selectedKeys, interactive, onWordToggle)}
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
const BASE_FONT = 'clamp(20px, 5.6vw, 30px)'

export default function QuranPage({
  pageNumber,
  interactive  = false,
  selectedKeys = new Set(),
  onWordToggle,
}: QuranPageProps) {
  const [lines,   setLines]   = useState<ReturnType<typeof buildLines>>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const probesRef    = useRef<HTMLDivElement>(null)
  const [pageScale, setPageScale] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true); setError(null); setPageScale(null)
    loadPageWords(pageNumber)
      .then(words => setLines(buildLines(words)))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [pageNumber])

  useLayoutEffect(() => {
    if (lines.length === 0) return
    const fit = () => {
      const container = containerRef.current
      const probes    = probesRef.current
      if (!container || !probes) return
      const cs    = getComputedStyle(container)
      const avail = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (avail <= 0) return
      const lineProbes = probes.querySelectorAll<HTMLDivElement>('[data-probe]')
      let minRatio = 1  // never upscale — max is 1.0
      lineProbes.forEach(p => {
        const natural = p.scrollWidth
        if (natural > 0) minRatio = Math.min(minRatio, (avail * 0.99) / natural)
      })
      setPageScale(Math.max(0.7, Math.min(1, minRatio)))
    }
    fit()
    document.fonts?.ready?.then(fit)
    const ro = new ResizeObserver(fit)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [lines])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}>جارٍ تحميل الصفحة...</div>
  )
  if (error) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--red)', fontSize: 13 }}>{error}</div>
  )

  const shownSurahs = new Set<number>()

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 'min(560px, 100vw)',
        margin: '0 auto',
        direction: 'rtl', fontFamily: '"Amiri Quran", "Amiri", serif',
        padding: 'clamp(10px, 3vw, 18px) clamp(12px, 4vw, 22px)',
        fontSize: pageScale !== null ? `calc(${BASE_FONT} * ${pageScale})` : BASE_FONT,
        visibility: pageScale === null ? 'hidden' : 'visible',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {/* Hidden probes — measure at base font size, outside the scaled context */}
      <div ref={probesRef} aria-hidden style={{
        position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
        left: -9999, top: 0, fontSize: BASE_FONT, direction: 'rtl',
      }}>
        {lines.map(line => (
          <div key={line.ln} data-probe style={{ whiteSpace: 'nowrap' }}>
            {renderLineItems(line.items, selectedKeys, interactive, onWordToggle)}
          </div>
        ))}
      </div>

      {lines.map(line => {
        const headers = line.newSurahs.filter(s => !shownSurahs.has(s))
        headers.forEach(s => shownSurahs.add(s))

        const wordCount = line.items.filter(i => i.type === 'word').length
        const justify = wordCount >= 3 ? 'space-between' : 'center'

        return (
          <div key={line.ln}>
            {headers.map(s => <SurahHeader key={s} surah={s} />)}
            <QuranLine
              items={line.items}
              justify={justify}
              selectedKeys={selectedKeys}
              interactive={interactive}
              onWordToggle={onWordToggle}
            />
          </div>
        )
      })}
    </div>
  )
}
