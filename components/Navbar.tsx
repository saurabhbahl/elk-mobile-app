import AppText from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";

export default function Navbar() {
    const { colors, fonts, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(home)" as any)} activeOpacity={0.8}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.headerLogo}
                    contentFit="contain"
                />
            </TouchableOpacity>
            <Image
                source={require("@/assets/images/Explorer.png")}
                style={styles.headerExplorer}
                contentFit="contain"
            />

            <View style={styles.rightActions}>
                {/* SETTINGS Button */}
                <TouchableOpacity 
                    style={styles.tipsContainer} 
                    activeOpacity={0.7}
                    onPress={() => router.push("/map/settings" as any)}
                >
                    <View style={styles.tipsCircle}>
                        <MaterialCommunityIcons name="cog" size={20} color={colors.onSurface} />
                    </View>
                    <View style={styles.tipsBadge}>
                        <AppText style={styles.tipsBadgeText}>SETTINGS</AppText>
                    </View>
                </TouchableOpacity>

                {/* TIPS Badge */}
                <TouchableOpacity 
                    style={styles.tipsContainer} 
                    activeOpacity={0.7}
                    onPress={() => router.push("/tips" as any)}
                >
                    <View style={styles.tipsCircle}>
                        <MaterialCommunityIcons name="paw" size={20} color={colors.onSurface} />
                    </View>
                    <View style={styles.tipsBadge}>
                        <AppText style={styles.tipsBadgeText}>TIPS →</AppText>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    header: {
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        backgroundColor: colors.surface,
    },

    headerLogo: {
        height: 46,
        width: 70,
    },

    headerExplorer: {
        height: 30,
        width: 80,
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
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.surfaceContainerHigh,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.outline,
    },

    tipsBadge: {
        backgroundColor: isDark ? colors.surfaceContainerHigh : "#000000",
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: -6,
        zIndex: 5,
    },

    tipsBadgeText: {
        color: isDark ? colors.onSurface : "#FFFFFF",
        fontSize: 7,
        fontWeight: "bold",
    },
});
