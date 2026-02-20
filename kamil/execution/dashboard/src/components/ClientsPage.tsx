import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Filter, ArrowUpDown,
  Flame, Pause, Sparkles, MoreHorizontal,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { clients, getInitials, getAvatarColor } from '../data';
import type { Client } from '../types';

interface ClientsPageProps {
  onViewClient: (id: string) => void;
}

export default function ClientsPage({ onViewClient }: ClientsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || c.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const statusIcon = (status: Client['status']) => {
    switch (status) {
      case 'active': return <Flame size={14} color="var(--accent-success)" />;
      case 'paused': return <Pause size={14} color="var(--accent-warm)" />;
      case 'new': return <Sparkles size={14} color="var(--accent-secondary)" />;
    }
  };

  const planBadge = (plan: Client['plan']) => {
    const colors: Record<string, { color: string; bg: string }> = {
      Elite: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
      Premium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
      Basic: { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
    };
    return colors[plan];
  };

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <Filter size={14} color="var(--text-tertiary)" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Plans</option>
              <option value="Elite">Elite</option>
              <option value="Premium">Premium</option>
              <option value="Basic">Basic</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <ArrowUpDown size={14} color="var(--text-tertiary)" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="new">New</option>
            </select>
          </div>
        </div>

        <button style={styles.addBtn}>
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div style={styles.miniStats}>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-success)' }}>
            {clients.filter(c => c.status === 'active').length}
          </span> Active
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-warm)' }}>
            {clients.filter(c => c.status === 'paused').length}
          </span> Paused
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-secondary)' }}>
            {clients.filter(c => c.status === 'new').length}
          </span> New
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--text-primary)' }}>
            {clients.length}
          </span> Total
        </div>
      </div>

      {/* Client Cards Grid */}
      <div style={styles.grid}>
        {filtered.map((client, i) => {
          const badge = planBadge(client.plan);
          return (
            <GlassCard
              key={client.id}
              delay={i * 0.04}
              hover
              onClick={() => onViewClient(client.id)}
            >
              <div style={styles.cardTop}>
                <div style={styles.clientInfo}>
                  <div style={{ ...styles.avatar, background: getAvatarColor(client.id) }}>
                    {getInitials(client.name)}
                  </div>
                  <div>
                    <div style={styles.clientName}>{client.name}</div>
                    <div style={styles.clientEmail}>{client.email}</div>
                  </div>
                </div>
                <button style={styles.moreBtn}>
                  <MoreHorizontal size={16} color="var(--text-tertiary)" />
                </button>
              </div>

              <div style={styles.cardMeta}>
                <span style={{ ...styles.planBadge, color: badge.color, background: badge.bg }}>
                  {client.plan}
                </span>
                <span style={styles.statusBadge}>
                  {statusIcon(client.status)}
                  <span style={{ textTransform: 'capitalize' }}>{client.status}</span>
                </span>
              </div>

              <div style={styles.cardStats}>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>Progress</div>
                  <div style={styles.cardStatValue}>{client.progress}%</div>
                </div>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>Rate</div>
                  <div style={styles.cardStatValue}>${client.monthlyRate}</div>
                </div>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>Streak</div>
                  <div style={styles.cardStatValue}>
                    {client.streak > 0 ? `${client.streak}d` : '—'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={styles.progressBar}>
                <motion.div
                  style={{
                    ...styles.progressFill,
                    background: client.progress > 80 ? 'var(--accent-success)' :
                                client.progress > 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${client.progress}%` }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                />
              </div>

              <div style={styles.cardFooter}>
                <span style={styles.footerText}>Next check-in: {client.nextCheckIn}</span>
                <span style={styles.footerText}>{client.lastActive}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    flex: 1,
    maxWidth: '360px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    flex: 1,
  },
  filters: {
    display: 'flex',
    gap: '8px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
  },
  select: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: '#07090e',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    marginLeft: 'auto',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  miniStats: {
    display: 'flex',
    gap: '24px',
    padding: '0 4px',
  },
  miniStat: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: 'flex',
    gap: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  clientInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: '#07090e',
  },
  clientName: {
    fontSize: '15px',
    fontWeight: 600,
  },
  clientEmail: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  moreBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  planBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  cardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  cardStatItem: {
    textAlign: 'center',
  },
  cardStatLabel: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginBottom: '2px',
  },
  cardStatValue: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
};
