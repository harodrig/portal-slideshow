// ── Configuration ────────────────────────────────────
const AUTOPLAY_INTERVAL_MS = 60000;
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

// Each entry is a function(Date) → string
const DATE_FORMATS = [
  // 0: "Tuesday 3 March" (default)
  function(date) {
    return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_LONG[date.getMonth()]}`;
  },
  // 1: "DD/MM/YYYY"
  function(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  },
  // 2: "YYYY-MM-DD"
  function(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  },
  // 3: "Mar 3, 2026"
  function(date) {
    return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  },
];

const noSleep = new NoSleep();
const slideshowEl = document.querySelector('.slideshow');
const btnClose = document.querySelector('#btn-close');

let photos = [];

async function fetchPhotos() {
  try {
    const response = await fetch('/api/photos');

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
      console.warn('No photos found in the photos directory.');
      return;
    }

    photos = data.map((p) => ({
      src: p.url,
      //caption: p.filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    }));

    // Now that we have photos, initialize the slideshow
    goTo(0);
    startAutoplay();
  } catch (err) {
    console.error('Failed to load photos:', err.message);
  }
}

// ── State ────────────────────────────────────────────
let currentIndex = 0;
let isPlaying = true;
let autoplayTimer = null;
let isBlurEnabled = false;
let isClockEnabled = false;
let clockPosition = 'top-right';
let clockInterval = null;
let clockSize = 3;
let clockShowSeconds = false;
let clockUse12h = false;
let clockShowDate = false;
let clockDateFormat = 0;

// ── DOM references ───────────────────────────────────
const imgEl = document.querySelector('.slideshow__image');
const captionEl = document.querySelector('.slideshow__caption');
const counterCurrent = document.querySelector('#current');
const counterTotal = document.querySelector('#total');
const btnPrev = document.querySelector('#btn-prev');
const btnPlay = document.querySelector('#btn-play');
const btnNext = document.querySelector('#btn-next');
const btnFullscreen = document.querySelector('#btn-fullscreen');
const btnMenu = document.querySelector('#btn-menu');
const sideMenu = document.querySelector('#side-menu');
const toggleBlurBtn = document.querySelector('#toggle-blur');
const toggleClockBtn = document.querySelector('#toggle-clock');
const blurBg = document.querySelector('#blur-bg');
const clockEl = document.querySelector('#clock');
const clockTimeEl = document.querySelector('#clock-time');
const clockDateEl = document.querySelector('#clock-date');
const clockSettingsGroup = document.querySelector('#clock-settings-group');
const positionBtns = document.querySelectorAll('.btn--position');
const clockSizeSlider = document.querySelector('#clock-size-slider');
const toggleSecondsBtn = document.querySelector('#toggle-seconds');
const toggleHourFormatBtn = document.querySelector('#toggle-hour-format');
const toggleDateBtn = document.querySelector('#toggle-date');
const clockDateOptionsGroup = document.querySelector('#clock-date-options-group');
const btnDateAbove = document.querySelector('#btn-date-above');
const btnDateBelow = document.querySelector('#btn-date-below');
const dateFmtBtns = document.querySelectorAll('.btn--date-fmt');

// ── Core functions ───────────────────────────────────

function showPhoto(index) {
  const photo = photos[index];

  // Fade out
  imgEl.classList.remove('is-visible');

  // Wait for fade-out transition, then swap the image
  setTimeout(() => {
    imgEl.src = photo.src;
    imgEl.alt = photo.caption;
    captionEl.textContent = photo.caption;
    counterCurrent.textContent = index + 1;

    // Update blur background when photo changes
    if (isBlurEnabled) {
      blurBg.style.backgroundImage = `url('${photo.src}')`;
    }

    // Fade in once the image is loaded
    imgEl.onload = () => imgEl.classList.add('is-visible');

    // If the image is already cached, onload may not fire — handle that:
    if (imgEl.complete) imgEl.classList.add('is-visible');
  }, 400); // matches the CSS transition duration
}

function goTo(index) {
  // Wrap around: going past the end loops back to start, and vice versa
  currentIndex = (index + photos.length) % photos.length;
  showPhoto(currentIndex);
  counterTotal.textContent = photos.length;
}

function next() {
  goTo(currentIndex + 1);
}
function prev() {
  goTo(currentIndex - 1);
}

function startAutoplay() {
  stopAutoplay(); // always clear before starting to avoid duplicate timers
  autoplayTimer = setInterval(next, AUTOPLAY_INTERVAL_MS);
}

function stopAutoplay() {
  clearInterval(autoplayTimer);
  autoplayTimer = null;
}

function togglePlay() {
  isPlaying = !isPlaying;
  btnPlay.textContent = isPlaying ? '⏸' : '▶';
  btnPlay.setAttribute(
    'aria-label',
    isPlaying ? 'Pause slideshow' : 'Play slideshow',
  );

  if (isPlaying) {
    startAutoplay();
    noSleep.enable();
  } else {
    stopAutoplay();
    if (!document.fullscreenElement) {
      noSleep.disable(); // only disable if not in fullscreen
    }
  }
}

// Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenEnabled) {
    console.warn('Fullscreen is not supported or allowed in this context.');
    return;
  }

  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(`Fullscreen request failed: ${err.message}`);
    });
  } else {
    // Exit fullscreen
    document.exitFullscreen();
  }
}

// ── Menu functions ───────────────────────────────────

function openMenu() {
  sideMenu.classList.add('is-open');
  sideMenu.setAttribute('aria-hidden', 'false');
  btnMenu.setAttribute('aria-label', 'Close settings');
  btnMenu.classList.add('btn--active');
}

function closeMenu() {
  sideMenu.classList.remove('is-open');
  sideMenu.setAttribute('aria-hidden', 'true');
  btnMenu.setAttribute('aria-label', 'Open settings');
  btnMenu.classList.remove('btn--active');
}

function toggleMenu() {
  if (sideMenu.classList.contains('is-open')) {
    closeMenu();
  } else {
    openMenu();
  }
}

// ── Blur functions ───────────────────────────────────

function applyBlur(enabled) {
  isBlurEnabled = enabled;
  toggleBlurBtn.textContent = enabled ? 'On' : 'Off';
  toggleBlurBtn.setAttribute('aria-checked', String(enabled));
  toggleBlurBtn.classList.toggle('is-on', enabled);
  blurBg.classList.toggle('is-active', enabled);

  if (enabled && imgEl.src) {
    blurBg.style.backgroundImage = `url('${imgEl.src}')`;
  }
}

// ── Clock functions ──────────────────────────────────

// Returns HH:MM or HH:MM:SS in 24h or 12h format
function formatTime(date, showSeconds, use12h) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  let suffix = '';
  if (use12h) {
    suffix = h >= 12 ? ' PM' : ' AM';
    h = h % 12 || 12; // 0 → 12 for midnight
  }

  const hStr = String(h).padStart(2, '0');
  const time = showSeconds ? `${hStr}:${m}:${s}` : `${hStr}:${m}`;
  return time + suffix;
}

function formatDate(date) {
  return DATE_FORMATS[clockDateFormat](date);
}

function updateClock() {
  const now = new Date();
  clockTimeEl.textContent = formatTime(now, clockShowSeconds, clockUse12h);
  if (clockShowDate) {
    clockDateEl.textContent = formatDate(now);
  }
}

function startClock() {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function stopClock() {
  clearInterval(clockInterval);
  clockInterval = null;
}

function applyClockEnabled(enabled) {
  isClockEnabled = enabled;
  toggleClockBtn.textContent = enabled ? 'On' : 'Off';
  toggleClockBtn.setAttribute('aria-checked', String(enabled));
  toggleClockBtn.classList.toggle('is-on', enabled);
  clockSettingsGroup.classList.toggle('is-visible', enabled);
  // Only show the clock overlay when currently in fullscreen
  slideshowEl.classList.toggle('has-clock', enabled && !!document.fullscreenElement);

  if (enabled) {
    startClock();
  } else {
    stopClock();
  }
}

function setClockPosition(position) {
  clockPosition = position;
  CLOCK_POSITIONS.forEach((pos) => clockEl.classList.remove(`clock--${pos}`));
  clockEl.classList.add(`clock--${position}`);
  positionBtns.forEach((btn) => {
    if (!btn.id) { // only the corner-position buttons, not the date-position buttons
      btn.classList.toggle('btn--active', btn.dataset.position === position);
    }
  });
}

function applyClockSize(size) {
  clockSize = size;
  clockEl.style.fontSize = `${size * 0.4 + 0.6}rem`;
}

function applyShowSeconds(enabled) {
  clockShowSeconds = enabled;
  toggleSecondsBtn.textContent = enabled ? 'On' : 'Off';
  toggleSecondsBtn.setAttribute('aria-checked', String(enabled));
  toggleSecondsBtn.classList.toggle('is-on', enabled);
  updateClock();
}

function applyHourFormat(use12h) {
  clockUse12h = use12h;
  toggleHourFormatBtn.textContent = use12h ? '12h' : '24h';
  toggleHourFormatBtn.setAttribute('aria-pressed', String(use12h));
  toggleHourFormatBtn.classList.toggle('is-on', use12h);
  updateClock();
}

function applyShowDate(enabled) {
  clockShowDate = enabled;
  toggleDateBtn.textContent = enabled ? 'On' : 'Off';
  toggleDateBtn.setAttribute('aria-checked', String(enabled));
  toggleDateBtn.classList.toggle('is-on', enabled);
  clockDateOptionsGroup.classList.toggle('is-visible', enabled);
  clockEl.classList.toggle('has-date', enabled);
  if (enabled) updateClock();
}

function applyDatePosition(below) {
  clockEl.classList.toggle('date-below', below);
  btnDateAbove.classList.toggle('btn--active', !below);
  btnDateBelow.classList.toggle('btn--active', below);
}

function applyDateFormat(formatIndex) {
  clockDateFormat = formatIndex;
  dateFmtBtns.forEach((btn) => {
    btn.classList.toggle('btn--active', parseInt(btn.dataset.fmt, 10) === formatIndex);
  });
  if (clockShowDate) updateClock();
}

// ── Event listeners ──────────────────────────────────

btnNext.addEventListener('click', () => {
  next();
  startAutoplay();
});
btnPrev.addEventListener('click', () => {
  prev();
  startAutoplay();
});
btnPlay.addEventListener('click', togglePlay);

// Disable noSleep if the user navigates away or closes the tab
document.addEventListener('visibilitychange', () => {
  if (document.hidden) noSleep.disable();
});

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowRight':
      next();
      startAutoplay();
      break;
    case 'ArrowLeft':
      prev();
      startAutoplay();
      break;
    case ' ':
      event.preventDefault();
      togglePlay();
      break;
  }
});

btnFullscreen.addEventListener('click', toggleFullscreen);

btnClose.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
});

btnMenu.addEventListener('click', toggleMenu);

toggleBlurBtn.addEventListener('click', () => applyBlur(!isBlurEnabled));

toggleClockBtn.addEventListener('click', () => applyClockEnabled(!isClockEnabled));

// Corner position buttons (exclude date-position buttons that have an id)
positionBtns.forEach((btn) => {
  if (!btn.id) {
    btn.addEventListener('click', () => setClockPosition(btn.dataset.position));
  }
});

clockSizeSlider.addEventListener('input', () => {
  applyClockSize(parseInt(clockSizeSlider.value, 10));
});

toggleSecondsBtn.addEventListener('click', () => applyShowSeconds(!clockShowSeconds));

toggleHourFormatBtn.addEventListener('click', () => applyHourFormat(!clockUse12h));

toggleDateBtn.addEventListener('click', () => applyShowDate(!clockShowDate));

btnDateAbove.addEventListener('click', () => applyDatePosition(false));
btnDateBelow.addEventListener('click', () => applyDatePosition(true));

dateFmtBtns.forEach((btn) => {
  btn.addEventListener('click', () => applyDateFormat(parseInt(btn.dataset.fmt, 10)));
});

document.addEventListener('fullscreenchange', () => {
  const isFullscreen = !!document.fullscreenElement;

  // Toggle the class that drives all CSS changes
  slideshowEl.classList.toggle('is-fullscreen', isFullscreen);

  // Show or hide the clock overlay based on fullscreen state
  slideshowEl.classList.toggle('has-clock', isClockEnabled && isFullscreen);

  // Always close the side menu when entering fullscreen
  if (isFullscreen) closeMenu();

  // Update the fullscreen button label
  btnFullscreen.setAttribute(
    'aria-label',
    isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
  );
  btnFullscreen.classList.toggle('btn--active', isFullscreen);

  // NoSleep logic
  isFullscreen ? noSleep.enable() : isPlaying ? noSleep.enable() : noSleep.disable();
});

// ── Init ─────────────────────────────────────────────
setClockPosition(clockPosition); // apply initial clock position class
applyClockSize(clockSize);       // apply initial font size from slider default
fetchPhotos();
