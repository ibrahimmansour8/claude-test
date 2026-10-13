"use strict";
// Builds the single-file demo: the real frontend (site/*) + the real server-rendered shell and legal pages,
// with an in-browser API simulation. No server needed to open it.
//   node scripts/build-demo.js  ->  demo/qatar-guide-demo.html (standalone) and demo/artifact-fragment.html
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

process.env.EMAIL_PROVIDER = "console";
process.env.DB_FILE = ":memory:";
const { createApp } = require("../server/server");

function must(src, find, replacement, label) {
  if (!src.includes(find)) throw new Error(`build-demo: pattern not found (${label}). The frontend changed; update scripts/build-demo.js`);
  return src.split(find).join(replacement);
}

async function main() {
  const { server } = createApp({ dbFile: ":memory:", siteUrl: "https://demo.local", operatorName: "Qatar Guide (demo)", contactEmail: "demo@example.com" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (p) => (await fetch(base + p)).text();

  // 1) header / main / footer exactly as the real server renders them
  const home = await get("/");
  const start = home.indexOf('<header class="topbar">'), end = home.indexOf('<script src="/data.js"');
  if (start < 0 || end < 0) throw new Error("build-demo: shell markers not found");
  const shell = home.slice(start, end).replace(/ data-native/g, "").trim();

  // 2) legal pages (rendered by the real server code, both languages)
  const LEGAL = { ar: {}, en: {} };
  for (const [lang, pre] of [["ar", ""], ["en", "/en"]]) {
    for (const page of ["privacy", "terms"]) {
      const html = await get(`${pre}/${page}`);
      LEGAL[lang][page] = {
        title: html.match(/<h1>(.*?)<\/h1>/)[1],
        html: html.match(/<main id="app" tabindex="-1">([\s\S]*?)<\/main>/)[1]
      };
    }
  }
  server.close();

  // 3) frontend, adapted: virtual router + sandbox-safe dialogs, nothing else
  let app = read("site", "app.js");
  app = must(app, "history.pushState(", "__vl.pushState(", "pushState");
  app = must(app, "history.replaceState(", "__vl.replaceState(", "replaceState");
  app = must(app, 'window.addEventListener("popstate", render)', "__vl.onpop(render)", "popstate");
  app = must(app, "location.reload()", "__vl.reload()", "reload");
  for (const k of ["pathname", "search", "origin", "hash"]) app = must(app, `location.${k}`, `__vl.${k}`, `location.${k}`);
  app = must(app, ' download="my-data.json"', "", "download attribute"); // the viewer blocks downloads; demo-ui shows the data in a panel instead
  app = must(app, "window.confirm(", "__demo.confirm(", "confirm");
  app = must(app, "alert(errMsg(err))", "__demo.toast(errMsg(err))", "alert");
  app = must(app, 'data-native target="_blank" rel="noopener" ', "", "consent links");
  const legalBlock = /if \(r\.path === "\/privacy" \|\| r\.path === "\/terms"\) \{[\s\S]*?\n      return;\n    \}\n/;
  if (!legalBlock.test(app)) throw new Error("build-demo: legal block not found");
  app = app.replace(legalBlock, () => `if (r.path === "/privacy" || r.path === "/terms") {
      var L0 = window.__LEGAL[lang][r.path.slice(1)];
      document.getElementById("app").innerHTML = L0.html; setHead(L0.title + " | " + t("brand"), L0.title, "index,follow");
      var lb0 = document.getElementById("langBtn"); lb0.setAttribute("href", altPath); lb0.textContent = lang === "ar" ? "EN" : "عربي";
      bind(); window.scrollTo(0, 0);
      return;
    }
`);

  const js = [
    read("site", "data.js"),
    "window.__LEGAL = " + JSON.stringify(LEGAL).replace(/</g, "\\u003c") + ";",
    read("scripts", "demo-assets", "mock-api.js"),
    read("scripts", "demo-assets", "demo-ui.js"),
    app
  ].join("\n;\n");
  if (/<\/script/i.test(js)) throw new Error("build-demo: inlined JS contains </script");
  const css = read("site", "styles.css") + "\n" + read("scripts", "demo-assets", "demo.css");

  const title = "<title>Qatar Guide</title>";
  const fragment = `${title}\n<style>\n${css}\n</style>\n${shell}\n<script>\n${js}\n</script>\n`;
  const standalone = `<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${title}\n<style>\n${css}\n</style>\n</head>\n<body>\n${shell}\n<script>\n${js}\n</script>\n</body>\n</html>\n`;

  const out = process.env.OUT_DIR || path.join(root, "demo");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "qatar-guide-demo.html"), standalone);
  fs.writeFileSync(path.join(out, "artifact-fragment.html"), fragment);
  console.log(`built ${path.relative(root, out) || "."}/qatar-guide-demo.html (${(standalone.length / 1024).toFixed(0)} KB) and demo/artifact-fragment.html (${(fragment.length / 1024).toFixed(0)} KB)`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
