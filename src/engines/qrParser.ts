import { ParsedQrPayload } from '../types/app';

export const VIETNAM_BANK_BINS: Record<string, { short: string; name: string }> = {
  '970436': { short: 'VCB', name: 'Vietcombank' },
  '970407': { short: 'TCB', name: 'Techcombank' },
  '970422': { short: 'MB', name: 'MB Bank' },
  '970415': { short: 'VTB', name: 'VietinBank' },
  '970418': { short: 'BIDV', name: 'BIDV' },
  '970416': { short: 'ACB', name: 'ACB' },
  '970423': { short: 'TPB', name: 'TPBank' },
  '970432': { short: 'VPB', name: 'VPBank' },
  '970405': { short: 'AGRI', name: 'Agribank' },
  '970403': { short: 'STB', name: 'Sacombank' },
  '970448': { short: 'OCB', name: 'OCB' },
  '970437': { short: 'HDB', name: 'HDBank' },
  '970441': { short: 'VIB', name: 'VIB' },
  '970426': { short: 'MSB', name: 'MSB' },
  '970443': { short: 'SHB', name: 'SHB' },
  '970431': { short: 'EIB', name: 'Eximbank' },
  '970454': { short: 'BVB', name: 'BVBank (VietCapital)' },
  '970449': { short: 'LPB', name: 'LPBank' },
  '970428': { short: 'NAB', name: 'Nam A Bank' },
  '970429': { short: 'SCB', name: 'SCB' },
  '970425': { short: 'ABB', name: 'ABBank' },
  '970438': { short: 'BVB', name: 'BaoViet Bank' },
  '970433': { short: 'VIETBANK', name: 'VietBank' },
  '970440': { short: 'SEAB', name: 'SeABank' },
  '970414': { short: 'OCEAN', name: 'MBV (OceanBank)' },
  '970419': { short: 'NCB', name: 'NCB' },
  '970406': { short: 'DAB', name: 'DongA Bank' },
  '970430': { short: 'PGB', name: 'PGBank' },
  '970424': { short: 'SHBVN', name: 'Shinhan Bank' },
  '970458': { short: 'UBANK', name: 'Ubank by VPBank' },
  '546034': { short: 'CAKE', name: 'CAKE by VPBank' },
  '546035': { short: 'UBANK', name: 'Ubank by VPBank' },
  '963388': { short: 'TIMO', name: 'Timo Digital Bank' },
  '971005': { short: 'VIETTEL', name: 'Viettel Money' },
  '971011': { short: 'VNPT', name: 'VNPT Money' },
};

function parseEmvTlv(payload: string): Record<string, string> {
  const tags: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lenStr)) break;
    const len = Number(lenStr);
    const valStart = i + 4;
    const valEnd = valStart + len;
    if (valEnd > payload.length) break;
    tags[tag] = payload.slice(valStart, valEnd);
    i = valEnd;
  }
  return tags;
}

function unescapeWifiValue(value: string): string {
  return value.replace(/\\([\\;,:])/g, '$1');
}

export function parseQrPayload(rawInput: string): ParsedQrPayload {
  const raw = rawInput.trim();

  // 1. VietQR / EMVCo Banking QR
  if (raw.startsWith('000201')) {
    const root = parseEmvTlv(raw);
    const merchantRaw = root['38'] || root['26'] || root['27'] || '';
    if (merchantRaw) {
      const mTags = parseEmvTlv(merchantRaw);
      const guid = mTags['00'] || '';
      const beneficiaryRaw = mTags['01'] || '';
      if (guid.includes('A000000727') || beneficiaryRaw) {
        const bTags = parseEmvTlv(beneficiaryRaw);
        const bankBin = bTags['00'] || '';
        const accountNumber = bTags['01'] || beneficiaryRaw;
        const bankInfo = VIETNAM_BANK_BINS[bankBin];
        const additionalRaw = root['62'] || '';
        const addTags = additionalRaw ? parseEmvTlv(additionalRaw) : {};
        const purpose = addTags['08'] || addTags['05'] || undefined;

        if (accountNumber) {
          return {
            kind: 'vietqr',
            bankBin,
            bankName: bankInfo?.name ?? (bankBin ? `BIN ${bankBin}` : 'Ngân hàng VN'),
            bankShortName: bankInfo?.short ?? 'BANK',
            accountNumber,
            amount: root['54'] || undefined,
            purpose,
            raw,
          };
        }
      }
    }
  }

  // 2. Wi-Fi QR: WIFI:T:WPA;S:MyNetwork;P:MyPass;H:false;;
  if (/^WIFI:/i.test(raw)) {
    const body = raw.slice(5);
    const fields: Record<string, string> = {};
    // Split on unescaped semicolons
    const parts = body.split(/(?<!\\);/);
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx > 0) {
        const k = part.slice(0, idx).toUpperCase();
        const v = unescapeWifiValue(part.slice(idx + 1));
        fields[k] = v;
      }
    }
    return {
      kind: 'wifi',
      ssid: fields['S'] || '(Không tên)',
      password: fields['P'] || '',
      security: fields['T'] || 'OPEN',
      hidden: fields['H']?.toLowerCase() === 'true',
      raw,
    };
  }

  // 3. vCard QR
  if (/^BEGIN:VCARD/i.test(raw)) {
    const lines = raw.split(/\r?\n/);
    let name = '';
    let org: string | undefined;
    let address: string | undefined;
    const phones: string[] = [];
    const emails: string[] = [];

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx < 0) continue;
      const key = line.slice(0, colonIdx).toUpperCase().split(';')[0];
      const val = line.slice(colonIdx + 1).trim();
      if (!val) continue;
      if (key === 'FN') name = val;
      else if (key === 'N' && !name) name = val.split(';').filter(Boolean).reverse().join(' ');
      else if (key === 'TEL') phones.push(val);
      else if (key === 'EMAIL') emails.push(val);
      else if (key === 'ORG') org = val;
      else if (key === 'ADR') address = val.split(';').filter(Boolean).join(', ');
    }

    return {
      kind: 'vcard',
      name: name || 'Danh bạ',
      phones,
      emails,
      org,
      address,
      raw,
    };
  }

  // 4. URL
  if (/^https?:\/\/\S+$/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      return {
        kind: 'url',
        url: raw,
        host: parsed.hostname,
        protocol: parsed.protocol.replace(':', '').toUpperCase(),
        raw,
      };
    } catch {
      // fall through to text
    }
  }

  return {
    kind: 'text',
    text: raw,
    raw,
  };
}

export function summarizeQrPayload(parsed: ParsedQrPayload): string {
  switch (parsed.kind) {
    case 'vietqr':
      return `${parsed.bankShortName} · ${parsed.accountNumber}${parsed.amount ? ` · ${parsed.amount}đ` : ''}`;
    case 'wifi':
      return `Wi-Fi: ${parsed.ssid}`;
    case 'url':
      return parsed.host;
    case 'vcard':
      return `${parsed.name}${parsed.phones[0] ? ` · ${parsed.phones[0]}` : ''}`;
    case 'text':
      return parsed.text.slice(0, 48).replace(/\s+/g, ' ');
  }
}

export function buildWifiQrString(ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass' = 'WPA'): string {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1');
  if (security === 'nopass' || !password) {
    return `WIFI:T:nopass;S:${esc(ssid)};;`;
  }
  return `WIFI:T:${security};S:${esc(ssid)};P:${esc(password)};;`;
}
