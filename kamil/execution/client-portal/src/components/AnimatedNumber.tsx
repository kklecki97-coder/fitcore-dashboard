import { useEffect, useRef, useState, useCallback } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  /** Format function applied during and after animation */
  format?: (n: number) => string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Smoothly counts from 0 to `value` using requestAnimationFrame.
 * Animation triggers once when the element enters the viewport.
 */
export default function AnimatedNumber({ value, duration = 1500, format }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(() => format ? format(0) : '0');
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = eased * value;

      // For integers, round; for decimals, keep 2 decimal places
      const rounded = Number.isInteger(value) ? Math.round(current) : Math.round(current * 100) / 100;
      setDisplay(format ? format(rounded) : rounded.toLocaleString());

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [value, duration, format]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If value is 0, no animation needed
    if (value === 0) {
      setDisplay(format ? format(0) : '0');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, animate, format]);

  return <span ref={ref}>{display}</span>;
}
