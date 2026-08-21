import AppText from "@/src/components/AppText";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import WireframePlaceholder from "./WireframePlaceholder";

const MENU_PADDING = 16;
const MENU_GAP = 12;
const MAX_CARD_WIDTH = 175;

export default function QuickLinks() {
    const { colors, fonts, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    // Calculate dynamic card width so 2 full cards and 1/10th of 3rd card (2.1 cards) fit on phone screens,
    // capped at MAX_CARD_WIDTH on wider screens like iPads/tablets.
    const calculatedWidth = (screenWidth - MENU_PADDING - 2 * MENU_GAP) / 2.1;
    const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(120, calculatedWidth));

    const { navigationData, brandData } = useAppContent();
    const pathname = usePathname();
    const primaryColor = brandData?.brand_color_primary || "";
    const secondaryColor = brandData?.brand_color_secondary || "";
    const scrollViewRef = useRef<ScrollView>(null);
    const isNavigating = useRef(false);

    // Find the currently active index
    const activeIndex = navigationData ? navigationData.findIndex((item) => {
        if (!item.nav_link?.url) return false;
        const url = item.nav_link.url as string;
        return pathname === url || (url !== '/' && pathname.startsWith(url));
    }) : -1;

    // Compute initial scroll position to render perfectly on first frame
    const getInitialScrollOffset = () => {
        if (activeIndex === -1) return 0;
        const itemX = MENU_PADDING + activeIndex * (cardWidth + MENU_GAP);
        const scrollToX = itemX - (screenWidth / 2) + (cardWidth / 2);
        return Math.max(0, scrollToX);
    };

    const renderMenu = () => {
        if (navigationData && navigationData.length > 0) {
            return navigationData.map((item, index) => {
                if (!item.nav_item_label || !item.nav_link?.url) return null;

                const url = item.nav_link.url as string;
                const isActive = pathname === url || (url !== '/' && pathname.startsWith(url));
                const isExactActive = pathname === url;
                return (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.menuCard,
                            { width: cardWidth },
                            isActive && {
                                borderBottomColor: secondaryColor,
                            }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (isExactActive) return;
                            if (isNavigating.current) return;
                            
                            isNavigating.current = true;
                            setTimeout(() => {
                                isNavigating.current = false;
                            }, 800);

                            requestAnimationFrame(() => {
                                router.push((item.nav_link as any)?.url as any);
                            });
                        }}
                    >
                        {item.nav_image ? (
                            <Image
                                source={{ uri: typeof item.nav_image === 'string' ? item.nav_image : (item.nav_image as Record<string, string>)?.url }}
                                style={styles.menuCardImage}
                                contentFit="cover"
                                transition={0}
                            />
                        ) : (
                            <WireframePlaceholder style={styles.menuCardImage} />
                        )}
                        <View style={styles.menuCardTitleContainer}>
                            <AppText style={[styles.menuCardTitle, isActive && { color: primaryColor }]} numberOfLines={2}>{item.nav_item_label}</AppText>
                        </View>
                    </TouchableOpacity>
                );
            });
        }

        return null;
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalMenu}
                contentOffset={{ x: getInitialScrollOffset(), y: 0 }}
            >
                {renderMenu()}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
    },
    horizontalMenu: {
        paddingHorizontal: MENU_PADDING,
        paddingVertical: 12,
        gap: MENU_GAP,
        alignItems: 'stretch',
    },
    menuCard: {
        borderRadius: 12,
        borderBottomWidth: 4,
        borderBottomColor: 'transparent',
        backgroundColor: colors.surface,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1.24 },
        shadowOpacity: 0.25,
        shadowRadius: 2.47,
        elevation: 2,
    },
    menuCardImage: {
        height: 88,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    menuCardTitleContainer: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surface,
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    menuCardTitle: {
        fontSize: 11,
        fontFamily: 'OpenSans-SemiBold',
        color: colors.onSurface,
        textAlign: 'center',
        width: '100%',
    },
});
