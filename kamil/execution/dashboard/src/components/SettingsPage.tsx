import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, User, Bell, Shield, Palette } from 'lucide-react';
import GlassCard from './GlassCard';
import type { Theme } from '../types';

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function SettingsPage({ theme, onThemeChange }: SettingsPageProps) {
  const themeOptions: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'dark', label: 'Dark', description: 'Deep black with electric accents', icon: Moon },
    { value: 'light', label: 'Light', description: 'Clean white with teal accents', icon: Sun },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.grid}>
        {/* Appearance */}
        <GlassCard delay={0.05}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <Palette size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Appearance</h3>
              <p style={styles.sectionSub}>Customize the look and feel of your dashboard</p>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Theme</div>
              <div style={styles.settingDesc}>Choose between dark and light mode</div>
            </div>
          </div>

          <div style={styles.themeGrid}>
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = theme === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  onClick={() => onThemeChange(opt.value)}
                  style={{
                    ...styles.themeCard,
                    borderColor: isActive ? 'var(--accent-primary)' : 'var(--glass-border)',
                    background: isActive ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Theme Preview */}
                  <div style={{
                    ...styles.themePreview,
                    background: opt.value === 'dark' ? '#07090e' : '#f5f6f8',
                  }}>
                    <div style={{
                      ...styles.previewSidebar,
                      background: opt.value === 'dark' ? '#0c1017' : '#ffffff',
                    }}>
                      <div style={{ ...styles.previewDot, background: opt.value === 'dark' ? '#00e5c8' : '#0bbfa0' }} />
                      <div style={{ ...styles.previewLine, background: opt.value === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', width: '70%' }} />
                      <div style={{ ...styles.previewLine, background: opt.value === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', width: '50%' }} />
                      <div style={{ ...styles.previewLine, background: opt.value === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', width: '60%' }} />
                    </div>
                    <div style={styles.previewContent}>
                      <div style={{
                        ...styles.previewCard,
                        background: opt.value === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      }} />
                      <div style={{
                        ...styles.previewCard,
                        background: opt.value === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      }} />
                    </div>
                  </div>

                  <div style={styles.themeInfo}>
                    <Icon size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                    <div>
                      <div style={{
                        ...styles.themeName,
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}>
                        {opt.label}
                      </div>
                      <div style={styles.themeDesc}>{opt.description}</div>
                    </div>
                  </div>

                  {isActive && (
                    <motion.div
                      layoutId="activeTheme"
                      style={styles.activeCheck}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </GlassCard>

        {/* Profile (placeholder) */}
        <GlassCard delay={0.1}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <User size={18} color="var(--accent-secondary)" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Profile</h3>
              <p style={styles.sectionSub}>Manage your account information</p>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.profileRow}>
            <div style={styles.profileAvatar}>K</div>
            <div>
              <div style={styles.profileName}>Coach Kamil</div>
              <div style={styles.profileEmail}>kamil@fitcore.io</div>
            </div>
            <button style={styles.editBtn}>Edit</button>
          </div>
          <div style={styles.fieldGroup}>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Display Name</label>
              <div style={styles.fieldValue}>Coach Kamil</div>
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Email</label>
              <div style={styles.fieldValue}>kamil@fitcore.io</div>
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Plan</label>
              <div style={{ ...styles.fieldValue, color: 'var(--accent-primary)' }}>Pro Plan</div>
            </div>
          </div>
        </GlassCard>

        {/* Notifications (placeholder) */}
        <GlassCard delay={0.15}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.sectionIcon, background: 'var(--accent-warm-dim)' }}>
              <Bell size={18} color="var(--accent-warm)" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Notifications</h3>
              <p style={styles.sectionSub}>Configure how you receive alerts</p>
            </div>
          </div>
          <div style={styles.divider} />
          {[
            { label: 'New client messages', desc: 'Get notified when a client sends a message', on: true },
            { label: 'Check-in reminders', desc: 'Reminder before scheduled check-ins', on: true },
            { label: 'Payment alerts', desc: 'Notifications for payments received', on: true },
            { label: 'Weekly summary', desc: 'Email digest of your weekly performance', on: false },
          ].map((notif, i) => (
            <div key={i} style={styles.toggleRow}>
              <div>
                <div style={styles.settingLabel}>{notif.label}</div>
                <div style={styles.settingDesc}>{notif.desc}</div>
              </div>
              <div style={{
                ...styles.toggle,
                background: notif.on ? 'var(--accent-primary)' : 'var(--glass-border)',
              }}>
                <div style={{
                  ...styles.toggleKnob,
                  transform: notif.on ? 'translateX(18px)' : 'translateX(2px)',
                }} />
              </div>
            </div>
          ))}
        </GlassCard>

        {/* Security (placeholder) */}
        <GlassCard delay={0.2}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.sectionIcon, background: 'var(--accent-danger-dim)' }}>
              <Shield size={18} color="var(--accent-danger)" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Security</h3>
              <p style={styles.sectionSub}>Password and authentication settings</p>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.fieldGroup}>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Password</label>
              <div style={styles.fieldRow}>
                <div style={styles.fieldValue}>••••••••••</div>
                <button style={styles.editBtn}>Change</button>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Two-Factor Authentication</label>
              <div style={styles.fieldRow}>
                <div style={{ ...styles.fieldValue, color: 'var(--accent-success)' }}>Enabled</div>
                <button style={styles.editBtn}>Manage</button>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    maxWidth: '1100px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  sectionIcon: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
  },
  sectionSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '18px 0',
  },
  settingRow: {
    marginBottom: '14px',
  },
  settingLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  settingDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  themeCard: {
    position: 'relative',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '2px solid',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    textAlign: 'left',
    transition: 'border-color 0.2s, background 0.2s',
  },
  themePreview: {
    borderRadius: 'var(--radius-sm)',
    height: '80px',
    display: 'flex',
    overflow: 'hidden',
    marginBottom: '12px',
    border: '1px solid var(--glass-border)',
  },
  previewSidebar: {
    width: '30%',
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    borderRight: '1px solid var(--glass-border)',
  },
  previewDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    marginBottom: '4px',
  },
  previewLine: {
    height: '4px',
    borderRadius: '2px',
  },
  previewContent: {
    flex: 1,
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  previewCard: {
    flex: 1,
    borderRadius: '4px',
  },
  themeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  themeName: {
    fontSize: '13px',
    fontWeight: 600,
  },
  themeDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  activeCheck: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: '#07090e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '18px',
  },
  profileAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  profileName: {
    fontSize: '15px',
    fontWeight: 600,
  },
  profileEmail: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  editBtn: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    padding: '5px 12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    marginLeft: 'auto',
    transition: 'border-color 0.15s',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  fieldValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--glass-border)',
  },
  toggle: {
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleKnob: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: '2px',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
};
