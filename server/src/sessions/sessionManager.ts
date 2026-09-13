import { WebSocket } from 'ws';
import crypto from 'crypto';

export interface RoomState {
  roomId: string;
  pairCode: string;
  screenSocket: WebSocket | null;
  controllerSocket: WebSocket | null;
  createdAt: number;
  lastActivity: number;
  targetMetadata?: {
    userAgent?: string;
    ip?: string;
  };
  controllerMetadata?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface ISessionStore {
  createRoom(
    screenSocket: WebSocket,
    metadata?: { userAgent?: string; ip?: string }
  ): { roomId: string; pairCode: string };
  joinRoom(
    controllerSocket: WebSocket,
    roomIdOrCode: string,
    metadata?: { userAgent?: string; ip?: string }
  ): { success: boolean; room?: RoomState; error?: string };
  touchActivity(socket: WebSocket): void;
  getRoomBySocket(socket: WebSocket): { room: RoomState; role: 'screen' | 'controller' } | null;
  handleDisconnect(socket: WebSocket): { room: RoomState | null; role: 'screen' | 'controller' | null };
  cleanupStaleRooms(maxInactivityMs?: number): void;
}

export class SessionManager implements ISessionStore {
  private roomsByRoomId: Map<string, RoomState> = new Map();
  private roomsByPairCode: Map<string, RoomState> = new Map();
  private socketToRoom: Map<WebSocket, { roomId: string; role: 'screen' | 'controller' }> = new Map();

  /**
   * Cryptographically secure 6-character code generator
   * Excludes ambiguous characters: 0, O, 1, I, 5, S
   */
  private generatePairCode(): string {
    const chars = '2346789ABCDEFGHJKMNPQRTUVWXY'; // 28 unambiguous chars
    const bytes = crypto.randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
  }

  private generateRoomId(): string {
    return 'session_' + crypto.randomBytes(8).toString('hex');
  }

  public createRoom(
    screenSocket: WebSocket,
    metadata?: { userAgent?: string; ip?: string }
  ): { roomId: string; pairCode: string } {
    let pairCode = this.generatePairCode();
    // Ensure uniqueness
    let attempts = 0;
    while (this.roomsByPairCode.has(pairCode) && attempts < 100) {
      pairCode = this.generatePairCode();
      attempts++;
    }

    const roomId = this.generateRoomId();
    const room: RoomState = {
      roomId,
      pairCode,
      screenSocket,
      controllerSocket: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      targetMetadata: metadata,
    };

    this.roomsByRoomId.set(roomId, room);
    this.roomsByPairCode.set(pairCode, room);
    this.socketToRoom.set(screenSocket, { roomId, role: 'screen' });

    return { roomId, pairCode };
  }

  public joinRoom(
    controllerSocket: WebSocket,
    roomIdOrCode: string,
    metadata?: { userAgent?: string; ip?: string }
  ): { success: boolean; room?: RoomState; error?: string } {
    const searchKey = roomIdOrCode.trim().toUpperCase();
    const room = this.roomsByRoomId.get(searchKey) || this.roomsByPairCode.get(searchKey);

    if (!room) {
      return { success: false, error: 'Invalid pairing code or session ID. Please check and try again.' };
    }

    if (!room.screenSocket || room.screenSocket.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'Target screen is no longer connected.' };
    }

    // Reject if session already has an active controller connected (1 target : 1 controller limit)
    if (room.controllerSocket && room.controllerSocket.readyState === WebSocket.OPEN) {
      return { success: false, error: 'This session already has an active controller connected.' };
    }

    // Attach controller socket
    room.controllerSocket = controllerSocket;
    room.controllerMetadata = metadata;
    room.lastActivity = Date.now();
    this.socketToRoom.set(controllerSocket, { roomId: room.roomId, role: 'controller' });

    return { success: true, room };
  }

  public touchActivity(socket: WebSocket) {
    const entry = this.socketToRoom.get(socket);
    if (entry) {
      const room = this.roomsByRoomId.get(entry.roomId);
      if (room) {
        room.lastActivity = Date.now();
      }
    }
  }

  public getRoomBySocket(socket: WebSocket): { room: RoomState; role: 'screen' | 'controller' } | null {
    const entry = this.socketToRoom.get(socket);
    if (!entry) return null;
    const room = this.roomsByRoomId.get(entry.roomId);
    if (!room) return null;
    return { room, role: entry.role };
  }

  public handleDisconnect(socket: WebSocket): { room: RoomState | null; role: 'screen' | 'controller' | null } {
    const info = this.socketToRoom.get(socket);
    if (!info) return { room: null, role: null };

    const { roomId, role } = info;
    const room = this.roomsByRoomId.get(roomId);
    this.socketToRoom.delete(socket);

    if (room) {
      if (role === 'screen') {
        room.screenSocket = null;
        if (!room.controllerSocket) {
          this.removeRoom(room);
        }
      } else if (role === 'controller') {
        room.controllerSocket = null;
      }
    }

    return { room: room || null, role };
  }

  private removeRoom(room: RoomState) {
    this.roomsByRoomId.delete(room.roomId);
    this.roomsByPairCode.delete(room.pairCode);
  }

  /**
   * Auto-expire inactive sessions after 15 minutes of inactivity (15 * 60 * 1000 ms)
   */
  public cleanupStaleRooms(maxInactivityMs: number = 15 * 60 * 1000) {
    const now = Date.now();
    for (const [roomId, room] of this.roomsByRoomId.entries()) {
      if (now - room.lastActivity > maxInactivityMs) {
        if (room.screenSocket) {
          try { room.screenSocket.close(4000, 'Session expired due to inactivity'); } catch {}
          this.socketToRoom.delete(room.screenSocket);
        }
        if (room.controllerSocket) {
          try { room.controllerSocket.close(4000, 'Session expired due to inactivity'); } catch {}
          this.socketToRoom.delete(room.controllerSocket);
        }
        this.roomsByRoomId.delete(roomId);
        this.roomsByPairCode.delete(room.pairCode);
      }
    }
  }
}
