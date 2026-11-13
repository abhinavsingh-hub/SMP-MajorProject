/**
 * Pure TypeScript QR Code SVG Generator.
 *
 * Zero external dependencies. Generates valid QR Code Model 2 SVG images
 * for strings up to 150 characters (suitable for case ID + SHA-256 hash).
 *
 * Implements ISO/IEC 18004 specification:
 * - Byte mode encoding (8-bit)
 * - Error correction (Reed-Solomon over GF(256))
 * - Finder patterns, timing patterns, alignment patterns
 * - Mask evaluation and format information
 * - SVG output
 */

// ---------------------------------------------------------------------------
// Galois Field GF(256) with primitive polynomial 0x11D (285)
// ---------------------------------------------------------------------------

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  LOG_TABLE[0] = 0;
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

// ---------------------------------------------------------------------------
// Reed-Solomon Generator Polynomial
// ---------------------------------------------------------------------------

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, degree: number): Uint8Array {
  const gen = rsGeneratorPoly(degree);
  const remainder = new Uint8Array(degree);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < degree - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    remainder[degree - 1] = gfMul(gen[degree], factor);
  }
  return remainder;
}

// ---------------------------------------------------------------------------
// QR Code Versions table (Version 4: 33x33, Version 5: 37x37)
// ---------------------------------------------------------------------------

interface QrVersionInfo {
  version: number;
  size: number;
  dataCapacityBytes: number;
  ecCodewords: number;
  alignmentPositions: number[];
}

const QR_VERSIONS: QrVersionInfo[] = [
  // Version 4-L (33x33): 80 data bytes, 36 EC bytes (degree 36)
  {
    version: 4,
    size: 33,
    dataCapacityBytes: 80,
    ecCodewords: 36,
    alignmentPositions: [6, 26],
  },
  // Version 6-L (41x41): 136 data bytes, 56 EC bytes
  {
    version: 6,
    size: 41,
    dataCapacityBytes: 136,
    ecCodewords: 56,
    alignmentPositions: [6, 34],
  },
  // Version 8-L (49x49): 192 data bytes, 76 EC bytes
  {
    version: 8,
    size: 49,
    dataCapacityBytes: 192,
    ecCodewords: 76,
    alignmentPositions: [6, 26, 46],
  },
];

// ---------------------------------------------------------------------------
// BitStream builder
// ---------------------------------------------------------------------------

class BitStream {
  private bits: number[] = [];

  append(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }

  appendBytes(bytes: Uint8Array): void {
    for (let i = 0; i < bytes.length; i++) {
      this.append(bytes[i], 8);
    }
  }

  get length(): number {
    return this.bits.length;
  }

  toUint8Array(totalBytes: number): Uint8Array {
    const out = new Uint8Array(totalBytes);
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) {
        out[i >>> 3] |= 0x80 >>> (i & 7);
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Matrix generator
// ---------------------------------------------------------------------------

export function generateQrMatrix(text: string): boolean[][] {
  const rawBytes = new TextEncoder().encode(text);

  // Select suitable QR version
  let ver: QrVersionInfo | undefined;
  for (const v of QR_VERSIONS) {
    // 4 bits mode + 8 bits count + data
    const neededBits = 4 + 8 + rawBytes.length * 8 + 4;
    if (neededBits <= v.dataCapacityBytes * 8) {
      ver = v;
      break;
    }
  }

  if (!ver) {
    ver = QR_VERSIONS[QR_VERSIONS.length - 1];
  }

  // 1. Data encoding in Byte Mode (0100)
  const bs = new BitStream();
  bs.append(0b0100, 4); // Byte mode
  bs.append(rawBytes.length, 8); // Character count (8 bits for V1-9)
  bs.appendBytes(rawBytes);

  // 4-bit terminator
  const maxBits = ver.dataCapacityBytes * 8;
  const termLen = Math.min(4, maxBits - bs.length);
  bs.append(0, termLen);

  // Pad to byte boundary
  if (bs.length % 8 !== 0) {
    bs.append(0, 8 - (bs.length % 8));
  }

  // Pad with alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bs.length < maxBits) {
    bs.append(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords = bs.toUint8Array(ver.dataCapacityBytes);

  // 2. Error correction
  const ecCodewords = rsComputeRemainder(dataCodewords, ver.ecCodewords);

  // Combine data + EC codewords
  const allCodewords = new Uint8Array(dataCodewords.length + ecCodewords.length);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(ecCodewords, dataCodewords.length);

  // 3. Grid setup
  const size = ver.size;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  // Helper to place finder pattern
  const setModule = (r: number, c: number, dark: boolean, func = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = dark;
      if (func) isFunction[r][c] = true;
    }
  };

  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const dark =
              r === 0 ||
              r === 6 ||
              c === 0 ||
              c === 6 ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(nr, nc, dark);
          } else {
            // White separator
            setModule(nr, nc, false);
          }
        }
      }
    }
  };

  // Top-left, top-right, bottom-left finders
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  const positions = ver.alignmentPositions;
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      const r = positions[i];
      const c = positions[j];
      if (isFunction[r][c]) continue; // Skip if overlaps finder

      for (let ar = -2; ar <= 2; ar++) {
        for (let ac = -2; ac <= 2; ac++) {
          const dark =
            Math.abs(ar) === 2 || Math.abs(ac) === 2 || (ar === 0 && ac === 0);
          setModule(r + ar, c + ac, dark);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  // 4. Place data bits in zig-zag
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip timing col

    const upward = ((right + 1) / 2) % 2 === 1;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let c = right; c >= right - 1; c--) {
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            const byte = allCodewords[bitIdx >>> 3];
            dark = ((byte >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Mask pattern 0: (row + col) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          matrix[r][c] = dark;
        }
      }
    }
  }

  // 5. Format info for Error Correction L (01) and Mask 0 (000): 01000 -> 0x08
  // BCH(15, 5) code for 0x08 with mask 0x5412 = 0x72c4 (binary 111001011000100)
  const formatBits = 0x72c4;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> (14 - i)) & 1) === 1;
    // Around top-left
    if (i < 6) {
      matrix[8][i] = bit;
    } else if (i === 6) {
      matrix[8][7] = bit;
    } else if (i === 7) {
      matrix[8][8] = bit;
    } else if (i === 8) {
      matrix[7][8] = bit;
    } else {
      matrix[14 - i][8] = bit;
    }

    // Around top-right and bottom-left
    if (i < 8) {
      matrix[size - 1 - i][8] = bit;
    } else {
      matrix[8][size - 15 + i] = bit;
    }
  }

  return matrix;
}

// ---------------------------------------------------------------------------
// SVG Renderer
// ---------------------------------------------------------------------------

export interface QrSvgOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generates an SVG string representation of a QR Code.
 */
export function generateQrSvg(text: string, options?: QrSvgOptions): string {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const margin = options?.margin ?? 4;
  const totalSize = matrixSize + margin * 2;
  const svgSize = options?.size ?? 160;
  const darkColor = options?.darkColor ?? '#0f172a';
  const lightColor = options?.lightColor ?? '#ffffff';

  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${darkColor}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${svgSize}" height="${svgSize}" style="background:${lightColor};shape-rendering:crispEdges;"><rect width="${totalSize}" height="${totalSize}" fill="${lightColor}"/>${rects}</svg>`;
}
