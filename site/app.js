(function () {
  "use strict";

  var STORE_KEY = "qd_submissions_v1";
  var LANG_KEY = "qd_lang";

  var T = {
    ar: {
      brand: "دليل قطر", nav_home: "الرئيسية", nav_browse: "تصفح الدليل", nav_add: "أضف نشاطك",
      footer: "بيانات الدليل الحالية تجريبية. © دليل قطر",
      hero_title: "كل ما تحتاجه في قطر، في مكان واحد",
      hero_sub: "ابحث عن المطاعم والعقارات والعيادات والخدمات واتصل بهم مباشرة.",
      search_ph: "ابحث عن نشاط أو خدمة…", all_cities: "كل المدن", all_cats: "كل التصنيفات", search: "بحث",
      categories: "التصنيفات", featured: "أنشطة موثّقة", city: "المدينة", category: "التصنيف", keyword: "كلمة البحث",
      verified_only: "الأنشطة الموثّقة فقط", sort: "الترتيب", sort_rating: "الأعلى تقييمًا", sort_name: "الاسم",
      results: "نتيجة", no_results: "لا توجد نتائج مطابقة.", call: "اتصال", whatsapp: "واتساب", details: "التفاصيل",
      verified: "موثّق", reviews: "تقييم", back: "رجوع", area: "المنطقة", hours: "ساعات العمل", phone: "الهاتف",
      not_found: "النشاط غير موجود.",
      add_title: "أضف نشاطك التجاري", add_sub: "سيظهر نشاطك بعد المراجعة. (في هذه النسخة التجريبية يُحفظ في متصفحك فقط).",
      f_name_ar: "اسم النشاط بالعربية", f_name_en: "اسم النشاط بالإنجليزية (اختياري)", f_desc: "وصف مختصر",
      f_phone: "رقم الهاتف (8 أرقام قطرية)", f_area: "المنطقة / العنوان", submit: "إرسال",
      phone_err: "أدخل رقمًا قطريًا صحيحًا من 8 أرقام (يبدأ بـ 3 أو 4 أو 5 أو 6 أو 7).",
      sent: "تم الإرسال! سيظهر نشاطك في «تصفح الدليل» كطلب قيد المراجعة.", pending: "قيد المراجعة"
    },
    en: {
      brand: "Qatar Guide", nav_home: "Home", nav_browse: "Browse", nav_add: "List your business",
      footer: "Listings shown are demo data. © Qatar Guide",
      hero_title: "Everything you need in Qatar, in one place",
      hero_sub: "Find restaurants, real estate, clinics and services, and contact them directly.",
      search_ph: "Search a business or service…", all_cities: "All cities", all_cats: "All categories", search: "Search",
      categories: "Categories", featured: "Verified businesses", city: "City", category: "Category", keyword: "Keyword",
      verified_only: "Verified only", sort: "Sort by", sort_rating: "Top rated", sort_name: "Name",
      results: "results", no_results: "No matching results.", call: "Call", whatsapp: "WhatsApp", details: "Details",
      verified: "Verified", reviews: "reviews", back: "Back", area: "Area", hours: "Hours", phone: "Phone",
      not_found: "Business not found.",
      add_title: "List your business", add_sub: "Your listing appears after review. (In this demo it is saved in your browser only.)",
      f_name_ar: "Business name (Arabic)", f_name_en: "Business name (English, optional)", f_desc: "Short description",
      f_phone: "Phone (8-digit Qatar number)", f_area: "Area / address", submit: "Submit",
      phone_err: "Enter a valid 8-digit Qatar number (starting with 3, 4, 5, 6 or 7).",
      sent: "Submitted! Your listing shows in Browse as pending review.", pending: "Pending review"
    }
  };

  var lang = "ar";
  try { lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "ar"; } catch (e) {}

  function t(k) { return T[lang][k] || k; }
  function L(o) { return o[lang] || o.ar; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadSubmissions() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
  }
  function saveSubmission(item) {
    try {
      var list = loadSubmissions(); list.push(item);
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {}
  }
  function allBusinesses() { return window.BUSINESSES.concat(loadSubmissions()); }

  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.title = t("brand") + (l === "ar" ? " | Qatar Business Guide" : " | دليل قطر");
    document.getElementById("langBtn").textContent = l === "ar" ? "EN" : "عربي";
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
  }

  function opts(list, allLabel, selected) {
    return '<option value="">' + esc(allLabel) + "</option>" + list.map(function (x) {
      return '<option value="' + esc(x.id) + '"' + (x.id === selected ? " selected" : "") + ">" + esc(L(x)) + "</option>";
    }).join("");
  }

  function telHref(p) { return "tel:" + String(p).replace(/[^+\d]/g, ""); }
  function waHref(n) { return "https://wa.me/" + String(n).replace(/\D/g, ""); }

  function card(b) {
    var cat = window.CATEGORIES.filter(function (c) { return c.id === b.cat; })[0];
    var city = window.CITIES.filter(function (c) { return c.id === b.city; })[0];
    return '<article class="card">' +
      "<h3>" + esc(L(b.name)) + (b.verified ? ' <span class="badge">✓ ' + t("verified") + "</span>" : "") +
      (b.pending ? ' <span class="badge" style="background:rgba(217,154,0,.15);color:#a87400">' + t("pending") + "</span>" : "") + "</h3>" +
      '<div class="meta">' + (cat ? cat.icon + " " + esc(L(cat)) : "") + " · " + (city ? esc(L(city)) : "") + "</div>" +
      "<p>" + esc(L(b.desc)) + "</p>" +
      (b.reviews ? '<div class="meta"><span class="stars">★ ' + esc(b.rating) + "</span> (" + esc(b.reviews) + " " + t("reviews") + ")</div>" : "") +
      '<div class="actions">' +
      '<a class="btn" href="' + telHref(b.phone) + '">📞 ' + t("call") + "</a>" +
      '<a class="btn wa" target="_blank" rel="noopener" href="' + waHref(b.whatsapp) + '">💬 ' + t("whatsapp") + "</a>" +
      '<a class="btn ghost" href="#/b/' + esc(b.id) + '">' + t("details") + "</a></div></article>";
  }

  function viewHome() {
    var verified = allBusinesses().filter(function (b) { return b.verified; }).slice(0, 6);
    return '<section class="hero"><h1>' + t("hero_title") + "</h1><p>" + t("hero_sub") + "</p>" +
      '<form class="search" id="homeSearch">' +
      '<input name="q" placeholder="' + esc(t("search_ph")) + '">' +
      '<select name="city">' + opts(window.CITIES, t("all_cities")) + "</select>" +
      '<button class="btn" type="submit">🔍 ' + t("search") + "</button></form></section>" +
      '<div class="container"><section class="block"><h2>' + t("categories") + '</h2><div class="grid">' +
      window.CATEGORIES.map(function (c) {
        return '<a class="cat" href="#/browse?cat=' + c.id + '"><span class="ico">' + c.icon + "</span>" + esc(L(c)) + "</a>";
      }).join("") + '</div></section><section class="block"><h2>' + t("featured") + '</h2><div class="grid">' +
      verified.map(card).join("") + "</div></section></div>";
  }

  function viewBrowse(params) {
    var q = (params.q || "").trim().toLowerCase();
    var list = allBusinesses().filter(function (b) {
      if (params.cat && b.cat !== params.cat) return false;
      if (params.city && b.city !== params.city) return false;
      if (params.verified === "1" && !b.verified) return false;
      if (q) {
        var hay = [b.name.ar, b.name.en, b.desc.ar, b.desc.en, b.area && b.area.ar, b.area && b.area.en].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    list.sort(params.sort === "name"
      ? function (a, b) { return L(a.name).localeCompare(L(b.name), lang); }
      : function (a, b) { return (b.rating || 0) - (a.rating || 0); });

    return '<div class="container"><div class="layout"><form class="filters" id="filters">' +
      "<label>" + t("keyword") + '<input type="text" name="q" value="' + esc(params.q || "") + '"></label>' +
      "<label>" + t("category") + '<select name="cat">' + opts(window.CATEGORIES, t("all_cats"), params.cat) + "</select></label>" +
      "<label>" + t("city") + '<select name="city">' + opts(window.CITIES, t("all_cities"), params.city) + "</select></label>" +
      "<label>" + t("sort") + '<select name="sort"><option value="rating">' + t("sort_rating") + '</option><option value="name"' +
      (params.sort === "name" ? " selected" : "") + ">" + t("sort_name") + "</option></select></label>" +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="verified" value="1"' +
      (params.verified === "1" ? " checked" : "") + "> " + t("verified_only") + "</label>" +
      '<button class="btn" type="submit">' + t("search") + "</button></form>" +
      "<div><p class=\"meta\">" + list.length + " " + t("results") + "</p>" +
      (list.length ? '<div class="grid">' + list.map(card).join("") + "</div>" : '<p class="empty">' + t("no_results") + "</p>") +
      "</div></div></div>";
  }

  function viewDetail(id) {
    var b = allBusinesses().filter(function (x) { return String(x.id) === String(id); })[0];
    if (!b) return '<div class="container"><p class="empty">' + t("not_found") + '</p><a class="btn ghost" href="#/browse">' + t("back") + "</a></div>";
    var cat = window.CATEGORIES.filter(function (c) { return c.id === b.cat; })[0];
    var city = window.CITIES.filter(function (c) { return c.id === b.city; })[0];
    return '<div class="container"><div class="detail"><div><a class="btn ghost" href="#/browse">← ' + t("back") + "</a></div>" +
      "<h1>" + esc(L(b.name)) + (b.verified ? ' <span class="badge">✓ ' + t("verified") + "</span>" : "") + "</h1>" +
      '<div class="meta">' + (cat ? cat.icon + " " + esc(L(cat)) : "") + " · " + (city ? esc(L(city)) : "") + "</div>" +
      "<p>" + esc(L(b.desc)) + "</p><dl>" +
      "<dt>" + t("area") + "</dt><dd>" + esc(b.area ? L(b.area) : "") + "</dd>" +
      (b.hours ? "<dt>" + t("hours") + "</dt><dd>" + esc(L(b.hours)) + "</dd>" : "") +
      "<dt>" + t("phone") + '</dt><dd dir="ltr" style="text-align:start">' + esc(b.phone) + "</dd></dl>" +
      '<div class="actions"><a class="btn" href="' + telHref(b.phone) + '">📞 ' + t("call") + "</a>" +
      '<a class="btn wa" target="_blank" rel="noopener" href="' + waHref(b.whatsapp) + '">💬 ' + t("whatsapp") + "</a></div></div></div>";
  }

  function viewAdd() {
    return '<div class="container"><form class="form" id="addForm" novalidate><h2>' + t("add_title") + '</h2><p class="meta">' + t("add_sub") + "</p>" +
      "<label>" + t("f_name_ar") + '<input name="name_ar" required maxlength="80"></label>' +
      "<label>" + t("f_name_en") + '<input name="name_en" maxlength="80"></label>' +
      "<label>" + t("category") + '<select name="cat" required>' + opts(window.CATEGORIES, "—") + "</select></label>" +
      "<label>" + t("city") + '<select name="city" required>' + opts(window.CITIES, "—") + "</select></label>" +
      "<label>" + t("f_area") + '<input name="area" maxlength="80"></label>' +
      "<label>" + t("f_phone") + '<input name="phone" inputmode="numeric" maxlength="8" dir="ltr" required></label>' +
      "<label>" + t("f_desc") + '<textarea name="desc" rows="3" maxlength="300"></textarea></label>' +
      '<div id="formMsg" role="status"></div><button class="btn" type="submit">' + t("submit") + "</button></form></div>";
  }

  function parseHash() {
    var h = location.hash.replace(/^#/, "") || "/";
    var parts = h.split("?");
    var params = {};
    new URLSearchParams(parts[1] || "").forEach(function (v, k) { params[k] = v; });
    return { path: parts[0], params: params };
  }

  function toQuery(form) {
    var p = new URLSearchParams();
    new FormData(form).forEach(function (v, k) { if (String(v).trim() !== "") p.set(k, v); });
    return p.toString();
  }

  function render() {
    var app = document.getElementById("app");
    var r = parseHash();
    var html;
    if (r.path === "/browse") html = viewBrowse(r.params);
    else if (r.path.indexOf("/b/") === 0) html = viewDetail(decodeURIComponent(r.path.slice(3)));
    else if (r.path === "/add") html = viewAdd();
    else html = viewHome();
    app.innerHTML = html;
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + r.path);
    });
    bind();
    window.scrollTo(0, 0);
  }

  function bind() {
    var hs = document.getElementById("homeSearch");
    if (hs) hs.addEventListener("submit", function (e) { e.preventDefault(); location.hash = "#/browse?" + toQuery(hs); });
    var f = document.getElementById("filters");
    if (f) f.addEventListener("submit", function (e) { e.preventDefault(); location.hash = "#/browse?" + toQuery(f); });
    var af = document.getElementById("addForm");
    if (af) af.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(af);
      var msg = document.getElementById("formMsg");
      var phone = String(d.get("phone")).replace(/\s/g, "");
      if (!/^[34567]\d{7}$/.test(phone) || !String(d.get("name_ar")).trim() || !d.get("cat") || !d.get("city")) {
        msg.className = ""; msg.style.color = "#c0392b"; msg.textContent = t("phone_err"); return;
      }
      var nameAr = String(d.get("name_ar")).trim();
      var nameEn = String(d.get("name_en")).trim() || nameAr;
      var desc = String(d.get("desc")).trim();
      var area = String(d.get("area")).trim();
      saveSubmission({
        id: "u" + Date.now(), cat: d.get("cat"), city: d.get("city"), pending: true, verified: false,
        name: { ar: nameAr, en: nameEn }, desc: { ar: desc, en: desc }, area: { ar: area, en: area },
        phone: "+974" + phone, whatsapp: "974" + phone, rating: 0, reviews: 0
      });
      af.reset(); msg.style.color = ""; msg.className = "notice"; msg.textContent = t("sent");
    });
  }

  document.getElementById("langBtn").addEventListener("click", function () {
    setLang(lang === "ar" ? "en" : "ar"); render();
  });
  window.addEventListener("hashchange", render);
  setLang(lang);
  render();
})();
