import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { FONTS, RADII, ThemePalette } from '../theme/tokens';
import { hapticTap } from '../services/haptics';

interface TactileButtonProps {
  label: string;
  onPress: () => void;
  theme: ThemePalette;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  mono?: boolean;
}

export const TactileButton = React.memo(function TactileButton({
  label,
  onPress,
  theme,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled = false,
  style,
  textStyle,
  mono = false,
}: TactileButtonProps) {
  const bg =
    variant === 'primary'
      ? theme.accent
      : variant === 'danger'
        ? theme.dangerSoft
        : variant === 'ghost'
          ? 'transparent'
          : theme.surface;

  const borderColor =
    variant === 'primary'
      ? theme.accent
      : variant === 'danger'
        ? theme.danger
        : variant === 'ghost'
          ? 'transparent'
          : theme.border;

  const fg =
    variant === 'primary'
      ? theme.accentInk
      : variant === 'danger'
        ? theme.danger
        : theme.ink;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        hapticTap(variant === 'primary' ? 'medium' : 'light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          size === 'sm' ? styles.labelSm : styles.labelMd,
          {
            color: fg,
            fontFamily: mono ? FONTS.monoMedium : FONTS.sansSemiBold,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADII.xs,
  },
  md: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sm: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  iconWrap: {
    marginRight: 6,
  },
  label: {
    letterSpacing: 0.2,
  },
  labelMd: {
    fontSize: 13,
  },
  labelSm: {
    fontSize: 11.5,
  },
});
