# claude-test
test repository for claude

## دليل قطر / Qatar Business Guide
دليل أعمال وخدمات ثنائي اللغة (عربي/إنجليزي) للسوق القطري. واجهة ثابتة + خادم Node بدون أي مكتبات خارجية + SQLite.

### جرّبه الآن
**بدون تثبيت:** افتح `demo/qatar-guide-demo.html` في أي متصفح (نسخة محاكاة تعمل داخل المتصفح، البيانات عندك فقط).

**الخادم الحقيقي (نقرتان):**
ثبّت [Node.js 22.9+](https://nodejs.org) ثم شغّل `start-demo.bat` (Windows) أو `start-demo.command` (macOS) أو `sh start-demo.sh` (Linux).
أو من الطرفية: `npm run demo` ← يُفتح `http://localhost:8000` ببيانات تجريبية. التفاصيل: **[QUICKSTART.md](QUICKSTART.md)**.

### الأدلة
| الملف | المحتوى |
|---|---|
| [QUICKSTART.md](QUICKSTART.md) | تشغيل نسخة محلية بنقرتين / npm / Docker |
| [DEPLOY.md](DEPLOY.md) | النشر على Railway خطوة بخطوة |
| [EMAIL.md](EMAIL.md) | البريد: تفعيل الحساب واستعادة كلمة المرور |
| [SEO.md](SEO.md) | تحسين محركات البحث |
| [LISTINGS.md](LISTINGS.md) | تعديل الأنشطة (بمراجعة) ورفع الصور |
| [LEGAL.md](LEGAL.md) | الخصوصية والشروط وحقوق المستخدم (**تحتاج مراجعة محامٍ**) |
| [STATUS.md](STATUS.md) | ما أُنجز وما بقي |

### الميزات
تسجيل/دخول/خروج، **تفعيل البريد عند التسجيل وتغيير البريد**، **استعادة كلمة المرور بالبريد وتغييرها**، إضافة نشاط (يبقى قيد المراجعة) **وتعديله بمراجعة، ورفع صور** (JPEG/PNG بعد تنظيفها من بيانات الموقع)، لوحة أدمن، تقييمات حقيقية، بحث وفلترة، اتصال وواتساب، عربي/إنجليزي بروابط منفصلة، SEO، صفحتا الخصوصية والشروط، تنزيل البيانات وحذف الحساب، وضع داكن.

### الأوامر
`npm run demo` · `npm run build:demo` · `npm run dev` (يقرأ `.env`) · `npm start` · `npm test` · `npm run backup`

### الأمان
كلمات المرور بـ scrypt + salt، جلسات بتوكن مُجزّأ في كوكي HttpOnly/SameSite، حد للمحاولات، رفض الطلبات غير JSON، CSP صارم، `Referrer-Policy: no-referrer`، حماية من path traversal.
