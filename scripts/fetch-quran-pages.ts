/**
 * Fetch 604 pages from Quran.com API v4
 * Output: public/quran/page-001.json ... page-604.json
 * Each word includes line_number (ln) for line-by-line mushaf rendering.
 * Run: npx tsx scripts/fetch-quran-pages.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://api.quran.com/api/v4'
const OUT_DIR  = join(process.cwd(), 'public', 'quran')

function normalize(text: string): string {
  return text
    .replace(/[ً-ٟ]/g, '')
    .replace(/[ؐ-ؚ]/g, '')
    .replace(/ٰ/g, '')
    .replace(/[ۖ-ۭ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}

interface ApiWord {
  position:       number
  text_uthmani:   string
  char_type_name: string
  line_number:    number  // ← جديد
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
    `?words=true&word_fields=text_uthmani,char_type_name,line_number&per_page=50`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} — page ${pageNum}`)

  const data: ApiResponse = await res.json()
  const words: { s:number; a:number; wi:number; t:string; n:string; ln:number }[] = []

  for (const verse of data.verses ?? []) {
    const [s, a] = verse.verse_key.split(':').map(Number)
    for (const w of verse.words ?? []) {
      if (w.char_type_name !== 'word') continue
      words.push({
        s, a,
        wi: w.position,
        t:  w.text_uthmani,
        n:  normalize(w.text_uthmani),
        ln: w.line_number ?? 1,
      })
    }
  }

  const file = join(OUT_DIR, `page-${String(pageNum).padStart(3, '0')}.json`)
  writeFileSync(file, JSON.stringify(words), 'utf8')
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`📥 جلب 604 صفحة مع line_number → ${OUT_DIR}`)
  console.log('(يستغرق ~3 دقائق)\n')

  let errors = 0
  for (let p = 1; p <= 604; p++) {
    try {
      await fetchPage(p)
    } catch (e) {
      console.error(`  ❌ صفحة ${p}: ${e}`)
      errors++
    }
    if (p % 100 === 0 || p === 604) process.stdout.write(`  ✓ ${p}/604\n`)
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n${errors === 0 ? '✅' : `⚠️ ${errors} أخطاء`} اكتمل الجلب`)
}

main().catch(e => { console.error(e); process.exit(1) })
