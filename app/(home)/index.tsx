import AppRenderHTML from "@/src/components/AppRenderHTML";
import AppText from "@/src/components/AppText";
import SectionHeader from "@/src/components/SectionHeader";
import UniversalCard from "@/src/components/UniversalCard";
import { openExternalLink } from "@/src/utils/openLink";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from '@react-navigation/native';
import { Image, ImageBackground } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import WireframePlaceholder from "@/src/components/WireframePlaceholder";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { EventsData, ProgramsData, TrailsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { formatTrailDistance, isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};



// Global session variable to track if the user has dismissed the popup during this app launch
let hasDismissedPopupSession = false;

export default function HomeScreen() {
    const [showPopup, setShowPopup] = useState(false);
    const [timerFinished, setTimerFinished] = useState(false);
    const [popupImageLoaded, setPopupImageLoaded] = useState(false);

    const { colors, fonts, isDark } = useTheme();
    const isFocused = useIsFocused();

    const { popupData, homeData, brandData, eventsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary) || "#000000";
    const secondaryColor = getValidColor(brandData?.brand_color_secondary) || "#ea0b0b";

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark, primaryColor, secondaryColor), [colors, fonts, isDark, primaryColor, secondaryColor]);
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        if (isFocused && popupData && popupData.popup_enabled && !hasDismissedPopupSession) {
            timeoutId = setTimeout(() => {
                setTimerFinished(true);
            }, 10000);
        }
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [isFocused, popupData]);

    useEffect(() => {
        if (!popupData?.popup_image?.url) {
            setPopupImageLoaded(true);
        }
    }, [popupData?.popup_image?.url]);

    useEffect(() => {
        if (timerFinished && popupImageLoaded && !hasDismissedPopupSession) {
            setShowPopup(true);
        }
    }, [timerFinished, popupImageLoaded]);
    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            {/* Hidden image to preload popup image */}
            {popupData?.popup_image?.url && !popupImageLoaded && !showPopup ? (
                <Image
                    source={{ uri: popupData.popup_image.url }}
                    alt={(popupData as any)?.image_alt_text}
                    style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }}
                    onLoad={() => setPopupImageLoaded(true)}
                    onError={() => setPopupImageLoaded(true)}
                />
            ) : null}

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Navbar />
                <QuickLinks />
                {/* Welcome Message */}
                {isValidData(homeData?.hero_welcome_heading) ? (
                    <Animated.View entering={FadeInUp.duration(300)}>
                        <AppText style={[styles.welcomeTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                            {homeData?.hero_welcome_heading}
                        </AppText>
                    </Animated.View>
                ) : null}

                {/* Welcome Banner Card */}
                {(isValidData(homeData?.hero_cta_button_link?.title) || isValidData(homeData?.hero_intro_paragraph)) ? (
                    <Animated.View entering={FadeInUp.duration(300).delay(30)}>
                        <View style={styles.welcomeBannerContainer}>
                            <ImageBackground
                                source={require("../../assets/images/welcome.jpg")}
                                style={styles.welcomeBannerCard}
                                imageStyle={{ borderRadius: 10 }}
                            >
                                <View style={[
                                    styles.welcomeBannerOverlay,
                                    !isValidData(homeData?.hero_cta_button_link?.title) && { justifyContent: 'flex-end' }
                                ]}>
                                    {/* Top Right Pill Badge: About KECA */}
                                    {isValidData(homeData?.hero_cta_button_link?.title) ? (
                                        <TouchableOpacity
                                            style={styles.aboutKecaBadge}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                const url = homeData?.hero_cta_button_link?.url;
                                                if (url) {
                                                    if (url.startsWith('http')) {
                                                        openExternalLink(url);
                                                    } else {
                                                        router.push(url as any);
                                                    }
                                                } else {
                                                    router.push("/visitors");
                                                }
                                            }}
                                        >
                                            <AppText style={styles.aboutKecaText}>
                                                {homeData?.hero_cta_button_link?.title}
                                            </AppText>
                                        </TouchableOpacity>
                                    ) : null}

                                    {/* Bottom Left Text Overlay: Conserving & Enhancing... */}
                                    {isValidData(homeData?.hero_intro_paragraph) ? (
                                        <View style={styles.welcomeIntroContainer}>
                                            <AppRenderHTML
                                                html={homeData?.hero_intro_paragraph || ""}
                                                contentWidth={width}
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
                    </Animated.View>
                ) : null}

                {/* Elk Viewing & Scenic Map Sub-section */}
                {isValidData(homeData?.map_block_heading) ? (
                    <Animated.View entering={FadeInUp.duration(300).delay(60)}>
                        <SectionHeader
                            title={homeData?.map_block_heading as string}
                            iconSource={require('../../assets/images/mapicon.png')}
                            primaryColor={primaryColor}
                            secondaryColor={secondaryColor || "#ea0b0b"}
                            isDark={isDark}
                        />
                        <View style={styles.mapCardContainer}>
                            {isValidData(homeData?.map_preview_image?.url) ? (
                                <ImageBackground
                                    source={{ uri: homeData?.map_preview_image?.url as string }}
                                    style={styles.mapCard}
                                    imageStyle={{ borderRadius: 10.69 }}
                                >
                                    {isValidData(homeData?.map_view_button_label) ? (
                                        <TouchableOpacity
                                            style={styles.viewMapButton}
                                            activeOpacity={0.9}
                                            onPress={() => router.push("/map")}
                                        >
                                            <AppText style={styles.viewMapButtonText}>{homeData?.map_view_button_label}</AppText>
                                        </TouchableOpacity>
                                    ) : null}
                                </ImageBackground>
                            ) : (
                                <View style={[styles.mapCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#262626', borderRadius: 10.69, justifyContent: 'flex-end' }]}>
                                    {isValidData(homeData?.map_view_button_label) ? (
                                        <TouchableOpacity
                                            style={styles.viewMapButton}
                                            activeOpacity={0.9}
                                            onPress={() => router.push("/map")}
                                        >
                                            <AppText style={styles.viewMapButtonText}>{homeData?.map_view_button_label}</AppText>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            )}
                        </View>
                    </Animated.View>
                ) : null}

                {/* Weekend Programs Section */}
                {isValidData(homeData?.programs) ? (
                    <Animated.View entering={FadeInUp.duration(300).delay(90)}>
                        {isValidData(homeData?.programs_block_heading) ? (
                            <SectionHeader
                                title={homeData?.programs_block_heading as string}
                                iconSource={require('../../assets/images/programicon.png')}
                                primaryColor={primaryColor}
                                secondaryColor={secondaryColor || "#ea0b0b"}
                                isDark={isDark}
                            />
                        ) : null}

                        {/* Horizontal Weekend Programs List */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.programsHorizontalList}
                        >
                            {(homeData?.programs || []).map((program: ProgramsData, index: number) => {
                                // Simple date badge parser
                                let badge = null;
                                const dateStr = program.schedule_dates;
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
                                    <UniversalCard
                                        key={program.id || index}
                                        type="program"
                                        item={program}
                                        variant="horizontal"
                                        primaryColor={primaryColor}
                                    />
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                ) : null}

                {/* Featured Event Section */}
                {isValidData(homeData?.featured_event) ? (
                    <Animated.View entering={FadeInUp.duration(300).delay(120)}>
                        {isValidData(homeData?.event_block_heading) ? (
                            <SectionHeader
                                title={homeData?.event_block_heading as string}
                                iconSource={require('../../assets/images/eventicon.png')}
                                primaryColor={primaryColor}
                                secondaryColor={secondaryColor || "#ea0b0b"}
                                isDark={isDark}
                                isFeatured={true}
                                actionLabel={homeData?.event_view_all_label}
                                onActionPress={() => router.push("/events" as any)}
                            />
                        ) : null}

                        {/* Featured Event Card */}
                        {(() => {
                            const isEventArray = Array.isArray(homeData?.featured_event);
                            const eventObj = isEventArray ? (homeData?.featured_event as any)[0] : homeData?.featured_event;
                            if (!eventObj) return null;

                            const eventId = eventObj.id;
                            const eventIndex = eventsData?.findIndex((e: EventsData) => String(e.id) === String(eventId));
                            const targetId = eventId || (eventIndex !== undefined && eventIndex !== -1 ? eventIndex : 0);

                            return (
                                <UniversalCard
                                    type="event"
                                    item={eventObj}
                                    variant="featured"
                                    primaryColor={primaryColor}
                                    hideBadge={true}
                                    onPress={() => router.push(`/events/${targetId}` as any)}
                                />
                            );
                        })()}
                    </Animated.View>
                ) : null}

                {/* Hit the Trails Section */}
                {(isValidData(homeData?.trails_block_heading) && isValidData(homeData?.trails)) ? (
                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        <View style={styles.trailsSectionContainer}>
                            <SectionHeader
                                title={homeData?.trails_block_heading as string}
                                iconSource={require('../../assets/images/trailsicon.png')}
                                primaryColor={primaryColor}
                                secondaryColor={secondaryColor || "#ea0b0b"}
                                isDark={isDark}
                                onPress={() => router.push("/trails")}
                            />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.trailsHorizontalList}
                            >
                                {(homeData?.trails || []).map((trail: TrailsData, index: number) => (
                                    <TouchableOpacity
                                        key={trail.id || index}
                                        style={styles.trailPill}
                                        activeOpacity={0.8}
                                        onPress={() => router.push("/trails")}
                                    >
                                        {isValidData(trail.trail_name) ? (
                                            <AppText style={styles.trailName}>{trail.trail_name}</AppText>
                                        ) : null}
                                        {isValidData(trail.distance) ? (
                                            <AppText style={styles.trailName}>{`    ${formatTrailDistance(trail.distance)}mi`}</AppText>
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </Animated.View>
                ) : null}

                {/* Sponsorship / Grant Information Section */}
                {(() => {
                    const grantLogoUrl = typeof homeData?.sponsorship_information?.grant_logo === 'string'
                        ? homeData?.sponsorship_information?.grant_logo
                        : homeData?.sponsorship_information?.grant_logo?.url;
                    const grantDetailsHtml = homeData?.sponsorship_information?.grant_details;

                    if (!isValidData(grantDetailsHtml) && !isValidData(grantLogoUrl)) {
                        return null;
                    }

                    return (
                        <Animated.View
                            entering={FadeInUp.duration(300).delay(200)}
                            style={{
                                width: '100%',
                                marginTop: 28,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7F4F4',
                                paddingTop: 20,
                                paddingBottom: 20,
                                paddingHorizontal: 8,
                                alignItems: 'center',
                                borderTopWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E8E5E5',
                            }}
                        >
                            {isValidData(grantLogoUrl) ? (
                                <View style={{ width: '100%', height: 64, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
                                    <Image
                                        source={{ uri: grantLogoUrl as string }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="contain"
                                        cachePolicy="disk"
                                    />
                                </View>
                            ) : null}

                            {isValidData(grantDetailsHtml) ? (
                                <AppRenderHTML
                                    html={grantDetailsHtml || ""}
                                    contentWidth={width - 16}
                                    baseStyle={{
                                        fontFamily: 'Inter-Regular',
                                        fontSize: 11,
                                        fontWeight: '400',
                                        color: isDark ? colors.onSurfaceVariant : '#333333',
                                        lineHeight: 16,
                                        letterSpacing: -0.1,
                                        textAlign: 'center',
                                    }}
                                    tagsStyles={{
                                        p: {
                                            fontFamily: 'Inter-Regular',
                                            fontSize: 11,
                                            fontWeight: '400',
                                            lineHeight: 16,
                                            letterSpacing: -0.1,
                                            textAlign: 'center',
                                            margin: 0,
                                            padding: 0,
                                        }
                                    }}
                                />
                            ) : null}
                        </Animated.View>
                    );
                })()}
            </Animated.ScrollView>

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
                            <TouchableOpacity
                                style={{ flex: 1, width: "100%", height: "100%" }}
                                activeOpacity={0.9}
                                onPress={() => {
                                    const ctaLink = (brandData as any)?.cta_button_link?.link || popupData.cta_button_link?.link || (brandData as any)?.cta_button_link?.url || popupData.cta_button_link?.url;
                                    if (ctaLink) {
                                        hasDismissedPopupSession = true;
                                        setShowPopup(false);
                                        if (ctaLink.startsWith('http')) {
                                            openExternalLink(ctaLink);
                                        } else {
                                            router.push(ctaLink as any);
                                        }
                                    }
                                }}
                            >
                                {popupData.popup_image?.url ? (
                                    <ImageBackground
                                        source={{ uri: popupData.popup_image.url }}
                                        alt={(popupData as any)?.image_alt_text}
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
                                            {isValidData(popupData.popup_title) ? (
                                                <AppText style={styles.modalTitleDynamic}>{popupData.popup_title}</AppText>
                                            ) : null}
                                            {isValidData(popupData.popup_body_copy) ? (
                                                <AppRenderHTML
                                                    html={popupData.popup_body_copy}
                                                    contentWidth={width * 0.95 - 48}
                                                    baseStyle={{
                                                        fontFamily: 'OpenSans-Regular',
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
                                        {isValidData(popupData.popup_title) ? (
                                            <AppText style={styles.modalTitle}>{popupData.popup_title}</AppText>
                                        ) : null}
                                        {isValidData(popupData.popup_body_copy) ? (
                                            <AppRenderHTML
                                                html={popupData.popup_body_copy}
                                                contentWidth={width * 0.95 - 40} // paddingHorizontal: 20 -> 40
                                                baseStyle={{
                                                    fontFamily: 'OpenSans-Regular',
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
                                )}
                            </TouchableOpacity>
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

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, primaryColor: string, secondaryColor: string) => StyleSheet.create({
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
        paddingBottom: 0,
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
        fontSize: width < 380 ? 18 : 20,
        fontFamily: 'Roboto-Regular',
        textAlign: "left",
        color: colors.onSurface,
        marginVertical: 14,
        lineHeight: width < 380 ? 20 : 22,
        paddingHorizontal: 16,
        textTransform: 'capitalize',
    },

    welcomeBannerContainer: {
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },

    welcomeBannerCard: {
        width: '100%',
        minHeight: (width - 32) * (25 / 36),
    },

    welcomeBannerOverlay: {
        flexGrow: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Subtle overlay
        padding: 16,
        justifyContent: 'space-between',
    },

    aboutKecaBadge: {
        alignSelf: 'flex-end',
        backgroundColor: secondaryColor, // Secondary color
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 22,
    },

    aboutKecaText: {
        fontFamily: 'Roboto-Bold',
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },

    welcomeIntroContainer: {
        maxWidth: '85%',
    },

    welcomeIntroText: {
        fontFamily: 'Roboto-Bold',
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 22,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
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
        backgroundColor: secondaryColor, // Secondary color
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 22,
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
        backgroundColor: primaryColor,
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
        fontFamily: 'OpenSans-Regular',
        color: "#FFFFFF",
        textTransform: 'capitalize',
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
        textTransform: 'capitalize',
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
        textTransform: 'capitalize',
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
