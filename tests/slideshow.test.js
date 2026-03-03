'use strict';

// These pure functions mirror the logic in public/slideshow.js.
// slideshow.js is a browser script and cannot be imported as a CommonJS
// module, so the functions are replicated here to validate their behaviour.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Replicated constants ──────────────────────────────
const CLOCK_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DATE_FORMATS = [
  function(date) {
    return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_LONG[date.getMonth()]}`;
  },
  function(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  },
  function(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  },
  function(date) {
    return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  },
];

// ── Replicated pure functions ─────────────────────────
function formatTime(date, showSeconds, use12h) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  let suffix = '';
  if (use12h) {
    suffix = h >= 12 ? ' PM' : ' AM';
    h = h % 12 || 12;
  }

  const hStr = String(h).padStart(2, '0');
  const time = showSeconds ? `${hStr}:${m}:${s}` : `${hStr}:${m}`;
  return time + suffix;
}

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

// ── formatTime — 24h without seconds (default mode) ──
describe('formatTime — 24h, no seconds', () => {
  test('midnight returns 00:00', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 0, 0, 0), false, false), '00:00');
  });

  test('pads single-digit hours and minutes', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 1, 2, 0), false, false), '01:02');
  });

  test('end of day returns 23:59', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 23, 59, 0), false, false), '23:59');
  });

  test('noon returns 12:00', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 12, 0, 0), false, false), '12:00');
  });

  test('returns HH:MM format', () => {
    assert.match(
      formatTime(new Date(2024, 0, 1, 14, 30, 45), false, false),
      /^\d{2}:\d{2}$/,
    );
  });
});

// ── formatTime — 24h with seconds ────────────────────
describe('formatTime — 24h, with seconds', () => {
  test('midnight returns 00:00:00', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 0, 0, 0), true, false), '00:00:00');
  });

  test('pads single-digit hours, minutes, and seconds', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 1, 2, 3), true, false), '01:02:03');
  });

  test('end of day returns 23:59:59', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 23, 59, 59), true, false), '23:59:59');
  });

  test('returns HH:MM:SS format', () => {
    assert.match(
      formatTime(new Date(2024, 0, 1, 14, 30, 45), true, false),
      /^\d{2}:\d{2}:\d{2}$/,
    );
  });
});

// ── formatTime — 12h format ───────────────────────────
describe('formatTime — 12h format', () => {
  test('midnight is 12:00 AM', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 0, 0, 0), false, true), '12:00 AM');
  });

  test('noon is 12:00 PM', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 12, 0, 0), false, true), '12:00 PM');
  });

  test('1 AM is 01:00 AM', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 1, 0, 0), false, true), '01:00 AM');
  });

  test('1 PM (13:00) is 01:00 PM', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 13, 0, 0), false, true), '01:00 PM');
  });

  test('11 PM (23:00) is 11:00 PM', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 23, 0, 0), false, true), '11:00 PM');
  });

  test('12h with seconds includes AM/PM suffix', () => {
    assert.equal(formatTime(new Date(2024, 0, 1, 1, 2, 3), true, true), '01:02:03 AM');
  });

  test('returns HH:MM AM/PM format', () => {
    assert.match(
      formatTime(new Date(2024, 0, 1, 14, 30, 0), false, true),
      /^\d{2}:\d{2} (AM|PM)$/,
    );
  });
});

// ── DATE_FORMATS ──────────────────────────────────────
// Fixed reference date: Monday 1 January 2024
// new Date(2024, 0, 1).getDay() === 1 (Monday)
describe('DATE_FORMATS', () => {
  const d = new Date(2024, 0, 1); // 2024-01-01, Monday

  test('format 0 returns "day-name day-number month-name"', () => {
    assert.equal(DATE_FORMATS[0](d), 'Monday 1 January');
  });

  test('format 1 returns DD/MM/YYYY', () => {
    assert.equal(DATE_FORMATS[1](d), '01/01/2024');
  });

  test('format 2 returns YYYY-MM-DD', () => {
    assert.equal(DATE_FORMATS[2](d), '2024-01-01');
  });

  test('format 3 returns "Mon D, YYYY"', () => {
    assert.equal(DATE_FORMATS[3](d), 'Jan 1, 2024');
  });

  test('format 0 pads single-digit day correctly (no zero padding)', () => {
    // Format 0 uses raw day number, not padded
    assert.match(DATE_FORMATS[0](d), /Monday \d+ January/);
  });

  test('format 1 zero-pads day and month', () => {
    assert.match(DATE_FORMATS[1](d), /^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('format 2 zero-pads day and month', () => {
    assert.match(DATE_FORMATS[2](d), /^\d{4}-\d{2}-\d{2}$/);
  });

  test('all four formats are distinct for the same date', () => {
    const results = DATE_FORMATS.map((fn) => fn(d));
    const unique = new Set(results);
    assert.equal(unique.size, DATE_FORMATS.length);
  });

  describe('format 0 — day names', () => {
    // Verify each day name maps correctly
    const cases = [
      { date: new Date(2024, 0, 7),  name: 'Sunday' },   // 2024-01-07
      { date: new Date(2024, 0, 1),  name: 'Monday' },
      { date: new Date(2024, 0, 2),  name: 'Tuesday' },
      { date: new Date(2024, 0, 3),  name: 'Wednesday' },
      { date: new Date(2024, 0, 4),  name: 'Thursday' },
      { date: new Date(2024, 0, 5),  name: 'Friday' },
      { date: new Date(2024, 0, 6),  name: 'Saturday' },
    ];

    cases.forEach(({ date, name }) => {
      test(`${name} appears in format 0 output`, () => {
        assert.ok(DATE_FORMATS[0](date).startsWith(name));
      });
    });
  });
});
