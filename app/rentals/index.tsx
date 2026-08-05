import AppText from "@/src/components/AppText";
import { Image } from "expo-image";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
    Platform
} from "react-native";
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

import CachedImage from "@/src/components/CachedImage";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { RentalsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { openExternalLink } from "@/src/utils/openLink";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

const RentalCard = React.memo(({ item, index, styles, primaryColor, secondaryColor, isDark, colors, handlePressLink }: {
    item: RentalsData;
    index: number;
    styles: any;
    primaryColor: string | undefined;
    secondaryColor: string | undefined;
    isDark: boolean;
    colors: any;
    handlePressLink: (url: string | undefined) => void;
}) => {
    // Find main image from additional_images (acf gallery) if available
    let imageUrl = null;
    if (item.additional_images && Array.isArray(item.additional_images) && item.additional_images.length > 0) {
        imageUrl = item.additional_images[0]?.url;
    }

    return (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15, 80))}>
            <View style={styles.rentalCard}>
                {isValidData(imageUrl) ? (
                    <CachedImage
                        uri={imageUrl}
                        style={styles.rentalImage}
                        contentFit="cover"
                    />
                ) : null}

                <View style={styles.rentalContent}>
                    <View style={styles.titleRow}>
                        {isValidData(item.rental_name) ? (
                            <AppText style={styles.rentalName}>{item.rental_name}</AppText>
                        ) : null}
                        {isValidData(item.rental_type) ? (
                            <View style={[styles.badge, primaryColor ? { backgroundColor: primaryColor + "15" } : null]}>
                                <AppText style={[styles.badgeText, primaryColor ? { color: isDark ? "#FFFFFF" : primaryColor } : null]}>
                                    {item.rental_type}
                                </AppText>
                            </View>
                        ) : null}
                    </View>

                    {isValidData(item.capacity) ? (
                        <AppText style={styles.capacityText}>Capacity: {item.capacity}</AppText>
                    ) : null}

                    {isValidData(item.short_description) ? (
                        <AppText style={styles.shortDesc}>{item.short_description}</AppText>
                    ) : null}

                    {isValidData(item.full_description) ? (
                        <RenderHTML
                            contentWidth={width - 32 - 32} // main padding 16*2 + inner padding 16*2
                            source={{ html: item.full_description || "" }}
                            baseStyle={{
                                fontSize: 13,
                                color: colors.onSurfaceVariant,
                                lineHeight: 18,
                                marginBottom: 12,
                            }}
                            tagsStyles={{ p: { marginVertical: 4 } }}
                        />
                    ) : null}

                    {isValidData(item.availability_notes) ? (
                        <AppText style={styles.notesText}>
                            <AppText style={{ fontWeight: "700" }}>Availability: </AppText>
                            {item.availability_notes}
                        </AppText>
                    ) : null}

                    {isValidData(item.pricing_notes) ? (
                        <AppText style={styles.notesText}>
                            <AppText style={{ fontWeight: "700" }}>Pricing: </AppText>
                            {item.pricing_notes}
                        </AppText>
                    ) : null}

                    {(isValidData(item.cta_1_label_) || isValidData(item.cta_2_label)) ? (
                        <View style={styles.ctaRow}>
                            {(isValidData(item.cta_1_label_) && isValidData(item.cta_1_link)) ? (
                                <TouchableOpacity
                                    style={[styles.ctaButton, primaryColor ? { backgroundColor: primaryColor } : null]}
                                    onPress={() => handlePressLink(item.cta_1_link)}
                                >
                                    <AppText style={[styles.ctaButtonText, secondaryColor ? { color: isDark ? "#FFFFFF" : secondaryColor } : null]}>
                                        {item.cta_1_label_}
                                    </AppText>
                                </TouchableOpacity>
                            ) : null}

                            {(isValidData(item.cta_2_label) && isValidData(item.cta_2_link)) ? (
                                <TouchableOpacity
                                    style={[styles.ctaButtonOutline, primaryColor ? { borderColor: primaryColor } : null]}
                                    onPress={() => handlePressLink(item.cta_2_link)}
                                >
                                    <AppText style={[styles.ctaButtonOutlineText, primaryColor ? { color: isDark ? "#FFFFFF" : primaryColor } : null]}>
                                        {item.cta_2_label}
                                    </AppText>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ) : null}
                </View>
            </View>
        </Animated.View>
    );
});

export default function RentalsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, rentalsData, apiStatus, rentalSettingsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const rentals = rentalsData || [];

    const handlePressLink = React.useCallback((url: string | undefined) => {
        if (url) {
            openExternalLink(url);
        }
    }, []);

    const renderRentalItem = React.useCallback(({ item, index }: { item: RentalsData; index: number }) => (
        <RentalCard
            item={item}
            index={index}
            styles={styles}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            isDark={isDark}
            colors={colors}
            handlePressLink={handlePressLink}
        />
    ), [styles, primaryColor, secondaryColor, isDark, colors, handlePressLink]);

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            {isValidData(rentalSettingsData?.screen_title) ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/rentals.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                        {rentalSettingsData?.screen_title}
                    </AppText>
                </View>
            ) : null}

            {isValidData(rentalSettingsData?.intro_text) ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <RenderHTML
                        contentWidth={width - 32}
                        source={{ html: rentalSettingsData?.intro_text || "" }}
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
                <FlatList<RentalsData>
                    data={rentals}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderRentalItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={4}
                    maxToRenderPerBatch={6}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListEmptyComponent={
                        <AppText style={styles.emptyText}>No rentals available at the moment.</AppText>
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
    rentalCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        marginBottom: 20,
        overflow: "hidden",
    },
    rentalImage: {
        width: "100%",
        height: 150,
        backgroundColor: colors.surfaceVariant,
    },
    rentalContent: {
        padding: 16,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    rentalName: {
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
    capacityText: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
        marginBottom: 8,
        fontWeight: "500",
    },
    shortDesc: {
        fontSize: 13,
        color: "#555555",
        lineHeight: 18,
        marginBottom: 8,
    },
    fullDesc: {
        fontSize: 13,
        color: colors.onSurfaceVariant,
        lineHeight: 18,
        marginBottom: 12,
    },
    notesText: {
        fontSize: 12,
        color: "#555555",
        lineHeight: 16,
        marginBottom: 6,
    },
    ctaRow: {
        flexDirection: "row",
        marginTop: 12,
        gap: 10,
    },
    ctaButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaButtonText: {
        fontSize: 13,
        fontWeight: "700",
    },
    ctaButtonOutline: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    ctaButtonOutlineText: {
        fontSize: 13,
        fontWeight: "700",
    },
    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
