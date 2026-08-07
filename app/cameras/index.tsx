import AppText from "@/src/components/AppText";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { Ionicons } from "@expo/vector-icons";
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
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import CachedImage from "@/src/components/CachedImage";
import SectionHeader from "@/src/components/SectionHeader";
import { STREAM_TYPES } from "@/src/constants/streamTypes";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { CamerasData, useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";
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
        <VideoView style={{ flex: 1, width: "100%", height: "100%" }} player={player} allowsPictureInPicture />
    );
}

export default function LiveCameraScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, camerasData, liveCamSettingsData, apiStatus } = useAppContentData();
    const bgColor = getValidColor(brandData?.brand_color_primary);
    const secColor = getValidColor(brandData?.brand_color__secondary);
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark, bgColor as string, secColor as string), [colors, fonts, isDark, bgColor, secColor]);

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

    const handleWebViewNavigation = (event: any) => {
        if (event.url.includes("youtube.com") && !event.url.includes("/embed/")) {
            Linking.openURL(event.url).catch(err => console.error("Couldn't open YouTube link", err));
            return false;
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
                            baseUrl: process.env.EXPO_PUBLIC_SITE_URL
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
            let processedStreamUrl = streamUrl;
            if (processedStreamUrl.includes('<iframe')) {
                processedStreamUrl = processedStreamUrl.replace(/src=["']([^"']+)["']/, (match: string, url: string) => {
                    let newUrl = url;
                    if (!newUrl.includes('autoplay=1')) {
                        newUrl += (newUrl.includes('?') ? '&' : '?') + 'autoplay=1';
                    }
                    if (!newUrl.includes('playsinline=1')) {
                        newUrl += '&playsinline=1';
                    }
                    return `src="${newUrl}"`;
                });
            }

            const htmlContent = processedStreamUrl.includes("<html")
                ? processedStreamUrl
                : `<html><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><body style="margin:0;padding:0;background-color:#000;display:flex;justify-content:center;align-items:center;height:100vh;">${processedStreamUrl}</body></html>`;
            return (
                <WebView
                    style={{ flex: 1, backgroundColor: "#000" }}
                    source={{
                        html: htmlContent,
                        baseUrl: process.env.EXPO_PUBLIC_SITE_URL
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

        return (
            <WebView
                style={{ flex: 1, backgroundColor: "#000" }}
                source={{ uri: streamUrl }}
                allowsFullscreenVideo={true}
            />
        );
    };

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />


            <View style={{ backgroundColor: bgColor }}>

            </View>

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={bgColor} />
                </View>
            ) : (
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    entering={FadeInUp.duration(200)}
                >
                    <View>
                        <Navbar />
                        <QuickLinks />
                    </View>
                    {/* Header Row */}
                    {isValidData(liveCamSettingsData?.screen_title) ? (
                        <View style={{ paddingHorizontal: 16 }}>
                            <SectionHeader
                                title={liveCamSettingsData?.screen_title as string}
                                iconSource={require("../../assets/images/clapperboard-play.png")}
                                primaryColor={bgColor || "#000000"}
                                secondaryColor={secColor || "#ea0b0b"}
                                isDark={isDark}
                                style={{ marginLeft: 0 }}
                            />
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
                                            isActive && { backgroundColor: secColor, borderColor: secColor },
                                        ]}
                                        onPress={() => handleTabChange(index)}
                                        activeOpacity={0.8}
                                    >
                                        <AppText
                                            style={[
                                                styles.tabButtonText,
                                                isActive && { color: "#FFFFFF" },
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
                            isConnected === false && isValidData(liveCamSettingsData?.offline_message) ? (
                                <View style={[styles.playerImage, { borderRadius: 16, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                                    <CachedImage
                                        uri={activeCamera.thumbnail__poster?.url as string}
                                        style={[StyleSheet.absoluteFill, { borderRadius: 16, opacity: 0.4 }]}
                                        contentFit="cover"
                                    />
                                    <Ionicons name="cloud-offline" size={48} color="#FFFFFF" style={{ marginBottom: 12 }} />
                                    <AppText style={[styles.noCameraText, { color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 24 }]}>
                                        {liveCamSettingsData?.offline_message}
                                    </AppText>
                                </View>
                            ) : isPlaying ? (
                                renderPlayer()
                            ) : (
                                <TouchableOpacity
                                    style={styles.playerTouchable}
                                    activeOpacity={0.9}
                                    onPress={handlePlayStream}
                                >
                                    <View style={styles.playerImage}>
                                        <CachedImage
                                            uri={activeCamera.thumbnail__poster?.url as string}
                                            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                                            contentFit="cover"

                                        />
                                        <View style={[StyleSheet.absoluteFill, styles.playerOverlay, { backgroundColor: secColor ? `${secColor}40` : 'rgba(0, 0, 0, 0.4)' }]}>
                                            <View style={{ width: 44, height: 44, borderRadius: 32, backgroundColor: '#E22B2B', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="play" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
                                            </View>
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
                    {(isValidData(activeCamera?.description) ||
                        (isConnected === false && isValidData(liveCamSettingsData?.offline_message)) ||
                        isValidData(liveCamSettingsData?.quality_note)) ? (
                        <View style={styles.detailsContainer}>
                            {isValidData(activeCamera?.description) ? (
                                <AppText style={styles.cameraDescription}>
                                    {(activeCamera.description || "").replace(/<\/?[^>]+(>|$)/g, "").trim()}
                                </AppText>
                            ) : null}

                            {isValidData(liveCamSettingsData?.quality_note) ? (
                                <AppText style={styles.cameraDescription}>
                                    {(liveCamSettingsData?.quality_note || "").replace(/<\/?[^>]+(>|$)/g, "").trim()}
                                </AppText>
                            ) : null}
                        </View>
                    ) : null}
                </Animated.ScrollView>
            )}
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, primaryColor: string, secondaryColor: string) => StyleSheet.create({
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
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "transparent",
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
        color: primaryColor,
    },
    tabButtonTextActive: {
        color: colors.onSurface,
    },
    playerContainer: {
        marginHorizontal: 16,
        height: 250,
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
        fontFamily: "OpenSans-Regular",
        fontWeight: "400",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: colors.onSurface,
        marginBottom: 12,
    },
    infoText: {
        fontFamily: "OpenSans-Regular",
        fontWeight: "400",
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0,
        color: colors.onSurface,
        textAlign: "justify",
        marginBottom: 16,
    },
});
