"use strict";
// Legal pages (Privacy Policy, Terms of Use) in Arabic and English.
// The text describes what THIS software actually does. It is a template, not legal advice:
// have a qualified lawyer review it before launch (see LEGAL.md).

const LEGAL_VERSION = "2026-10-13-r4"; // bump on every change of the texts; "-rN" = revision within a day
const shownDate = () => LEGAL_VERSION.split("-r")[0];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Each section: [heading, [paragraph | {ul:[...]}, ...]]. {{op}} = operator, {{mail}} = contact e-mail.
const TEXT = {
  ar: {
    privacy: {
      title: "سياسة الخصوصية", desc: "كيف يجمع دليل قطر بياناتك الشخصية ويستخدمها ويحميها، وما هي حقوقك.",
      sections: [
        ["من نحن", ["يُدير هذا الموقع «{{op}}» (ويُشار إليه بـ«نحن»). هو دليل للأنشطة التجارية والخدمات في دولة قطر. للتواصل بخصوص خصوصيتك: {{mail}}."]],
        ["البيانات التي نجمعها", [
          { ul: [
            "<strong>بيانات الحساب:</strong> الاسم والبريد الإلكتروني وكلمة المرور. لا نحفظ كلمة المرور نفسها، بل نحفظ بصمة مشفّرة (مملّحة) لا نستطيع قراءتها.",
            "<strong>بيانات الأنشطة التي تضيفها:</strong> اسم النشاط وتصنيفه ومدينته ومنطقته ووصفه ورقم هاتفه.",
            "<strong>الصور:</strong> الصور التي ترفعها لنشاطك. نحذف منها بيانات الكاميرا والموقع (EXIF) قبل حفظها في قاعدة بياناتنا، وتظهر للجميع بعد مراجعتنا لها.",
            "<strong>التقييمات:</strong> عدد النجوم والتعليق الذي تكتبه، ويظهر معه اسمك.",
            "<strong>سجل الموافقة:</strong> وقت موافقتك على الشروط وسياسة الخصوصية ونسخة النص التي وافقت عليها.",
            "<strong>تفعيل البريد:</strong> نرسل رابط تفعيل إلى بريدك ونحفظ بصمة الرمز فقط (يُحذف بعد الاستخدام أو بعد 24 ساعة) ونسجّل وقت تفعيل بريدك.",
            "<strong>رمز استعادة كلمة المرور:</strong> عند طلبك الاستعادة ننشئ رمزًا مؤقتًا نحفظ بصمته فقط، ويُحذف بعد استخدامه أو بعد ساعة.",
            "<strong>بيانات تقنية:</strong> عنوان IP يُستخدم مؤقتًا في ذاكرة الخادم للحدّ من محاولات الدخول والتسجيل المتكررة ولا نحفظه في قاعدة البيانات. قد يحتفظ مزوّد الاستضافة بسجلات تقنية معتادة."
          ] }
        ]],
        ["لماذا نستخدم بياناتك", [
          { ul: [
            "إنشاء حسابك وتسجيل دخولك وحمايته، والتأكد من أن البريد يعود لك ومنع إساءة الاستخدام.",
            "نشر الأنشطة والتقييمات بعد المراجعة، وإدارة المحتوى ومنع إساءة الاستخدام.",
            "تحسين ظهور الدليل في محركات البحث (للأنشطة والتقييمات المنشورة فقط)."
          ] },
          "أساس المعالجة هو موافقتك عند التسجيل وتقديمنا للخدمة التي طلبتها. لا نستخدم بياناتك للإعلانات ولا نبيعها."
        ]],
        ["ما يكون عامًّا", ["بعد اعتماد النشاط يظهر للجميع: اسمه ووصفه ومنطقته وساعات عمله ورقم هاتفه وصوره المعتمدة. وتظهر التقييمات مع الاسم الذي سجّلت به. يمكن لمحركات البحث فهرسة هذه الصفحات. لا تضع في وصف نشاطك أو تعليقك أو صورك معلومات شخصية لا تريد نشرها (مثل وجوه أشخاص دون إذنهم)."]],
        ["ملفات تعريف الارتباط (الكوكيز)", ["نستخدم كوكي واحدًا ضروريًا للتشغيل باسم <code>sid</code> لإبقائك مسجّلًا للدخول (مدته حتى 7 أيام، وهو محمي من الوصول عبر JavaScript ولا يُرسل إلا عبر اتصال آمن عند النشر). لا نستخدم كوكيز إعلانية أو تحليلية ولا أدوات تتبّع من أطراف خارجية. اللغة محفوظة في رابط الصفحة وليس في كوكي."]],
        ["مشاركة البيانات", [
          "لا نبيع بياناتك. قد تُعالَج البيانات لدى مزوّد استضافة سحابي نستخدمه لتشغيل الموقع، وقد يكون خوادمه خارج دولة قطر. وقد نكشف عن بيانات عند وجود إلزام قانوني من جهة مختصة.",
          "نستخدم مزوّد خدمة بريد إلكتروني لإرسال رسائل الحساب فقط (تفعيل البريد واستعادة كلمة المرور وإشعارات تغييرهما). يستلم المزوّد بريدك واسمك ومحتوى الرسالة لهذا الغرض، ولا نستخدمه للتسويق.",
          "أزرار «واتساب» و«اتصال» تفتح تطبيقات أطراف ثالثة؛ وتخضع بياناتك فيها لسياساتها."
        ]],
        ["مدة الاحتفاظ", ["نحتفظ بحسابك وبياناتك ما دام حسابك قائمًا. عند حذف حسابك نحذف ملفك وتقييماتك وكل الأنشطة التي أضفتها وصورها. الحسابات التي لم يُفعَّل بريدها ولا تملك أي محتوى تُحذف تلقائيًا بعد 7 أيام. قد تبقى نسخ احتياطية لفترة محدودة قبل أن تُستبدل بالدورة الاعتيادية للنسخ."]],
        ["حقوقك", [
          "وفق قانون حماية خصوصية البيانات الشخصية في دولة قطر، لك حقوق منها: الاطلاع على بياناتك، وتصحيحها، وطلب حذفها، وسحب موافقتك، والاعتراض على المعالجة. يمكنك:",
          { ul: [
            "<strong>تنزيل بياناتك</strong> وحذف حسابك مباشرة من صفحة «حسابي» داخل الموقع.",
            "طلب تصحيح أي بيانات أو ممارسة أي حق آخر بمراسلتنا على {{mail}}.",
            "تقديم شكوى إلى الجهة المختصة في دولة قطر إن رأيت أن بياناتك عولجت بشكل مخالف."
          ] }
        ]],
        ["الأمان", ["نطبّق إجراءات معقولة: تشفير كلمات المرور، وجلسات محمية، وتحديد محاولات الدخول، واتصال مشفّر. لا توجد حماية مطلقة، وتقع عليك مسؤولية سرية كلمة مرورك."]],
        ["الأطفال", ["الموقع غير موجّه لمن هم دون 18 عامًا، ولا نجمع بياناتهم عن علم. إذا علمنا بحساب لقاصر نحذفه."]],
        ["التغييرات على هذه السياسة", ["قد نحدّث هذه السياسة، وسيظهر تاريخ آخر تحديث أدناه. للتغييرات الجوهرية نبلّغك بوسيلة مناسبة."]]
      ]
    },
    terms: {
      title: "شروط الاستخدام", desc: "الشروط التي تحكم استخدامك لدليل قطر: الحسابات والأنشطة والتقييمات والمسؤولية.",
      sections: [
        ["القبول", ["باستخدامك الموقع أو إنشاء حساب فيه فإنك توافق على هذه الشروط وعلى سياسة الخصوصية. إن لم توافق فلا تستخدم الموقع."]],
        ["طبيعة الخدمة", ["الموقع دليل معلومات يعرض أنشطة وخدمات يضيفها مستخدمون. لسنا طرفًا في أي اتفاق أو تعامل بينك وبين أي نشاط، ولا نضمن دقة المعلومات أو جودة الخدمات أو توفّرها. تحقّق بنفسك قبل التعامل."]],
        ["الحسابات", [
          { ul: [
            "يجب أن تكون 18 عامًا أو أكثر وأن تقدّم معلومات صحيحة.",
            "أنت مسؤول عن سرية كلمة مرورك وعن كل ما يجري عبر حسابك.",
            "يجوز لنا تعليق الحساب أو إغلاقه عند مخالفة هذه الشروط."
          ] }
        ]],
        ["إضافة الأنشطة", [
          { ul: [
            "لا تضف إلا نشاطًا تملكه أو مخوّلًا بتمثيله، وبمعلومات صحيحة غير مضلّلة، ورقم هاتف قطري يخصّه.",
            "يُمنع إدراج أنشطة أو سلع أو خدمات مخالفة لقوانين دولة قطر أو الآداب العامة.",
            "تخضع الأنشطة لمراجعتنا؛ ولنا قبولها أو رفضها أو تعديلها أو إزالتها في أي وقت دون التزام بإبداء الأسباب.",
            "تعديلاتك على نشاط منشور تُراجَع أيضًا؛ وتبقى النسخة المعتمدة معروضة حتى الموافقة.",
            "لا ترفع إلا صورًا تملك حق نشرها (صورك أو بإذن صاحبها) ولا تحتوي محتوى مخالفًا أو صور أشخاص دون إذنهم. لنا رفض أي صورة أو حذفها في أي وقت.",
            "شارة «موثّق» تعني أننا راجعنا بعض المعلومات؛ وهي ليست ضمانًا ولا توصية بالنشاط."
          ] }
        ]],
        ["التقييمات", [
          { ul: [
            "اكتب تقييمًا عن تجربة حقيقية فقط. يُمنع التقييم المزوّر أو المدفوع أو تقييم نشاطك أو منافسك للإضرار به.",
            "يُسمح بتقييم واحد لكل نشاط لكل مستخدم، ويمكنك تعديله أو حذفه.",
            "يُمنع في التعليقات السبّ والتشهير والتحريض ونشر بيانات شخصية للآخرين والإعلانات والروابط المزعجة.",
            "لنا إزالة أي تقييم مخالف."
          ] }
        ]],
        ["سلوك محظور", [
          { ul: ["محاولة اختراق الموقع أو تعطيله أو تجاوز حدود الاستخدام.", "انتحال شخصية أو جهة.", "جمع بيانات الموقع آليًا بشكل مفرط أو إعادة نشرها دون إذن."] }
        ]],
        ["المحتوى الذي تنشره", ["تبقى حقوق المحتوى الذي تضيفه لك. وبنشره تمنحنا ترخيصًا غير حصري ومجانيًّا لعرضه وتخزينه وتهيئته للعرض في الموقع وفي نتائج محركات البحث ما دام منشورًا. وتقرّ بأن لك حق نشره."]],
        ["إخلاء المسؤولية وحدودها", ["تُقدَّم الخدمة «كما هي» دون ضمانات من أي نوع. وفي الحدود التي يسمح بها القانون لا نتحمّل مسؤولية عن خسائر غير مباشرة أو تبعية أو عن تعاملك مع الأنشطة المدرجة. لا يستبعد هذا النص أي مسؤولية لا يجوز استبعادها نظامًا."]],
        ["إنهاء الاستخدام", ["يمكنك حذف حسابك في أي وقت من صفحة «حسابي». وللموقع إيقاف الخدمة أو تعديلها."]],
        ["القانون المطبّق", ["تخضع هذه الشروط لقوانين دولة قطر، وتختص محاكمها بالنظر في أي نزاع ينشأ عنها."]],
        ["التغييرات والتواصل", ["قد نعدّل هذه الشروط، واستمرارك في الاستخدام بعد التعديل يعني قبولك. للاستفسار: {{mail}}."]]
      ]
    },
    updated: "آخر تحديث", mail_missing: "[البريد الإلكتروني للتواصل غير مضبوط: اضبط CONTACT_EMAIL]", home: "الرئيسية", legal_crumb: "قانوني"
  },
  en: {
    privacy: {
      title: "Privacy Policy", desc: "How Qatar Guide collects, uses and protects your personal data, and what rights you have.",
      sections: [
        ["Who we are", ["This website is operated by “{{op}}” (“we”). It is a directory of businesses and services in the State of Qatar. Privacy contact: {{mail}}."]],
        ["Data we collect", [
          { ul: [
            "<strong>Account data:</strong> name, e-mail and password. We never store the password itself, only a salted cryptographic hash that we cannot read.",
            "<strong>Listings you submit:</strong> business name, category, city, area, description and phone number.",
            "<strong>Photos:</strong> the photos you upload for your business. We remove camera and location data (EXIF) before storing them in our database, and they become visible to everyone after we review them.",
            "<strong>Reviews:</strong> the star rating and comment you write, displayed with your name.",
            "<strong>Consent record:</strong> when you accepted the Terms and Privacy Policy and which version of the text.",
            "<strong>E-mail confirmation:</strong> we send a confirmation link to your address and store only the token’s hash (deleted once used or after 24 hours), and we record when you confirmed it.",
            "<strong>Password-reset token:</strong> when you request a reset we create a temporary token and store only its hash; it is deleted once used or after one hour.",
            "<strong>Technical data:</strong> your IP address is used temporarily in server memory to limit repeated login/sign-up attempts and is not stored in the database. Our hosting provider may keep standard technical logs."
          ] }
        ]],
        ["Why we use your data", [
          { ul: [
            "To create, secure and sign you in to your account, to confirm that the e-mail address is yours and to prevent abuse.",
            "To publish listings and reviews after moderation, run the site and prevent abuse.",
            "To make published listings and reviews discoverable in search engines."
          ] },
          "Our basis is your consent at sign-up and providing the service you requested. We do not use your data for advertising and we do not sell it."
        ]],
        ["What is public", ["Once a listing is approved, its name, description, area, opening hours, phone number and approved photos are visible to everyone, and reviews appear with the name you registered. Search engines may index these pages. Do not put personal information you do not want published in a listing, review or photo (for example, people’s faces without their consent)."]],
        ["Cookies", ["We use one strictly necessary cookie, <code>sid</code>, to keep you signed in (up to 7 days, not readable by JavaScript and sent only over a secure connection when deployed). We use no advertising or analytics cookies and no third-party trackers. Your language is kept in the page URL, not in a cookie."]],
        ["Sharing", [
          "We do not sell your data. It may be processed by a cloud hosting provider we use to run the site, whose servers may be outside the State of Qatar. We may disclose data where legally required by a competent authority.",
          "We use an e-mail delivery provider only to send account e-mails (e-mail confirmation, password reset and notices when they change). The provider receives your e-mail address, name and the message content for that purpose; we do not use it for marketing.",
          "The “WhatsApp” and “Call” buttons open third-party apps, whose own policies apply."
        ]],
        ["Retention", ["We keep your account and data while your account exists. When you delete your account we delete your profile, your reviews and every listing you submitted together with its photos. Accounts whose e-mail was never confirmed and that own no content are deleted automatically after 7 days. Backup copies may remain for a limited time until replaced in the normal backup cycle."]],
        ["Your rights", [
          "Under Qatar’s personal data privacy law you have rights including access, correction, erasure, withdrawal of consent and objection to processing. You can:",
          { ul: [
            "<strong>Download your data</strong> and delete your account directly from the “My account” page.",
            "Ask us to correct data or exercise any other right at {{mail}}.",
            "Complain to the competent authority in the State of Qatar if you believe your data was handled unlawfully."
          ] }
        ]],
        ["Security", ["We apply reasonable measures: password hashing, protected sessions, login rate limiting and encrypted connections. No system is perfectly secure, and keeping your password confidential is your responsibility."]],
        ["Children", ["The site is not directed to anyone under 18 and we do not knowingly collect their data. If we learn of an account held by a minor we delete it."]],
        ["Changes", ["We may update this policy; the last-updated date appears below. For material changes we will notify you by suitable means."]]
      ]
    },
    terms: {
      title: "Terms of Use", desc: "The terms governing your use of Qatar Guide: accounts, listings, reviews and liability.",
      sections: [
        ["Acceptance", ["By using the site or creating an account you agree to these Terms and to the Privacy Policy. If you do not agree, do not use the site."]],
        ["The service", ["The site is an information directory showing businesses and services submitted by users. We are not a party to any agreement or dealing between you and any business, and we do not guarantee the accuracy of information or the quality or availability of services. Do your own checks before dealing with anyone."]],
        ["Accounts", [
          { ul: [
            "You must be 18 or older and provide accurate information.",
            "You are responsible for keeping your password confidential and for everything done through your account.",
            "We may suspend or close an account that breaches these Terms."
          ] }
        ]],
        ["Listing a business", [
          { ul: [
            "Only list a business you own or are authorised to represent, with accurate, non-misleading information and its own Qatar phone number.",
            "Listings of businesses, goods or services that break the laws of the State of Qatar or public morals are prohibited.",
            "Listings are subject to our review; we may approve, reject, edit or remove them at any time without giving reasons.",
            "Changes to a published listing are reviewed too; the approved version stays live until approval.",
            "Only upload photos you have the right to publish (your own or with the owner’s permission) that contain nothing unlawful and no people without their consent. We may reject or remove any photo at any time.",
            "The “Verified” badge means we checked some information. It is not a guarantee or endorsement."
          ] }
        ]],
        ["Reviews", [
          { ul: [
            "Write a review only about a genuine experience. Fake, paid, self-reviews or reviews of competitors meant to harm them are prohibited.",
            "One review per business per user; you may edit or delete yours.",
            "Comments must not contain abuse, defamation, incitement, other people’s personal data, advertising or spam links.",
            "We may remove any review that breaches these rules."
          ] }
        ]],
        ["Prohibited conduct", [
          { ul: ["Attempting to hack, disrupt or bypass the limits of the site.", "Impersonating a person or organisation.", "Excessive automated scraping or republishing the site’s data without permission."] }
        ]],
        ["Content you post", ["You keep the rights to content you post. By posting it you grant us a non-exclusive, free licence to display, store and format it on the site and in search-engine results while it is published. You confirm you have the right to post it."]],
        ["Disclaimer and liability", ["The service is provided “as is” without warranties of any kind. To the extent permitted by law we are not liable for indirect or consequential losses or for your dealings with listed businesses. Nothing here excludes liability that cannot lawfully be excluded."]],
        ["Ending use", ["You can delete your account at any time from the “My account” page. We may change or discontinue the service."]],
        ["Governing law", ["These Terms are governed by the laws of the State of Qatar and its courts have jurisdiction over any dispute arising from them."]],
        ["Changes and contact", ["We may amend these Terms; continuing to use the site after a change means you accept it. Questions: {{mail}}."]]
      ]
    },
    updated: "Last updated", mail_missing: "[contact e-mail not configured: set CONTACT_EMAIL]", home: "Home", legal_crumb: "Legal"
  }
};

/** Returns { title, description, body } for page "privacy" | "terms". */
function renderLegal(page, lang, { operator, contactEmail, homeHref }) {
  const T = TEXT[lang], doc = T[page];
  const op = esc(operator || (lang === "ar" ? "دليل قطر" : "Qatar Guide"));
  const mail = contactEmail
    ? `<a class="link" href="mailto:${esc(contactEmail)}">${esc(contactEmail)}</a>`
    : `<strong>${esc(T.mail_missing)}</strong>`;
  const fill = (s) => s.replace(/\{\{op\}\}/g, op).replace(/\{\{mail\}\}/g, mail);
  const sections = doc.sections.map(([h, parts], i) =>
    `<section><h2>${i + 1}. ${esc(h)}</h2>` + parts.map((p) =>
      typeof p === "string" ? `<p>${fill(p)}</p>` : `<ul>${p.ul.map((li) => `<li>${fill(li)}</li>`).join("")}</ul>`).join("") + "</section>").join("");
  const body = `<div class="container"><nav class="crumbs" aria-label="breadcrumb"><a href="${esc(homeHref)}">${esc(lang === "ar" ? "دليل قطر" : "Qatar Guide")}</a> › <span>${esc(doc.title)}</span></nav>` +
    `<article class="legal"><h1>${esc(doc.title)}</h1><p class="meta">${esc(T.updated)}: ${shownDate()}</p>${sections}</article></div>`;
  return { title: doc.title, description: doc.desc, body };
}

module.exports = { renderLegal, LEGAL_VERSION };
