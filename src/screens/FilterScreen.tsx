import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  FileText,
  QrCode,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react-native';
import { FONTS, RADII, ThemePalette } from '../theme/tokens';
import { NormalizerOptions, NormalizerPresetId } from '../types/app';
import {
  NORMALIZER_PRESETS,
  normalizeText,
} from '../engines/textNormalizer';
import {
  extractTextFromDocxBytes,
  extractTextFromHtml,
  extractTextFromSrt,
} from '../engines/docReader';
import { computeLineDiff } from '../engines/textTools';
import { TactileButton } from '../components/TactileButton';
import { HardwareToggle } from '../components/HardwareToggle';
import { hapticSuccess, hapticTap } from '../services/haptics';

const SAMPLE_UGLY_TEXT = `THÔNG BÁO  CÔNG  VIỆC :
Xin cha\u0300 o  anh/chị , đây là văn ba\u0309 n  mẫu bị
ngắt dòng lung tung khi copy từ file
PDF hoă\u0323 c tin nhắn OCR bị  lệch  dấu .
•   Gửi báo cáo   trước 17:30 ngày 25/11/2026 .
•   Liên hệ  0912.345.678  hoặc   mail  hotro@khuon.vn
•   Xem  hướng dẫn tại  https://khuon.app/huong-dan , mã  đơn  DH-202611 .
chúng ta sẽ hoà giải mọi vấn đề , ko bị tách docu-
ment nữa!`;

interface FilterScreenProps {
  theme: ThemePalette;
  rawText: string;
  onChangeRawText: (text: string) => void;
  options: NormalizerOptions;
  onChangeOptions: (opts: NormalizerOptions) => void;
  onNotify: (msg: string) => void;
  onSaveToVault: (title: string, content: string) => void;
  onSendToQr: (text: string) => void;
}

export const FilterScreen = React.memo(function FilterScreen({
  theme,
  rawText,
  onChangeRawText,
  options,
  onChangeOptions,
  onNotify,
  onSaveToVault,
  onSendToQr,
}: FilterScreenProps) {
  const [activePreset, setActivePreset] = useState<NormalizerPresetId>('document');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'clean' | 'diff'>('clean');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  // Defer heavy regex & diff computation so TextInput stays responsive even on long documents
  const deferredRawText = useDeferredValue(rawText);
  const deferredOptions = useDeferredValue(options);

  const result = useMemo(
    () => normalizeText(deferredRawText, deferredOptions),
    [deferredRawText, deferredOptions]
  );

  const diffLines = useMemo(() => {
    if (viewMode !== 'diff' || !deferredRawText.trim()) return [];
    return computeLineDiff(deferredRawText, result.output);
  }, [viewMode, deferredRawText, result.output]);

  const applyPreset = (id: Exclude<NormalizerPresetId, 'custom'>) => {
    hapticTap('light');
    setActivePreset(id);
    onChangeOptions({
      ...NORMALIZER_PRESETS[id].options,
      dedupeLines: options.dedupeLines ?? false,
      sortLines: options.sortLines ?? false,
      removeTones: options.removeTones ?? false,
    });
  };

  const updateOption = <K extends keyof NormalizerOptions>(
    key: K,
    val: NormalizerOptions[K]
  ) => {
    setActivePreset('custom');
    onChangeOptions({ ...options, [key]: val });
  };

  const handlePaste = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip.trim()) {
        onNotify('Clipboard hiện đang trống');
        return;
      }
      onChangeRawText(clip);
      setLoadedFileName(null);
      hapticSuccess();
      onNotify('Đã dán & lọc dữ liệu tự động');
    } catch {
      onNotify('Không đọc được clipboard trên thiết bị này');
    }
  };

  const handlePickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'text/*',
          'application/json',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      const lowerName = asset.name.toLowerCase();

      let extracted = '';
      if (lowerName.endsWith('.docx')) {
        let bytes: Uint8Array | ArrayBuffer;
        if (Platform.OS === 'web') {
          if (asset.file) {
            bytes = await asset.file.arrayBuffer();
          } else {
            const resp = await fetch(asset.uri);
            bytes = await resp.arrayBuffer();
          }
        } else {
          const f = new ExpoFile(asset.uri);
          bytes = await f.bytes();
        }
        extracted = await extractTextFromDocxBytes(bytes);
      } else {
        let rawContent = '';
        if (Platform.OS === 'web') {
          if (asset.file) {
            rawContent = await asset.file.text();
          } else {
            const resp = await fetch(asset.uri);
            rawContent = await resp.text();
          }
        } else {
          const f = new ExpoFile(asset.uri);
          rawContent = await f.text();
        }

        if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
          extracted = extractTextFromHtml(rawContent);
        } else if (lowerName.endsWith('.srt')) {
          extracted = extractTextFromSrt(rawContent);
        } else {
          extracted = rawContent;
        }
      }

      onChangeRawText(extracted);
      setLoadedFileName(asset.name);
      hapticSuccess();
      onNotify(`Đã nhập: ${asset.name}`);
    } catch (err) {
      onNotify(
        err instanceof Error
          ? `Lỗi đọc tệp: ${err.message}`
          : 'Không đọc được định dạng tệp này'
      );
    }
  };

  const handleCopyOutput = async () => {
    if (!result.output.trim()) {
      onNotify('Chưa có dữ liệu để sao chép');
      return;
    }
    await Clipboard.setStringAsync(result.output);
    hapticSuccess();
    onNotify('Đã copy kết quả lọc dữ liệu');
  };

  const handleCopyChip = async (val: string, label: string) => {
    await Clipboard.setStringAsync(val);
    hapticSuccess();
    onNotify(`Đã copy ${label}: ${val}`);
  };

  const totalEntities =
    result.entities.phones.length +
    result.entities.emails.length +
    result.entities.codes.length +
    result.entities.urls.length;

  const handleCopyAllEntities = async () => {
    const blocks: string[] = [];
    if (result.entities.phones.length) {
      blocks.push(`SĐT: ${result.entities.phones.join(', ')}`);
    }
    if (result.entities.emails.length) {
      blocks.push(`MAIL: ${result.entities.emails.join(', ')}`);
    }
    if (result.entities.codes.length) {
      blocks.push(`MÃ: ${result.entities.codes.join(', ')}`);
    }
    if (result.entities.urls.length) {
      blocks.push(`URL: ${result.entities.urls.join('\n')}`);
    }
    if (!blocks.length) return;
    await Clipboard.setStringAsync(blocks.join('\n'));
    hapticSuccess();
    onNotify(`Đã copy ${totalEntities} mục trích xuất`);
  };

  const handleShare = async () => {
    if (!result.output.trim()) return;
    try {
      await Share.share({ message: result.output });
    } catch {
      await handleCopyOutput();
    }
  };

  const handleSave = () => {
    if (!result.output.trim()) return;
    const firstLine = result.output.split('\n')[0]?.trim() || 'Dữ liệu đã lọc';
    const title = firstLine.slice(0, 42) + (firstLine.length > 42 ? '…' : '');
    onSaveToVault(title, result.output);
  };

  const hasEntities = totalEntities > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Raw Input Block — matching screenshot directly at top */}
      <View style={styles.blockHeader}>
        <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
          VĂN BẢN THÔ ĐẦU VÀO {loadedFileName ? `· ${loadedFileName}` : ''}
        </Text>
        <Text style={[styles.monoMeta, { color: theme.inkMuted }]}>
          {result.stats.charsBefore} KT · {result.stats.linesBefore} DÒNG
        </Text>
      </View>

      <View
        style={[
          styles.inputBox,
          { backgroundColor: theme.well, borderColor: theme.border },
        ]}
      >
        <TextInput
          multiline
          value={rawText}
          onChangeText={onChangeRawText}
          placeholder="Dán chữ lộn xộn, lệch dấu, ngắt dòng từ PDF/Zalo/OCR hoặc chọn file bên dưới..."
          placeholderTextColor={theme.inkMuted}
          textAlignVertical="top"
          style={[styles.textArea, { color: theme.ink }]}
        />

        {/* Slim Integrated Input Footer Toolbar */}
        <View
          style={[
            styles.inputFooter,
            { borderTopColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <View style={styles.footerLeft}>
            <Pressable
              onPress={handlePaste}
              style={({ pressed }) => [
                styles.miniToolBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.well : 'transparent',
                },
              ]}
            >
              <ClipboardPaste size={11.5} color={theme.accent} strokeWidth={2} />
              <Text style={[styles.miniToolText, { color: theme.accent }]}>
                DÁN
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePickFile}
              style={({ pressed }) => [
                styles.miniToolBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.well : 'transparent',
                },
              ]}
            >
              <FileText size={11.5} color={theme.inkSecondary} strokeWidth={1.8} />
              <Text style={[styles.miniToolText, { color: theme.inkSecondary }]}>
                FILE
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticTap('light');
                onChangeRawText(SAMPLE_UGLY_TEXT);
                setLoadedFileName(null);
                onNotify('Đã nạp văn bản mẫu để lọc thử');
              }}
              style={({ pressed }) => [
                styles.miniToolBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.well : 'transparent',
                },
              ]}
            >
              <Sparkles size={11.5} color={theme.inkSecondary} strokeWidth={1.8} />
              <Text style={[styles.miniToolText, { color: theme.inkSecondary }]}>
                MẪU
              </Text>
            </Pressable>

            {rawText.length > 0 ? (
              <Pressable
                onPress={() => {
                  hapticTap('light');
                  onChangeRawText('');
                  setLoadedFileName(null);
                }}
                style={({ pressed }) => [
                  styles.miniToolBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: pressed ? theme.well : 'transparent',
                  },
                ]}
              >
                <RotateCcw size={11} color={theme.danger} strokeWidth={1.8} />
                <Text style={[styles.miniToolText, { color: theme.danger }]}>
                  XÓA
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => {
              hapticTap('light');
              setShowFilters((v) => !v);
            }}
            style={styles.filterToggleBtn}
          >
            <SlidersHorizontal size={11.5} color={theme.ink} strokeWidth={1.8} />
            <Text style={[styles.filterToggleText, { color: theme.ink }]}>
              BỘ LỌC
            </Text>
            {showFilters ? (
              <ChevronUp size={12.5} color={theme.ink} />
            ) : (
              <ChevronDown size={12.5} color={theme.ink} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Optional Collapsible Filter Drawer */}
      {showFilters ? (
        <View
          style={[
            styles.rulesPanel,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRail}
          >
            {(
              Object.keys(NORMALIZER_PRESETS) as Array<
                Exclude<NormalizerPresetId, 'custom'>
              >
            ).map((id) => {
              const item = NORMALIZER_PRESETS[id];
              const isActive = activePreset === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => applyPreset(id)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isActive ? theme.ink : theme.well,
                      borderColor: isActive ? theme.ink : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetTitle,
                      { color: isActive ? theme.bg : theme.ink },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <HardwareToggle
            label="Sửa lệch dấu & ghép Unicode NFC"
            description="Khắc phục lỗi tách dấu thanh, dấu cách chen giữa từ PDF/OCR"
            value={options.fixDiacritics}
            onToggle={(v) => updateOption('fixDiacritics', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Gộp dòng bị ngắt giữa câu"
            description="Tự nối dòng copy từ PDF/cột báo, vẫn giữ nguyên đoạn & list"
            value={options.unwrapLines}
            onToggle={(v) => updateOption('unwrapLines', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Chuẩn hóa dấu câu & khoảng trắng"
            description="Xóa dấu cách thừa trước , . : ; nhưng bảo vệ URL, email, file"
            value={options.fixPunctuationSpacing}
            onToggle={(v) => updateOption('fixPunctuationSpacing', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Xóa ký tự ẩn & khoảng trắng lạ"
            description="Loại bỏ zero-width space (ZWSP), soft hyphen, NBSP"
            value={options.stripInvisible}
            onToggle={(v) => updateOption('stripInvisible', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Chuẩn gạch đầu dòng (• ◦ ▪ → -)"
            description="Thống nhất ký tự đầu dòng gọn gàng"
            value={options.normalizeBullets}
            onToggle={(v) => updateOption('normalizeBullets', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Đặt dấu chuẩn mới (hòa, thúy)"
            description="Chuẩn hóa vị trí dấu trên oa, oe, uy (giữ nguyên qu-, gi-)"
            value={options.modernTonePlacement}
            onToggle={(v) => updateOption('modernTonePlacement', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Tự viết hoa đầu câu"
            description="Viết hoa chữ cái đầu đoạn và sau dấu chấm câu"
            value={options.autoCapitalize}
            onToggle={(v) => updateOption('autoCapitalize', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Đưa dấu nháy cong về thẳng"
            description="Chuyển “ ” ‘ ’ thành nháy thẳng cho code/lệnh"
            value={options.straightenQuotes}
            onToggle={(v) => updateOption('straightenQuotes', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Chuyển thành danh sách 1. 2. 3."
            description="Tách từng ý/câu thành mục đánh số rõ ràng"
            value={options.formatAsNumberedList}
            onToggle={(v) => updateOption('formatAsNumberedList', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Lọc bỏ dòng trùng lặp"
            description="Chỉ giữ lại 1 lần cho mỗi dòng giống nhau"
            value={!!options.dedupeLines}
            onToggle={(v) => updateOption('dedupeLines', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Sắp xếp dòng A → Z"
            description="Sắp xếp các dòng theo bảng chữ cái tiếng Việt"
            value={!!options.sortLines}
            onToggle={(v) => updateOption('sortLines', v)}
            theme={theme}
          />
          <HardwareToggle
            label="Bỏ dấu tiếng Việt"
            description="Chuyển toàn bộ văn bản kết quả sang không dấu"
            value={!!options.removeTones}
            onToggle={(v) => updateOption('removeTones', v)}
            theme={theme}
          />
        </View>
      ) : null}

      {/* Telemetry Strip — identical to screenshot */}
      <View
        style={[
          styles.telemetryBar,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.telemetryText, { color: theme.inkSecondary }]}>
          SAU XỬ LÝ: <Text style={{ color: theme.ink }}>{result.stats.charsAfter}</Text> KT ·{' '}
          <Text style={{ color: theme.ink }}>{result.stats.linesAfter}</Text> DÒNG
          {result.stats.linesMerged > 0
            ? ` · GỘP ${result.stats.linesMerged}`
            : ''}
          {result.stats.diacriticsFixed > 0
            ? ` · SỬA ${result.stats.diacriticsFixed} DẤU`
            : ''}
          {result.stats.invisibleRemoved > 0
            ? ` · XÓA ${result.stats.invisibleRemoved} KÝ TỰ ẨN`
            : ''}
        </Text>

        <View style={styles.viewModeGroup}>
          <Pressable
            onPress={() => setViewMode('clean')}
            style={[
              styles.viewModeBtn,
              {
                backgroundColor:
                  viewMode === 'clean' ? theme.ink : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'clean' ? theme.bg : theme.inkMuted },
              ]}
            >
              SẠCH
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('diff')}
            style={[
              styles.viewModeBtn,
              {
                backgroundColor:
                  viewMode === 'diff' ? theme.ink : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'diff' ? theme.bg : theme.inkMuted },
              ]}
            >
              SO SÁNH
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Cleaned Output Sheet — identical to screenshot */}
      <View
        style={[
          styles.outputSheet,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {!rawText.trim() ? (
          <Text style={[styles.emptyOutput, { color: theme.inkMuted }]}>
            Kết quả lọc sạch & tách dữ liệu sẽ hiển thị tức thì tại đây. Chạm "MẪU" hoặc "DÁN" trong khung trên để thử ngay.
          </Text>
        ) : viewMode === 'clean' ? (
          <Text selectable style={[styles.outputText, { color: theme.ink }]}>
            {result.output}
          </Text>
        ) : (
          <View>
            {diffLines.map((line, idx) => {
              const bg =
                line.type === 'add'
                  ? theme.successSoft
                  : line.type === 'remove'
                    ? theme.dangerSoft
                    : 'transparent';
              const fg =
                line.type === 'add'
                  ? theme.success
                  : line.type === 'remove'
                    ? theme.danger
                    : theme.inkSecondary;
              const prefix =
                line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
              return (
                <Text
                  key={`${idx}-${line.type}`}
                  style={[styles.diffLine, { backgroundColor: bg, color: fg }]}
                >
                  {prefix}
                  {line.text || ' '}
                </Text>
              );
            })}
          </View>
        )}
      </View>

      {/* Primary Output Actions — identical to screenshot */}
      <View style={styles.actionRow}>
        <TactileButton
          label="COPY KẾT QUẢ"
          theme={theme}
          variant="primary"
          mono
          disabled={!result.output.trim()}
          icon={<Copy size={14} color={theme.accentInk} strokeWidth={1.8} />}
          onPress={handleCopyOutput}
          style={styles.flexBtn}
        />
        <TactileButton
          label="+ KHO MÃ"
          theme={theme}
          mono
          disabled={!result.output.trim()}
          icon={<BookmarkPlus size={14} color={theme.ink} strokeWidth={1.8} />}
          onPress={handleSave}
        />
        <TactileButton
          label="QR"
          theme={theme}
          mono
          disabled={!result.output.trim()}
          icon={<QrCode size={14} color={theme.ink} strokeWidth={1.8} />}
          onPress={() => onSendToQr(result.output)}
        />
        {Platform.OS !== 'web' ? (
          <TactileButton
            label=""
            theme={theme}
            disabled={!result.output.trim()}
            icon={<Share2 size={14} color={theme.ink} strokeWidth={1.8} />}
            onPress={handleShare}
            style={{ paddingHorizontal: 10 }}
          />
        ) : null}
      </View>

      {/* Auto-Extracted Smart Chips — identical to screenshot */}
      {hasEntities ? (
        <View
          style={[
            styles.extractBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.extractHeaderRow}>
            <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
              TRÍCH XUẤT TỰ ĐỘNG · CHẠM ĐỂ COPY NHANH
            </Text>
            {totalEntities > 1 ? (
              <Pressable onPress={handleCopyAllEntities} hitSlop={6}>
                <Text style={[styles.copyAllLink, { color: theme.accent }]}>
                  COPY TẤT CẢ
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipsWrap}>
            {result.entities.phones.map((p) => (
              <Pressable
                key={`ph-${p}`}
                onPress={() => handleCopyChip(p, 'SĐT')}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.well },
                ]}
              >
                <Text style={[styles.chipTag, { color: theme.accent }]}>SĐT</Text>
                <Text style={[styles.chipVal, { color: theme.ink }]}>{p}</Text>
              </Pressable>
            ))}
            {result.entities.emails.map((em) => (
              <Pressable
                key={`em-${em}`}
                onPress={() => handleCopyChip(em, 'Email')}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.well },
                ]}
              >
                <Text style={[styles.chipTag, { color: theme.success }]}>MAIL</Text>
                <Text style={[styles.chipVal, { color: theme.ink }]}>{em}</Text>
              </Pressable>
            ))}
            {result.entities.codes.map((cd) => (
              <Pressable
                key={`cd-${cd}`}
                onPress={() => handleCopyChip(cd, 'Mã')}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.well },
                ]}
              >
                <Text style={[styles.chipTag, { color: theme.warning }]}>MÃ</Text>
                <Text style={[styles.chipVal, { color: theme.ink }]}>{cd}</Text>
              </Pressable>
            ))}
            {result.entities.urls.map((u) => (
              <Pressable
                key={`url-${u}`}
                onPress={() => handleCopyChip(u, 'Link')}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.well },
                ]}
              >
                <Text style={[styles.chipTag, { color: theme.inkSecondary }]}>
                  URL
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.chipVal, { color: theme.ink, maxWidth: 210 }]}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 32,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTag: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10.5,
    letterSpacing: 0.9,
  },
  monoMeta: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    overflow: 'hidden',
    marginBottom: 10,
  },
  textArea: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13.5,
    lineHeight: 20,
    padding: 11,
    minHeight: 116,
    maxHeight: 185,
  },
  inputFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  miniToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  miniToolText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  filterToggleText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  rulesPanel: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    marginBottom: 10,
  },
  presetRail: {
    padding: 10,
    gap: 7,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  telemetryBar: {
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: RADII.xs,
    borderTopRightRadius: RADII.xs,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  telemetryText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  viewModeGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  viewModeBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  viewModeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  outputSheet: {
    borderWidth: 1,
    borderBottomLeftRadius: RADII.xs,
    borderBottomRightRadius: RADII.xs,
    padding: 12,
    minHeight: 124,
    marginBottom: 10,
  },
  emptyOutput: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    lineHeight: 20,
  },
  outputText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    lineHeight: 22,
  },
  diffLine: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    lineHeight: 19,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  flexBtn: {
    flex: 1,
  },
  extractBox: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 12,
    gap: 10,
  },
  extractHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  copyAllLink: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  chipTag: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  chipVal: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11.5,
  },
});
