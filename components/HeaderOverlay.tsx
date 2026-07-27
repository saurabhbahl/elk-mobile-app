import AppText from "@/components/AppText";
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LIGHT_COLORS, LIGHT_FONTS } from '../constants/theme';

export const HeaderOverlay = () => {
  const { colors, fonts, isDark } = useTheme();

  const styles = createStyles(colors, fonts, isDark);

  return (
    <View style={styles.headerOverlay}>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="menu" size={24} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
      <AppText style={styles.headerTitle}>WildNav</AppText>
      <TouchableOpacity style={styles.headerButton}>
        <MaterialCommunityIcons name="check-decagram" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) =>
  StyleSheet.create({
    headerOverlay: {
      position: 'absolute',
      top: 44,
      left: 16,
      right: 16,
      height: 56,
      backgroundColor: colors.surface + 'e6', // 90% opacity
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      borderRadius: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 28, 28, 0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 100,
    },
    headerButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 24,
      color: colors.primary,
    },
  });
