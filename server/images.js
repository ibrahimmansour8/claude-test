"use strict";
// Upload validation without image libraries.
// Accepts JPEG and PNG only (the browser converts everything else to JPEG before upload).
// Every file is parsed structurally, rewritten WITHOUT metadata (EXIF/GPS, XMP, comments, text chunks, trailing bytes),
// and its real dimensions are read from the file itself. Anything malformed is rejected.

const zlib = require("node:zlib");

const MAX_BYTES = 2 * 1024 * 1024;       // upload size limit
const MIN_SIDE = 16;
const MAX_SIDE = 8000;
const MAX_PIXELS = 25_000_000;           // guards against decompression bombs in browsers

class ImageError extends Error { constructor(code) { super(code); this.code = code; } }
const bad = (code) => { throw new ImageError(code); };

function checkDims(width, height) {
  if (!(width >= MIN_SIDE && height >= MIN_SIDE)) bad("image_too_small");
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) bad("image_too_large_dimensions");
}

// ---------------------------------------------------------------- JPEG
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function cleanJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) bad("invalid_image");
  const out = [Buffer.from([0xff, 0xd8])];
  let i = 2, width = 0, height = 0, sawSos = false;

  while (i < buf.length) {
    if (buf[i] !== 0xff) bad("invalid_image");
    while (buf[i] === 0xff && i < buf.length) i++;          // fill bytes
    const marker = buf[i++];
    if (marker === 0xd9) {                                  // EOI: anything after it is dropped
      if (!width || !sawSos) bad("invalid_image");
      out.push(Buffer.from([0xff, 0xd9]));
      checkDims(width, height);
      return { type: "jpeg", width, height, data: Buffer.concat(out) };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue; // standalone markers
    if (i + 2 > buf.length) bad("invalid_image");
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) bad("invalid_image");
    const seg = buf.subarray(i, i + len);                   // includes the 2 length bytes
    const body = seg.subarray(2);
    i += len;

    if (SOF.has(marker)) {
      if (body.length < 6) bad("invalid_image");
      height = body.readUInt16BE(1); width = body.readUInt16BE(3);
    }
    // keep structural segments; keep JFIF (APP0), ICC colour profile (APP2) and Adobe (APP14, colour transform); drop the rest
    const isApp = marker >= 0xe0 && marker <= 0xef;
    let keep = !isApp && marker !== 0xfe;                   // not APPn, not COM
    if (marker === 0xe0 && body.subarray(0, 5).toString("latin1") === "JFIF\0") keep = true;
    if (marker === 0xe2 && body.subarray(0, 12).toString("latin1") === "ICC_PROFILE\0") keep = true;
    if (marker === 0xee && body.subarray(0, 5).toString("latin1") === "Adobe") keep = true;
    if (keep) out.push(Buffer.from([0xff, marker]), seg);

    if (marker === 0xda) {                                  // SOS: entropy-coded data follows, copied verbatim until the next real marker
      sawSos = true;
      const start = i;
      while (i < buf.length) {
        if (buf[i] === 0xff) {
          const n = buf[i + 1];
          if (n === 0x00 || (n >= 0xd0 && n <= 0xd7) || n === 0xff) { i += n === 0xff ? 1 : 2; continue; }
          break;                                            // a real marker
        }
        i++;
      }
      out.push(buf.subarray(start, i));
    }
  }
  return bad("invalid_image");                              // no EOI: truncated or corrupt
}

// ---------------------------------------------------------------- PNG
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP"]);

function cleanPng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) bad("invalid_image");
  const out = [PNG_SIG];
  let i = 8, width = 0, height = 0, first = true, idat = false;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i), type = buf.toString("latin1", i + 4, i + 8);
    if (len > buf.length || i + 12 + len > buf.length) bad("invalid_image");
    const data = buf.subarray(i + 8, i + 8 + len), crc = buf.readUInt32BE(i + 8 + len);
    if (zlib.crc32(buf.subarray(i + 4, i + 8 + len)) !== crc) bad("invalid_image");
    if (first) {
      if (type !== "IHDR" || len !== 13) bad("invalid_image");
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      checkDims(width, height);
      first = false;
    }
    if (type === "IDAT") idat = true;
    if (PNG_KEEP.has(type)) out.push(buf.subarray(i, i + 12 + len));
    i += 12 + len;
    if (type === "IEND") {                                  // anything after IEND is dropped
      if (!idat) bad("invalid_image");
      return { type: "png", width, height, data: Buffer.concat(out) };
    }
  }
  return bad("invalid_image");
}

/** @returns {{type:'jpeg'|'png', width:number, height:number, data:Buffer}} data = rewritten, metadata-free file */
function inspect(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) bad("invalid_image");
  if (buf.length > MAX_BYTES) bad("image_too_big");
  if (buf[0] === 0xff && buf[1] === 0xd8) return cleanJpeg(buf);
  if (buf[0] === 0x89 && buf[1] === 0x50) return cleanPng(buf);
  return bad("unsupported_image_type");
}

module.exports = { inspect, ImageError, MAX_BYTES };
