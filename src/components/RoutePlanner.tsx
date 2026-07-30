import AppText from "@/src/components/AppText";
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions, Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAppContent } from '../contexts/AppContentContext';
import { Waypoint } from '../data/waypoints';
import { normalizeHex } from '../utils/colorUtils';
const { height: windowHeight } = Dimensions.get('window');

export interface RoutePlannerProps {
  isVisible: boolean;
  startPoint: Waypoint | null;
  destinationPoint: Waypoint | null;
  stopPoints: Waypoint[];           // intermediate stops
  location: unknown;
  isCalculatingRoute: boolean;
  pickerType: 'start' | 'end' | 'stop';
  onClose: () => void;
  onSetStartPoint: (wp: Waypoint) => void;
  onSetDestinationPoint: (wp: Waypoint) => void;
  onAddStop: (wp: Waypoint) => void;
  onRemoveStop: (index: number) => void;
  onUpdateStop: (index: number, wp: Waypoint) => void;
  onSetPickerType: (type: 'start' | 'end' | 'stop') => void;
  onSelectOnMap: (type: 'start' | 'end' | 'stop', stopIndex?: number) => void;
  onStartNavigation: (start: Waypoint, dest: Waypoint, stops: Waypoint[]) => void;
}

// ── Waypoint selector bottom-sheet ──────────────────────────────────────────
function WaypointSelector({
  label,
  selected,
  waypoints,
  location,
  showCurrentLocation = false,
  onSelect,
}: {
  label: string;
  selected: Waypoint | null;
  waypoints: Waypoint[];
  location: unknown;
  showCurrentLocation?: boolean;
  onSelect: (wp: Waypoint) => void;
}) {
  const [open, setOpen] = useState(false);
  const { colors, fonts, isDark } = useTheme();
  const { brandData } = useAppContent();
  const brandPrimary = normalizeHex(brandData?.brand_color_primary);
  const textColor = isDark ? '#FFFFFF' : '#000000';

  const currentLocationWP: Waypoint | null =
    showCurrentLocation && location
      ? {
        id: 999, title: 'Current Location',
        coordinate: { latitude: location.latitude, longitude: location.longitude },
        description: 'Your current GPS position',
      }
      : null;

  return (
    <>
      <TouchableOpacity style={[selectorStyles.button, { backgroundColor: colors.surfaceContainerLow, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} onPress={() => setOpen(true)}>
        <AppText
          style={[selectorStyles.text, { fontFamily: fonts.body, fontSize: 13, color: selected ? textColor : colors.onSurfaceVariant }, !selected && selectorStyles.placeholder]}
          numberOfLines={1}
        >
          {selected ? selected.title : `Select ${label.toLowerCase()}...`}
        </AppText>
        <MaterialIcons name="arrow-drop-down" size={24} color={colors.onSurfaceVariant} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={selectorStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={[selectorStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[selectorStyles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
          <AppText style={[selectorStyles.title, { fontFamily: fonts.headingBold, fontSize: 15, color: textColor }]}>Select {label}</AppText>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {currentLocationWP && (
              <TouchableOpacity
                style={selectorStyles.item}
                onPress={() => { onSelect(currentLocationWP); setOpen(false); }}
              >
                <MaterialIcons name="my-location" size={20} color={textColor} />
                <AppText style={[selectorStyles.itemText, { fontFamily: fonts.body, fontSize: 13, color: colors.onSurface }]}>Current Location</AppText>
              </TouchableOpacity>
            )}
            {waypoints.map(wp => (
              <TouchableOpacity
                key={wp.id}
                style={[selectorStyles.item, selected?.id === wp.id && { backgroundColor: colors.primaryContainer, borderRadius: 10 }]}
                onPress={() => { onSelect(wp); setOpen(false); }}
              >
                <MaterialIcons name="place" size={20} color={textColor} />
                <AppText style={[selectorStyles.itemText, { fontFamily: fonts.body, fontSize: 13, color: colors.onSurface }, selected?.id === wp.id && { fontFamily: fonts.bodyBold, color: textColor }]} numberOfLines={1}>{wp.title}</AppText>
                {selected?.id === wp.id && (
                  <MaterialIcons name="check" size={18} color={textColor} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const selectorStyles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 48 },
  text: { flex: 1 },
  placeholder: {},
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  itemText: { flex: 1 },
});

// ── Main component ────────────────────────────────────────────────────────────
export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  isVisible,
  startPoint,
  destinationPoint,
  stopPoints,
  location,
  isCalculatingRoute,
  pickerType,
  onClose,
  onSetStartPoint,
  onSetDestinationPoint,
  onAddStop,
  onRemoveStop,
  onUpdateStop,
  onSetPickerType,
  onSelectOnMap,
  onStartNavigation,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, fonts, isDark } = useTheme();
  const { brandData, poisData } = useAppContent();
  const brandPrimary = normalizeHex(brandData?.brand_color_primary);
  const brandSecondary = normalizeHex(brandData?.brand_color__secondary);
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const waypoints = poisData || [];

  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const translateY = useSharedValue(isVisible ? 0 : windowHeight);
  const opacity = useSharedValue(isVisible ? 1 : 0);

  React.useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(0, { duration: 350 });
      opacity.value = withTiming(1, { duration: 350 });
    } else {
      translateY.value = withTiming(windowHeight, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible, translateY, opacity, windowHeight]);

  const canStart = !!startPoint && !!destinationPoint && !isCalculatingRoute;
  const connectorHeight = 48 + stopPoints.length * 64;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, animatedStyle, { backgroundColor: colors.surface, zIndex: 1000, paddingBottom: safeBottom }]}
    >
      {/* Header */}
      <View style={[plannerStyles.header, { paddingTop: insets.top + 10, height: 70 + insets.top, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(25,28,28,0.1)', backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={onClose} style={[plannerStyles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <MaterialIcons name="close" size={28} color={textColor} />
        </TouchableOpacity>
        <AppText style={[plannerStyles.headerTitle, { fontFamily: fonts.headingBold, fontSize: 18, color: textColor }]}>Route Planner</AppText>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Route config card ── */}
        <View style={[plannerStyles.configArea, { backgroundColor: isDark ? 'rgba(17,20,19,0.8)' : 'rgba(248,250,249,0.8)', borderColor: isDark ? 'rgba(196,200,192,0.15)' : 'rgba(111,90,79,0.1)' }]}>
          <View style={{ flexDirection: 'row' }}>
            {/* Visual connector line */}
            <View style={plannerStyles.connectorContainer}>
              <View style={[plannerStyles.connectorDotStart, { borderColor: brandPrimary, backgroundColor: isDark ? colors.surface : 'white' }]} />
              <View style={[plannerStyles.connectorLine, { height: connectorHeight, backgroundColor: colors.outline }]} />
              <View style={[plannerStyles.connectorDotEnd, { backgroundColor: brandPrimary }]} />
            </View>

            <View style={{ flex: 1, gap: 16 }}>
              {/* Start */}
              <View style={{ gap: 8 }}>
                <AppText style={[plannerStyles.inputLabel, { fontFamily: fonts.caption, color: colors.onSurfaceVariant }]}>Starting Point</AppText>
                <WaypointSelector
                  label="Starting Point"
                  selected={startPoint}
                  waypoints={waypoints}
                  location={location}
                  showCurrentLocation
                  onSelect={(wp) => { onSetStartPoint(wp); onSetPickerType('end'); }}
                />
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                  <TouchableOpacity onPress={() => onSelectOnMap('start')} style={[plannerStyles.shortcutButtonSecondary, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <MaterialIcons name="add-location-alt" size={12} color={textColor} />
                    <AppText style={[plannerStyles.shortcutTextPrimary, { fontFamily: fonts.caption, color: textColor }]}>Drop Pin</AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Intermediate stops — each gets a full WaypointSelector */}
              {stopPoints.map((stop, idx) => (
                <View key={`stop-${idx}`} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText style={[plannerStyles.inputLabel, { fontFamily: fonts.caption, color: colors.onSurfaceVariant }]}>Stop {idx + 1}</AppText>
                    <TouchableOpacity onPress={() => onRemoveStop(idx)} style={plannerStyles.removeStopBtn}>
                      <MaterialIcons name="close" size={14} color={colors.error} />
                      <AppText style={[plannerStyles.removeStopText, { fontFamily: fonts.caption, fontSize: 11, color: colors.error }]}>Remove</AppText>
                    </TouchableOpacity>
                  </View>
                  <WaypointSelector
                    label={`Stop ${idx + 1}`}
                    selected={stop}
                    waypoints={waypoints.filter(
                      wp => wp.id !== startPoint?.id && wp.id !== destinationPoint?.id
                    )}
                    location={location}
                    showCurrentLocation={false}
                    onSelect={(wp) => {
                      onUpdateStop(idx, wp);
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    <TouchableOpacity onPress={() => onSelectOnMap('stop', idx)} style={[plannerStyles.shortcutButtonSecondary, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <MaterialIcons name="add-location-alt" size={12} color={textColor} />
                      <AppText style={[plannerStyles.shortcutTextPrimary, { fontFamily: fonts.caption, color: textColor }]}>Drop Pin</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Add stop button */}
              <TouchableOpacity
                style={plannerStyles.addStopButton}
                onPress={() => {
                  onAddStop({
                    id: -Date.now(),
                    title: '',
                    coordinate: { latitude: 0, longitude: 0 },
                    description: '',
                  });
                }}
              >
                <MaterialIcons name="add-circle-outline" size={16} color={textColor} />
                <AppText style={[plannerStyles.addStopText, { fontFamily: fonts.bodyMedium, fontSize: 13, color: textColor }]}>Add Stop</AppText>
              </TouchableOpacity>

              {/* Destination */}
              <View style={{ gap: 8 }}>
                <AppText style={[plannerStyles.inputLabel, { fontFamily: fonts.caption, color: colors.onSurfaceVariant }]}>Destination</AppText>
                <WaypointSelector
                  label="Destination"
                  selected={destinationPoint}
                  waypoints={waypoints}
                  location={location}
                  showCurrentLocation={false}
                  onSelect={(wp) => onSetDestinationPoint(wp)}
                />
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                  <TouchableOpacity onPress={() => onSelectOnMap('end')} style={[plannerStyles.shortcutButtonSecondary, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <MaterialIcons name="add-location-alt" size={12} color={textColor} />
                    <AppText style={[plannerStyles.shortcutTextPrimary, { fontFamily: fonts.caption, color: textColor }]}>Drop Pin</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Swap button */}
            <TouchableOpacity
              style={{ justifyContent: 'flex-start', paddingLeft: 12, paddingTop: 28 }}
              onPress={() => {
                if (startPoint && destinationPoint) {
                  const tmp = startPoint;
                  onSetStartPoint(destinationPoint);
                  onSetDestinationPoint(tmp);
                }
              }}
            >
              <MaterialIcons name="swap-vert" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>


          {/* Start navigation */}
          <TouchableOpacity
            disabled={!canStart}
            onPress={() => {
              if (startPoint && destinationPoint) {
                onStartNavigation(startPoint, destinationPoint, stopPoints);
              }
            }}
            style={[
              plannerStyles.startNavButton,
              { backgroundColor: canStart ? brandPrimary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(25,28,28,0.1)' },
            ]}
          >
            {isCalculatingRoute ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons
                  name="navigation"
                  size={20}
                  color={canStart ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <AppText style={[plannerStyles.startNavText, { fontFamily: fonts.bodyBold, fontSize: 13, color: canStart ? colors.onPrimary : colors.onSurfaceVariant }]}>
                  Start Navigation
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Suggested waypoints */}
        <AppText style={[plannerStyles.suggestedTitle, { fontFamily: fonts.headingBold, fontSize: 15, color: textColor }]}>Suggested Stops</AppText>
        {waypoints.map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => {
              if (pickerType === 'start') { onSetStartPoint(item); onSetPickerType('end'); }
              else if (pickerType === 'stop') { onAddStop(item); onSetPickerType('end'); }
              else { onSetDestinationPoint(item); }
            }}
            style={[plannerStyles.suggestedItem, { backgroundColor: colors.surfaceContainerLowest, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          >
            <View style={[plannerStyles.suggestedIcon, { backgroundColor: colors.surfaceContainer }]}>
              <MaterialIcons name="place" size={24} color={textColor} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[plannerStyles.suggestedName, { fontFamily: fonts.bodyBold, fontSize: 13, color: textColor }]}>{item.title}</AppText>
              <AppText style={[plannerStyles.suggestedMeta, { fontFamily: fonts.caption, color: colors.onSurfaceVariant }]}>Scenic Spot</AppText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.outline} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const plannerStyles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  closeButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  configArea: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 32 },
  connectorContainer: { alignItems: 'center', paddingTop: 28, marginRight: 16 },
  connectorDotStart: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  connectorLine: { width: 2, marginVertical: 4 },
  connectorDotEnd: { width: 12, height: 12, borderRadius: 6 },
  inputLabel: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 },
  shortcutButtonSecondary: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  shortcutTextPrimary: {},
  removeStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  removeStopText: {},
  addStopButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  addStopText: {},
  startNavButton: { marginTop: 20, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  startNavText: {},
  suggestedTitle: { marginBottom: 16 },
  suggestedItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  suggestedIcon: { width: 48, height: 48, borderRadius: 12, marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  suggestedName: {},
  suggestedMeta: {},
});
