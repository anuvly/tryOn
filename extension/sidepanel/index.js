import { api, getLocalProfileId, setLocalProfileId } from "../shared/api.js";

// Profile photo slots. Extensible: add a new entry here and the onboarding
// flow, readiness checks, and category→slot mapping all pick it up.
const PROFILE_SLOTS = [
  { id: "full_body", label: "Full-body photo", hint: "Stand facing the camera, arms relaxed, plain background, good light." },
  { id: "upper_body", label: "Upper-body photo", hint: "Waist-up, facing forward, arms slightly away from your body." },
  { id: "lower_body", label: "Leg photo", hint: "Full legs visible, standing straight, fitted or plain clothing." },
  { id: "feet", label: "Foot photo", hint: "Both feet visible from the side, flat on the ground." },
  { id: "face", label: "Face photo", hint: "Front-facing, neutral expression, even lighting, no sunglasses." },
  { id: "neck_closeup", label: "Neck close-up", hint: "Shoulders-up close-up, hair pulled back if possible." }
];

// Which profile slot a product category needs for a realistic try-on.
const CATEGORY_TO_SLOT = {
  dress: "full_body",
  top: "upper_body",
  jacket: "upper_body",
  pants: "lower_body",
  shoes: "feet",
  necklace: "neck_closeup",
  jewelry: "neck_closeup",
  accessory: "upper_body",
  unknown: "full_body"
};

const state = {
  profileId: null,
  profile: null, // { slots: { full_body: true, ... } }
  products: [],
  selectedProduct: null,
  selectedImageIndex: 0,
  captureSlotId: null,
  captureFile: null
};

// --- Element lookups --------------------------------------------------
const els = {
  views: {
    onboarding: document.getElementById("view-onboarding"),
    capture: document.getElementById("view-capture"),
    main: document.getElementById("view-main")
  },
  slotList: document.getElementById("slotList"),
  startProfileBtn: document.getElementById("startProfileBtn"),

  captureBack: document.getElementById("captureBack"),
  captureTitle: document.getElementById("captureTitle"),
  captureHint: document.getElementById("captureHint"),
  captureDropzone: document.getElementById("captureDropzone"),
  captureInput: document.getElementById("captureInput"),
  captureFrameLabel: document.getElementById("captureFrameLabel"),
  captureSaveBtn: document.getElementById("captureSaveBtn"),

  profileChipLabel: document.getElementById("profileChipLabel"),
  manageProfileBtn: document.getElementById("manageProfileBtn"),
  productsEmpty: document.getElementById("productsEmpty"),
  productStrip: document.getElementById("productStrip"),

  detailPanel: document.getElementById("detailPanel"),
  detailFrame: document.getElementById("detailFrame"),
  detailImage: document.getElementById("detailImage"),
  detailTitle: document.getElementById("detailTitle"),
  detailPrice: document.getElementById("detailPrice"),
  detailImageThumbs: document.getElementById("detailImageThumbs"),
  tryOnBtn: document.getElementById("tryOnBtn"),
  missingPhotoNote: document.getElementById("missingPhotoNote"),

  progressPanel: document.getElementById("progressPanel"),
  progressLabel: document.getElementById("progressLabel"),

  resultPanel: document.getElementById("resultPanel"),
  resultImage: document.getElementById("resultImage"),
  saveResultBtn: document.getElementById("saveResultBtn"),
  retryResultBtn: document.getElementById("retryResultBtn"),
  tryAnotherBtn: document.getElementById("tryAnotherBtn"),

  errorPanel: document.getElementById("errorPanel"),
  errorMessage: document.getElementById("errorMessage"),
  errorRetryBtn: document.getElementById("errorRetryBtn"),

  rescanBtn: document.getElementById("rescanBtn"),
  rescanBtn2: document.getElementById("rescanBtn2")
};

function showView(name) {
  Object.entries(els.views).forEach(([key, el]) => { el.hidden = key !== name; });
}

// --- Onboarding ---------------------------------------------------------
function renderSlotList() {
  els.slotList.innerHTML = "";
  const emptyFrame = document.getElementById("onboardingEmptyFrame");
  const filledCount = PROFILE_SLOTS.filter((s) => state.profile?.slots?.[s.id]).length;
  const isAllComplete = filledCount === PROFILE_SLOTS.length;
  
  if (emptyFrame) {
    // Hide top banner if any profile photos have been uploaded
    if (filledCount > 0) {
      emptyFrame.style.display = "none";
    } else {
      emptyFrame.style.display = "flex";
    }
  }

  PROFILE_SLOTS.forEach((slot) => {
    const done = state.profile?.slots?.[slot.id];
    const photoUrl = state.profile?.photoUrls?.[slot.id];
    const li = document.createElement("li");
    li.className = "slot-item";
    
    const thumbHtml = photoUrl 
      ? `<img src="${photoUrl}" class="slot-thumb" alt="${slot.label}" />`
      : `<div class="slot-thumb-placeholder"></div>`;

    li.innerHTML = `
      <div class="slot-info">
        ${thumbHtml}
        <span>${slot.label}</span>
      </div>
      <span class="slot-status ${done ? "done" : ""}">${done ? "✓ Added" : "Not added"}</span>
    `;
    li.addEventListener("click", () => openCapture(slot.id));
    els.slotList.appendChild(li);
  });
}

function openCapture(slotId) {
  const slot = PROFILE_SLOTS.find((s) => s.id === slotId);
  state.captureSlotId = slotId;
  state.captureFile = null;
  els.captureTitle.textContent = slot.label;
  els.captureHint.textContent = slot.hint;
  els.captureFrameLabel.textContent = "Tap to choose a photo";
  els.captureDropzone.classList.remove("has-image");
  els.captureDropzone.querySelectorAll("img").forEach((n) => n.remove());
  els.captureSaveBtn.disabled = true;
  showView("capture");
}

els.startProfileBtn.addEventListener("click", () => {
  const nextSlot = PROFILE_SLOTS.find((s) => !state.profile?.slots?.[s.id]) || PROFILE_SLOTS[0];
  openCapture(nextSlot.id);
});

els.captureBack.addEventListener("click", () => showView(state.profile ? "main" : "onboarding"));

els.captureDropzone.addEventListener("click", () => els.captureInput.click());

els.captureInput.addEventListener("change", () => {
  const file = els.captureInput.files[0];
  if (!file) return;
  state.captureFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    els.captureFrameLabel.textContent = "";
    let img = els.captureDropzone.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      els.captureDropzone.appendChild(img);
    }
    img.src = reader.result;
    els.captureDropzone.classList.add("has-image");
    els.captureSaveBtn.disabled = false;
  };
  reader.readAsDataURL(file);
});

els.captureSaveBtn.addEventListener("click", async () => {
  if (!state.captureFile || !state.profileId) return;
  els.captureSaveBtn.disabled = true;
  els.captureSaveBtn.textContent = "Saving…";

  const res = await api.uploadProfilePhoto(state.profileId, state.captureSlotId, state.captureFile);

  els.captureSaveBtn.textContent = "Save photo";
  if (!res?.ok) {
    if (res?.error?.includes("not found") || res?.error?.includes("404")) {
      // Profile ID in storage expired on backend — recreate profile and retry
      const created = await api.createProfile();
      if (created?.ok) {
        state.profileId = created.data.profileId;
        await setLocalProfileId(state.profileId);
        const retryRes = await api.uploadProfilePhoto(state.profileId, state.captureSlotId, state.captureFile);
        if (retryRes?.ok) {
          state.profile = retryRes.data.profile;
          updateProfileStatusBadge();
          renderSlotList();
          showView("main");
          refreshProducts();
          return;
        }
      }
    }
    els.captureSaveBtn.disabled = false;
    alert(res?.error || "Couldn't save that photo — try again.");
    return;
  }

  state.profile = res.data.profile;
  updateProfileStatusBadge();
  const nextSlot = PROFILE_SLOTS.find((s) => !state.profile.slots?.[s.id]);
  if (nextSlot) {
    openCapture(nextSlot.id);
  } else {
    renderSlotList();
    showView("main");
    refreshProducts();
  }
});

// --- Main view: products --------------------------------------------------
function renderProducts() {
  els.productStrip.innerHTML = "";
  const hasProducts = state.products.length > 0;
  els.productsEmpty.hidden = hasProducts;
  els.productStrip.hidden = !hasProducts;

  state.products.forEach((product, index) => {
    const btn = document.createElement("button");
    btn.className = "product-card" + (state.selectedProduct === product ? " selected" : "");
    btn.innerHTML = `
      <img src="${product.images[0] || ""}" alt="" />
      <span class="product-card-title">${escapeHtml(product.title || "Product")}</span>
    `;
    btn.addEventListener("click", () => selectProduct(product));
    els.productStrip.appendChild(btn);
  });

  if (!hasProducts) {
    clearDetail();
  }
}

function selectProduct(product) {
  state.selectedProduct = product;
  state.selectedImageIndex = 0;
  renderProducts();
  renderDetail();
}

function clearDetail() {
  state.selectedProduct = null;
  els.detailPanel.hidden = true;
  els.resultPanel.hidden = true;
  els.progressPanel.hidden = true;
  els.errorPanel.hidden = true;
}

function renderDetail() {
  const product = state.selectedProduct;
  if (!product) return clearDetail();

  els.resultPanel.hidden = true;
  els.progressPanel.hidden = true;
  els.errorPanel.hidden = true;
  els.detailPanel.hidden = false;

  els.detailImage.src = product.images[state.selectedImageIndex] || "";
  els.detailTitle.textContent = product.title || "Product";
  els.detailPrice.textContent = product.price || "";

  els.detailImageThumbs.innerHTML = "";
  if (product.images.length > 1) {
    product.images.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      if (i === state.selectedImageIndex) img.classList.add("active");
      img.addEventListener("click", () => {
        state.selectedImageIndex = i;
        renderDetail();
      });
      els.detailImageThumbs.appendChild(img);
    });
  }

  const requiredSlot = CATEGORY_TO_SLOT[product.category] || "full_body";
  const hasRequiredPhoto = !!state.profile?.slots?.[requiredSlot];
  els.tryOnBtn.disabled = !hasRequiredPhoto;
  els.missingPhotoNote.textContent = hasRequiredPhoto
    ? ""
    : `Add a ${PROFILE_SLOTS.find((s) => s.id === requiredSlot)?.label.toLowerCase()} to try this on.`;
}

els.tryOnBtn.addEventListener("click", startTryOn);
els.errorRetryBtn.addEventListener("click", startTryOn);
els.retryResultBtn.addEventListener("click", startTryOn);

els.tryAnotherBtn.addEventListener("click", () => {
  clearDetail();
  renderProducts();
});

els.saveResultBtn.addEventListener("click", () => {
  els.saveResultBtn.textContent = "Saved";
  els.saveResultBtn.disabled = true;
});

async function startTryOn() {
  const product = state.selectedProduct;
  if (!product || !state.profileId) return;

  els.detailPanel.hidden = true;
  els.errorPanel.hidden = true;
  els.resultPanel.hidden = true;
  els.progressPanel.hidden = false;
  els.progressLabel.textContent = "Uploading product details…";

  const startRes = await api.startTryOn(state.profileId, product);
  if (!startRes?.ok) return showError(startRes?.error || "Couldn't start generation.");

  const jobId = startRes.data.jobId;
  pollTryOn(jobId);
}

async function pollTryOn(jobId) {
  const labels = ["Analyzing the product…", "Generating your look…", "Finishing touches…"];
  let attempt = 0;

  const poll = async () => {
    const res = await api.getTryOnStatus(jobId);
    if (!res?.ok) return showError(res?.error || "Something went wrong during generation.");

    const { status, resultUrl, error } = res.data;
    if (status === "done") {
      els.detailPanel.hidden = true;
      els.progressPanel.hidden = true;
      els.resultPanel.hidden = false;
      els.resultImage.src = resultUrl;
      els.saveResultBtn.disabled = false;
      els.saveResultBtn.textContent = "Save";
      return;
    }
    if (status === "failed") {
      return showError(error || "Generation failed — try again.");
    }

    els.progressLabel.textContent = labels[Math.min(attempt, labels.length - 1)];
    attempt += 1;
    setTimeout(poll, 1500);
  };

  poll();
}

function showError(message) {
  els.progressPanel.hidden = true;
  els.resultPanel.hidden = true;
  els.errorPanel.hidden = false;
  els.errorMessage.textContent = message;
}

async function refreshProducts() {
  const res = await api.getProductsForActiveTab();
  state.products = res?.payload?.products || [];
  renderProducts();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PRODUCTS_DETECTED" || message.type === "PRODUCTS_UPDATED") {
    state.products = message.payload?.products || [];
    renderProducts();
  }
});

async function triggerRescan(btn) {
  if (btn) {
    btn.disabled = true;
    btn.classList.add("loading");
  }
  try {
    const res = await api.rescan();
    if (res?.ok) {
      await refreshProducts();
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  }
}

els.rescanBtn.addEventListener("click", () => triggerRescan(els.rescanBtn));
els.rescanBtn2.addEventListener("click", () => triggerRescan(els.rescanBtn2));

els.manageProfileBtn.addEventListener("click", () => {
  renderSlotList();
  showView("onboarding");
});

function updateProfileStatusBadge() {
  const filledCount = PROFILE_SLOTS.filter((s) => state.profile?.slots?.[s.id]).length;
  const chipDot = document.querySelector(".profile-chip-dot");

  if (filledCount === PROFILE_SLOTS.length) {
    els.profileChipLabel.textContent = "Profile complete";
    if (chipDot) chipDot.style.background = "#52c41a";
  } else if (filledCount > 0) {
    els.profileChipLabel.textContent = `Profile in progress (${filledCount}/${PROFILE_SLOTS.length})`;
    if (chipDot) chipDot.style.background = "#e59b4c";
  } else {
    els.profileChipLabel.textContent = "Profile incomplete";
    if (chipDot) chipDot.style.background = "#e54c4c";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Boot -----------------------------------------------------------------
async function init() {
  let profileId = await getLocalProfileId();

  if (!profileId) {
    const created = await api.createProfile();
    if (created?.ok) {
      profileId = created.data.profileId;
      await setLocalProfileId(profileId);
    }
  }

  state.profileId = profileId;

  if (profileId) {
    const res = await api.getProfile(profileId);
    if (res?.ok) {
      state.profile = res.data.profile;
    } else {
      // Stored profile ID invalid on backend — re-create
      const created = await api.createProfile();
      if (created?.ok) {
        state.profileId = created.data.profileId;
        await setLocalProfileId(state.profileId);
        state.profile = created.data.profile;
      }
    }
  }

  const hasAnySlotDone = PROFILE_SLOTS.some((s) => state.profile?.slots?.[s.id]);
  renderSlotList();
  updateProfileStatusBadge();

  if (hasAnySlotDone) {
    showView("main");
    refreshProducts();
  } else {
    showView("onboarding");
  }
}

init();
