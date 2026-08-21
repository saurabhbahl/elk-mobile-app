import AppText from "@/src/components/AppText";
import ImageGallerySlider from "@/src/components/ImageGallerySlider";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import SectionHeader from "@/src/components/SectionHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import AppRenderHTML from "@/src/components/AppRenderHTML";
import { SafeAreaView } from "react-native-safe-area-context";

import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

import CachedImage from "@/src/components/CachedImage";
import SkeletonPlaceholder from "@/src/components/SkeletonPlaceholder";
import { openExternalLink } from "@/src/utils/openLink";

const CAROUSEL_WIDTH = width - 32;

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function VisitorsCenterScreen() {
    const { colors, fonts, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);
    const { brandData, visitorsData, apiStatus } = useAppContentData();
    const bgColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);
    const images: string[] = [];

    if (visitorsData?.hero) {
        const featureImgUrl = typeof visitorsData.hero === 'string'
            ? visitorsData.hero
            : (visitorsData.hero as any)?.url;
        if (typeof featureImgUrl === 'string') {
            images.push(featureImgUrl);
        }
    }

    if (visitorsData?.image_gallery && Array.isArray(visitorsData.image_gallery)) {
        visitorsData.image_gallery.forEach((img: any) => {
            if (img?.url) images.push(img.url);
        });
    }

    const handleOpenLink = (url: string | undefined) => {
        if (!url) return;
        if (url.startsWith("http") || url.startsWith("tel:") || url.startsWith("mailto:")) {
            openExternalLink(url);
        } else {
            router.push(url as any);
        }
    };

    const hasCta1 = isValidData(visitorsData?.cta_1_link?.title);
    const hasCta2 = isValidData(visitorsData?.cta_2_link?.title);
    const hasBothCtas = hasCta1 && hasCta2;

    const [cta1Loading, setCta1Loading] = React.useState(!!isValidData(visitorsData?.cta_1_image?.url));
    const [cta2Loading, setCta2Loading] = React.useState(!!isValidData(visitorsData?.cta_2_image?.url));

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
                <Animated.View entering={FadeInUp.duration(200)} style={{ flex: 1 }}>
                    <Animated.FlatList
                        data={[]}
                        renderItem={null}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View style={styles.scrollContent}>
                                <Navbar />
                                <QuickLinks />
                                {/* Header Row */}
                                {isValidData(visitorsData?.screen_title) ? (
                                    <View>
                                        <SectionHeader
                                            title={visitorsData?.screen_title as string}
                                            iconSource={require("../../assets/images/house-flag.png")}
                                            primaryColor={bgColor || "#000000"}
                                            secondaryColor={brandData?.brand_color_secondary || "#ea0b0b"}
                                            isDark={isDark}
                                            isFeatured={true}
                                        />
                                    </View>
                                ) : null}

                                {/* Image Gallery Slider */}
                                {isValidData(images) ? (
                                    <View style={{ marginHorizontal: 16 }}>
                                        <ImageGallerySlider images={images} width={CAROUSEL_WIDTH} height={190} />
                                    </View>
                                ) : null}

                                {/* Call to Actions (CTA) Cards */}
                                {(hasCta1 || hasCta2) ? (
                                    <View
                                        key={hasBothCtas ? "both-ctas" : "single-cta"}
                                        style={[styles.ctaContainer, { justifyContent: hasBothCtas ? "space-between" : "center" }]}
                                    >
                                        {/* CTA 1: Get Directions / Address */}
                                        {hasCta1 ? (
                                            <TouchableOpacity
                                                style={[styles.ctaCard, hasBothCtas ? { flex: 1 } : { flex: 0, width: "48%" }]}
                                                activeOpacity={0.9}
                                                onPress={() => {
                                                    if (isValidData(visitorsData?.phone_number)) {
                                                        handleOpenLink(`tel:${visitorsData?.phone_number}`);
                                                    } else {
                                                        handleOpenLink(visitorsData?.cta_1_link?.url);
                                                    }
                                                }}
                                            >
                                                <View style={styles.ctaImagePlaceholder}>
                                                    {isValidData(visitorsData?.cta_1_image?.url) ? (
                                                        <CachedImage
                                                            uri={visitorsData?.cta_1_image?.url}
                                                            style={{ width: "100%", height: "100%", aspectRatio: undefined }}
                                                            contentFit="cover"
                                                            onLoadStateChange={setCta1Loading}
                                                        />
                                                    ) : (
                                                        <Ionicons name="call-outline" size={32} color={bgColor} />
                                                    )}
                                                </View>
                                                <View style={styles.ctaContent}>
                                                    <AppText style={[styles.ctaTitle, secondaryColor ? { color: isDark ? "#FFFFFF" : secondaryColor } : undefined]} numberOfLines={1}>
                                                        {visitorsData?.cta_1_link?.title}
                                                    </AppText>
                                                    <AppText style={[styles.ctaSubtitle, bgColor ? { color: isDark ? colors.onSurfaceVariant : bgColor } : undefined]} numberOfLines={1}>
                                                        Click here to call
                                                    </AppText>
                                                </View>
                                                {cta1Loading && <SkeletonPlaceholder style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />}
                                            </TouchableOpacity>
                                        ) : null}

                                        {/* CTA 2: Call Us / Contact */}
                                        {hasCta2 ? (
                                            <TouchableOpacity
                                                style={[styles.ctaCard, hasBothCtas ? { flex: 1 } : { flex: 0, width: "48%" }]}
                                                activeOpacity={0.9}
                                                onPress={() => handleOpenLink(visitorsData?.cta_2_link?.url)}
                                            >
                                                <View style={styles.ctaImagePlaceholder}>
                                                    {isValidData(visitorsData?.cta_2_image?.url) ? (
                                                        <CachedImage
                                                            uri={visitorsData?.cta_2_image?.url}
                                                            style={{ width: "100%", height: "100%", aspectRatio: undefined }}
                                                            contentFit="cover"
                                                            onLoadStateChange={setCta2Loading}
                                                        />
                                                    ) : (
                                                        <Ionicons name="mail-outline" size={30} color={bgColor} />
                                                    )}
                                                </View>
                                                <View style={styles.ctaContent}>
                                                    <AppText style={[styles.ctaTitle, secondaryColor ? { color: isDark ? "#FFFFFF" : secondaryColor } : undefined]} numberOfLines={1}>
                                                        {visitorsData?.cta_2_link?.title}
                                                    </AppText>
                                                    <AppText style={[styles.ctaSubtitle, bgColor ? { color: isDark ? colors.onSurfaceVariant : bgColor } : undefined]} numberOfLines={1}>
                                                        Click here to email us
                                                    </AppText>
                                                </View>
                                                {cta2Loading && <SkeletonPlaceholder style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />}
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                ) : null}

                                {/* Address Section */}
                                {isValidData(visitorsData?.address) ? (
                                    <View style={{ marginHorizontal: 16, marginTop: 24 }}>
                                        <AppText style={styles.addressText}>
                                            {visitorsData?.address}
                                        </AppText>
                                    </View>
                                ) : null}

                                {/* Phone Number Section */}
                                {isValidData(visitorsData?.phone_number) ? (
                                    <View style={{ marginHorizontal: 16, marginTop: isValidData(visitorsData?.address) ? 6 : 24 }}>
                                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenLink(`tel:${visitorsData?.phone_number}`)}>
                                            <AppText style={styles.phoneText}>
                                                {visitorsData?.phone_number}
                                            </AppText>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {/* Body Copy Section */}
                                {isValidData(visitorsData?.body_copy) ? (
                                    <View style={{ marginHorizontal: 16, marginTop: (isValidData(visitorsData?.address) || isValidData(visitorsData?.phone_number)) ? 8 : 24 }}>
                                        <AppRenderHTML
                                            html={visitorsData?.body_copy || ""}
                                            contentWidth={width - 32}
                                            baseStyle={{
                                                fontFamily: 'OpenSans-Regular',
                                                fontSize: 13,
                                                color: colors.onSurface,
                                                lineHeight: 20,
                                                letterSpacing: 0,
                                                textAlign: "left",
                                            }}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        }
                    />
                </Animated.View>
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
    ctaContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 20,
        gap: 12,
    },
    ctaCard: {
        flex: 1,
        aspectRatio: 167.60337829589844 / 147.05844116210938,
        borderRadius: 12.88,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    ctaImagePlaceholder: {
        flex: 3,
        backgroundColor: colors.surfaceContainerHigh,
        justifyContent: "center",
        alignItems: "center",
    },
    ctaContent: {
        flex: 2,
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    ctaTitle: {
        fontFamily: 'OpenSans-Bold',
        fontWeight: '700',
        fontStyle: 'normal',
        fontSize: 12,
        lineHeight: 15,
        letterSpacing: 0,
        color: colors.onSurface,
    },
    ctaSubtitle: {
        fontFamily: 'OpenSans-Light',
        fontWeight: '300',
        fontStyle: 'normal',
        fontSize: 11,
        letterSpacing: 0,
        marginTop: 2,
    },
    addressText: {
        fontFamily: 'OpenSans-Bold',
        fontWeight: '700',
        fontStyle: 'normal',
        fontSize: 16,
        lineHeight: 20,
        letterSpacing: 0,
        color: colors.onSurface,
    },
    phoneText: {
        fontFamily: 'OpenSans-Bold',
        fontWeight: '700',
        fontStyle: 'normal',
        fontSize: 14,
        lineHeight: 18,
        letterSpacing: 0,
        color: colors.onSurface,
    },
    bodyCopy: {
        fontSize: 13,
        color: colors.onSurface,
        lineHeight: 18,
        marginHorizontal: 16,
        marginTop: 24,
        textAlign: "left",
    },
});
