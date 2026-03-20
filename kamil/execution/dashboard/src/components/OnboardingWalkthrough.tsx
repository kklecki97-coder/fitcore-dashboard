import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Sparkles, CreditCard, Users, Dumbbell, MessageSquare, CheckCircle } from 'lucide-react';
import { useLang } from '../i18n';

interface WalkthroughStep {
  target: string | null; // data-tour attribute selector, null = center overlay
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  needsSidebar: boolean; // whether this step targets a sidebar item
}

const STEPS: WalkthroughStep[] = [
  { target: null, icon: Sparkles, titleKey: 'welcomeTitle', descKey: 'welcomeDesc', needsSidebar: false },
  { target: '[data-tour="nav-settings"]', icon: CreditCard, titleKey: 'plansTitle', descKey: 'plansDesc', needsSidebar: true },
  { target: '[data-tour="nav-clients"]', icon: Users, titleKey: 'clientsTitle', descKey: 'clientsDesc', needsSidebar: true },
  { target: '[data-tour="nav-programs"]', icon: Dumbbell, titleKey: 'programsTitle', descKey: 'programsDesc', needsSidebar: true },
  { target: '[data-tour="nav-messages"]', icon: MessageSquare, titleKey: 'messagesTitle', descKey: 'messagesDesc', needsSidebar: true },
  { target: null, icon: CheckCircle, titleKey: 'doneTitle', descKey: 'doneDesc', needsSidebar: false },
];

interface OnboardingWalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
  isMobile: boolean;
  onSetSidebarOpen: (open: boolean) => void;
}

export default function OnboardingWalkthrough({ onComplete, onSkip, isMobile, onSetSidebarOpen }: OnboardingWalkthroughProps) {
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  // On mobile: open sidebar in background when step targets a sidebar item
  useEffect(() => {
    if (isMobile) {
      onSetSidebarOpen(currentStep.needsSidebar);
    }
  }, [isMobile, currentStep.needsSidebar, onSetSidebarOpen]);

  // Find and measure target element — with delay on mobile to let sidebar animate in
  const updateTargetRect = useCallback(() => {
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }
    const findEl = () => {
      const el = document.querySelector(currentStep.target!);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };
    if (isMobile && currentStep.needsSidebar) {
      setTimeout(findEl, 350);
    } else {
      findEl();
    }
  }, [currentStep.target, currentStep.needsSidebar, isMobile]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [updateTargetRect]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const texts = t.onboarding;
  const Icon = currentStep.icon;

  // Card positioning
  const getCardStyle = (): React.CSSProperties => {
    // Mobile: always centered, no fixed positioning — clean and readable
    if (isMobile) {
      return { ...cardBase, position: 'relative', zIndex: 10002 };
    }

    // Desktop center steps
    if (!targetRect || !currentStep.target) {
      return { ...cardBase, position: 'relative', zIndex: 10002 };
    }

    // Desktop: card to the right of sidebar item
    return {
      ...cardBase,
      position: 'fixed',
      left: targetRect.right + 20,
      ...(targetRect.top > window.innerHeight / 2
        ? { bottom: window.innerHeight - targetRect.top - targetRect.height / 2 }
        : { top: targetRect.top }),
      zIndex: 10002,
      maxHeight: '90vh',
    };
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.overlay}
        onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
      >
        {/* Spotlight cutout for targeted elements */}
        {targetRect && (
          <div style={{
            position: 'fixed',
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
            zIndex: 10001,
            pointerEvents: 'none',
            border: '2px solid rgba(0,229,200,0.4)',
            transition: 'all 0.3s ease',
          }} />
        )}

        {/* Tooltip card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: isMobile ? 30 : 0, scale: isMobile ? 1 : 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMobile ? 30 : 0, scale: isMobile ? 1 : 0.95 }}
          transition={{ duration: 0.3 }}
          style={getCardStyle()}
        >
          {/* Step indicator */}
          <div style={styles.stepIndicator}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? '24px' : '8px',
                height: '4px',
                borderRadius: '2px',
                background: i === step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          {/* Icon */}
          <div style={styles.iconWrap}>
            <Icon size={28} color="var(--accent-primary)" />
          </div>

          {/* Content */}
          <h3 style={styles.title}>{texts[currentStep.titleKey as keyof typeof texts] as string}</h3>
          <p style={styles.desc}>{texts[currentStep.descKey as keyof typeof texts] as string}</p>

          {/* Actions */}
          <div style={styles.actions}>
            {!isFirstStep && !isLastStep && (
              <button onClick={onSkip} style={styles.skipBtn}>
                {texts.skip as string}
              </button>
            )}
            <button onClick={handleNext} style={styles.nextBtn}>
              {isLastStep ? (texts.finish as string) : isFirstStep ? (texts.start as string) : (texts.next as string)}
              {!isLastStep && <ArrowRight size={16} />}
            </button>
          </div>

          {/* Close button */}
          <button onClick={onSkip} style={styles.closeBtn}>
            <X size={16} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const cardBase: React.CSSProperties = {
  background: '#0c1017',
  border: '1px solid rgba(0,229,200,0.2)',
  borderRadius: '16px',
  padding: '28px 24px',
  maxWidth: '380px',
  width: '90vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: '12px',
  boxShadow: '0 16px 64px rgba(0,0,0,0.5), 0 0 24px rgba(0,229,200,0.08)',
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    marginBottom: '4px',
  },
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'rgba(0,229,200,0.08)',
    border: '1px solid rgba(0,229,200,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1.3,
  },
  desc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    width: '100%',
    justifyContent: 'center',
  },
  skipBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 24px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px rgba(0,229,200,0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};
