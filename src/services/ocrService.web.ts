import { createWorker } from 'tesseract.js';
import { OcrLangMode } from '../types/app';

export interface OcrRunResult {
  rawText: string;
  detectedScripts: string[];
}

const WEB_LANG_MAP: Record<OcrLangMode, { codes: string; label: string }> = {
  auto: { codes: 'vie+eng+jpn+kor+chi_sim', label: 'Đa ngôn ngữ' },
  latin: { codes: 'vie+eng', label: 'Việt/Anh' },
  japanese: { codes: 'jpn+eng', label: 'Nhật' },
  korean: { codes: 'kor+eng', label: 'Hàn' },
  chinese: { codes: 'chi_sim+eng', label: 'Trung' },
};

export async function runImageOcr(
  imageUri: string,
  langMode: OcrLangMode,
  onProgress?: (status: string) => void
): Promise<OcrRunResult> {
  const cfg = WEB_LANG_MAP[langMode] ?? WEB_LANG_MAP.latin;
  onProgress?.(`Đang nạp bộ nhận diện (${cfg.label})...`);

  const worker = await createWorker(cfg.codes, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(`Đang quét chữ... ${Math.round(m.progress * 100)}%`);
      } else if (m.status && m.status.includes('loading')) {
        onProgress?.(`Đang tải gói ngôn ngữ (${cfg.label})...`);
      }
    },
  });

  try {
    const res = await worker.recognize(imageUri);
    return {
      rawText: res.data?.text ?? '',
      detectedScripts: [cfg.label],
    };
  } finally {
    await worker.terminate();
  }
}
