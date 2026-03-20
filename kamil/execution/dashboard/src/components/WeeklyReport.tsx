import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Copy, Dumbbell, DollarSign, ClipboardCheck,
  MessageSquare, Trophy, AlertTriangle, TrendingUp, TrendingDown,
  Users, Zap, Clock, Flag,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useLang } from '../i18n';
import { formatCurrency } from '../lib/locale';
import { getInitials, getAvatarColor } from '../data';
import type { WeeklyReportData } from '../utils/weekly-report';
import { pctChange } from '../utils/weekly-report';

interface WeeklyReportProps {
  open: boolean;
  onClose: () => void;
  data: WeeklyReportData;
  onViewClient?: (id: string) => void;
}

function TrendBadge({ current, previous, suffix = '', invert }: { current: number; previous: number; suffix?: string; invert?: boolean }) {
  const pct = pctChange(current, previous);
  if (pct === 0 && current === 0 && previous === 0) return <span style={s.trendNeutral}>—</span>;
  const isGood = invert ? pct < 0 : pct > 0;
  const isBad = invert ? pct > 0 : pct < 0;
  const color = isGood ? '#22c55e' : isBad ? '#ef4444' : 'var(--text-tertiary)';
  const bg = isGood ? 'rgba(34,197,94,0.1)' : isBad ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)';
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : TrendingUp;
  return (
    <span style={{ ...s.trendBadge, color, background: bg, border: `1px solid ${color}22` }}>
      <Icon size={10} />
      {pct > 0 ? '+' : ''}{pct}%{suffix}
    </span>
  );
}

export default function WeeklyReport({ open, onClose, data, onViewClient }: WeeklyReportProps) {
  const { t, lang } = useLang();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const tr = t.weeklyReport;

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const fmtMoney = (n: number) => formatCurrency(n, lang);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#07090e',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FitCore-Weekly-Report-${data.weekStart}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#07090e',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        }
        setExporting(false);
      }, 'image/png');
    } catch {
      setExporting(false);
    }
  };

  if (!open) return null;

  const totalMessages = data.messagesSent + data.messagesReceived;
  const prevTotalMessages = data.prevWeekMessages;
  const totalCheckIns = data.checkInsReviewed + data.checkInsPending + data.checkInsFlagged;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={s.overlay}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={s.modal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div style={s.toolbar}>
              <h2 style={s.modalTitle}>{tr.title}</h2>
              <div style={s.toolbarActions}>
                <button onClick={handleCopyImage} disabled={exporting} style={s.toolBtn} title={tr.copyImage}>
                  <Copy size={16} /> {tr.copyImage}
                </button>
                <button onClick={handleDownloadPDF} disabled={exporting} style={s.toolBtnPrimary} title={tr.downloadPDF}>
                  <Download size={16} /> {tr.downloadPDF}
                </button>
                <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
              </div>
            </div>

            {/* Scrollable report content */}
            <div style={s.scrollArea}>
              <div ref={reportRef} style={s.report}>
                {/* ── Header ── */}
                <div style={s.reportHeader}>
                  <div style={s.logoRow}>
                    <img src="/fitcore-logo.png" alt="FitCore" style={s.logo} />
                    <div>
                      <div style={s.brandName}>FitCore</div>
                      <div style={s.brandSub}>{tr.subtitle}</div>
                    </div>
                  </div>
                  <div style={s.periodBadge}>
                    {fmtDate(data.weekStart)} — {fmtDate(data.weekEnd)}
                  </div>
                </div>

                {/* ── Stat Grid ── */}
                <div style={s.statGrid}>
                  {/* Workouts */}
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: 'rgba(99,102,241,0.1)' }}>
                      <Dumbbell size={18} color="#6366f1" />
                    </div>
                    <div style={s.statValue}>{data.completedWorkouts}</div>
                    <div style={s.statLabel}>{tr.workoutsCompleted}</div>
                    <TrendBadge current={data.totalWorkouts} previous={data.prevWeekWorkouts} />
                    {data.totalWorkoutMinutes > 0 && (
                      <div style={s.statMeta}><Clock size={10} /> {Math.round(data.totalWorkoutMinutes / 60)}h {data.totalWorkoutMinutes % 60}m</div>
                    )}
                  </div>

                  {/* Revenue */}
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: 'rgba(34,197,94,0.1)' }}>
                      <DollarSign size={18} color="#22c55e" />
                    </div>
                    <div style={s.statValue}>{fmtMoney(data.weekRevenue)}</div>
                    <div style={s.statLabel}>{tr.revenueCollected}</div>
                    <TrendBadge current={data.weekRevenue} previous={data.prevWeekRevenue} />
                  </div>

                  {/* Check-ins */}
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: 'rgba(245,158,11,0.1)' }}>
                      <ClipboardCheck size={18} color="#f59e0b" />
                    </div>
                    <div style={s.statValue}>{data.checkInsReviewed}<span style={s.statSmall}>/{totalCheckIns}</span></div>
                    <div style={s.statLabel}>{tr.checkInsReviewed}</div>
                    <TrendBadge current={totalCheckIns} previous={data.prevWeekCheckIns} />
                    {data.checkInsPending > 0 && (
                      <div style={{ ...s.statMeta, color: '#f59e0b' }}>{data.checkInsPending} {tr.pending}</div>
                    )}
                    {data.checkInsFlagged > 0 && (
                      <div style={{ ...s.statMeta, color: '#ef4444' }}><Flag size={10} /> {data.checkInsFlagged} {tr.flagged}</div>
                    )}
                  </div>

                  {/* Messages */}
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: 'rgba(0,229,200,0.1)' }}>
                      <MessageSquare size={18} color="#00e5c8" />
                    </div>
                    <div style={s.statValue}>{totalMessages}</div>
                    <div style={s.statLabel}>{tr.messages}</div>
                    <TrendBadge current={totalMessages} previous={prevTotalMessages} />
                    <div style={s.statMeta}>↑ {data.messagesSent} {tr.sent} · ↓ {data.messagesReceived} {tr.received}</div>
                  </div>
                </div>

                {/* ── Highlights ── */}
                <div style={s.sectionGrid}>
                  {/* Top Performer */}
                  <div style={s.highlightCard}>
                    <div style={s.sectionHeader}>
                      <Trophy size={16} color="#f59e0b" />
                      <span style={s.sectionTitle}>{tr.topPerformer}</span>
                    </div>
                    {data.topPerformer ? (
                      <div
                        style={s.personRow}
                        onClick={() => onViewClient?.(data.topPerformer!.id)}
                      >
                        <div style={{ ...s.personAvatar, background: getAvatarColor(data.topPerformer.id) }}>
                          {getInitials(data.topPerformer.name)}
                        </div>
                        <div>
                          <div style={s.personName}>{data.topPerformer.name}</div>
                          <div style={s.personMeta}>{data.topPerformer.workouts} {tr.workoutsThisWeek}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={s.emptyHint}>{tr.noWorkoutsYet}</div>
                    )}
                  </div>

                  {/* Retention */}
                  <div style={s.highlightCard}>
                    <div style={s.sectionHeader}>
                      <Users size={16} color="#00e5c8" />
                      <span style={s.sectionTitle}>{tr.clientRetention}</span>
                    </div>
                    <div style={s.retentionRow}>
                      <div style={s.retentionNum}>{data.activeClients}<span style={s.retentionDenom}>/{data.totalClients}</span></div>
                      <div style={s.retentionLabel}>{tr.activeClients}</div>
                    </div>
                    {data.newlyInactive.length > 0 && (
                      <div style={s.warnList}>
                        {data.newlyInactive.map(c => (
                          <div key={c.id} style={s.warnItem}>
                            <AlertTriangle size={12} color="#f59e0b" />
                            <span>{c.name} — {tr.wentInactive}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── New PRs ── */}
                {data.newPRs.length > 0 && (
                  <div style={s.section}>
                    <div style={s.sectionHeader}>
                      <Zap size={16} color="#6366f1" />
                      <span style={s.sectionTitle}>{tr.newPRs}</span>
                      <span style={s.sectionCount}>{data.newPRs.length}</span>
                    </div>
                    <div style={s.prGrid}>
                      {data.newPRs.map((pr, i) => (
                        <div key={i} style={s.prCard}>
                          <div style={s.prLift}>{pr.lift}</div>
                          <div style={s.prValue}>{pr.value}</div>
                          <div style={s.prClient}>{pr.clientName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── At-Risk ── */}
                {data.atRiskClients.length > 0 && (
                  <div style={s.section}>
                    <div style={s.sectionHeader}>
                      <AlertTriangle size={16} color="#ef4444" />
                      <span style={s.sectionTitle}>{tr.atRiskClients}</span>
                      <span style={{ ...s.sectionCount, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        {data.atRiskClients.length}
                      </span>
                    </div>
                    <div style={s.riskList}>
                      {data.atRiskClients.slice(0, 5).map((c) => (
                        <div
                          key={c.id}
                          style={s.riskRow}
                          onClick={() => onViewClient?.(c.id)}
                        >
                          <div style={{ ...s.personAvatar, background: getAvatarColor(c.id), width: '32px', height: '32px', fontSize: '11px' }}>
                            {getInitials(c.name)}
                          </div>
                          <div style={s.riskInfo}>
                            <span style={s.riskName}>{c.name}</span>
                            <span style={s.riskReason}>
                              {c.reason.split(', ').map(r =>
                                r === 'no-workouts' ? tr.noWorkouts : r === 'missed-checkin' ? tr.missedCheckIn : r
                              ).join(' · ')}
                            </span>
                          </div>
                        </div>
                      ))}
                      {data.atRiskClients.length > 5 && (
                        <div style={s.emptyHint}>+{data.atRiskClients.length - 5} {tr.more}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Footer ── */}
                <div style={s.reportFooter}>
                  <div style={s.footerLine} />
                  <div style={s.footerText}>
                    {tr.generatedBy} · {new Date().toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  },
  modal: {
    width: '700px', maxWidth: '100%', maxHeight: 'calc(100vh - 48px)',
    background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
  },
  modalTitle: {
    fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0,
  },
  toolbarActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  toolBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
    background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px',
    fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer',
  },
  toolBtnPrimary: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
    borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent-primary)', color: '#07090e', fontSize: '13px',
    fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer',
  },
  closeBtn: {
    width: '34px', height: '34px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)', background: 'transparent',
    color: 'var(--text-secondary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  scrollArea: { flex: 1, overflowY: 'auto' },

  // ── Report content ──
  report: {
    padding: '32px 28px', background: '#07090e', color: '#e8eaed',
    fontFamily: 'Outfit, sans-serif',
  },
  reportHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '28px', flexWrap: 'wrap', gap: '12px',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { width: '40px', height: '40px', borderRadius: '10px' },
  brandName: { fontSize: '22px', fontWeight: 700, color: '#00e5c8', letterSpacing: '-0.5px' },
  brandSub: { fontSize: '13px', color: '#8b95a5', fontWeight: 500 },
  periodBadge: {
    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
    background: 'rgba(0,229,200,0.08)', border: '1px solid rgba(0,229,200,0.15)', color: '#00e5c8',
  },

  // ── Stat grid ──
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '6px',
  },
  statIcon: {
    width: '36px', height: '36px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px',
  },
  statValue: { fontSize: '26px', fontWeight: 700, color: '#e8eaed', lineHeight: 1, letterSpacing: '-0.5px' },
  statSmall: { fontSize: '16px', fontWeight: 500, color: '#8b95a5' },
  statLabel: { fontSize: '12px', fontWeight: 500, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statMeta: {
    fontSize: '11px', color: '#8b95a5', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
  },

  // ── Trend badges ──
  trendBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px',
    borderRadius: '12px', fontSize: '11px', fontWeight: 700, width: 'fit-content',
  },
  trendNeutral: { fontSize: '12px', color: '#8b95a5' },

  // ── Sections ──
  sectionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  highlightCard: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '18px 16px',
  },
  section: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '18px 16px', marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
  },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#e8eaed' },
  sectionCount: {
    padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
    background: 'rgba(0,229,200,0.1)', color: '#00e5c8',
  },

  // ── Person rows ──
  personRow: {
    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
    padding: '8px', borderRadius: '10px', transition: 'background 0.15s',
  },
  personAvatar: {
    width: '38px', height: '38px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  personName: { fontSize: '15px', fontWeight: 600, color: '#e8eaed' },
  personMeta: { fontSize: '12px', color: '#8b95a5' },

  // ── Retention ──
  retentionRow: { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' },
  retentionNum: { fontSize: '32px', fontWeight: 700, color: '#00e5c8', lineHeight: 1 },
  retentionDenom: { fontSize: '18px', fontWeight: 500, color: '#8b95a5' },
  retentionLabel: { fontSize: '13px', color: '#8b95a5' },
  warnList: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' },
  warnItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f59e0b' },

  // ── PRs ──
  prGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  prCard: {
    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)',
    borderRadius: '10px', padding: '12px', textAlign: 'center',
  },
  prLift: { fontSize: '11px', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' },
  prValue: { fontSize: '16px', fontWeight: 700, color: '#e8eaed', margin: '4px 0' },
  prClient: { fontSize: '11px', color: '#8b95a5' },

  // ── At-risk ──
  riskList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  riskRow: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px',
    borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s',
  },
  riskInfo: { display: 'flex', flexDirection: 'column', gap: '1px' },
  riskName: { fontSize: '14px', fontWeight: 600, color: '#e8eaed' },
  riskReason: { fontSize: '11px', color: '#ef4444' },

  emptyHint: { fontSize: '13px', color: '#8b95a5', fontStyle: 'italic', padding: '4px 0' },

  // ── Footer ──
  reportFooter: { marginTop: '24px', textAlign: 'center' },
  footerLine: { height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '14px' },
  footerText: { fontSize: '11px', color: '#525a6e', fontWeight: 500 },
};
