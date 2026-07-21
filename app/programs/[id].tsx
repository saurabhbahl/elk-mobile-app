import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/Navbar";
import QuickLinks from "@/components/QuickLinks";
import WireframePlaceholder from "@/components/WireframePlaceholder";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function ProgramDetailScreen() {
    const { id } = useLocalSearchParams();
    const { homeData, brandData, programsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const program = programsData?.find(
        (p: any, index: number) => String(p.id || index) === String(id)
    );

    if (apiStatus === "fetching") {
        return (
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <Navbar />
                <QuickLinks />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!program) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <Navbar />
                <QuickLinks />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Program not found.</Text>
                    <TouchableOpacity
                        style={[styles.backTextButton, { backgroundColor: primaryColor }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backTextButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Strip HTML tags from description if present
    const rawDescription = program.full_description || "";
    const cleanDescription = typeof rawDescription === "string"
        ? rawDescription.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim()
        : "";

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: primaryColor }}>
                <QuickLinks />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Heading Row */}
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/Primary.png")} style={styles.headerIcon} />
                    <Text style={[styles.sectionTitle, { color: primaryColor }]} numberOfLines={1}>
                        {program.program_name || "Program Details"}
                    </Text>
                </View>

                {/* Banner Image */}
                <View style={styles.bannerContainer}>
                    {program.thumbnail_image?.url ? (
                        <Image
                            source={{ uri: program.thumbnail_image.url }}
                            style={styles.bannerImage}
                            contentFit="cover"
                        />
                    ) : (
                        <WireframePlaceholder style={styles.bannerImage} />
                    )}
                </View>

                {/* Details Section */}
                <View style={styles.detailsContent}>
                    {/* Schedule / Date & Time */}
                    <Text style={styles.scheduleText}>
                        {program.schedule__dates || "No Date Scheduled"}
                    </Text>

                    {/* Description Paragraph */}
                    <Text style={styles.descriptionText}>
                        {cleanDescription}
                    </Text>
                </View>
            </ScrollView>
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

    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    errorText: {
        fontSize: 16,
        color: "#888888",
        marginBottom: 16,
    },

    backTextButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },

    backTextButtonText: {
        color: "#FFFFFF",
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
        backgroundColor: "#E0E0E0",
    },

    detailsContent: {
        paddingHorizontal: 16,
    },

    scheduleText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333333",
        marginBottom: 14,
    },

    descriptionText: {
        fontSize: 14,
        color: "#444444",
        lineHeight: 22,
    },
});
