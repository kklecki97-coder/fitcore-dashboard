import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Loader2, X, Receipt, CreditCard } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { isValidUrl } from '../utils/validation';
import type { Invoice } from '../types';

interface InvoicesPageProps {
  invoices: Invoice[];
}

export default function InvoicesPage({ invoices }: InvoicesPageProps) {
  const isMobile = useIsMobile();
  const { lang, t } = useLang();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'cancelled' | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const currencySymbol = lang === 'pl' ? 'zł' : '$';
  const formatAmount = (amount: number) => lang === 'pl' ? `${amount} ${currencySymbol}` : `${currencySymbol}${amount}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success' || payment === 'cancelled') {
      setPaymentBanner(payment);
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handlePay = async (invoiceId: string) => {
    setPayingId(invoiceId);
    setPaymentError(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-invoice-checkout', {
        body: { invoiceId },
      });
      if (error) {
        setPaymentError(t.errors?.paymentError ?? 'Payment error. Please try again.');
        return;
      }
      if (data?.url) {
        if (!isValidUrl(data.url)) {
          setPaymentError(t.errors?.invalidPaymentUrl ?? 'Invalid payment link.');
          return;
        }
        window.location.href = data.url;
      } else if (data?.error) {
        setPaymentError(data.error);
      }
    } catch {
      setPaymentError(t.errors?.somethingWentWrong ?? 'Something went wrong.');
    } finally {
      setPayingId(null);
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const dateCompare = (b.dueDate || '').localeCompare(a.dueDate || '');
    return dateCompare !== 0 ? dateCompare : a.id.localeCompare(b.id);
  });

  const outstanding = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0);

  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const lastPaid = invoices.find(i => i.status === 'paid');

  const formatDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusConfig = {
    paid: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.15)', icon: CheckCircle2, label: lang === 'pl' ? 'Opłacona' : 'Paid' },
    pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)', icon: Clock, label: lang === 'pl' ? 'Oczekująca' : 'Pending' },
    overdue: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle, label: lang === 'pl' ? 'Zaległa' : 'Overdue' },
  };

  return (
    <div style={{
      padding: isMobile ? '16px' : '32px',
      maxWidth: 760,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 42, height: 42, borderRadius: '12px',
          background: 'rgba(0, 229, 200, 0.1)',
          border: '1px solid rgba(0, 229, 200, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Receipt size={20} color="var(--accent-primary)" />
        </div>
        <div>
          <h1 style={{
            fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.2,
          }}>
            {t.invoices?.title ?? (lang === 'pl' ? 'Faktury' : 'Invoices')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 2 }}>
            {sortedInvoices.length} {sortedInvoices.length === 1 ? 'invoice' : 'invoices'}
          </div>
        </div>
      </div>

      {/* Payment Banner */}
      {paymentBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderRadius: '12px',
          background: paymentBanner === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${paymentBanner === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color={paymentBanner === 'success' ? '#22c55e' : '#f59e0b'} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: paymentBanner === 'success' ? '#22c55e' : '#f59e0b' }}>
              {paymentBanner === 'success'
                ? (t.invoices?.paymentSuccessful ?? 'Payment successful!')
                : (t.invoices?.paymentCancelled ?? 'Payment cancelled.')}
            </span>
          </div>
          <button onClick={() => setPaymentBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {paymentError && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>{paymentError}</span>
          </div>
          <button onClick={() => setPaymentError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
        <GlassCard delay={0} style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {t.invoices?.outstanding ?? 'Outstanding'}
          </div>
          <div style={{
            fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-display)',
            color: outstanding > 0 ? '#f59e0b' : '#22c55e', lineHeight: 1,
          }}>
            {formatAmount(Number(outstanding.toFixed(0)))}
          </div>
          {outstanding > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 6 }}>
              {invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length} {lang === 'pl' ? 'oczekujących' : 'unpaid'}
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.1} style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {t.invoices?.lastPayment ?? 'Last Payment'}
          </div>
          <div style={{
            fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)', lineHeight: 1,
          }}>
            {lastPaid ? formatAmount(lastPaid.amount) : '-'}
          </div>
          {lastPaid?.paidDate && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 6 }}>
              {formatDate(lastPaid.paidDate)}
            </div>
          )}
        </GlassCard>

        {!isMobile && (
          <GlassCard delay={0.2} style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              {lang === 'pl' ? 'Opłacone łącznie' : 'Total Paid'}
            </div>
            <div style={{
              fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-display)',
              color: '#22c55e', lineHeight: 1,
            }}>
              {formatAmount(Number(paidTotal.toFixed(0)))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 6 }}>
              {invoices.filter(i => i.status === 'paid').length} {lang === 'pl' ? 'faktur' : 'invoices'}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Invoice List */}
      {sortedInvoices.length === 0 ? (
        <GlassCard delay={0.3} style={{ padding: '48px 24px', textAlign: 'center' }}>
          <CreditCard size={40} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {t.invoices?.noInvoices ?? 'No invoices yet'}
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedInvoices.map((inv, i) => {
            const cfg = statusConfig[inv.status];
            const Icon = cfg.icon;
            const isPending = inv.status === 'pending' || inv.status === 'overdue';

            return (
              <GlassCard key={inv.id} delay={0.15 + i * 0.05} style={{
                padding: 0,
                overflow: 'hidden',
                borderLeft: `3px solid ${cfg.color}`,
              }}>
                <div style={{
                  padding: isMobile ? '14px 16px' : '18px 20px',
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '12px' : '16px',
                }}>
                  {/* Left: period + meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)',
                      }}>
                        {inv.period}
                      </span>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
                      }}>
                        <Icon size={11} />
                        {cfg.label}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {inv.plan} {t.invoices?.plan ?? 'plan'} · {t.invoices?.due ?? 'Due'}: {formatDate(inv.dueDate)}
                    </div>
                  </div>

                  {/* Right: amount + action */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    ...(isMobile ? { width: '100%', justifyContent: 'space-between' } : {}),
                  }}>
                    <div style={{
                      fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)',
                      color: 'var(--text-primary)',
                    }}>
                      {formatAmount(inv.amount)}
                    </div>

                    {isPending && (
                      <button
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '10px 20px', borderRadius: '10px', border: 'none',
                          background: 'var(--accent-primary)', color: '#000',
                          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--font-display)',
                          opacity: payingId === inv.id ? 0.6 : 1,
                          transition: 'opacity 0.15s, transform 0.15s',
                        }}
                        onClick={() => handlePay(inv.id)}
                        disabled={payingId === inv.id}
                      >
                        {payingId === inv.id
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : <CreditCard size={14} />}
                        {payingId === inv.id ? (t.invoices?.loadingCheckout ?? 'Loading...') : (t.invoices?.payNow ?? 'Pay Now')}
                      </button>
                    )}

                    {inv.status === 'paid' && inv.paidDate && (
                      <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>
                        {formatDate(inv.paidDate)}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
