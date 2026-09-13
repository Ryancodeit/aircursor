import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import httpModule from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './sessions/sessionManager.js';
import { setupWebSocketServer } from './websocket/wsHandler.js';
import { WSMessage } from '@aircursor/shared';

describe('AirCursor End-to-End WebSocket Integration Tests', () => {
  let server: httpModule.Server;
  let wss: WebSocketServer;
  let sessionManager: SessionManager;
  let port: number;

  beforeEach(async () => {
    sessionManager = new SessionManager();
    server = httpModule.createServer();
    wss = new WebSocketServer({ server });
    setupWebSocketServer(wss, sessionManager);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3005;
        resolve();
      });
    });
  });

  afterEach(async () => {
    wss.close();
    server.close();
  });

  it('should run full E2E flow: Create session -> Join session -> Stream motion -> Click -> Disconnect', async () => {
    const wsUrl = `ws://localhost:${port}`;

    // 1. Target Screen connects and creates a session
    const targetWs = new WebSocket(wsUrl);
    let pairCode = '';

    await new Promise<void>((resolve) => {
      targetWs.on('open', () => {
        targetWs.send(JSON.stringify({ type: 'create_session' }));
      });

      targetWs.on('message', (data) => {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === 'session_created') {
          pairCode = msg.pairingCode;
          expect(pairCode).toHaveLength(6);
          resolve();
        }
      });
    });

    // Prepare promise for target receiving controller_connected notice
    const controllerConnectedPromise = new Promise<void>((resolve) => {
      targetWs.on('message', (data) => {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === 'controller_connected') {
          resolve();
        }
      });
    });

    // 2. Controller connects and joins session using pairing code
    const controllerWs = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      controllerWs.on('open', () => {
        controllerWs.send(JSON.stringify({ type: 'join_session', sessionCode: pairCode }));
      });

      controllerWs.on('message', (data) => {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === 'session_joined') {
          resolve();
        }
      });
    });

    await controllerConnectedPromise;

    // 3. Controller sends motion message -> Target receives motion message
    let receivedMotion: { dx: number; dy: number } | null = null;
    const motionPromise = new Promise<void>((resolve) => {
      targetWs.on('message', (data) => {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === 'motion') {
          receivedMotion = { dx: msg.dx, dy: msg.dy };
          resolve();
        }
      });
    });

    controllerWs.send(JSON.stringify({ type: 'motion', dx: 18.5, dy: -12.4, timestamp: Date.now() }));
    await motionPromise;

    expect(receivedMotion).toEqual({ dx: 18.5, dy: -12.4 });

    // 4. Controller sends click message -> Target receives click message
    let receivedClick = false;
    const clickPromise = new Promise<void>((resolve) => {
      targetWs.on('message', (data) => {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === 'click') {
          receivedClick = true;
          resolve();
        }
      });
    });

    controllerWs.send(JSON.stringify({ type: 'click', timestamp: Date.now() }));
    await clickPromise;

    expect(receivedClick).toBe(true);

    // 5. Controller disconnects -> Target receives controller_disconnected notice
    let receivedDisconnectNotice = false;
    const disconnectPromise = new Promise<void>((resolve) => {
      targetWs.on('message', (data) => {
        const msg: WSMessage = JSON.parse(data.toString());
        if (msg.type === 'controller_disconnected') {
          receivedDisconnectNotice = true;
          resolve();
        }
      });
    });

    controllerWs.send(JSON.stringify({ type: 'disconnect' }));
    await disconnectPromise;

    expect(receivedDisconnectNotice).toBe(true);

    // Cleanup sockets
    targetWs.close();
    controllerWs.close();
  });
});
