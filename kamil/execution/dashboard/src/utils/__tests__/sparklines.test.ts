import { describe, it, expect } from 'vitest';
import { sparklinePoints } from '../sparklines';

describe('sparklinePoints', () => {
  it('returns empty string for less than 2 data points', () => {
    expect(sparklinePoints([])).toBe('');
    expect(sparklinePoints([5])).toBe('');
  });

  it('returns valid SVG points for 2 data points', () => {
    const result = sparklinePoints([0, 10], 28, 100);
    expect(result).toContain(',');
    const points = result.split(' ');
    expect(points).toHaveLength(2);
  });

  it('first point starts at x=0', () => {
    const result = sparklinePoints([5, 10, 15], 28, 100);
    const firstPoint = result.split(' ')[0];
    expect(firstPoint.startsWith('0,')).toBe(true);
  });

  it('last point ends at x=width', () => {
    const result = sparklinePoints([5, 10, 15], 28, 100);
    const points = result.split(' ');
    const lastPoint = points[points.length - 1];
    expect(lastPoint.startsWith('100,')).toBe(true);
  });

  it('handles flat data (all same values)', () => {
    const result = sparklinePoints([5, 5, 5, 5], 28, 100);
    expect(result).toBeTruthy();
    // All y values should be the same
    const points = result.split(' ');
    const yValues = points.map(p => parseFloat(p.split(',')[1]));
    expect(new Set(yValues).size).toBe(1);
  });

  it('min value maps to bottom, max to top', () => {
    const result = sparklinePoints([0, 100], 28, 100);
    const points = result.split(' ');
    const y0 = parseFloat(points[0].split(',')[1]);
    const y1 = parseFloat(points[1].split(',')[1]);
    // y0 should be larger (lower on screen = bottom) since value is 0
    // y1 should be smaller (higher on screen = top) since value is 100
    expect(y0).toBeGreaterThan(y1);
  });
});
