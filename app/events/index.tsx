import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
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
const cardWidth = (width - 44) / 2; // 16px padding on sides, 12px gap in middle

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function EventsScreen() {
    const { homeData, brandData, eventsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);

    const events = eventsData || [];

    const renderEventCard = ({ item, index }: { item: any; index: number }) => (
        <TouchableOpacity
            style={styles.eventCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/events/${item.id || index}` as any)}
        >
            {item.thumbnail_image?.url ? (
                <Image
                    source={{ uri: item.thumbnail_image.url }}
                    style={styles.eventCardImage}
                    contentFit="cover"
                />
            ) : (
                <WireframePlaceholder style={styles.eventCardImage} />
            )}
            <View style={styles.eventCardContent}>
                <Text style={styles.eventCardName} numberOfLines={2}>
                    {item.event_name || "Event Name"}
                </Text>
                <Text style={styles.eventCardDate} numberOfLines={1}>
                    {item["start_date_&_time"] || "No Date"}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: primaryColor }}>
                <QuickLinks />
            </View>

            <View style={styles.headerRow}>
                <Image source={require("../../assets/images/Primary.png")} style={styles.headerIcon} />
                <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                    Events
                </Text>
            </View>

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderEventCard}
                    numColumns={2}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No events available</Text>
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
        paddingBottom: 12,
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

    gridContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 12,
    },

    eventCard: {
        width: cardWidth,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },

    eventCardImage: {
        width: "100%",
        height: 110,
    },

    eventCardContent: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        minHeight: 64,
        justifyContent: "center",
    },

    eventCardName: {
        fontSize: 13,
        fontWeight: "700",
        color: "#333333",
        lineHeight: 16,
    },

    eventCardDate: {
        fontSize: 11,
        color: "#888888",
        marginTop: 4,
    },

    emptyText: {
        textAlign: "center",
        color: "#888888",
        fontSize: 14,
        marginTop: 40,
    },
});
