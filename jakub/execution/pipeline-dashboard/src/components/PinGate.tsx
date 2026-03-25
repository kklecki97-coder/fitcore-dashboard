import { useState } from 'react'
import { Lock } from 'lucide-react'

export const CORRECT_PIN = '2635'

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = () => {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('pipeline_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPin('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 40px',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-card)',
        textAlign: 'center',
        width: 340,
        animation: shake ? 'shake 0.4s ease' : undefined,
      }}>
        <div style={{
          background: 'var(--accent-primary-dim)',
          borderRadius: 'var(--radius-md)',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={24} color="var(--accent-primary)" />
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>FitCore Outreach</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>Enter PIN to continue</div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 48,
                height: 56,
                background: 'var(--bg-elevated)',
                border: `1px solid ${error ? 'var(--accent-danger)' : pin.length === i ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                transition: 'border-color 0.2s',
              }}
            >
              {pin[i] ? '\u2022' : ''}
            </div>
          ))}
        </div>

        <input
          type="tel"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
            setPin(val)
            setError(false)
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 4) handleSubmit() }}
          autoFocus
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 240, margin: '0 auto' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => {
            if (key === null) return <div key={i} />
            return (
              <button
                key={i}
                onClick={() => {
                  if (key === 'del') {
                    setPin(p => p.slice(0, -1))
                    setError(false)
                  } else {
                    const next = pin + key
                    if (next.length <= 4) {
                      setPin(next)
                      setError(false)
                      if (next.length === 4) {
                        setTimeout(() => {
                          if (next === CORRECT_PIN) {
                            sessionStorage.setItem('pipeline_unlocked', '1')
                            onUnlock()
                          } else {
                            setError(true)
                            setShake(true)
                            setTimeout(() => setShake(false), 500)
                            setPin('')
                          }
                        }, 150)
                      }
                    }
                  }
                }}
                style={{
                  height: 52,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: key === 'del' ? 14 : 20,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)'
                  e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.borderColor = 'var(--glass-border)'
                }}
              >
                {key === 'del' ? '\u2190' : key}
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{ color: 'var(--accent-danger)', fontSize: 13, marginTop: 16, fontWeight: 500 }}>
            Wrong PIN. Try again.
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

export default PinGate
