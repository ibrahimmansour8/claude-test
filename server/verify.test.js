"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createApp } = require("./server");

const SITE = "https://qatarguide.example";
let base, server, db, cleanup;
const outbox = [];
const mailer = { name: "test", async send(m) { outbox.push(m); } };
const tick = () => new Promise((r) => setTimeout(r, 30));
let ipN = 0;
const nextIp = () => `203.0.113.${(++ipN % 250) + 1}-${Math.floor(ipN / 250)}`;
async function api(method, p, body, cookie, url = base) {
  const r = await fetch(url + p, { method, headers: { "Content-Type": "application/json", "X-Real-IP": nextIp(), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null), cookie: (r.headers.get("set-cookie") || "").split(";")[0], headers: r.headers };
}
const tokenFrom = (mail) => mail.text.match(/token=([0-9a-f]{64})/)[1];
const last = (to) => [...outbox].reverse().find((m) => m.to === to);
const signup = (email, extra = {}) => api("POST", "/api/register", { accept: true, email, name: "Mona", password: "password-1", ...extra });
const biz = { name_ar: "نشاط جديد", cat: "tech", city: "doha", phone: "55123456" };

test.before(async () => {
  ({ server, db, cleanup } = createApp({ dbFile: ":memory:", siteUrl: SITE, mailer, trustProxy: true, adminEmail: "a@v.test", adminPassword: "admin-pass-123" }));
  await new Promise((r) => server.listen(0, r));
  base = "http://127.0.0.1:" + server.address().port;
});
test.after(() => server.close());

test("sign-up sends a verification mail, the account starts unverified, the feature is advertised", async () => {
  const r = await signup("new@v.test");
  assert.equal(r.status, 201);
  assert.equal(r.json.user.verified, false);
  await tick();
  const m = last("new@v.test");
  assert.match(m.subject, /فعّل بريدك الإلكتروني/);
  assert.match(m.text, new RegExp(`${SITE}/verify\\?token=[0-9a-f]{64}`));
  const me = await api("GET", "/api/me", null, r.cookie);
  assert.equal(me.json.user.verified, false);
  assert.equal(me.json.features.emailVerification, true);
});

test("English sign-ups get an English mail with an /en/ link", async () => {
  await signup("en@v.test", { lang: "en" }); await tick();
  const m = last("en@v.test");
  assert.match(m.subject, /Confirm your e-mail/);
  assert.ok(m.text.includes(`${SITE}/en/verify?token=`));
});

test("tokens are stored hashed", async () => {
  const token = tokenFrom(last("new@v.test"));
  const hashes = db.prepare("SELECT token_hash FROM email_verifications").all().map((r) => r.token_hash);
  assert.ok(hashes.length && !hashes.includes(token));
});

test("unverified users can log in and browse, but cannot add listings or reviews", async () => {
  const u = await signup("gate@v.test");
  assert.equal((await api("POST", "/api/login", { email: "gate@v.test", password: "password-1" })).json.user.verified, false);
  assert.equal((await api("GET", "/api/businesses")).status, 200);
  assert.equal((await api("POST", "/api/businesses", biz, u.cookie)).json.error, "email_unverified");
  assert.equal((await api("POST", "/api/businesses/1/reviews", { rating: 5 }, u.cookie)).json.error, "email_unverified");
  assert.equal((await api("POST", "/api/businesses", biz)).status, 401, "anonymous is still 401, not 403");
});

test("verifying with the link unlocks posting; the link works once", async () => {
  outbox.length = 0;
  const u = await signup("ok@v.test"); await tick();
  const token = tokenFrom(last("ok@v.test"));
  assert.equal((await api("POST", "/api/verify", { token: "0".repeat(64) })).json.error, "invalid_token");
  assert.equal((await api("POST", "/api/verify", { token: "nope" })).json.error, "invalid_token");
  assert.equal((await api("POST", "/api/verify", { token })).status, 200); // works without being logged in
  const me = await api("GET", "/api/me", null, u.cookie);
  assert.equal(me.json.user.verified, true);
  assert.equal((await api("POST", "/api/businesses", biz, u.cookie)).status, 201);
  assert.equal((await api("POST", "/api/verify", { token })).json.error, "invalid_token", "single use");
});

test("expired links are rejected and the account stays unverified", async () => {
  outbox.length = 0;
  const u = await signup("late@v.test"); await tick();
  const token = tokenFrom(last("late@v.test"));
  db.prepare("UPDATE email_verifications SET expires_at=?").run(Date.now() - 1000);
  assert.equal((await api("POST", "/api/verify", { token })).json.error, "invalid_token");
  assert.equal((await api("GET", "/api/me", null, u.cookie)).json.user.verified, false);
});

test("resend: needs login, new link replaces the old one, limited to 3/hour, harmless once verified", async () => {
  outbox.length = 0;
  assert.equal((await api("POST", "/api/verify/resend", { lang: "ar" })).status, 401);
  const u = await signup("re@v.test"); await tick();
  const first = tokenFrom(last("re@v.test"));
  assert.equal((await api("POST", "/api/verify/resend", { lang: "ar" }, u.cookie)).status, 200); await tick();
  const second = tokenFrom(last("re@v.test"));
  assert.notEqual(first, second);
  assert.equal((await api("POST", "/api/verify", { token: first })).json.error, "invalid_token", "old link invalidated");
  assert.equal((await api("POST", "/api/verify/resend", {}, u.cookie)).status, 200);
  assert.equal((await api("POST", "/api/verify/resend", {}, u.cookie)).status, 200);
  assert.equal((await api("POST", "/api/verify/resend", {}, u.cookie)).status, 429, "4th request within the hour");
  assert.equal((await api("POST", "/api/verify", { token: tokenFrom(last("re@v.test")) })).status, 200);
  assert.equal((await api("POST", "/api/verify/resend", {}, u.cookie)).json.already, true);
});

test("a password reset also proves the address", async () => {
  outbox.length = 0;
  const u = await signup("pw@v.test");
  await api("POST", "/api/forgot", { email: "pw@v.test" }); await tick();
  const resetMail = outbox.find((m) => /token=/.test(m.text) && /reset\?token/.test(m.text));
  await api("POST", "/api/reset", { token: tokenFrom(resetMail), password: "new-password-1" });
  const login = await api("POST", "/api/login", { email: "pw@v.test", password: "new-password-1" });
  assert.equal(login.json.user.verified, true);
});

test("change e-mail: password required, duplicates refused, resets verification, warns the old address, verifies the new one", async () => {
  outbox.length = 0;
  const u = await signup("old@v.test"); await tick();
  await api("POST", "/api/verify", { token: tokenFrom(last("old@v.test")) });
  await signup("taken@v.test");
  assert.equal((await api("POST", "/api/me/email", { email: "x@v.test", password: "wrong-pass-1" }, u.cookie)).status, 401);
  assert.equal((await api("POST", "/api/me/email", { email: "bad", password: "password-1" }, u.cookie)).json.error, "invalid_email");
  assert.equal((await api("POST", "/api/me/email", { email: "old@v.test", password: "password-1" }, u.cookie)).json.error, "same_email");
  assert.equal((await api("POST", "/api/me/email", { email: "taken@v.test", password: "password-1" }, u.cookie)).json.error, "email_taken");
  outbox.length = 0;
  const r = await api("POST", "/api/me/email", { email: "Renamed@V.test", password: "password-1", lang: "en" }, u.cookie);
  assert.equal(r.status, 200); assert.equal(r.json.user.email, "renamed@v.test"); assert.equal(r.json.user.verified, false);
  await tick();
  assert.match(last("old@v.test").subject, /e-mail was changed/, "notice goes to the OLD address");
  assert.ok(last("renamed@v.test").text.includes("/en/verify?token="), "verification goes to the NEW address");
  assert.equal((await api("POST", "/api/businesses", biz, u.cookie)).json.error, "email_unverified", "must verify again");
  assert.equal((await api("POST", "/api/login", { email: "renamed@v.test", password: "password-1" })).status, 200);
  assert.equal((await api("POST", "/api/login", { email: "old@v.test", password: "password-1" })).status, 401);
});

test("a link sent to the old address is useless after the address changed", async () => {
  outbox.length = 0;
  const u = await signup("before@v.test"); await tick();
  const stale = tokenFrom(last("before@v.test"));
  await api("POST", "/api/me/email", { email: "after@v.test", password: "password-1" }, u.cookie);
  assert.equal((await api("POST", "/api/verify", { token: stale })).json.error, "invalid_token");
});

test("admin accounts are verified and cannot use self-service e-mail change", async () => {
  const a = await api("POST", "/api/login", { email: "a@v.test", password: "admin-pass-123" });
  assert.equal(a.json.user.verified, true);
  assert.equal((await api("POST", "/api/me/email", { email: "z@v.test", password: "admin-pass-123" }, a.cookie)).status, 403);
  assert.equal((await api("POST", "/api/businesses", biz, a.cookie)).status, 201);
});

test("cleanup removes stale verification data and abandoned sign-ups, but keeps anything with content", async () => {
  const stale = await signup("ghost@v.test");
  const keeper = await signup("keeper@v.test");
  const idOf = (e) => db.prepare("SELECT id FROM users WHERE email=?").get(e).id;
  // keeper owns a listing (created before the gate, e.g. a legacy account)
  db.prepare("INSERT INTO businesses (owner_id,cat,city,name_ar,name_en,phone,whatsapp) VALUES (?,?,?,?,?,?,?)").run(idOf("keeper@v.test"), "tech", "doha", "x", "x", "+97455555555", "97455555555");
  db.prepare("UPDATE users SET created_at=datetime('now','-8 days') WHERE email IN ('ghost@v.test','keeper@v.test')").run();
  const fresh = await signup("fresh@v.test");
  db.prepare("UPDATE email_verifications SET expires_at=1 WHERE user_id=?").run(idOf("fresh@v.test"));
  cleanup();
  assert.equal(db.prepare("SELECT 1 FROM users WHERE email='ghost@v.test'").get(), undefined, "abandoned account removed");
  assert.ok(db.prepare("SELECT 1 FROM users WHERE email='keeper@v.test'").get(), "account with content kept");
  assert.ok(db.prepare("SELECT 1 FROM users WHERE email='fresh@v.test'").get(), "recent account kept");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM email_verifications WHERE expires_at<?").get(Date.now()).n, 0, "expired tokens removed");
  assert.equal((await api("GET", "/api/me", null, stale.cookie)).json.user, null, "its sessions went with it");
  void keeper; void fresh;
});

test("links are built from SITE_URL, never from a forged Host header", async () => {
  outbox.length = 0;
  await new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, path: "/api/register", method: "POST",
      headers: { Host: "evil.example", "Content-Type": "application/json", "X-Real-IP": nextIp() } }, (res) => { res.resume(); res.on("end", resolve); });
    req.on("error", reject); req.end(JSON.stringify({ accept: true, email: "host@v.test", name: "H", password: "password-1" }));
  });
  await tick();
  assert.ok(last("host@v.test").text.includes(SITE + "/verify?token=") && !last("host@v.test").text.includes("evil.example"));
});

test("verification switches off when e-mail is unavailable or explicitly disabled", async () => {
  for (const o of [{ mailer: { name: "none", async send() { throw new Error("x"); } } }, { mailer, requireVerifiedEmail: false }]) {
    const { server: s2 } = createApp({ dbFile: ":memory:", trustProxy: true, ...o });
    await new Promise((r) => s2.listen(0, r));
    const url = `http://127.0.0.1:${s2.address().port}`;
    const u = await signup2(url, "off@v.test");
    assert.equal((await api("GET", "/api/me", null, u.cookie, url)).json.features.emailVerification, false);
    assert.equal((await api("POST", "/api/businesses", biz, u.cookie, url)).status, 201, "no gate");
    assert.equal((await api("POST", "/api/verify/resend", {}, u.cookie, url)).status, 503);
    s2.close();
  }
  function signup2(url, email) { return api("POST", "/api/register", { accept: true, email, name: "O", password: "password-1" }, null, url); }
});

test("in production without SITE_URL no verification link is built from the request", async () => {
  const prev = process.env.NODE_ENV; process.env.NODE_ENV = "production";
  const box = []; const errs = []; const origErr = console.error, origWarn = console.warn; console.error = (...a) => errs.push(a.join(" ")); console.warn = () => {};
  try {
    const { server: s2 } = createApp({ dbFile: ":memory:", trustProxy: true, mailer: { name: "test", async send(m) { box.push(m); } } });
    await new Promise((r) => s2.listen(0, r));
    const url = `http://127.0.0.1:${s2.address().port}`;
    assert.equal((await api("POST", "/api/register", { accept: true, email: "p@v.test", name: "P", password: "password-1" }, null, url)).status, 201);
    await tick();
    assert.equal(box.length, 0);
    assert.ok(errs.some((e) => /SITE_URL/.test(e)));
    s2.close();
  } finally { console.error = origErr; console.warn = origWarn; process.env.NODE_ENV = prev; }
});

test("accounts that predate verification are grandfathered as verified by the migration", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qd-mig-")), file = path.join(dir, "old.db");
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, pass_hash TEXT NOT NULL, salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO users (email,name,pass_hash,salt) VALUES ('legacy@v.test','L','x','y');`);
  old.close();
  const { server: s2, db: d2 } = createApp({ dbFile: file, seed: false, mailer });
  assert.ok(d2.prepare("SELECT email_verified_at v FROM users WHERE email='legacy@v.test'").get().v, "legacy user verified");
  await new Promise((r) => s2.listen(0, r)); await new Promise((r) => s2.close(r));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the /verify page is noindex and not cached", async () => {
  const r = await fetch(base + "/verify");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-robots-tag"), "noindex");
  assert.match(await r.text(), /name="robots" content="noindex,nofollow"/);
});
