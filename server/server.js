"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { openDb, seedIfEmpty, loadSeedData } = require("./db");

const SITE_DIR = path.join(__dirname, "..", "site");
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_BODY = 20 * 1024;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

function createApp(opts = {}) {
  const db = openDb(opts.dbFile || process.env.DB_FILE || path.join(__dirname, "..", "data", "app.db"));
  const secureCookie = opts.secureCookie ?? process.env.COOKIE_SECURE === "1";
  const seed = loadSeedData();
  const CATS = new Set(seed.CATEGORIES.map((c) => c.id));
  const CITIES = new Set(seed.CITIES.map((c) => c.id));
  if (opts.seed !== false) seedIfEmpty(db);

  // ---------- helpers ----------
  const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
  const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

  function createUser(email, name, password, role = "user") {
    const salt = crypto.randomBytes(16).toString("hex");
    const r = db.prepare("INSERT INTO users (email,name,pass_hash,salt,role) VALUES (?,?,?,?,?)")
      .run(email, name, hashPw(password, salt), salt, role);
    return Number(r.lastInsertRowid);
  }

  // Bootstrap an admin from env (never hard-coded)
  const adminEmail = opts.adminEmail || process.env.ADMIN_EMAIL;
  const adminPass = opts.adminPassword || process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPass) {
    const row = db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail.toLowerCase());
    if (!row) createUser(adminEmail.toLowerCase(), "Admin", adminPass, "admin");
    else db.prepare("UPDATE users SET role='admin' WHERE id=?").run(row.id);
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
    const row = db.prepare(`SELECT u.id,u.email,u.name,u.role,s.expires_at FROM sessions s
      JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(sha(token));
    if (!row) return null;
    if (row.expires_at < Date.now()) { db.prepare("DELETE FROM sessions WHERE token_hash=?").run(sha(token)); return null; }
    return { id: row.id, email: row.email, name: row.name, role: row.role };
  }

  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)")
      .run(sha(token), userId, Date.now() + SESSION_TTL_MS);
    res.setHeader("Set-Cookie", `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secureCookie ? "; Secure" : ""}`);
  }

  const hits = new Map(); // naive in-memory rate limit: ip -> [timestamps]
  function limited(req, key, max = 10, windowMs = 15 * 60 * 1000) {
    const k = key + ":" + req.socket.remoteAddress;
    const now = Date.now();
    const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
    arr.push(now); hits.set(k, arr);
    return arr.length > max;
  }

  function send(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
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

  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  // rating/review counts are always computed from real reviews (stored columns are unused)
  const BIZ_SELECT = `SELECT b.*, COALESCE(ROUND(AVG(r.rating),1),0) AS avg_rating, COUNT(r.id) AS review_count
    FROM businesses b LEFT JOIN reviews r ON r.business_id=b.id`;

  function bizOut(r) {
    return {
      id: r.id, cat: r.cat, city: r.city,
      name: { ar: r.name_ar, en: r.name_en }, desc: { ar: r.desc_ar, en: r.desc_en },
      area: { ar: r.area_ar, en: r.area_en }, hours: { ar: r.hours_ar, en: r.hours_en },
      phone: r.phone, whatsapp: r.whatsapp, rating: r.avg_rating, reviews: r.review_count,
      verified: !!r.verified, status: r.status, mine: !!r._mine
    };
  }

  // ---------- API routes ----------
  async function api(req, res, url) {
    const user = currentUser(req);
    const m = req.method, p = url.pathname;

    if (m === "GET" && p === "/api/me") return send(res, 200, { user });

    if (m === "POST" && p === "/api/register") {
      if (limited(req, "reg", 10)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const email = str(b.email, 120).toLowerCase(), name = str(b.name, 60), password = typeof b.password === "string" ? b.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: "invalid_email" });
      if (!name) return send(res, 400, { error: "invalid_name" });
      if (password.length < 8 || password.length > 128) return send(res, 400, { error: "weak_password" });
      if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) return send(res, 409, { error: "email_taken" });
      const id = createUser(email, name, password);
      startSession(res, id);
      return send(res, 201, { user: { id, email, name, role: "user" } });
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
      return send(res, 200, { user: { id: row.id, email: row.email, name: row.name, role: row.role } });
    }

    if (m === "POST" && p === "/api/logout") {
      const token = parseCookies(req).sid;
      if (token) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(sha(token));
      res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      return send(res, 200, { ok: true });
    }

    if (m === "GET" && p === "/api/businesses") {
      const rows = db.prepare(BIZ_SELECT + " WHERE b.status='approved' GROUP BY b.id ORDER BY avg_rating DESC, review_count DESC, b.id").all();
      return send(res, 200, { businesses: rows.map(bizOut) });
    }

    if (p === "/api/my/businesses" && m === "GET") {
      if (!user) return send(res, 401, { error: "auth_required" });
      const rows = db.prepare(BIZ_SELECT + " WHERE b.owner_id=? GROUP BY b.id ORDER BY b.id DESC").all(user.id);
      return send(res, 200, { businesses: rows.map((r) => bizOut({ ...r, _mine: true })) });
    }

    if (p === "/api/businesses" && m === "POST") {
      if (!user) return send(res, 401, { error: "auth_required" });
      if (limited(req, "biz", 20, 60 * 60 * 1000)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req);
      const nameAr = str(b.name_ar, 80), nameEn = str(b.name_en, 80) || nameAr;
      const desc = str(b.desc, 300), area = str(b.area, 80);
      const phone = str(b.phone, 8).replace(/\s/g, "");
      if (!nameAr) return send(res, 400, { error: "invalid_name" });
      if (!CATS.has(b.cat)) return send(res, 400, { error: "invalid_category" });
      if (!CITIES.has(b.city)) return send(res, 400, { error: "invalid_city" });
      if (!/^[34567]\d{7}$/.test(phone)) return send(res, 400, { error: "invalid_phone" });
      const r = db.prepare(`INSERT INTO businesses (owner_id,cat,city,name_ar,name_en,desc_ar,desc_en,area_ar,area_en,phone,whatsapp,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')`)
        .run(user.id, b.cat, b.city, nameAr, nameEn, desc, desc, area, area, "+974" + phone, "974" + phone);
      return send(res, 201, { id: Number(r.lastInsertRowid), status: "pending" });
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
        const rows = db.prepare(BIZ_SELECT + " WHERE b.status=? GROUP BY b.id ORDER BY b.id DESC").all(status);
        return send(res, 200, { businesses: rows.map(bizOut) });
      }
      const mm = p.match(/^\/api\/admin\/businesses\/(\d+)\/(approve|reject|verify|unverify)$/);
      if (m === "POST" && mm) {
        const id = Number(mm[1]);
        if (!db.prepare("SELECT 1 FROM businesses WHERE id=?").get(id)) return send(res, 404, { error: "not_found" });
        const act = mm[2];
        if (act === "approve") db.prepare("UPDATE businesses SET status='approved' WHERE id=?").run(id);
        else if (act === "reject") db.prepare("UPDATE businesses SET status='rejected' WHERE id=?").run(id);
        else db.prepare("UPDATE businesses SET verified=? WHERE id=?").run(act === "verify" ? 1 : 0, id);
        return send(res, 200, { ok: true });
      }
    }

    return send(res, 404, { error: "not_found" });
  }

  // ---------- static files ----------
  function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const file = path.normalize(path.join(SITE_DIR, rel));
    if (!file.startsWith(SITE_DIR + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'"
      });
      res.end(buf);
    });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) await api(req, res, url);
      else if (req.method === "GET" || req.method === "HEAD") serveStatic(req, res, url);
      else { res.writeHead(405); res.end(); }
    } catch (e) {
      if (e && e.status) return send(res, e.status, { error: e.error });
      console.error(e);
      if (!res.headersSent) send(res, 500, { error: "server_error" });
    }
  });
  server.on("close", () => db.close());
  return { server, db };
}

module.exports = { createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 8000;
  const { server } = createApp();
  server.listen(port, () => console.log(`Qatar Guide running on http://localhost:${port}`));
}
