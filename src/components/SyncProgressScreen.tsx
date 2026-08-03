import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AppText from './AppText';
import { useAppContentData, useAppContentSync } from '@/src/contexts/AppContentContext';
import { StatusBar } from 'expo-status-bar';
import { Image, ImageBackground } from 'expo-image';
import { useTheme } from '@/src/context/ThemeContext';
import { width, height } from '@/src/constants/theme';
import Animated, { FadeIn } from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};

export default function SyncProgressScreen() {
    const { brandData } = useAppContentData();
    const { 
        isSyncing, 
        syncProgress, 
        syncStatusText, 
        syncError, 
        performInitialSync 
    } = useAppContentSync();
    const { colors, isDark } = useTheme();

    useEffect(() => {
        // Automatically start sync on mount
        performInitialSync();
    }, []);

    const progressPercent = Math.round(syncProgress * 100);
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const bgImageUri = brandData?.splash_loading_screen_background 
        ? (typeof brandData.splash_loading_screen_background === 'string'
            ? brandData.splash_loading_screen_background
            : brandData.splash_loading_screen_background.url)
        : null;

    const Content = (
        <View style={styles.overlay}>
            <View style={styles.brandingContainer}>
                {(typeof brandData?.logo_primary === 'string' ? brandData.logo_primary : (brandData?.logo_primary as any)?.url) ? (
                    <AnimatedImage
                        source={{ uri: typeof brandData?.logo_primary === 'string' ? brandData.logo_primary : (brandData?.logo_primary as any)?.url }}
                        style={styles.logo}
                        contentFit="contain"
                        entering={FadeIn.duration(800)}
                    />
                ) : null}

                {(typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url) ? (
                    <AnimatedImage
                        source={{ uri: typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url }}
                        style={styles.explorer}
                        contentFit="contain"
                        entering={FadeIn.duration(800).delay(200)}
                    />
                ) : null}
            </View>

            <View style={styles.cardContainer}>
                {syncError ? (
                    <View style={styles.errorBox}>
                        <AppText style={styles.errorText}>{syncError}</AppText>
                        <TouchableOpacity 
                            style={[styles.retryButton, primaryColor ? { backgroundColor: primaryColor } : {}]} 
                            onPress={performInitialSync}
                            activeOpacity={0.8}
                        >
                            <AppText style={[styles.retryButtonText, secondaryColor ? { color: secondaryColor } : {}]}>Retry Setup</AppText>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.progressCard}>
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                            <AppText style={styles.statusText}>{syncStatusText || "Setting up offline database..."}</AppText>
                        </View>
                        
                        <View style={styles.progressBarBg}>
                            <View 
                                style={[
                                    styles.progressBarFill, 
                                    { width: `${progressPercent}%` },
                                    primaryColor ? { backgroundColor: primaryColor } : {}
                                ]} 
                            />
                        </View>
                        
                        <View style={styles.progressFooter}>
                            <AppText style={styles.progressPercent}>{progressPercent}%</AppText>
                            <AppText style={styles.downloadText}>Offline Mode Setup</AppText>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {bgImageUri ? (
                <AnimatedImageBackground 
                    source={{ uri: bgImageUri }} 
                    style={StyleSheet.absoluteFill} 
                    contentFit="cover"
                    entering={FadeIn.duration(1000)}
                >
                    {Content}
                </AnimatedImageBackground>
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: primaryColor || '#2E3B2F' }]}>
                    {Content}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999, // Ensure it sits on top of everything
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)', // Premium dark overlay for readability
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 24,
    },
    brandingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 40,
    },
    logo: {
        width: width * 0.55,
        height: height * 0.16,
        marginBottom: 10,
    },
    explorer: {
        width: width * 0.65,
        height: height * 0.08,
    },
    cardContainer: {
        width: '100%',
        marginBottom: 30,
    },
    progressCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Premium translucent glassmorphism
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
        backdropFilter: 'blur(20px)', // For web if running on web
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    statusText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
        flex: 1,
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF', // Default accent, will be overridden by brand color
        borderRadius: 3,
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    downloadText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    errorBox: {
        backgroundColor: 'rgba(211, 47, 47, 0.9)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    errorText: {
        fontSize: 14,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 18,
        lineHeight: 20,
        fontWeight: '500',
    },
    retryButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    retryButtonText: {
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
