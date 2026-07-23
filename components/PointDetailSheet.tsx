import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, ScrollView, Dimensions, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LIGHT_COLORS, LIGHT_FONTS } from '../constants/theme';
import { Waypoint } from '../data/waypoints';
import { calcDistance } from '../utils/mapUtils';

interface PointDetailSheetProps {
  selectedWaypoint: Waypoint | null;
  detailAnimatedStyle: any;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onNavigate: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export const PointDetailSheet = ({
  selectedWaypoint,
  detailAnimatedStyle,
  userLocation,
  onClose,
  onNavigate
}: PointDetailSheetProps) => {
  const { colors, fonts, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const tabHeight = safeBottom - 60;
  const styles = createStyles(colors, fonts, isDark, tabHeight);

  // Network offline state checking
  const [isOffline, setIsOffline] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const checkNetwork = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (isMounted) {
          setIsOffline(false);
        }
      } catch (e) {
        if (isMounted) {
          setIsOffline(true);
        }
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Distance and travel time calculation from user location
  const { distanceStr, timeStr } = useMemo(() => {
    if (isOffline || !userLocation || !selectedWaypoint) {
      return { distanceStr: '--', timeStr: '--' };
    }
    const distMeters = calcDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      selectedWaypoint.coordinate
    );
    const distMiles = distMeters / 1609.34;
    const estMinutes = Math.round(distMiles * 2); // Assumes ~30mph rural scenic route speeds

    return {
      distanceStr: `${distMiles.toFixed(1)} mi`,
      timeStr: `${estMinutes} min`
    };
  }, [userLocation, selectedWaypoint, isOffline]);

  // Fallback to high probability default based on hotspot index
  const probabilityNum = useMemo(() => {
    if (!selectedWaypoint) return 85;
    return 70 + (selectedWaypoint.id * 3) % 25; // elegant realistic mock data
  }, [selectedWaypoint]);

  if (!selectedWaypoint) return null;

  return (
    <Animated.View style={[styles.detailSheet, detailAnimatedStyle]}>
      {/* Scrollable sheet body to ensure visual responsiveness */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Header */}
        <View style={styles.detailHeader}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBToqg7Q62W9DVQn2e8X7oOjSDfFJAdZ1NxiBwLQnKJVrAuyRfcafhAljJzXqGqLGvQDgHLSxpiOSG8J6YdpCQKquPipZlH6D40Rd8lE-JpUlfGMsmV_VP7qEtDw-zRokbRZF6jzOpWE-o0_-5VVElSsYVV8fmZS1bI5MwS0hw02XhIfsny4XD3xFGt7NSTNdKdyQfubrZ3vZv4Nzj7Nyz6cb47HgrKV6_sqDlgLRsJpTKpDT2sFcO-I2bDuQHxOw7_PA_4kQwTHlk' }}
            style={styles.detailHeroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(17, 20, 19, 0.95)' : 'rgba(6, 27, 14, 0.95)']}
            style={styles.detailGradient}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={isDark ? '#e1e3e0' : '#ffffff'} />
          </TouchableOpacity>

          <View style={styles.detailTitleContainer}>
            <View style={styles.tagRow}>
              <View style={styles.popularTag}>
                <MaterialIcons name="stars" size={14} color={colors.onTertiaryContainer} />
                <Text style={styles.tagText}>Popular</Text>
              </View>
              <View style={styles.offlineTag}>
                <MaterialIcons name="cloud-done" size={14} color="white" />
                <Text style={styles.offlineTagText}>Offline Ready</Text>
              </View>
            </View>
            <Text style={styles.detailTitle}>{selectedWaypoint.title}</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.detailContent}>
          <Text style={styles.detailDescription}>
            {selectedWaypoint.description || 'A premier destination for elk viewing, offering expansive panoramic views of the rolling Appalachian landscape.'}
          </Text>

          {/* Bento Block: Viewing Info */}
          <View style={styles.bentoContainer}>
            {/* Best Times card */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardHeader}>
                <View style={[styles.bentoIconBadge, { backgroundColor: colors.secondaryContainer }]}>
                  <MaterialIcons name="schedule" size={18} color={colors.onSecondaryContainer} />
                </View>
                <Text style={styles.bentoCardTitle}>Best Times</Text>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Early Morning</Text>
                <Text style={styles.timeValue}>5:30 AM - 8:00 AM</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Late Evening</Text>
                <Text style={styles.timeValue}>6:00 PM - Dusk</Text>
              </View>
            </View>

            {/* Probability card */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardHeader}>
                <View style={[styles.bentoIconBadge, { backgroundColor: colors.primaryContainer }]}>
                  <MaterialIcons name="visibility" size={18} color={colors.onPrimaryContainer} />
                </View>
                <Text style={styles.bentoCardTitle}>Probability</Text>
              </View>
              <View style={styles.probContent}>
                <View style={styles.probStatRow}>
                  <Text style={styles.probPercent}>{probabilityNum}%</Text>
                  <Text style={styles.probStatusLabel}>High Chance</Text>
                </View>
                {/* Progress bar track */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${probabilityNum}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            </View>
          </View>

          {/* Amenities Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Amenities</Text>
            <View style={styles.chipsRow}>
              <View style={styles.amenityChip}>
                <MaterialIcons name="local-parking" size={18} color={colors.onSurfaceVariant} />
                <Text style={styles.amenityChipText}>Parking</Text>
              </View>
              <View style={styles.amenityChip}>
                <MaterialIcons name="accessible-forward" size={18} color={colors.onSurfaceVariant} />
                <Text style={styles.amenityChipText}>ADA Access</Text>
              </View>
              <View style={styles.amenityChip}>
                <MaterialIcons name="wc" size={18} color={colors.onSurfaceVariant} />
                <Text style={styles.amenityChipText}>Restrooms</Text>
              </View>
            </View>
          </View>

          {/* Pro Photography Tips Section */}
          <View style={styles.proTipsCard}>
            <View style={styles.proTipsHeader}>
              <MaterialIcons name="photo-camera" size={24} color={colors.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.proTipsTitle}>Pro Photography Tips</Text>
            </View>
            <Text style={styles.proTipsText}>
              Use a telephoto lens (300mm+) to safely capture the elk without disturbing them. Overcast days provide the most even lighting, avoiding harsh shadows on the landscape.
            </Text>

            {/* Caution warning block */}
            <View style={styles.cautionContainer}>
              <MaterialIcons name="warning" size={18} color={colors.tertiary} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.cautionText}>
                Maintain a minimum distance of 25 yards at all times. Do not approach during the fall rutting season.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Map Preview Action Footer */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerStatsRow}>
          <View>
            <Text style={styles.footerStatLabel}>Distance</Text>
            <Text style={styles.footerStatValue}>{distanceStr}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerStatLabel}>Est. Time</Text>
            <Text style={styles.footerStatValue}>{timeStr}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => {
            onNavigate();
            onClose();
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="navigation" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.navigateButtonText}>Navigate Here</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, tabHeight: number) =>
  StyleSheet.create({
    detailSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: screenHeight * 0.85,
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDark ? 0.35 : 0.12,
      shadowRadius: 16,
      elevation: 24,
      zIndex: 200,
      overflow: 'hidden',
    },
    scrollContent: {
      paddingBottom: 180 + tabHeight, // ensures user can scroll content fully past the sticky footer and tab bar
    },
    detailHeader: {
      width: '100%',
      height: 250,
      position: 'relative',
    },
    detailHeroImage: {
      width: '100%',
      height: 250,
    },
    detailGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 150,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(6, 27, 14, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    detailTitleContainer: {
      position: 'absolute',
      bottom: 16,
      left: 24,
      right: 24,
    },
    tagRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    popularTag: {
      backgroundColor: colors.tertiaryContainer,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tagText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.onTertiaryContainer,
    },
    offlineTag: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(248, 250, 249, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(248, 250, 249, 0.3)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    offlineTagText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: '#ffffff',
    },
    detailTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 32,
      color: '#ffffff',
    },
    detailContent: {
      padding: 24,
    },
    detailDescription: {
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 24,
      color: colors.onSurfaceVariant,
      marginBottom: 24,
    },
    bentoContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    bentoCard: {
      flex: 1,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '40',
      borderRadius: 16,
      padding: 16,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    bentoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    bentoIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bentoCardTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 16,
      color: colors.primary,
    },
    timeRow: {
      paddingVertical: 2,
      gap: 1,
    },
    timeLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    timeValue: {
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      color: colors.primary,
      flexShrink: 1,
    },
    divider: {
      height: 1,
      backgroundColor: colors.outlineVariant + '33',
      marginVertical: 8,
    },
    probContent: {
      justifyContent: 'center',
      marginTop: 4,
    },
    probStatRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
      flexWrap: 'wrap',
    },
    probPercent: {
      fontFamily: fonts.headingBold,
      fontSize: 32,
      color: colors.primary,
      lineHeight: 34,
    },
    probStatusLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.onSurfaceVariant,
      flexShrink: 1,
    },
    progressBarTrack: {
      height: 8,
      width: '100%',
      backgroundColor: colors.outlineVariant + '33',
      borderRadius: 4,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionHeading: {
      fontFamily: fonts.headingBold,
      fontSize: 22,
      color: colors.primary,
      marginBottom: 12,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    amenityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    amenityChipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.onSurface,
    },
    proTipsCard: {
      backgroundColor: colors.secondaryContainer + '1a',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.secondary + '26',
      padding: 16,
      marginBottom: 16,
    },
    proTipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    proTipsTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 18,
      color: colors.primary,
    },
    proTipsText: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.onSurfaceVariant,
      marginBottom: 12,
    },
    cautionContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainerLowest + 'cc',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      borderRadius: 8,
      padding: 10,
      alignItems: 'flex-start',
    },
    cautionText: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: colors.onSurface,
      flex: 1,
      lineHeight: 16,
    },
    stickyFooter: {
      position: 'absolute',
      bottom: tabHeight, // dynamically sits exactly above the bottom tab bar on all device heights
      left: 0,
      right: 0,
      backgroundColor: colors.surface + 'e6', // beautiful translucent backdrop blur
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '33',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 16, // tight paddings for cleaner bento aesthetics
    },
    footerStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    footerStatLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.onSurfaceVariant,
      marginBottom: 2,
    },
    footerStatValue: {
      fontFamily: fonts.headingBold,
      fontSize: 24,
      color: colors.primary,
    },
    navigateButton: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    navigateButtonText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
