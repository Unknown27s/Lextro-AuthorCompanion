/**
 * Ambient types for the native ML Kit OCR module (`rn-mlkit-ocr`).
 *
 * Declared here so the lazily-imported native module can be type-checked before
 * the native package is installed (and kept out of the web bundle). Mirrors the
 * minimal surface we consume — the full package provides richer frame/line
 * shapes; we only read the recognized `text` string.
 */

declare module 'rn-mlkit-ocr' {
  interface OcrElement {
    text: string;
  }
  interface OcrLine {
    text: string;
    elements?: OcrElement[];
  }
  interface OcrBlock {
    text: string;
    lines?: OcrLine[];
  }
  interface OcrResult {
    text: string;
    blocks?: OcrBlock[];
  }

  const MlkitOcr: {
    recognizeText(imageUri: string, detectorType?: string): Promise<OcrResult>;
  };

  export default MlkitOcr;
}