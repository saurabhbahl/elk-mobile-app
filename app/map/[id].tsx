import AppText from "@/src/components/AppText";
import CachedImage from "@/src/components/CachedImage";
import ImageGallerySlider from "@/src/components/ImageGallerySlider";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import PrimaryButton from "@/src/components/PrimaryButton";
import SectionHeader from "@/src/components/SectionHeader";
import { openExternalLink } from "@/src/utils/openLink";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { StyleSheet, TouchableOpacity, View, Pressable, ScrollView } from "react-native";
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";

import Animated, { FadeInUp } from "react-native-reanimated";
import { width as windowWidth } from "../../src/constants/theme";
import { useTheme } from "../../src/context/ThemeContext";
import { useAppContent } from "../../src/contexts/AppContentContext";
import { normalizeHex } from "../../src/utils/colorUtils";
import { isValidData } from "../../src/utils/validation";

export default function WaypointDetailsScreen() {
    const { id } = useLocalSearchParams();
    const { colors, fonts, isDark } = useTheme();
    const { poisData, brandData } = useAppContent();
    const brandPrimary = normalizeHex(brandData?.brand_color_primary);
    const brandSecondary = normalizeHex(brandData?.brand_color__secondary);

    const waypoints = poisData || [];



    const waypoint = useMemo(() => {
        const numericId = parseInt(String(id), 10);
        return waypoints.find(w => w.id === numericId);
    }, [id, waypoints]);

    const handleGetDirections = () => {
        if (!waypoint) return;
        router.push({
            pathname: '/map',
            params: { routeToWaypointId: waypoint.id, navRequestId: Date.now().toString() }
        });
    };

    if (!waypoint) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>

                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color={colors.error} />
                    <AppText style={[styles.errorText, { fontFamily: fonts.bodyMedium }]}>Viewing area not found.</AppText>
                    <TouchableOpacity style={[styles.backButton, { backgroundColor: brandPrimary || colors.primary }]} onPress={() => router.back()}>
                        <AppText style={[styles.backButtonText, { color: colors.onPrimary, fontFamily: fonts.bodyBold }]}>Go Back</AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }


    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.surface }]}
            edges={["left", "right"]}
        >
            <Animated.View entering={FadeInUp.duration(200)} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header outside the Pressable */}
                    <View style={{ marginHorizontal: -20, marginTop: -16, overflow: 'hidden' }}>
                        <Navbar />
                        <QuickLinks />
                    </View>

                    <View style={{ flex: 1 }}>
                    {/* Title */}
                    {isValidData(waypoint.title) ? (
                        <SectionHeader
                            title={waypoint.title as string}
                            iconSource={require("../../assets/images/mapicon.png")}
                            primaryColor={brandPrimary || "#000000"}
                            secondaryColor={brandSecondary || "#ea0b0b"}
                            isDark={isDark}
                            style={{ marginHorizontal: 0, marginBottom: 16 }}
                        />
                    ) : null}

                    {/* Featured Image / Gallery */}
                    {(() => {
                        const sliderImages: string[] = [];

                        if (isValidData(waypoint.featured_image)) {
                            const featuredUrl = typeof waypoint.featured_image === 'string' ? waypoint.featured_image : (waypoint.featured_image as any).url || (waypoint.featured_image as any).sizes?.large;
                            if (featuredUrl) sliderImages.push(featuredUrl);
                        }

                        if (isValidData(waypoint.image_gallery) && Array.isArray(waypoint.image_gallery)) {
                            waypoint.image_gallery.forEach((img: any) => {
                                const url = typeof img === 'string' ? img : img.url || img.sizes?.large;
                                if (url && !sliderImages.includes(url)) sliderImages.push(url);
                            });
                        }

                        if (sliderImages.length === 0) return null;

                        if (sliderImages.length === 1) {
                            return (
                                <View style={[styles.imageSliderContainer, { height: undefined, aspectRatio: 4 / 3 }]}>
                                    <CachedImage
                                        uri={sliderImages[0]}
                                        style={{ width: "100%", height: "100%" }}
                                        contentFit="cover"
                                    />
                                </View>
                            );
                        }

                        return (
                            <View style={{ marginBottom: 20 }}>
                                <ImageGallerySlider
                                    images={sliderImages}
                                    width={windowWidth - 40}
                                    height={220}
                                />
                            </View>
                        );
                    })()}

                    {/* Location Address & Get Directions Section */}
                    <View style={styles.locationSection}>
                        {isValidData(waypoint.address) ? (
                            <View style={styles.addressContainer}>
                                <AppText style={[styles.addressText, { fontFamily: 'OpenSans-Bold', color: isDark ? '#fff' : '#000' }]}>
                                    {waypoint.address}
                                </AppText>
                            </View>
                        ) : null}
                        {isValidData(waypoint.latitude) && isValidData(waypoint.longitude) ? (
                            <PrimaryButton
                                title="Get Directions"
                                onPress={handleGetDirections}
                            />
                        ) : null}
                    </View>

                    {/* Badges Section */}
                    {(waypoint.handicap_accessible || waypoint.open_year_round) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24, flexWrap: 'nowrap' }}>
                            {waypoint.handicap_accessible ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                                    <Image
                                        source={require("../../assets/images/wheelchair.png")}
                                        style={{ width: 16, height: 16, marginRight: 6, tintColor: isDark ? '#fff' : '#000' }}
                                        contentFit="contain"
                                    />
                                    <AppText style={[styles.badgeText, { fontFamily: 'OpenSans-SemiBold', fontSize: 11, color: isDark ? '#fff' : '#000' }]}>
                                        Handicap Accessible
                                    </AppText>
                                </View>
                            ) : null}
                            {waypoint.open_year_round ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Image
                                        source={require("../../assets/images/calendar-check.png")}
                                        style={{ width: 16, height: 16, marginRight: 6, tintColor: isDark ? '#fff' : '#000' }}
                                        contentFit="contain"
                                    />
                                    <AppText style={[styles.badgeText, { fontFamily: 'OpenSans-SemiBold', fontSize: 11, color: isDark ? '#fff' : '#000' }]}>
                                        Open Year Round
                                    </AppText>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {/* Description Paragraph */}
                    {isValidData(waypoint.full_description || waypoint.description) ? (
                        <RenderHTML
                            contentWidth={windowWidth - 40}
                            source={{ html: waypoint.full_description || waypoint.description }}
                            baseStyle={{
                                fontFamily: 'OpenSans-Regular',
                                fontSize: 13,
                                lineHeight: 20,
                                color: isDark ? colors.onSurfaceVariant : "#000000",
                                marginBottom: 16
                            }}
                            tagsStyles={{ p: { marginVertical: 8 } }}
                        />
                    ) : null}

                    {/* Seasonal Notes */}
                    {/* isValidData(waypoint.seasonal_notes) ? (
                        <View style={[styles.cautionContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF3E0', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFE0B2' }]}>
                            <MaterialIcons name="info-outline" size={20} color={colors.tertiary} style={{ marginRight: 8, marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <RenderHTML
                                    contentWidth={windowWidth - 40 - 24 - 28} // padding 20*2 + container padding 12*2 + icon 28
                                    source={{ html: waypoint.seasonal_notes || "" }}
                                    baseStyle={{
                                        fontFamily: 'OpenSans-SemiBold',
                                        fontSize: 12,
                                        color: isDark ? colors.onSurface : '#000',
                                        lineHeight: 18
                                    }}
                                    tagsStyles={{ p: { margin: 0, padding: 0 } }}
                                />
                            </View>
                        </View>
                    ) : null */}

                    {/* External Link */}
                    {/* isValidData(waypoint.external_link) ? (
                        (() => {
                            const linkUrl = typeof waypoint.external_link === 'string' ? waypoint.external_link : (waypoint.external_link as any)?.url;
                            const linkTitle = typeof waypoint.external_link === 'string' ? 'More Info' : (waypoint.external_link as any)?.title;
                            if (!isValidData(linkUrl)) return null;

                            return (
                                <TouchableOpacity
                                    style={[styles.externalLinkButton, { backgroundColor: isDark ? colors.surfaceVariant : '#F5F5F5' }]}
                                    onPress={() => openExternalLink(linkUrl)}
                                    activeOpacity={0.8}
                                >
                                    {isValidData(linkTitle) ? (
                                        <AppText style={[styles.externalLinkText, { fontFamily: 'OpenSans-Bold', color: isDark ? colors.onSurface : '#000' }]}>
                                            {linkTitle}
                                        </AppText>
                                    ) : null}
                                    <MaterialIcons name="open-in-new" size={18} color={isDark ? colors.onSurface : '#000'} style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            );
                        })()
                    ) : null */}
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 140, // Increased to avoid hiding behind the BottomNavbar
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    titleIcon: {
        marginRight: 6,
    },
    titleText: {
        fontSize: 18,
        color: "#000000",
        flex: 1,
    },
    imageSliderContainer: {
        width: "100%",
        height: 220,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20,
    },
    imagePlaceholder: {
        flex: 1,
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    crossedLinesContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    diagonalLineLeft: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#CCCCCC",
        transform: [{ skewX: "45deg" }],
    },
    diagonalLineRight: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#CCCCCC",
        transform: [{ skewX: "-45deg" }],
    },
    sliderArrow: {
        position: "absolute",
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    arrowLeft: {
        left: 12,
    },
    arrowRight: {
        right: 12,
    },
    locationSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    addressContainer: {
        flex: 1,
        marginRight: 16,
    },
    addressText: {
        fontSize: 13,
        color: "#000000",
        lineHeight: 18,
    },

    badgesSection: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 20,
    },
    badgeItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    badgeIcon: {
        marginRight: 6,
    },
    badgeText: {
        fontSize: 11,
        color: "#000000",
    },
    descriptionText: {
        fontSize: 13,
        lineHeight: 20,
    },
    cautionContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    cautionText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    externalLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 8,
    },
    externalLinkText: {
        fontSize: 13,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    errorText: {
        fontSize: 15,
        marginTop: 16,
        marginBottom: 24,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 8,
    },
    backButtonText: {
        fontSize: 13,
    },
});
