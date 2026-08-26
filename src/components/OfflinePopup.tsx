import { width } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAppContent } from '@/src/contexts/AppContentContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from './AppText';

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};

export default function OfflinePopup({ forceShowForTesting = false }: { forceShowForTesting?: boolean }) {
    const netInfo = useNetInfo();
    const { colors, isDark } = useTheme();
    const { brandData } = useAppContent();

    const primaryColor = getValidColor(brandData?.brand_color_primary) || "#8B1E1E";
    const secondaryColor = getValidColor(brandData?.brand_color_secondary) || "#FFFFFF";

    // Only show offline when explicitly disconnected (isConnected === false).
    // isInternetReachable is unreliable on Android release builds (often null) so we
    // do NOT use it to trigger offline mode — avoids false "offline" on strong WiFi.
    const isOffline = forceShowForTesting || (Platform.OS === 'web' ? false : netInfo.isConnected === false);
    const [visible, setVisible] = useState(false);
    const [hasDismissed, setHasDismissed] = useState(false);

    useEffect(() => {
        if (isOffline && !hasDismissed) {
            setVisible(true);
        } else if (!isOffline) {
            setVisible(false);
            setHasDismissed(false); // Reset dismissal on reconnect
        }
    }, [isOffline, hasDismissed]);

    const Content = (
        <View style={[
            styles.popupContainer,
            {
                backgroundColor: isDark ? '#1F2421' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                shadowColor: isDark ? '#000000' : '#2E3B2F',
            }
        ]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(139,30,30,0.08)' }]}>
                <MaterialCommunityIcons name="wifi-off" size={32} color={isDark ? '#FFFFFF' : primaryColor} />
            </View>
            <AppText style={[styles.title, { color: colors.onSurface }]}>{"You're Offline"}</AppText>
            <AppText style={[styles.message, { color: colors.onSurfaceVariant }]}>
                {"No internet connection was detected. You're viewing the latest content saved on your device. Any new updates will be downloaded automatically once you're back online."}
            </AppText>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: isDark ? '#FFFFFF' : primaryColor }]}
                    activeOpacity={0.8}
                    onPress={() => {
                        setVisible(false);
                        setHasDismissed(true);
                    }}
                >
                    <AppText style={[styles.primaryButtonText, { color: isDark ? '#000000' : '#ffffff' }]}>Continue</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: isDark ? '#FFFFFF' : primaryColor }]}
                    activeOpacity={0.8}
                    onPress={async () => {
                        // Optimistically hide the popup
                        setVisible(false);

                        // Fetch the latest fresh state directly
                        const state = await NetInfo.fetch();
                        const currentlyOffline = forceShowForTesting || state.isConnected === false;

                        // If still offline, show it again after a brief moment
                        if (currentlyOffline) {
                            setTimeout(() => {
                                setVisible(true);
                            }, 300);
                        }
                    }}
                >
                    <AppText style={[styles.secondaryButtonText, { color: isDark ? '#FFFFFF' : primaryColor }]}>Retry</AppText>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
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
        padding: 24,
    },
    popupContainer: {
        width: '100%',
        maxWidth: width * 0.88,
        borderRadius: 24, // Premium highly-rounded corners
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
        textTransform: 'capitalize',
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 26,
        textTransform: 'none',
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        width: '100%',
        height: 48,
        borderRadius: 24, // Pill-shaped buttons
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
    secondaryButton: {
        width: '100%',
        height: 48,
        borderRadius: 24, // Pill-shaped buttons
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
