import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Pin,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react-native';
import { FONTS, RADII, ThemePalette } from '../theme/tokens';
import { SnippetCategory, SnippetItem } from '../types/app';
import {
  extractTemplateVariables,
  getSuggestedVariableDefault,
  interpolateTemplate,
  removeVietnameseTones,
} from '../engines/textTools';
import { TactileButton } from '../components/TactileButton';
import { HardwareToggle } from '../components/HardwareToggle';
import { hapticSuccess, hapticTap } from '../services/haptics';

const CATEGORY_META: Record<SnippetCategory, { label: string; code: string }> = {
  bank: { label: 'Ngân hàng', code: 'BANK' },
  code: { label: 'Mã / Code', code: 'CODE' },
  reply: { label: 'Mẫu trả lời', code: 'REPLY' },
  address: { label: 'Địa chỉ', code: 'ADDR' },
  work: { label: 'Công việc', code: 'WORK' },
  other: { label: 'Khác', code: 'MISC' },
};

interface VaultScreenProps {
  theme: ThemePalette;
  snippets: SnippetItem[];
  onSaveSnippets: (items: SnippetItem[]) => void;
  onNotify: (msg: string) => void;
  onSendToQr: (text: string) => void;
  onSendToFilter: (text: string) => void;
}

function maskSnippetText(text: string): string {
  const clean = text.trim();
  if (clean.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(12, clean.length - 4))} ${clean.slice(-4)}`;
}

interface IndexedSnippet {
  item: SnippetItem;
  haystack: string;
  vars: string[];
}

interface SnippetRowProps {
  entry: IndexedSnippet;
  isRevealed: boolean;
  theme: ThemePalette;
  onTap: (item: SnippetItem, vars: string[]) => void;
  onToggleReveal: (id: string) => void;
  onTogglePin: (id: string) => void;
  onSendToQr: (text: string) => void;
  onSendToFilter: (text: string) => void;
  onEdit: (item: SnippetItem) => void;
  onDelete: (id: string) => void;
}

const SnippetRow = React.memo(function SnippetRow({
  entry,
  isRevealed,
  theme,
  onTap,
  onToggleReveal,
  onTogglePin,
  onSendToQr,
  onSendToFilter,
  onEdit,
  onDelete,
}: SnippetRowProps) {
  const { item, vars } = entry;
  const displayBody =
    item.sensitive && !isRevealed ? maskSnippetText(item.content) : item.content;

  return (
    <Pressable
      onPress={() => onTap(item, vars)}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.border,
          backgroundColor: pressed ? theme.well : theme.surface,
        },
      ]}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowTags}>
          <Text
            style={[
              styles.catBadge,
              {
                borderColor: theme.border,
                color: theme.inkSecondary,
                backgroundColor: theme.well,
              },
            ]}
          >
            {CATEGORY_META[item.category].code}
          </Text>
          {item.pinned ? (
            <Text style={[styles.pinBadge, { color: theme.accent }]}>
              ● GHIM
            </Text>
          ) : null}
          {vars.length > 0 ? (
            <Text style={[styles.tplBadge, { color: theme.success }]}>
              MẪU {`{${vars.length}}`}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.copyCount, { color: theme.inkMuted }]}>
          ×{item.copyCount}
        </Text>
      </View>

      <Text style={[styles.rowTitle, { color: theme.ink }]}>{item.title}</Text>
      <Text
        numberOfLines={3}
        style={[
          styles.rowBody,
          {
            color: theme.inkSecondary,
            fontFamily:
              item.category === 'code' || item.sensitive
                ? FONTS.monoRegular
                : FONTS.sansRegular,
          },
        ]}
      >
        {displayBody}
      </Text>

      <View style={styles.rowActions}>
        <View style={styles.copyHintWrap}>
          <Copy size={12} color={theme.accent} strokeWidth={1.8} />
          <Text style={[styles.copyHint, { color: theme.accent }]}>
            {vars.length > 0 ? 'ĐIỀN BIẾN & COPY' : 'CHẠM ĐỂ COPY'}
          </Text>
        </View>

        <View style={styles.iconActions}>
          {item.sensitive ? (
            <Pressable
              onPress={() => onToggleReveal(item.id)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              {isRevealed ? (
                <EyeOff size={15} color={theme.inkSecondary} />
              ) : (
                <Eye size={15} color={theme.inkSecondary} />
              )}
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onTogglePin(item.id)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Pin
              size={15}
              color={item.pinned ? theme.accent : theme.inkMuted}
            />
          </Pressable>
          <Pressable
            onPress={() => onSendToQr(item.content)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <QrCode size={15} color={theme.inkSecondary} />
          </Pressable>
          <Pressable
            onPress={() => onSendToFilter(item.content)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <SlidersHorizontal size={14} color={theme.inkSecondary} />
          </Pressable>
          <Pressable
            onPress={() => onEdit(item)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Edit3 size={15} color={theme.inkSecondary} />
          </Pressable>
          <Pressable
            onPress={() => onDelete(item.id)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Trash2 size={15} color={theme.danger} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

export const VaultScreen = React.memo(function VaultScreen({
  theme,
  snippets,
  onSaveSnippets,
  onNotify,
  onSendToQr,
  onSendToFilter,
}: VaultScreenProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeCat, setActiveCat] = useState<'all' | SnippetCategory>('all');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCat, setFormCat] = useState<SnippetCategory>('code');
  const [formPinned, setFormPinned] = useState(false);
  const [formSensitive, setFormSensitive] = useState(false);

  // Dynamic template filler modal
  const [templateTarget, setTemplateTarget] = useState<SnippetItem | null>(null);
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  // Pre-index normalized search strings, template variables, and category counts once per snippets change
  const { indexedSnippets, categoryCounts } = useMemo(() => {
    const counts: Record<SnippetCategory, number> = {
      bank: 0,
      code: 0,
      reply: 0,
      address: 0,
      work: 0,
      other: 0,
    };
    const indexed: IndexedSnippet[] = snippets.map((item) => {
      counts[item.category] += 1;
      return {
        item,
        haystack: removeVietnameseTones(
          `${item.title} ${item.content} ${CATEGORY_META[item.category].label}`
        ).toLowerCase(),
        vars: extractTemplateVariables(item.content),
      };
    });
    return { indexedSnippets: indexed, categoryCounts: counts };
  }, [snippets]);

  const filtered = useMemo(() => {
    const qNorm = removeVietnameseTones(deferredQuery.trim()).toLowerCase();
    return indexedSnippets
      .filter((entry) => {
        if (activeCat !== 'all' && entry.item.category !== activeCat) return false;
        if (!qNorm) return true;
        return entry.haystack.includes(qNorm);
      })
      .sort((a, b) => {
        if (a.item.pinned !== b.item.pinned) return a.item.pinned ? -1 : 1;
        return b.item.copyCount - a.item.copyCount || b.item.updatedAt - a.item.updatedAt;
      });
  }, [indexedSnippets, deferredQuery, activeCat]);

  const bumpCopyCount = useCallback(
    (id: string) => {
      const next = snippets.map((s) =>
        s.id === id ? { ...s, copyCount: s.copyCount + 1, updatedAt: Date.now() } : s
      );
      onSaveSnippets(next);
    },
    [snippets, onSaveSnippets]
  );

  const handleTapSnippet = useCallback(
    async (item: SnippetItem, vars: string[]) => {
      if (vars.length > 0) {
        const initial: Record<string, string> = {};
        for (const v of vars) {
          initial[v] = getSuggestedVariableDefault(v);
        }
        setTemplateTarget(item);
        setTemplateVars(vars);
        setTemplateValues(initial);
        hapticTap('light');
        return;
      }

      await Clipboard.setStringAsync(item.content);
      bumpCopyCount(item.id);
      hapticSuccess();
      onNotify(`Đã copy: ${item.title}`);
    },
    [bumpCopyCount, onNotify]
  );

  const handleToggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleCopyFilledTemplate = async () => {
    if (!templateTarget) return;
    const finalStr = interpolateTemplate(templateTarget.content, templateValues);
    await Clipboard.setStringAsync(finalStr);
    bumpCopyCount(templateTarget.id);
    setTemplateTarget(null);
    hapticSuccess();
    onNotify('Đã điền mẫu & copy vào bộ nhớ tạm');
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormCat('code');
    setFormPinned(false);
    setFormSensitive(false);
    setEditorOpen(true);
  };

  const openEditModal = useCallback((item: SnippetItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormCat(item.category);
    setFormPinned(item.pinned);
    setFormSensitive(item.sensitive);
    setEditorOpen(true);
  }, []);

  const handleSaveForm = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      onNotify('Vui lòng nhập tiêu đề và nội dung');
      return;
    }
    const now = Date.now();
    if (editingId) {
      const next = snippets.map((s) =>
        s.id === editingId
          ? {
              ...s,
              title: formTitle.trim(),
              content: formContent,
              category: formCat,
              pinned: formPinned,
              sensitive: formSensitive,
              updatedAt: now,
            }
          : s
      );
      onSaveSnippets(next);
      onNotify('Đã cập nhật mục ghi nhớ');
    } else {
      const item: SnippetItem = {
        id: `snp-${now}-${Math.random().toString(36).slice(2, 6)}`,
        title: formTitle.trim(),
        content: formContent,
        category: formCat,
        pinned: formPinned,
        sensitive: formSensitive,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      onSaveSnippets([item, ...snippets]);
      onNotify('Đã lưu vào Kho Mã');
    }
    hapticSuccess();
    setEditorOpen(false);
  };

  const togglePin = useCallback(
    (id: string) => {
      hapticTap('light');
      onSaveSnippets(
        snippets.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
      );
    },
    [snippets, onSaveSnippets]
  );

  const deleteSnippet = useCallback(
    (id: string) => {
      hapticTap('medium');
      onSaveSnippets(snippets.filter((s) => s.id !== id));
      onNotify('Đã xóa khỏi Kho Mã');
    },
    [snippets, onSaveSnippets, onNotify]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Search + Add Strip */}
      <View
        style={[
          styles.searchStrip,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.well, borderColor: theme.border },
          ]}
        >
          <Search size={14} color={theme.inkMuted} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm nhanh (gõ không dấu OK)..."
            placeholderTextColor={theme.inkMuted}
            style={[styles.searchInput, { color: theme.ink }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <X size={14} color={theme.inkMuted} />
            </Pressable>
          ) : null}
        </View>

        <TactileButton
          label="THÊM"
          theme={theme}
          variant="primary"
          size="sm"
          mono
          icon={<Plus size={14} color={theme.accentInk} strokeWidth={2} />}
          onPress={openCreateModal}
          style={{ minHeight: 38 }}
        />
      </View>

      {/* Category Filter Strip */}
      <View
        style={[
          styles.catBarWrap,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catBar}
        >
          <Pressable
            onPress={() => setActiveCat('all')}
            style={[
              styles.catChip,
              {
                borderColor: activeCat === 'all' ? theme.ink : theme.border,
                backgroundColor: activeCat === 'all' ? theme.ink : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.catText,
                { color: activeCat === 'all' ? theme.bg : theme.inkSecondary },
              ]}
            >
              TẤT CẢ ({snippets.length})
            </Text>
          </Pressable>
          {(Object.keys(CATEGORY_META) as SnippetCategory[]).map((cat) => {
            const count = categoryCounts[cat];
            const active = activeCat === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCat(cat)}
                style={[
                  styles.catChip,
                  {
                    borderColor: active ? theme.ink : theme.border,
                    backgroundColor: active ? theme.ink : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catText,
                    { color: active ? theme.bg : theme.inkSecondary },
                  ]}
                >
                  {CATEGORY_META[cat].label.toUpperCase()} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Virtualized Hairline-Divided Snippet List */}
      <FlatList
        data={filtered}
        keyExtractor={(entry) => entry.item.id}
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>
              Không có mục nào khớp
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.inkMuted }]}>
              Bấm "+ THÊM" để lưu số tài khoản, mã lệnh, mật khẩu Wi-Fi hoặc mẫu trả lời có biến số.
            </Text>
          </View>
        }
        renderItem={({ item: entry }) => (
          <SnippetRow
            entry={entry}
            isRevealed={!!revealedIds[entry.item.id]}
            theme={theme}
            onTap={handleTapSnippet}
            onToggleReveal={handleToggleReveal}
            onTogglePin={togglePin}
            onSendToQr={onSendToQr}
            onSendToFilter={onSendToFilter}
            onEdit={openEditModal}
            onDelete={deleteSnippet}
          />
        )}
      />

      {/* Create / Edit Snippet Modal */}
      <Modal
        visible={editorOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditorOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.ink }]}>
                {editingId ? 'SỬA MỤC GHI NHỚ' : 'THÊM MỤC GHI NHỚ MỚI'}
              </Text>
              <Pressable onPress={() => setEditorOpen(false)} hitSlop={8}>
                <X size={18} color={theme.ink} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>
                TIÊU ĐỀ NGẮN
              </Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="VD: Số tài khoản VCB, Lệnh Git, Mẫu báo giá..."
                placeholderTextColor={theme.inkMuted}
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: theme.well,
                    borderColor: theme.border,
                    color: theme.ink,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>
                PHÂN LOẠI
              </Text>
              <View style={styles.catGrid}>
                {(Object.keys(CATEGORY_META) as SnippetCategory[]).map((cat) => {
                  const active = formCat === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setFormCat(cat)}
                      style={[
                        styles.catSelectBtn,
                        {
                          borderColor: active ? theme.accent : theme.border,
                          backgroundColor: active
                            ? theme.accentSoft
                            : theme.well,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catSelectText,
                          { color: active ? theme.accent : theme.ink },
                        ]}
                      >
                        {CATEGORY_META[cat].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.contentLabelRow}>
                <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>
                  NỘI DUNG (DÙNG {`{{biến}}`} ĐỂ TẠO MẪU ĐỘNG)
                </Text>
              </View>
              <TextInput
                multiline
                value={formContent}
                onChangeText={setFormContent}
                placeholder="Nhập đoạn mã hoặc nội dung thường copy..."
                placeholderTextColor={theme.inkMuted}
                textAlignVertical="top"
                style={[
                  styles.fieldTextArea,
                  {
                    backgroundColor: theme.well,
                    borderColor: theme.border,
                    color: theme.ink,
                  },
                ]}
              />

              <View style={styles.varHelpers}>
                {['{{tên}}', '{{ngày}}', '{{số_tiền}}', '{{mã_đơn}}'].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setFormContent((prev) => prev + v)}
                    style={[
                      styles.varChip,
                      { borderColor: theme.border, backgroundColor: theme.well },
                    ]}
                  >
                    <Text style={[styles.varChipText, { color: theme.inkSecondary }]}>
                      + {v}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View
                style={[styles.toggleGroup, { borderColor: theme.border }]}
              >
                <HardwareToggle
                  label="Ghim lên đầu danh sách"
                  value={formPinned}
                  onToggle={setFormPinned}
                  theme={theme}
                />
                <HardwareToggle
                  label="Ẩn nội dung nhạy cảm (•••)"
                  description="Che nội dung trên màn hình, chạm vẫn copy đầy đủ"
                  value={formSensitive}
                  onToggle={setFormSensitive}
                  theme={theme}
                />
              </View>
            </ScrollView>

            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TactileButton
                label="HỦY"
                theme={theme}
                mono
                onPress={() => setEditorOpen(false)}
              />
              <TactileButton
                label="LƯU KHO MÃ"
                theme={theme}
                variant="primary"
                mono
                onPress={handleSaveForm}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Dynamic Template Filler Modal */}
      <Modal
        visible={!!templateTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setTemplateTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.ink }]}>
                ĐIỀN BIẾN SỐ MẪU
              </Text>
              <Pressable onPress={() => setTemplateTarget(null)} hitSlop={8}>
                <X size={18} color={theme.ink} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {templateVars.map((v) => (
                <View key={v} style={{ marginBottom: 10 }}>
                  <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>
                    {v.toUpperCase()}
                  </Text>
                  <TextInput
                    value={templateValues[v] ?? ''}
                    onChangeText={(txt) =>
                      setTemplateValues((prev) => ({ ...prev, [v]: txt }))
                    }
                    placeholder={`Nhập ${v}...`}
                    placeholderTextColor={theme.inkMuted}
                    style={[
                      styles.fieldInput,
                      {
                        backgroundColor: theme.well,
                        borderColor: theme.border,
                        color: theme.ink,
                      },
                    ]}
                  />
                </View>
              ))}

              <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>
                XEM TRƯỚC KẾT QUẢ
              </Text>
              <View
                style={[
                  styles.previewWell,
                  { backgroundColor: theme.well, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.previewText, { color: theme.ink }]}>
                  {templateTarget
                    ? interpolateTemplate(templateTarget.content, templateValues)
                    : ''}
                </Text>
              </View>
            </ScrollView>

            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TactileButton
                label="ĐÓNG"
                theme={theme}
                mono
                onPress={() => setTemplateTarget(null)}
              />
              <TactileButton
                label="COPY ĐOẠN HOÀN CHỈNH"
                theme={theme}
                variant="primary"
                mono
                icon={<Copy size={13} color={theme.accentInk} />}
                onPress={handleCopyFilledTemplate}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    paddingVertical: 0,
  },
  catBarWrap: {
    borderBottomWidth: 1,
  },
  catBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  catChip: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  catText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    lineHeight: 20,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catBadge: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.7,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pinBadge: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  tplBadge: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  copyCount: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
  },
  rowTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14.5,
    marginBottom: 4,
  },
  rowBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyHintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  copyHint: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 2,
  },
  miniTextAction: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,16,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.9,
  },
  modalBody: {
    padding: 16,
  },
  fieldLabel: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontFamily: FONTS.sansRegular,
    fontSize: 13.5,
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  catSelectBtn: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catSelectText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  contentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldTextArea: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 11,
    minHeight: 96,
    fontFamily: FONTS.sansRegular,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 8,
  },
  varHelpers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  varChip: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  varChipText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
  },
  toggleGroup: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginBottom: 12,
  },
  previewWell: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    padding: 11,
    marginBottom: 12,
  },
  previewText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
  },
});
