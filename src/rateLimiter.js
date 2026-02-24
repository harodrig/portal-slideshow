"use strict";

/**
 * Simple in-memory rate limiter.
 * Tracks request counts per IP over a sliding window.
 */
function createRateLimiter({ windowMs = 60_000, maxRequests = 100 } = {}) {
  const clients = new Map(); // IP → { count, resetAt }

  // Periodically clean up entries for IPs that have gone quiet
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of clients) {
      if (now > entry.resetAt) clients.delete(ip);
    }
  }, windowMs);

  return function isAllowed(ip) {
    const now = Date.now();
    const entry = clients.get(ip);

    if (!entry || now > entry.resetAt) {
      // First request in this window, or window has expired
      clients.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      return false;
    }

    return true;
  };
}

module.exports = { createRateLimiter };
