/**
 * Reusable skeleton loader with shimmer animation.
 * Uses the @keyframes shimmer defined in index.css.
 */
import React from 'react';

type Variant = 'text' | 'heading' | 'card' | 'circle' | 'chart' | 'row';

interface SkeletonProps {
  variant?: Variant;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  count?: number;
  gap?: number;
}

const shimmerBg: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite ease-in-out',
};

const variantDefaults: Record<Variant, React.CSSProperties> = {
  text: { height: '14px', width: '100%', borderRadius: '6px' },
  heading: { height: '24px', width: '60%', borderRadius: '8px' },
  card: { height: '120px', width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' },
  circle: { width: '40px', height: '40px', borderRadius: '50%' },
  chart: { height: '220px', width: '100%', borderRadius: '8px' },
  row: { height: '56px', width: '100%', borderRadius: 'var(--radius-sm)' },
};

export default function Skeleton({ variant = 'text', width, height, style, count = 1, gap = 8 }: SkeletonProps) {
  const base: React.CSSProperties = {
    ...shimmerBg,
    ...variantDefaults[variant],
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...style,
  };
  if (count === 1) return <div style={base} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      {Array.from({ length: count }, (_, i) => <div key={i} style={base} />)}
    </div>
  );
}

/** ── Client Portal Page Skeletons ── */

function StatCardSkeleton() {
  return (
    <div style={{
      ...shimmerBg,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--glass-border)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <div style={{ ...shimmerBg, height: '12px', width: '80px', borderRadius: '6px' }} />
      <div style={{ ...shimmerBg, height: '26px', width: '60px', borderRadius: '8px' }} />
      <div style={{ ...shimmerBg, height: '10px', width: '50px', borderRadius: '6px' }} />
    </div>
  );
}

export function HomePageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Greeting */}
      <div style={{ ...shimmerBg, height: '28px', width: '250px', borderRadius: '8px' }} />
      <div style={{ ...shimmerBg, height: '14px', width: '180px', borderRadius: '6px' }} />
      {/* Today's workout card */}
      <div style={{
        ...shimmerBg, borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)',
        padding: '24px', height: '160px',
      }} />
      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
        {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Recent message */}
      <Skeleton variant="card" height="100px" />
    </div>
  );
}

export function ProgramPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Day selector */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ ...shimmerBg, height: '44px', width: '80px', borderRadius: '12px', flexShrink: 0 }} />
        ))}
      </div>
      {/* Exercise cards */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{
          ...shimmerBg, borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)',
          padding: '18px', height: '90px',
        }} />
      ))}
    </div>
  );
}

export function CheckInPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...shimmerBg, height: '24px', width: '180px', borderRadius: '8px' }} />
      {/* Form fields */}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ ...shimmerBg, height: '12px', width: '80px', borderRadius: '6px' }} />
          <div style={{ ...shimmerBg, height: '44px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
        </div>
      ))}
    </div>
  );
}

export function ProgressPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
        {Array.from({ length: 3 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Chart */}
      <Skeleton variant="chart" />
      {/* PRs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {Array.from({ length: 3 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function MessagesPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-end', height: '100%' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
        }}>
          <div style={{
            ...shimmerBg,
            height: '42px',
            width: i % 2 === 0 ? '65%' : '55%',
            borderRadius: '16px',
          }} />
        </div>
      ))}
      <div style={{ ...shimmerBg, height: '48px', width: '100%', borderRadius: 'var(--radius-sm)', marginTop: '12px' }} />
    </div>
  );
}

export function CalendarPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...shimmerBg, height: '24px', width: '200px', borderRadius: '8px' }} />
      {/* Week rows */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{
          ...shimmerBg, borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)',
          height: '70px',
        }} />
      ))}
    </div>
  );
}

export function InvoicesPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
        {Array.from({ length: isMobile ? 2 : 3 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Invoice rows */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{
          ...shimmerBg, borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)',
          borderLeft: '3px solid var(--glass-border)', height: '72px',
        }} />
      ))}
    </div>
  );
}
