"use strict";

function createRateLimiter({ windowMs = 60_000, maxRequests = 100 } = {}) {
  const clients = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of clients) {
      if (now > entry.resetAt) clients.delete(ip);
    }
  }, windowMs);

  function stop() {
    clearInterval(cleanupInterval);
  }

  function isAllowed(ip) {
    const now = Date.now();
    const entry = clients.get(ip);

    if (!entry || now > entry.resetAt) {
      clients.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count += 1;
    return entry.count <= maxRequests;
  }

  return { isAllowed, stop }; // ← must return an object, not a function
}

module.exports = { createRateLimiter };
