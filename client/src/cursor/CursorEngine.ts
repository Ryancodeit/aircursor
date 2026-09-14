export interface CursorConfig {
  sensitivity: number;
  acceleration: number;
  maxVelocity: number;
  deadZone: number;
  smoothing: number;
}

export const DEFAULT_CURSOR_CONFIG: CursorConfig = {
  sensitivity: 22,
  acceleration: 1.15,
  maxVelocity: 60,
  deadZone: 0.08,
  smoothing: 0.35,
};

export class CursorEngine {
  private x: number;
  private y: number;
  private viewportWidth: number;
  private viewportHeight: number;
  private pendingDx: number = 0;
  private pendingDy: number = 0;
  private animFrameId: number | null = null;
  private cursorElement: HTMLElement | null = null;
  public config: CursorConfig;
  private isRunning: boolean = false;

  constructor(initialX?: number, initialY?: number, config: Partial<CursorConfig> = {}) {
    this.viewportWidth = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1920;
    this.viewportHeight = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 1080;
    this.x = initialX ?? this.viewportWidth / 2;
    this.y = initialY ?? this.viewportHeight / 2;
    this.config = { ...DEFAULT_CURSOR_CONFIG, ...config };
  }

  public attachElement(el: HTMLElement | null) {
    this.cursorElement = el;
    this.updateElementTransform();
  }

  public move(dx: number, dy: number) {
    if (isNaN(dx) || isNaN(dy)) return;
    this.addMotionDelta(dx, dy);
  }

  public addMotionDelta(dx: number, dy: number) {
    if (isNaN(dx) || isNaN(dy)) return;
    this.pendingDx += dx;
    this.pendingDy += dy;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public setPosition(x: number, y: number) {
    const safeX = isNaN(x) ? this.viewportWidth / 2 : x;
    const safeY = isNaN(y) ? this.viewportHeight / 2 : y;
    this.x = Math.min(Math.max(10, safeX), this.viewportWidth - 10);
    this.y = Math.min(Math.max(10, safeY), this.viewportHeight - 10);
    this.updateElementTransform();
  }

  public reset() {
    this.pendingDx = 0;
    this.pendingDy = 0;
    this.setPosition(this.viewportWidth / 2, this.viewportHeight / 2);
  }

  public resize(width: number, height: number) {
    this.viewportWidth = width || 1920;
    this.viewportHeight = height || 1080;
    this.setPosition(this.x, this.y);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    let lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const renderLoop = (timestamp: number) => {
      if (!this.isRunning) return;

      const currentTime = timestamp || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const dt = Math.min(0.05, Math.max(0.001, (currentTime - lastTime) / 1000));
      lastTime = currentTime;

      if (this.pendingDx !== 0 || this.pendingDy !== 0) {
        // Frame-rate independent scaling (normalized to 60fps baseline ~ 16.67ms)
        const frameScale = dt / 0.01667;
        const stepDx = Math.sign(this.pendingDx) * Math.min(Math.abs(this.pendingDx) * frameScale, this.config.maxVelocity * frameScale);
        const stepDy = Math.sign(this.pendingDy) * Math.min(Math.abs(this.pendingDy) * frameScale, this.config.maxVelocity * frameScale);

        if (!isNaN(stepDx) && !isNaN(stepDy)) {
          this.x = Math.min(Math.max(10, this.x + stepDx), this.viewportWidth - 10);
          this.y = Math.min(Math.max(10, this.y + stepDy), this.viewportHeight - 10);
        }

        this.pendingDx = 0;
        this.pendingDy = 0;

        this.updateElementTransform();
      }

      this.animFrameId = requestAnimationFrame(renderLoop);
    };

    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateElementTransform() {
    if (this.cursorElement) {
      this.cursorElement.style.transform = `translate3d(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px, 0)`;
    }
  }
}
