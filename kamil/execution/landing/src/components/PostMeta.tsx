import { Clock, Calendar } from 'lucide-react';
import type { Lang } from '../i18n';

const labels = { en: 'min read', pl: 'min czytania' };

export default function PostMeta({ date, readingTime, lang, size = 'sm' }: {
  date: string;
  readingTime: number;
  lang: Lang;
  size?: 'sm' | 'md';
}) {
  const iconSize = size === 'md' ? 14 : 13;
  const fontSize = size === 'md' ? 13 : 12;
  const dateFormat = size === 'md'
    ? { year: 'numeric' as const, month: 'long' as const, day: 'numeric' as const }
    : { year: 'numeric' as const, month: 'short' as const, day: 'numeric' as const };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize, color: 'var(--text-tertiary)', fontWeight: 500,
      }}>
        <Calendar size={iconSize} />
        {new Date(date).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', dateFormat)}
      </span>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize, color: 'var(--text-tertiary)', fontWeight: 500,
      }}>
        <Clock size={iconSize} />
        {readingTime} {labels[lang]}
      </span>
    </div>
  );
}
