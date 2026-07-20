import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ImageBackground,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Get screen dimensions for dynamic calculations
const { width } = Dimensions.get("window");

// Wireframe Placeholder Component with dynamic crossed lines
const WireframePlaceholder = ({ style, children }: { style?: any; children?: React.ReactNode }) => {
    const [dims, setDims] = useState({ width: 0, height: 0 });

    const onLayout = (event: any) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setDims({ width: w, height: h });
    };

    const diagonal = Math.sqrt(dims.width * dims.width + dims.height * dims.height);
    const angle = Math.atan2(dims.height, dims.width) * (180 / Math.PI);

    return (
        <View
            onLayout={onLayout}
            style={[
                {
                    backgroundColor: "#D9D9D9",
                    overflow: "hidden",
                    position: "relative",
                    justifyContent: "center",
                    alignItems: "center",
                },
                style,
            ]}
        >
            {dims.width > 0 && dims.height > 0 && (
                <>
                    <View
                        style={{
                            position: "absolute",
                            width: diagonal,
                            height: 1,
                            backgroundColor: "#B8B8B8",
                            transform: [{ rotate: `${angle}deg` }],
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            width: diagonal,
                            height: 1,
                            backgroundColor: "#B8B8B8",
                            transform: [{ rotate: `-${angle}deg` }],
                        }}
                    />
                </>
            )}
            {children}
        </View>
    );
};

import { useAppContent } from "@/contexts/AppContentContext";

export default function HomeScreen() {
    const [showPopup, setShowPopup] = useState(false);
    const { popupData, homeData } = useAppContent();

    useEffect(() => {
        if (popupData && popupData.popup_enabled) {
            setShowPopup(true);
        }
    }, [popupData]);

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
                <Image
                    source={require("@/assets/images/Explorer.png")}
                    style={styles.headerExplorer}
                    resizeMode="contain"
                />

                {/* TIPS Badge */}
                <TouchableOpacity style={styles.tipsContainer} activeOpacity={0.7}>
                    <View style={styles.tipsCircle}>
                        <MaterialCommunityIcons name="paw" size={22} color="#333333" />
                    </View>
                    <View style={styles.tipsBadge}>
                        <Text style={styles.tipsBadgeText}>TIPS →</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Horizontal Quick Links */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalMenu}
                >
                    <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
                        <WireframePlaceholder style={styles.menuCardImage} />
                        <View style={styles.menuCardTitleContainer}>
                            <Text style={styles.menuCardTitle} numberOfLines={1}>Visitors Center</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
                        <WireframePlaceholder style={styles.menuCardImage} />
                        <View style={styles.menuCardTitleContainer}>
                            <Text style={styles.menuCardTitle} numberOfLines={1}>Elk Scenic Map</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
                        <WireframePlaceholder style={styles.menuCardImage} />
                        <View style={styles.menuCardTitleContainer}>
                            <Text style={styles.menuCardTitle} numberOfLines={1}>Weekend Programs</Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView>

                {/* Welcome Message */}
                {homeData?.hero_welcome_heading ? (
                    <Text style={styles.welcomeTitle}>
                        {homeData.hero_welcome_heading}
                    </Text>
                ) : null}

                {/* Welcome Banner */}
                <WireframePlaceholder style={styles.welcomeBanner} />

                {/* Welcome Description */}
                {homeData?.hero_intro_paragraph ? (
                    <Text style={styles.welcomeDescription}>
                        {homeData.hero_intro_paragraph.replace(/<\/?[^>]+(>|$)/g, "").trim()}
                    </Text>
                ) : null}

                {/* Read More Button */}
                {homeData?.hero_cta_button_label ? (
                    <TouchableOpacity style={styles.readMoreButton} activeOpacity={0.8}>
                        <Text style={styles.readMoreButtonText}>{homeData.hero_cta_button_label}</Text>
                    </TouchableOpacity>
                ) : null}

                {/* Find Your Next Adventure Section */}
                <Text style={styles.sectionHeader}>Find your next adventure</Text>

                {/* Elk Viewing & Scenic Map Sub-section */}
                {homeData?.map_block_heading ? (
                    <View style={styles.subSectionTitleRow}>
                        <Ionicons name="map-outline" size={18} color="#333333" />
                        <Text style={styles.subSectionTitle}>{homeData.map_block_heading}</Text>
                    </View>
                ) : null}

                {/* Map Card */}
                {homeData?.map_block_heading ? (
                    <View style={styles.mapCardContainer}>
                        <WireframePlaceholder style={styles.mapCard}>
                            {homeData?.map_view_button_label ? (
                                <TouchableOpacity style={styles.viewMapButton} activeOpacity={0.9}>
                                    <Text style={styles.viewMapButtonText}>{homeData.map_view_button_label}</Text>
                                </TouchableOpacity>
                            ) : null}
                        </WireframePlaceholder>
                    </View>
                ) : null}

                {/* Weekend Programs Sub-section */}
                {homeData?.programs_block_heading ? (
                    <View style={styles.subSectionTitleRow}>
                        <Ionicons name="calendar-outline" size={18} color="#333333" />
                        <Text style={styles.subSectionTitle}>{homeData.programs_block_heading}</Text>
                    </View>
                ) : null}

                {/* Horizontal Weekend Programs List */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.programsHorizontalList}
                >
                    {Array.from({ length: Number(homeData?.programs_to_display) || 3 }).map((_, index) => (
                        <TouchableOpacity key={index} style={styles.programCard} activeOpacity={0.8}>
                            <WireframePlaceholder style={styles.programCardImage} />
                            <View style={styles.programCardContent}>
                                <Text style={styles.programCardName} numberOfLines={1}>Program Name</Text>
                                <Text style={styles.programCardDate}>July 5, 2026</Text>
                                <View style={styles.arrowCircle}>
                                    <Ionicons name="arrow-forward" size={12} color="#333333" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Featured Event Section */}
                {homeData?.event_block_heading ? (
                    <View style={styles.featuredEventHeaderRow}>
                        <View style={styles.featuredTitleContainer}>
                            <Ionicons name="calendar" size={18} color="#000000" />
                            <Text style={styles.featuredSectionTitle}>{homeData.event_block_heading}</Text>
                        </View>
                        {homeData?.event_view_all_label ? (
                            <TouchableOpacity>
                                <Text style={styles.viewAllEventsText}>{homeData.event_view_all_label}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : null}

                {/* Featured Event Card */}
                {homeData?.event_block_heading && homeData?.featured_event && Array.isArray(homeData.featured_event) && homeData.featured_event.length > 0 ? (
                    <TouchableOpacity style={styles.featuredCard} activeOpacity={0.8}>
                        <View style={styles.featuredCardLeft}>
                            <WireframePlaceholder style={styles.featuredCardImage} />
                            <View style={styles.featuredArrowCircle}>
                                <Ionicons name="arrow-forward" size={12} color="#333333" />
                            </View>
                        </View>
                        <View style={styles.featuredCardRight}>
                            <Text style={styles.featuredEventName}>{homeData.featured_event[0].post_title || "Featured Event"}</Text>
                            <Text style={styles.featuredEventDate}>
                                {homeData.featured_event[0].post_date ? new Date(homeData.featured_event[0].post_date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Coming Soon"}
                            </Text>
                            <Text style={styles.featuredEventDesc} numberOfLines={3}>
                                {homeData.featured_event[0].post_content ? homeData.featured_event[0].post_content.replace(/<\/?[^>]+(>|$)/g, "").trim() : "Details for this event will be announced soon."}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ) : null}

                {/* Hit the Trails Section */}
                {homeData?.trails_block_heading ? (
                    <View style={styles.trailsContainer}>
                        <View style={styles.trailsHeaderRow}>
                            <MaterialCommunityIcons name="image-filter-hdr" size={20} color="#FFFFFF" />
                            <Text style={styles.trailsTitle}>{homeData.trails_block_heading}</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.trailsHorizontalList}
                        >
                            {Array.from({ length: Number(homeData?.trail_links_to_show) || 3 }).map((_, index) => (
                                <View key={index} style={styles.trailPill}>
                                    <Text style={styles.trailName}>Trail Name</Text>
                                    <Text style={styles.trailDistance}>{(1.5 + index * 0.7).toFixed(1)}mi</Text>
                                </View>
                            ))}
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
                                    resizeMode="cover"
                                >
                                    <View style={styles.modalImageOverlay}>
                                        {/* Close Button */}
                                        <TouchableOpacity
                                            style={[styles.closeButton, { backgroundColor: popupData.close_button_style?.toLowerCase() === 'light' ? '#FFFFFF' : '#000000' }]}
                                            onPress={() => setShowPopup(false)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="close" size={18} color={popupData.close_button_style?.toLowerCase() === 'light' ? '#000000' : '#FFFFFF'} />
                                        </TouchableOpacity>

                                        {/* Dynamic content */}
                                        <Text style={styles.modalTitleDynamic}>{popupData.popup_title}</Text>
                                        <Text style={styles.modalBodyDynamic}>
                                            {popupData.popup_body_copy ? popupData.popup_body_copy.replace(/<\/?[^>]+(>|$)/g, "").trim() : ""}
                                        </Text>
                                    </View>
                                </ImageBackground>
                            ) : (
                                <WireframePlaceholder style={styles.modalCard}>
                                    {/* Close Button */}
                                    <TouchableOpacity
                                        style={[styles.closeButton, { backgroundColor: popupData.close_button_style?.toLowerCase() === 'light' ? '#FFFFFF' : '#000000' }]}
                                        onPress={() => setShowPopup(false)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="close" size={18} color={popupData.close_button_style?.toLowerCase() === 'light' ? '#000000' : '#FFFFFF'} />
                                    </TouchableOpacity>

                                    {/* Dynamic content */}
                                    <Text style={styles.modalTitle}>{popupData.popup_title}</Text>
                                    <Text style={styles.modalBody}>
                                        {popupData.popup_body_copy ? popupData.popup_body_copy.replace(/<\/?[^>]+(>|$)/g, "").trim() : ""}
                                    </Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    header: {
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        backgroundColor: "#FFFFFF",
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
        borderColor: "#CCCCCC",
    },

    tipsBadge: {
        backgroundColor: "#000000",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: -6,
        zIndex: 5,
    },

    tipsBadgeText: {
        color: "#FFFFFF",
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
        borderColor: "#CCCCCC",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },

    menuCardImage: {
        flex: 2,
    },

    menuCardTitleContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingHorizontal: 4,
    },

    menuCardTitle: {
        fontSize: 11,
        fontWeight: "600",
        color: "#333333",
    },

    welcomeTitle: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        color: "#000000",
        marginVertical: 14,
        lineHeight: 22,
        paddingHorizontal: 16,
    },

    welcomeBanner: {
        height: 160,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#CCCCCC",
    },

    welcomeDescription: {
        fontSize: 13,
        color: "#333333",
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
        color: "#333333",
    },

    sectionHeader: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000000",
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
        color: "#000000",
    },

    mapCardContainer: {
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#CCCCCC",
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
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#CCCCCC",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },

    viewMapButtonText: {
        color: "#333333",
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
        backgroundColor: "#FFFFFF",
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
        color: "#333333",
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
        color: "#000000",
    },

    viewAllEventsText: {
        fontSize: 12,
        color: "#666666",
        textDecorationLine: "underline",
    },

    featuredCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
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
        color: "#333333",
    },

    featuredEventDate: {
        fontSize: 11,
        color: "#888888",
        marginVertical: 2,
    },

    featuredEventDesc: {
        fontSize: 11,
        color: "#666666",
        lineHeight: 14,
    },

    trailsContainer: {
        backgroundColor: "#8E8E93",
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
        color: "#FFFFFF",
    },

    trailsHorizontalList: {
        gap: 8,
        paddingRight: 16,
    },

    trailPill: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
    },

    trailName: {
        fontSize: 12,
        fontWeight: "700",
        color: "#333333",
    },

    trailDistance: {
        fontSize: 11,
        color: "#666666",
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
        borderColor: "#CCCCCC",
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
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333333",
    },

    modalBody: {
        fontSize: 14,
        color: "#666666",
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
        color: "#E5E5E5",
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
        backgroundColor: "#E5E5E5",
    },
});
