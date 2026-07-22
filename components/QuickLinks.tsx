import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import WireframePlaceholder from "./WireframePlaceholder";

export default function QuickLinks() {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalMenu}
            >
                <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
                    <WireframePlaceholder style={styles.menuCardImage} />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Visitors Center</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
                    <WireframePlaceholder style={styles.menuCardImage} />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Elk Scenic Map</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    activeOpacity={0.8}
                    onPress={() => router.push("/programs" as any)}
                >
                    <WireframePlaceholder style={styles.menuCardImage} />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Weekend Programs</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    activeOpacity={0.8}
                    onPress={() => router.push("/events" as any)}
                >
                    <WireframePlaceholder style={styles.menuCardImage} />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Upcoming Events</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    activeOpacity={0.8}
                    onPress={() => router.push("/trails" as any)}
                >
                    <Image source={require("../assets/images/trails.jpg")} style={styles.menuCardImage} contentFit="cover" />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Trails</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    activeOpacity={0.8}
                    onPress={() => router.push("/rentals" as any)}
                >
                    <Image source={require("../assets/images/rentals.jpg")} style={styles.menuCardImage} contentFit="cover" />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Rental Opportunities</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    activeOpacity={0.8}
                    onPress={() => router.push("/plan-trip" as any)}
                >
                    <Image source={require("../assets/images/planyourtrip.jpg")} style={styles.menuCardImage} contentFit="cover" />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Plan Your Trip</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuCard}
                    activeOpacity={0.8}
                    onPress={() => router.push("/tips" as any)}
                >
                    <Image source={require("../assets/images/tips.jpg")} style={styles.menuCardImage} contentFit="cover" />
                    <View style={styles.menuCardTitleContainer}>
                        <Text style={styles.menuCardTitle} numberOfLines={1}>Elk Viewing Tips</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },

    horizontalMenu: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },

    menuCard: {
        width: 120,
        height: 90,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#CCCCCC",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },

    menuCardImage: {
        flex: 2,
    },

    menuCardTitleContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingHorizontal: 4,
    },

    menuCardTitle: {
        fontSize: 11,
        fontWeight: "600",
        color: "#333333",
    },
});
