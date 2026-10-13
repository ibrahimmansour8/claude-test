"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("single-file demo builds and has everything the viewer needs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qd-demo-"));
  execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", path.join(__dirname, "..", "scripts", "build-demo.js")], { env: { ...process.env, OUT_DIR: dir } });
  const frag = fs.readFileSync(path.join(dir, "artifact-fragment.html"), "utf8");
  const full = fs.readFileSync(path.join(dir, "qatar-guide-demo.html"), "utf8");

  assert.ok(full.startsWith("<!doctype html>") && !/^<!doctype/i.test(frag), "standalone has a document skeleton, the artifact fragment does not");
  assert.match(frag.slice(0, 200), /<title>Qatar Guide<\/title>/);
  for (const html of [frag, full]) {
    assert.ok(html.includes("window.fetch = function"), "API simulation is bundled");
    assert.ok(html.includes("__vl.pushState(") && !html.includes("history.pushState("), "virtual router replaces pushState");
    assert.ok(!/ download=/.test(html), "no download links (blocked by the viewer)");
    assert.ok(!/window\.confirm\(|[^_.]alert\(/.test(html.replace(/__demo\.toast\(/g, "")), "no confirm()/alert() (never shown by the viewer)");
    assert.ok(!/<script[^>]+src=/.test(html), "no external or relative scripts");
    assert.equal((html.match(/<\/script>/g) || []).length, 1, "exactly one inline script");
    for (const t of ["سياسة الخصوصية", "Privacy Policy", "شروط الاستخدام", "Terms of Use"]) assert.ok(html.includes(t), t);
  }
  assert.ok(full.length < 300 * 1024, "stays small");
  fs.rmSync(dir, { recursive: true, force: true });
});
