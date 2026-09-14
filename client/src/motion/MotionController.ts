import { MotionFilter } from './Filter.js';

export type MovementCallback = (dx: number, dy: number) => void;

export class MotionController {
  private lastAlpha: number | null = null;
  private lastBeta: number | null = null;

  public filter: MotionFilter;
  private callbacks: Set<MovementCallback> = new Set();
  private isListening: boolean = false;
  private boundOrientationHandler: (e: DeviceOrientationEvent) => void;

  constructor(sensitivity = 22, smoothing = 0.35, deadZone = 0.08) {
    this.filter = new MotionFilter(deadZone, smoothing, sensitivity);
    this.boundOrientationHandler = this.handleOrientation.bind(this);
  }

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  public async start(): Promise<boolean> {
    if (!MotionController.isSupported()) {
      return false;
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response !== 'granted') {
          return false;
        }
      } catch (err) {
        console.error('[MotionController] Permission request error:', err);
        return false;
      }
    }

    if (!this.isListening) {
      window.addEventListener('deviceorientation', this.boundOrientationHandler, true);
      this.isListening = true;
    }
    return true;
  }

  public stop(): void {
    if (this.isListening && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.boundOrientationHandler, true);
      this.isListening = false;
    }
  }

  public calibrate(): void {
    this.filter.reset();
  }

  public setSensitivity(value: number): void {
    this.filter.sensitivity = value;
  }

  public setSmoothing(value: number): void {
    this.filter.alpha = value;
    this.filter.adaptiveSmoothing = false;
  }

  public setDeadZone(value: number): void {
    this.filter.deadband = value;
  }

  public setInvertX(value: boolean): void {
    this.filter.invertX = value;
  }

  public setInvertY(value: boolean): void {
    this.filter.invertY = value;
  }

  public setAdaptiveSmoothing(value: boolean): void {
    this.filter.adaptiveSmoothing = value;
  }

  public onMovement(callback: MovementCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private handleOrientation(event: DeviceOrientationEvent): void {
    if (event.alpha === null || event.beta === null) return;

    const alpha = event.alpha;
    const beta = event.beta;

    if (this.lastAlpha === null || this.lastBeta === null) {
      this.lastAlpha = alpha;
      this.lastBeta = beta;
      return;
    }

    let deltaAlpha = alpha - this.lastAlpha;
    if (deltaAlpha > 180) deltaAlpha -= 360;
    if (deltaAlpha < -180) deltaAlpha += 360;

    const deltaBeta = beta - this.lastBeta;

    this.lastAlpha = alpha;
    this.lastBeta = beta;

    const rawDx = -deltaAlpha;
    const rawDy = -deltaBeta;

    const { deltaX, deltaY } = this.filter.process(rawDx, rawDy);

    if (deltaX !== 0 || deltaY !== 0) {
      this.callbacks.forEach((cb) => cb(deltaX, deltaY));
    }
  }
}
