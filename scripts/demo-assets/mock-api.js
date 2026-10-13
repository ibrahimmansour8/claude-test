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
    var S = { users: [], businesses: [], reviews: [], resets: [], mails: [], me: null, seq: { u: 1, b: 1, r: 1, i: 1 }, images: [], verifs: [] };
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
  function normalise() {
    S.verifs = S.verifs || []; S.images = S.images || []; S.seq.i = S.seq.i || 1;
    S.users.forEach(function (u) { if (!("verified" in u)) u.verified = u.accepted || new Date().toISOString(); }); // saved before verification existed
  }
  function save() { memory = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var ready = (load(), normalise()), adminReady = null;

  function ensureAdmin() {
    if (adminReady) return adminReady;
    adminReady = Promise.resolve().then(function () {
      if (S.users.some(function (u) { return u.role === "admin"; })) return;
      var salt = rnd(8);
      return hash(ADMIN.password, salt).then(function (h) {
        S.users.push({ id: S.seq.u++, email: ADMIN.email, name: "Admin", role: "admin", salt: salt, hash: h, accepted: new Date().toISOString(), verified: new Date().toISOString() }); save();
      });
    });
    return adminReady;
  }

  function stats(id) {
    var rs = S.reviews.filter(function (r) { return r.business_id === id; });
    var avg = rs.length ? Math.round(rs.reduce(function (a, r) { return a + r.rating; }, 0) / rs.length * 10) / 10 : 0;
    return { rating: avg, reviews: rs.length };
  }
  function imagesOf(b, all) {
    return S.images.filter(function (i) { return i.business_id === b.id && (all || i.status === "approved"); }).map(function (i) { return { id: i.id, w: i.w, h: i.h, status: i.status }; });
  }
  function out(b, all) {
    var st = stats(b.id), imgs = imagesOf(b, all), ok = imgs.filter(function (i) { return i.status === "approved"; });
    return { id: b.id, cat: b.cat, city: b.city, name: b.name, desc: b.desc, area: b.area, hours: b.hours || { ar: "", en: "" },
      phone: b.phone, whatsapp: b.whatsapp, rating: st.rating, reviews: st.reviews, verified: b.verified, status: b.status, mine: false,
      images: imgs, cover: ok.length ? ok[0].id : null };
  }
  function listing(body) {
    var f = { cat: body.cat, city: body.city, name_ar: str(body.name_ar, 80), desc: str(body.desc, 300), area: str(body.area, 80), hours: str(body.hours, 80), phone: str(body.phone, 20).replace(/\s/g, "") };
    f.name_en = str(body.name_en, 80) || f.name_ar;
    if (!f.name_ar) return { error: "invalid_name" };
    if (CATS.indexOf(f.cat) < 0) return { error: "invalid_category" };
    if (CITIES.indexOf(f.city) < 0) return { error: "invalid_city" };
    if (!/^[34567]\d{7}$/.test(f.phone)) return { error: "invalid_phone" };
    return { f: f };
  }
  function live(b) { return { cat: b.cat, city: b.city, name_ar: b.name.ar, name_en: b.name.en, desc: b.desc.ar, area: b.area.ar, hours: (b.hours || {}).ar || "", phone: b.phone.replace("+974", "") }; }
  function same(a, b) { return ["cat", "city", "name_ar", "name_en", "desc", "area", "hours", "phone"].every(function (k) { return a[k] === b[k]; }); }
  function apply(b, f) {
    b.cat = f.cat; b.city = f.city; b.name = { ar: f.name_ar, en: f.name_en }; b.desc = { ar: f.desc, en: f.desc }; b.area = { ar: f.area, en: f.area };
    b.hours = { ar: f.hours, en: f.hours }; b.phone = "+974" + f.phone; b.whatsapp = "974" + f.phone; b.edit = null; b.updated = new Date().toISOString();
  }
  function manage(u, id) {
    var b = S.businesses.filter(function (x) { return x.id === id; })[0];
    if (!b) return { err: R(404, { error: "not_found" }) };
    if (b.owner_id !== u.id && u.role !== "admin") return { err: R(403, { error: "forbidden" }) };
    return { b: b };
  }
  function decode(dataUrl) {
    return new Promise(function (resolve, reject) { var im = new Image(); im.onload = function () { resolve({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = reject; im.src = dataUrl; });
  }
  function byRating(a, b) { return b.rating - a.rating || b.reviews - a.reviews || a.id - b.id; }
  function me() { return S.me ? S.users.filter(function (u) { return u.id === S.me; })[0] || null : null; }
  function pub(u) { return u ? { id: u.id, email: u.email, name: u.name, role: u.role, verified: !!u.verified } : null; }
  function gated(u) { return !u.verified; }
  function str(v, n) { return typeof v === "string" ? v.trim().slice(0, n) : ""; }
  function R(status, json) { return { status: status, json: json }; }
  function mail(to, lang, kind, name, link, extra) {
    var ar = lang !== "en", brand = ar ? "دليل قطر" : "Qatar Guide", m;
    if (kind === "reset") m = { subject: ar ? "استعادة كلمة المرور – " + brand : "Reset your password – " + brand,
      text: ar ? "مرحبًا " + name + "،\nافتح الرابط لاختيار كلمة مرور جديدة (صالح ساعة، مرة واحدة)." : "Hello " + name + ",\nOpen the link to choose a new password (valid for one hour, works once).", link: link };
    else if (kind === "verify") m = { subject: ar ? "فعّل بريدك الإلكتروني – " + brand : "Confirm your e-mail – " + brand,
      text: ar ? "مرحبًا " + name + "،\nأكّد أن هذا البريد لك بفتح الرابط (صالح 24 ساعة)." : "Hello " + name + ",\nConfirm this e-mail address is yours by opening the link (valid for 24 hours).", link: link };
    else if (kind === "emailchanged") m = { subject: ar ? "تم تغيير بريد حسابك – " + brand : "Your account e-mail was changed – " + brand,
      text: ar ? "مرحبًا " + name + "،\nتم تغيير بريد حسابك إلى " + extra + ". إن لم تكن أنت فتواصل معنا فورًا." : "Hello " + name + ",\nYour account e-mail was changed to " + extra + ". If this was not you, contact us immediately." };
    else m = { subject: ar ? "تم تغيير كلمة مرورك – " + brand : "Your password was changed – " + brand,
      text: ar ? "مرحبًا " + name + "،\nتم للتو تغيير كلمة مرور حسابك وتسجيل الخروج من الأجهزة الأخرى." : "Hello " + name + ",\nYour account password was just changed and other devices were signed out." };
    m.to = to; m.at = new Date().toISOString(); S.mails.unshift(m); S.mails = S.mails.slice(0, 20);
    window.dispatchEvent(new CustomEvent("demo-mail"));
  }
  function issueVerif(u, lang) {
    var token = rnd(32);
    S.verifs = S.verifs.filter(function (v) { return v.user_id !== u.id; });
    S.verifs.push({ token: token, user_id: u.id, email: u.email, expires: Date.now() + 86400000 });
    mail(u.email, lang, "verify", u.name, (lang === "en" ? "/en" : "") + "/verify?token=" + token);
  }

  function handle(method, path, query, body) {
    var u = me(), m;
    if (method === "GET" && path === "/api/health") return R(200, { ok: true });
    if (method === "GET" && path === "/api/me") return R(200, { user: pub(u), features: { passwordReset: true, emailVerification: true } });

    if (method === "POST" && path === "/api/register") {
      var email = str(body.email, 120).toLowerCase(), name = str(body.name, 60), pw = typeof body.password === "string" ? body.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return R(400, { error: "invalid_email" });
      if (!name) return R(400, { error: "invalid_name" });
      if (pw.length < 8 || pw.length > 128) return R(400, { error: "weak_password" });
      if (body.accept !== true) return R(400, { error: "terms_required" });
      if (S.users.some(function (x) { return x.email === email; })) return R(409, { error: "email_taken" });
      var salt = rnd(8);
      return hash(pw, salt).then(function (h) {
        var nu = { id: S.seq.u++, email: email, name: name, role: "user", salt: salt, hash: h, accepted: new Date().toISOString(), verified: null };
        S.users.push(nu); S.me = nu.id; issueVerif(nu, body.lang === "en" ? "en" : "ar"); save(); return R(201, { user: pub(nu) });
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

    if (method === "POST" && path === "/api/verify") {
      var vt = typeof body.token === "string" ? body.token : "";
      var vr = S.verifs.filter(function (v) { return v.token === vt; })[0], vu = vr && S.users.filter(function (x) { return x.id === vr.user_id; })[0];
      if (!vr || vr.expires < Date.now() || !vu || vu.email !== vr.email) return R(400, { error: "invalid_token" });
      vu.verified = vu.verified || new Date().toISOString(); S.verifs = S.verifs.filter(function (v) { return v.user_id !== vu.id; }); save();
      return R(200, { ok: true });
    }
    if (method === "POST" && path === "/api/verify/resend") {
      if (!u) return R(401, { error: "auth_required" });
      if (u.verified) return R(200, { ok: true, already: true });
      issueVerif(u, body.lang === "en" ? "en" : "ar"); save(); return R(200, { ok: true });
    }
    if (method === "POST" && path === "/api/me/email") {
      if (!u) return R(401, { error: "auth_required" });
      if (u.role === "admin") return R(403, { error: "admin_use_env" });
      return hash(typeof body.password === "string" ? body.password : "", u.salt).then(function (h) {
        if (h !== u.hash) return R(401, { error: "bad_credentials" });
        var ne = str(body.email, 120).toLowerCase(), lg = body.lang === "en" ? "en" : "ar";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ne)) return R(400, { error: "invalid_email" });
        if (ne === u.email) return R(400, { error: "same_email" });
        if (S.users.some(function (x) { return x.email === ne; })) return R(409, { error: "email_taken" });
        var old = u.email; u.email = ne; u.verified = null;
        S.resets = S.resets.filter(function (r) { return r.user_id !== u.id; });
        mail(old, lg, "emailchanged", u.name, null, ne); issueVerif(u, lg); save();
        return R(200, { user: pub(u) });
      });
    }

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
        tu.salt = s2; tu.hash = h; tu.verified = tu.verified || new Date().toISOString(); S.resets = S.resets.filter(function (r) { return r.user_id !== tu.id; });
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
        profile: { id: u.id, email: u.email, name: u.name, role: u.role, email_verified_at: u.verified, terms_accepted_at: u.accepted },
        businesses: S.businesses.filter(function (b) { return b.owner_id === u.id; }).map(function (b) { return { id: b.id, cat: b.cat, city: b.city, name_ar: b.name.ar, phone: b.phone, status: b.status, verified: b.verified }; }),
        reviews: S.reviews.filter(function (r) { return r.user_id === u.id; }).map(function (r) { return { business_id: r.business_id, rating: r.rating, comment: r.comment }; }) });
    }
    if (method === "DELETE" && path === "/api/me") {
      if (!u) return R(401, { error: "auth_required" });
      if (u.role === "admin") return R(403, { error: "admin_cannot_delete" });
      return hash(typeof body.password === "string" ? body.password : "", u.salt).then(function (h) {
        if (h !== u.hash) return R(401, { error: "bad_credentials" });
        var mine = S.businesses.filter(function (b) { return b.owner_id === u.id; }).map(function (b) { return b.id; });
        S.businesses = S.businesses.filter(function (b) { return b.owner_id !== u.id; }); S.images = S.images.filter(function (i) { return mine.indexOf(i.business_id) < 0; });
        S.reviews = S.reviews.filter(function (r) { return r.user_id !== u.id && mine.indexOf(r.business_id) < 0; });
        S.users = S.users.filter(function (x) { return x.id !== u.id; }); S.verifs = S.verifs.filter(function (v) { return v.user_id !== u.id; }); S.me = null; save(); return R(200, { ok: true });
      });
    }

    if (method === "GET" && path === "/api/businesses") return R(200, { businesses: S.businesses.filter(function (b) { return b.status === "approved"; }).map(function (b) { return out(b, false); }).sort(byRating) });
    if (method === "GET" && path === "/api/my/businesses") {
      if (!u) return R(401, { error: "auth_required" });
      return R(200, { businesses: S.businesses.filter(function (b) { return b.owner_id === u.id; }).map(function (b) { var o = out(b, true); o.mine = true; o.edit = b.edit || null; return o; }).sort(function (a, b) { return b.id - a.id; }) });
    }
    if (method === "POST" && path === "/api/businesses") {
      if (!u) return R(401, { error: "auth_required" });
      if (gated(u)) return R(403, { error: "email_unverified" });
      var v = listing(body);
      if (v.error) return R(400, { error: v.error });
      var f = v.f, nb = { id: S.seq.b++, owner_id: u.id, cat: f.cat, city: f.city, name: { ar: f.name_ar, en: f.name_en }, desc: { ar: f.desc, en: f.desc }, area: { ar: f.area, en: f.area },
        hours: { ar: f.hours, en: f.hours }, phone: "+974" + f.phone, whatsapp: "974" + f.phone, verified: false, status: "pending", created_at: new Date().toISOString(), edit: null };
      S.businesses.push(nb); save(); return R(201, { id: nb.id, status: "pending" });
    }
    if ((m = path.match(/^\/api\/businesses\/(\d+)$/)) && method === "PATCH") {
      if (!u) return R(401, { error: "auth_required" });
      if (gated(u)) return R(403, { error: "email_unverified" });
      var mg = manage(u, Number(m[1])); if (mg.err) return mg.err;
      var v2 = listing(body); if (v2.error) return R(400, { error: v2.error });
      if (mg.b.status === "approved" && u.role !== "admin") {
        if (same(v2.f, live(mg.b))) { mg.b.edit = null; save(); return R(200, { status: "unchanged" }); }
        mg.b.edit = v2.f; save(); return R(200, { status: "edit_pending" });
      }
      apply(mg.b, v2.f); if (mg.b.status === "rejected" && u.role !== "admin") mg.b.status = "pending"; save(); return R(200, { status: "updated" });
    }
    if ((m = path.match(/^\/api\/businesses\/(\d+)\/manage$/)) && method === "GET") {
      if (!u) return R(401, { error: "auth_required" });
      var mg2 = manage(u, Number(m[1])); if (mg2.err) return mg2.err;
      var o2 = out(mg2.b, true); o2.mine = true; o2.edit = mg2.b.edit || null;
      return R(200, { business: o2, form: mg2.b.edit || live(mg2.b), maxImages: 6 });
    }
    if ((m = path.match(/^\/api\/businesses\/(\d+)\/images$/)) && method === "POST") {
      if (!u) return R(401, { error: "auth_required" });
      if (gated(u)) return R(403, { error: "email_unverified" });
      var mg3 = manage(u, Number(m[1])); if (mg3.err) return mg3.err;
      var du = body.__dataUrl || "";
      if (!/^data:image\/(jpeg|png);base64,/.test(du)) return R(415, { error: "unsupported_image_type" });
      if (S.images.filter(function (i) { return i.business_id === mg3.b.id && i.status !== "rejected"; }).length >= 6) return R(400, { error: "too_many_images" });
      return decode(du).then(function (d) {
        if (d.w < 16 || d.h < 16) return R(400, { error: "image_too_small" });
        var im = { id: S.seq.i++, business_id: mg3.b.id, user_id: u.id, data: du, w: d.w, h: d.h, status: u.role === "admin" ? "approved" : "pending" };
        S.images.push(im); save(); return R(201, { id: im.id, status: im.status, w: im.w, h: im.h });
      }, function () { return R(400, { error: "invalid_image" }); });
    }
    if ((m = path.match(/^\/api\/images\/(\d+)$/)) && method === "DELETE") {
      if (!u) return R(401, { error: "auth_required" });
      var img = S.images.filter(function (i) { return i.id === Number(m[1]); })[0];
      if (!img) return R(404, { error: "not_found" });
      var owner = S.businesses.filter(function (x) { return x.id === img.business_id; })[0];
      if (!owner || (owner.owner_id !== u.id && u.role !== "admin")) return R(403, { error: "forbidden" });
      S.images = S.images.filter(function (i) { return i !== img; }); save(); return R(200, { ok: true });
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
        if (gated(u)) return R(403, { error: "email_unverified" });
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
        var inQueue = function (b) { return b.status === "pending" || !!b.edit || S.images.some(function (i) { return i.business_id === b.id && i.status === "pending"; }); };
        return R(200, { businesses: S.businesses.filter(function (b) { return stt === "pending" ? inQueue(b) : b.status === stt; }).map(function (b) {
          var o = out(b, true); o.edit = b.edit || null; o.review = b.status === "pending" ? "new" : b.edit ? "edit" : "images"; return o;
        }).sort(function (a, b) { return b.id - a.id; }) });
      }
      if (method === "POST" && (m = path.match(/^\/api\/admin\/businesses\/(\d+)\/(approve|reject|verify|unverify)$/))) {
        var tb = S.businesses.filter(function (b) { return b.id === Number(m[1]); })[0];
        if (!tb) return R(404, { error: "not_found" });
        if (m[2] === "approve") {
          if (tb.edit) apply(tb, tb.edit); else tb.status = "approved";
          S.images.forEach(function (i) { if (i.business_id === tb.id && i.status === "pending") i.status = "approved"; });
        } else if (m[2] === "reject") {
          if (tb.status === "approved") { tb.edit = null; S.images.forEach(function (i) { if (i.business_id === tb.id && i.status === "pending") i.status = "rejected"; }); }
          else tb.status = "rejected";
        } else tb.verified = m[2] === "verify";
        save(); return R(200, { ok: true });
      }
    }
    if (method === "POST" && (m = path.match(/^\/api\/admin\/images\/(\d+)\/(approve|reject)$/)) && u && u.role === "admin") {
      var ti = S.images.filter(function (i) { return i.id === Number(m[1]); })[0];
      if (!ti) return R(404, { error: "not_found" });
      ti.status = m[2] === "approve" ? "approved" : "rejected"; save(); return R(200, { ok: true });
    }
    return R(404, { error: "not_found" });
  }

  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, opt) {
    if (typeof url !== "string" || url.indexOf("/api/") !== 0) return realFetch ? realFetch(url, opt) : Promise.reject(new Error("offline"));
    var qi = url.indexOf("?"), path = qi < 0 ? url : url.slice(0, qi), query = {};
    if (qi >= 0) new URLSearchParams(url.slice(qi + 1)).forEach(function (v, k) { query[k] = v; });
    var bodyP;
    if (opt && opt.body && typeof Blob !== "undefined" && opt.body instanceof Blob) {
      bodyP = new Promise(function (resolve) { var fr = new FileReader(); fr.onload = function () { resolve({ __dataUrl: fr.result }); }; fr.onerror = function () { resolve({}); }; fr.readAsDataURL(opt.body); });
    } else { var parsed = {}; try { parsed = opt && opt.body ? JSON.parse(opt.body) : {}; } catch (e) {} bodyP = Promise.resolve(parsed); }
    return bodyP.then(function (body) { return ensureAdmin().then(function () { return handle(((opt && opt.method) || "GET").toUpperCase(), path, query, body); }); }).then(function (r) {
      return new Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json" } });
    });
  };

  window.__demoStore = {
    mails: function () { return S.mails; },
    reset: function () { memory = null; try { localStorage.removeItem(KEY); } catch (e) {} S = seed(); adminReady = null; save(); },
    img: function (id) { var i = S.images.filter(function (x) { return x.id === id; })[0]; return i ? i.data : ""; },
    admin: ADMIN
  };
})();
