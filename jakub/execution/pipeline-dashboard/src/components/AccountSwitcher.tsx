import { Instagram } from 'lucide-react'
import type { Account } from '../types'
import { ACCOUNTS } from '../types'

function AccountSwitcher({ account, onChange }: {
  account: Account
  onChange: (a: Account) => void
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      padding: 3,
      border: '1px solid var(--glass-border)',
    }}>
      {ACCOUNTS.map(a => (
        <button
          key={a.key}
          onClick={() => onChange(a.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: account === a.key ? a.color + '18' : 'transparent',
            color: account === a.key ? a.color : 'var(--text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            fontSize: 13,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Instagram size={14} />
          {a.label}
        </button>
      ))}
    </div>
  )
}

export default AccountSwitcher
