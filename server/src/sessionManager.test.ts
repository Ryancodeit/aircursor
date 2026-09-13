import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './sessions/sessionManager.js';
import { WebSocket } from 'ws';

class MockWebSocket {
  public readyState: number = 1;
  public sentMessages: string[] = [];
  send(data: string) {
    this.sentMessages.push(data);
  }
  close() {
    this.readyState = 3;
  }
}

describe('SessionManager Unit Tests', () => {
  let sessionManager: SessionManager;
  let mockScreenSocket: WebSocket;
  let mockControllerSocket: WebSocket;

  beforeEach(() => {
    sessionManager = new SessionManager();
    mockScreenSocket = new MockWebSocket() as unknown as WebSocket;
    mockControllerSocket = new MockWebSocket() as unknown as WebSocket;
  });

  it('should create a room with unambiguous 6-character pair code excluding 0, O, 1, I, 5, S', () => {
    const { roomId, pairCode } = sessionManager.createRoom(mockScreenSocket);
    expect(roomId).toMatch(/^(session|room)_/);
    expect(pairCode).toHaveLength(6);
    expect(pairCode).not.toMatch(/[0O1I5S]/);
  });

  it('should allow controller to join via pair code', () => {
    const { roomId, pairCode } = sessionManager.createRoom(mockScreenSocket);
    const result = sessionManager.joinRoom(mockControllerSocket, pairCode);

    expect(result.success).toBe(true);
    expect(result.room?.roomId).toBe(roomId);
    expect(result.room?.controllerSocket).toBe(mockControllerSocket);
  });

  it('should reject secondary controller join to enforce 1 target : 1 controller limit', () => {
    const { pairCode } = sessionManager.createRoom(mockScreenSocket);
    sessionManager.joinRoom(mockControllerSocket, pairCode);

    const secondControllerSocket = new MockWebSocket() as unknown as WebSocket;
    const result = sessionManager.joinRoom(secondControllerSocket, pairCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already has an active controller connected');
  });

  it('should fail joining with invalid pair code', () => {
    sessionManager.createRoom(mockScreenSocket);
    const result = sessionManager.joinRoom(mockControllerSocket, 'INVALID');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid pairing code');
  });

  it('should expire inactive sessions after maxInactivityMs', () => {
    const { pairCode } = sessionManager.createRoom(mockScreenSocket);
    sessionManager.joinRoom(mockControllerSocket, pairCode);

    // Simulate 20 minutes passing without activity
    const room = sessionManager.getRoomBySocket(mockScreenSocket)?.room;
    if (room) {
      room.lastActivity = Date.now() - (20 * 60 * 1000);
    }

    sessionManager.cleanupStaleRooms(15 * 60 * 1000);

    const tryJoin = sessionManager.joinRoom(mockControllerSocket, pairCode);
    expect(tryJoin.success).toBe(false);
  });

  it('should handle socket disconnect cleanly', () => {
    const { pairCode } = sessionManager.createRoom(mockScreenSocket);
    sessionManager.joinRoom(mockControllerSocket, pairCode);

    const disconnectResult = sessionManager.handleDisconnect(mockControllerSocket);
    expect(disconnectResult.role).toBe('controller');
    expect(disconnectResult.room?.controllerSocket).toBeNull();
  });
});
