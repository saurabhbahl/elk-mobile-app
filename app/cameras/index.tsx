import AppText from "@/src/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import CachedImage from "@/src/components/CachedImage";
import { STREAM_TYPES } from "@/src/constants/streamTypes";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { useNetInfo } from "@react-native-community/netinfo";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

function NativeVideoPlayer({ source }: { source: string }) {
    const player = useVideoPlayer(source, player => {
        player.loop = true;
        player.play();
    });

    React.useEffect(() => {
        if (player) {
            player.play();
        }
    }, [player]);

    return (
        <VideoView style={{ flex: 1, width: "100%", height: "100%" }} player={player} allowsFullscreen allowsPictureInPicture />
    );
}

export default function LiveCameraScreen() {
    const { colors, fonts, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);
    const { brandData, camerasData, liveCamSettingsData, apiStatus } = useAppContent();
    const bgColor = getValidColor(brandData?.brand_color_primary);
    const secColor = getValidColor(brandData?.brand_color__secondary);

    const { isConnected } = useNetInfo();
    const [activeCamIndex, setActiveCamIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const cameras = (camerasData || []).filter((cam: CamerasData) => cam.active !== false);
    const activeCamera = cameras[activeCamIndex];

    const handleTabChange = (index: number) => {
        setActiveCamIndex(index);
        setIsPlaying(false);
    };

    const handlePlayStream = async () => {
        setIsPlaying(true);
    };

    const handleWebViewNavigation = (event: unknown) => {
        // If it's a YouTube embed and the user clicks a link (like the video title or YouTube logo),
        // it tries to navigate away from the /embed/ player. We intercept this and open it natively.
        if (event.url.includes("youtube.com") && !event.url.includes("/embed/")) {
            Linking.openURL(event.url).catch(err => console.error("Couldn't open YouTube link", err));
            return false; // Stop WebView from navigating
        }
        return true;
    };

    const renderPlayer = () => {
        if (!activeCamera) return null;

        const streamType = activeCamera.stream_type;
        const streamUrl = activeCamera.stream_url;

        if (!streamUrl) {
            return (
                <View style={[styles.playerImage, styles.playerPlaceholder, { borderRadius: 16 }]}>
                    <Ionicons name="videocam-off-outline" size={48} color="#CCCCCC" />
                    <AppText style={styles.noCameraText}>Invalid stream URL.</AppText>
                </View>
            );
        }

        if (streamType === STREAM_TYPES.YOUTUBE) {
            let videoId = "";
            const match = streamUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^&?/]{11})/);
            if (match && match[1]) {
                videoId = match[1];
            }

            if (videoId) {
                return (
                    <WebView
                        style={{ flex: 1, backgroundColor: "#000" }}
                        source={{
                            html: `<html><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><body style="margin:0;padding:0;background-color:#000;display:flex;justify-content:center;align-items:center;height:100vh;"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></body></html>`,
                            baseUrl: process.env.EXPO_PUBLIC_SITE_URL || "https://ftfgifts.com"
                        }}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        allowsFullscreenVideo={true}
                        scrollEnabled={false}
                        onShouldStartLoadWithRequest={handleWebViewNavigation}
                    />
                );
            } else {
                return (
                    <WebView
                        style={{ flex: 1, backgroundColor: "#000" }}
                        source={{ uri: streamUrl }}
                        allowsInlineMediaPlayback={true}
                        allowsFullscreenVideo={true}
                        onShouldStartLoadWithRequest={handleWebViewNavigation}
                    />
                );
            }
        }

        if (streamType === STREAM_TYPES.EMBED) {
            const htmlContent = streamUrl.includes("<html")
                ? streamUrl
                : `<html><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><body style="margin:0;padding:0;background-color:#000;display:flex;justify-content:center;align-items:center;height:100vh;">${streamUrl}</body></html>`;
            return (
                <WebView
                    style={{ flex: 1, backgroundColor: "#000" }}
                    source={{
                        html: htmlContent,
                        baseUrl: process.env.EXPO_PUBLIC_SITE_URL || "https://ftfgifts.com"
                    }}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    scrollEnabled={false}
                    scalesPageToFit={true}
                    allowsFullscreenVideo={true}
                />
            );
        }

        if (streamType === STREAM_TYPES.HLS || streamType === STREAM_TYPES.RTMP) {
            return <NativeVideoPlayer source={streamUrl} />;
        }

        // Fallback for unknown type
        return (
            <WebView
                style={{ flex: 1, backgroundColor: "#000" }}
                source={{ uri: streamUrl }}
                allowsFullscreenVideo={true}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />


            <View style={{ backgroundColor: bgColor }}>

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
                            <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : bgColor }]}>
                                {liveCamSettingsData.screen_title}
                            </AppText>
                        </View>
                    ) : null}

                    {/* Camera Tabs */}
                    {cameras.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabsScroll}
                        >
                            {cameras.map((cam: CamerasData, index: number) => {
                                const isActive = index === activeCamIndex;
                                return (
                                    <TouchableOpacity
                                        key={cam.id || index}
                                        style={[
                                            styles.tabButton,
                                            isActive && { backgroundColor: bgColor, borderColor: bgColor },
                                        ]}
                                        onPress={() => handleTabChange(index)}
                                        activeOpacity={0.8}
                                    >
                                        <AppText
                                            style={[
                                                styles.tabButtonText,
                                                isActive && { color: isDark ? "#FFFFFF" : secColor },
                                            ]}
                                        >
                                            {cam.camera_name}
                                        </AppText>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : null}

                    {/* Active Camera Video Preview Box */}
                    <View style={styles.playerContainer}>
                        {activeCamera ? (
                            isPlaying ? (
                                renderPlayer()
                            ) : (
                                <TouchableOpacity
                                    style={styles.playerTouchable}
                                    activeOpacity={0.9}
                                    onPress={handlePlayStream}
                                >
                                    <View style={styles.playerImage}>
                                        <CachedImage
                                            uri={activeCamera.thumbnail__poster?.url}
                                            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                                            contentFit="cover"
                                        />
                                        <View style={[StyleSheet.absoluteFill, styles.playerOverlay]}>
                                            <Ionicons name="play-circle" size={64} color="rgba(255, 255, 255, 0.85)" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )
                        ) : (
                            <View style={[styles.playerImage, styles.playerPlaceholder, { borderRadius: 16 }]}>
                                <Ionicons name="videocam-off-outline" size={48} color="#CCCCCC" />
                                <AppText style={styles.noCameraText}>No active live cameras available.</AppText>
                            </View>
                        )}
                    </View>

                    {/* Stream Notes and Quality details */}
                    <View style={styles.detailsContainer}>
                        {activeCamera?.description ? (
                            <AppText style={styles.cameraDescription}>
                                {activeCamera.description.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                            </AppText>
                        ) : null}

                        {/* General/Global Live Camera Instructions */}
                        {isConnected === false && liveCamSettingsData?.offline_message ? (
                            <AppText style={styles.infoText}>
                                {liveCamSettingsData.offline_message}
                            </AppText>
                        ) : null}

                        {liveCamSettingsData?.quality_note ? (
                            <AppText style={styles.noteText}>
                                {liveCamSettingsData.quality_note.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                            </AppText>
                        ) : null}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
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
        fontFamily: "Lexend_500Medium",
        fontWeight: "500",
        fontSize: 18,
        color: colors.onSurface,
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
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    tabButtonActive: {
        backgroundColor: "#D1D1D6",
        borderColor: "#C7C7CC",
    },
    tabButtonText: {
        fontFamily: "Lexend_500Medium",
        fontWeight: "500",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: "#8E8E93",
    },
    tabButtonTextActive: {
        color: colors.onSurface,
    },
    playerContainer: {
        marginHorizontal: 16,
        height: 200,
        borderRadius: 16,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
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
        fontFamily: "Lexend_500Medium",
        fontWeight: "500",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: "#8E8E93",
        textAlign: "center",
    },
    detailsContainer: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    cameraDescription: {
        fontFamily: "Lexend_500Medium",
        fontWeight: "500",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: colors.onSurface,
        marginBottom: 12,
    },
    infoText: {
        fontFamily: "Lexend_500Medium",
        fontWeight: "500",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: colors.onSurface,
        textAlign: "justify",
        marginBottom: 16,
    },
    noteText: {
        fontFamily: "Lexend_500Medium",
        fontWeight: "500",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: "#8E8E93",
        fontStyle: "italic",
    },
});
