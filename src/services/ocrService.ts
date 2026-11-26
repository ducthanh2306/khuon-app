import { NativeModules } from 'react-native';
import MlkitOcr, { DetectorType, OcrLine } from 'rn-mlkit-ocr';
import { OcrLangMode } from '../types/app';

export interface OcrRunResult {
  rawText: string;
  detectedScripts: string[];
}

const HAS_JP_KANA_RE = /[\u3040-\u30FF\u31F0-\u31FF]/;
const HAS_KR_HANGUL_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const HAS_HAN_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;

interface TaggedLine {
  script: DetectorType;
  line: OcrLine;
}

function verticalOverlapRatio(a: OcrLine['frame'], b: OcrLine['frame']): number {
  const y1 = Math.max(a.y, b.y);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (y2 <= y1) return 0;
  const x1 = Math.max(a.x, b.x);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  if (x2 <= x1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const minArea = Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  return inter / minArea;
}

function mergeMultilingualLines(
  results: Partial<Record<DetectorType, OcrLine[]>>
): { text: string; scripts: string[] } {
  const candidates: TaggedLine[] = [];
  const usedScripts = new Set<string>();

  const jpLines = results.japanese ?? [];
  const krLines = results.korean ?? [];
  const zhLines = results.chinese ?? [];
  const latinLines = results.latin ?? [];

  const scanHasKana = jpLines.some((l) => HAS_JP_KANA_RE.test(l.text));

  // Prefer Japanese lines when kana or Japanese-dominant kanji exist
  for (const line of jpLines) {
    if (HAS_JP_KANA_RE.test(line.text) || (scanHasKana && HAS_HAN_RE.test(line.text))) {
      candidates.push({ script: 'japanese', line });
      usedScripts.add('Nhật');
    }
  }

  for (const line of krLines) {
    if (HAS_KR_HANGUL_RE.test(line.text)) {
      candidates.push({ script: 'korean', line });
      usedScripts.add('Hàn');
    }
  }

  for (const line of zhLines) {
    if (HAS_HAN_RE.test(line.text)) {
      const overlapsCjk = candidates.some(
        (c) => verticalOverlapRatio(c.line.frame, line.frame) > 0.45
      );
      if (!overlapsCjk) {
        candidates.push({ script: 'chinese', line });
        usedScripts.add('Trung');
      }
    }
  }

  // Keep Latin lines whenever they don't collide heavily with an accepted CJK box
  // (preserves crisp Vietnamese diacritics & English characters)
  for (const line of latinLines) {
    const overlapsCjk = candidates.some(
      (c) => verticalOverlapRatio(c.line.frame, line.frame) > 0.48
    );
    if (!overlapsCjk) {
      candidates.push({ script: 'latin', line });
      usedScripts.add('Việt/Anh');
    }
  }

  candidates.sort((a, b) => {
    const dy = a.line.frame.y - b.line.frame.y;
    if (Math.abs(dy) > Math.min(a.line.frame.height, b.line.frame.height) * 0.45) {
      return dy;
    }
    return a.line.frame.x - b.line.frame.x;
  });

  return {
    text: candidates.map((c) => c.line.text).join('\n'),
    scripts: Array.from(usedScripts),
  };
}

export async function runImageOcr(
  imageUri: string,
  langMode: OcrLangMode,
  onProgress?: (status: string) => void
): Promise<OcrRunResult> {
  if (!NativeModules.RnMlkitOcr) {
    throw new Error(
      'Module OCR ngoại tuyến (ML Kit) cần bản cài đặt .apk hoặc Development Build (không chạy được trong Expo Go). Bạn vẫn có thể test OCR ngay trên bản Web!'
    );
  }

  onProgress?.('Đang nhận diện văn bản...');

  if (langMode !== 'auto') {
    const res = await MlkitOcr.recognizeText(imageUri, langMode);
    const labelMap: Record<Exclude<OcrLangMode, 'auto'>, string> = {
      latin: 'Việt/Anh',
      japanese: 'Nhật',
      korean: 'Hàn',
      chinese: 'Trung',
    };
    return {
      rawText: res.text || '',
      detectedScripts: [labelMap[langMode]],
    };
  }

  let available: DetectorType[] = ['latin'];
  try {
    available = await MlkitOcr.getAvailableLanguages();
  } catch {
    available = ['latin', 'japanese', 'korean', 'chinese'];
  }

  const targets: DetectorType[] = (
    ['latin', 'japanese', 'korean', 'chinese'] as DetectorType[]
  ).filter((d) => available.includes(d));

  const settled = await Promise.allSettled(
    targets.map(async (script) => {
      const res = await MlkitOcr.recognizeText(imageUri, script);
      const lines = res.blocks.flatMap((b) => b.lines);
      return { script, lines, text: res.text };
    })
  );

  const collected: Partial<Record<DetectorType, OcrLine[]>> = {};
  for (const item of settled) {
    if (item.status === 'fulfilled') {
      collected[item.value.script] = item.value.lines;
    }
  }

  const merged = mergeMultilingualLines(collected);
  if (merged.text.trim()) {
    return {
      rawText: merged.text,
      detectedScripts: merged.scripts,
    };
  }

  // Fallback to pure Latin raw output if line blocks were empty
  const firstFulfilled = settled.find((s) => s.status === 'fulfilled');
  return {
    rawText:
      firstFulfilled && firstFulfilled.status === 'fulfilled'
        ? firstFulfilled.value.text
        : '',
    detectedScripts: ['Việt/Anh'],
  };
}
