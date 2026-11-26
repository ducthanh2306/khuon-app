import {
  ExtractedEntities,
  NormalizerOptions,
  NormalizerPresetId,
  NormalizerResult,
} from '../types/app';
import {
  deduplicateLines,
  removeVietnameseTones,
  sortLines,
} from './textTools';

export const DEFAULT_NORMALIZER_OPTIONS: NormalizerOptions = {
  fixDiacritics: true,
  modernTonePlacement: true,
  stripInvisible: true,
  unwrapLines: true,
  fixPunctuationSpacing: true,
  normalizeBullets: true,
  autoCapitalize: true,
  straightenQuotes: false,
  formatAsNumberedList: false,
  dedupeLines: false,
  removeTones: false,
  sortLines: false,
};

export const NORMALIZER_PRESETS: Record<
  Exclude<NormalizerPresetId, 'custom'>,
  { label: string; shortDesc: string; options: NormalizerOptions }
> = {
  document: {
    label: 'Tài liệu / PDF',
    shortDesc: 'Gộp dòng đứt, sửa lệch dấu & dấu câu',
    options: {
      fixDiacritics: true,
      modernTonePlacement: true,
      stripInvisible: true,
      unwrapLines: true,
      fixPunctuationSpacing: true,
      normalizeBullets: true,
      autoCapitalize: true,
      straightenQuotes: false,
      formatAsNumberedList: false,
    },
  },
  message: {
    label: 'Tin nhắn / Zalo',
    shortDesc: 'Giữ ngắt đoạn, dọn khoảng trắng & chữ hoa',
    options: {
      fixDiacritics: true,
      modernTonePlacement: true,
      stripInvisible: true,
      unwrapLines: false,
      fixPunctuationSpacing: true,
      normalizeBullets: true,
      autoCapitalize: true,
      straightenQuotes: false,
      formatAsNumberedList: false,
    },
  },
  list: {
    label: 'Thô → Danh sách',
    shortDesc: 'Tách thành các mục đánh số 1. 2. 3.',
    options: {
      fixDiacritics: true,
      modernTonePlacement: true,
      stripInvisible: true,
      unwrapLines: true,
      fixPunctuationSpacing: true,
      normalizeBullets: true,
      autoCapitalize: true,
      straightenQuotes: false,
      formatAsNumberedList: true,
    },
  },
  code: {
    label: 'Sạch Code / Mã',
    shortDesc: 'Xóa ký tự ẩn, sửa nháy cong gây lỗi lệnh',
    options: {
      fixDiacritics: true,
      modernTonePlacement: false,
      stripInvisible: true,
      unwrapLines: false,
      fixPunctuationSpacing: false,
      normalizeBullets: false,
      autoCapitalize: false,
      straightenQuotes: true,
      formatAsNumberedList: false,
    },
  },
};

const INVISIBLE_CHARS_RE = /[\u200B-\u200D\uFEFF\u00AD\u2060]/g;
const WEIRD_SPACES_RE = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

const PDF_LIGATURES: Record<string, string> = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'ft',
  '\uFB06': 'st',
};

// Stray combining marks separated by whitespace from base letter (common PDF/OCR artifact)
const SPACED_COMBINING_RE =
  /([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])(?:\s+([\u0300-\u036F]+))+/g;

// Old vs modern Vietnamese tone placement for standalone oa / oe / uy (never touches qu- or gi- onsets)
const OLD_TO_MODERN_TONE_MAP: Array<[RegExp, string]> = [
  [/\b([bcdfghklmnpqrstvwxzBCDFGHKLMNPQRSTVWXZ]?)(?<![qQ])o([àáảãạ])([a-zA-Z\u00C0-\u1EFF]*)\b/g, '$1o$2$3'],
];

const VOWEL_TONE_PAIRS: Record<string, { base: string; tone: string }> = {
  à: { base: 'a', tone: '\u0300' },
  á: { base: 'a', tone: '\u0301' },
  ả: { base: 'a', tone: '\u0309' },
  ã: { base: 'a', tone: '\u0303' },
  ạ: { base: 'a', tone: '\u0323' },
  è: { base: 'e', tone: '\u0300' },
  é: { base: 'e', tone: '\u0301' },
  ẻ: { base: 'e', tone: '\u0309' },
  ẽ: { base: 'e', tone: '\u0303' },
  ẹ: { base: 'e', tone: '\u0323' },
  ì: { base: 'i', tone: '\u0300' },
  í: { base: 'i', tone: '\u0301' },
  ỉ: { base: 'i', tone: '\u0309' },
  ĩ: { base: 'i', tone: '\u0303' },
  ị: { base: 'i', tone: '\u0323' },
  ỳ: { base: 'y', tone: '\u0300' },
  ý: { base: 'y', tone: '\u0301' },
  ỷ: { base: 'y', tone: '\u0309' },
  ỹ: { base: 'y', tone: '\u0303' },
  ỵ: { base: 'y', tone: '\u0323' },
  À: { base: 'A', tone: '\u0300' },
  Á: { base: 'A', tone: '\u0301' },
  Ả: { base: 'A', tone: '\u0309' },
  Ã: { base: 'A', tone: '\u0303' },
  Ạ: { base: 'A', tone: '\u0323' },
  È: { base: 'E', tone: '\u0300' },
  É: { base: 'E', tone: '\u0301' },
  Ẻ: { base: 'E', tone: '\u0309' },
  Ẽ: { base: 'E', tone: '\u0303' },
  Ẹ: { base: 'E', tone: '\u0323' },
  Ì: { base: 'I', tone: '\u0300' },
  Í: { base: 'I', tone: '\u0301' },
  Ỉ: { base: 'I', tone: '\u0309' },
  Ĩ: { base: 'I', tone: '\u0303' },
  Ị: { base: 'I', tone: '\u0323' },
  Ỳ: { base: 'Y', tone: '\u0300' },
  Ý: { base: 'Y', tone: '\u0301' },
  Ỷ: { base: 'Y', tone: '\u0309' },
  Ỹ: { base: 'Y', tone: '\u0303' },
  Ỵ: { base: 'Y', tone: '\u0323' },
};

const O_TONED: Record<string, string> = {
  '\u0300': 'ò',
  '\u0301': 'ó',
  '\u0309': 'ỏ',
  '\u0303': 'õ',
  '\u0323': 'ọ',
};
const O_UPPER_TONED: Record<string, string> = {
  '\u0300': 'Ò',
  '\u0301': 'Ó',
  '\u0309': 'Ỏ',
  '\u0303': 'Õ',
  '\u0323': 'Ọ',
};
const U_TONED: Record<string, string> = {
  '\u0300': 'ù',
  '\u0301': 'ú',
  '\u0309': 'ủ',
  '\u0303': 'ũ',
  '\u0323': 'ụ',
};
const U_UPPER_TONED: Record<string, string> = {
  '\u0300': 'Ù',
  '\u0301': 'Ú',
  '\u0309': 'Ủ',
  '\u0303': 'Ũ',
  '\u0323': 'Ụ',
};

const TONE_LOOKUP_O: Record<string, string> = {
  ò: '\u0300',
  ó: '\u0301',
  ỏ: '\u0309',
  õ: '\u0303',
  ọ: '\u0323',
  Ò: '\u0300',
  Ó: '\u0301',
  Ỏ: '\u0309',
  Õ: '\u0303',
  Ọ: '\u0323',
};

const TONE_LOOKUP_U: Record<string, string> = {
  ù: '\u0300',
  ú: '\u0301',
  ủ: '\u0309',
  ũ: '\u0303',
  ụ: '\u0323',
  Ù: '\u0300',
  Ú: '\u0301',
  Ủ: '\u0309',
  Ũ: '\u0303',
  Ụ: '\u0323',
};

const MODERN_TONE_RE =
  /(^|[^\p{L}])([bcdfghklmnprstvwxzBCDFGHKLMNPRSTVWXZđĐ]*)(o|O|u|U)([àáảãạèéẻẽẹỳýỷỹỵÀÁẢÃẠÈÉẺẼẸỲÝỶỸỴ])(?=$|[^\p{L}])/gu;
const CLOSED_OA_RE =
  /(^|[^\p{L}])([bcdfghklmnprstvwxzBCDFGHKLMNPRSTVWXZđĐ]*)([òóỏõọÒÓỎÕỌ])([aeAE])([cnmptiyCNMPTIY][ghGH]?)(?=$|[^\p{L}])/gu;
const CLOSED_UY_RE =
  /(^|[^\p{L}])([bcdfghklmnprstvwxzBCDFGHKLMNPRSTVWXZđĐ]*)([ùúủũụÙÚỦŨỤ])([yY])([cnmptCNMPT][ghGH]?)(?=$|[^\p{L}])/gu;

const PDF_LIGATURES_RE = /[\uFB00-\uFB06]/g;
const SPACED_MARKS_RE = /([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])([ \t]+)([\u0300-\u036F]+)/g;
const NFD_SEPARATED_RE = /([\p{L}\u0300-\u036F])[ \t]+([\u0300-\u036F]+)/gu;
const BROKEN_CODA_RE =
  /([aăâeêioôơuưyáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵAĂÂEÊIOÔƠUƯYÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ])[ \t]+(ch|ng|nh|[cmnpt])(?=$|[\s,.;:!?)\]])/g;

const URL_EMAIL_PROTECT_RE = /(https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.\w+)/gi;
const SAFE_EXT_RE =
  /^(?:com|vn|net|org|io|dev|edu|gov|ai|app|js|ts|tsx|jsx|json|py|md|txt|csv|html|css|xml|pdf|png|jpg|jpeg|svg|apk|zip|docx|xlsx)\b/i;

const BULLET_LINE_RE = /^[ \t]*[•▪◦‣–—*+][ \t]+/gm;
const LINE_START_LOWER_RE = /^([ \t]*(?:[-*]\s+|\d{1,3}[.)]\s+)?)(\p{Ll})/gmu;
const SENTENCE_LOWER_RE = /([.!?]\s+)(\p{Ll})/gu;

const PHONE_EXTRACT_RE = /(?:\+\d{1,3}|0)(?:[\s.-]*\d){8,11}\b/g;
const EMAIL_EXTRACT_RE = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
const URL_EXTRACT_RE = /https?:\/\/[^\s)>\]"']+/gi;
const CODE_EXTRACT_RE = /\b(?:\d{6,19}|[A-Z]{2,6}[-_]\d{3,10})\b/g;
const INVISIBLE_OCR_RE = /[\u200B-\u200D\uFEFF\u00AD\u2060]/g;
const OCR_WEIRD_SPACE_RE = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

function applyModernTonePlacement(text: string): { result: string; fixes: number } {
  let fixes = 0;

  const result = text.replace(
    MODERN_TONE_RE,
    (full, prefix: string, onset: string, firstV: string, secondToned: string) => {
      if (onset === 'q' || onset === 'Q') return full;
      const firstLower = firstV.toLowerCase();
      const pair = VOWEL_TONE_PAIRS[secondToned];
      if (!pair) return full;

      const secondBaseLower = pair.base.toLowerCase();
      const isOaOe = firstLower === 'o' && (secondBaseLower === 'a' || secondBaseLower === 'e');
      const isUy = firstLower === 'u' && secondBaseLower === 'y';

      if (!isOaOe && !isUy) return full;

      const isFirstUpper = firstV === firstV.toUpperCase();
      let newFirst = firstV;
      if (firstLower === 'o') {
        newFirst = (isFirstUpper ? O_UPPER_TONED : O_TONED)[pair.tone] ?? firstV;
      } else if (firstLower === 'u') {
        newFirst = (isFirstUpper ? U_UPPER_TONED : U_TONED)[pair.tone] ?? firstV;
      }

      if (newFirst !== firstV) {
        fixes += 1;
        return `${prefix}${onset}${newFirst}${pair.base}`;
      }
      return full;
    }
  );

  let finalResult = result.replace(
    CLOSED_OA_RE,
    (full, prefix: string, onset: string, firstToned: string, secondV: string, coda: string) => {
      const tone = TONE_LOOKUP_O[firstToned];
      if (!tone) return full;
      const isUpper = firstToned === firstToned.toUpperCase();
      const plainO = isUpper ? 'O' : 'o';
      const tonedSecond = (secondV + tone).normalize('NFC');
      fixes += 1;
      return `${prefix}${onset}${plainO}${tonedSecond}${coda}`;
    }
  );

  finalResult = finalResult.replace(
    CLOSED_UY_RE,
    (full, prefix: string, onset: string, firstToned: string, secondV: string, coda: string) => {
      const tone = TONE_LOOKUP_U[firstToned];
      if (!tone) return full;
      const isUpper = firstToned === firstToned.toUpperCase();
      const plainU = isUpper ? 'U' : 'u';
      const tonedSecond = (secondV + tone).normalize('NFC');
      fixes += 1;
      return `${prefix}${onset}${plainU}${tonedSecond}${coda}`;
    }
  );

  return { result: finalResult, fixes };
}

function fixVietnameseDiacriticsAndEncoding(
  input: string,
  modernTonePlacement: boolean
): { text: string; fixes: number } {
  let fixes = 0;
  let text = input;

  text = text.replace(PDF_LIGATURES_RE, (m) => {
    fixes += 1;
    return PDF_LIGATURES[m] ?? m;
  });

  text = text.replace(
    SPACED_MARKS_RE,
    (_m, base: string, _sp: string, marks: string) => {
      fixes += 1;
      return (base + marks).normalize('NFC');
    }
  );

  let prev = '';
  let guard = 0;
  while (prev !== text && guard < 4) {
    prev = text;
    guard += 1;
    text = text.replace(
      NFD_SEPARATED_RE,
      (_m, left: string, marks: string) => {
        fixes += 1;
        return left + marks;
      }
    );
  }

  const nfc = text.normalize('NFC');
  if (nfc !== text) {
    fixes += Math.max(1, Math.abs(text.length - nfc.length));
    text = nfc;
  }

  text = text.replace(
    BROKEN_CODA_RE,
    (_m, vowel: string, coda: string) => {
      fixes += 1;
      return vowel + coda;
    }
  );

  text = text.replace(/\u00D0/g, () => {
    fixes += 1;
    return 'Đ';
  });

  if (modernTonePlacement) {
    const toneRes = applyModernTonePlacement(text);
    text = toneRes.result;
    fixes += toneRes.fixes;
  }

  return { text, fixes };
}

function isListLine(line: string): boolean {
  const trimmed = line.trim();
  return /^([-*+•▪◦‣–—]|(\d{1,3}[.)])|([a-zA-Z][)])|\[[ xX]?\]|>)\s+/.test(trimmed);
}

function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 72) return false;
  if (trimmed.startsWith('#')) return true;
  if (trimmed.endsWith(':') && trimmed.length <= 65) return true;
  // Short ALL CAPS heading (ignoring numbers/punctuation)
  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 3 && letters.length <= 45 && letters === letters.toUpperCase()) {
    return true;
  }
  return false;
}

function unwrapBrokenLines(input: string): { text: string; mergedCount: number } {
  // Preserve explicit paragraph breaks (>= 1 empty line)
  const blocks = input.split(/\n[ \t]*\n+/);
  let mergedCount = 0;

  const processedBlocks = blocks.map((block) => {
    const rawLines = block.split('\n');
    if (rawLines.length <= 1) return block.trim();

    const outLines: string[] = [];
    for (let i = 0; i < rawLines.length; i += 1) {
      const current = rawLines[i].trim();
      if (!current) continue;

      if (outLines.length === 0) {
        outLines.push(current);
        continue;
      }

      const prev = outLines[outLines.length - 1];

      // Keep separate lines if current line starts a list item, or either is a heading/table row
      if (
        isListLine(current) ||
        isLikelyHeading(prev) ||
        isLikelyHeading(current) ||
        current.includes('|') && prev.includes('|')
      ) {
        outLines.push(current);
        continue;
      }

      // Join hyphenated word split across line break (e.g. "docu-\nment" -> "document")
      if (/[\p{L}]-\s*$/u.test(prev) && /^[\p{L}]/u.test(current)) {
        outLines[outLines.length - 1] = prev.replace(/-\s*$/, '') + current;
        mergedCount += 1;
        continue;
      }

      // If previous line clearly ended a standalone short label or explicit signature/closing,
      // check whether it ends with terminal punctuation and current starts uppercase; if it's a long prose line (>42 chars), still unwrap into flowing paragraph unless it's short.
      const prevEndsSentence = /[.!?…:;]$/.test(prev);
      if (prevEndsSentence && prev.length < 44 && /^[A-ZÀ-Ỹ]/.test(current)) {
        outLines.push(current);
        continue;
      }

      // Merge wrapped PDF/OCR line into previous line
      outLines[outLines.length - 1] = `${prev} ${current}`;
      mergedCount += 1;
    }

    return outLines.join('\n');
  });

  return {
    text: processedBlocks.filter(Boolean).join('\n\n'),
    mergedCount,
  };
}

function cleanPunctuationAndWhitespace(
  input: string,
  preserveLeadingIndent: boolean
): { text: string; spacesCount: number } {
  let spacesCount = 0;
  const lines = input.split('\n');

  const cleaned = lines.map((line) => {
    let s = line;
    const indentMatch = preserveLeadingIndent ? s.match(/^([ \t]+)/) : null;
    const indent = indentMatch ? indentMatch[1] : '';
    let body = s.slice(indent.length).trimEnd();

    // Collapse multiple spaces/tabs inside text
    const beforeSpaceLen = body.length;
    body = body.replace(/[ \t]{2,}/g, ' ');
    spacesCount += Math.max(0, beforeSpaceLen - body.length);

    // Protect URLs and emails before punctuation spacing fixes
    const protectedTokens: string[] = [];
    body = body.replace(URL_EMAIL_PROTECT_RE, (tok) => {
      const idx = protectedTokens.push(tok) - 1;
      return `__KHUON_TOK_${idx}__`;
    });

    // Remove space before punctuation: , . ; : ! ? ) ] %
    const beforePunct = body;
    body = body.replace(/[ \t]+([,.;:!?)\]])/g, '$1');
    // Remove space right after opening bracket ( [
    body = body.replace(/([(\[])[ \t]+/g, '$1');
    if (body !== beforePunct) spacesCount += 1;

    // Ensure single space after , ; : ! ? when followed by a letter or number (excluding time like 20:30 or ratio)
    body = body.replace(/([,;!?])(?=[\p{L}\p{N}"“'(])/gu, '$1 ');
    // Colon followed by letter -> add space (keep 20:30 or C:\ untouched)
    body = body.replace(/(:)(?=[\p{L}"“'])/gu, '$1 ');
    // Period followed by letter when NOT inside decimals, abbreviations (TP.HCM), domains (.com, .vn), or file extensions (.js, .tsx)
    body = body.replace(/(\p{L}{2,})\.(?=[\p{L}])/gu, (m, word: string, offset: number, full: string) => {
      const after = full.slice(offset + m.length);
      if (/^[A-ZÀ-Ỹ]{1,4}\b/.test(word) && /^[A-ZÀ-Ỹ]/.test(after)) {
        return m;
      }
      if (SAFE_EXT_RE.test(after)) {
        return m;
      }
      return `${word}. `;
    });

    // Restore protected tokens
    if (protectedTokens.length > 0) {
      body = body.replace(/__KHUON_TOK_(\d+)__/g, (_m, idxStr: string) => {
        return protectedTokens[Number(idxStr)] ?? '';
      });
    }

    // Final trim & double-space collapse
    body = body.replace(/ {2,}/g, ' ').trim();
    return indent + body;
  });

  // Collapse 3+ consecutive newlines into 2
  const joined = cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: joined, spacesCount };
}

function unifyBullets(input: string): string {
  return input.replace(BULLET_LINE_RE, '- ');
}

function autoCapitalizeText(input: string): string {
  let out = input.replace(
    LINE_START_LOWER_RE,
    (_m, prefix: string, ch: string) => prefix + ch.toUpperCase()
  );
  out = out.replace(
    SENTENCE_LOWER_RE,
    (_m, sep: string, ch: string) => sep + ch.toUpperCase()
  );
  return out;
}

function toNumberedList(input: string): string {
  // Split by newlines first; if only 1 big paragraph with multiple sentences, split by sentences
  let parts = input
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (parts.length === 1 && parts[0].length > 80) {
    parts = parts[0]
      .split(/(?<=[.!?])\s+(?=[\p{L}\p{N}])/u)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return parts
    .map((item, idx) => {
      const stripped = item.replace(/^([-*•▪◦‣–]|\d{1,3}[.)])\s+/, '');
      return `${idx + 1}. ${stripped}`;
    })
    .join('\n');
}

export function extractEntities(text: string): ExtractedEntities {
  if (!text) {
    return { phones: [], emails: [], urls: [], codes: [] };
  }
  const phoneMatches =
    text.match(PHONE_EXTRACT_RE)?.map((p) => p.replace(/[\s.-]+/g, '')) ?? [];
  const emailMatches = text.match(EMAIL_EXTRACT_RE) ?? [];
  const urlMatches =
    text.match(URL_EXTRACT_RE)?.map((u) => u.replace(/[.,;:!?]+$/, '')) ?? [];
  const codeMatches =
    text.match(CODE_EXTRACT_RE)?.filter((c) => !phoneMatches.includes(c)) ?? [];

  const unique = (arr: string[]) => Array.from(new Set(arr)).slice(0, 12);

  return {
    phones: unique(phoneMatches),
    emails: unique(emailMatches),
    urls: unique(urlMatches),
    codes: unique(codeMatches),
  };
}

export function normalizeText(raw: string, options: NormalizerOptions): NormalizerResult {
  if (!raw) {
    return {
      output: '',
      stats: {
        charsBefore: 0,
        charsAfter: 0,
        linesBefore: 0,
        linesAfter: 0,
        invisibleRemoved: 0,
        diacriticsFixed: 0,
        linesMerged: 0,
        spacesNormalized: 0,
      },
      entities: { phones: [], emails: [], urls: [], codes: [] },
    };
  }

  const charsBefore = raw.length;
  const linesBefore = raw ? raw.split(/\r\n|\r|\n/).length : 0;

  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let invisibleRemoved = 0;
  let diacriticsFixed = 0;
  let linesMerged = 0;
  let spacesNormalized = 0;

  if (options.stripInvisible) {
    const invMatches = text.match(INVISIBLE_CHARS_RE);
    invisibleRemoved += invMatches ? invMatches.length : 0;
    text = text.replace(INVISIBLE_CHARS_RE, '');

    const weirdMatches = text.match(WEIRD_SPACES_RE);
    spacesNormalized += weirdMatches ? weirdMatches.length : 0;
    text = text.replace(WEIRD_SPACES_RE, ' ');
  }

  if (options.fixDiacritics) {
    const res = fixVietnameseDiacriticsAndEncoding(text, options.modernTonePlacement);
    text = res.text;
    diacriticsFixed += res.fixes;
  }

  if (options.straightenQuotes) {
    text = text
      .replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u2013\u2014]/g, '-');
  }

  if (options.unwrapLines) {
    const res = unwrapBrokenLines(text);
    text = res.text;
    linesMerged += res.mergedCount;
  }

  if (options.fixPunctuationSpacing) {
    const res = cleanPunctuationAndWhitespace(text, !options.unwrapLines);
    text = res.text;
    spacesNormalized += res.spacesCount;
  }

  if (options.normalizeBullets) {
    text = unifyBullets(text);
  }

  if (options.autoCapitalize) {
    text = autoCapitalizeText(text);
  }

  if (options.formatAsNumberedList && text.trim()) {
    text = toNumberedList(text);
  }

  if (options.dedupeLines && text.trim()) {
    text = deduplicateLines(text);
  }

  if (options.sortLines && text.trim()) {
    text = sortLines(text);
  }

  if (options.removeTones && text) {
    text = removeVietnameseTones(text);
  }

  const charsAfter = text.length;
  const linesAfter = text ? text.split('\n').length : 0;

  return {
    output: text,
    stats: {
      charsBefore,
      charsAfter,
      linesBefore,
      linesAfter,
      invisibleRemoved,
      diacriticsFixed,
      linesMerged,
      spacesNormalized,
    },
    entities: extractEntities(text),
  };
}

/**
 * Clean multilingual OCR output (Vietnamese, English, Japanese, Korean, Chinese)
 * while preserving original wording/casing/scripts and capping spaces to at most 1.
 */
export function normalizeOcrText(
  raw: string,
  autoClean = true
): { text: string; entities: ExtractedEntities } {
  if (!raw) {
    return {
      text: '',
      entities: { phones: [], emails: [], urls: [], codes: [] },
    };
  }

  let text = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(INVISIBLE_OCR_RE, '')
    .normalize('NFC');

  if (autoClean) {
    text = text
      .replace(OCR_WEIRD_SPACE_RE, ' ')
      .split('\n')
      .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    text = text.trim();
  }

  return {
    text,
    entities: extractEntities(text),
  };
}

// Keep unused pattern symbol referenced out cleanly if needed
void OLD_TO_MODERN_TONE_MAP;
