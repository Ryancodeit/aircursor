import { describe, it, expect, beforeEach } from 'vitest';
import { MotionController } from './MotionController.js';

describe('MotionController Unit Tests', () => {
  let controller: MotionController;

  beforeEach(() => {
    controller = new MotionController(20, 0.5, 0.05);
  });

  it('should instantiate with default filter settings', () => {
    expect(controller.filter.sensitivity).toBe(20);
    expect(controller.filter.alpha).toBe(0.5);
    expect(controller.filter.deadband).toBe(0.05);
  });

  it('should allow setting sensitivity and smoothing dynamically', () => {
    controller.setSensitivity(30);
    controller.setSmoothing(0.2);
    controller.setDeadZone(0.1);

    expect(controller.filter.sensitivity).toBe(30);
    expect(controller.filter.alpha).toBe(0.2);
    expect(controller.filter.deadband).toBe(0.1);
  });

  it('should manage movement callbacks cleanly', () => {
    let called = false;
    const unsub = controller.onMovement(() => {
      called = true;
    });

    controller.calibrate();
    expect(called).toBe(false);
    unsub();
  });
});
