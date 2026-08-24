import AppText from "@/src/components/AppText";
import { Image, ImageBackground } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { height, LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

const diagonal = Math.sqrt(width * width + height * height);
const angle = Math.atan2(height, width) * (180 / Math.PI);

export default function LandingScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, apiStatus, syncStatusText, syncProgress, syncError, performInitialSync } = useAppContent();
    const bgColor = brandData?.brand_color_primary || "#000000";
    const secColor = brandData?.brand_color_secondary || "#ea0b0b";

    const bgImageUri = brandData?.splash_loading_screen_background
        ? (typeof brandData.splash_loading_screen_background === 'string'
            ? brandData.splash_loading_screen_background
            : (brandData.splash_loading_screen_background as any)?.url ?? null)
        : null;

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

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
                                entering={FadeInDown.duration(1000).springify()}
                                transition={800}
                            />
                        ) : null}

                        {(typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url) ? (
                            <AnimatedImage
                                source={{ uri: typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url }}
                                style={styles.explorer}
                                contentFit="contain"
                                entering={FadeInDown.duration(1000).delay(150).springify()}
                                transition={800}
                            />
                        ) : null}

                        {apiStatus === 'loading' ? (
                            <Animated.View entering={FadeInUp.duration(1000).delay(300).springify()} style={{ alignItems: 'center' }}>
                                {syncError ? (
                                    <>
                                        <AppText style={{ fontSize: 12, color: '#FF5252', textAlign: 'center', marginBottom: 16 }}>{syncError}</AppText>
                                        <TouchableOpacity
                                            style={[styles.button, secColor ? { backgroundColor: secColor } : {}]}
                                            onPress={performInitialSync}
                                        >
                                            <AppText style={[styles.buttonText, { color: '#FFFFFF' }]}>Retry Setup</AppText>
                                        </TouchableOpacity>
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
                        ) : (
                            <Animated.View entering={FadeInUp.duration(1000).delay(300).springify()}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.button, secColor ? { backgroundColor: secColor } : {}]}
                                    onPress={() => router.replace("/(home)" as any)}
                                >
                                    <AppText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                        {brandData?.app_tagline}
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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {bgImageUri ? (
                <AnimatedImageBackground
                    source={{ uri: bgImageUri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    entering={FadeIn.duration(1500)}
                    transition={1000}
                >
                    <View style={styles.darkOverlay}>{Inner}</View>
                </AnimatedImageBackground>
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor || '#2E3B2F' }]}>
                    <View style={styles.darkOverlay}>{Inner}</View>
                </View>
            )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    diagonalLineContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        zIndex: -1,
    },

    line: {
        position: "absolute",
        height: 1,
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
        width: 185,
        height: 140,
        marginBottom: 20,
    },

    explorer: {
        width: 220,
        height: 75,
        marginBottom: 20,
    },

    tagline: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 40,
        textAlign: "center",
    },

    button: {
        backgroundColor: colors.onSurface, // Charcoal grey button
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
});