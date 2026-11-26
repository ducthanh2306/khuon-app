import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { RADII, ThemePalette } from '../theme/tokens';

export interface NormalizedCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageRegionCropperProps {
  uri: string;
  imageWidth: number;
  imageHeight: number;
  crop: NormalizedCropRect;
  onChangeCrop: (next: NormalizedCropRect) => void;
  onGestureActive?: (active: boolean) => void;
  theme: ThemePalette;
  stageHeight?: number;
}

const MIN_CROP = 0.08;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const ImageRegionCropper = React.memo(function ImageRegionCropper({
  uri,
  imageWidth,
  imageHeight,
  crop,
  onChangeCrop,
  onGestureActive,
  theme,
  stageHeight = 320,
}: ImageRegionCropperProps) {
  const [stageWidth, setStageWidth] = useState(320);

  const cropRef = useRef(crop);
  cropRef.current = crop;
  const onChangeRef = useRef(onChangeCrop);
  onChangeRef.current = onChangeCrop;
  const onGestureRef = useRef(onGestureActive);
  onGestureRef.current = onGestureActive;

  const layout = useMemo(() => {
    const safeImgW = Math.max(1, imageWidth);
    const safeImgH = Math.max(1, imageHeight);
    const scale = Math.min(stageWidth / safeImgW, stageHeight / safeImgH);
    const renderW = Math.max(40, safeImgW * scale);
    const renderH = Math.max(40, safeImgH * scale);
    const offsetX = (stageWidth - renderW) / 2;
    const offsetY = (stageHeight - renderH) / 2;
    return { renderW, renderH, offsetX, offsetY };
  }, [stageWidth, stageHeight, imageWidth, imageHeight]);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const startCropRef = useRef<NormalizedCropRect>(crop);

  const makeResponder = (
    mode: 'move' | 'tl' | 'tr' | 'bl' | 'br'
  ) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startCropRef.current = { ...cropRef.current };
        onGestureRef.current?.(true);
      },
      onPanResponderMove: (_evt, gs) => {
        const { renderW, renderH } = layoutRef.current;
        const dx = gs.dx / Math.max(1, renderW);
        const dy = gs.dy / Math.max(1, renderH);
        const s = startCropRef.current;

        if (mode === 'move') {
          const nx = clamp(s.x + dx, 0, 1 - s.w);
          const ny = clamp(s.y + dy, 0, 1 - s.h);
          onChangeRef.current({ x: nx, y: ny, w: s.w, h: s.h });
          return;
        }

        const right = s.x + s.w;
        const bottom = s.y + s.h;

        if (mode === 'tl') {
          const nx = clamp(s.x + dx, 0, right - MIN_CROP);
          const ny = clamp(s.y + dy, 0, bottom - MIN_CROP);
          onChangeRef.current({ x: nx, y: ny, w: right - nx, h: bottom - ny });
        } else if (mode === 'tr') {
          const ny = clamp(s.y + dy, 0, bottom - MIN_CROP);
          const nw = clamp(s.w + dx, MIN_CROP, 1 - s.x);
          onChangeRef.current({ x: s.x, y: ny, w: nw, h: bottom - ny });
        } else if (mode === 'bl') {
          const nx = clamp(s.x + dx, 0, right - MIN_CROP);
          const nh = clamp(s.h + dy, MIN_CROP, 1 - s.y);
          onChangeRef.current({ x: nx, y: s.y, w: right - nx, h: nh });
        } else {
          const nw = clamp(s.w + dx, MIN_CROP, 1 - s.x);
          const nh = clamp(s.h + dy, MIN_CROP, 1 - s.y);
          onChangeRef.current({ x: s.x, y: s.y, w: nw, h: nh });
        }
      },
      onPanResponderRelease: () => {
        onGestureRef.current?.(false);
      },
      onPanResponderTerminate: () => {
        onGestureRef.current?.(false);
      },
    });

  const responders = useRef({
    move: makeResponder('move'),
    tl: makeResponder('tl'),
    tr: makeResponder('tr'),
    bl: makeResponder('bl'),
    br: makeResponder('br'),
  }).current;

  const handleStageLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - stageWidth) > 1) {
      setStageWidth(w);
    }
  };

  const boxLeft = crop.x * layout.renderW;
  const boxTop = crop.y * layout.renderH;
  const boxW = crop.w * layout.renderW;
  const boxH = crop.h * layout.renderH;

  return (
    <View
      onLayout={handleStageLayout}
      style={[
        styles.stage,
        {
          height: stageHeight,
          backgroundColor: '#0D0D0C',
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          left: layout.offsetX,
          top: layout.offsetY,
          width: layout.renderW,
          height: layout.renderH,
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: layout.renderW, height: layout.renderH }}
          resizeMode="stretch"
        />

        {/* Dimmed masks outside crop region */}
        <View
          pointerEvents="none"
          style={[styles.dimMask, { top: 0, left: 0, right: 0, height: boxTop }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.dimMask,
            { top: boxTop + boxH, left: 0, right: 0, bottom: 0 },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.dimMask,
            { top: boxTop, left: 0, width: boxLeft, height: boxH },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.dimMask,
            {
              top: boxTop,
              left: boxLeft + boxW,
              right: 0,
              height: boxH,
            },
          ]}
        />

        {/* Active Draggable Crop Box */}
        <View
          {...responders.move.panHandlers}
          style={[
            styles.cropBox,
            {
              left: boxLeft,
              top: boxTop,
              width: boxW,
              height: boxH,
              borderColor: theme.accent,
            },
          ]}
        >
          {/* Subtle Swiss grid inside selection */}
          <View
            pointerEvents="none"
            style={[styles.gridLineH, { top: '33.3%' }]}
          />
          <View
            pointerEvents="none"
            style={[styles.gridLineH, { top: '66.6%' }]}
          />
          <View
            pointerEvents="none"
            style={[styles.gridLineV, { left: '33.3%' }]}
          />
          <View
            pointerEvents="none"
            style={[styles.gridLineV, { left: '66.6%' }]}
          />

          {/* Four Corner Resize Handles */}
          <View
            {...responders.tl.panHandlers}
            style={[styles.handleHit, styles.hitTL]}
          >
            <View
              style={[styles.bracket, styles.bTL, { borderColor: theme.accent }]}
            />
          </View>
          <View
            {...responders.tr.panHandlers}
            style={[styles.handleHit, styles.hitTR]}
          >
            <View
              style={[styles.bracket, styles.bTR, { borderColor: theme.accent }]}
            />
          </View>
          <View
            {...responders.bl.panHandlers}
            style={[styles.handleHit, styles.hitBL]}
          >
            <View
              style={[styles.bracket, styles.bBL, { borderColor: theme.accent }]}
            />
          </View>
          <View
            {...responders.br.panHandlers}
            style={[styles.handleHit, styles.hitBR]}
          >
            <View
              style={[styles.bracket, styles.bBR, { borderColor: theme.accent }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADII.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  dimMask: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 10, 9, 0.56)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  handleHit: {
    position: 'absolute',
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hitTL: { top: -15, left: -15 },
  hitTR: { top: -15, right: -15 },
  hitBL: { bottom: -15, left: -15 },
  hitBR: { bottom: -15, right: -15 },
  bracket: {
    width: 16,
    height: 16,
  },
  bTL: { borderTopWidth: 3.5, borderLeftWidth: 3.5 },
  bTR: { borderTopWidth: 3.5, borderRightWidth: 3.5 },
  bBL: { borderBottomWidth: 3.5, borderLeftWidth: 3.5 },
  bBR: { borderBottomWidth: 3.5, borderRightWidth: 3.5 },
});
