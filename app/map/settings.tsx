import AppText from "@/src/components/AppText";
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, LIGHT_FONTS } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useAppContent } from '../../src/contexts/AppContentContext';
import { useOfflineMap } from '../../src/hooks/useOfflineMap';
import { useRoutePreloader } from '../../src/hooks/useRoutePreloader';
import { normalizeHex } from '../../src/utils/colorUtils';
import { clearImageCache, getCacheSizeLabel } from '../../src/utils/imageCache';
import { clearAllRoutes, getAllCachedRoutes } from '../../src/utils/routeDatabase';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const { hasMap, isDownloading, downloadProgress, downloadMap, cancelDownload, deleteMap, isInitializing, mbtilesError, setMbtilesError } = useOfflineMap();
  const { theme, setTheme, colors, fonts, isDark } = useTheme();
  const { preloadAll, progress, isPreloading, cancelPreload } = useRoutePreloader();
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [imageCacheSize, setImageCacheSize] = useState<string>('...');
  const [isClearingImages, setIsClearingImages] = useState(false);

  const { brandData } = useAppContent();

  const brandPrimary = normalizeHex(brandData?.brand_color_primary);
  const brandSecondary = normalizeHex(brandData?.brand_color__secondary);
  const styles = useMemo(() => createStyles(colors, fonts, isDark, brandPrimary, brandSecondary), [colors, fonts, isDark, brandPrimary, brandSecondary]);

  // Load cached route count and image cache size on mount
  useEffect(() => {
    loadCachedCount();
    loadImageCacheSize();
  }, []);

  const loadImageCacheSize = async () => {
    try {
      const label = await getCacheSizeLabel();
      setImageCacheSize(label);
    } catch {
      setImageCacheSize('Unknown');
    }
  };

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
      Alert.alert('Routes Downloaded', `${result.cached} routes saved for offline use.`);
      await loadCachedCount();
    } else {
      Alert.alert('Download Cancelled', `${result.cached} routes were downloaded before cancellation.`);
      await loadCachedCount();
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Remove Downloaded Routes?',
      `This will remove all ${cachedCount} downloaded routes from your device. They can be downloaded again whenever you need them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAllRoutes();
              setCachedCount(0);
              Alert.alert(
                'Downloaded Routes Removed',
                'Your downloaded routes have been removed from this device.'
              );
            } catch (err) {
              Alert.alert(
                'Something Went Wrong',
                'We couldn’t remove the downloaded routes. Please try again.'
              );
              console.error('[Settings] Clear routes failed:', err);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* ── Custom Header ──────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: brandPrimary || '#8B1E1E',
        paddingTop: insets.top,
        height: 56 + insets.top,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
      }}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ flexDirection: 'row', alignItems: 'center', minWidth: 60 }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={18} color="#FFFFFF" />
          <AppText style={{ color: '#FFFFFF', fontSize: 16, fontFamily: fonts.bodyMedium }}>back</AppText>
        </TouchableOpacity>
        
        <AppText style={{ 
          color: '#FFFFFF', 
          fontSize: 18, 
          fontFamily: "Lexend_500Medium",
        }}>
          Settings
        </AppText>
        
        <View style={{ minWidth: 60 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Theme Selection Section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Appearance</AppText>
          <AppText style={styles.sectionDescription}>
            Choose between light and dark mode.
          </AppText>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <MaterialIcons name={isDark ? 'nights-stay' : 'wb-sunny'} size={22} color={colors.onSurface} />
              <AppText style={styles.toggleText}>{isDark ? 'Dark Mode' : 'Light Mode'}</AppText>
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
          <AppText style={styles.sectionTitle}>Offline Map</AppText>
          <AppText style={styles.sectionDescription}>
            Download the map so you can use it even when you don't have a mobile signal or internet connection. The download uses about 307 MB of storage on your device.
          </AppText>

          {isInitializing ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : isDownloading ? (
            <View style={[styles.progressContainer, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={styles.progressText}>
                  Downloading... {downloadProgress < 0 ? '' : `${Math.round(downloadProgress * 100)}%`}
                </AppText>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelDownload}>
                <AppText style={styles.cancelButtonText}>Cancel</AppText>
              </TouchableOpacity>
            </View>
          ) : hasMap ? (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <MaterialIcons name="check-circle" size={20} color={isDark ? colors.primary : '#2e7d32'} />
                <AppText style={styles.statusText}>Map is downloaded and ready.</AppText>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={deleteMap}>
                <AppText style={styles.deleteButtonText}>Delete Offline Map</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <MaterialIcons name="info" size={20} color={colors.onSurfaceVariant} />
                <AppText style={styles.statusText}>Map is not downloaded.</AppText>
              </View>
              <TouchableOpacity style={styles.downloadButton} onPress={downloadMap}>
                <AppText style={styles.downloadButtonText}>Download Map Now</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Offline Routes Section ─────────────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Offline Routes</AppText>
          <AppText style={styles.sectionDescription}>
            Download routes so you can get directions even without an internet connection. You only need to download them once.
          </AppText>

          {isPreloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText style={styles.progressText}>
                  Downloading routes... {progress.percentage}%
                </AppText>
                <AppText style={styles.progressSubtext}>
                  {progress.current} / {progress.total} pairs
                </AppText>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelPreload}>
                <AppText style={styles.cancelButtonText}>Cancel</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <MaterialIcons name="route" size={20} color={colors.primary} />
                <AppText style={styles.statusText}>
                  {cachedCount > 0
                    ? `${cachedCount} routes cached`
                    : 'No routes cached yet'}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.downloadButton, { flex: 1 }]}
                  onPress={handlePreloadAll}
                >
                  <MaterialIcons name="download" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                  <AppText style={styles.downloadButtonText}>Download All</AppText>
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
                        <AppText style={styles.clearButtonText}>Clear</AppText>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ── Content Image Cache Section ────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Downloaded Images</AppText>
          <AppText style={styles.sectionDescription}>
            Images used throughout the app are saved on your device so they load faster.
            You can remove them at any time to free up storage. They will download again
            automatically when needed.
          </AppText>

          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <MaterialIcons name="photo-library" size={20} color={colors.primary} />
              <AppText style={styles.statusText}>{imageCacheSize} used</AppText>
            </View>
            <TouchableOpacity
              style={[styles.deleteButton, isClearingImages && { opacity: 0.5 }]}
              disabled={isClearingImages}
              onPress={() => {
                Alert.alert(
                  'Clear Image Cache',
                  'TThis will remove all downloaded images from your device. They will be downloaded again automatically when you use the app.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        setIsClearingImages(true);
                        try {
                          await clearImageCache();
                          await loadImageCacheSize();
                          Alert.alert(
                            'Downloaded Images Removed',
                            'Downloaded images have been removed from your device. They will download again automatically when you use the app.'
                          );
                        } catch {
                          Alert.alert(
                            'Something Went Wrong',
                            'We couldn’t remove the downloaded images. Please try again.'
                          );
                        } finally {
                          setIsClearingImages(false);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              {isClearingImages ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <AppText style={styles.deleteButtonText}>Remove Downloaded Images</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 + safeBottom }} />
      </ScrollView>

      {/* ── Error Toast ── */}
      {mbtilesError && (
        <View style={styles.errorToastContainer}>
          <View style={styles.errorToastIcon}>
            <MaterialIcons name="error-outline" size={24} color={colors.error} />
          </View>
          <View style={styles.errorToastTextContent}>
            <AppText style={styles.errorToastTitle}>Something went wrong</AppText>
            <AppText style={styles.errorToastDescription}>Map download failed.</AppText>
          </View>
          <TouchableOpacity onPress={() => setMbtilesError(false)} style={styles.errorToastClose}>
            <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, brandPrimary: string | undefined, brandSecondary: string | undefined) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.surface,
    },
    title: {
      fontFamily: fonts.headingBold,
      fontSize: 20,
      color: isDark ? "#FFFFFF" : brandPrimary,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
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
      shadowColor: colors.onSurface,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 15,
      color: isDark ? "#FFFFFF" : brandPrimary,
      marginBottom: 8,
    },
    sectionDescription: {
      fontFamily: fonts.body,
      fontSize: 13,
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
      fontSize: 13,
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
      fontSize: 13,
      color: isDark ? "#FFFFFF" : brandPrimary,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    progressText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: isDark ? "#FFFFFF" : brandPrimary,
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
      fontSize: 13,
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
      fontSize: 13,
    },
    progressSubtext: {
      fontFamily: fonts.caption,
      fontSize: 11,
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
      fontSize: 13,
    },

    // Error Toast
    errorToastContainer: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      width: '90%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 100, // Pill shape
      padding: 12,
      paddingRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: colors.onSurface,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '40',
      zIndex: 100,
    },
    errorToastIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.error + '26', // 15% opacity
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorToastTextContent: {
      flex: 1,
    },
    errorToastTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.onSurface,
      marginBottom: 2,
    },
    errorToastDescription: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.onSurfaceVariant,
    },
    errorToastClose: {
      padding: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
    },
  });
