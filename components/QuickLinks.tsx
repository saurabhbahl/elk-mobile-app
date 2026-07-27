import AppText from "@/components/AppText";
import { useAppContent } from "@/contexts/AppContentContext";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import WireframePlaceholder from "./WireframePlaceholder";

export default function QuickLinks() {
    const { navigationData, brandData } = useAppContent();
    const pathname = usePathname();
    const primaryColor = brandData?.brand_color_primary || "#CCCCCC";
    const scrollViewRef = useRef<ScrollView>(null);

    // Find the currently active index
    const activeIndex = navigationData ? navigationData.findIndex((item) => {
        if (!item.nav_link?.url) return false;
        return pathname === item.nav_link.url || (item.nav_link.url !== '/' && pathname.startsWith(item.nav_link.url));
    }) : -1;

    // Scroll active item to the center of the screen
    useEffect(() => {
        if (activeIndex !== -1 && scrollViewRef.current) {
            const itemWidth = 120;
            const gap = 12;
            const padding = 16;
            const itemX = padding + activeIndex * (itemWidth + gap);
            const W = Dimensions.get('window').width;
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

                const isActive = pathname === item.nav_link.url || (item.nav_link.url !== '/' && pathname.startsWith(item.nav_link.url));

                return (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.menuCard,
                            isActive && {
                                borderColor: primaryColor,
                                borderWidth: 3,
                                transform: [{ scale: 1.2 }],
                                zIndex: 10,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 6,
                                elevation: 5
                            }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => router.replace(item.nav_link.url as any)}
                    >
                        {item.nav_image ? (
                            <Image
                                source={{ uri: typeof item.nav_image === 'string' ? item.nav_image : item.nav_image?.url }}
                                style={styles.menuCardImage}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <WireframePlaceholder style={styles.menuCardImage} />
                        )}
                        <View style={styles.menuCardTitleContainer}>
                            <AppText style={[styles.menuCardTitle, isActive && { color: primaryColor, fontWeight: "700" }]} numberOfLines={1}>{item.nav_item_label}</AppText>
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    horizontalMenu: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    menuCard: {
        width: 120,
        height: 90,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#CCCCCC",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },
    menuCardImage: {
        flex: 2,
    },
    menuCardTitleContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingHorizontal: 4,
    },
    menuCardTitle: {
        fontSize: 11,
        fontWeight: "600",
        color: "#333333",
    },
});
