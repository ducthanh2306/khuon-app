export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g);
  const seen = new Set<string>();
  const vars: string[] = [];
  for (const m of matches) {
    const key = m[1].trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      vars.push(key);
    }
  }
  return vars;
}

export function getSuggestedVariableDefault(varName: string): string {
  const lower = removeVietnameseTones(varName).toLowerCase();
  const now = new Date();
  if (lower.includes('ngay') || lower === 'date') {
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${now.getFullYear()}`;
  }
  if (lower.includes('gio') || lower === 'time') {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '';
}

export function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_full, rawKey: string) => {
    const key = rawKey.trim();
    const val = values[key];
    return val !== undefined && val !== '' ? val : `{{${key}}}`;
  });
}

export function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/(^|\s|[-/(])(\p{Ll})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function toSlug(input: string): string {
  return removeVietnameseTones(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sortLines(input: string, descending = false): string {
  const lines = input.split('\n').filter((l) => l.trim().length > 0);
  lines.sort((a, b) => a.localeCompare(b, 'vi'));
  if (descending) lines.reverse();
  return lines.join('\n');
}

export function deduplicateLines(input: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of input.split('\n')) {
    const key = line.trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out.join('\n');
}

export function reverseLines(input: string): string {
  return input.split('\n').reverse().join('\n');
}

export function addPrefixSuffix(input: string, prefix: string, suffix: string): string {
  return input
    .split('\n')
    .map((l) => (l.trim() ? `${prefix}${l}${suffix}` : l))
    .join('\n');
}

export interface TextMetrics {
  chars: number;
  charsNoSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
  bytes: number;
  readMinutes: number;
}

export function computeTextMetrics(text: string): TextMetrics {
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n+/).filter(Boolean).length : 0;
  const bytes = new TextEncoder().encode(text).length;
  const readMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));

  return {
    chars,
    charsNoSpaces,
    words,
    lines,
    paragraphs,
    bytes,
    readMinutes,
  };
}

export interface DiffLine {
  type: 'same' | 'add' | 'remove';
  text: string;
}

export function computeLineDiff(beforeText: string, afterText: string): DiffLine[] {
  if (beforeText === afterText) {
    return beforeText ? beforeText.split('\n').map((text) => ({ type: 'same' as const, text })) : [];
  }

  const a = beforeText.split('\n');
  const b = afterText.split('\n');

  // Trim identical leading and trailing lines first so edits in long docs stay small & fast
  let prefixLen = 0;
  const minLen = Math.min(a.length, b.length);
  while (prefixLen < minLen && a[prefixLen] === b[prefixLen]) {
    prefixLen += 1;
  }

  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    a[a.length - 1 - suffixLen] === b[b.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const midA = a.slice(prefixLen, a.length - suffixLen);
  const midB = b.slice(prefixLen, b.length - suffixLen);
  const m = midA.length;
  const n = midB.length;

  const result: DiffLine[] = [];
  for (let p = 0; p < prefixLen; p += 1) {
    result.push({ type: 'same', text: a[p] });
  }

  if (m === 0 && n === 0) {
    // identical already handled, kept for clarity
  } else if (m === 0) {
    for (let j = 0; j < n; j += 1) result.push({ type: 'add', text: midB[j] });
  } else if (n === 0) {
    for (let i = 0; i < m; i += 1) result.push({ type: 'remove', text: midA[i] });
  } else if (m * n > 60000) {
    for (let i = 0; i < m; i += 1) result.push({ type: 'remove', text: midA[i] });
    for (let j = 0; j < n; j += 1) result.push({ type: 'add', text: midB[j] });
  } else {
    // Flat Int32Array avoids 2D array allocation & GC pressure on Hermes
    const cols = n + 1;
    const dp = new Int32Array((m + 1) * cols);
    for (let i = m - 1; i >= 0; i -= 1) {
      const rowOff = i * cols;
      const nextRowOff = (i + 1) * cols;
      const lineA = midA[i];
      for (let j = n - 1; j >= 0; j -= 1) {
        if (lineA === midB[j]) {
          dp[rowOff + j] = dp[nextRowOff + j + 1] + 1;
        } else {
          const down = dp[nextRowOff + j];
          const right = dp[rowOff + j + 1];
          dp[rowOff + j] = down >= right ? down : right;
        }
      }
    }

    let i = 0;
    let j = 0;
    while (i < m && j < n) {
      if (midA[i] === midB[j]) {
        result.push({ type: 'same', text: midA[i] });
        i += 1;
        j += 1;
      } else if (dp[(i + 1) * cols + j] >= dp[i * cols + j + 1]) {
        result.push({ type: 'remove', text: midA[i] });
        i += 1;
      } else {
        result.push({ type: 'add', text: midB[j] });
        j += 1;
      }
    }
    while (i < m) {
      result.push({ type: 'remove', text: midA[i] });
      i += 1;
    }
    while (j < n) {
      result.push({ type: 'add', text: midB[j] });
      j += 1;
    }
  }

  for (let s = a.length - suffixLen; s < a.length; s += 1) {
    result.push({ type: 'same', text: a[s] });
  }

  return result;
}
