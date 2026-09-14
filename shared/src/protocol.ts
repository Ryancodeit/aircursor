import { MediaCommand } from './types.js';

export type DeviceType = 'screen' | 'desktop';

export type ClientMessageType =
  | 'create_session'
  | 'join_session'
  | 'motion'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'mouse_down'
  | 'mouse_up'
  | 'drag_start'
  | 'drag_end'
  | 'scroll'
  | 'calibrate'
  | 'emergency_stop'
  | 'media_command'
  | 'keyboard_input'
  | 'ping'
  | 'disconnect';

export type ServerMessageType =
  | 'session_created'
  | 'session_joined'
  | 'controller_connected'
  | 'controller_disconnected'
  | 'motion'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'mouse_down'
  | 'mouse_up'
  | 'drag_start'
  | 'drag_end'
  | 'scroll'
  | 'calibrate'
  | 'emergency_stop'
  | 'media_command'
  | 'keyboard_input'
  | 'error'
  | 'pong';


export interface CreateSessionMessage {
  type: 'create_session';
  deviceType?: DeviceType;
}

export interface SessionCreatedMessage {
  type: 'session_created';
  sessionId: string;
  pairingCode: string;
  deviceType?: DeviceType;
}

export interface JoinSessionMessage {
  type: 'join_session';
  sessionCode: string;
}

export interface SessionJoinedMessage {
  type: 'session_joined';
  sessionId: string;
  targetDeviceType?: DeviceType;
}

export interface ControllerConnectedMessage {
  type: 'controller_connected';
  controllerMetadata?: {
    userAgent?: string;
  };
}

export interface ControllerDisconnectedMessage {
  type: 'controller_disconnected';
}

export interface MotionMessage {
  type: 'motion';
  dx: number;
  dy: number;
  timestamp: number;
}

export interface ClickMessage {
  type: 'click';
  timestamp: number;
}

export interface DoubleClickMessage {
  type: 'double_click';
  timestamp: number;
}

export interface RightClickMessage {
  type: 'right_click';
  timestamp: number;
}

export interface MouseDownMessage {
  type: 'mouse_down';
  button: 'left' | 'right' | 'middle';
  timestamp: number;
}

export interface MouseUpMessage {
  type: 'mouse_up';
  button: 'left' | 'right' | 'middle';
  timestamp: number;
}

export interface DragStartMessage {
  type: 'drag_start';
  timestamp: number;
}

export interface DragEndMessage {
  type: 'drag_end';
  timestamp: number;
}

export interface ScrollMessage {
  type: 'scroll';
  dy: number;
  timestamp: number;
}

export interface CalibrateMessage {
  type: 'calibrate';
  timestamp: number;
}

export interface EmergencyStopMessage {
  type: 'emergency_stop';
  timestamp: number;
}

export interface MediaCommandMessage {
  type: 'media_command';
  command: MediaCommand;
  timestamp: number;
}

export interface KeyboardInputMessage {
  type: 'keyboard_input';
  key: string;
  modifiers?: string[];
  timestamp: number;
}

export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
  serverTime: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface DisconnectMessage {
  type: 'disconnect';
}

export type WSMessage =
  | CreateSessionMessage
  | SessionCreatedMessage
  | JoinSessionMessage
  | SessionJoinedMessage
  | ControllerConnectedMessage
  | ControllerDisconnectedMessage
  | MotionMessage
  | ClickMessage
  | DoubleClickMessage
  | RightClickMessage
  | MouseDownMessage
  | MouseUpMessage
  | DragStartMessage
  | DragEndMessage
  | ScrollMessage
  | CalibrateMessage
  | EmergencyStopMessage
  | MediaCommandMessage
  | KeyboardInputMessage
  | PingMessage
  | PongMessage
  | ErrorMessage
  | DisconnectMessage;

