/**
 * Arabic text utilities — normalizeArabic strips diacritics and
 * unifies common glyph variants for comparison purposes.
 * Display always uses the original Uthmani text — never normalized.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٟ]/g, '')          // tashkeel (fathatan → sukun)
    .replace(/[ؐ-ؚ]/g, '')          // Arabic sign / Quranic annotation
    .replace(/ٰ/g, '')               // superscript alef (tatweel diacritic)
    .replace(/[ۖ-ۭ]/g, '')          // Quranic pause & sajdah marks
    .replace(/[آأإٱ]/g, 'ا')        // alef variants → bare alef
    .replace(/ؤ/g, 'و')             // waw with hamza
    .replace(/ئ/g, 'ي')             // ya with hamza
    .replace(/ة/g, 'ه')             // ta marbuta
    .replace(/ى/g, 'ي')             // alef maqsura
    .trim()
}
