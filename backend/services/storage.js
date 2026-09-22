// storage.js
//
// TODO (production): replace with real S3 (or R2/Supabase Storage) calls.
// Keep this exact interface — save/getSignedUrl/delete — so swapping the
// implementation doesn't require touching route code. A real implementation
// would:
//   - upload with a private ACL
//   - generate short-lived signed GET URLs (e.g. 15 min expiry) instead of
//     returning a static path
//   - store objects under a per-user prefix, e.g. `profiles/{profileId}/...`

import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

export const storage = {
  /**
   * Save a buffer under a category folder ("profiles" | "results") and
   * return the storage key used to retrieve it later.
   */
  save(category, buffer, extension = "jpg") {
    const dir = path.join(UPLOADS_DIR, category);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const key = `${category}/${uuid()}.${extension}`;
    writeFileSync(path.join(UPLOADS_DIR, key), buffer);
    return key;
  },

  /**
   * In production this returns a signed, expiring URL. Locally, it returns
   * a path served by the static file middleware in server.js.
   */
  getUrl(key) {
    if (!key) return null;
    const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    return `${base}/uploads/${key}`;
  },

  delete(key) {
    const filePath = path.join(UPLOADS_DIR, key);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
};
