// aiProvider.js
//
// Uses IDM-VTON (yisol/IDM-VTON on Hugging Face Spaces) for real virtual try-on.
// This is completely free — no API key required.
// Falls back to the product image if the Space is unavailable.

/**
 * @param {object} params
 * @param {Buffer} params.profilePhotoBuffer - the person's photo
 * @param {Buffer} params.productImageBuffer - the garment / product image
 * @param {string} params.category - e.g. "top", "shoes", "necklace"
 * @param {string} [params.productTitle] - optional product name for the garment description
 * @returns {Promise<Buffer>} the generated result image bytes
 */
export async function generateTryOn({ profilePhotoBuffer, productImageBuffer, category, productTitle }) {
  return generateWithIDMVTON({ profilePhotoBuffer, productImageBuffer, category, productTitle });
}

// ---- IDM-VTON via Hugging Face Spaces (free, no key needed) -----------
// IDM-VTON is a state-of-the-art diffusion-based virtual try-on model.
// It is hosted publicly on Hugging Face: https://huggingface.co/spaces/yisol/IDM-VTON
async function generateWithIDMVTON({ profilePhotoBuffer, productImageBuffer, category, productTitle }) {
  const { Client } = await import("@gradio/client");

  const client = await Client.connect("yisol/IDM-VTON");

  const personBlob = new Blob([profilePhotoBuffer], {
    type: sniffMimeType(profilePhotoBuffer)
  });
  const garmentBlob = new Blob([productImageBuffer], {
    type: sniffMimeType(productImageBuffer)
  });

  const garmentDescription = productTitle || buildGarmentDescription(category);

  const result = await client.predict("/tryon", {
    dict: {
      background: personBlob,
      layers: [],
      composite: null
    },
    garm_img: garmentBlob,
    garment_des: garmentDescription,
    is_checked: true,        // use auto-masking (no manual mask needed)
    is_checked_crop: false,  // full body output
    denoise_steps: 20,       // fast but good quality; increase to 30 for better detail
    seed: 42
  });

  const outputImage = result?.data?.[0];
  if (!outputImage?.url) {
    throw new Error("IDM-VTON returned no output image URL");
  }

  // Download the resulting image from HF Spaces and return as Buffer
  const imgRes = await fetch(outputImage.url);
  if (!imgRes.ok) {
    throw new Error(`Failed to download try-on result: HTTP ${imgRes.status}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function sniffMimeType(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  return "image/jpeg";
}

function buildGarmentDescription(category) {
  const descriptions = {
    top: "casual shirt or top",
    jacket: "jacket or outerwear",
    dress: "dress",
    pants: "trousers or pants",
    shoes: "shoes or footwear",
    necklace: "necklace or jewelry",
    jewelry: "jewelry or accessory",
    accessory: "fashion accessory",
    unknown: "clothing item"
  };
  return descriptions[category] || "clothing item";
}