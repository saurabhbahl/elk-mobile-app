import AppText from "@/src/components/AppText";
import ImageGallerySlider from "@/src/components/ImageGallerySlider";
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
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";

const systemFonts = [...defaultSystemFonts, 'OpenSans-Regular', 'OpenSans-Bold', 'OpenSans-Light', 'Roboto-Regular', 'Roboto-Bold'];

import SectionHeader from "@/src/components/SectionHeader";
import UniversalCard from "@/src/components/UniversalCard";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { RentalsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function RentalsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData, rentalsData, apiStatus, rentalSettingsData } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const rentals = rentalsData || [];

    const galleryImages = React.useMemo(() => {
        const gallery = rentalSettingsData?.image_gallery;
        if (!gallery || !Array.isArray(gallery)) return [];
        return gallery.map((img: any) => img?.url).filter(Boolean);
    }, [rentalSettingsData?.image_gallery]);

    const renderRentalItem = React.useCallback(({ item, index }: { item: RentalsData; index: number }) => (
        <Animated.View entering={FadeInUp.duration(200).delay(Math.min(index * 15 + 80, 160))}>
            <View style={{ marginBottom: 20 }}>
                <UniversalCard
                    type="rental"
                    item={item}
                    variant="list"
                    primaryColor={primaryColor || "#000000"}
                />
            </View>
        </Animated.View>
    ), [primaryColor]);

    const ListHeader = React.useMemo(() => (
        <View>
            <View style={{ marginHorizontal: -16 }}>
                <Navbar />
                <QuickLinks />
            </View>
            {isValidData(rentalSettingsData?.screen_title) ? (
                <View>
                    <SectionHeader
                        title={rentalSettingsData?.screen_title as string}
                        iconSource={require("../../assets/images/rentals.png")}
                        primaryColor={primaryColor || "#000000"}
                        secondaryColor={secondaryColor || "#ea0b0b"}
                        isDark={isDark}
                        style={{ marginLeft: 0 }}
                    />
                </View>
            ) : null}

            {galleryImages.length > 0 ? (
                <Animated.View entering={FadeInUp.duration(200).delay(20)} style={{ marginBottom: 16, alignItems: 'center' }}>
                    <ImageGallerySlider images={galleryImages} width={width - 32} height={190} />
                </Animated.View>
            ) : null}
            {isValidData(rentalSettingsData?.intro_text) ? (
                <Animated.View entering={FadeInUp.duration(200).delay(40)} style={{ paddingBottom: 16 }}>
                    <RenderHTML systemFonts={systemFonts}
                        contentWidth={width - 32}
                        source={{ html: rentalSettingsData?.intro_text || "" }}
                        baseStyle={{
                            fontSize: 14,
                            color: isDark ? "#E5E5E5" : "#333",
                            lineHeight: 20,
                        }}
                        tagsStyles={{ p: { marginVertical: 4 } }}
                    />
                </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.duration(200).delay(60)}>
                <AppText style={{
                    fontSize: 16,
                    fontWeight: '700',
                    fontFamily: 'OpenSans-Bold',
                    color: secondaryColor,
                    marginBottom: 16,
                    marginTop: 8
                }}>
                    Our Rental Locations
                </AppText>
            </Animated.View>
        </View>
    ), [rentalSettingsData?.screen_title, rentalSettingsData?.intro_text, galleryImages, isDark, primaryColor, secondaryColor]);

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
                    data={rentals}
                    keyExtractor={(item: any, index: number) => item.id?.toString() || index.toString()}
                    renderItem={renderRentalItem as any}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={5}
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
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        marginTop: 20,
        fontSize: 14,
    },
});
