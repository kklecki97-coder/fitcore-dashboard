import { describe, it, expect } from 'vitest';
import { isValidUrl, validatePhoto } from '../validation';

describe('isValidUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidUrl('https://checkout.stripe.com/pay/123')).toBe(true);
  });

  it('accepts http URLs', () => {
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('rejects random text', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('rejects ftp URLs', () => {
    expect(isValidUrl('ftp://files.example.com')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isValidUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });
});

describe('validatePhoto', () => {
  const makeFile = (type: string, size: number) =>
    ({ type, size } as File);

  const maxSize = 10 * 1024 * 1024; // 10MB

  it('accepts valid JPEG', () => {
    expect(validatePhoto(makeFile('image/jpeg', 5000), maxSize)).toEqual({ valid: true });
  });

  it('accepts valid PNG', () => {
    expect(validatePhoto(makeFile('image/png', 5000), maxSize)).toEqual({ valid: true });
  });

  it('accepts valid WebP', () => {
    expect(validatePhoto(makeFile('image/webp', 5000), maxSize)).toEqual({ valid: true });
  });

  it('rejects invalid type', () => {
    expect(validatePhoto(makeFile('application/pdf', 5000), maxSize)).toEqual({ valid: false, reason: 'type' });
  });

  it('rejects GIF', () => {
    expect(validatePhoto(makeFile('image/gif', 5000), maxSize)).toEqual({ valid: false, reason: 'type' });
  });

  it('rejects files over max size', () => {
    expect(validatePhoto(makeFile('image/jpeg', maxSize + 1), maxSize)).toEqual({ valid: false, reason: 'size' });
  });

  it('accepts files at exactly max size', () => {
    expect(validatePhoto(makeFile('image/jpeg', maxSize), maxSize)).toEqual({ valid: true });
  });
});
