import AppText from "@/src/components/AppText";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    StyleSheet,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import AppRenderHTML from "@/src/components/AppRenderHTML";
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/src/components/CachedImage";
import PrimaryButton from "@/src/components/PrimaryButton";
import SectionHeader from "@/src/components/SectionHeader";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { TrailsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { formatTrailDistance, isValidData } from "@/src/utils/validation";
import { extractPoiId, navigateToPoi } from "../../src/utils/mapUtils";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const TrailCard = React.memo(({ item, index, styles }: {
    item: TrailsData;
    index: number;
    styles: any;
}) => {
    const { colors, isDark } = useTheme();
    if (!isValidData(item.trail_name) && !isValidData(item.description)) return null;

    return (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15, 80))}>
            <View style={styles.trailItemContainer}>
                {/* Feature Image */}
                {typeof item.featured_image === 'object' && item.featured_image !== null && (item.featured_image as any).url ? (
                    <View style={{ position: 'relative', marginBottom: 16 }}>
                        <CachedImage
                            uri={(item.featured_image as any).url}
                            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' }}
                            contentFit="cover"
                        />
                    </View>
                ) : null}

                {(isValidData(item.trail_name) || isValidData(item.distance)) ? (
                    <View style={styles.trailHeaderRow}>
                        {isValidData(item.trail_name) ? (
                            <AppText style={styles.trailName}>{item.trail_name}</AppText>
                        ) : null}
                        {isValidData(item.distance) ? (
                            <AppText style={styles.trailDistance}>{formatTrailDistance(item.distance)} miles</AppText>
                        ) : null}
                    </View>
                ) : null}
                {isValidData(item.description) ? (
                    <AppRenderHTML
                        html={item.description || ""}
                        contentWidth={width - 32}
                        baseStyle={styles.trailDescription}
                    />
                ) : null}

                {/* Seasonal Closure Notice */}
                {isValidData(item.seasonal_closure) ? (
                    <View style={{ marginTop: 12 }}>
                        <AppText style={{ fontFamily: 'OpenSans-Bold', fontSize: 14, color: isDark ? colors.onSurface : '#000000' }}>
                            Seasonal Closure:
                        </AppText>
                        <AppText style={{ fontFamily: 'OpenSans-Regular', fontSize: 14, color: isDark ? colors.onSurfaceVariant : '#555555', marginTop: 2 }}>
                            {item.seasonal_closure}
                        </AppText>
                    </View>
                ) : null}

                {/* Get Directions Button */}
                {(() => {
                    const poiId = extractPoiId(item.location_poi_link);
                    if (poiId !== null) {
                        return (
                            <View style={{ marginTop: 16, alignSelf: 'flex-start' }}>
                                <PrimaryButton title="Get Directions" onPress={() => navigateToPoi(router, poiId)} />
                            </View>
                        );
                    }
                    return null;
                })()}
            </View>
        </Animated.View>
    );
});
TrailCard.displayName = 'TrailCard';

export default function TrailsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, trailsData, apiStatus, trailSettingsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark, primaryColor as string), [colors, fonts, isDark, primaryColor]);

    const trails = trailsData || [];

    const renderTrailItem = React.useCallback(({ item, index }: { item: TrailsData; index: number }) => (
        <TrailCard
            item={item}
            index={index}
            styles={styles}
        />
    ), [styles]);

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
                    data={trails}
                    keyExtractor={(item: any, index: number) => item.id?.toString() || index.toString()}
                    renderItem={renderTrailItem as any}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={8}
                    maxToRenderPerBatch={12}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListHeaderComponent={
                        <View>
                            <View style={{ marginHorizontal: -16 }}>
                                <Navbar />
                                <QuickLinks />
                            </View>
                            {isValidData(trailSettingsData?.screen_title) ? (
                                <View>
                                    <SectionHeader
                                        title={trailSettingsData?.screen_title as string}
                                        iconSource={require("../../assets/images/trailsicon.png")}
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
                        <AppText style={styles.emptyText}>No trails available</AppText>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean, primaryColor: string) => StyleSheet.create({
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

    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

    trailItemContainer: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },

    trailHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },

    trailName: {
        fontSize: 16,
        fontWeight: "700",
        color: isDark ? colors.onSurface : primaryColor,
        marginRight: 8,
    },

    trailDistance: {
        fontFamily: 'OpenSans-Regular',
        fontSize: 12,
        color: isDark ? colors.onSurfaceVariant : primaryColor,
    },


    trailDescription: {
        fontFamily: 'OpenSans-Regular',
        fontSize: 14,
        color: isDark ? colors.onSurfaceVariant : "#555555",
        lineHeight: 18,
        textAlign: "left",
    },

    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
