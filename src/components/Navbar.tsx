import AppText from "@/src/components/AppText";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const scale = width / 600;
const r = (size: number) => Math.min(size * scale, size * 1.5);

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};

export default function Navbar() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData } = useAppContent();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary) || "#FFFFFF";

    return (
        <View style={[
            styles.header,
            primaryColor ? { backgroundColor: primaryColor } : {},
            { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }
        ]}>
            <View style={styles.leftActions}>
                <TouchableOpacity
                    onPress={() => router.navigate("/(home)")}
                    activeOpacity={0.8}
                >
                    {(typeof brandData?.logo_primary === 'string' ? brandData.logo_primary : (brandData?.logo_primary as any)?.url) ? (
                        <AnimatedImage
                            source={{ uri: typeof brandData?.logo_primary === 'string' ? brandData.logo_primary : (brandData?.logo_primary as any)?.url }}
                            style={styles.headerLogo}
                            contentFit="contain"
                            entering={FadeIn.duration(800)}
                        />
                    ) : null}
                </TouchableOpacity>

                {(typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url) ? (
                    <AnimatedImage
                        source={{ uri: typeof brandData?.logo_secondary === 'string' ? brandData.logo_secondary : (brandData?.logo_secondary as any)?.url }}
                        style={styles.headerExplorer}
                        contentFit="contain"
                        entering={FadeIn.duration(800)}
                    />
                ) : null}
            </View>

            <View style={styles.rightActions}>
                {/* SETTINGS Button */}
                <TouchableOpacity
                    style={styles.tipsContainer}
                    activeOpacity={0.7}
                    onPress={() => router.push("/map/settings" as any)}
                >
                    <View style={[styles.tipsCircle, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                        <MaterialCommunityIcons name="cog" size={18} color={secondaryColor} />
                    </View>
                    <View style={[styles.tipsBadge, { backgroundColor: secondaryColor }]}>
                        <AppText style={[styles.tipsBadgeText, { color: primaryColor || '#8B1E1E' }]}>SETTINGS</AppText>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    header: {
        height: r(144),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: r(16),
        borderBottomWidth: 1,
        backgroundColor: "#8B1E1E", // Fallback to premium red
    },

    headerLogo: {
        height: r(140),
        width: r(140),
    },

    headerExplorer: {
        height: r(180),
        width: r(180),
        marginTop: r(30),
    },

    leftActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginLeft: r(8),
    },

    rightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    tipsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },

    tipsCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
    },

    tipsBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 6,
        marginTop: -5,
        zIndex: 5,
    },

    tipsBadgeText: {
        fontSize: 7,
        fontWeight: "900",
    },
});
