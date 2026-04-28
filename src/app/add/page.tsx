'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { todayStr, addDays } from '@/lib/spaced-rep'
import { createInitialState } from '@/lib/quran-scheduler'
import { uid } from '@/lib/utils'

export default function AddPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    const num = parseInt(value)
    if (!value || isNaN(num) || num < 1 || num > 604) {
      setError('أدخل رقمًا صحيحًا من 1 إلى 604'); return
    }
    setLoading(true); setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/auth'); return }
      console.log('authenticated user id:', user.id)

      const { data: existing, error: selectError } = await supabase
        .from('pages')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_number', num)
        .maybeSingle()

      if (selectError) console.error('select error:', selectError.message)
      if (existing) { setError('الصفحة موجودة مسبقًا!'); setLoading(false); return }

      const { error } = await supabase.from('pages').insert({
        id: uid(),
        user_id: user.id,
        page_number: num,
        created_at: todayStr(),
        last_reviewed_at: null,
        next_review_date: addDays(todayStr(), 1),
        current_interval_days: 1,
        last_strength: null,
        review_count: 0,
        ...createInitialState(),
      })
      if (error) throw error
      router.push('/dashboard?added=1')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg)', padding: '24px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>إضافة صفحة جديدة</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36 }}>📖</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--cream)' }}>رقم الصفحة</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: -8 }}>من 1 إلى 604</div>

          <input
            type="number"
            min="1" max="604"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="مثال: 25"
            autoFocus
            style={{ background: '#0F1210', border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 12, padding: 14, fontSize: 28, color: 'var(--cream)', textAlign: 'center', width: '100%', outline: 'none', fontFamily: 'Amiri, serif' }}
          />

          {error && <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</div>}

          <button onClick={handleAdd} disabled={loading} style={{ background: '#16A34A', border: 'none', color: '#ffffff', padding: 14, borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%', fontFamily: 'Amiri, serif', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'جارٍ الحفظ...' : 'حفظ الصفحة'}
          </button>
        </div>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', cursor: 'pointer', fontSize: 18 }
