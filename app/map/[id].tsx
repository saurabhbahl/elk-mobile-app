import AppText from "@/components/AppText";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";
import { openExternalLink } from "@/utils/openLink";
import CachedImage from "@/components/CachedImage";

import { useTheme } from "../../context/ThemeContext";
import { useAppContent } from "../../contexts/AppContentContext";
import { normalizeHex } from "../../utils/colorUtils";

const { width: windowWidth } = Dimensions.get("window");

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
        const { latitude, longitude } = waypoint.coordinate;
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        openExternalLink(url, "An active internet connection is required to get directions.");
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
            
            

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.titleContainer}>
                    <Image
                        source={require("../../assets/images/pin.png")}
                        style={{ width: 24, height: 24, marginRight: 6, tintColor: isDark ? '#fff' : '#000' }}
                        contentFit="contain"
                    />
                    <AppText style={[styles.titleText, { fontFamily: fonts.bodyBold, color: isDark ? '#fff' : (brandPrimary || '') }]}>
                        {waypoint.title}
                    </AppText>
                </View>

                {/* Featured Image / Gallery */}
                {waypoint.image_gallery && Array.isArray(waypoint.image_gallery) && waypoint.image_gallery.length > 0 ? (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageSliderContainer}>
                        {waypoint.image_gallery.map((img: any, idx: number) => (
                            <CachedImage
                                key={idx}
                                uri={typeof img === 'string' ? img : img.url || img.sizes?.large}
                                style={{ width: windowWidth - 40, height: 220 }}
                                contentFit="cover"
                            />
                        ))}
                    </ScrollView>
                ) : waypoint.featured_image ? (
                    <View style={styles.imageSliderContainer}>
                        <CachedImage
                            uri={typeof waypoint.featured_image === 'string' ? waypoint.featured_image : waypoint.featured_image.url || waypoint.featured_image.sizes?.large}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                        />
                    </View>
                ) : null}

                {/* Location Address & Get Directions Section */}
                <View style={styles.locationSection}>
                    {waypoint.address ? (
                        <View style={styles.addressContainer}>
                            <AppText style={[styles.addressText, { fontFamily: fonts.bodyBold, color: isDark ? '#fff' : '#000' }]}>
                                {waypoint.address}
                            </AppText>
                        </View>
                    ) : <View style={styles.addressContainer} />}
                    <TouchableOpacity style={[styles.getDirectionsButton, brandPrimary ? { backgroundColor: brandPrimary } : {}]} onPress={handleGetDirections} activeOpacity={0.8}>
                        <AppText style={[styles.getDirectionsButtonText, { fontFamily: fonts.bodyBold }, brandSecondary ? { color: brandSecondary } : {}]}>
                            Get Directions
                        </AppText>
                    </TouchableOpacity>
                </View>

                {/* Badges Section */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24, flexWrap: 'nowrap' }}>
                    {waypoint.handicap_accessible ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                            <Image
                                source={require("../../assets/images/wheelchair.png")}
                                style={{ width: 16, height: 16, marginRight: 6, tintColor: isDark ? '#fff' : '#000' }}
                                contentFit="contain"
                            />
                            <AppText style={[styles.badgeText, { fontFamily: fonts.bodyMedium, fontSize: 11, color: isDark ? '#fff' : '#000' }]}>
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
                            <AppText style={[styles.badgeText, { fontFamily: fonts.bodyMedium, fontSize: 11, color: isDark ? '#fff' : '#000' }]}>
                                Open Year Round
                            </AppText>
                        </View>
                    ) : null}
                </View>

                {/* Description Paragraph */}
                {(waypoint.full_description || waypoint.description) ? (
                    <RenderHTML
                        contentWidth={windowWidth - 40}
                        source={{ html: waypoint.full_description || waypoint.description }}
                        baseStyle={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            lineHeight: 20,
                            color: isDark ? colors.onSurfaceVariant : "#000000",
                            marginBottom: 16
                        }}
                        tagsStyles={{ p: { marginVertical: 8 } }}
                    />
                ) : null}

                {/* Seasonal Notes */}
                {waypoint.seasonal_notes ? (
                    <View style={[styles.cautionContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF3E0', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFE0B2' }]}>
                        <MaterialIcons name="info-outline" size={20} color={colors.tertiary} style={{ marginRight: 8, marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <RenderHTML
                                contentWidth={windowWidth - 40 - 24 - 28} // padding 20*2 + container padding 12*2 + icon 28
                                source={{ html: waypoint.seasonal_notes }}
                                baseStyle={{
                                    fontFamily: fonts.bodyMedium,
                                    fontSize: 12,
                                    color: isDark ? colors.onSurface : '#000',
                                    lineHeight: 18
                                }}
                                tagsStyles={{ p: { margin: 0, padding: 0 } }}
                            />
                        </View>
                    </View>
                ) : null}

                {/* External Link */}
                {waypoint.external_link ? (
                    <TouchableOpacity
                        style={[styles.externalLinkButton, { backgroundColor: isDark ? colors.surfaceVariant : '#F5F5F5' }]}
                        onPress={() => openExternalLink(typeof waypoint.external_link === 'string' ? waypoint.external_link : waypoint.external_link.url)}
                        activeOpacity={0.8}
                    >
                        <AppText style={[styles.externalLinkText, { fontFamily: fonts.bodyBold, color: isDark ? colors.onSurface : '#000' }]}>
                            {typeof waypoint.external_link === 'string' ? 'More Info' : waypoint.external_link.title || ""}
                        </AppText>
                        <MaterialIcons name="open-in-new" size={18} color={isDark ? colors.onSurface : '#000'} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                ) : null}
            </ScrollView>
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
        paddingBottom: 40,
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
    getDirectionsButton: {
        backgroundColor: "#ECEEED",
        borderRadius: 99,
        paddingVertical: 10,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    getDirectionsButtonText: {
        fontSize: 13,
        color: "#000000",
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
