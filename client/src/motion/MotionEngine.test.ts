import { describe, it, expect, beforeEach } from 'vitest';
import { MotionEngine } from './MotionEngine.js';

describe('Section 50: Motion Algorithm Deterministic Tests', () => {
  let engine: MotionEngine;

  beforeEach(() => {
    engine = new MotionEngine(20, 0.5, 0.08);
  });

  it('Given reference yaw = 0 and current yaw = 5, expected horizontal movement should be positive', () => {
    engine.processRawOrientation(0, 0, 0); // reference
    const { dx } = engine.processRawOrientation(5, 0, 0); // rotated right (yaw = 5)
    expect(dx).toBeGreaterThan(0);
  });

  it('Given reference yaw = 0 and current yaw = -5, expected horizontal movement should be negative', () => {
    engine.processRawOrientation(0, 0, 0); // reference
    const { dx } = engine.processRawOrientation(355, 0, 0); // rotated left (-5 deg = 355 deg)
    expect(dx).toBeLessThan(0);
  });

  it('Test zero movement', () => {
    engine.processRawOrientation(90, 45, 0);
    const { dx, dy } = engine.processRawOrientation(90, 45, 0);
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });

  it('Test tiny movement below dead zone threshold (0.03 < 0.08)', () => {
    engine.processRawOrientation(100, 50, 0);
    const { dx, dy } = engine.processRawOrientation(100.03, 50.03, 0);
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });

  it('Test large movement scaling', () => {
    engine.processRawOrientation(0, 0, 0);
    const { dx, dy } = engine.processRawOrientation(15, 15, 0);
    expect(Math.abs(dx)).toBeGreaterThan(20);
    expect(Math.abs(dy)).toBeGreaterThan(20);
  });

  it('Test sensitivity changes dynamically', () => {
    engine.processRawOrientation(0, 0, 0);
    const resLow = engine.processRawOrientation(2, 0, 0);

    engine.reset();
    engine.setSensitivity(40);
    engine.processRawOrientation(0, 0, 0);
    const resHigh = engine.processRawOrientation(2, 0, 0);

    expect(resHigh.dx).toBeGreaterThan(resLow.dx);
  });

  it('Test smoothing filter adjustments', () => {
    engine.setSmoothing(0.1); // high smoothing
    engine.processRawOrientation(0, 0, 0);
    const resSmooth = engine.processRawOrientation(10, 0, 0);

    engine.reset();
    engine.setSmoothing(0.9); // low smoothing
    engine.processRawOrientation(0, 0, 0);
    const resDirect = engine.processRawOrientation(10, 0, 0);

    expect(resDirect.dx).toBeGreaterThan(resSmooth.dx);
  });

  it('Test calibration reset zeroing', () => {
    engine.processRawOrientation(90, 45, 0);
    engine.processRawOrientation(110, 65, 0);
    engine.calibrate();

    const { dx, dy } = engine.processRawOrientation(110, 65, 0);
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });
});
