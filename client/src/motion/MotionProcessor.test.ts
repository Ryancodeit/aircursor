import { describe, it, expect, beforeEach } from 'vitest';
import { MotionProcessor } from './MotionProcessor.js';
import { MotionFilter } from './Filter.js';

describe('MotionFilter Unit Tests', () => {
  let filter: MotionFilter;

  beforeEach(() => {
    filter = new MotionFilter(0.1, 0.5, 10);
  });

  it('should ignore input below deadband threshold', () => {
    const result = filter.process(0.05, -0.05);
    expect(result.deltaX).toBe(0);
    expect(result.deltaY).toBe(0);
  });

  it('should apply exponential smoothing and gain curve for movement above deadband', () => {
    const result1 = filter.process(2.0, 1.0);
    expect(result1.deltaX).toBeGreaterThan(0);
    expect(result1.deltaY).toBeGreaterThan(0);
  });

  it('should damp velocity accumulator instantly when phone becomes stationary', () => {
    filter.process(3.0, 3.0); // fast motion
    const stopped = filter.process(0, 0); // phone stops moving
    expect(stopped.deltaX).toBe(0);
    expect(stopped.deltaY).toBe(0);
  });

  it('should handle invertX and invertY options correctly', () => {
    filter.invertX = true;
    filter.invertY = true;
    const res = filter.process(2.0, 2.0);
    expect(res.deltaX).toBeLessThan(0);
    expect(res.deltaY).toBeLessThan(0);
  });

  it('should dynamically adapt alpha on fast vs slow movement', () => {
    filter.adaptiveSmoothing = true;
    const slowRes = filter.process(0.2, 0.2);
    filter.reset();
    const fastRes = filter.process(4.0, 4.0);
    expect(Math.abs(fastRes.deltaX)).toBeGreaterThan(Math.abs(slowRes.deltaX));
  });
});

describe('MotionProcessor Unit Tests', () => {
  let processor: MotionProcessor;

  beforeEach(() => {
    processor = new MotionProcessor(15, 0.5, 0.05);
  });

  it('should set origin on initial calibration', () => {
    const res = processor.processOrientation(90, 45, 0);
    expect(res).toEqual({ deltaX: 0, deltaY: 0 });
  });

  it('should calculate delta vector on orientation change', () => {
    processor.processOrientation(90, 45, 0); // initial
    const res = processor.processOrientation(92, 47, 0); // rotated
    expect(res?.deltaX).not.toBe(0);
    expect(res?.deltaY).not.toBe(0);
  });
});
