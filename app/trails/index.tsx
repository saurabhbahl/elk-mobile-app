import AppText from "@/src/components/AppText";
import { Image } from "expo-image";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    View,
    Platform
} from "react-native";
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { TrailsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const TrailCard = React.memo(({ item, index, styles }: {
    item: TrailsData;
    index: number;
    styles: any;
}) => {
    if (!isValidData(item.trail_name) && !isValidData(item.description)) return null;

    return (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15, 80))}>
            <View style={styles.trailItemContainer}>
                {(isValidData(item.trail_name) || isValidData(item.distance)) ? (
                    <View style={styles.trailHeaderRow}>
                        {isValidData(item.trail_name) ? (
                            <AppText style={styles.trailName}>{item.trail_name}</AppText>
                        ) : null}
                        {isValidData(item.distance) ? (
                            <AppText style={styles.trailDistance}>{item.distance}</AppText>
                        ) : null}
                    </View>
                ) : null}
                {isValidData(item.description) ? (
                    <RenderHTML
                        contentWidth={width - 32}
                        source={{ html: item.description || "" }}
                        baseStyle={{
                            fontSize: 13,
                            color: "#555555",
                            lineHeight: 18,
                        }}
                        tagsStyles={{ p: { marginVertical: 4 } }}
                    />
                ) :
                    <AppText style={styles.trailDescription}>No description available.</AppText>
                }
            </View>
        </Animated.View>
    );
});

export default function TrailsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, trailsData, apiStatus, trailSettingsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const trails = trailsData || [];

    const renderTrailItem = React.useCallback(({ item, index }: { item: TrailsData; index: number }) => (
        <TrailCard
            item={item}
            index={index}
            styles={styles}
        />
    ), [styles]);

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />




            {isValidData(trailSettingsData?.screen_title) ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/trail.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                        {trailSettingsData?.screen_title}
                    </AppText>
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={trails}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderTrailItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={8}
                    maxToRenderPerBatch={12}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListEmptyComponent={
                        <AppText style={styles.emptyText}>No trails available</AppText>
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
    },

    trailHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },

    trailName: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.onSurface,
        marginRight: 8,
    },

    trailDistance: {
        fontSize: 12,
        color: colors.onSurface,
        fontWeight: "500",
    },

    trailDescription: {
        fontSize: 13,
        color: "#555555",
        lineHeight: 18,
    },

    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
