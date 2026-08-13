import AppText from "@/src/components/AppText";
import ImageGallerySlider from "@/src/components/ImageGallerySlider";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import SectionHeader from "@/src/components/SectionHeader";
import { FontAwesome5 } from '@expo/vector-icons';
import React from "react";
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    StyleSheet,
    View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';

const systemFonts = [...defaultSystemFonts, 'OpenSans-Regular', 'OpenSans-Bold', 'OpenSans-Light', 'Roboto-Regular', 'Roboto-Bold'];
import { SafeAreaView } from "react-native-safe-area-context";


import CachedImage from "@/src/components/CachedImage";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { TipsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const getDashiconMapping = (dashicon: string) => {
    switch (dashicon) {
        case 'dashicons-yes': return 'check';
        case 'dashicons-yes-alt': return 'check-circle';
        case 'dashicons-info': return 'info-circle';
        case 'dashicons-warning': return 'exclamation-triangle';
        case 'dashicons-location': return 'map-marker-alt';
        case 'dashicons-calendar-alt': return 'calendar-alt';
        case 'dashicons-camera': return 'camera';
        case 'dashicons-images-alt2': return 'images';
        case 'dashicons-sos': return 'life-ring';
        default: return 'circle';
    }
};

const TipCard = React.memo(({ item, index, styles, primaryColor, secondaryColor, isDark, colors, isLast }: {
    item: TipsData;
    index: number;
    styles: any;
    primaryColor: string | undefined;
    secondaryColor: string | undefined;
    isDark: boolean;
    colors: any;
    isLast: boolean;
}) => {
    const imageUrl = typeof item.tip_icon_image === 'string' ? item.tip_icon_image : (item.tip_icon_image as any)?.url as string;

    if (!isValidData(item.tip_title) && !isValidData(item.tip_body)) return null;

    return (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15, 80))}>
            <View style={[styles.tipCard, { borderBottomColor: secondaryColor || "#ea0b0b", borderBottomWidth: isLast ? 0 : 1 }]}>
                <View style={styles.tipContent}>
                    {(isValidData(item.tip_title) || isValidData(item.category_tag)) ? (
                        <View style={styles.titleRow}>
                            <View style={styles.titleLeft}>
                                {isValidData(imageUrl) ? (
                                    imageUrl.startsWith('dashicons-') ? (
                                        <FontAwesome5
                                            name={getDashiconMapping(imageUrl)}
                                            size={18}
                                            color={primaryColor || colors.onSurface}
                                            style={styles.tipIcon}
                                        />
                                    ) : (
                                        <CachedImage
                                            uri={imageUrl}
                                            style={styles.tipIcon}
                                            contentFit="contain"
                                        />
                                    )
                                ) : null}
                                {isValidData(item.tip_title) ? (
                                    <AppText style={styles.tipTitle}>{item.tip_title}</AppText>
                                ) : null}
                            </View>
                            {isValidData(item.category_tag) ? (
                                <View style={[styles.badge, primaryColor ? { backgroundColor: primaryColor + "15" } : null]}>
                                    <AppText style={[styles.badgeText, primaryColor ? { color: isDark ? "#FFFFFF" : primaryColor } : null]}>
                                        {item.category_tag}
                                    </AppText>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {isValidData(item.tip_body) ? (
                        <RenderHTML systemFonts={systemFonts}
                            contentWidth={width - 64}
                            source={{ html: item.tip_body as string }}
                            baseStyle={{
                                fontFamily: 'OpenSans-Regular',
                                fontWeight: '400',
                                fontStyle: 'normal',
                                fontSize: 13,
                                color: colors.onSurfaceVariant,
                                lineHeight: 20,
                                letterSpacing: 0,
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
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const tips = tipsData || [];

    const galleryImages = React.useMemo(() => {
        const gallery = tipsScreenSettingsData?.image_gallery;
        if (!gallery || !Array.isArray(gallery)) return [];
        return gallery.map((img: any) => img?.url).filter(Boolean);
    }, [tipsScreenSettingsData?.image_gallery]);

    const renderTipItem = React.useCallback(({ item, index }: { item: TipsData; index: number }) => (
        <TipCard
            item={item}
            index={index}
            styles={styles}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            isDark={isDark}
            colors={colors}
            isLast={index === tips.length - 1}
        />
    ), [styles, primaryColor, secondaryColor, isDark, colors, tips.length]);

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            <Animated.FlatList
                data={apiStatus === "fetching" ? [] : tips}
                keyExtractor={(item: any, index: number) => item.id?.toString() || index.toString()}
                renderItem={renderTipItem as any}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListHeaderComponent={
                    <View>
                        <View style={{ marginHorizontal: -16 }}>
                            <Navbar />
                            <QuickLinks />
                        </View>
                        {isValidData(tipsScreenSettingsData?.screen_title) ? (
                            <View style={{ marginLeft: -16 }}>
                                <SectionHeader
                                    title={tipsScreenSettingsData?.screen_title as string}
                                    iconSource={require("../../assets/images/tips.png")}
                                    primaryColor={primaryColor || "#000000"}
                                    secondaryColor={secondaryColor || "#ea0b0b"}
                                    isDark={isDark}
                                    isFeatured={true}
                                />
                            </View>
                        ) : null}

                        {isValidData(tipsScreenSettingsData?.intro_paragraph) ? (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                                <RenderHTML systemFonts={systemFonts}
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

                        {galleryImages.length > 0 ? (
                            <View style={{ marginHorizontal: 16, marginBottom: 16, alignItems: 'center' }}>
                                <ImageGallerySlider images={galleryImages} width={width - 32} height={190} />
                            </View>
                        ) : null}
                    </View>
                }
                ListEmptyComponent={
                    apiStatus === "fetching" ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={primaryColor} />
                        </View>
                    ) : (
                        <AppText style={styles.emptyText}>No viewing tips available at the moment.</AppText>
                    )
                }
            />
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
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    tipCard: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        marginBottom: 16,
        paddingBottom: 16,
    },
    tipContent: {
        padding: 0,
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
        // marginTop: 16
    },
    tipTitle: {
        fontFamily: 'OpenSans-Bold',
        fontWeight: "700",
        fontStyle: 'normal',
        fontSize: 16,
        lineHeight: 20,
        letterSpacing: 0,
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
