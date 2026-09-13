import { MotionFilter } from './Filter.js';

export class MotionProcessor {
  private calibAlpha: number | null = null;
  private calibBeta: number | null = null;
  private lastAlpha: number | null = null;
  private lastBeta: number | null = null;

  public filter: MotionFilter;

  constructor(sensitivity = 18, smoothing = 0.35, deadband = 0.08) {
    this.filter = new MotionFilter(deadband, smoothing, sensitivity);
  }

  public calibrate(alpha: number, beta: number) {
    this.calibAlpha = alpha;
    this.calibBeta = beta;
    this.lastAlpha = alpha;
    this.lastBeta = beta;
    this.filter.reset();
  }

  public processOrientation(
    alpha: number,
    beta: number,
    _gamma: number
  ): { deltaX: number; deltaY: number } | null {
    if (this.calibAlpha === null || this.calibBeta === null) {
      this.calibrate(alpha, beta);
      return { deltaX: 0, deltaY: 0 };
    }

    if (this.lastAlpha === null || this.lastBeta === null) {
      this.lastAlpha = alpha;
      this.lastBeta = beta;
      return { deltaX: 0, deltaY: 0 };
    }

    // Delta since last frame for incremental relative pointer motion
    let rawDeltaAlpha = alpha - this.lastAlpha;
    // Handle 0/360 boundary rollover
    if (rawDeltaAlpha > 180) rawDeltaAlpha -= 360;
    if (rawDeltaAlpha < -180) rawDeltaAlpha += 360;

    const rawDeltaBeta = beta - this.lastBeta;

    this.lastAlpha = alpha;
    this.lastBeta = beta;

    // Horizontal movement corresponds to Yaw (Alpha change)
    // Vertical movement corresponds to Pitch (Beta change)
    // Note: Turning left increases alpha on standard sensors, so -rawDeltaAlpha is X right
    const rawDeltaX = -rawDeltaAlpha;
    const rawDeltaY = -rawDeltaBeta;

    return this.filter.process(rawDeltaX, rawDeltaY);
  }
}
