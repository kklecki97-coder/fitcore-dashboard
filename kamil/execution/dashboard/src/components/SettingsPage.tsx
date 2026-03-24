import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, User, Bell, Shield, Palette, X, Save, CheckCircle, CreditCard, Camera, Trash2, AlertTriangle, Mail, Loader2, Package, Plus, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import GlassCard from './GlassCard';
import SettingsSecurityModals from './SettingsSecurityModals';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { Theme, CoachingPlan } from '../types';

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
  profilePhoto: string | null;
  onPhotoChange: (file: File) => void;
  notifications: Notifications;
  onNotificationsChange: (n: Notifications) => void;
  plans: CoachingPlan[];
  onAddPlan: (plan: CoachingPlan) => void;
  onUpdatePlan: (id: string, updates: Partial<CoachingPlan>) => void;
  onDeletePlan: (id: string) => void;
}

type SettingsTab = 'profile' | 'payments' | 'notifications' | 'security' | 'appearance' | 'danger';

export default function SettingsPage({ theme, onThemeChange, profileName, profileEmail, onProfileChange, profilePhoto, onPhotoChange, notifications, onNotificationsChange, plans, onAddPlan, onUpdatePlan, onDeletePlan }: SettingsPageProps) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profileName);

  // Security modal state (content managed by SettingsSecurityModals)
  const [securityModal, setSecurityModal] = useState<'password' | '2fa' | 'delete' | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (data?.totp?.some(f => f.status === 'verified')) setTwoFactorEnabled(true);
    });
  }, [securityModal]); // re-check after modal closes

  // Stripe Connect state
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [stripeLoadError, setStripeLoadError] = useState(false);

  // Plans & Pricing state
  const [planModal, setPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CoachingPlan | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', price: '', billingCycle: 'monthly' as 'monthly' | 'weekly' | 'one-time', description: '' });
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  // Load Stripe Connect status
  useEffect(() => {
    const checkStripeConnect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('coaches')
        .select('stripe_connect_id, stripe_connect_onboarded')
        .eq('id', session.user.id)
        .single();
      if (error) {
        console.error('Failed to load Stripe Connect status:', error);
        setStripeLoadError(true);
        return;
      }
      if (data?.stripe_connect_id) {
        setStripeConnected(true);
        setStripeOnboarded(data.stripe_connect_onboarded ?? false);
      }
    };
    checkStripeConnect();

    // Check URL params for Stripe return
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'success' || params.get('stripe') === 'refresh') {
      checkStripeConnect();
    }
  }, []);

  const handleConnectStripe = async () => {
    setStripeConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) {
        console.error('Stripe Connect error:', error);
        showToast('Stripe Connect error: ' + (error.message || JSON.stringify(error)), 'error');
        setStripeConnectLoading(false);
        return;
      }
      if (data?.error) {
        console.error('Stripe Connect error:', data.error);
        showToast('Stripe Connect error: ' + data.error, 'error');
        setStripeConnectLoading(false);
        return;
      }
      if (data?.onboarded) {
        setStripeConnected(true);
        setStripeOnboarded(true);
        setStripeConnectLoading(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Stripe Connect error:', err);
      showToast('Stripe Connect error: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
    setStripeConnectLoading(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPhotoChange(file);
  };

  const themeOptions: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'dark', label: t.settings.dark, description: t.settings.darkDesc, icon: Moon },
    { value: 'light', label: t.settings.light, description: t.settings.lightDesc, icon: Sun },
  ];

  const handleSaveProfile = () => {
    onProfileChange(editName, profileEmail);
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setEditName(profileName);
    setIsEditingProfile(false);
  };

  const toggleNotification = (key: keyof Notifications) => {
    onNotificationsChange({ ...notifications, [key]: !notifications[key] });
  };

  const notifItems = [
    { key: 'messages' as const, label: t.settings.newClientMessages, desc: t.settings.newClientMessagesSub },
    { key: 'checkins' as const, label: t.settings.checkInReminders, desc: t.settings.checkInRemindersSub },
    { key: 'payments' as const, label: t.settings.paymentAlerts, desc: t.settings.paymentAlertsSub },
    { key: 'weekly' as const, label: t.settings.weeklySummary, desc: t.settings.weeklySummarySub },
  ];

  const tabs: { id: SettingsTab; label: string; icon: typeof User; color?: string; iconBg?: string }[] = [
    { id: 'profile', label: t.settings.profile, icon: User },
    { id: 'payments', label: t.settings.payments, icon: CreditCard, color: '#635bff', iconBg: 'rgba(99, 91, 255, 0.08)' },
    { id: 'notifications', label: t.settings.notifications, icon: Bell, color: 'var(--accent-warm)', iconBg: 'var(--accent-warm-dim)' },
    { id: 'security', label: t.settings.security, icon: Shield },
    { id: 'appearance', label: t.settings.appearance, icon: Palette, color: 'var(--accent-primary)', iconBg: 'var(--accent-primary-dim)' },
    { id: 'danger', label: t.settings.deleteAccount || 'Danger Zone', icon: AlertTriangle, color: 'var(--accent-danger)', iconBg: 'rgba(239,68,68,0.08)' },
  ];

  // ── Render tab content ──
  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <GlassCard delay={0.05}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <User size={18} color="var(--accent-secondary)" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{t.settings.profile}</h3>
                <p style={styles.sectionSub}>{t.settings.profileSub}</p>
              </div>
            </div>
            <div style={styles.divider} />

            {/* Profile hero - avatar + identity */}
            <div style={styles.profileHero}>
              <div style={styles.avatarRing}>
                <div style={styles.avatarWrapper}>
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" style={styles.profileAvatarImg} />
                  ) : (
                    <div style={styles.profileAvatar}>{profileName.charAt(0).toUpperCase()}</div>
                  )}
                  <label style={styles.avatarUploadBtn}>
                    <Camera size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
              <div style={styles.profileIdentity}>
                <div style={styles.profileNameRow}>
                  <div style={styles.profileName}>{profileName}</div>
                  <span style={styles.planBadge}>{t.settings.proPlan}</span>
                </div>
                <div style={styles.profileEmail}>{profileEmail}</div>
              </div>
              {!isEditingProfile && (
                <button style={styles.editBtn} onClick={() => setIsEditingProfile(true)}>{t.settings.edit}</button>
              )}
            </div>

            {isEditingProfile ? (
              <div style={styles.fieldGroup}>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>{t.settings.displayName}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={styles.fieldInput}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>{t.settings.email}</label>
                  <div style={styles.profileEmailReadonly}>
                    <Mail size={14} color="var(--text-tertiary)" />
                    {profileEmail}
                  </div>
                </div>
                <div style={styles.profileActions}>
                  <button style={styles.cancelBtn} onClick={handleCancelEdit}>{t.settings.cancel}</button>
                  <button style={styles.saveBtn} onClick={handleSaveProfile}>
                    <Save size={14} />
                    {t.settings.save}
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.profileDetailsGrid}>
                <div style={styles.profileDetailItem}>
                  <div style={styles.profileDetailLabel}>{t.settings.displayName}</div>
                  <div style={styles.profileDetailValue}>{profileName}</div>
                </div>
                <div style={styles.profileDetailItem}>
                  <div style={styles.profileDetailLabel}>{t.settings.email}</div>
                  <div style={styles.profileDetailValue}>{profileEmail}</div>
                </div>
              </div>
            )}
          </GlassCard>
        );

      case 'payments':
        return (
          <>
          <GlassCard delay={0.05}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionIcon, background: 'rgba(99, 91, 255, 0.08)' }}>
                <CreditCard size={18} color="#635bff" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{t.settings.payments}</h3>
                <p style={styles.sectionSub}>{t.settings.paymentsSub}</p>
              </div>
            </div>
            <div style={styles.divider} />

            {/* Stripe Connect */}
            <div style={styles.stripeContent}>
              <div style={styles.stripeLogo}>
                <svg width="60" height="25" viewBox="0 0 60 25" fill="none">
                  <path d="M60 12.8C60 8.5 57.8 5 53.7 5C49.6 5 47 8.5 47 12.7C47 17.7 50.1 20.5 54.5 20.5C56.6 20.5 58.2 20 59.4 19.2V16C58.2 16.7 56.8 17.2 55.1 17.2C53.4 17.2 51.9 16.6 51.7 14.5H59.9C59.9 14.3 60 13.3 60 12.8ZM51.6 11.8C51.6 9.8 52.8 9 53.7 9C54.6 9 55.7 9.8 55.7 11.8H51.6ZM40.7 5C39 5 37.9 5.8 37.3 6.3L37.1 5.2H33.4V24.9L37.6 24L37.6 19.3C38.2 19.7 39.1 20.5 40.7 20.5C43.8 20.5 46.7 17.9 46.7 12.6C46.7 7.7 43.8 5 40.7 5ZM39.7 17C38.6 17 38 16.6 37.6 16.1L37.6 9.5C38 9 38.7 8.5 39.7 8.5C41.4 8.5 42.5 10.4 42.5 12.7C42.5 15.1 41.4 17 39.7 17ZM28.1 4.2L32.4 3.3V0L28.1 0.9V4.2ZM28.1 5.2H32.4V20.2H28.1V5.2ZM23.8 6.5L23.6 5.2H19.9V20.2H24.1V9.9C25 8.7 26.5 8.9 27 9.1V5.2C26.4 5 24.7 4.7 23.8 6.5ZM15.5 1.6L11.4 2.5L11.4 16.3C11.4 18.7 13.2 20.5 15.6 20.5C16.9 20.5 17.9 20.3 18.4 20V16.8C17.9 17 15.5 17.7 15.5 15.3V9H18.4V5.2H15.5V1.6ZM7.5 9.6C7.5 8.9 8.1 8.6 9 8.6C10.3 8.6 11.9 9 13.2 9.7V5.7C11.8 5.2 10.4 5 9 5C5.7 5 3.5 6.8 3.5 9.8C3.5 14.6 10.1 13.8 10.1 15.9C10.1 16.7 9.3 17 8.4 17C7 17 5.2 16.4 3.7 15.6V19.6C5.4 20.3 7 20.6 8.4 20.6C11.8 20.6 14.1 18.8 14.1 15.8C14.1 10.6 7.5 11.5 7.5 9.6Z" fill="#635bff" />
                </svg>
              </div>

              <p style={styles.stripeDesc}>
                {t.settings.stripeDesc}
              </p>

              <div style={styles.stripeFeatures}>
                {[t.settings.oneTimePayments, t.settings.monthlySubscriptions, t.settings.automaticInvoicing, t.settings.payoutTracking].map((feat) => (
                  <div key={feat} style={styles.stripeFeatureItem}>
                    <CheckCircle size={14} color="#635bff" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {stripeLoadError ? (
                <div style={{ ...styles.stripeBadge, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <span style={{ ...styles.stripeBadgeText, color: 'var(--accent-danger)' }}>
                    <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Error loading Stripe status
                  </span>
                </div>
              ) : stripeOnboarded ? (
                <>
                  <div style={{ ...styles.stripeBadge, background: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.3)' }}>
                    <span style={{ ...styles.stripeBadgeText, color: '#00e5c8' }}>
                      <CheckCircle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      {t.settings.stripeConnected || 'Connected'}
                    </span>
                  </div>
                  <button style={{ ...styles.stripeBtn, cursor: 'default', opacity: 0.7 }} disabled>
                    <CheckCircle size={14} />
                    {t.settings.stripeConnected || 'Stripe Connected'}
                  </button>
                </>
              ) : stripeConnected ? (
                <>
                  <div style={{ ...styles.stripeBadge, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                    <span style={{ ...styles.stripeBadgeText, color: '#fbbf24' }}>
                      {t.settings.stripePending || 'Onboarding Pending'}
                    </span>
                  </div>
                  <button
                    style={{ ...styles.stripeBtn, cursor: 'pointer', opacity: 1 }}
                    onClick={handleConnectStripe}
                    disabled={stripeConnectLoading}
                  >
                    {stripeConnectLoading ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />}
                    {t.settings.completeOnboarding || 'Complete Onboarding'}
                  </button>
                </>
              ) : (
                <button
                  style={{ ...styles.stripeBtn, cursor: 'pointer', opacity: 1, background: 'rgba(99, 91, 255, 0.15)' }}
                  onClick={handleConnectStripe}
                  disabled={stripeConnectLoading}
                >
                  {stripeConnectLoading ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />}
                  {t.settings.connectStripe}
                </button>
              )}
            </div>

          </GlassCard>

          {/* Plans & Pricing — separate card */}
          <GlassCard delay={0.1}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionIcon, background: 'rgba(0, 229, 200, 0.08)' }}>
                <Package size={18} color="var(--accent-primary)" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{t.settings.plansAndPricing || 'Plans & Pricing'}</h3>
                <p style={styles.sectionSub}>{t.settings.plansAndPricingSub || 'Create custom coaching plans'}</p>
              </div>
            </div>
            <div style={{ ...styles.divider, marginBottom: '16px' }} />

            {plans.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '24px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {t.settings.noPlansYet || 'No plans yet. Create your first coaching plan.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '12px' }}>
                {plans.map(plan => (
                  <div key={plan.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{plan.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        ${plan.price}{plan.billingCycle === 'monthly' ? '/mo' : plan.billingCycle === 'weekly' ? '/wk' : ' one-time'}
                        {plan.description && ` · ${plan.description}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm({ name: plan.name, price: String(plan.price), billingCycle: plan.billingCycle, description: plan.description });
                          setPlanModal(true);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletePlanId(plan.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Delete confirmation */}
            {deletePlanId && (
              <div style={{ padding: '8px 12px', marginBottom: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--accent-danger)' }}>{t.settings.deletePlanConfirm || 'Delete this plan?'}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { onDeletePlan(deletePlanId); setDeletePlanId(null); }} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'var(--accent-danger)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    {t.settings.deleteAccount ? 'Delete' : 'Delete'}
                  </button>
                  <button onClick={() => setDeletePlanId(null)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({ name: '', price: '', billingCycle: 'monthly', description: '' });
                setPlanModal(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-glass)',
                background: 'none', color: 'var(--accent-primary)', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
              }}
            >
              <Plus size={14} />
              {t.settings.addPlan || 'Add Plan'}
            </button>
          </GlassCard>
          </>
        );

      case 'notifications':
        return (
          <GlassCard delay={0.05}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionIcon, background: 'var(--accent-warm-dim)' }}>
                <Bell size={18} color="var(--accent-warm)" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{t.settings.notifications}</h3>
                <p style={styles.sectionSub}>{t.settings.notificationsSubAlt}</p>
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
        );

      case 'security':
        return (
          <GlassCard delay={0.05}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionIcon, background: 'var(--accent-danger-dim)' }}>
                <Shield size={18} color="var(--accent-danger)" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{t.settings.security}</h3>
                <p style={styles.sectionSub}>{t.settings.securitySubAlt}</p>
              </div>
            </div>
            <div style={styles.divider} />
            <div style={styles.fieldGroup}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>{t.settings.password}</label>
                <div style={styles.fieldRow}>
                  <div style={styles.fieldValue}>••••••••••</div>
                  <button style={styles.editBtn} onClick={() => setSecurityModal('password')}>{t.settings.change}</button>
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>{t.settings.twoFactor}</label>
                <div style={styles.fieldRow}>
                  <div style={{ ...styles.fieldValue, color: twoFactorEnabled ? 'var(--accent-success)' : 'var(--text-secondary)', fontSize: '16px' }}>
                    {twoFactorEnabled ? t.settings.enabled : t.settings.disabled}
                  </div>
                  <button style={styles.editBtn} onClick={() => setSecurityModal('2fa')}>{t.settings.manage}</button>
                </div>
              </div>
            </div>
          </GlassCard>
        );

      case 'appearance':
        return (
          <GlassCard delay={0.05}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <Palette size={18} color="var(--accent-primary)" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{t.settings.appearance}</h3>
                <p style={styles.sectionSub}>{t.settings.appearanceSub}</p>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.settingRow}>
              <div>
                <div style={styles.settingLabel}>{t.settings.theme}</div>
                <div style={styles.settingDesc}>{t.settings.themeDescription}</div>
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
        );

      case 'danger':
        return (
          <GlassCard delay={0.05}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionIcon, background: 'rgba(239,68,68,0.08)' }}>
                <AlertTriangle size={18} color="var(--accent-danger)" />
              </div>
              <div>
                <h3 style={{ ...styles.sectionTitle, color: 'var(--accent-danger)' }}>{t.settings.deleteAccount}</h3>
                <p style={styles.sectionSub}>{t.settings.deleteAccountDesc}</p>
              </div>
            </div>
            <div style={styles.divider} />
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
            <div style={{ marginTop: '20px' }}>
              <button style={styles.deleteAccountBtn} onClick={() => setSecurityModal('delete')}>
                <Trash2 size={13} />
                {t.settings.deleteAccount}
              </button>
            </div>
          </GlassCard>
        );
    }
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row' as const,
        gap: isMobile ? '16px' : '24px',
        maxWidth: '1100px',
      }}>

        {/* ── Sidebar / Tab Navigation ── */}
        {isMobile ? (
          /* Mobile: horizontal scrollable pills */
          <div style={styles.mobileTabBar}>
            <div style={styles.mobileTabScroll}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDanger = tab.id === 'danger';
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      ...styles.mobileTab,
                      background: isActive
                        ? isDanger ? 'rgba(239,68,68,0.12)' : 'var(--accent-primary-dim)'
                        : 'transparent',
                      borderColor: isActive
                        ? isDanger ? 'rgba(239,68,68,0.3)' : 'var(--accent-primary)'
                        : 'var(--glass-border)',
                      color: isActive
                        ? isDanger ? 'var(--accent-danger)' : 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Desktop: vertical sidebar */
          <div style={styles.sidebar}>
            <nav style={styles.sidebarNav}>
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDanger = tab.id === 'danger';
                const isLast = index === tabs.length - 1;
                return (
                  <div key={tab.id}>
                    {isLast && <div style={styles.sidebarSpacer} />}
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        ...styles.sidebarTab,
                        background: isActive
                          ? isDanger ? 'rgba(239,68,68,0.08)' : 'rgba(0,229,200,0.06)'
                          : 'transparent',
                        borderLeft: isActive
                          ? `3px solid ${isDanger ? 'var(--accent-danger)' : 'var(--accent-primary)'}`
                          : '3px solid transparent',
                        color: isActive
                          ? isDanger ? 'var(--accent-danger)' : 'var(--accent-primary)'
                          : isDanger ? 'var(--accent-danger)' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>
        )}

        {/* ── Content Area ── */}
        <div style={styles.contentArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Plan Modal - Add / Edit */}
      <AnimatePresence>
        {planModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPlanModal(false)}
          >
            <motion.div
              style={{ ...styles.modal, maxWidth: 400 }}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{editingPlan ? (t.settings.editPlan || 'Edit Plan') : (t.settings.addPlan || 'Add Plan')}</h3>
                <button style={styles.modalClose} onClick={() => setPlanModal(false)}><X size={18} /></button>
              </div>
              <div style={styles.modalBody}>
                <label style={styles.fieldLabel}>{t.settings.planName || 'Plan Name'}</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.settings.planNamePlaceholder || 'e.g. Gold Plan'}
                  style={{ ...styles.fieldInput, marginBottom: '12px' }}
                />

                <label style={styles.fieldLabel}>{t.settings.planPrice || 'Price ($)'}</label>
                <input
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder={t.settings.planPricePlaceholder || 'e.g. 149'}
                  style={{ ...styles.fieldInput, marginBottom: '12px' }}
                  min="0"
                  step="1"
                />

                <label style={styles.fieldLabel}>{t.settings.billingCycle || 'Billing Cycle'}</label>
                <select
                  value={planForm.billingCycle}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, billingCycle: e.target.value as 'monthly' | 'weekly' | 'one-time' }))}
                  style={{ ...styles.fieldInput, marginBottom: '12px', cursor: 'pointer' }}
                >
                  <option value="monthly">{t.settings.monthly || 'Monthly'}</option>
                  <option value="weekly">{t.settings.weekly || 'Weekly'}</option>
                  <option value="one-time">{t.settings.oneTime || 'One-time'}</option>
                </select>

                <label style={styles.fieldLabel}>{t.settings.planDescription || 'Description (optional)'}</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t.settings.planDescPlaceholder || 'e.g. Full coaching + meal plans'}
                  style={{ ...styles.fieldInput, marginBottom: '16px' }}
                />
              </div>
              <div style={styles.modalActions}>
                <button style={styles.cancelBtn} onClick={() => setPlanModal(false)}>{t.settings.cancel || 'Cancel'}</button>
                <button
                  style={{ ...styles.saveBtn, opacity: (!planForm.name || !planForm.price) ? 0.5 : 1 }}
                  disabled={!planForm.name || !planForm.price}
                  onClick={() => {
                    if (editingPlan) {
                      onUpdatePlan(editingPlan.id, {
                        name: planForm.name,
                        price: Number(planForm.price),
                        billingCycle: planForm.billingCycle,
                        description: planForm.description,
                      });
                    } else {
                      const now = new Date().toISOString();
                      onAddPlan({
                        id: crypto.randomUUID(),
                        coachId: '',
                        name: planForm.name,
                        price: Number(planForm.price),
                        billingCycle: planForm.billingCycle,
                        description: planForm.description,
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                      });
                    }
                    setPlanModal(false);
                  }}
                >
                  <Save size={14} />
                  {t.settings.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Modals - Password / 2FA / Delete */}
      <SettingsSecurityModals
        securityModal={securityModal}
        onClose={() => setSecurityModal(null)}
        profileEmail={profileEmail}
        styles={styles}
      />

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  // ── Sidebar (Desktop) ──
  sidebar: {
    width: '220px',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    alignSelf: 'flex-start',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '8px',
    backdropFilter: 'blur(12px)',
  },
  sidebarTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    borderLeft: '3px solid transparent',
  },
  sidebarSpacer: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '6px 8px',
  },
  // ── Mobile Tab Bar ──
  mobileTabBar: {
    width: '100%',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  mobileTabScroll: {
    display: 'flex',
    gap: '8px',
    paddingBottom: '4px',
  },
  mobileTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  // ── Content Area ──
  contentArea: {
    flex: 1,
    minWidth: 0,
  },
  // ── Original styles preserved below ──
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
  profileHero: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  avatarRing: {
    padding: '3px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    flexShrink: 0,
  },
  profileAvatar: {
    width: '68px',
    height: '68px',
    borderRadius: '13px',
    background: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    flexShrink: 0,
  },
  profileIdentity: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  profileNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: '22px',
    fontWeight: 600,
  },
  planBadge: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    border: '1px solid rgba(0,229,200,0.2)',
  },
  profileEmail: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  profileEmailReadonly: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
  },
  profileDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    padding: '14px 0 0',
    borderTop: '1px solid var(--glass-border)',
  },
  profileDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  profileDetailLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  profileDetailValue: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-primary)',
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
  modalClose: {
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
  statusBadge: {
    fontSize: '14px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid',
    letterSpacing: '0.3px',
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
    width: '68px',
    height: '68px',
    borderRadius: '13px',
    objectFit: 'cover' as const,
  },
  avatarUploadBtn: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid var(--bg-secondary)',
  },
  // ── Delete Account ──
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
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
};
