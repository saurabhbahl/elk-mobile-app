import { Ionicons } from "@expo/vector-icons";
import { Image, ImageBackground } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/Navbar";
import QuickLinks from "@/components/QuickLinks";
import { useAppContent } from "@/contexts/AppContentContext";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function LiveCameraScreen() {
    const { brandData, camerasData, liveCamSettingsData, apiStatus } = useAppContent();
    const bgColor = getValidColor(brandData?.brand_color_primary);
    const secColor = getValidColor(brandData?.brand_color__secondary);

    const [activeCamIndex, setActiveCamIndex] = useState(0);

    const cameras = (camerasData || []).filter((cam: any) => cam.active !== false);
    const activeCamera = cameras[activeCamIndex];

    const handlePlayStream = async () => {
        if (activeCamera?.stream_url) {
            await WebBrowser.openBrowserAsync(activeCamera.stream_url);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: bgColor }}>
                <QuickLinks />
            </View>

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={bgColor} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header Row */}
                    {liveCamSettingsData?.screen_title ? (
                        <View style={styles.headerRow}>
                            <Image source={require("../../assets/images/clapperboard-play.png")} style={styles.headerIcon} contentFit="contain" />
                            <Text style={[styles.sectionTitle, { color: bgColor }]}>
                                {liveCamSettingsData.screen_title}
                            </Text>
                        </View>
                    ) : null}

                    {/* Camera Tabs */}
                    {cameras.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabsScroll}
                        >
                            {cameras.map((cam: any, index: number) => {
                                const isActive = index === activeCamIndex;
                                return (
                                    <TouchableOpacity
                                        key={cam.id || index}
                                        style={[
                                            styles.tabButton,
                                            isActive && { backgroundColor: bgColor, borderColor: bgColor },
                                        ]}
                                        onPress={() => setActiveCamIndex(index)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.tabButtonText,
                                                isActive && { color: secColor },
                                            ]}
                                        >
                                            {cam.camera_name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : null}

                    {/* Active Camera Video Preview Box */}
                    <View style={styles.playerContainer}>
                        {activeCamera ? (
                            <TouchableOpacity
                                style={styles.playerTouchable}
                                activeOpacity={0.9}
                                onPress={handlePlayStream}
                            >
                                <ImageBackground
                                    source={
                                        activeCamera.thumbnail__poster?.url
                                            ? { uri: activeCamera.thumbnail__poster.url }
                                            : undefined
                                    }
                                    style={styles.playerImage}
                                    imageStyle={{ borderRadius: 16 }}
                                >
                                    <View style={styles.playerOverlay}>
                                        <Ionicons name="play-circle" size={64} color="rgba(255, 255, 255, 0.85)" />
                                    </View>
                                </ImageBackground>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.playerImage, styles.playerPlaceholder, { borderRadius: 16 }]}>
                                <Ionicons name="videocam-off-outline" size={48} color="#CCCCCC" />
                                <Text style={styles.noCameraText}>No active live cameras available.</Text>
                            </View>
                        )}
                    </View>

                    {/* Stream Notes and Quality details */}
                    <View style={styles.detailsContainer}>
                        {activeCamera?.description ? (
                            <Text style={styles.cameraDescription}>
                                {activeCamera.description.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                            </Text>
                        ) : null}

                        {/* General/Global Live Camera Instructions */}
                        {liveCamSettingsData?.offline_message ? (
                            <Text style={styles.infoText}>
                                {liveCamSettingsData.offline_message}
                            </Text>
                        ) : null}

                        {liveCamSettingsData?.quality_note ? (
                            <Text style={styles.noteText}>
                                {liveCamSettingsData.quality_note.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                            </Text>
                        ) : null}
                    </View>
                </ScrollView>
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
    scrollContent: {
        paddingBottom: 32,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
    },
    headerIcon: {
        width: 22,
        height: 22,
        marginRight: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000000",
    },
    tabsScroll: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    tabButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F2F2F7",
        borderWidth: 1,
        borderColor: "#E5E5EA",
    },
    tabButtonActive: {
        backgroundColor: "#D1D1D6",
        borderColor: "#C7C7CC",
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#8E8E93",
    },
    tabButtonTextActive: {
        color: "#000000",
    },
    playerContainer: {
        marginHorizontal: 16,
        height: 200,
        borderRadius: 16,
        backgroundColor: "#F2F2F7",
        borderWidth: 1,
        borderColor: "#E5E5EA",
        overflow: "hidden",
    },
    playerTouchable: {
        width: "100%",
        height: "100%",
    },
    playerImage: {
        width: "100%",
        height: "100%",
    },
    playerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    playerPlaceholder: {
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    noCameraText: {
        marginTop: 8,
        fontSize: 13,
        color: "#8E8E93",
        textAlign: "center",
    },
    detailsContainer: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    cameraDescription: {
        fontSize: 14,
        fontWeight: "400",
        color: "#333333",
        marginBottom: 12,
    },
    infoText: {
        fontSize: 13,
        color: "#333333",
        lineHeight: 18,
        textAlign: "justify",
        marginBottom: 16,
    },
    noteText: {
        fontSize: 12,
        color: "#8E8E93",
        lineHeight: 16,
        fontStyle: "italic",
    },
});
