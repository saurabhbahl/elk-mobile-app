import AppText from "@/components/AppText";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator,
    Dimensions,
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from 'react-native-render-html';

import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function PlanTripScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, planTripData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const title = planTripData?.screen_title;
    const intro = planTripData?.intro_paragraph;
    
    // Check if hero_image is an ACF image array/object or just a string URL
    let heroImageUrl = null;
    if (planTripData?.hero_image) {
        if (typeof planTripData.hero_image === 'string') {
            heroImageUrl = planTripData.hero_image;
        } else if (typeof planTripData.hero_image === 'object' && planTripData.hero_image.url) {
            heroImageUrl = planTripData.hero_image.url;
        }
    }

    const sections = planTripData?.content_sections || [];
    const activeSections = sections.filter((sec: Record<string, unknown>) => {
        // Handle active flag checking flexibly (could be string "1", boolean true, etc.)
        const actVal = sec?.section_active;
        return actVal === undefined || actVal === true || actVal === "1" || actVal === "true" || actVal === "";
    });

    // Sort by sort_order if available
    activeSections.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const orderA = parseInt(a.sort_order, 10) || 0;
        const orderB = parseInt(b.sort_order, 10) || 0;
        return orderA - orderB;
    });

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            
            

            {title ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/calendar-days.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                        {title}
                    </AppText>
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {heroImageUrl ? (
                        <View style={styles.imageContainer}>
                            <Image 
                                source={{ uri: heroImageUrl }} 
                                style={styles.bannerImage} 
                                contentFit="cover" 
                            />
                        </View>
                    ) : null}

                    {intro ? (
                        <View style={styles.introContainer}>
                            <RenderHTML
                                contentWidth={width - 32}
                                source={{ html: intro }}
                                baseStyle={{
                                    fontSize: 14,
                                    color: colors.onSurface,
                                    lineHeight: 20,
                                    fontWeight: "500",
                                }}
                                tagsStyles={{ p: { marginVertical: 4 } }}
                            />
                        </View>
                    ) : null}

                    {activeSections.length > 0 ? (
                        activeSections.map((sec: Record<string, unknown>, index: number) => {
                            const iconUrl = sec.section_icon?.url;
                            return (
                                <View key={index} style={styles.sectionCard}>
                                    <View style={styles.sectionHeader}>
                                        {iconUrl ? (
                                            <Image source={{ uri: iconUrl }} style={styles.sectionIconImg} contentFit="contain" />
                                        ) : null}
                                        <AppText style={styles.sectionHeading}>{sec.section_heading || ""}</AppText>
                                    </View>
                                    {sec.section_body ? (
                                        <RenderHTML
                                            contentWidth={width - 32 - 32} // padding inside section card
                                            source={{ html: sec.section_body }}
                                            baseStyle={{
                                                fontSize: 13,
                                                color: colors.onSurface,
                                                lineHeight: 18,
                                            }}
                                            tagsStyles={{ p: { marginVertical: 4 } }}
                                        />
                                    ) : null}
                                </View>
                            );
                        })
                    ) : (
                        <AppText style={styles.emptyText}>Trip planning info coming soon.</AppText>
                    )}
                </ScrollView>
            )}
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
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
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
    scrollContent: {
        paddingBottom: 40,
    },
    imageContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    bannerImage: {
        width: "100%",
        height: 160,
        borderRadius: 8,
        backgroundColor: colors.outlineVariant,
    },
    introContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    introText: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 20,
        fontWeight: "500",
    },
    sectionCard: {
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E8E8E8",
        padding: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionIconImg: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    sectionIconPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.onSurface,
        flex: 1,
    },
    sectionBody: {
        fontSize: 13,
        color: colors.onSurface,
        lineHeight: 18,
    },
    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
