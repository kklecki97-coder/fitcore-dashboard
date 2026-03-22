/**
 * Relative time formatting utility.
 * Converts ISO timestamps to human-readable "2 min ago", "Yesterday", etc.
 * Supports EN and PL.
 */

export function relativeTime(isoString: string, lang: 'en' | 'pl'): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return lang === 'pl' ? 'Przed chwilą' : 'Just now';
  }
  if (diffMin < 60) {
    return lang === 'pl' ? `${diffMin} min temu` : `${diffMin} min ago`;
  }
  if (diffHr < 24) {
    return lang === 'pl' ? `${diffHr}h temu` : `${diffHr}h ago`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    const time = date.toLocaleTimeString(lang === 'pl' ? 'pl-PL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    return lang === 'pl' ? `Wczoraj ${time}` : `Yesterday ${time}`;
  }

  if (diffDays < 7) {
    return lang === 'pl' ? `${diffDays} dni temu` : `${diffDays} days ago`;
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
