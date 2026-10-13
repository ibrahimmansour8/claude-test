"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./server");
const { LEGAL_VERSION } = require("./legal");

let base, server, db;
const get = (p) => fetch(base + p, { redirect: "manual" });
async function api(method, p, body, cookie) {
  const r = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null), cookie: (r.headers.get("set-cookie") || "").split(";")[0], headers: r.headers };
}

test.before(async () => {
  ({ server, db } = createApp({
    dbFile: ":memory:", siteUrl: "https://qatarguide.example", operatorName: "شركة المثال <b>", contactEmail: "privacy@example.qa",
    adminEmail: "a@legal.test", adminPassword: "admin-pass-123"
  }));
  await new Promise((r) => server.listen(0, r));
  base = "http://127.0.0.1:" + server.address().port;
});
test.after(() => server.close());

test("privacy and terms pages exist in both languages, indexable, with operator and contact", async () => {
  for (const [path, h1, lang] of [["/privacy", "سياسة الخصوصية", "ar"], ["/terms", "شروط الاستخدام", "ar"], ["/en/privacy", "Privacy Policy", "en"], ["/en/terms", "Terms of Use", "en"]]) {
    const r = await get(path), html = await r.text();
    assert.equal(r.status, 200, path);
    assert.match(html, new RegExp(`<h1>${h1}</h1>`), path);
    assert.match(html, /content="index,follow"/);
    assert.match(html, new RegExp(`<html lang="${lang}"`));
    assert.ok(html.includes('href="mailto:privacy@example.qa"'), "contact e-mail shown");
    assert.ok(html.includes(LEGAL_VERSION), "last updated shown");
    assert.ok(html.includes('hreflang="' + (lang === "ar" ? "en" : "ar") + '"'), "hreflang alternate");
  }
});

test("operator name is escaped; missing contact shows an explicit placeholder, not a fake address", async () => {
  const html = await (await get("/privacy")).text();
  assert.ok(html.includes("شركة المثال &lt;b&gt;") && !html.includes("شركة المثال <b>"));
  const { server: s2 } = createApp({ dbFile: ":memory:", siteUrl: "https://x.example" });
  await new Promise((r) => s2.listen(0, r));
  const bare = await (await fetch(`http://127.0.0.1:${s2.address().port}/en/terms`)).text();
  assert.match(bare, /contact e-mail not configured/);
  assert.ok(!bare.includes("mailto:"));
  s2.close();
});

test("policy text matches reality: states the cookie, hashing, and no advertising cookies", async () => {
  const en = await (await get("/en/privacy")).text();
  assert.match(en, /<code>sid<\/code>/);
  assert.match(en, /salted cryptographic hash/);
  assert.match(en, /no advertising or analytics cookies/);
  assert.match(en, /delete your account/);
});

test("footer links to both pages and legal pages are in the sitemap", async () => {
  const home = await (await get("/")).text();
  assert.ok(home.includes('href="/privacy"') && home.includes('href="/terms"'));
  const en = await (await get("/en")).text();
  assert.ok(en.includes('href="/en/privacy"') && en.includes('href="/en/terms"'));
  const xml = await (await get("/sitemap.xml")).text();
  for (const u of ["/privacy", "/terms", "/en/privacy", "/en/terms"]) assert.ok(xml.includes(`<loc>https://qatarguide.example${u}</loc>`), u);
});

test("registration requires explicit acceptance and records it", async () => {
  const body = { email: "c@legal.test", name: "C", password: "password-1" };
  assert.equal((await api("POST", "/api/register", body)).status, 400);
  assert.equal((await api("POST", "/api/register", { ...body, accept: "yes" })).json.error, "terms_required");
  assert.equal((await api("POST", "/api/register", { ...body, accept: false })).json.error, "terms_required");
  const ok = await api("POST", "/api/register", { ...body, accept: true });
  assert.equal(ok.status, 201);
  const row = db.prepare("SELECT terms_accepted_at, terms_version FROM users WHERE email=?").get("c@legal.test");
  assert.equal(row.terms_version, LEGAL_VERSION);
  assert.ok(!Number.isNaN(Date.parse(row.terms_accepted_at)));
});

test("export returns only my own data", async () => {
  const a = await api("POST", "/api/register", { accept: true, email: "ea@legal.test", name: "EA", password: "password-1" });
  const b = await api("POST", "/api/register", { accept: true, email: "eb@legal.test", name: "EB", password: "password-1" });
  await api("POST", "/api/businesses", { name_ar: "نشاط أ", cat: "tech", city: "doha", phone: "55123401" }, a.cookie);
  await api("POST", "/api/businesses", { name_ar: "نشاط ب", cat: "tech", city: "doha", phone: "55123402" }, b.cookie);
  assert.equal((await api("GET", "/api/me/export")).status, 401);
  const ex = await api("GET", "/api/me/export", null, a.cookie);
  assert.equal(ex.status, 200);
  assert.match(ex.headers.get("content-disposition"), /attachment/);
  assert.equal(ex.json.profile.email, "ea@legal.test");
  assert.ok(!("pass_hash" in ex.json.profile) && !("salt" in ex.json.profile), "no secrets in export");
  assert.deepEqual(ex.json.businesses.map((x) => x.name_ar), ["نشاط أ"]);
});

test("deleting an account needs the password and removes profile, sessions, reviews and listings", async () => {
  const admin = await api("POST", "/api/login", { email: "a@legal.test", password: "admin-pass-123" });
  const u = await api("POST", "/api/register", { accept: true, email: "del@legal.test", name: "Del", password: "password-1" });
  const mine = await api("POST", "/api/businesses", { name_ar: "سيُحذف", cat: "tech", city: "doha", phone: "55123499" }, u.cookie);
  await api("POST", `/api/admin/businesses/${mine.json.id}/approve`, {}, admin.cookie);
  const target = (await api("GET", "/api/businesses")).json.businesses.find((x) => x.name.ar !== "سيُحذف").id;
  await api("POST", `/api/businesses/${target}/reviews`, { rating: 4, comment: "x" }, u.cookie);
  assert.equal((await api("GET", `/api/businesses/${target}/reviews`)).json.reviews.length, 1);

  assert.equal((await api("DELETE", "/api/me", { password: "x" })).status, 401, "needs login");
  assert.equal((await api("DELETE", "/api/me", { password: "wrong-pass-1" }, u.cookie)).status, 401, "needs correct password");
  assert.equal((await api("GET", "/api/me", null, u.cookie)).json.user.email, "del@legal.test", "still exists after bad attempt");
  assert.equal((await api("DELETE", "/api/me", { password: "password-1" }, u.cookie)).status, 200);

  assert.equal((await api("GET", "/api/me", null, u.cookie)).json.user, null, "session is gone");
  assert.equal((await api("POST", "/api/login", { email: "del@legal.test", password: "password-1" })).status, 401);
  assert.equal((await api("GET", `/api/businesses/${target}/reviews`)).json.reviews.length, 0, "reviews removed");
  assert.ok(!(await api("GET", "/api/businesses")).json.businesses.some((x) => x.name.ar === "سيُحذف"), "listing removed");
  assert.equal((await get(`/b/${mine.json.id}`)).status, 404, "its page is a 404 now");
});

test("admin accounts cannot be deleted through the self-service endpoint", async () => {
  const admin = await api("POST", "/api/login", { email: "a@legal.test", password: "admin-pass-123" });
  assert.equal((await api("DELETE", "/api/me", { password: "admin-pass-123" }, admin.cookie)).status, 403);
});
