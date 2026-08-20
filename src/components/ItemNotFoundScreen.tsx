import AppText from "@/src/components/AppText";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

interface ItemNotFoundScreenProps {
    title?: string;
    message?: string;
}

export default function ItemNotFoundScreen({
    title = "Content Not Found",
    message = "The item you are looking for is no longer available or may have been deleted.",
}: ItemNotFoundScreenProps) {
    const { colors, fonts, isDark } = useTheme();
    const { brandData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary) || "#000000";
    const secondaryColor = getValidColor(brandData?.brand_color_secondary) || "#ea0b0b";

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Components */}
                <Navbar />
                <QuickLinks />

                {/* Main Not Found Message */}
                <View style={styles.contentContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: secondaryColor + "15" }]}>
                        <MaterialIcons name="search-off" size={56} color={secondaryColor} />
                    </View>

                    <AppText style={styles.title}>{title}</AppText>
                    <AppText style={styles.message}>{message}</AppText>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.outlineButton, { borderColor: primaryColor }]}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/(home)");
                                }
                            }}
                        >
                            <Ionicons name="arrow-back" size={18} color={isDark ? "#FFFFFF" : primaryColor} style={{ marginRight: 6 }} />
                            <AppText style={[styles.buttonText, { color: isDark ? "#FFFFFF" : primaryColor }]}>Go Back</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.filledButton, { backgroundColor: primaryColor }]}
                            activeOpacity={0.8}
                            onPress={() => router.replace("/(home)")}
                        >
                            <Ionicons name="home" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <AppText style={[styles.buttonText, { color: "#FFFFFF" }]}>Go to Home</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    contentContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: 36,
        paddingBottom: 40,
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontFamily: "OpenSans-Bold",
        fontWeight: "700",
        color: colors.onSurface,
        textAlign: "center",
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        fontFamily: "OpenSans-Regular",
        color: colors.onSurfaceVariant,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 28,
        maxWidth: 320,
    },
    buttonRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 10,
        minWidth: 120,
    },
    outlineButton: {
        borderWidth: 1.5,
        backgroundColor: "transparent",
    },
    filledButton: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    buttonText: {
        fontSize: 14,
        fontFamily: "OpenSans-Bold",
        fontWeight: "700",
    },
});
