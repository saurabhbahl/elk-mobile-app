import AppText from "@/src/components/AppText";
/**
 * NavigationHeader
 *
 * Premium top bar shown ONLY during active navigation.
 * Replaces the search bar and shows:
 *   - From / To labels with truncated titles
 *   - A subtle animated "navigating" pulse indicator
 *   - Back button to exit navigation
 *
 * Sits at the very top of the screen (respects safe-area insets).
 */

import React, { useEffect, useRef } from 'react';
import { Animated,
  StyleSheet,
  TouchableOpacity,
  View } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, LIGHT_FONTS } from '../constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAppContent } from '@/src/contexts/AppContentContext';
import { normalizeHex } from '../utils/colorUtils';

interface NavigationHeaderProps {
  fromTitle: string;
  toTitle: string;
  onExit: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  fromTitle,
  toTitle,
  onExit,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, fonts, isDark } = useTheme();
  const { brandData } = useAppContent();
  const brandPrimary = normalizeHex(brandData?.brand_color_primary) || colors.primary;

  const styles = React.useMemo(() => createStyles(colors, fonts, isDark, brandPrimary), [colors, fonts, isDark, brandPrimary]);

  // Pulse animation for the green "live" dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, height: 80 + insets.top },
      ]}
    >
      {/* Back / Exit button */}
      <TouchableOpacity onPress={onExit} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="arrow-back" size={22} color={brandPrimary} />
      </TouchableOpacity>

      {/* Route summary */}
      <View style={styles.routeInfo}>
        {/* From row */}
        <View style={styles.routeRow}>
          <View style={styles.dotFrom} />
          <AppText style={styles.routeLabel} numberOfLines={1}>
            {fromTitle || ""}
          </AppText>
        </View>

        {/* Connector */}
        <View style={styles.connectorLine} />

        {/* To row */}
        <View style={styles.routeRow}>
          <View style={styles.dotTo} />
          <AppText style={[styles.routeLabel, styles.routeLabelBold]} numberOfLines={1}>
            {toTitle || ""}
          </AppText>
        </View>
      </View>

      {/* Live indicator */}
      <View style={styles.liveContainer}>
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <AppText style={styles.liveText}>LIVE</AppText>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, brandPrimary: string) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: isDark ? 'rgba(30, 30, 30, 0.97)' : 'rgba(248, 250, 249, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotFrom: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: brandPrimary,
    backgroundColor: isDark ? colors.surface : 'white',
  },
  dotTo: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brandPrimary,
  },
  connectorLine: {
    width: 2,
    height: 8,
    backgroundColor: colors.outline,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  routeLabelBold: {
    fontFamily: fonts.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(6, 27, 14, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2e7d32',
  },
  liveText: {
    fontFamily: fonts.caption,
    fontSize: 10,
    color: '#2e7d32',
    letterSpacing: 1.2,
  },
});
