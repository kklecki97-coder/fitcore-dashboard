import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, ChevronDown, ChevronUp, Send, MessageSquare, Smile, Frown, Meh, SmilePlus, Angry, Minus, Plus, Camera, X, Image as ImageIcon } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { CheckIn } from '../types';

interface CheckInPageProps {
  checkIns: CheckIn[];
  onSubmitCheckIn: (checkIn: CheckIn) => void;
  clientId: string;
  clientName: string;
}

function NumberStepper({ value, onChange, min, max, step = 1, placeholder }: {
  value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number; placeholder?: string;
}) {
  const numVal = value === '' ? null : parseFloat(value);
  const canDec = numVal !== null && (min === undefined || Math.round((numVal - step) * 100) / 100 >= min);
  const canInc = numVal !== null && (max === undefined || Math.round((numVal + step) * 100) / 100 <= max);

  const adjust = (dir: 1 | -1) => {
    if (numVal === null) {
      // Empty field — use placeholder as starting value, fall back to sensible defaults
      const initial = placeholder ? parseFloat(placeholder) : (dir === 1 ? (min ?? 0) : (max ?? 0));
      onChange(String(initial));
    } else {
      const next = Math.round((numVal + dir * step) * 100) / 100;
      if (min !== undefined && next < min) return;
      if (max !== undefined && next > max) return;
      onChange(String(next));
    }
  };

  return (
    <div style={stepperStyles.wrap}>
      <button
        style={{ ...stepperStyles.btn, opacity: canDec ? 1 : 0.3 }}
        onClick={() => adjust(-1)}
        type="button"
      >
        <Minus size={14} />
      </button>
      <input
        style={stepperStyles.input}
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      <button
        style={{ ...stepperStyles.btn, opacity: canInc ? 1 : 0.3 }}
        onClick={() => adjust(1)}
        type="button"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

const stepperStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  btn: {
    width: '36px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 0.15s, background 0.15s',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '10px 4px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
    outline: 'none',
  },
};

export default function CheckInPage({ checkIns, onSubmitCheckIn, clientId, clientName }: CheckInPageProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const [tab, setTab] = useState<'submit' | 'history'>('submit');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selfReportOpen, setSelfReportOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moodIcons: Record<number, { icon: typeof Smile; color: string; label: string }> = {
    1: { icon: Angry, color: 'var(--accent-danger)', label: t.checkIn.moodLabels[1] },
    2: { icon: Frown, color: 'var(--accent-warm)', label: t.checkIn.moodLabels[2] },
    3: { icon: Meh, color: 'var(--text-secondary)', label: t.checkIn.moodLabels[3] },
    4: { icon: Smile, color: 'var(--accent-success)', label: t.checkIn.moodLabels[4] },
    5: { icon: SmilePlus, color: 'var(--accent-primary)', label: t.checkIn.moodLabels[5] },
  };

  // Form state
  const [form, setForm] = useState({
    weight: '', bodyFat: '', mood: 0, energy: '', stress: '', sleepHours: '',
    steps: '', nutritionScore: '', notes: '', wins: '', challenges: '',
  });
  const [photos, setPhotos] = useState<{ url: string; label: string }[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fixedSlots: { label: string; key: string; displayLabel: string }[] = [
    { label: 'Front', key: 'front', displayLabel: t.checkIn.front },
    { label: 'Side', key: 'side', displayLabel: t.checkIn.side },
    { label: 'Back', key: 'back', displayLabel: t.checkIn.back },
  ];

  // Dynamic "Other" slots — one empty slot always shows at the end (max 5 extras)
  const otherPhotos = photos.filter(p => p.label.startsWith('Other'));
  const maxOtherSlots = 5;
  const otherSlotCount = Math.min(otherPhotos.length + 1, maxOtherSlots);
  const otherSlots: { label: string; key: string; displayLabel: string }[] = Array.from({ length: otherSlotCount }, (_, i) => ({
    label: `Other ${i + 1}`,
    key: `other-${i + 1}`,
    displayLabel: t.checkIn.other,
  }));

  const photoSlots = [...fixedSlots, ...otherSlots];

  const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB

  const handlePhotoUpload = (_key: string, label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE) {
      alert(t.checkIn.photoTooLarge);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(prev => {
        const filtered = prev.filter(p => p.label !== label);
        return [...filtered, { url: reader.result as string, label }];
      });
    };
    reader.onerror = () => {
      alert(t.checkIn.photoReadError);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const completed = checkIns.filter(ci => ci.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));

  const hasAnyData = form.weight || form.bodyFat || form.mood || form.energy || form.stress
    || form.sleepHours || form.steps || form.nutritionScore || form.notes || form.wins || form.challenges || photos.length > 0;

  const handleSubmit = () => {
    if (isSubmitting || !hasAnyData) return;
    setIsSubmitting(true);

    const ci: CheckIn = {
      id: `ci-new-${Date.now()}`,
      clientId,
      clientName,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      weight: form.weight ? parseFloat(form.weight) : null,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
      mood: (form.mood || null) as CheckIn['mood'],
      energy: form.energy ? parseInt(form.energy, 10) : null,
      stress: form.stress ? parseInt(form.stress, 10) : null,
      sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : null,
      steps: form.steps ? parseInt(form.steps, 10) : null,
      nutritionScore: form.nutritionScore ? parseInt(form.nutritionScore, 10) : null,
      notes: form.notes,
      wins: form.wins,
      challenges: form.challenges,
      coachFeedback: '',
      photos,
      reviewStatus: 'pending',
      flagReason: '',
    };
    onSubmitCheckIn(ci);
    setForm({ weight: '', bodyFat: '', mood: 0, energy: '', stress: '', sleepHours: '', steps: '', nutritionScore: '', notes: '', wins: '', challenges: '' });
    setPhotos([]);
    setTab('history');

    setTimeout(() => setIsSubmitting(false), 1500);
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 12px' : '24px' }}>
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('submit')}
          style={{ ...styles.tab, ...(tab === 'submit' ? styles.tabActive : {}) }}
        >
          <ClipboardCheck size={16} /> {t.checkIn.submit}
        </button>
        <button
          onClick={() => setTab('history')}
          style={{ ...styles.tab, ...(tab === 'history' ? styles.tabActive : {}) }}
        >
          <MessageSquare size={16} /> {t.checkIn.history} ({completed.length})
        </button>
      </div>

      {tab === 'submit' ? (
        <div style={styles.formWrap}>
          {/* Body Metrics */}
          <GlassCard delay={0.05}>
            <div style={styles.sectionTitle}>{t.checkIn.bodyMetrics}</div>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.weightKg}</label>
                <NumberStepper value={form.weight} onChange={v => setForm({ ...form, weight: v })} step={0.1} min={30} max={250} placeholder="83.5" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.bodyFatPct}</label>
                <NumberStepper value={form.bodyFat} onChange={v => setForm({ ...form, bodyFat: v })} step={0.1} min={3} max={60} placeholder="18.5" />
              </div>
            </div>
          </GlassCard>

          {/* Wellness */}
          <GlassCard delay={0.1}>
            <div style={styles.sectionTitle}>{t.checkIn.wellness}</div>
            <div style={styles.label}>{t.checkIn.mood}</div>
            <div style={styles.moodRow}>
              {([1, 2, 3, 4, 5] as const).map(val => {
                const m = moodIcons[val];
                const Icon = m.icon;
                const active = form.mood === val;
                return (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, mood: val })}
                    style={{
                      ...styles.moodBtn,
                      background: active ? `${m.color}20` : 'transparent',
                      borderColor: active ? m.color : 'var(--glass-border)',
                      color: active ? m.color : 'var(--text-tertiary)',
                    }}
                    title={m.label}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.energy}</label>
                <NumberStepper value={form.energy} onChange={v => setForm({ ...form, energy: v })} min={1} max={10} placeholder="7" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.stress}</label>
                <NumberStepper value={form.stress} onChange={v => setForm({ ...form, stress: v })} min={1} max={10} placeholder="4" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.sleepHrs}</label>
                <NumberStepper value={form.sleepHours} onChange={v => setForm({ ...form, sleepHours: v })} step={0.5} min={0} max={16} placeholder="7.5" />
              </div>
            </div>
          </GlassCard>

          {/* Compliance */}
          <GlassCard delay={0.15}>
            <div style={styles.sectionTitle}>{t.checkIn.compliance}</div>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.stepsDailyAvg}</label>
                <NumberStepper value={form.steps} onChange={v => setForm({ ...form, steps: v })} min={0} max={50000} step={500} placeholder="8000" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t.checkIn.nutrition}</label>
                <NumberStepper value={form.nutritionScore} onChange={v => setForm({ ...form, nutritionScore: v })} min={1} max={10} placeholder="8" />
              </div>
            </div>
          </GlassCard>

          {/* Self-Report */}
          <GlassCard delay={0.2}>
            <div
              style={styles.sectionToggle}
              onClick={() => setSelfReportOpen(prev => !prev)}
            >
              <div style={{ ...styles.sectionTitle, marginBottom: 0 }}>{t.checkIn.selfReport}</div>
              <div style={styles.sectionToggleRight}>
                <span style={styles.optionalBadge}>{t.checkIn.optional}</span>
                {selfReportOpen ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
              </div>
            </div>
            {selfReportOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} style={{ marginTop: '12px' }}>
                <div style={styles.field}>
                  <label style={styles.label}>{t.checkIn.notes}</label>
                  <textarea style={styles.textarea} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={t.checkIn.notesPlaceholder} rows={2} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t.checkIn.winsThisWeek}</label>
                  <textarea style={styles.textarea} value={form.wins} onChange={e => setForm({ ...form, wins: e.target.value })} placeholder={t.checkIn.winsPlaceholder} rows={2} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t.checkIn.challenges}</label>
                  <textarea style={styles.textarea} value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} placeholder={t.checkIn.challengesPlaceholder} rows={2} />
                </div>
              </motion.div>
            )}
          </GlassCard>

          {/* Progress Photos */}
          <GlassCard delay={0.25}>
            <div style={styles.sectionTitle}>{t.checkIn.progressPhotos}</div>
            <div style={styles.photoSlots}>
              {photoSlots.map(slot => {
                const existing = photos.find(p => p.label === slot.label);
                return (
                  <div key={slot.key} style={styles.photoSlot}>
                    <input
                      ref={el => { fileInputRefs.current[slot.key] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handlePhotoUpload(slot.key, slot.label, e)}
                    />
                    {existing ? (
                      <div style={styles.photoPreview}>
                        <img src={existing.url} alt={slot.label} style={styles.photoImg} />
                        <button
                          style={styles.photoRemoveBtn}
                          onClick={() => setPhotos(prev => prev.filter(p => p.label !== slot.label))}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={styles.photoUploadBox}
                        onClick={() => fileInputRefs.current[slot.key]?.click()}
                      >
                        <Camera size={20} color="var(--text-tertiary)" />
                      </div>
                    )}
                    <div style={styles.photoSlotLabel}>{slot.displayLabel}</div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <button
            style={{
              ...styles.submitBtn,
              ...(isSubmitting || !hasAnyData ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
            }}
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnyData}
          >
            <Send size={16} /> {isSubmitting ? t.checkIn.submitting : !hasAnyData ? t.checkIn.fillAtLeastOne : t.checkIn.submitCheckIn}
          </button>
        </div>
      ) : (
        <div style={styles.historyList}>
          {completed.length === 0 ? (
            <GlassCard>
              <p style={styles.emptyText}>{t.checkIn.noCheckIns}</p>
            </GlassCard>
          ) : (
            completed.map((ci, i) => {
              const isExpanded = expandedId === ci.id;
              const mood = ci.mood ? moodIcons[ci.mood] : null;
              const MoodIcon = mood?.icon;
              return (
                <GlassCard key={ci.id} delay={i * 0.05}>
                  <div
                    style={styles.historyHeader}
                    onClick={() => setExpandedId(isExpanded ? null : ci.id)}
                  >
                    <div style={styles.historyLeft}>
                      <div style={styles.historyDate}>{ci.date}</div>
                      <div style={styles.historyChips}>
                        {ci.weight && <span style={styles.chip}>{ci.weight}kg</span>}
                        {ci.steps != null && <span style={styles.chip}>{ci.steps.toLocaleString()} {t.checkIn.steps}</span>}
                        {MoodIcon && <MoodIcon size={14} color={mood?.color} />}
                        {ci.photos?.length > 0 && (
                          <span style={{ ...styles.chip, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ImageIcon size={10} /> {ci.photos.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={styles.historyDetail}
                    >
                      <div style={styles.detailGrid}>
                        {ci.energy != null && <div style={styles.detailItem}><span style={styles.detailLabel}>{t.checkIn.energyLabel}</span><span style={styles.detailValue}>{ci.energy}/10</span></div>}
                        {ci.stress != null && <div style={styles.detailItem}><span style={styles.detailLabel}>{t.checkIn.stressLabel}</span><span style={styles.detailValue}>{ci.stress}/10</span></div>}
                        {ci.sleepHours != null && <div style={styles.detailItem}><span style={styles.detailLabel}>{t.checkIn.sleepLabel}</span><span style={styles.detailValue}>{ci.sleepHours}h</span></div>}
                        {ci.nutritionScore != null && <div style={styles.detailItem}><span style={styles.detailLabel}>{t.checkIn.nutritionLabel}</span><span style={styles.detailValue}>{ci.nutritionScore}/10</span></div>}
                      </div>
                      {ci.notes && <div style={styles.detailText}><strong>{t.checkIn.notesLabel}</strong> {ci.notes}</div>}
                      {ci.wins && <div style={{ ...styles.detailText, color: 'var(--accent-success)' }}><strong>{t.checkIn.winsLabel}</strong> {ci.wins}</div>}
                      {ci.challenges && <div style={{ ...styles.detailText, color: 'var(--accent-warm)' }}><strong>{t.checkIn.challengesLabel}</strong> {ci.challenges}</div>}
                      {ci.photos?.length > 0 && (
                        <div>
                          <div style={styles.detailLabel}>{t.checkIn.progressPhotos}</div>
                          <div style={styles.historyPhotos}>
                            {ci.photos.map((photo, pi) => (
                              <div key={pi} style={styles.historyPhotoCard}>
                                <img src={photo.url} alt={photo.label} style={styles.historyPhotoImg} />
                                <span style={styles.historyPhotoLabel}>{photo.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ci.coachFeedback && (
                        <div style={styles.feedbackBox}>
                          <div style={styles.feedbackLabel}>{t.checkIn.coachFeedback}</div>
                          <p style={styles.feedbackText}>{ci.coachFeedback}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' },
  tabs: { display: 'flex', gap: '8px' },
  tab: { flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' },
  tabActive: { background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' },
  formWrap: { display: 'flex', flexDirection: 'column', gap: '14px' },
  sectionTitle: { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' },
  sectionToggle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '0' },
  sectionToggleRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  optionalBadge: { fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  fieldRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: '80px', marginBottom: '8px' },
  label: { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-display)', outline: 'none', resize: 'vertical', lineHeight: 1.5 },
  moodRow: { display: 'flex', gap: '8px', marginBottom: '14px' },
  moodBtn: { width: '44px', height: '44px', borderRadius: 'var(--radius-md)', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  submitBtn: { width: '100%', padding: '14px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', color: '#07090e', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 0 16px var(--accent-primary-dim)', marginBottom: '24px' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  historyLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyDate: { fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  historyChips: { display: 'flex', alignItems: 'center', gap: '6px' },
  chip: { fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  historyDetail: { marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  detailLabel: { fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailValue: { fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  detailText: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  feedbackBox: { background: 'var(--accent-primary-dim)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '12px', marginTop: '4px' },
  feedbackLabel: { fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  feedbackText: { fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 },
  emptyText: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', padding: '20px' },
  photoSlots: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '12px' },
  photoSlot: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  photoUploadBox: { width: '72px', height: '72px', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', background: 'rgba(255,255,255,0.02)' },
  photoPreview: { width: '72px', height: '72px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', border: '1px solid var(--glass-border)' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoRemoveBtn: { position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  photoSlotLabel: { fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  historyPhotos: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' },
  historyPhotoCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  historyPhotoImg: { width: '72px', height: '96px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' },
  historyPhotoLabel: { fontSize: '9px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
};
