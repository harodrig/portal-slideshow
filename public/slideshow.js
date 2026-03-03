// ── Configuration ────────────────────────────────────
const AUTOPLAY_INTERVAL_MS = 60000;
const CLOCK_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
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
const clockPositionGroup = document.querySelector('#clock-position-group');
const positionBtns = document.querySelectorAll('.btn--position');

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

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateClock() {
  clockTimeEl.textContent = formatTime(new Date());
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
  clockPositionGroup.classList.toggle('is-visible', enabled);
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
    btn.classList.toggle('btn--active', btn.dataset.position === position);
  });
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

positionBtns.forEach((btn) => {
  btn.addEventListener('click', () => setClockPosition(btn.dataset.position));
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
fetchPhotos();
