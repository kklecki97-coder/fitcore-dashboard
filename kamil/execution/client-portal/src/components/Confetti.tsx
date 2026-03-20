import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  active: boolean;
  trigger?: number;
  duration?: number;
}

const COLORS = [
  '#00e5c8', '#00c4aa', // brand teal
  '#6366f1', '#8b5cf6', // indigo/purple
  '#f59e0b', '#f97316', // warm
  '#ec4899', '#22c55e', // pink/green
];

const SHAPES = ['circle', 'square', 'strip'] as const;

interface Particle {
  id: number;
  x: number;
  color: string;
  shape: typeof SHAPES[number];
  size: number;
  delay: number;
  rotation: number;
  drift: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    size: 5 + Math.random() * 8,
    delay: Math.random() * 0.6,
    rotation: Math.random() * 900 - 450,
    drift: (Math.random() - 0.5) * 200,
  }));
}

export default function Confetti({ active, trigger = 0, duration = 2500 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active || trigger > 0) {
      setParticles(generateParticles(120));
      setShow(true);
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [active, trigger, duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {particles.map(p => {
            const shapeStyle: React.CSSProperties =
              p.shape === 'circle'
                ? { width: p.size, height: p.size, borderRadius: '50%' }
                : p.shape === 'strip'
                ? { width: p.size * 0.4, height: p.size * 2, borderRadius: 2 }
                : { width: p.size, height: p.size, borderRadius: 1 };

            return (
              <motion.div
                key={p.id}
                initial={{
                  x: `${p.x}vw`,
                  y: '-5vh',
                  rotate: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  y: '110vh',
                  x: `calc(${p.x}vw + ${p.drift}px)`,
                  rotate: p.rotation,
                  opacity: [1, 1, 1, 0.6, 0],
                  scale: [1, 1.1, 0.9, 0.8, 0.6],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: p.delay,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  position: 'absolute',
                  ...shapeStyle,
                  background: p.color,
                  boxShadow: `0 0 6px ${p.color}40`,
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
