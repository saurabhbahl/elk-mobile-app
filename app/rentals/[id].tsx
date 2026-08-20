import AppText from "@/src/components/AppText";
import ItemNotFoundScreen from "@/src/components/ItemNotFoundScreen";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';

const systemFonts = [...defaultSystemFonts, 'OpenSans-Regular', 'OpenSans-Bold', 'OpenSans-Light', 'Roboto-Regular', 'Roboto-Bold'];
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/src/components/CachedImage";
import ImageGallerySlider from "@/src/components/ImageGallerySlider";
import PrimaryButton from "@/src/components/PrimaryButton";
import SectionHeader from "@/src/components/SectionHeader";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { RentalsData, useAppContentData } from "@/src/contexts/AppContentContext";
import { openExternalLink } from "@/src/utils/openLink";
import { isValidData } from "@/src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function RentalDetailScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { brandData, rentalsData, apiStatus } = useAppContentData();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const rental = rentalsData?.find(
        (r: RentalsData, index: number) => String(r.id || index) === String(id)
    );

    const rawDescription = rental?.full_description || "";

    const featuredImageUrl = React.useMemo(() => {
        if (!rental?.featured_image) return null;
        if (typeof rental.featured_image === "string") return rental.featured_image;
        if (typeof rental.featured_image === "object" && rental.featured_image !== null && "url" in rental.featured_image) {
            return (rental.featured_image as any).url || null;
        }
        return null;
    }, [rental?.featured_image]);

    const additionalImages = React.useMemo(() => {
        const addImgs = rental?.additional_images;
        if (!addImgs || !Array.isArray(addImgs)) return [];
        return addImgs.map((img: any) => img?.url).filter(Boolean);
    }, [rental?.additional_images]);

    const finalImages = React.useMemo(() => {
        const images: string[] = [];
        if (featuredImageUrl) {
            images.push(featuredImageUrl);
        }
        if (additionalImages && additionalImages.length > 0) {
            additionalImages.forEach(imgUrl => {
                if (imgUrl && !images.includes(imgUrl)) {
                    images.push(imgUrl);
                }
            });
        }
        return images;
    }, [featuredImageUrl, additionalImages]);

    const handlePressLink = React.useCallback((url: string | undefined) => {
        if (url) {
            if (url.startsWith("http") || url.startsWith("tel:") || url.startsWith("mailto:")) {
                openExternalLink(url);
            } else {
                router.push(url as any);
            }
        }
    }, []);

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

    if (!rental) {
        return (
            <ItemNotFoundScreen
                title="Rental Location Not Found"
                message="This rental location is no longer available or may have been deleted."
            />
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Navbar />
                <QuickLinks />

                {/* Heading Row */}
                {isValidData(rental.rental_name) ? (
                    <View style={{ paddingHorizontal: 16 }}>
                        <View style={styles.headerTitleRow}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backIconButton}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : (primaryColor || "#000000")} />
                            </TouchableOpacity>
                            <SectionHeader
                                title={rental.rental_name as string}
                                iconSource={require("../../assets/images/rentals.png")}
                                primaryColor={primaryColor || "#000000"}
                                secondaryColor={secondaryColor || "#ea0b0b"}
                                isDark={isDark}
                                style={{ marginLeft: 0, flex: 1 }}
                            />
                        </View>
                    </View>
                ) : null}

                {/* Banner / Gallery Image */}
                {finalImages.length > 1 ? (
                    <View style={styles.bannerContainer}>
                        <ImageGallerySlider images={finalImages} width={width - 32} height={220} />
                    </View>
                ) : (finalImages.length === 1 && finalImages[0] ? (
                    <View style={styles.bannerContainer}>
                        <CachedImage
                            uri={finalImages[0] as string}
                            style={[styles.bannerImage, { aspectRatio: 4 / 3, height: undefined }]}
                            contentFit="contain"
                        />
                    </View>
                ) : null)}

                {/* Details Section */}
                <View style={styles.detailsContent}>

                    {/* Short Description */}
                    {isValidData(rental.short_description) ? (
                        <AppText style={{ fontFamily: 'OpenSans-Bold', fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.onSurface }}>
                            {rental.short_description}
                        </AppText>
                    ) : null}

                    {/* Description Paragraph */}
                    {isValidData(rawDescription) ? (
                        <RenderHTML systemFonts={systemFonts}
                            contentWidth={width - 32}
                            source={{ html: typeof rawDescription === "string" ? rawDescription : "" }}
                            baseStyle={{
                                fontFamily: 'OpenSans-Regular',
                                fontWeight: '400',
                                fontStyle: 'normal',
                                fontSize: 13,
                                color: colors.onSurface,
                                lineHeight: 20,
                                letterSpacing: 0,
                                textAlign: "left",
                            }}
                            tagsStyles={{
                                p: { textAlign: "left", marginVertical: 8 }
                            }}
                        />
                    ) : null}

                    {/* CTAs */}
                    {(isValidData(rental.cta_1_link?.title) || isValidData(rental.cta_2_link?.title)) ? (
                        <View style={styles.ctaRow}>
                            {isValidData(rental.cta_1_link?.title) ? (
                                <PrimaryButton
                                    title={rental.cta_1_link?.title as string}
                                    onPress={() => handlePressLink(rental.cta_1_link?.url)}
                                />
                            ) : null}

                            {isValidData(rental.cta_2_link?.title) ? (
                                <PrimaryButton
                                    title={rental.cta_2_link?.title as string}
                                    onPress={() => handlePressLink(rental.cta_2_link?.url)}
                                    style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: primaryColor || '#ea0b0b' }}
                                    textStyle={{ color: isDark ? "#FFFFFF" : (primaryColor || '#ea0b0b') }}
                                />
                            ) : null}
                        </View>
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
    bannerContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
        alignItems: 'center',
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
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    infoIcon: {
        marginRight: 8,
    },
    capacityText: {
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
    },
    notesText: {
        fontSize: 13,
        color: "#555555",
        lineHeight: 18,
        marginBottom: 10,
    },
    ctaRow: {
        flexDirection: "column",
        alignItems: "flex-start",
        marginTop: 20,
        gap: 10,
    },
    ctaButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaButtonText: {
        fontSize: 14,
        fontWeight: "700",
    },
    ctaButtonOutline: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    ctaButtonOutlineText: {
        fontSize: 14,
        fontWeight: "700",
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    backIconButton: {
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
