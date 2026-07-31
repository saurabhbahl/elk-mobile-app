import AppText from "@/src/components/AppText";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from 'react-native-render-html';

import CachedImage from "@/src/components/CachedImage";
import { useAppContent, ProgramsData } from "@/src/contexts/AppContentContext";
import { useTheme } from "@/src/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function ProgramDetailScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { brandData, programsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const program = programsData?.find(
        (p: ProgramsData, index: number) => String(p.id || index) === String(id)
    );

    if (apiStatus === "fetching") {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
                
                
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!program) {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
                
                
                <View style={styles.errorContainer}>
                    <AppText style={styles.errorText}>Program not found.</AppText>
                    <TouchableOpacity
                        style={[styles.backTextButton, { backgroundColor: primaryColor }]}
                        onPress={() => router.back()}
                    >
                        <AppText style={styles.backTextButtonText}>Go Back</AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const rawDescription = program.full_description || "";

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            
            

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Heading Row */}
                {isValidData(program.program_name) ? (
                    <View style={styles.headerRow}>
                        <Image source={require("../../assets/images/Primary.png")} style={styles.headerIcon} />
                        <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]} numberOfLines={1}>
                            {program.program_name}
                        </AppText>
                    </View>
                ) : null}

                {/* Banner Image */}
                {isValidData(program.thumbnail_image) ? (
                    <View style={styles.bannerContainer}>
                        <CachedImage
                            uri={program.thumbnail_image?.url as string}
                            style={styles.bannerImage}
                            contentFit="cover"
                        />
                    </View>
                ) : null}

                {/* Details Section */}
                <View style={styles.detailsContent}>
                    {/* Schedule / Date & Time */}
                    {isValidData(program.schedule__dates) ? (
                        <AppText style={styles.scheduleText}>
                            {program.schedule__dates}
                        </AppText>
                    ) : null}

                    {/* Description Paragraph */}
                    {rawDescription ? (
                        <RenderHTML
                            contentWidth={width - 32} // paddingHorizontal is 16 on each side
                            source={{ html: typeof rawDescription === "string" ? rawDescription : "" }}
                            baseStyle={{
                                fontSize: 14,
                                color: colors.onSurface,
                                lineHeight: 22,
                            }}
                            tagsStyles={{
                                p: { marginVertical: 8 }
                            }}
                        />
                    ) : null}
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

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    errorText: {
        fontSize: 16,
        color: colors.onSurfaceVariant,
        marginBottom: 16,
    },

    backTextButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },

    backTextButtonText: {
        color: colors.surface,
        fontWeight: "bold",
        fontSize: 14,
    },

    scrollContent: {
        paddingBottom: 40,
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
    },

    backButton: {
        marginRight: 8,
        padding: 4,
    },

    headerIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },

    bannerContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },

    bannerImage: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        backgroundColor: colors.outlineVariant,
    },

    detailsContent: {
        paddingHorizontal: 16,
    },

    scheduleText: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.onSurface,
        marginBottom: 14,
    },

    descriptionText: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 22,
    },
});
