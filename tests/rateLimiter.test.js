'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../src/rateLimiter');

describe('createRateLimiter', () => {
  test('allows requests under the limit', () => {
    const { isAllowed, stop } = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 5,
    });
    for (let i = 0; i < 5; i++) {
      assert.equal(isAllowed('192.168.1.1'), true);
    }
    stop();
  });

  test('blocks requests over the limit', () => {
    const { isAllowed, stop } = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 3,
    });
    const ip = '192.168.1.2';

    isAllowed(ip);
    isAllowed(ip);
    isAllowed(ip);
    assert.equal(isAllowed(ip), false);
    stop();
  });

  test('tracks different IPs independently', () => {
    const { isAllowed, stop } = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 2,
    });

    isAllowed('10.0.0.1');
    isAllowed('10.0.0.1');
    assert.equal(isAllowed('10.0.0.1'), false);
    assert.equal(isAllowed('10.0.0.2'), true);
    stop();
  });

  test('resets count after the window expires', async () => {
    const { isAllowed, stop } = createRateLimiter({
      windowMs: 50,
      maxRequests: 2,
    });
    const ip = '192.168.1.3';

    isAllowed(ip);
    isAllowed(ip);
    assert.equal(isAllowed(ip), false);

    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.equal(isAllowed(ip), true);
    stop();
  });

  test('uses default options when none are provided', () => {
    const { isAllowed, stop } = createRateLimiter();
    assert.equal(isAllowed('192.168.1.4'), true);
    stop();
  });

  test('blocks new IPs once maxClients is reached', () => {
    const { isAllowed, stop } = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 10,
      maxClients: 2,
    });

    assert.equal(isAllowed('10.0.0.1'), true);
    assert.equal(isAllowed('10.0.0.2'), true);
    // Table is full — a new IP must be rejected even though it is under the rate limit
    assert.equal(isAllowed('10.0.0.3'), false);
    stop();
  });
});
