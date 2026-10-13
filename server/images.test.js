"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { inspect, MAX_BYTES } = require("./images");

const fx = (n) => fs.readFileSync(path.join(__dirname, "fixtures", n));
const code = (fn) => { try { fn(); } catch (e) { return e.code; } return null; };
const crcChunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
};

test("JPEG: EXIF, comments and trailing bytes are removed; size and structure are read from the file", () => {
  const src = fx("photo.jpg");
  assert.ok(src.includes("SECRET-CAMERA-MAKE") && src.includes("SECRET-COMMENT"), "fixture really carries metadata");
  const withTail = Buffer.concat([src, Buffer.from("<?php system($_GET['c']); ?>")]);
  const r = inspect(withTail);
  assert.deepEqual([r.type, r.width, r.height], ["jpeg", 200, 150]);
  assert.equal(r.data[0], 0xff); assert.equal(r.data[1], 0xd8);
  assert.deepEqual([...r.data.subarray(-2)], [0xff, 0xd9]);
  for (const s of ["SECRET", "Exif", "<?php"]) assert.ok(!r.data.includes(s), `${s} must be gone`);
  assert.ok(r.data.length < src.length);
  assert.deepEqual(inspect(r.data).data, r.data, "cleaning is idempotent");
});

test("JPEG: progressive files (multiple scans) survive", () => {
  const r = inspect(fx("progressive.jpg"));
  assert.deepEqual([r.type, r.width, r.height], ["jpeg", 160, 120]);
  assert.deepEqual(inspect(r.data).data, r.data);
});

test("PNG: text chunks are removed, dimensions read, CRCs valid", () => {
  const src = fx("photo.png");
  assert.ok(src.includes("SECRET-PNG-AUTHOR"));
  const r = inspect(Buffer.concat([src, Buffer.from("TRAILING-PAYLOAD")]));
  assert.deepEqual([r.type, r.width, r.height], ["png", 120, 90]);
  assert.ok(!r.data.includes("SECRET") && !r.data.includes("TRAILING") && !r.data.includes("tEXt"));
  assert.deepEqual(inspect(r.data).data, r.data);
});

test("rejects anything that is not a well-formed JPEG/PNG", () => {
  assert.equal(code(() => inspect(Buffer.alloc(0))), "invalid_image");
  assert.equal(code(() => inspect(Buffer.from("GIF89a....................................."))), "unsupported_image_type");
  assert.equal(code(() => inspect(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"))), "unsupported_image_type");
  assert.equal(code(() => inspect(Buffer.from("<html><script>alert(1)</script></html>"))), "unsupported_image_type");
  assert.equal(code(() => inspect(Buffer.from("RIFF....WEBPVP8 "))), "unsupported_image_type", "WebP is converted to JPEG by the browser instead");
  const jpg = fx("photo.jpg");
  assert.equal(code(() => inspect(jpg.subarray(0, jpg.length - 40))), "invalid_image", "truncated JPEG");
  assert.equal(code(() => inspect(Buffer.concat([jpg.subarray(0, 2), Buffer.alloc(50, 0x41)]))), "invalid_image");
  const png = fx("photo.png");
  const broken = Buffer.from(png); broken[40] ^= 0xff;
  assert.equal(code(() => inspect(broken)), "invalid_image", "CRC mismatch");
  assert.equal(code(() => inspect(png.subarray(0, png.length - 12))), "invalid_image", "missing IEND");
});

test("rejects absurd or tiny dimensions", () => {
  const ihdr = (w, h) => { const d = Buffer.alloc(13); d.writeUInt32BE(w, 0); d.writeUInt32BE(h, 4); d[8] = 8; d[9] = 2; return crcChunk("IHDR", d); };
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const make = (w, h) => Buffer.concat([sig, ihdr(w, h), crcChunk("IDAT", zlib.deflateSync(Buffer.from([0]))), crcChunk("IEND", Buffer.alloc(0))]);
  assert.equal(code(() => inspect(make(30000, 30000))), "image_too_large_dimensions");
  assert.equal(code(() => inspect(make(7000, 7000))), "image_too_large_dimensions", "49M pixels");
  assert.equal(code(() => inspect(make(4, 4))), "image_too_small");
  assert.equal(inspect(make(64, 64)).width, 64);
});

test("rejects files over the size limit", () => {
  assert.equal(code(() => inspect(Buffer.concat([fx("photo.jpg"), Buffer.alloc(MAX_BYTES)]))), "image_too_big");
});
