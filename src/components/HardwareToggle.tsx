import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RADII, ThemePalette, scaleFont } from '../theme/tokens';
import { hapticTap } from '../services/haptics';

interface HardwareToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (next: boolean) => void;
  theme: ThemePalette;
}

export const HardwareToggle = React.memo(function HardwareToggle({
  label,
  description,
  value,
  onToggle,
  theme,
}: HardwareToggleProps) {
  return (
    <Pressable
      onPress={() => {
        hapticTap('light');
        onToggle(!value);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.border,
          backgroundColor: pressed ? theme.well : 'transparent',
        },
      ]}
    >
      <View style={styles.textCol}>
        <Text
          style={[
            styles.label,
            {
              color: theme.ink,
              fontFamily: theme.uiFontMedium,
              fontSize: scaleFont(13.5, theme),
            },
          ]}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              styles.desc,
              {
                color: theme.inkMuted,
                fontFamily: theme.uiFontRegular,
                fontSize: scaleFont(11.5, theme),
              },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: value ? theme.accent : theme.well,
            borderColor: value ? theme.accent : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            {
              backgroundColor: value ? theme.accentInk : theme.inkMuted,
              transform: [{ translateX: value ? 18 : 2 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  textCol: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 13.5,
  },
  desc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: RADII.xs,
    borderWidth: 1,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 18,
    height: 16,
    borderRadius: 2,
  },
});
