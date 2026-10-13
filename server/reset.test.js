"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createApp } = require("./server");

const SITE = "https://qatarguide.example";
let base, server, db;
const outbox = [];
const mailer = { name: "test", async send(m) { outbox.push(m); } };
const tick = () => new Promise((r) => setTimeout(r, 30)); // e-mails are sent in the background

let ipN = 0; // every call comes from a distinct client IP, so per-IP limits don't interfere between tests
const nextIp = () => `198.51.100.${(++ipN % 250) + 1}-${Math.floor(ipN / 250)}`;
async function api(method, p, body, cookie, extraHeaders = {}) {
  const r = await fetch(base + p, { method, headers: { "Content-Type": "application/json", "X-Real-IP": nextIp(), ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null), cookie: (r.headers.get("set-cookie") || "").split(";")[0], headers: r.headers };
}
const tokenFrom = (mail) => mail.text.match(/token=([0-9a-f]{64})/)[1];
async function signup(email, pw = "old-password-1") {
  return api("POST", "/api/register", { accept: true, email, name: "Mona", password: pw });
}

test.before(async () => {
  ({ server, db } = createApp({ dbFile: ":memory:", siteUrl: SITE, mailer, trustProxy: true, adminEmail: "a@reset.test", adminPassword: "admin-pass-123" }));
  await new Promise((r) => server.listen(0, r));
  base = "http://127.0.0.1:" + server.address().port;
});
test.after(() => server.close());

test("forgot: identical answer for known and unknown e-mails; only a real account gets mail", async () => {
  await signup("mona@reset.test");
  const known = await api("POST", "/api/forgot", { email: "mona@reset.test" });
  const unknown = await api("POST", "/api/forgot", { email: "nobody@reset.test" });
  const garbage = await api("POST", "/api/forgot", { email: "not-an-email" });
  for (const r of [known, unknown, garbage]) { assert.equal(r.status, 200); assert.deepEqual(r.json, { ok: true }); }
  await tick();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "mona@reset.test");
  assert.match(outbox[0].text, new RegExp(`${SITE}/reset\\?token=[0-9a-f]{64}`));
  assert.match(outbox[0].subject, /استعادة كلمة المرور/);
});

test("English requests get an English e-mail and /en/ link", async () => {
  outbox.length = 0;
  await signup("sam@reset.test");
  await api("POST", "/api/forgot", { email: "sam@reset.test", lang: "en" });
  await tick();
  assert.match(outbox[0].subject, /Reset your password/);
  assert.ok(outbox[0].text.includes(`${SITE}/en/reset?token=`));
});

test("tokens are stored hashed, not in clear text", async () => {
  const token = tokenFrom(outbox[0]);
  const rows = db.prepare("SELECT token_hash FROM password_resets").all().map((r) => r.token_hash);
  assert.ok(rows.length > 0 && !rows.includes(token));
});

test("reset: new password works, old one doesn't, token is single-use, sessions end, notice mail is sent", async () => {
  outbox.length = 0;
  const u = await signup("flow@reset.test");
  assert.equal((await api("GET", "/api/me", null, u.cookie)).json.user.email, "flow@reset.test");
  await api("POST", "/api/forgot", { email: "flow@reset.test" });
  await tick();
  const token = tokenFrom(outbox[0]);

  assert.equal((await api("POST", "/api/reset", { token, password: "short" })).json.error, "weak_password");
  assert.equal((await api("POST", "/api/reset", { token: "0".repeat(64), password: "new-password-1" })).json.error, "invalid_token");
  assert.equal((await api("POST", "/api/reset", { token, password: "new-password-1" })).status, 200);

  assert.equal((await api("POST", "/api/login", { email: "flow@reset.test", password: "old-password-1" })).status, 401);
  assert.equal((await api("POST", "/api/login", { email: "flow@reset.test", password: "new-password-1" })).status, 200);
  assert.equal((await api("GET", "/api/me", null, u.cookie)).json.user, null, "old session was signed out");
  assert.equal((await api("POST", "/api/reset", { token, password: "another-pass-1" })).json.error, "invalid_token", "single use");
  await tick();
  assert.match(outbox[1].subject, /تم تغيير كلمة مرورك/);
});

test("expired tokens are rejected", async () => {
  outbox.length = 0;
  await signup("late@reset.test");
  await api("POST", "/api/forgot", { email: "late@reset.test" });
  await tick();
  const token = tokenFrom(outbox[0]);
  db.prepare("UPDATE password_resets SET expires_at=?").run(Date.now() - 1000);
  assert.equal((await api("POST", "/api/reset", { token, password: "new-password-1" })).json.error, "invalid_token");
  assert.equal((await api("POST", "/api/login", { email: "late@reset.test", password: "old-password-1" })).status, 200, "old password still valid");
});

test("a newer request invalidates the previous link", async () => {
  outbox.length = 0;
  await signup("two@reset.test");
  await api("POST", "/api/forgot", { email: "two@reset.test" }); await tick();
  await api("POST", "/api/forgot", { email: "two@reset.test" }); await tick();
  const [first, second] = outbox.map(tokenFrom);
  assert.equal((await api("POST", "/api/reset", { token: first, password: "new-password-1" })).json.error, "invalid_token");
  assert.equal((await api("POST", "/api/reset", { token: second, password: "new-password-1" })).status, 200);
});

test("per-address limit: after 3 requests/hour no more e-mails go out, answer stays identical", async () => {
  outbox.length = 0;
  await signup("spam@reset.test");
  for (let i = 0; i < 6; i++) assert.equal((await api("POST", "/api/forgot", { email: "spam@reset.test" })).status, 200);
  await tick();
  assert.equal(outbox.length, 3);
});

test("admin accounts are never reset by e-mail", async () => {
  outbox.length = 0;
  assert.equal((await api("POST", "/api/forgot", { email: "a@reset.test" })).status, 200);
  await tick();
  assert.equal(outbox.length, 0);
});

test("reset link is built from SITE_URL, never from a forged Host header", async () => {
  outbox.length = 0;
  await signup("host@reset.test");
  await new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, path: "/api/forgot", method: "POST", headers: { Host: "evil.example", "Content-Type": "application/json", "X-Real-IP": nextIp() } }, (res) => { res.resume(); res.on("end", resolve); });
    req.on("error", reject); req.end(JSON.stringify({ email: "host@reset.test" }));
  });
  await tick();
  assert.ok(outbox[0].text.includes(SITE + "/reset?token=") && !outbox[0].text.includes("evil.example"));
});

test("in production without SITE_URL no link is ever built from the request", async () => {
  const prev = process.env.NODE_ENV; process.env.NODE_ENV = "production";
  const box = []; const errs = []; const origErr = console.error; console.error = (...a) => errs.push(a.join(" "));
  try {
    const { server: s2 } = createApp({ dbFile: ":memory:", trustProxy: true, mailer: { name: "test", async send(m) { box.push(m); } } });
    await new Promise((r) => s2.listen(0, r));
    const url = `http://127.0.0.1:${s2.address().port}`;
    const j = (p, b) => fetch(url + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.status);
    await j("/api/register", { accept: true, email: "p@reset.test", name: "P", password: "password-1" });
    assert.equal(await j("/api/forgot", { email: "p@reset.test" }), 200);
    await tick();
    assert.equal(box.length, 0);
    assert.ok(errs.some((e) => /SITE_URL/.test(e)));
    s2.close();
  } finally { console.error = origErr; process.env.NODE_ENV = prev; }
});

test("when e-mail is not configured the feature is off and says so", async () => {
  const { server: s3 } = createApp({ dbFile: ":memory:", mailer: { name: "none", async send() { throw new Error("x"); } } });
  await new Promise((r) => s3.listen(0, r));
  const url = `http://127.0.0.1:${s3.address().port}`;
  const me = await (await fetch(url + "/api/me")).json();
  assert.equal(me.features.passwordReset, false);
  const r = await fetch(url + "/api/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "a@b.co" }) });
  assert.equal(r.status, 503);
  s3.close();
});

test("change password: needs current password, keeps this device, signs out others, admin is refused", async () => {
  outbox.length = 0;
  const a = await signup("chg@reset.test", "first-password-1");
  const other = await api("POST", "/api/login", { email: "chg@reset.test", password: "first-password-1" });
  assert.equal((await api("POST", "/api/me/password", { current: "wrong-pass-1", next: "second-password-2" }, a.cookie)).status, 401);
  assert.equal((await api("POST", "/api/me/password", { current: "first-password-1", next: "short" }, a.cookie)).json.error, "weak_password");
  assert.equal((await api("POST", "/api/me/password", { current: "first-password-1", next: "second-password-2" }, a.cookie)).status, 200);
  assert.equal((await api("GET", "/api/me", null, a.cookie)).json.user.email, "chg@reset.test", "this device stays signed in");
  assert.equal((await api("GET", "/api/me", null, other.cookie)).json.user, null, "other device is signed out");
  assert.equal((await api("POST", "/api/login", { email: "chg@reset.test", password: "second-password-2" })).status, 200);
  await tick();
  assert.match(outbox.at(-1).subject, /تم تغيير كلمة مرورك/);
  const admin = await api("POST", "/api/login", { email: "a@reset.test", password: "admin-pass-123" });
  assert.equal((await api("POST", "/api/me/password", { current: "admin-pass-123", next: "second-password-2" }, admin.cookie)).status, 403);
});

test("security headers: no-referrer on pages and API", async () => {
  assert.equal((await fetch(base + "/reset")).headers.get("referrer-policy"), "no-referrer");
  assert.equal((await fetch(base + "/api/health")).headers.get("referrer-policy"), "no-referrer");
  assert.equal((await fetch(base + "/reset")).headers.get("x-robots-tag"), "noindex");
});
