import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, User, Bell, Shield, Palette, X, Save, Plug, ExternalLink, CheckCircle, CreditCard, Camera, Trash2, Copy, AlertTriangle } from 'lucide-react';
import GlassCard from './GlassCard';
import { ChannelIcon, CHANNEL_COLORS, CHANNEL_LABELS } from './ChannelIcons';
import useIsMobile from '../hooks/useIsMobile';
import type { Theme, MessageChannel } from '../types';

interface Notifications {
  messages: boolean;
  checkins: boolean;
  payments: boolean;
  weekly: boolean;
}

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  profileName: string;
  profileEmail: string;
  onProfileChange: (name: string, email: string) => void;
  notifications: Notifications;
  onNotificationsChange: (n: Notifications) => void;
}

export default function SettingsPage({ theme, onThemeChange, profileName, profileEmail, onProfileChange, notifications, onNotificationsChange }: SettingsPageProps) {
  const isMobile = useIsMobile();

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profileName);
  const [editEmail, setEditEmail] = useState(profileEmail);

  // Security modal state
  const [securityModal, setSecurityModal] = useState<'password' | '2fa' | 'delete' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [tfaStep, setTfaStep] = useState<'overview' | 'setup' | 'verify' | 'backup'>('overview');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  const DEMO_BACKUP_CODES = ['A7K2-M9X1', 'B3P5-R8L4', 'C6W0-T2N7', 'D1F8-Q5J3', 'E4H6-Y9V2', 'F0S3-U7G8'];

  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Integrations state
  const [integrations, setIntegrations] = useState<Record<MessageChannel, { connected: boolean; handle: string }>>({
    telegram: { connected: true, handle: '@fitcore_coach' },
    whatsapp: { connected: true, handle: '+1 (555) 012-3456' },
    email: { connected: false, handle: '' },
    instagram: { connected: false, handle: '' },
  });
  const [integrationModal, setIntegrationModal] = useState<MessageChannel | null>(null);
  const [integrationInput, setIntegrationInput] = useState('');
  const [connectingChannel, setConnectingChannel] = useState(false);

  const themeOptions: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'dark', label: 'Dark', description: 'Deep black with electric accents', icon: Moon },
    { value: 'light', label: 'Light', description: 'Clean white with teal accents', icon: Sun },
  ];

  const handleSaveProfile = () => {
    onProfileChange(editName, editEmail);
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setEditName(profileName);
    setEditEmail(profileEmail);
    setIsEditingProfile(false);
  };

  const toggleNotification = (key: keyof Notifications) => {
    onNotificationsChange({ ...notifications, [key]: !notifications[key] });
  };

  const notifItems = [
    { key: 'messages' as const, label: 'New client messages', desc: 'Get notified when a client sends a message' },
    { key: 'checkins' as const, label: 'Check-in reminders', desc: 'Reminder before scheduled check-ins' },
    { key: 'payments' as const, label: 'Payment alerts', desc: 'Notifications for payments received' },
    { key: 'weekly' as const, label: 'Weekly summary', desc: 'Email digest of your weekly performance' },
  ];

  const channelConfig: Record<MessageChannel, { instruction: string; placeholder: string; inputLabel: string; helpUrl: string }> = {
    telegram: {
      instruction: 'Create a Telegram Bot via @BotFather, then paste the bot token below. FitCore will listen for client messages through your bot.',
      placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      inputLabel: 'Bot Token',
      helpUrl: 'https://core.telegram.org/bots#botfather',
    },
    whatsapp: {
      instruction: 'Connect your WhatsApp Business account. Enter your phone number with country code to link it with FitCore.',
      placeholder: '+1 (555) 012-3456',
      inputLabel: 'Phone Number',
      helpUrl: 'https://business.whatsapp.com/',
    },
    email: {
      instruction: 'Connect an email address to send and receive client messages directly from FitCore. We support Gmail, Outlook, and custom SMTP.',
      placeholder: 'you@example.com',
      inputLabel: 'Email Address',
      helpUrl: '',
    },
    instagram: {
      instruction: 'Link your Instagram Business or Creator account to manage DMs from clients inside FitCore.',
      placeholder: '@your.username',
      inputLabel: 'Instagram Handle',
      helpUrl: 'https://business.instagram.com/',
    },
  };

  const handleConnect = (channel: MessageChannel) => {
    if (!integrationInput.trim()) return;
    setConnectingChannel(true);
    // Simulate connection delay
    setTimeout(() => {
      setIntegrations(prev => ({
        ...prev,
        [channel]: { connected: true, handle: integrationInput.trim() },
      }));
      setIntegrationInput('');
      setConnectingChannel(false);
      setIntegrationModal(null);
    }, 1200);
  };

  const handleDisconnect = (channel: MessageChannel) => {
    setIntegrations(prev => ({
      ...prev,
      [channel]: { connected: false, handle: '' },
    }));
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Profile — Row 1, Col 1 */}
        <GlassCard delay={0.05}>
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
            <div style={styles.avatarWrapper}>
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" style={styles.profileAvatarImg} />
              ) : (
                <div style={styles.profileAvatar}>{profileName.charAt(0).toUpperCase()}</div>
              )}
              <label style={styles.avatarUploadBtn}>
                <Camera size={12} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div>
              <div style={styles.profileName}>{profileName}</div>
              <div style={styles.profileEmail}>{profileEmail}</div>
            </div>
            {!isEditingProfile && (
              <button style={styles.editBtn} onClick={() => setIsEditingProfile(true)}>Edit</button>
            )}
          </div>

          {isEditingProfile ? (
            <div style={styles.fieldGroup}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={styles.fieldInput}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={styles.fieldInput}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Plan</label>
                <div style={{ ...styles.fieldValue, color: 'var(--accent-primary)' }}>Pro Plan</div>
              </div>
              <div style={styles.profileActions}>
                <button style={styles.cancelBtn} onClick={handleCancelEdit}>Cancel</button>
                <button style={styles.saveBtn} onClick={handleSaveProfile}>
                  <Save size={14} />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.fieldGroup}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Display Name</label>
                <div style={styles.fieldValue}>{profileName}</div>
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Email</label>
                <div style={styles.fieldValue}>{profileEmail}</div>
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Plan</label>
                <div style={{ ...styles.fieldValue, color: 'var(--accent-primary)' }}>Pro Plan</div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Appearance — Row 1, Col 2 */}
        <GlassCard delay={0.1}>
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

        {/* Notifications — Row 1, Col 3 */}
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
          {notifItems.map((notif) => (
            <div key={notif.key} style={styles.toggleRow}>
              <div>
                <div style={styles.settingLabel}>{notif.label}</div>
                <div style={styles.settingDesc}>{notif.desc}</div>
              </div>
              <div
                style={{
                  ...styles.toggle,
                  background: notifications[notif.key] ? 'var(--accent-primary)' : 'var(--glass-border)',
                }}
                onClick={() => toggleNotification(notif.key)}
              >
                <motion.div
                  style={styles.toggleKnob}
                  animate={{ x: notifications[notif.key] ? 18 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </div>
          ))}
        </GlassCard>

        {/* Security — Row 2, Col 1 */}
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
                <button style={styles.editBtn} onClick={() => setSecurityModal('password')}>Change</button>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>Two-Factor Authentication</label>
              <div style={styles.fieldRow}>
                <div style={{ ...styles.fieldValue, color: twoFactorEnabled ? 'var(--accent-success)' : 'var(--text-secondary)', fontSize: '16px' }}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </div>
                <button style={styles.editBtn} onClick={() => setSecurityModal('2fa')}>Manage</button>
              </div>
            </div>
          </div>
          <div style={styles.deleteAccountRow}>
            <div>
              <div style={styles.deleteAccountLabel}>Delete Account</div>
              <div style={styles.deleteAccountDesc}>Permanently remove your account and all data</div>
            </div>
            <button style={styles.deleteAccountBtn} onClick={() => setSecurityModal('delete')}>
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </GlassCard>

        {/* Integrations — Row 2, Col 2 */}
        <GlassCard delay={0.25}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.sectionIcon, background: 'rgba(0, 229, 200, 0.08)' }}>
              <Plug size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Integrations</h3>
              <p style={styles.sectionSub}>Connect your messaging channels</p>
            </div>
          </div>
          <div style={styles.divider} />
          {(['telegram', 'whatsapp', 'email', 'instagram'] as MessageChannel[]).map((channel, idx) => {
            const { connected, handle } = integrations[channel];
            const isLast = idx === 3;
            return (
              <div key={channel} style={{ ...styles.integrationRow, borderBottom: isLast ? 'none' : '1px solid var(--glass-border)' }}>
                <div style={styles.integrationInfo}>
                  <div style={{
                    ...styles.integrationIcon,
                    background: connected ? `${CHANNEL_COLORS[channel]}15` : 'var(--bg-elevated)',
                    border: connected ? `1px solid ${CHANNEL_COLORS[channel]}30` : '1px solid var(--glass-border)',
                  }}>
                    <ChannelIcon channel={channel} size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.settingLabel}>{CHANNEL_LABELS[channel]}</span>
                      {connected && (
                        <span style={{
                          ...styles.statusBadge,
                          color: 'var(--accent-success)',
                          background: 'var(--accent-success-dim)',
                          borderColor: 'var(--accent-success)',
                          fontSize: '12px',
                          padding: '2px 8px',
                        }}>
                          <CheckCircle size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Connected
                        </span>
                      )}
                    </div>
                    <div style={styles.settingDesc}>
                      {connected ? handle : 'Not connected — click Connect to set up'}
                    </div>
                  </div>
                </div>
                <div style={styles.integrationActions}>
                  {connected ? (
                    <button
                      style={styles.disconnectBtn}
                      onClick={() => handleDisconnect(channel)}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      style={{
                        ...styles.connectBtn,
                        borderColor: CHANNEL_COLORS[channel],
                        color: CHANNEL_COLORS[channel],
                      }}
                      onClick={() => {
                        setIntegrationInput('');
                        setIntegrationModal(channel);
                      }}
                    >
                      <Plug size={14} />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </GlassCard>

        {/* Stripe Payments — Row 2, Col 3 */}
        <GlassCard delay={0.3}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.sectionIcon, background: 'rgba(99, 91, 255, 0.08)' }}>
              <CreditCard size={18} color="#635bff" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Payments</h3>
              <p style={styles.sectionSub}>Accept payments from clients via Stripe</p>
            </div>
          </div>
          <div style={styles.divider} />

          <div style={styles.stripeContent}>
            <div style={styles.stripeLogo}>
              <svg width="60" height="25" viewBox="0 0 60 25" fill="none">
                <path d="M60 12.8C60 8.5 57.8 5 53.7 5C49.6 5 47 8.5 47 12.7C47 17.7 50.1 20.5 54.5 20.5C56.6 20.5 58.2 20 59.4 19.2V16C58.2 16.7 56.8 17.2 55.1 17.2C53.4 17.2 51.9 16.6 51.7 14.5H59.9C59.9 14.3 60 13.3 60 12.8ZM51.6 11.8C51.6 9.8 52.8 9 53.7 9C54.6 9 55.7 9.8 55.7 11.8H51.6ZM40.7 5C39 5 37.9 5.8 37.3 6.3L37.1 5.2H33.4V24.9L37.6 24L37.6 19.3C38.2 19.7 39.1 20.5 40.7 20.5C43.8 20.5 46.7 17.9 46.7 12.6C46.7 7.7 43.8 5 40.7 5ZM39.7 17C38.6 17 38 16.6 37.6 16.1L37.6 9.5C38 9 38.7 8.5 39.7 8.5C41.4 8.5 42.5 10.4 42.5 12.7C42.5 15.1 41.4 17 39.7 17ZM28.1 4.2L32.4 3.3V0L28.1 0.9V4.2ZM28.1 5.2H32.4V20.2H28.1V5.2ZM23.8 6.5L23.6 5.2H19.9V20.2H24.1V9.9C25 8.7 26.5 8.9 27 9.1V5.2C26.4 5 24.7 4.7 23.8 6.5ZM15.5 1.6L11.4 2.5L11.4 16.3C11.4 18.7 13.2 20.5 15.6 20.5C16.9 20.5 17.9 20.3 18.4 20V16.8C17.9 17 15.5 17.7 15.5 15.3V9H18.4V5.2H15.5V1.6ZM7.5 9.6C7.5 8.9 8.1 8.6 9 8.6C10.3 8.6 11.9 9 13.2 9.7V5.7C11.8 5.2 10.4 5 9 5C5.7 5 3.5 6.8 3.5 9.8C3.5 14.6 10.1 13.8 10.1 15.9C10.1 16.7 9.3 17 8.4 17C7 17 5.2 16.4 3.7 15.6V19.6C5.4 20.3 7 20.6 8.4 20.6C11.8 20.6 14.1 18.8 14.1 15.8C14.1 10.6 7.5 11.5 7.5 9.6Z" fill="#635bff" />
              </svg>
            </div>

            <p style={styles.stripeDesc}>
              Connect your Stripe account to accept one-time payments, recurring subscriptions, and send invoices directly from FitCore.
            </p>

            <div style={styles.stripeFeatures}>
              {['One-time payments', 'Monthly subscriptions', 'Automatic invoicing', 'Payout tracking'].map((feat) => (
                <div key={feat} style={styles.stripeFeatureItem}>
                  <CheckCircle size={14} color="#635bff" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div style={styles.stripeBadge}>
              <span style={styles.stripeBadgeText}>Coming Soon</span>
            </div>

            <button style={styles.stripeBtn} disabled>
              <CreditCard size={14} />
              Connect Stripe
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Security Modals — Password / 2FA / Delete */}
      <AnimatePresence>
        {securityModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSecurityModal(null);
              setPasswordError('');
              setPasswordSuccess(false);
              setTfaStep('overview');
              setTfaCode('');
              setTfaError('');
              setCopiedBackup(false);
              setDeleteConfirmEmail('');
            }}
          >
            <motion.div
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Password Change Modal ── */}
              {securityModal === 'password' && (
                <>
                  <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Change Password</h3>
                    <button style={styles.closeBtn} onClick={() => {
                      setSecurityModal(null);
                      setPasswordError('');
                      setPasswordSuccess(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}>
                      <X size={18} />
                    </button>
                  </div>

                  {passwordSuccess ? (
                    <div style={styles.modalBody}>
                      <div style={styles.successBox}>
                        <CheckCircle size={32} color="var(--accent-success)" />
                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Password Updated
                        </div>
                        <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                          Your password has been changed successfully.
                        </div>
                      </div>
                      <div style={styles.modalActions}>
                        <button style={styles.saveBtn} onClick={() => {
                          setSecurityModal(null);
                          setPasswordSuccess(false);
                        }}>
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.modalBody}>
                      {passwordError && (
                        <div style={styles.errorBox}>
                          <AlertTriangle size={14} />
                          {passwordError}
                        </div>
                      )}
                      <div style={styles.modalField}>
                        <label style={styles.fieldLabel}>Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                          placeholder="Enter current password"
                          style={styles.fieldInput}
                        />
                      </div>
                      <div style={styles.modalField}>
                        <label style={styles.fieldLabel}>New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                          placeholder="Min 8 characters"
                          style={styles.fieldInput}
                        />
                      </div>
                      <div style={styles.modalField}>
                        <label style={styles.fieldLabel}>Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                          placeholder="Re-enter new password"
                          style={styles.fieldInput}
                        />
                      </div>
                      <div style={styles.modalActions}>
                        <button style={styles.cancelBtn} onClick={() => {
                          setSecurityModal(null);
                          setPasswordError('');
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}>Cancel</button>
                        <button
                          style={{ ...styles.saveBtn, opacity: currentPassword && newPassword && confirmPassword ? 1 : 0.4 }}
                          onClick={() => {
                            if (!currentPassword) { setPasswordError('Please enter your current password.'); return; }
                            if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
                            if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
                            // TODO: Replace with API call
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordSuccess(true);
                          }}
                        >
                          Update Password
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── 2FA Modal ── */}
              {securityModal === '2fa' && (
                <>
                  <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Two-Factor Authentication</h3>
                    <button style={styles.closeBtn} onClick={() => {
                      setSecurityModal(null);
                      setTfaStep('overview');
                      setTfaCode('');
                      setTfaError('');
                      setCopiedBackup(false);
                    }}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={styles.modalBody}>
                    {/* Step 1: Overview */}
                    {tfaStep === 'overview' && (
                      <>
                        <div style={styles.tfaStatus}>
                          <div style={{
                            ...styles.tfaDot,
                            background: twoFactorEnabled ? 'var(--accent-success)' : 'var(--text-tertiary)',
                          }} />
                          <span style={{ fontSize: '18px', fontWeight: 500 }}>
                            2FA is currently <strong>{twoFactorEnabled ? 'enabled' : 'disabled'}</strong>
                          </span>
                        </div>
                        <p style={styles.tfaDesc}>
                          {twoFactorEnabled
                            ? 'Your account is secured with two-factor authentication. You can disable it or view your backup codes.'
                            : 'Add an extra layer of security by requiring a verification code from your authenticator app.'}
                        </p>
                        <div style={styles.modalActions}>
                          {twoFactorEnabled ? (
                            <>
                              <button style={styles.cancelBtn} onClick={() => setTfaStep('backup')}>
                                View Backup Codes
                              </button>
                              <button
                                style={{ ...styles.saveBtn, background: 'var(--accent-danger)', boxShadow: '0 0 12px var(--accent-danger-dim)' }}
                                onClick={() => {
                                  setTwoFactorEnabled(false);
                                  setSecurityModal(null);
                                  setTfaStep('overview');
                                }}
                              >
                                Disable 2FA
                              </button>
                            </>
                          ) : (
                            <>
                              <button style={styles.cancelBtn} onClick={() => setSecurityModal(null)}>Cancel</button>
                              <button
                                style={{ ...styles.saveBtn, background: 'var(--accent-success)', boxShadow: '0 0 12px var(--accent-success-dim)' }}
                                onClick={() => setTfaStep('setup')}
                              >
                                Enable 2FA
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {/* Step 2: QR Code Setup */}
                    {tfaStep === 'setup' && (
                      <>
                        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <div style={styles.qrPlaceholder}>
                          <div style={styles.qrGrid}>
                            {Array.from({ length: 64 }).map((_, i) => (
                              <div key={i} style={{
                                width: '8px', height: '8px',
                                background: [0,1,2,5,6,7,8,15,16,23,24,31,32,39,40,47,48,55,56,57,58,61,62,63,
                                  3,11,19,27,35,43,51,4,12,20,28,36,44,52,9,17,25,33,41,49,
                                  14,22,30,38,46,54,10,18,26,34,42,50,13,21,29,37,45,53].includes(i)
                                  ? 'var(--text-primary)' : 'transparent',
                                borderRadius: '1px',
                              }} />
                            ))}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                            FITC-DEMO-XXXX-XXXX
                          </div>
                        </div>
                        <div style={styles.modalActions}>
                          <button style={styles.cancelBtn} onClick={() => setTfaStep('overview')}>Back</button>
                          <button style={styles.saveBtn} onClick={() => setTfaStep('verify')}>
                            Next: Verify Code
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step 3: Verify Code */}
                    {tfaStep === 'verify' && (
                      <>
                        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                          Enter the 6-digit code from your authenticator app to confirm setup.
                        </p>
                        {tfaError && (
                          <div style={styles.errorBox}>
                            <AlertTriangle size={14} />
                            {tfaError}
                          </div>
                        )}
                        <div style={styles.modalField}>
                          <label style={styles.fieldLabel}>Verification Code</label>
                          <input
                            type="text"
                            value={tfaCode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setTfaCode(val);
                              setTfaError('');
                            }}
                            placeholder="000000"
                            maxLength={6}
                            style={{ ...styles.fieldInput, letterSpacing: '6px', fontSize: '22px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                          />
                        </div>
                        <div style={styles.modalActions}>
                          <button style={styles.cancelBtn} onClick={() => { setTfaStep('setup'); setTfaCode(''); setTfaError(''); }}>Back</button>
                          <button
                            style={{ ...styles.saveBtn, opacity: tfaCode.length === 6 ? 1 : 0.4 }}
                            onClick={() => {
                              if (tfaCode.length !== 6) { setTfaError('Please enter a 6-digit code.'); return; }
                              // TODO: Replace with API verification
                              setTwoFactorEnabled(true);
                              setTfaCode('');
                              setTfaStep('backup');
                            }}
                          >
                            Verify & Enable
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step 4: Backup Codes */}
                    {tfaStep === 'backup' && (
                      <>
                        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                          Save these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator.
                        </p>
                        <div style={styles.backupCodesBox}>
                          <div style={styles.backupCodesGrid}>
                            {DEMO_BACKUP_CODES.map((code) => (
                              <div key={code} style={styles.backupCode}>{code}</div>
                            ))}
                          </div>
                          <button
                            style={styles.copyCodesBtn}
                            onClick={() => {
                              navigator.clipboard.writeText(DEMO_BACKUP_CODES.join('\n'));
                              setCopiedBackup(true);
                              setTimeout(() => setCopiedBackup(false), 2000);
                            }}
                          >
                            <Copy size={13} />
                            {copiedBackup ? 'Copied!' : 'Copy All'}
                          </button>
                        </div>
                        <div style={styles.modalActions}>
                          <button style={styles.saveBtn} onClick={() => {
                            setSecurityModal(null);
                            setTfaStep('overview');
                            setCopiedBackup(false);
                          }}>
                            Done
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* ── Delete Account Modal ── */}
              {securityModal === 'delete' && (
                <>
                  <div style={styles.modalHeader}>
                    <h3 style={{ ...styles.modalTitle, color: 'var(--accent-danger)' }}>Delete Account</h3>
                    <button style={styles.closeBtn} onClick={() => {
                      setSecurityModal(null);
                      setDeleteConfirmEmail('');
                    }}>
                      <X size={18} />
                    </button>
                  </div>
                  <div style={styles.modalBody}>
                    <div style={styles.deleteWarningBox}>
                      <AlertTriangle size={20} color="var(--accent-danger)" />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          This action is permanent
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          All your data — clients, workouts, schedules, messages, and payment history — will be permanently deleted. This cannot be undone.
                        </div>
                      </div>
                    </div>
                    <div style={styles.modalField}>
                      <label style={styles.fieldLabel}>
                        Type <strong>{profileEmail}</strong> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder={profileEmail}
                        style={styles.fieldInput}
                      />
                    </div>
                    <div style={styles.modalActions}>
                      <button style={styles.cancelBtn} onClick={() => {
                        setSecurityModal(null);
                        setDeleteConfirmEmail('');
                      }}>Cancel</button>
                      <button
                        style={{
                          ...styles.saveBtn,
                          background: deleteConfirmEmail === profileEmail ? 'var(--accent-danger)' : 'var(--accent-danger)',
                          opacity: deleteConfirmEmail === profileEmail ? 1 : 0.3,
                          cursor: deleteConfirmEmail === profileEmail ? 'pointer' : 'not-allowed',
                          boxShadow: deleteConfirmEmail === profileEmail ? '0 0 12px var(--accent-danger-dim)' : 'none',
                        }}
                        onClick={() => {
                          if (deleteConfirmEmail !== profileEmail) return;
                          // TODO: Replace with API call to delete account
                          setSecurityModal(null);
                          setDeleteConfirmEmail('');
                        }}
                      >
                        <Trash2 size={14} />
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integration Connect Modal */}
      <AnimatePresence>
        {integrationModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!connectingChannel) setIntegrationModal(null); }}
          >
            <motion.div
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: `${CHANNEL_COLORS[integrationModal]}15`,
                    border: `1px solid ${CHANNEL_COLORS[integrationModal]}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <ChannelIcon channel={integrationModal} size={18} />
                  </div>
                  <h3 style={styles.modalTitle}>
                    Connect {CHANNEL_LABELS[integrationModal]}
                  </h3>
                </div>
                <button style={styles.closeBtn} onClick={() => { if (!connectingChannel) setIntegrationModal(null); }}>
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {channelConfig[integrationModal].instruction}
                </p>

                {channelConfig[integrationModal].helpUrl && (
                  <a
                    href={channelConfig[integrationModal].helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.helpLink}
                  >
                    <ExternalLink size={13} />
                    View setup guide
                  </a>
                )}

                <div style={styles.modalField}>
                  <label style={styles.fieldLabel}>{channelConfig[integrationModal].inputLabel}</label>
                  <input
                    type="text"
                    value={integrationInput}
                    onChange={(e) => setIntegrationInput(e.target.value)}
                    placeholder={channelConfig[integrationModal].placeholder}
                    style={{
                      ...styles.fieldInput,
                      borderColor: integrationInput.trim() ? CHANNEL_COLORS[integrationModal] : 'var(--glass-border)',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(integrationModal); }}
                    autoFocus
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => { if (!connectingChannel) setIntegrationModal(null); }}
                    disabled={connectingChannel}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...styles.saveBtn,
                      background: CHANNEL_COLORS[integrationModal],
                      boxShadow: `0 0 16px ${CHANNEL_COLORS[integrationModal]}40`,
                      opacity: integrationInput.trim() && !connectingChannel ? 1 : 0.4,
                      cursor: integrationInput.trim() && !connectingChannel ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => handleConnect(integrationModal)}
                    disabled={!integrationInput.trim() || connectingChannel}
                  >
                    {connectingChannel ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          style={{ width: '14px', height: '14px', border: '2px solid rgba(7,9,14,0.3)', borderTopColor: 'var(--text-on-accent)', borderRadius: '50%' }}
                        />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plug size={14} />
                        Connect {CHANNEL_LABELS[integrationModal]}
                      </>
                    )}
                  </button>
                </div>
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
    padding: '24px 32px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    maxWidth: '1400px',
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
    fontSize: '22px',
    fontWeight: 600,
  },
  sectionSub: {
    fontSize: '17px',
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
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  settingDesc: {
    fontSize: '17px',
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
    fontSize: '18px',
    fontWeight: 600,
  },
  themeDesc: {
    fontSize: '15px',
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
    color: 'var(--text-on-accent)',
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
    fontSize: '25px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  profileName: {
    fontSize: '21px',
    fontWeight: 600,
  },
  profileEmail: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  editBtn: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    fontSize: '17px',
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
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  fieldValue: {
    fontSize: '20px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  fieldInput: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
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
    padding: '24px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: 'var(--shadow-elevated)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  tfaStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
  },
  tfaDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  tfaDesc: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  // ── Password / 2FA / Delete modal extras ──
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '24px 16px',
    textAlign: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-danger-dim)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: 'var(--accent-danger)',
    fontSize: '14px',
    fontWeight: 500,
  },
  qrPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
  },
  qrGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 8px)',
    gap: '2px',
  },
  backupCodesBox: {
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
  },
  backupCodesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  backupCode: {
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
    letterSpacing: '1px',
  },
  copyCodesBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: '0 auto',
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  deleteWarningBox: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.15)',
  },
  integrationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 0',
    borderBottom: '1px solid var(--glass-border)',
  },
  integrationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  integrationIcon: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  integrationActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statusBadge: {
    fontSize: '14px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid',
    letterSpacing: '0.3px',
  },
  connectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    background: 'transparent',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'background 0.15s, opacity 0.15s',
  },
  disconnectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent-danger)',
    background: 'var(--accent-danger-dim)',
    color: 'var(--accent-danger)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
  helpLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    opacity: 0.8,
    transition: 'opacity 0.15s',
  },
  stripeContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stripeLogo: {
    display: 'flex',
    alignItems: 'center',
  },
  stripeDesc: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
  },
  stripeFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stripeFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  stripeBadge: {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(99, 91, 255, 0.1)',
    border: '1px solid rgba(99, 91, 255, 0.2)',
  },
  stripeBadgeText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#635bff',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  stripeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(99, 91, 255, 0.3)',
    background: 'rgba(99, 91, 255, 0.08)',
    color: '#635bff',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  // ── Avatar upload ──
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  profileAvatarImg: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    objectFit: 'cover' as const,
  },
  avatarUploadBtn: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid var(--bg-secondary)',
  },
  // ── Delete Account (inside Security card) ──
  deleteAccountRow: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(239,68,68,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  deleteAccountLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--accent-danger)',
  },
  deleteAccountDesc: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  deleteAccountBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239,68,68,0.25)',
    background: 'rgba(239,68,68,0.06)',
    color: 'var(--accent-danger)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
