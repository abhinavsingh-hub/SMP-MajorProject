/**
 * Screenshot quality & anomaly detection for SocialParse.
 *
 * Checks for:
 * - FLAG_SECURE-blocked screens (solid black / ~0 brightness)
 * - Blank/failed renders (solid color / uniform white/blank screens)
 * - Blurry images (low gradient energy / Laplacian variance)
 * - Duplicate / repetitive captures (perceptual difference hash / dHash with Hamming distance)
 */

import { PNG } from 'pngjs';
import type { AnalysisFlag, QualityAssessment } from './types.js';

export interface QualityAssessmentResult {
  flags: AnalysisFlag[];
  assessment: QualityAssessment;
}

export interface QualityCheckerOptions {
  blackThresholdBrightness?: number; // default: 5
  blackPixelPercentageThreshold?: number; // default: 0.95
  blankVarianceThreshold?: number; // default: 2.0
  blurScoreThreshold?: number; // default: 20.0
  duplicateHammingThreshold?: number; // default: 4 (bits difference out of 64)
}

export class QualityChecker {
  private blackThresholdBrightness: number;
  private blackPixelPercentageThreshold: number;
  private blankVarianceThreshold: number;
  private blurScoreThreshold: number;
  private duplicateHammingThreshold: number;

  // Registry of item IDs to their perceptual hashes
  private seenHashes = new Map<string, string>();

  constructor(options: QualityCheckerOptions = {}) {
    this.blackThresholdBrightness = options.blackThresholdBrightness ?? 5;
    this.blackPixelPercentageThreshold = options.blackPixelPercentageThreshold ?? 0.95;
    this.blankVarianceThreshold = options.blankVarianceThreshold ?? 2.0;
    this.blurScoreThreshold = options.blurScoreThreshold ?? 20.0;
    this.duplicateHammingThreshold = options.duplicateHammingThreshold ?? 4;
  }

  /**
   * Resets the duplicate detection registry across cases.
   */
  public resetRegistry(): void {
    this.seenHashes.clear();
  }

  /**
   * Assesses an image buffer for quality, black screen (FLAG_SECURE), blank screen, blur, and duplicate.
   */
  public assess(imageBuffer: Buffer, itemId?: string): QualityAssessmentResult {
    let png: PNG;
    try {
      png = PNG.sync.read(imageBuffer);
    } catch {
      // If image is corrupt or cannot be decoded as PNG
      return {
        flags: ['BLANK_SCREEN'],
        assessment: {
          isBlackOrBlank: true,
          isBlurry: true,
          isDuplicate: false,
          blurScore: 0,
          brightnessScore: 0,
        },
      };
    }

    const { width, height, data } = png;
    const totalPixels = width * height;
    if (totalPixels === 0) {
      return {
        flags: ['BLANK_SCREEN'],
        assessment: {
          isBlackOrBlank: true,
          isBlurry: true,
          isDuplicate: false,
          blurScore: 0,
          brightnessScore: 0,
        },
      };
    }

    // 1. Brightness and Variance analysis
    let sumBrightness = 0;
    let blackPixelCount = 0;
    const luminanceArray = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Perceived luminance formula (ITU-R BT.601)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      luminanceArray[i] = lum;
      sumBrightness += lum;

      if (lum <= this.blackThresholdBrightness) {
        blackPixelCount++;
      }
    }

    const avgBrightness = sumBrightness / totalPixels;

    // Calculate luminance variance
    let sumSquaredDiff = 0;
    for (let i = 0; i < totalPixels; i++) {
      const diff = luminanceArray[i] - avgBrightness;
      sumSquaredDiff += diff * diff;
    }
    const variance = sumSquaredDiff / totalPixels;
    const stdDev = Math.sqrt(variance);

    const isBlackScreen =
      avgBrightness <= this.blackThresholdBrightness ||
      blackPixelCount / totalPixels >= this.blackPixelPercentageThreshold;

    const isBlankScreen = !isBlackScreen && stdDev <= this.blankVarianceThreshold;

    // 2. Blur analysis (gradient energy / edge variance)
    const blurScore = isBlackScreen || isBlankScreen ? 0 : this.computeBlurScore(luminanceArray, width, height);
    const isBlurry = !isBlackScreen && !isBlankScreen && blurScore < this.blurScoreThreshold;

    // 3. Perceptual Hash (dHash) & Duplicate Detection
    const pHash = this.computeDHash(png);
    let isDuplicate = false;
    let duplicateOfId: string | undefined;

    if (pHash && itemId) {
      for (const [existingId, existingHash] of this.seenHashes.entries()) {
        const distance = this.hammingDistance(pHash, existingHash);
        if (distance <= this.duplicateHammingThreshold) {
          isDuplicate = true;
          duplicateOfId = existingId;
          break;
        }
      }
      this.seenHashes.set(itemId, pHash);
    }

    const flags: AnalysisFlag[] = [];
    if (isBlackScreen) {
      flags.push('FLAG_SECURE_BLOCKED');
    }
    if (isBlankScreen) {
      flags.push('BLANK_SCREEN');
    }
    if (isBlurry) {
      flags.push('BLURRY');
    }
    if (isDuplicate) {
      flags.push('DUPLICATE');
    }

    return {
      flags,
      assessment: {
        isBlackOrBlank: isBlackScreen || isBlankScreen,
        isBlurry,
        isDuplicate,
        blurScore: Number(blurScore.toFixed(2)),
        brightnessScore: Number(avgBrightness.toFixed(2)),
        perceptualHash: pHash,
        duplicateOfId,
      },
    };
  }

  /**
   * Computes blur score using discrete gradient energy across pixel grid.
   */
  private computeBlurScore(lum: Float32Array, width: number, height: number): number {
    if (width < 3 || height < 3) return 100;

    let totalGradient = 0;
    let count = 0;

    // Sample across grid
    const stepX = Math.max(1, Math.floor(width / 100));
    const stepY = Math.max(1, Math.floor(height / 100));

    for (let y = 1; y < height - 1; y += stepY) {
      for (let x = 1; x < width - 1; x += stepX) {
        const curr = lum[y * width + x];
        const right = lum[y * width + (x + 1)];
        const down = lum[(y + 1) * width + x];

        const gx = right - curr;
        const gy = down - curr;
        totalGradient += Math.sqrt(gx * gx + gy * gy);
        count++;
      }
    }

    return count > 0 ? (totalGradient / count) * 4 : 0;
  }

  /**
   * Computes a 64-bit difference hash (dHash) as a 16-character hex string.
   */
  public computeDHash(png: PNG): string {
    const targetW = 9;
    const targetH = 8;
    const lumGrid: number[][] = [];

    // Nearest-neighbor downsampling to 9x8
    for (let y = 0; y < targetH; y++) {
      const srcY = Math.floor((y / targetH) * png.height);
      const row: number[] = [];
      for (let x = 0; x < targetW; x++) {
        const srcX = Math.floor((x / targetW) * png.width);
        const idx = (srcY * png.width + srcX) * 4;
        const lum = 0.299 * png.data[idx] + 0.587 * png.data[idx + 1] + 0.114 * png.data[idx + 2];
        row.push(lum);
      }
      lumGrid.push(row);
    }

    // Compare adjacent pixels
    let hashBits = '';
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < 8; x++) {
        hashBits += lumGrid[y][x] > lumGrid[y][x + 1] ? '1' : '0';
      }
    }

    // Convert 64 bits to 16 hex chars
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = hashBits.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }

    return hex.padStart(16, '0');
  }

  /**
   * Computes Hamming distance between two hex hashes.
   */
  public hammingDistance(hex1: string, hex2: string): number {
    if (hex1.length !== hex2.length) return 64;
    let distance = 0;
    for (let i = 0; i < hex1.length; i++) {
      const val1 = parseInt(hex1[i], 16);
      const val2 = parseInt(hex2[i], 16);
      let xor = val1 ^ val2;
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }

  /**
   * Helper utility to create synthetic PNG buffers for tests and demo runs.
   */
  public static createSyntheticPng(options: {
    width?: number;
    height?: number;
    fillColor?: [number, number, number]; // [R, G, B]
    pattern?: 'checkerboard' | 'solid' | 'gradient';
  }): Buffer {
    const width = options.width ?? 32;
    const height = options.height ?? 32;
    const png = new PNG({ width, height });
    const fill = options.fillColor ?? [255, 255, 255];
    const pattern = options.pattern ?? 'solid';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (pattern === 'solid') {
          png.data[idx] = fill[0];
          png.data[idx + 1] = fill[1];
          png.data[idx + 2] = fill[2];
        } else if (pattern === 'checkerboard') {
          const isWhite = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
          const val = isWhite ? 255 : 0;
          png.data[idx] = val;
          png.data[idx + 1] = val;
          png.data[idx + 2] = val;
        } else if (pattern === 'gradient') {
          png.data[idx] = Math.floor((x / width) * 255);
          png.data[idx + 1] = Math.floor((y / height) * 255);
          png.data[idx + 2] = 128;
        }
        png.data[idx + 3] = 255; // Alpha
      }
    }

    return PNG.sync.write(png);
  }
}
