/**
 * Phase 0 — Quran source verification
 * يجلب 5 صفحات محددة من Quran.com API v4
 * ويطبع: أول/آخر آية، عدد الكلمات، أول/آخر 10 كلمات
 *
 * يُشغَّل مرة واحدة للتحقق — لا يُغيِّر أي ملف في المشروع.
 * بعد التحقق يُحذف أو يُبقى للمرجعية.
 */

const PAGES_TO_VERIFY = [1, 2, 22, 255, 604]
const API_BASE        = 'https://api.quran.com/api/v4'

interface ApiWord {
  id:             number
  position:       number
  text_uthmani:   string
  verse_key:      string  // مثال "1:1"
}

interface ApiVerse {
  id:          number
  verse_key:   string
  verse_number: number
  words:       ApiWord[]
}

interface ApiResponse {
  verses: ApiVerse[]
  meta: {
    current_page: number
    total_count:  number
  }
}

async function verifyPage(pageNum: number): Promise<void> {
  const url = `${API_BASE}/verses/by_page/${pageNum}?words=true&word_fields=text_uthmani&per_page=50`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })

  if (!res.ok) {
    console.error(`  ❌ HTTP ${res.status} for page ${pageNum}`)
    return
  }

  const data: ApiResponse = await res.json()
  const verses = data.verses

  if (!verses || verses.length === 0) {
    console.error(`  ❌ No verses returned for page ${pageNum}`)
    return
  }

  const firstVerse = verses[0]
  const lastVerse  = verses[verses.length - 1]

  // اجمع كل الكلمات
  const allWords: ApiWord[] = verses.flatMap(v => v.words ?? [])

  const first10 = allWords.slice(0, 10).map(w => w.text_uthmani)
  const last10  = allWords.slice(-10).map(w => w.text_uthmani)

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📄 صفحة ${pageNum}`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`  أول آية:   ${firstVerse.verse_key}`)
  console.log(`  آخر آية:   ${lastVerse.verse_key}`)
  console.log(`  عدد الآيات: ${verses.length}`)
  console.log(`  عدد الكلمات: ${allWords.length}`)
  console.log(`\n  ▶ أول 10 كلمات:`)
  console.log(`  ${first10.join('  ')}`)
  console.log(`\n  ◀ آخر 10 كلمات:`)
  console.log(`  ${last10.join('  ')}`)
}

async function main() {
  console.log('🔍 Phase 0 — التحقق من مصدر Quran.com API v4')
  console.log('المصدر: https://api.quran.com/api/v4')
  console.log('الهدف: التأكد من تطابق page_number مع مصحف المدينة 604 صفحة\n')

  for (const page of PAGES_TO_VERIFY) {
    await verifyPage(page)
    await new Promise(r => setTimeout(r, 300)) // تجنب rate limiting
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log('✅ انتهى التحقق — راجع النتائج مقارنةً بالمصحف الورقي')
  console.log('═'.repeat(60))
}

main().catch(console.error)
