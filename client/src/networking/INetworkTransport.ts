import { WSMessage } from '@aircursor/shared';
import { WSConnectionState, WSMessageListener, WSStateListener } from './socketClient.js';

export interface INetworkTransport {
  state: WSConnectionState;
  latencyMs: number;
  connect(): Promise<void>;
  disconnect(): void;
  send(msg: WSMessage): void;
  createSession(): void;
  joinSession(sessionCode: string): void;
  sendMotion(dx: number, dy: number): void;
  sendClick(): void;
  sendRightClick(): void;
  sendDoubleClick(): void;
  sendScroll(dy: number): void;
  addListener(listener: WSMessageListener): () => void;
  addMessageListener(listener: WSMessageListener): () => void;
  addStateListener(listener: WSStateListener): () => void;
}
