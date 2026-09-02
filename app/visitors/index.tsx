import AppRenderHTML from "@/src/components/AppRenderHTML";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

import CachedImage from "@/src/components/CachedImage";
import SkeletonPlaceholder from "@/src/components/SkeletonPlaceholder";
import { openExternalLink } from "@/src/utils/openLink";
import { handleLinkPress } from "@/src/utils/linkUtils";

import PrimaryButton from "@/src/components/PrimaryButton";
import { extractPoiId, navigateToPoi } from "@/src/utils/mapUtils";

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

    const poiId = React.useMemo(() => {
        return extractPoiId(visitorsData?.map_poi_link);
    }, [visitorsData?.map_poi_link]);

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

    const handleOpenLink = (url: string | undefined, title?: string) => {
        if (!url) return;
        handleLinkPress(url, router, title);
    };

    const parsedHours = React.useMemo(() => {
        const raw = visitorsData?.hours_of_operation;
        if (!raw) return null;
        if (Array.isArray(raw)) return raw.length > 0 ? raw : null;
        if (typeof raw === 'string') {
            const str = raw.trim();
            if (!str || str === 'undefined' || str === 'null') return null;
            if (str.startsWith('[') || str.startsWith('{')) {
                try {
                    const parsed = JSON.parse(str);
                    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null;
                    if (parsed && typeof parsed === 'object') return [parsed];
                } catch {
                    // Fallthrough to plain string
                }
            }
            return isValidData(str) ? str : null;
        }
        return null;
    }, [visitorsData?.hours_of_operation]);

    const hasCta1 = isValidData(visitorsData?.cta_1_title) || isValidData(visitorsData?.cta_1_link?.title) || isValidData(visitorsData?.cta_1_image?.url);
    const hasCta2 = isValidData(visitorsData?.cta_2_title) || isValidData(visitorsData?.cta_2_link?.title) || isValidData(visitorsData?.cta_2_image?.url);
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
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
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

                    {/* Image Gallery Slider with Get Directions Overlay */}
                    {isValidData(images) ? (
                        <View style={{ marginHorizontal: 16, position: 'relative' }}>
                            <ImageGallerySlider images={images} width={CAROUSEL_WIDTH} height={190} />
                            {poiId !== null ? (
                                <View style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 25 }}>
                                    <PrimaryButton
                                        title="Get Directions"
                                        onPress={() => navigateToPoi(router, poiId)}
                                    />
                                </View>
                            ) : null}
                        </View>
                    ) : (
                        poiId !== null ? (
                            <View style={{ marginTop: 16, marginHorizontal: 16, alignItems: 'flex-start' }}>
                                <PrimaryButton
                                    title="Get Directions"
                                    onPress={() => navigateToPoi(router, poiId)}
                                />
                            </View>
                        ) : null
                    )}

                    {/* Call to Actions (CTA) Cards */}
                    {(hasCta1 || hasCta2) ? (
                        <View
                            style={[styles.ctaContainer, { justifyContent: hasBothCtas ? "space-between" : "center" }]}
                        >
                            {/* CTA 1 */}
                            {hasCta1 ? (
                                <TouchableOpacity
                                    style={[styles.ctaCard, hasBothCtas ? { flex: 1 } : { flex: 0, width: "48%" }]}
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        if (isValidData(visitorsData?.cta_1_link?.url)) {
                                            handleOpenLink(visitorsData?.cta_1_link?.url, visitorsData?.cta_1_title || visitorsData?.cta_1_link?.title);
                                        } else if (isValidData(visitorsData?.phone_number)) {
                                            handleOpenLink(`tel:${visitorsData?.phone_number}`);
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
                                        {isValidData(visitorsData?.cta_1_title) ? (
                                            <AppText style={[styles.ctaTitle, secondaryColor ? { color: isDark ? "#FFFFFF" : secondaryColor } : undefined]} numberOfLines={1}>
                                                {visitorsData?.cta_1_title}
                                            </AppText>
                                        ) : null}
                                        {isValidData(visitorsData?.cta_1_link?.title) ? (
                                            <AppText style={[styles.ctaSubtitle, bgColor ? { color: isDark ? colors.onSurfaceVariant : bgColor } : undefined]} numberOfLines={1}>
                                                {visitorsData?.cta_1_link?.title}
                                            </AppText>
                                        ) : null}
                                    </View>
                                    {cta1Loading && <SkeletonPlaceholder style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />}
                                </TouchableOpacity>
                            ) : null}

                            {/* CTA 2 */}
                            {hasCta2 ? (
                                <TouchableOpacity
                                    style={[styles.ctaCard, hasBothCtas ? { flex: 1 } : { flex: 0, width: "48%" }]}
                                    activeOpacity={0.9}
                                    onPress={() => handleOpenLink(visitorsData?.cta_2_link?.url, visitorsData?.cta_2_title || visitorsData?.cta_2_link?.title)}
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
                                        {isValidData(visitorsData?.cta_2_title) ? (
                                            <AppText style={[styles.ctaTitle, secondaryColor ? { color: isDark ? "#FFFFFF" : secondaryColor } : undefined]} numberOfLines={1}>
                                                {visitorsData?.cta_2_title}
                                            </AppText>
                                        ) : null}
                                        {isValidData(visitorsData?.cta_2_link?.title) ? (
                                            <AppText style={[styles.ctaSubtitle, bgColor ? { color: isDark ? colors.onSurfaceVariant : bgColor } : undefined]} numberOfLines={1}>
                                                {visitorsData?.cta_2_link?.title}
                                            </AppText>
                                        ) : null}
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
                        <View style={{ marginHorizontal: 16, marginTop: isValidData(visitorsData?.address) ? 8 : 24 }}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => handleOpenLink(`tel:${visitorsData?.phone_number}`)}
                                style={{ flexDirection: 'row', alignItems: 'flex-end' }}
                            >
                                <Ionicons
                                    name="call-outline"
                                    size={20}
                                    color={isDark ? colors.onSurface : (secondaryColor || bgColor || colors.onSurface)}
                                    style={{ marginRight: 8, marginTop: 0 }}
                                />
                                <AppText style={styles.phoneText}>
                                    {visitorsData?.phone_number}
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Hours of Operation Section (Mobile Table View) */}
                    {parsedHours ? (
                        <View style={{ marginHorizontal: 16, marginTop: (isValidData(visitorsData?.phone_number) || isValidData(visitorsData?.address)) ? 8 : 24 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Ionicons name="time-outline" size={20} color={isDark ? colors.onSurface : (secondaryColor || bgColor || colors.onSurface)} style={{ marginRight: 8, marginTop: 2 }} />
                                <AppText style={{ fontFamily: 'OpenSans-Bold', fontSize: 16, color: colors.onSurface }}>
                                    Hours of Operation
                                </AppText>
                            </View>

                            {Array.isArray(parsedHours) ? (
                                <View
                                    style={{
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 1,
                                    }}
                                >
                                    {/* Table Data Rows */}
                                    {parsedHours.map((item: any, idx: number) => {
                                        const dayStr = typeof item === 'object' ? (item.day || item.days || item.title || "") : String(item);
                                        const hoursStr = typeof item === 'object' ? (item.hours || item.time || "") : "";
                                        const isLast = idx === parsedHours.length - 1;
                                        const isEven = idx % 2 === 0;

                                        return (
                                            <View
                                                key={idx}
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 14,
                                                    backgroundColor: isEven
                                                        ? (isDark ? 'transparent' : '#FFFFFF')
                                                        : (isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
                                                    borderBottomWidth: isLast ? 0 : 1,
                                                    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                                                }}
                                            >
                                                <AppText
                                                    style={{
                                                        fontFamily: 'OpenSans-Regular',
                                                        fontSize: 14,
                                                        color: colors.onSurface,
                                                        flex: 1,
                                                        paddingRight: 12,
                                                    }}
                                                >
                                                    {dayStr}
                                                </AppText>
                                                {hoursStr ? (
                                                    <View
                                                        style={{
                                                            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : (secondaryColor ? `${secondaryColor}15` : '#EFF6FF'),
                                                            paddingVertical: 4,
                                                            paddingHorizontal: 10,
                                                            borderRadius: 20,
                                                        }}
                                                    >
                                                        <AppText
                                                            style={{
                                                                fontFamily: 'OpenSans-Bold',
                                                                fontSize: 12,
                                                                color: isDark ? '#FFFFFF' : (secondaryColor || '#1E40AF'),
                                                            }}
                                                        >
                                                            {hoursStr}
                                                        </AppText>
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View
                                    style={{
                                        borderRadius: 12,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                                    }}
                                >
                                    <AppText style={{ fontFamily: 'OpenSans-Regular', fontSize: 14, color: colors.onSurface }}>
                                        {String(parsedHours)}
                                    </AppText>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Body Copy Section */}
                    {isValidData(visitorsData?.body_copy) ? (
                        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
                            <AppRenderHTML
                                html={visitorsData?.body_copy || ""}
                                contentWidth={width - 32}
                                baseStyle={{
                                    fontFamily: 'OpenSans-Regular',
                                    fontSize: 14,
                                    color: colors.onSurface,
                                    lineHeight: 20,
                                    letterSpacing: 0,
                                    textAlign: "left",
                                }}
                            />
                        </View>
                    ) : null}
                </Animated.ScrollView>
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
        fontSize: 12,
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
        fontSize: 16,
        lineHeight: 18,
        letterSpacing: 0,
        color: colors.onSurface,
    },
    bodyCopy: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 18,
        marginHorizontal: 16,
        marginTop: 24,
        textAlign: "left",
    },
});
