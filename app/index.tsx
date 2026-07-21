import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const diagonal = Math.sqrt(width * width + height * height);
const angle = Math.atan2(height, width) * (180 / Math.PI);

import { useAppContent } from "@/contexts/AppContentContext";

export default function LandingScreen() {
    const { brandData, apiStatus } = useAppContent();
    const bgColor = brandData?.brand_color_primary;
    const secColor = brandData?.brand_color__secondary;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#E5E5E5" />

            {/* Background Wireframe Crossed Lines */}
            <View style={styles.diagonalLineContainer} pointerEvents="none">
                <View style={[styles.line, { width: diagonal, transform: [{ rotate: `${angle}deg` }] }, secColor ? { backgroundColor: secColor } : {}]} />
                <View style={[styles.line, { width: diagonal, transform: [{ rotate: `-${angle}deg` }] }, secColor ? { backgroundColor: secColor } : {}]} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {apiStatus !== 'fetching' && (
                        <>
                            {brandData?.logo_primary?.url ? (
                                <Image
                                    source={{ uri: brandData.logo_primary.url }}
                                    style={styles.logo}
                                    contentFit="contain"
                                />
                            ) : null}

                            {brandData?.logo_secondary?.url ? (
                                <Image
                                    source={{ uri: brandData.logo_secondary.url }}
                                    style={styles.explorer}
                                    contentFit="contain"
                                />
                            ) : null}

                            {apiStatus === 'loading' ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', height: 52 }}>
                                    <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000000' }}>Loading...</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.button, bgColor ? { backgroundColor: bgColor } : {}]}
                                    onPress={() => router.push("/(tabs)")}
                                >
                                    <Text style={[styles.buttonText, secColor ? { color: secColor } : {}]}>
                                        {brandData?.app_tagline}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
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
        marginBottom: 20,
    },

    tagline: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 40,
        textAlign: "center",
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