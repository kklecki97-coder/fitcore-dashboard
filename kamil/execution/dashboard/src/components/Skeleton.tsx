/**
 * Reusable skeleton loader with shimmer animation.
 * Uses the @keyframes shimmer defined in index.css.
 *
 * Variants:
 *   text     — single line of text (default height 14px)
 *   heading  — larger text block (24px)
 *   card     — full glass-card placeholder
 *   circle   — avatar / icon placeholder
 *   chart    — chart area placeholder
 *   row      — table / list row
 */
import React from 'react';

type Variant = 'text' | 'heading' | 'card' | 'circle' | 'chart' | 'row';

interface SkeletonProps {
  variant?: Variant;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  count?: number;       // repeat this skeleton N times
  gap?: number;         // gap between repeated items
}

const shimmerBg: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite ease-in-out',
};

const variantDefaults: Record<Variant, React.CSSProperties> = {
  text: {
    height: '14px',
    width: '100%',
    borderRadius: '6px',
  },
  heading: {
    height: '24px',
    width: '60%',
    borderRadius: '8px',
  },
  card: {
    height: '120px',
    width: '100%',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--glass-border)',
  },
  circle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
  },
  chart: {
    height: '220px',
    width: '100%',
    borderRadius: '8px',
  },
  row: {
    height: '56px',
    width: '100%',
    borderRadius: 'var(--radius-sm)',
  },
};

export default function Skeleton({ variant = 'text', width, height, style, count = 1, gap = 8 }: SkeletonProps) {
  const base: React.CSSProperties = {
    ...shimmerBg,
    ...variantDefaults[variant],
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...style,
  };

  if (count === 1) {
    return <div style={base} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={base} />
      ))}
    </div>
  );
}

/** Pre-built skeleton layouts for common page patterns */

export function StatCardSkeleton() {
  return (
    <div style={{
      ...shimmerBg,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--glass-border)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ ...shimmerBg, height: '14px', width: '100px', borderRadius: '6px' }} />
      <div style={{ ...shimmerBg, height: '28px', width: '80px', borderRadius: '8px' }} />
      <div style={{ ...shimmerBg, height: '12px', width: '60px', borderRadius: '6px' }} />
    </div>
  );
}

export function ClientRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 20px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
    }}>
      <div style={{ ...shimmerBg, width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ ...shimmerBg, height: '14px', width: '140px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '12px', width: '200px', borderRadius: '6px' }} />
      </div>
      <div style={{ ...shimmerBg, height: '24px', width: '70px', borderRadius: '20px' }} />
    </div>
  );
}

export function MessageRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      borderBottom: '1px solid var(--glass-border)',
    }}>
      <div style={{ ...shimmerBg, width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ ...shimmerBg, height: '14px', width: '120px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '12px', width: '80%', borderRadius: '6px' }} />
      </div>
      <div style={{ ...shimmerBg, height: '12px', width: '40px', borderRadius: '6px' }} />
    </div>
  );
}

export function ChatBubbleSkeleton({ fromCoach }: { fromCoach?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: fromCoach ? 'flex-end' : 'flex-start',
      padding: '4px 0',
    }}>
      <div style={{
        ...shimmerBg,
        height: '42px',
        width: fromCoach ? '55%' : '65%',
        borderRadius: '16px',
      }} />
    </div>
  );
}

export function InvoiceRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 20px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderLeft: '3px solid var(--glass-border)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...shimmerBg, height: '16px', width: '80px', borderRadius: '6px' }} />
          <div style={{ ...shimmerBg, height: '22px', width: '60px', borderRadius: '20px' }} />
        </div>
        <div style={{ ...shimmerBg, height: '12px', width: '180px', borderRadius: '6px' }} />
      </div>
      <div style={{ ...shimmerBg, height: '24px', width: '70px', borderRadius: '6px' }} />
    </div>
  );
}

export function ProgramCardSkeleton() {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...shimmerBg, height: '18px', width: '160px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '24px', width: '60px', borderRadius: '20px' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ ...shimmerBg, height: '14px', width: '80px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '14px', width: '60px', borderRadius: '6px' }} />
      </div>
      <div style={{ ...shimmerBg, height: '32px', width: '100%', borderRadius: '8px' }} />
    </div>
  );
}

export function CheckInRowSkeleton() {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    }}>
      <div style={{ ...shimmerBg, width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ ...shimmerBg, height: '14px', width: '130px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '12px', width: '90px', borderRadius: '6px' }} />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ ...shimmerBg, height: '28px', width: '28px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '28px', width: '28px', borderRadius: '6px' }} />
        <div style={{ ...shimmerBg, height: '28px', width: '28px', borderRadius: '6px' }} />
      </div>
    </div>
  );
}

/** Full-page skeleton layouts */

export function ClientsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search bar */}
      <div style={{ ...shimmerBg, height: '44px', width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }} />
      {/* Client rows */}
      {Array.from({ length: 6 }, (_, i) => <ClientRowSkeleton key={i} />)}
    </div>
  );
}

export function MessagesPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Client list */}
      {!isMobile && (
        <div style={{ width: '300px', borderRight: '1px solid var(--glass-border)', padding: '12px' }}>
          <div style={{ ...shimmerBg, height: '40px', width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }} />
          {Array.from({ length: 8 }, (_, i) => <MessageRowSkeleton key={i} />)}
        </div>
      )}
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '8px', justifyContent: 'flex-end' }}>
        <ChatBubbleSkeleton />
        <ChatBubbleSkeleton fromCoach />
        <ChatBubbleSkeleton />
        <ChatBubbleSkeleton fromCoach />
        <ChatBubbleSkeleton />
        <div style={{ ...shimmerBg, height: '48px', width: '100%', borderRadius: 'var(--radius-sm)', marginTop: '12px' }} />
      </div>
    </div>
  );
}

export function AnalyticsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
        {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        <Skeleton variant="chart" />
        <Skeleton variant="chart" />
      </div>
      {/* Table */}
      <Skeleton variant="card" height="300px" />
    </div>
  );
}

export function ProgramsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header + button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ ...shimmerBg, height: '24px', width: '200px', borderRadius: '8px' }} />
        <div style={{ ...shimmerBg, height: '38px', width: '140px', borderRadius: 'var(--radius-sm)' }} />
      </div>
      {/* Program cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
        {Array.from({ length: 4 }, (_, i) => <ProgramCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function PaymentsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
        {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Invoice rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 5 }, (_, i) => <InvoiceRowSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function CheckInsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ ...shimmerBg, height: '34px', width: '80px', borderRadius: '20px' }} />
        ))}
      </div>
      {/* Check-in rows */}
      {Array.from({ length: 5 }, (_, i) => <CheckInRowSkeleton key={i} />)}
    </div>
  );
}
