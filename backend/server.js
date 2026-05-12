require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const router = require('./index');
const { addClient, removeClient } = require('./ws/notificationHub');

const app = express();
const PORT = process.env.PORT || 3020;

// Reflect request Origin so browser gets Access-Control-Allow-Origin (required with credentials).
// If you still see CORS on errors: nginx may return 413/502 without proxying — fix client_max_body_size / upstream.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Статика: загруженные файлы (аватары)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Все маршруты через index.js: /auth/login, /tickets, /reports, /users
app.use('/', router);

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws/notifications' });

wss.on('connection', (ws, req) => {
  let email = null;
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close();
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (!decoded || !decoded.email) {
      ws.close();
      return;
    }
    email = String(decoded.email);
    addClient(email, ws);
  } catch (_) {
    try {
      ws.close();
    } catch (__) {
      /* ignore */
    }
    return;
  }

  ws.on('close', () => {
    if (email) removeClient(email, ws);
  });
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket notifications: ws://localhost:${PORT}/ws/notifications`);

  // Start background jobs
  try {
    const slaCron = require('./services/slaCron');
    slaCron.start();
  } catch (err) {
    console.warn('SLA cron not started (install node-cron):', err.message);
  }
});
