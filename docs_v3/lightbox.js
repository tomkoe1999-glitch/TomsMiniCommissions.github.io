const galleryItems = document.querySelectorAll(".gallery-item");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxLoading = document.querySelector("#lightbox-loading");
const closeButton = document.querySelector("#lightbox-close");

let previouslyFocusedElement = null;
let requestedImage = null;

function openLightbox(item) {
  const thumbnail = item.querySelector("img");
  const fullImageUrl = item.dataset.large;
  const caption = item.dataset.caption;

  previouslyFocusedElement = item;
  lightboxImage.src = thumbnail.currentSrc || thumbnail.src;
  lightboxImage.alt = thumbnail.alt;
  lightboxCaption.textContent = caption;
  lightboxLoading.hidden = false;
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  closeButton.focus();

  const imageRequest = new Image();
  requestedImage = imageRequest;
  imageRequest.onload = () => {
    if (requestedImage !== imageRequest || !lightbox.classList.contains("active")) {
      return;
    }

    lightboxImage.src = fullImageUrl;
    lightboxLoading.hidden = true;
  };
  imageRequest.onerror = () => {
    if (requestedImage !== imageRequest || !lightbox.classList.contains("active")) {
      return;
    }

    lightboxLoading.textContent = "High-resolution image could not be loaded";
  };
  imageRequest.src = fullImageUrl;
}

function closeLightbox() {
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lightboxImage.removeAttribute("src");
  lightboxImage.alt = "";
  lightboxLoading.textContent = "Loading high-resolution image…";
  lightboxLoading.hidden = true;
  requestedImage = null;

  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

galleryItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    openLightbox(item);
  });
});

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
