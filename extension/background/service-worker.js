const BACKEND_URL = "http://localhost:3000";

// Store detected products per tab ID
const tabProductsMap = new Map();

// Automatically open the side panel when clicking the extension icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Side panel setup error:", error));

// Clean up stored products when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabProductsMap.delete(tabId);
});

// Listen for messaging from content scripts or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCTS_DETECTED") {
    const tabId = sender.tab ? sender.tab.id : null;
    const products = message.payload?.products || [];
    if (tabId) {
      tabProductsMap.set(tabId, products);
    }
    // Forward detected products to runtime/sidepanel safely
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore errors if sidepanel is closed when products are detected
    });
  } else if (message.type === "GET_PRODUCTS_FOR_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const products = activeTab ? tabProductsMap.get(activeTab.id) || [] : [];
      sendResponse({ payload: { products } });
    });
    return true;
  } else if (message.type === "REQUEST_RESCAN_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: "REQUEST_RESCAN" }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: "Content script not active on this tab." });
          } else {
            sendResponse({ ok: true, response });
          }
        });
      } else {
        sendResponse({ ok: false, error: "No active tab found." });
      }
    });
    return true;
  } else if (message.type === "API_REQUEST") {
    const { method = "GET", path, body, isFormData } = message.payload;
    const url = `${BACKEND_URL}${path}`;

    const fetchOptions = {
      method,
      headers: {}
    };

    if (body) {
      if (isFormData) {
        // Construct FormData if dataUrl file attachments exist
        const formData = new FormData();
        if (body.fields) {
          Object.entries(body.fields).forEach(([k, v]) => formData.append(k, v));
        }
        if (body.files && Array.isArray(body.files)) {
          body.files.forEach((f) => {
            if (f.dataUrl) {
              const arr = f.dataUrl.split(",");
              const mime = arr[0].match(/:(.*?);/)[1];
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const blob = new Blob([u8arr], { type: mime });
              formData.append(f.field || "photo", blob, f.name || "photo.jpg");
            }
          });
        }
        fetchOptions.body = formData;
      } else {
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(body);
      }
    }

    fetch(url, fetchOptions)
      .then(async (res) => {
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        if (!res.ok) {
          sendResponse({ ok: false, error: data?.error || `HTTP ${res.status}` });
        } else {
          sendResponse({ ok: true, data });
        }
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message || "Network error" });
      });

    return true;
  }

  return true;
});