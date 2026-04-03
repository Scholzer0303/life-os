/**
 * Pure Node.js PNG icon generator — no external dependencies.
 * Generates 192x192 and 512x512 Life OS app icons.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// Brand colors
const BG = [134, 59, 255]     // #863bff — purple
const FG = [255, 255, 255]    // #ffffff — white

// ── PNG helpers ──────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = makeCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makeCrcTable() {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function buildIHDR(w, h) {
  const b = Buffer.alloc(13)
  b.writeUInt32BE(w, 0)
  b.writeUInt32BE(h, 4)
  b[8] = 8   // bit depth
  b[9] = 2   // color type: RGB
  b[10] = 0  // compression
  b[11] = 0  // filter
  b[12] = 0  // interlace
  return chunk('IHDR', b)
}

function buildIDATfromPixels(pixels, w, h) {
  // pixels: Uint8Array of length w*h*3 (RGB)
  // each row: filter byte (0) + row data
  const rowSize = w * 3
  const raw = Buffer.alloc(h * (1 + rowSize))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + rowSize)] = 0 // filter: None
    pixels.copy(raw, y * (1 + rowSize) + 1, y * rowSize, (y + 1) * rowSize)
  }
  const compressed = deflateSync(raw, { level: 9 })
  return chunk('IDAT', compressed)
}

function buildPNG(pixels, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, buildIHDR(w, h), buildIDATfromPixels(pixels, w, h), chunk('IEND', Buffer.alloc(0))])
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function createCanvas(size) {
  const buf = Buffer.alloc(size * size * 3)
  // Fill with background color
  for (let i = 0; i < size * size; i++) {
    buf[i * 3] = BG[0]
    buf[i * 3 + 1] = BG[1]
    buf[i * 3 + 2] = BG[2]
  }
  return buf
}

function setPixel(buf, size, x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) return
  const i = (y * size + x) * 3
  buf[i] = color[0]
  buf[i + 1] = color[1]
  buf[i + 2] = color[2]
}

function fillRect(buf, size, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(buf, size, x + dx, y + dy, color)
    }
  }
}

/** Rounded rectangle with corner radius r */
function fillRoundRect(buf, size, x, y, w, h, r, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy
      // Check corners
      let inCorner = false
      if (dx < r && dy < r) inCorner = (dx - r) ** 2 + (dy - r) ** 2 > r * r
      else if (dx >= w - r && dy < r) inCorner = (dx - (w - r - 1)) ** 2 + (dy - r) ** 2 > r * r
      else if (dx < r && dy >= h - r) inCorner = (dx - r) ** 2 + (dy - (h - r - 1)) ** 2 > r * r
      else if (dx >= w - r && dy >= h - r) inCorner = (dx - (w - r - 1)) ** 2 + (dy - (h - r - 1)) ** 2 > r * r
      if (!inCorner) setPixel(buf, size, px, py, color)
    }
  }
}

/**
 * Draw a lightning bolt polygon scaled to the icon size.
 * Coordinates are in 0..1 space, then scaled to (cx, cy) with given scale.
 */
function fillLightningBolt(buf, size, cx, cy, scale, color) {
  // Lightning bolt as list of horizontal spans per scanline
  // Design: top-right angled top, middle notch pointing left, bottom tip
  const half = scale * 0.5

  // Top triangle: from ~0.2..0.6 wide, top at -0.45, middle at 0
  // Bottom triangle: from -0.05..0.35 wide, middle at 0.05, bottom at 0.45
  // Using a fill-by-scanline approach

  const rows = Math.ceil(scale)
  for (let dy = -rows; dy <= rows; dy++) {
    const fy = dy / scale  // normalized -1..1 range mapped to ±1
    let x0 = 0, x1 = 0, fill = false

    if (fy < -0.02) {
      // Upper half: right-leaning parallelogram
      // x goes from (fy+1)*0.5*0.7 to (fy+1)*0.5*0.7 + 0.38
      const t = (fy + 0.5) / 0.48   // 0..1 over upper range
      if (fy >= -0.5) {
        x0 = -0.35 + t * 0.15
        x1 = x0 + 0.38
        fill = true
      }
    } else if (fy > 0.02) {
      // Lower half: right-leaning parallelogram shifted left
      const t = (fy - 0.02) / 0.48
      if (fy <= 0.5) {
        x0 = -0.45 + t * 0.05
        x1 = x0 + 0.38
        fill = true
      }
    } else {
      // Narrow bridge in the middle (the "notch" of the bolt)
      x0 = -0.05
      x1 = 0.15
      fill = true
    }

    if (fill) {
      const px0 = Math.round(cx + x0 * scale)
      const px1 = Math.round(cx + x1 * scale)
      const py = Math.round(cy + dy)
      for (let px = px0; px <= px1; px++) {
        setPixel(buf, size, px, py, color)
      }
    }
  }
}

// ── Build one icon ───────────────────────────────────────────────────────────

function generateIcon(size) {
  const buf = createCanvas(size)
  const pad = Math.round(size * 0.04)

  // Rounded background card (slightly inset on transparent-style rounded corners)
  const radius = Math.round(size * 0.22)
  fillRoundRect(buf, size, 0, 0, size, size, radius, BG)

  // Lightning bolt
  const cx = size * 0.52
  const cy = size * 0.50
  const boltScale = size * 0.28
  fillLightningBolt(buf, size, cx, cy, boltScale, FG)

  return buildPNG(buf, size, size)
}

// ── Output ───────────────────────────────────────────────────────────────────

mkdirSync('public/icons', { recursive: true })

writeFileSync('public/icons/icon-192.png', generateIcon(192))
console.log('✓ public/icons/icon-192.png')

writeFileSync('public/icons/icon-512.png', generateIcon(512))
console.log('✓ public/icons/icon-512.png')

// apple-touch-icon (180x180)
writeFileSync('public/apple-touch-icon.png', generateIcon(180))
console.log('✓ public/apple-touch-icon.png')

console.log('Icons generated successfully.')
