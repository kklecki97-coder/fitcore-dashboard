import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MoneyRainProps {
  active: boolean;
  duration?: number;
}

const EMOJIS = ['💵', '💰', '🤑', '💸', '💲', '🪙'];

interface Coin {
  id: number;
  x: number;
  emoji: string;
  size: number;
  delay: number;
  rotation: number;
  drift: number;
}

function generateCoins(count: number): Coin[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    size: 16 + Math.random() * 16,
    delay: Math.random() * 0.8,
    rotation: Math.random() * 360 - 180,
    drift: (Math.random() - 0.5) * 150,
  }));
}

export default function MoneyRain({ active, duration = 3000 }: MoneyRainProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setCoins(generateCoins(40));
      setShow(true);
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration]);

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
          {coins.map(c => (
            <motion.div
              key={c.id}
              initial={{
                x: `${c.x}vw`,
                y: '-5vh',
                rotate: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                y: '110vh',
                x: `calc(${c.x}vw + ${c.drift}px)`,
                rotate: c.rotation,
                opacity: [1, 1, 1, 0.7, 0],
                scale: [1, 1.15, 0.95, 0.85, 0.6],
              }}
              transition={{
                duration: 2.2 + Math.random() * 0.8,
                delay: c.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                fontSize: `${c.size}px`,
                lineHeight: 1,
              }}
            >
              {c.emoji}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
