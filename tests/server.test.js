'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer, SAFE_FILENAME, ALLOWED_EXT } = require('../src/server');

// ── Helper: make a GET request to the test server ────
function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${port}${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        );
      })
      .on('error', reject);
  });
}

// ── Security header tests ─────────────────────────────
describe('security headers', () => {
  let server;
  let port;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('sets X-Content-Type-Options', async () => {
    const res = await get(port, '/');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  test('sets X-Frame-Options', async () => {
    const res = await get(port, '/');
    assert.equal(res.headers['x-frame-options'], 'DENY');
  });

  test('sets Referrer-Policy', async () => {
    const res = await get(port, '/');
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
  });

  test('removes X-Powered-By', async () => {
    const res = await get(port, '/');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  /*
  test("sets Content-Security-Policy", async () => {
    const res = await get(port, "/");
    assert.ok(res.headers["content-security-policy"]);
  });
  */
});

// ── Method validation tests ───────────────────────────
describe('method validation', () => {
  let server;
  let port;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('rejects POST requests with 405', async () => {
    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/api/photos', method: 'POST' },
        (res) => {
          res.resume(); // drain the response body
          resolve(res);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(res.statusCode, 405);
  });

  test('rejects DELETE requests with 405', async () => {
    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/api/photos', method: 'DELETE' },
        (res) => {
          res.resume(); // drain the response body
          resolve(res);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(res.statusCode, 405);
  });
});

// ── Connection limit test (pure logic, no listen needed) ──────
describe('connection limits', () => {
  test('server.maxConnections is set to a finite value', () => {
    const server = createServer();
    assert.ok(
      typeof server.maxConnections === 'number' && server.maxConnections > 0,
      'maxConnections must be a positive number',
    );
    server.close();
  });
});

// ── Filename validation tests (pure logic, no server needed) ──
describe('SAFE_FILENAME regex', () => {
  test('allows normal filenames', () => {
    assert.ok(SAFE_FILENAME.test('photo.jpg'));
    assert.ok(SAFE_FILENAME.test('my-photo_01.jpeg'));
    assert.ok(SAFE_FILENAME.test('holiday photo.png'));
  });

  test('rejects path traversal attempts', () => {
    assert.equal(SAFE_FILENAME.test('../etc/passwd'), false);
    assert.equal(SAFE_FILENAME.test('../../secret'), false);
  });

  test('rejects null bytes', () => {
    assert.equal(SAFE_FILENAME.test('photo\x00.jpg'), false);
  });

  test('rejects filenames with angle brackets', () => {
    assert.equal(SAFE_FILENAME.test('<script>.jpg'), false);
  });
});

// ── Extension whitelist tests (pure logic, no server needed) ──
describe('ALLOWED_EXT', () => {
  test('allows valid image extensions', () => {
    ['.jpg', '.jpeg', '.png', '.webp', '.gif'].forEach((ext) => {
      assert.ok(ALLOWED_EXT.has(ext), `Expected ${ext} to be allowed`);
    });
  });

  test('rejects non-image extensions', () => {
    ['.js', '.html', '.exe', '.sh', '.env'].forEach((ext) => {
      assert.equal(
        ALLOWED_EXT.has(ext),
        false,
        `Expected ${ext} to be rejected`,
      );
    });
  });
});
