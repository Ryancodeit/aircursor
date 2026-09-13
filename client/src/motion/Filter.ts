export class MotionFilter {
  private prevX: number = 0;
  private prevY: number = 0;
  public deadband: number = 0.08; // degrees threshold
  public alpha: number = 0.35;    // smoothing factor (0 = static, 1 = raw instant)
  public sensitivity: number = 18; // gain multiplier

  constructor(deadband: number = 0.08, alpha: number = 0.35, sensitivity: number = 18) {
    this.deadband = deadband;
    this.alpha = alpha;
    this.sensitivity = sensitivity;
  }

  public process(rawDeltaX: number, rawDeltaY: number): { deltaX: number; deltaY: number } {
    // 1. Deadband filter
    const dx = Math.abs(rawDeltaX) < this.deadband ? 0 : rawDeltaX;
    const dy = Math.abs(rawDeltaY) < this.deadband ? 0 : rawDeltaY;

    // 2. Exponential Moving Average
    const smoothX = this.alpha * dx + (1 - this.alpha) * this.prevX;
    const smoothY = this.alpha * dy + (1 - this.alpha) * this.prevY;

    this.prevX = smoothX;
    this.prevY = smoothY;

    // 3. Gain & Velocity curve
    const finalX = Math.sign(smoothX) * Math.pow(Math.abs(smoothX), 1.15) * this.sensitivity;
    const finalY = Math.sign(smoothY) * Math.pow(Math.abs(smoothY), 1.15) * this.sensitivity;

    return { deltaX: finalX, deltaY: finalY };
  }

  public reset() {
    this.prevX = 0;
    this.prevY = 0;
  }
}
