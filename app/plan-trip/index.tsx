import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/Navbar";
import QuickLinks from "@/components/QuickLinks";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function PlanTripScreen() {
    const { brandData, planTripData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

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
    const activeSections = sections.filter((sec: any) => {
        // Handle active flag checking flexibly (could be string "1", boolean true, etc.)
        const actVal = sec?.section_active;
        return actVal === undefined || actVal === true || actVal === "1" || actVal === "true" || actVal === "";
    });

    // Sort by sort_order if available
    activeSections.sort((a: any, b: any) => {
        const orderA = parseInt(a.sort_order, 10) || 0;
        const orderB = parseInt(b.sort_order, 10) || 0;
        return orderA - orderB;
    });

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: primaryColor }}>
                <QuickLinks />
            </View>

            {title ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/calendar-days.png")} style={styles.headerIcon} />
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                        {title}
                    </Text>
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
                            <Text style={styles.introText}>
                                {intro.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                            </Text>
                        </View>
                    ) : null}

                    {activeSections.length > 0 ? (
                        activeSections.map((sec: any, index: number) => {
                            const iconUrl = sec.section_icon?.url;
                            return (
                                <View key={index} style={styles.sectionCard}>
                                    <View style={styles.sectionHeader}>
                                        {iconUrl ? (
                                            <Image source={{ uri: iconUrl }} style={styles.sectionIconImg} contentFit="contain" />
                                        ) : null}
                                        <Text style={styles.sectionHeading}>{sec.section_heading || "Trip Section"}</Text>
                                    </View>
                                    {sec.section_body ? (
                                        <Text style={styles.sectionBody}>
                                            {sec.section_body.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>Trip planning info coming soon.</Text>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
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
        backgroundColor: "#E0E0E0",
    },
    introContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    introText: {
        fontSize: 14,
        color: "#333333",
        lineHeight: 20,
        fontWeight: "500",
    },
    sectionCard: {
        marginHorizontal: 16,
        backgroundColor: "#FFFFFF",
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
        color: "#000000",
        flex: 1,
    },
    sectionBody: {
        fontSize: 13,
        color: "#444444",
        lineHeight: 18,
    },
    emptyText: {
        textAlign: "center",
        color: "#666666",
        marginTop: 20,
        fontSize: 14,
    },
});
