import AppText from "@/src/components/AppText";
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, LIGHT_FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export interface TurnInstruction {
  text: string;
  distance: string;
  icon: string;
}

interface NavigationOverlayProps {
  destinationTitle?: string;
  distanceRemaining?: string;
  timeRemaining?: string;
  arrivalTime?: string;
  nextInstruction?: TurnInstruction;
  onExit: () => void;
  onRecenter: () => void;
}

/** Maps instruction text to a MaterialIcons name */
function getTurnIcon(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('sharp right')) return 'turn-sharp-right';
  if (t.includes('slight right')) return 'turn-slight-right';
  if (t.includes('right')) return 'turn-right';
  if (t.includes('sharp left')) return 'turn-sharp-left';
  if (t.includes('slight left')) return 'turn-slight-left';
  if (t.includes('left')) return 'turn-left';
  if (t.includes('u-turn')) return 'u-turn-right';
  return 'straight';
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  destinationTitle,
  distanceRemaining = '0.0 mi',
  timeRemaining = '0 min',
  arrivalTime = '--:--',
  nextInstruction = { text: 'Continue Straight', distance: '0 FT', icon: 'straight' },
  onExit,
  onRecenter,
}) => {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const { colors, fonts, isDark } = useTheme();
  const expandedPanelHeight = (destinationTitle ? 236 : 192) + safeBottom + 20;
  const collapsedPanelHeight = 104 + safeBottom + 20;
  const panelHeight = React.useRef(new Animated.Value(expandedPanelHeight)).current;
  const panelHeightRef = React.useRef(expandedPanelHeight);
  const [isPanelCollapsed, setIsPanelCollapsed] = React.useState(false);

  const styles = createStyles(colors, fonts, isDark);

  // Top of instruction card sits just below the NavigationHeader (~80 + insets.top)
  const headerHeight = 80 + insets.top;

  let formattedTimePart = '0';
  let formattedTimeUnit = 'min';

  const timeMatch = (timeRemaining || '0 min').match(/^(\d+)\s*min$/i);
  if (timeMatch) {
    const totalMinutes = parseInt(timeMatch[1], 10);
    if (totalMinutes < 60) {
      formattedTimePart = totalMinutes.toString();
      formattedTimeUnit = 'min';
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours < 24) {
        if (minutes > 0) {
          formattedTimePart = `${hours}h`;
          formattedTimeUnit = `${minutes}m`;
        } else {
          formattedTimePart = hours.toString();
          formattedTimeUnit = 'hr';
        }
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
          formattedTimePart = `${days}d`;
          formattedTimeUnit = `${remainingHours}hr`;
        } else {
          formattedTimePart = days.toString();
          formattedTimeUnit = 'd';
        }
      }
    }
  } else {
    const parts = (timeRemaining || '0 min').split(' ');
    formattedTimePart = parts[0] || '0';
    formattedTimeUnit = parts[1] || 'min';
  }

  const [distPart, distUnit] = (distanceRemaining || '0.0 mi').split(' ');

  const iconName = getTurnIcon(nextInstruction.text) as never;

  React.useEffect(() => {
    if (!isPanelCollapsed) {
      panelHeightRef.current = expandedPanelHeight;
      panelHeight.setValue(expandedPanelHeight);
    }
  }, [destinationTitle, expandedPanelHeight, isPanelCollapsed, panelHeight]);

  const animatePanel = React.useCallback((toValue: number, collapsed: boolean) => {
    setIsPanelCollapsed(collapsed);
    panelHeightRef.current = toValue;
    Animated.timing(panelHeight, {
      toValue,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [panelHeight]);

  const panelPanResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 8,
    onPanResponderMove: (_, gestureState) => {
      const nextHeight = Math.max(
        collapsedPanelHeight,
        Math.min(expandedPanelHeight, panelHeightRef.current - gestureState.dy)
      );
      panelHeight.setValue(nextHeight);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 28 || gestureState.vy > 0.45) {
        animatePanel(collapsedPanelHeight, true);
      } else if (gestureState.dy < -28 || gestureState.vy < -0.45) {
        animatePanel(expandedPanelHeight, false);
      } else {
        animatePanel(isPanelCollapsed ? collapsedPanelHeight : expandedPanelHeight, isPanelCollapsed);
      }
    },
  }), [animatePanel, collapsedPanelHeight, expandedPanelHeight, isPanelCollapsed, panelHeight]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

      {/* ── Turn instruction card ─────────────────────────────────────── */}
      <View
        style={[styles.instructionContainer, { top: headerHeight + 12 }]}
        pointerEvents="none"
      >
        <View style={styles.instructionCard}>
          <View style={styles.turnIconBox}>
            <MaterialIcons name={iconName} size={34} color={isDark ? colors.onPrimary : 'white'} />
          </View>
          <View style={styles.instructionTextBox}>
            <AppText style={styles.instructionDistance}>
              {nextInstruction.distance}
            </AppText>
            <AppText style={styles.instructionText} numberOfLines={2}>
              {nextInstruction.text}
            </AppText>
          </View>
        </View>
      </View>

      {/* ── Floating action buttons ───────────────────────────────────── */}
      <View
        style={[
          styles.floatingControls,
          { bottom: safeBottom + (isPanelCollapsed ? 188 : 320) },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity onPress={onRecenter} style={styles.fabPrimary}>
          <MaterialIcons name="navigation" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Stats + exit panel ────────────────────────────────────────── */}
      <View
        style={[
          styles.statsPanelContainer,
          { bottom: 0 },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.statsPanel, { height: panelHeight, paddingBottom: safeBottom + 34 }]}
          {...panelPanResponder.panHandlers}
        >
          <View style={styles.panelHandleHitArea}>
            <View style={styles.panelHandle} />
          </View>

          {/* Destination label */}
          {destinationTitle && !isPanelCollapsed ? (
            <View style={styles.destinationRow}>
              <MaterialIcons
                name="place"
                size={16}
                color={colors.onSurfaceVariant}
              />
              <AppText style={styles.destinationText} numberOfLines={1}>
                {destinationTitle}
              </AppText>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AppText style={styles.statLabel}>TIME</AppText>
              <AppText style={styles.statValue}>
                {formattedTimePart || '0'}
                <AppText style={styles.statValue}> {formattedTimeUnit || 'min'}</AppText>
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statLabel}>DISTANCE</AppText>
              <AppText style={styles.statValue}>
                {distPart || '0.0'}
                <AppText style={styles.statUnit}> {distUnit || 'mi'}</AppText>
              </AppText>
            </View>
          </View>

          {/* Exit button */}
          <TouchableOpacity onPress={onExit} style={styles.exitButton}>
            <MaterialIcons name="close" size={18} color={colors.onError} />
            <AppText style={styles.exitButtonText}>End Navigation</AppText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) =>
  StyleSheet.create({
    // ── Instruction card ──────────────────────────────────────────────────────
    instructionContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 90,
    },
    instructionCard: {
      backgroundColor: colors.surface + 'f7', // 97% opacity
      borderRadius: 20,
      padding: 16,
      borderLeftWidth: 5,
      borderLeftColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.12,
      shadowRadius: 16,
      elevation: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    turnIconBox: {
      backgroundColor: colors.primary,
      width: 60,
      height: 60,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    instructionTextBox: {
      flex: 1,
    },
    instructionDistance: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    instructionText: {
      fontFamily: 'Roboto-Bold',
      fontSize: 22,
      color: colors.primary,
      lineHeight: 26,
    },

    // ── FABs ──────────────────────────────────────────────────────────────────
    floatingControls: {
      position: 'absolute',
      right: 16,
      gap: 12,
    },
    fabPrimary: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.35 : 0.2,
      shadowRadius: 8,
      elevation: 6,
    },

    // ── Stats panel ───────────────────────────────────────────────────────────
    statsPanelContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 80,
    },
    statsPanel: {
      backgroundColor: colors.surface + 'f7', // 97% opacity
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 20,
      elevation: 10,
      overflow: 'hidden',
    },
    panelHandleHitArea: {
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    panelHandle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
    },
    destinationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.06)',
    },
    destinationText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.onSurfaceVariant,
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statLabel: {
      fontFamily: fonts.caption,
      fontSize: 10,
      color: colors.onSurfaceVariant,
      letterSpacing: 1,
      marginBottom: 2,
    },
    statValue: {
      fontFamily: fonts.headingBold,
      fontSize: 20,
      color: colors.primary,
    },
    statUnit: {
      fontSize: 12,
      fontFamily: fonts.body,
      color: colors.onSurfaceVariant,
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0,0,0,0.08)',
    },
    exitButton: {
      backgroundColor: colors.error,
      height: 44,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    exitButtonText: {
      color: colors.onError,
      fontFamily: fonts.bodyBold,
      fontSize: 14,
    },
  });
