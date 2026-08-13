import AppText from "@/src/components/AppText";
import ImageGallerySlider from "@/src/components/ImageGallerySlider";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import SectionHeader from "@/src/components/SectionHeader";
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from "expo-image";
import React from "react";
import {
    ActivityIndicator,
    StatusBar,
    StyleSheet,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';

const systemFonts = [...defaultSystemFonts, 'OpenSans-Regular', 'OpenSans-Bold', 'OpenSans-Light', 'Roboto-Regular', 'Roboto-Bold'];
import { SafeAreaView } from "react-native-safe-area-context";

import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const getDashiconMapping = (dashicon: string) => {
    switch (dashicon) {
        case 'dashicons-yes': return 'check';
        case 'dashicons-yes-alt': return 'check-circle';
        case 'dashicons-info': return 'info-circle';
        case 'dashicons-warning': return 'exclamation-triangle';
        case 'dashicons-location': return 'map-marker-alt';
        case 'dashicons-calendar-alt': return 'calendar-alt';
        case 'dashicons-camera': return 'camera';
        case 'dashicons-images-alt2': return 'images';
        case 'dashicons-sos': return 'life-ring';
        default: return 'circle';
    }
};

export default function PlanTripScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, planTripData, apiStatus } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const title = planTripData?.screen_title;
    const intro = planTripData?.intro_paragraph;

    // Check if hero_image is an ACF image array/object or just a string URL
    let heroImageUrl = null;
    if (planTripData?.hero_image) {
        if (typeof planTripData.hero_image === 'string') {
            heroImageUrl = planTripData.hero_image;
        } else if (typeof planTripData.hero_image === 'object' && planTripData.hero_image.url) {
            heroImageUrl = planTripData.hero_image.url;
        }
    }

    const galleryImages = React.useMemo(() => {
        const gallery = planTripData?.image_gallery;
        if (!gallery || !Array.isArray(gallery)) return [];
        return gallery.map((img: any) => img?.url).filter(Boolean);
    }, [planTripData?.image_gallery]);

    const sections = planTripData?.content_sections || [];
    const activeSections = sections.filter((sec: Record<string, unknown>) => {
        // Handle active flag checking flexibly (could be string "1", boolean true, etc.)
        const actVal = sec?.section_active;
        return actVal === undefined || actVal === true || actVal === "1" || actVal === "true" || actVal === "";
    });

    // Sort by sort_order if available
    activeSections.sort((a: any, b: any) => {
        const orderA = parseInt(a.sort_order, 10) || 0;
        const orderB = parseInt(b.sort_order, 10) || 0;
        return orderA - orderB;
    });

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View>
                        <Navbar />
                        <QuickLinks />
                    </View>

                    {isValidData(title) ? (
                        <View >
                            <SectionHeader
                                title={title as string}
                                iconSource={require("../../assets/images/mapicon.png")}
                                primaryColor={primaryColor || "#000000"}
                                secondaryColor={secondaryColor || "#ea0b0b"}
                                isDark={isDark}
                                isFeatured={true}
                            />
                        </View>
                    ) : null}
                    {isValidData(heroImageUrl) ? (
                        <Animated.View entering={FadeInUp.duration(200)} style={styles.imageContainer}>
                            <Image
                                source={{ uri: heroImageUrl }}
                                style={styles.bannerImage}
                                contentFit="cover"
                            />
                        </Animated.View>
                    ) : null}

                    {isValidData(intro) ? (
                        <Animated.View entering={FadeInUp.duration(200).delay(40)} style={styles.introContainer}>
                            <RenderHTML systemFonts={systemFonts}
                                contentWidth={width - 32}
                                source={{ html: intro || "" }}
                                baseStyle={{
                                    fontSize: 14,
                                    color: colors.onSurface,
                                    lineHeight: 20,
                                    fontWeight: "500",
                                }}
                                tagsStyles={{ p: { marginVertical: 4 } }}
                            />
                        </Animated.View>
                    ) : null}

                    {galleryImages.length > 0 ? (
                        <Animated.View entering={FadeInUp.duration(200).delay(60)} style={{ marginHorizontal: 16, marginBottom: 24, alignItems: 'center' }}>
                            <ImageGallerySlider images={galleryImages} width={width - 32} height={190} />
                        </Animated.View>
                    ) : null}

                    {isValidData(activeSections) ? (
                        activeSections.map((sec: any, index: number) => {
                            if (!isValidData(sec.section_heading) && !isValidData(sec.section_body)) return null;
                            const iconUrl = sec.section_icon?.url;
                            return (
                                <Animated.View key={index} entering={FadeInUp.duration(200).delay(Math.min(index * 15 + 80, 160))}>
                                    <View style={[styles.sectionCard, { borderBottomColor: secondaryColor || "#ea0b0b", borderBottomWidth: index === activeSections.length - 1 ? 0 : 1 }]}>
                                        {(isValidData(sec.section_heading) || isValidData(iconUrl)) ? (
                                            <View style={styles.sectionHeader}>
                                                {isValidData(iconUrl) ? (
                                                    iconUrl.startsWith('dashicons-') ? (
                                                        <FontAwesome5
                                                            name={getDashiconMapping(iconUrl)}
                                                            size={20}
                                                            color={primaryColor || colors.onSurface}
                                                            style={styles.sectionIconImg}
                                                        />
                                                    ) : (
                                                        <Image source={{ uri: iconUrl }} style={styles.sectionIconImg} contentFit="contain" />
                                                    )
                                                ) : null}
                                                {isValidData(sec.section_heading) ? (
                                                    <AppText style={styles.sectionHeading}>{sec.section_heading}</AppText>
                                                ) : null}
                                            </View>
                                        ) : null}
                                        {isValidData(sec.section_body) ? (
                                            <RenderHTML systemFonts={systemFonts}
                                                contentWidth={width - 32}
                                                source={{ html: sec.section_body as string }}
                                                baseStyle={{
                                                    fontFamily: 'OpenSans-Regular',
                                                    fontWeight: '400',
                                                    fontStyle: 'normal',
                                                    fontSize: 13,
                                                    color: colors.onSurface,
                                                    lineHeight: 20,
                                                    letterSpacing: 0,
                                                }}
                                                tagsStyles={{ p: { marginVertical: 4 } }}
                                            />
                                        ) : null}
                                    </View>
                                </Animated.View>
                            );
                        })
                    ) : (
                        <AppText style={styles.emptyText}>Trip planning info coming soon.</AppText>
                    )}
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
    headerIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imageContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    bannerImage: {
        width: "100%",
        height: 160,
        borderRadius: 8,
        backgroundColor: colors.outlineVariant,
    },
    introContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    introText: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 20,
        fontWeight: "500",
    },
    sectionCard: {
        borderBottomWidth: 1,
        marginHorizontal: 16,
        marginBottom: 16,
        paddingBottom: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionIconImg: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    sectionIconPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    sectionHeading: {
        fontFamily: 'OpenSans-Bold',
        fontWeight: '700',
        fontStyle: 'normal',
        fontSize: 16,
        lineHeight: 20,
        letterSpacing: 0,
        color: colors.onSurface,
        flex: 1,
    },
    sectionBody: {
        fontSize: 13,
        color: colors.onSurface,
        lineHeight: 18,
    },
    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
