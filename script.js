// ============================================
// TGJunkRemoval front-end
// ============================================

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby8iQsaHh78zpna7Xw8MGzEfNJS-pdvjqm63Dff2Ujsf8bppDMJYAh8MeEtKeYOXmNI/exec";

const MAX_PHOTOS = 4;
const MAX_SOURCE_SIZE_MB = 12;

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const header = document.querySelector(".site-header");
const quoteForm = document.getElementById("quoteForm");
const photoInput = document.getElementById("photoInput");
const uploadTrigger = document.getElementById("uploadTrigger");
const previewGrid = document.getElementById("previewGrid");
const submitBtn = document.getElementById("submitBtn");
const formStatus = document.getElementById("formStatus");

let selectedPhotos = [];

// Current year
document.getElementById("year").textContent = new Date().getFullYear();

// ============================================
// Mobile navigation
// ============================================

menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });
});

// ============================================
// Header scroll effect
// ============================================

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 15);
});

// ============================================
// FAQ accordion
// ============================================

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const isOpen = item.classList.contains("open");

    document.querySelectorAll(".faq-item").forEach((row) => {
      row.classList.remove("open");
      row.querySelector("button").setAttribute("aria-expanded", "false");
      row.querySelector("button b").textContent = "+";
    });

    if (!isOpen) {
      item.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      button.querySelector("b").textContent = "−";
    }
  });
});

// ============================================
// Scroll reveal animation
// ============================================

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
  },
);

document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

// ============================================
// Photo upload
// ============================================

uploadTrigger.addEventListener("click", () => {
  photoInput.click();
});

photoInput.addEventListener("change", async () => {
  const incoming = Array.from(photoInput.files || []);

  for (const file of incoming) {
    if (selectedPhotos.length >= MAX_PHOTOS) {
      break;
    }

    if (!file.type.startsWith("image/")) {
      continue;
    }

    if (file.size > MAX_SOURCE_SIZE_MB * 1024 * 1024) {
      showStatus(
        `"${file.name}" is too large. Please choose an image under ${MAX_SOURCE_SIZE_MB} MB.`,
        "error",
      );

      continue;
    }

    // Prevent duplicate photo selection
    const duplicate = selectedPhotos.some(
      (photo) => photo.file.name === file.name && photo.file.size === file.size,
    );

    if (!duplicate) {
      selectedPhotos.push({
        file,
      });
    }
  }

  photoInput.value = "";

  renderPreviews();
});

// ============================================
// Photo preview
// ============================================

function renderPreviews() {
  previewGrid.innerHTML = "";

  selectedPhotos.forEach((photo, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "photo-preview";

    const img = document.createElement("img");

    img.alt = `Selected upload ${index + 1}`;
    img.src = URL.createObjectURL(photo.file);

    img.onload = () => {
      URL.revokeObjectURL(img.src);
    };

    const remove = document.createElement("button");

    remove.type = "button";
    remove.setAttribute("aria-label", `Remove photo ${index + 1}`);

    remove.textContent = "×";

    remove.addEventListener("click", () => {
      selectedPhotos.splice(index, 1);

      renderPreviews();
    });

    wrapper.append(img, remove);

    previewGrid.appendChild(wrapper);
  });

  // Hide upload button when 4 photos are selected
  uploadTrigger.style.display =
    selectedPhotos.length >= MAX_PHOTOS ? "none" : "flex";
}

// ============================================
// Compress images
// ============================================

async function compressImage(file) {
  const dataUrl = await fileToDataUrl(file);

  const image = await loadImage(dataUrl);

  const maxDimension = 1600;

  let { width, height } = image;

  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);

    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0, width, height);

  return {
    name: file.name.replace(/\.[^.]+$/, "") + ".jpg",

    type: "image/jpeg",

    dataUrl: canvas.toDataURL("image/jpeg", 0.78),
  };
}

// ============================================
// Convert file to data URL
// ============================================

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read selected image."));
    };

    reader.readAsDataURL(file);
  });
}

// ============================================
// Load image
// ============================================

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("Unable to process selected image."));
    };

    img.src = src;
  });
}

// ============================================
// Form status message
// ============================================

function showStatus(message, type) {
  formStatus.textContent = message;

  formStatus.className = `form-status ${type}`;
}

// ============================================
// Quote form submission
// ============================================

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  formStatus.className = "form-status";

  formStatus.textContent = "";

  // Validate browser-required fields
  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();

    showStatus("Please complete all required fields.", "error");

    return;
  }

  // Make sure Apps Script URL exists
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_YOUR_")) {
    showStatus(
      "Website form is ready, but the Google Apps Script URL still needs to be added in script.js.",
      "error",
    );

    return;
  }

  setLoading(true);

  try {
    const formData = new FormData(quoteForm);

    const photos = [];

    // Compress all selected photos
    for (const item of selectedPhotos) {
      const compressedPhoto = await compressImage(item.file);

      photos.push(compressedPhoto);
    }

    // Build form payload
    const payload = {
      firstName: formData.get("firstName"),

      lastName: formData.get("lastName"),

      phone: formData.get("phone"),

      email: formData.get("email"),

      address: formData.get("address"),

      serviceType: formData.get("serviceType"),

      contactMethod: formData.get("contactMethod"),

      details: formData.get("details"),

      consent: formData.get("consent") === "on",

      photos,

      submittedAt: new Date().toISOString(),

      source: window.location.href,
    };

    // Convert payload into form data Google Apps Script can read
    const body = new URLSearchParams();

    body.append("payload", JSON.stringify(payload));

    // Send request to Google Apps Script
    //
    // mode: "no-cors" allows the browser
    // to submit across domains.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",

      mode: "no-cors",

      body,
    });

    // Since no-cors prevents reading the response,
    // reaching this point means the browser sent the request.

    showStatus(
      "Thank you! Your quote request was sent successfully. TGJunkRemoval will contact you soon.",
      "success",
    );

    // Clear form
    quoteForm.reset();

    selectedPhotos = [];

    renderPreviews();

    formStatus.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } catch (error) {
    console.error("Quote form error:", error);

    showStatus(
      "We couldn't send your request. Please try again or contact TGJunkRemoval directly.",
      "error",
    );
  } finally {
    setLoading(false);
  }
});

// ============================================
// Submit button loading state
// ============================================

function setLoading(loading) {
  submitBtn.disabled = loading;

  submitBtn.classList.toggle("loading", loading);

  submitBtn.querySelector(".btn-label").textContent = loading
    ? "Sending Request..."
    : "Send My Quote Request";
}
