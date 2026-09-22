<<<<<<< HEAD
# Mirror — Virtual Try-On Chrome Extension

A working scaffold: a Chrome extension that detects products on any shopping
site and a backend that orchestrates AI virtual try-on. This is a runnable
starting point, not a finished product — see "What's mocked" below.

## Project layout

```
extension/          Chrome extension (Manifest V3)
  manifest.json
  sidepanel/         Side panel UI (HTML/CSS/JS, no build step)
  background/        Service worker — mediates all backend calls
  content-scripts/   Product detection (runs on shopping pages)
  shared/            api.js — side panel's interface to the backend
  icons/

backend/            Node/Express API
  server.js
  routes/            profile, tryon, results
  services/
    storage.js       Local-disk stand-in for S3
    aiProvider.js     Mock generator + template for a real AI provider
  db.js              JSON-file data store (swap for Postgres later)
  data/, uploads/    Runtime data (gitignored)
```

## Running the backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

This starts the API at `http://localhost:4000`. Check it's up:

```bash
curl http://localhost:4000/health
# {"ok":true}
```

## Loading the extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` folder
4. Pin the extension, then click its icon on any shopping site to open the side panel

The extension talks to `http://localhost:4000` by default — see
`extension/background/service-worker.js` (`BACKEND_URL`) to point it at a
deployed backend instead.

## Trying it end to end

1. With the backend running and the extension loaded, open a product page on
   any shopping site (a Shopify store will get the cleanest detection —
   `detector.js` uses the `/products/{handle}.js` endpoint when it detects
   `window.Shopify`).
2. Click the extension icon → complete the profile photo wizard (any photos
   work for testing; real fit-quality only matters once you're using a real
   AI provider).
3. Select a detected product → **Try it on** → the mock provider returns a
   result after ~2 seconds so you can verify the whole pipeline works.

## What's mocked (and how to make it real)

- **`backend/services/aiProvider.js`** — currently returns the product image
  back as a placeholder "result." Two real integration paths are sketched in
  comments in that file: a general image-editing model (Gemini/GPT image,
  conditioned on both the profile photo and product image) or a dedicated
  try-on model (e.g. IDM-VTON via Replicate). Swap the mock block for one of
  these.
- **`backend/services/storage.js`** — saves files to local disk instead of
  S3. The interface (`save` / `getUrl` / `delete`) is designed to be a
  drop-in swap for real cloud storage without touching route code.
- **`backend/db.js`** — a JSON file instead of Postgres. The comments at the
  top of the file include the suggested schema for porting.
- **Auth** — there is none yet. Every profile is created anonymously by the
  extension on first run and its ID is kept in `chrome.storage.local`. Add
  real auth before deploying beyond local testing.

## Product detection strategy

`content-scripts/detector.js` tries, in order:
1. JSON-LD `Product` structured data (most e-commerce sites have this)
2. Shopify's `/products/{handle}.js` endpoint, when `window.Shopify` exists
3. Open Graph / meta tags
4. DOM heuristics (image + nearby price pattern), for listing pages or sites
   with none of the above

Test across a few real sites with different structures — you'll likely need
to tune the DOM heuristic selectors in step 4 for sites you demo on.

## Known limitations (by design, for a first pass)

- Jewelry/small-accessory placement is the hardest category for any current
  try-on approach — expect to spend the most iteration time there, or scope
  it as "architecturally supported" rather than polished for a demo.
- The DOM-heuristic detection layer is intentionally generic; it won't be as
  reliable as the structured-data layers. Add site-specific tweaks only if
  you need a particular site to work well for your demo.
- No image compression/resizing is implemented yet before upload — see the
  build guide's Phase 8 (Performance) for what to add next.

## License

Build freely on this scaffold for your coursework/project.
=======
# tryOn
>>>>>>> 7f6d8bd032ff5ea5564f5b2c6aa646b0b75d0a0d
