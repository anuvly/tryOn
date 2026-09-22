// api.js — thin wrapper the side panel uses to talk to the background
// service worker, which in turn talks to the backend.

function sendMessage(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

export const api = {
  getProductsForActiveTab: () => sendMessage({ type: "GET_PRODUCTS_FOR_ACTIVE_TAB" }),

  rescan: () => sendMessage({ type: "REQUEST_RESCAN_ACTIVE_TAB" }),

  request: (path, { method = "GET", body, isFormData = false } = {}) =>
    sendMessage({ type: "API_REQUEST", payload: { method, path, body, isFormData } }),

  // Profile
  getProfile: (profileId) => api.request(`/profile/${profileId}`),
  createProfile: () => api.request("/profile", { method: "POST" }),
  uploadProfilePhoto: (profileId, slot, file) =>
    fileToDataUrl(file).then((dataUrl) =>
      api.request(`/profile/${profileId}/photo`, {
        method: "PUT",
        isFormData: true,
        body: { fields: { slot }, files: [{ field: "photo", name: file.name, dataUrl }] }
      })
    ),
  deleteProfile: (profileId) => api.request(`/profile/${profileId}`, { method: "DELETE" }),

  // Try-on
  startTryOn: (profileId, product) =>
    api.request("/tryon", { method: "POST", body: { profileId, product, category: product.category } }),
  getTryOnStatus: (jobId) => api.request(`/tryon/${jobId}`),

  // Results
  getResults: (profileId) => api.request(`/results?profileId=${profileId}`),
  deleteResult: (resultId) => api.request(`/results/${resultId}`, { method: "DELETE" })
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getLocalProfileId() {
  return new Promise((resolve) => {
    chrome.storage.local.get("profileId", (res) => resolve(res.profileId || null));
  });
}

export function setLocalProfileId(id) {
  return new Promise((resolve) => chrome.storage.local.set({ profileId: id }, resolve));
}
