import { WebSocket, WebSocketServer } from 'ws';
import { SessionManager } from '../sessions/sessionManager.js';
import { validateIncomingWSMessage, isRateLimited } from '../protocol/validator.js';
import { WSMessage } from '@aircursor/shared';

export function setupWebSocketServer(wss: WebSocketServer, sessionManager: SessionManager) {
  wss.on('connection', (socket: WebSocket, req) => {
    const userAgent = (req.headers['user-agent'] || '').substring(0, 250);
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const ip = rawIp.split(',')[0].substring(0, 45);

    // Rate limit WS connections per IP (max 40 connects/min)
    if (isRateLimited(ip)) {
      socket.close(4029, 'Rate limit exceeded. Please try again later.');
      return;
    }

    socket.on('message', (data: Buffer | string) => {
      const validation = validateIncomingWSMessage(data);
      if (!validation.valid || !validation.message) {
        sendJSON(socket, { type: 'error', message: validation.error || 'Invalid payload' });
        return;
      }
      handleMessage(socket, validation.message, sessionManager, { userAgent, ip });
    });

    socket.on('close', () => {
      const { room, role } = sessionManager.handleDisconnect(socket);
      if (!room || !role) return;

      if (role === 'controller' && room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
        sendJSON(room.screenSocket, { type: 'controller_disconnected' });
      } else if (role === 'screen' && room.controllerSocket && room.controllerSocket.readyState === WebSocket.OPEN) {
        sendJSON(room.controllerSocket, { type: 'error', message: 'Target device disconnected' });
      }
    });

    socket.on('error', (err) => {
      console.error('[WS Socket Error]:', err);
    });
  });
}

function handleMessage(
  socket: WebSocket,
  msg: WSMessage,
  sessionManager: SessionManager,
  meta: { userAgent?: string; ip?: string }
) {
  sessionManager.touchActivity(socket);

  switch (msg.type) {
    case 'create_session': {
      const deviceType = msg.deviceType || 'screen';
      const { roomId, pairCode } = sessionManager.createRoom(socket, meta, deviceType);
      sendJSON(socket, {
        type: 'session_created',
        sessionId: roomId,
        pairingCode: pairCode,
        deviceType,
      });
      break;
    }

    case 'join_session': {
      const result = sessionManager.joinRoom(socket, msg.sessionCode, meta);
      if (!result.success || !result.room) {
        sendJSON(socket, {
          type: 'error',
          message: result.error || 'Failed to join session',
        });
        return;
      }

      sendJSON(socket, {
        type: 'session_joined',
        sessionId: result.room.roomId,
        targetDeviceType: result.room.targetDeviceType,
      });

      if (result.room.screenSocket && result.room.screenSocket.readyState === WebSocket.OPEN) {
        sendJSON(result.room.screenSocket, {
          type: 'controller_connected',
          controllerMetadata: {
            userAgent: meta.userAgent,
          },
        });
      }
      break;
    }

    case 'motion':
    case 'click':
    case 'double_click':
    case 'right_click':
    case 'mouse_down':
    case 'mouse_up':
    case 'drag_start':
    case 'drag_end':
    case 'scroll':
    case 'calibrate':
    case 'emergency_stop':
    case 'media_command':
    case 'keyboard_input': {
      const entry = sessionManager.getRoomBySocket(socket);
      if (entry && entry.role === 'controller' && entry.room.screenSocket) {
        if (entry.room.screenSocket.readyState === WebSocket.OPEN) {
          sendJSON(entry.room.screenSocket, msg);
        }
      }
      break;
    }


    case 'ping': {
      sendJSON(socket, {
        type: 'pong',
        timestamp: msg.timestamp,
        serverTime: Date.now(),
      });
      break;
    }

    case 'disconnect': {
      const { room, role } = sessionManager.handleDisconnect(socket);
      if (room && role === 'controller' && room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
        sendJSON(room.screenSocket, { type: 'controller_disconnected' });
      }
      break;
    }

    default:
      console.warn('[WS Warning] Unhandled message type:', (msg as any).type);
  }
}

function sendJSON(socket: WebSocket, data: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}
