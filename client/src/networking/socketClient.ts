import { WSMessage } from '@aircursor/shared';
import { INetworkTransport } from './INetworkTransport.js';

export type WSConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
export type WSMessageListener = (msg: WSMessage) => void;
export type WSStateListener = (state: WSConnectionState, attempt?: number) => void;

export class AirCursorSocketClient implements INetworkTransport {
  private ws: WebSocket | null = null;
  private messageListeners: Set<WSMessageListener> = new Set();
  private stateListeners: Set<WSStateListener> = new Set();
  private pingInterval: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isIntentionalDisconnect: boolean = false;
  private url: string;
  public state: WSConnectionState = 'DISCONNECTED';
  public latencyMs: number = 0;

  constructor(customUrl?: string) {
    if (customUrl) {
      this.url = customUrl;
    } else {
      const metaEnv = (import.meta as any).env;
      if (metaEnv && metaEnv.VITE_WS_URL) {
        this.url = metaEnv.VITE_WS_URL;
      } else {
        const loc = window.location;
        const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
        if (loc.port === '3000') {
          this.url = `${protocol}//${loc.hostname}:3001`;
        } else {
          this.url = `${protocol}//${loc.host}`;
        }
      }
    }
  }

  public connect(): Promise<void> {
    this.isIntentionalDisconnect = false;
    this.setState(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.setState('CONNECTED');
          this.startPingPong();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data);
            if (msg.type === 'pong') {
              this.latencyMs = Math.round((Date.now() - msg.timestamp) / 2);
            }
            this.messageListeners.forEach((listener) => listener(msg));
          } catch (e) {
            console.error('[AirCursorSocket] Error parsing WS payload:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[AirCursorSocket] Error:', err);
          if (this.state === 'CONNECTING') {
            this.setState('ERROR');
            reject(err);
          }
        };

        this.ws.onclose = () => {
          this.stopPingPong();
          if (!this.isIntentionalDisconnect) {
            this.handleAutoReconnect();
          } else {
            this.setState('DISCONNECTED');
          }
        };
      } catch (err) {
        this.setState('ERROR');
        reject(err);
      }
    });
  }

  private handleAutoReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
      this.setState('RECONNECTING', this.reconnectAttempts);

      this.reconnectTimer = window.setTimeout(() => {
        this.connect().catch(() => {});
      }, backoffMs);
    } else {
      this.setState('DISCONNECTED');
    }
  }

  private setState(newState: WSConnectionState, attempt?: number) {
    this.state = newState;
    this.stateListeners.forEach((listener) => listener(newState, attempt));
  }

  public addListener(listener: WSMessageListener) {
    return this.addMessageListener(listener);
  }

  public addMessageListener(listener: WSMessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public addStateListener(listener: WSStateListener) {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public createSession(deviceType: 'screen' | 'desktop' = 'screen') {
    this.send({ type: 'create_session', deviceType });
  }

  public joinSession(sessionCode: string) {
    this.send({ type: 'join_session', sessionCode });
  }

  public sendMotion(dx: number, dy: number) {
    this.send({ type: 'motion', dx, dy, timestamp: Date.now() });
  }

  public sendClick() {
    this.send({ type: 'click', timestamp: Date.now() });
  }

  public sendRightClick() {
    this.send({ type: 'right_click', timestamp: Date.now() });
  }

  public sendDoubleClick() {
    this.send({ type: 'double_click', timestamp: Date.now() });
  }

  public sendMouseDown(button: 'left' | 'right' | 'middle' = 'left') {
    this.send({ type: 'mouse_down', button, timestamp: Date.now() });
  }

  public sendMouseUp(button: 'left' | 'right' | 'middle' = 'left') {
    this.send({ type: 'mouse_up', button, timestamp: Date.now() });
  }

  public sendDragStart() {
    this.send({ type: 'drag_start', timestamp: Date.now() });
  }

  public sendDragEnd() {
    this.send({ type: 'drag_end', timestamp: Date.now() });
  }

  public sendCalibrate() {
    this.send({ type: 'calibrate', timestamp: Date.now() });
  }

  public sendEmergencyStop() {
    this.send({ type: 'emergency_stop', timestamp: Date.now() });
  }

  public sendScroll(dy: number) {
    this.send({ type: 'scroll', dy, timestamp: Date.now() });
  }

  public sendMediaCommand(command: any) {
    this.send({ type: 'media_command', command, timestamp: Date.now() });
  }

  public sendKeyboardInput(key: string, modifiers?: string[]) {
    this.send({ type: 'keyboard_input', key, modifiers, timestamp: Date.now() });
  }


  private startPingPong() {
    this.stopPingPong();
    this.pingInterval = window.setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, 2000);
  }

  private stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPingPong();
    if (this.ws) {
      this.send({ type: 'disconnect' });
      this.ws.close();
      this.ws = null;
    }
    this.setState('DISCONNECTED');
  }
}
