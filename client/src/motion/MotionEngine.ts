import { MotionFilter } from './Filter.js';
import { normalizeOrientation } from './OrientationNormalizer.js';

export type MotionListener = (dx: number, dy: number) => void;

export class MotionEngine {
  private lastYaw: number | null = null;
  private lastPitch: number | null = null;

  public filter: MotionFilter;
  private listeners: Set<MotionListener> = new Set();
  private isActive: boolean = false;
  private boundHandler: (e: DeviceOrientationEvent) => void;

  constructor(sensitivity = 22, smoothing = 0.35, deadZone = 0.08) {
    this.filter = new MotionFilter(deadZone, smoothing, sensitivity);
    this.boundHandler = this.handleDeviceOrientation.bind(this);
  }

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  public async requestPermission(): Promise<boolean> {
    if (!MotionEngine.isSupported()) return false;
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const status = await (DeviceOrientationEvent as any).requestPermission();
        return status === 'granted';
      } catch (err) {
        return false;
      }
    }
    return true;
  }

  public start(): boolean {
    if (!MotionEngine.isSupported() || this.isActive) return false;
    window.addEventListener('deviceorientation', this.boundHandler, true);
    this.isActive = true;
    return true;
  }

  public stop(): void {
    if (this.isActive && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.boundHandler, true);
      this.isActive = false;
    }
  }

  public calibrate(): void {
    this.filter.reset();
  }

  public reset(): void {
    this.lastYaw = null;
    this.lastPitch = null;
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

  public onMotion(listener: MotionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public processRawOrientation(
    rawAlpha: number,
    rawBeta: number,
    rawGamma: number,
    screenAngle: number = 0
  ): { dx: number; dy: number } {
    const { yaw, pitch } = normalizeOrientation(rawAlpha, rawBeta, rawGamma, screenAngle);

    if (this.lastYaw === null || this.lastPitch === null) {
      this.lastYaw = yaw;
      this.lastPitch = pitch;
      return { dx: 0, dy: 0 };
    }

    let deltaYaw = yaw - this.lastYaw;
    if (deltaYaw > 180) deltaYaw -= 360;
    if (deltaYaw < -180) deltaYaw += 360;

    const deltaPitch = pitch - this.lastPitch;

    this.lastYaw = yaw;
    this.lastPitch = pitch;

    const rawDx = deltaYaw;
    const rawDy = deltaPitch;

    const { deltaX, deltaY } = this.filter.process(rawDx, rawDy);

    if (deltaX !== 0 || deltaY !== 0) {
      this.listeners.forEach((listener) => listener(deltaX, deltaY));
    }

    return { dx: deltaX, dy: deltaY };
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;
    const screenAngle = typeof window !== 'undefined' && window.screen?.orientation?.angle ? window.screen.orientation.angle : 0;
    this.processRawOrientation(event.alpha, event.beta, event.gamma, screenAngle);
  }
}
