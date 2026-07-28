import AppText from "@/components/AppText";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/components/CachedImage";
import { useAppContent } from "@/contexts/AppContentContext";
import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";

const { width } = Dimensions.get("window");
const cardWidth = (width - 44) / 2; // 16px padding on sides, 12px gap in middle

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function EventsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { homeData, brandData, eventsData, apiStatus, eventSettingsData } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const events = eventsData || [];

    const renderEventCard = ({ item, index }: { item: any; index: number }) => (
        <TouchableOpacity
            style={styles.eventCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/events/${item.id || index}` as any)}
        >
            <CachedImage
                uri={item.thumbnail_image?.url}
                style={styles.eventCardImage}
                contentFit="cover"
            />
            <View style={styles.eventCardContent}>
                <AppText style={styles.eventCardName} numberOfLines={2}>
                    {item.event_name || ""}
                </AppText>
                <AppText style={styles.eventCardDate} numberOfLines={1}>
                    {item["start_date_&_time"] || ""}
                </AppText>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            
            

            {eventSettingsData?.screen_title ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/calendar-days.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                        {eventSettingsData.screen_title}
                    </AppText>
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderEventCard}
                    numColumns={2}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <AppText style={styles.emptyText}>No events available</AppText>
                    }
                />
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

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
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

    gridContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 12,
    },

    eventCard: {
        width: cardWidth,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        backgroundColor: colors.surface,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },

    eventCardImage: {
        width: "100%",
        height: 110,
    },

    eventCardContent: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        minHeight: 64,
        justifyContent: "center",
    },

    eventCardName: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.onSurface,
        lineHeight: 16,
    },

    eventCardDate: {
        fontSize: 11,
        color: colors.onSurfaceVariant,
        marginTop: 4,
    },

    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        fontSize: 14,
        marginTop: 40,
    },
});
