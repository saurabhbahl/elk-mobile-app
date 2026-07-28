import AppText from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

export default function Navbar() {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(home)" as any)} activeOpacity={0.8}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.headerLogo}
                    contentFit="contain"
                />
            </TouchableOpacity>
            <Image
                source={require("@/assets/images/Explorer.png")}
                style={styles.headerExplorer}
                contentFit="contain"
            />

            <View style={styles.rightActions}>
                {/* SETTINGS Button */}
                <TouchableOpacity 
                    style={styles.tipsContainer} 
                    activeOpacity={0.7}
                    onPress={() => router.push("/map/settings" as any)}
                >
                    <View style={styles.tipsCircle}>
                        <MaterialCommunityIcons name="cog" size={20} color="#333333" />
                    </View>
                    <View style={styles.tipsBadge}>
                        <AppText style={styles.tipsBadgeText}>SETTINGS</AppText>
                    </View>
                </TouchableOpacity>

                {/* TIPS Badge */}
                <TouchableOpacity 
                    style={styles.tipsContainer} 
                    activeOpacity={0.7}
                    onPress={() => router.push("/tips" as any)}
                >
                    <View style={styles.tipsCircle}>
                        <MaterialCommunityIcons name="paw" size={20} color="#333333" />
                    </View>
                    <View style={styles.tipsBadge}>
                        <AppText style={styles.tipsBadgeText}>TIPS →</AppText>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        backgroundColor: "#FFFFFF",
    },

    headerLogo: {
        height: 46,
        width: 70,
    },

    headerExplorer: {
        height: 30,
        width: 80,
    },

    rightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    tipsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },

    tipsCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#E0E0E0",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#CCCCCC",
    },

    tipsBadge: {
        backgroundColor: "#000000",
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: -6,
        zIndex: 5,
    },

    tipsBadgeText: {
        color: "#FFFFFF",
        fontSize: 7,
        fontWeight: "bold",
    },
});
