/**
 * Security modals extracted from SettingsPage: Password change, 2FA setup, Account deletion.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Trash2, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLang } from '../i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsSecurityModalsProps {
  securityModal: 'password' | '2fa' | 'delete' | null;
  onClose: () => void;
  profileEmail: string;
  styles: Record<string, React.CSSProperties>;
}

export default function SettingsSecurityModals({ securityModal, onClose, profileEmail, styles }: SettingsSecurityModalsProps) {
  const { t } = useLang();
  const focusTrapRef = useFocusTrap(onClose);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [tfaStep, setTfaStep] = useState<'overview' | 'setup' | 'verify'>('overview');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaQrSvg, setTfaQrSvg] = useState('');
  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaFactorId, setTfaFactorId] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_copiedBackup, setCopiedBackup] = useState(false);

  // Delete state
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteFinalConfirm, setDeleteFinalConfirm] = useState(false);

  // Load MFA status
  useState(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (data?.totp && data.totp.length > 0) {
        const verified = data.totp.find(f => f.status === 'verified');
        if (verified) {
          setTwoFactorEnabled(true);
          setTfaFactorId(verified.id);
        }
      }
    });
  });

  const handleCloseAll = () => {
    setPasswordError('');
    setPasswordSuccess(false);
    setTfaStep('overview');
    setTfaCode('');
    setTfaError('');
    setCopiedBackup(false);
    setDeleteConfirmEmail('');
    setDeleteFinalConfirm(false);
    setDeleteError('');
    onClose();
  };

  if (!securityModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        style={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleCloseAll}
      >
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          style={styles.modal}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* ── Password Change Modal ── */}
          {securityModal === 'password' && (
            <>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{t.settings.changePassword}</h3>
                <button style={styles.closeBtn} aria-label="Close" onClick={() => {
                  setPasswordError('');
                  setPasswordSuccess(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  onClose();
                }}>
                  <X size={18} />
                </button>
              </div>

              {passwordSuccess ? (
                <div style={styles.modalBody}>
                  <div style={styles.successBox}>
                    <CheckCircle size={32} color="var(--accent-success)" />
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.settings.passwordUpdatedTitle}
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                      {t.settings.passwordChangedSuccess}
                    </div>
                  </div>
                  <div style={styles.modalActions}>
                    <button style={styles.saveBtn} onClick={() => {
                      setPasswordSuccess(false);
                      onClose();
                    }}>
                      {t.settings.done}
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
                    <label style={styles.fieldLabel}>{t.settings.currentPassword}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                        placeholder={t.settings.currentPassword}
                        style={styles.fieldInput}
                      />
                      <button type="button" onClick={() => setShowCurrentPw(p => !p)} style={styles.eyeBtn} tabIndex={-1} aria-label="Toggle password visibility">
                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={styles.modalField}>
                    <label style={styles.fieldLabel}>{t.settings.newPassword}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                        placeholder={t.settings.newPassword}
                        style={styles.fieldInput}
                      />
                      <button type="button" onClick={() => setShowNewPw(p => !p)} style={styles.eyeBtn} tabIndex={-1} aria-label="Toggle password visibility">
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={styles.modalField}>
                    <label style={styles.fieldLabel}>{t.settings.confirmNewPassword}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                        placeholder={t.settings.confirmNewPassword}
                        style={styles.fieldInput}
                      />
                      <button type="button" onClick={() => setShowConfirmPw(p => !p)} style={styles.eyeBtn} tabIndex={-1} aria-label="Toggle password visibility">
                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={styles.modalActions}>
                    <button style={styles.cancelBtn} onClick={() => {
                      setPasswordError('');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      onClose();
                    }}>{t.settings.cancel}</button>
                    <button
                      style={{ ...styles.saveBtn, opacity: currentPassword && newPassword && confirmPassword ? 1 : 0.4 }}
                      onClick={async () => {
                        if (!currentPassword) { setPasswordError(t.settings.enterCurrentPasswordError); return; }
                        if (newPassword.length < 8) { setPasswordError(t.settings.newPasswordMinLength); return; }
                        if (newPassword !== confirmPassword) { setPasswordError(t.settings.passwordsDoNotMatch); return; }
                        const { error: verifyError } = await supabase.auth.signInWithPassword({
                          email: profileEmail,
                          password: currentPassword,
                        });
                        if (verifyError) { setPasswordError(t.settings.currentPasswordWrong); return; }
                        const { error } = await supabase.auth.updateUser({ password: newPassword });
                        if (error) { setPasswordError(error.message); return; }
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordSuccess(true);
                      }}
                    >
                      {t.settings.updatePassword}
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
                <h3 style={styles.modalTitle}>{t.settings.twoFactor}</h3>
                <button style={styles.closeBtn} aria-label="Close" onClick={() => {
                  setTfaStep('overview');
                  setTfaCode('');
                  setTfaError('');
                  setCopiedBackup(false);
                  onClose();
                }}>
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalBody}>
                {tfaStep === 'overview' && (
                  <>
                    <div style={styles.tfaStatus}>
                      <div style={{
                        ...styles.tfaDot,
                        background: twoFactorEnabled ? 'var(--accent-success)' : 'var(--text-tertiary)',
                      }} />
                      <span style={{ fontSize: '18px', fontWeight: 500 }}>
                        {t.settings.tfaCurrentlyEnabled} <strong>{twoFactorEnabled ? t.settings.enabled.toLowerCase() : t.settings.disabled.toLowerCase()}</strong>
                      </span>
                    </div>
                    <p style={styles.tfaDesc}>
                      {twoFactorEnabled ? t.settings.tfaEnabledDesc : t.settings.tfaDisabledDesc}
                    </p>
                    <div style={styles.modalActions}>
                      {twoFactorEnabled ? (
                        <button
                          style={{ ...styles.saveBtn, background: 'var(--accent-danger)', boxShadow: '0 0 12px var(--accent-danger-dim)' }}
                          disabled={tfaLoading}
                          onClick={async () => {
                            if (!tfaFactorId) return;
                            setTfaLoading(true);
                            const { error } = await supabase.auth.mfa.unenroll({ factorId: tfaFactorId });
                            setTfaLoading(false);
                            if (error) { setTfaError(error.message); return; }
                            setTwoFactorEnabled(false);
                            setTfaFactorId('');
                            setTfaStep('overview');
                            onClose();
                          }}
                        >
                          {tfaLoading ? <Loader2 size={14} className="spin" /> : t.settings.disable2FA}
                        </button>
                      ) : (
                        <>
                          <button style={styles.cancelBtn} onClick={onClose}>{t.settings.cancel}</button>
                          <button
                            style={{ ...styles.saveBtn, background: 'var(--accent-success)', boxShadow: '0 0 12px var(--accent-success-dim)' }}
                            disabled={tfaLoading}
                            onClick={async () => {
                              setTfaLoading(true);
                              setTfaError('');
                              const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
                              setTfaLoading(false);
                              if (error || !data) { setTfaError(error?.message ?? 'Enrollment failed'); return; }
                              setTfaFactorId(data.id);
                              setTfaQrSvg(data.totp.qr_code);
                              setTfaSecret(data.totp.secret);
                              setTfaStep('setup');
                            }}
                          >
                            {tfaLoading ? <Loader2 size={14} className="spin" /> : t.settings.enable2FA}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {tfaStep === 'setup' && (
                  <>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                      {t.settings.scanQrCode}
                    </p>
                    <div style={styles.qrPlaceholder}>
                      <img src={tfaQrSvg} alt="QR Code" style={{ width: '180px', height: '180px', borderRadius: '8px' }} />
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', textAlign: 'center' }}>
                        {tfaSecret}
                      </div>
                    </div>
                    <div style={styles.modalActions}>
                      <button style={styles.cancelBtn} onClick={() => { setTfaStep('overview'); setTfaQrSvg(''); setTfaSecret(''); }}>{t.settings.back}</button>
                      <button style={styles.saveBtn} onClick={() => setTfaStep('verify')}>
                        {t.settings.nextVerifyCode}
                      </button>
                    </div>
                  </>
                )}

                {tfaStep === 'verify' && (
                  <>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                      {t.settings.enterCodeFromApp}
                    </p>
                    {tfaError && (
                      <div style={styles.errorBox}>
                        <AlertTriangle size={14} />
                        {tfaError}
                      </div>
                    )}
                    <div style={styles.modalField}>
                      <label style={styles.fieldLabel}>{t.settings.verificationCode}</label>
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
                      <button style={styles.cancelBtn} onClick={() => { setTfaStep('setup'); setTfaCode(''); setTfaError(''); }}>{t.settings.back}</button>
                      <button
                        style={{ ...styles.saveBtn, opacity: tfaCode.length === 6 ? 1 : 0.4 }}
                        disabled={tfaLoading || tfaCode.length !== 6}
                        onClick={async () => {
                          if (tfaCode.length !== 6) { setTfaError(t.settings.enter6DigitError); return; }
                          setTfaLoading(true);
                          const challenge = await supabase.auth.mfa.challenge({ factorId: tfaFactorId });
                          if (challenge.error) { setTfaError(challenge.error.message); setTfaLoading(false); return; }
                          const verify = await supabase.auth.mfa.verify({
                            factorId: tfaFactorId,
                            challengeId: challenge.data.id,
                            code: tfaCode,
                          });
                          setTfaLoading(false);
                          if (verify.error) { setTfaError(t.settings.invalidCode ?? 'Invalid code. Please try again.'); return; }
                          setTwoFactorEnabled(true);
                          setTfaCode('');
                          setTfaQrSvg('');
                          setTfaSecret('');
                          setTfaStep('overview');
                          onClose();
                        }}
                      >
                        {tfaLoading ? <Loader2 size={14} className="spin" /> : t.settings.verifyAndEnable}
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
                <h3 style={{ ...styles.modalTitle, color: 'var(--accent-danger)' }}>{t.settings.deleteAccount}</h3>
                <button style={styles.closeBtn} aria-label="Close" onClick={() => {
                  setDeleteConfirmEmail('');
                  setDeleteError('');
                  setDeleteFinalConfirm(false);
                  onClose();
                }}>
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
                          {t.settings.actionPermanent}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {t.settings.deleteWarningDesc}
                        </div>
                      </div>
                    </div>
                    <div style={styles.modalField}>
                      <label style={styles.fieldLabel}>
                        {t.settings.type} <strong>{profileEmail}</strong> {t.settings.typeToConfirm}
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
                        setDeleteConfirmEmail('');
                        onClose();
                      }}>{t.settings.cancel}</button>
                      <button
                        style={{
                          ...styles.saveBtn,
                          background: 'var(--accent-danger)',
                          opacity: deleteConfirmEmail === profileEmail ? 1 : 0.3,
                          cursor: deleteConfirmEmail === profileEmail ? 'pointer' : 'not-allowed',
                          boxShadow: deleteConfirmEmail === profileEmail ? '0 0 12px var(--accent-danger-dim)' : 'none',
                        }}
                        disabled={deleteConfirmEmail !== profileEmail}
                        onClick={() => setDeleteFinalConfirm(true)}
                      >
                        <Trash2 size={14} />
                        {t.settings.yesDelete}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <AlertTriangle size={32} color="var(--accent-danger)" style={{ marginBottom: '12px' }} />
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        {t.settings.areYouSure}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t.settings.finalDeleteWarning}
                      </div>
                    </div>
                    {deleteError && (
                      <div style={{ fontSize: '14px', color: 'var(--accent-danger)', fontWeight: 500, textAlign: 'center' }}>
                        {deleteError}
                      </div>
                    )}
                    <div style={styles.modalActions}>
                      <button style={styles.cancelBtn} disabled={deleteLoading} onClick={() => {
                        setDeleteFinalConfirm(false);
                        setDeleteError('');
                      }}>{t.settings.goBack}</button>
                      <button
                        style={{
                          ...styles.saveBtn,
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
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) {
                              setDeleteError(t.settings.deleteErrorGeneric);
                              setDeleteLoading(false);
                              return;
                            }
                            const res = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`,
                                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                                },
                                body: JSON.stringify({ confirmEmail: profileEmail }),
                              }
                            );
                            const data = await res.json();
                            if (!res.ok || !data.success) {
                              setDeleteError(data.error || t.settings.deleteErrorGeneric);
                              setDeleteLoading(false);
                              return;
                            }
                            await supabase.auth.signOut();
                            window.location.href = '/';
                          } catch {
                            setDeleteError(t.settings.deleteErrorGeneric);
                            setDeleteLoading(false);
                          }
                        }}
                      >
                        {deleteLoading ? (
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        {deleteLoading ? t.settings.deleting : t.settings.deleteMyAccount}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
