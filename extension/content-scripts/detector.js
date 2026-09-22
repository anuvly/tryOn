// detector.js
// Runs on every page. Finds products using a layered strategy, from most to
// least reliable, and reports normalized product objects back to the
// extension. Never sends full-page content — only what's needed to identify
// products.

const CATEGORY_KEYWORDS = {
  dress: ["dress", "gown", "frock"],
  top: ["t-shirt", "tshirt", "tee", "top", "blouse", "shirt"],
  jacket: ["jacket", "coat", "blazer", "hoodie"],
  pants: ["pants", "trousers", "jeans", "chinos", "leggings"],
  shoes: ["shoe", "sneaker", "boot", "heel", "sandal", "trainer"],
  necklace: ["necklace", "pendant", "chain"],
  jewelry: ["ring", "bracelet", "earring", "jewel"],
  accessory: ["bag", "scarf", "belt", "hat", "sunglasses", "watch"]
};

function inferCategory(text) {
  const lower = (text || "").toLowerCase();
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return category;
  }
  return "unknown";
}

function absolutize(url) {
  if (!url) return null;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return null;
  }
}

// --- Layer 1: JSON-LD structured data (most reliable) ---------------------
function detectFromJsonLd() {
  const products = [];
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  scripts.forEach((script) => {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      return;
    }
    const items = Array.isArray(data) ? data : [data];

    items.forEach((item) => {
      const graph = item["@graph"] ? item["@graph"] : [item];
      graph.forEach((entry) => {
        const type = entry["@type"];
        const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) return;

        const images = []
          .concat(entry.image || [])
          .map((img) => (typeof img === "string" ? img : img?.url))
          .filter(Boolean)
          .map(absolutize);

        const offers = Array.isArray(entry.offers) ? entry.offers[0] : entry.offers;

        products.push({
          title: entry.name || document.title,
          images: [...new Set(images)],
          price: offers?.price ? `${offers.priceCurrency || ""} ${offers.price}`.trim() : null,
          description: entry.description || null,
          category: inferCategory(`${entry.name} ${entry.description}`),
          sourceUrl: window.location.href,
          detectionMethod: "json-ld"
        });
      });
    });
  });

  return products;
}

// --- Layer 2: Open Graph / meta tags ---------------------------------------
function detectFromMetaTags() {
  const get = (name) =>
    document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content || null;

  const title = get("og:title") || document.title;
  const image = absolutize(get("og:image"));
  const priceAmount = get("product:price:amount") || get("og:price:amount");
  const priceCurrency = get("product:price:currency") || get("og:price:currency") || "";
  const description = get("og:description");

  if (!image && !title) return [];

  return [
    {
      title,
      images: image ? [image] : [],
      price: priceAmount ? `${priceCurrency} ${priceAmount}`.trim() : null,
      description,
      category: inferCategory(`${title} ${description}`),
      sourceUrl: window.location.href,
      detectionMethod: "meta-tags"
    }
  ];
}

// --- Layer 3: Shopify-specific endpoint ------------------------------------
async function detectFromShopify() {
  if (!window.Shopify) return [];
  const match = window.location.pathname.match(/\/products\/([a-zA-Z0-9-]+)/);
  if (!match) return [];

  try {
    const res = await fetch(`/products/${match[1]}.js`);
    if (!res.ok) return [];
    const data = await res.json();
    const images = (data.images || []).map(absolutize).filter(Boolean);

    return [
      {
        title: data.title,
        images,
        price: data.price ? `$${(data.price / 100).toFixed(2)}` : null,
        description: data.description?.replace(/<[^>]+>/g, " ").trim() || null,
        category: inferCategory(`${data.title} ${data.product_type}`),
        sourceUrl: window.location.href,
        detectionMethod: "shopify-api",
        variants: (data.variants || []).map((v) => ({
          id: v.id,
          title: v.title,
          image: absolutize(v.featured_image?.src)
        }))
      }
    ];
  } catch {
    return [];
  }
}

// --- Layer 4: DOM heuristics (fallback, listing pages) ---------------------
function detectFromDom() {
  const priceRegex = /[$€£¥]\s?\d+([.,]\d{2})?/;
  const candidates = [];
  const cards = document.querySelectorAll(
    'a[href*="/product"], a[href*="/item"], [class*="product-card"], [class*="product-tile"], [itemtype*="Product"]'
  );

  cards.forEach((card) => {
    const img = card.querySelector("img");
    const text = card.textContent || "";
    if (!img || !priceRegex.test(text)) return;

    const priceMatch = text.match(priceRegex);
    const title =
      card.querySelector("h1,h2,h3,[class*='title'],[class*='name']")?.textContent?.trim() ||
      img.alt ||
      "Product";

    candidates.push({
      title: title.trim(),
      images: [absolutize(img.src || img.dataset.src)].filter(Boolean),
      price: priceMatch ? priceMatch[0] : null,
      description: null,
      category: inferCategory(`${title} ${img.alt}`),
      sourceUrl: absolutize(card.href) || window.location.href,
      detectionMethod: "dom-heuristic"
    });
  });

  // De-duplicate by image URL, cap to a reasonable number for a listing page
  const seen = new Set();
  return candidates
    .filter((p) => {
      const key = p.images[0] || p.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
}

async function detectProducts() {
  const jsonLd = detectFromJsonLd();
  if (jsonLd.length) return jsonLd;

  const shopify = await detectFromShopify();
  if (shopify.length) return shopify;

  const meta = detectFromMetaTags();
  const dom = detectFromDom();

  // On a single-product page, prefer the meta result; on a listing page,
  // the DOM pass usually finds more.
  return dom.length > meta.length ? dom : meta;
}

let lastSentSignature = "";

async function runDetectionAndReport() {
  const products = await detectProducts();
  const signature = JSON.stringify(products.map((p) => p.sourceUrl + p.images[0]));
  if (signature === lastSentSignature) return; // avoid redundant messages
  lastSentSignature = signature;

  chrome.runtime.sendMessage({
    type: "PRODUCTS_DETECTED",
    payload: { products, pageUrl: window.location.href }
  });
}

// Initial pass
runDetectionAndReport();

// Re-run on meaningful DOM changes (throttled), for SPA storefronts that
// swap product content without a full page navigation.
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runDetectionAndReport, 800);
});
observer.observe(document.body, { childList: true, subtree: true });

// Respond to on-demand re-scan requests from the side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REQUEST_RESCAN") {
    lastSentSignature = ""; // force resend
    runDetectionAndReport();
    sendResponse({ ok: true });
  }
});
