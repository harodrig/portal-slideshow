'use strict';

// These pure functions mirror the logic in public/slideshow.js.
// slideshow.js is a browser script and cannot be imported as a CommonJS
// module, so the functions are replicated here to validate their behaviour.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const CLOCK_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

// ── formatTime ───────────────────────────────────────
describe('formatTime', () => {
  test('formats midnight as 00:00:00', () => {
    const d = new Date(2024, 0, 1, 0, 0, 0);
    assert.equal(formatTime(d), '00:00:00');
  });

  test('pads single-digit hours, minutes, and seconds', () => {
    const d = new Date(2024, 0, 1, 1, 2, 3);
    assert.equal(formatTime(d), '01:02:03');
  });

  test('formats end of day correctly', () => {
    const d = new Date(2024, 0, 1, 23, 59, 59);
    assert.equal(formatTime(d), '23:59:59');
  });

  test('returns HH:MM:SS format', () => {
    const d = new Date(2024, 0, 1, 14, 30, 45);
    assert.match(formatTime(d), /^\d{2}:\d{2}:\d{2}$/);
  });

  test('formats noon correctly', () => {
    const d = new Date(2024, 0, 1, 12, 0, 0);
    assert.equal(formatTime(d), '12:00:00');
  });
});

// ── CLOCK_POSITIONS ──────────────────────────────────
describe('CLOCK_POSITIONS', () => {
  test('contains exactly four positions', () => {
    assert.equal(CLOCK_POSITIONS.length, 4);
  });

  test('includes all four named positions', () => {
    assert.ok(CLOCK_POSITIONS.includes('top-right'));
    assert.ok(CLOCK_POSITIONS.includes('top-left'));
    assert.ok(CLOCK_POSITIONS.includes('bottom-right'));
    assert.ok(CLOCK_POSITIONS.includes('bottom-left'));
  });

  test('each position is unique', () => {
    const unique = new Set(CLOCK_POSITIONS);
    assert.equal(unique.size, CLOCK_POSITIONS.length);
  });

  test('every position matches the CSS class pattern', () => {
    const validPattern = /^(top|bottom)-(right|left)$/;
    CLOCK_POSITIONS.forEach((pos) => {
      assert.match(pos, validPattern, `"${pos}" does not match expected pattern`);
    });
  });
});
