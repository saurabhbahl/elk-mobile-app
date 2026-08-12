import AppText from "@/src/components/AppText";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import React from "react";
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    StyleSheet,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";


import SectionHeader from "@/src/components/SectionHeader";
import UniversalCard from "@/src/components/UniversalCard";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { EventsData, useAppContentData } from "@/src/contexts/AppContentContext";

const cardWidth = (width - 44) / 2; // 16px padding on sides, 12px gap in middle

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};



export default function EventsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, eventsData, apiStatus, eventSettingsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const events = eventsData || [];

    const renderEventCard = React.useCallback(({ item, index }: { item: EventsData; index: number }) => (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15, 80))}>
            <UniversalCard
                type="event"
                item={item}
                variant="list"
                primaryColor={primaryColor || "#000000"}
            />
        </Animated.View>
    ), [primaryColor]);

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
                <Animated.FlatList
                    key="list-variant"
                    data={events}
                    keyExtractor={(item: any, index: number) => item.id?.toString() || index.toString()}
                    renderItem={renderEventCard as any}
                    numColumns={1}
                    contentContainerStyle={styles.gridContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={6}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListHeaderComponent={
                        <View>
                            <View style={{ marginHorizontal: -16 }}>
                                <Navbar />
                                <QuickLinks />
                            </View>
                            {eventSettingsData?.screen_title ? (
                                <View>
                                    <SectionHeader
                                        title={eventSettingsData.screen_title as string}
                                        iconSource={require("../../assets/images/eventicon.png")}
                                        primaryColor={primaryColor || "#000000"}
                                        secondaryColor={secondaryColor || "#ea0b0b"}
                                        isDark={isDark}
                                        style={{ marginLeft: 0 }}
                                    />
                                </View>
                            ) : null}
                        </View>
                    }
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
