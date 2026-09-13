import httpModule from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { SessionManager } from './sessions/sessionManager.js';
import { setupWebSocketServer } from './websocket/wsHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const sessionManager = new SessionManager();

// Mandatory Render Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AirCursor Server',
    timestamp: new Date().toISOString(),
  });
});

// Serve static frontend files in production if client/dist exists
app.use(express.static(clientDistPath));

// Fallback all SPA route requests to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Periodic session cleanup every 5 minutes (purges 15-min inactive rooms)
setInterval(() => {
  sessionManager.cleanupStaleRooms(15 * 60 * 1000);
}, 5 * 60 * 1000);

const server = httpModule.createServer(app);
const wss = new WebSocketServer({ server });

setupWebSocketServer(wss, sessionManager);

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 AirCursor Server listening on port ${PORT} (0.0.0.0)`);
  console.log(`🔌 WebSocket server active on WSS/WS port ${PORT}`);
});

