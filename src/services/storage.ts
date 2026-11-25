import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NormalizerOptions,
  QrHistoryItem,
  SnippetItem,
  ThemeMode,
} from '../types/app';
import { DEFAULT_NORMALIZER_OPTIONS } from '../engines/textNormalizer';

const KEYS = {
  snippets: '@khuon/snippets_v1',
  qrHistory: '@khuon/qr_history_v1',
  theme: '@khuon/theme_v1',
  normalizerOptions: '@khuon/norm_opts_v1',
  draftInput: '@khuon/draft_input_v1',
};

const SEED_SNIPPETS: SnippetItem[] = [
  {
    id: 'seed-bank-1',
    title: 'Số TK nhận chuyển khoản (Mẫu)',
    content: 'MB Bank · 090123456789 · NGUYEN VAN A',
    category: 'bank',
    pinned: true,
    sensitive: false,
    copyCount: 12,
    createdAt: 1764000000000,
    updatedAt: 1764000000000,
  },
  {
    id: 'seed-reply-1',
    title: 'Xác nhận giao đơn (Mẫu biến số)',
    content:
      'Chào {{tên}}, đơn hàng {{mã_đơn}} dự kiến giao ngày {{ngày}}. Anh/chị giữ máy giúp em nhé!',
    category: 'reply',
    pinned: true,
    sensitive: false,
    copyCount: 8,
    createdAt: 1764000100000,
    updatedAt: 1764000100000,
  },
  {
    id: 'seed-code-1',
    title: 'Mã số thuế / CCCD (Ẩn bảo mật)',
    content: '079095001234',
    category: 'code',
    pinned: false,
    sensitive: true,
    copyCount: 4,
    createdAt: 1764000200000,
    updatedAt: 1764000200000,
  },
  {
    id: 'seed-addr-1',
    title: 'Địa chỉ nhận hàng cố định',
    content: 'Số 12 Nguyễn Thị Minh Khai, P. Bến Nghé, Q.1, TP.HCM',
    category: 'address',
    pinned: false,
    sensitive: false,
    copyCount: 5,
    createdAt: 1764000300000,
    updatedAt: 1764000300000,
  },
];

export async function loadSnippets(): Promise<SnippetItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.snippets);
    if (!raw) {
      await AsyncStorage.setItem(KEYS.snippets, JSON.stringify(SEED_SNIPPETS));
      return SEED_SNIPPETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_SNIPPETS;
  } catch {
    return SEED_SNIPPETS;
  }
}

export async function saveSnippets(items: SnippetItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.snippets, JSON.stringify(items));
}

export async function loadQrHistory(): Promise<QrHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.qrHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveQrHistory(items: QrHistoryItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.qrHistory, JSON.stringify(items.slice(0, 60)));
}

export async function loadThemeMode(): Promise<ThemeMode> {
  const systemFallback: ThemeMode =
    Appearance.getColorScheme() === 'dark' ? 'charcoal' : 'paper';
  try {
    const val = await AsyncStorage.getItem(KEYS.theme);
    if (val === 'charcoal' || val === 'paper') return val;
    return systemFallback;
  } catch {
    return systemFallback;
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.theme, mode);
}

export async function loadNormalizerOptions(): Promise<NormalizerOptions> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.normalizerOptions);
    if (!raw) return DEFAULT_NORMALIZER_OPTIONS;
    return { ...DEFAULT_NORMALIZER_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NORMALIZER_OPTIONS;
  }
}

export async function saveNormalizerOptions(opts: NormalizerOptions): Promise<void> {
  await AsyncStorage.setItem(KEYS.normalizerOptions, JSON.stringify(opts));
}

export async function loadDraftInput(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEYS.draftInput)) ?? '';
  } catch {
    return '';
  }
}

export async function saveDraftInput(text: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.draftInput, text);
}

export interface HydratedAppState {
  themeMode: ThemeMode;
  snippets: SnippetItem[];
  qrHistory: QrHistoryItem[];
  normOptions: NormalizerOptions;
  draftInput: string;
}

export async function hydrateAppState(): Promise<HydratedAppState> {
  const [themeMode, snippets, qrHistory, normOptions, draftInput] =
    await Promise.all([
      loadThemeMode(),
      loadSnippets(),
      loadQrHistory(),
      loadNormalizerOptions(),
      loadDraftInput(),
    ]);
  return { themeMode, snippets, qrHistory, normOptions, draftInput };
}
