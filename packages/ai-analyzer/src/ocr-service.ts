/**
 * OCR Service for SocialParse evidence screenshots.
 *
 * Supports bilingual extraction: English and Hindi ('eng+hin')
 * using Tesseract.js with support for pluggable/mock engines.
 */

import { createWorker, type Worker } from 'tesseract.js';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: OcrWord[];
  language: string;
}

export interface IOcrEngine {
  recognize(image: string | Buffer): Promise<OcrResult>;
  terminate(): Promise<void>;
}

/**
 * Production OCR engine powered by Tesseract.js (eng + hin).
 */
export class TesseractOcrEngine implements IOcrEngine {
  private worker: Worker | null = null;
  private readonly languages: string;

  constructor(languages: string | string[] = ['eng', 'hin']) {
    this.languages = Array.isArray(languages) ? languages.join('+') : languages;
  }

  private async getWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = await createWorker(this.languages);
    }
    return this.worker;
  }

  public async recognize(image: string | Buffer): Promise<OcrResult> {
    const worker = await this.getWorker();
    const result = await worker.recognize(image);

    const words: OcrWord[] = (result.data.words || []).map((w) => ({
      text: w.text,
      confidence: (w.confidence ?? 0) / 100,
      bbox: w.bbox
        ? {
            x0: w.bbox.x0,
            y0: w.bbox.y0,
            x1: w.bbox.x1,
            y1: w.bbox.y1,
          }
        : undefined,
    }));

    return {
      text: (result.data.text || '').trim(),
      confidence: (result.data.confidence ?? 0) / 100,
      words,
      language: this.languages,
    };
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Fast deterministic in-memory OCR engine for unit testing and offline mocks.
 */
export class MockOcrEngine implements IOcrEngine {
  private customTextMap = new Map<string, string>();
  private defaultText: string;

  constructor(defaultText = '') {
    this.defaultText = defaultText;
  }

  public setMockResult(identifier: string, text: string): void {
    this.customTextMap.set(identifier, text);
  }

  public async recognize(image: string | Buffer): Promise<OcrResult> {
    let text = this.defaultText;
    if (typeof image === 'string' && this.customTextMap.has(image)) {
      text = this.customTextMap.get(image) ?? this.defaultText;
    }

    const words: OcrWord[] = text.split(/\s+/).filter(Boolean).map((word) => ({
      text: word,
      confidence: 0.95,
    }));

    return {
      text: text.trim(),
      confidence: text.length > 0 ? 0.95 : 0.0,
      words,
      language: 'eng+hin',
    };
  }

  public async terminate(): Promise<void> {
    // No-op for mock
  }
}

export interface OcrServiceOptions {
  engine?: IOcrEngine;
  languages?: string | string[];
}

export class OcrService {
  private engine: IOcrEngine;

  constructor(options: OcrServiceOptions = {}) {
    if (options.engine) {
      this.engine = options.engine;
    } else {
      this.engine = new TesseractOcrEngine(options.languages ?? ['eng', 'hin']);
    }
  }

  /**
   * Performs optical character recognition on an image file path or buffer.
   */
  public async recognize(image: string | Buffer): Promise<OcrResult> {
    const rawResult = await this.engine.recognize(image);
    return {
      ...rawResult,
      text: this.normalizeOcrText(rawResult.text),
    };
  }

  /**
   * Normalizes OCR text (cleans up whitespace while retaining paragraph boundaries).
   */
  private normalizeOcrText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  public async terminate(): Promise<void> {
    await this.engine.terminate();
  }
}
