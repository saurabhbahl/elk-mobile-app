import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
