const galleryCarousel = document.querySelector(".gallery-carousel");
const galleryViewport = document.querySelector(".gallery-viewport");
const galleryTrack = document.querySelector(".gallery-track");
const previousGalleryButton = document.querySelector(".gallery-arrow-left");
const nextGalleryButton = document.querySelector(".gallery-arrow-right");
const galleryStatus = document.querySelector(".gallery-status");
const galleryItems = [...document.querySelectorAll(".gallery-item")];
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxLoading = document.querySelector("#lightbox-loading");
const closeButton = document.querySelector("#lightbox-close");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const largeImageCache = new Map();

let previouslyFocusedElement = null;
let lightboxRequestId = 0;
let galleryPosition = 0;
let carouselAnimation = null;
let carouselIsMoving = false;
let slideStep = 0;
let resizeFrame = 0;
let touchStartX = 0;
let touchDeltaX = 0;
let suppressNextGalleryClick = false;

function measureSlideStep() {
  const firstSlide = galleryTrack.querySelector(".gallery-slide");

  if (!firstSlide) {
    slideStep = 0;
    return;
  }

  const trackStyles = window.getComputedStyle(galleryTrack);
  const gap = Number.parseFloat(trackStyles.columnGap) || 0;
  slideStep = firstSlide.getBoundingClientRect().width + gap;
}

function scheduleSlideMeasurement() {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(measureSlideStep);
}

function updateGalleryStatus() {
  galleryStatus.textContent = `Gallery image ${galleryPosition + 1} of ${galleryItems.length}`;
}

function finishCarouselMove(direction, animation) {
  if (!carouselIsMoving || animation !== carouselAnimation) {
    return;
  }

  if (direction === "next") {
    galleryTrack.append(galleryTrack.firstElementChild);
  }

  animation.cancel();
  carouselAnimation = null;
  carouselIsMoving = false;
  galleryTrack.classList.remove("is-moving");
  updateGalleryStatus();
}

function moveGallery(direction) {
  if (carouselIsMoving || !slideStep) {
    return;
  }

  carouselIsMoving = true;
  galleryTrack.classList.add("is-moving");

  const movingNext = direction === "next";
  const distance = `${slideStep}px`;

  if (movingNext) {
    galleryPosition = (galleryPosition + 1) % galleryItems.length;
  } else {
    galleryPosition = (galleryPosition - 1 + galleryItems.length) % galleryItems.length;
    galleryTrack.prepend(galleryTrack.lastElementChild);
  }

  const keyframes = movingNext
    ? [
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(-${distance}, 0, 0)` },
      ]
    : [
        { transform: `translate3d(-${distance}, 0, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ];

  const animation = galleryTrack.animate(keyframes, {
    duration: reducedMotion.matches ? 1 : 420,
    easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    fill: "both",
  });

  carouselAnimation = animation;
  animation.finished
    .then(() => finishCarouselMove(direction, animation))
    .catch(() => {
      if (animation === carouselAnimation) {
        finishCarouselMove(direction, animation);
      }
    });
}

function preloadLargeImage(url) {
  if (largeImageCache.has(url)) {
    return largeImageCache.get(url);
  }

  const imagePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        // The image is still usable when a browser cannot complete decode().
      }

      resolve(url);
    };

    image.onerror = () => reject(new Error("High-resolution image could not be loaded."));
    image.src = url;
  });

  largeImageCache.set(url, imagePromise);
  imagePromise.catch(() => largeImageCache.delete(url));
  return imagePromise;
}

function openLightbox(item) {
  const thumbnail = item.querySelector("img");
  const fullImageUrl = item.dataset.large;
  const requestId = ++lightboxRequestId;

  previouslyFocusedElement = item;
  lightboxImage.src = thumbnail.currentSrc || thumbnail.src;
  lightboxImage.alt = thumbnail.alt;
  lightboxLoading.textContent = "Loading high-resolution image…";
  lightboxLoading.hidden = false;
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  closeButton.focus();

  preloadLargeImage(fullImageUrl)
    .then((loadedImageUrl) => {
      if (requestId !== lightboxRequestId || !lightbox.classList.contains("active")) {
        return;
      }

      lightboxImage.src = loadedImageUrl;
      lightboxLoading.hidden = true;
    })
    .catch(() => {
      if (requestId !== lightboxRequestId || !lightbox.classList.contains("active")) {
        return;
      }

      lightboxLoading.textContent = "High-resolution image could not be loaded";
    });
}

function closeLightbox() {
  lightboxRequestId += 1;
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lightboxImage.removeAttribute("src");
  lightboxImage.alt = "";
  lightboxLoading.textContent = "Loading high-resolution image…";
  lightboxLoading.hidden = true;

  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

galleryItems.forEach((item) => {
  let preloadTimer = 0;

  item.addEventListener("pointerenter", () => {
    preloadTimer = window.setTimeout(() => {
      preloadLargeImage(item.dataset.large).catch(() => {});
    }, 120);
  }, { passive: true });

  item.addEventListener("pointerleave", () => {
    window.clearTimeout(preloadTimer);
  }, { passive: true });

  item.addEventListener("focus", () => {
    preloadLargeImage(item.dataset.large).catch(() => {});
  }, { once: true });

  item.addEventListener("click", (event) => {
    event.preventDefault();

    if (suppressNextGalleryClick) {
      suppressNextGalleryClick = false;
      return;
    }

    openLightbox(item);
  });
});

previousGalleryButton.addEventListener("click", () => moveGallery("previous"));
nextGalleryButton.addEventListener("click", () => moveGallery("next"));

galleryCarousel.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveGallery("previous");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveGallery("next");
  }
});

galleryViewport.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
  touchDeltaX = 0;
}, { passive: true });

galleryViewport.addEventListener("touchmove", (event) => {
  touchDeltaX = event.changedTouches[0].clientX - touchStartX;
}, { passive: true });

galleryViewport.addEventListener("touchend", () => {
  if (Math.abs(touchDeltaX) < 45) {
    return;
  }

  suppressNextGalleryClick = true;
  window.setTimeout(() => {
    suppressNextGalleryClick = false;
  }, 400);
  moveGallery(touchDeltaX < 0 ? "next" : "previous");
});

galleryViewport.addEventListener("touchcancel", () => {
  touchDeltaX = 0;
}, { passive: true });

measureSlideStep();
updateGalleryStatus();

if ("ResizeObserver" in window) {
  const galleryResizeObserver = new ResizeObserver(scheduleSlideMeasurement);
  galleryResizeObserver.observe(galleryViewport);
} else {
  window.addEventListener("resize", scheduleSlideMeasurement, { passive: true });
}

closeButton.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("active")) {
    closeLightbox();
  }

  if (event.key === "Tab" && lightbox.classList.contains("active")) {
    event.preventDefault();
    closeButton.focus();
  }
});
