import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function RootPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (session) redirect('/dashboard')

  return <LandingPage />
}

// ── Colour tokens ─────────────────────────────────────────────────
const T = {
  bg:     '#0B0D0C',
  card:   '#161A18',
  border: '#252B28',
  title:  '#FFFFFF',
  sub:    '#8A8F8F',
  green:  '#22C55E',
  accent: '#38BDF8',
  purple: '#A855F7',
  orange: '#F97316',
}

function LandingPage() {
  return (
    <div style={{ background: T.bg, color: T.title, fontFamily:"'Amiri','Cairo',Georgia,serif", direction:'rtl', minHeight:'100vh' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .a1{animation:fadeUp .7s ease both}
        .a2{animation:fadeUp .7s .15s ease both}
        .a3{animation:fadeUp .7s .3s ease both}
        a{text-decoration:none}
        *{box-sizing:border-box}
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 28px', borderBottom:`1px solid ${T.border}`, position:'sticky', top:0, background:`${T.bg}F0`, backdropFilter:'blur(12px)', zIndex:10 }}>
        <div style={{ fontSize:22, fontWeight:800, color: T.green, letterSpacing:-.5 }}>مُراجِع</div>
        <Link href="/auth">
          <span style={{ background: T.green, color:'#000', padding:'9px 24px', borderRadius:22, fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-block' }}>
            تسجيل الدخول
          </span>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign:'center', padding:'88px 24px 72px', maxWidth:720, margin:'0 auto' }}>
        <div className="a1" style={{ fontSize:13, fontWeight:700, color: T.green, background:`${T.green}15`, display:'inline-block', padding:'6px 18px', borderRadius:20, marginBottom:28, letterSpacing:.8 }}>
          نظام التكرار المتباعد للقرآن الكريم
        </div>
        <h1 className="a2" style={{ fontSize:'clamp(38px,9vw,68px)', fontWeight:800, lineHeight:1.15, margin:'0 0 22px', letterSpacing:-.5 }}>
          لا تنسَ ما<br/>
          <span style={{ color: T.green }}>حفظت</span>
        </h1>
        <p className="a3" style={{ fontSize:17, color: T.sub, lineHeight:1.8, margin:'0 0 44px', maxWidth:480, marginInline:'auto' }}>
          تطبيق ذكي يحدّد لك بدقة علمية متى تراجع كل صفحة،
          فتبقى مراجعاتك منتظمة وذاكرتك حاضرة
        </p>
        <div className="a3" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/auth">
            <span style={{ background: T.green, color:'#000', padding:'15px 40px', borderRadius:30, fontSize:16, fontWeight:800, cursor:'pointer', display:'inline-block', boxShadow:`0 8px 28px ${T.green}35` }}>
              ابدأ مجاناً ←
            </span>
          </Link>
          <a href="#features">
            <span style={{ color: T.sub, padding:'15px 24px', borderRadius:30, fontSize:15, fontWeight:600, cursor:'pointer', border:`1px solid ${T.border}`, display:'inline-block' }}>
              اعرف أكثر
            </span>
          </a>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'center', flexWrap:'wrap' }}>
        {[
          { num:'604',  label:'صفحة قابلة للتتبع' },
          { num:'3',    label:'مستويات تقييم للحفظ' },
          { num:'آلي',  label:'جدولة ذكية تلقائية' },
          { num:'٪١٠٠', label:'مجاني بالكامل'      },
        ].map((s, i) => (
          <div key={i} style={{ flex:'1 1 130px', textAlign:'center', padding:'22px 16px', borderLeft: i > 0 ? `1px solid ${T.border}` : 'none' }}>
            <div style={{ fontSize:30, fontWeight:800, color: T.green }}>{s.num}</div>
            <div style={{ fontSize:12, color: T.sub, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <section id="features" style={{ padding:'72px 24px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:12, color: T.accent, fontWeight:700, marginBottom:10, letterSpacing:1 }}>المميزات</div>
          <h2 style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:800, margin:0 }}>كل ما تحتاجه في مكان واحد</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: T.card, border:`1px solid ${T.border}`, borderTop:`3px solid ${f.color}`, borderRadius:18, padding:'28px 22px' }}>
              <div style={{ fontSize:34, marginBottom:16 }}>{f.icon}</div>
              <div style={{ fontSize:17, fontWeight:700, color: T.title, marginBottom:10 }}>{f.title}</div>
              <div style={{ fontSize:13, color: T.sub, lineHeight:1.8 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: T.card, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:'72px 24px' }}>
        <div style={{ maxWidth:760, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:12, color: T.purple, fontWeight:700, marginBottom:10, letterSpacing:1 }}>كيف يعمل</div>
          <h2 style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:800, margin:'0 0 52px' }}>أربع خطوات وأنت تنطلق</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:32 }}>
            {STEPS.map((s, i) => (
              <div key={i}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:`${s.color}15`, border:`2px solid ${s.color}50`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:11, color: s.color, fontWeight:700, marginBottom:6, letterSpacing:.5 }}>الخطوة {i + 1}</div>
                <div style={{ fontSize:15, fontWeight:700, color: T.title, marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:12, color: T.sub, lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For whom ── */}
      <section style={{ padding:'72px 24px', maxWidth:900, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <div style={{ fontSize:12, color: T.orange, fontWeight:700, marginBottom:10, letterSpacing:1 }}>لمن هذا التطبيق؟</div>
          <h2 style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:800, margin:0 }}>مُصمَّم لكل حافظ</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
          {AUDIENCE.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, background: T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px' }}>
              <span style={{ fontSize:26, flexShrink:0, lineHeight:1 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color: T.title, marginBottom:5 }}>{a.title}</div>
                <div style={{ fontSize:12, color: T.sub, lineHeight:1.6 }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign:'center', padding:'88px 24px', background:`linear-gradient(160deg, #0d1f10 0%, ${T.bg} 100%)`, borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:12, color: T.green, fontWeight:700, marginBottom:16, letterSpacing:1 }}>ابدأ اليوم — مجاناً تماماً</div>
        <h2 style={{ fontSize:'clamp(28px,6vw,50px)', fontWeight:800, margin:'0 0 18px', lineHeight:1.3 }}>
          انضم وحافظ على كتاب الله
        </h2>
        <p style={{ fontSize:16, color: T.sub, margin:'0 0 40px', maxWidth:380, marginInline:'auto', lineHeight:1.7 }}>
          سجّل الآن مجاناً وابدأ رحلتك في المراجعة المنتظمة
        </p>
        <Link href="/auth">
          <span style={{ background: T.green, color:'#000', padding:'17px 52px', borderRadius:34, fontSize:17, fontWeight:800, cursor:'pointer', display:'inline-block', boxShadow:`0 10px 36px ${T.green}40` }}>
            سجّل مجاناً ←
          </span>
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:`1px solid ${T.border}`, padding:'28px 24px', textAlign:'center' }}>
        <div style={{ fontSize:20, fontWeight:800, color: T.green, marginBottom:8 }}>مُراجِع</div>
        <div style={{ fontSize:12, color: T.sub }}>تطبيق مراجعة حفظ القرآن الكريم · نظام التكرار المتباعد</div>
      </footer>
    </div>
  )
}

// ── Content data ──────────────────────────────────────────────────

const FEATURES = [
  {
    icon:'🧠', color:'#22C55E',
    title:'تكرار متباعد علمي',
    desc:'النظام يحسب تلقائياً متى تراجع كل صفحة بناءً على مستوى حفظك — كلما كان أقوى، زاد الفاصل قبل المراجعة التالية.',
  },
  {
    icon:'📋', color:'#38BDF8',
    title:'جدولة يومية واضحة',
    desc:'افتح التطبيق كل يوم وستجد قائمة واضحة بالصفحات المستحقة اليوم فقط — لا تشتت، لا أعباء زائدة.',
  },
  {
    icon:'📊', color:'#A855F7',
    title:'إحصائيات تفصيلية',
    desc:'تتبع أيامك المتواصلة، عدد مراجعاتك، توزيع قوة حفظك، ومراحل تطور كل صفحة من جديدة إلى راسخة.',
  },
  {
    icon:'📅', color:'#F97316',
    title:'تقويم الجلسات القادمة',
    desc:'شاهد مراجعاتك المجدولة في الأيام والأسابيع القادمة مجمّعة حسب التاريخ، مع وصول مباشر لكل صفحة.',
  },
  {
    icon:'⚡', color:'#22C55E',
    title:'مراجعة في ثوانٍ',
    desc:'بعد كل مراجعة، قيّم حفظك بضغطة واحدة (قوي / متوسط / ضعيف) والنظام يجدول الموعد القادم تلقائياً.',
  },
  {
    icon:'🔒', color:'#38BDF8',
    title:'بيانات آمنة ومشفرة',
    desc:'بياناتك محمية بالكامل. لا إعلانات، لا بيع بيانات — تطبيق نظيف مخصص للعبادة.',
  },
]

const STEPS = [
  { icon:'📖', color:'#22C55E', title:'أضف صفحاتك',  desc:'أدخل أرقام الصفحات التي حفظتها' },
  { icon:'🔔', color:'#38BDF8', title:'راجع يومياً',   desc:'افتح التطبيق وراجع ما هو مستحق اليوم' },
  { icon:'⭐', color:'#F97316', title:'قيّم حفظك',     desc:'اختر قوي أو متوسط أو ضعيف بعد المراجعة' },
  { icon:'📈', color:'#A855F7', title:'تابع تقدمك',    desc:'شاهد إحصائياتك تتحسن يوماً بعد يوم' },
]

const AUDIENCE = [
  { icon:'🕌', title:'طلاب المعاهد الشرعية',  desc:'راجع حفظك بانتظام خلال فترة الدراسة'   },
  { icon:'👨‍👩‍👧', title:'الحافظون المنزليون',    desc:'حافظ على حفظك بدون إشراف مدرسي'         },
  { icon:'🌙', title:'حافظو ختمة رمضان',       desc:'جهّز نفسك قبل رمضان وحافظ على مستواك'   },
  { icon:'📚', title:'المبتدئون في الحفظ',      desc:'ابنِ عادة المراجعة من اليوم الأول'        },
]
