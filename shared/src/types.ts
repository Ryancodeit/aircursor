export type ClientRole = 'screen' | 'controller';

export type SessionStatus = 'idle' | 'waiting_for_controller' | 'connected' | 'disconnected' | 'error';

export interface RoomSession {
  roomId: string;
  pairCode: string;
  createdAt: number;
  screenConnected: boolean;
  controllerConnected: boolean;
}

export interface OrientationData {
  alpha: number; // Yaw 0..360
  beta: number;  // Pitch -180..180
  gamma: number; // Roll -90..90
  timestamp: number;
}

export interface MotionDataPayload {
  deltaX: number;
  deltaY: number;
  rawAlpha?: number;
  rawBeta?: number;
  rawGamma?: number;
  timestamp: number;
}

export type ActionType =
  | 'click_down'
  | 'click_up'
  | 'click'
  | 'right_click'
  | 'double_click'
  | 'scroll'
  | 'calibrate'
  | 'laser_toggle'
  | 'mode_change';

export interface CursorActionPayload {
  type: ActionType;
  deltaY?: number; // for scroll
  mode?: 'cursor' | 'laser' | 'presentation';
  timestamp: number;
}

export interface LatencyData {
  pingMs: number;
  lastPong: number;
}
