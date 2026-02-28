import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, CheckCircle2, Clock, AlertTriangle,
  Search, Filter, Send, X, ChevronDown, ChevronUp, MessageSquare,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { Client, Invoice } from '../types';

interface PaymentsPageProps {
  clients: Client[];
  invoices: Invoice[];
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => void;
  onAddInvoice: (invoice: Invoice) => void;
  onViewClient: (id: string) => void;
}

type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue';
type SortKey = 'date' | 'amount' | 'name';

export default function PaymentsPage({ clients, invoices, onUpdateInvoice, onAddInvoice, onViewClient }: PaymentsPageProps) {
  const { lang, t } = useLang();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [createModal, setCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ clientId: '', plan: 'Basic' as 'Basic' | 'Premium' | 'Elite' });
  const [reminderModal, setReminderModal] = useState<{ clientId: string; clientName: string; amount: number; invoiceId: string } | null>(null);
  const [reminderDraft, setReminderDraft] = useState('');
  const [reminderSent, setReminderSent] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // ── Status label helper ──
  const statusLabel = (s: string) => {
    if (s === 'paid') return t.payments.paid;
    if (s === 'pending') return t.payments.pending;
    if (s === 'overdue') return t.payments.overdue;
    return s;
  };

  // ── Summary stats ──
  const activeClients = clients.filter(c => c.status === 'active');
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatPeriod = (d: Date) => `${monthShort[d.getMonth()]} ${d.getFullYear()}`;
  const currentPeriod = formatPeriod(new Date());
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const previousPeriod = formatPeriod(prevDate);

  const thisMonth = invoices.filter(inv => inv.period === currentPeriod);
  const lastMonth = invoices.filter(inv => inv.period === previousPeriod);

  const totalRevenue = thisMonth.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const lastMonthRevenue = lastMonth.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const pendingAmount = thisMonth.filter(inv => inv.status === 'pending').reduce((s, inv) => s + inv.amount, 0);
  const lastMonthPending = lastMonth.filter(inv => inv.status === 'pending').reduce((s, inv) => s + inv.amount, 0);
  const overdueAmount = thisMonth.filter(inv => inv.status === 'overdue').reduce((s, inv) => s + inv.amount, 0);
  const lastMonthOverdue = lastMonth.filter(inv => inv.status === 'overdue').reduce((s, inv) => s + inv.amount, 0);
  const paidCount = thisMonth.filter(inv => inv.status === 'paid').length;
  const totalCount = thisMonth.length;

  // ── All-time revenue ──
  const allTimePaid = invoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);

  // ── Month-over-month delta ──
  const getRevenueDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  const revenueDelta = getRevenueDelta(totalRevenue, lastMonthRevenue);

  // ── Date locale ──
  const dateLocale = lang === 'pl' ? 'pl-PL' : 'en-US';

  // ── Filter + sort invoices ──
  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (search && !inv.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'date') return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    if (sortBy === 'amount') return b.amount - a.amount;
    return a.clientName.localeCompare(b.clientName);
  });

  const handleMarkPaid = (id: string) => {
    onUpdateInvoice(id, { status: 'paid', paidDate: new Date().toISOString().split('T')[0] });
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.clientId) return;
    const client = clients.find(c => c.id === newInvoice.clientId);
    if (!client) return;
    const rateMap = { Basic: 99, Premium: 199, Elite: 299 };
    const now = new Date();
    const period = formatPeriod(now);
    const inv: Invoice = {
      id: `inv-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      amount: rateMap[newInvoice.plan],
      status: 'pending',
      dueDate: now.toISOString().split('T')[0],
      paidDate: null,
      period,
      plan: newInvoice.plan,
    };
    onAddInvoice(inv);
    setCreateModal(false);
    setNewInvoice({ clientId: '', plan: 'Basic' });
  };

  const statusColors: Record<string, { color: string; bg: string }> = {
    paid: { color: 'var(--accent-success)', bg: 'var(--accent-success-dim)' },
    pending: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
    overdue: { color: 'var(--accent-danger)', bg: 'rgba(239,68,68,0.1)' },
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: t.payments.filterAll, count: invoices.length },
    { key: 'paid', label: t.payments.filterPaid, count: invoices.filter(i => i.status === 'paid').length },
    { key: 'pending', label: t.payments.filterPending, count: invoices.filter(i => i.status === 'pending').length },
    { key: 'overdue', label: t.payments.filterOverdue, count: invoices.filter(i => i.status === 'overdue').length },
  ];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Summary Cards */}
      <div style={{ ...styles.summaryGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        <GlassCard delay={0}>
          <div style={styles.summaryIcon}>
            <DollarSign size={20} color="var(--accent-success)" />
          </div>
          <div style={styles.summaryLabel}>{t.payments.revenueThisMonth}</div>
          <div style={styles.summaryValue}>${totalRevenue.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--accent-success)' }}>
            {t.payments.invoicesPaid(paidCount)} ({paidCount}/{totalCount})
          </div>
          {lastMonthRevenue > 0 && (
            <div style={{ ...styles.trendLine, color: revenueDelta >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {revenueDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {revenueDelta >= 0 ? '+' : ''}{revenueDelta}% vs last month
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.05}>
          <div style={{ ...styles.summaryIcon }}>
            <Clock size={20} color="var(--accent-warm)" />
          </div>
          <div style={styles.summaryLabel}>{t.payments.pending}</div>
          <div style={styles.summaryValue}>${pendingAmount.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--accent-warm)' }}>
            {t.payments.invoiceCount(thisMonth.filter(i => i.status === 'pending').length)}
          </div>
          {lastMonthPending > 0 && pendingAmount !== lastMonthPending && (
            <div style={{ ...styles.trendLine, color: pendingAmount <= lastMonthPending ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {pendingAmount <= lastMonthPending ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
              {pendingAmount < lastMonthPending ? t.payments.lessThanLast : t.payments.moreThanLast}
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.1}>
          <div style={{ ...styles.summaryIcon }}>
            <AlertTriangle size={20} color="var(--accent-danger)" />
          </div>
          <div style={styles.summaryLabel}>{t.payments.overdue}</div>
          <div style={styles.summaryValue}>${overdueAmount.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--accent-danger)' }}>
            {t.payments.invoiceCount(thisMonth.filter(i => i.status === 'overdue').length)}
          </div>
          {lastMonthOverdue > 0 && overdueAmount !== lastMonthOverdue && (
            <div style={{ ...styles.trendLine, color: overdueAmount <= lastMonthOverdue ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {overdueAmount <= lastMonthOverdue ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
              {overdueAmount < lastMonthOverdue ? t.payments.lessThanLast : t.payments.moreThanLast}
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.15}>
          <div style={{ ...styles.summaryIcon }}>
            <CheckCircle2 size={20} color="var(--accent-primary)" />
          </div>
          <div style={styles.summaryLabel}>{t.payments.allTimeRevenue}</div>
          <div style={styles.summaryValue}>${allTimePaid.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--text-tertiary)' }}>
            {activeClients.length} {t.payments.activeClients}
          </div>
        </GlassCard>
      </div>

      {/* Invoice List */}
      <GlassCard delay={0.2}>
        {/* Toolbar */}
        <div style={{ ...styles.toolbar, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '16px' }}>
          <div style={styles.toolbarLeft}>
            <h3 style={styles.sectionTitle}>{t.payments.invoices}</h3>
            <div style={styles.filterTabs}>
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    ...styles.filterTab,
                    ...(statusFilter === tab.key ? styles.filterTabActive : {}),
                  }}
                >
                  {tab.label}
                  <span style={styles.filterCount}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.toolbarRight}>
            <div style={styles.searchBox}>
              <Search size={14} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder={t.payments.searchClients}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.sortWrap}>
              <Filter size={13} color="var(--text-tertiary)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                style={styles.sortSelect}
              >
                <option value="date">{t.payments.sortDate}</option>
                <option value="amount">{t.payments.sortAmount}</option>
                <option value="name">{t.payments.sortName}</option>
              </select>
              <ChevronDown size={12} color="var(--text-tertiary)" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            <button onClick={() => setCreateModal(true)} style={styles.createBtn}>
              <DollarSign size={14} />
              {t.payments.newInvoice}
            </button>
          </div>
        </div>

        {/* Table Header */}
        {!isMobile && (
          <div style={styles.tableHeader}>
            <span style={{ ...styles.th, flex: 2 }}>{t.payments.client}</span>
            <span style={{ ...styles.th, flex: 1 }}>{t.payments.period}</span>
            <span style={{ ...styles.th, flex: 1 }}>{t.payments.plan}</span>
            <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>{t.payments.amount}</span>
            <span style={{ ...styles.th, flex: 1 }}>{t.payments.dueDate}</span>
            <span style={{ ...styles.th, flex: 1 }}>{t.payments.status}</span>
            <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>{t.payments.action}</span>
          </div>
        )}

        {/* Rows */}
        <div style={styles.tableBody}>
          {filtered.length === 0 && (
            <div style={styles.emptyState}>{t.payments.noInvoicesFound}</div>
          )}
          {filtered.map((inv, i) => {
            const sc = statusColors[inv.status];
            const isExpanded = !isMobile && expandedClientId === inv.clientId;
            const clientHistory = invoices
              .filter(h => h.clientId === inv.clientId && h.id !== inv.id)
              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <div
                  style={styles.tableRow}
                  onClick={() => { if (!isMobile) setExpandedClientId(isExpanded ? null : inv.clientId); }}
                >
                {isMobile ? (
                  // Mobile card layout
                  <div style={styles.mobileCard}>
                    <div style={styles.mobileCardTop}>
                      <div style={{ ...styles.avatar, background: getAvatarColor(inv.clientId) }}>
                        {getInitials(inv.clientName)}
                      </div>
                      <div style={styles.mobileCardInfo}>
                        <div style={styles.clientNameLink} onClick={(e) => { e.stopPropagation(); onViewClient(inv.clientId); }}>{inv.clientName}</div>
                        <div style={styles.mobileCardMeta}>{inv.period} &middot; {inv.plan}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={styles.amount}>${inv.amount}</div>
                        <span style={{ ...styles.statusBadge, color: sc.color, background: sc.bg }}>
                          {statusLabel(inv.status)}
                        </span>
                      </div>
                    </div>
                    {inv.status !== 'paid' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {inv.status === 'overdue' && (
                          <button
                            onClick={() => setReminderModal({ clientId: inv.clientId, clientName: inv.clientName, amount: inv.amount, invoiceId: inv.id })}
                            style={{ ...styles.markPaidBtn, background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)', color: 'var(--accent-danger)', flex: 1 }}
                          >
                            <MessageSquare size={13} />
                            {t.payments.remind}
                          </button>
                        )}
                        <button onClick={() => handleMarkPaid(inv.id)} style={{ ...styles.markPaidBtn, flex: 1 }}>
                          <CheckCircle2 size={13} />
                          {t.payments.markAsPaid}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Desktop row layout
                  <>
                    <div style={{ ...styles.td, flex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ ...styles.avatar, background: getAvatarColor(inv.clientId) }}>
                        {getInitials(inv.clientName)}
                      </div>
                      <span style={styles.clientNameLink} onClick={(e) => { e.stopPropagation(); onViewClient(inv.clientId); }}>{inv.clientName}</span>
                    </div>
                    <span style={{ ...styles.td, flex: 1, color: 'var(--text-secondary)' }}>{inv.period}</span>
                    <span style={{ ...styles.td, flex: 1 }}>
                      <span style={styles.planChip}>{inv.plan}</span>
                    </span>
                    <span style={{ ...styles.td, flex: 1, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                      ${inv.amount}
                    </span>
                    <span style={{ ...styles.td, flex: 1, color: 'var(--text-secondary)', fontSize: '17px' }}>
                      {new Date(inv.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ ...styles.td, flex: 1 }}>
                      <span style={{ ...styles.statusBadge, color: sc.color, background: sc.bg }}>
                        {inv.status === 'paid' && <CheckCircle2 size={11} />}
                        {inv.status === 'pending' && <Clock size={11} />}
                        {inv.status === 'overdue' && <AlertTriangle size={11} />}
                        {statusLabel(inv.status)}
                      </span>
                    </span>
                    <span style={{ ...styles.td, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {inv.status === 'overdue' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReminderModal({ clientId: inv.clientId, clientName: inv.clientName, amount: inv.amount, invoiceId: inv.id }); }}
                          style={styles.reminderBtnSmall}
                        >
                          <MessageSquare size={12} />
                          {t.payments.remind}
                        </button>
                      )}
                      {inv.status !== 'paid' ? (
                        <button onClick={(e) => { e.stopPropagation(); handleMarkPaid(inv.id); }} style={styles.markPaidBtnSmall}>
                          <CheckCircle2 size={12} />
                          {t.payments.markAsPaid}
                        </button>
                      ) : (
                        <span style={styles.paidDateLabel}>
                          <CheckCircle2 size={12} />
                          {t.payments.paid} {inv.paidDate && new Date(inv.paidDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {clientHistory.length > 0 && (
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: '4px', display: 'flex' }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      )}
                    </span>
                  </>
                )}
                </div>

                {/* Client payment history (expanded) */}
                <AnimatePresence>
                  {isExpanded && clientHistory.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={styles.historySection}>
                        <div style={styles.historyLabel}>{t.payments.paymentHistory(inv.clientName)}</div>
                        {clientHistory.map(h => {
                          const hsc = statusColors[h.status];
                          return (
                            <div key={h.id} style={styles.historyRow}>
                              <span style={{ ...styles.td, flex: 1, color: 'var(--text-secondary)', fontSize: '15px' }}>{h.period}</span>
                              <span style={{ ...styles.td, flex: 1, fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>${h.amount}</span>
                              <span style={{ ...styles.td, flex: 1 }}>
                                <span style={{ ...styles.statusBadge, color: hsc.color, background: hsc.bg, fontSize: '13px', padding: '2px 8px' }}>
                                  {h.status === 'paid' && <CheckCircle2 size={10} />}
                                  {h.status === 'pending' && <Clock size={10} />}
                                  {h.status === 'overdue' && <AlertTriangle size={10} />}
                                  {statusLabel(h.status)}
                                </span>
                              </span>
                              <span style={{ ...styles.td, flex: 1, fontSize: '14px', color: 'var(--text-tertiary)' }}>
                                {h.paidDate ? `${t.payments.paid} ${new Date(h.paidDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}` : h.status === 'overdue' ? t.payments.overdue : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCreateModal(false)}
            style={styles.modalOverlay}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              style={{ ...styles.modal, width: isMobile ? 'calc(100% - 32px)' : '440px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{t.payments.createInvoice}</h3>
                <button onClick={() => setCreateModal(false)} style={styles.closeBtn}><X size={18} /></button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.payments.client}</span>
                  <select
                    value={newInvoice.clientId}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, clientId: e.target.value }))}
                    style={styles.modalSelect}
                  >
                    <option value="">{t.payments.selectClient}</option>
                    {clients.filter(c => c.status === 'active' || c.status === 'pending').map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>
                    ))}
                  </select>
                </div>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.payments.planTier}</span>
                  <div style={styles.planPicker}>
                    {(['Basic', 'Premium', 'Elite'] as const).map(p => {
                      const rateMap = { Basic: 99, Premium: 199, Elite: 299 };
                      const isActive = newInvoice.plan === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setNewInvoice(prev => ({ ...prev, plan: p }))}
                          style={{
                            ...styles.planOption,
                            ...(isActive ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'var(--accent-primary-dim)' } : {}),
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '18px' }}>{p}</div>
                          <div style={{ fontSize: '15px', opacity: 0.7 }}>${rateMap[p]}/mo</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button onClick={() => setCreateModal(false)} style={styles.cancelBtn}>{t.common.cancel}</button>
                  <button
                    onClick={handleCreateInvoice}
                    style={{ ...styles.primaryBtn, opacity: newInvoice.clientId ? 1 : 0.5 }}
                  >
                    <Send size={14} />
                    {t.payments.createInvoice}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Reminder Modal */}
      <AnimatePresence>
        {reminderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { if (!reminderSent) { setReminderModal(null); setReminderDraft(''); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ ...styles.modal, width: isMobile ? 'calc(100% - 32px)' : '440px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ ...styles.avatar, background: getAvatarColor(reminderModal.clientId) }}>
                    {getInitials(reminderModal.clientName)}
                  </div>
                  <div>
                    <h3 style={{ ...styles.modalTitle, fontSize: '18px' }}>{t.payments.remindClient(reminderModal.clientName.split(' ')[0])}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--accent-danger)' }}>
                      {t.payments.amountOverdue(reminderModal.amount)}
                    </span>
                  </div>
                </div>
                <button
                  style={styles.closeBtn}
                  onClick={() => { setReminderModal(null); setReminderDraft(''); setReminderSent(false); }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={styles.modalBody}>
                {reminderSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 0' }}
                  >
                    <CheckCircle2 size={32} color="var(--accent-success)" />
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t.payments.reminderSent}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
                      {t.payments.reminderSentTo(reminderModal.clientName.split(' ')[0])}
                    </p>
                    <button
                      style={styles.cancelBtn}
                      onClick={() => { setReminderModal(null); setReminderDraft(''); setReminderSent(false); }}
                    >
                      {t.payments.close}
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <textarea
                      value={reminderDraft}
                      onChange={e => setReminderDraft(e.target.value)}
                      placeholder={t.payments.reminderPlaceholder(reminderModal.clientName.split(' ')[0], reminderModal.amount)}
                      style={styles.reminderTextarea}
                      rows={4}
                    />
                    <div style={styles.modalActions}>
                      <button onClick={() => { setReminderModal(null); setReminderDraft(''); }} style={styles.cancelBtn}>
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={() => setReminderSent(true)}
                        style={styles.primaryBtn}
                      >
                        <Send size={14} />
                        {t.payments.sendReminder}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  summaryGrid: {
    display: 'grid',
    gap: '16px',
  },
  summaryIcon: {
    marginBottom: '8px',
  },
  summaryLabel: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  summaryValue: {
    fontSize: '39px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-1px',
  },
  summaryMeta: {
    fontSize: '17px',
    fontWeight: 500,
    marginTop: '4px',
  },
  trendLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    fontWeight: 500,
    marginTop: '6px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  toolbarLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  filterTabs: {
    display: 'flex',
    gap: '4px',
  },
  filterTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '17px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    borderColor: 'rgba(0,229,200,0.15)',
  },
  filterCount: {
    fontSize: '14px',
    fontWeight: 600,
    opacity: 0.6,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    width: '140px',
  },
  sortWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 28px 6px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
    position: 'relative',
  },
  sortSelect: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    appearance: 'none',
    paddingRight: '16px',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    gap: '16px',
    borderBottom: '1px solid var(--glass-border)',
    marginBottom: '4px',
  },
  th: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    gap: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background 0.1s',
    cursor: 'pointer',
  },
  td: {
    fontSize: '18px',
    color: 'var(--text-primary)',
  },
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    flexShrink: 0,
  },
  clientName: {
    fontSize: '18px',
    fontWeight: 600,
  },
  clientNameLink: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  amount: {
    fontSize: '21px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
  },
  planChip: {
    fontSize: '15px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    textTransform: 'capitalize' as const,
  },
  markPaidBtnSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-success-dim)',
    border: '1px solid rgba(34,197,94,0.15)',
    color: 'var(--accent-success)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  reminderBtnSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)',
    color: 'var(--accent-danger)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  mobileCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  mobileCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mobileCardInfo: {
    flex: 1,
  },
  mobileCardMeta: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  markPaidBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-success-dim)',
    border: '1px solid rgba(34,197,94,0.15)',
    color: 'var(--accent-success)',
    fontSize: '17px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    width: '100%',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: '18px',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--glass-border)',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modalLabel: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
  },
  modalSelect: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  planPicker: {
    display: 'flex',
    gap: '8px',
  },
  planOption: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '4px',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
  reminderTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontFamily: 'var(--font-display)',
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  paidDateLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--accent-success)',
  },
  historySection: {
    padding: '8px 16px 12px 52px',
    borderBottom: '1px solid var(--glass-border)',
    background: 'rgba(0,229,200,0.02)',
    borderLeft: '3px solid var(--accent-primary)',
    marginLeft: '16px',
  },
  historyLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-subtle)',
  },
};
