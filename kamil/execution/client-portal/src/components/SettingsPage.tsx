import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Moon, Sun, LogOut, CheckCircle, Lock, Trash2, AlertTriangle, Loader2, X, DollarSign } from 'lucide-react';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client, Theme, ClientPage } from '../types';

interface SettingsPageProps {
  client: Client;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onLogout: () => void;
  onClientUpdate: (updates: Partial<Client>) => void;
  onNavigate?: (page: ClientPage) => void;
}

export default function SettingsPage({ client, theme, onThemeChange, onLogout, onClientUpdate, onNavigate }: SettingsPageProps) {
  const { t } = useLang();
  const s = t.settings;

  // Profile
  const [editName, setEditName] = useState(client.name);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteFinalConfirm, setDeleteFinalConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
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

    // User is already authenticated, so we can update directly (#3/#10)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      setPasswordSuccess(true);
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

      {/* ── Account Card (Profile + Password) ── */}
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

        <div style={styles.divider} />

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            style={styles.inlineAction}
          >
            <Lock size={15} color="var(--text-secondary)" />
            <span>{s.changePassword}</span>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={styles.btnGhost}
              >
                {s.cancelPasswordChange}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* ── Invoices (mobile shortcut) ── */}
      {onNavigate && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{ ...styles.card, marginTop: '16px', cursor: 'pointer' }}
          onClick={() => onNavigate('invoices')}
        >
          <div style={styles.themeRow}>
            <div style={styles.themeRowLeft}>
              <DollarSign size={18} color="var(--accent-primary)" />
              <span style={styles.cardTitle}>{t.nav.invoices || 'Invoices'}</span>
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '18px' }}>&#8250;</span>
          </div>
        </motion.div>
      )}

      {/* ── Appearance (compact toggle) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        style={{ ...styles.card, marginTop: '16px' }}
      >
        <div style={styles.themeRow}>
          <div style={styles.themeRowLeft}>
            {theme === 'dark' ? (
              <Moon size={18} color="var(--accent-primary)" />
            ) : (
              <Sun size={18} color="var(--accent-primary)" />
            )}
            <span style={styles.cardTitle}>{s.appearance}</span>
          </div>
          <div style={styles.themeToggle}>
            <button
              onClick={() => onThemeChange('dark')}
              style={{
                ...styles.themeToggleBtn,
                ...(theme === 'dark' ? styles.themeToggleBtnActive : {}),
              }}
            >
              <Moon size={14} />
              {s.darkMode}
            </button>
            <button
              onClick={() => onThemeChange('light')}
              style={{
                ...styles.themeToggleBtn,
                ...(theme === 'light' ? styles.themeToggleBtnActive : {}),
              }}
            >
              <Sun size={14} />
              {s.lightMode}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Log Out ── */}
      <button onClick={() => setShowLogoutConfirm(true)} style={styles.logoutBtn}>
        <LogOut size={16} />
        {s.logout}
      </button>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px' }}>Log Out</span>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border-primary)', borderRadius: '10px', background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={onLogout} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: 'var(--accent-error, #ef4444)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account (subtle) ── */}
      <button
        onClick={() => setShowDeleteModal(true)}
        style={styles.deleteLink}
      >
        {s.deleteAccount}
      </button>

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={styles.modal}
          >
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-danger)', margin: 0 }}>
                {s.deleteAccount}
              </h3>
              <button
                style={styles.closeBtn}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmEmail('');
                  setDeleteError('');
                  setDeleteFinalConfirm(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {!deleteFinalConfirm ? (
                <>
                  <div style={styles.deleteWarningBox}>
                    <AlertTriangle size={20} color="var(--accent-danger)" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {s.actionPermanent}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {s.deleteWarningDesc}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={styles.label}>
                      {s.type} <strong style={{ userSelect: 'all', cursor: 'text' }}>{client.email}</strong> {s.typeToConfirm}
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      placeholder={client.email}
                      style={styles.input}
                      autoComplete="off"
                    />
                  </div>

                  <div style={styles.modalActions}>
                    <button
                      style={styles.btnGhost}
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteConfirmEmail('');
                      }}
                    >
                      {s.cancel}
                    </button>
                    <button
                      style={{
                        ...styles.btn,
                        background: 'var(--accent-danger)',
                        opacity: deleteConfirmEmail === client.email ? 1 : 0.3,
                        cursor: deleteConfirmEmail === client.email ? 'pointer' : 'not-allowed',
                        boxShadow: deleteConfirmEmail === client.email ? '0 0 12px var(--accent-danger-dim)' : 'none',
                      }}
                      disabled={deleteConfirmEmail !== client.email}
                      onClick={() => setDeleteFinalConfirm(true)}
                    >
                      <Trash2 size={14} />
                      {s.yesDelete}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <AlertTriangle size={32} color="var(--accent-danger)" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {s.areYouSure}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {s.finalDeleteWarning}
                    </div>
                  </div>

                  {deleteError && (
                    <div style={{ fontSize: '14px', color: 'var(--accent-danger)', fontWeight: 500, textAlign: 'center' }}>
                      {deleteError}
                    </div>
                  )}

                  <div style={styles.modalActions}>
                    <button
                      style={styles.btnGhost}
                      disabled={deleteLoading}
                      onClick={() => {
                        setDeleteFinalConfirm(false);
                        setDeleteError('');
                      }}
                    >
                      {s.goBack}
                    </button>
                    <button
                      style={{
                        ...styles.btn,
                        background: 'var(--accent-danger)',
                        opacity: deleteLoading ? 0.5 : 1,
                        cursor: deleteLoading ? 'not-allowed' : 'pointer',
                        boxShadow: deleteLoading ? 'none' : '0 0 12px var(--accent-danger-dim)',
                      }}
                      disabled={deleteLoading}
                      onClick={async () => {
                        setDeleteLoading(true);
                        setDeleteError('');
                        try {
                          const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
                          if (refreshErr || !session) {
                            setDeleteError(s.deleteErrorGeneric);
                            setDeleteLoading(false);
                            return;
                          }

                          const res = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-client-account`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`,
                                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              },
                              body: JSON.stringify({ confirmEmail: client.email }),
                            }
                          );

                          const data = await res.json();
                          if (!res.ok || !data.success) {
                            setDeleteError(data.error || s.deleteErrorGeneric);
                            setDeleteLoading(false);
                            return;
                          }

                          await supabase.auth.signOut();
                          window.location.href = '/';
                        } catch {
                          setDeleteError(s.deleteErrorGeneric);
                          setDeleteLoading(false);
                        }
                      }}
                    >
                      {deleteLoading ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {deleteLoading ? s.deleting : s.deleteMyAccount}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '28px 24px 40px',
    maxWidth: '1100px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '24px',
    letterSpacing: '-0.5px',
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
    fontSize: '18px',
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
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 18px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
  },
  inlineAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnGhost: {
    padding: '12px 18px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px 18px',
    marginTop: '28px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  deleteLink: {
    display: 'block',
    margin: '16px auto 0',
    padding: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  themeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  themeRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  themeToggle: {
    display: 'flex',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    overflow: 'hidden',
  },
  themeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  themeToggleBtnActive: {
    background: 'var(--accent-primary)',
    color: '#07090e',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '440px',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  deleteWarningBox: {
    display: 'flex',
    gap: '12px',
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-danger-dim)',
    border: '1px solid rgba(239,68,68,0.15)',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
};
