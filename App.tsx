import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  FONTS,
  RADII,
  createDefaultSettings,
  resolveTheme,
} from './src/theme/tokens';
import {
  AppSettings,
  QrHistoryItem,
  SnippetItem,
  TabKey,
  ThemeMode,
} from './src/types/app';
import {
  hydrateAppState,
  saveAppSettings,
  saveQrHistory,
  saveSnippets,
} from './src/services/storage';
import { setHapticsEnabled } from './src/services/haptics';
import { AppHeader } from './src/components/AppHeader';
import { ChannelBar } from './src/components/ChannelBar';
import { VaultScreen } from './src/screens/VaultScreen';
import { QrScreen } from './src/screens/QrScreen';
import { OcrScreen } from './src/screens/OcrScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
  try {
    SplashScreen.setOptions({
      duration: 280,
      fade: true,
    });
  } catch {
    // Ignore where unsupported
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
  const [settings, setSettings] = useState<AppSettings>(() =>
    createDefaultSettings(
      Appearance.getColorScheme() === 'dark' ? 'charcoal' : 'paper'
    )
  );
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [qrHistory, setQrHistory] = useState<QrHistoryItem[]>([]);
  const [qrInitialGenText, setQrInitialGenText] = useState<string | undefined>(
    undefined
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setSettings(data.settings);
      setHapticsEnabled(data.settings.hapticsEnabled);
      setSnippets(data.snippets);
      setQrHistory(data.qrHistory);
      setHydrated(true);
    });
    return () => {
      mounted = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const isAppReady = (fontsLoaded || !!fontError) && hydrated;
  const theme = useMemo(() => resolveTheme(settings), [settings]);

  // Sync native OS root window background & haptics setting
  useEffect(() => {
    if (!hydrated) return;
    setHapticsEnabled(settings.hapticsEnabled);
    SystemUI.setBackgroundColorAsync(theme.bg).catch(() => {});
  }, [hydrated, settings.hapticsEnabled, theme.bg]);

  const handleSelectTab = useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) return;
      tabOpacity.setValue(0.88);
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
      }, 2200);
    },
    [toastAnim]
  );

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    setHapticsEnabled(next.hapticsEnabled);
    saveAppSettings(next);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextMode: ThemeMode =
        prev.themeMode === 'paper' ? 'charcoal' : 'paper';
      const next = { ...prev, themeMode: nextMode };
      saveAppSettings(next);
      return next;
    });
  }, []);

  const handleSaveSnippets = useCallback((items: SnippetItem[]) => {
    setSnippets(items);
    saveSnippets(items);
  }, []);

  const handleSaveQrHistory = useCallback((items: QrHistoryItem[]) => {
    setQrHistory(items);
    saveQrHistory(items);
  }, []);

  const handleClearQrHistory = useCallback(() => {
    setQrHistory([]);
    saveQrHistory([]);
  }, []);

  const handleImportBackup = useCallback(
    (
      restoredSnippets: SnippetItem[],
      restoredHistory: QrHistoryItem[],
      restoredSettings?: Partial<AppSettings>
    ) => {
      setSnippets(restoredSnippets);
      saveSnippets(restoredSnippets);
      setQrHistory(restoredHistory);
      saveQrHistory(restoredHistory);
      if (restoredSettings) {
        setSettings((prev) => {
          const next = { ...prev, ...restoredSettings };
          setHapticsEnabled(next.hapticsEnabled);
          saveAppSettings(next);
          return next;
        });
      }
    },
    []
  );

  const handleQuickSaveToVault = useCallback(
    (title: string, content: string, imageUri?: string) => {
      const now = Date.now();
      const item: SnippetItem = {
        id: `snp-${now}-${Math.random().toString(36).slice(2, 6)}`,
        title: title || 'Mục lưu nhanh',
        content,
        imageUri,
        category: imageUri ? 'bank' : 'other',
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
              />
            </View>

            <View
              style={[
                styles.tabPane,
                activeTab !== 'ocr' && styles.hiddenPane,
              ]}
            >
              <OcrScreen
                theme={theme}
                isActive={activeTab === 'ocr'}
                defaultLang={settings.defaultOcrLang}
                autoNormalize={settings.autoNormalizeOcr}
                onNotify={notify}
                onSaveToVault={handleQuickSaveToVault}
                onSendToQr={handleSendToQr}
              />
            </View>

            <View
              style={[
                styles.tabPane,
                activeTab !== 'settings' && styles.hiddenPane,
              ]}
            >
              <SettingsScreen
                theme={theme}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                snippets={snippets}
                qrHistory={qrHistory}
                onImportBackup={handleImportBackup}
                onClearQrHistory={handleClearQrHistory}
                onNotify={notify}
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
