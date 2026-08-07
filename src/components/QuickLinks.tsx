import AppText from "@/src/components/AppText";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import WireframePlaceholder from "./WireframePlaceholder";

export default function QuickLinks() {
    const { colors, fonts, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const { navigationData, brandData } = useAppContent();
    const pathname = usePathname();
    const primaryColor = brandData?.brand_color_primary || "";
    const secondaryColor = brandData?.brand_color__secondary || "";
    const scrollViewRef = useRef<ScrollView>(null);

    // Find the currently active index
    const activeIndex = navigationData ? navigationData.findIndex((item) => {
        if (!item.nav_link?.url) return false;
        const url = item.nav_link.url as string;
        return pathname === url || (url !== '/' && pathname.startsWith(url));
    }) : -1;

    // Scroll active item to the center of the screen
    useEffect(() => {
        if (activeIndex !== -1 && scrollViewRef.current) {
            const itemWidth = 120;
            const gap = 12;
            const padding = 16;
            const itemX = padding + activeIndex * (itemWidth + gap);
            const W = width;
            const scrollToX = itemX - (W / 2) + (itemWidth / 2);

            const timer = setTimeout(() => {
                scrollViewRef.current?.scrollTo({ x: Math.max(0, scrollToX), animated: true });
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [activeIndex]);

    const renderMenu = () => {
        if (navigationData && navigationData.length > 0) {
            return navigationData.map((item, index) => {
                if (!item.nav_item_label || !item.nav_link?.url) return null;

                const url = item.nav_link.url as string;
                const isActive = pathname === url || (url !== '/' && pathname.startsWith(url));
                return (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.menuCard,
                            isActive && {
                                borderBottomColor: secondaryColor,
                            }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
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
                                transition={200}
                            />
                        ) : (
                            <WireframePlaceholder style={styles.menuCardImage} />
                        )}
                        <View style={styles.menuCardTitleContainer}>
                            <AppText style={[styles.menuCardTitle, isActive && { color: primaryColor }]} numberOfLines={1}>{item.nav_item_label}</AppText>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    menuCard: {
        width: 120,
        height: 90,
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
        flex: 2,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    menuCardTitleContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.outlineVariant,
        paddingHorizontal: 4,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: 'hidden',
    },
    menuCardTitle: {
        fontSize: 11,
        fontFamily: 'OpenSans-SemiBold',
        color: colors.onSurface,
    },
});
