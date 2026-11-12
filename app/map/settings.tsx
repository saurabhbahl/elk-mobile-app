import AppText from "@/src/components/AppText";
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, LIGHT_FONTS } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useAppContentData, useAppContentSync } from '../../src/contexts/AppContentContext';
import { useOfflineMap } from '../../src/hooks/useOfflineMap';
import { normalizeHex } from '../../src/utils/colorUtils';
import { clearImageCache, getCacheSizeLabel } from '../../src/utils/imageCache';
import { SyncManager } from '@/src/services/SyncManager';
import { handleLinkPress } from '@/src/utils/linkUtils';
import { safeStorage as AsyncStorage } from '@/src/utils/asyncStorage';
import { appRepository } from '@/src/repositories/AppRepository';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const { hasMap, isDownloading, isPaused, downloadProgress, downloadMap, pauseDownload, cancelDownload, deleteMap, isInitializing, mbtilesError, setMbtilesError } = useOfflineMap();
  const { theme, setTheme, colors, fonts, isDark } = useTheme();
  const [isSyncingRoads, setIsSyncingRoads] = useState(false);
  const [imageCacheSize, setImageCacheSize] = useState<string>('...');
  const [isClearingImages, setIsClearingImages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { brandData } = useAppContentData();
  const { refreshData } = useAppContentSync();

  const brandPrimary = normalizeHex(brandData?.brand_color_primary);
  const brandSecondary = normalizeHex(brandData?.brand_color_secondary);
  const styles = useMemo(() => createStyles(colors, fonts, isDark, brandPrimary, brandSecondary), [colors, fonts, isDark, brandPrimary, brandSecondary]);

  // Load image cache size on mount
  useEffect(() => {
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

  const handleSyncRoads = async () => {
    setIsSyncingRoads(true);
    try {
      await SyncManager.syncRoadsNetwork();
      Alert.alert('Road Network Synced', 'The offline road network is up to date.');
    } catch {
      Alert.alert('Sync Failed', 'Could not sync road network. Please check your internet connection.');
    } finally {
      setIsSyncingRoads(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshData();
      if (success) {
        Alert.alert('Refresh Complete', 'Your app is perfectly in sync with the latest data.');
      } else {
        Alert.alert('Refresh Failed', 'Unable to reach the server. Please check your internet connection.');
      }
    } catch (e) {
      Alert.alert('Refresh Failed', 'Something went wrong while trying to sync.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleDeleteMap = () => {
    Alert.alert(
      'Delete Offline Map?',
      'This will remove the downloaded map tiles (~307 MB) from your device storage. You can download them again anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Map',
          style: 'destructive',
          onPress: async () => {
            await deleteMap();
            Alert.alert('Map Deleted', 'The offline map has been removed from storage.');
          },
        },
      ]
    );
  };

  const handleResetAllStorage = () => {
    Alert.alert(
      'Reset All App Storage?',
      'This will delete all offline map tiles (~307 MB), cached routes, downloaded photos, and local data to restore the app to its fresh-install state.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              // 1. Delete offline map
              await deleteMap();
              // 2. Clear image cache
              await clearImageCache();
              // 3. Clear AsyncStorage
              await AsyncStorage.clear();
              // 4. Clear SQLite database records
              appRepository.clearAll();

              Alert.alert(
                'Storage Reset Complete',
                'All app data and offline resources have been wiped from storage.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/' as any);
                    },
                  },
                ]
              );
            } catch (err) {
              console.error('[Settings] Reset failed:', err);
              Alert.alert('Reset Failed', 'Failed to fully reset storage. Please try again.');
            } finally {
              setIsResetting(false);
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
          fontFamily: "OpenSans-SemiBold",
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

        {/* ── Data Synchronization Section ────────────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Refresh Data</AppText>
          <AppText style={styles.sectionDescription}>
            {"Manually force a check for new content updates. Useful if you've been offline and want to make sure you have the latest information."}
          </AppText>

          <TouchableOpacity
            style={[styles.downloadButton, isRefreshing && { opacity: 0.7 }]}
            onPress={handleForceRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name="sync" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <AppText style={styles.downloadButtonText}>Force Refresh</AppText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Offline Map Section ────────────────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Offline Map</AppText>
          <AppText style={styles.sectionDescription}>
            {"Download the map so you can use it even when you don't have a mobile signal or internet connection. The download uses about 307 MB of storage on your device."}
          </AppText>

          {isInitializing ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : isDownloading ? (
            <View style={[styles.progressContainer, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={styles.progressText}>
                  Downloading... {downloadProgress < 0 ? '' : `${Math.round(downloadProgress * 100)}%`}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.pauseButton} onPress={pauseDownload}>
                  <AppText style={styles.pauseButtonText}>Pause</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelDownload}>
                  <AppText style={styles.cancelButtonText}>Cancel</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : isPaused ? (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <MaterialIcons name="pause-circle-outline" size={20} color={colors.onSurfaceVariant} />
                <AppText style={styles.statusText}>
                  Download paused... {downloadProgress > 0 ? `${Math.round(downloadProgress * 100)}%` : ''}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.downloadButton, { flex: 1 }]} onPress={downloadMap}>
                  <AppText style={styles.downloadButtonText}>Resume Download</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={deleteMap}>
                  <AppText style={styles.deleteButtonText}>Cancel</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : hasMap ? (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <MaterialIcons name="check-circle" size={20} color={isDark ? colors.primary : '#2e7d32'} />
                <AppText style={styles.statusText}>Map is downloaded and ready.</AppText>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteMap}>
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

        {/* ── Offline Road Navigation Section ─────────────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Offline Road Navigation</AppText>
          <AppText style={styles.sectionDescription}>
            Turn-by-turn routing is powered on-device using the Elk Country road network. You can navigate offline anytime without needing internet.
          </AppText>

          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <MaterialIcons name="navigation" size={20} color={colors.primary} />
              <AppText style={styles.statusText}>
                On-Device Offline Routing Active
              </AppText>
            </View>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleSyncRoads}
              disabled={isSyncingRoads}
            >
              {isSyncingRoads ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="sync" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                  <AppText style={styles.downloadButtonText}>Sync Road Network</AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>
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
                  'This will remove all downloaded images from your device. They will be downloaded again automatically when you use the app.',
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

        {/* ── Reset App Storage Section ────────────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Reset App Storage</AppText>
          <AppText style={styles.sectionDescription}>
            Clear all downloaded maps (~307 MB), cached routes, photos, and preferences to restore the app to its fresh-install state.
          </AppText>
          <TouchableOpacity
            style={[styles.deleteButton, isResetting && { opacity: 0.5 }]}
            disabled={isResetting}
            onPress={handleResetAllStorage}
          >
            {isResetting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="restart-alt" size={18} color={colors.error} style={{ marginRight: 6 }} />
                <AppText style={styles.deleteButtonText}>Reset All Storage</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Privacy Policy Section ─────────────────────────────────────────── */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <AppText style={styles.sectionTitle}>Privacy Policy</AppText>
          <AppText style={styles.sectionDescription}>
            Read our Privacy Policy to understand how we collect, use, and protect your location and other data.
          </AppText>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => {
              handleLinkPress('https://keystoneelkcountryalliance.com/privacy-policy/', router, 'Privacy Policy');
            }}
          >
            <MaterialIcons name="security" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
            <AppText style={styles.downloadButtonText}>View Privacy Policy</AppText>
          </TouchableOpacity>
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
      fontSize: 14,
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
      fontSize: 16,
      color: isDark ? "#FFFFFF" : brandPrimary,
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
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 14,
    },
    pauseButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    pauseButtonText: {
      color: colors.primary,
      fontFamily: fonts.bodyBold,
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 14,
      color: colors.onSurface,
      marginBottom: 2,
    },
    errorToastDescription: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    errorToastClose: {
      padding: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
    },
  });
