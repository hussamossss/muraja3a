'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Page, ReviewLog } from '@/lib/types'
import { todayStr } from '@/lib/spaced-rep'
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/translations'

function localDate(dateStr: string | null, lang: Lang): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-US',
    { year:'numeric', month:'long', day:'numeric' },
  )
}

export default function PageDetailsPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useI18n()
  const [page, setPage]       = useState<Page | null>(null)
  const [logs, setLogs]       = useState<ReviewLog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [pageRes, logsRes] = await Promise.all([
      supabase.from('pages').select('*').eq('id', id).single(),
      supabase.from('review_logs').select('*').eq('page_id', id).order('reviewed_at', { ascending: false }),
    ])
    if (pageRes.data) setPage(pageRes.data)
    if (logsRes.data) setLogs(logsRes.data)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(t('detDeleteConfirm'))) return
    setDeleting(true)
    await supabase.from('pages').delete().eq('id', id)
    router.back()
  }

  // Strength/mistake label lookup via translations
  const SL_KEY: Record<string, keyof typeof import('@/lib/translations').translations['ar']> = {
    strong:'strStrong', medium:'strMedium', weak:'strWeak',
    perfect:'strPerfect', minor:'strMinor', impactful:'strImpactful',
    few:'strFew', many:'strMany', lapse:'strLapse',
  }
  const SC: Record<string, string> = {
    strong:'#22C55E', medium:'#F97316', weak:'#EF4444',
    perfect:'#22C55E', minor:'#84CC16', impactful:'#F97316',
    few:'#FB923C', many:'#EF4444', lapse:'#7C3AED',
  }
  const getLabel = (key: string) => {
    const tk = SL_KEY[key]
    return tk ? t(tk as any) : key
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>⏳</div>
  if (!page)   return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--sub)' }}>{t('detNotFound')}</div>

  const isOverdue = page.next_review_date <= todayStr()
  const lastKey   = page.last_mistake_level ?? page.last_strength ?? ''

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>{t('detTitle')}</span>
      </div>

      <div style={{ flex:1, padding:'18px 16px 40px', overflowY:'auto' }}>
        {/* Hero */}
        <div style={{ background:'#161A18', border:'1px solid var(--border)', borderRadius:20, padding:28, textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:72, fontWeight:700, color:'var(--cream)', lineHeight:1 }}>{page.page_number}</div>
          <div style={{ fontSize:13, color:'var(--sub)', marginTop:4 }}>{t('detQuranPage')}</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12, flexWrap:'wrap' }}>
            <span style={badge}>⭐ {page.review_count} {t('detReviewCount')}</span>
            {lastKey && (
              <span style={{ ...badge, color: SC[lastKey] }}>
                {t('detLastRating')} {getLabel(lastKey)}
              </span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label: t('detAddedOn'),   value: localDate(page.created_at, lang) },
            { label: t('detLastReview'), value: page.last_reviewed_at ? localDate(page.last_reviewed_at, lang) : t('detNotReviewed') },
            { label: t('detNextReview'), value: localDate(page.next_review_date, lang), warn: isOverdue },
            { label: t('detInterval'),   value: `${page.current_interval_days} ${t('daysWord')}` },
          ].map((item, i) => (
            <div key={i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'var(--sub)', marginBottom:4 }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:600, color: item.warn ? 'var(--red)' : 'var(--cream)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {isOverdue && (
          <button onClick={() => router.push(`/review/${page.id}`)} style={{ ...primaryBtn, marginBottom:10 }}>
            {t('detStartReview')}
          </button>
        )}

        <button onClick={handleDelete} disabled={deleting} style={{ background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', color:'var(--red)', padding:12, borderRadius:14, cursor:'pointer', fontSize:14, width:'100%', fontFamily:'Amiri, serif', marginBottom:24, opacity: deleting ? 0.6 : 1 }}>
          {deleting ? t('detDeleting') : t('detDeleteBtn')}
        </button>

        <div style={{ fontSize:11, fontWeight:600, color:'var(--sub)', letterSpacing:1, marginBottom:10 }}>{t('detLogTitle')}</div>
        {logs.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--sub)', padding:'12px 0' }}>{t('detNoLogs')}</div>
        ) : (
          <div>
            {logs.map((log, i) => {
              const key = log.mistake_level ?? log.strength
              return (
                <div key={log.id} style={{ display:'flex', gap:12, minHeight:56 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:14 }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background: SC[key] || 'var(--sub)', flexShrink:0, marginTop:4 }} />
                    {i < logs.length - 1 && <div style={{ flex:1, width:1.5, background:'var(--border)', margin:'4px 0' }} />}
                  </div>
                  <div style={{ flex:1, paddingBottom:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color: SC[key], fontWeight:600 }}>{getLabel(key)}</span>
                      <span style={{ fontSize:11, color:'var(--sub)' }}>{localDate(log.reviewed_at, lang)}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>
                      {log.previous_interval_days} {t('daysWord')} → {log.new_interval_days} {t('daysWord')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
const badge: React.CSSProperties = { fontSize:11, color:'var(--gold)', background:'rgba(212,144,56,0.12)', padding:'3px 10px', borderRadius:20 }
const primaryBtn: React.CSSProperties = { background:'#16A34A', border:'none', color:'#ffffff', padding:14, borderRadius:14, cursor:'pointer', fontSize:15, fontWeight:700, width:'100%', fontFamily:'Amiri, serif' }
