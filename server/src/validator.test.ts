import { describe, it, expect } from 'vitest';
import { validateIncomingWSMessage, isRateLimited } from './protocol/validator.js';

describe('Security Validator Unit Tests', () => {
  it('should validate correct motion payload', () => {
    const raw = JSON.stringify({ type: 'motion', dx: 12.5, dy: -8.2, timestamp: Date.now() });
    const result = validateIncomingWSMessage(raw);
    expect(result.valid).toBe(true);
    expect((result.message as any).dx).toBe(12.5);
  });

  it('should reject malformed or invalid type payload', () => {
    const raw = JSON.stringify({ type: 'hack_attack' });
    const result = validateIncomingWSMessage(raw);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid message type');
  });

  it('should reject payload exceeding size limit', () => {
    const huge = JSON.stringify({ type: 'motion', dx: 0, dy: 0, extra: 'a'.repeat(5000) });
    const result = validateIncomingWSMessage(huge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('size exceeds 4KB limit');
  });

  it('should rate limit repeated requests per IP', () => {
    const testIp = '192.168.1.99';
    let limited = false;
    for (let i = 0; i < 45; i++) {
      if (isRateLimited(testIp, 40)) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
