"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { openDb, seedIfEmpty, loadSeedData } = require("./db");
const { createSeo } = require("./seo");
const { LEGAL_VERSION } = require("./legal");
const { inspect: inspectImage, ImageError, MAX_BYTES: MAX_IMG_BYTES } = require("./images");
const { createMailer, resetEmail, changedEmail, verifyEmail, emailChangedNotice } = require("./mailer");

const SITE_DIR = path.join(__dirname, "..", "site");
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_BODY = 20 * 1024;
const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IMAGES_PER_BUSINESS = 6;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

function createApp(opts = {}) {
  const db = openDb(opts.dbFile || process.env.DB_FILE || path.join(__dirname, "..", "data", "app.db"));
  const secureCookie = opts.secureCookie ?? process.env.COOKIE_SECURE === "1";
  const seed = loadSeedData();
  const CATS = new Set(seed.CATEGORIES.map((c) => c.id));
  const CITIES = new Set(seed.CITIES.map((c) => c.id));
  if (opts.seed !== false && process.env.SEED_DEMO !== "0") seedIfEmpty(db);

  const mailer = opts.mailer || createMailer();
  if (mailer.name === "none") console.warn("WARNING: e-mail is not configured - password reset is disabled (set EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM).");
  // E-mail verification needs a working mailer; REQUIRE_VERIFIED_EMAIL=0 switches it off explicitly.
  const verifyOn = (opts.requireVerifiedEmail ?? process.env.REQUIRE_VERIFIED_EMAIL !== "0") && mailer.name !== "none";
  const hsts = secureCookie ? { "Strict-Transport-Security": "max-age=31536000" } : {};

  // ---------- helpers ----------
  const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
  const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

  function createUser(email, name, password, role = "user", accepted = false) {
    const salt = crypto.randomBytes(16).toString("hex");
    const r = db.prepare("INSERT INTO users (email,name,pass_hash,salt,role,terms_accepted_at,terms_version,email_verified_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(email, name, hashPw(password, salt), salt, role, accepted ? new Date().toISOString() : null, accepted ? LEGAL_VERSION : null,
        role === "admin" ? new Date().toISOString() : null);
    return Number(r.lastInsertRowid);
  }

  // Bootstrap an admin from env (never hard-coded)
  const adminEmail = opts.adminEmail || process.env.ADMIN_EMAIL;
  const adminPass = opts.adminPassword || process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPass) {
    if (adminPass.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    const row = db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail.toLowerCase());
    if (!row) createUser(adminEmail.toLowerCase(), "Admin", adminPass, "admin");
    else {
      // the env var is the source of truth: changing ADMIN_PASSWORD and redeploying rotates the password
      const cur = db.prepare("SELECT salt, pass_hash FROM users WHERE id=?").get(row.id);
      if (hashPw(adminPass, cur.salt) !== cur.pass_hash) {
        const salt = crypto.randomBytes(16).toString("hex");
        db.prepare("UPDATE users SET salt=?, pass_hash=? WHERE id=?").run(salt, hashPw(adminPass, salt), row.id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.id);
      }
      db.prepare("UPDATE users SET role='admin', email_verified_at=COALESCE(email_verified_at, datetime('now')) WHERE id=?").run(row.id);
    }
  }

  function parseCookies(req) {
    const out = {};
    (req.headers.cookie || "").split(";").forEach((p) => {
      const i = p.indexOf("=");
      if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
    return out;
  }

  function currentUser(req) {
    const token = parseCookies(req).sid;
    if (!token) return null;
    const row = db.prepare(`SELECT u.id,u.email,u.name,u.role,u.email_verified_at,s.expires_at FROM sessions s
      JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(sha(token));
    if (!row) return null;
    if (row.expires_at < Date.now()) { db.prepare("DELETE FROM sessions WHERE token_hash=?").run(sha(token)); return null; }
    return userOut(row);
  }
  const userOut = (r) => ({ id: r.id, email: r.email, name: r.name, role: r.role, verified: !!r.email_verified_at });
  const needsVerification = (u) => verifyOn && !u.verified;

  // Never build the link from the Host header (poisoning): SITE_URL only, Host only outside production.
  function issueVerification(req, u, lang) {
    const linkBase = siteUrl || (process.env.NODE_ENV === "production" ? "" : baseUrl(req));
    if (!linkBase) { console.error("verification e-mail skipped: set SITE_URL so links can be built safely"); return; }
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("DELETE FROM email_verifications WHERE user_id=? OR expires_at<?").run(u.id, Date.now());
    db.prepare("INSERT INTO email_verifications (token_hash,user_id,email,expires_at) VALUES (?,?,?,?)").run(sha(token), u.id, u.email, Date.now() + VERIFY_TTL_MS);
    const link = `${linkBase}${lang === "en" ? "/en" : ""}/verify?token=${token}`;
    setImmediate(() => mailer.send({ to: u.email, ...verifyEmail(lang, { name: u.name, link, hours: VERIFY_TTL_MS / 3600000 }) })
      .catch((e) => console.error("verification e-mail failed:", e.message)));
  }

  function cleanup() {
    const now = Date.now();
    db.prepare("DELETE FROM password_resets WHERE expires_at<?").run(now);
    db.prepare("DELETE FROM email_verifications WHERE expires_at<?").run(now);
    db.prepare("DELETE FROM sessions WHERE expires_at<?").run(now);
    // abandoned sign-ups: never verified, a week old, and they own nothing
    if (verifyOn) db.prepare(`DELETE FROM users WHERE role='user' AND email_verified_at IS NULL AND created_at < datetime('now','-7 days')
      AND id NOT IN (SELECT owner_id FROM businesses WHERE owner_id IS NOT NULL) AND id NOT IN (SELECT user_id FROM reviews)`).run();
  }
  cleanup();
  setInterval(() => { try { cleanup(); } catch { /* db closed during shutdown */ } }, 60 * 60 * 1000).unref();

  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)")
      .run(sha(token), userId, Date.now() + SESSION_TTL_MS);
    res.setHeader("Set-Cookie", `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secureCookie ? "; Secure" : ""}`);
  }

  const trustProxy = opts.trustProxy ?? process.env.TRUST_PROXY === "1";
  function clientIp(req) {
    if (trustProxy) {
      const real = req.headers["x-real-ip"];
      if (typeof real === "string" && real) return real.trim();
      const xff = req.headers["x-forwarded-for"];
      if (typeof xff === "string" && xff) return xff.split(",").pop().trim(); // last hop = added by our proxy
    }
    return req.socket.remoteAddress;
  }

  const hits = new Map(); // naive in-memory rate limit: ip -> [timestamps]
  function limitedKey(k, max, windowMs) {
    const now = Date.now();
    const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
    arr.push(now); hits.set(k, arr);
    return arr.length > max;
  }
  function limited(req, key, max = 10, windowMs = 15 * 60 * 1000) { return limitedKey(key + ":" + clientIp(req), max, windowMs); }

  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) if (!arr.length || now - arr[arr.length - 1] > 3600 * 1000) hits.delete(k);
  }, 10 * 60 * 1000).unref();

  function send(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...hsts });
    res.end(data);
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      if (!(req.headers["content-type"] || "").startsWith("application/json")) return reject({ status: 415, error: "json_required" });
      let size = 0; const chunks = [];
      req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { reject({ status: 413, error: "too_large" }); req.destroy(); } else chunks.push(c); });
      req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); } catch { reject({ status: 400, error: "bad_json" }); } });
      req.on("error", () => reject({ status: 400, error: "bad_request" }));
    });
  }

  function readRaw(req, limit) {
    return new Promise((resolve, reject) => {
      if (Number(req.headers["content-length"]) > limit) { req.resume(); return reject({ status: 413, error: "image_too_big" }); }
      let size = 0; const chunks = [];
      req.on("data", (c) => { size += c.length; if (size > limit) { reject({ status: 413, error: "image_too_big" }); req.destroy(); } else chunks.push(c); });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", () => reject({ status: 400, error: "bad_request" }));
    });
  }

  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  // rating/review counts are always computed from real reviews (stored columns are unused)
  const BIZ_SELECT = `SELECT b.*, COALESCE(ROUND(AVG(r.rating),1),0) AS avg_rating, COUNT(r.id) AS review_count
    FROM businesses b LEFT JOIN reviews r ON r.business_id=b.id`;

  function bizOut(r, images = []) {
    const approved = images.filter((i) => i.status === "approved");
    return {
      id: r.id, cat: r.cat, city: r.city,
      name: { ar: r.name_ar, en: r.name_en }, desc: { ar: r.desc_ar, en: r.desc_en },
      area: { ar: r.area_ar, en: r.area_en }, hours: { ar: r.hours_ar, en: r.hours_en },
      phone: r.phone, whatsapp: r.whatsapp, rating: r.avg_rating, reviews: r.review_count,
      verified: !!r.verified, status: r.status, mine: !!r._mine,
      images, cover: approved.length ? approved[0].id : null
    };
  }

  // images per business: `all` = every status (owner/admin views), otherwise approved only (public)
  function imagesByBusiness(ids, all) {
    const map = new Map();
    if (!ids.length) return map;
    let rows;
    if (ids.length > 500) { // avoid SQLite's bound-variable limit on very large listings: read once, filter in JS
      const want = new Set(ids);
      rows = db.prepare(`SELECT id,business_id,width,height,status FROM business_images ${all ? "" : "WHERE status='approved'"} ORDER BY id`).all().filter((i) => want.has(i.business_id));
    } else {
      rows = db.prepare(`SELECT id,business_id,width,height,status FROM business_images
        WHERE business_id IN (${ids.map(() => "?").join(",")}) ${all ? "" : "AND status='approved'"} ORDER BY id`).all(...ids);
    }
    for (const i of rows) {
      if (!map.has(i.business_id)) map.set(i.business_id, []);
      map.get(i.business_id).push({ id: i.id, w: i.width, h: i.height, status: i.status });
    }
    return map;
  }
  const outWithImages = (rows, all, extra) => {
    const map = imagesByBusiness(rows.map((r) => r.id), all);
    return rows.map((r) => ({ ...bizOut(r, map.get(r.id) || []), ...(extra ? extra(r) : {}) }));
  };
  const editOf = (r) => (r.pending_edit ? JSON.parse(r.pending_edit) : null);

  // ---- listing fields (shared by create and edit) ----
  function validateListing(b) {
    const f = {
      cat: b.cat, city: b.city, name_ar: str(b.name_ar, 80), name_en: "", desc: str(b.desc, 300),
      area: str(b.area, 80), hours: str(b.hours, 80), phone: str(b.phone, 20).replace(/\s/g, "")
    };
    f.name_en = str(b.name_en, 80) || f.name_ar;
    if (!f.name_ar) return { error: "invalid_name" };
    if (!CATS.has(f.cat)) return { error: "invalid_category" };
    if (!CITIES.has(f.city)) return { error: "invalid_city" };
    if (!/^[34567]\d{7}$/.test(f.phone)) return { error: "invalid_phone" };
    return { f };
  }
  const liveFields = (r) => ({ cat: r.cat, city: r.city, name_ar: r.name_ar, name_en: r.name_en, desc: r.desc_ar, area: r.area_ar, hours: r.hours_ar, phone: r.phone.replace("+974", "") });
  const sameFields = (a, b) => ["cat", "city", "name_ar", "name_en", "desc", "area", "hours", "phone"].every((k) => a[k] === b[k]);
  function applyFields(id, f) {
    db.prepare(`UPDATE businesses SET cat=?,city=?,name_ar=?,name_en=?,desc_ar=?,desc_en=?,area_ar=?,area_en=?,hours_ar=?,hours_en=?,
      phone=?,whatsapp=?,pending_edit=NULL,updated_at=datetime('now') WHERE id=?`)
      .run(f.cat, f.city, f.name_ar, f.name_en, f.desc, f.desc, f.area, f.area, f.hours, f.hours, "+974" + f.phone, "974" + f.phone, id);
  }

  // ---------- API routes ----------
  async function api(req, res, url) {
    const m = req.method, p = url.pathname;
    if (m === "GET" && p === "/api/health") {
      db.prepare("SELECT 1").get();
      return send(res, 200, { ok: true });
    }
    const user = currentUser(req);

    if (m === "GET" && p === "/api/me") return send(res, 200, { user, features: { passwordReset: mailer.name !== "none", emailVerification: verifyOn } });

    if (m === "POST" && p === "/api/register") {
      if (limited(req, "reg", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const email = str(b.email, 120).toLowerCase(), name = str(b.name, 60), password = typeof b.password === "string" ? b.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: "invalid_email" });
      if (!name) return send(res, 400, { error: "invalid_name" });
      if (password.length < 8 || password.length > 128) return send(res, 400, { error: "weak_password" });
      if (b.accept !== true) return send(res, 400, { error: "terms_required" });
      if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) return send(res, 409, { error: "email_taken" });
      const id = createUser(email, name, password, "user", true);
      startSession(res, id);
      if (verifyOn) issueVerification(req, { id, email, name }, b.lang === "en" ? "en" : "ar");
      return send(res, 201, { user: { id, email, name, role: "user", verified: false } });
    }

    if (m === "POST" && p === "/api/login") {
      if (limited(req, "login", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const email = str(b.email, 120).toLowerCase(), password = typeof b.password === "string" ? b.password.slice(0, 128) : "";
      const row = db.prepare("SELECT * FROM users WHERE email=?").get(email);
      // always hash to keep timing similar whether or not the user exists
      const candidate = hashPw(password, row ? row.salt : "0".repeat(32));
      const ok = row && crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(row.pass_hash, "hex"));
      if (!ok) return send(res, 401, { error: "bad_credentials" });
      startSession(res, row.id);
      return send(res, 200, { user: userOut(row) });
    }

    // ---- e-mail verification ----
    if (m === "POST" && p === "/api/verify") {
      if (limited(req, "verify", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const token = typeof b.token === "string" ? b.token : "";
      const row = /^[0-9a-f]{64}$/.test(token)
        ? db.prepare("SELECT v.user_id,v.email,v.expires_at,u.email AS current FROM email_verifications v JOIN users u ON u.id=v.user_id WHERE v.token_hash=?").get(sha(token)) : null;
      // the token only counts for the address it was sent to
      if (!row || row.expires_at < Date.now() || row.current !== row.email) return send(res, 400, { error: "invalid_token" });
      db.prepare("UPDATE users SET email_verified_at=COALESCE(email_verified_at, datetime('now')) WHERE id=?").run(row.user_id);
      db.prepare("DELETE FROM email_verifications WHERE user_id=?").run(row.user_id);
      return send(res, 200, { ok: true });
    }

    if (m === "POST" && p === "/api/verify/resend") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (!verifyOn) return send(res, 503, { error: "email_disabled" });
      if (user.verified) return send(res, 200, { ok: true, already: true });
      if (limited(req, "resend", 5, 60 * 60 * 1000) || limitedKey("resend-user:" + user.id, 3, 60 * 60 * 1000)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      issueVerification(req, user, b.lang === "en" ? "en" : "ar");
      return send(res, 200, { ok: true });
    }

    // fixes a mistyped address; needs the password, resets verification, warns the old address
    if (m === "POST" && p === "/api/me/email") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (user.role === "admin") return send(res, 403, { error: "admin_use_env" });
      if (limited(req, "chem", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const row = db.prepare("SELECT salt, pass_hash FROM users WHERE id=?").get(user.id);
      const given = hashPw(typeof b.password === "string" ? b.password.slice(0, 128) : "", row.salt);
      if (!crypto.timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(row.pass_hash, "hex"))) return send(res, 401, { error: "bad_credentials" });
      const email = str(b.email, 120).toLowerCase(), lang = b.lang === "en" ? "en" : "ar";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: "invalid_email" });
      if (email === user.email) return send(res, 400, { error: "same_email" });
      if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) return send(res, 409, { error: "email_taken" });
      const old = user.email;
      db.prepare("UPDATE users SET email=?, email_verified_at=NULL WHERE id=?").run(email, user.id);
      db.prepare("DELETE FROM password_resets WHERE user_id=?").run(user.id);
      db.prepare("DELETE FROM email_verifications WHERE user_id=?").run(user.id);
      setImmediate(() => mailer.send({ to: old, ...emailChangedNotice(lang, { name: user.name, newEmail: email }) }).catch((e) => console.error("notice e-mail failed:", e.message)));
      if (verifyOn) issueVerification(req, { id: user.id, email, name: user.name }, lang);
      return send(res, 200, { user: { ...user, email, verified: false } });
    }

    // ---- password reset by e-mail ----
    if (m === "POST" && p === "/api/forgot") {
      if (mailer.name === "none") return send(res, 503, { error: "email_disabled" });
      if (limited(req, "forgot", 5, 60 * 60 * 1000)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const email = str(b.email, 120).toLowerCase(), lang = b.lang === "en" ? "en" : "ar";
      const generic = () => send(res, 200, { ok: true }); // identical answer whether or not the account exists
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return generic();
      if (limitedKey("forgot-email:" + email, 3, 60 * 60 * 1000)) return generic();
      const row = db.prepare("SELECT id,name,role FROM users WHERE email=?").get(email);
      // the admin password is owned by the ADMIN_PASSWORD env var (rotate it there)
      if (row && row.role !== "admin") {
        // Never build the link from the Host header (password-reset poisoning): SITE_URL only, Host only outside production.
        const linkBase = siteUrl || (process.env.NODE_ENV === "production" ? "" : baseUrl(req));
        if (!linkBase) console.error("password reset skipped: set SITE_URL so reset links can be built safely");
        else {
          const token = crypto.randomBytes(32).toString("hex");
          db.prepare("DELETE FROM password_resets WHERE user_id=? OR expires_at<?").run(row.id, Date.now());
          db.prepare("INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)").run(sha(token), row.id, Date.now() + RESET_TTL_MS);
          const link = `${linkBase}${lang === "en" ? "/en" : ""}/reset?token=${token}`;
          setImmediate(() => mailer.send({ to: email, ...resetEmail(lang, { name: row.name, link, minutes: RESET_TTL_MS / 60000 }) })
            .catch((e) => console.error("reset e-mail failed:", e.message)));
        }
      }
      return generic();
    }

    if (m === "POST" && p === "/api/reset") {
      if (limited(req, "reset", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const token = typeof b.token === "string" ? b.token : "", password = typeof b.password === "string" ? b.password : "";
      const lang = b.lang === "en" ? "en" : "ar";
      const row = /^[0-9a-f]{64}$/.test(token)
        ? db.prepare("SELECT r.user_id,r.expires_at,u.email,u.name FROM password_resets r JOIN users u ON u.id=r.user_id WHERE r.token_hash=?").get(sha(token)) : null;
      if (!row || row.expires_at < Date.now()) return send(res, 400, { error: "invalid_token" });
      if (password.length < 8 || password.length > 128) return send(res, 400, { error: "weak_password" });
      const salt = crypto.randomBytes(16).toString("hex");
      db.prepare("UPDATE users SET salt=?, pass_hash=? WHERE id=?").run(salt, hashPw(password, salt), row.user_id);
      db.prepare("UPDATE users SET email_verified_at=COALESCE(email_verified_at, datetime('now')) WHERE id=?").run(row.user_id); // they received the e-mail
      db.prepare("DELETE FROM password_resets WHERE user_id=?").run(row.user_id); // single use
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.user_id);        // sign out everywhere
      setImmediate(() => mailer.send({ to: row.email, ...changedEmail(lang, { name: row.name }) }).catch((e) => console.error("notice e-mail failed:", e.message)));
      return send(res, 200, { ok: true });
    }

    if (m === "POST" && p === "/api/me/password") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (user.role === "admin") return send(res, 403, { error: "admin_use_env" });
      if (limited(req, "chpw", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const row = db.prepare("SELECT salt, pass_hash FROM users WHERE id=?").get(user.id);
      const given = hashPw(typeof b.current === "string" ? b.current.slice(0, 128) : "", row.salt);
      if (!crypto.timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(row.pass_hash, "hex"))) return send(res, 401, { error: "bad_credentials" });
      const next = typeof b.next === "string" ? b.next : "";
      if (next.length < 8 || next.length > 128) return send(res, 400, { error: "weak_password" });
      const salt = crypto.randomBytes(16).toString("hex");
      db.prepare("UPDATE users SET salt=?, pass_hash=? WHERE id=?").run(salt, hashPw(next, salt), user.id);
      db.prepare("DELETE FROM sessions WHERE user_id=? AND token_hash<>?").run(user.id, sha(parseCookies(req).sid || "")); // keep this device
      const lang = b.lang === "en" ? "en" : "ar";
      setImmediate(() => mailer.send({ to: user.email, ...changedEmail(lang, { name: user.name }) }).catch((e) => console.error("notice e-mail failed:", e.message)));
      return send(res, 200, { ok: true });
    }

    // ---- data rights: export and delete my account ----
    if (m === "GET" && p === "/api/me/export") {
      if (!user) return send(res, 401, { error: "auth_required" });
      const prof = db.prepare("SELECT id,email,name,role,created_at,email_verified_at,terms_accepted_at,terms_version FROM users WHERE id=?").get(user.id);
      const businesses = db.prepare("SELECT id,cat,city,name_ar,name_en,desc_ar,area_ar,phone,status,verified,created_at FROM businesses WHERE owner_id=?").all(user.id);
      const reviews = db.prepare("SELECT business_id,rating,comment,created_at,updated_at FROM reviews WHERE user_id=?").all(user.id);
      res.setHeader("Content-Disposition", 'attachment; filename="my-data.json"');
      return send(res, 200, { exported_at: new Date().toISOString(), profile: prof, businesses, reviews });
    }

    if (m === "DELETE" && p === "/api/me") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (limited(req, "del", 5)) return send(res, 429, { error: "rate_limited" });
      if (user.role === "admin") return send(res, 403, { error: "admin_cannot_delete" });
      const b = await readJson(req);
      const row = db.prepare("SELECT salt, pass_hash FROM users WHERE id=?").get(user.id);
      const given = hashPw(typeof b.password === "string" ? b.password.slice(0, 128) : "", row.salt);
      if (!crypto.timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(row.pass_hash, "hex"))) return send(res, 401, { error: "bad_credentials" });
      // removes the account, its sessions and reviews (cascade) and every listing it submitted
      db.exec("BEGIN");
      try {
        db.prepare("DELETE FROM businesses WHERE owner_id=?").run(user.id);
        db.prepare("DELETE FROM users WHERE id=?").run(user.id);
        db.exec("COMMIT");
      } catch (e) { db.exec("ROLLBACK"); throw e; }
      res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      return send(res, 200, { ok: true });
    }

    if (m === "POST" && p === "/api/logout") {
      const token = parseCookies(req).sid;
      if (token) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(sha(token));
      res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      return send(res, 200, { ok: true });
    }

    if (m === "GET" && p === "/api/businesses") {
      const rows = db.prepare(BIZ_SELECT + " WHERE b.status='approved' GROUP BY b.id ORDER BY avg_rating DESC, review_count DESC, b.id").all();
      return send(res, 200, { businesses: outWithImages(rows, false) });
    }

    if (p === "/api/my/businesses" && m === "GET") {
      if (!user) return send(res, 401, { error: "auth_required" });
      const rows = db.prepare(BIZ_SELECT + " WHERE b.owner_id=? GROUP BY b.id ORDER BY b.id DESC").all(user.id);
      return send(res, 200, { businesses: outWithImages(rows.map((r) => ({ ...r, _mine: true })), true, (r) => ({ edit: editOf(r) })) });
    }

    if (p === "/api/businesses" && m === "POST") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (needsVerification(user)) return send(res, 403, { error: "email_unverified" });
      if (limited(req, "biz", 20, 60 * 60 * 1000)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const v = validateListing(b);
      if (v.error) return send(res, 400, { error: v.error });
      const f = v.f;
      const r = db.prepare(`INSERT INTO businesses (owner_id,cat,city,name_ar,name_en,desc_ar,desc_en,area_ar,area_en,hours_ar,hours_en,phone,whatsapp,status,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',datetime('now'))`)
        .run(user.id, f.cat, f.city, f.name_ar, f.name_en, f.desc, f.desc, f.area, f.area, f.hours, f.hours, "+974" + f.phone, "974" + f.phone);
      return send(res, 201, { id: Number(r.lastInsertRowid), status: "pending" });
    }

    // ---- edit my listing (owner) or any listing (admin) ----
    const bm = p.match(/^\/api\/businesses\/(\d+)$/);
    const manageOwn = (id) => {
      const row = db.prepare("SELECT * FROM businesses WHERE id=?").get(id);
      if (!row) return { err: [404, "not_found"] };
      if (row.owner_id !== user.id && user.role !== "admin") return { err: [403, "forbidden"] };
      return { row };
    };
    if (bm && m === "PATCH") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (needsVerification(user)) return send(res, 403, { error: "email_unverified" });
      if (limited(req, "edit", 30, 60 * 60 * 1000)) return send(res, 429, { error: "rate_limited" });
      const { row, err } = manageOwn(Number(bm[1]));
      if (err) return send(res, err[0], { error: err[1] });
      const v = validateListing(await readJson(req));
      if (v.error) return send(res, 400, { error: v.error });
      // a published listing keeps showing its reviewed version; the owner's change waits for the admin
      if (row.status === "approved" && user.role !== "admin") {
        if (sameFields(v.f, liveFields(row))) {
          db.prepare("UPDATE businesses SET pending_edit=NULL WHERE id=?").run(row.id);
          return send(res, 200, { status: "unchanged" });
        }
        db.prepare("UPDATE businesses SET pending_edit=? WHERE id=?").run(JSON.stringify(v.f), row.id);
        return send(res, 200, { status: "edit_pending" });
      }
      applyFields(row.id, v.f);
      if (row.status === "rejected" && user.role !== "admin") db.prepare("UPDATE businesses SET status='pending' WHERE id=?").run(row.id); // resubmit
      return send(res, 200, { status: "updated" });
    }
    if (m === "GET" && p.match(/^\/api\/businesses\/\d+\/manage$/)) {
      if (!user) return send(res, 401, { error: "auth_required" });
      const { row, err } = manageOwn(Number(p.split("/")[3]));
      if (err) return send(res, err[0], { error: err[1] });
      const full = db.prepare(BIZ_SELECT + " WHERE b.id=? GROUP BY b.id").get(row.id);
      const [biz] = outWithImages([{ ...full, _mine: true }], true, (r) => ({ edit: editOf(r) }));
      return send(res, 200, { business: biz, form: editOf(row) || liveFields(row), maxImages: MAX_IMAGES_PER_BUSINESS });
    }

    // ---- images ----
    const imUp = p.match(/^\/api\/businesses\/(\d+)\/images$/);
    if (imUp && m === "POST") {
      const fail = (s2, e) => { req.resume(); return send(res, s2, { error: e }); };
      if (!user) return fail(401, "auth_required");
      if (needsVerification(user)) return fail(403, "email_unverified");
      if (req.headers["x-upload"] !== "1") return fail(400, "bad_request"); // custom header: cannot be sent by a cross-site form
      const ct = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (ct !== "image/jpeg" && ct !== "image/png") return fail(415, "unsupported_image_type");
      if (limited(req, "img", 30, 60 * 60 * 1000)) return fail(429, "rate_limited");
      const { row, err } = manageOwn(Number(imUp[1]));
      if (err) return fail(err[0], err[1]);
      if (db.prepare("SELECT COUNT(*) n FROM business_images WHERE business_id=? AND status!='rejected'").get(row.id).n >= MAX_IMAGES_PER_BUSINESS) return fail(400, "too_many_images");
      const buf = await readRaw(req, MAX_IMG_BYTES);
      let info;
      try { info = inspectImage(buf); } catch (e) { if (e instanceof ImageError) return send(res, 400, { error: e.code }); throw e; }
      const status = user.role === "admin" ? "approved" : "pending";
      const r = db.prepare("INSERT INTO business_images (business_id,user_id,mime,data,width,height,status) VALUES (?,?,?,?,?,?,?)")
        .run(row.id, user.id, info.type === "png" ? "image/png" : "image/jpeg", info.data, info.width, info.height, status);
      return send(res, 201, { id: Number(r.lastInsertRowid), status, w: info.width, h: info.height });
    }
    const imDel = p.match(/^\/api\/images\/(\d+)$/);
    if (imDel && m === "DELETE") {
      if (!user) return send(res, 401, { error: "auth_required" });
      const img = db.prepare("SELECT i.id, b.owner_id FROM business_images i JOIN businesses b ON b.id=i.business_id WHERE i.id=?").get(Number(imDel[1]));
      if (!img) return send(res, 404, { error: "not_found" });
      if (img.owner_id !== user.id && user.role !== "admin") return send(res, 403, { error: "forbidden" });
      db.prepare("DELETE FROM business_images WHERE id=?").run(img.id);
      return send(res, 200, { ok: true });
    }

    // ---- reviews ----
    const rm = p.match(/^\/api\/businesses\/(\d+)\/reviews$/);
    if (rm && m === "GET") {
      const bid = Number(rm[1]);
      if (!db.prepare("SELECT 1 FROM businesses WHERE id=? AND status='approved'").get(bid)) return send(res, 404, { error: "not_found" });
      const rows = db.prepare(`SELECT r.id,r.user_id,r.rating,r.comment,r.created_at,u.name FROM reviews r
        JOIN users u ON u.id=r.user_id WHERE r.business_id=? ORDER BY r.updated_at DESC, r.id DESC LIMIT 100`).all(bid);
      return send(res, 200, { reviews: rows.map((x) => ({
        id: x.id, rating: x.rating, comment: x.comment, name: x.name, created_at: x.created_at,
        mine: !!user && x.user_id === user.id
      })) });
    }
    if (rm && m === "POST") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (needsVerification(user)) return send(res, 403, { error: "email_unverified" });
      if (limited(req, "rev", 30, 60 * 60 * 1000)) return send(res, 429, { error: "rate_limited" });
      const bid = Number(rm[1]);
      const biz = db.prepare("SELECT owner_id FROM businesses WHERE id=? AND status='approved'").get(bid);
      if (!biz) return send(res, 404, { error: "not_found" });
      if (biz.owner_id === user.id) return send(res, 403, { error: "own_business" });
      const b = await readJson(req);
      const rating = Number(b.rating), comment = str(b.comment, 500);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return send(res, 400, { error: "invalid_rating" });
      // one review per user per business: posting again updates it
      db.prepare(`INSERT INTO reviews (business_id,user_id,rating,comment) VALUES (?,?,?,?)
        ON CONFLICT(business_id,user_id) DO UPDATE SET rating=excluded.rating, comment=excluded.comment, updated_at=datetime('now')`)
        .run(bid, user.id, rating, comment);
      return send(res, 201, { ok: true });
    }
    const dm = p.match(/^\/api\/reviews\/(\d+)$/);
    if (dm && m === "DELETE") {
      if (!user) return send(res, 401, { error: "auth_required" });
      const rev = db.prepare("SELECT user_id FROM reviews WHERE id=?").get(Number(dm[1]));
      if (!rev) return send(res, 404, { error: "not_found" });
      if (rev.user_id !== user.id && user.role !== "admin") return send(res, 403, { error: "forbidden" });
      db.prepare("DELETE FROM reviews WHERE id=?").run(Number(dm[1]));
      return send(res, 200, { ok: true });
    }

    // ---- admin ----
    if (p.startsWith("/api/admin/")) {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (user.role !== "admin") return send(res, 403, { error: "forbidden" });
      if (m === "GET" && p === "/api/admin/businesses") {
        const status = url.searchParams.get("status") || "pending";
        if (!["pending", "approved", "rejected"].includes(status)) return send(res, 400, { error: "invalid_status" });
        const cond = status === "pending"
          ? "(b.status='pending' OR b.pending_edit IS NOT NULL OR EXISTS (SELECT 1 FROM business_images i WHERE i.business_id=b.id AND i.status='pending'))"
          : "b.status=?";
        const rows = db.prepare(BIZ_SELECT + ` WHERE ${cond} GROUP BY b.id ORDER BY b.id DESC`).all(...(status === "pending" ? [] : [status]));
        return send(res, 200, { businesses: outWithImages(rows, true, (r) => ({
          edit: editOf(r), review: r.status === "pending" ? "new" : r.pending_edit ? "edit" : "images"
        })) });
      }
      const mm = p.match(/^\/api\/admin\/businesses\/(\d+)\/(approve|reject|verify|unverify)$/);
      if (m === "POST" && mm) {
        const id = Number(mm[1]), row = db.prepare("SELECT * FROM businesses WHERE id=?").get(id);
        if (!row) return send(res, 404, { error: "not_found" });
        const act = mm[2];
        if (act === "approve") {
          // approving a card approves everything shown on it: the listing (or its pending edit) and its pending photos
          if (row.pending_edit) applyFields(id, JSON.parse(row.pending_edit));
          else db.prepare("UPDATE businesses SET status='approved', updated_at=datetime('now') WHERE id=?").run(id);
          db.prepare("UPDATE business_images SET status='approved' WHERE business_id=? AND status='pending'").run(id);
        } else if (act === "reject") {
          if (row.status === "approved") { // reject the changes, keep the published listing
            db.prepare("UPDATE businesses SET pending_edit=NULL WHERE id=?").run(id);
            db.prepare("UPDATE business_images SET status='rejected' WHERE business_id=? AND status='pending'").run(id);
          } else db.prepare("UPDATE businesses SET status='rejected' WHERE id=?").run(id);
        } else db.prepare("UPDATE businesses SET verified=? WHERE id=?").run(act === "verify" ? 1 : 0, id);
        return send(res, 200, { ok: true });
      }
      const ia = p.match(/^\/api\/admin\/images\/(\d+)\/(approve|reject)$/);
      if (m === "POST" && ia) {
        const r = db.prepare("UPDATE business_images SET status=? WHERE id=?").run(ia[2] === "approve" ? "approved" : "rejected", Number(ia[1]));
        return send(res, r.changes ? 200 : 404, r.changes ? { ok: true } : { error: "not_found" });
      }
    }

    return send(res, 404, { error: "not_found" });
  }

  // ---------- SEO pages ----------
  const rowOut = (r, imgs) => ({ ...bizOut(r, imgs || []), updated: String(r.updated_at || r.created_at || "").slice(0, 10) });
  const rowsOut = (rows) => { const map = imagesByBusiness(rows.map((r) => r.id), false); return rows.map((r) => rowOut(r, map.get(r.id))); };
  const seo = createSeo({
    cats: seed.CATEGORIES, cities: seed.CITIES,
    site: { operator: opts.operatorName || process.env.OPERATOR_NAME, contactEmail: opts.contactEmail || process.env.CONTACT_EMAIL },
    queries: {
      approved: ({ cat, city } = {}) => rowsOut(db.prepare(BIZ_SELECT + ` WHERE b.status='approved' AND (? IS NULL OR b.cat=?) AND (? IS NULL OR b.city=?)
        GROUP BY b.id ORDER BY avg_rating DESC, review_count DESC, b.id`).all(cat || null, cat || null, city || null, city || null)),
      one: (id) => { const r = db.prepare(BIZ_SELECT + " WHERE b.id=? AND b.status='approved' GROUP BY b.id").get(id); return r && r.id ? rowsOut([r])[0] : null; },
      reviews: (id) => db.prepare(`SELECT r.rating,r.comment,u.name FROM reviews r JOIN users u ON u.id=r.user_id
        WHERE r.business_id=? ORDER BY r.updated_at DESC, r.id DESC LIMIT 5`).all(id)
    }
  });
  if (process.env.NODE_ENV === "production" && !(opts.contactEmail || process.env.CONTACT_EMAIL)) {
    console.warn("WARNING: CONTACT_EMAIL is not set - the privacy policy and terms show a placeholder instead of a contact address.");
  }
  if (verifyOn && process.env.NODE_ENV === "production" && !(opts.siteUrl || process.env.SITE_URL)) {
    console.warn("WARNING: SITE_URL is not set - verification and reset e-mails cannot be sent (links are never built from the Host header).");
  }
  const shell = fs.readFileSync(path.join(SITE_DIR, "index.html"), "utf8");
  const clientData = `window.CATEGORIES=${JSON.stringify(seed.CATEGORIES)};window.CITIES=${JSON.stringify(seed.CITIES)};`;
  const siteUrl = (opts.siteUrl || process.env.SITE_URL || "").replace(/\/+$/, "");

  // Set SITE_URL in production: it makes canonical/sitemap URLs independent of the Host header.
  function baseUrl(req) {
    if (siteUrl) return siteUrl;
    const proto = (trustProxy && req.headers["x-forwarded-proto"]) || (secureCookie ? "https" : "http");
    const host = String(req.headers.host || "localhost").replace(/[^a-zA-Z0-9.:\-\[\]]/g, "");
    return `${String(proto).split(",")[0]}://${host}`;
  }

  function reply(req, res, status, type, body, extra = {}) {
    const buf = Buffer.from(body);
    const headers = { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Vary": "Accept-Encoding", ...hsts, ...extra };
    if (/^(text|application\/(xml|json|javascript))/.test(type)) headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'";
    if (buf.length > 1024 && /gzip/.test(req.headers["accept-encoding"] || "") && /^(text|application)/.test(type)) {
      const z = zlib.gzipSync(buf); headers["Content-Encoding"] = "gzip"; headers["Content-Length"] = z.length;
      res.writeHead(status, headers); return res.end(z);
    }
    headers["Content-Length"] = buf.length;
    res.writeHead(status, headers); res.end(buf);
  }

  const ASSET_CACHE = "public, max-age=300";

  function servePage(req, res, url) {
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
    const base = baseUrl(req);

    if (pathname === "/sitemap.xml") return reply(req, res, 200, "application/xml; charset=utf-8", seo.sitemap(base), { "Cache-Control": "public, max-age=3600" });
    if (pathname === "/robots.txt") return reply(req, res, 200, "text/plain; charset=utf-8", seo.robots(base), { "Cache-Control": "public, max-age=3600" });
    if (pathname === "/data.js") return reply(req, res, 200, MIME[".js"], clientData, { "Cache-Control": ASSET_CACHE });
    const imgm = pathname.match(/^\/img\/(\d+)$/);
    if (imgm) {
      const row = db.prepare(`SELECT i.mime,i.data,i.status AS istatus,b.status AS bstatus,b.owner_id FROM business_images i
        JOIN businesses b ON b.id=i.business_id WHERE i.id=?`).get(Number(imgm[1]));
      const u = row && currentUser(req);
      const isPublic = row && row.istatus === "approved" && row.bstatus === "approved";
      if (!row || (!isPublic && !(u && (u.id === row.owner_id || u.role === "admin")))) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" }); return res.end("Not found");
      }
      const buf = Buffer.from(row.data);
      res.writeHead(200, {
        "Content-Type": row.mime, "Content-Length": buf.length, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...hsts,
        "Content-Security-Policy": "default-src 'none'; sandbox", // an upload can never run as a page, whatever its bytes are
        "Cache-Control": isPublic ? "public, max-age=86400" : "private, no-store"
      });
      return res.end(buf);
    }
    if (pathname === "/index.html") { res.writeHead(301, { Location: "/" }); return res.end(); }

    // real files in /site (css, js, svg, png)
    if (path.extname(pathname)) {
      const file = path.normalize(path.join(SITE_DIR, pathname));
      if (!file.startsWith(SITE_DIR + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
      return fs.readFile(file, (err, buf) => {
        if (err) return reply(req, res, 404, "text/plain; charset=utf-8", "Not found", { "X-Robots-Tag": "noindex" });
        reply(req, res, 200, MIME[path.extname(file)] || "application/octet-stream", buf, { "Cache-Control": ASSET_CACHE });
      });
    }

    const route = seo.resolve(pathname);
    if (route.redirect) { res.writeHead(301, { Location: route.redirect + url.search }); return res.end(); }
    const page = seo.build(route, base);
    const extra = { "Cache-Control": "no-cache" };
    if (page.noindexHeader || page.status === 404) extra["X-Robots-Tag"] = "noindex";
    reply(req, res, page.status, "text/html; charset=utf-8", seo.renderShell(shell, page, base), extra);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) await api(req, res, url);
      else if (req.method === "GET" || req.method === "HEAD") servePage(req, res, url);
      else { res.writeHead(405); res.end(); }
    } catch (e) {
      if (e && e.status) return send(res, e.status, { error: e.error });
      console.error(e);
      if (!res.headersSent) send(res, 500, { error: "server_error" });
    }
  });
  server.on("close", () => db.close());
  return { server, db, cleanup };
}

module.exports = { createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 8000;
  const { server } = createApp();
  server.listen(port, process.env.HOST || "0.0.0.0", () => console.log(`Qatar Guide running on port ${port}`));
  const stop = () => { console.log("shutting down"); server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 8000).unref(); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
