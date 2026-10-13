"use strict";
// Transactional e-mail without dependencies.
//   EMAIL_PROVIDER=resend  -> HTTPS API (needs RESEND_API_KEY and EMAIL_FROM)
//   EMAIL_PROVIDER=console -> prints the e-mail to the terminal (local development / demo)
//   unset in production    -> disabled (password reset is switched off, nothing is sent)
// HTTPS APIs are used instead of SMTP because many hosts (including some Railway plans) block outbound SMTP ports.

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function createMailer(env = process.env) {
  const provider = env.EMAIL_PROVIDER || (env.NODE_ENV === "production" ? "" : "console");

  if (provider === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM");
    return {
      name: "resend",
      async send({ to, subject, text, html }) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
          signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) throw new Error(`resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
    };
  }
  if (provider === "console") {
    return { name: "console", async send({ to, subject, text }) { console.log(`\n[email:console] to=${to}\nsubject: ${subject}\n${text}\n`); } };
  }
  if (provider) throw new Error(`Unknown EMAIL_PROVIDER "${provider}" (use "resend" or "console")`);
  return { name: "none", async send() { throw new Error("e-mail is not configured"); } };
}

const BRAND = { ar: "دليل قطر", en: "Qatar Guide" };

function wrap(lang, bodyHtml) {
  return `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.8;color:#1f1a1c;max-width:520px">${bodyHtml}</div>`;
}

function resetEmail(lang, { name, link, minutes }) {
  if (lang === "en") {
    return {
      subject: `Reset your password – ${BRAND.en}`,
      text: `Hello ${name},\n\nWe received a request to reset your ${BRAND.en} password. Open this link to choose a new one (valid for ${minutes} minutes, works once):\n\n${link}\n\nIf you did not request this, ignore this e-mail: your password stays unchanged.`,
      html: wrap("en", `<p>Hello ${esc(name)},</p><p>We received a request to reset your ${BRAND.en} password. The link is valid for ${minutes} minutes and works once.</p><p><a href="${esc(link)}" style="background:#8a1538;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Choose a new password</a></p><p>Or copy this address into your browser:<br><span dir="ltr">${esc(link)}</span></p><p>If you did not request this, ignore this e-mail: your password stays unchanged.</p>`)
    };
  }
  return {
    subject: `استعادة كلمة المرور – ${BRAND.ar}`,
    text: `مرحبًا ${name}،\n\nوصلنا طلب لاستعادة كلمة مرور حسابك في ${BRAND.ar}. افتح هذا الرابط لاختيار كلمة مرور جديدة (صالح لمدة ${minutes} دقيقة ويعمل مرة واحدة):\n\n${link}\n\nإن لم تطلب ذلك فتجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.`,
    html: wrap("ar", `<p>مرحبًا ${esc(name)}،</p><p>وصلنا طلب لاستعادة كلمة مرور حسابك في ${BRAND.ar}. الرابط صالح لمدة ${minutes} دقيقة ويعمل مرة واحدة.</p><p><a href="${esc(link)}" style="background:#8a1538;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">اختر كلمة مرور جديدة</a></p><p>أو انسخ هذا العنوان إلى المتصفح:<br><span dir="ltr">${esc(link)}</span></p><p>إن لم تطلب ذلك فتجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.</p>`)
  };
}

function verifyEmail(lang, { name, link, hours }) {
  if (lang === "en") {
    return {
      subject: `Confirm your e-mail – ${BRAND.en}`,
      text: `Hello ${name},\n\nWelcome to ${BRAND.en}. Confirm that this e-mail address is yours by opening the link below (valid for ${hours} hours):\n\n${link}\n\nIf you did not create this account, ignore this e-mail.`,
      html: wrap("en", `<p>Hello ${esc(name)},</p><p>Welcome to ${BRAND.en}. Confirm that this e-mail address is yours. The link is valid for ${hours} hours.</p><p><a href="${esc(link)}" style="background:#8a1538;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Confirm my e-mail</a></p><p>Or copy this address into your browser:<br><span dir="ltr">${esc(link)}</span></p><p>If you did not create this account, ignore this e-mail.</p>`)
    };
  }
  return {
    subject: `فعّل بريدك الإلكتروني – ${BRAND.ar}`,
    text: `مرحبًا ${name}،\n\nأهلًا بك في ${BRAND.ar}. أكّد أن هذا البريد لك بفتح الرابط التالي (صالح لمدة ${hours} ساعة):\n\n${link}\n\nإن لم تنشئ هذا الحساب فتجاهل هذه الرسالة.`,
    html: wrap("ar", `<p>مرحبًا ${esc(name)}،</p><p>أهلًا بك في ${BRAND.ar}. أكّد أن هذا البريد لك. الرابط صالح لمدة ${hours} ساعة.</p><p><a href="${esc(link)}" style="background:#8a1538;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">تفعيل بريدي</a></p><p>أو انسخ هذا العنوان إلى المتصفح:<br><span dir="ltr">${esc(link)}</span></p><p>إن لم تنشئ هذا الحساب فتجاهل هذه الرسالة.</p>`)
  };
}

// sent to the OLD address when the account e-mail is changed (account-takeover warning)
function emailChangedNotice(lang, { name, newEmail }) {
  if (lang === "en") {
    return {
      subject: `Your account e-mail was changed – ${BRAND.en}`,
      text: `Hello ${name},\n\nThe e-mail of your ${BRAND.en} account was changed to ${newEmail}. If this was not you, contact us immediately.`,
      html: wrap("en", `<p>Hello ${esc(name)},</p><p>The e-mail of your ${BRAND.en} account was changed to <span dir="ltr">${esc(newEmail)}</span>.</p><p>If this was not you, contact us immediately.</p>`)
    };
  }
  return {
    subject: `تم تغيير بريد حسابك – ${BRAND.ar}`,
    text: `مرحبًا ${name}،\n\nتم تغيير بريد حسابك في ${BRAND.ar} إلى ${newEmail}. إن لم تكن أنت من فعل ذلك فتواصل معنا فورًا.`,
    html: wrap("ar", `<p>مرحبًا ${esc(name)}،</p><p>تم تغيير بريد حسابك في ${BRAND.ar} إلى <span dir="ltr">${esc(newEmail)}</span>.</p><p>إن لم تكن أنت من فعل ذلك فتواصل معنا فورًا.</p>`)
  };
}

function changedEmail(lang, { name }) {
  if (lang === "en") {
    return {
      subject: `Your password was changed – ${BRAND.en}`,
      text: `Hello ${name},\n\nThe password of your ${BRAND.en} account was just changed and all other devices were signed out. If this was not you, reset your password immediately and contact us.`,
      html: wrap("en", `<p>Hello ${esc(name)},</p><p>The password of your ${BRAND.en} account was just changed and all other devices were signed out.</p><p>If this was not you, reset your password immediately and contact us.</p>`)
    };
  }
  return {
    subject: `تم تغيير كلمة مرورك – ${BRAND.ar}`,
    text: `مرحبًا ${name}،\n\nتم للتو تغيير كلمة مرور حسابك في ${BRAND.ar} وتسجيل الخروج من الأجهزة الأخرى. إن لم تكن أنت من فعل ذلك فاستعد كلمة المرور فورًا وتواصل معنا.`,
    html: wrap("ar", `<p>مرحبًا ${esc(name)}،</p><p>تم للتو تغيير كلمة مرور حسابك في ${BRAND.ar} وتسجيل الخروج من الأجهزة الأخرى.</p><p>إن لم تكن أنت من فعل ذلك فاستعد كلمة المرور فورًا وتواصل معنا.</p>`)
  };
}

module.exports = { createMailer, resetEmail, changedEmail, verifyEmail, emailChangedNotice };
