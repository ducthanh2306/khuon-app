import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'qrcode';
import Svg, { Path, Rect } from 'react-native-svg';
import { FONTS, RADII, ThemePalette } from '../theme/tokens';

interface SvgQrCodeProps {
  value: string;
  size?: number;
  theme: ThemePalette;
  svgRef?: React.RefObject<Svg | null>;
}

export const SvgQrCode = React.memo(function SvgQrCode({
  value,
  size = 200,
  theme,
  svgRef,
}: SvgQrCodeProps) {
  const pathData = useMemo(() => {
    const clean = value.trim();
    if (!clean) return null;
    try {
      const qr = QRCode.create(clean, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      const data = qr.modules.data;
      // Run-length encode contiguous horizontal dark modules per row (~65% fewer SVG commands)
      const parts: string[] = [];
      for (let r = 0; r < count; r += 1) {
        const rowOffset = r * count;
        let c = 0;
        while (c < count) {
          if (!data[rowOffset + c]) {
            c += 1;
            continue;
          }
          const start = c;
          while (c < count && data[rowOffset + c]) {
            c += 1;
          }
          const len = c - start;
          parts.push(`M${start} ${r}h${len}v1h-${len}z`);
        }
      }
      return { d: parts.join(''), count };
    } catch {
      return null;
    }
  }, [value]);

  if (!pathData) {
    return (
      <View
        style={[
          styles.emptyBox,
          {
            width: size,
            height: size,
            borderColor: theme.border,
            backgroundColor: theme.well,
          },
        ]}
      >
        <Text style={[styles.emptyText, { color: theme.inkMuted }]}>
          NHẬP NỘI DUNG ĐỂ TẠO MÃ QR
        </Text>
      </View>
    );
  }

  // Always render QR code on crisp white quiet-zone so any scanner camera reads reliably
  const quietZone = 2;
  const viewSize = pathData.count + quietZone * 2;

  return (
    <View style={[styles.frame, { borderColor: theme.border }]}>
      <Svg
        ref={svgRef as any}
        width={size}
        height={size}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
      >
        <Rect x={0} y={0} width={viewSize} height={viewSize} fill="#FFFFFF" />
        <Path
          d={pathData.d}
          fill="#111110"
          transform={`translate(${quietZone}, ${quietZone})`}
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: RADII.xs,
    alignSelf: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADII.xs,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    padding: 16,
  },
  emptyText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
});
