"use strict";
// One-command local copy of the platform with demo data.
//   npm run demo            start (opens the browser)
//   npm run demo -- --reset wipe the demo database first
//   NO_OPEN=1 / PORT=9000 / HOST=0.0.0.0 (reachable from your phone on the same Wi-Fi) are optional.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 9)) {
  console.error(`\nNode.js 22.9 or newer is required (you have ${process.versions.node}).\nDownload it from https://nodejs.org and run this again.\n`);
  process.exit(1);
}

const DB = process.env.DB_FILE || path.join(__dirname, "..", "data", "demo.db");
if (process.argv.includes("--reset")) {
  for (const f of [DB, DB + "-wal", DB + "-shm"]) fs.rmSync(f, { force: true });
  console.log("Demo database wiped.");
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@demo.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "demo-admin-1234";
process.env.DB_FILE = DB;
process.env.ADMIN_EMAIL = ADMIN_EMAIL;
process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "console"; // password-reset e-mails are printed here
const host = process.env.HOST || "127.0.0.1";                          // local only unless you ask otherwise

const { createApp } = require("../server/server");
const { server } = createApp();

function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try { spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref(); } catch { /* the URL is printed anyway */ }
}

let port = Number(process.env.PORT) || 8000, tries = 0;
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && tries++ < 20) { port++; server.listen(port, host); return; }
  console.error("Could not start the server:", e.message); process.exit(1);
});
server.on("listening", () => {
  const url = `http://localhost:${port}`;
  console.log(`
============================================================
  Qatar Guide is running:   ${url}
  دليل قطر يعمل على:        ${url}

  Admin login / دخول الأدمن
    e-mail:    ${ADMIN_EMAIL}
    password:  ${ADMIN_PASSWORD}

  - Demo data. Anyone can register; e-mails (password reset)
    are printed in this window instead of being sent.
  - Data is kept in: ${(() => { const r = path.relative(process.cwd(), DB); return r && !r.startsWith("..") ? r : DB; })()}
  - Press Ctrl+C to stop.
============================================================
`);
  openBrowser(url);
});
server.listen(port, host);

const stop = () => server.close(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
