import AppText from "@/src/components/AppText";
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

import CachedImage from "@/src/components/CachedImage";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { TipsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const TipCard = React.memo(({ item, index, styles, primaryColor, isDark, colors }: {
    item: TipsData;
    index: number;
    styles: any;
    primaryColor: string | undefined;
    isDark: boolean;
    colors: any;
}) => {
    const imageUrl = typeof item.tip_icon__image === 'string' ? item.tip_icon__image : (item.tip_icon__image as any)?.url as string;

    if (!isValidData(item.tip_title) && !isValidData(item.tip_body)) return null;

    return (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15, 80))}>
            <View style={styles.tipCard}>
                <View style={styles.tipContent}>
                    {(isValidData(item.tip_title) || isValidData(item.category__tag)) ? (
                        <View style={styles.titleRow}>
                            <View style={styles.titleLeft}>
                                {isValidData(imageUrl) ? (
                                    <CachedImage
                                        uri={imageUrl}
                                        style={styles.tipIcon}
                                        contentFit="contain"
                                    />
                                ) : null}
                                {isValidData(item.tip_title) ? (
                                    <AppText style={styles.tipTitle}>{item.tip_title}</AppText>
                                ) : null}
                            </View>
                            {isValidData(item.category__tag) ? (
                                <View style={[styles.badge, primaryColor ? { backgroundColor: primaryColor + "15" } : null]}>
                                    <AppText style={[styles.badgeText, primaryColor ? { color: isDark ? "#FFFFFF" : primaryColor } : null]}>
                                        {item.category__tag}
                                    </AppText>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {isValidData(item.tip_body) ? (
                        <RenderHTML
                            contentWidth={width - 64}
                            source={{ html: item.tip_body as string }}
                            baseStyle={{
                                fontSize: 13,
                                color: colors.onSurfaceVariant,
                                lineHeight: 18,
                            }}
                            tagsStyles={{ p: { marginVertical: 4 } }}
                        />
                    ) : null}
                </View>
            </View>
        </Animated.View>
    );
});

export default function TipsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, tipsData, apiStatus, tipsScreenSettingsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const tips = tipsData || [];

    const renderTipItem = React.useCallback(({ item, index }: { item: TipsData; index: number }) => (
        <TipCard
            item={item}
            index={index}
            styles={styles}
            primaryColor={primaryColor}
            isDark={isDark}
            colors={colors}
        />
    ), [styles, primaryColor, isDark, colors]);

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {isValidData(tipsScreenSettingsData?.screen_title) ? (
                <View style={styles.headerRow}>
                    {(() => {
                        if (!tipsScreenSettingsData) return null;
                        const iconUrl = typeof tipsScreenSettingsData.header_icon === 'string'
                            ? tipsScreenSettingsData.header_icon
                            : (tipsScreenSettingsData.header_icon as any)?.url;
                        if (!isValidData(iconUrl)) return null;
                        return (
                            <CachedImage
                                uri={iconUrl}
                                style={styles.headerIcon}
                                contentFit="contain"
                            />
                        );
                    })()}
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                        {tipsScreenSettingsData?.screen_title}
                    </AppText>
                </View>
            ) : null}

            {isValidData(tipsScreenSettingsData?.intro_paragraph) ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <RenderHTML
                        contentWidth={width - 32}
                        source={{ html: tipsScreenSettingsData?.intro_paragraph || "" }}
                        baseStyle={{
                            fontSize: 14,
                            color: isDark ? "#E5E5E5" : "#333",
                            lineHeight: 20,
                            textAlign: "center"
                        }}
                        tagsStyles={{ p: { textAlign: "center", marginVertical: 4 } }}
                    />
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={tips}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderTipItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={5}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListEmptyComponent={
                        <AppText style={styles.emptyText}>No viewing tips available at the moment.</AppText>
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
    tipCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#EAEAEA",
    },
    tipContent: {
        padding: 16,
    },
    tipIcon: {
        width: 18,
        height: 18,
        marginRight: 8,
    },
    titleLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.onSurface,
        flex: 1,
        marginRight: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    tipBody: {
        fontSize: 13,
        color: colors.onSurfaceVariant,
        lineHeight: 18,
    },
    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
