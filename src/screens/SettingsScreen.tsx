import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Download, RotateCcw, Upload } from 'lucide-react-native';
import {
  ACCENT_PRESETS,
  FONTS,
  FONT_PRESETS,
  FONT_SCALE_FACTORS,
  RADII,
  ThemePalette,
  createDefaultSettings,
  scaleFont,
} from '../theme/tokens';
import {
  AccentColorId,
  AppSettings,
  FontFamilyId,
  FontScaleId,
  InkContrastId,
  OcrLangMode,
  QrHistoryItem,
  SnippetItem,
} from '../types/app';
import { TactileButton } from '../components/TactileButton';
import { HardwareToggle } from '../components/HardwareToggle';
import { hapticSuccess, hapticTap } from '../services/haptics';

interface SettingsScreenProps {
  theme: ThemePalette;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  snippets: SnippetItem[];
  qrHistory: QrHistoryItem[];
  onImportBackup: (
    snippets: SnippetItem[],
    history: QrHistoryItem[],
    restoredSettings?: Partial<AppSettings>
  ) => void;
  onClearQrHistory: () => void;
  onNotify: (msg: string) => void;
}

const INK_OPTIONS: Array<{ id: InkContrastId; label: string }> = [
  { id: 'default', label: 'Tiêu chuẩn' },
  { id: 'high', label: 'Tương phản cao' },
  { id: 'warm', label: 'Mực ấm dịu' },
];

const OCR_DEFAULT_LANGS: Array<{ id: OcrLangMode; label: string }> = [
  { id: 'auto', label: 'Đa ngôn ngữ' },
  { id: 'latin', label: 'Việt / Anh' },
  { id: 'japanese', label: 'Nhật' },
  { id: 'korean', label: 'Hàn' },
  { id: 'chinese', label: 'Trung' },
];

export const SettingsScreen = React.memo(function SettingsScreen({
  theme,
  settings,
  onUpdateSettings,
  snippets,
  qrHistory,
  onImportBackup,
  onClearQrHistory,
  onNotify,
}: SettingsScreenProps) {
  const [backupInput, setBackupInput] = useState('');

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    hapticTap('light');
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleExportBackup = async () => {
    const payload = JSON.stringify(
      {
        app: 'KHUON',
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        settings,
        snippets,
        qrHistory,
      },
      null,
      2
    );
    await Clipboard.setStringAsync(payload);
    hapticSuccess();
    onNotify('Đã sao chép bản sao lưu JSON vào clipboard');
  };

  const handleRestoreBackup = () => {
    try {
      const parsed = JSON.parse(backupInput.trim());
      if (
        !parsed ||
        (!Array.isArray(parsed.snippets) && !Array.isArray(parsed.qrHistory))
      ) {
        onNotify('JSON sao lưu không đúng định dạng KHUÔN');
        return;
      }
      onImportBackup(
        Array.isArray(parsed.snippets) ? parsed.snippets : snippets,
        Array.isArray(parsed.qrHistory) ? parsed.qrHistory : qrHistory,
        parsed.settings && typeof parsed.settings === 'object'
          ? parsed.settings
          : undefined
      );
      setBackupInput('');
      hapticSuccess();
      onNotify('Đã khôi phục dữ liệu thành công');
    } catch {
      onNotify('JSON không hợp lệ, vui lòng kiểm tra lại');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Live Typography & Color Preview */}
      <View
        style={[
          styles.previewCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTag, { color: theme.accent }]}>
            XEM TRƯỚC GIAO DIỆN
          </Text>
          <Text style={[styles.monoMeta, { color: theme.inkMuted }]}>
            {FONT_PRESETS[settings.fontFamily].label} ·{' '}
            {Math.round(theme.fontScale * 100)}%
          </Text>
        </View>
        <Text
          style={{
            color: theme.ink,
            fontFamily: theme.uiFontBold,
            fontSize: scaleFont(16, theme),
          }}
        >
          KHUÔN — Kho Mã, QR & Quét Chữ OCR
        </Text>
        <Text
          style={{
            color: theme.inkSecondary,
            fontFamily: theme.uiFontRegular,
            fontSize: scaleFont(13.5, theme),
            lineHeight: scaleFont(20, theme),
          }}
        >
          {FONT_PRESETS[settings.fontFamily].sample}. Màu chữ, màu nhấn và cỡ chữ áp dụng ngay cho toàn bộ ứng dụng.
        </Text>
      </View>

      {/* Theme Mode */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
          CHẤT LIỆU NỀN
        </Text>
        <View style={styles.rowBtns}>
          <TactileButton
            label="GIẤY ẤM (PAPER)"
            theme={theme}
            variant={settings.themeMode === 'paper' ? 'primary' : 'secondary'}
            mono
            size="sm"
            onPress={() => patch('themeMode', 'paper')}
            style={{ flex: 1 }}
          />
          <TactileButton
            label="THAN CHÌ (OLED)"
            theme={theme}
            variant={settings.themeMode === 'charcoal' ? 'primary' : 'secondary'}
            mono
            size="sm"
            onPress={() => patch('themeMode', 'charcoal')}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Accent Color Picker */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
          MÀU NHẤN CHỦ ĐẠO
        </Text>
        <View style={styles.swatchGrid}>
          {(Object.keys(ACCENT_PRESETS) as AccentColorId[]).map((id) => {
            const preset = ACCENT_PRESETS[id];
            const colorHex = preset[settings.themeMode].accent;
            const active = settings.accentColor === id;
            return (
              <Pressable
                key={id}
                onPress={() => patch('accentColor', id)}
                style={[
                  styles.swatchBtn,
                  {
                    borderColor: active ? colorHex : theme.border,
                    backgroundColor: active ? theme.accentSoft : theme.well,
                  },
                ]}
              >
                <View style={[styles.swatchDot, { backgroundColor: colorHex }]}>
                  {active ? (
                    <Check
                      size={11}
                      color={preset[settings.themeMode].accentInk}
                      strokeWidth={3}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.swatchLabel,
                    {
                      color: active ? theme.ink : theme.inkSecondary,
                      fontFamily: theme.uiFontMedium,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Font Family, Font Contrast & Scale */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
          PHÔNG CHỮ HỆ THỐNG
        </Text>
        <View style={styles.optionGrid}>
          {(Object.keys(FONT_PRESETS) as FontFamilyId[]).map((id) => {
            const preset = FONT_PRESETS[id];
            const active = settings.fontFamily === id;
            return (
              <Pressable
                key={id}
                onPress={() => patch('fontFamily', id)}
                style={[
                  styles.optionCell,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.accentSoft : theme.well,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? theme.accent : theme.ink,
                    fontFamily: preset.bold,
                    fontSize: 13,
                  }}
                >
                  {preset.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.inkMuted,
                    fontFamily: preset.regular,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  Aa Bb 0123
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTag, { color: theme.inkMuted, marginTop: 4 }]}>
          MÀU CHỮ & ĐỘ TƯƠNG PHẢN
        </Text>
        <View style={styles.rowBtns}>
          {INK_OPTIONS.map((opt) => {
            const active = settings.inkContrast === opt.id;
            return (
              <TactileButton
                key={opt.id}
                label={opt.label}
                theme={theme}
                size="sm"
                variant={active ? 'primary' : 'secondary'}
                onPress={() => patch('inkContrast', opt.id)}
                style={{ flex: 1 }}
              />
            );
          })}
        </View>

        <Text style={[styles.sectionTag, { color: theme.inkMuted, marginTop: 4 }]}>
          CỠ CHỮ HIỂN THỊ
        </Text>
        <View style={styles.scaleGrid}>
          {(Object.keys(FONT_SCALE_FACTORS) as FontScaleId[]).map((id) => {
            const active = settings.fontScale === id;
            return (
              <TactileButton
                key={id}
                label={FONT_SCALE_FACTORS[id].label}
                theme={theme}
                size="sm"
                variant={active ? 'primary' : 'secondary'}
                onPress={() => patch('fontScale', id)}
                style={styles.scaleBtn}
              />
            );
          })}
        </View>
      </View>

      {/* General & OCR Configuration */}
      <View
        style={[
          styles.toggleCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.toggleCardHead}>
          <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
            CẤU HÌNH HỆ THỐNG & QUÉT OCR
          </Text>
        </View>
        <HardwareToggle
          label="Phản hồi rung chạm (Haptics)"
          description="Rung nhẹ khi bấm nút, copy mã và quét thành công"
          value={settings.hapticsEnabled}
          onToggle={(v) => patch('hapticsEnabled', v)}
          theme={theme}
        />
        <HardwareToggle
          label="Tự thu gọn khoảng trắng khi OCR"
          description="Không để cách quá 1 dấu cách, giữ nguyên chữ viết gốc"
          value={settings.autoNormalizeOcr}
          onToggle={(v) => patch('autoNormalizeOcr', v)}
          theme={theme}
        />
        <View style={styles.ocrLangPickerWrap}>
          <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
            NGÔN NGỮ OCR MẶC ĐỊNH
          </Text>
          <View style={styles.langPillWrap}>
            {OCR_DEFAULT_LANGS.map((l) => {
              const active = settings.defaultOcrLang === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => patch('defaultOcrLang', l.id)}
                  style={[
                    styles.langPill,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.accentSoft : theme.well,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      { color: active ? theme.accent : theme.inkSecondary },
                    ]}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Data Backup & Reset */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTag, { color: theme.inkMuted }]}>
          SAO LƯU & KHÔI PHỤC DỮ LIỆU (JSON)
        </Text>
        <Text
          style={[
            styles.sysDesc,
            {
              color: theme.inkSecondary,
              fontFamily: theme.uiFontRegular,
              fontSize: scaleFont(12.5, theme),
            },
          ]}
        >
          Kho Mã ({snippets.length} mục) và Lịch sử QR ({qrHistory.length} mã) lưu hoàn toàn cục bộ trên thiết bị.
        </Text>

        <TactileButton
          label="XUẤT SAO LƯU RA CLIPBOARD"
          theme={theme}
          variant="primary"
          mono
          icon={<Download size={14} color={theme.accentInk} />}
          onPress={handleExportBackup}
        />

        <TextInput
          multiline
          value={backupInput}
          onChangeText={setBackupInput}
          placeholder="Dán chuỗi JSON sao lưu tại đây để khôi phục..."
          placeholderTextColor={theme.inkMuted}
          textAlignVertical="top"
          style={[
            styles.backupInput,
            {
              backgroundColor: theme.well,
              borderColor: theme.border,
              color: theme.ink,
            },
          ]}
        />

        <View style={styles.rowBtns}>
          <TactileButton
            label="KHÔI PHỤC JSON"
            theme={theme}
            mono
            disabled={!backupInput.trim()}
            icon={<Upload size={14} color={theme.ink} />}
            onPress={handleRestoreBackup}
            style={{ flex: 1 }}
          />
          {qrHistory.length > 0 ? (
            <TactileButton
              label="XÓA LỊCH SỬ QR"
              theme={theme}
              variant="danger"
              mono
              size="sm"
              onPress={() => {
                onClearQrHistory();
                onNotify('Đã xóa lịch sử QR');
              }}
            />
          ) : null}
        </View>

        <TactileButton
          label="ĐẶT LẠI CÀI ĐẶT MẶC ĐỊNH"
          theme={theme}
          mono
          size="sm"
          icon={<RotateCcw size={13} color={theme.ink} />}
          onPress={() => {
            onUpdateSettings(createDefaultSettings(settings.themeMode));
            onNotify('Đã đặt lại phông chữ & màu sắc mặc định');
          }}
        />
      </View>

      <View
        style={[
          styles.manifestoCard,
          { backgroundColor: theme.well, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.manifestoTitle, { color: theme.ink }]}>
          KHUÔN // 1.1.0
        </Text>
        <Text
          style={[
            styles.manifestoBody,
            { color: theme.inkSecondary, fontFamily: theme.uiFontRegular },
          ]}
        >
          100% xử lý cục bộ trên thiết bị — Kho Mã kèm ảnh QR, Quét/Tạo VietQR & OCR đa ngôn ngữ (Việt, Anh, Nhật, Hàn, Trung).
        </Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 36, gap: 12 },
  previewCard: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 12,
    gap: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 12,
    gap: 10,
  },
  toggleCard: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    overflow: 'hidden',
  },
  toggleCardHead: {
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 4,
  },
  ocrLangPickerWrap: {
    padding: 12,
    gap: 8,
  },
  langPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langPill: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  langPillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10.5,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
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
  rowBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchBtn: {
    width: '48.6%',
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatchDot: {
    width: 18,
    height: 18,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: 12.5,
    flex: 1,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCell: {
    width: '48.6%',
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 10,
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scaleBtn: {
    width: '48.6%',
  },
  sysDesc: {
    lineHeight: 19,
  },
  backupInput: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 10,
    minHeight: 70,
    fontFamily: FONTS.monoRegular,
    fontSize: 11.5,
  },
  manifestoCard: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 12,
    gap: 4,
  },
  manifestoTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11.5,
    letterSpacing: 1,
  },
  manifestoBody: {
    fontSize: 12,
    lineHeight: 18,
  },
});
