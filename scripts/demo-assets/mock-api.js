/* In-browser stand-in for the Node API, used only by the single-file demo (scripts/build-demo.js).
   Same endpoints and rules as server/server.js, minus rate limiting. Data lives in this browser only. */
(function () {
  "use strict";
  var KEY = "qg_demo_v1", ADMIN = { email: "admin@demo.local", password: "demo-admin-1234" };
  var CATS = window.CATEGORIES.map(function (c) { return c.id; }), CITIES = window.CITIES.map(function (c) { return c.id; });
  var memory = null; // used when localStorage is unavailable

  function rnd(n) { var a = new Uint8Array(n); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); }); return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function hash(pw, salt) {
    var data = new TextEncoder().encode(salt + ":" + pw);
    if (window.crypto && crypto.subtle) return crypto.subtle.digest("SHA-256", data).then(function (d) { return Array.prototype.map.call(new Uint8Array(d), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); });
    return Promise.resolve(btoa(unescape(encodeURIComponent(salt + ":" + pw)))); // demo fallback
  }

  function seed() {
    var S = { users: [], businesses: [], reviews: [], resets: [], mails: [], me: null, seq: { u: 1, b: 1, r: 1 } };
    window.BUSINESSES.forEach(function (b) {
      S.businesses.push({ id: S.seq.b++, owner_id: null, cat: b.cat, city: b.city, name: b.name, desc: b.desc, area: b.area, hours: b.hours,
        phone: b.phone, whatsapp: b.whatsapp, verified: !!b.verified, status: "approved", created_at: new Date().toISOString() });
    });
    return S;
  }
  var S;
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); return; } } catch (e) {}
    S = memory || seed();
  }
  function save() { memory = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var ready = load(), adminReady = null;

  function ensureAdmin() {
    if (adminReady) return adminReady;
    adminReady = Promise.resolve().then(function () {
      if (S.users.some(function (u) { return u.role === "admin"; })) return;
      var salt = rnd(8);
      return hash(ADMIN.password, salt).then(function (h) {
        S.users.push({ id: S.seq.u++, email: ADMIN.email, name: "Admin", role: "admin", salt: salt, hash: h, accepted: new Date().toISOString() }); save();
      });
    });
    return adminReady;
  }

  function stats(id) {
    var rs = S.reviews.filter(function (r) { return r.business_id === id; });
    var avg = rs.length ? Math.round(rs.reduce(function (a, r) { return a + r.rating; }, 0) / rs.length * 10) / 10 : 0;
    return { rating: avg, reviews: rs.length };
  }
  function out(b) {
    var st = stats(b.id);
    return { id: b.id, cat: b.cat, city: b.city, name: b.name, desc: b.desc, area: b.area, hours: b.hours || { ar: "", en: "" },
      phone: b.phone, whatsapp: b.whatsapp, rating: st.rating, reviews: st.reviews, verified: b.verified, status: b.status, mine: false };
  }
  function byRating(a, b) { return b.rating - a.rating || b.reviews - a.reviews || a.id - b.id; }
  function me() { return S.me ? S.users.filter(function (u) { return u.id === S.me; })[0] || null : null; }
  function pub(u) { return u ? { id: u.id, email: u.email, name: u.name, role: u.role } : null; }
  function str(v, n) { return typeof v === "string" ? v.trim().slice(0, n) : ""; }
  function R(status, json) { return { status: status, json: json }; }
  function mail(to, lang, kind, name, link) {
    var ar = lang !== "en", brand = ar ? "دليل قطر" : "Qatar Guide";
    var m = kind === "reset"
      ? { subject: ar ? "استعادة كلمة المرور – " + brand : "Reset your password – " + brand,
          text: ar ? "مرحبًا " + name + "،\nافتح الرابط لاختيار كلمة مرور جديدة (صالح ساعة، مرة واحدة)." : "Hello " + name + ",\nOpen the link to choose a new password (valid for one hour, works once).", link: link }
      : { subject: ar ? "تم تغيير كلمة مرورك – " + brand : "Your password was changed – " + brand,
          text: ar ? "مرحبًا " + name + "،\nتم للتو تغيير كلمة مرور حسابك وتسجيل الخروج من الأجهزة الأخرى." : "Hello " + name + ",\nYour account password was just changed and other devices were signed out." };
    m.to = to; m.at = new Date().toISOString(); S.mails.unshift(m); S.mails = S.mails.slice(0, 20);
    window.dispatchEvent(new CustomEvent("demo-mail"));
  }

  function handle(method, path, query, body) {
    var u = me(), m;
    if (method === "GET" && path === "/api/health") return R(200, { ok: true });
    if (method === "GET" && path === "/api/me") return R(200, { user: pub(u), features: { passwordReset: true } });

    if (method === "POST" && path === "/api/register") {
      var email = str(body.email, 120).toLowerCase(), name = str(body.name, 60), pw = typeof body.password === "string" ? body.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return R(400, { error: "invalid_email" });
      if (!name) return R(400, { error: "invalid_name" });
      if (pw.length < 8 || pw.length > 128) return R(400, { error: "weak_password" });
      if (body.accept !== true) return R(400, { error: "terms_required" });
      if (S.users.some(function (x) { return x.email === email; })) return R(409, { error: "email_taken" });
      var salt = rnd(8);
      return hash(pw, salt).then(function (h) {
        var nu = { id: S.seq.u++, email: email, name: name, role: "user", salt: salt, hash: h, accepted: new Date().toISOString() };
        S.users.push(nu); S.me = nu.id; save(); return R(201, { user: pub(nu) });
      });
    }
    if (method === "POST" && path === "/api/login") {
      var e2 = str(body.email, 120).toLowerCase(), p2 = typeof body.password === "string" ? body.password.slice(0, 128) : "";
      var row = S.users.filter(function (x) { return x.email === e2; })[0];
      return hash(p2, row ? row.salt : "x").then(function (h) {
        if (!row || h !== row.hash) return R(401, { error: "bad_credentials" });
        S.me = row.id; save(); return R(200, { user: pub(row) });
      });
    }
    if (method === "POST" && path === "/api/logout") { S.me = null; save(); return R(200, { ok: true }); }

    if (method === "POST" && path === "/api/forgot") {
      var fe = str(body.email, 120).toLowerCase(), fl = body.lang === "en" ? "en" : "ar";
      var fu = S.users.filter(function (x) { return x.email === fe; })[0];
      if (fu && fu.role !== "admin") {
        var token = rnd(32);
        S.resets = S.resets.filter(function (r) { return r.user_id !== fu.id; });
        S.resets.push({ token: token, user_id: fu.id, expires: Date.now() + 3600000 });
        mail(fe, fl, "reset", fu.name, (fl === "en" ? "/en" : "") + "/reset?token=" + token);
        save();
      }
      return R(200, { ok: true }); // same answer whether or not the account exists
    }
    if (method === "POST" && path === "/api/reset") {
      var tk = typeof body.token === "string" ? body.token : "", np = typeof body.password === "string" ? body.password : "";
      var rr = S.resets.filter(function (r) { return r.token === tk; })[0];
      if (!rr || rr.expires < Date.now()) return R(400, { error: "invalid_token" });
      if (np.length < 8 || np.length > 128) return R(400, { error: "weak_password" });
      var tu = S.users.filter(function (x) { return x.id === rr.user_id; })[0], s2 = rnd(8);
      return hash(np, s2).then(function (h) {
        tu.salt = s2; tu.hash = h; S.resets = S.resets.filter(function (r) { return r.user_id !== tu.id; });
        if (S.me === tu.id) S.me = null; // signed out everywhere
        mail(tu.email, body.lang === "en" ? "en" : "ar", "changed", tu.name); save(); return R(200, { ok: true });
      });
    }
    if (method === "POST" && path === "/api/me/password") {
      if (!u) return R(401, { error: "auth_required" });
      if (u.role === "admin") return R(403, { error: "admin_use_env" });
      return hash(typeof body.current === "string" ? body.current : "", u.salt).then(function (h) {
        if (h !== u.hash) return R(401, { error: "bad_credentials" });
        var nx = typeof body.next === "string" ? body.next : "";
        if (nx.length < 8 || nx.length > 128) return R(400, { error: "weak_password" });
        var s3 = rnd(8);
        return hash(nx, s3).then(function (h2) { u.salt = s3; u.hash = h2; mail(u.email, body.lang === "en" ? "en" : "ar", "changed", u.name); save(); return R(200, { ok: true }); });
      });
    }

    if (method === "GET" && path === "/api/me/export") {
      if (!u) return R(401, { error: "auth_required" });
      return R(200, { exported_at: new Date().toISOString(),
        profile: { id: u.id, email: u.email, name: u.name, role: u.role, terms_accepted_at: u.accepted },
        businesses: S.businesses.filter(function (b) { return b.owner_id === u.id; }).map(function (b) { return { id: b.id, cat: b.cat, city: b.city, name_ar: b.name.ar, phone: b.phone, status: b.status, verified: b.verified }; }),
        reviews: S.reviews.filter(function (r) { return r.user_id === u.id; }).map(function (r) { return { business_id: r.business_id, rating: r.rating, comment: r.comment }; }) });
    }
    if (method === "DELETE" && path === "/api/me") {
      if (!u) return R(401, { error: "auth_required" });
      if (u.role === "admin") return R(403, { error: "admin_cannot_delete" });
      return hash(typeof body.password === "string" ? body.password : "", u.salt).then(function (h) {
        if (h !== u.hash) return R(401, { error: "bad_credentials" });
        var mine = S.businesses.filter(function (b) { return b.owner_id === u.id; }).map(function (b) { return b.id; });
        S.businesses = S.businesses.filter(function (b) { return b.owner_id !== u.id; });
        S.reviews = S.reviews.filter(function (r) { return r.user_id !== u.id && mine.indexOf(r.business_id) < 0; });
        S.users = S.users.filter(function (x) { return x.id !== u.id; }); S.me = null; save(); return R(200, { ok: true });
      });
    }

    if (method === "GET" && path === "/api/businesses") return R(200, { businesses: S.businesses.filter(function (b) { return b.status === "approved"; }).map(out).sort(byRating) });
    if (method === "GET" && path === "/api/my/businesses") {
      if (!u) return R(401, { error: "auth_required" });
      return R(200, { businesses: S.businesses.filter(function (b) { return b.owner_id === u.id; }).map(function (b) { var o = out(b); o.mine = true; return o; }).sort(function (a, b) { return b.id - a.id; }) });
    }
    if (method === "POST" && path === "/api/businesses") {
      if (!u) return R(401, { error: "auth_required" });
      var nameAr = str(body.name_ar, 80), nameEn = str(body.name_en, 80) || nameAr, desc = str(body.desc, 300), area = str(body.area, 80), phone = str(body.phone, 8).replace(/\s/g, "");
      if (!nameAr) return R(400, { error: "invalid_name" });
      if (CATS.indexOf(body.cat) < 0) return R(400, { error: "invalid_category" });
      if (CITIES.indexOf(body.city) < 0) return R(400, { error: "invalid_city" });
      if (!/^[34567]\d{7}$/.test(phone)) return R(400, { error: "invalid_phone" });
      var nb = { id: S.seq.b++, owner_id: u.id, cat: body.cat, city: body.city, name: { ar: nameAr, en: nameEn }, desc: { ar: desc, en: desc }, area: { ar: area, en: area },
        hours: { ar: "", en: "" }, phone: "+974" + phone, whatsapp: "974" + phone, verified: false, status: "pending", created_at: new Date().toISOString() };
      S.businesses.push(nb); save(); return R(201, { id: nb.id, status: "pending" });
    }

    if ((m = path.match(/^\/api\/businesses\/(\d+)\/reviews$/))) {
      var bid = Number(m[1]), biz = S.businesses.filter(function (b) { return b.id === bid && b.status === "approved"; })[0];
      if (!biz) return R(404, { error: "not_found" });
      if (method === "GET") {
        return R(200, { reviews: S.reviews.filter(function (r) { return r.business_id === bid; }).sort(function (a, b) { return b.id - a.id; }).map(function (r) {
          var au = S.users.filter(function (x) { return x.id === r.user_id; })[0];
          return { id: r.id, rating: r.rating, comment: r.comment, name: au ? au.name : "—", created_at: r.created_at, mine: !!u && r.user_id === u.id };
        }) });
      }
      if (method === "POST") {
        if (!u) return R(401, { error: "auth_required" });
        if (biz.owner_id === u.id) return R(403, { error: "own_business" });
        var rating = Number(body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return R(400, { error: "invalid_rating" });
        var ex = S.reviews.filter(function (r) { return r.business_id === bid && r.user_id === u.id; })[0], cm = str(body.comment, 500);
        if (ex) { ex.rating = rating; ex.comment = cm; } else S.reviews.push({ id: S.seq.r++, business_id: bid, user_id: u.id, rating: rating, comment: cm, created_at: new Date().toISOString().slice(0, 10) });
        save(); return R(201, { ok: true });
      }
    }
    if ((m = path.match(/^\/api\/reviews\/(\d+)$/)) && method === "DELETE") {
      if (!u) return R(401, { error: "auth_required" });
      var rv = S.reviews.filter(function (r) { return r.id === Number(m[1]); })[0];
      if (!rv) return R(404, { error: "not_found" });
      if (rv.user_id !== u.id && u.role !== "admin") return R(403, { error: "forbidden" });
      S.reviews = S.reviews.filter(function (r) { return r !== rv; }); save(); return R(200, { ok: true });
    }

    if (path.indexOf("/api/admin/") === 0) {
      if (!u) return R(401, { error: "auth_required" });
      if (u.role !== "admin") return R(403, { error: "forbidden" });
      if (method === "GET" && path === "/api/admin/businesses") {
        var stt = query.status || "pending";
        if (["pending", "approved", "rejected"].indexOf(stt) < 0) return R(400, { error: "invalid_status" });
        return R(200, { businesses: S.businesses.filter(function (b) { return b.status === stt; }).map(out).sort(function (a, b) { return b.id - a.id; }) });
      }
      if (method === "POST" && (m = path.match(/^\/api\/admin\/businesses\/(\d+)\/(approve|reject|verify|unverify)$/))) {
        var tb = S.businesses.filter(function (b) { return b.id === Number(m[1]); })[0];
        if (!tb) return R(404, { error: "not_found" });
        if (m[2] === "approve") tb.status = "approved"; else if (m[2] === "reject") tb.status = "rejected"; else tb.verified = m[2] === "verify";
        save(); return R(200, { ok: true });
      }
    }
    return R(404, { error: "not_found" });
  }

  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, opt) {
    if (typeof url !== "string" || url.indexOf("/api/") !== 0) return realFetch ? realFetch(url, opt) : Promise.reject(new Error("offline"));
    var qi = url.indexOf("?"), path = qi < 0 ? url : url.slice(0, qi), query = {};
    if (qi >= 0) new URLSearchParams(url.slice(qi + 1)).forEach(function (v, k) { query[k] = v; });
    var body = {}; try { body = opt && opt.body ? JSON.parse(opt.body) : {}; } catch (e) {}
    return ensureAdmin().then(function () { return handle(((opt && opt.method) || "GET").toUpperCase(), path, query, body); }).then(function (r) {
      return new Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json" } });
    });
  };

  window.__demoStore = {
    mails: function () { return S.mails; },
    reset: function () { memory = null; try { localStorage.removeItem(KEY); } catch (e) {} S = seed(); adminReady = null; save(); },
    admin: ADMIN
  };
})();
