import AppText from "@/src/components/AppText";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { getCachedImageLocalPath } from "@/src/utils/imageCache";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const CONTENT_CONSENT_KEY = "@elk_content_download_consent";
let dismissedContentSession = false;

export default function LandingScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, apiStatus, syncProgress, syncError, performInitialSync } = useAppContent();

    const [consentStatus, setConsentStatus] = useState<string | null>(() => {
        if (dismissedContentSession) return 'dismissed';
        return null;
    });
    const [isConsentLoaded, setIsConsentLoaded] = useState(false);
    const [isContentDownloading, setIsContentDownloading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                if (dismissedContentSession) {
                    if (isMounted) {
                        setConsentStatus('dismissed');
                        setIsConsentLoaded(true);
                    }
                    return;
                }
                const stored = await AsyncStorage.getItem(CONTENT_CONSENT_KEY);
                if (isMounted) {
                    if (stored === 'dismissed' || stored === 'no') {
                        // Reset on cold app restart so user gets prompted unless they clicked Continue
                        await AsyncStorage.removeItem(CONTENT_CONSENT_KEY);
                        setConsentStatus(null);
                    } else {
                        setConsentStatus(stored);
                    }
                    setIsConsentLoaded(true);
                }
            } catch {
                if (isMounted) {
                    setIsConsentLoaded(true);
                }
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    const secColor = brandData?.brand_color_secondary || "#ea0b0b";

    const logoDuration = 1000;
    const primaryDelay = 150;
    const secondaryDelay = 300;
    const bgDuration = 800;

    const rawBg = brandData?.splash_loading_screen_background;
    const bgUrl = typeof rawBg === 'string'
        ? rawBg
        : (rawBg as any)?.url ?? null;
    const bgImageUri = bgUrl ? (getCachedImageLocalPath(bgUrl) || bgUrl) : null;

    const rawLogo1 = brandData?.logo_primary;
    const logo1Url = typeof rawLogo1 === 'string' ? rawLogo1 : (rawLogo1 as any)?.url ?? null;
    const logo1Uri = logo1Url ? (getCachedImageLocalPath(logo1Url) || logo1Url) : null;

    const rawLogo2 = brandData?.logo_secondary;
    const logo2Url = typeof rawLogo2 === 'string' ? rawLogo2 : (rawLogo2 as any)?.url ?? null;
    const logo2Uri = logo2Url ? (getCachedImageLocalPath(logo2Url) || logo2Url) : null;

    const styles = useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const handleContinueDownload = async () => {
        setIsContentDownloading(true);
        try {
            const success = await performInitialSync(true);
            if (success) {
                try {
                    await AsyncStorage.setItem(CONTENT_CONSENT_KEY, 'yes');
                } catch {}
                setConsentStatus('yes');
                router.replace("/(home)" as any);
            }
        } finally {
            setIsContentDownloading(false);
        }
    };

    const handleDecline = async () => {
        dismissedContentSession = true;
        setConsentStatus('dismissed');
        setIsContentDownloading(false);
        try {
            await AsyncStorage.setItem(CONTENT_CONSENT_KEY, 'dismissed');
        } catch {}
        performInitialSync(false).catch(() => {});
        router.replace("/(home)" as any);
    };

    const handleCancel = () => {
        setIsContentDownloading(false);
        dismissedContentSession = true;
        setConsentStatus('dismissed');
        router.replace("/(home)" as any);
    };

    const handlePressExplore = () => {
        router.replace("/(home)" as any);
    };

    // Show popup consent modal if user hasn't consented yet or if currently downloading
    const shouldShowDownloadPrompt =
        (isConsentLoaded && consentStatus === null) || isContentDownloading;

    const Inner = (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
                {apiStatus !== 'fetching' && (
                    <>
                        {logo1Uri ? (
                            <AnimatedImage
                                source={{ uri: logo1Uri }}
                                style={styles.logo}
                                contentFit="contain"
                                entering={FadeInDown.duration(logoDuration).delay(primaryDelay)}
                                transition={Platform.OS === 'ios' ? 400 : 0}
                            />
                        ) : null}

                        {logo2Uri ? (
                            <AnimatedImage
                                source={{ uri: logo2Uri }}
                                style={styles.explorer}
                                contentFit="contain"
                                entering={FadeInDown.duration(logoDuration).delay(secondaryDelay)}
                                transition={Platform.OS === 'ios' ? 400 : 0}
                            />
                        ) : null}

                        {shouldShowDownloadPrompt ? (
                            <Animated.View entering={FadeInUp.duration(logoDuration)} style={styles.promptContainer}>
                                {isContentDownloading ? (
                                    <View style={styles.downloadingContainer}>
                                        <View style={styles.progressRow}>
                                            <ActivityIndicator size="small" color={secColor || "#ea0b0b"} style={{ marginRight: 10 }} />
                                            <AppText style={styles.downloadingText}>
                                                Downloading offline content... {Math.round(syncProgress * 100)}%
                                            </AppText>
                                        </View>
                                        <View style={styles.progressBarTrack}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: `${Math.round(syncProgress * 100)}%`, backgroundColor: secColor || '#ea0b0b' }
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
                                ) : syncError ? (
                                    <View style={styles.errorContainer}>
                                        <AppText style={styles.errorText}>
                                            {syncError || "Unable to download content. Check connection and try again, or continue online."}
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
                                            Cellular signal is limited in Elk Country. Download app images and content now to ensure guides, events, amenities, and photos work offline.
                                        </AppText>

                                        <View style={styles.sizeBadge}>
                                            <MaterialIcons name="cloud-download" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                                            <AppText style={styles.sizeBadgeText}>Download Size: ~25 MB</AppText>
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
        fontFamily: fonts.body,
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
        fontFamily: fonts.bodyBold,
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
        fontFamily: fonts.bodyBold,
        fontWeight: '700',
    },
    continueButton: {
        backgroundColor: '#ea0b0b',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: fonts.bodyBold,
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
        fontFamily: fonts.bodyBold,
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
        fontFamily: fonts.bodyBold,
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
