"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./server");

let base, server, cookieUser, cookieAdmin;

async function call(method, path, body, cookie) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const sc = res.headers.get("set-cookie");
  return { status: res.status, json: await res.json().catch(() => null), cookie: sc ? sc.split(";")[0] : null, headers: res.headers };
}

test.before(async () => {
  ({ server } = createApp({ dbFile: ":memory:", adminEmail: "admin@example.com", adminPassword: "admin-pass-123" }));
  await new Promise((r) => server.listen(0, r));
  base = "http://127.0.0.1:" + server.address().port;
});
test.after(() => server.close());

test("seeded approved businesses are public", async () => {
  const r = await call("GET", "/api/businesses");
  assert.equal(r.status, 200);
  assert.equal(r.json.businesses.length, 12);
  assert.ok(r.json.businesses.every((b) => b.status === "approved"));
});

test("register validates input and rejects duplicates", async () => {
  assert.equal((await call("POST", "/api/register", { email: "bad", name: "A", password: "12345678" })).status, 400);
  assert.equal((await call("POST", "/api/register", { email: "a@b.co", name: "A", password: "short" })).status, 400);
  const ok = await call("POST", "/api/register", { email: "User@Example.com", name: "Sara", password: "password-1" });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.user.email, "user@example.com");
  assert.match(ok.headers.get("set-cookie"), /HttpOnly/);
  cookieUser = ok.cookie;
  assert.equal((await call("POST", "/api/register", { email: "user@example.com", name: "X", password: "password-1" })).status, 409);
});

test("login works and wrong password fails", async () => {
  assert.equal((await call("POST", "/api/login", { email: "user@example.com", password: "nope-nope" })).status, 401);
  const ok = await call("POST", "/api/login", { email: "user@example.com", password: "password-1" });
  assert.equal(ok.status, 200);
  cookieUser = ok.cookie;
  assert.equal((await call("GET", "/api/me", null, cookieUser)).json.user.name, "Sara");
});

test("non-JSON writes are rejected (CSRF hardening)", async () => {
  const res = await fetch(base + "/api/login", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
  assert.equal(res.status, 415);
});

test("adding a business requires login, validates, and starts pending", async () => {
  const payload = { name_ar: "نشاط جديد", cat: "tech", city: "doha", phone: "55123456", desc: "وصف" };
  assert.equal((await call("POST", "/api/businesses", payload)).status, 401);
  assert.equal((await call("POST", "/api/businesses", { ...payload, phone: "12345678" }, cookieUser)).status, 400);
  assert.equal((await call("POST", "/api/businesses", { ...payload, cat: "nope" }, cookieUser)).status, 400);
  const ok = await call("POST", "/api/businesses", payload, cookieUser);
  assert.equal(ok.status, 201);
  assert.equal(ok.json.status, "pending");
  // not public yet
  const pub = await call("GET", "/api/businesses");
  assert.equal(pub.json.businesses.length, 12);
  // owner sees it
  const mine = await call("GET", "/api/my/businesses", null, cookieUser);
  assert.equal(mine.json.businesses.length, 1);
  assert.equal(mine.json.businesses[0].phone, "+97455123456");
});

test("admin endpoints are protected; admin can approve and verify", async () => {
  assert.equal((await call("GET", "/api/admin/businesses")).status, 401);
  assert.equal((await call("GET", "/api/admin/businesses", null, cookieUser)).status, 403);
  const login = await call("POST", "/api/login", { email: "admin@example.com", password: "admin-pass-123" });
  assert.equal(login.json.user.role, "admin");
  cookieAdmin = login.cookie;
  const pending = await call("GET", "/api/admin/businesses?status=pending", null, cookieAdmin);
  assert.equal(pending.json.businesses.length, 1);
  const id = pending.json.businesses[0].id;
  assert.equal((await call("POST", `/api/admin/businesses/${id}/approve`, {}, cookieAdmin)).status, 200);
  assert.equal((await call("POST", `/api/admin/businesses/${id}/verify`, {}, cookieAdmin)).status, 200);
  const pub = await call("GET", "/api/businesses");
  assert.equal(pub.json.businesses.length, 13);
  assert.ok(pub.json.businesses.find((b) => b.id === id).verified);
  assert.equal((await call("POST", "/api/admin/businesses/9999/approve", {}, cookieAdmin)).status, 404);
});

test("logout invalidates the session", async () => {
  await call("POST", "/api/logout", {}, cookieUser);
  assert.equal((await call("GET", "/api/me", null, cookieUser)).json.user, null);
});

test("static files are served and path traversal is blocked", async () => {
  const idx = await fetch(base + "/");
  assert.equal(idx.status, 200);
  assert.match(await idx.text(), /<title>/);
  const bad = await fetch(base + "/..%2fpackage.json");
  assert.notEqual(bad.status, 200);
});
