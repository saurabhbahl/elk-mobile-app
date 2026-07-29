import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import AppText from './AppText';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContent } from '@/contexts/AppContentContext';

export default function OfflinePopup({ forceShowForTesting = false }: { forceShowForTesting?: boolean }) {
    const netInfo = useNetInfo();
    const { colors, isDark } = useTheme();
    const { brandData } = useAppContent();
    const primaryColor = brandData?.brand_color_primary || "#007AFF";

    const isOffline = forceShowForTesting || netInfo.isConnected === false || (netInfo.isConnected === true && netInfo.isInternetReachable === false);
    const [visible, setVisible] = useState(false);


    useEffect(() => {
        if (isOffline) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [isOffline]);

    const Content = (
        <View style={[styles.popupContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="wifi-off" size={48} color={primaryColor} />
            </View>
            <AppText style={[styles.title, { color: colors.onSurface }]}>You're Offline</AppText>
            <AppText style={[styles.message, { color: colors.onSurfaceVariant || '#666' }]}>
                No internet connection was detected. You're viewing the latest content saved on your device. Any new updates will be downloaded automatically once you're back online.
            </AppText>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                    onPress={() => setVisible(false)}
                >
                    <AppText style={styles.primaryButtonText}>Continue</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: primaryColor }]}
                    onPress={async () => {
                        // Optimistically hide the popup
                        setVisible(false);
                        
                        // Fetch the latest fresh state directly
                        const state = await NetInfo.fetch();
                        const currentlyOffline = forceShowForTesting || state.isConnected === false || (state.isConnected === true && state.isInternetReachable === false);
                        
                        // If still offline, show it again after a brief moment
                        if (currentlyOffline) {
                            setTimeout(() => {
                                setVisible(true);
                            }, 300);
                        }
                    }}
                >
                    <AppText style={[styles.secondaryButtonText, { color: primaryColor }]}>Retry</AppText>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                )}
                {Content}
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
        padding: 20,
    },
    popupContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Inter-Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
});
