"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createApp } = require("./server");

const SITE = "https://qatarguide.example";
const fx = (n) => fs.readFileSync(path.join(__dirname, "fixtures", n));
let base, server, db, admin, owner, other;
let ipN = 0;
const ip = () => `198.18.${Math.floor(++ipN / 250)}.${(ipN % 250) + 1}`;
const H = (cookie, extra = {}) => ({ "X-Real-IP": ip(), ...(cookie ? { Cookie: cookie } : {}), ...extra });

async function api(method, p, body, cookie, url = base) {
  const r = await fetch(url + p, { method, headers: H(cookie, body ? { "Content-Type": "application/json" } : {}), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null), cookie: (r.headers.get("set-cookie") || "").split(";")[0], headers: r.headers };
}
async function upload(id, buf, cookie, { type = "image/jpeg", marker = "1", url = base } = {}) {
  const r = await fetch(`${url}/api/businesses/${id}/images`, { method: "POST", headers: H(cookie, { "Content-Type": type, ...(marker ? { "X-Upload": marker } : {}) }), body: buf });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const getImg = (id, cookie) => fetch(`${base}/img/${id}`, { headers: H(cookie) });
const signup = (email) => api("POST", "/api/register", { accept: true, email, name: "Mona", password: "password-1" });
const form = (o = {}) => ({ name_ar: "مكتب النور", name_en: "Al Noor Office", cat: "legal", city: "doha", phone: "55123456", desc: "استشارات", area: "الدفنة", hours: "8 - 4", ...o });
async function newListing(cookie, o) { return (await api("POST", "/api/businesses", form(o), cookie)).json.id; }
async function approve(id) { return api("POST", `/api/admin/businesses/${id}/approve`, {}, admin); }
const pub = async () => (await api("GET", "/api/businesses")).json.businesses;
const mine = async (cookie) => (await api("GET", "/api/my/businesses", null, cookie)).json.businesses;

test.before(async () => {
  ({ server, db } = createApp({ dbFile: ":memory:", siteUrl: SITE, trustProxy: true, requireVerifiedEmail: false, adminEmail: "a@l.test", adminPassword: "admin-pass-123" }));
  await new Promise((r) => server.listen(0, r));
  base = "http://127.0.0.1:" + server.address().port;
  admin = (await api("POST", "/api/login", { email: "a@l.test", password: "admin-pass-123" })).cookie;
  owner = (await signup("owner@l.test")).cookie;
  other = (await signup("other@l.test")).cookie;
});
test.after(() => server.close());

// ---------------------------------------------------------------- editing
test("owner edits a not-yet-published listing directly; phone with spaces is accepted", async () => {
  const id = await newListing(owner);
  const r = await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "مكتب النور المحدث", phone: "55 12 34 99", hours: "9 - 5" }), owner);
  assert.deepEqual([r.status, r.json.status], [200, "updated"]);
  const row = (await mine(owner)).find((b) => b.id === id);
  assert.equal(row.name.ar, "مكتب النور المحدث");
  assert.equal(row.phone, "+97455123499");
  assert.equal(row.hours.ar, "9 - 5");
  assert.equal(row.status, "pending");
});

test("only the owner or an admin can edit; input is validated", async () => {
  const id = await newListing(owner);
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form())).status, 401);
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form(), other)).status, 403);
  assert.equal((await api("PATCH", "/api/businesses/99999", form(), owner)).status, 404);
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form({ phone: "12345678" }), owner)).json.error, "invalid_phone");
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form({ phone: "551234567" }), owner)).json.error, "invalid_phone", "9 digits is not a number");
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form({ cat: "nope" }), owner)).json.error, "invalid_category");
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form({ name_ar: " " }), owner)).json.error, "invalid_name");
  assert.equal((await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "إدارة مباشرة" }), admin)).json.status, "updated", "admin edits apply at once");
});

test("editing a PUBLISHED listing waits for review; the live version does not change until approved", async () => {
  const id = await newListing(owner, { name_ar: "نسخة منشورة", phone: "55123401" });
  await approve(id);
  await api("POST", `/api/admin/businesses/${id}/verify`, {}, admin);
  const r = await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "نسخة معدّلة", phone: "55123402", desc: "وصف جديد" }), owner);
  assert.deepEqual([r.status, r.json.status], [200, "edit_pending"]);

  const live = (await pub()).find((b) => b.id === id);
  assert.equal(live.name.ar, "نسخة منشورة", "public still shows the reviewed version");
  assert.equal(live.phone, "+97455123401");
  const own = (await mine(owner)).find((b) => b.id === id);
  assert.equal(own.edit.name_ar, "نسخة معدّلة", "owner sees the proposal");
  assert.equal(own.status, "approved");
  const manage = await api("GET", `/api/businesses/${id}/manage`, null, owner);
  assert.equal(manage.json.form.name_ar, "نسخة معدّلة", "edit form opens with the pending values");
  assert.equal((await api("GET", `/api/businesses/${id}/manage`, null, other)).status, 403);

  const queue = (await api("GET", "/api/admin/businesses?status=pending", null, admin)).json.businesses;
  const card = queue.find((b) => b.id === id);
  assert.equal(card.review, "edit");
  assert.equal(card.name.ar, "نسخة منشورة", "admin sees live values plus the proposal");
  assert.equal(card.edit.phone, "55123402");

  await approve(id);
  const after = (await pub()).find((b) => b.id === id);
  assert.deepEqual([after.name.ar, after.phone, after.desc.ar, after.verified], ["نسخة معدّلة", "+97455123402", "وصف جديد", true]);
  assert.equal((await mine(owner)).find((b) => b.id === id).edit, null, "proposal cleared");
});

test("an edit identical to the live version is dropped; admin can reject a proposal", async () => {
  const id = await newListing(owner, { name_ar: "ثابت" });
  await approve(id);
  await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "تغيير" }), owner);
  assert.ok((await mine(owner)).find((b) => b.id === id).edit);
  const same = await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "ثابت" }), owner);
  assert.equal(same.json.status, "unchanged");
  assert.equal((await mine(owner)).find((b) => b.id === id).edit, null);

  await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "مرفوض" }), owner);
  await api("POST", `/api/admin/businesses/${id}/reject`, {}, admin);
  const live = (await pub()).find((b) => b.id === id);
  assert.equal(live.name.ar, "ثابت", "still published, unchanged");
  assert.equal((await mine(owner)).find((b) => b.id === id).edit, null);
});

test("a rejected listing goes back to review when its owner fixes it", async () => {
  const id = await newListing(owner);
  await api("POST", `/api/admin/businesses/${id}/reject`, {}, admin);
  assert.equal((await mine(owner)).find((b) => b.id === id).status, "rejected");
  await api("PATCH", `/api/businesses/${id}`, form({ name_ar: "بعد التصحيح" }), owner);
  assert.equal((await mine(owner)).find((b) => b.id === id).status, "pending");
});

// ---------------------------------------------------------------- images
test("upload: lands pending, is private to owner/admin, metadata is stripped", async () => {
  const id = await newListing(owner);
  const raw = fx("photo.jpg");
  assert.ok(raw.includes("SECRET-CAMERA-MAKE"));
  const up = await upload(id, raw, owner);
  assert.equal(up.status, 201);
  assert.deepEqual([up.json.status, up.json.w, up.json.h], ["pending", 200, 150]);

  assert.equal((await getImg(up.json.id)).status, 404, "anonymous cannot see a pending photo");
  assert.equal((await getImg(up.json.id, other)).status, 404, "other users cannot either");
  const own = await getImg(up.json.id, owner);
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("content-type"), "image/jpeg");
  assert.match(own.headers.get("cache-control"), /private/);
  const bytes = Buffer.from(await own.arrayBuffer());
  assert.ok(!bytes.includes("SECRET") && !bytes.includes("Exif"), "EXIF removed before storing");
  assert.equal((await getImg(up.json.id, admin)).status, 200, "admin can review it");
  assert.equal((await mine(owner)).find((b) => b.id === id).images[0].status, "pending");
});

test("approved photos become public with safe headers; the listing gets a cover", async () => {
  const id = await newListing(owner, { name_ar: "نشاط بصور" });
  const png = (await upload(id, fx("photo.png"), owner, { type: "image/png" })).json;
  const jpg = (await upload(id, fx("photo.jpg"), owner)).json;
  assert.equal((await pub()).find((b) => b.id === id), undefined, "listing itself is still pending");
  await approve(id); // approves the listing and both photos
  const img = await getImg(png.id);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/png");
  assert.match(img.headers.get("cache-control"), /public/);
  assert.equal(img.headers.get("x-content-type-options"), "nosniff");
  assert.match(img.headers.get("content-security-policy"), /sandbox/);
  const biz = (await pub()).find((b) => b.id === id);
  assert.deepEqual(biz.images.map((i) => i.id), [png.id, jpg.id]);
  assert.equal(biz.cover, png.id);

  // SEO: the real HTML carries the photos, structured data and og:image
  const html = await (await fetch(`${base}/b/${id}`)).text();
  assert.ok(html.includes(`src="/img/${png.id}"`));
  assert.ok(html.includes(`property="og:image" content="${SITE}/img/${png.id}"`));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1])).find((x) => x["@type"] === "LegalService");
  assert.deepEqual(ld.image, [`${SITE}/img/${png.id}`, `${SITE}/img/${jpg.id}`]);
  const home = await (await fetch(`${base}/category/legal`)).text();
  assert.ok(home.includes(`class="thumb" src="/img/${png.id}"`), "category cards show the cover");
});

test("a rejected or deleted photo is never public; photos of unpublished listings are not public even if approved", async () => {
  const id = await newListing(owner);
  const a = (await upload(id, fx("photo.jpg"), owner)).json;
  await api("POST", `/api/admin/images/${a.id}/approve`, {}, admin);
  assert.equal((await getImg(a.id)).status, 404, "listing is pending, so its photo is not public yet");
  await approve(id);
  assert.equal((await getImg(a.id)).status, 200);
  await api("POST", `/api/admin/images/${a.id}/reject`, {}, admin);
  assert.equal((await getImg(a.id)).status, 404);
  assert.equal((await api("POST", "/api/admin/images/99999/approve", {}, admin)).status, 404);
  assert.equal((await api("POST", `/api/admin/images/${a.id}/approve`, {}, owner)).status, 403, "owners cannot approve their own photos");
});

test("upload is refused for strangers, other types, bad bytes, oversize files and too many photos", async () => {
  const id = await newListing(owner);
  const jpg = fx("photo.jpg");
  assert.equal((await upload(id, jpg)).status, 401);
  assert.equal((await upload(id, jpg, other)).status, 403, "not your listing");
  assert.equal((await upload(99999, jpg, owner)).status, 404);
  assert.equal((await upload(id, jpg, owner, { marker: "" })).json.error, "bad_request", "custom header required (blocks cross-site forms)");
  assert.equal((await upload(id, jpg, owner, { type: "application/json" })).status, 415);
  assert.equal((await upload(id, jpg, owner, { type: "image/svg+xml" })).status, 415);
  assert.equal((await upload(id, jpg, owner, { type: "image/webp" })).status, 415);
  assert.equal((await upload(id, Buffer.from("<svg onload=alert(1)>"), owner)).json.error, "unsupported_image_type", "declared JPEG but it is SVG");
  assert.equal((await upload(id, Buffer.from("<?php echo 1; ?>"), owner)).status, 400);
  assert.equal((await upload(id, jpg.subarray(0, 300), owner)).json.error, "invalid_image", "truncated");
  assert.equal((await upload(id, Buffer.concat([jpg, Buffer.alloc(2.5 * 1024 * 1024)]), owner)).status, 413);
  for (let i = 0; i < 6; i++) assert.equal((await upload(id, jpg, owner)).status, 201);
  assert.equal((await upload(id, jpg, owner)).json.error, "too_many_images");
});

test("admin uploads are approved at once; deleting works for owner and admin only", async () => {
  const id = await newListing(owner);
  await approve(id);
  const byAdmin = (await upload(id, fx("photo.jpg"), admin)).json;
  assert.equal(byAdmin.status, "approved");
  assert.equal((await getImg(byAdmin.id)).status, 200);
  const byOwner = (await upload(id, fx("photo.png"), owner, { type: "image/png" })).json;
  assert.equal((await api("DELETE", `/api/images/${byOwner.id}`, null, other)).status, 403);
  assert.equal((await api("DELETE", `/api/images/${byOwner.id}`)).status, 401);
  assert.equal((await api("DELETE", `/api/images/${byOwner.id}`, null, owner)).status, 200);
  assert.equal((await api("DELETE", `/api/images/${byAdmin.id}`, null, admin)).status, 200);
  assert.equal((await api("DELETE", `/api/images/${byAdmin.id}`, null, admin)).status, 404);
  assert.equal((await getImg(byAdmin.id)).status, 404);
});

test("approving a card approves its photos; rejecting changes to a published listing rejects the pending photos too", async () => {
  const id = await newListing(owner);
  await approve(id);
  const first = (await upload(id, fx("photo.jpg"), owner)).json;           // pending photo on a published listing
  const queue = (await api("GET", "/api/admin/businesses?status=pending", null, admin)).json.businesses;
  assert.equal(queue.find((b) => b.id === id).review, "images", "photo-only reviews show up in the queue");
  await api("POST", `/api/admin/businesses/${id}/reject`, {}, admin);
  assert.equal((await getImg(first.id)).status, 404);
  const second = (await upload(id, fx("photo.png"), owner, { type: "image/png" })).json;
  await approve(id);
  assert.equal((await getImg(second.id)).status, 200);
  assert.ok(!(await api("GET", "/api/admin/businesses?status=pending", null, admin)).json.businesses.some((b) => b.id === id), "queue is clear");
});

test("deleting an account deletes its listings and their photos", async () => {
  const u = await signup("leaver@l.test");
  const id = await newListing(u.cookie);
  const img = (await upload(id, fx("photo.jpg"), u.cookie)).json;
  await api("DELETE", "/api/me", { password: "password-1" }, u.cookie);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM business_images WHERE id=?").get(img.id).n, 0);
});

test("the edit page is a private page: 200 and noindex, never a 404 status", async () => {
  for (const u of ["/edit/5", "/en/edit/5"]) {
    const r = await fetch(base + u);
    assert.equal(r.status, 200, u);
    assert.equal(r.headers.get("x-robots-tag"), "noindex");
  }
  assert.equal((await fetch(base + "/edit/abc")).status, 404);
  assert.ok(!(await (await fetch(base + "/sitemap.xml")).text()).includes("/edit/"));
});

test("the public list still carries photos with thousands of listings (no SQL variable limit)", async () => {
  const ins = db.prepare("INSERT INTO businesses (owner_id,cat,city,name_ar,name_en,phone,whatsapp,status) VALUES (NULL,'tech','doha','x','x','+97455000000','97455000000','approved')");
  db.exec("BEGIN"); for (let i = 0; i < 600; i++) ins.run(); db.exec("COMMIT");
  const list = await pub();
  assert.ok(list.length > 600);
  assert.ok(list.some((b) => b.images.length > 0), "photos are still attached");
});

test("sitemap lastmod follows the last approved change", async () => {
  const id = await newListing(owner, { name_ar: "للخريطة" });
  await approve(id);
  db.prepare("UPDATE businesses SET updated_at='2030-01-02 00:00:00' WHERE id=?").run(id);
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.match(xml, new RegExp(`/b/${id}</loc><lastmod>2030-01-02</lastmod>`));
});

test("with e-mail verification on, unverified users cannot edit or upload", async () => {
  const sent = [];
  const { server: s2 } = createApp({ dbFile: ":memory:", siteUrl: SITE, trustProxy: true, mailer: { name: "test", async send(m) { sent.push(m); } }, adminEmail: "a@l.test", adminPassword: "admin-pass-123" });
  await new Promise((r) => s2.listen(0, r));
  const url = `http://127.0.0.1:${s2.address().port}`;
  const adm = (await api("POST", "/api/login", { email: "a@l.test", password: "admin-pass-123" }, null, url)).cookie;
  const own = (await api("POST", "/api/businesses", form(), adm, url)).json.id;       // admin is verified and can create
  const u = await api("POST", "/api/register", { accept: true, email: "unv@l.test", name: "U", password: "password-1" }, null, url);
  assert.equal((await api("PATCH", `/api/businesses/${own}`, form(), u.cookie, url)).json.error, "email_unverified");
  assert.equal((await upload(own, fx("photo.jpg"), u.cookie, { url })).json.error, "email_unverified");
  s2.close();
});
