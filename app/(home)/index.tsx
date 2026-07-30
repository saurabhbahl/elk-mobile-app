import AppText from "@/src/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from '@react-navigation/native';
import { Image, ImageBackground } from "expo-image";
import { Href, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/src/components/CachedImage";

// Get screen dimensions for dynamic calculations
const { width, height } = Dimensions.get("window");

import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};



// Global session variable to track if the user has dismissed the popup during this app launch
let hasDismissedPopupSession = false;

export default function HomeScreen() {
    const [showPopup, setShowPopup] = useState(false);
    const { colors, fonts, isDark } = useTheme();
    const isFocused = useIsFocused();

    const { popupData, homeData, brandData, eventsData } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    useEffect(() => {
        if (isFocused && popupData && popupData.popup_enabled && !hasDismissedPopupSession) {
            setShowPopup(true);

        }
    }, [isFocused, popupData]);

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />



            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Welcome Message */}
                {homeData?.hero_welcome_heading ? (
                    <AppText style={[styles.welcomeTitle, { color: colors.onSurface }]}>
                        {homeData.hero_welcome_heading}
                    </AppText>
                ) : null}

                {/* Welcome Banner Card */}
                <View style={styles.welcomeBannerContainer}>
                    <ImageBackground
                        source={require("../../assets/images/welcome.jpg")}
                        style={styles.welcomeBannerCard}
                        imageStyle={{ borderRadius: 10 }}
                    >
                        <View style={styles.welcomeBannerOverlay}>
                            {/* Top Right Pill Badge: About KECA */}
                            {homeData?.hero_cta_button_label ? (
                                <TouchableOpacity
                                    style={styles.aboutKecaBadge}
                                    activeOpacity={0.8}
                                    onPress={() => router.push("/visitors" as Href<string>)}
                                >
                                    <AppText style={styles.aboutKecaText}>
                                        {homeData.hero_cta_button_label}
                                    </AppText>
                                </TouchableOpacity>
                            ) : null}

                            {/* Bottom Left Text Overlay: Conserving & Enhancing... */}
                            {homeData?.hero_intro_paragraph ? (
                                <View style={styles.welcomeIntroContainer}>
                                    <RenderHTML
                                        contentWidth={width}
                                        source={{ html: homeData.hero_intro_paragraph }}
                                        baseStyle={styles.welcomeIntroText as any}
                                        tagsStyles={{
                                            p: { marginVertical: 0, padding: 0 }
                                        }}
                                    />
                                </View>
                            ) : null}
                        </View>
                    </ImageBackground>
                </View>

                {/* Elk Viewing & Scenic Map Sub-section */}
                {homeData?.map_block_heading ? (
                    <View style={styles.subSectionTitleRow}>
                        <View style={[styles.sectionIconCircle, { backgroundColor: primaryColor || "#8B1E1E" }]}>
                            <Image source={require('../../assets/images/mapicon.png')} style={styles.sectionIconImg} contentFit="contain" />
                        </View>
                        <AppText style={[styles.subSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.map_block_heading}</AppText>
                    </View>
                ) : null}

                {/* Map Card */}
                {homeData?.map_block_heading ? (
                    <View style={styles.mapCardContainer}>
                        <ImageBackground source={require("../../assets/images/map-preview.jpg")} style={styles.mapCard} imageStyle={{ borderRadius: 10.69 }}>
                            {homeData?.map_view_button_label ? (
                                <TouchableOpacity
                                    style={styles.viewMapButton}
                                    activeOpacity={0.9}
                                    onPress={() => router.push("/map" as Href<string>)}
                                >
                                    <AppText style={styles.viewMapButtonText}>{homeData.map_view_button_label}</AppText>
                                </TouchableOpacity>
                            ) : null}
                        </ImageBackground>
                    </View>
                ) : null}

                {/* Weekend Programs Section */}
                {homeData?.programs && Array.isArray(homeData.programs) && homeData.programs.length > 0 ? (
                    <>
                        {homeData?.programs_block_heading ? (
                            <View style={styles.subSectionTitleRow}>
                                <View style={[styles.sectionIconCircle, { backgroundColor: primaryColor || "#8B1E1E" }]}>
                                    <Image source={require('../../assets/images/programicon.png')} style={styles.sectionIconImg} contentFit="contain" />
                                </View>
                                <AppText style={[styles.subSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.programs_block_heading}</AppText>
                            </View>
                        ) : null}

                        {/* Horizontal Weekend Programs List */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.programsHorizontalList}
                        >
                            {homeData.programs.map((program: ProgramsData, index: number) => {
                                // Simple date badge parser
                                let badge = null;
                                const dateStr = program.schedule__dates;
                                if (dateStr) {
                                    const match = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d+)/i);
                                    if (match && match[1] && match[2]) {
                                        badge = {
                                            month: match[1].toUpperCase().slice(0, 3),
                                            day: match[2]
                                        };
                                    }
                                }

                                return (
                                    <TouchableOpacity
                                        key={program.id || index}
                                        style={styles.programCard}
                                        activeOpacity={0.85}
                                        onPress={() => router.push(`/programs` as Href<string>)}
                                    >
                                        <View style={styles.programCardImageContainer}>
                                            <CachedImage
                                                uri={program.thumbnail_image?.url}
                                                style={StyleSheet.absoluteFill}
                                                contentFit="cover"
                                            />
                                            {badge && (
                                                <View style={styles.cardBadge}>
                                                    <AppText style={styles.cardBadgeMonth}>{badge.month}</AppText>
                                                    <AppText style={styles.cardBadgeDay}>{badge.day}</AppText>
                                                </View>
                                            )}
                                        </View>

                                        <ImageBackground
                                            source={require('../../assets/images/vectors.png')}
                                            style={styles.programCardBottomSection}
                                            imageStyle={{ tintColor: '#FFFFFF', opacity: 1 }}
                                            contentFit="cover"
                                        >
                                            <View style={styles.programCardTextCol}>
                                                <AppText style={styles.programCardName} numberOfLines={1}>
                                                    {program.program_name || ""}
                                                </AppText>
                                                <AppText style={styles.cardLocation} numberOfLines={1}>
                                                    Elk Country Visitor Center
                                                </AppText>
                                            </View>

                                            <View style={styles.cardViewButton}>
                                                <AppText style={styles.cardViewButtonText}>View</AppText>
                                            </View>
                                        </ImageBackground>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </>
                ) : null}

                {/* Featured Event Section */}
                {homeData?.featured_event && Array.isArray(homeData.featured_event) && homeData.featured_event.length > 0 ? (
                    <>
                        {homeData?.event_block_heading ? (
                            <View style={styles.featuredEventHeaderRow}>
                                <View style={styles.featuredTitleContainer}>
                                    <View style={[styles.sectionIconCircle, { backgroundColor: primaryColor || "#8B1E1E" }]}>
                                        <Image source={require('../../assets/images/eventicon.png')} style={styles.sectionIconImgLg} contentFit="contain" />
                                    </View>
                                    <AppText style={[styles.featuredSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.event_block_heading}</AppText>
                                </View>
                                {homeData?.event_view_all_label ? (
                                    <TouchableOpacity onPress={() => router.push("/events" as Href<string>)}>
                                        <AppText style={[styles.viewAllEventsText, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.event_view_all_label}</AppText>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Featured Event Card */}
                        <TouchableOpacity
                            style={styles.featuredCard}
                            activeOpacity={0.85}
                            onPress={() => {
                                const eventId = homeData.featured_event[0].id;
                                const eventIndex = eventsData?.findIndex((e: EventsData) => String(e.id) === String(eventId));
                                const targetId = eventId || (eventIndex !== undefined && eventIndex !== -1 ? eventIndex : 0);
                                router.push(`/events/${targetId}` as Href<string>);
                            }}
                        >
                            <View style={styles.programCardImageContainer}>
                                <CachedImage
                                    uri={homeData.featured_event[0].thumbnail_image?.url}
                                    style={StyleSheet.absoluteFill}
                                    contentFit="cover"
                                />
                            </View>

                            <ImageBackground
                                source={require('../../assets/images/vectors.png')}
                                style={styles.programCardBottomSection}
                                imageStyle={{ opacity: 1 }}
                                contentFit="cover"
                            >
                                <View style={styles.programCardTextCol}>
                                    <AppText style={styles.featuredEventName} numberOfLines={1}>
                                        {homeData.featured_event[0].event_name || ""}
                                    </AppText>
                                    <AppText style={styles.cardLocation} numberOfLines={1}>
                                        {homeData.featured_event[0].location_name}
                                    </AppText>
                                </View>

                                <View style={styles.cardViewButton}>
                                    <AppText style={styles.cardViewButtonText}>View</AppText>
                                </View>
                            </ImageBackground>
                        </TouchableOpacity>
                    </>
                ) : null}

                {/* Hit the Trails Section */}
                {homeData?.trails_block_heading ? (
                    <View style={styles.trailsSectionContainer}>
                        <View style={styles.subSectionTitleRow}>
                            <View style={[styles.sectionIconCircle, { backgroundColor: primaryColor || "#8B1E1E" }]}>
                                <Image source={require('../../assets/images/trailsicon.png')} style={styles.sectionIconImg} contentFit="contain" />
                            </View>
                            <TouchableOpacity onPress={() => router.push("/trails" as Href<string>)}>
                                <AppText style={[styles.subSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.trails_block_heading}</AppText>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.trailsHorizontalList}
                        >
                            {homeData?.trails && Array.isArray(homeData.trails) && homeData.trails.length > 0 ? (
                                homeData.trails.map((trail: TrailsData, index: number) => (
                                    <TouchableOpacity
                                        key={trail.id || index}
                                        style={styles.trailPill}
                                        activeOpacity={0.8}
                                        onPress={() => router.push("/trails" as Href<string>)}
                                    >
                                        <AppText style={styles.trailName}>{trail.trail_name || ""}</AppText>
                                        <AppText style={styles.trailDistance}>{trail.distance ? `  |  ${trail.distance}` : ""}</AppText>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <AppText style={{ color: colors.onSurfaceVariant, fontSize: 13, marginLeft: 16 }}>No trails available</AppText>
                            )}
                        </ScrollView>
                    </View>
                ) : null}
            </ScrollView>

            {/* Elk Smart Modal Popup */}
            <Modal
                visible={showPopup}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPopup(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentWrapper}>
                        {popupData ? (
                            popupData.popup_image?.url ? (
                                <ImageBackground
                                    source={{ uri: popupData.popup_image.url }}
                                    style={styles.modalCardBackground}
                                    contentFit="cover"
                                >
                                    <View style={styles.modalImageOverlay}>
                                        {/* Close Button */}
                                        <TouchableOpacity
                                            style={[styles.closeButton, { backgroundColor: popupData.close_button_style?.toLowerCase() === 'light' ? '#FFFFFF' : '#000000' }]}
                                            onPress={() => { hasDismissedPopupSession = true; setShowPopup(false); }}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="close" size={18} color={popupData.close_button_style?.toLowerCase() === 'light' ? '#000000' : '#FFFFFF'} />
                                        </TouchableOpacity>

                                        {/* Dynamic content */}
                                        <AppText style={styles.modalTitleDynamic}>{popupData.popup_title}</AppText>
                                        {popupData.popup_body_copy ? (
                                            <RenderHTML
                                                contentWidth={width * 0.95 - 48}
                                                source={{ html: popupData.popup_body_copy }}
                                                baseStyle={{
                                                    fontSize: 14,
                                                    color: "#E5E5E5",
                                                    textAlign: "center",
                                                    lineHeight: 18,
                                                }}
                                                tagsStyles={{
                                                    p: { textAlign: "center", margin: 0, marginTop: 12 }
                                                }}
                                            />
                                        ) : null}
                                    </View>
                                </ImageBackground>
                            ) : (
                                <WireframePlaceholder style={styles.modalCard}>
                                    {/* Close Button */}
                                    <TouchableOpacity
                                        style={[styles.closeButton, { backgroundColor: popupData.close_button_style?.toLowerCase() === 'light' ? '#FFFFFF' : '#000000' }]}
                                        onPress={() => { hasDismissedPopupSession = true; setShowPopup(false); }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="close" size={18} color={popupData.close_button_style?.toLowerCase() === 'light' ? '#000000' : '#FFFFFF'} />
                                    </TouchableOpacity>

                                    {/* Dynamic content */}
                                    <AppText style={styles.modalTitle}>{popupData.popup_title}</AppText>
                                    {popupData.popup_body_copy ? (
                                        <RenderHTML
                                            contentWidth={width * 0.95 - 40} // paddingHorizontal: 20 -> 40
                                            source={{ html: popupData.popup_body_copy }}
                                            baseStyle={{
                                                fontSize: 14,
                                                color: colors.onSurfaceVariant,
                                                textAlign: "center",
                                                lineHeight: 18,
                                            }}
                                            tagsStyles={{
                                                p: { textAlign: "center", margin: 0, marginTop: 12 }
                                            }}
                                        />
                                    ) : null}
                                </WireframePlaceholder>
                            )
                        ) : (
                            <View style={styles.modalLoadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },

    header: {
        height: 144,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        backgroundColor: colors.surface,
    },

    headerLogo: {
        height: 46,
        width: 70,
    },

    headerExplorer: {
        height: 30,
        width: 100,
    },

    tipsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },

    tipsCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#E0E0E0",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },

    tipsBadge: {
        backgroundColor: colors.onSurface,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: -6,
        zIndex: 5,
    },

    tipsBadgeText: {
        color: colors.surface,
        fontSize: 8,
        fontWeight: "bold",
    },

    scrollContent: {
        paddingBottom: 24,
    },

    horizontalMenu: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },

    menuCard: {
        width: 160.75,
        height: 110.05,
        borderTopLeftRadius: 12.37,
        borderTopRightRadius: 12.37,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        backgroundColor: colors.surface,
    },

    menuCardImage: {
        flex: 2,
    },

    menuCardTitleContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingHorizontal: 4,
    },

    menuCardTitle: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.onSurface,
    },

    welcomeTitle: {
        fontSize: width < 380 ? 20 : 22,
        fontWeight: '400',
        textAlign: "left",
        color: colors.onSurface,
        marginVertical: 14,
        lineHeight: width < 380 ? 20 : 22,
        paddingHorizontal: 16,
    },

    welcomeBannerContainer: {
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },

    welcomeBannerCard: {
        width: '100%',
        height: 250,
    },

    welcomeBannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Subtle overlay
        padding: 16,
        justifyContent: 'space-between',
    },

    aboutKecaBadge: {
        alignSelf: 'flex-end',
        backgroundColor: '#000000', // Black badge matching reference
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },

    aboutKecaText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },

    welcomeIntroContainer: {
        maxWidth: '85%',
    },

    welcomeIntroText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 22,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        textDecorationLine: 'underline', // Match design lines under parts
    },

    sectionHeader: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.onSurface,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
    },

    subSectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginVertical: 8,
        gap: 6,
    },

    subSectionTitle: {
        fontSize: width < 380 ? 18 : 20,
        fontWeight: '600',
        color: colors.onSurface,
    },

    mapCardContainer: {
        marginHorizontal: 16,
        borderRadius: 10.69,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        marginBottom: 12,
    },

    mapCard: {
        height: 250,
        width: "100%",
    },

    viewMapButton: {
        position: "absolute",
        bottom: 12,
        right: 12,
        backgroundColor: "#0F0F0F", // Black pill matching reference
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },

    viewMapButtonText: {
        color: "#FFFFFF", // White text
        fontSize: 12,
        fontWeight: "bold",
    },

    programsHorizontalList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },

    programCard: {
        width: 286,
        height: 250,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#000000",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        flexDirection: 'column',
    },

    programCardImageContainer: {
        width: '100%',
        flex: 1,
        position: 'relative',
    },

    programCardBottomSection: {
        width: '100%',
        height: 80,
        backgroundColor: '#000000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },

    programCardTextCol: {
        flex: 1,
        paddingRight: 12,
    },

    cardBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#000000',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomLeftRadius: 10,
        alignItems: 'center',
        zIndex: 5,
    },

    cardBadgeMonth: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    cardBadgeDay: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 1,
        textAlign: 'center',
    },

    cardTextContainerFull: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 85, // Leave room for the View button
        zIndex: 5,
    },

    cardLocation: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },

    cardViewButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },

    cardViewButtonText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#000000',
    },

    programCardName: {
        fontSize: width < 380 ? 14 : 16,
        fontWeight: '700',
        color: "#FFFFFF",
    },

    featuredEventHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 10,
    },

    featuredTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    featuredSectionTitle: {
        fontSize: width < 380 ? 18 : 20,
        fontWeight: '600',
        color: colors.onSurface,
    },

    viewAllEventsText: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
        textDecorationLine: "underline",
    },

    featuredCard: {
        height: 269.33,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: '#000000',
        marginHorizontal: 16,
        marginBottom: 24,
        flexDirection: 'column',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },

    featuredEventName: {
        fontSize: width < 380 ? 14 : 16,
        fontWeight: '700',
        color: "#FFFFFF",
    },

    sectionIconImg: {
        width: 16,
        height: 16,
        tintColor: '#FFFFFF',
    },

    sectionIconImgLg: {
        width: 16,
        height: 16,
    },

    trailsSectionContainer: {
        marginTop: 16,
        marginBottom: 12,
    },

    sectionIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 2,
    },

    trailsHorizontalList: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },

    trailPill: {
        flexDirection: "row",
        backgroundColor: '#0F0F0F',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },

    trailName: {
        fontSize: 14,
        fontWeight: '400',
        fontFamily: 'Lexend_500Medium',
        color: "#FFFFFF",
    },

    trailDistance: {
        fontSize: 14,
        color: "#AAAAAA",
        fontWeight: '400',
        fontFamily: 'Lexend_500Medium',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalContentWrapper: {
        width: width * 0.95,
        height: width * 0.82,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
    },

    modalCard: {
        width: "100%",
        height: "100%",
    },

    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },

    modalTextContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 16,
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
    },

    modalBody: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 12,
        paddingHorizontal: 20,
    },

    modalCardBackground: {
        width: "100%",
        height: "100%",
    },

    modalImageOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },

    modalTitleDynamic: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#FFFFFF",
        textAlign: "center",
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    modalBodyDynamic: {
        fontSize: 14,
        color: "#FFFFFF",
        textAlign: "center",
        marginTop: 12,
        lineHeight: 18,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    modalCtaButton: {
        width: "100%",
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },

    modalCtaText: {
        fontSize: 15,
        fontWeight: "bold",
    },

    modalLoadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
