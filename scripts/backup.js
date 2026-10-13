"use strict";
// Usage: DB_FILE=/data/app.db npm run backup [-- output.db]
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const src = process.env.DB_FILE || path.join(__dirname, "..", "data", "app.db");
const out = process.argv[2] || `${src}.backup-${new Date().toISOString().slice(0, 10)}.db`;
const db = new DatabaseSync(src);
db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`); // consistent online snapshot
db.close();
console.log("backup written:", out);
