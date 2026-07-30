import AppText from "@/src/components/AppText";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator,
    Dimensions,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RenderHTML from 'react-native-render-html';

import CachedImage from "@/src/components/CachedImage";
import { useAppContent, EventsData } from "@/src/contexts/AppContentContext";
import { useTheme } from "@/src/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { openExternalLink } from "@/src/utils/openLink";

const { width } = Dimensions.get("window");

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function EventDetailScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { brandData, eventsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const event = eventsData?.find(
        (e: EventsData, index: number) => String(e.id || index) === String(id)
    );

    const rawDescription = event?.full_description || "";

    const handleRegister = () => {
        const url = event?.registration__ticket_link;
        if (url) {
            openExternalLink(url, "An active internet connection is required to register or buy tickets.");
        }
    };

    if (apiStatus === "fetching") {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!event) {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
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
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            
            

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Heading Row */}
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/Primary.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]} numberOfLines={1}>
                        {event.event_name || ""}
                    </AppText>
                </View>

                {/* Banner Image */}
                <View style={styles.bannerContainer}>
                    <CachedImage
                        uri={event.thumbnail_image?.url as string}
                        style={styles.bannerImage}
                        contentFit="cover"
                    />
                </View>

                {/* Details Section */}
                <View style={styles.detailsContent}>
                    {/* Date & Time */}
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#555" style={styles.infoIcon} />
                        <AppText style={styles.scheduleText}>
                            {event["start_date_&_time"] || ""}
                            {event["end_date_&_time"] ? ` - ${event["end_date_&_time"]}` : ""}
                        </AppText>
                    </View>

                    {/* Location */}
                    {(event.location_name || event.location_address) && (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={16} color="#555" style={styles.infoIcon} />
                            <View>
                                {event.location_name && (
                                    <AppText style={styles.locationNameText}>{event.location_name}</AppText>
                                )}
                                {event.location_address && (
                                    <AppText style={styles.locationAddressText}>{event.location_address}</AppText>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Description Paragraph */}
                    {rawDescription ? (
                        <RenderHTML
                            contentWidth={width - 32} // paddingHorizontal is 16 on each side
                            source={{ html: typeof rawDescription === "string" ? rawDescription : "" }}
                            baseStyle={{
                                fontSize: 14,
                                color: colors.onSurface,
                                lineHeight: 22,
                                marginTop: 10,
                                marginBottom: 20,
                            }}
                            tagsStyles={{
                                p: { marginVertical: 8 }
                            }}
                        />
                    ) : null}

                    {/* Register Button */}
                    {event.registration__ticket_link && (
                        <TouchableOpacity
                            style={[styles.registerButton, { backgroundColor: primaryColor }]}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                        >
                            <AppText style={[styles.registerButtonText, { color: isDark ? "#FFFFFF" : secondaryColor || "" }]}>
                                Register / Buy Tickets
                            </AppText>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
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
