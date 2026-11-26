import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, ThemePalette } from '../theme/tokens';
import { TabKey } from '../types/app';
import { hapticTap } from '../services/haptics';

interface ChannelItem {
  key: TabKey;
  code: string;
  label: string;
}

const CHANNELS: ChannelItem[] = [
  { key: 'vault', code: '01', label: 'KHO MÃ' },
  { key: 'qr', code: '02', label: 'QUÉT QR' },
  { key: 'ocr', code: '03', label: 'QUÉT CHỮ' },
  { key: 'settings', code: '04', label: 'CÀI ĐẶT' },
];

interface ChannelBarProps {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
  theme: ThemePalette;
}

export const ChannelBar = React.memo(function ChannelBar({
  active,
  onSelect,
  theme,
}: ChannelBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      {CHANNELS.map((ch, idx) => {
        const isActive = ch.key === active;
        return (
          <Pressable
            key={ch.key}
            onPress={() => {
              if (!isActive) {
                hapticTap('light');
                onSelect(ch.key);
              }
            }}
            style={({ pressed }) => [
              styles.item,
              idx > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border },
              {
                backgroundColor: isActive
                  ? theme.well
                  : pressed
                    ? theme.bg
                    : 'transparent',
              },
            ]}
          >
            <View
              style={[
                styles.topRail,
                {
                  backgroundColor: isActive ? theme.accent : 'transparent',
                },
              ]}
            />
            <Text
              style={[
                styles.code,
                { color: isActive ? theme.accent : theme.inkMuted },
              ]}
            >
              {ch.code}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: isActive ? theme.ink : theme.inkSecondary,
                  fontFamily: isActive ? theme.uiFontBold : theme.uiFontMedium,
                },
              ]}
            >
              {ch.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 7,
    paddingBottom: 5,
    position: 'relative',
  },
  topRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  code: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
