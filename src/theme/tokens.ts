import { Platform } from 'react-native';
import { ThemeMode } from '../types/app';

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
}

export const PAPER_THEME: ThemePalette = {
  mode: 'paper',
  bg: '#F4F3EF', // Warm archival matte paper (Braun / Swiss)
  surface: '#FBFAF7', // Crisp paper sheet
  well: '#ECEAE3', // Recessed mechanical input/well
  ink: '#141413', // Carbon ink
  inkSecondary: '#54524C', // Warm graphite
  inkMuted: '#858178', // Technical metadata ink
  border: '#D8D5CC', // 1px structural grid rule
  borderStrong: '#141413',
  accent: '#E84A1A', // Signal vermilion-orange (Dieter Rams / TE)
  accentInk: '#FFFFFF',
  accentSoft: '#FCECE6',
  success: '#1D6B48',
  successSoft: '#E6F2EC',
  warning: '#A66000',
  warningSoft: '#F9EFE0',
  danger: '#BF2C1E',
  dangerSoft: '#FAE8E6',
  statusBarStyle: 'dark',
};

export const CHARCOAL_THEME: ThemePalette = {
  mode: 'charcoal',
  bg: '#111110', // Matte OLED charcoal hardware
  surface: '#191917',
  well: '#222220',
  ink: '#F2F0EA',
  inkSecondary: '#A8A59D',
  inkMuted: '#75726B',
  border: '#2C2B27',
  borderStrong: '#F2F0EA',
  accent: '#FF5A26', // High-contrast instrument orange
  accentInk: '#111110',
  accentSoft: '#331B12',
  success: '#3CA374',
  successSoft: '#162920',
  warning: '#E0922B',
  warningSoft: '#2E2212',
  danger: '#E35649',
  dangerSoft: '#2E1715',
  statusBarStyle: 'light',
};

export const THEMES: Record<ThemeMode, ThemePalette> = {
  paper: PAPER_THEME,
  charcoal: CHARCOAL_THEME,
};

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
  }),
  fallbackMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  }),
};

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
