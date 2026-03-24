import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, ChevronDown, ChevronUp, Send, MessageSquare, Smile, Frown, Meh, SmilePlus, Angry, Minus, Plus, Camera, X } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { CheckIn } from '../types';

interface CheckInPageProps {
  checkIns: CheckIn[];
  onSubmitCheckIn: (checkIn: CheckIn) => void;
  clientId: string;
  clientName: string;
  highlightCheckInId?: string | null;
}

function NumberStepper({ value, onChange, min, max, step = 1, placeholder, compact }: {
  value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number; placeholder?: string; compact?: boolean;
}) {
  const numVal = value === '' ? null : parseFloat(value);
  const canDec = numVal !== null && (min === undefined || Math.round((numVal - step) * 100) / 100 >= min);
  const canInc = numVal !== null && (max === undefined || Math.round((numVal + step) * 100) / 100 <= max);

  const adjust = (dir: 1 | -1) => {
    if (numVal === null) {
      // Empty field - use placeholder as starting value, fall back to sensible defaults
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
        style={{ ...stepperStyles.btn, ...(compact ? { width: '34px', height: '38px' } : {}), opacity: canDec ? 1 : 0.3 }}
        onClick={() => adjust(-1)}
        type="button"
      >
        <Minus size={compact ? 12 : 14} />
      </button>
      <input
        style={{ ...stepperStyles.input, ...(compact ? { padding: '8px 4px', fontSize: '14px' } : {}) }}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      <button
        style={{ ...stepperStyles.btn, ...(compact ? { width: '34px', height: '38px' } : {}), opacity: canInc ? 1 : 0.3 }}
        onClick={() => adjust(1)}
        type="button"
      >
        <Plus size={compact ? 12 : 14} />
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
    width: '40px',
    height: '44px',
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
    padding: '12px 4px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
    outline: 'none',
  },
};

export default function CheckInPage({ checkIns, onSubmitCheckIn, clientId, clientName, highlightCheckInId }: CheckInPageProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const [tab, setTab] = useState<'submit' | 'history'>(highlightCheckInId ? 'history' : 'submit');
  const [expandedId, setExpandedId] = useState<string | null>(highlightCheckInId ?? null);

  // When navigating from feedback notification, open history tab with that check-in expanded
  useEffect(() => {
    if (highlightCheckInId) {
      setTab('history');
      setExpandedId(highlightCheckInId);
    }
  }, [highlightCheckInId]);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
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
    waist: '', hips: '', chest: '', bicep: '', thigh: '',
  });
  const [photos, setPhotos] = useState<{ url: string; label: string; file?: File }[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fixedSlots: { label: string; key: string; displayLabel: string }[] = [
    { label: 'Front', key: 'front', displayLabel: t.checkIn.front },
    { label: 'Side', key: 'side', displayLabel: t.checkIn.side },
    { label: 'Back', key: 'back', displayLabel: t.checkIn.back },
  ];

  // Dynamic "Other" slots - one empty slot always shows at the end (max 5 extras)
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      alert(t.checkIn.photoInvalidType);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      alert(t.checkIn.photoTooLarge);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(prev => {
        const filtered = prev.filter(p => p.label !== label);
        return [...filtered, { url: reader.result as string, label, file }];
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
    || form.sleepHours || form.steps || form.nutritionScore || form.notes || form.wins || form.challenges
    || form.waist || form.hips || form.chest || form.bicep || form.thigh || photos.length > 0;

  const handleSubmit = () => {
    if (isSubmitting || !hasAnyData) return;
    setIsSubmitting(true);

    const ci: CheckIn = {
      id: crypto.randomUUID(),
      clientId,
      clientName,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      weight: form.weight ? parseFloat(form.weight) : null,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      hips: form.hips ? parseFloat(form.hips) : null,
      chest: form.chest ? parseFloat(form.chest) : null,
      bicep: form.bicep ? parseFloat(form.bicep) : null,
      thigh: form.thigh ? parseFloat(form.thigh) : null,
      mood: (form.mood !== 0 ? form.mood : null) as CheckIn['mood'],
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
    setForm({ weight: '', bodyFat: '', mood: 0, energy: '', stress: '', sleepHours: '', steps: '', nutritionScore: '', notes: '', wins: '', challenges: '', waist: '', hips: '', chest: '', bicep: '', thigh: '' });
    setPhotos([]);
    setTab('history');

    setTimeout(() => setIsSubmitting(false), 1500);
  };

  return (
    <div style={{ ...styles.page, ...(isMobile ? { padding: '16px 14px', gap: '14px' } : {}) }}>
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('submit')}
          style={{ ...styles.tab, ...(isMobile ? { padding: '10px', fontSize: '13px' } : {}), ...(tab === 'submit' ? styles.tabActive : {}) }}
        >
          <ClipboardCheck size={isMobile ? 14 : 16} /> {t.checkIn.submit}
        </button>
        <button
          onClick={() => setTab('history')}
          style={{ ...styles.tab, ...(isMobile ? { padding: '10px', fontSize: '13px' } : {}), ...(tab === 'history' ? styles.tabActive : {}) }}
        >
          <MessageSquare size={isMobile ? 14 : 16} /> {t.checkIn.history} ({completed.length})
        </button>
      </div>

      {tab === 'submit' ? (
        <div style={{ ...styles.formWrap, ...(isMobile ? { gap: '12px' } : {}) }}>
          {/* Essentials: Weight + Mood (always visible) */}
          <GlassCard delay={0.05}>
            <div style={{ ...styles.fieldRow, ...(isMobile ? { gap: '8px' } : {}) }}>
              <div style={{ ...styles.field, flex: 1, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.weightKg}</label>
                <NumberStepper value={form.weight} onChange={v => setForm({ ...form, weight: v })} step={0.1} min={30} max={250} placeholder="83.5" compact={isMobile} />
              </div>
            </div>
            <div style={{ marginTop: '4px' }}>
              <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.mood}</label>
              <div style={{ ...styles.moodRow, ...(isMobile ? { gap: '6px', marginBottom: '10px' } : {}) }}>
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
                        ...(isMobile ? { width: '40px', height: '40px' } : {}),
                        background: active ? `${m.color}20` : 'transparent',
                        borderColor: active ? m.color : 'var(--glass-border)',
                        color: active ? m.color : 'var(--text-tertiary)',
                      }}
                      title={m.label}
                    >
                      <Icon size={isMobile ? 16 : 20} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
              <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.notes}</label>
              <textarea style={{ ...styles.textarea, ...(isMobile ? { padding: '10px 12px', fontSize: '14px' } : {}) }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={t.checkIn.notesPlaceholder} rows={2} />
            </div>
          </GlassCard>

          {/* More Details (collapsed by default) */}
          <GlassCard delay={0.1}>
            <div
              style={styles.sectionToggle}
              onClick={() => setMoreDetailsOpen(prev => !prev)}
            >
              <div style={{ ...styles.sectionTitle, marginBottom: 0, ...(isMobile ? { fontSize: '13px' } : {}) }}>{'More Details'}</div>
              <div style={styles.sectionToggleRight}>
                <span style={{ ...styles.optionalBadge, ...(isMobile ? { fontSize: '10px', padding: '2px 8px' } : {}) }}>{t.checkIn.optional}</span>
                {moreDetailsOpen ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
              </div>
            </div>
            {moreDetailsOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} style={{ marginTop: isMobile ? '10px' : '14px', display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px' }}>
                {/* Body Fat */}
                <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                  <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.bodyFatPct}</label>
                  <NumberStepper value={form.bodyFat} onChange={v => setForm({ ...form, bodyFat: v })} step={0.1} min={3} max={60} placeholder="18.5" compact={isMobile} />
                </div>

                {/* Body Measurements (circumferences) */}
                <div style={{ ...styles.sectionTitle, marginBottom: isMobile ? '4px' : '6px', marginTop: '4px', ...(isMobile ? { fontSize: '13px' } : {}) }}>{t.checkIn.bodyMeasurements}</div>
                <div style={{ ...styles.fieldRow, ...(isMobile ? { gap: '8px' } : {}) }}>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.waistCm}</label>
                    <NumberStepper value={form.waist} onChange={v => setForm({ ...form, waist: v })} step={0.5} min={40} max={200} placeholder="82" compact={isMobile} />
                  </div>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.hipsCm}</label>
                    <NumberStepper value={form.hips} onChange={v => setForm({ ...form, hips: v })} step={0.5} min={50} max={200} placeholder="96" compact={isMobile} />
                  </div>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.chestCm}</label>
                    <NumberStepper value={form.chest} onChange={v => setForm({ ...form, chest: v })} step={0.5} min={50} max={200} placeholder="100" compact={isMobile} />
                  </div>
                </div>
                <div style={{ ...styles.fieldRow, ...(isMobile ? { gap: '8px' } : {}) }}>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.bicepCm}</label>
                    <NumberStepper value={form.bicep} onChange={v => setForm({ ...form, bicep: v })} step={0.5} min={15} max={60} placeholder="35" compact={isMobile} />
                  </div>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.thighCm}</label>
                    <NumberStepper value={form.thigh} onChange={v => setForm({ ...form, thigh: v })} step={0.5} min={30} max={100} placeholder="58" compact={isMobile} />
                  </div>
                </div>

                {/* Wellness */}
                <div style={{ ...styles.fieldRow, ...(isMobile ? { gap: '8px' } : {}) }}>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.energy}</label>
                    <NumberStepper value={form.energy} onChange={v => setForm({ ...form, energy: v })} min={1} max={10} placeholder="7" compact={isMobile} />
                  </div>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.stress}</label>
                    <NumberStepper value={form.stress} onChange={v => setForm({ ...form, stress: v })} min={1} max={10} placeholder="4" compact={isMobile} />
                  </div>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.sleepHrs}</label>
                    <NumberStepper value={form.sleepHours} onChange={v => setForm({ ...form, sleepHours: v })} step={0.5} min={0} max={16} placeholder="7.5" compact={isMobile} />
                  </div>
                </div>

                {/* Compliance */}
                <div style={{ ...styles.fieldRow, ...(isMobile ? { gap: '8px' } : {}) }}>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.stepsDailyAvg}</label>
                    <NumberStepper value={form.steps} onChange={v => setForm({ ...form, steps: v })} min={0} max={50000} step={500} placeholder="8000" compact={isMobile} />
                  </div>
                  <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                    <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.nutrition}</label>
                    <NumberStepper value={form.nutritionScore} onChange={v => setForm({ ...form, nutritionScore: v })} min={1} max={10} placeholder="8" compact={isMobile} />
                  </div>
                </div>

                {/* Self-Report */}
                <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                  <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.winsThisWeek}</label>
                  <textarea style={{ ...styles.textarea, ...(isMobile ? { padding: '10px 12px', fontSize: '14px' } : {}) }} value={form.wins} onChange={e => setForm({ ...form, wins: e.target.value })} placeholder={t.checkIn.winsPlaceholder} rows={2} />
                </div>
                <div style={{ ...styles.field, ...(isMobile ? { marginBottom: '4px' } : {}) }}>
                  <label style={{ ...styles.label, ...(isMobile ? { fontSize: '11px', marginBottom: '4px' } : {}) }}>{t.checkIn.challenges}</label>
                  <textarea style={{ ...styles.textarea, ...(isMobile ? { padding: '10px 12px', fontSize: '14px' } : {}) }} value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} placeholder={t.checkIn.challengesPlaceholder} rows={2} />
                </div>

                {/* Progress Photos */}
                <div>
                  <div style={{ ...styles.sectionTitle, marginBottom: '8px', ...(isMobile ? { fontSize: '13px', marginBottom: '6px' } : {}) }}>{t.checkIn.progressPhotos}</div>
                  <div style={{ ...styles.photoSlots, ...(isMobile ? { gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' } : {}) }}>
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
                            <div style={{ ...styles.photoPreview, ...(isMobile ? { width: '60px', height: '60px' } : {}) }}>
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
                              style={{ ...styles.photoUploadBox, ...(isMobile ? { width: '60px', height: '60px' } : {}) }}
                              onClick={() => fileInputRefs.current[slot.key]?.click()}
                            >
                              <Camera size={isMobile ? 16 : 20} color="var(--text-tertiary)" />
                            </div>
                          )}
                          <div style={{ ...styles.photoSlotLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>{slot.displayLabel}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </GlassCard>

          <button
            style={{
              ...styles.submitBtn,
              ...(isMobile ? { padding: '14px', fontSize: '14px', marginBottom: '16px' } : {}),
              ...(isSubmitting || !hasAnyData ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
            }}
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnyData}
          >
            <Send size={isMobile ? 14 : 16} /> {isSubmitting ? t.checkIn.submitting : !hasAnyData ? t.checkIn.fillAtLeastOne : t.checkIn.submitCheckIn}
          </button>
        </div>
      ) : (
        <div style={{ ...styles.historyList, ...(isMobile ? { gap: '8px' } : {}) }}>
          {completed.length === 0 ? (
            <GlassCard>
              <p style={{ ...styles.emptyText, ...(isMobile ? { fontSize: '13px', padding: '14px' } : {}) }}>{t.checkIn.noCheckIns}</p>
            </GlassCard>
          ) : (
            <>
              {/* Stats summary */}
              {(() => {
                if (completed.length === 0) return null;
                const weights = completed.filter(ci => ci.weight != null).map(ci => ci.weight!);
                const latest = weights.length > 0 ? weights[0] : null;
                const oldest = weights.length > 0 ? weights[weights.length - 1] : null;
                const diff = latest != null && oldest != null && weights.length >= 2 ? latest - oldest : null;
                const moodCIs = completed.filter(ci => ci.mood != null);
                const avgMood = moodCIs.length > 0 ? moodCIs.reduce((sum, ci) => sum + ci.mood!, 0) / moodCIs.length : null;
                const sleepCIs = completed.filter(ci => ci.sleepHours != null);
                const avgSleep = sleepCIs.length > 0 ? sleepCIs.reduce((sum, ci) => sum + ci.sleepHours!, 0) / sleepCIs.length : null;
                const energyCIs = completed.filter(ci => ci.energy != null);
                const avgEnergy = energyCIs.length > 0 ? energyCIs.reduce((sum, ci) => sum + ci.energy!, 0) / energyCIs.length : null;
                const isDown = diff != null ? diff <= 0 : true;
                const moodEmoji = avgMood ? (avgMood >= 4 ? '😊' : avgMood >= 3 ? '😐' : '😔') : '—';

                const cardBase: React.CSSProperties = {
                  flex: 1, padding: isMobile ? '10px 6px' : '14px 10px', borderRadius: '12px',
                  textAlign: 'center', minWidth: 0,
                };
                const iconBase: React.CSSProperties = {
                  width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto', marginBottom: isMobile ? 5 : 6,
                  fontSize: isMobile ? '13px' : '14px',
                };
                const valueBase: React.CSSProperties = {
                  fontSize: isMobile ? '17px' : '22px', fontWeight: 800,
                  fontFamily: 'var(--font-mono)', lineHeight: 1.1,
                };
                const unitSpan: React.CSSProperties = {
                  fontSize: isMobile ? '10px' : '12px', fontWeight: 600, opacity: 0.5,
                };
                const labelBase: React.CSSProperties = {
                  fontSize: isMobile ? '8px' : '9px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  color: 'var(--text-tertiary)', marginTop: isMobile ? 4 : 5,
                };

                return (
                  <GlassCard delay={0}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? '6px' : '10px' }}>
                      {/* Weight */}
                      <div style={{
                        ...cardBase,
                        background: isDown
                          ? 'linear-gradient(135deg, rgba(0,229,200,0.08) 0%, rgba(0,229,200,0.02) 100%)'
                          : 'linear-gradient(135deg, rgba(255,107,107,0.08) 0%, rgba(255,107,107,0.02) 100%)',
                        border: `1px solid ${isDown ? 'rgba(0,229,200,0.12)' : 'rgba(255,107,107,0.12)'}`,
                      }}>
                        <div style={{ ...iconBase, background: isDown ? 'rgba(0,229,200,0.12)' : 'rgba(255,107,107,0.12)' }}>
                          {isDown ? '↓' : '↑'}
                        </div>
                        <div style={{ ...valueBase, color: diff != null ? (isDown ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-tertiary)' }}>
                          {diff != null ? <>{Math.abs(diff).toFixed(1)}<span style={unitSpan}>kg</span></> : '—'}
                        </div>
                        <div style={labelBase}>{t.checkIn.weightKg.replace(' (kg)', '').replace(' (kg)', '')}</div>
                      </div>

                      {/* Mood */}
                      <div style={{
                        ...cardBase,
                        background: 'linear-gradient(135deg, rgba(255,193,7,0.08) 0%, rgba(255,193,7,0.02) 100%)',
                        border: '1px solid rgba(255,193,7,0.10)',
                      }}>
                        <div style={{ ...iconBase, background: 'rgba(255,193,7,0.12)' }}>{moodEmoji}</div>
                        <div style={{ ...valueBase, color: 'var(--text-primary)' }}>
                          {avgMood ? avgMood.toFixed(1) : '—'}<span style={unitSpan}>/5</span>
                        </div>
                        <div style={labelBase}>{t.checkIn.mood}</div>
                      </div>

                      {/* Sleep */}
                      <div style={{
                        ...cardBase,
                        background: 'linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(129,140,248,0.02) 100%)',
                        border: '1px solid rgba(129,140,248,0.10)',
                      }}>
                        <div style={{ ...iconBase, background: 'rgba(129,140,248,0.12)' }}>😴</div>
                        <div style={{ ...valueBase, color: 'var(--text-primary)' }}>
                          {avgSleep ? avgSleep.toFixed(1) : '—'}<span style={unitSpan}>h</span>
                        </div>
                        <div style={labelBase}>{t.checkIn.sleepLabel}</div>
                      </div>

                      {/* Energy */}
                      <div style={{
                        ...cardBase,
                        background: 'linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(251,146,60,0.02) 100%)',
                        border: '1px solid rgba(251,146,60,0.10)',
                      }}>
                        <div style={{ ...iconBase, background: 'rgba(251,146,60,0.12)' }}>⚡</div>
                        <div style={{ ...valueBase, color: 'var(--text-primary)' }}>
                          {avgEnergy ? avgEnergy.toFixed(1) : '—'}<span style={unitSpan}>/10</span>
                        </div>
                        <div style={labelBase}>{t.checkIn.energyLabel}</div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })()}
              {completed.map((ci, i) => {
                const isExpanded = expandedId === ci.id;
                const mood = ci.mood ? moodIcons[ci.mood] : null;
                const MoodIcon = mood?.icon;
                // Weight change vs previous check-in
                const prevCi = completed[i + 1];
                const weightDiff = ci.weight && prevCi?.weight ? ci.weight - prevCi.weight : null;
                return (
                  <GlassCard key={ci.id} delay={(i + 1) * 0.05}>
                    <div
                      style={styles.historyHeader}
                      onClick={() => setExpandedId(isExpanded ? null : ci.id)}
                    >
                      <div style={{ ...styles.historyLeft, ...(isMobile ? { gap: '8px' } : {}) }}>
                        <div style={{ ...styles.historyDate, ...(isMobile ? { fontSize: '13px' } : {}) }}>{ci.date}</div>
                        <div style={styles.historyChips}>
                          {ci.weight && (
                            <span style={{ ...styles.chip, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}) }}>
                              {ci.weight}kg
                              {weightDiff != null && (
                                <span style={{ color: weightDiff <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', marginLeft: '3px', fontSize: isMobile ? '9px' : '10px' }}>
                                  {weightDiff <= 0 ? '\u2193' : '\u2191'}{Math.abs(weightDiff).toFixed(1)}
                                </span>
                              )}
                            </span>
                          )}
                          {MoodIcon && <MoodIcon size={isMobile ? 12 : 14} color={mood?.color} />}
                          {ci.coachFeedback && <span style={{ ...styles.chip, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}), background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>Reviewed</span>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={isMobile ? 14 : 16} color="var(--text-tertiary)" /> : <ChevronDown size={isMobile ? 14 : 16} color="var(--text-tertiary)" />}
                    </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ ...styles.historyDetail, ...(isMobile ? { marginTop: '10px', paddingTop: '10px', gap: '10px' } : {}) }}
                    >
                      {/* Wellness scores - emoji pill cards */}
                      {(() => {
                        const wellness = [
                          ci.energy != null && {
                            label: t.checkIn.energyLabel, value: ci.energy, max: 10,
                            emoji: ci.energy >= 7 ? '⚡' : ci.energy >= 4 ? '🔋' : '🪫',
                            color: ci.energy >= 7 ? 'var(--accent-success)' : ci.energy >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                            dimColor: ci.energy >= 7 ? 'rgba(34,197,94,0.12)' : ci.energy >= 4 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          },
                          ci.stress != null && {
                            label: t.checkIn.stressLabel, value: ci.stress, max: 10,
                            emoji: ci.stress <= 3 ? '😌' : ci.stress <= 6 ? '😐' : '😰',
                            color: ci.stress <= 3 ? 'var(--accent-success)' : ci.stress <= 6 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                            dimColor: ci.stress <= 3 ? 'rgba(34,197,94,0.12)' : ci.stress <= 6 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          },
                          ci.sleepHours != null && {
                            label: t.checkIn.sleepLabel, value: ci.sleepHours, max: 10,
                            emoji: '😴',
                            color: 'var(--accent-secondary, #818cf8)',
                            dimColor: 'rgba(129,140,248,0.12)',
                          },
                          ci.nutritionScore != null && {
                            label: t.checkIn.nutritionLabel, value: ci.nutritionScore, max: 10,
                            emoji: ci.nutritionScore >= 7 ? '🥗' : ci.nutritionScore >= 4 ? '🍳' : '🍔',
                            color: ci.nutritionScore >= 7 ? 'var(--accent-success)' : ci.nutritionScore >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                            dimColor: ci.nutritionScore >= 7 ? 'rgba(34,197,94,0.12)' : ci.nutritionScore >= 4 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          },
                        ].filter(Boolean) as { label: string; value: number; max: number; emoji: string; color: string; dimColor: string }[];

                        return wellness.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${Math.min(wellness.length, 4)}, 1fr)`, gap: isMobile ? '6px' : '8px' }}>
                            {wellness.map(w => {
                              const pct = (w.value / w.max) * 100;
                              return (
                                <div key={w.label} style={{
                                  padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '10px',
                                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                  position: 'relative', overflow: 'hidden',
                                }}>
                                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${w.dimColor} 0%, transparent 100%)`, opacity: 0.5 }} />
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: isMobile ? '16px' : '18px', lineHeight: 1 }}>{w.emoji}</span>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: w.color, lineHeight: 1.1 }}>{w.value}</span>
                                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>/{w.max}</span>
                                      </div>
                                      <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{w.label}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Body measurements */}
                      {(() => {
                        const meas = [
                          ci.waist != null && { label: t.checkIn.waistCm, value: ci.waist, prev: prevCi?.waist },
                          ci.hips != null && { label: t.checkIn.hipsCm, value: ci.hips, prev: prevCi?.hips },
                          ci.chest != null && { label: t.checkIn.chestCm, value: ci.chest, prev: prevCi?.chest },
                          ci.bicep != null && { label: t.checkIn.bicepCm, value: ci.bicep, prev: prevCi?.bicep },
                          ci.thigh != null && { label: t.checkIn.thighCm, value: ci.thigh, prev: prevCi?.thigh },
                        ].filter(Boolean) as { label: string; value: number; prev: number | null | undefined }[];

                        return meas.length > 0 && (
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>📏 {t.checkIn.bodyMeasurements}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : `repeat(${Math.min(meas.length, 5)}, 1fr)`, gap: isMobile ? '6px' : '8px' }}>
                              {meas.map(m => {
                                const diff = m.prev != null ? m.value - m.prev : null;
                                return (
                                  <div key={m.label} style={{
                                    padding: isMobile ? '6px 8px' : '8px 12px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', textAlign: 'center',
                                  }}>
                                    <div style={{ fontSize: isMobile ? '15px' : '17px', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                                      {m.value}<span style={{ fontSize: '10px', fontWeight: 500, opacity: 0.6 }}>cm</span>
                                    </div>
                                    {diff != null && Math.abs(diff) >= 0.1 && (
                                      <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '1px', color: diff <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                        {diff <= 0 ? '↓' : '↑'}{Math.abs(diff).toFixed(1)}cm
                                      </div>
                                    )}
                                    <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{m.label}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Notes / Wins / Challenges */}
                      {ci.notes && (
                        <div style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>📝 {t.checkIn.notesLabel}</div>
                          <p style={{ margin: 0, fontSize: isMobile ? '13px' : '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{ci.notes}</p>
                        </div>
                      )}
                      {ci.wins && (
                        <div style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-success)', marginBottom: '4px' }}>🏆 {t.checkIn.winsLabel}</div>
                          <p style={{ margin: 0, fontSize: isMobile ? '13px' : '14px', color: 'var(--accent-success)', lineHeight: 1.5 }}>{ci.wins}</p>
                        </div>
                      )}
                      {ci.challenges && (
                        <div style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-warm)', marginBottom: '4px' }}>💪 {t.checkIn.challengesLabel}</div>
                          <p style={{ margin: 0, fontSize: isMobile ? '13px' : '14px', color: 'var(--accent-warm)', lineHeight: 1.5 }}>{ci.challenges}</p>
                        </div>
                      )}

                      {/* Progress Photos */}
                      {ci.photos?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>📸 {t.checkIn.progressPhotos}</div>
                          <div style={{ ...styles.historyPhotos, ...(isMobile ? { gap: '6px' } : {}) }}>
                            {ci.photos.map((photo, pi) => (
                              <div key={pi} style={{ ...styles.historyPhotoCard, cursor: 'pointer' }} onClick={() => setLightboxSrc(photo.url)}>
                                <img src={photo.url} alt={photo.label} style={{ ...styles.historyPhotoImg, ...(isMobile ? { width: '60px', height: '80px' } : {}) }} />
                                <span style={styles.historyPhotoLabel}>{photo.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coach Feedback */}
                      {ci.coachFeedback && (
                        <div style={{ padding: isMobile ? '10px' : '12px 16px', borderRadius: '10px', background: 'rgba(0,229,200,0.05)', border: '1px solid rgba(0,229,200,0.12)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-primary)', marginBottom: '4px' }}>💬 {t.checkIn.coachFeedback}</div>
                          <p style={{ margin: 0, fontSize: isMobile ? '13px' : '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{ci.coachFeedback}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </GlassCard>
              );
            })}
            </>
          )}
        </div>
      )}
      {/* Lightbox modal */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', cursor: 'pointer' }}
        >
          <button onClick={() => setLightboxSrc(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10000 }}><X size={28} /></button>
          <img src={lightboxSrc} alt="Progress photo" style={{ maxWidth: '90vw', maxHeight: 'calc(100vh - 80px)', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%' },
  tabs: { display: 'flex', gap: '8px' },
  tab: { flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' },
  tabActive: { background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' },
  formWrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' },
  sectionToggle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '0' },
  sectionToggleRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  optionalBadge: { fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  fieldRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: '80px', marginBottom: '8px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-mono)', outline: 'none' },
  textarea: { width: '100%', padding: '12px 14px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-display)', outline: 'none', resize: 'vertical', lineHeight: 1.5 },
  moodRow: { display: 'flex', gap: '8px', marginBottom: '14px' },
  moodBtn: { width: '48px', height: '48px', borderRadius: 'var(--radius-md)', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  submitBtn: { width: '100%', padding: '16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', color: '#07090e', fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 0 16px var(--accent-primary-dim)', marginBottom: '24px' },
  trendRow: { display: 'flex', alignItems: 'center', gap: '16px' },
  trendItem: { flex: 1, textAlign: 'center' },
  trendLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  trendValue: { fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  trendSub: { fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' },
  trendDivider: { width: '1px', height: '40px', background: 'var(--glass-border)' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  historyLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyDate: { fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  historyChips: { display: 'flex', alignItems: 'center', gap: '6px' },
  chip: { fontSize: '13px', fontWeight: 600, padding: '3px 10px', borderRadius: '8px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  historyDetail: { marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  detailLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailValue: { fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  detailText: { fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  feedbackBox: { background: 'var(--accent-primary-dim)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '12px', marginTop: '4px' },
  feedbackLabel: { fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  feedbackText: { fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 },
  emptyText: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px', padding: '20px' },
  photoSlots: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '12px' },
  photoSlot: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  photoUploadBox: { width: '72px', height: '72px', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', background: 'rgba(255,255,255,0.02)' },
  photoPreview: { width: '72px', height: '72px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', border: '1px solid var(--glass-border)' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoRemoveBtn: { position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  photoSlotLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  historyPhotos: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' },
  historyPhotoCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  historyPhotoImg: { width: '72px', height: '96px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' },
  historyPhotoLabel: { fontSize: '9px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
};
