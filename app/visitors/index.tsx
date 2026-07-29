import AppText from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import { ActivityIndicator,
    Dimensions,
    FlatList,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from 'react-native-render-html';

import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";
import { useAppContent } from "@/contexts/AppContentContext";

import { openExternalLink } from "@/utils/openLink";

const { width } = Dimensions.get("window");
const CAROUSEL_WIDTH = width - 32;

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function VisitorsCenterScreen() {
    const { colors, fonts, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);
    const { brandData, visitorsData, apiStatus } = useAppContent();
    const bgColor = getValidColor(brandData?.brand_color_primary);
    const secColor = getValidColor(brandData?.brand_color__secondary);

    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const images: string[] = [];
    if (visitorsData?.image_gallery && Array.isArray(visitorsData.image_gallery)) {
        visitorsData.image_gallery.forEach((img: Record<string, unknown>) => {
            if (img?.url) images.push(img.url);
        });
    }

    const handlePrevSlide = () => {
        if (images.length <= 1) return;
        const newIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
        setActiveIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    };

    const handleNextSlide = () => {
        if (images.length <= 1) return;
        const newIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1;
        setActiveIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    };

    const handleOpenLink = (url: string | undefined) => {
        if (!url) return;
        openExternalLink(url);
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
                    {visitorsData?.screen_title ? (
                        <View style={styles.headerRow}>
                            <Image source={require("../../assets/images/house-flag.png")} style={styles.headerIcon} contentFit="contain" />
                            <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : bgColor }]}>
                                {visitorsData?.screen_title}
                            </AppText>
                        </View>
                    ) : null}

                    {/* Image Gallery Slider */}
                    <View style={styles.carouselContainer}>
                        {images.length > 0 ? (
                            <>
                                <FlatList
                                    ref={flatListRef}
                                    data={images}
                                    keyExtractor={(item, index) => index.toString()}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={(e) => {
                                        const nextIndex = Math.round(
                                            e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH
                                        );
                                        setActiveIndex(nextIndex);
                                    }}
                                    renderItem={({ item }) => (
                                        <Image
                                            source={{ uri: item }}
                                            style={styles.carouselImage}
                                            contentFit="cover"
                                        />
                                    )}
                                />
                                {images.length > 1 && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.arrowButton, { left: 10 }]}
                                            onPress={handlePrevSlide}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="arrow-back" size={16} color="#333333" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.arrowButton, { right: 10 }]}
                                            onPress={handleNextSlide}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="arrow-forward" size={16} color="#333333" />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        ) : null}
                    </View>

                    {/* Call to Actions (CTA) Cards */}
                    <View style={styles.ctaContainer}>
                        {/* CTA 1: Get Directions / Address */}
                        <TouchableOpacity
                            style={styles.ctaCard}
                            activeOpacity={0.9}
                            onPress={() => handleOpenLink(visitorsData?.cta_1_link)}
                        >
                            <View style={styles.ctaImagePlaceholder}>
                                <Ionicons name="navigate-circle-outline" size={32} color={bgColor} />
                            </View>
                            <View style={styles.ctaContent}>
                                <AppText style={styles.ctaTitle} numberOfLines={1}>
                                    {visitorsData?.cta_1_label}
                                </AppText>
                                <AppText style={styles.ctaSubtitle} numberOfLines={1}>
                                    {visitorsData?.address}
                                </AppText>
                            </View>
                        </TouchableOpacity>

                        {/* CTA 2: Call Us / Contact */}
                        <TouchableOpacity
                            style={styles.ctaCard}
                            activeOpacity={0.9}
                            onPress={() => handleOpenLink(visitorsData?.cta_2_link)}
                        >
                            <View style={styles.ctaImagePlaceholder}>
                                <Ionicons name="call-outline" size={30} color={bgColor} />
                            </View>
                            <View style={styles.ctaContent}>
                                <AppText style={styles.ctaTitle} numberOfLines={1}>
                                    {visitorsData?.cta_2_label}
                                </AppText>
                                <AppText style={styles.ctaSubtitle} numberOfLines={1}>
                                    {visitorsData?.phone_number}
                                </AppText>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Body Copy Section */}
                    {visitorsData?.body_copy ? (
                        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
                            <RenderHTML
                                contentWidth={width - 32}
                                source={{ html: visitorsData.body_copy }}
                                baseStyle={{
                                    fontSize: 13,
                                    color: colors.onSurface,
                                    lineHeight: 18,
                                    textAlign: "justify",
                                }}
                                tagsStyles={{ p: { textAlign: "justify", marginVertical: 4 } }}
                            />
                        </View>
                    ) : null}
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
        fontSize: 18,
        fontWeight: "bold",
        color: colors.onSurface,
    },
    carouselContainer: {
        width: CAROUSEL_WIDTH,
        height: 190,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    carouselImage: {
        width: CAROUSEL_WIDTH,
        height: 190,
    },
    placeholderImage: {
        justifyContent: "center",
        alignItems: "center",
    },
    arrowButton: {
        position: "absolute",
        top: 75,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    ctaContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 20,
        gap: 12,
    },
    ctaCard: {
        flex: 1,
        height: 110,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        backgroundColor: colors.surface,
    },
    ctaImagePlaceholder: {
        flex: 3,
        backgroundColor: colors.surfaceContainerHigh,
        justifyContent: "center",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    ctaContent: {
        flex: 2,
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    ctaTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: colors.onSurface,
    },
    ctaSubtitle: {
        fontSize: 10,
        color: "#8E8E93",
        marginTop: 2,
    },
    bodyCopy: {
        fontSize: 13,
        color: colors.onSurface,
        lineHeight: 18,
        marginHorizontal: 16,
        marginTop: 24,
        textAlign: "justify",
    },
});
