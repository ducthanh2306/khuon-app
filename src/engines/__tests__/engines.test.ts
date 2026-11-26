import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  DEFAULT_NORMALIZER_OPTIONS,
  NORMALIZER_PRESETS,
  extractEntities,
  normalizeOcrText,
  normalizeText,
} from '../textNormalizer';
import {
  buildVietQrString,
  buildWifiQrString,
  computeCrc16Ccitt,
  parseQrPayload,
  summarizeQrPayload,
} from '../qrParser';
import {
  computeLineDiff,
  computeTextMetrics,
  deduplicateLines,
  extractTemplateVariables,
  interpolateTemplate,
  removeVietnameseTones,
  sortLines,
  toSlug,
  toTitleCase,
} from '../textTools';
import {
  extractTextFromDocxBytes,
  extractTextFromHtml,
  extractTextFromSrt,
} from '../docReader';

describe('Vietnamese Text Normalizer', () => {
  it('fixes NFD decomposed accents, spaced combining marks, and split PDF codas', () => {
    const nfd = 'Tie\u0302\u0301ng Vie\u0323\u0302t';
    const spacedMarks = 'Ho\u0300a Bi\u0300 nh  va\u0300  Ha\u0300  No\u0302\u0323i';
    const spacedCombining = 'Tie\u0302 \u0301 ng Vie\u0323 \u0302 t';
    const res1 = normalizeText(nfd, DEFAULT_NORMALIZER_OPTIONS);
    expect(res1.output).toBe('Tiếng Việt');

    const res2 = normalizeText(spacedMarks, DEFAULT_NORMALIZER_OPTIONS);
    expect(res2.output).toBe('Hòa Bình và Hà Nội');

    const res3 = normalizeText(spacedCombining, DEFAULT_NORMALIZER_OPTIONS);
    expect(res3.output).toBe('Tiếng Việt');
  });

  it('applies modern tone placement while preserving qu- onset', () => {
    const raw = 'hoà bình , thuý kiều , quà tặng , quý giá , ngòai kia';
    const res = normalizeText(raw, DEFAULT_NORMALIZER_OPTIONS);
    expect(res.output).toBe('Hòa bình, thúy kiều, quà tặng, quý giá, ngoài kia');
  });

  it('unwraps broken PDF lines and rejoins hyphenated words while keeping paragraphs & lists', () => {
    const raw = [
      'ĐÂY LÀ TIÊU ĐỀ:',
      'Đoạn văn bản bị ngắt',
      'dòng giữa chừng khi copy',
      'từ tệp PDF có docu-',
      'ment bị tách.',
      '',
      '• Mục thứ nhất',
      '• Mục thứ hai',
    ].join('\n');

    const res = normalizeText(raw, NORMALIZER_PRESETS.document.options);
    expect(res.output).toBe(
      [
        'ĐÂY LÀ TIÊU ĐỀ:',
        'Đoạn văn bản bị ngắt dòng giữa chừng khi copy từ tệp PDF có document bị tách.',
        '',
        '- Mục thứ nhất',
        '- Mục thứ hai',
      ].join('\n')
    );
    expect(res.stats.linesMerged).toBeGreaterThanOrEqual(3);
  });

  it('protects URLs, emails, file extensions and abbreviations during punctuation cleanup', () => {
    const raw =
      'Xem tại https://example.com/a.b , gửi về dev@khuon.vn . Mở file App.tsx ở TP.HCM lúc 20:30 .';
    const res = normalizeText(raw, NORMALIZER_PRESETS.message.options);
    expect(res.output).toBe(
      'Xem tại https://example.com/a.b, gửi về dev@khuon.vn. Mở file App.tsx ở TP.HCM lúc 20:30.'
    );
  });

  it('strips zero-width invisible chars and straightens smart quotes in code preset', () => {
    const raw = 'const\u200B msg = \u201CXin chào\u201D;\uFEFF';
    const res = normalizeText(raw, NORMALIZER_PRESETS.code.options);
    expect(res.output).toBe('const msg = "Xin chào";');
    expect(res.stats.invisibleRemoved).toBe(2);
  });

  it('extracts phones, emails, urls and codes accurately', () => {
    const raw =
      'Liên hệ 0912.345.678 hoặc +84 987 654 321, email team@khuon.app, link https://khuon.app/doc, mã DH-202611 và STK 19033445566778.';
    const entities = extractEntities(raw);
    expect(entities.phones).toContain('0912345678');
    expect(entities.phones).toContain('+84987654321');
    expect(entities.emails).toEqual(['team@khuon.app']);
    expect(entities.urls).toEqual(['https://khuon.app/doc']);
    expect(entities.codes).toContain('DH-202611');
    expect(entities.codes).toContain('19033445566778');
  });
});

describe('QR Smart Parser & Builder', () => {
  it('parses VietQR EMVCo banking payload with Vietnamese bank BIN lookup', () => {
    // Build a valid VietQR TLV string: 000201 + tag 38 (00=A000000727, 01=(00=970436, 01=0123456789)) + 54=150000 + 62(08=Thanh toan)
    const subBeneficiary = '0006970436' + '01100123456789';
    const sub38 = '0010A000000727' + `01${String(subBeneficiary.length).padStart(2, '0')}${subBeneficiary}`;
    const tag38 = `38${String(sub38.length).padStart(2, '0')}${sub38}`;
    const tag54 = '5406150000';
    const sub62 = '0810Thanh toan';
    const tag62 = `62${String(sub62.length).padStart(2, '0')}${sub62}`;
    const raw = `000201010212${tag38}5303704${tag54}5802VN${tag62}6304ABCD`;

    const parsed = parseQrPayload(raw);
    expect(parsed.kind).toBe('vietqr');
    if (parsed.kind === 'vietqr') {
      expect(parsed.bankShortName).toBe('VCB');
      expect(parsed.bankName).toBe('Vietcombank');
      expect(parsed.accountNumber).toBe('0123456789');
      expect(parsed.amount).toBe('150000');
      expect(parsed.purpose).toBe('Thanh toan');
    }
    expect(summarizeQrPayload(parsed)).toContain('VCB · 0123456789');
  });

  it('parses Wi-Fi QR and builds Wi-Fi QR symmetrically', () => {
    const wifiStr = buildWifiQrString('Quan_CaPhe;Vip', 'matkhau:123', 'WPA');
    const parsed = parseQrPayload(wifiStr);
    expect(parsed.kind).toBe('wifi');
    if (parsed.kind === 'wifi') {
      expect(parsed.ssid).toBe('Quan_CaPhe;Vip');
      expect(parsed.password).toBe('matkhau:123');
      expect(parsed.security).toBe('WPA');
    }
  });

  it('parses vCard and URL payloads', () => {
    const vcard = 'BEGIN:VCARD\nFN:Nguyễn Văn A\nTEL:0909123456\nEMAIL:a@test.vn\nEND:VCARD';
    const p1 = parseQrPayload(vcard);
    expect(p1.kind).toBe('vcard');
    if (p1.kind === 'vcard') {
      expect(p1.name).toBe('Nguyễn Văn A');
      expect(p1.phones).toEqual(['0909123456']);
    }

    const p2 = parseQrPayload('https://khuon.app/tools?x=1');
    expect(p2.kind).toBe('url');
    if (p2.kind === 'url') {
      expect(p2.host).toBe('khuon.app');
      expect(p2.protocol).toBe('HTTPS');
    }
  });
});

describe('Document Readers & Text Tools', () => {
  it('extracts paragraphs cleanly from .docx zip archive', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      `<w:document><w:body>
        <w:p><w:r><w:t>Xin chào</w:t></w:r><w:r><w:t> Việt Nam</w:t></w:r></w:p>
        <w:p><w:r><w:t>Dòng &amp; hai</w:t></w:r></w:p>
      </w:body></w:document>`
    );
    const buf = await zip.generateAsync({ type: 'uint8array' });
    const extracted = await extractTextFromDocxBytes(buf);
    expect(extracted).toBe('Xin chào Việt Nam\n\nDòng & hai');
  });

  it('cleans HTML and SRT files', () => {
    expect(extractTextFromHtml('<p>Một</p><ul><li>Hai</li></ul>').trim()).toBe('Một\n- Hai');
    expect(
      extractTextFromSrt('1\n00:00:01,000 --> 00:00:03,000\nXin chào\n\n2\n00:00:04,000 --> 00:00:06,000\nThế giới').trim()
    ).toBe('Xin chào\n\nThế giới');
  });

  it('handles template variables, tone removal, slugs, dedupe and line diff', () => {
    expect(removeVietnameseTones('Đặng Tuấn Anh')).toBe('Dang Tuan Anh');
    expect(toSlug('Chuẩn Hoá Văn Bản 2026!')).toBe('chuan-hoa-van-ban-2026');
    expect(toTitleCase('NGUYỄN văn a')).toBe('Nguyễn Văn A');
    expect(deduplicateLines('a\nb\na\nc')).toBe('a\nb\nc');
    expect(sortLines('cam\nan\nbình')).toBe('an\nbình\ncam');

    const tpl = 'Chào {{tên}}, đơn {{mã}} ngày {{ngày}}';
    expect(extractTemplateVariables(tpl)).toEqual(['tên', 'mã', 'ngày']);
    expect(interpolateTemplate(tpl, { tên: 'Minh', mã: 'K01', ngày: '25/11' })).toBe(
      'Chào Minh, đơn K01 ngày 25/11'
    );

    const diff = computeLineDiff('dòng 1\ndòng 2', 'dòng 1\ndòng 2 mới');
    expect(diff).toEqual([
      { type: 'same', text: 'dòng 1' },
      { type: 'remove', text: 'dòng 2' },
      { type: 'add', text: 'dòng 2 mới' },
    ]);

    const metrics = computeTextMetrics('Một hai ba\nBốn năm');
    expect(metrics.words).toBe(5);
    expect(metrics.lines).toBe(2);
  });

  it('supports dedupeLines, sortLines and removeTones options in normalizeText', () => {
    const raw = 'cam\nan\ncam\nbình';
    const res = normalizeText(raw, {
      ...DEFAULT_NORMALIZER_OPTIONS,
      unwrapLines: false,
      autoCapitalize: false,
      dedupeLines: true,
      sortLines: true,
      removeTones: true,
    });
    expect(res.output).toBe('an\nbinh\ncam');
  });

  it('diffs edits inside long documents cleanly via prefix/suffix trimming', () => {
    const before = ['head1', 'head2', 'old line', 'tail1', 'tail2'].join('\n');
    const after = ['head1', 'head2', 'new line a', 'new line b', 'tail1', 'tail2'].join('\n');
    expect(computeLineDiff(before, after)).toEqual([
      { type: 'same', text: 'head1' },
      { type: 'same', text: 'head2' },
      { type: 'remove', text: 'old line' },
      { type: 'add', text: 'new line a' },
      { type: 'add', text: 'new line b' },
      { type: 'same', text: 'tail1' },
      { type: 'same', text: 'tail2' },
    ]);
  });

  it('builds valid EMVCo VietQR with CRC-16 and round-trips through parseQrPayload', () => {
    expect(computeCrc16Ccitt('123456789')).toBe('29B1');

    const qr = buildVietQrString({
      bankBin: '970422',
      accountNumber: '090123456789',
      amount: '150000',
      purpose: 'Thanh toán đơn hàng',
    });
    expect(qr.startsWith('000201010212')).toBe(true);
    expect(qr.slice(-4)).toBe(computeCrc16Ccitt(qr.slice(0, -4)));

    const parsed = parseQrPayload(qr);
    expect(parsed.kind).toBe('vietqr');
    if (parsed.kind === 'vietqr') {
      expect(parsed.bankShortName).toBe('MB');
      expect(parsed.accountNumber).toBe('090123456789');
      expect(parsed.amount).toBe('150000');
      expect(parsed.purpose).toBe('Thanh toan don hang');
    }

    const staticQr = buildVietQrString({
      bankBin: '970436',
      accountNumber: '1122334455',
    });
    expect(staticQr.startsWith('000201010211')).toBe(true);
  });

  it('normalizes multilingual OCR text while collapsing multiple spaces and extracting contacts', () => {
    const raw =
      'Xin   chào\u200B  Khách\t\tHàng\n日本語  テスト · 한국어   테스트 · 中文  测试\nSĐT:   0912.345.678  |   email:  shipper@khuon.vn';
    const res = normalizeOcrText(raw, true);
    expect(res.text).toBe(
      'Xin chào Khách Hàng\n日本語 テスト · 한국어 테스트 · 中文 测试\nSĐT: 0912.345.678 | email: shipper@khuon.vn'
    );
    expect(res.entities.phones).toContain('0912345678');
    expect(res.entities.emails).toEqual(['shipper@khuon.vn']);
  });
});
