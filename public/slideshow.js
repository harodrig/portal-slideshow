// ── Configuration ────────────────────────────────────
const AUTOPLAY_INTERVAL_MS = 60000;
const noSleep = new NoSleep();
const slideshowEl = document.querySelector(".slideshow");
const btnClose = document.querySelector("#btn-close");

let photos = [];

async function fetchPhotos() {
  try {
    const response = await fetch("/api/photos");

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
      console.warn("No photos found in the photos directory.");
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
    console.error("Failed to load photos:", err.message);
  }
}

// ── State ────────────────────────────────────────────
let currentIndex = 0;
let isPlaying = true;
let autoplayTimer = null;

// ── DOM references ───────────────────────────────────
const imgEl = document.querySelector(".slideshow__image");
const captionEl = document.querySelector(".slideshow__caption");
const counterCurrent = document.querySelector("#current");
const counterTotal = document.querySelector("#total");
const btnPrev = document.querySelector("#btn-prev");
const btnPlay = document.querySelector("#btn-play");
const btnNext = document.querySelector("#btn-next");
const btnFullscreen = document.querySelector("#btn-fullscreen");

// ── Core functions ───────────────────────────────────

function showPhoto(index) {
  const photo = photos[index];

  // Fade out
  imgEl.classList.remove("is-visible");

  // Wait for fade-out transition, then swap the image
  setTimeout(() => {
    imgEl.src = photo.src;
    imgEl.alt = photo.caption;
    captionEl.textContent = photo.caption;
    counterCurrent.textContent = index + 1;

    // Fade in once the image is loaded
    imgEl.onload = () => imgEl.classList.add("is-visible");

    // If the image is already cached, onload may not fire — handle that:
    if (imgEl.complete) imgEl.classList.add("is-visible");
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
  btnPlay.textContent = isPlaying ? "⏸" : "▶";
  btnPlay.setAttribute(
    "aria-label",
    isPlaying ? "Pause slideshow" : "Play slideshow",
  );

  if (isPlaying) {
    startAutoplay();
    noSleep.enable();
  } else {
    stopAutoplay();
    noSleep.disable();
  }
}

// Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenEnabled) {
    console.warn("Fullscreen is not supported or allowed in this context.");
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

// ── Event listeners ──────────────────────────────────

btnNext.addEventListener("click", () => {
  next();
  startAutoplay();
});
btnPrev.addEventListener("click", () => {
  prev();
  startAutoplay();
});
btnPlay.addEventListener("click", togglePlay);

// Disable noSleep if the user navigates away or closes the tab
document.addEventListener("visibilitychange", () => {
  if (document.hidden) noSleep.disable();
});

document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowRight":
      next();
      startAutoplay();
      break;
    case "ArrowLeft":
      prev();
      startAutoplay();
      break;
    case " ":
      event.preventDefault();
      togglePlay();
      break;
  }
});

btnFullscreen.addEventListener("click", toggleFullscreen);

btnClose.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = !!document.fullscreenElement;

  // Toggle the class that drives all CSS changes
  slideshowEl.classList.toggle("is-fullscreen", isFullscreen);

  // Update the fullscreen button label
  btnFullscreen.setAttribute(
    "aria-label",
    isFullscreen ? "Exit fullscreen" : "Enter fullscreen",
  );
  btnFullscreen.classList.toggle("btn--active", isFullscreen);

  // NoSleep logic (unchanged from before)
  isFullscreen
    ? noSleep.enable()
    : isPlaying
      ? noSleep.enable()
      : noSleep.disable();
});

// ── Init ─────────────────────────────────────────────
fetchPhotos();
startAutoplay();
