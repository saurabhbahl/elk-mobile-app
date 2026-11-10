import { width } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAppContent } from '@/src/contexts/AppContentContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from './AppText';

const getValidColor = (color: string | undefined) => {
  if (!color) return undefined;
  return color.startsWith('#') ? color : `#${color}`;
};

interface SameLocationPopupProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function SameLocationPopup({
  visible,
  onClose,
  title = 'Same Location',
  message = 'Start and destination cannot be the same. Please choose a different location.',
}: SameLocationPopupProps) {
  const { colors, isDark } = useTheme();
  const { brandData } = useAppContent();

  const primaryColor = getValidColor(brandData?.brand_color_primary) || '#8B1E1E';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        )}
        <View
          style={[
            styles.popupContainer,
            {
              backgroundColor: isDark ? '#1F2421' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              shadowColor: isDark ? '#000000' : '#2E3B2F',
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(139,30,30,0.08)' },
            ]}
          >
            <MaterialCommunityIcons
              name="map-marker-alert-outline"
              size={32}
              color={isDark ? '#FFFFFF' : primaryColor}
            />
          </View>
          <AppText style={[styles.title, { color: colors.onSurface }]}>{title}</AppText>
          <AppText style={[styles.message, { color: colors.onSurfaceVariant }]}>{message}</AppText>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: isDark ? '#FFFFFF' : primaryColor }]}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <AppText style={[styles.primaryButtonText, { color: isDark ? '#000000' : '#ffffff' }]}>
                Got It
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  popupContainer: {
    width: '100%',
    maxWidth: width * 0.88,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 26,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

