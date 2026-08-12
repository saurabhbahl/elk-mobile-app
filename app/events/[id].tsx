import AppText from "@/src/components/AppText";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    InteractionManager,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import Animated from "react-native-reanimated";
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/src/components/CachedImage";
import PrimaryButton from "@/src/components/PrimaryButton";
import SectionHeader from "@/src/components/SectionHeader";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { EventsData, useAppContent } from "@/src/contexts/AppContentContext";
import { extractPoiId, navigateToPoi } from "@/src/utils/mapUtils";
import { openExternalLink } from "@/src/utils/openLink";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const formatEventDateTime = (startStr: string, endStr?: string) => {
    if (!startStr) return "";

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const parsePart = (str: string) => {
        const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.*))?/);
        if (match) {
            const day = parseInt(match[1], 10);
            const monthIndex = parseInt(match[2], 10) - 1;
            const year = match[3];
            let time = (match[4] || "").trim();
            time = time.replace(/:00/g, "").replace(/\s+/g, "").toLowerCase();
            if (monthIndex >= 0 && monthIndex < 12) {
                return { day, month: MONTHS[monthIndex], year, time };
            }
        }

        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/:00/g, "").replace(/\s+/g, "").toLowerCase();
            return {
                day: d.getDate(),
                month: MONTHS[d.getMonth()],
                year: d.getFullYear(),
                time: timeStr !== "invaliddate" ? timeStr : ""
            };
        }
        return null;
    };

    const start = parsePart(startStr);
    if (!start) return startStr + (endStr ? ` - ${endStr}` : "");

    let result = `${start.month} ${start.day}, ${start.year}`;
    if (start.time) {
        result += ` ${start.time}`;
    }

    if (endStr) {
        const end = parsePart(endStr);
        if (end) {
            if (start.day === end.day && start.month === end.month && start.year === end.year) {
                if (end.time) {
                    result += `-${end.time}`;
                }
            } else {
                result += ` - ${end.month} ${end.day}, ${end.year}`;
                if (end.time) {
                    result += ` ${end.time}`;
                }
            }
        } else {
            result += ` - ${endStr}`;
        }
    }

    return result;
};

export default function EventDetailScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { brandData, eventsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const event = React.useMemo(() => {
        return eventsData?.find(
            (e: EventsData) => String(e.id) === String(id)
        );
    }, [eventsData, id]);

    const poiId = React.useMemo(() => extractPoiId(event?.location_poi_link), [event?.location_poi_link]);

    const rawDescription = event?.full_description || "";

    const handleRegister = () => {
        const url = event?.registration_ticket_link;
        if (url) {
            openExternalLink(url, "An active internet connection is required to register or buy tickets.");
        }
    };

    const [isTransitioning, setIsTransitioning] = React.useState(true);

    React.useEffect(() => {
        const interaction = InteractionManager.runAfterInteractions(() => {
            setIsTransitioning(false);
        });
        return () => interaction.cancel();
    }, []);

    if (apiStatus === "fetching" || isTransitioning) {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!event) {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
                <View style={styles.errorContainer}>
                    <AppText style={styles.errorText}>Event not found.</AppText>
                    <TouchableOpacity
                        style={[styles.backTextButton, { backgroundColor: primaryColor }]}
                        onPress={() => router.back()}
                    >
                        <AppText style={styles.backTextButtonText}>Go Back</AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Navbar />
                <QuickLinks />
                {/* Heading Row */}
                {isValidData(event.event_name) ? (
                    <View style={{ paddingHorizontal: 16 }}>
                        <SectionHeader
                            title={event.event_name as string}
                            iconSource={require("../../assets/images/eventicon.png")}
                            primaryColor={primaryColor || "#000000"}
                            secondaryColor={secondaryColor || "#ea0b0b"}
                            isDark={isDark}
                            style={{ marginLeft: 0 }}
                        />
                    </View>
                ) : null}

                {/* Banner Image */}
                {isValidData(event.thumbnail_image) ? (
                    <View style={[styles.bannerContainer, { position: 'relative' }]}>
                        <CachedImage
                            uri={event.thumbnail_image?.url as string}
                            style={[styles.bannerImage, { aspectRatio: 4 / 3, height: undefined }]}
                            contentFit="cover"
                        />
                        {poiId !== null ? (
                            <View style={{ position: 'absolute', bottom: 12, right: 28, zIndex: 10 }}>
                                <PrimaryButton title="Get Directions" onPress={() => navigateToPoi(router, poiId)} />
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Details Section */}
                <View style={styles.detailsContent}>
                    {/* Date & Time */}
                    {isValidData(event["start_date_&_time"]) ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={16} color="#555" style={styles.infoIcon} />
                            <AppText style={[styles.scheduleText, { fontFamily: 'OpenSans-Regular', fontSize: 13, lineHeight: 20, fontWeight: '400' }]}>
                                {formatEventDateTime(event["start_date_&_time"] as string, isValidData(event["end_date_&_time"]) ? event["end_date_&_time"] as string : undefined)}
                            </AppText>
                        </View>
                    ) : null}

                    {/* Short Description */}
                    <AppText style={{ fontFamily: 'OpenSans-Bold', fontSize: 14, lineHeight: 14, fontWeight: '700', color: colors.onSurface, marginBottom: 0 }}>
                        {isValidData(event.short_description) ? event.short_description : "Elk Country Visitor Center"}
                    </AppText>

                    {/* Location */}
                    {(isValidData(event.location_name) || isValidData(event.location_address)) ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={16} color="#555" style={styles.infoIcon} />
                            <View>
                                {isValidData(event.location_name) ? (
                                    <AppText style={styles.locationNameText}>{event.location_name}</AppText>
                                ) : null}
                                {isValidData(event.location_address) ? (
                                    <AppText style={styles.locationAddressText}>{event.location_address}</AppText>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

                    {/* Description Paragraph */}
                    {isValidData(rawDescription) ? (
                        <RenderHTML
                            contentWidth={width - 32} // paddingHorizontal is 16 on each side
                            source={{ html: typeof rawDescription === "string" ? rawDescription : "" }}
                            baseStyle={{
                                fontFamily: 'OpenSans-Regular',
                                fontSize: 13,
                                color: colors.onSurface,
                                lineHeight: 20,
                                marginTop: 10,
                                marginBottom: 20,
                            }}
                            tagsStyles={{
                                p: { marginVertical: 8 }
                            }}
                        />
                    ) : null}

                    {/* Register Button */}
                    {isValidData(event.registration_ticket_link) ? (
                        <TouchableOpacity
                            style={[styles.registerButton, { backgroundColor: primaryColor }]}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                        >
                            <AppText style={[styles.registerButtonText, { color: isDark ? "#FFFFFF" : secondaryColor || "" }]}>
                                Register / Buy Tickets
                            </AppText>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </Animated.ScrollView>
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

    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    errorText: {
        fontSize: 16,
        color: colors.onSurfaceVariant,
        marginBottom: 16,
    },

    backTextButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },

    backTextButtonText: {
        color: colors.surface,
        fontWeight: "bold",
        fontSize: 14,
    },

    scrollContent: {
        paddingBottom: 40,
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
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

    bannerContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },

    bannerImage: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        backgroundColor: colors.outlineVariant,
    },

    detailsContent: {
        paddingHorizontal: 16,
    },

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },

    infoIcon: {
        marginRight: 8,
    },

    scheduleText: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.onSurface,
        flex: 1,
    },

    locationNameText: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.onSurface,
    },

    locationAddressText: {
        fontSize: 13,
        color: colors.onSurfaceVariant,
        marginTop: 2,
    },

    descriptionText: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 22,
        marginTop: 10,
        marginBottom: 20,
    },

    registerButton: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
    },

    registerButtonText: {
        fontSize: 15,
        fontWeight: "bold",
    },
});
