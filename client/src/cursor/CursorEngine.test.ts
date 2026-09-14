import { describe, it, expect, beforeEach } from 'vitest';
import { CursorEngine } from './CursorEngine.js';

describe('Section 51: CursorEngine API Unit Tests', () => {
  let engine: CursorEngine;

  beforeEach(() => {
    engine = new CursorEngine(500, 400);
  });

  it('should initialize at specified coordinates via getPosition()', () => {
    expect(engine.getPosition()).toEqual({ x: 500, y: 400 });
  });

  it('should update position on setPosition() and clamp within boundaries', () => {
    engine.setPosition(350, 420);
    expect(engine.getPosition()).toEqual({ x: 350, y: 420 });

    engine.setPosition(-100, -200);
    expect(engine.getPosition().x).toBeGreaterThanOrEqual(10);
    expect(engine.getPosition().y).toBeGreaterThanOrEqual(10);
  });

  it('should accumulate move(dx, dy) deltas', () => {
    engine.move(15, -10);
    expect(engine.getPosition()).toEqual({ x: 500, y: 400 });
  });

  it('should reset position and pending deltas on reset()', () => {
    engine.setPosition(100, 100);
    engine.move(50, 50);
    engine.reset();
    expect(engine.getPosition()).toEqual({ x: 960, y: 540 });
  });

  it('should resize viewport dimensions and re-clamp on resize(w, h)', () => {
    engine.setPosition(1000, 800);
    engine.resize(800, 600);
    expect(engine.getPosition().x).toBeLessThanOrEqual(790);
    expect(engine.getPosition().y).toBeLessThanOrEqual(590);
  });

  it('should ignore NaN values gracefully in move and setPosition', () => {
    const initialPos = engine.getPosition();
    engine.move(NaN, 10);
    expect(engine.getPosition()).toEqual(initialPos);

    engine.setPosition(NaN, NaN);
    expect(isNaN(engine.getPosition().x)).toBe(false);
    expect(isNaN(engine.getPosition().y)).toBe(false);
  });
});
