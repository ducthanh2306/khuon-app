import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  BookmarkPlus,
  Camera,
  Copy,
  Image as ImageIcon,
  Maximize,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScanText,
  Flashlight,
  X,
} from 'lucide-react-native';
import { FONTS, RADII, ThemePalette, scaleFont } from '../theme/tokens';
import { OcrLangMode } from '../types/app';
import { normalizeOcrText } from '../engines/textNormalizer';
import { runImageOcr } from '../services/ocrService';
import { TactileButton } from '../components/TactileButton';
import {
  ImageRegionCropper,
  NormalizedCropRect,
} from '../components/ImageRegionCropper';
import { hapticSuccess, hapticTap } from '../services/haptics';

const LANG_OPTIONS: Array<{ id: OcrLangMode; label: string }> = [
  { id: 'auto', label: 'ĐA NGÔN NGỮ' },
  { id: 'latin', label: 'VIỆT / ANH' },
  { id: 'japanese', label: 'NHẬT (日本語)' },
  { id: 'korean', label: 'HÀN (한국어)' },
  { id: 'chinese', label: 'TRUNG (中文)' },
];

const FULL_CROP: NormalizedCropRect = { x: 0, y: 0, w: 1, h: 1 };

interface OcrScreenProps {
  theme: ThemePalette;
  isActive?: boolean;
  defaultLang: OcrLangMode;
  autoNormalize: boolean;
  onNotify: (msg: string) => void;
  onSaveToVault: (title: string, content: string, imageUri?: string) => void;
  onSendToQr: (text: string) => void;
}

interface LoadedPhoto {
  uri: string;
  width: number;
  height: number;
}

function getNaturalSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width: Math.max(1, width), height: Math.max(1, height) }),
      () => resolve({ width: 1200, height: 900 })
    );
  });
}

export const OcrScreen = React.memo(function OcrScreen({
  theme,
  isActive = true,
  defaultLang,
  autoNormalize,
  onNotify,
  onSaveToVault,
  onSendToQr,
}: OcrScreenProps) {
  const [langMode, setLangMode] = useState<OcrLangMode>(defaultLang);
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [cropRect, setCropRect] = useState<NormalizedCropRect>(FULL_CROP);
  const [scrollLocked, setScrollLocked] = useState(false);

  // Live inline camera capture state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [camZoom, setCamZoom] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  // OCR run & output state
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [detectedScripts, setDetectedScripts] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState('');

  useEffect(() => {
    setLangMode(defaultLang);
  }, [defaultLang]);

  const normalized = useMemo(
    () => normalizeOcrText(extractedText, autoNormalize),
    [extractedText, autoNormalize]
  );

  const entityLines = useMemo(() => {
    const rows: Array<{ label: string; value: string; color: string }> = [];
    for (const p of normalized.entities.phones) {
      rows.push({ label: 'SĐT', value: p, color: theme.accent });
    }
    for (const e of normalized.entities.emails) {
      rows.push({ label: 'EMAIL', value: e, color: theme.success });
    }
    for (const c of normalized.entities.codes) {
      rows.push({ label: 'MÃ / STK', value: c, color: theme.warning });
    }
    for (const u of normalized.entities.urls) {
      rows.push({ label: 'URL', value: u, color: theme.inkSecondary });
    }
    return rows;
  }, [normalized.entities, theme]);

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const dims =
        asset.width && asset.height
          ? { width: asset.width, height: asset.height }
          : await getNaturalSize(asset.uri);
      setCameraOpen(false);
      setPhoto({ uri: asset.uri, width: dims.width, height: dims.height });
      setCropRect(FULL_CROP);
      hapticSuccess();
    } catch {
      onNotify('Không mở được thư viện ảnh');
    }
  };

  const handleOpenCamera = async () => {
    hapticTap('light');
    if (!permission?.granted) {
      const perm = await requestPermission();
      if (!perm.granted) {
        onNotify('Cần cấp quyền camera để chụp ảnh OCR');
        return;
      }
    }
    setCameraOpen(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      if (!pic?.uri) {
        onNotify('Không chụp được ảnh');
        return;
      }
      const dims =
        pic.width && pic.height
          ? { width: pic.width, height: pic.height }
          : await getNaturalSize(pic.uri);
      setCameraOpen(false);
      setPhoto({ uri: pic.uri, width: dims.width, height: dims.height });
      setCropRect(FULL_CROP);
      hapticSuccess();
    } catch {
      onNotify('Chụp ảnh thất bại, hãy thử lại');
    } finally {
      setCapturing(false);
    }
  };

  const handleScanRegion = async () => {
    if (!photo || scanning) return;
    setScanning(true);
    setScanStatus('Đang cắt vùng ảnh đã chọn...');
    try {
      const originX = Math.max(0, Math.round(cropRect.x * photo.width));
      const originY = Math.max(0, Math.round(cropRect.y * photo.height));
      const width = Math.max(
        8,
        Math.min(photo.width - originX, Math.round(cropRect.w * photo.width))
      );
      const height = Math.max(
        8,
        Math.min(photo.height - originY, Math.round(cropRect.h * photo.height))
      );

      // Always run manipulateAsync to bake EXIF orientation upright & crop region
      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 0.94, format: ImageManipulator.SaveFormat.JPEG }
      );

      const ocrRes = await runImageOcr(cropped.uri, langMode, (msg) => {
        setScanStatus(msg);
      });

      const cleaned = normalizeOcrText(ocrRes.rawText, autoNormalize);
      if (!cleaned.text) {
        onNotify('Không nhận diện được chữ trong vùng đã chọn');
        setDetectedScripts([]);
        setExtractedText('');
      } else {
        setExtractedText(cleaned.text);
        setDetectedScripts(ocrRes.detectedScripts);
        hapticSuccess();
        onNotify('Đã trích xuất văn bản từ vùng ảnh');
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Lỗi khi quét OCR từ ảnh'
      );
    } finally {
      setScanning(false);
      setScanStatus('');
    }
  };

  const pixelCropInfo = photo
    ? `${Math.round(cropRect.w * photo.width)}×${Math.round(cropRect.h * photo.height)} PX`
    : '';

  const handleCopyText = async () => {
    if (!normalized.text) return;
    await Clipboard.setStringAsync(normalized.text);
    hapticSuccess();
    onNotify('Đã copy văn bản OCR');
  };

  const handleCopyAllEntities = async () => {
    if (entityLines.length === 0) return;
    const summary = entityLines.map((e) => `${e.label} : ${e.value}`).join('\n');
    await Clipboard.setStringAsync(summary);
    hapticSuccess();
    onNotify(`Đã copy ${entityLines.length} thông tin trích xuất`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      scrollEnabled={!scrollLocked}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Action Strip: Gallery + Direct Camera */}
      <View style={styles.topBtns}>
        <TactileButton
          label="CHỌN ẢNH"
          theme={theme}
          variant="primary"
          mono
          icon={<ImageIcon size={14} color={theme.accentInk} strokeWidth={1.8} />}
          onPress={handlePickImage}
          style={{ flex: 1 }}
        />
        <TactileButton
          label={cameraOpen ? 'ĐÓNG CAM' : 'CAMERA TRỰC TIẾP'}
          theme={theme}
          mono
          icon={<Camera size={14} color={theme.ink} strokeWidth={1.8} />}
          onPress={() => {
            if (cameraOpen) setCameraOpen(false);
            else handleOpenCamera();
          }}
          style={{ flex: 1 }}
        />
      </View>

      {/* Multi-language Script Selector */}
      <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
        NGÔN NGỮ NHẬN DIỆN (VIỆT · ANH · NHẬT · HÀN · TRUNG)
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.langRail}
      >
        {LANG_OPTIONS.map((opt) => {
          const active = langMode === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                hapticTap('light');
                setLangMode(opt.id);
              }}
              style={[
                styles.langChip,
                {
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accentSoft : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.langText,
                  { color: active ? theme.accent : theme.inkSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Inline Camera Capture View */}
      {cameraOpen ? (
        <View
          style={[
            styles.cameraCard,
            { borderColor: theme.border, backgroundColor: '#111110' },
          ]}
        >
          {isActive ? (
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing={facing}
              enableTorch={torch}
              zoom={camZoom}
            />
          ) : (
            <View style={styles.cameraPaused}>
              <Text style={styles.camPausedText}>Camera tạm nghỉ</Text>
            </View>
          )}

          <View
            style={[
              styles.camControlBar,
              { backgroundColor: theme.surface, borderTopColor: theme.border },
            ]}
          >
            <TactileButton
              label={capturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH'}
              theme={theme}
              variant="primary"
              mono
              size="sm"
              disabled={capturing}
              icon={<Camera size={13} color={theme.accentInk} />}
              onPress={handleCapturePhoto}
              style={{ flex: 1 }}
            />
            <TactileButton
              label={camZoom > 0 ? '2.0×' : '1.0×'}
              theme={theme}
              mono
              size="sm"
              onPress={() => setCamZoom((z) => (z > 0 ? 0 : 0.34))}
            />
            {Platform.OS !== 'web' ? (
              <TactileButton
                label=""
                theme={theme}
                size="sm"
                icon={
                  <Flashlight
                    size={14}
                    color={torch ? theme.accent : theme.ink}
                  />
                }
                onPress={() => setTorch((t) => !t)}
                style={{ paddingHorizontal: 10 }}
              />
            ) : null}
            <TactileButton
              label=""
              theme={theme}
              size="sm"
              icon={<RefreshCw size={14} color={theme.ink} />}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              style={{ paddingHorizontal: 10 }}
            />
            <TactileButton
              label=""
              theme={theme}
              size="sm"
              icon={<X size={14} color={theme.danger} />}
              onPress={() => setCameraOpen(false)}
              style={{ paddingHorizontal: 10 }}
            />
          </View>
        </View>
      ) : null}

      {/* Interactive Region Cropper Workspace */}
      {photo ? (
        <View style={styles.cropSection}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
              KÉO GÓC KHUNG ĐỂ CHỌN PHÂN VÙNG QUÉT
            </Text>
            <Text style={[styles.monoMeta, { color: theme.inkMuted }]}>
              {pixelCropInfo}
            </Text>
          </View>

          <ImageRegionCropper
            uri={photo.uri}
            imageWidth={photo.width}
            imageHeight={photo.height}
            crop={cropRect}
            onChangeCrop={setCropRect}
            onGestureActive={setScrollLocked}
            theme={theme}
            stageHeight={315}
          />

          <View style={styles.cropActions}>
            <TactileButton
              label="TOÀN ẢNH"
              theme={theme}
              mono
              size="sm"
              icon={<Maximize size={13} color={theme.ink} />}
              onPress={() => setCropRect(FULL_CROP)}
            />
            <TactileButton
              label="GỠ ẢNH"
              theme={theme}
              mono
              size="sm"
              icon={<RotateCcw size={13} color={theme.ink} />}
              onPress={() => setPhoto(null)}
            />
            <TactileButton
              label={scanning ? 'ĐANG QUÉT...' : 'QUÉT VÙNG NÀY'}
              theme={theme}
              variant="primary"
              mono
              disabled={scanning}
              icon={<ScanText size={14} color={theme.accentInk} />}
              onPress={handleScanRegion}
              style={{ flex: 1 }}
            />
          </View>

          {scanning && scanStatus ? (
            <View
              style={[
                styles.progressBanner,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.progressText, { color: theme.inkSecondary }]}>
                {scanStatus}
              </Text>
            </View>
          ) : null}
        </View>
      ) : !cameraOpen ? (
        <View
          style={[
            styles.emptyDropBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ScanText size={26} color={theme.accent} strokeWidth={1.6} />
          <Text
            style={[
              styles.emptyTitle,
              {
                color: theme.ink,
                fontFamily: theme.uiFontSemiBold,
                fontSize: scaleFont(14, theme),
              },
            ]}
          >
            Chọn ảnh hoặc mở Camera trực tiếp để quét chữ
          </Text>
          <Text
            style={[
              styles.emptyDesc,
              {
                color: theme.inkMuted,
                fontFamily: theme.uiFontRegular,
                fontSize: scaleFont(12.5, theme),
              },
            ]}
          >
            Bạn có thể kéo 4 góc khung để cắt đúng phân vùng cần OCR. Chữ viết gốc (Việt, Anh, Nhật, Hàn, Trung) được giữ nguyên và tự thu gọn khoảng trắng thừa.
          </Text>
        </View>
      ) : null}

      {/* Extracted Normalized OCR Text Box */}
      <View style={styles.outputWrap}>
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
            VĂN BẢN ĐÃ TRÍCH XUẤT
            {detectedScripts.length > 0
              ? ` · ${detectedScripts.join(' + ')}`
              : ''}
          </Text>
          <Text style={[styles.monoMeta, { color: theme.inkMuted }]}>
            {normalized.text.length} KT ·{' '}
            {normalized.text ? normalized.text.split('\n').length : 0} DÒNG
          </Text>
        </View>

        <View
          style={[
            styles.outputBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TextInput
            multiline
            value={extractedText}
            onChangeText={setExtractedText}
            placeholder="Văn bản OCR chuẩn hoá (khoảng trắng ≤ 1, giữ nguyên chữ viết) sẽ xuất hiện ở đây..."
            placeholderTextColor={theme.inkMuted}
            textAlignVertical="top"
            style={[
              styles.outputTextArea,
              {
                color: theme.ink,
                fontFamily: theme.uiFontRegular,
                fontSize: scaleFont(13.5, theme),
                lineHeight: scaleFont(21, theme),
              },
            ]}
          />
        </View>

        <View style={styles.actionRow}>
          <TactileButton
            label="COPY VĂN BẢN"
            theme={theme}
            variant="primary"
            mono
            disabled={!normalized.text}
            icon={<Copy size={14} color={theme.accentInk} />}
            onPress={handleCopyText}
            style={{ flex: 1 }}
          />
          <TactileButton
            label="+ KHO MÃ"
            theme={theme}
            mono
            disabled={!normalized.text}
            icon={<BookmarkPlus size={14} color={theme.ink} />}
            onPress={() => {
              const first = normalized.text.split('\n')[0]?.trim() || 'OCR Text';
              onSaveToVault(first.slice(0, 40), normalized.text);
            }}
          />
          <TactileButton
            label="QR"
            theme={theme}
            mono
            disabled={!normalized.text}
            icon={<QrCode size={14} color={theme.ink} />}
            onPress={() => onSendToQr(normalized.text)}
          />
        </View>
      </View>

      {/* Structured Extracted Information Below Output Box (sđt : ..., email : ...) */}
      <View
        style={[
          styles.entitiesCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
            NỘI DUNG TRÍCH XUẤT
          </Text>
          {entityLines.length > 0 ? (
            <Pressable onPress={handleCopyAllEntities} hitSlop={6}>
              <Text style={[styles.copyAllBtn, { color: theme.accent }]}>
                COPY TẤT CẢ ({entityLines.length})
              </Text>
            </Pressable>
          ) : null}
        </View>

        {entityLines.length === 0 ? (
          <Text
            style={[
              styles.entitiesEmpty,
              {
                color: theme.inkMuted,
                fontFamily: theme.uiFontRegular,
                fontSize: scaleFont(12.5, theme),
              },
            ]}
          >
            Khi văn bản có SĐT, Email, Mã đơn / STK hoặc Link URL, thông tin sẽ tự động liệt kê gọn gàng ở đây để chạm copy nhanh.
          </Text>
        ) : (
          <View style={styles.entityList}>
            {entityLines.map((item, idx) => (
              <Pressable
                key={`${item.label}-${item.value}-${idx}`}
                onPress={async () => {
                  await Clipboard.setStringAsync(item.value);
                  hapticSuccess();
                  onNotify(`Đã copy ${item.label}: ${item.value}`);
                }}
                style={({ pressed }) => [
                  styles.entityRow,
                  {
                    backgroundColor: pressed ? theme.well : theme.well,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  selectable
                  style={[
                    styles.entityLineText,
                    {
                      color: theme.ink,
                      fontSize: scaleFont(12.5, theme),
                    },
                  ]}
                >
                  <Text style={{ color: item.color, fontFamily: FONTS.monoBold }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: theme.inkMuted }}> : </Text>
                  {item.value}
                </Text>
                <Copy size={13} color={theme.inkSecondary} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 36, gap: 12 },
  topBtns: { flexDirection: 'row', gap: 8 },
  sectionTag: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  monoMeta: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  langRail: { gap: 7 },
  langChip: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  cameraCard: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    overflow: 'hidden',
  },
  cameraView: {
    width: '100%',
    height: 310,
  },
  cameraPaused: {
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camPausedText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: '#A8A59D',
  },
  camControlBar: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    borderTopWidth: 1,
  },
  cropSection: { gap: 8 },
  cropActions: { flexDirection: 'row', gap: 8 },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  progressText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11.5,
  },
  emptyDropBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADII.xs,
    padding: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTitle: {},
  emptyDesc: { lineHeight: 19 },
  outputWrap: { gap: 8 },
  outputBox: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    minHeight: 120,
  },
  outputTextArea: {
    padding: 11,
    minHeight: 118,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  entitiesCard: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 12,
    gap: 8,
  },
  copyAllBtn: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  entitiesEmpty: {
    lineHeight: 18,
  },
  entityList: {
    gap: 6,
  },
  entityRow: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entityLineText: {
    fontFamily: FONTS.monoRegular,
    flex: 1,
  },
});
