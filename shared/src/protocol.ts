export type ClientMessageType =
  | 'create_session'
  | 'join_session'
  | 'motion'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'scroll'
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
  | 'scroll'
  | 'error'
  | 'pong';

export interface CreateSessionMessage {
  type: 'create_session';
}

export interface SessionCreatedMessage {
  type: 'session_created';
  sessionId: string;
  pairingCode: string;
}

export interface JoinSessionMessage {
  type: 'join_session';
  sessionCode: string;
}

export interface SessionJoinedMessage {
  type: 'session_joined';
  sessionId: string;
}

export interface ControllerConnectedMessage {
  type: 'controller_connected';
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

export interface ScrollMessage {
  type: 'scroll';
  dy: number;
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
  | ScrollMessage
  | PingMessage
  | PongMessage
  | ErrorMessage
  | DisconnectMessage;
