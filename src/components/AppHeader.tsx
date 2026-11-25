import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { FONTS, RADII, ThemePalette } from '../theme/tokens';
import { TabKey } from '../types/app';
import { hapticTap } from '../services/haptics';

const CHANNEL_TITLES: Record<TabKey, string> = {
  vault: '01 // KHO MÃ',
  qr: '02 // QUÉT QR',
  filter: '03 // LỌC DỮ LIỆU',
};

interface AppHeaderProps {
  activeTab: TabKey;
  theme: ThemePalette;
  onToggleTheme: () => void;
}

export const AppHeader = React.memo(function AppHeader({
  activeTab,
  theme,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
        <Text style={[styles.brand, { color: theme.ink }]}>KHUÔN</Text>
        <View style={[styles.vRule, { backgroundColor: theme.border }]} />
        <Text style={[styles.channel, { color: theme.inkSecondary }]}>
          {CHANNEL_TITLES[activeTab]}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          hapticTap('light');
          onToggleTheme();
        }}
        style={({ pressed }) => [
          styles.themeBtn,
          {
            borderColor: theme.border,
            backgroundColor: pressed ? theme.well : theme.bg,
          },
        ]}
      >
        {theme.mode === 'paper' ? (
          <Moon size={13} color={theme.ink} strokeWidth={1.8} />
        ) : (
          <Sun size={13} color={theme.ink} strokeWidth={1.8} />
        )}
        <Text style={[styles.themeLabel, { color: theme.ink }]}>
          {theme.mode === 'paper' ? 'GIẤY' : 'THAN'}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    height: 48,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 1,
    marginRight: 8,
  },
  brand: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    letterSpacing: 1.4,
  },
  vRule: {
    width: 1,
    height: 14,
    marginHorizontal: 10,
  },
  channel: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  themeLabel: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    letterSpacing: 0.7,
  },
});
