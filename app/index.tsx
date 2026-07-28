import AppText from "@/components/AppText";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Dimensions, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const diagonal = Math.sqrt(width * width + height * height);
const angle = Math.atan2(height, width) * (180 / Math.PI);

import { useAppContent } from "@/contexts/AppContentContext";
import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";

export default function LandingScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, apiStatus } = useAppContent();
    const bgColor = brandData?.brand_color_primary;
    const secColor = brandData?.brand_color__secondary;

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surfaceContainerHigh} />

            {/* Background Wireframe Crossed Lines */}
            <View style={styles.diagonalLineContainer} pointerEvents="none">
                <View style={[styles.line, { width: diagonal, transform: [{ rotate: `${angle}deg` }] }, secColor ? { backgroundColor: secColor } : {}]} />
                <View style={[styles.line, { width: diagonal, transform: [{ rotate: `-${angle}deg` }] }, secColor ? { backgroundColor: secColor } : {}]} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {apiStatus !== 'fetching' && (
                        <>
                            {brandData?.logo_primary?.url ? (
                                <Image
                                    source={{ uri: brandData.logo_primary.url }}
                                    style={styles.logo}
                                    contentFit="contain"
                                />
                            ) : null}

                            {brandData?.logo_secondary?.url ? (
                                <Image
                                    source={{ uri: brandData.logo_secondary.url }}
                                    style={styles.explorer}
                                    contentFit="contain"
                                />
                            ) : null}

                            {apiStatus === 'loading' ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', height: 52 }}>
                                    <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />
                                    <AppText style={{ fontSize: 16, fontWeight: 'bold', color: colors.onSurface }}>Loading...</AppText>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.button, bgColor ? { backgroundColor: bgColor } : {}]}
                                    onPress={() => router.push("/(home)" as any)}
                                >
                                    <AppText style={[styles.buttonText, secColor ? { color: secColor } : {}]}>
                                        {brandData?.app_tagline}
                                    </AppText>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceContainerHigh, // Light grey wireframe background
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
        borderRadius: 12,
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