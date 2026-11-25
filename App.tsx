import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Appearance,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { FONTS, RADII, THEMES } from './src/theme/tokens';
import {
  NormalizerOptions,
  QrHistoryItem,
  SnippetItem,
  TabKey,
  ThemeMode,
} from './src/types/app';
import { DEFAULT_NORMALIZER_OPTIONS } from './src/engines/textNormalizer';
import {
  hydrateAppState,
  saveDraftInput,
  saveNormalizerOptions,
  saveQrHistory,
  saveSnippets,
  saveThemeMode,
} from './src/services/storage';
import { AppHeader } from './src/components/AppHeader';
import { ChannelBar } from './src/components/ChannelBar';
import { VaultScreen } from './src/screens/VaultScreen';
import { QrScreen } from './src/screens/QrScreen';
import { FilterScreen } from './src/screens/FilterScreen';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
  try {
    SplashScreen.setOptions({
      duration: 280,
      fade: true,
    });
  } catch {
    // Ignore on platforms/environments where setOptions is unsupported
  }
}

function AppShell() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('vault');
  const [hydrated, setHydrated] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    Appearance.getColorScheme() === 'dark' ? 'charcoal' : 'paper'
  );
  const [rawText, setRawText] = useState('');
  const [normOptions, setNormOptions] = useState<NormalizerOptions>(
    DEFAULT_NORMALIZER_OPTIONS
  );
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [qrHistory, setQrHistory] = useState<QrHistoryItem[]>([]);
  const [qrInitialGenText, setQrInitialGenText] = useState<string | undefined>(
    undefined
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashHiddenRef = useRef(false);

  // GPU-driven entrance & tab-switch animations
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterShift = useRef(new Animated.Value(8)).current;
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    hydrateAppState().then((data) => {
      if (!mounted) return;
      setThemeMode(data.themeMode);
      setSnippets(data.snippets);
      setQrHistory(data.qrHistory);
      setNormOptions(data.normOptions);
      setRawText(data.draftInput);
      setHydrated(true);
    });
    return () => {
      mounted = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  const isAppReady = (fontsLoaded || !!fontError) && hydrated;
  const theme = THEMES[themeMode];

  // Sync native OS root window background with active theme
  useEffect(() => {
    if (!hydrated) return;
    SystemUI.setBackgroundColorAsync(theme.bg).catch(() => {});
  }, [hydrated, theme.bg]);

  // Subtle GPU-accelerated tab fade so switching channels feels fluid
  const handleSelectTab = useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) return;
      tabOpacity.setValue(0.86);
      setActiveTab(tab);
      Animated.timing(tabOpacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [activeTab, tabOpacity]
  );

  const handleRootLayout = useCallback(() => {
    if (!isAppReady || splashHiddenRef.current) return;
    splashHiddenRef.current = true;

    const reveal = () => {
      Animated.parallel([
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(enterShift, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    };

    if (Platform.OS !== 'web') {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => {
          requestAnimationFrame(reveal);
        });
    } else {
      requestAnimationFrame(reveal);
    }
  }, [isAppReady, enterOpacity, enterShift]);

  const notify = useCallback(
    (msg: string) => {
      setToastMsg(msg);
      toastAnim.setValue(0);
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setToastMsg(null);
        });
      }, 2100);
    },
    [toastAnim]
  );

  const handleToggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next: ThemeMode = prev === 'paper' ? 'charcoal' : 'paper';
      saveThemeMode(next);
      return next;
    });
  }, []);

  const handleChangeRawText = useCallback((text: string) => {
    setRawText(text);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraftInput(text);
    }, 350);
  }, []);

  const handleChangeNormOptions = useCallback((opts: NormalizerOptions) => {
    setNormOptions(opts);
    saveNormalizerOptions(opts);
  }, []);

  const handleSaveSnippets = useCallback((items: SnippetItem[]) => {
    setSnippets(items);
    saveSnippets(items);
  }, []);

  const handleSaveQrHistory = useCallback((items: QrHistoryItem[]) => {
    setQrHistory(items);
    saveQrHistory(items);
  }, []);

  const handleQuickSaveToVault = useCallback(
    (title: string, content: string) => {
      const now = Date.now();
      const item: SnippetItem = {
        id: `snp-${now}-${Math.random().toString(36).slice(2, 6)}`,
        title: title || 'Mục lưu nhanh',
        content,
        category: 'other',
        pinned: false,
        sensitive: false,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      setSnippets((prev) => {
        const next = [item, ...prev];
        saveSnippets(next);
        return next;
      });
      notify('Đã lưu vào Kho Mã (01)');
    },
    [notify]
  );

  const handleSendToQr = useCallback(
    (text: string) => {
      setQrInitialGenText(text);
      handleSelectTab('qr');
    },
    [handleSelectTab]
  );

  const handleConsumeInitialGenText = useCallback(() => {
    setQrInitialGenText(undefined);
  }, []);

  const handleSendToFilter = useCallback(
    (text: string) => {
      handleChangeRawText(text);
      handleSelectTab('filter');
      notify('Đã chuyển sang Lọc dữ liệu (03)');
    },
    [handleChangeRawText, handleSelectTab, notify]
  );

  // Hold native splash screen cleanly while fonts + storage finish loading (prevents launch flicker)
  if (!isAppReady) {
    if (Platform.OS !== 'web') {
      return null;
    }
    return <View style={[styles.webBootFill, { backgroundColor: theme.bg }]} />;
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.bg,
        },
      ]}
    >
      <StatusBar style={theme.statusBarStyle} />

      <View
        onLayout={handleRootLayout}
        style={[
          styles.mobileFrame,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.frameInner,
            {
              opacity: enterOpacity,
              transform: [{ translateY: enterShift }],
            },
          ]}
        >
          <AppHeader
            activeTab={activeTab}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />

          <Animated.View style={[styles.screenBody, { opacity: tabOpacity }]}>
            <View
              style={[
                styles.tabPane,
                activeTab !== 'vault' && styles.hiddenPane,
              ]}
            >
              <VaultScreen
                theme={theme}
                snippets={snippets}
                onSaveSnippets={handleSaveSnippets}
                onNotify={notify}
                onSendToQr={handleSendToQr}
                onSendToFilter={handleSendToFilter}
              />
            </View>

            <View
              style={[
                styles.tabPane,
                activeTab !== 'qr' && styles.hiddenPane,
              ]}
            >
              <QrScreen
                theme={theme}
                isActive={activeTab === 'qr'}
                history={qrHistory}
                onSaveHistory={handleSaveQrHistory}
                initialGenText={qrInitialGenText}
                onConsumeInitialGenText={handleConsumeInitialGenText}
                onNotify={notify}
                onSaveToVault={handleQuickSaveToVault}
                onSendToFilter={handleSendToFilter}
              />
            </View>

            <View
              style={[
                styles.tabPane,
                activeTab !== 'filter' && styles.hiddenPane,
              ]}
            >
              <FilterScreen
                theme={theme}
                rawText={rawText}
                onChangeRawText={handleChangeRawText}
                options={normOptions}
                onChangeOptions={handleChangeNormOptions}
                onNotify={notify}
                onSaveToVault={handleQuickSaveToVault}
                onSendToQr={handleSendToQr}
              />
            </View>

            {toastMsg ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.toastBar,
                  {
                    backgroundColor: theme.ink,
                    borderColor: theme.accent,
                    opacity: toastAnim,
                    transform: [
                      {
                        translateY: toastAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.toastDot, { backgroundColor: theme.accent }]} />
                <Text numberOfLines={1} style={[styles.toastText, { color: theme.bg }]}>
                  {toastMsg}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>

          <ChannelBar
            active={activeTab}
            onSelect={handleSelectTab}
            theme={theme}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBootFill: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    ...(Platform.OS === 'web'
      ? { borderLeftWidth: 1, borderRightWidth: 1 }
      : {}),
  },
  frameInner: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
    position: 'relative',
  },
  tabPane: {
    flex: 1,
  },
  hiddenPane: {
    display: 'none',
  },
  toastBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  toastText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11.5,
    letterSpacing: 0.3,
    flex: 1,
  },
});
