import JSZip from 'jszip';

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    );
}

export async function extractTextFromDocxBytes(data: Uint8Array | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Không tìm thấy nội dung word/document.xml trong tệp .docx');
  }
  const xml = await docFile.async('string');

  // Split by paragraphs <w:p ...>...</w:p>
  const paragraphs = xml.split(/<\/w:p>/);
  const out: string[] = [];

  for (const para of paragraphs) {
    const withBreaks = para
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n');

    const textParts: string[] = [];
    const textTagRe = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = textTagRe.exec(withBreaks)) !== null) {
      textParts.push(decodeXmlEntities(match[1]));
    }
    const line = textParts.join('');
    if (line.trim()) {
      out.push(line);
    }
  }

  return out.join('\n\n');
}

export function extractTextFromHtml(html: string): string {
  return decodeXmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
  );
}

export function extractTextFromSrt(srt: string): string {
  // Strip SRT sequence numbers & timecodes (00:01:23,450 --> 00:01:26,100)
  return srt
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (/^\d+$/.test(t)) return false;
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(t)) return false;
      return true;
    })
    .join('\n');
}
