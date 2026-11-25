import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import {
  BookmarkPlus,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flashlight,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wand2,
  Wifi,
} from 'lucide-react-native';
import { FONTS, RADII, ThemePalette } from '../theme/tokens';
import { ParsedQrPayload, QrHistoryItem } from '../types/app';
import {
  buildWifiQrString,
  parseQrPayload,
  summarizeQrPayload,
} from '../engines/qrParser';
import { decodeQrFromImageUri } from '../services/qrImageDecoder';
import { TactileButton } from '../components/TactileButton';
import { SvgQrCode } from '../components/SvgQrCode';
import { hapticSuccess, hapticTap } from '../services/haptics';

type QrSubMode = 'scan' | 'generate' | 'history';

interface QrScreenProps {
  theme: ThemePalette;
  isActive?: boolean;
  history: QrHistoryItem[];
  onSaveHistory: (items: QrHistoryItem[]) => void;
  initialGenText?: string;
  onConsumeInitialGenText?: () => void;
  onNotify: (msg: string) => void;
  onSaveToVault: (title: string, content: string) => void;
  onSendToFilter: (text: string) => void;
}

export const QrScreen = React.memo(function QrScreen({
  theme,
  isActive = true,
  history,
  onSaveHistory,
  initialGenText,
  onConsumeInitialGenText,
  onNotify,
  onSaveToVault,
  onSendToFilter,
}: QrScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const viewfinderHeight = Math.round(
    Math.min(430, Math.max(350, windowHeight * 0.46))
  );
  const [subMode, setSubMode] = useState<QrSubMode>('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedQrPayload | null>(null);
  const [manualQrInput, setManualQrInput] = useState('');

  // QR Generator state
  const [genType, setGenType] = useState<'text' | 'wifi'>('text');
  const [genText, setGenText] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiSec, setWifiSec] = useState<'WPA' | 'nopass'>('WPA');

  const lastScanRef = useRef<{ data: string; at: number }>({ data: '', at: 0 });

  useEffect(() => {
    if (initialGenText) {
      setSubMode('generate');
      setGenType('text');
      setGenText(initialGenText);
      onConsumeInitialGenText?.();
    }
  }, [initialGenText, onConsumeInitialGenText]);

  const recordDecodedPayload = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    const parsed = parseQrPayload(clean);
    setParsedResult(parsed);
    setScannerPaused(true);

    const summary = summarizeQrPayload(parsed);
    const entry: QrHistoryItem = {
      id: `qr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      raw: clean,
      kind: parsed.kind,
      summary,
      scannedAt: Date.now(),
    };
    const deduped = [entry, ...history.filter((h) => h.raw !== clean)].slice(0, 60);
    onSaveHistory(deduped);
    hapticSuccess();
  };

  const handleBarcodeScanned = (res: BarcodeScanningResult) => {
    if (scannerPaused || !res.data) return;
    const now = Date.now();
    if (
      lastScanRef.current.data === res.data &&
      now - lastScanRef.current.at < 2000
    ) {
      return;
    }
    lastScanRef.current = { data: res.data, at: now };
    recordDecodedPayload(res.data);
    onNotify('Đã quét mã QR');
  };

  const handlePickQrImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (res.canceled || !res.assets?.length) return;
      const uri = res.assets[0].uri;
      const decoded = await decodeQrFromImageUri(uri);
      if (!decoded) {
        onNotify('Không tìm thấy mã QR rõ nét trong ảnh này');
        return;
      }
      recordDecodedPayload(decoded);
      onNotify('Đã giải mã QR từ ảnh');
    } catch {
      onNotify('Không đọc được ảnh từ thư viện');
    }
  };

  const copyField = useCallback(
    async (val: string, label: string) => {
      await Clipboard.setStringAsync(val);
      hapticSuccess();
      onNotify(`Đã copy ${label}`);
    },
    [onNotify]
  );

  const genPayload =
    genType === 'text'
      ? genText
      : wifiSsid.trim()
        ? buildWifiQrString(wifiSsid.trim(), wifiPass, wifiSec)
        : '';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} · ${dd}/${mo}`;
  };

  const renderParsedCard = (payload: ParsedQrPayload) => {
    const kindLabels: Record<ParsedQrPayload['kind'], string> = {
      vietqr: 'VIETQR CHUYỂN KHOẢN',
      wifi: 'MẠNG WI-FI',
      url: 'LIÊN KẾT WEB',
      vcard: 'DANH THIẾP VCARD',
      text: 'VĂN BẢN / MÃ',
    };

    return (
      <View
        style={[
          styles.resultCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.resultHeader,
            { borderBottomColor: theme.border, backgroundColor: theme.well },
          ]}
        >
          <View style={styles.resultBadgeRow}>
            <CheckCircle2 size={14} color={theme.success} strokeWidth={2} />
            <Text style={[styles.resultKind, { color: theme.ink }]}>
              {kindLabels[payload.kind]}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setParsedResult(null);
              setScannerPaused(false);
            }}
          >
            <Text style={[styles.rescanText, { color: theme.accent }]}>
              QUÉT TIẾP
            </Text>
          </Pressable>
        </View>

        <View style={styles.resultBody}>
          {payload.kind === 'vietqr' ? (
            <View style={{ gap: 10 }}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                  NGÂN HÀNG
                </Text>
                <Text style={[styles.kvVal, { color: theme.ink }]}>
                  {payload.bankShortName} · {payload.bankName}
                </Text>
              </View>
              <Pressable
                onPress={() => copyField(payload.accountNumber, 'Số tài khoản')}
                style={[
                  styles.copyFieldBox,
                  { backgroundColor: theme.well, borderColor: theme.border },
                ]}
              >
                <View>
                  <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                    SỐ TÀI KHOẢN (CHẠM COPY)
                  </Text>
                  <Text style={[styles.bigMonoVal, { color: theme.ink }]}>
                    {payload.accountNumber}
                  </Text>
                </View>
                <Copy size={16} color={theme.accent} />
              </Pressable>

              {payload.amount ? (
                <Pressable
                  onPress={() => copyField(payload.amount!, 'Số tiền')}
                  style={[
                    styles.copyFieldBox,
                    { backgroundColor: theme.well, borderColor: theme.border },
                  ]}
                >
                  <View>
                    <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                      SỐ TIỀN
                    </Text>
                    <Text style={[styles.kvValMono, { color: theme.ink }]}>
                      {Number(payload.amount).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <Copy size={15} color={theme.accent} />
                </Pressable>
              ) : null}

              {payload.purpose ? (
                <Pressable
                  onPress={() => copyField(payload.purpose!, 'Nội dung CK')}
                  style={[
                    styles.copyFieldBox,
                    { backgroundColor: theme.well, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                      NỘI DUNG CHUYỂN KHOẢN
                    </Text>
                    <Text style={[styles.kvVal, { color: theme.ink }]}>
                      {payload.purpose}
                    </Text>
                  </View>
                  <Copy size={15} color={theme.accent} />
                </Pressable>
              ) : null}

              <TactileButton
                label="+ LƯU STK VÀO KHO MÃ"
                theme={theme}
                variant="primary"
                mono
                icon={<BookmarkPlus size={14} color={theme.accentInk} />}
                onPress={() =>
                  onSaveToVault(
                    `${payload.bankShortName} · ${payload.accountNumber}`,
                    `${payload.bankName} · ${payload.accountNumber}${payload.purpose ? ` · ${payload.purpose}` : ''}`
                  )
                }
              />
            </View>
          ) : null}

          {payload.kind === 'wifi' ? (
            <View style={{ gap: 10 }}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                  TÊN WI-FI (SSID)
                </Text>
                <Text style={[styles.kvVal, { color: theme.ink }]}>
                  {payload.ssid} ({payload.security})
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  copyField(payload.password || payload.ssid, 'Mật khẩu Wi-Fi')
                }
                style={[
                  styles.copyFieldBox,
                  { backgroundColor: theme.well, borderColor: theme.border },
                ]}
              >
                <View>
                  <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                    MẬT KHẨU (CHẠM ĐỂ COPY)
                  </Text>
                  <Text style={[styles.bigMonoVal, { color: theme.ink }]}>
                    {payload.password || '(Không đặt mật khẩu)'}
                  </Text>
                </View>
                <Copy size={16} color={theme.accent} />
              </Pressable>
              <TactileButton
                label="+ LƯU MẬT KHẨU VÀO KHO MÃ"
                theme={theme}
                mono
                icon={<BookmarkPlus size={14} color={theme.ink} />}
                onPress={() =>
                  onSaveToVault(
                    `Wi-Fi: ${payload.ssid}`,
                    payload.password || payload.ssid
                  )
                }
              />
            </View>
          ) : null}

          {payload.kind === 'url' ? (
            <View style={{ gap: 10 }}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: theme.inkMuted }]}>
                  TÊN MIỀN ({payload.protocol})
                </Text>
                <Text style={[styles.kvValMono, { color: theme.accent }]}>
                  {payload.host}
                </Text>
              </View>
              <Text selectable style={[styles.rawTextBox, { color: theme.ink }]}>
                {payload.url}
              </Text>
              <View style={styles.rowBtns}>
                <TactileButton
                  label="MỞ LINK"
                  theme={theme}
                  variant="primary"
                  mono
                  icon={<ExternalLink size={14} color={theme.accentInk} />}
                  onPress={() => Linking.openURL(payload.url)}
                  style={{ flex: 1 }}
                />
                <TactileButton
                  label="COPY"
                  theme={theme}
                  mono
                  icon={<Copy size={14} color={theme.ink} />}
                  onPress={() => copyField(payload.url, 'URL')}
                />
                <TactileButton
                  label="+ KHO MÃ"
                  theme={theme}
                  mono
                  onPress={() => onSaveToVault(payload.host, payload.url)}
                />
              </View>
            </View>
          ) : null}

          {payload.kind === 'vcard' ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.bigName, { color: theme.ink }]}>
                {payload.name}
              </Text>
              {payload.org ? (
                <Text style={[styles.kvVal, { color: theme.inkSecondary }]}>
                  {payload.org}
                </Text>
              ) : null}
              {payload.phones.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => copyField(p, 'SĐT')}
                  style={[
                    styles.copyFieldBox,
                    { backgroundColor: theme.well, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.kvValMono, { color: theme.ink }]}>{p}</Text>
                  <Copy size={14} color={theme.accent} />
                </Pressable>
              ))}
              {payload.emails.map((em) => (
                <Pressable
                  key={em}
                  onPress={() => copyField(em, 'Email')}
                  style={[
                    styles.copyFieldBox,
                    { backgroundColor: theme.well, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.kvValMono, { color: theme.ink }]}>{em}</Text>
                  <Copy size={14} color={theme.accent} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {payload.kind === 'text' ? (
            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={[
                  styles.rawTextBox,
                  {
                    color: theme.ink,
                    backgroundColor: theme.well,
                    borderColor: theme.border,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: RADII.xs,
                  },
                ]}
              >
                {payload.text}
              </Text>
              <View style={styles.rowBtns}>
                <TactileButton
                  label="COPY"
                  theme={theme}
                  variant="primary"
                  mono
                  icon={<Copy size={14} color={theme.accentInk} />}
                  onPress={() => copyField(payload.text, 'nội dung QR')}
                  style={{ flex: 1 }}
                />
                <TactileButton
                  label="LỌC DỮ LIỆU →"
                  theme={theme}
                  mono
                  icon={<Wand2 size={14} color={theme.ink} />}
                  onPress={() => onSendToFilter(payload.text)}
                />
                <TactileButton
                  label="+ KHO MÃ"
                  theme={theme}
                  mono
                  onPress={() =>
                    onSaveToVault(
                      payload.text.slice(0, 36),
                      payload.text
                    )
                  }
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Swiss Segmented Switcher */}
      <View style={styles.segBarWrap}>
        <View
          style={[
            styles.segBar,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {(
            [
              ['scan', 'QUÉT QR'],
              ['generate', 'TẠO MÃ QR'],
              ['history', `LỊCH SỬ (${history.length})`],
            ] as Array<[QrSubMode, string]>
          ).map(([mode, label], idx) => {
            const active = subMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  hapticTap('light');
                  setSubMode(mode);
                }}
                style={[
                  styles.segItem,
                  idx > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border },
                  { backgroundColor: active ? theme.ink : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.segText,
                    { color: active ? theme.bg : theme.inkSecondary },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {subMode === 'history' ? (
        <FlatList
          data={history}
          keyExtractor={(h) => h.id}
          style={styles.container}
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            history.length > 0 ? (
              <View style={styles.histTopRow}>
                <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
                  ĐÃ LƯU CỤC BỘ ({history.length})
                </Text>
                <Pressable
                  onPress={() => {
                    onSaveHistory([]);
                    onNotify('Đã xóa lịch sử QR');
                  }}
                >
                  <Text style={[styles.clearHist, { color: theme.danger }]}>
                    XÓA TẤT CẢ
                  </Text>
                </Pressable>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyHistory,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.emptyHistoryText, { color: theme.inkMuted }]}>
                Chưa có mã QR nào được quét. Các mã VietQR, Wi-Fi, URL đã quét sẽ tự động lưu tại đây (offline).
              </Text>
            </View>
          }
          renderItem={({ item: h, index }) => (
            <Pressable
              onPress={() => {
                setParsedResult(parseQrPayload(h.raw));
                setSubMode('scan');
              }}
              style={({ pressed }) => [
                styles.histRow,
                styles.histCardRow,
                index === 0 && styles.histFirstRow,
                index === history.length - 1 && styles.histLastRow,
                {
                  borderColor: theme.border,
                  borderTopWidth: index === 0 ? 1 : 0,
                  backgroundColor: pressed ? theme.well : theme.surface,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={styles.histMeta}>
                  <Text style={[styles.histKind, { color: theme.accent }]}>
                    {h.kind.toUpperCase()}
                  </Text>
                  <Text style={[styles.histDate, { color: theme.inkMuted }]}>
                    {formatTime(h.scannedAt)}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.histSummary, { color: theme.ink }]}
                >
                  {h.summary}
                </Text>
              </View>
              <Pressable
                onPress={() => copyField(h.raw, 'mã QR')}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Copy size={15} color={theme.inkSecondary} />
              </Pressable>
              <Pressable
                onPress={() =>
                  onSaveHistory(history.filter((x) => x.id !== h.id))
                }
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Trash2 size={15} color={theme.danger} />
              </Pressable>
            </Pressable>
          )}
        />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {subMode === 'scan' ? (
            <View style={{ gap: 12 }}>
              {/* Camera Viewfinder (expanded inline inside tab) */}
              <View
                style={[
                  styles.viewfinderBox,
                  {
                    height: viewfinderHeight,
                    borderColor: theme.border,
                    backgroundColor: '#111110',
                  },
                ]}
              >
                {!isActive ? (
                  <View style={styles.camFallback}>
                    <Text style={[styles.camFallbackText, { color: '#A8A59D' }]}>
                      Camera tạm nghỉ khi chuyển tab
                    </Text>
                  </View>
                ) : !permission ? (
                  <View style={styles.camFallback}>
                    <Text style={[styles.camFallbackText, { color: '#F2F0EA' }]}>
                      Đang kiểm tra quyền Camera...
                    </Text>
                  </View>
                ) : !permission.granted ? (
                  <View style={styles.camFallback}>
                    <Camera size={28} color="#FF5A26" strokeWidth={1.6} />
                    <Text style={[styles.camFallbackTitle, { color: '#F2F0EA' }]}>
                      Cần quyền Camera để quét QR trực tiếp
                    </Text>
                    <Text style={[styles.camFallbackDesc, { color: '#A8A59D' }]}>
                      Hoặc bạn vẫn có thể chọn ảnh chụp màn hình QR từ thư viện bên dưới.
                    </Text>
                    <TactileButton
                      label="CẤP QUYỀN CAMERA"
                      theme={theme}
                      variant="primary"
                      mono
                      onPress={() => requestPermission()}
                    />
                  </View>
                ) : cameraError ? (
                  <View style={styles.camFallback}>
                    <Camera size={26} color="#FF5A26" strokeWidth={1.6} />
                    <Text style={[styles.camFallbackTitle, { color: '#F2F0EA' }]}>
                      Không mở được camera trên thiết bị này
                    </Text>
                    <Text style={[styles.camFallbackDesc, { color: '#A8A59D' }]}>
                      {cameraError} — Hãy dùng nút "QUÉT TỪ ẢNH" hoặc dán chuỗi QR bên dưới.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.camWrap}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing={facing}
                      enableTorch={torch}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr', 'ean13', 'code128', 'datamatrix'],
                      }}
                      onBarcodeScanned={
                        scannerPaused ? undefined : handleBarcodeScanned
                      }
                      onMountError={(e) =>
                        setCameraError(e.message || 'Camera unavailable')
                      }
                    />

                    {/* Leica / Teenage Engineering Reticle Overlay */}
                    <View pointerEvents="none" style={styles.reticleOverlay}>
                      <View style={styles.reticleFrame}>
                        <View style={[styles.corner, styles.cTL, { borderColor: theme.accent }]} />
                        <View style={[styles.corner, styles.cTR, { borderColor: theme.accent }]} />
                        <View style={[styles.corner, styles.cBL, { borderColor: theme.accent }]} />
                        <View style={[styles.corner, styles.cBR, { borderColor: theme.accent }]} />
                      </View>
                      <View style={styles.camStatusPill}>
                        <Text style={styles.camStatusText}>
                          {scannerPaused ? 'ĐÃ BẮT MÃ // TẠM DỪNG' : 'SẴN SÀNG // ĐƯA MÃ VÀO KHUNG'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Camera Hardware Controls */}
              <View style={styles.rowBtns}>
                <TactileButton
                  label="QUÉT TỪ ẢNH"
                  theme={theme}
                  variant="primary"
                  mono
                  icon={<ImageIcon size={14} color={theme.accentInk} />}
                  onPress={handlePickQrImage}
                  style={{ flex: 1 }}
                />
                {Platform.OS !== 'web' ? (
                  <TactileButton
                    label={torch ? 'TẮT ĐÈN' : 'ĐÈN PIN'}
                    theme={theme}
                    mono
                    icon={<Flashlight size={14} color={torch ? theme.accent : theme.ink} />}
                    onPress={() => setTorch((t) => !t)}
                  />
                ) : null}
                <TactileButton
                  label="ĐỔI CAM"
                  theme={theme}
                  mono
                  icon={<RefreshCw size={13} color={theme.ink} />}
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                />
              </View>

              {/* Parsed Result Panel */}
              {parsedResult ? renderParsedCard(parsedResult) : null}

              {/* Manual QR String Decoder */}
              <View
                style={[
                  styles.manualBox,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
                  GIẢI MÃ CHUỖI QR THỦ CÔNG (VIETQR / WIFI / VCARD)
                </Text>
                <View style={styles.manualRow}>
                  <TextInput
                    value={manualQrInput}
                    onChangeText={setManualQrInput}
                    placeholder="Dán chuỗi 000201... hoặc WIFI:T:WPA;..."
                    placeholderTextColor={theme.inkMuted}
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: theme.well,
                        borderColor: theme.border,
                        color: theme.ink,
                      },
                    ]}
                  />
                  <TactileButton
                    label="GIẢI MÃ"
                    theme={theme}
                    mono
                    size="sm"
                    onPress={() => {
                      if (!manualQrInput.trim()) return;
                      recordDecodedPayload(manualQrInput);
                    }}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {subMode === 'generate' ? (
            <View style={{ gap: 12 }}>
              <View style={styles.rowBtns}>
                <TactileButton
                  label="VĂN BẢN / LINK"
                  theme={theme}
                  variant={genType === 'text' ? 'primary' : 'secondary'}
                  mono
                  size="sm"
                  onPress={() => setGenType('text')}
                  style={{ flex: 1 }}
                />
                <TactileButton
                  label="MÃ WI-FI"
                  theme={theme}
                  variant={genType === 'wifi' ? 'primary' : 'secondary'}
                  mono
                  size="sm"
                  icon={
                    <Wifi
                      size={13}
                      color={genType === 'wifi' ? theme.accentInk : theme.ink}
                    />
                  }
                  onPress={() => setGenType('wifi')}
                  style={{ flex: 1 }}
                />
              </View>

              {genType === 'text' ? (
                <View
                  style={[
                    styles.genInputWrap,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    multiline
                    value={genText}
                    onChangeText={setGenText}
                    placeholder="Nhập đường link, số tài khoản, đoạn text cần tạo QR..."
                    placeholderTextColor={theme.inkMuted}
                    textAlignVertical="top"
                    style={[styles.genTextArea, { color: theme.ink }]}
                  />
                  <View style={styles.genActions}>
                    <TactileButton
                      label="DÁN"
                      theme={theme}
                      size="sm"
                      mono
                      onPress={async () => {
                        const s = await Clipboard.getStringAsync();
                        if (s) setGenText(s);
                      }}
                    />
                    {genText ? (
                      <TactileButton
                        label="XÓA"
                        theme={theme}
                        size="sm"
                        mono
                        icon={<RotateCcw size={12} color={theme.ink} />}
                        onPress={() => setGenText('')}
                      />
                    ) : null}
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.genInputWrap,
                    { backgroundColor: theme.surface, borderColor: theme.border, gap: 8 },
                  ]}
                >
                  <TextInput
                    value={wifiSsid}
                    onChangeText={setWifiSsid}
                    placeholder="Tên Wi-Fi (SSID)..."
                    placeholderTextColor={theme.inkMuted}
                    style={[
                      styles.wifiInput,
                      {
                        backgroundColor: theme.well,
                        borderColor: theme.border,
                        color: theme.ink,
                      },
                    ]}
                  />
                  <TextInput
                    value={wifiPass}
                    onChangeText={setWifiPass}
                    placeholder="Mật khẩu Wi-Fi..."
                    placeholderTextColor={theme.inkMuted}
                    style={[
                      styles.wifiInput,
                      {
                        backgroundColor: theme.well,
                        borderColor: theme.border,
                        color: theme.ink,
                      },
                    ]}
                  />
                  <View style={styles.rowBtns}>
                    <TactileButton
                      label="WPA / WPA2"
                      theme={theme}
                      size="sm"
                      mono
                      variant={wifiSec === 'WPA' ? 'primary' : 'secondary'}
                      onPress={() => setWifiSec('WPA')}
                      style={{ flex: 1 }}
                    />
                    <TactileButton
                      label="KHÔNG MẬT KHẨU"
                      theme={theme}
                      size="sm"
                      mono
                      variant={wifiSec === 'nopass' ? 'primary' : 'secondary'}
                      onPress={() => setWifiSec('nopass')}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              <View style={styles.qrPreviewArea}>
                <SvgQrCode value={genPayload} size={216} theme={theme} />
                {genPayload.trim() ? (
                  <TactileButton
                    label="COPY CHUỖI MÃ QR"
                    theme={theme}
                    mono
                    size="sm"
                    icon={<Copy size={13} color={theme.ink} />}
                    onPress={() => copyField(genPayload, 'chuỗi QR')}
                  />
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  segBarWrap: { paddingHorizontal: 14, paddingTop: 14 },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 32 },
  listContent: { paddingHorizontal: 14, paddingBottom: 32 },
  segBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RADII.xs,
    marginBottom: 14,
    overflow: 'hidden',
  },
  histCardRow: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  histFirstRow: {
    borderTopLeftRadius: RADII.xs,
    borderTopRightRadius: RADII.xs,
  },
  histLastRow: {
    borderBottomLeftRadius: RADII.xs,
    borderBottomRightRadius: RADII.xs,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  segText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  viewfinderBox: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    height: 360,
    overflow: 'hidden',
  },
  camWrap: {
    flex: 1,
  },
  reticleOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleFrame: {
    width: 196,
    height: 196,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  cTL: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
  cTR: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  camStatusPill: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: 'rgba(17,17,16,0.78)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 2,
  },
  camStatusText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    color: '#F2F0EA',
    letterSpacing: 0.8,
  },
  camFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  camFallbackTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    textAlign: 'center',
  },
  camFallbackDesc: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  camFallbackText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultKind: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  rescanText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  resultBody: {
    padding: 12,
  },
  kvRow: {
    gap: 3,
  },
  kvKey: {
    fontFamily: FONTS.monoMedium,
    fontSize: 9.5,
    letterSpacing: 0.7,
  },
  kvVal: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13.5,
  },
  kvValMono: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  bigMonoVal: {
    fontFamily: FONTS.monoBold,
    fontSize: 18,
    letterSpacing: 0.6,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  bigName: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
  },
  copyFieldBox: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rawTextBox: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12.5,
    lineHeight: 19,
  },
  manualBox: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 12,
    gap: 8,
  },
  sectionTag: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
  },
  genInputWrap: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 11,
  },
  genTextArea: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13.5,
    minHeight: 86,
    lineHeight: 20,
  },
  genActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  wifiInput: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: FONTS.sansRegular,
    fontSize: 13.5,
  },
  qrPreviewArea: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  emptyHistory: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 20,
  },
  emptyHistoryText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    lineHeight: 20,
  },
  histTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clearHist: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.7,
  },
  histList: {
    borderWidth: 1,
    borderRadius: RADII.xs,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  histMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 3,
  },
  histKind: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  histDate: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
  },
  histSummary: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
  },
});
