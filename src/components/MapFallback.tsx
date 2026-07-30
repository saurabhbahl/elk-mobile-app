import AppText from "@/src/components/AppText";
import React from 'react';
import { StyleSheet, View, TouchableOpacity, Linking } from "react-native";
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Coordinate } from '../data/waypoints';
import { useAppContent } from '../contexts/AppContentContext';
import { HeaderOverlay } from './HeaderOverlay';

interface MapFallbackProps {
  userLocation?: { latitude: number; longitude: number };
  currentRegion: unknown;
  mainRouteCoordinates: Coordinate[];
  orangeRouteCoordinates: Coordinate[];
  onPointSelect: (point: unknown) => void;
}

export const MapFallback = ({
  userLocation,
  currentRegion,
  mainRouteCoordinates,
  orangeRouteCoordinates,
  onPointSelect,
}: MapFallbackProps) => {
  const { poisData } = useAppContent();
  const waypoints = poisData || [];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: currentRegion.latitude,
          longitude: currentRegion.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={true}
      >
        <Polyline
          coordinates={mainRouteCoordinates}
          strokeColor={COLORS.tertiaryContainer}
          strokeWidth={5}
        />
        <Polyline
          coordinates={orangeRouteCoordinates}
          strokeColor="#FF8C00"
          strokeWidth={5}
        />
        {waypoints.map((point) => (
          <Marker
            key={`waypoint-${point.id}`}
            coordinate={point.coordinate}
            onPress={() => onPointSelect(point)}
          >
            <View style={styles.waypointCircle}>
              <AppText style={styles.waypointText}>{point.id}</AppText>
            </View>
          </Marker>
        ))}
      </MapView>

      <HeaderOverlay />

      <View style={styles.fallbackWarning}>
        <AppText style={styles.fallbackWarningText}>Offline maps unavailable in this build. Using online fallback.</AppText>
        <TouchableOpacity onPress={() => Linking.openURL('https://expo.dev/client')} style={{ marginLeft: 6 }}>
          <MaterialIcons name="help-outline" size={18} color="#ffdd57" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fallbackWarning: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 20,
  },
  fallbackWarningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  waypointCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  waypointText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
