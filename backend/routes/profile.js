import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { storage } from "../services/storage.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

const VALID_SLOTS = ["full_body", "upper_body", "lower_body", "feet", "face", "neck_closeup"];

function publicProfile(profile) {
  const slots = {};
  const photoUrls = {};
  for (const slotId of VALID_SLOTS) {
    const key = profile.photos?.[slotId];
    slots[slotId] = Boolean(key);
    if (key) photoUrls[slotId] = storage.getUrl(key);
  }
  return { id: profile.id, createdAt: profile.createdAt, slots, photoUrls };
}

// POST /profile — create a new empty profile
router.post("/", (req, res) => {
  const profile = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    photos: {}, // slotId -> storageKey
    consentTraining: false
  };
  db.createProfile(profile);
  res.json({ profileId: profile.id, profile: publicProfile(profile) });
});

// GET /profile/:id
router.get("/:id", (req, res) => {
  const profile = db.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ profile: publicProfile(profile) });
});

// PUT /profile/:id/photo — body: multipart form with `slot` field + `photo` file
router.put("/:id/photo", upload.single("photo"), (req, res) => {
  const profile = db.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const { slot } = req.body;
  if (!VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: `Invalid slot. Must be one of: ${VALID_SLOTS.join(", ")}` });
  }
  if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

  // Replace any existing photo for this slot
  if (profile.photos[slot]) storage.delete(profile.photos[slot]);

  const extension = (req.file.mimetype.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const key = storage.save("profiles", req.file.buffer, extension);

  const updated = db.updateProfile(profile.id, { photos: { ...profile.photos, [slot]: key } });
  res.json({ profile: publicProfile(updated) });
});

// DELETE /profile/:id — cascades to stored photos and generated results
router.delete("/:id", (req, res) => {
  const profile = db.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  Object.values(profile.photos || {}).forEach((key) => storage.delete(key));

  db.getResultsForProfile(profile.id).forEach((result) => {
    storage.delete(result.storageKey);
    db.deleteResult(result.id);
  });

  db.deleteProfile(profile.id);
  res.json({ ok: true });
});

export default router;
export { VALID_SLOTS };
