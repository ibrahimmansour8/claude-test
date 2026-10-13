"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./server");

const SITE = "https://qatarguide.example";
let base, server, admin;

const get = (p, headers = {}) => fetch(base + p, { redirect: "manual", headers });
const api = async (method, p, body, cookie) => {
  const r = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null), cookie: (r.headers.get("set-cookie") || "").split(";")[0] };
};
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));

test.before(async () => {
  ({ server } = createApp({ dbFile: ":memory:", siteUrl: SITE, adminEmail: "a@seo.test", adminPassword: "admin-pass-123" }));
  await new Promise((r) => server.listen(0, r));
  base = "http://127.0.0.1:" + server.address().port;
  admin = (await api("POST", "/api/login", { email: "a@seo.test", password: "admin-pass-123" })).cookie;
});
test.after(() => server.close());

test("home (Arabic): server-rendered, canonical, hreflang, WebSite schema, one h1", async () => {
  const res = await get("/"); const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /<title>دليل قطر \| دليل الأعمال والخدمات في قطر<\/title>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/">`));
  assert.match(html, new RegExp(`hreflang="en" href="${SITE}/en"`));
  assert.match(html, /hreflang="x-default"/);
  assert.match(html, /property="og:image" content="https:\/\/qatarguide.example\/og-image.png"/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(html.includes('href="/category/restaurants"'), "category links are in the HTML, not only JS-rendered");
  assert.equal(jsonLd(html)[0]["@type"], "WebSite");
});

test("home (English) lives at /en with ltr and English meta", async () => {
  const html = await (await get("/en")).text();
  assert.match(html, /<html lang="en" dir="ltr">/);
  assert.match(html, /<title>Qatar Guide \| Business &amp; Services Directory in Qatar<\/title>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/en">`));
  assert.ok(html.includes('href="/en/category/restaurants"'));
});

test("business page: content, LocalBusiness + Breadcrumb schema, no rating until reviews exist", async () => {
  let html = await (await get("/b/1")).text();
  assert.match(html, /<h1>مطعم نسيم الخليج/);
  let ld = jsonLd(html);
  const biz = ld.find((x) => x["@type"] === "Restaurant");
  assert.ok(biz, "Restaurant schema");
  assert.equal(biz.address.addressCountry, "QA");
  assert.equal(biz.telephone, "+97444000001");
  assert.equal(biz.aggregateRating, undefined);
  assert.ok(ld.find((x) => x["@type"] === "BreadcrumbList"));
  // add a real review -> aggregateRating appears
  const u = await api("POST", "/api/register", { accept: true, email: "r@seo.test", name: "Rev", password: "password-1" });
  await api("POST", "/api/businesses/1/reviews", { rating: 5, comment: "ممتاز" }, u.cookie);
  html = await (await get("/en/b/1")).text();
  const en = jsonLd(html).find((x) => x["@type"] === "Restaurant");
  assert.deepEqual([en.aggregateRating.ratingValue, en.aggregateRating.reviewCount], [5, 1]);
  assert.match(html, /<title>Naseem Al Khaleej Restaurant – Restaurants &amp; Cafés in Doha \| Qatar Guide<\/title>/);
  assert.ok(html.includes("ممتاز"), "review text is in server HTML");
});

test("unknown / unapproved pages return real 404 with noindex", async () => {
  for (const p of ["/b/99999", "/nothing-here", "/category/nope", "/en/b/abc"]) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
    assert.equal(r.headers.get("x-robots-tag"), "noindex", p);
    assert.match(await r.text(), /name="robots" content="noindex,follow"/);
  }
  const u = await api("POST", "/api/register", { accept: true, email: "p@seo.test", name: "P", password: "password-1" });
  const created = await api("POST", "/api/businesses", { name_ar: "قيد المراجعة", cat: "tech", city: "doha", phone: "55123456" }, u.cookie);
  assert.equal((await get(`/b/${created.json.id}`)).status, 404, "pending listings are not public");
});

test("category pages: indexable with listings, noindex when empty", async () => {
  const ok = await (await get("/category/restaurants/doha")).text();
  assert.match(ok, /content="index,follow"/);
  assert.match(ok, /<h1>مطاعم وكافيهات في الدوحة<\/h1>/);
  assert.ok(jsonLd(ok).find((x) => x["@type"] === "ItemList"));
  const empty = await (await get("/category/restaurants/khor")).text();
  assert.match(empty, /content="noindex,follow"/);
});

test("private pages are noindex (header + meta) but crawlable", async () => {
  for (const p of ["/login", "/register", "/add", "/mine", "/admin", "/en/login"]) {
    const r = await get(p);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("x-robots-tag"), "noindex", p);
    assert.match(await r.text(), /name="robots" content="noindex,nofollow"/);
  }
});

test("canonical redirects: trailing slash, /index.html, /en/", async () => {
  for (const [from, to] of [["/browse/", "/browse"], ["/index.html", "/"], ["/en/", "/en"], ["/en/b/1/", "/en/b/1"]]) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get("location"), to);
  }
});

test("sitemap lists public pages in both languages with alternates, never private/pending ones", async () => {
  const r = await get("/sitemap.xml"); const xml = await r.text();
  assert.match(r.headers.get("content-type"), /application\/xml/);
  assert.ok(xml.includes(`<loc>${SITE}/b/1</loc>`));
  assert.ok(xml.includes(`<loc>${SITE}/en/b/1</loc>`));
  assert.ok(xml.includes(`<loc>${SITE}/category/restaurants/doha</loc>`));
  assert.ok(!xml.includes("/category/restaurants/khor"), "empty combos excluded");
  assert.ok(!xml.includes("/login") && !xml.includes("/admin") && !xml.includes("/mine"));
  assert.match(xml, /xhtml:link rel="alternate" hreflang="en"/);
  assert.match(xml, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  // 12 seeded businesses + created-and-still-pending one must not be counted
  assert.equal((xml.match(/<loc>[^<]*\/b\/\d+<\/loc>/g) || []).length, 24);
});

test("robots.txt points to the sitemap and blocks only the API", async () => {
  const txt = await (await get("/robots.txt")).text();
  assert.match(txt, /Sitemap: https:\/\/qatarguide\.example\/sitemap\.xml/);
  assert.match(txt, /Disallow: \/api\//);
  assert.ok(!/Disallow: \/(login|admin|add|mine|register)/.test(txt));
});

test("user content cannot break out of HTML or JSON-LD", async () => {
  const u = await api("POST", "/api/register", { accept: true, email: "x@seo.test", name: "X", password: "password-1" });
  const evil = `</script><script>alert(1)</script>"><img src=x onerror=alert(2)>`;
  const c = await api("POST", "/api/businesses", { name_ar: evil, name_en: evil, desc: evil, area: evil, cat: "tech", city: "doha", phone: "55123457" }, u.cookie);
  await api("POST", `/api/admin/businesses/${c.json.id}/approve`, {}, admin);
  for (const p of [`/b/${c.json.id}`, `/en/b/${c.json.id}`, "/browse", "/category/tech"]) {
    const html = await (await get(p)).text();
    assert.ok(!html.includes("<script>alert"), p);
    assert.ok(!html.includes("<img src=x"), p);
    jsonLd(html); // every JSON-LD block still parses
  }
});

test("client data file does not leak the demo business list; assets are cached and gzipped", async () => {
  const js = await (await get("/data.js")).text();
  assert.ok(js.includes("CATEGORIES") && !js.includes("BUSINESSES") && !js.includes("+97444"));
  const css = await get("/styles.css", { "Accept-Encoding": "gzip" });
  assert.equal(css.status, 200);
  assert.equal(css.headers.get("content-encoding"), "gzip");
  assert.match(css.headers.get("cache-control"), /max-age=300/);
});
