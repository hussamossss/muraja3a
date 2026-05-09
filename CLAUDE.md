@AGENTS.md

# مُراجِع — Quran Review Scheduler

تطبيق ويب لمراجعة حفظ القرآن الكريم باستخدام نظام التكرار المتباعد (Spaced Repetition).
المستخدم يضيف الصفحات التي حفظها، ويقيّم مستواه بعد كل مراجعة، والنظام يجدول المراجعة القادمة تلقائياً.

## المكدس التقني

- **Next.js 16.2.4** (App Router + Turbopack) — React 19
- **Supabase** — PostgreSQL + Auth + RLS
- **TypeScript** — strict mode
- **Tailwind CSS v4** — للتخطيط العام فقط، التصميم الداخلي بـ inline styles
- **Vitest** — اختبارات الخوارزمية

## هيكل المشروع

```
src/
  app/
    page.tsx              ← landing page (client component, يتحقق من session)
    auth/page.tsx         ← تسجيل دخول / إنشاء حساب
    dashboard/page.tsx    ← قائمة الصفحات المستحقة اليوم
    add/page.tsx          ← إضافة صفحة جديدة (جديدة أو محفوظة سابقاً)
    review/[id]/page.tsx  ← واجهة المراجعة (quick mode أو words mode)
    calendar/page.tsx     ← تقويم المراجعات القادمة
    stats/page.tsx        ← إحصائيات + أكثر الكلمات خطأً
    account/page.tsx      ← تسجيل خروج
    api/quran/[page]/     ← API route يخدم صفحات القرآن من /public/quran/
  components/
    QuranPage.tsx         ← عرض الصفحة القرآنية سطراً سطراً (mushaf layout)
    BottomNav.tsx         ← شريط التنقل السفلي
  lib/
    quran-scheduler.ts    ← خوارزمية الجدولة (القلب الأساسي)
    quran-scheduler.test.ts
    word-scorer.ts        ← حساب MistakeLevel من الكلمات المختارة
    quran-data.ts         ← تحميل بيانات القرآن + أسماء السور
    types.ts              ← جميع الأنواع المشتركة
    supabase.ts           ← Supabase client (singleton)
    arabic.ts             ← تطبيع النص العربي
    spaced-rep.ts         ← دوال التاريخ المساعدة
    utils.ts              ← uid()
public/
  quran/                  ← 604 ملف JSON (page-001.json … page-604.json)
migrations/               ← 006 ملف SQL
```

## قاعدة البيانات (Supabase)

جداول رئيسية: `pages` · `review_logs` · `word_mistakes`

**`pages`** — صفحة واحدة لكل مستخدم:
`stability_days`, `difficulty`, `review_stage`, `lapses`, `risk_score`,
`warm_up_count`, `consecutive_good`, `last_mistake_level`, `initial_memory_state`

**`word_mistakes`** — كل كلمة خاطئة في كل مراجعة:
`page_id`, `page_number`, `surah_number`, `ayah_number`, `word_index`,
`word_text`, `normalized_word`, `context_before`, `context_after`

## خوارزمية الجدولة (`quran-scheduler.ts`)

نظام مخصص مستوحى من FSRS:

- **Warm-up** (أول 5 مراجعات): جدول ثابت حسب `MistakeLevel`
- **Full algorithm**: يحسب `retrievability R = e^(-elapsed/stability)`
- **MistakeLevel**: `perfect | minor | impactful | few | many | lapse`
- **ReviewStage**: `learning → review → mature ↔ fragile`
- الـ `stability` يرتفع عند الأداء الجيد وينخفض بشدة عند `lapse`

**لا تلمس هذه الملفات إلا لسبب واضح:**
`quran-scheduler.ts` · `spaced-rep.ts` · `utils.ts`

## نظام تتبع الكلمات (`word-scorer.ts`)

- `calcMistakeLevel(words, userId, pageId)` — يحسب المستوى من الكلمات المختارة
- الوزن مقيّد بـ `pageId` فقط — الكلمات الشائعة لا تنتقل بين الصفحات
- `saveWordMistakes(...)` — يحفظ كل كلمة مع السياق (كلمتان قبل + بعد)

## عرض القرآن (`QuranPage.tsx`)

- JSON لكل صفحة يحتوي `{ s, a, wi, t, n, ln }` (سورة، آية، رقم الكلمة، نص، normalized، رقم السطر)
- يُعرض سطراً سطراً بـ `flex row` — الأسطر الممتلئة `space-between`، القصيرة `center`
- `maxWidth: 440px` ثابت بغض النظر عن حجم الشاشة
- وضعان: `interactive=false` (عرض فقط) و `interactive=true` (تحديد كلمات)

## قواعد عامة

- الـ supabase client في `src/lib/supabase.ts` — لا تنشئ instance ثانية
- Auth: `getSession()` للتحقق في `useEffect`، `getUser()` في add page
- جميع صفحات التطبيق `'use client'` ما عدا `layout.tsx` و `api/`
- لا تغيير في schema قاعدة البيانات بدون migration SQL جديد
- `npm test` يجب أن يمر بـ 34 اختباراً قبل أي commit
