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

export default function TrailsScreen() {
    const { homeData, brandData, trailsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const trails = trailsData || [];

    const renderTrailItem = ({ item, index }: { item: any; index: number }) => (
        <View style={styles.trailItemContainer}>
            <View style={styles.trailHeaderRow}>
                <Text style={styles.trailName}>{item.trail_name || "Trail Name"}</Text>
                {item.distance ? (
                    <Text style={styles.trailDistance}>{item.distance}</Text>
                ) : null}
            </View>
            <Text style={styles.trailDescription}>
                {item.description ? item.description.replace(/<\/?[^>]+(>|$)/g, "").trim() : "No description available."}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: primaryColor }}>
                <QuickLinks />
            </View>

            <View style={styles.headerRow}>
                <Image source={require("../../assets/images/trail.png")} style={styles.headerIcon} />
                <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                    {homeData?.trails_block_heading || "Trails"}
                </Text>
            </View>

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={trails}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderTrailItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No trails available</Text>
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

    trailItemContainer: {
        marginBottom: 20,
    },

    trailHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },

    trailName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#000000",
        marginRight: 8,
    },

    trailDistance: {
        fontSize: 12,
        color: "#333333",
        fontWeight: "500",
    },

    trailDescription: {
        fontSize: 13,
        color: "#555555",
        lineHeight: 18,
    },

    emptyText: {
        textAlign: "center",
        color: "#666666",
        marginTop: 20,
        fontSize: 14,
    },
});
