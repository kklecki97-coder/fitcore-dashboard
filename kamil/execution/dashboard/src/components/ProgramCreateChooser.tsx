import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Wrench, FileSpreadsheet } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';

interface ProgramCreateChooserProps {
  onChooseManual: () => void;
  onChooseAI: () => void;
  onChooseImport: () => void;
  onBack: () => void;
}

export default function ProgramCreateChooser({ onChooseManual, onChooseAI, onChooseImport, onBack }: ProgramCreateChooserProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const c = t.programChooser;

  return (
    <div style={{ ...s.page, padding: isMobile ? '16px' : '24px 32px' }}>
      <motion.button onClick={onBack} style={s.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
        <ArrowLeft size={16} /> {c.backToPrograms}
      </motion.button>

      <div style={s.header}>
        <h2 style={s.title}>{c.title}</h2>
        <p style={s.subtitle}>{c.subtitle}</p>
      </div>

      <div style={{ ...s.grid, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* AI Option */}
        <GlassCard delay={0.1} hover>
          <motion.button
            onClick={onChooseAI}
            style={s.choiceCard}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div style={s.iconWrap}>
              <div style={{ ...s.iconCircle, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                <Sparkles size={28} color="var(--text-on-accent)" />
              </div>
            </div>
            <h3 style={s.choiceTitle}>{c.aiTitle}</h3>
            <p style={s.choiceDesc}>{c.aiDesc}</p>
            <div style={s.featureList}>
              {c.aiFeatures.map((f: string) => <span key={f} style={s.feature}>{f}</span>)}
            </div>
            <div style={s.choiceBtnAI}>
              <Sparkles size={16} /> {c.aiBtn}
            </div>
          </motion.button>
        </GlassCard>

        {/* Manual Option */}
        <GlassCard delay={0.15} hover>
          <motion.button
            onClick={onChooseManual}
            style={s.choiceCard}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div style={s.iconWrap}>
              <div style={{ ...s.iconCircle, background: 'var(--bg-subtle-hover)' }}>
                <Wrench size={28} color="var(--text-secondary)" />
              </div>
            </div>
            <h3 style={s.choiceTitle}>{c.manualTitle}</h3>
            <p style={s.choiceDesc}>{c.manualDesc}</p>
            <div style={s.featureList}>
              {c.manualFeatures.map((f: string) => <span key={f} style={s.feature}>{f}</span>)}
            </div>
            <div style={s.choiceBtnManual}>
              <Wrench size={16} /> {c.manualBtn}
            </div>
          </motion.button>
        </GlassCard>

        {/* Import Option */}
        <GlassCard delay={0.2} hover>
          <motion.button
            onClick={onChooseImport}
            style={s.choiceCard}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div style={s.iconWrap}>
              <div style={{ ...s.iconCircle, background: 'rgba(168, 85, 247, 0.15)' }}>
                <FileSpreadsheet size={28} color="#a855f7" />
              </div>
            </div>
            <h3 style={s.choiceTitle}>{c.importTitle}</h3>
            <p style={s.choiceDesc}>{c.importDesc}</p>
            <div style={s.featureList}>
              {c.importFeatures.map((f: string) => <span key={f} style={s.feature}>{f}</span>)}
            </div>
            <div style={s.choiceBtnImport}>
              <FileSpreadsheet size={16} /> {c.importBtn}
            </div>
          </motion.button>
        </GlassCard>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'flex',
    gap: '20px',
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
  },
  choiceCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '32px 24px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    width: '100%',
    fontFamily: 'var(--font-display)',
  },
  iconWrap: {
    marginBottom: '4px',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  choiceDesc: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    maxWidth: '280px',
  },
  featureList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'center',
  },
  feature: {
    fontSize: '14px',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'var(--bg-subtle-hover)',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  choiceBtnAI: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 28px',
    borderRadius: 'var(--radius-sm)',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    color: 'var(--text-on-accent)',
    fontSize: '17px',
    fontWeight: 700,
    marginTop: '8px',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
  },
  choiceBtnManual: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 28px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    fontSize: '17px',
    fontWeight: 600,
    marginTop: '8px',
  },
  choiceBtnImport: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 28px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    background: 'rgba(168, 85, 247, 0.1)',
    color: '#a855f7',
    fontSize: '17px',
    fontWeight: 600,
    marginTop: '8px',
  },
};
