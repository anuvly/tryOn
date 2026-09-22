import { Router } from "express";
import { db } from "../db.js";
import { storage } from "../services/storage.js";

const router = Router();

// GET /results?profileId=...
router.get("/", (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: "profileId query param required" });

  const results = db.getResultsForProfile(profileId).map((r) => ({
    id: r.id,
    productTitle: r.productTitle,
    createdAt: r.createdAt,
    url: storage.getUrl(r.storageKey)
  }));

  res.json({ results });
});

// DELETE /results/:id
router.delete("/:id", (req, res) => {
  const result = db.getResult(req.params.id);
  if (!result) return res.status(404).json({ error: "Result not found" });

  storage.delete(result.storageKey);
  db.deleteResult(result.id);
  res.json({ ok: true });
});

export default router;
