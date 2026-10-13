"use strict";
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadSeedData() {
  // site/data.js assigns window.CATEGORIES / CITIES / BUSINESSES
  const code = fs.readFileSync(path.join(__dirname, "..", "site", "data.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.window;
}

function openDb(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      pass_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      cat TEXT NOT NULL,
      city TEXT NOT NULL,
      name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
      desc_ar TEXT NOT NULL DEFAULT '', desc_en TEXT NOT NULL DEFAULT '',
      area_ar TEXT NOT NULL DEFAULT '', area_en TEXT NOT NULL DEFAULT '',
      hours_ar TEXT NOT NULL DEFAULT '', hours_en TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 0,
      reviews INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (business_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rev_biz ON reviews(business_id);
    CREATE INDEX IF NOT EXISTS idx_biz_status ON businesses(status);
    CREATE INDEX IF NOT EXISTS idx_biz_owner ON businesses(owner_id);
  `);
  // migration: record consent to the legal texts
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("terms_accepted_at")) db.exec("ALTER TABLE users ADD COLUMN terms_accepted_at TEXT");
  if (!cols.includes("terms_version")) db.exec("ALTER TABLE users ADD COLUMN terms_version TEXT");
  return db;
}

function seedIfEmpty(db) {
  const n = db.prepare("SELECT COUNT(*) AS n FROM businesses").get().n;
  if (n > 0) return 0;
  const { BUSINESSES } = loadSeedData();
  const ins = db.prepare(`INSERT INTO businesses
    (cat, city, name_ar, name_en, desc_ar, desc_en, area_ar, area_en, hours_ar, hours_en,
     phone, whatsapp, rating, reviews, verified, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'approved')`);
  for (const b of BUSINESSES) {
    ins.run(b.cat, b.city, b.name.ar, b.name.en, b.desc.ar, b.desc.en, b.area.ar, b.area.en,
      b.hours.ar, b.hours.en, b.phone, b.whatsapp, 0, 0, b.verified ? 1 : 0);
  }
  return BUSINESSES.length;
}

module.exports = { openDb, seedIfEmpty, loadSeedData };
