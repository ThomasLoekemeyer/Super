// Genera los íconos PNG de la PWA sin dependencias (solo zlib de Node).
// Dibujo simple: fondo esmeralda con una "S" pixelada blanca.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = [5, 150, 105]; // emerald-600
const FG = [255, 255, 255];

// "S" en una grilla 5x7
const GLYPH = [
  "01110",
  "10000",
  "10000",
  "01110",
  "00001",
  "00001",
  "11110",
];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const cell = Math.floor(size / 9); // glifo 5x7 centrado en grilla 9x9
  const gx = Math.floor((size - 5 * cell) / 2);
  const gy = Math.floor((size - 7 * cell) / 2);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filtro none
    for (let x = 0; x < size; x++) {
      let px = BG;
      const cx = Math.floor((x - gx) / cell);
      const cy = Math.floor((y - gy) / cell);
      if (cx >= 0 && cx < 5 && cy >= 0 && cy < 7 && GLYPH[cy][cx] === "1") px = FG;
      const o = row + 1 + x * 3;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makePng(192));
writeFileSync("public/icons/icon-512.png", makePng(512));
writeFileSync("public/icons/apple-touch-icon.png", makePng(180));
console.log("Iconos generados en public/icons/");
