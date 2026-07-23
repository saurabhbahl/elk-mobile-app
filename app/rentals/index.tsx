import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Linking,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
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

export default function RentalsScreen() {
    const { brandData, rentalsData, apiStatus, rentalSettingsData } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const rentals = rentalsData || [];

    const handlePressLink = (url: string) => {
        if (url) {
            Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
        }
    };

    const renderRentalItem = ({ item }: { item: any }) => {
        // Find main image from additional_images (acf gallery) if available
        let imageUrl = null;
        if (item.additional_images && Array.isArray(item.additional_images) && item.additional_images.length > 0) {
            imageUrl = item.additional_images[0]?.url;
        }

        return (
            <View style={styles.rentalCard}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.rentalImage} contentFit="cover" />
                ) : null}
                <View style={styles.rentalContent}>
                    <View style={styles.titleRow}>
                        <Text style={styles.rentalName}>{item.rental_name || "Rental Unit"}</Text>
                        {item.rental_type ? (
                            <View style={[styles.badge, primaryColor ? { backgroundColor: primaryColor + "15" } : null]}>
                                <Text style={[styles.badgeText, primaryColor ? { color: primaryColor } : null]}>{item.rental_type}</Text>
                            </View>
                        ) : null}
                    </View>

                    {item.capacity ? (
                        <Text style={styles.capacityText}>Capacity: {item.capacity}</Text>
                    ) : null}

                    {item.short_description ? (
                        <Text style={styles.shortDesc}>{item.short_description}</Text>
                    ) : null}

                    {item.full_description ? (
                        <Text style={styles.fullDesc}>
                            {item.full_description.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                        </Text>
                    ) : null}

                    {item.availability_notes ? (
                        <Text style={styles.notesText}>
                            <Text style={{ fontWeight: "700" }}>Availability: </Text>
                            {item.availability_notes}
                        </Text>
                    ) : null}

                    {item.pricing_notes ? (
                        <Text style={styles.notesText}>
                            <Text style={{ fontWeight: "700" }}>Pricing: </Text>
                            {item.pricing_notes}
                        </Text>
                    ) : null}

                    <View style={styles.ctaRow}>
                        {item.cta_1_label_ && item.cta_1_link ? (
                            <TouchableOpacity
                                style={[styles.ctaButton, primaryColor ? { backgroundColor: primaryColor } : null]}
                                onPress={() => handlePressLink(item.cta_1_link)}
                            >
                                <Text style={[styles.ctaButtonText, secondaryColor ? { color: secondaryColor } : null]}>
                                    {item.cta_1_label_}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        {item.cta_2_label && item.cta_2_link ? (
                            <TouchableOpacity
                                style={[styles.ctaButtonOutline, primaryColor ? { borderColor: primaryColor } : null]}
                                onPress={() => handlePressLink(item.cta_2_link)}
                            >
                                <Text style={[styles.ctaButtonOutlineText, primaryColor ? { color: primaryColor } : null]}>
                                    {item.cta_2_label}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: primaryColor }}>
                <QuickLinks />
            </View>

            {rentalSettingsData?.screen_title ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/rentals.png")} style={styles.headerIcon} />
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                        {rentalSettingsData.screen_title}
                    </Text>
                </View>
            ) : null}

            {rentalSettingsData?.intro_text ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: "#333", lineHeight: 20, textAlign: "center" }}>
                        {rentalSettingsData.intro_text}
                    </Text>
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={rentals}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderRentalItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No rentals available at the moment.</Text>
                    }
                />
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
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    rentalCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        marginBottom: 20,
        overflow: "hidden",
    },
    rentalImage: {
        width: "100%",
        height: 150,
        backgroundColor: "#F0F0F0",
    },
    rentalContent: {
        padding: 16,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    rentalName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000000",
        flex: 1,
        marginRight: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    capacityText: {
        fontSize: 12,
        color: "#666666",
        marginBottom: 8,
        fontWeight: "500",
    },
    shortDesc: {
        fontSize: 13,
        color: "#555555",
        lineHeight: 18,
        marginBottom: 8,
    },
    fullDesc: {
        fontSize: 13,
        color: "#666666",
        lineHeight: 18,
        marginBottom: 12,
    },
    notesText: {
        fontSize: 12,
        color: "#555555",
        lineHeight: 16,
        marginBottom: 6,
    },
    ctaRow: {
        flexDirection: "row",
        marginTop: 12,
        gap: 10,
    },
    ctaButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaButtonText: {
        fontSize: 13,
        fontWeight: "700",
    },
    ctaButtonOutline: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    ctaButtonOutlineText: {
        fontSize: 13,
        fontWeight: "700",
    },
    emptyText: {
        textAlign: "center",
        color: "#666666",
        marginTop: 20,
        fontSize: 14,
    },
});
