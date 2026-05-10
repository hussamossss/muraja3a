'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from '@/lib/push'
import type { UserPreferences } from '@/lib/types'

type PushState = NotificationPermission | 'unsupported'
type TestState = 'idle' | 'sending' | 'sent' | 'failed'

const DEFAULT_PREFS: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  timezone:      'UTC',
  reminder_hour: 8,
  email_enabled: true,
  push_enabled:  false,
  lang:          'ar',
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPad on iOS 13+ reports as Mac; check touch as well
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari legacy
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function AccountPage() {
  const router = useRouter()
  const { t, lang, setLang } = useI18n()

  const [mounted,   setMounted]   = useState(false)
  const [email,     setEmail]     = useState<string>('')
  const [prefs,     setPrefs]     = useState(DEFAULT_PREFS)
  const [pushPerm,  setPushPerm]  = useState<PushState>('default')
  const [pushSupported, setPushSupported] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState(false)
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setPushSupported(isPushSupported())
    setPushPerm(getPushPermission())
    setIosNeedsInstall(detectIOS() && !isStandalone())
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    setEmail(session.user.email ?? '')

    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (data) {
      setPrefs({
        timezone:      data.timezone,
        reminder_hour: data.reminder_hour,
        email_enabled: data.email_enabled,
        push_enabled:  data.push_enabled,
        lang:          data.lang,
      })
    } else {
      // First time: detect timezone and seed with defaults + current UI lang
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      setPrefs(p => ({ ...p, timezone: tz, lang }))
    }
    setLoading(false)
  }

  async function savePrefs(patch: Partial<typeof DEFAULT_PREFS>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const tz = prefs.timezone === 'UTC'
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
      : prefs.timezone
    const merged = { ...prefs, ...patch, timezone: tz }
    setPrefs(merged)
    const { error } = await supabase.from('user_preferences').upsert({
      user_id:    session.user.id,
      ...merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) console.error('[savePrefs] failed:', error)
  }

  async function togglePush(next: boolean) {
    if (busy) return
    setBusy(true)
    setPushError(null)
    try {
      if (next) {
        await subscribeToPush()
        setPushPerm('granted')
        await savePrefs({ push_enabled: true })
      } else {
        await unsubscribeFromPush()
        await savePrefs({ push_enabled: false })
      }
    } catch (e) {
      const msg = (e as Error).message
      console.error('[push toggle] failed:', e)
      if (msg === 'permission-denied') setPushPerm('denied')
      setPushError(msg)
      // Roll back on failure
      setPrefs(p => ({ ...p, push_enabled: !next }))
    } finally {
      setBusy(false)
    }
  }

  async function handleTest() {
    setTestState('sending')
    setPushError(null)
    try {
      await sendTestPush()
      setTestState('sent')
      setTimeout(() => setTestState('idle'), 2500)
    } catch (e) {
      console.error('[test push] failed:', e)
      setPushError((e as Error).message)
      setTestState('failed')
      setTimeout(() => setTestState('idle'), 4000)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const pushDisabled  = !mounted || !pushSupported || pushPerm === 'denied' || iosNeedsInstall || busy
  const canTest       = mounted && pushPerm === 'granted' && prefs.push_enabled

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>{t('accTitle')}</span>
      </div>

      <div style={{ flex:1, padding:'32px 16px' }}>

        {/* Profile card */}
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px 18px', marginBottom:24 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'2px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
            👤
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--cream)' }}>{t('accMyAccount')}</div>
            <div style={{ fontSize:12, color:'var(--sub)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {email || t('accSub')}
            </div>
          </div>
        </div>

        {/* Language */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{lang === 'ar' ? 'اللغة' : 'Language'}</div>
            <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{lang === 'ar' ? 'عربي' : 'English'}</div>
          </div>
          <button
            onClick={() => { const next = lang === 'ar' ? 'en' : 'ar'; setLang(next); savePrefs({ lang: next }) }}
            style={{ fontSize:13, fontWeight:700, color:'var(--cream)', background:'rgba(255,255,255,0.08)', border:'1px solid var(--border)', borderRadius:20, padding:'7px 18px', cursor:'pointer' }}>
            {lang === 'ar' ? 'EN ›' : 'AR ›'}
          </button>
        </div>

        {/* Notifications card */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'4px 0', marginBottom:16 }}>

          <div style={sectionHeader}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--cream)' }}>🔔 {t('accNotifTitle')}</span>
          </div>

          {/* Email toggle */}
          <Row>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:14, color:'var(--cream)' }}>📧 {t('accEmailReminder')}</div>
              <div style={{ fontSize:11, color:'var(--sub)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
            </div>
            <Toggle
              checked={prefs.email_enabled}
              disabled={loading}
              onChange={(v) => savePrefs({ email_enabled: v })}
            />
          </Row>

          {/* iOS install banner */}
          {iosNeedsInstall && (
            <div style={{ margin:'4px 16px 12px', padding:'10px 12px', background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:10, fontSize:11, color:'#7DD3FC', lineHeight:1.6 }}>
              ⓘ {t('accInstallPwaForIos')}
            </div>
          )}

          {/* Push toggle */}
          <Row>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:14, color:'var(--cream)' }}>🔔 {t('accPushNotif')}</div>
              <div style={{ fontSize:11, color:'var(--sub)', marginTop:2, minHeight:14 }}>
                {mounted && (
                  !pushSupported                                                      ? t('accPushNotSupported')
                  : pushPerm === 'denied'                                             ? t('accPushPermDenied')
                  : pushPerm === 'granted' && prefs.push_enabled                      ? t('accPushPermGranted')
                  : t('accPushPermDefault')
                )}
              </div>
            </div>
            <Toggle
              checked={prefs.push_enabled}
              disabled={pushDisabled || loading}
              onChange={togglePush}
            />
          </Row>

          {pushError && (
            <div style={{ margin:'0 16px 12px', padding:'8px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, fontSize:11, color:'#FCA5A5', lineHeight:1.5, direction:'ltr', textAlign:'left' }}>
              ⚠ {pushError}
            </div>
          )}

          {/* Reminder time */}
          <Row>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:14, color:'var(--cream)' }}>⏰ {t('accReminderTime')}</div>
              <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{t('accReminderTimeHelp')}</div>
            </div>
            <select
              value={prefs.reminder_hour}
              disabled={loading}
              onChange={(e) => savePrefs({ reminder_hour: parseInt(e.target.value, 10) })}
              style={{
                background:'rgba(255,255,255,0.08)', border:'1px solid var(--border)',
                color:'var(--cream)', borderRadius:10, padding:'7px 12px', fontSize:13,
                fontFamily:'inherit', cursor:'pointer', minWidth:78,
              }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
              ))}
            </select>
          </Row>

          {/* Test button */}
          <div style={{ padding:'8px 16px 14px' }}>
            <button
              onClick={handleTest}
              disabled={!canTest || testState === 'sending'}
              style={{
                width:'100%', padding:'10px 14px',
                background: canTest ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${canTest ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                color: canTest ? '#22C55E' : 'var(--sub)',
                borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'inherit',
                cursor: canTest ? 'pointer' : 'not-allowed',
              }}>
              {testState === 'sending' ? t('accTestSending')
                : testState === 'sent'  ? t('accTestSent')
                : testState === 'failed'? t('accTestFailed')
                : canTest               ? t('accSendTest')
                : t('accNoSubsForTest')}
            </button>
          </div>

        </div>

        <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:14, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, cursor:'pointer', fontFamily:'Amiri, serif', color:'#EF4444', fontSize:15, fontWeight:700 }}>
          {t('accSignOut')}
        </button>
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      gap:12, padding:'12px 16px',
      borderTop:'1px solid var(--border)',
    }}>{children}</div>
  )
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width:44, height:24, borderRadius:12, padding:0, flexShrink:0,
        background: checked ? '#22C55E' : 'rgba(255,255,255,0.12)',
        border:'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position:'relative', transition:'background .15s',
      }}>
      <span style={{
        position:'absolute', top:2, left: checked ? 22 : 2,
        width:20, height:20, borderRadius:'50%', background:'#fff',
        transition:'left .15s',
      }}/>
    </button>
  )
}

const sectionHeader: React.CSSProperties = {
  padding:'14px 16px 10px',
}

const backBtn: React.CSSProperties = {
  width:36, height:36, borderRadius:10,
  background:'transparent', border:'1px solid var(--border)',
  color:'var(--sub)', cursor:'pointer', fontSize:20,
}
