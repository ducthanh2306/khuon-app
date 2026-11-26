import { Platform } from 'react-native';
import {
  AccentColorId,
  AppSettings,
  FontFamilyId,
  FontScaleId,
  InkContrastId,
  ThemeMode,
} from '../types/app';

export interface ThemePalette {
  mode: ThemeMode;
  bg: string;
  surface: string;
  well: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  statusBarStyle: 'dark' | 'light';
  uiFontRegular: string;
  uiFontMedium: string;
  uiFontSemiBold: string;
  uiFontBold: string;
  fontScale: number;
}

export const FONTS = {
  sansRegular: 'BeVietnamPro_400Regular',
  sansMedium: 'BeVietnamPro_500Medium',
  sansSemiBold: 'BeVietnamPro_600SemiBold',
  sansBold: 'BeVietnamPro_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
  fallbackSans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, sans-serif',
  }) as string,
  fallbackMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  }) as string,
  fallbackSerif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, Cambria, serif',
  }) as string,
};

export const PAPER_THEME: ThemePalette = {
  mode: 'paper',
  bg: '#F4F3EF',
  surface: '#FBFAF7',
  well: '#ECEAE3',
  ink: '#141413',
  inkSecondary: '#54524C',
  inkMuted: '#858178',
  border: '#D8D5CC',
  borderStrong: '#141413',
  accent: '#E84A1A',
  accentInk: '#FFFFFF',
  accentSoft: '#FCECE6',
  success: '#1D6B48',
  successSoft: '#E6F2EC',
  warning: '#A66000',
  warningSoft: '#F9EFE0',
  danger: '#BF2C1E',
  dangerSoft: '#FAE8E6',
  statusBarStyle: 'dark',
  uiFontRegular: FONTS.sansRegular,
  uiFontMedium: FONTS.sansMedium,
  uiFontSemiBold: FONTS.sansSemiBold,
  uiFontBold: FONTS.sansBold,
  fontScale: 1,
};

export const CHARCOAL_THEME: ThemePalette = {
  mode: 'charcoal',
  bg: '#111110',
  surface: '#191917',
  well: '#222220',
  ink: '#F2F0EA',
  inkSecondary: '#A8A59D',
  inkMuted: '#75726B',
  border: '#2C2B27',
  borderStrong: '#F2F0EA',
  accent: '#FF5A26',
  accentInk: '#111110',
  accentSoft: '#331B12',
  success: '#3CA374',
  successSoft: '#162920',
  warning: '#E0922B',
  warningSoft: '#2E2212',
  danger: '#E35649',
  dangerSoft: '#2E1715',
  statusBarStyle: 'light',
  uiFontRegular: FONTS.sansRegular,
  uiFontMedium: FONTS.sansMedium,
  uiFontSemiBold: FONTS.sansSemiBold,
  uiFontBold: FONTS.sansBold,
  fontScale: 1,
};

export const THEMES: Record<ThemeMode, ThemePalette> = {
  paper: PAPER_THEME,
  charcoal: CHARCOAL_THEME,
};

export const ACCENT_PRESETS: Record<
  AccentColorId,
  {
    label: string;
    paper: { accent: string; accentInk: string; accentSoft: string };
    charcoal: { accent: string; accentInk: string; accentSoft: string };
  }
> = {
  vermilion: {
    label: 'Cam Tín Hiệu',
    paper: { accent: '#E84A1A', accentInk: '#FFFFFF', accentSoft: '#FCECE6' },
    charcoal: { accent: '#FF5A26', accentInk: '#111110', accentSoft: '#331B12' },
  },
  cobalt: {
    label: 'Xanh Cobalt',
    paper: { accent: '#1E5CE6', accentInk: '#FFFFFF', accentSoft: '#E7EEFC' },
    charcoal: { accent: '#4E88FF', accentInk: '#111110', accentSoft: '#14223B' },
  },
  emerald: {
    label: 'Xanh Ngọc',
    paper: { accent: '#187A4E', accentInk: '#FFFFFF', accentSoft: '#E4F3EC' },
    charcoal: { accent: '#32B376', accentInk: '#111110', accentSoft: '#132B20' },
  },
  amber: {
    label: 'Vàng Hổ Phách',
    paper: { accent: '#BA6B00', accentInk: '#FFFFFF', accentSoft: '#F8EFE0' },
    charcoal: { accent: '#F0A030', accentInk: '#111110', accentSoft: '#2E2110' },
  },
  crimson: {
    label: 'Đỏ Đậm',
    paper: { accent: '#C92A2A', accentInk: '#FFFFFF', accentSoft: '#FAE7E7' },
    charcoal: { accent: '#F05454', accentInk: '#111110', accentSoft: '#301515' },
  },
  indigo: {
    label: 'Chàm Mực',
    paper: { accent: '#5338D4', accentInk: '#FFFFFF', accentSoft: '#EDE9FB' },
    charcoal: { accent: '#8A73FF', accentInk: '#111110', accentSoft: '#1F1938' },
  },
};

export const FONT_PRESETS: Record<
  FontFamilyId,
  {
    label: string;
    sample: string;
    regular: string;
    medium: string;
    semiBold: string;
    bold: string;
  }
> = {
  vietnam: {
    label: 'Be Vietnam Pro',
    sample: 'Chữ hiện đại, rõ dấu tiếng Việt',
    regular: FONTS.sansRegular,
    medium: FONTS.sansMedium,
    semiBold: FONTS.sansSemiBold,
    bold: FONTS.sansBold,
  },
  mono: {
    label: 'JetBrains Mono',
    sample: 'Chữ kỹ thuật đồng đều 01234',
    regular: FONTS.monoRegular,
    medium: FONTS.monoMedium,
    semiBold: FONTS.monoMedium,
    bold: FONTS.monoBold,
  },
  system: {
    label: 'Hệ thống',
    sample: 'Phông chữ mặc định của thiết bị',
    regular: FONTS.fallbackSans,
    medium: FONTS.fallbackSans,
    semiBold: FONTS.fallbackSans,
    bold: FONTS.fallbackSans,
  },
  serif: {
    label: 'Sách (Serif)',
    sample: 'Kiểu chữ có chân dễ đọc tài liệu',
    regular: FONTS.fallbackSerif,
    medium: FONTS.fallbackSerif,
    semiBold: FONTS.fallbackSerif,
    bold: FONTS.fallbackSerif,
  },
};

export const FONT_SCALE_FACTORS: Record<
  FontScaleId,
  { label: string; factor: number }
> = {
  small: { label: 'Nhỏ (0.9×)', factor: 0.9 },
  normal: { label: 'Chuẩn (1.0×)', factor: 1.0 },
  large: { label: 'Lớn (1.15×)', factor: 1.15 },
  xlarge: { label: 'Rất lớn (1.3×)', factor: 1.3 },
};

const INK_OVERRIDES: Record<
  ThemeMode,
  Record<InkContrastId, { ink: string; inkSecondary: string; inkMuted: string }>
> = {
  paper: {
    default: { ink: '#141413', inkSecondary: '#54524C', inkMuted: '#858178' },
    high: { ink: '#000000', inkSecondary: '#222220', inkMuted: '#575550' },
    warm: { ink: '#2F271E', inkSecondary: '#665A4C', inkMuted: '#918474' },
  },
  charcoal: {
    default: { ink: '#F2F0EA', inkSecondary: '#A8A59D', inkMuted: '#75726B' },
    high: { ink: '#FFFFFF', inkSecondary: '#D4D1C9', inkMuted: '#99968E' },
    warm: { ink: '#F2E5CF', inkSecondary: '#BFA98B', inkMuted: '#8A7860' },
  },
};

export function createDefaultSettings(mode: ThemeMode = 'paper'): AppSettings {
  return {
    themeMode: mode,
    accentColor: 'vermilion',
    fontFamily: 'vietnam',
    fontScale: 'normal',
    inkContrast: 'default',
    hapticsEnabled: true,
    autoNormalizeOcr: true,
    defaultOcrLang: 'auto',
  };
}

export function resolveTheme(settings: AppSettings): ThemePalette {
  const base = THEMES[settings.themeMode] ?? PAPER_THEME;
  const accentSet =
    ACCENT_PRESETS[settings.accentColor]?.[settings.themeMode] ??
    ACCENT_PRESETS.vermilion[settings.themeMode];
  const fontSet = FONT_PRESETS[settings.fontFamily] ?? FONT_PRESETS.vietnam;
  const inkSet =
    INK_OVERRIDES[settings.themeMode]?.[settings.inkContrast] ??
    INK_OVERRIDES[settings.themeMode].default;
  const scale = FONT_SCALE_FACTORS[settings.fontScale]?.factor ?? 1;

  return {
    ...base,
    ...accentSet,
    ...inkSet,
    uiFontRegular: fontSet.regular,
    uiFontMedium: fontSet.medium,
    uiFontSemiBold: fontSet.semiBold,
    uiFontBold: fontSet.bold,
    fontScale: scale,
  };
}

export function scaleFont(size: number, theme: ThemePalette): number {
  return Math.round(size * theme.fontScale * 10) / 10;
}

export const RADII = {
  none: 0,
  xs: 3,
  sm: 6,
  md: 8,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};
