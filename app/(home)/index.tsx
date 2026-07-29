import { Href } from "expo-router";
import AppText from "@/components/AppText";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, ImageBackground } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from 'react-native-render-html';
import { useIsFocused } from '@react-navigation/native';

import WireframePlaceholder from "@/components/WireframePlaceholder";
import CachedImage from "@/components/CachedImage";

// Get screen dimensions for dynamic calculations
const { width } = Dimensions.get("window");

import { useAppContent } from "@/contexts/AppContentContext";
import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";

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
                {/* Unified QuickLinks and Welcome Section Wrapper */}
                <View style={{ position: 'relative' }}>
                    {/* Background Block covering QuickLinks, Title, and 75% of the banner height (banner is 160px, so bottom 40 leaves 75% coverage) */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 40, backgroundColor: primaryColor }} />

                    

                    {/* Welcome Message */}
                    {homeData?.hero_welcome_heading ? (
                        <AppText style={[styles.welcomeTitle, { color: isDark ? "#FFFFFF" : secondaryColor }]}>
                            {homeData.hero_welcome_heading}
                        </AppText>
                    ) : null}

                    {/* Welcome Banner */}
                    <Image source={require("../../assets/images/welcome.jpg")} style={styles.welcomeBanner} contentFit="cover" />
                </View>

                {/* Welcome Description */}
                {homeData?.hero_intro_paragraph ? (
                    <RenderHTML
                        contentWidth={width - 40}
                        source={{ html: homeData.hero_intro_paragraph }}
                        baseStyle={{
                            fontSize: 13,
                            color: colors.onSurface,
                            textAlign: "center",
                            lineHeight: 18,
                            marginBottom: 12,
                        }}
                        tagsStyles={{ p: { textAlign: "center", margin: 0 } }}
                    />
                ) : null}

                {/* Read More Button */}
                {homeData?.hero_cta_button_label ? (
                    <TouchableOpacity style={[styles.readMoreButton, { backgroundColor: primaryColor }]} activeOpacity={0.8}>
                        <AppText style={[styles.readMoreButtonText, { color: isDark ? "#FFFFFF" : secondaryColor }]}>{homeData.hero_cta_button_label}</AppText>
                    </TouchableOpacity>
                ) : null}

                {/* Find Your Next Adventure Section */}
                <AppText style={[styles.sectionHeader, { color: isDark ? "#FFFFFF" : primaryColor }]}>Find your next adventure</AppText>

                {/* Elk Viewing & Scenic Map Sub-section */}
                {homeData?.map_block_heading ? (
                    <View style={styles.subSectionTitleRow}>
                        <Ionicons name="map-outline" size={18} color="#333333" />
                        <AppText style={[styles.subSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.map_block_heading}</AppText>
                    </View>
                ) : null}

                {/* Map Card */}
                {homeData?.map_block_heading ? (
                    <View style={styles.mapCardContainer}>
                        <ImageBackground source={require("../../assets/images/map-preview.jpg")} style={styles.mapCard} imageStyle={{ borderRadius: 12 }}>
                            {homeData?.map_view_button_label ? (
                                <TouchableOpacity 
                                    style={[styles.viewMapButton, { backgroundColor: primaryColor }]} 
                                    activeOpacity={0.9}
                                    onPress={() => router.push("/map" as Href<string>)}
                                >
                                    <AppText style={[styles.viewMapButtonText, { color: isDark ? "#FFFFFF" : secondaryColor }]}>{homeData.map_view_button_label}</AppText>
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
                                <Ionicons name="calendar-outline" size={18} color="#333333" />
                                <AppText style={[styles.subSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>{homeData.programs_block_heading}</AppText>
                            </View>
                        ) : null}

                        {/* Horizontal Weekend Programs List */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.programsHorizontalList}
                        >
                            {homeData.programs.map((program: ProgramsData, index: number) => (
                                <TouchableOpacity
                                    key={program.id || index}
                                    style={styles.programCard}
                                    activeOpacity={0.8}
                                    onPress={() => router.push(`/programs` as Href<string>)}
                                >
                                    <CachedImage
                                        uri={program.thumbnail_image?.url}
                                        style={styles.programCardImage}
                                        contentFit="cover"
                                    />
                                    <View style={styles.programCardContent}>
                                        <AppText style={styles.programCardName} numberOfLines={1}>{program.program_name || ""}</AppText>
                                        <AppText style={styles.programCardDate}>{program.schedule__dates || ""}</AppText>
                                        <View style={[styles.arrowCircle, { backgroundColor: primaryColor }]}>
                                            <Ionicons name="arrow-forward" size={12} color={secondaryColor || ""} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                ) : null}

                {/* Featured Event Section */}
                {homeData?.featured_event && Array.isArray(homeData.featured_event) && homeData.featured_event.length > 0 ? (
                    <>
                        {homeData?.event_block_heading ? (
                            <View style={styles.featuredEventHeaderRow}>
                                <View style={styles.featuredTitleContainer}>
                                    <Ionicons name="calendar" size={18} color="#000000" />
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
                            activeOpacity={0.8}
                            onPress={() => {
                                const eventId = homeData.featured_event[0].id;
                                const eventIndex = eventsData?.findIndex((e: EventsData) => String(e.id) === String(eventId));
                                const targetId = eventId || (eventIndex !== undefined && eventIndex !== -1 ? eventIndex : 0);
                                router.push(`/events/${targetId}` as Href<string>);
                            }}
                        >
                            <View style={styles.featuredCardLeft}>
                                <CachedImage
                                    uri={homeData.featured_event[0].thumbnail_image?.url}
                                    style={styles.featuredCardImage}
                                    contentFit="cover"
                                />
                                <View style={[styles.featuredArrowCircle, { backgroundColor: primaryColor }]}>
                                    <Ionicons name="arrow-forward" size={12} color={secondaryColor || ""} />
                                </View>
                            </View>
                            <View style={styles.featuredCardRight}>
                                <AppText style={styles.featuredEventName}>{homeData.featured_event[0].event_name || ""}</AppText>
                                <AppText style={styles.featuredEventDate}>
                                    {homeData.featured_event[0]['start_date_&_time'] || ""}
                                </AppText>
                                <AppText style={styles.featuredEventDesc} numberOfLines={3}>
                                    {homeData.featured_event[0].short_description ? homeData.featured_event[0].short_description.replace(/<\/?[^>]+(>|$)/g, "").trim() : ""}
                                </AppText>
                            </View>
                        </TouchableOpacity>
                    </>
                ) : null}

                {/* Hit the Trails Section */}
                {homeData?.trails_block_heading ? (
                    <View style={[styles.trailsContainer, { backgroundColor: primaryColor }]}>
                        {/* Extension view for overscroll */}
                        <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, height: 1000, backgroundColor: primaryColor }} />
                        <View style={styles.trailsHeaderRow}>
                            <MaterialCommunityIcons name="image-filter-hdr" size={20} color={secondaryColor || ""} />
                            <TouchableOpacity onPress={() => router.push("/trails" as Href<string>)}>
                                <AppText style={[styles.trailsTitle, { color: isDark ? "#FFFFFF" : secondaryColor }]}>{homeData.trails_block_heading}</AppText>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.trailsHorizontalList}
                        >
                            {homeData?.trails && Array.isArray(homeData.trails) && homeData.trails.length > 0 ? (
                                homeData.trails.map((trail: TrailsData, index: number) => (
                                    <View key={trail.id || index} style={styles.trailPill}>
                                        <AppText style={styles.trailName}>{trail.trail_name || ""}</AppText>
                                        <AppText style={styles.trailDistance}>{trail.distance ? `${trail.distance}` : "N/A"}</AppText>
                                    </View>
                                ))
                            ) : (
                                <AppText style={{ color: "#FFFFFF", fontSize: 13 }}>No trails available</AppText>
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
        height: 64,
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
        width: 120,
        height: 90,
        borderRadius: 8,
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
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        color: colors.onSurface,
        marginVertical: 14,
        lineHeight: 22,
        paddingHorizontal: 16,
    },

    welcomeBanner: {
        height: 160,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        width: "auto",
    },

    welcomeDescription: {
        fontSize: 13,
        color: colors.onSurface,
        textAlign: "center",
        lineHeight: 18,
        marginHorizontal: 20,
        marginTop: 12,
    },

    readMoreButton: {
        alignSelf: "center",
        backgroundColor: "#E0E0E0",
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 12,
        marginBottom: 20,
    },

    readMoreButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.onSurface,
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
        fontSize: 15,
        fontWeight: "700",
        color: colors.onSurface,
    },

    mapCardContainer: {
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        marginBottom: 12,
    },

    mapCard: {
        height: 160,
        width: "100%",
    },

    viewMapButton: {
        position: "absolute",
        bottom: 12,
        right: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },

    viewMapButtonText: {
        color: colors.onSurface,
        fontSize: 12,
        fontWeight: "bold",
    },

    programsHorizontalList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },

    programCard: {
        width: 170,
        height: 145,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        overflow: "hidden",
        backgroundColor: colors.surface,
    },

    programCardImage: {
        height: 90,
    },

    programCardContent: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        position: "relative",
    },

    programCardName: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.onSurface,
    },

    programCardDate: {
        fontSize: 11,
        color: "#888888",
        marginTop: 2,
    },

    arrowCircle: {
        position: "absolute",
        right: 8,
        top: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#E0E0E0",
        justifyContent: "center",
        alignItems: "center",
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
        fontSize: 15,
        fontWeight: "700",
        color: colors.onSurface,
    },

    viewAllEventsText: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
        textDecorationLine: "underline",
    },

    featuredCard: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        marginHorizontal: 16,
        padding: 10,
        alignItems: "center",
        marginBottom: 20,
    },

    featuredCardLeft: {
        position: "relative",
    },

    featuredCardImage: {
        width: 100,
        height: 90,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },

    featuredArrowCircle: {
        position: "absolute",
        right: 6,
        bottom: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#E0E0E0",
        justifyContent: "center",
        alignItems: "center",
    },

    featuredCardRight: {
        flex: 1,
        marginLeft: 12,
    },

    featuredEventName: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.onSurface,
    },

    featuredEventDate: {
        fontSize: 11,
        color: "#888888",
        marginVertical: 2,
    },

    featuredEventDesc: {
        fontSize: 11,
        color: colors.onSurfaceVariant,
        lineHeight: 14,
    },

    trailsContainer: {
        backgroundColor: colors.outline,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },

    trailsHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 6,
    },

    trailsTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.surface,
    },

    trailsHorizontalList: {
        gap: 8,
        paddingRight: 16,
    },

    trailPill: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
    },

    trailName: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.onSurface,
    },

    trailDistance: {
        fontSize: 11,
        color: colors.onSurfaceVariant,
        marginLeft: 6,
        fontWeight: "500",
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
        top: 14,
        right: 14,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.onSurface,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: colors.onSurface,
    },

    modalBody: {
        fontSize: 14,
        color: colors.onSurfaceVariant,
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
        color: colors.surface,
        textAlign: "center",
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    modalBodyDynamic: {
        fontSize: 14,
        color: colors.surfaceContainerHigh,
        textAlign: "center",
        marginTop: 12,
        lineHeight: 18,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    modalLoadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surfaceContainerHigh,
    },
});
