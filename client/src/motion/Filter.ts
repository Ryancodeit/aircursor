export class MotionFilter {
  private prevX: number = 0;
  private prevY: number = 0;
  public deadband: number = 0.08; // degrees threshold
  public alpha: number = 0.35;    // fallback smoothing factor (0 = static, 1 = raw instant)
  public minAlpha: number = 0.15; // static/micro-movement smoothing factor
  public maxAlpha: number = 0.85; // fast-movement smoothing factor
  public sensitivity: number = 18; // gain multiplier
  public invertX: boolean = false;
  public invertY: boolean = false;
  public adaptiveSmoothing: boolean = true;

  constructor(
    deadband: number = 0.08,
    alpha: number = 0.35,
    sensitivity: number = 18,
    invertX: boolean = false,
    invertY: boolean = false
  ) {
    this.deadband = deadband;
    this.alpha = alpha;
    this.sensitivity = sensitivity;
    this.invertX = invertX;
    this.invertY = invertY;
  }

  public process(rawDeltaX: number, rawDeltaY: number): { deltaX: number; deltaY: number } {
    // 0. Inversion handling
    const rx = this.invertX ? -rawDeltaX : rawDeltaX;
    const ry = this.invertY ? -rawDeltaY : rawDeltaY;

    // 1. Deadband filter
    const dx = Math.abs(rx) < this.deadband ? 0 : rx;
    const dy = Math.abs(ry) < this.deadband ? 0 : ry;

    // 2. Instant Stop Damping when input drops to 0
    if (dx === 0 && dy === 0) {
      this.prevX *= 0.3;
      this.prevY *= 0.3;
      if (Math.abs(this.prevX) < 0.001) this.prevX = 0;
      if (Math.abs(this.prevY) < 0.001) this.prevY = 0;
      return { deltaX: 0, deltaY: 0 };
    }

    // 3. Adaptive EMA Alpha Calculation
    let currentAlpha = this.alpha;
    if (this.adaptiveSmoothing) {
      const speed = Math.sqrt(dx * dx + dy * dy);
      const normalizedSpeed = Math.min(1.0, Math.max(0, (speed - this.deadband) / 0.6));
      currentAlpha = this.minAlpha + (this.maxAlpha - this.minAlpha) * Math.pow(normalizedSpeed, 1.5);
    }

    // 4. Exponential Moving Average Filter
    const smoothX = currentAlpha * dx + (1 - currentAlpha) * this.prevX;
    const smoothY = currentAlpha * dy + (1 - currentAlpha) * this.prevY;

    this.prevX = smoothX;
    this.prevY = smoothY;

    // 5. Gain & Velocity Acceleration Curve
    const finalX = Math.sign(smoothX) * Math.pow(Math.abs(smoothX), 1.15) * this.sensitivity;
    const finalY = Math.sign(smoothY) * Math.pow(Math.abs(smoothY), 1.15) * this.sensitivity;

    return { deltaX: finalX, deltaY: finalY };
  }

  public reset() {
    this.prevX = 0;
    this.prevY = 0;
  }
}

