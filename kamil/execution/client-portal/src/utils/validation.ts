/**
 * Validate that a URL has a valid http(s) protocol.
 * Used to check Stripe payment URLs before redirecting.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Validate a photo file for type and size.
 */
export function validatePhoto(file: File, maxSizeBytes: number): { valid: boolean; reason?: 'type' | 'size' } {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { valid: false, reason: 'type' };
  }
  if (file.size > maxSizeBytes) {
    return { valid: false, reason: 'size' };
  }
  return { valid: true };
}
