"use strict";
// SEO layer: real URLs, server-rendered content, meta tags, JSON-LD, sitemap, robots.
// Language is part of the URL: Arabic at "/…" (default), English at "/en/…".

const { renderLegal } = require("./legal");

const STR = {
  ar: {
    brand: "دليل قطر", nav_home: "الرئيسية", nav_browse: "تصفح الدليل", nav_add: "أضف نشاطك",
    footer: "دليل الأعمال والخدمات في قطر. © دليل قطر", privacy: "سياسة الخصوصية", terms: "شروط الاستخدام", lang_switch: "EN", in: "في", locale: "ar_QA", other_locale: "en_US",
    home_title: "دليل قطر | دليل الأعمال والخدمات في قطر",
    home_desc: "ابحث عن مطاعم وعقارات وعيادات وخدمات في قطر، واتصل بالأنشطة مباشرة واطلع على تقييمات حقيقية من المستخدمين.",
    hero_title: "كل ما تحتاجه في قطر، في مكان واحد", categories: "التصنيفات", featured: "أنشطة موثّقة",
    browse_title: "تصفح كل الأنشطة والخدمات في قطر | دليل قطر", browse_desc: "قائمة كاملة بالأنشطة التجارية والخدمات في قطر مع أرقام التواصل والتقييمات.",
    browse_h1: "كل الأنشطة والخدمات في قطر", call: "اتصال", whatsapp: "واتساب", phone: "الهاتف", hours: "ساعات العمل", area: "المنطقة",
    reviews: "تقييم", reviews_h: "التقييمات", verified: "موثّق", details: "التفاصيل", none: "لا توجد أنشطة في هذا القسم بعد.",
    not_found_title: "الصفحة غير موجودة | دليل قطر", not_found: "الصفحة المطلوبة غير موجودة.", back_home: "العودة للرئيسية", results: "نتيجة"
  },
  en: {
    brand: "Qatar Guide", nav_home: "Home", nav_browse: "Browse", nav_add: "List your business",
    footer: "Business & services directory in Qatar. © Qatar Guide", privacy: "Privacy Policy", terms: "Terms of Use", lang_switch: "عربي", in: "in", locale: "en_US", other_locale: "ar_QA",
    home_title: "Qatar Guide | Business & Services Directory in Qatar",
    home_desc: "Find restaurants, real estate, clinics and services in Qatar, contact businesses directly and read genuine user reviews.",
    hero_title: "Everything you need in Qatar, in one place", categories: "Categories", featured: "Verified businesses",
    browse_title: "Browse all businesses & services in Qatar | Qatar Guide", browse_desc: "A complete list of businesses and services in Qatar with contact details and reviews.",
    browse_h1: "All businesses & services in Qatar", call: "Call", whatsapp: "WhatsApp", phone: "Phone", hours: "Hours", area: "Area",
    reviews: "reviews", reviews_h: "Reviews", verified: "Verified", details: "Details", none: "No businesses in this section yet.",
    not_found_title: "Page not found | Qatar Guide", not_found: "The page you requested does not exist.", back_home: "Back to home", results: "results"
  }
};

const SCHEMA_TYPE = {
  restaurants: "Restaurant", realestate: "RealEstateAgent", cars: "AutoRepair", health: "MedicalClinic",
  home: "HomeAndConstructionBusiness", education: "EducationalOrganization", beauty: "BeautySalon",
  legal: "LegalService", events: "TravelAgency", tech: "ProfessionalService"
};

const PRIVATE = new Set(["/add", "/login", "/register", "/mine", "/admin", "/forgot", "/reset", "/verify"]);

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…"; };

function createSeo({ cats, cities, queries, site = {} }) {
  const catById = new Map(cats.map((c) => [c.id, c]));
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const pre = (lang) => (lang === "en" ? "/en" : "");
  // absolute URL for a language-less core path; Arabic home is "<base>/", English home is "<base>/en"
  const abs = (base, lang, core) => (core === "/" ? (lang === "en" ? base + "/en" : base + "/") : base + pre(lang) + core);
  const L = (o, lang) => o[lang] || o.ar;

  /** Resolve a URL path. Returns {redirect} | {lang, kind, ...}. */
  function resolve(pathname) {
    let lang = "ar", p = pathname;
    if (p === "/en" || p.startsWith("/en/")) { lang = "en"; p = p.slice(3) || "/"; }
    if (pathname === "/en/") return { redirect: "/en" };
    if (p.length > 1 && p.endsWith("/")) return { redirect: pre(lang) + p.replace(/\/+$/, "") };
    let m;
    if (p === "/") return { lang, kind: "home", core: "/" };
    if (p === "/browse") return { lang, kind: "browse", core: "/browse" };
    if (PRIVATE.has(p)) return { lang, kind: "private", core: p };
    if (/^\/edit\/\d+$/.test(p)) return { lang, kind: "private", core: p };
    if (p === "/privacy" || p === "/terms") return { lang, kind: "legal", page: p.slice(1), core: p };
    if ((m = p.match(/^\/category\/([a-z]+)$/)) && catById.has(m[1])) return { lang, kind: "category", cat: m[1], core: p };
    if ((m = p.match(/^\/category\/([a-z]+)\/([a-z]+)$/)) && catById.has(m[1]) && cityById.has(m[2])) return { lang, kind: "category", cat: m[1], city: m[2], core: p };
    if ((m = p.match(/^\/b\/(\d+)$/))) return { lang, kind: "business", id: Number(m[1]), core: p };
    return { lang, kind: "notfound", core: p };
  }

  // ---------- HTML fragments (server-rendered content, replaced by the SPA on load) ----------
  function card(b, lang, s) {
    const cat = catById.get(b.cat), city = cityById.get(b.city);
    const cover = (b.images || []).find((i) => i.status === "approved");
    const thumb = cover ? `<a class="thumb-link" href="${pre(lang)}/b/${b.id}"><img class="thumb" src="/img/${cover.id}" alt="${esc(L(b.name, lang))}" width="${cover.w}" height="${cover.h}" loading="lazy"></a>` : "";
    return `<article class="card">${thumb}<h3><a href="${pre(lang)}/b/${b.id}">${esc(L(b.name, lang))}</a>${b.verified ? ` <span class="badge">✓ ${s.verified}</span>` : ""}</h3>` +
      `<div class="meta">${cat ? esc(L(cat, lang)) : ""} · ${city ? esc(L(city, lang)) : ""}</div><p>${esc(L(b.desc, lang))}</p>` +
      (b.reviews ? `<div class="meta"><span class="stars">★ ${esc(b.rating)}</span> (${esc(b.reviews)} ${s.reviews})</div>` : "") +
      `<div class="actions"><a class="btn" href="tel:${esc(b.phone)}">${s.call}</a><a class="btn ghost" href="${pre(lang)}/b/${b.id}">${s.details}</a></div></article>`;
  }

  function crumbs(items) {
    return `<nav class="crumbs" aria-label="breadcrumb">${items.map((i, n) => (n < items.length - 1 ? `<a href="${i[1]}">${esc(i[0])}</a> › ` : `<span>${esc(i[0])}</span>`)).join("")}</nav>`;
  }
  const crumbLd = (items, base) => ({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((i, n) => ({ "@type": "ListItem", position: n + 1, name: i[0], item: base + i[1] }))
  });

  /** Build everything needed to render a page for a resolved route. */
  function build(route, base) {
    const { lang } = route, s = STR[lang], P = pre(lang);
    const homeHref = P || "/";
    const out = { status: 200, robots: "index,follow", lang, ldBlocks: [], body: "" };
    const canonicalCore = route.core;
    const url = (core) => abs(base, lang, core);
    out.canonical = url(canonicalCore);
    out.core = canonicalCore;

    switch (route.kind) {
      case "home": {
        const top = queries.approved({}).filter((b) => b.verified).slice(0, 6);
        out.title = s.home_title; out.description = s.home_desc;
        out.body = `<section class="hero"><h1>${s.hero_title}</h1><p>${esc(s.home_desc)}</p></section><div class="container">` +
          `<section class="block"><h2>${s.categories}</h2><div class="grid">${cats.map((c) =>
            `<a class="cat" href="${P}/category/${c.id}"><span class="ico">${c.icon}</span>${esc(L(c, lang))}</a>`).join("")}</div></section>` +
          (top.length ? `<section class="block"><h2>${s.featured}</h2><div class="grid">${top.map((b) => card(b, lang, s)).join("")}</div></section>` : "") + "</div>";
        out.ldBlocks.push({
          "@context": "https://schema.org", "@type": "WebSite", name: s.brand, url: url("/"), inLanguage: lang,
          potentialAction: { "@type": "SearchAction", target: `${base}${P}/browse?q={search_term_string}`, "query-input": "required name=search_term_string" }
        });
        break;
      }
      case "browse": {
        const list = queries.approved({});
        out.title = s.browse_title; out.description = s.browse_desc;
        out.body = `<div class="container"><section class="block"><h1>${s.browse_h1}</h1><div class="grid">${list.map((b) => card(b, lang, s)).join("")}</div></section></div>`;
        break;
      }
      case "category": {
        const cat = catById.get(route.cat), city = route.city && cityById.get(route.city);
        const list = queries.approved({ cat: route.cat, city: route.city });
        const catName = L(cat, lang), cityName = city ? L(city, lang) : "";
        const h1 = city ? (lang === "ar" ? `${catName} في ${cityName}` : `${catName} in ${cityName}, Qatar`) : (lang === "ar" ? `${catName} في قطر` : `${catName} in Qatar`);
        out.title = `${h1} | ${s.brand}`;
        out.description = clip(lang === "ar"
          ? `${h1}: ${list.length} نشاط مع أرقام التواصل والتقييمات. ${list.slice(0, 3).map((b) => L(b.name, lang)).join("، ")}.`
          : `${h1}: ${list.length} listings with contact details and reviews. ${list.slice(0, 3).map((b) => L(b.name, lang)).join(", ")}.`, 158);
        if (!list.length) out.robots = "noindex,follow";
        const items = [[s.brand, homeHref], [catName, `${P}/category/${route.cat}`]];
        if (city) items.push([cityName, `${P}/category/${route.cat}/${route.city}`]);
        out.body = `<div class="container">${crumbs(items)}<section class="block"><h1>${esc(h1)}</h1>` +
          (list.length ? `<div class="grid">${list.map((b) => card(b, lang, s)).join("")}</div>` : `<p class="empty">${s.none}</p>`) + "</section></div>";
        out.ldBlocks.push(crumbLd(items, base));
        if (list.length) out.ldBlocks.push({
          "@context": "https://schema.org", "@type": "ItemList", name: h1,
          itemListElement: list.slice(0, 50).map((b, n) => ({ "@type": "ListItem", position: n + 1, url: `${base}${P}/b/${b.id}`, name: L(b.name, lang) }))
        });
        break;
      }
      case "business": {
        const b = queries.one(route.id);
        if (!b) return build({ lang, kind: "notfound", core: route.core }, base);
        const cat = catById.get(b.cat), city = cityById.get(b.city);
        const name = L(b.name, lang), catName = cat ? L(cat, lang) : "", cityName = city ? L(city, lang) : "";
        out.title = `${name} – ${catName} ${s.in} ${cityName} | ${s.brand}`;
        out.description = clip(`${L(b.desc, lang)} ${L(b.area, lang)}. ${s.phone}: ${b.phone}`, 158);
        const reviews = queries.reviews(b.id);
        const items = [[s.brand, homeHref], [catName, `${P}/category/${b.cat}`], [name, `${P}/b/${b.id}`]];
        out.body = `<div class="container">${crumbs(items)}<div class="detail"><h1>${esc(name)}${b.verified ? ` <span class="badge">✓ ${s.verified}</span>` : ""}</h1>` +
          `<div class="meta">${esc(catName)} · ${esc(cityName)}</div>` +
          ((b.images || []).length ? `<div class="gallery">${b.images.map((i, n) => `<img class="gallery-img" src="/img/${i.id}" alt="${esc(name)}" width="${i.w}" height="${i.h}"${n ? ' loading="lazy"' : ""}>`).join("")}</div>` : "") +
          `<p>${esc(L(b.desc, lang))}</p><dl>` +
          `<dt>${s.area}</dt><dd>${esc(L(b.area, lang))}</dd>` + (L(b.hours, lang) ? `<dt>${s.hours}</dt><dd>${esc(L(b.hours, lang))}</dd>` : "") +
          `<dt>${s.phone}</dt><dd dir="ltr" class="ltr">${esc(b.phone)}</dd></dl>` +
          (b.reviews ? `<div class="meta"><span class="stars">★ ${esc(b.rating)}</span> (${esc(b.reviews)} ${s.reviews})</div>` : "") +
          `<div class="actions"><a class="btn" href="tel:${esc(b.phone)}">${s.call}</a></div></div>` +
          (reviews.length ? `<section class="block"><h2>${s.reviews_h}</h2>${reviews.map((r) =>
            `<article class="card review"><div><span class="stars">${"★".repeat(r.rating)}</span> <strong>${esc(r.name)}</strong></div>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}</article>`).join("")}</section>` : "") + "</div>";
        const biz = {
          "@context": "https://schema.org", "@type": SCHEMA_TYPE[b.cat] || "LocalBusiness", name, url: out.canonical,
          description: L(b.desc, lang), telephone: b.phone, inLanguage: lang,
          address: { "@type": "PostalAddress", addressLocality: cityName, streetAddress: L(b.area, lang), addressCountry: "QA" }
        };
        if ((b.images || []).length) { biz.image = b.images.map((i) => `${base}/img/${i.id}`); out.ogImage = biz.image[0]; }
        if (b.reviews > 0) biz.aggregateRating = { "@type": "AggregateRating", ratingValue: b.rating, reviewCount: b.reviews, bestRating: 5, worstRating: 1 };
        out.ldBlocks.push(biz, crumbLd(items, base));
        break;
      }
      case "legal": {
        const doc = renderLegal(route.page, lang, { operator: site.operator, contactEmail: site.contactEmail, homeHref });
        out.title = `${doc.title} | ${s.brand}`; out.description = doc.description; out.body = doc.body;
        out.ldBlocks.push(crumbLd([[s.brand, homeHref], [doc.title, P + route.core]], base));
        break;
      }
      case "private": {
        out.title = `${s.brand}`; out.description = s.home_desc; out.robots = "noindex,nofollow";
        out.noindexHeader = true;
        break;
      }
      default: {
        out.status = 404; out.robots = "noindex,follow"; out.title = s.not_found_title; out.description = s.not_found;
        out.canonical = null;
        out.body = `<div class="container"><p class="empty">${s.not_found}</p><p><a class="btn" href="${homeHref}">${s.back_home}</a></p></div>`;
      }
    }
    return out;
  }

  /** Fill the HTML shell (site/index.html with placeholders). */
  function renderShell(shell, page, base) {
    const lang = page.lang, s = STR[lang], other = lang === "ar" ? "en" : "ar";
    const alt = (l) => abs(base, l, page.core);
    const altHref = pre(other) + (page.core === "/" ? (other === "en" ? "" : "/") : page.core);
    const head = [
      `<title>${esc(page.title)}</title>`,
      `<meta name="description" content="${esc(page.description)}">`,
      `<meta name="robots" content="${page.robots}">`
    ];
    if (page.canonical) {
      head.push(`<link rel="canonical" href="${esc(page.canonical)}">`);
      if (page.status === 200 && page.robots.startsWith("index")) {
        head.push(`<link rel="alternate" hreflang="ar" href="${esc(alt("ar"))}">`, `<link rel="alternate" hreflang="en" href="${esc(alt("en"))}">`,
          `<link rel="alternate" hreflang="x-default" href="${esc(alt("ar"))}">`);
      }
      head.push(
        `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="${esc(s.brand)}">`,
        `<meta property="og:title" content="${esc(page.title)}">`, `<meta property="og:description" content="${esc(page.description)}">`,
        `<meta property="og:url" content="${esc(page.canonical)}">`, `<meta property="og:image" content="${esc(page.ogImage || base + "/og-image.png")}">`,
        `<meta property="og:locale" content="${s.locale}">`, `<meta property="og:locale:alternate" content="${s.other_locale}">`,
        `<meta name="twitter:card" content="summary_large_image">`);
    }
    for (const b of page.ldBlocks) head.push(ld(b));

    const map = {
      LANG: lang, DIR: lang === "ar" ? "rtl" : "ltr", BASE: pre(lang), HOME: pre(lang) || "/",
      ALTHREF: altHref, ALTLANG: other, LANGSWITCH: s.lang_switch,
      brand: s.brand, nav_home: s.nav_home, nav_browse: s.nav_browse, nav_add: s.nav_add, footer: s.footer, privacy: s.privacy, terms: s.terms
    };
    return shell
      .replace("<!--HEAD-->", () => head.join("\n  "))
      .replace("<!--BODY-->", () => page.body)
      .replace(/\{\{(\w+)\}\}/g, (_, k) => (k in map ? esc(map[k]) : ""));
  }

  // ---------- sitemap / robots ----------
  function sitemap(base) {
    const urls = []; // {core, lastmod}
    urls.push({ core: "/" }, { core: "/browse" }, { core: "/privacy" }, { core: "/terms" });
    const all = queries.approved({});
    const seenCat = new Set(), seenCombo = new Set();
    for (const b of all) { seenCat.add(b.cat); seenCombo.add(b.cat + "/" + b.city); }
    for (const c of cats) if (seenCat.has(c.id)) urls.push({ core: `/category/${c.id}` });
    for (const k of seenCombo) urls.push({ core: `/category/${k}` });
    for (const b of all) urls.push({ core: `/b/${b.id}`, lastmod: b.updated });
    const loc = (l, core) => abs(base, l, core);
    const xml = urls.flatMap((u) => ["ar", "en"].map((l) =>
      `<url><loc>${esc(loc(l, u.core))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}` +
      `<xhtml:link rel="alternate" hreflang="ar" href="${esc(loc("ar", u.core))}"/><xhtml:link rel="alternate" hreflang="en" href="${esc(loc("en", u.core))}"/>` +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(loc("ar", u.core))}"/></url>`)).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${xml}\n</urlset>\n`;
  }

  function robots(base) {
    // Private pages are kept out with noindex (it must be crawlable to be seen); only /api/ is blocked.
    return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;
  }

  return { resolve, build, renderShell, sitemap, robots, STR };
}

module.exports = { createSeo, esc };
