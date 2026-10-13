(function () {
  "use strict";


  var T = {
    ar: {
      forgot_link: "نسيت كلمة المرور؟", forgot_title: "استعادة كلمة المرور", forgot_sub: "أدخل بريدك وسنرسل لك رابطًا لاختيار كلمة مرور جديدة.",
      forgot_send: "إرسال الرابط", forgot_done: "إن كان هذا البريد مسجّلًا لدينا فقد أرسلنا إليه رابط الاستعادة (صالح ساعة واحدة). تحقق من صندوق الوارد والبريد المزعج.",
      forgot_off: "استعادة كلمة المرور غير مفعّلة حاليًا. تواصل معنا عبر بريد الموقع.", reset_title: "اختر كلمة مرور جديدة", reset_new: "كلمة المرور الجديدة (8 أحرف على الأقل)",
      reset_confirm: "أعد كتابة كلمة المرور", reset_save: "حفظ كلمة المرور", reset_done: "تم تغيير كلمة المرور. يمكنك الآن تسجيل الدخول.", reset_mismatch: "كلمتا المرور غير متطابقتين.",
      e_invalid_token: "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.", e_email_disabled: "استعادة كلمة المرور غير مفعّلة حاليًا.", e_admin_use_env: "كلمة مرور الأدمن تُغيَّر من إعدادات الخادم.",
      chpw_title: "تغيير كلمة المرور", chpw_current: "كلمة المرور الحالية", chpw_new: "كلمة المرور الجديدة (8 أحرف على الأقل)", chpw_save: "تغيير", chpw_done: "تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى.",
      privacy: "سياسة الخصوصية", terms: "شروط الاستخدام", agree_pre: "أوافق على", agree_and: "و",
      e_terms_required: "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.", e_admin_cannot_delete: "لا يمكن حذف حساب الأدمن من هنا.",
      acct_title: "حسابي", acct_export: "تنزيل بياناتي (JSON)", acct_delete: "حذف حسابي نهائيًا", acct_pw: "كلمة المرور للتأكيد",
      acct_warn: "يحذف حسابك وتقييماتك وكل الأنشطة التي أضفتها، ولا يمكن التراجع.", acct_confirm: "هل أنت متأكد من حذف حسابك نهائيًا؟",
      home_title: "دليل قطر | دليل الأعمال والخدمات في قطر",
      home_desc: "ابحث عن مطاعم وعقارات وعيادات وخدمات في قطر، واتصل بالأنشطة مباشرة واطلع على تقييمات حقيقية من المستخدمين.",
      browse_h1: "كل الأنشطة والخدمات في قطر", browse_desc: "قائمة كاملة بالأنشطة التجارية والخدمات في قطر مع أرقام التواصل والتقييمات.",
      brand: "دليل قطر", nav_home: "الرئيسية", nav_browse: "تصفح الدليل", nav_add: "أضف نشاطك",
      footer: "دليل الأعمال والخدمات في قطر. © دليل قطر",
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
      sent: "تم الإرسال! نشاطك قيد المراجعة وسيظهر في الدليل بعد الموافقة.", pending: "قيد المراجعة",
      rejected: "مرفوض", login: "تسجيل الدخول", register: "إنشاء حساب", logout: "خروج", email: "البريد الإلكتروني",
      password: "كلمة المرور (8 أحرف على الأقل)", your_name: "الاسم", need_login: "سجّل الدخول أولًا لإضافة نشاطك.",
      my_listings: "أنشطتي", admin: "لوحة الإدارة", approve: "قبول", reject: "رفض", verify: "توثيق", unverify: "إلغاء التوثيق",
      no_pending: "لا توجد طلبات.", hello: "مرحبًا", have_account: "لديك حساب؟", no_account: "ليس لديك حساب؟", load_err: "تعذّر تحميل البيانات.",
      status_pending: "قيد المراجعة", status_approved: "مقبول", status_rejected: "مرفوض",
      e_invalid_email: "البريد الإلكتروني غير صحيح.", e_invalid_name: "الاسم مطلوب.", e_weak_password: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      e_email_taken: "هذا البريد مسجّل مسبقًا.", e_bad_credentials: "البريد أو كلمة المرور غير صحيحة.", e_rate_limited: "محاولات كثيرة، حاول لاحقًا.",
      e_invalid_category: "اختر التصنيف.", e_invalid_city: "اختر المدينة.", e_invalid_phone: "أدخل رقمًا قطريًا صحيحًا من 8 أرقام.",
      e_auth_required: "يلزم تسجيل الدخول.",
      rev_title: "التقييمات", rev_write: "قيّم هذا النشاط", rev_rating: "تقييمك", rev_comment: "تعليقك (اختياري)", rev_post: "نشر التقييم",
      rev_delete: "حذف", rev_none: "لا توجد تقييمات بعد. كن أول من يقيّم!", rev_login: "سجّل الدخول لتضيف تقييمك.", rev_saved: "تم حفظ تقييمك.",
      rev_mine: "تقييمك", rev_update_hint: "لديك تقييم سابق، إرسال جديد سيحدّثه.",
      e_invalid_rating: "اختر تقييمًا من 1 إلى 5.", e_own_business: "لا يمكنك تقييم نشاطك الخاص.", e_forbidden: "غير مسموح.", e_generic: "حدث خطأ، حاول مرة أخرى."
    },
    en: {
      forgot_link: "Forgot your password?", forgot_title: "Reset your password", forgot_sub: "Enter your e-mail and we will send you a link to choose a new password.",
      forgot_send: "Send link", forgot_done: "If this e-mail is registered with us, a reset link was sent (valid for one hour). Check your inbox and spam folder.",
      forgot_off: "Password reset is not enabled right now. Please contact us at the site's e-mail.", reset_title: "Choose a new password", reset_new: "New password (min 8 characters)",
      reset_confirm: "Repeat the password", reset_save: "Save password", reset_done: "Your password was changed. You can log in now.", reset_mismatch: "The passwords do not match.",
      e_invalid_token: "This link is invalid or has expired. Request a new one.", e_email_disabled: "Password reset is not enabled right now.", e_admin_use_env: "The admin password is changed in the server settings.",
      chpw_title: "Change password", chpw_current: "Current password", chpw_new: "New password (min 8 characters)", chpw_save: "Change", chpw_done: "Password changed. Other devices were signed out.",
      privacy: "Privacy Policy", terms: "Terms of Use", agree_pre: "I agree to the", agree_and: "and the",
      e_terms_required: "You must accept the Terms of Use and Privacy Policy.", e_admin_cannot_delete: "Admin accounts cannot be deleted here.",
      acct_title: "My account", acct_export: "Download my data (JSON)", acct_delete: "Delete my account permanently", acct_pw: "Password to confirm",
      acct_warn: "Deletes your account, your reviews and every listing you submitted. This cannot be undone.", acct_confirm: "Are you sure you want to permanently delete your account?",
      home_title: "Qatar Guide | Business & Services Directory in Qatar",
      home_desc: "Find restaurants, real estate, clinics and services in Qatar, contact businesses directly and read genuine user reviews.",
      browse_h1: "All businesses & services in Qatar", browse_desc: "A complete list of businesses and services in Qatar with contact details and reviews.",
      brand: "Qatar Guide", nav_home: "Home", nav_browse: "Browse", nav_add: "List your business",
      footer: "Business & services directory in Qatar. © Qatar Guide",
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
      sent: "Submitted! Your listing is pending review and will appear once approved.", pending: "Pending review",
      rejected: "Rejected", login: "Log in", register: "Sign up", logout: "Log out", email: "Email",
      password: "Password (min 8 characters)", your_name: "Name", need_login: "Log in first to list your business.",
      my_listings: "My listings", admin: "Admin", approve: "Approve", reject: "Reject", verify: "Verify", unverify: "Unverify",
      no_pending: "Nothing here.", hello: "Hello", have_account: "Have an account?", no_account: "No account yet?", load_err: "Could not load data.",
      status_pending: "Pending", status_approved: "Approved", status_rejected: "Rejected",
      e_invalid_email: "Invalid email.", e_invalid_name: "Name is required.", e_weak_password: "Password must be at least 8 characters.",
      e_email_taken: "This email is already registered.", e_bad_credentials: "Wrong email or password.", e_rate_limited: "Too many attempts, try later.",
      e_invalid_category: "Choose a category.", e_invalid_city: "Choose a city.", e_invalid_phone: "Enter a valid 8-digit Qatar number.",
      e_auth_required: "Please log in.",
      rev_title: "Reviews", rev_write: "Rate this business", rev_rating: "Your rating", rev_comment: "Your comment (optional)", rev_post: "Post review",
      rev_delete: "Delete", rev_none: "No reviews yet. Be the first!", rev_login: "Log in to leave a review.", rev_saved: "Your review was saved.",
      rev_mine: "Your review", rev_update_hint: "You already reviewed this; submitting again updates it.",
      e_invalid_rating: "Pick a rating from 1 to 5.", e_own_business: "You cannot review your own business.", e_forbidden: "Not allowed.", e_generic: "Something went wrong, try again."
    }
  };

  var lang = "ar";
  function langFromPath() { return location.pathname === "/en" || location.pathname.indexOf("/en/") === 0 ? "en" : "ar"; }
  function base() { return lang === "en" ? "/en" : ""; }
  function link(path) { return path === "/" ? (base() || "/") : base() + path; }

  function t(k) { return T[lang][k] || k; }
  function L(o) { return o[lang] || o.ar; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var state = { user: null, businesses: [], features: { passwordReset: false }, resetToken: "" };

  function api(method, url, body) {
    return fetch(url, {
      method: method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "generic"); e.code = j.error || "generic"; throw e; }
        return j;
      });
    });
  }
  function errMsg(e) { var k = "e_" + (e && e.code); return T[lang][k] ? t(k) : t("e_generic"); }
  function allBusinesses() { return state.businesses; }

  function setLang(l) {
    lang = l;
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-path]").forEach(function (el) { el.setAttribute("href", link(el.getAttribute("data-path"))); });
  }

  // update <title>, description, robots and canonical on client-side navigation
  function setHead(title, desc, robots) {
    document.title = title;
    function meta(name, val) {
      var el = document.querySelector('meta[name="' + name + '"]');
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", val);
    }
    meta("description", desc); meta("robots", robots || "index,follow");
    var c = document.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement("link"); c.setAttribute("rel", "canonical"); document.head.appendChild(c); }
    c.setAttribute("href", location.origin + location.pathname);
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (n) { n.remove(); });
  }

  function navigate(url) { history.pushState(null, "", url); render(); }

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
      (b.status === "pending" ? ' <span class="badge warn">' + t("pending") + "</span>" : b.status === "rejected" ? ' <span class="badge bad">' + t("rejected") + "</span>" : "") + "</h3>" +
      '<div class="meta">' + (cat ? cat.icon + " " + esc(L(cat)) : "") + " · " + (city ? esc(L(city)) : "") + "</div>" +
      "<p>" + esc(L(b.desc)) + "</p>" +
      (b.reviews ? '<div class="meta"><span class="stars">★ ' + esc(b.rating) + "</span> (" + esc(b.reviews) + " " + t("reviews") + ")</div>" : "") +
      '<div class="actions">' +
      '<a class="btn" href="' + telHref(b.phone) + '">📞 ' + t("call") + "</a>" +
      '<a class="btn wa" target="_blank" rel="noopener" href="' + waHref(b.whatsapp) + '">💬 ' + t("whatsapp") + "</a>" +
      '<a class="btn ghost" href="' + link("/b/" + b.id) + '">' + t("details") + "</a></div></article>";
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
        return '<a class="cat" href="' + link("/category/" + c.id) + '"><span class="ico">' + c.icon + "</span>" + esc(L(c)) + "</a>";
      }).join("") + '</div></section><section class="block"><h2>' + t("featured") + '</h2><div class="grid">' +
      verified.map(card).join("") + "</div></section></div>";
  }

  function viewBrowse(params, heading) {
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
      '<label class="check"><input type="checkbox" name="verified" value="1"' +
      (params.verified === "1" ? " checked" : "") + "> " + t("verified_only") + "</label>" +
      '<button class="btn" type="submit">' + t("search") + "</button></form>" +
      "<div>" + (heading || "") + "<p class=\"meta\">" + list.length + " " + t("results") + "</p>" +
      (list.length ? '<div class="grid">' + list.map(card).join("") + "</div>" : '<p class="empty">' + t("no_results") + "</p>") +
      "</div></div></div>";
  }

  function viewDetail(id, reviews) {
    var b = allBusinesses().filter(function (x) { return String(x.id) === String(id); })[0];
    if (!b) return '<div class="container"><p class="empty">' + t("not_found") + '</p><a class="btn ghost" href="' + link("/browse") + '">' + t("back") + "</a></div>";
    var cat = window.CATEGORIES.filter(function (c) { return c.id === b.cat; })[0];
    var city = window.CITIES.filter(function (c) { return c.id === b.city; })[0];
    return '<div class="container">' + crumbs([[t("brand"), link("/")], [cat ? L(cat) : "", cat ? link("/category/" + b.cat) : link("/browse")], [L(b.name), link("/b/" + b.id)]]) + '<div class="detail"><div><a class="btn ghost" href="' + link("/browse") + '">← ' + t("back") + "</a></div>" +
      "<h1>" + esc(L(b.name)) + (b.verified ? ' <span class="badge">✓ ' + t("verified") + "</span>" : "") + "</h1>" +
      '<div class="meta">' + (cat ? cat.icon + " " + esc(L(cat)) : "") + " · " + (city ? esc(L(city)) : "") + "</div>" +
      "<p>" + esc(L(b.desc)) + "</p><dl>" +
      "<dt>" + t("area") + "</dt><dd>" + esc(b.area ? L(b.area) : "") + "</dd>" +
      (b.hours ? "<dt>" + t("hours") + "</dt><dd>" + esc(L(b.hours)) + "</dd>" : "") +
      "<dt>" + t("phone") + '</dt><dd dir="ltr" class="ltr">' + esc(b.phone) + "</dd></dl>" +
      (b.reviews ? '<div class="meta"><span class="stars">★ ' + esc(b.rating) + "</span> (" + esc(b.reviews) + " " + t("reviews") + ")</div>" : "") +
      '<div class="actions"><a class="btn" href="' + telHref(b.phone) + '">📞 ' + t("call") + "</a>" +
      '<a class="btn wa" target="_blank" rel="noopener" href="' + waHref(b.whatsapp) + '">💬 ' + t("whatsapp") + "</a></div></div>" +
      viewReviews(b, reviews || []) + "</div>";
  }

  function viewAdd() {
    if (!state.user) return '<div class="container"><div class="form"><p>' + t("need_login") + '</p><a class="btn" href="' + link("/login") + '">' + t("login") + "</a></div></div>";
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

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="breadcrumb">' + items.map(function (i, n) {
      return n < items.length - 1 ? '<a href="' + esc(i[1]) + '">' + esc(i[0]) + "</a> › " : "<span>" + esc(i[0]) + "</span>";
    }).join("") + "</nav>";
  }
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function catH1(cat, city) {
    var c = L(cat), k = city ? L(city) : "";
    return city ? (lang === "ar" ? c + " في " + k : c + " in " + k + ", Qatar") : (lang === "ar" ? c + " في قطر" : c + " in Qatar");
  }

  function stars(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }

  function viewReviews(b, reviews) {
    var mine = reviews.filter(function (r) { return r.mine; })[0];
    var form;
    if (!state.user) form = '<p class="meta">' + t("rev_login") + ' <a class="link" href="' + link("/login") + '">' + t("login") + "</a></p>";
    else form = '<form class="form" id="reviewForm" data-biz="' + esc(b.id) + '" novalidate><h3>' + t("rev_write") + "</h3>" +
      (mine ? '<p class="meta">' + t("rev_update_hint") + "</p>" : "") +
      "<label>" + t("rev_rating") + '<select name="rating">' + [5, 4, 3, 2, 1].map(function (n) {
        return '<option value="' + n + '"' + (mine && mine.rating === n ? " selected" : "") + ">" + stars(n) + " (" + n + ")</option>";
      }).join("") + "</select></label>" +
      "<label>" + t("rev_comment") + '<textarea name="comment" rows="3" maxlength="500">' + esc(mine ? mine.comment : "") + "</textarea></label>" +
      '<div id="formMsg" role="status"></div><button class="btn" type="submit">' + t("rev_post") + "</button></form>";
    return '<section class="block"><h2>' + t("rev_title") + "</h2>" + form +
      (reviews.length ? reviews.map(function (r) {
        return '<article class="card review"><div><span class="stars">' + stars(r.rating) + "</span> <strong>" + esc(r.name) + "</strong>" +
          (r.mine ? ' <span class="badge">' + t("rev_mine") + "</span>" : "") + ' <span class="meta">' + esc(String(r.created_at).slice(0, 10)) + "</span></div>" +
          (r.comment ? "<p>" + esc(r.comment) + "</p>" : "") +
          (r.mine || (state.user && state.user.role === "admin") ? '<div class="actions"><button class="btn ghost" data-delrev="' + esc(r.id) + '">' + t("rev_delete") + "</button></div>" : "") +
          "</article>";
      }).join("") : '<p class="empty">' + t("rev_none") + "</p>") + "</section>";
  }

  function viewAuth(mode) {
    var reg = mode === "register";
    return '<div class="container"><form class="form narrow" id="authForm" data-mode="' + mode + '" novalidate><h2>' + t(reg ? "register" : "login") + "</h2>" +
      (reg ? "<label>" + t("your_name") + '<input name="name" maxlength="60" autocomplete="name" required></label>' : "") +
      "<label>" + t("email") + '<input name="email" type="email" dir="ltr" autocomplete="email" required></label>' +
      "<label>" + t("password") + '<input name="password" type="password" dir="ltr" minlength="8" autocomplete="' + (reg ? "new-password" : "current-password") + '" required></label>' +
      (reg ? '<label class="check-line"><input type="checkbox" name="accept" required> <span>' + t("agree_pre") + ' <a class="link" data-native target="_blank" rel="noopener" href="' + link("/terms") + '">' + t("terms") + "</a> " + t("agree_and") + ' <a class="link" data-native target="_blank" rel="noopener" href="' + link("/privacy") + '">' + t("privacy") + "</a></span></label>" : "") +
      '<div id="formMsg" role="status"></div><button class="btn" type="submit">' + t(reg ? "register" : "login") + "</button>" +
      (!reg && state.features.passwordReset ? '<p class="meta"><a class="link" href="' + link("/forgot") + '">' + t("forgot_link") + "</a></p>" : "") +
      '<p class="meta">' + t(reg ? "have_account" : "no_account") + ' <a class="link" href="' + link(reg ? "/login" : "/register") + '">' + t(reg ? "login" : "register") + "</a></p></form></div>";
  }

  function viewForgot() {
    if (!state.features.passwordReset) return '<div class="container"><div class="form narrow"><p>' + t("forgot_off") + "</p></div></div>";
    return '<div class="container"><form class="form narrow" id="forgotForm" novalidate><h2>' + t("forgot_title") + '</h2><p class="meta">' + t("forgot_sub") + "</p>" +
      "<label>" + t("email") + '<input name="email" type="email" dir="ltr" autocomplete="email" required></label>' +
      '<div id="formMsg" role="status"></div><button class="btn" type="submit">' + t("forgot_send") + "</button>" +
      '<p class="meta"><a class="link" href="' + link("/login") + '">' + t("login") + "</a></p></form></div>";
  }

  function viewReset() {
    if (!state.resetToken) return '<div class="container"><div class="form narrow"><p class="error">' + t("e_invalid_token") + '</p><a class="btn" href="' + link("/forgot") + '">' + t("forgot_link") + "</a></div></div>";
    return '<div class="container"><form class="form narrow" id="resetForm" novalidate><h2>' + t("reset_title") + "</h2>" +
      "<label>" + t("reset_new") + '<input name="password" type="password" dir="ltr" minlength="8" autocomplete="new-password" required></label>' +
      "<label>" + t("reset_confirm") + '<input name="again" type="password" dir="ltr" minlength="8" autocomplete="new-password" required></label>' +
      '<div id="formMsg" role="status"></div><button class="btn" type="submit">' + t("reset_save") + "</button></form></div>";
  }

  function viewMine(list) {
    return '<div class="container"><section class="block"><h2>' + t("my_listings") + "</h2>" +
      (list.length ? '<div class="grid">' + list.map(card).join("") + "</div>" : '<p class="empty">' + t("no_pending") + '</p>') +
      '<p><a class="btn" href="' + link("/add") + '">+ ' + t("nav_add") + "</a></p></section>" +
      '<section class="block"><h2>' + t("acct_title") + "</h2>" +
      '<p><a class="btn ghost" href="/api/me/export" download="my-data.json">' + t("acct_export") + "</a></p>" +
      (state.user && state.user.role !== "admin" ? '<form class="form" id="chpwForm" novalidate><h3>' + t("chpw_title") + "</h3>" +
        "<label>" + t("chpw_current") + '<input name="current" type="password" dir="ltr" autocomplete="current-password" required></label>' +
        "<label>" + t("chpw_new") + '<input name="next" type="password" dir="ltr" minlength="8" autocomplete="new-password" required></label>' +
        '<div id="chpwMsg" role="status"></div><button class="btn" type="submit">' + t("chpw_save") + "</button></form>" : "") +
      (state.user && state.user.role !== "admin" ? '<form class="form danger" id="deleteForm" novalidate><p>' + t("acct_warn") + "</p>" +
        "<label>" + t("acct_pw") + '<input name="password" type="password" dir="ltr" autocomplete="current-password" required></label>' +
        '<div id="formMsg" role="status"></div><button class="btn danger-btn" type="submit">' + t("acct_delete") + "</button></form>" : "") +
      "</section></div>";
  }

  function viewAdmin(list, status) {
    var tabs = ["pending", "approved", "rejected"].map(function (st) {
      return '<a class="btn' + (st === status ? "" : " ghost") + '" href="' + link("/admin") + '?status=' + st + '">' + t("status_" + st) + "</a>";
    }).join(" ");
    var rows = list.map(function (b) {
      return '<div class="card"><h3>' + esc(L(b.name)) + "</h3><div class=\"meta\">" + esc(b.phone) + " · " + esc(b.cat) + " · " + esc(b.city) + "</div><p>" + esc(L(b.desc)) + '</p><div class="actions">' +
        (b.status !== "approved" ? '<button class="btn" data-act="approve" data-id="' + b.id + '">' + t("approve") + "</button>" : "") +
        (b.status !== "rejected" ? '<button class="btn ghost" data-act="reject" data-id="' + b.id + '">' + t("reject") + "</button>" : "") +
        (b.status === "approved" ? '<button class="btn ghost" data-act="' + (b.verified ? "unverify" : "verify") + '" data-id="' + b.id + '">' + t(b.verified ? "unverify" : "verify") + "</button>" : "") +
        "</div></div>";
    }).join("");
    return '<div class="container"><section class="block"><h2>' + t("admin") + '</h2><div class="actions">' + tabs + "</div><br>" +
      (list.length ? '<div class="grid">' + rows + "</div>" : '<p class="empty">' + t("no_pending") + "</p>") + "</section></div>";
  }

  function parseLocation() {
    var path = location.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    if (path.length > 1) path = path.replace(/\/+$/, "");
    var params = {};
    new URLSearchParams(location.search).forEach(function (v, k) { params[k] = v; });
    return { path: path, params: params };
  }

  function toQuery(form) {
    var p = new URLSearchParams();
    new FormData(form).forEach(function (v, k) { if (String(v).trim() !== "") p.set(k, v); });
    return p.toString();
  }

  function renderUserNav() {
    var el = document.getElementById("userNav");
    if (!state.user) { el.innerHTML = '<a href="' + link("/login") + '">' + t("login") + "</a>"; return; }
    el.innerHTML = '<a href="' + link("/mine") + '">' + esc(state.user.name) + "</a>" +
      (state.user.role === "admin" ? ' <a href="' + link("/admin") + '">' + t("admin") + "</a>" : "") +
      ' <button id="logoutBtn" class="lang-btn" type="button">' + t("logout") + "</button>";
    document.getElementById("logoutBtn").addEventListener("click", function () {
      api("POST", "/api/logout", {}).then(function () { state.user = null; navigate(link("/")); });
    });
  }

  var renderSeq = 0, legalShown = false;
  function render() {
    var seq = ++renderSeq;
    var app = document.getElementById("app");
    setLang(langFromPath());
    var r = parseLocation();
    renderUserNav();

    var altPath = (lang === "ar" ? "/en" : "") + r.path + (r.path === "/reset" ? "" : location.search); // never copy the reset token into a link
    if (r.path === "/privacy" || r.path === "/terms") {
      if (legalShown) { location.reload(); return; }
      legalShown = true; // first load: the server already rendered this page; just wire up the header
      var lb0 = document.getElementById("langBtn"); lb0.setAttribute("href", altPath); lb0.textContent = lang === "ar" ? "EN" : "عربي";
      return;
    }
    var lb = document.getElementById("langBtn");
    lb.setAttribute("href", altPath === "/en/" + location.search ? "/en" + location.search : altPath);
    lb.textContent = lang === "ar" ? "EN" : "عربي";

    var catM = r.path.match(/^\/category\/([a-z]+)(?:\/([a-z]+))?$/);
    var jobs = [api("GET", "/api/businesses").then(function (j) { state.businesses = j.businesses; })];
    var extra = null;
    if (r.path.indexOf("/b/") === 0) extra = api("GET", "/api/businesses/" + encodeURIComponent(r.path.slice(3)) + "/reviews").catch(function () { return { reviews: [] }; });
    if (r.path === "/mine" && state.user) extra = api("GET", "/api/my/businesses");
    if (r.path === "/admin" && state.user && state.user.role === "admin") extra = api("GET", "/api/admin/businesses?status=" + encodeURIComponent(r.params.status || "pending"));

    Promise.all([Promise.all(jobs), extra]).then(function (res) {
      if (seq !== renderSeq) return;
      var data = res[1];
      var html, head = [t("home_title"), t("home_desc"), "index,follow"];
      var cat = catM && find(window.CATEGORIES, catM[1]), city = catM && catM[2] && find(window.CITIES, catM[2]);
      if (r.path === "/browse") {
        html = viewBrowse(r.params);
        head = [t("browse_h1") + " | " + t("brand"), t("browse_desc"), Object.keys(r.params).length ? "noindex,follow" : "index,follow"];
      } else if (catM && cat) {
        var h1 = catH1(cat, city);
        var items = [[t("brand"), link("/")], [L(cat), link("/category/" + cat.id)]];
        if (city) items.push([L(city), link("/category/" + cat.id + "/" + city.id)]);
        var p2 = Object.assign({}, r.params, { cat: cat.id, city: city ? city.id : r.params.city });
        html = viewBrowse(p2, crumbs(items) + "<h1>" + esc(h1) + "</h1>");
        head = [h1 + " | " + t("brand"), h1, "index,follow"];
      } else if (r.path.indexOf("/b/") === 0) {
        html = viewDetail(decodeURIComponent(r.path.slice(3)), data && data.reviews);
        var bz = find(allBusinesses(), Number(r.path.slice(3)));
        if (bz) { var bc = find(window.CATEGORIES, bz.cat), bcity = find(window.CITIES, bz.city);
          head = [L(bz.name) + " – " + (bc ? L(bc) : "") + " " + (lang === "ar" ? "في" : "in") + " " + (bcity ? L(bcity) : "") + " | " + t("brand"), L(bz.desc), "index,follow"]; }
        else head = [t("not_found"), t("not_found"), "noindex,follow"];
      } else if (r.path === "/forgot") { html = viewForgot(); head = [t("brand"), t("home_desc"), "noindex,nofollow"]; }
      else if (r.path === "/reset") {
        // keep the token in memory only and remove it from the address bar / history
        if (r.params.token) { state.resetToken = r.params.token; history.replaceState(null, "", location.pathname); }
        html = viewReset(); head = [t("brand"), t("home_desc"), "noindex,nofollow"];
      } else if (r.path === "/add") { html = viewAdd(); head = [t("brand"), t("home_desc"), "noindex,nofollow"]; }
      else if (r.path === "/login") { html = viewAuth("login"); head = [t("brand"), t("home_desc"), "noindex,nofollow"]; }
      else if (r.path === "/register") { html = viewAuth("register"); head = [t("brand"), t("home_desc"), "noindex,nofollow"]; }
      else if (r.path === "/mine") { html = state.user ? viewMine(data.businesses) : viewAuth("login"); head = [t("brand"), t("home_desc"), "noindex,nofollow"]; }
      else if (r.path === "/admin") { html = state.user && state.user.role === "admin" ? viewAdmin(data.businesses, r.params.status || "pending") : viewAuth("login"); head = [t("brand"), t("home_desc"), "noindex,nofollow"]; }
      else if (r.path === "/") html = viewHome();
      else { html = '<div class="container"><p class="empty">' + t("not_found") + '</p><a class="btn" href="' + link("/") + '">' + t("nav_home") + "</a></div>"; head = [t("not_found"), t("not_found"), "noindex,follow"]; }
      app.innerHTML = html;
      setHead(head[0], head[1], head[2]);
      document.querySelectorAll("[data-nav]").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === link(r.path));
      });
      bind();
      window.scrollTo(0, 0);
    }).catch(function (e) {
      if (seq !== renderSeq) return;
      app.innerHTML = '<div class="container"><p class="empty">' + (e && e.code === "auth_required" ? t("e_auth_required") : t("load_err")) + "</p></div>";
    });
  }

  function showMsg(ok, text) {
    var msg = document.getElementById("formMsg");
    msg.className = ok ? "notice" : "error"; msg.textContent = text;
  }

  function bind() {
    var hs = document.getElementById("homeSearch");
    if (hs) hs.addEventListener("submit", function (e) { e.preventDefault(); navigate(link("/browse") + "?" + toQuery(hs)); });
    var f = document.getElementById("filters");
    if (f) f.addEventListener("submit", function (e) { e.preventDefault(); navigate(link("/browse") + "?" + toQuery(f)); });

    var au = document.getElementById("authForm");
    if (au) au.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(au), mode = au.getAttribute("data-mode");
      var body = { email: d.get("email"), password: d.get("password") };
      if (mode === "register") { body.name = d.get("name"); body.accept = d.get("accept") === "on"; }
      api("POST", mode === "register" ? "/api/register" : "/api/login", body).then(function (j) {
        state.user = j.user; navigate(link("/mine"));
      }).catch(function (err) { showMsg(false, errMsg(err)); });
    });

    var af = document.getElementById("addForm");
    if (af) af.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(af);
      api("POST", "/api/businesses", {
        name_ar: d.get("name_ar"), name_en: d.get("name_en"), cat: d.get("cat"), city: d.get("city"),
        area: d.get("area"), phone: String(d.get("phone")).replace(/\s/g, ""), desc: d.get("desc")
      }).then(function () { af.reset(); showMsg(true, t("sent")); })
        .catch(function (err) { showMsg(false, errMsg(err)); });
    });

    var ff = document.getElementById("forgotForm");
    if (ff) ff.addEventListener("submit", function (e) {
      e.preventDefault();
      api("POST", "/api/forgot", { email: new FormData(ff).get("email"), lang: lang })
        .then(function () { ff.reset(); showMsg(true, t("forgot_done")); })
        .catch(function (err) { showMsg(false, errMsg(err)); });
    });
    var rsf = document.getElementById("resetForm");
    if (rsf) rsf.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(rsf);
      if (d.get("password") !== d.get("again")) return showMsg(false, t("reset_mismatch"));
      api("POST", "/api/reset", { token: state.resetToken, password: d.get("password"), lang: lang })
        .then(function () { state.resetToken = ""; rsf.reset(); showMsg(true, t("reset_done")); setTimeout(function () { navigate(link("/login")); }, 1500); })
        .catch(function (err) { showMsg(false, errMsg(err)); });
    });
    var cp = document.getElementById("chpwForm");
    if (cp) cp.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(cp), box = document.getElementById("chpwMsg");
      api("POST", "/api/me/password", { current: d.get("current"), next: d.get("next"), lang: lang })
        .then(function () { cp.reset(); box.className = "notice"; box.textContent = t("chpw_done"); })
        .catch(function (err) { box.className = "error"; box.textContent = errMsg(err); });
    });
    var df = document.getElementById("deleteForm");
    if (df) df.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.confirm(t("acct_confirm"))) return;
      api("DELETE", "/api/me", { password: new FormData(df).get("password") })
        .then(function () { state.user = null; navigate(link("/")); })
        .catch(function (err) { showMsg(false, errMsg(err)); });
    });
    var rf = document.getElementById("reviewForm");
    if (rf) rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(rf);
      api("POST", "/api/businesses/" + rf.getAttribute("data-biz") + "/reviews", { rating: Number(d.get("rating")), comment: d.get("comment") })
        .then(function () { render(); })
        .catch(function (err) { showMsg(false, errMsg(err)); });
    });
    document.querySelectorAll("[data-delrev]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("DELETE", "/api/reviews/" + btn.getAttribute("data-delrev")).then(render).catch(function (err) { alert(errMsg(err)); });
      });
    });

    document.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("POST", "/api/admin/businesses/" + btn.getAttribute("data-id") + "/" + btn.getAttribute("data-act"), {})
          .then(render).catch(function (err) { alert(errMsg(err)); });
      });
    });
  }

  // real links, SPA behaviour: intercept internal clicks
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-native")) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) !== "/" || href.charAt(1) === "/" || href.indexOf("/api/") === 0) return;
    if (/\.[a-z0-9]+(\?|$)/i.test(href.split("?")[0])) return; // files (xml, png...) are normal downloads
    e.preventDefault();
    navigate(href);
  });
  window.addEventListener("popstate", render);

  // old hash links (#/b/5) -> real URLs
  if (location.hash.indexOf("#/") === 0) history.replaceState(null, "", location.hash.slice(1));

  setLang(langFromPath());
  api("GET", "/api/me").then(function (j) { state.user = j.user; state.features = j.features || state.features; }).catch(function () {}).then(render);
})();
