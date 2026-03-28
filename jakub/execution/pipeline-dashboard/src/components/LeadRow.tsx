import { useState } from 'react'
import {
  Instagram, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { Lead, PipelineStage } from '../types'
import { STAGES } from '../types'

function LeadRow({ lead, onStatusChange }: {
  lead: Lead
  onStatusChange: (id: number, newStatus: PipelineStage) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const stage = STAGES.find(s => s.key === lead.status) || STAGES[0]

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 8,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          cursor: 'pointer',
          gap: 16,
        }}
      >
        <div style={{
          width: 10, height: 10,
          borderRadius: '50%',
          background: stage.color,
          flexShrink: 0,
        }} />

        <div style={{ minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Instagram size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>@{lead.instagram_handle}</span>
          </div>
          {lead.full_name && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.full_name}</div>
          )}
        </div>

        <div style={{ minWidth: 80, textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
            {lead.follower_count ? lead.follower_count.toLocaleString() : '-'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>followers</div>
        </div>

        <div style={{
          minWidth: 50,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          color: lead.score >= 7 ? 'var(--accent-primary)' :
                 lead.score >= 4 ? 'var(--accent-warm)' : 'var(--text-tertiary)',
        }}>
          {lead.score}/10
        </div>

        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {lead.likely_us && (
            <span style={{
              background: 'var(--accent-secondary-dim)',
              color: 'var(--accent-secondary)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}>US</span>
          )}
          {lead.is_business_account && (
            <span style={{
              background: 'var(--accent-primary-dim)',
              color: 'var(--accent-primary)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}>BIZ</span>
          )}
          {lead.website && (
            <span style={{
              background: 'var(--accent-warm-dim)',
              color: 'var(--accent-warm)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}>SITE</span>
          )}
        </div>

        <div style={{
          background: stage.color + '18',
          color: stage.color,
          fontSize: 12,
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          minWidth: 90,
          textAlign: 'center',
        }}>
          {stage.label}
        </div>

        {expanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
      </div>

      {expanded && (
        <div style={{
          padding: '0 20px 20px 46px',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{ paddingTop: 16 }}>
            {lead.bio && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                {lead.bio}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <a
                href={`https://instagram.com/${lead.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--accent-primary)', fontSize: 13, textDecoration: 'none',
                }}
              >
                <Instagram size={14} /> Profile <ExternalLink size={12} />
              </a>
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: 'var(--accent-warm)', fontSize: 13, textDecoration: 'none',
                  }}
                >
                  Website <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 4 }}>Move to:</span>
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, s.key) }}
                  disabled={s.key === lead.status}
                  style={{
                    background: s.key === lead.status ? s.color + '30' : 'var(--bg-elevated)',
                    color: s.key === lead.status ? s.color : 'var(--text-secondary)',
                    border: `1px solid ${s.key === lead.status ? s.color + '50' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 12px',
                    fontSize: 11,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    cursor: s.key === lead.status ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {lead.notes && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}>
                {lead.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LeadRow
