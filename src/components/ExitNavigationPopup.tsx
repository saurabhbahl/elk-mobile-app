import { width } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAppContent } from '@/src/contexts/AppContentContext';
import { normalizeHex } from '@/src/utils/colorUtils';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from './AppText';

const getValidColor = (color: string | undefined | null) => {
  if (!color) return undefined;
  return color.startsWith('#') ? color : `#${color}`;
};

interface ExitNavigationPopupProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function ExitNavigationPopup({
  visible,
  onCancel,
  onConfirm,
  title = 'Exit Navigation?',
  message = 'Are you sure you want to stop navigation?',
}: ExitNavigationPopupProps) {
  const { colors, fonts, isDark } = useTheme();
  const { brandData } = useAppContent();

  const primaryColor =
    normalizeHex(brandData?.brand_color_primary) ||
    getValidColor(brandData?.brand_color_primary) ||
    colors.primary ||
    '#1F2421';

  const secondaryColor =
    normalizeHex(brandData?.brand_color_secondary) ||
    getValidColor(brandData?.brand_color_secondary) ||
    colors.secondary ||
    '#EA0B0B';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
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

          <AppText
            style={[
              styles.title,
              {
                color: isDark ? '#FFFFFF' : (colors.onSurface || '#1F2421'),
                fontFamily: fonts.headingBold,
              },
            ]}
          >
            {title}
          </AppText>
          <AppText
            style={[
              styles.message,
              {
                color: isDark ? '#D1D5DB' : (colors.onSurfaceVariant || '#4B5563'),
                fontFamily: fonts.body,
              },
            ]}
          >
            {message}
          </AppText>

          <View style={styles.buttonRow}>
            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : `${primaryColor}35`,
                },
              ]}
              activeOpacity={0.7}
              onPress={onCancel}
            >
              <AppText
                style={[
                  styles.cancelButtonText,
                  {
                    color: isDark ? '#FFFFFF' : primaryColor,
                    fontFamily: fonts.bodyBold,
                  },
                ]}
              >
                Cancel
              </AppText>
            </TouchableOpacity>

            {/* Exit Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: secondaryColor },
              ]}
              activeOpacity={0.8}
              onPress={onConfirm}
            >
              <AppText
                style={[
                  styles.confirmButtonText,
                  {
                    color: '#FFFFFF',
                    fontFamily: fonts.bodyBold,
                  },
                ]}
              >
                Exit
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
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButtonText: {
    fontSize: 15,
  },
});
