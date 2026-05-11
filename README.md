# مراجعة — Muraja3a

> تطبيق مراجعة القرآن الكريم بالتكرار المتباعد الذكي  
> A smart spaced-repetition app for Quran memorization review

---

## المحتويات — Table of Contents

- [نظرة عامة — Overview](#نظرة-عامة--overview)
- [المميزات — Features](#المميزات--features)
- [الإشعارات — Notifications](#الإشعارات--notifications)
- [التقنيات — Tech Stack](#التقنيات--tech-stack)
- [الخوارزمية — Algorithm](#الخوارزمية--algorithm)
- [قاعدة البيانات — Database](#قاعدة-البيانات--database)
- [هيكل المشروع — Project Structure](#هيكل-المشروع--project-structure)
- [التشغيل — Getting Started](#التشغيل--getting-started)
- [الأوامر — Scripts](#الأوامر--scripts)

---

## نظرة عامة — Overview

**مراجعة** تطبيق ويب مبني على Next.js يساعد حافظ القرآن على تتبع مراجعاته بشكل منهجي.  
بدلاً من المراجعة العشوائية، يحسب التطبيق الموعد الأمثل لكل صفحة بناءً على قوة الذاكرة الفعلية.

**Muraja3a** is a Next.js web app that helps Quran memorizers track their reviews systematically.  
Instead of random review, the app calculates the optimal review date for each page based on actual memory strength.

---

## المميزات — Features

### إضافة الصفحات — Adding Pages

- **صفحة جديدة** — للصفحات التي يبدأ المستخدم حفظها لأول مرة  
  *New page* — for pages being memorized for the first time

- **محفوظة سابقاً** — لاستيراد صفحات محفوظة قبل استخدام التطبيق، مع 4 حالات:  
  *Previously memorized* — to import pages memorized before using the app, with 4 states:
  - ثابتة جداً / *Very strong*
  - جيدة / *Good*
  - مترددة / *Hesitant*
  - ضعيفة أو منسية / *Weak or forgotten*

- خيار **"راجعتها اليوم"** لتسجيل مراجعة حقيقية عند الإضافة  
  *"Reviewed today"* option to record an actual review at the time of adding

- تاريخ آخر مراجعة اختياري لحساب الموعد القادم بدقة  
  Optional last review date for accurate next-date calculation

- تاريخ الحفظ الأولي (شهر/سنة) كسقف للفاصل الأول  
  Initial memorization month as a cap for the first interval

### نظام المراجعة — Review System

طريقتان لتسجيل المراجعة / Two review modes:

**1. تقييم سريع — Quick Rating**

6 مستويات دقيقة بدلاً من القوي/المتوسط/الضعيف المعتاد:

| المستوى | الوصف | Level | Description |
|---------|-------|-------|-------------|
| 🌟 لا أخطاء | حفظت الصفحة بطلاقة | perfect | Recited flawlessly |
| ✅ خطأ بسيط | خطأ في حركة لم يؤثر | minor | Minor error, no impact |
| ⚠️ خطأ مؤثر | خطأ أوقفك أو غيّر المعنى | impactful | Error that stopped you |
| 🔸 2-3 أخطاء | أخطاء متعددة لكن تذكرت | few | Multiple but managed |
| ❌ 4-6 أخطاء | صعوبة واضحة | many | Clear difficulty |
| 🔄 نسيت تقريباً | لم تتذكر معظم الصفحة | lapse | Mostly forgotten |

**2. تحديد الكلمات الخاطئة — Word Mistake Tracking**

- يعرض نص الصفحة القرآنية كاملاً بالرسم العثماني  
  Displays full Uthmani Quranic text for the page
- المستخدم يضغط على الكلمات التي أخطأ فيها  
  User taps on the words they made mistakes on
- النظام يحسب مستوى الخطأ تلقائياً بناءً على عدد الكلمات وتكرار الأخطاء السابقة  
  System auto-calculates mistake level based on word count and repeat history
- الكلمات تُخزَّن مع سياقها (كلمتان قبل وبعد) للاستخدام المستقبلي في الاختبارات  
  Words stored with context (2 before/after) for future quiz features

### التقويم — Calendar

- عرض جميع الصفحات المجدولة للمراجعة مرتبة حسب التاريخ  
  All scheduled pages grouped by date
- مجموعات قابلة للطي / Collapsible date groups
- حذف بالسحب / Swipe-to-delete

### الإحصائيات — Statistics

- عدد الصفحات المحفوظة ومجموع المراجعات (تسميع وقراءة بشكل منفصل)  
  Total memorized pages and review counts (recitation and reading tracked separately)
- سلسلة الأيام المتواصلة / Daily streak
- توزيع التقييمات (ممتاز / جزئي / صعب)  
  Rating distribution (excellent / partial / hard)
- مراحل الحفظ (جديدة / نشطة / راسخة)  
  Memory stages (new / active / established)
- أكثر الكلمات التي أخطأت فيها مع تكرارها والصفحات  
  Top mistake words with frequency and page numbers

### القراءة السريعة — Quick Reading

وضع مكمّل للتسميع — يُستخدم لتثبيت الصفحات الحديثة دون أن يحلّ محل المراجعة الكاملة.  
A complementary mode to recitation — used to stabilize recent pages without replacing full review.

- يؤجّل الصفحة 1–3 أيام فقط / Postpones the page only 1–3 days
- لا يُعدّ مراجعة كاملة في الإحصائيات / Doesn't count as a full review in stats
- مفيد للصفحات الجديدة في طور الـ learning / Useful for fresh pages in the learning stage

### اللغة — Language

- واجهة كاملة بالعربية والإنجليزية / Full UI in Arabic and English
- يكتشف لغة المتصفح تلقائياً عند أول زيارة / Auto-detects from browser locale on first visit
- يُخزَّن الاختيار في `localStorage` + `user_preferences` / Selection persisted in `localStorage` and DB

### تطبيق ويب تقدّمي — PWA

- قابل للتثبيت على الشاشة الرئيسية في Android, iOS, Desktop  
  Installable to home screen on Android, iOS, and Desktop
- service worker جاهز لاستقبال Web Push  
  Service worker ready for Web Push reception
- يعمل في وضع `standalone` بدون شريط المتصفح  
  Runs in `standalone` mode without browser chrome

---

## الإشعارات — Notifications

تذكير يومي بصفحات المراجعة المستحقة عبر قناتَين مستقلَّتَين، بتوقيت محلي لكل مستخدم.  
Daily reminders for pages due for review, via two independent channels, in each user's local time.

### القنوات — Channels

**🔔 Web Push** — يعمل في كل المتصفحات الحديثة (Chrome, Firefox, Edge, Safari iOS 16.4+).
لتفعيله على iOS يجب تثبيت التطبيق كـ PWA على الشاشة الرئيسية أولاً.  
*Works in all modern browsers. iOS requires installing the app as a PWA first.*

**📧 Email** — يصل لأي عنوان مُسجَّل، مفيد كاحتياط لمستخدمي iOS غير المثبِّتين، أو لأي جهاز بلا اشتراك push.  
*Reaches any registered address — fallback for iOS users without PWA install, or any unsubscribed device.*

### كيف يشتغل — How it works

```
pg_cron (hourly)                                                            
  │                                                                         
  ▼                                                                         
Supabase Edge Function (send-due-reminders, Deno)                           
  │                                                                         
  ├── reads user_preferences (timezone, reminder_hour, lang)                
  ├── counts pages where next_review_date ≤ today_in_user_tz                
  ├── push  → npm:web-push  → user's subscribed devices                      
  ├── email → Resend HTTP API → user's email                                 
  └── logs to notification_logs (idempotent on user+date+channel)            
```

### الميزات الإضافية — Extras

- **HMAC-signed unsubscribe link** in every email (one-click via RFC 8058 `List-Unsubscribe` headers — works with Gmail's native unsubscribe button)
- **Per-device push subscriptions** — same user, different browsers (Chrome / Safari / mobile) each receive separately
- **Stale-endpoint cleanup** — `410 Gone` responses auto-delete the subscription row
- **iOS detection** in the settings UI — shows install-to-home-screen guidance instead of a broken toggle

---

## التقنيات — Tech Stack

| الطبقة | التقنية |
|--------|---------|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | React 19, inline styles (RTL/LTR, AR + EN) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Edge | Supabase Edge Functions (Deno runtime) |
| Scheduling | `pg_cron` + `pg_net` extensions |
| Push | Web Push API (VAPID) + `web-push` npm package |
| Email | Resend HTTP API |
| PWA | Service worker, manifest, install prompt |
| Testing | Vitest 4 — 53 unit tests |
| Font | Amiri Quran (Google Fonts) |

---

## الخوارزمية — Algorithm

### Quran Memory Scheduler v1

خوارزمية تكرار متباعد مخصصة لحفظ القرآن، مبنية على مبادئ FSRS مع تعديلات للسياق القرآني.  
A custom spaced-repetition algorithm built for Quran memorization, based on FSRS principles with Quran-specific adjustments.

#### الحقول الداخلية — Internal Fields

| الحقل | المعنى | Meaning |
|-------|--------|---------|
| `stability_days` | عدد الأيام قبل بدء الضعف | Days until memory starts fading |
| `difficulty` | صعوبة الصفحة (0.1–1.0) | Page difficulty for this user |
| `review_stage` | مرحلة الحفظ | Memory stage |
| `lapses` | عدد مرات النسيان | Number of forgotten reviews |
| `warm_up_count` | عدد مراجعات الإحماء (0–5) | Warm-up review count |
| `risk_score` | درجة الخطر لترتيب الصفحات | Risk score for daily ordering |

#### المراحل — Stages

```
learning  ──►  review  ──►  mature
   ▲              │              │
   └──── fragile ◄┴──────────────┘
```

- **learning**: صفحات جديدة أو مسترجعة / New or re-learning pages
- **review**: دخلت النظام الطبيعي / In normal review cycle
- **mature**: ثابتة وقوية / Strong and stable (interval > 21 days)
- **fragile**: كانت راسخة لكن بدأت تضعف / Was mature but weakening — unique to Quran memorization

#### الـ Warm-up

أول 5 مراجعات محافظة بجدول ثابت / First 5 reviews use a conservative fixed table:

```
Review 0 (perfect) → 1 day
Review 1 (perfect) → 3 days
Review 2 (perfect) → 7 days
Review 3 (perfect) → 14 days
Review 4 (perfect) → 21 days
```

#### صيغة الحساب — Calculation

```
R = exp(-elapsed / stability)               // Retrievability (احتمال التذكر)
growth = baseMult × (1 + (1-R) × 0.8) × (1 - difficulty × 0.4)
stability_new = clamp(stability × growth, 0.5, 90)
interval = min(round(stability_new), stage_max_interval)
```

حدود الفاصل بحسب المرحلة / Max interval per stage:

| المرحلة | الحد الأقصى |
|---------|------------|
| learning | 14 days |
| review | 90 days |
| mature | 90 days |
| fragile | 7 days |
| lapse (أي مرحلة) | 3 days always |

---

## قاعدة البيانات — Database

### الجداول — Tables

**`pages`** — تقدم المستخدم لكل صفحة / User progress per Quran page  
**`review_logs`** — سجل تاريخي لكل مراجعة / Historical log of every review (with `review_type`: recitation or reading)  
**`word_mistakes`** — تتبع الكلمات الخاطئة / Word-level mistake tracking with context  
**`user_preferences`** — تذكير يومي + لغة + توقيت + قنوات / Reminder hour, timezone, language, channel toggles  
**`push_subscriptions`** — اشتراكات Web Push لكل جهاز / Per-device Web Push subscriptions  
**`notification_logs`** — سجل الإرسال (idempotency) / Send audit log, unique on `(user_id, sent_date, channel)`

### الأمان — Security

- Row Level Security (RLS) مفعّل على جميع الجداول  
  RLS enabled on all tables — users only access their own data
- كل insert محمي بـ `WITH CHECK (auth.uid() = user_id)`  
  Every insert protected with `WITH CHECK`

### Migrations

```
migrations/
├── 001_initial_schema.sql          # Core tables + RLS
├── 002_quran_scheduler_v1.sql      # Scheduler v1 columns + backfill
├── 003_initial_memory_state.sql    # Initial memory state tracking
├── 004_memorized_at.sql            # Memorization date field
├── 005_fix_current_interval.sql    # Data integrity fix
├── 006_word_mistakes.sql           # Word mistake tracking table
├── 007_reading_review.sql          # Reading vs recitation review separation
├── 008_notifications.sql           # user_preferences, push_subscriptions, notification_logs
└── 008b_notifications_grants.sql   # GRANT statements for authenticated + service_role
```

> After applying any migration, run `NOTIFY pgrst, 'reload schema';` so the PostgREST cache picks up new columns.

---

## هيكل المشروع — Project Structure

```
muraja3a/
├── migrations/                     # SQL migrations (run in Supabase)
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker (push + notificationclick)
│   ├── icon.svg                    # App icon (scalable)
│   └── quran/                      # 604 JSON files — Uthmani Quran word data
│       ├── page-001.json
│       └── ... page-604.json
├── scripts/
│   ├── fetch-quran-pages.ts        # One-time: fetch Quran data from quran.com API
│   └── verify-quran-source.ts      # Verify page mapping vs. Madina mushaf
├── supabase/
│   └── functions/
│       └── send-due-reminders/
│           ├── index.ts            # Deno dispatcher (push + email + idempotency)
│           └── email-template.ts   # AR/EN HTML email
├── src/
│   ├── app/
│   │   ├── page.tsx                # Landing page (unauthenticated)
│   │   ├── layout.tsx              # Root layout + manifest + RegisterSW
│   │   ├── globals.css             # CSS variables (dark theme)
│   │   ├── dashboard/              # Today's reviews + FAB + hamburger menu
│   │   ├── add/                    # Add page (new / previously memorized)
│   │   ├── review/[id]/            # Review: quick rating or word tracking
│   │   ├── pages/[id]/             # Page details + full review history
│   │   ├── calendar/               # Upcoming sessions grouped by date
│   │   ├── stats/                  # Statistics + top mistake words
│   │   ├── test/                   # Placeholder for future surprise-quiz feature
│   │   ├── auth/                   # Login / Sign up
│   │   ├── account/                # Account + language + notification settings + logout
│   │   ├── reset-password/         # Password reset
│   │   ├── update-password/        # Password update (after email link)
│   │   └── api/
│   │       ├── quran/[page]/                       # Serves Quran page JSON
│   │       └── notifications/
│   │           ├── subscribe/                      # POST — save push subscription
│   │           ├── unsubscribe/                    # POST — remove push subscription
│   │           ├── test/                           # POST — send test push to current device
│   │           └── email-unsubscribe/              # GET (HTML) + POST (RFC 8058) — opt out
│   ├── components/
│   │   ├── BottomNav.tsx           # Shared bottom navigation (4 tabs)
│   │   ├── RegisterSW.tsx          # Client component that registers /sw.js on mount
│   │   └── QuranPage.tsx           # Interactive Uthmani text with word selection
│   └── lib/
│       ├── types.ts                # All TypeScript types (incl. UserPreferences, PushSubscriptionRow)
│       ├── quran-scheduler.ts      # Core SRS algorithm (Quran Memory Scheduler v1)
│       ├── quran-scheduler.test.ts # Vitest unit tests
│       ├── quran-data.ts           # Load page JSON + SURAH_NAMES + groupByAyah
│       ├── word-scorer.ts          # calcMistakeLevel + saveWordMistakes
│       ├── arabic.ts               # normalizeArabic() — strips diacritics
│       ├── spaced-rep.ts           # addDays, todayStr, formatDate, daysDiff
│       ├── supabase.ts             # Supabase client (localStorage session)
│       ├── supabase-server.ts      # authFromRequest — verifies Bearer JWT in API routes
│       ├── push.ts                 # Client helpers: subscribe / unsubscribe / sendTestPush
│       ├── unsubscribe-token.ts    # HMAC sign/verify for one-click email unsubscribe
│       ├── i18n.tsx                # LanguageProvider + useI18n hook
│       ├── translations.ts         # All AR + EN strings
│       └── utils.ts                # uid() → crypto.randomUUID()
```

---

## التشغيل — Getting Started

### المتطلبات — Prerequisites

- Node.js 18+
- Supabase project (free tier works)

### الإعداد — Setup

```bash
# 1. Clone the repo
git clone https://github.com/hussamossss/muraja3a.git
cd muraja3a

# 2. Install dependencies
npm install

# 3. Create environment file — see .env.example for the full template
cp .env.example .env.local
# Then fill in:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#   (for notifications:) NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
#   VAPID_SUBJECT, RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
#   NOTIFICATION_HMAC_SECRET

# 4. Run migrations in Supabase SQL Editor — execute 001 → 008b in order,
#    then: NOTIFY pgrst, 'reload schema';

# 5. Start the app
npm run dev
```

### الإشعارات (اختياري) — Notifications (Optional)

اتبع هذه الخطوات فقط لو تبغى تفعّل التذكير اليومي بـ push + email.  
Only follow these steps if you want to enable daily push + email reminders.

```bash
# A. Generate a VAPID key pair (for Web Push)
npx web-push generate-vapid-keys --json
# → store NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY in .env.local

# B. Generate an HMAC secret (for unsubscribe tokens) and a cron secret
openssl rand -hex 32   # → NOTIFICATION_HMAC_SECRET
openssl rand -hex 32   # → CRON_SECRET (used by pg_cron to call the Edge Function)

# C. Sign up at resend.com → get API key → set RESEND_API_KEY

# D. Install Supabase CLI and link the project
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>

# E. Set Edge Function secrets (Supabase auto-injects SUPABASE_SERVICE_ROLE_KEY)
supabase secrets set \
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com \
  RESEND_API_KEY=re_... RESEND_FROM_EMAIL='Muraja3a <reminders@your-domain.com>' \
  APP_URL=https://your-domain.com \
  NOTIFICATION_HMAC_SECRET=... CRON_SECRET=...

# F. Deploy the dispatcher
supabase functions deploy send-due-reminders --no-verify-jwt

# G. Schedule it hourly via pg_cron — run in Supabase SQL Editor:
#    create extension if not exists pg_cron;
#    create extension if not exists pg_net;
#    select cron.schedule('send-due-reminders-hourly', '0 * * * *', $$
#      select net.http_post(
#        url := 'https://<ref>.supabase.co/functions/v1/send-due-reminders',
#        headers := jsonb_build_object(
#          'Authorization', 'Bearer <CRON_SECRET>',
#          'Content-Type',  'application/json'
#        ),
#        body := '{}'::jsonb
#      );
#    $$);
```

To manually trigger a test send for a specific user:

```bash
curl -X POST \
  "https://<ref>.supabase.co/functions/v1/send-due-reminders?user_id=<uuid>&dry=1" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### بيانات القرآن — Quran Data

ملفات JSON موجودة بالفعل في `public/quran/` (604 ملف).  
JSON files are already included in `public/quran/` (604 files).

لإعادة التوليد من المصدر / To regenerate from source:

```bash
npx tsx scripts/fetch-quran-pages.ts
```

المصدر: Quran.com API v4 — تم التحقق يدوياً من صفحات محددة مقارنةً بمصحف المدينة 604 صفحة.  
*Source: Quran.com API v4 — manually verified in this project against selected Madinah mushaf pages.*

---

## الأوامر — Scripts

```bash
npm run dev          # Development server (Turbopack)
npm run build        # Production build
npm start            # Start production server
npm test             # Run unit tests (Vitest) — currently 53
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run clean        # Remove .next/
npm run clean:all    # Remove .next/ and node_modules/
```
