import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Palette, Shield, Moon, Sun, LogOut, CheckCircle, Lock } from 'lucide-react';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client, Theme } from '../types';

interface SettingsPageProps {
  client: Client;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onLogout: () => void;
  onClientUpdate: (updates: Partial<Client>) => void;
}

export default function SettingsPage({ client, theme, onThemeChange, onLogout, onClientUpdate }: SettingsPageProps) {
  const { t } = useLang();
  const s = t.settings;

  // Profile
  const [editName, setEditName] = useState(client.name);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setProfileSaving(true);
    setProfileSaved(false);

    const { error } = await supabase
      .from('clients')
      .update({ name: editName.trim() })
      .eq('id', client.id);

    if (!error) {
      // Also update auth metadata
      await supabase.auth.updateUser({ data: { name: editName.trim() } });
      onClientUpdate({ name: editName.trim() });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    }
    setProfileSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError(s.passwordMin);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(s.passwordMismatch);
      return;
    }

    setPasswordUpdating(true);

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: client.email,
      password: currentPassword,
    });

    if (verifyError) {
      setPasswordError(s.currentPasswordWrong);
      setPasswordUpdating(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 2000);
    }
    setPasswordUpdating(false);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>{s.title}</h1>

      <div style={styles.grid}>
        {/* ── Profile Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <User size={18} color="var(--accent-primary)" />
            <span style={styles.cardTitle}>{s.profile}</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{s.displayName}</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{s.email}</label>
            <input
              type="email"
              value={client.email}
              disabled
              style={{ ...styles.input, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={profileSaving || editName.trim() === client.name}
            style={{
              ...styles.btn,
              opacity: (profileSaving || editName.trim() === client.name) ? 0.5 : 1,
              cursor: (profileSaving || editName.trim() === client.name) ? 'not-allowed' : 'pointer',
            }}
          >
            {profileSaved ? (
              <><CheckCircle size={14} /> {s.saved}</>
            ) : profileSaving ? s.saving : s.save}
          </button>
        </motion.div>

        {/* ── Appearance Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <Palette size={18} color="var(--accent-primary)" />
            <span style={styles.cardTitle}>{s.appearance}</span>
          </div>

          <div style={styles.themeOptions}>
            <button
              onClick={() => onThemeChange('dark')}
              style={{
                ...styles.themeCard,
                borderColor: theme === 'dark' ? 'var(--accent-primary)' : 'var(--glass-border)',
                boxShadow: theme === 'dark' ? '0 0 12px var(--accent-primary-dim)' : 'none',
              }}
            >
              <Moon size={20} color={theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
              <span style={{ fontWeight: 600, fontSize: '13px', color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {s.darkMode}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                {s.darkModeDesc}
              </span>
            </button>

            <button
              onClick={() => onThemeChange('light')}
              style={{
                ...styles.themeCard,
                borderColor: theme === 'light' ? 'var(--accent-primary)' : 'var(--glass-border)',
                boxShadow: theme === 'light' ? '0 0 12px var(--accent-primary-dim)' : 'none',
              }}
            >
              <Sun size={20} color={theme === 'light' ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
              <span style={{ fontWeight: 600, fontSize: '13px', color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {s.lightMode}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                {s.lightModeDesc}
              </span>
            </button>
          </div>
        </motion.div>

        {/* ── Security Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <Shield size={18} color="var(--accent-primary)" />
            <span style={styles.cardTitle}>{s.security}</span>
          </div>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              style={styles.btnOutline}
            >
              <Lock size={14} />
              {s.changePassword}
            </button>
          ) : (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.field}>
                <label style={styles.label}>{s.currentPassword}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{s.newPassword}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{s.confirmPassword}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  required
                />
              </div>

              {passwordError && (
                <div style={{ color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 500 }}>
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div style={{ color: 'var(--accent-success)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} /> {s.passwordUpdated}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  style={{
                    ...styles.btn,
                    flex: 1,
                    opacity: passwordUpdating ? 0.6 : 1,
                  }}
                >
                  {passwordUpdating ? s.updatingPassword : s.updatePassword}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordError('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={styles.btnGhost}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ ...styles.divider, margin: '16px 0' }} />

          {/* Logout */}
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
              {s.logoutDesc}
            </p>
            <button onClick={onLogout} style={styles.btnDanger}>
              <LogOut size={14} />
              {s.logout}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '28px 24px',
    maxWidth: '900px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '24px',
    letterSpacing: '-0.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnOutline: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnGhost: {
    padding: '10px 16px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: '1px solid var(--accent-danger-dim)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-danger-dim)',
    color: 'var(--accent-danger)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  themeOptions: {
    display: 'flex',
    gap: '12px',
  },
  themeCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
  },
};
