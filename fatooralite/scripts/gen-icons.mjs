// Generate emerald PWA icons (no native deps) using a tiny PNG encoder.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const EMERALD = [16, 185, 129];
const DARK = [4, 19, 13];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function set(px, size, x, y, c) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = 255;
}
function disk(px, size, cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(px, size, x, y, c);
}
function seg(px, size, a, b, r, c) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disk(px, size, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, c);
  }
}
function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = EMERALD[0];
    px[i * 4 + 1] = EMERALD[1];
    px[i * 4 + 2] = EMERALD[2];
    px[i * 4 + 3] = 255;
  }
  // centered check mark (dark) within the maskable safe zone
  const p = (fx, fy) => [fx * size, fy * size];
  const r = size * 0.06;
  seg(px, size, p(0.3, 0.52), p(0.45, 0.67), r, DARK);
  seg(px, size, p(0.45, 0.67), p(0.72, 0.35), r, DARK);
  return png(size, px);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, makeIcon(size));
  console.log(`wrote public/icons/icon-${size}.png`);
}
