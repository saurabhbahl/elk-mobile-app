import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, Switch } from 'react-native';
import { useOfflineMap } from '../../hooks/useOfflineMap';
import { useRoutePreloader } from '../../hooks/useRoutePreloader';
import { clearAllRoutes, getAllCachedRoutes } from '../../utils/routeDatabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { LIGHT_COLORS, LIGHT_FONTS } from '../../constants/theme';
import { useAppContent } from '../../contexts/AppContentContext';
import { normalizeHex } from '../../utils/colorUtils';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const { hasMap, isDownloading, downloadProgress, downloadMap, deleteMap, isInitializing } = useOfflineMap();
  const { theme, setTheme, colors, fonts, isDark } = useTheme();
  const { preloadAll, progress, isPreloading, cancelPreload } = useRoutePreloader();
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);

  const { brandData } = useAppContent();

  const brandPrimary = normalizeHex(brandData?.brand_color_primary, colors.primary);
  const brandSecondary = normalizeHex(brandData?.brand_color__secondary, colors.secondary);
  const styles = createStyles(colors, fonts, isDark, brandPrimary, brandSecondary);

  // Load cached route count on mount
  useEffect(() => {
    loadCachedCount();
  }, []);

  const loadCachedCount = async () => {
    try {
      const routes = await getAllCachedRoutes();
      setCachedCount(routes.length);
    } catch (err) {
      console.warn('[Settings] Failed to load cached routes:', err);
    }
  };

  const handlePreloadAll = async () => {
    const result = await preloadAll();
    if (!result) return;
    if (result.error) {
      Alert.alert('No Internet', 'Please connect to the internet to download routes.');
      return;
    }
    if (result.success) {
      Alert.alert('Routes Cached', `${result.cached} routes saved for offline use.`);
      await loadCachedCount();
    } else {
      Alert.alert('Preload Cancelled', `${result.cached} routes were cached before cancellation.`);
      await loadCachedCount();
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cached Routes',
      `Are you sure you want to delete all ${cachedCount} cached routes? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAllRoutes();
              setCachedCount(0);
              Alert.alert('Cache Cleared', 'All offline routes have been deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear cached routes.');
              console.error('[Settings] Clear cache failed:', err);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure your app</Text>

      {/* ── Theme Selection Section ────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionDescription}>
          Choose between light and dark mode.
        </Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <MaterialIcons name={isDark ? 'nights-stay' : 'wb-sunny'} size={22} color={colors.onSurface} />
            <Text style={styles.toggleText}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
            trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
            thumbColor={colors.onPrimary}
          />
        </View>
      </View>

      {/* ── Offline Map Section ────────────────────────────────────────────── */}
      <View style={[styles.section, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Offline Map Data</Text>
        <Text style={styles.sectionDescription}>
          The offline map allows you to navigate the Elk Scenic Drive without cellular service.
          It requires approximately 307MB of storage.
        </Text>

        {isInitializing ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : isDownloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.progressText}>
              Downloading... {downloadProgress < 0 ? '' : `${Math.round(downloadProgress * 100)}%`}
            </Text>
          </View>
        ) : hasMap ? (
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <MaterialIcons name="check-circle" size={20} color={isDark ? colors.primary : '#2e7d32'} />
              <Text style={styles.statusText}>Map is downloaded and ready.</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={deleteMap}>
              <Text style={styles.deleteButtonText}>Delete Offline Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <MaterialIcons name="info" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.statusText}>Map is not downloaded.</Text>
            </View>
            <TouchableOpacity style={styles.downloadButton} onPress={downloadMap}>
              <Text style={styles.downloadButtonText}>Download Map Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Offline Routes Section ─────────────────────────────────────────── */}
      <View style={[styles.section, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Offline Routes</Text>
        <Text style={styles.sectionDescription}>
          Pre-download driving routes between all viewing areas. Routes are stored locally in the device database and persist across app restarts — you only need to do this once.
        </Text>

        {isPreloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.progressText}>
                Caching routes... {progress.percentage}%
              </Text>
              <Text style={styles.progressSubtext}>
                {progress.current} / {progress.total} pairs
              </Text>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelPreload}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <MaterialIcons name="route" size={20} color={colors.primary} />
              <Text style={styles.statusText}>
                {cachedCount > 0
                  ? `${cachedCount} routes cached`
                  : 'No routes cached yet'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.downloadButton, { flex: 1 }]}
                onPress={handlePreloadAll}
              >
                <MaterialIcons name="download" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.downloadButtonText}>Preload All</Text>
              </TouchableOpacity>
              {cachedCount > 0 && (
                <TouchableOpacity
                  style={[styles.clearButton, isClearing && styles.clearButtonDisabled]}
                  onPress={handleClearCache}
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} style={{ marginRight: 6 }} />
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 120 + safeBottom }} />
    </ScrollView>
  );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, brandPrimary: string, brandSecondary: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.surface,
    },
    title: {
      fontFamily: fonts.headingBold,
      fontSize: 32,
      color: brandPrimary,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.onSurfaceVariant,
      marginTop: 4,
      marginBottom: 32,
    },
    section: {
      backgroundColor: colors.surfaceContainerLowest,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 20,
      color: brandPrimary,
      marginBottom: 8,
    },
    sectionDescription: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.onSurfaceVariant,
      lineHeight: 20,
      marginBottom: 20,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    toggleLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toggleText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.onSurface,
    },
    statusContainer: {
      marginTop: 8,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
    },
    statusText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: brandPrimary,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    progressText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: brandPrimary,
    },
    downloadButton: {
      backgroundColor: brandPrimary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    downloadButtonText: {
      color: colors.onPrimary,
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },
    deleteButton: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1.5,
      borderColor: colors.error,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.error,
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },
    progressSubtext: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },
    cancelButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.error,
    },
    cancelButtonText: {
      color: colors.error,
      fontFamily: fonts.bodyBold,
      fontSize: 13,
    },
    clearButton: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1.5,
      borderColor: colors.error,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    clearButtonDisabled: {
      opacity: 0.5,
    },
    clearButtonText: {
      color: colors.error,
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },
  });
