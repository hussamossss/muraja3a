/**
 * Phase 1 — One-time script: fetch 604 pages from Quran.com API v4
 * Output: public/quran/page-001.json ... page-604.json
 * Run: npx tsx scripts/fetch-quran-pages.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://api.quran.com/api/v4'
const OUT_DIR  = join(process.cwd(), 'public', 'quran')

// ── Normalization (local copy — arabic.ts doesn't exist yet) ──────────────────
function normalize(text: string): string {
  return text
    .replace(/[ً-ٟ]/g, '')          // tashkeel
    .replace(/[ؐ-ؚ]/g, '')          // Quranic annotations
    .replace(/ٰ/g, '')                   // superscript alef
    .replace(/[ۖ-ۭ]/g, '')          // Quranic pause marks
    .replace(/[آأإٱ]/g, 'ا') // أ إ آ ٱ → ا
    .replace(/ؤ/g, 'و')             // ؤ → و
    .replace(/ئ/g, 'ي')             // ئ → ي
    .replace(/ة/g, 'ه')             // ة → ه
    .replace(/ى/g, 'ي')             // ى → ي
    .trim()
}

interface ApiWord {
  position:       number
  text_uthmani:   string
  char_type_name: string  // 'word' | 'end' | 'sajdah' ...
}

interface ApiVerse {
  verse_key: string
  words:     ApiWord[]
}

interface ApiResponse {
  verses: ApiVerse[]
}

async function fetchPage(pageNum: number): Promise<void> {
  const url = `${API_BASE}/verses/by_page/${pageNum}` +
    `?words=true&word_fields=text_uthmani,char_type_name&per_page=50`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} — page ${pageNum}`)

  const data: ApiResponse = await res.json()
  const words: { s:number; a:number; wi:number; t:string; n:string }[] = []

  for (const verse of data.verses ?? []) {
    const [s, a] = verse.verse_key.split(':').map(Number)
    for (const w of verse.words ?? []) {
      if (w.char_type_name !== 'word') continue   // تخطّى أرقام الآيات
      words.push({ s, a, wi: w.position, t: w.text_uthmani, n: normalize(w.text_uthmani) })
    }
  }

  const file = join(OUT_DIR, `page-${String(pageNum).padStart(3, '0')}.json`)
  writeFileSync(file, JSON.stringify(words), 'utf8')
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`📥 جلب 604 صفحة → ${OUT_DIR}`)
  console.log('(يستغرق ~3 دقائق)\n')

  let errors = 0
  for (let p = 1; p <= 604; p++) {
    try {
      await fetchPage(p)
    } catch (e) {
      console.error(`  ❌ صفحة ${p}: ${e}`)
      errors++
    }
    if (p % 100 === 0 || p === 604) {
      process.stdout.write(`  ✓ ${p}/604\n`)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n${errors === 0 ? '✅' : `⚠️ ${errors} أخطاء`} اكتمل الجلب`)
}

main().catch(e => { console.error(e); process.exit(1) })
