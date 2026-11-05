import AppText from "@/src/components/AppText";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { useOfflineMap } from "@/src/hooks/useOfflineMap";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function LandingScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, apiStatus, syncStatusText, syncProgress, syncError, performInitialSync } = useAppContent();
    const {
        hasMap,
        consentStatus,
        saveConsent,
        downloadMap,
        cancelDownload,
        isDownloading,
        downloadProgress,
        mbtilesError,
        isInitializing: isMapInitializing,
    } = useOfflineMap();

    const secColor = brandData?.brand_color_secondary || "#ea0b0b";

    const logoDuration = 1000;
    const primaryDelay = 150;
    const secondaryDelay = 300;
    const bgDuration = 800;

    const bgImageUri = brandData?.splash_loading_screen_background
        ? (typeof brandData.splash_loading_screen_background === 'string'
            ? brandData.splash_loading_screen_background
            : (brandData.splash_loading_screen_background as any)?.url ?? null)
        : null;

    const styles = useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const [isStartingDownload, setIsStartingDownload] = useState(false);

    // When download finishes successfully, automatically proceed to home
    useEffect(() => {
        if (!isDownloading && hasMap && consentStatus === 'yes') {
            setIsStartingDownload(false);
            router.replace("/(home)" as any);
        }
    }, [isDownloading, hasMap, consentStatus]);

    const handleContinueDownload = async () => {
        setIsStartingDownload(true);
        try {
            await saveConsent('yes');
            await downloadMap();
        } finally {
            setIsStartingDownload(false);
        }
    };

    const handleDecline = () => {
        router.replace("/(home)" as any);
    };

    const handleCancel = async () => {
        setIsStartingDownload(false);
        await cancelDownload();
    };

    const handlePressExplore = () => {
        router.replace("/(home)" as any);
    };

    const isDownloadActive = isDownloading || isStartingDownload;

    // Determine if we need to show the inline download prompt or progress on this screen
    const shouldShowDownloadPrompt =
        Platform.OS !== 'web' &&
        !hasMap &&
        !isMapInitializing &&
        (consentStatus === null || isDownloadActive);

    const Inner = (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
                {apiStatus !== 'fetching' && (
                    <>
                        {(typeof brandData?.logo_primary === 'string' ? brandData.logo_primary : (brandData?.logo_primary as any)?.url) ? (
                            <AnimatedImage
                                source={{ uri: typeof brandData?.logo_primary === 'string' ? brandData.logo_primary : (brandData?.logo_primary as any)?.url }}
                                style={styles.logo}
                                contentFit="contain"
                                entering={FadeInDown.duration(logoDuration).delay(primaryDelay)}
                                transition={Platform.OS === 'ios' ? 400 : 0}
                            />
                        ) : null}

                        {(typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url) ? (
                            <AnimatedImage
                                source={{ uri: typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url }}
                                style={styles.explorer}
                                contentFit="contain"
                                entering={FadeInDown.duration(logoDuration).delay(secondaryDelay)}
                                transition={Platform.OS === 'ios' ? 400 : 0}
                            />
                        ) : null}

                        {apiStatus === 'loading' ? (
                            <Animated.View entering={FadeInUp.duration(logoDuration)} style={{ alignItems: 'center' }}>
                                {syncError ? (
                                    <>
                                        <AppText style={{ fontSize: 12, color: '#FF5252', textAlign: 'center', marginBottom: 16 }}>{syncError}</AppText>
                                        <TouchableOpacity
                                            style={[styles.button, secColor ? { backgroundColor: secColor } : {}]}
                                            onPress={performInitialSync}
                                        >
                                            <AppText style={[styles.buttonText, { color: '#FFFFFF' }]}>Retry Setup</AppText>
                                        </TouchableOpacity>
                                        {Platform.OS === 'web' && (
                                            <TouchableOpacity
                                                style={[styles.button, { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)' }]}
                                                onPress={() => router.replace("/(home)" as any)}
                                            >
                                                <AppText style={[styles.buttonText, { color: '#FFFFFF' }]}>Preview Web Layout</AppText>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', height: 52 }}>
                                            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                                            <AppText style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>
                                                {syncStatusText || 'Loading...'}
                                            </AppText>
                                        </View>
                                        <AppText style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
                                            {Math.round(syncProgress * 100)}%
                                        </AppText>
                                    </>
                                )}
                            </Animated.View>
                        ) : shouldShowDownloadPrompt ? (
                            <Animated.View entering={FadeInUp.duration(logoDuration)} style={styles.promptContainer}>
                                {isDownloadActive ? (
                                    <View style={styles.downloadingContainer}>
                                        <View style={styles.progressRow}>
                                            <ActivityIndicator size="small" color={secColor || "#ea0b0b"} style={{ marginRight: 10 }} />
                                            <AppText style={styles.downloadingText}>
                                                Downloading offline map... {Math.round(downloadProgress * 100)}%
                                            </AppText>
                                        </View>
                                        <View style={styles.progressBarTrack}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: `${Math.round(downloadProgress * 100)}%`, backgroundColor: secColor || '#ea0b0b' }
                                                ]}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            style={styles.cancelButton}
                                            onPress={handleCancel}
                                        >
                                            <AppText style={styles.cancelButtonText}>Cancel</AppText>
                                        </TouchableOpacity>
                                    </View>
                                ) : mbtilesError ? (
                                    <View style={styles.errorContainer}>
                                        <AppText style={styles.errorText}>
                                            Unable to download map data. Check connection and try again, or continue online.
                                        </AppText>
                                        <View style={styles.buttonRow}>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={[styles.actionButton, styles.declineButton]}
                                                onPress={handleDecline}
                                            >
                                                <AppText style={styles.declineButtonText}>Decline</AppText>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={[styles.actionButton, styles.continueButton, { backgroundColor: secColor || '#ea0b0b' }]}
                                                onPress={handleContinueDownload}
                                            >
                                                <AppText style={styles.continueButtonText}>Retry</AppText>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.promptContent}>
                                        <AppText style={styles.promptDescription}>
                                            Cellular signal is limited in Elk Country. Download the offline regional map to navigate trails and points of interest without an internet connection.
                                        </AppText>

                                        <View style={styles.sizeBadge}>
                                            <MaterialIcons name="cloud-download" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                                            <AppText style={styles.sizeBadgeText}>Download Size: ~307 MB</AppText>
                                        </View>

                                        <View style={styles.buttonRow}>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={[styles.actionButton, styles.declineButton]}
                                                onPress={handleDecline}
                                            >
                                                <AppText style={styles.declineButtonText}>Decline</AppText>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={[styles.actionButton, styles.continueButton, { backgroundColor: secColor || '#ea0b0b' }]}
                                                onPress={handleContinueDownload}
                                            >
                                                <AppText style={styles.continueButtonText}>Continue</AppText>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </Animated.View>
                        ) : (
                            <Animated.View entering={FadeInUp.duration(logoDuration)}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.button, secColor ? { backgroundColor: secColor } : {}]}
                                    onPress={handlePressExplore}
                                >
                                    <AppText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                        {brandData?.app_tagline || "EXPLORE ELK COUNTRY"}
                                    </AppText>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            <StatusBar barStyle="light-content" />
            {bgImageUri && (
                <Animated.View entering={FadeIn.duration(bgDuration)} style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: bgImageUri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                </Animated.View>
            )}
            <View style={[StyleSheet.absoluteFill, styles.darkOverlay]}>
                {Inner}
            </View>
        </View>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceContainerHigh,
    },
    darkOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    logo: {
        width: 170,
        height: 120,
        marginBottom: 12,
    },
    explorer: {
        width: 210,
        height: 65,
        marginBottom: 20,
    },
    button: {
        backgroundColor: colors.onSurface,
        paddingHorizontal: 35,
        height: 52,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: "600",
    },
    promptContainer: {
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
    },
    promptContent: {
        width: '100%',
        alignItems: 'center',
    },
    promptDescription: {
        fontSize: 14,
        lineHeight: 20,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    sizeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    sizeBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    declineButton: {
        backgroundColor: '#FFFFFF',
    },
    declineButtonText: {
        color: '#111111',
        fontSize: 15,
        fontWeight: '700',
    },
    continueButton: {
        backgroundColor: '#ea0b0b',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    downloadingContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 6,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    downloadingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    progressBarTrack: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    cancelButton: {
        paddingHorizontal: 20,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    errorContainer: {
        width: '100%',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 13,
        lineHeight: 18,
        color: '#FF5252',
        textAlign: 'center',
        marginBottom: 14,
    },
});
