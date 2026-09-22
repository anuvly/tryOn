import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { storage } from "../services/storage.js";
import { generateTryOn } from "../services/aiProvider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const router = Router();

// Which profile photo slot a category needs. Keep this in sync with the
// extension side panel's CATEGORY_TO_SLOT map.
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

// POST /tryon — body: { profileId, product: { title, images, category }, category }
router.post("/", async (req, res) => {
  const { profileId, product, category } = req.body || {};
  if (!profileId || !product?.images?.[0]) {
    return res.status(400).json({ error: "profileId and a product image are required" });
  }

  const profile = db.getProfile(profileId);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const requiredSlot = CATEGORY_TO_SLOT[category] || "full_body";
  const photoKey = profile.photos?.[requiredSlot];
  if (!photoKey) {
    return res.status(400).json({ error: `Missing required profile photo for category "${category}"` });
  }

  const job = db.createJob({
    id: uuid(),
    profileId,
    product,
    category,
    status: "processing",
    createdAt: new Date().toISOString()
  });

  // Respond immediately with the job id; generation continues in the
  // background and the extension polls GET /tryon/:jobId.
  res.json({ jobId: job.id });

  processJob(job.id, photoKey, product).catch((err) => {
    db.updateJob(job.id, { status: "failed", error: err.message || "Generation failed" });
  });
});

async function processJob(jobId, photoKey, product) {
  try {
    const profilePhotoBuffer = readFileSync(path.join(UPLOADS_DIR, photoKey));

    // Re-fetch the product image server-side rather than trusting whatever
    // bytes the client claims — the extension only ever sends a URL.
    const productImageRes = await fetch(product.images[0]);
    if (!productImageRes.ok) throw new Error("Could not fetch product image");
    const productImageBuffer = Buffer.from(await productImageRes.arrayBuffer());

    const resultBuffer = await generateTryOn({
      profilePhotoBuffer,
      productImageBuffer,
      category: product.category,
      productTitle: product.title || undefined
    });

    const resultKey = storage.save("results", resultBuffer, "jpg");
    const job = db.getJob(jobId);

    db.createResult({
      id: uuid(),
      profileId: job.profileId,
      productTitle: product.title,
      storageKey: resultKey,
      createdAt: new Date().toISOString()
    });

    db.updateJob(jobId, { status: "done", resultKey });
  } catch (err) {
    db.updateJob(jobId, { status: "failed", error: err.message || "Generation failed" });
  }
}

// GET /tryon/:jobId
router.get("/:jobId", (req, res) => {
  const job = db.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json({
    status: job.status,
    resultUrl: job.resultKey ? storage.getUrl(job.resultKey) : null,
    error: job.error || null
  });
});

export default router;
