import React from "react";
import { StyleSheet, TouchableOpacity, Text, View, Dimensions, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");
const diagonal = Math.sqrt(width * width + height * height);
const angle = Math.atan2(height, width) * (180 / Math.PI);

export default function LandingScreen() {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#E5E5E5" />

            {/* Background Wireframe Crossed Lines */}
            <View style={styles.diagonalLineContainer} pointerEvents="none">
                <View style={[styles.line, { width: diagonal, transform: [{ rotate: `${angle}deg` }] }]} />
                <View style={[styles.line, { width: diagonal, transform: [{ rotate: `-${angle}deg` }] }]} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <Image
                        source={require("../assets/images/logo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />

                    <Image
                        source={require("../assets/images/Explorer.png")}
                        style={styles.explorer}
                        resizeMode="contain"
                    />

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.button}
                        onPress={() => router.push("/(tabs)")}
                    >
                        <Text style={styles.buttonText}>
                            Find your Adventure
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#E5E5E5", // Light grey wireframe background
    },

    diagonalLineContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        zIndex: -1,
    },

    line: {
        position: "absolute",
        height: 1,
        backgroundColor: "#CCCCCC", // Thin light grey wireframe crossed lines
    },

    safeArea: {
        flex: 1,
    },

    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    logo: {
        width: 185,
        height: 140,
        marginBottom: 20,
    },

    explorer: {
        width: 220,
        height: 75,
        marginBottom: 40,
    },

    button: {
        backgroundColor: "#333333", // Charcoal grey button
        paddingHorizontal: 35,
        height: 52,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    buttonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    },
});