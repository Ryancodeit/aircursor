import { describe, it, expect } from 'vitest';
import { normalizeOrientation } from './OrientationNormalizer.js';

describe('OrientationNormalizer Unit Tests', () => {
  it('should return un-modified pitch and roll when screen angle is 0', () => {
    const res = normalizeOrientation(90, 45, 10, 0);
    expect(res.yaw).toBe(90);
    expect(res.pitch).toBeCloseTo(45);
    expect(res.roll).toBeCloseTo(10);
  });

  it('should remap axes when device is held in landscape (angle = 90)', () => {
    const res = normalizeOrientation(90, 45, 10, 90);
    expect(res.yaw).toBe(90);
    expect(res.pitch).toBeCloseTo(-10);
    expect(res.roll).toBeCloseTo(45);
  });
});
