/* Demo-only layer: virtual router (no real URL changes inside the sandboxed page), toast, mailbox, guide, data-export viewer. */
(function () {
  "use strict";
  var stack = [{ p: "/", s: "" }], idx = 0, pops = [];
  function parse(u) { var i = u.indexOf("?"), p = i < 0 ? u : u.slice(0, i); return { p: p || "/", s: i < 0 ? "" : u.slice(i) }; }
  function changed() { window.dispatchEvent(new CustomEvent("demo-nav")); }
  window.__vl = {
    get pathname() { return stack[idx].p; }, get search() { return stack[idx].s; }, hash: "", origin: "https://demo.local",
    pushState: function (_a, _b, u) { stack = stack.slice(0, idx + 1); stack.push(parse(u)); idx++; changed(); },
    replaceState: function (_a, _b, u) { stack[idx] = parse(u); changed(); },
    back: function () { if (idx > 0) { idx--; changed(); pops.forEach(function (f) { f(); }); } },
    canBack: function () { return idx > 0; },
    reload: function () { pops.forEach(function (f) { f(); }); },
    onpop: function (f) { pops.push(f); }
  };

  function en() { return document.documentElement.lang === "en"; }
  function T(ar, e) { return en() ? e : ar; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---- toast (the viewer never shows alert dialogs) ----
  var toastBox;
  function toast(msg) {
    if (!toastBox) { toastBox = el("div", "demo-toast"); toastBox.setAttribute("role", "status"); document.body.appendChild(toastBox); }
    toastBox.textContent = msg; toastBox.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastBox.hidden = true; }, 3500);
  }
  window.__demo = { toast: toast, confirm: function () { return true; } }; // the delete form already asks for the password

  // ---- generic panel ----
  var panel, panelBody, panelTitle;
  function openPanel(title, node) {
    if (!panel) {
      panel = el("div", "demo-panel"); panel.hidden = true;
      var card = el("div", "demo-card"), head = el("div", "demo-card-head");
      panelTitle = el("strong"); var close = el("button", "demo-x", "✕"); close.type = "button"; close.setAttribute("aria-label", "Close");
      close.addEventListener("click", function () { panel.hidden = true; });
      head.appendChild(panelTitle); head.appendChild(close); panelBody = el("div", "demo-card-body");
      card.appendChild(head); card.appendChild(panelBody); panel.appendChild(card); document.body.appendChild(panel);
      panel.addEventListener("click", function (e) { if (e.target === panel) panel.hidden = true; });
    }
    panelTitle.textContent = title; panelBody.innerHTML = ""; panelBody.appendChild(node); panel.hidden = false;
  }
  function copyBtn(getText) {
    var b = el("button", "btn ghost demo-copy", T("نسخ", "Copy")); b.type = "button";
    b.addEventListener("click", function () {
      var txt = getText();
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(T("تم النسخ", "Copied")); }, function () {
        var r = document.createRange(), n = b.previousElementSibling; if (n) { r.selectNodeContents(n); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast(T("حدّد النص وانسخه", "Text selected, copy it")); }
      });
    });
    return b;
  }

  // ---- guide ----
  function guide() {
    var a = window.__demoStore.admin, box = el("div");
    box.innerHTML = "<p>" + T("هذه نسخة تجريبية كاملة من المنصة تعمل داخل المتصفح. البيانات محفوظة في متصفحك أنت فقط ولا يراها أحد غيرك.", "This is a full demo of the platform running inside your browser. Data stays in your browser only; nobody else sees it.") + "</p>" +
      "<ol>" +
      "<li>" + T("تصفّح التصنيفات وافتح نشاطًا وجرّب البحث وتبديل اللغة.", "Browse categories, open a business, try search and the language switch.") + "</li>" +
      "<li>" + T("أنشئ حسابًا (يلزم قبول الشروط). ستصلك رسالة تفعيل في «البريد التجريبي» أسفل الشاشة: افتح رابطها لتفعيل بريدك.", "Create an account (terms acceptance required). A confirmation message lands in the demo mailbox below: open its link to confirm your e-mail.") + "</li>" +
      "<li>" + T("أضف نشاطًا وصورًا له: يبقى «قيد المراجعة». (قبل التفعيل لا يمكنك الإضافة ولا التقييم.)", "Add a business and photos for it: it stays pending. (Before confirming you cannot add or rate.)") + "</li>" +
      "<li>" + T("بعد قبول الأدمن جرّب تعديل النشاط من «حسابي ← تعديل»: يبقى المنشور كما هو حتى يوافق الأدمن على تعديلك.", "Once approved, try editing it from My account → Edit: the published version stays until the admin approves your change.") + "</li>" +
      "<li>" + T("سجّل الخروج وادخل كأدمن لقبوله، ثم قيّم نشاطًا من حساب آخر.", "Log out and sign in as admin to approve it, then rate a business from another account.") + "</li>" +
      "<li>" + T("جرّب «نسيت كلمة المرور؟» ثم افتح «البريد التجريبي» أسفل الشاشة لتجد الرسالة.", "Try “Forgot your password?”, then open the demo mailbox below to find the message.") + "</li></ol>";
    var cred = el("div", "demo-cred");
    cred.innerHTML = "<div><span>" + T("بريد الأدمن", "Admin e-mail") + "</span> <code dir=\"ltr\">" + esc(a.email) + "</code></div><div><span>" + T("كلمة المرور", "Password") + "</span> <code dir=\"ltr\">" + esc(a.password) + "</code></div>";
    box.appendChild(cred);
    box.appendChild(el("p", "demo-note", T("هذه محاكاة: لا يوجد خادم حقيقي ولا إرسال بريد فعلي ولا حدّ لعدد المحاولات. الاتصال والواتساب يعملان كروابط عادية.", "This is a simulation: no real server, no real e-mail and no rate limits. Call and WhatsApp work as normal links.")));
    openPanel(T("دليل التجربة", "Demo guide"), box);
  }

  // ---- mailbox ----
  function mailbox() {
    var mails = window.__demoStore.mails(), box = el("div");
    if (!mails.length) box.appendChild(el("p", "demo-note", T("لا توجد رسائل بعد. اطلب استعادة كلمة المرور من صفحة الدخول.", "No messages yet. Request a password reset from the login page.")));
    mails.forEach(function (m) {
      var c = el("div", "demo-mail");
      c.innerHTML = "<div class=\"demo-mail-to\">" + T("إلى", "To") + ": <span dir=\"ltr\">" + esc(m.to) + "</span></div><strong>" + esc(m.subject) + "</strong><p>" + esc(m.text).replace(/\n/g, "<br>") + "</p>";
      if (m.link) {
        var open = el("a", "btn", T("فتح الرابط", "Open the link")); open.href = m.link;
        open.addEventListener("click", function () { panel.hidden = true; });
        c.appendChild(open);
      }
      box.appendChild(c);
    });
    openPanel(T("البريد التجريبي", "Demo mailbox"), box);
  }

  // ---- data export viewer (downloads are blocked in the viewer) ----
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="/api/me/export"]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    fetch("/api/me/export").then(function (r) { return r.json(); }).then(function (j) {
      var box = el("div"), pre = el("pre", "demo-pre"); pre.textContent = JSON.stringify(j, null, 2); pre.dir = "ltr";
      box.appendChild(pre); box.appendChild(copyBtn(function () { return pre.textContent; }));
      openPanel(T("بياناتي (JSON)", "My data (JSON)"), box);
    });
  }, true);

  // ---- bottom bar ----
  function bar() {
    var b = el("div", "demo-bar"); b.setAttribute("role", "toolbar");
    var back = el("button", "demo-btn", ""), mail = el("button", "demo-btn", ""), gd = el("button", "demo-btn", ""), rs = el("button", "demo-btn", ""), armed = false;
    [back, mail, gd, rs].forEach(function (x) { x.type = "button"; b.appendChild(x); });
    function labels() {
      back.textContent = "↩ " + T("رجوع", "Back"); back.disabled = !window.__vl.canBack();
      mail.textContent = "✉ " + T("البريد التجريبي", "Demo mailbox") + " (" + window.__demoStore.mails().length + ")";
      gd.textContent = "ℹ " + T("دليل التجربة", "Guide");
      rs.textContent = armed ? T("اضغط للتأكيد", "Tap to confirm") : "⟲ " + T("إعادة ضبط", "Reset");
    }
    back.addEventListener("click", function () { window.__vl.back(); });
    mail.addEventListener("click", mailbox);
    gd.addEventListener("click", guide);
    rs.addEventListener("click", function () {
      if (!armed) { armed = true; labels(); setTimeout(function () { armed = false; labels(); }, 3000); return; }
      armed = false; window.__demoStore.reset(); window.__vl.pushState(null, "", "/"); toast(T("أُعيدت البيانات التجريبية", "Demo data reset")); labels();
    });
    window.addEventListener("demo-nav", labels); window.addEventListener("demo-mail", function () { labels(); toast(T("وصلتك رسالة في البريد التجريبي", "A message arrived in the demo mailbox")); });
    new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    labels(); document.body.appendChild(b);
  }

  function init() {
    bar();
    var seen = false; try { seen = localStorage.getItem("qg_demo_seen") === "1"; localStorage.setItem("qg_demo_seen", "1"); } catch (e) {}
    if (!seen) setTimeout(guide, 400);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
