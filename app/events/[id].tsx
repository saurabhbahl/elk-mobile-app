import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RenderHTML from 'react-native-render-html';

import Navbar from "@/components/Navbar";
import QuickLinks from "@/components/QuickLinks";
import WireframePlaceholder from "@/components/WireframePlaceholder";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function EventDetailScreen() {
    const { id } = useLocalSearchParams();
    const { brandData, eventsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const event = eventsData?.find(
        (e: any, index: number) => String(e.id || index) === String(id)
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

    if (!event) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <Navbar />
                <QuickLinks />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Event not found.</Text>
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

    const rawDescription = event.full_description || "";

    const handleRegister = () => {
        const url = event.registration__ticket_link;
        if (url) {
            Linking.canOpenURL(url).then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    console.log("Don't know how to open URI: " + url);
                }
            });
        }
    };

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
                        {event.event_name || "Event Details"}
                    </Text>
                </View>

                {/* Banner Image */}
                <View style={styles.bannerContainer}>
                    {event.thumbnail_image?.url ? (
                        <Image
                            source={{ uri: event.thumbnail_image.url }}
                            style={styles.bannerImage}
                            contentFit="cover"
                        />
                    ) : (
                        <WireframePlaceholder style={styles.bannerImage} />
                    )}
                </View>

                {/* Details Section */}
                <View style={styles.detailsContent}>
                    {/* Date & Time */}
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#555" style={styles.infoIcon} />
                        <Text style={styles.scheduleText}>
                            {event["start_date_&_time"] || "No Date Scheduled"}
                            {event["end_date_&_time"] ? ` - ${event["end_date_&_time"]}` : ""}
                        </Text>
                    </View>

                    {/* Location */}
                    {(event.location_name || event.location_address) && (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={16} color="#555" style={styles.infoIcon} />
                            <View>
                                {event.location_name && (
                                    <Text style={styles.locationNameText}>{event.location_name}</Text>
                                )}
                                {event.location_address && (
                                    <Text style={styles.locationAddressText}>{event.location_address}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Description Paragraph */}
                    {rawDescription ? (
                        <RenderHTML
                            contentWidth={width - 32} // paddingHorizontal is 16 on each side
                            source={{ html: typeof rawDescription === "string" ? rawDescription : "" }}
                            baseStyle={{
                                fontSize: 14,
                                color: "#444444",
                                lineHeight: 22,
                                marginTop: 10,
                                marginBottom: 20,
                            }}
                            tagsStyles={{
                                p: { marginVertical: 8 }
                            }}
                        />
                    ) : null}

                    {/* Register Button */}
                    {event.registration__ticket_link && (
                        <TouchableOpacity
                            style={[styles.registerButton, { backgroundColor: primaryColor }]}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.registerButtonText, { color: secondaryColor || "#FFFFFF" }]}>
                                Register / Buy Tickets
                            </Text>
                        </TouchableOpacity>
                    )}
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

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },

    infoIcon: {
        marginRight: 8,
    },

    scheduleText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333333",
        flex: 1,
    },

    locationNameText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333333",
    },

    locationAddressText: {
        fontSize: 13,
        color: "#666666",
        marginTop: 2,
    },

    descriptionText: {
        fontSize: 14,
        color: "#444444",
        lineHeight: 22,
        marginTop: 10,
        marginBottom: 20,
    },

    registerButton: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
    },

    registerButtonText: {
        fontSize: 15,
        fontWeight: "bold",
    },
});
