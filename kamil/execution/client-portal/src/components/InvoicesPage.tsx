import { useState } from 'react';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Invoice } from '../types';

interface InvoicesPageProps {
  invoices: Invoice[];
}

export default function InvoicesPage({ invoices }: InvoicesPageProps) {
  const isMobile = useIsMobile();
  const { lang } = useLang();
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePay = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-invoice-checkout', {
        body: { invoiceId },
      });
      if (error) {
        alert(lang === 'pl' ? 'Błąd płatności. Spróbuj ponownie.' : 'Payment error. Please try again.');
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        alert(data.error);
      }
    } catch {
      alert(lang === 'pl' ? 'Coś poszło nie tak.' : 'Something went wrong.');
    } finally {
      setPayingId(null);
    }
  };

  const outstanding = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0);

  const lastPaid = invoices.find(i => i.status === 'paid');

  const formatDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusConfig = {
    paid: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', icon: CheckCircle2, label: lang === 'pl' ? 'Opłacona' : 'Paid' },
    pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: Clock, label: lang === 'pl' ? 'Oczekująca' : 'Pending' },
    overdue: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: AlertTriangle, label: lang === 'pl' ? 'Zaległa' : 'Overdue' },
  };

  const getBadgeStyle = (status: 'paid' | 'pending' | 'overdue'): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    background: statusConfig[status].bg,
    border: `1px solid ${statusConfig[status].border}`,
    color: statusConfig[status].color,
  });

  const s: Record<string, React.CSSProperties> = {
    page: {
      padding: isMobile ? '16px' : '24px',
      maxWidth: 700,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
      margin: 0,
    },
    summaryRow: {
      display: 'flex',
      gap: '12px',
    },
    summaryCard: {
      flex: 1,
      padding: '16px',
      textAlign: 'center' as const,
    },
    summaryLabel: {
      fontSize: '13px',
      color: 'var(--text-secondary)',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: '22px',
      fontWeight: 700,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
    },
    invoiceRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-glass)',
    },
    invoiceLeft: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    invoicePeriod: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    invoiceMeta: {
      fontSize: '13px',
      color: 'var(--text-secondary)',
    },
    invoiceRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    invoiceAmount: {
      fontSize: '16px',
      fontWeight: 700,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
    },
    payBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      background: 'var(--accent-primary)',
      color: '#000',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-display)',
    },
    empty: {
      textAlign: 'center' as const,
      padding: '48px 16px',
      color: 'var(--text-secondary)',
      fontSize: '16px',
    },
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>
        <DollarSign size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--accent-primary)' }} />
        {lang === 'pl' ? 'Faktury' : 'Invoices'}
      </h1>

      {/* Summary */}
      <div style={s.summaryRow}>
        <GlassCard delay={0}>
          <div style={s.summaryCard}>
            <div style={s.summaryLabel}>{lang === 'pl' ? 'Do zapłaty' : 'Outstanding'}</div>
            <div style={{ ...s.summaryValue, color: outstanding > 0 ? '#f59e0b' : '#22c55e' }}>
              ${outstanding.toFixed(0)}
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div style={s.summaryCard}>
            <div style={s.summaryLabel}>{lang === 'pl' ? 'Ostatnia płatność' : 'Last Payment'}</div>
            <div style={s.summaryValue}>
              {lastPaid ? `$${lastPaid.amount}` : '-'}
            </div>
            {lastPaid?.paidDate && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {formatDate(lastPaid.paidDate)}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <GlassCard delay={0.2}>
          <div style={s.empty}>
            {lang === 'pl' ? 'Brak faktur' : 'No invoices yet'}
          </div>
        </GlassCard>
      ) : (
        <GlassCard delay={0.2}>
          {invoices.map((inv, i) => {
            const cfg = statusConfig[inv.status];
            const Icon = cfg.icon;
            return (
              <div key={inv.id} style={{ ...s.invoiceRow, borderBottom: i === invoices.length - 1 ? 'none' : s.invoiceRow.borderBottom }}>
                <div style={s.invoiceLeft}>
                  <div style={s.invoicePeriod}>{inv.period}</div>
                  <div style={s.invoiceMeta}>
                    {inv.plan} {lang === 'pl' ? 'plan' : 'plan'} · {lang === 'pl' ? 'Termin' : 'Due'}: {formatDate(inv.dueDate)}
                  </div>
                </div>
                <div style={s.invoiceRight}>
                  <div style={s.invoiceAmount}>${inv.amount}</div>
                  <div style={getBadgeStyle(inv.status)}>
                    <Icon size={12} />
                    {cfg.label}
                  </div>
                  {(inv.status === 'pending' || inv.status === 'overdue') && (
                    <button
                      style={{ ...s.payBtn, opacity: payingId === inv.id ? 0.6 : 1 }}
                      onClick={() => handlePay(inv.id)}
                      disabled={payingId === inv.id}
                    >
                      {payingId === inv.id
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <DollarSign size={14} />}
                      {lang === 'pl' ? 'Zapłać' : 'Pay Now'}
                    </button>
                  )}
                  {inv.status === 'paid' && inv.paidDate && (
                    <div style={{ fontSize: 12, color: '#22c55e' }}>
                      {formatDate(inv.paidDate)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}
