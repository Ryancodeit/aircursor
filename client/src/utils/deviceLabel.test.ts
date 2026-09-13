import { describe, it, expect } from 'vitest';
import { getFriendlyDeviceLabel } from './deviceLabel.js';

describe('deviceLabel Unit Tests', () => {
  it('should return default fallback labels when navigator is undefined', () => {
    expect(getFriendlyDeviceLabel('controller')).toBeDefined();
    expect(getFriendlyDeviceLabel('screen')).toBeDefined();
  });
});
