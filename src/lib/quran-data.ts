import type { QuranWord } from './types'

// ── Surah names (1-indexed) ───────────────────────────────────────────────────
export const SURAH_NAMES: Record<number, string> = {
  1:'الفاتحة',2:'البقرة',3:'آل عمران',4:'النساء',5:'المائدة',
  6:'الأنعام',7:'الأعراف',8:'الأنفال',9:'التوبة',10:'يونس',
  11:'هود',12:'يوسف',13:'الرعد',14:'إبراهيم',15:'الحجر',
  16:'النحل',17:'الإسراء',18:'الكهف',19:'مريم',20:'طه',
  21:'الأنبياء',22:'الحج',23:'المؤمنون',24:'النور',25:'الفرقان',
  26:'الشعراء',27:'النمل',28:'القصص',29:'العنكبوت',30:'الروم',
  31:'لقمان',32:'السجدة',33:'الأحزاب',34:'سبأ',35:'فاطر',
  36:'يس',37:'الصافات',38:'ص',39:'الزمر',40:'غافر',
  41:'فصلت',42:'الشورى',43:'الزخرف',44:'الدخان',45:'الجاثية',
  46:'الأحقاف',47:'محمد',48:'الفتح',49:'الحجرات',50:'ق',
  51:'الذاريات',52:'الطور',53:'النجم',54:'القمر',55:'الرحمن',
  56:'الواقعة',57:'الحديد',58:'المجادلة',59:'الحشر',60:'الممتحنة',
  61:'الصف',62:'الجمعة',63:'المنافقون',64:'التغابن',65:'الطلاق',
  66:'التحريم',67:'الملك',68:'القلم',69:'الحاقة',70:'المعارج',
  71:'نوح',72:'الجن',73:'المزمل',74:'المدثر',75:'القيامة',
  76:'الإنسان',77:'المرسلات',78:'النبأ',79:'النازعات',80:'عبس',
  81:'التكوير',82:'الانفطار',83:'المطففين',84:'الانشقاق',85:'البروج',
  86:'الطارق',87:'الأعلى',88:'الغاشية',89:'الفجر',90:'البلد',
  91:'الشمس',92:'الليل',93:'الضحى',94:'الشرح',95:'التين',
  96:'العلق',97:'القدر',98:'البينة',99:'الزلزلة',100:'العاديات',
  101:'القارعة',102:'التكاثر',103:'العصر',104:'الهمزة',105:'الفيل',
  106:'قريش',107:'الماعون',108:'الكوثر',109:'الكافرون',110:'النصر',
  111:'المسد',112:'الإخلاص',113:'الفلق',114:'الناس',
}

// البسملة — تُعرض كفاصل بين السور (عدا الفاتحة والتوبة)
export const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'

// السور التي لا تبدأ بالبسملة (التوبة فقط — الفاتحة فيها البسملة آية)
export const NO_BASMALA_SURAHS = new Set([9])

/**
 * Loads word data for a single Quran page from the static JSON files
 * bundled in /public/quran/.
 * Files are generated once by scripts/fetch-quran-pages.ts
 */
export async function loadPageWords(pageNumber: number): Promise<QuranWord[]> {
  const res = await fetch(`/api/quran/${pageNumber}`)
  if (!res.ok) throw new Error(`Quran page ${pageNumber} not found (HTTP ${res.status})`)
  return res.json()
}

/**
 * Groups a flat word array by ayah.
 */
export function groupByAyah(
  words: QuranWord[]
): { key: string; surah: number; ayah: number; words: QuranWord[] }[] {
  const map = new Map<string, { surah: number; ayah: number; words: QuranWord[] }>()
  for (const w of words) {
    const key = `${w.s}:${w.a}`
    if (!map.has(key)) map.set(key, { surah: w.s, ayah: w.a, words: [] })
    map.get(key)!.words.push(w)
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v }))
}

/**
 * Groups words by line number for mushaf-accurate rendering.
 * Each line entry knows its surah (to detect surah changes) and
 * which ayah numbers end on that line (for ayah markers).
 */
export function groupByLine(words: QuranWord[]): {
  ln:        number
  words:     QuranWord[]
  ayahEnds:  { ayah: number; surah: number }[]  // ayahs that END on this line
  newSurahs: number[]                            // surahs that START on this line
}[] {
  const map = new Map<number, { words: QuranWord[] }>()

  for (const w of words) {
    if (!map.has(w.ln)) map.set(w.ln, { words: [] })
    map.get(w.ln)!.words.push(w)
  }

  const lines = [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ln, { words: lw }]) => {
      // Ayah markers: appear after last word of each ayah
      const ayahEnds: { ayah: number; surah: number }[] = []
      const seen = new Set<string>()
      for (let i = 0; i < lw.length; i++) {
        const w = lw[i]
        const key = `${w.s}:${w.a}`
        const nextIsDifferent = i === lw.length - 1 || lw[i + 1].a !== w.a || lw[i + 1].s !== w.s
        if (nextIsDifferent && !seen.has(key)) {
          // check if this ayah actually ends here (next word of same ayah is on next line or doesn't exist)
          const allWordsOfAyah = words.filter(x => x.s === w.s && x.a === w.a)
          const lastWordOfAyah = allWordsOfAyah[allWordsOfAyah.length - 1]
          if (lastWordOfAyah.ln === ln) {
            ayahEnds.push({ ayah: w.a, surah: w.s })
            seen.add(key)
          }
        }
      }

      // Detect surah starts: first word of a surah on this line
      const newSurahs: number[] = []
      const surahsSeen = new Set<number>()
      for (const w of lw) {
        if (!surahsSeen.has(w.s)) {
          surahsSeen.add(w.s)
          const allWordsOfSurah = words.filter(x => x.s === w.s)
          if (allWordsOfSurah[0].ln === ln) newSurahs.push(w.s)
        }
      }

      return { ln, words: lw, ayahEnds, newSurahs }
    })

  return lines
}
