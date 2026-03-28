/**
 * Relative time formatting utility.
 * Converts ISO timestamps to human-readable "2 min ago", "Yesterday", etc.
 * Supports EN and PL.
 */

export function relativeTime(isoString: string, lang: 'en' | 'pl'): string {
  const now = new Date();
  const date = new Date(isoString);

  // Same day = "Today"
  if (date.toDateString() === now.toDateString()) {
    return lang === 'pl' ? 'Dziś' : 'Today';
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return lang === 'pl' ? 'Wczoraj' : 'Yesterday';
  }

  // 2-6 days ago
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    if (lang === 'pl') {
      return diffDays === 2 ? '2 dni temu' : `${diffDays} dni temu`;
    }
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Older than 7 days — show date
  return date.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get a day separator label for grouping feed events.
 * Returns "Today", "Yesterday", or formatted date.
 */
export function getDaySeparator(isoString: string, lang: 'en' | 'pl'): string {
  const now = new Date();
  const date = new Date(isoString);

  if (date.toDateString() === now.toDateString()) {
    return lang === 'pl' ? 'Dzisiaj' : 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return lang === 'pl' ? 'Wczoraj' : 'Yesterday';
  }

  return date.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
