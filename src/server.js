'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRateLimiter } = require('./rateLimiter');

// ── Configuration ────────────────────────────────────
const PHOTOS_DIR = path.resolve(process.env.PHOTOS_DIR || './photos');
const PUBLIC_DIR = path.resolve('./public');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const SAFE_FILENAME = /^[\w\-. ]+$/;
const MAX_CONNECTIONS = 100; // cap concurrent TCP connections to bound socket memory

// ── MIME types for static files ──────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

// ── Security headers ─────────────────────────────────
function setSecurityHeaders(res) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  // Content-Security-Policy is intentionally omitted for this deployment.
  //
  // This app runs exclusively on a local network (self-hosted kiosk), so the
  // primary threats CSP guards against — XSS and external content injection —
  // are not a meaningful risk here.
  //
  // More critically, the target device (Meta Portal, Chrome 16) has partial
  // and buggy CSP support: the `media-src blob: data:` directive blocked the
  // NoSleep.js video fallback (used to prevent screen sleep on old Android),
  // and fullscreen requests were also silently denied. No CSP rewrite resolved
  // this without removing the directive entirely.
  //
  // If this app is ever exposed to a public network, a proper CSP should be
  // added and tested against all target browsers before deploying.
  //
  // res.setHeader(
  //   "Content-Security-Policy",
  //   [
  //     "default-src 'self'",
  //     "img-src 'self'",
  //     "style-src 'self'",
  //     "script-src 'self' https://cdnjs.cloudflare.com",
  //     "media-src blob: data:",
  //     "frame-ancestors 'none'",
  //   ].join("; "),
  // );
}

// ── Helpers ──────────────────────────────────────────

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendError(res, 404, 'Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stats.size,
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

// ── Route handlers ───────────────────────────────────

function handleGetPhotos(res) {
  fs.readdir(PHOTOS_DIR, (err, files) => {
    if (err) {
      console.error('Could not read photos directory:', err.message);
      sendError(res, 500, 'Could not read photos directory');
      return;
    }

    const photos = files
      .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
      .map((f) => ({ filename: f, url: `/photos/${encodeURIComponent(f)}` }));

    sendJson(res, 200, photos);
  });
}

function handleGetPhoto(res, filename) {
  // Decode and strip any directory components
  const decoded = decodeURIComponent(filename);
  const baseName = path.basename(decoded); // e.g. "../../etc/passwd" → "passwd"
  const ext = path.extname(baseName).toLowerCase();

  // Reject filenames with anything other than safe characters
  if (!SAFE_FILENAME.test(baseName)) {
    sendError(res, 400, 'Invalid filename');
    return;
  }

  if (!ALLOWED_EXT.has(ext)) {
    sendError(res, 400, 'File type not allowed');
    return;
  }

  const filePath = path.join(PHOTOS_DIR, baseName);

  // Ensure the resolved path is still inside PHOTOS_DIR
  if (!filePath.startsWith(PHOTOS_DIR + path.sep)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  sendFile(res, filePath);
}

function handleStatic(res, urlPath) {
  // Serve index.html for the root
  const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = path.join(PUBLIC_DIR, relative);

  // Ensure the resolved path is still inside PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  sendFile(res, filePath);
}

// ── Export createServer instead of calling listen ────
function createServer() {
  const { isAllowed, stop } = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 100,
  });

  const server = http.createServer((req, res) => {
    setSecurityHeaders(res);

    const ip = req.socket.remoteAddress;
    if (!isAllowed(ip)) {
      res.setHeader('Retry-After', '60');
      sendError(res, 429, 'Too many requests, please slow down.');
      return;
    }

    const method = req.method;
    const urlPath = req.url.split('?')[0];

    console.log(`${method} ${urlPath}`);

    if (method !== 'GET') {
      sendError(res, 405, 'Method not allowed');
      return;
    }

    if (urlPath === '/api/photos') {
      handleGetPhotos(res);
    } else if (urlPath.startsWith('/photos/')) {
      const filename = urlPath.slice('/photos/'.length);
      handleGetPhoto(res, filename);
    } else {
      handleStatic(res, urlPath);
    }
  });

  server.maxConnections = MAX_CONNECTIONS;

  // Expose stop so tests can clean up
  server.on('close', stop);

  return server;
}

module.exports = { createServer, SAFE_FILENAME, ALLOWED_EXT };
