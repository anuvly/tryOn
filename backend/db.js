// db.js
//
// A minimal JSON-file data store so this backend runs with zero external
// services for local development/demo purposes.
//
// TODO (production): replace with Postgres. Suggested schema:
//
//   profiles(id UUID PK, created_at TIMESTAMPTZ, consent_training BOOLEAN)
//   profile_photos(id UUID PK, profile_id FK, slot TEXT, storage_key TEXT,
//                  created_at TIMESTAMPTZ)
//   tryon_jobs(id UUID PK, profile_id FK, product_title TEXT,
//              product_image_url TEXT, category TEXT, status TEXT,
//              result_key TEXT, error TEXT, created_at, updated_at)
//
// The JSON shape below mirrors that structure closely enough that porting
// is mostly a find/replace exercise.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

function load() {
  if (!existsSync(DB_PATH)) {
    return { profiles: {}, jobs: {}, results: {} };
  }
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function save(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Load once, keep in memory, persist on every mutation. Fine for a
// single-instance demo backend; a real deployment needs a real DB with
// proper concurrency handling.
let data = load();

export const db = {
  // --- profiles ---
  getProfile: (id) => data.profiles[id] || null,
  createProfile: (profile) => {
    data.profiles[profile.id] = profile;
    save(data);
    return profile;
  },
  updateProfile: (id, updates) => {
    if (!data.profiles[id]) return null;
    data.profiles[id] = { ...data.profiles[id], ...updates };
    save(data);
    return data.profiles[id];
  },
  deleteProfile: (id) => {
    delete data.profiles[id];
    save(data);
  },

  // --- try-on jobs ---
  createJob: (job) => {
    data.jobs[job.id] = job;
    save(data);
    return job;
  },
  getJob: (id) => data.jobs[id] || null,
  updateJob: (id, updates) => {
    if (!data.jobs[id]) return null;
    data.jobs[id] = { ...data.jobs[id], ...updates };
    save(data);
    return data.jobs[id];
  },

  // --- results ---
  createResult: (result) => {
    data.results[result.id] = result;
    save(data);
    return result;
  },
  getResultsForProfile: (profileId) =>
    Object.values(data.results).filter((r) => r.profileId === profileId),
  getResult: (id) => data.results[id] || null,
  deleteResult: (id) => {
    delete data.results[id];
    save(data);
  }
};
