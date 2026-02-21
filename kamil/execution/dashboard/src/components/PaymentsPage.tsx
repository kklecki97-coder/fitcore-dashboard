import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, CheckCircle2, Clock, AlertTriangle,
  Search, Filter, Send, X, ChevronDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, Invoice } from '../types';

interface PaymentsPageProps {
  clients: Client[];
  invoices: Invoice[];
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => void;
  onAddInvoice: (invoice: Invoice) => void;
}

type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue';
type SortKey = 'date' | 'amount' | 'name';

export default function PaymentsPage({ clients, invoices, onUpdateInvoice, onAddInvoice }: PaymentsPageProps) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [createModal, setCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ clientId: '', plan: 'Basic' as 'Basic' | 'Premium' | 'Elite' });

  // ── Summary stats ──
  const activeClients = clients.filter(c => c.status === 'active');
  const thisMonth = invoices.filter(inv => inv.period === 'Feb 2026');
  const totalRevenue = thisMonth.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const pendingAmount = thisMonth.filter(inv => inv.status === 'pending').reduce((s, inv) => s + inv.amount, 0);
  const overdueAmount = thisMonth.filter(inv => inv.status === 'overdue').reduce((s, inv) => s + inv.amount, 0);
  const paidCount = thisMonth.filter(inv => inv.status === 'paid').length;
  const totalCount = thisMonth.length;

  // ── All-time revenue ──
  const allTimePaid = invoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);

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
    const period = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
    { key: 'all', label: 'All', count: invoices.length },
    { key: 'paid', label: 'Paid', count: invoices.filter(i => i.status === 'paid').length },
    { key: 'pending', label: 'Pending', count: invoices.filter(i => i.status === 'pending').length },
    { key: 'overdue', label: 'Overdue', count: invoices.filter(i => i.status === 'overdue').length },
  ];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Summary Cards */}
      <div style={{ ...styles.summaryGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        <GlassCard delay={0}>
          <div style={styles.summaryIcon}>
            <DollarSign size={20} color="var(--accent-success)" />
          </div>
          <div style={styles.summaryLabel}>Revenue This Month</div>
          <div style={styles.summaryValue}>${totalRevenue.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--accent-success)' }}>
            {paidCount}/{totalCount} invoices paid
          </div>
        </GlassCard>

        <GlassCard delay={0.05}>
          <div style={{ ...styles.summaryIcon }}>
            <Clock size={20} color="var(--accent-warm)" />
          </div>
          <div style={styles.summaryLabel}>Pending</div>
          <div style={styles.summaryValue}>${pendingAmount.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--accent-warm)' }}>
            {thisMonth.filter(i => i.status === 'pending').length} invoice{thisMonth.filter(i => i.status === 'pending').length !== 1 ? 's' : ''}
          </div>
        </GlassCard>

        <GlassCard delay={0.1}>
          <div style={{ ...styles.summaryIcon }}>
            <AlertTriangle size={20} color="var(--accent-danger)" />
          </div>
          <div style={styles.summaryLabel}>Overdue</div>
          <div style={styles.summaryValue}>${overdueAmount.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--accent-danger)' }}>
            {thisMonth.filter(i => i.status === 'overdue').length} invoice{thisMonth.filter(i => i.status === 'overdue').length !== 1 ? 's' : ''}
          </div>
        </GlassCard>

        <GlassCard delay={0.15}>
          <div style={{ ...styles.summaryIcon }}>
            <CheckCircle2 size={20} color="var(--accent-primary)" />
          </div>
          <div style={styles.summaryLabel}>All-Time Revenue</div>
          <div style={styles.summaryValue}>${allTimePaid.toLocaleString()}</div>
          <div style={{ ...styles.summaryMeta, color: 'var(--text-tertiary)' }}>
            {activeClients.length} active clients
          </div>
        </GlassCard>
      </div>

      {/* Invoice List */}
      <GlassCard delay={0.2}>
        {/* Toolbar */}
        <div style={{ ...styles.toolbar, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '16px' }}>
          <div style={styles.toolbarLeft}>
            <h3 style={styles.sectionTitle}>Invoices</h3>
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
                placeholder="Search clients..."
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
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown size={12} color="var(--text-tertiary)" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            <button onClick={() => setCreateModal(true)} style={styles.createBtn}>
              <DollarSign size={14} />
              New Invoice
            </button>
          </div>
        </div>

        {/* Table Header */}
        {!isMobile && (
          <div style={styles.tableHeader}>
            <span style={{ ...styles.th, flex: 2 }}>Client</span>
            <span style={{ ...styles.th, flex: 1 }}>Period</span>
            <span style={{ ...styles.th, flex: 1 }}>Plan</span>
            <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>Amount</span>
            <span style={{ ...styles.th, flex: 1 }}>Due Date</span>
            <span style={{ ...styles.th, flex: 1 }}>Status</span>
            <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>Action</span>
          </div>
        )}

        {/* Rows */}
        <div style={styles.tableBody}>
          {filtered.length === 0 && (
            <div style={styles.emptyState}>No invoices found.</div>
          )}
          {filtered.map((inv, i) => {
            const sc = statusColors[inv.status];
            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                style={styles.tableRow}
              >
                {isMobile ? (
                  // Mobile card layout
                  <div style={styles.mobileCard}>
                    <div style={styles.mobileCardTop}>
                      <div style={{ ...styles.avatar, background: getAvatarColor(inv.clientId) }}>
                        {getInitials(inv.clientName)}
                      </div>
                      <div style={styles.mobileCardInfo}>
                        <div style={styles.clientName}>{inv.clientName}</div>
                        <div style={styles.mobileCardMeta}>{inv.period} &middot; {inv.plan}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={styles.amount}>${inv.amount}</div>
                        <span style={{ ...styles.statusBadge, color: sc.color, background: sc.bg }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    {inv.status !== 'paid' && (
                      <button onClick={() => handleMarkPaid(inv.id)} style={styles.markPaidBtn}>
                        <CheckCircle2 size={13} />
                        Mark Paid
                      </button>
                    )}
                  </div>
                ) : (
                  // Desktop row layout
                  <>
                    <div style={{ ...styles.td, flex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ ...styles.avatar, background: getAvatarColor(inv.clientId) }}>
                        {getInitials(inv.clientName)}
                      </div>
                      <span style={styles.clientName}>{inv.clientName}</span>
                    </div>
                    <span style={{ ...styles.td, flex: 1, color: 'var(--text-secondary)' }}>{inv.period}</span>
                    <span style={{ ...styles.td, flex: 1 }}>
                      <span style={styles.planChip}>{inv.plan}</span>
                    </span>
                    <span style={{ ...styles.td, flex: 1, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                      ${inv.amount}
                    </span>
                    <span style={{ ...styles.td, flex: 1, color: 'var(--text-secondary)', fontSize: '17px' }}>
                      {new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ ...styles.td, flex: 1 }}>
                      <span style={{ ...styles.statusBadge, color: sc.color, background: sc.bg }}>
                        {inv.status === 'paid' && <CheckCircle2 size={11} />}
                        {inv.status === 'pending' && <Clock size={11} />}
                        {inv.status === 'overdue' && <AlertTriangle size={11} />}
                        {inv.status}
                      </span>
                    </span>
                    <span style={{ ...styles.td, flex: 1, textAlign: 'right' }}>
                      {inv.status !== 'paid' ? (
                        <button onClick={() => handleMarkPaid(inv.id)} style={styles.markPaidBtnSmall}>
                          <CheckCircle2 size={12} />
                          Mark Paid
                        </button>
                      ) : (
                        <span style={{ fontSize: '15px', color: 'var(--text-tertiary)' }}>
                          {inv.paidDate && new Date(inv.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {createModal && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModal(false)}
              style={styles.overlay}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              style={{ ...styles.modal, width: isMobile ? 'calc(100% - 32px)' : '440px' }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Create Invoice</h3>
                <button onClick={() => setCreateModal(false)} style={styles.closeBtn}><X size={18} /></button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Client</span>
                  <select
                    value={newInvoice.clientId}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, clientId: e.target.value }))}
                    style={styles.modalSelect}
                  >
                    <option value="">Select a client...</option>
                    {clients.filter(c => c.status === 'active' || c.status === 'pending').map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>
                    ))}
                  </select>
                </div>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Plan Tier</span>
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
                  <button onClick={() => setCreateModal(false)} style={styles.cancelBtn}>Cancel</button>
                  <button
                    onClick={handleCreateInvoice}
                    style={{ ...styles.primaryBtn, opacity: newInvoice.clientId ? 1 : 0.5 }}
                  >
                    <Send size={14} />
                    Create Invoice
                  </button>
                </div>
              </div>
            </motion.div>
          </>
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
    background: 'rgba(255,255,255,0.03)',
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
    background: 'rgba(255,255,255,0.03)',
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
    color: '#07090e',
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
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'background 0.1s',
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
    color: '#07090e',
    flexShrink: 0,
  },
  clientName: {
    fontSize: '18px',
    fontWeight: 600,
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
    background: 'rgba(255,255,255,0.04)',
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
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    zIndex: 101,
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
    background: 'rgba(255,255,255,0.03)',
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
    color: '#07090e',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
};
