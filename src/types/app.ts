export type ThemeMode = 'paper' | 'charcoal';

export type TabKey = 'vault' | 'qr' | 'filter';

export type NormalizerPresetId =
  | 'document'
  | 'message'
  | 'list'
  | 'code'
  | 'custom';

export interface NormalizerOptions {
  fixDiacritics: boolean;
  modernTonePlacement: boolean; // hòa / thúy vs hoà / thuý
  stripInvisible: boolean;
  unwrapLines: boolean;
  fixPunctuationSpacing: boolean;
  normalizeBullets: boolean;
  autoCapitalize: boolean;
  straightenQuotes: boolean;
  formatAsNumberedList: boolean;
  dedupeLines?: boolean;
  removeTones?: boolean;
  sortLines?: boolean;
}

export interface ExtractedEntities {
  phones: string[];
  emails: string[];
  urls: string[];
  codes: string[];
}

export interface NormalizerStats {
  charsBefore: number;
  charsAfter: number;
  linesBefore: number;
  linesAfter: number;
  invisibleRemoved: number;
  diacriticsFixed: number;
  linesMerged: number;
  spacesNormalized: number;
}

export interface NormalizerResult {
  output: string;
  stats: NormalizerStats;
  entities: ExtractedEntities;
}

export type SnippetCategory =
  | 'bank'
  | 'code'
  | 'reply'
  | 'address'
  | 'work'
  | 'other';

export interface SnippetItem {
  id: string;
  title: string;
  content: string;
  category: SnippetCategory;
  pinned: boolean;
  sensitive: boolean;
  copyCount: number;
  createdAt: number;
  updatedAt: number;
}

export type QrKind = 'vietqr' | 'wifi' | 'url' | 'vcard' | 'text';

export interface ParsedVietQr {
  kind: 'vietqr';
  bankBin: string;
  bankName: string;
  bankShortName: string;
  accountNumber: string;
  amount?: string;
  purpose?: string;
  raw: string;
}

export interface ParsedWifiQr {
  kind: 'wifi';
  ssid: string;
  password: string;
  security: string;
  hidden: boolean;
  raw: string;
}

export interface ParsedUrlQr {
  kind: 'url';
  url: string;
  host: string;
  protocol: string;
  raw: string;
}

export interface ParsedVcardQr {
  kind: 'vcard';
  name: string;
  phones: string[];
  emails: string[];
  org?: string;
  address?: string;
  raw: string;
}

export interface ParsedTextQr {
  kind: 'text';
  text: string;
  raw: string;
}

export type ParsedQrPayload =
  | ParsedVietQr
  | ParsedWifiQr
  | ParsedUrlQr
  | ParsedVcardQr
  | ParsedTextQr;

export interface QrHistoryItem {
  id: string;
  raw: string;
  kind: QrKind;
  summary: string;
  scannedAt: number;
}
